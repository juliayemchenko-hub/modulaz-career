// Cloudflare Pages Function -> POST /api/referral
import { mgerpConfigured, mgerpFetch } from "../_mgerp.js";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

/** Same posture as the apply form: MGERP is the record, the e-mail is the
 *  notification, and a failure here must not cost the referrer their entry. */
async function fileInMgerp(env, data) {
  if (!mgerpConfigured(env)) return;
  try {
    await mgerpFetch(env, "/recruitment/ingest/referral", {
      method: "POST",
      body: {
        candidateName: data.kandidat_ime,
        candidateContact: data.kandidat_kontakt || undefined,
        referrerName: data.tvoje_ime,
        referrerContact: data.tvoj_kontakt,
        message: data.poruka || undefined,
      },
    });
  } catch (err) {
    console.error("MGERP referral forward failed:", err);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const { kandidat_ime, kandidat_kontakt, tvoje_ime, tvoj_kontakt, poruka } = data;

  if (!kandidat_ime || !tvoje_ime || !tvoj_kontakt) {
    return json({ ok: false, error: "Nedostaju obavezni podaci" }, 400);
  }

  await fileInMgerp(env, data);

  const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim());

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; color: #1a1a1a;">
      <div style="background: #FAFFD6; border-bottom: 2px solid #1a1a1a; padding: 16px 24px; margin-bottom: 24px;">
        <strong style="font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase;">Nova preporuka kandidata - Modulaz Group</strong>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; width: 170px; font-size: 13px;">Preporučeni kandidat</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 15px;"><strong>${kandidat_ime}</strong></td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">Kontakt kandidata</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 15px;">${kandidat_kontakt || "-"}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">Preporučio/la</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 15px;">${tvoje_ime}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666; font-size: 13px;">Kontakt preporučitelja</td>
          <td style="padding: 10px 0; font-size: 15px;">${tvoj_kontakt}</td>
        </tr>
      </table>

      ${poruka ? `
      <div style="background: #f8f8f8; border-radius: 6px; padding: 16px 20px;">
        <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Poruka</div>
        <div style="font-size: 14px; line-height: 1.6;">${poruka.replace(/\n/g, "<br>")}</div>
      </div>` : ""}
    </div>
  `;

  const payload = {
    personalizations: [{ to: [
      { email: "hr@modulazgroup.com", name: "Modulaz HR" },
      { email: "julia.yemchenko@modulazgroup.com", name: "Julia Yemchenko" }
    ] }],
    from: { email: "subscriptions@alfawash.hr", name: "Modulaz Preporuke" },
    reply_to: isEmail(tvoj_kontakt)
      ? { email: tvoj_kontakt.trim(), name: tvoje_ime }
      : { email: "hr@modulazgroup.com", name: "Modulaz HR" },
    subject: `Preporuka kandidata: ${kandidat_ime}`,
    content: [{ type: "text/html", value: htmlBody }]
  };

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 202) return json({ ok: true });
    const errText = await res.text();
    console.error("SendGrid error:", res.status, errText);
    return json({ ok: false }, 500);
  } catch (err) {
    console.error("Fetch error:", err);
    return json({ ok: false }, 500);
  }
}
