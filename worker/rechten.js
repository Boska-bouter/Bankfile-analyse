// nieuw-V3R13 — rechten per gebruiker: wie mag de uitgebreide weergave en de bankkoppeling gebruiken?
//
// Drie bronnen, in deze volgorde:
// 1. Secret "BEHEERDERS": e-mailadressen die het beheerscherm mogen openen (en zelf alles mogen).
// 2. Secret "AccessAll": vaste lijst (zoals sinds nieuw-V2R0), krijgt Uitgebreid én bankkoppeling.
// 3. D1-database (binding "DB"), tabel "rechten": per e-mailadres Uitgebreid en/of bankkoppeling, met een
//    optionele einddatum. Deze tabel vult de beheerder via het beheerscherm; vanaf fase 2 ook de betaalwebhook.
// Zonder binding DB werkt alles zoals voorheen (alleen de twee lijsten).
// Lijsten: adressen gescheiden door komma's of spaties, "*@domein.nl" voor een heel domein.

const SCHEMA = `CREATE TABLE IF NOT EXISTS rechten (
  email TEXT PRIMARY KEY,
  uitgebreid INTEGER NOT NULL DEFAULT 0,
  koppelen INTEGER NOT NULL DEFAULT 0,
  geldig_tot TEXT,
  bron TEXT NOT NULL DEFAULT 'handmatig',
  notitie TEXT,
  gewijzigd TEXT NOT NULL,
  gewijzigd_door TEXT
)`;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export function opLijst(email, lijst) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return false;
  return String(lijst || "").split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
    .some((x) => x === e || (x.startsWith("*@") && e.endsWith(x.slice(1))));
}

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const DATUM_RE = /^\d{4}-\d{2}-\d{2}$/;
const vandaag = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }); // JJJJ-MM-DD

// Tabel één keer per isolate aanmaken: de beheerder hoeft geen SQL uit te voeren.
let tabelKlaar = false;
async function zorgVoorTabel(db) {
  if (tabelKlaar) return;
  await db.prepare(SCHEMA).run();
  tabelKlaar = true;
}

const rijNaarRecht = (r) => ({
  email: r.email, uitgebreid: !!r.uitgebreid, koppelen: !!r.koppelen, geldigTot: r.geldig_tot || null,
  bron: r.bron, notitie: r.notitie || "", gewijzigd: r.gewijzigd, gewijzigdDoor: r.gewijzigd_door || null,
});

// Wat mag deze gebruiker? Koppelen kan alleen samen met Uitgebreid (het koppelvenster zit in de uitgebreide weergave).
export async function rechtenVan(email, env) {
  const e = String(email || "").trim().toLowerCase();
  const leeg = { uitgebreid: false, koppelen: false, beheerder: false, geldigTot: null, bron: null };
  if (!e) return leeg;
  const beheerder = opLijst(e, env.BEHEERDERS);
  if (beheerder || opLijst(e, env.AccessAll)) return { uitgebreid: true, koppelen: true, beheerder, geldigTot: null, bron: beheerder ? "beheerder" : "AccessAll" };
  if (!env.DB) return leeg;
  try {
    await zorgVoorTabel(env.DB);
    const r = await env.DB.prepare("SELECT * FROM rechten WHERE email = ?").bind(e).first();
    if (!r) return leeg;
    const actief = !r.geldig_tot || r.geldig_tot >= vandaag();
    const uitgebreid = actief && !!r.uitgebreid;
    return { uitgebreid, koppelen: uitgebreid && !!r.koppelen, beheerder: false, geldigTot: r.geldig_tot || null, bron: r.bron, verlopen: !actief };
  } catch (err) {
    console.error("rechten: D1-fout", err?.message);
    return { ...leeg, dbFout: true };
  }
}

// /api/beheer/* — alleen voor adressen in BEHEERDERS.
export async function beheerRoute(request, env, url, email) {
  if (!opLijst(email, env.BEHEERDERS)) return json({ ok: false, fout: "Alleen voor beheerders" }, 403);
  if (!env.DB) return json({ ok: false, fout: "De database is nog niet gekoppeld (binding DB ontbreekt in de Worker)" }, 503);
  if (request.method === "POST") {
    // Alleen JSON van de app zelf (een formulier van een andere site kan dit niet nabootsen).
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) return json({ ok: false, fout: "Verkeerde herkomst" }, 403);
    if (!String(request.headers.get("content-type") || "").includes("application/json")) return json({ ok: false, fout: "Alleen JSON" }, 415);
  }
  try {
    await zorgVoorTabel(env.DB);
    if (url.pathname === "/api/beheer/rechten" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM rechten ORDER BY email").all();
      return json({ ok: true, vandaag: vandaag(), rechten: (results || []).map(rijNaarRecht) });
    }
    let body;
    try { body = await request.json(); } catch { return json({ ok: false, fout: "Ongeldig bericht" }, 400); }
    const doel = String(body?.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(doel) || doel.length > 200) return json({ ok: false, fout: "Ongeldig e-mailadres" }, 400);

    if (url.pathname === "/api/beheer/rechten" && request.method === "POST") {
      const geldigTot = body?.geldigTot ? String(body.geldigTot) : null;
      if (geldigTot && !DATUM_RE.test(geldigTot)) return json({ ok: false, fout: "Einddatum moet JJJJ-MM-DD zijn" }, 400);
      const uitgebreid = body?.uitgebreid ? 1 : 0;
      const koppelen = uitgebreid && body?.koppelen ? 1 : 0;
      const notitie = String(body?.notitie || "").replace(/[\u0000-\u001F]/g, " ").trim().slice(0, 300);
      await env.DB.prepare(
        `INSERT INTO rechten (email, uitgebreid, koppelen, geldig_tot, bron, notitie, gewijzigd, gewijzigd_door)
         VALUES (?1, ?2, ?3, ?4, 'handmatig', ?5, ?6, ?7)
         ON CONFLICT(email) DO UPDATE SET uitgebreid = ?2, koppelen = ?3, geldig_tot = ?4, notitie = ?5, gewijzigd = ?6, gewijzigd_door = ?7`
      ).bind(doel, uitgebreid, koppelen, geldigTot, notitie, new Date().toISOString(), String(email).toLowerCase()).run();
      return json({ ok: true });
    }
    if (url.pathname === "/api/beheer/verwijder" && request.method === "POST") {
      await env.DB.prepare("DELETE FROM rechten WHERE email = ?").bind(doel).run();
      return json({ ok: true });
    }
    return json({ ok: false, fout: "Onbekende route" }, 404);
  } catch (err) {
    return json({ ok: false, fout: "Databasefout", detail: String(err?.message || err).slice(0, 300) }, 500);
  }
}
