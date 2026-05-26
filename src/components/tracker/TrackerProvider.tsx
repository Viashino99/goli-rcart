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

  if (widgetRoot) {
    widgetRoot.dataset.rcartTrackerStage = stage;
    widgetRoot.dataset.rcartTrackerTime = new Date().toISOString();
    if (extras.eventId) widgetRoot.dataset.rcartEventId = String(extras.eventId);
    if (extras.urlKey) widgetRoot.dataset.rcartUrlKey = String(extras.urlKey);
  }

  window.__rcartTrackerState = { stage, atIso: new Date().toISOString(), ...extras };
  window.__rcartTrackerLogs = [
    ...(window.__rcartTrackerLogs || []),
    { source: "tracker-state", atIso: new Date().toISOString(), stage, ...extras },
  ].slice(-200);
}

function readUrlKey(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

const FacebookPixel = ({ widgetRoot: _widgetRoot }: { widgetRoot?: HTMLElement | null }) => {
  const [ready, setReady] = useState(false);
  const [urlKey, setUrlKey] = useState(readUrlKey);
  const trackedUrlRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__rcartTrackerDebug = trackerDebugEnabled(_widgetRoot);
    if (_widgetRoot) {
      _widgetRoot.dataset.rcartTrackerDebug = String(trackerDebugEnabled(_widgetRoot));
    }
    trackerState(_widgetRoot, "tracker-mounted");
    setReady(true);
    return () => {
      window.__rcartTrackerDebug = false;
      if (_widgetRoot) _widgetRoot.dataset.rcartTrackerDebug = "false";
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
    if (!ready || typeof window === "undefined") return;
    if (trackedUrlRef.current === urlKey) return;

    const searchParams = new URLSearchParams(window.location.search);
    const queryParams: Record<string, string | null> = {};
    searchParams.forEach((value, key) => { queryParams[key] = value; });

    trackedUrlRef.current = urlKey;
    const eventId = pixel.pageview(queryParams);
    trackerLog(_widgetRoot, "PageView published", { urlKey, queryParams, eventId });
    trackerState(_widgetRoot, "pageview-dispatched", { urlKey, eventId });
  }, [ready, urlKey]);

  return null;
};

const TrackerProvider = ({ widgetRoot }: TrackerProviderProps) => (
  <FacebookPixel widgetRoot={widgetRoot} />
);

export default TrackerProvider;
