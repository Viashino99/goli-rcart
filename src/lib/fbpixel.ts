declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    /** Set by TrackerProvider before injecting `fbpixel.js` (async scripts may not expose `data-pixel-id`). */
    __rcartFbPixelPendingId?: string;
    __rcartFbPixelId?: string;
    __rcartTrackerDebug?: boolean;
    __rcartTrackerLogs?: Array<Record<string, unknown>>;
  }
}

/** Inlined at `vite build` from `VITE_FACEBOOK_PIXEL_ID` in `.env.local` (goli-rcart default). */
export const FB_PIXEL_ID = import.meta.env.VITE_FACEBOOK_PIXEL_ID as string | undefined;

/** Inlined at `vite build` from `VITE_FACEBOOK_ACCESS_TOKEN` in `.env.local`. */
export const FB_ACCESS_TOKEN = import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN as string | undefined;

/**
 * Reads pixel id from the widget host (`data-meta-pixel-id` / legacy `data-facebook-pixel-id`),
 * then build-time `VITE_FACEBOOK_PIXEL_ID`.
 */
export function getFacebookPixelIdFromRoot(
  root: HTMLElement | null | undefined,
): string | undefined {
  if (root) {
    const meta = root.dataset.metaPixelId?.trim();
    if (meta) return meta;
    const legacy = root.dataset.facebookPixelId?.trim();
    if (legacy) return legacy;
  }
  const env = FB_PIXEL_ID;
  if (env && String(env).trim()) return String(env).trim();
  return undefined;
}

export function getFacebookPixelId(): string | undefined {
  const root =
    typeof document !== "undefined" ? document.getElementById("rcart-widget-root") : null;
  return getFacebookPixelIdFromRoot(root);
}

export const generateEventId = (): string => {
  return crypto.randomUUID();
};

function trackWithConfiguredPixel(name: string, payload: Record<string, unknown>, eventID: string) {
  if (typeof window === "undefined") return;

  const sentAtIso = new Date().toISOString();
  const debug = window.__rcartTrackerDebug === true;

  const pushLog = (entry: Record<string, unknown>) => {
    if (!debug) return;
    window.__rcartTrackerLogs = [...(window.__rcartTrackerLogs || []), entry].slice(-200);

    // Also write last event to widget root data attribute so sandbox can't block it
    const root = typeof document !== "undefined" ? document.getElementById("rcart-widget-root") : null;
    if (root && entry.eventID) {
      root.dataset.rcartLastDispatch = JSON.stringify({
        source: entry.source,
        eventName: entry.eventName,
        eventID: entry.eventID,
        atIso: entry.atIso,
        method: entry.method,
      }).substring(0, 500); // Limit to 500 chars
    }
  };

  const logNetworkObservation = () => {
    if (!debug || typeof performance === "undefined") return;

    window.setTimeout(() => {
      const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const seen = entries.some((entry) => {
        const url = entry.name || "";
        return url.includes("facebook.com/tr/") && url.includes(`eid=${eventID}`);
      });

      if (seen) {
        pushLog({
          source: "pixel-network",
          atIso: new Date().toISOString(),
          status: "request-seen",
          eventName: name,
          eventID,
        });
        console.log("[rcart tracker][network]", {
          status: "request-seen",
          eventName: name,
          eventID,
        });
      } else {
        pushLog({
          source: "pixel-network",
          atIso: new Date().toISOString(),
          status: "request-not-seen-likely-blocked-or-hidden",
          eventName: name,
          eventID,
        });
        console.warn("[rcart tracker][network]", {
          status: "request-not-seen-likely-blocked-or-hidden",
          eventName: name,
          eventID,
        });
      }
    }, 1200);
  };

  const logDispatch = (method: "track" | "trackSingle", pixelId?: string) => {
    if (!debug) return;
      const entry = {
        source: "pixel-dispatch",
      sentAtIso,
      method,
      eventName: name,
      pixelId: pixelId || window.__rcartFbPixelId || null,
      eventID,
      page: typeof location !== "undefined" ? location.href : "",
      payload,
      } as Record<string, unknown>;
      pushLog(entry);
      console.log("[rcart tracker][dispatch]", entry);
  };

  const pixelId = window.__rcartFbPixelId;
  if (pixelId) {
    // Some storefront scripts can replace `window.fbq` after initial load.
    // Re-init before tracking so the active fbq instance always knows our pixel.
    window.fbq?.("init", pixelId);
    try {
      logDispatch("trackSingle", pixelId);
      window.fbq?.("trackSingle", pixelId, name, payload, { eventID });
        logNetworkObservation();
      return;
    } catch {
      // Fall back to standard track on wrappers that do not support trackSingle.
      logDispatch("track", pixelId);
      window.fbq?.("track", name, payload, { eventID });
        logNetworkObservation();
      return;
    }
  }

  logDispatch("track");
  window.fbq?.("track", name, payload, { eventID });
  logNetworkObservation();
}

export const pageview = (queryParams = {}, eventId?: string) => {
  const id = eventId || generateEventId();
  trackWithConfiguredPixel("PageView", queryParams as Record<string, unknown>, id);
  return id;
};

export const fbTracker = (name: string, options = {}, eventId?: string) => {
  const id = eventId || generateEventId();
  trackWithConfiguredPixel(name, options as Record<string, unknown>, id);
  return id;
};
