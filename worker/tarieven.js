// beide-V6R7 — tarievenbestand op de server (zie src/tax/tarievenBestand.js). De app haalt het bij het starten op via
// GET /api/tarieven; de beheerder zet een nieuw bestand of haalt het weg via /api/beheer/tarieven. Opslag: D1-tabel
// "tarieven" met één rij. Zonder rij (of zonder database) rekent de app met de tarieven die erin zitten.

import { controleerTarievenBestand } from "../src/tax/tarievenBestand.js";
import { opLijst, controleerPost } from "./rechten.js";
import { logBeheer } from "./logboek.js";
import { tarievenHerinnering } from "../src/tax/tarievenLaden.js";
import { verstuur, opmaakMail } from "./inloggen.js";

const SCHEMA = "CREATE TABLE IF NOT EXISTS tarieven (id INTEGER PRIMARY KEY CHECK (id = 1), inhoud TEXT NOT NULL, versie TEXT, gewijzigd TEXT NOT NULL, door TEXT)";
const MAX_GROOTTE = 200_000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

async function huidig(db) {
  await db.prepare(SCHEMA).run();
  const r = await db.prepare("SELECT inhoud, versie, gewijzigd, door FROM tarieven WHERE id = 1").first();
  if (!r) return null;
  try { return { tarieven: JSON.parse(r.inhoud), versie: r.versie, gewijzigd: r.gewijzigd, door: r.door }; } catch { return null; }
}

// GET /api/tarieven — voor iedereen die is ingelogd (de Worker heeft dat al gecontroleerd).
export async function tarievenRoute(request, env) {
  if (request.method !== "GET") return json({ ok: false, fout: "Alleen GET" }, 405);
  if (!env.DB) return json({ ok: true, tarieven: null });
  try {
    const h = await huidig(env.DB);
    return json({ ok: true, tarieven: h?.tarieven || null });
  } catch {
    return json({ ok: true, tarieven: null }); // liever de ingebouwde tarieven dan een app die niet start
  }
}

// /api/beheer/tarieven — GET: wat staat er; POST { tarieven }: nieuw bestand; POST { wissen: true }: terug naar de app.
export async function tarievenBeheerRoute(request, env, url, email) {
  if (!opLijst(email, env.BEHEERDERS)) return json({ ok: false, fout: "Alleen voor beheerders" }, 403);
  if (!env.DB) return json({ ok: false, fout: "De database is nog niet gekoppeld (binding DB ontbreekt in de Worker)" }, 503);
  try {
    if (request.method === "GET") {
      const h = await huidig(env.DB);
      return json({ ok: true, ...(h || { tarieven: null }) });
    }
    if (request.method !== "POST") return json({ ok: false, fout: "Alleen GET of POST" }, 405);
    const fout = controleerPost(request, url);
    if (fout) return fout;
    const tekst = await request.text();
    if (tekst.length > MAX_GROOTTE) return json({ ok: false, fout: "Bestand is te groot" }, 413);
    let body;
    try { body = JSON.parse(tekst); } catch { return json({ ok: false, fout: "Ongeldig bericht" }, 400); }
    await env.DB.prepare(SCHEMA).run();
    if (body?.wissen === true) {
      await env.DB.prepare("DELETE FROM tarieven WHERE id = 1").run();
      await logBeheer(env.DB, { door: email, actie: "tarieven teruggezet", details: "terug naar de ingebouwde tarieven" });
      return json({ ok: true, tarieven: null });
    }
    const r = controleerTarievenBestand(body?.tarieven);
    if (!r.ok) return json({ ok: false, fout: r.fout }, 400);
    const tijd = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO tarieven (id, inhoud, versie, gewijzigd, door) VALUES (1, ?1, ?2, ?3, ?4)
       ON CONFLICT(id) DO UPDATE SET inhoud = ?1, versie = ?2, gewijzigd = ?3, door = ?4`
    ).bind(JSON.stringify(r.bestand), r.bestand.versie, tijd, String(email).toLowerCase()).run();
    await logBeheer(env.DB, { door: email, actie: "tarievenbestand gezet", details: `versie ${r.bestand.versie || "zonder versie"}; jaren ${Object.keys(r.bestand.jaren).join(", ")}` });
    return json({ ok: true, tarieven: r.bestand, versie: r.bestand.versie, gewijzigd: tijd });
  } catch (err) {
    return json({ ok: false, fout: "Databasefout", detail: String(err?.message || err).slice(0, 300) }, 500);
  }
}

// beide-V6R8 — herinneringsmail aan de beheerders (BEHEERDERS) als de tarieven van het komende of lopende jaar ontbreken
// of nog voorlopig zijn (zie tarievenHerinnering). Draait alleen als er in wrangler.jsonc een Cron Trigger staat,
// bijvoorbeeld "triggers": { "crons": ["0 7 1,15 12,1,2,3 *"] } (1e en 15e van december t/m maart, 08:00 NL-wintertijd).
export async function tarievenHerinneringMail(env, nu = new Date()) {
  let bestand = null;
  try { if (env.DB) bestand = (await huidig(env.DB))?.tarieven || null; } catch { /* dan alleen de ingebouwde tarieven */ }
  const h = tarievenHerinnering(nu, bestand);
  if (!h) return { verstuurd: 0, reden: "tarieven zijn bij" };
  const from = env.INLOG_FROM || env.FEEDBACK_FROM;
  const aan = String(env.BEHEERDERS || "").split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter((x) => x && !x.startsWith("*@"));
  if ((!env.EMAIL && !env.RESEND_API_KEY) || !from || !aan.length) return { verstuurd: 0, reden: "geen afzender of beheerder" };
  const { text, html } = opmaakMail(env, {
    regels: [`${h.tekst}. Zolang dat zo is, rekent RekeningNaarAangifte voor ${h.jaar} met voorlopige of benaderde bedragen.`,
      "Zet het nieuwe tarievenbestand op de server via Gebruikers en rechten → Tarieven (eerst DEV, dan productie)."],
    voetnoot: "Deze herinnering komt op de 1e en 15e van december tot en met maart, tot de tarieven zijn bijgewerkt.",
  });
  let verstuurd = 0;
  for (const to of aan) {
    try { await verstuur(env, { to, from, subject: `RekeningNaarAangifte: ${h.tekst.toLowerCase()}`, text, html }); verstuurd++; }
    catch (e) { console.error("tarieven: herinnering mislukt", e?.message); }
  }
  return { verstuurd };
}
