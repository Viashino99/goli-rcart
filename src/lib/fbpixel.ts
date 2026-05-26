declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
      push?: (...args: unknown[]) => void;
      _fbq?: unknown;
    };
    _fbq?: unknown;
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

// Map standard Meta event names to Shopify Customer Events keys
const META_TO_SHOPIFY_KEY: Record<string, string> = {
  PageView: "rcart_pageview",
  ViewContent: "rcart_view_content",
  CompleteRegistration: "rcart_complete_registration",
  Lead: "rcart_lead",
  Purchase: "rcart_purchase",
};

let fbqInitialized = false;

/**
 * Lazily load fbevents.js and initialize with the store's pixel ID.
 * Safe to call multiple times — no-ops after first call.
 */
function ensureFbqInitialized(): void {
  if (typeof window === "undefined" || fbqInitialized) return;
  fbqInitialized = true;

  const pixelId = getFacebookPixelId();
  if (!pixelId) return;

  // Stub so queued calls work before fbevents.js finishes loading
  if (!window.fbq) {
    const q: unknown[] = [];
    const fbqStub = function (...args: unknown[]) {
      const fn = fbqStub as typeof fbqStub & { callMethod?: (...a: unknown[]) => void };
      fn.callMethod ? fn.callMethod.apply(fn, args) : q.push(args);
    } as NonNullable<Window["fbq"]>;
    fbqStub.queue = q;
    fbqStub.loaded = true;
    fbqStub.version = "2.0";
    window.fbq = fbqStub;
    window._fbq = fbqStub;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const first = document.getElementsByTagName("script")[0];
    if (first?.parentNode) first.parentNode.insertBefore(script, first);
  }

  window.fbq!("init", pixelId);
}

function callFbq(metaEventName: string, payload: Record<string, unknown>, eventID: string): void {
  ensureFbqInitialized();
  if (typeof window.fbq === "function") {
    window.fbq("track", metaEventName, payload, { eventID });
  }
}

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

  // Client-side: call window.fbq directly (visible in Pixel Helper)
  callFbq(name, payload, eventID);

  // Server-side: publish to Shopify Customer Events → web pixel extension → sendBeacon → Conversions API
  const shopifyKey = META_TO_SHOPIFY_KEY[name] ?? `rcart_${name.toLowerCase().replace(/\s+/g, "_")}`;
  window.Shopify?.analytics?.publish?.(shopifyKey, { data: payload, eventId: eventID });

  if (debug) {
    const entry = {
      source: "pixel-dispatch",
      sentAtIso,
      method: "fbq+shopify-analytics",
      eventName: name,
      shopifyKey,
      eventID,
      page: typeof location !== "undefined" ? location.href : "",
      payload,
    };
    pushLog(entry);
    console.log("[rcart tracker][dispatch]", entry);
  }
}

export const pageview = (queryParams: Record<string, unknown> = {}, eventId?: string) => {
  const id = eventId || generateEventId();
  if (typeof window !== "undefined") {
    // Client-side fbq
    ensureFbqInitialized();
    if (typeof window.fbq === "function") {
      window.fbq("track", "PageView", queryParams, { eventID: id });
    }
    // Shopify Customer Events (for web pixel extension / server-side)
    window.Shopify?.analytics?.publish?.("rcart_pageview", { queryParams, eventId: id });
  }
  return id;
};

export const fbTracker = (name: string, options = {}, eventId?: string) => {
  const id = eventId || generateEventId();
  trackWithConfiguredPixel(name, options as Record<string, unknown>, id);
  return id;
};
