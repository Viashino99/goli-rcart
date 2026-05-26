import { useEffect, useRef, useState } from "react";

import * as pixel from "../../lib/fbpixel.js";

declare global {
  interface Window {
    __rcartTrackerDebug?: boolean;
    __rcartTrackerLogs?: Array<Record<string, unknown>>;
    __rcartDumpTrackerLogs?: () => Array<Record<string, unknown>>;
    __rcartTrackerState?: {
      stage: string;
      atIso: string;
      pixelId?: string;
      eventId?: string;
      urlKey?: string;
    };
  }
}

export type TrackerProviderProps = {
  widgetRoot?: HTMLElement | null;
};

function trackerDebugEnabled(widgetRoot: HTMLElement | null | undefined): boolean {
  const datasetEnabled = widgetRoot?.dataset.debugMode === "true";
  if (datasetEnabled) return true;
  if (typeof window === "undefined") return false;
  const qp = new URLSearchParams(window.location.search);
  return qp.get("rcartDebug") === "1";
}

function trackerLog(widgetRoot: HTMLElement | null | undefined, ...args: unknown[]) {
  if (!trackerDebugEnabled(widgetRoot)) return;
  if (typeof window !== "undefined") {
    const entry = {
      source: "tracker",
      atIso: new Date().toISOString(),
      args,
    } as Record<string, unknown>;
    window.__rcartTrackerLogs = [...(window.__rcartTrackerLogs || []), entry].slice(-200);
  }
  console.log("[rcart tracker]", ...args);
}

function trackerState(
  widgetRoot: HTMLElement | null | undefined,
  stage: string,
  extras: Partial<Window["__rcartTrackerState"]> = {},
) {
  if (typeof window === "undefined") return;
  if (!trackerDebugEnabled(widgetRoot)) return;
  window.__rcartTrackerLogs = window.__rcartTrackerLogs || [];
  window.__rcartDumpTrackerLogs = () => [...(window.__rcartTrackerLogs || [])];

  // Also persist to DOM so it survives sandbox restrictions
  if (widgetRoot) {
    widgetRoot.dataset.rcartTrackerStage = stage;
    widgetRoot.dataset.rcartTrackerTime = new Date().toISOString();
    if (extras.pixelId) widgetRoot.dataset.rcartPixelId = String(extras.pixelId);
    if (extras.eventId) widgetRoot.dataset.rcartEventId = String(extras.eventId);
    if (extras.urlKey) widgetRoot.dataset.rcartUrlKey = String(extras.urlKey);
  }

  window.__rcartTrackerState = {
    stage,
    atIso: new Date().toISOString(),
    ...extras,
  };
  window.__rcartTrackerLogs = [
    ...(window.__rcartTrackerLogs || []),
    {
      source: "tracker-state",
      atIso: new Date().toISOString(),
      stage,
      ...extras,
    },
  ].slice(-200);
}

function readUrlKey(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

const FacebookPixel = ({ widgetRoot: _widgetRoot }: { widgetRoot?: HTMLElement | null }) => {
  const [loaded, setLoaded] = useState(false);
  const [urlKey, setUrlKey] = useState(readUrlKey);
  const trackedUrlRef = useRef<string>("");
  const storeManagedFbqRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__rcartTrackerDebug = trackerDebugEnabled(_widgetRoot);
    trackerState(_widgetRoot, "tracker-mounted");

    // Also write to DOM data attribute so sandbox can't block inspection
    if (_widgetRoot) {
      _widgetRoot.dataset.rcartTrackerDebug = String(trackerDebugEnabled(_widgetRoot));
    }

    return () => {
      window.__rcartTrackerDebug = false;
      if (_widgetRoot) {
        _widgetRoot.dataset.rcartTrackerDebug = "false";
      }
    };
  }, [_widgetRoot]);

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

    const pixelId = pixel.getFacebookPixelIdFromRoot(_widgetRoot);
    if (!pixelId) {
      trackerLog(_widgetRoot, "No pixel id found on root/env; tracker disabled");
      trackerState(_widgetRoot, "missing-pixel-id");
      return;
    }

    trackerLog(_widgetRoot, "Resolved pixel id", pixelId);
    trackerState(_widgetRoot, "pixel-id-resolved", { pixelId });

    if (window.__rcartFbPixelId === pixelId && typeof window.fbq === "function") {
      storeManagedFbqRef.current = true;
      trackerLog(_widgetRoot, "Using existing fbq for pixel", pixelId);
      trackerState(_widgetRoot, "using-existing-fbq", { pixelId });
      setLoaded(true);
      return;
    }

    // If the store's pixel (e.g. Shopify Facebook & Instagram app) is already ready, use it.
    if (typeof window.fbq === "function") {
      storeManagedFbqRef.current = true;
      // Ensure our configured pixel is initialized even when fbq is preloaded by the store.
      window.fbq("init", pixelId);
      window.__rcartFbPixelId = pixelId;
      trackerLog(_widgetRoot, "Store-provided fbq detected; using store pixel", pixelId);
      trackerState(_widgetRoot, "store-fbq-initialized", { pixelId });
      setLoaded(true);
      return;
    }

    // Fallback: initialize fbq ourselves when the store does not provide one.
    window.__rcartFbPixelPendingId = pixelId;
    (function initializeFacebookPixel(f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode?.insertBefore(t, s);
    })(window as any, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    window.fbq?.("init", pixelId);
    window.__rcartFbPixelId = pixelId;
    storeManagedFbqRef.current = false;
    delete window.__rcartFbPixelPendingId;
    trackerLog(_widgetRoot, "Initialized fallback fbq", pixelId);
    trackerState(_widgetRoot, "fallback-fbq-initialized", { pixelId });
    setLoaded(true);
  }, [_widgetRoot]);

  useEffect(() => {
    if (!loaded || typeof window === "undefined") return;
    if (trackedUrlRef.current === urlKey) return;

    const forceWidgetPageView = new URLSearchParams(window.location.search).get("rcartForcePageView") === "1";
    if (storeManagedFbqRef.current && !forceWidgetPageView) {
      trackedUrlRef.current = urlKey;
      trackerLog(_widgetRoot, "Skipping widget PageView because store-managed fbq is active", {
        pixelId: window.__rcartFbPixelId,
        urlKey,
      });
      trackerState(_widgetRoot, "pageview-skipped-store-managed", {
        pixelId: window.__rcartFbPixelId,
        urlKey,
      });
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const queryParams: Record<string, string | null> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    trackedUrlRef.current = urlKey;
    const eventId = pixel.pageview(queryParams);
    trackerLog(_widgetRoot, "PageView sent", {
      pixelId: window.__rcartFbPixelId,
      urlKey,
      queryParams,
      eventId,
    });
    trackerState(_widgetRoot, "pageview-dispatched", {
      pixelId: window.__rcartFbPixelId,
      urlKey,
      eventId,
    });
  }, [loaded, urlKey]);

  return null;
};

const TrackerProvider = ({ widgetRoot }: TrackerProviderProps) => (
  <FacebookPixel widgetRoot={widgetRoot} />
);

export default TrackerProvider;
