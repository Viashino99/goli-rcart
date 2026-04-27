import { useEffect, useState, Suspense } from "react";

import * as pixel from "../../lib/fbpixel.js";

/** Theme app extension: Liquid sets `data-fbpixel-src` to `fbpixel.js` asset_url. Vite dev serves `public/fbpixel.js` at `/fbpixel.js`. */
function resolveFbpixelScriptUrl(): string | null {
  if (typeof document === "undefined") return null;
  const fromBlock = document.getElementById("rcart-widget-root")?.dataset.fbpixelSrc?.trim();
  if (fromBlock) return fromBlock;
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

const TrackerProvider = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FacebookPixel />
    </Suspense>
  );
};

export default TrackerProvider;
