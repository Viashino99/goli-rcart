/**
 * Forces every Tailwind utility to `!important`. The widget is embedded in arbitrary Shopify
 * themes whose CSS is *unlayered* — and unlayered CSS beats our layered utilities in the cascade,
 * no matter the specificity. `!important` is the one thing that wins across cascade layers, so it
 * guarantees the widget's own styling overrides the host theme on any store. Works whether the
 * widget renders in the shadow root or (fallback) the light DOM.
 */
export default {
  important: true,
};
