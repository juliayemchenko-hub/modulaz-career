exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Invalid JSON" }) };
  }

  const { kandidat_ime, kandidat_kontakt, tvoje_ime, tvoj_kontakt, poruka } = data;

  if (!kandidat_ime || !tvoje_ime || !tvoj_kontakt) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Nedostaju obavezni podaci" }) };
  }

  const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim());

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; color: #1a1a1a;">
      <div style="background: #FAFFD6; border-bottom: 2px solid #1a1a1a; padding: 16px 24px; margin-bottom: 24px;">
        <strong style="font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase;">Nova preporuka kandidata — Modulaz Group</strong>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; width: 170px; font-size: 13px;">Preporučeni kandidat</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 15px;"><strong>${kandidat_ime}</strong></td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 13px;">Kontakt kandidata</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 15px;">${kandidat_kontakt || "—"}</td>
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
    personalizations: [{ to: [{ email: "hr@modulazgroup.com", name: "Modulaz HR" }] }],
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
        "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 202) {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } else {
      const errText = await res.text();
      console.error("SendGrid error:", res.status, errText);
      return { statusCode: 500, body: JSON.stringify({ ok: false }) };
    }
  } catch (err) {
    console.error("Fetch error:", err);
    return { statusCode: 500, body: JSON.stringify({ ok: false }) };
  }
};
