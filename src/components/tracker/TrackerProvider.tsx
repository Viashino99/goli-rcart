import { useEffect, useRef, useState } from "react";

import * as pixel from "../../lib/fbpixel.js";

export type TrackerProviderProps = {
  widgetRoot?: HTMLElement | null;
};

function readUrlKey(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

const FacebookPixel = ({ widgetRoot: _widgetRoot }: { widgetRoot?: HTMLElement | null }) => {
  const [loaded, setLoaded] = useState(false);
  const [urlKey, setUrlKey] = useState(readUrlKey);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (typeof window === "undefined") return;

    // If the store's pixel (e.g. Shopify Facebook & Instagram app) is already ready, use it.
    if (typeof window.fbq === "function") {
      setLoaded(true);
      return;
    }

    // Poll until the store initializes fbq — never init it ourselves to avoid duplicate warnings.
    intervalRef.current = setInterval(() => {
      if (typeof window.fbq === "function") {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setLoaded(true);
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
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

const TrackerProvider = ({ widgetRoot }: TrackerProviderProps) => (
  <FacebookPixel widgetRoot={widgetRoot} />
);

export default TrackerProvider;
