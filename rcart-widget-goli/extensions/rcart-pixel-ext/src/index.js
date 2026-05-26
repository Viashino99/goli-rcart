import { register } from "@shopify/web-pixels-extension";

register(({ analytics, browser, settings }) => {
  const pixelId = settings.pixelId;
  if (!pixelId) return;

  // Initialize Meta Pixel inside the Shopify sandbox.
  // Must use browser.window / browser.document instead of the global window/document.
  !(function (f, b, e, v, n, t, s) {
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
    s.parentNode.insertBefore(t, s);
  })(
    browser.window,
    browser.document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js"
  );

  browser.window.fbq("init", pixelId);

  // ── Custom rcart widget events ────────────────────────────────────────────
  // TrackerProvider fires rcart_pageview on both initial load and SPA navigation,
  // so we don't subscribe to Shopify's built-in page_viewed to avoid duplicates.
  // Published from the storefront via window.Shopify.analytics.publish().
  // Event names are the lowercase+underscored version of the Meta event name,
  // prefixed with "rcart_".

  analytics.subscribe("rcart_pageview", (event) => {
    // SPA navigation inside the widget (landing → games page etc.)
    browser.window.fbq(
      "track",
      "PageView",
      event.customData?.queryParams ?? {},
      { eventID: event.customData?.eventId }
    );
  });

  analytics.subscribe("rcart_view_content", (event) => {
    browser.window.fbq(
      "track",
      "ViewContent",
      event.customData?.data ?? {},
      { eventID: event.customData?.eventId }
    );
  });

  analytics.subscribe("rcart_complete_registration", (event) => {
    browser.window.fbq(
      "track",
      "CompleteRegistration",
      event.customData?.data ?? {},
      { eventID: event.customData?.eventId }
    );
  });

  analytics.subscribe("rcart_lead", (event) => {
    browser.window.fbq(
      "track",
      "Lead",
      event.customData?.data ?? {},
      { eventID: event.customData?.eventId }
    );
  });

  // Fired when a user installs a game (onInstallGame) AND when a milestone
  // reward is earned (generateCodeForTier). Both go through fbTracker("Purchase").
  analytics.subscribe("rcart_purchase", (event) => {
    browser.window.fbq(
      "track",
      "Purchase",
      event.customData?.data ?? {},
      { eventID: event.customData?.eventId }
    );
  });
});
