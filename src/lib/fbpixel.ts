declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Inlined at `vite build` from `VITE_FACEBOOK_PIXEL_ID` in `.env` (goli-rcart default). */
export const FB_PIXEL_ID = import.meta.env.VITE_FACEBOOK_PIXEL_ID as string | undefined;

/**
 * Shopify block `data-meta-pixel-id` or legacy `data-facebook-pixel-id`, then build-time `VITE_FACEBOOK_PIXEL_ID`.
 */
export function getFacebookPixelId(): string | undefined {
  if (typeof document !== "undefined") {
    const root = document.getElementById("rcart-widget-root");
    const meta = root?.dataset.metaPixelId?.trim();
    if (meta) return meta;
    const legacy = root?.dataset.facebookPixelId?.trim();
    if (legacy) return legacy;
  }
  const env = FB_PIXEL_ID;
  if (env && String(env).trim()) return String(env).trim();
  return undefined;
}

/** Build-time token, then Shopify block `data-meta-access-token` on `#rcart-widget-root`. */
export function getFacebookAccessToken(): string | undefined {
  if (typeof document !== "undefined") {
    const fromTheme = document.getElementById("rcart-widget-root")?.dataset.metaAccessToken?.trim();
    if (fromTheme) return fromTheme;
  }
  const env = import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN as string | undefined;
  if (env && String(env).trim()) return String(env).trim();
  return undefined;
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
