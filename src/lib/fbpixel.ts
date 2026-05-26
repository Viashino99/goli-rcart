export const RCART_FBQ_READY_EVENT = "rcart-fbq-ready";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    /** Set by TrackerProvider before injecting `fbpixel.js` (async scripts may not expose `data-pixel-id`). */
    __rcartFbPixelPendingId?: string;
    __rcartFbPixelId?: string;
  }
}

/** True when Meta's stub is on the page (our loader or Shopify sales channel). */
export function isFbqReady(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

/** Dispatched once `fbq` is available — use to send events after async pixel load. */
export function notifyFbqReady(): void {
  if (typeof window === "undefined" || !isFbqReady()) return;
  window.dispatchEvent(new CustomEvent(RCART_FBQ_READY_EVENT));
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

export const pageview = (queryParams = {}, eventId?: string) => {
  const id = eventId || generateEventId();
  if (typeof window !== "undefined") {
    window.fbq?.("track", "PageView", queryParams, { eventID: id });
  }
  return id;
};

export const fbTracker = (name: string, options = {}, eventId?: string) => {
  const id = eventId || generateEventId();
  if (typeof window !== "undefined") {
    window.fbq?.("track", name, options, { eventID: id });
  }
  return id;
};
