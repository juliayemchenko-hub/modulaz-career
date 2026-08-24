// Cloudflare Pages Function -> GET /api/positions
//
// Serves the live listing from MGERP to the careers page. The page renders its
// built-in copy first and only swaps in this response, so every failure here is
// deliberately quiet: an empty payload leaves the visitor on the built-in list
// rather than on an error.

import { mgerpConfigured, mgerpFetch } from "../_mgerp.js";

const json = (obj, status = 200, cacheSeconds = 0) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      // A posting opens or closes a few times a month; a short edge cache keeps
      // the page fast without making HR wait long to see a change go live.
      "Cache-Control": cacheSeconds > 0 ? `public, max-age=60, s-maxage=${cacheSeconds}` : "no-store",
    },
  });

export async function onRequestGet(context) {
  const { env } = context;
  if (!mgerpConfigured(env)) return json({ data: [] });

  try {
    const res = await mgerpFetch(env, "/recruitment/ingest/positions");
    const data = Array.isArray(res?.data) ? res.data : [];
    return json({ data }, 200, 300);
  } catch (err) {
    console.error("positions fetch failed:", err);
    return json({ data: [] });
  }
}
