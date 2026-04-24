export const FB_PIXEL_ID = import.meta.env.VITE_FACEBOOK_PIXEL_ID;

export const generateEventId = (): string => {
  return crypto.randomUUID();
};

export const pageview = (queryParams = {}, eventId?: string) => {
  const id = eventId || generateEventId();
  window?.fbq("track", "PageView", queryParams, { eventID: id });
  return id;
};

export const fbTracker = (name: string, options = {}, eventId?: string) => {
  const id = eventId || generateEventId();
  window?.fbq("track", name, options, { eventID: id });
  return id;
};
