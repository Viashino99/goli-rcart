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
}

// Mount function so Shopify theme / app-extension script can call it explicitly.
// It looks for a container element and reads data attributes as configuration.
export function mountRcartWidget(container: HTMLElement) {
  if (container.id === 'rcart-widget-root') {
    zeroHorizontalPaddingOnNearestPageWidth(container);
  }

  const dataset = container.dataset;

  const partnerCode = dataset.partnerCode || '';
  const email = dataset.email || null;
  const storeName = dataset.storeName || '';
  const apiUrl = dataset.apiUrl || '';
  const shop = dataset.shop || '';

  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <ThemeProvider defaultMode="system">
        <TrackerProvider />
        <RcartWidget partnerCode={partnerCode} email={email} storeName={storeName} apiUrl={apiUrl} shop={shop} />
      </ThemeProvider>
    </React.StrictMode>
  );
}

// Expose on window so the Shopify liquid block can call it.
if (typeof window !== 'undefined') {
  (window as any).mountRcartWidget = mountRcartWidget;
}

// Optional auto-mount for local testing or simple script tag usage.
if (typeof document !== 'undefined') {
  const el = document.getElementById('rcart-widget-root');
  if (el) {
    mountRcartWidget(el);
  }
}
