// Bankoverzicht — hulpvraag/feedback ontvangen en per e-mail doorsturen (Cloudflare Worker).
// De app (React) stuurt een POST naar /api/feedback op dezelfde hostnaam als de app. Die hostnaam staat achter
// Cloudflare Access, dus alleen ingelogde gebruikers komen hier. Access zet hun e-mailadres in de header
// "Cf-Access-Authenticated-User-Email"; dat gebruiken we als antwoordadres.
//
// Instellingen (zie wrangler.jsonc): binding EMAIL (send_email), variabelen FEEDBACK_TO en FEEDBACK_FROM.

const MAX = { naam: 100, onderwerp: 150, bericht: 5000 };
const SOORTEN = ["Hulpvraag", "Feedback"];

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const schoon = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/feedback") return new Response("Not found", { status: 404 });
    if (request.method !== "POST") return json({ ok: false, fout: "Alleen POST" }, 405);

    const email = request.headers.get("Cf-Access-Authenticated-User-Email");
    if (!email) return json({ ok: false, fout: "Niet ingelogd" }, 401);

    let body;
    try { body = await request.json(); } catch { return json({ ok: false, fout: "Ongeldig bericht" }, 400); }

    const soort = SOORTEN.includes(body?.soort) ? body.soort : "Hulpvraag";
    const naam = schoon(body?.naam, MAX.naam);
    const onderwerp = schoon(body?.onderwerp, MAX.onderwerp);
    const bericht = schoon(body?.bericht, MAX.bericht);
    const release = schoon(body?.release, 40);
    if (!bericht) return json({ ok: false, fout: "Bericht is leeg" }, 400);

    const subject = `[Bankoverzicht] ${soort}${onderwerp ? `: ${onderwerp.replace(/[\r\n]+/g, " ")}` : ""}`;
    const regels = [`Van: ${naam || "(geen naam)"} <${email}>`, `App: ${release || "onbekend"}`];
    const text = `${bericht}\n\n—\n${regels.join("\n")}`;
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${esc(bericht)}</div><hr><p style="font-family:Arial,sans-serif;font-size:12px;color:#555">${regels.map(esc).join("<br>")}</p>`;

    const bericht_ = { to: env.FEEDBACK_TO, from: env.FEEDBACK_FROM, subject, text, html };
    try {
      try {
        await env.EMAIL.send({ ...bericht_, replyTo: email });
      } catch {
        // Niet elke versie van de binding kent replyTo: probeer zonder (het antwoordadres staat in de tekst).
        await env.EMAIL.send(bericht_);
      }
    } catch (e) {
      return json({ ok: false, fout: "Versturen mislukt" }, 502);
    }
    return json({ ok: true });
  },
};
