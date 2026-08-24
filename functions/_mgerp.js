// Shared MGERP client for the Pages Functions.
//
// The browser never talks to MGERP directly: it posts to this site's own
// /api/* routes, and these helpers forward server-side with the shared secret.
// That keeps MGERP_INGEST_SECRET out of the page and means MGERP needs no CORS
// entry for a public origin.
//
// Configure in the Cloudflare Pages project (Settings -> Environment variables):
//   MGERP_API_URL       e.g. https://mgerp.org/api/v1   (optional, this is the default)
//   MGERP_INGEST_SECRET the same value as RECRUITMENT_INGEST_SECRET in MGERP

const DEFAULT_API_URL = "https://mgerp.org/api/v1";

export function mgerpConfigured(env) {
  return !!(env && env.MGERP_INGEST_SECRET);
}

function baseUrl(env) {
  return (env.MGERP_API_URL || DEFAULT_API_URL).replace(/\/+$/, "");
}

/**
 * Call MGERP. Returns the parsed JSON body, or throws.
 *
 * `body` may be a plain object (sent as JSON) or a FormData (sent as multipart,
 * which is how a CV travels — base64 in JSON would exceed MGERP's body limit).
 */
export async function mgerpFetch(env, path, { method = "GET", body } = {}) {
  const headers = { "X-Recruitment-Secret": env.MGERP_INGEST_SECRET };
  let payload;
  if (body instanceof FormData) {
    // Let fetch set the multipart boundary itself.
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${baseUrl(env)}${path}`, { method, headers, body: payload });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`MGERP ${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

/** Decode the base64 the apply form sends into the bytes MGERP expects. */
export function base64ToBlob(base64, contentType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType || "application/octet-stream" });
}
