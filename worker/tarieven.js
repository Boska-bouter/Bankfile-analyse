// beide-V6R7 — tarievenbestand op de server (zie src/tax/tarievenBestand.js). De app haalt het bij het starten op via
// GET /api/tarieven; de beheerder zet een nieuw bestand of haalt het weg via /api/beheer/tarieven. Opslag: D1-tabel
// "tarieven" met één rij. Zonder rij (of zonder database) rekent de app met de tarieven die erin zitten.

import { controleerTarievenBestand } from "../src/tax/tarievenBestand.js";
import { opLijst, controleerPost } from "./rechten.js";

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
      return json({ ok: true, tarieven: null });
    }
    const r = controleerTarievenBestand(body?.tarieven);
    if (!r.ok) return json({ ok: false, fout: r.fout }, 400);
    const tijd = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO tarieven (id, inhoud, versie, gewijzigd, door) VALUES (1, ?1, ?2, ?3, ?4)
       ON CONFLICT(id) DO UPDATE SET inhoud = ?1, versie = ?2, gewijzigd = ?3, door = ?4`
    ).bind(JSON.stringify(r.bestand), r.bestand.versie, tijd, String(email).toLowerCase()).run();
    return json({ ok: true, tarieven: r.bestand, versie: r.bestand.versie, gewijzigd: tijd });
  } catch (err) {
    return json({ ok: false, fout: "Databasefout", detail: String(err?.message || err).slice(0, 300) }, 500);
  }
}
