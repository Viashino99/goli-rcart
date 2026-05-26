import { register } from "@shopify/web-pixels-extension";

// API base — events received here are forwarded to Meta Conversions API server-side.
const API_BASE = "https://rcart-api.vercel.app";

register(({ analytics, browser, settings }) => {
  const pixelId = settings.pixelId;
  if (!pixelId) return;

  const beacon = (eventName, data) => {
    browser.sendBeacon(
      `${API_BASE}/api/pixel/event`,
      JSON.stringify({ pixelId, eventName, data }),
    );
  };

  analytics.subscribe("rcart_pageview", (event) => {
    beacon("PageView", {
      queryParams: event.customData?.queryParams ?? {},
      eventId: event.customData?.eventId,
    });
  });

  analytics.subscribe("rcart_view_content", (event) => {
    beacon("ViewContent", { ...(event.customData?.data ?? {}), eventId: event.customData?.eventId });
  });

  analytics.subscribe("rcart_complete_registration", (event) => {
    beacon("CompleteRegistration", { ...(event.customData?.data ?? {}), eventId: event.customData?.eventId });
  });

  analytics.subscribe("rcart_lead", (event) => {
    beacon("Lead", { ...(event.customData?.data ?? {}), eventId: event.customData?.eventId });
  });

  analytics.subscribe("rcart_purchase", (event) => {
    beacon("Purchase", { ...(event.customData?.data ?? {}), eventId: event.customData?.eventId });
  });
});
