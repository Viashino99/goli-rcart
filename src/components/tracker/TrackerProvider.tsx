import { useEffect, useState, Suspense } from "react";

import * as pixel from "../../lib/fbpixel.js";


const FacebookPixel = () => {
  const [loaded, setLoaded] = useState(false);


  // Get query params
  const queryParams: Record<string, string | null> = {};
  const searchParams = new URLSearchParams(location.search);
  searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  // Load script manually (replacement for next/script)
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/scripts/fbpixel.js";
    script.async = true;
    script.setAttribute("data-pixel-id", pixel.FB_PIXEL_ID);
    script.onload = () => setLoaded(true);

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);


  useEffect(() => {
    if (!loaded) return;
    pixel.pageview(queryParams);
  }, [window.location.pathname, window.location.search, loaded]);

  return null;
};

const TrackerProvider = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FacebookPixel />
    </Suspense>
  );
};

export default TrackerProvider;