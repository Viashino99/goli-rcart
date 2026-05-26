import { useEffect, useRef, useState } from "react";

import * as pixel from "../../lib/fbpixel.js";

const ALLOWED_FBPIXEL_HOSTS = ['.shopifycdn.com', '.myshopify.com'];

export type TrackerProviderProps = {
  /** Same node passed to `createRoot` — reads `data-meta-pixel-id` / `data-fbpixel-src`. */
  widgetRoot?: HTMLElement | null;
};

/**
 * Shopify: Liquid sets `data-fbpixel-src="{{ 'fbpixel.js' | asset_url }}"` (CDN URL). That file is
 * `extensions/.../assets/fbpixel.js` in the app — not the store's `/pages/...`.
 *
 * Vite dev: `public/fbpixel.js` is only available at the dev origin root as `/fbpixel.js`.
 * Never use `./fbpixel.js` — on `/pages/foo` the browser requests `/pages/fbpixel.js` (404).
 */
function resolveFbpixelScriptUrl(widgetRoot?: HTMLElement | null): string | null {
  if (typeof document === "undefined" || typeof window === "undefined") return null;

  const fromBlock =
    widgetRoot?.dataset.fbpixelSrc?.trim() ??
    document.getElementById("rcart-widget-root")?.dataset.fbpixelSrc?.trim();
  if (fromBlock) {
    try {
      const { hostname } = new URL(fromBlock);
      const allowed =
        hostname === "cdn.shopify.com" ||
        ALLOWED_FBPIXEL_HOSTS.some((suffix) => hostname.endsWith(suffix));
      if (!allowed) return null;
    } catch {
      return null;
    }
    return fromBlock;
  }

  if (import.meta.env.DEV) {
    return new URL("/fbpixel.js", window.location.origin).href;
  }
  return null;
}

function readUrlKey(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

/** Survives StrictMode remount so we do not remove/re-inject the loader script. */
let fbpixelScriptInjected = false;

const FacebookPixel = ({ widgetRoot }: { widgetRoot?: HTMLElement | null }) => {
  const [loaded, setLoaded] = useState(false);
  const [urlKey, setUrlKey] = useState(readUrlKey);
  const widgetRootRef = useRef(widgetRoot);
  widgetRootRef.current = widgetRoot;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setUrlKey(readUrlKey());
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    const root = widgetRootRef.current;
    const pixelId = pixel.getFacebookPixelIdFromRoot(root ?? undefined);
    if (!pixelId) {
      setLoaded(true);
      return;
    }
    const fbqReady =
      typeof window.__rcartFbPixelId === "string" &&
      window.__rcartFbPixelId === pixelId &&
      typeof window.fbq === "function";
    if (fbqReady) {
      setLoaded(true);
      return;
    }
    const src = resolveFbpixelScriptUrl(root);
    if (!src) {
      setLoaded(true);
      return;
    }
    if (fbpixelScriptInjected) {
      setLoaded(true);
      return;
    }
    fbpixelScriptInjected = true;
    window.__rcartFbPixelPendingId = pixelId;

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.setAttribute("data-pixel-id", pixelId);
    script.onload = () => setLoaded(true);
    script.onerror = () => setLoaded(true);
    
    document.body.appendChild(script);
    // Do not remove the script on effect cleanup — StrictMode would abort load and
    // the old boot flag blocked retries before fbevents.js could run.
  }, []);

  // useEffect(() => {
  //   if (!loaded || typeof window === "undefined") return;
  //   if (!pixel.isFbqReady()) return;
  //   const searchParams = new URLSearchParams(window.location.search);
  //   const queryParams: Record<string, string | null> = {};
  //   searchParams.forEach((value, key) => {
  //     queryParams[key] = value;
  //   });
  //   pixel.pageview(queryParams);
  //   pixel.notifyFbqReady();
  // }, [loaded, urlKey]);

  return null;
};

const TrackerProvider = ({ widgetRoot }: TrackerProviderProps) => (
  <FacebookPixel widgetRoot={widgetRoot} />
);

export default TrackerProvider;
