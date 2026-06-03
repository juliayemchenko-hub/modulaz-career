// Cloudflare Pages Function -> POST /api/apply
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const { ime, prezime, telefon, email, pozicija, poruka, cv_name, cv_data, cv_type } = data;

  if (!ime || !prezime || !email || !pozicija) {
    return json({ ok: false, error: "Nedostaju obavezni podaci" }, 400);
  }

  const attachments = [];
  if (cv_data && cv_name) {
    attachments.push({
      content: cv_data,
      filename: cv_name,
      type: cv_type || "application/octet-stream",
      disposition: "attachment"
    });
  }

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; color: #1a1a1a;">
      <div style="background: #FAFFD6; border-bottom: 2px solid #1a1a1a; padding: 16px 24px; margin-bottom: 24px;">
        <strong style="font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase;">Nova prijava - Modulaz Group</strong>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; width: 140px; font-size: 13px;">Ime i prezime</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 15px;"><strong>${ime} ${prezime}</strong></td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">Email</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 15px;"><a href="mailto:${email}" style="color: #1a1a1a;">${email}</a></td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">Telefon</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 15px;">${telefon || "-"}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #666; font-size: 13px;">Pozicija</td>
          <td style="padding: 10px 0; font-size: 15px;">${pozicija}</td>
        </tr>
      </table>

      ${poruka ? `
      <div style="background: #f8f8f8; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px;">
        <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Poruka</div>
        <div style="font-size: 14px; line-height: 1.6;">${poruka.replace(/\n/g, "<br>")}</div>
      </div>` : ""}

      <div style="font-size: 13px; color: #999; margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee;">
        ${cv_name ? `CV u privitku: ${cv_name}` : "CV nije priložen."}
      </div>
    </div>
  `;

  const payload = {
    personalizations: [{ to: [{ email: "hr@modulazgroup.com", name: "Modulaz HR" }] }],
    from: { email: "subscriptions@alfawash.hr", name: "Modulaz Prijave" },
    reply_to: { email: email, name: `${ime} ${prezime}` },
    subject: `Prijava: ${pozicija} - ${ime} ${prezime}`,
    content: [{ type: "text/html", value: htmlBody }],
    ...(attachments.length > 0 && { attachments })
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
