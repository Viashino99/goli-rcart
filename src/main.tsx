import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from 'getjacked-components';
import 'getjacked-components/style.css';
import { RcartWidget } from './rcart-widget';
import TrackerProvider from './components/tracker/TrackerProvider';

/** Shopify themes often wrap blocks in `.page-width`; strip horizontal padding so the widget can go edge-to-edge. */
function zeroHorizontalPaddingOnNearestPageWidth(widgetRoot: HTMLElement) {
  const pageWidth =
    widgetRoot.parentElement?.closest<HTMLElement>('.page-width') ?? null;
  if (!pageWidth) return;
  pageWidth.style.paddingLeft = '0';
  pageWidth.style.paddingRight = '0';
  pageWidth.style.maxWidth = '100%';
}

// Blocks dangerous URI schemes (javascript:, data:, vbscript:) that could execute
// code if passed to an <img src>. Allows https://, http://, and protocol-relative
// URLs (//cdn.shopify.com/...) which Shopify's image_url filter can produce.
const BLOCKED_PROTOCOLS = new Set(['javascript:', 'data:', 'vbscript:']);

function safeImageUrl(url: string): string {
  if (!url) return '';
  try {
    return BLOCKED_PROTOCOLS.has(new URL(url).protocol) ? '' : url;
  } catch {
    // Relative or protocol-relative URL — check raw string for dangerous schemes.
    return /^(javascript|data|vbscript):/i.test(url.trim()) ? '' : url;
  }
}

// Mount function so Shopify theme / app-extension script can call it explicitly.
// It looks for a container element and reads data attributes as configuration.
declare const __BUILD_TIME__: string;

export function mountRcartWidget(container: HTMLElement) {
  console.log('[rcart-widget] build:', __BUILD_TIME__);
  if (container.id === 'rcart-widget-root') {
    zeroHorizontalPaddingOnNearestPageWidth(container);
  }

  const dataset = container.dataset;

  const partnerCode = dataset.partnerCode || '';
  const email = dataset.email || null;
  const storeName = dataset.storeName || '';
  const defaultApiUrl = import.meta.env.VITE_WIDGET_API_URL || 'https://rcart-api.vercel.app';
  const apiUrl = String(dataset.apiUrl || defaultApiUrl).replace(/\/$/, '');
  const shop = dataset.shop || '';
  const debugMode = dataset.debugMode === 'true';
  const userId = dataset.userId || '';
  const logoSrc = safeImageUrl(dataset.logoSrc || '');
  const heroImageSrc = safeImageUrl(dataset.heroImageSrc || '');
  const stepImages: [string, string, string] = [
    safeImageUrl(dataset.step1Image || ''),
    safeImageUrl(dataset.step2Image || ''),
    safeImageUrl(dataset.step3Image || ''),
  ];

  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <ThemeProvider defaultMode="system">
        <TrackerProvider />
        <RcartWidget
          partnerCode={partnerCode}
          email={email}
          storeName={storeName}
          apiUrl={apiUrl}
          shop={shop}
          debugMode={debugMode}
          userId={userId}
          logoSrc={logoSrc}
          heroImageSrc={heroImageSrc}
          stepImages={stepImages}
        />
      </ThemeProvider>
    </React.StrictMode>
  );
}

// Guards against third-party scripts re-mounting the widget with attacker-controlled config:
// 1. Container must be an HTMLElement currently in the live document (not detached/crafted).
// 2. Container must carry the expected ID so arbitrary elements can't be targeted.
// 3. A data attribute prevents mounting the same element twice.
function safeMountRcartWidget(container: HTMLElement) {
  if (!(container instanceof HTMLElement)) return;
  if (typeof document === 'undefined' || !document.contains(container)) return;
  if (container.id !== 'rcart-widget-root') return;
  if (container.dataset.rcartMounted === 'true') return;
  container.dataset.rcartMounted = 'true';
  mountRcartWidget(container);
}

// Expose on window so the Shopify liquid block can call it.
if (typeof window !== 'undefined') {
  (window as any).mountRcartWidget = safeMountRcartWidget;
}

// Auto-mount for local testing or simple script tag usage.
if (typeof document !== 'undefined') {
  const el = document.getElementById('rcart-widget-root');
  if (el) {
    safeMountRcartWidget(el);
  }
}
