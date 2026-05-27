import { register } from "@shopify/web-pixels-extension";

const API_BASE = "https://rcart-api.vercel.app";

register(({ analytics, browser, settings }) => {
  const getFbCookies = async () => {
    try {
      const fbp = await browser.cookie.get("_fbp");
      const fbc = await browser.cookie.get("_fbc");
      return {
        ...(fbp?.value ? { fbp: fbp.value } : {}),
        ...(fbc?.value ? { fbc: fbc.value } : {}),
      };
    } catch {
      return {};
    }
  };

  const beacon = async (pixelId, eventName, data) => {
    if (!pixelId) return;
    const fbCookies = await getFbCookies();
    browser.sendBeacon(
      `${API_BASE}/api/pixel/event`,
      JSON.stringify({ pixelId, eventName, data: { ...data, ...fbCookies } }),
    );
  };

  analytics.subscribe("rcart_pageview", (event) => {
    const pixelId = event.customData?.pixelId || settings.pixelId;
    beacon(pixelId, "PageView", {
      queryParams: event.customData?.queryParams ?? {},
      eventId: event.customData?.eventId,
    });
  });

  analytics.subscribe("rcart_view_content", (event) => {
    const pixelId = event.customData?.pixelId || settings.pixelId;
    beacon(pixelId, "ViewContent", { ...(event.customData?.data ?? {}), eventId: event.customData?.eventId });
  });

  analytics.subscribe("rcart_complete_registration", (event) => {
    const pixelId = event.customData?.pixelId || settings.pixelId;
    beacon(pixelId, "CompleteRegistration", { ...(event.customData?.data ?? {}), eventId: event.customData?.eventId });
  });

  analytics.subscribe("rcart_lead", (event) => {
    const pixelId = event.customData?.pixelId || settings.pixelId;
    beacon(pixelId, "Lead", { ...(event.customData?.data ?? {}), eventId: event.customData?.eventId });
  });

  analytics.subscribe("rcart_purchase", (event) => {
    const pixelId = event.customData?.pixelId || settings.pixelId;
    beacon(pixelId, "Purchase", { ...(event.customData?.data ?? {}), eventId: event.customData?.eventId });
  });
});
