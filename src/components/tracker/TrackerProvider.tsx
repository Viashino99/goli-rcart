import { useEffect, useState, Suspense } from "react";

import * as pixel from "../../lib/fbpixel.js";

const ALLOWED_FBPIXEL_HOSTS = ['.shopifycdn.com', '.myshopify.com'];

/**
 * Theme app extension: Liquid sets `data-fbpixel-src` to `fbpixel.js` asset_url.
 * Vite dev serves `public/fbpixel.js` at `/fbpixel.js`.
 *
 * SRI cannot be applied to the nested fbevents.js that this script loads from
 * connect.facebook.net — Facebook updates it frequently and the hash would
 * break. The defence here is restricting which origins are allowed to serve
 * the loader script itself.
 */
function resolveFbpixelScriptUrl(): string | null {
  if (typeof document === "undefined") return null;
  const fromBlock = document.getElementById("rcart-widget-root")?.dataset.fbpixelSrc?.trim();
  if (fromBlock) {
    try {
      const { hostname } = new URL(fromBlock);
      if (!ALLOWED_FBPIXEL_HOSTS.some((suffix) => hostname.endsWith(suffix))) {
        return null;
      }
    } catch {
      return null;
    }
    return fromBlock;
  }
  return "/fbpixel.js";
}

function readUrlKey(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

const FacebookPixel = () => {
  const [loaded, setLoaded] = useState(false);
  const [urlKey, setUrlKey] = useState(readUrlKey);

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

  // Load script manually (replacement for next/script)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const pixelId = pixel.getFacebookPixelId();
    if (!pixelId) {
      setLoaded(true);
      return;
    }
    const src = resolveFbpixelScriptUrl();
    if (!src) {
      setLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.setAttribute("data-pixel-id", pixelId);
    script.onload = () => setLoaded(true);
    script.onerror = () => setLoaded(true);

    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  useEffect(() => {
    if (!loaded || typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const queryParams: Record<string, string | null> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    pixel.pageview(queryParams);
  }, [loaded, urlKey]);

  return null;
};

// Microsoft Clarity — session replay / heatmaps. Scoped to the rewards page only:
// the widget already only mounts where #rcart-widget-root exists, and this path guard
// ensures Clarity never loads anywhere but goli.com/pages/160.
const CLARITY_PROJECT_ID = "xgvtxezvuj";
const CLARITY_PATH_PREFIX = "/pages/160";

type ClarityQueue = { (...args: unknown[]): void; q?: unknown[] };

const Clarity = () => {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (!window.location.pathname.startsWith(CLARITY_PATH_PREFIX)) return;
    // Idempotent — survives StrictMode double-mount / remounts.
    if (document.querySelector("script[data-clarity-tag]")) return;

    // Clarity's bootstrap queue: buffers calls until the async tag loads and replaces it.
    const w = window as Window & { clarity?: ClarityQueue };
    if (!w.clarity) {
      const queued: unknown[] = [];
      const fn = ((...args: unknown[]) => {
        queued.push(args);
      }) as ClarityQueue;
      fn.q = queued;
      w.clarity = fn;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
    script.setAttribute("data-clarity-tag", "");
    document.head.appendChild(script);
    // Not removed on unmount — Clarity should persist for the whole session.
  }, []);

  return null;
};

const TrackerProvider = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FacebookPixel />
      <Clarity />
    </Suspense>
  );
};

export default TrackerProvider;
