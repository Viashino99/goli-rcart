# rcart-widget

Small React widget that uses `getjacked-components` to render the Rcart games section.
Intended to be built into a single JS/CSS bundle and embedded into a Shopify
Online Store 2.0 theme or theme app extension.

## Develop locally

```bash
npm install
npm run dev
```

Then open the Vite dev server URL and ensure there is an element with
`id="rcart-widget-root"` in `index.html` (for local testing only).

## Build for Shopify 2.0

```bash
npm run build
```

This produces `dist/assets/rcart-widget.js` and related CSS assets.
Upload these assets to your Shopify theme or serve them via a theme app
extension, and add a container element where you want the widget:

```liquid
<div
  id="rcart-widget-root"
  data-partner-code="YOUR_PARTNER_CODE"
  data-email="{{ customer.email | escape }}"
></div>

<script src="{{ 'rcart-widget.js' | asset_url }}" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    var el = document.getElementById('rcart-widget-root');
    if (el && window.mountRcartWidget) {
      window.mountRcartWidget(el);
    }
  });
</script>
```

For a future backend, you can change `src/use-rcart-game-api.ts` to call your
own app's API instead of the hosted rcart API, without touching the Shopify
Liquid or the rest of the widget.
