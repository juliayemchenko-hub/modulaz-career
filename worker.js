// Worker entry: serve static assets + handle /api/* (SendGrid forme)
import { onRequestPost as applyHandler } from "./functions/api/apply.js";
import { onRequestPost as referralHandler } from "./functions/api/referral.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/apply") {
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      return applyHandler({ request, env });
    }
    if (url.pathname === "/api/referral") {
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      return referralHandler({ request, env });
    }

    // sve ostalo -> statički fajlovi
    return env.ASSETS.fetch(request);
  }
};
