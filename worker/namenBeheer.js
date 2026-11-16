// nieuw-V3R6 — Beheer → Namenlijst (wens Boska 12-11): de opgeslagen bedrijfsnamen inzien en aanpassen. Alleen voor BEHEERDERS
// (de aanroep loopt via beheerRoute in rechten.js).
// - GET  /api/beheer/namen?zoek=&bron=alle|ai|gebruikers : per naam (sleutel|teken|soort|branche) het AI-voorstel en de keuzes van gebruikers.
// - POST /api/beheer/namen/ai       { k, categorie } : categorie zetten (model "beheerder", geldt ook na een nieuwe vraagversie).
// - POST /api/beheer/namen/ai-wis   { k }            : AI-uitkomst wissen; de naam wordt bij de volgende keer opnieuw opgezocht.
// - POST /api/beheer/namen/stem-wis { k }            : alle keuzes van gebruikers voor deze naam wissen.
// - GET  /api/beheer/namen/alles                     : nieuw-V4R5 — alle namen (voor "Naar Excel").
// - POST /api/beheer/namen/ai-lijst { items: [{ k, categorie }] } : nieuw-V4R5 — categorieën uit een ingelezen Excel opslaan.
import { zorgNamenAi, VRAAG_VERSIE } from "./namenAi.js";
import { zorgNamenStem, legeNamenCache, geldigeSleutel, geldigeCategorie } from "./namenlijst.js";
import { logBeheer } from "./logboek.js";

const MAX = 300;
const MAX_EXPORT = 20000;
const MAX_LIJST = 2000;
const plat = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
const sleutelVan = (r) => `${r.sleutel}|${r.teken}|${r.soort}|${r.branche}`;

export async function leesNamen(db, { zoek = "", bron = "alle", max = MAX } = {}) {
  await zorgNamenAi(db);
  await zorgNamenStem(db);
  const q = plat(zoek);
  const like = `%${q}%`;
  const per = new Map();
  const rij = (r) => {
    const k = sleutelVan(r);
    if (!per.has(k)) per.set(k, { k, naam: r.sleutel, teken: r.teken, soort: r.soort, branche: r.branche, ai: null, stemmen: {}, accounts: 0 });
    return per.get(k);
  };
  if (bron !== "gebruikers") {
    const ai = (await db.prepare(`SELECT sleutel, teken, soort, branche, categorie, zekerheid, soort_bedrijf, model, tijd, versie FROM namen_ai
      WHERE sleutel LIKE ?1 ORDER BY tijd DESC LIMIT ${max}`).bind(like).all())?.results || [];
    for (const r of ai) rij(r).ai = { categorie: r.categorie || null, zekerheid: r.zekerheid || null, soortBedrijf: r.soort_bedrijf || "", model: r.model || "", tijd: r.tijd, beheerder: r.model === "beheerder", verouderd: r.model !== "beheerder" && Number(r.versie) !== VRAAG_VERSIE };
  }
  if (bron !== "ai") {
    const st = (await db.prepare(`SELECT sleutel, teken, soort, branche, categorie, COUNT(*) AS n FROM namen_stem
      WHERE sleutel LIKE ?1 GROUP BY sleutel, teken, soort, branche, categorie LIMIT ${max * 3}`).bind(like).all())?.results || [];
    for (const r of st) { const x = rij(r); x.stemmen[r.categorie] = Number(r.n); x.accounts += Number(r.n); }
  }
  const lijst = [...per.values()].sort((a, b) => (b.ai?.tijd || "").localeCompare(a.ai?.tijd || "") || b.accounts - a.accounts || a.naam.localeCompare(b.naam)).slice(0, max);
  return { namen: lijst, meer: per.size > max };
}

export async function namenBeheerRoute(request, env, url, door) {
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  const db = env.DB;
  if (url.pathname === "/api/beheer/namen" && request.method === "GET") {
    return json({ ok: true, ...(await leesNamen(db, { zoek: url.searchParams.get("zoek") || "", bron: url.searchParams.get("bron") || "alle" })) });
  }
  if (url.pathname === "/api/beheer/namen/alles" && request.method === "GET") {
    return json({ ok: true, ...(await leesNamen(db, { max: MAX_EXPORT })) });
  }
  if (request.method !== "POST") return json({ ok: false, fout: "Onbekende vraag" }, 404);
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, fout: "Ongeldig bericht" }, 400); }
  if (url.pathname === "/api/beheer/namen/ai-lijst") return json(await zetLijst(db, b?.items, door));
  const k = geldigeSleutel(b?.k);
  if (!k) return json({ ok: false, fout: "Ongeldige naam" }, 400);
  const args = [k.sleutel, k.teken, k.soort, k.branche];
  const beschrijving = `${k.sleutel} (${k.teken === "pos" ? "bijschrijving" : "afschrijving"}, ${k.soort}${k.branche ? `, ${k.branche}` : ""})`;
  await zorgNamenAi(db);
  await zorgNamenStem(db);
  if (url.pathname === "/api/beheer/namen/ai") {
    const c = geldigeCategorie(b?.categorie);
    if (!c) return json({ ok: false, fout: "Ongeldige categorie" }, 400);
    const oud = await db.prepare("SELECT categorie FROM namen_ai WHERE sleutel = ? AND teken = ? AND soort = ? AND branche = ?").bind(...args).first();
    await db.prepare(`INSERT INTO namen_ai (sleutel, teken, soort, branche, categorie, zekerheid, soort_bedrijf, model, tijd, versie) VALUES (?1, ?2, ?3, ?4, ?5, 'hoog', '', 'beheerder', ?6, ?7)
      ON CONFLICT(sleutel, teken, soort, branche) DO UPDATE SET categorie = ?5, zekerheid = 'hoog', model = 'beheerder', tijd = ?6, versie = ?7`)
      .bind(...args, c, new Date().toISOString(), VRAAG_VERSIE).run();
    await logBeheer(db, { door, actie: "namenlijst aangepast", details: `${beschrijving}: ${oud?.categorie || "geen"} → ${c}` });
    return json({ ok: true });
  }
  if (url.pathname === "/api/beheer/namen/ai-wis") {
    await db.prepare("DELETE FROM namen_ai WHERE sleutel = ? AND teken = ? AND soort = ? AND branche = ?").bind(...args).run();
    await logBeheer(db, { door, actie: "namenlijst gewist", details: `${beschrijving}: AI-uitkomst gewist (wordt opnieuw opgezocht)` });
    return json({ ok: true });
  }
  if (url.pathname === "/api/beheer/namen/stem-wis") {
    await db.prepare("DELETE FROM namen_stem WHERE sleutel = ? AND teken = ? AND soort = ? AND branche = ?").bind(...args).run();
    legeNamenCache();
    await logBeheer(db, { door, actie: "namenlijst gewist", details: `${beschrijving}: keuzes van gebruikers gewist` });
    return json({ ok: true });
  }
  return json({ ok: false, fout: "Onbekende vraag" }, 404);
}

// nieuw-V4R5 — meerdere categorieën tegelijk (uit "Excel inlezen"). Ongeldige regels worden overgeslagen en teruggemeld.
export async function zetLijst(db, items, door) {
  if (!Array.isArray(items) || !items.length) return { ok: false, fout: "Geen regels" };
  if (items.length > MAX_LIJST) return { ok: false, fout: `Te veel regels (max ${MAX_LIJST})` };
  await zorgNamenAi(db);
  const tijd = new Date().toISOString();
  const goed = [], fout = [];
  for (const it of items) {
    const k = geldigeSleutel(it?.k), c = geldigeCategorie(it?.categorie);
    if (!k || !c) { fout.push(String(it?.k || "")); continue; }
    goed.push(db.prepare(`INSERT INTO namen_ai (sleutel, teken, soort, branche, categorie, zekerheid, soort_bedrijf, model, tijd, versie) VALUES (?1, ?2, ?3, ?4, ?5, 'hoog', '', 'beheerder', ?6, ?7)
      ON CONFLICT(sleutel, teken, soort, branche) DO UPDATE SET categorie = ?5, zekerheid = 'hoog', model = 'beheerder', tijd = ?6, versie = ?7`)
      .bind(k.sleutel, k.teken, k.soort, k.branche, c, tijd, VRAAG_VERSIE));
  }
  for (let i = 0; i < goed.length; i += 100) await db.batch(goed.slice(i, i + 100));
  if (goed.length) await logBeheer(db, { door, actie: "namenlijst ingelezen", details: `${goed.length} categorie${goed.length === 1 ? "" : "ën"} uit Excel gezet${fout.length ? `, ${fout.length} overgeslagen` : ""}` });
  return { ok: true, opgeslagen: goed.length, overgeslagen: fout };
}
