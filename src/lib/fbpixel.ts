declare global {
  interface Window {
    Shopify?: {
      analytics?: {
        publish?: (eventName: string, data?: Record<string, unknown>) => void;
      };
    };
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
    const root = typeof document !== "undefined" ? document.getElementById("rcart-widget-root") : null;
    if (root && entry.eventID) {
      root.dataset.rcartLastDispatch = JSON.stringify({
        source: entry.source,
        eventName: entry.eventName,
        eventID: entry.eventID,
        atIso: entry.atIso,
        method: entry.method,
      }).substring(0, 500);
    }
  };

  // Map Meta event name → rcart_* Shopify Customer Events key.
  // e.g. "View Content" → "rcart_view_content", "Purchase" → "rcart_purchase"
  const key = `rcart_${name.toLowerCase().replace(/\s+/g, "_")}`;

  if (debug) {
    const entry = {
      source: "pixel-dispatch",
      sentAtIso,
      method: "shopify-analytics-publish",
      eventName: name,
      key,
      eventID,
      page: typeof location !== "undefined" ? location.href : "",
      payload,
    };
    pushLog(entry);
    console.log("[rcart tracker][dispatch]", entry);
  }

  // Publish to Shopify Customer Events — the rcart-pixel-ext web pixel
  // subscribes to these and fires fbq inside the Meta-approved sandbox.
  window.Shopify?.analytics?.publish?.(key, { data: payload, eventId: eventID });
}

export const pageview = (queryParams: Record<string, unknown> = {}, eventId?: string) => {
  const id = eventId || generateEventId();
  if (typeof window !== "undefined") {
    window.Shopify?.analytics?.publish?.("rcart_pageview", { queryParams, eventId: id });
  }
  return id;
};

export const fbTracker = (name: string, options = {}, eventId?: string) => {
  const id = eventId || generateEventId();
  trackWithConfiguredPixel(name, options as Record<string, unknown>, id);
  return id;
};
