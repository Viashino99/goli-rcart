(function () {
  const scriptEl =
    document.currentScript ||
    [...document.querySelectorAll("script[data-pixel-id][src*='fbpixel']")].pop();
  const pixelId =
    scriptEl?.getAttribute("data-pixel-id") ||
    window.__rcartFbPixelPendingId;
  if (!pixelId) return;

  // Already initialized for this pixel (e.g. script tag re-appended after StrictMode cleanup).
  if (window.__rcartFbPixelId === pixelId && window.fbq) return;

  function initializeFacebookPixel(f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  }

  initializeFacebookPixel(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js",
  );

  window.fbq("init", pixelId);
  window.__rcartFbPixelId = pixelId;
  delete window.__rcartFbPixelPendingId;
})();
