declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Inlined at `vite build` from `VITE_FACEBOOK_PIXEL_ID` in `.env` (goli-rcart default). */
export const FB_PIXEL_ID = import.meta.env.VITE_FACEBOOK_PIXEL_ID as string | undefined;

/**
 * Prefer build-time pixel ID so shipped bundles from goli-rcart keep the pixel without theme config.
 * Theme `data-facebook-pixel-id` is only used when the build has no ID (e.g. CI placeholder bundle).
 */
export function getFacebookPixelId(): string | undefined {
  const env = FB_PIXEL_ID;
  if (env && String(env).trim()) return String(env).trim();
  if (typeof document !== "undefined") {
    const fromTheme = document.getElementById("rcart-widget-root")?.dataset.facebookPixelId?.trim();
    if (fromTheme) return fromTheme;
  }
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
