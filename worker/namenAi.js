// nieuw-V2R2 — fase 2 van "bedrijfsnamen opzoeken bij het laden": namen die niet in de gedeelde namenlijst staan, laat de
// Worker indelen door Claude (Haiku). Alleen de verkorte bedrijfsnaam, of het een betaling of ontvangst is, de soort rekening en
// de soort bedrijf gaan mee; nooit bedragen, datums, rekeningnummers, omschrijvingen, namen van personen of wie het vraagt.
// De uitkomst wordt per naam bewaard in D1 (namen_ai) en is voor iedereen: dezelfde naam kost maar één keer iets.
// In de app wordt het altijd een voorstel op "nakijken", nooit zeker.
//
// Instellingen (Cloudflare → Worker → Settings → Variables and Secrets):
// - Secret ANTHROPIC_API_KEY (verplicht; zonder deze sleutel staat het opzoeken uit). Nooit in wrangler.jsonc.
// - Variabele NAMEN_AI = "uit" zet het opzoeken uit, ook met sleutel.
// - Variabele NAMEN_AI_MODEL (standaard claude-haiku-5-5), NAMEN_AI_PER_DAG (per account, standaard 500 namen),
//   NAMEN_AI_TOTAAL_PER_DAG (alle accounts samen, standaard 5000 namen).
import Anthropic from "@anthropic-ai/sdk";
import { geldigeCategorie } from "./namenlijst.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS namen_ai (sleutel TEXT NOT NULL, teken TEXT NOT NULL, soort TEXT NOT NULL, branche TEXT NOT NULL,
    categorie TEXT, zekerheid TEXT, soort_bedrijf TEXT, model TEXT, tijd TEXT NOT NULL, PRIMARY KEY (sleutel, teken, soort, branche))`,
  "CREATE TABLE IF NOT EXISTS namen_ai_teller (account TEXT NOT NULL, dag TEXT NOT NULL, aantal INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (account, dag))",
];
const klaar = new WeakSet();
async function zorg(db) {
  if (klaar.has(db)) return;
  for (const s of SCHEMA) await db.prepare(s).run();
  const kol = new Set(((await db.prepare("PRAGMA table_info(namen_ai)").all())?.results || []).map((k) => k.name));
  if (!kol.has("versie")) await db.prepare("ALTER TABLE namen_ai ADD COLUMN versie INTEGER NOT NULL DEFAULT 1").run();
  klaar.add(db);
}

export const MODEL = "claude-haiku-5-5";
const MAX_PER_VRAAG = 50; // namen per verzoek van de app
const MAX_CATEGORIEEN = 250;
const ONBEKEND = "Onbekend";
// nieuw-V2R3 — categorieën die een contract of eigen gegevens vragen (lease, leningen, hypotheek, eigen rekeningen): nooit door de AI.
// Boska 10-11: Boels Verhuur werd "Lease (operationeel)", maar kortdurende huur van materieel is gewoon zakelijke kosten.
// nieuw-V2R6 (melding Boska 10-11: BSH Huishoudapparaten werd activa): bedrijfsmiddelen (afschrijving) alleen als eigen keuze, nooit via AI of de gedeelde lijst.
export const NOOIT_AI = /^(lease|leningen|hypotheek|zakelijk - apparatuur|prive hypotheek|interne overboeking|ontvangen van zakelijk|terugboeking|privé opnames|privé stortingen|overboekingen aan personen|overboeking van bekenden)/i;
// Hoort bij de vraag hieronder: verandert de vraag, dan tellen eerder bewaarde antwoorden niet meer en wordt opnieuw gevraagd.
// nieuw-V2R5 (melding Boska 10-11): e-bike meestal privé, hotel = reiskosten, markt/toko/supermarkt bij horeca = inkoop.
export const VRAAG_VERSIE = 3;
const SOORT_TEKST = {
  zakelijk: "de zakelijke rekening van een ondernemer",
  prive: "de privérekening van een ondernemer (zakelijk dossier)",
  "prive-dossier": "een privérekening (huishouden)",
};
const BRANCHE_TEKST = {
  horeca: "horeca, catering of eten", bouw: "bouw, klussen of installatie", winkel: "winkel of webshop", vervoer: "vervoer, taxi of koerier",
  kantoor: "kantoor, advies of ICT", zorg: "zorg, welzijn of beauty", anders: "anders",
};

export const opzoekenAan = (env) => !!String(env?.ANTHROPIC_API_KEY || "").trim() && String(env?.NAMEN_AI || "").trim().toLowerCase() !== "uit";
const getal = (v, std) => { const n = Number(String(v ?? "").trim()); return Number.isFinite(n) && n >= 0 && String(v ?? "").trim() !== "" ? n : std; };

// Naam zoals hij naar Claude gaat: alleen letters, spaties en & . ' - (geen cijfers), hooguit 60 tekens.
export function schoneNaam(n) {
  return String(n || "").normalize("NFC").replace(/[^\p{L}&.' -]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export function maakVraag(namen, { soort, branche, teken }) {
  const regels = namen.map((n, i) => `${i + 1}. ${n}`).join("\n");
  const wat = teken === "pos" ? "ontvangsten van" : "betalingen aan";
  const bedrijf = soort === "zakelijk" && BRANCHE_TEKST[branche] ? ` Soort bedrijf van de rekeninghouder: ${BRANCHE_TEKST[branche]}.` : "";
  return `Hieronder staan namen van tegenpartijen op Nederlandse bankafschriften: ${wat} deze partijen, vanaf ${SOORT_TEKST[soort]}.${bedrijf}

Geef per naam de best passende categorie uit de toegestane lijst, en wat voor soort bedrijf het is (een paar woorden). Huur of verhuur van machines, gereedschap, materieel, containers of aanhangers (zoals Boels, Kiloutou, Hertz Equipment) is een gewone bedrijfsuitgave, geen lease en geen huur van een pand. Een abonnement op een fiets, scooter of apparaat (zoals Swapfiets) is een abonnement, geen lease. De aankoop van een fiets of e-bike (fietsenwinkel) is meestal privé; kies dan een privécategorie als die in de lijst staat, behalve bij vervoer of koerier. Een hotel, hostel of overnachting is reiskosten (hotel en verblijf als die categorie in de lijst staat), geen inkoop. Bij horeca, catering of eten zijn supermarkten, markten, toko's, slagers en groothandels meestal zakelijke inkoop en geen boodschappen. Ken je het bedrijf niet, of kan de naam bij meerdere categorieën horen, kies dan "${ONBEKEND}" of zekerheid "laag". Gok niet op basis van alleen een plaatsnaam of een achternaam.

${regels}`;
}

function schema(categorieen) {
  return {
    type: "object",
    properties: {
      resultaten: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nr: { type: "integer" },
            categorie: { type: "string", enum: [...categorieen, ONBEKEND] },
            zekerheid: { type: "string", enum: ["hoog", "middel", "laag"] },
            soort_bedrijf: { type: "string" },
          },
          required: ["nr", "categorie", "zekerheid", "soort_bedrijf"],
          additionalProperties: false,
        },
      },
    },
    required: ["resultaten"],
    additionalProperties: false,
  };
}

// Eén verzoek aan Claude voor een groep namen. Geeft [{ categorie, zekerheid, soortBedrijf }] in dezelfde volgorde (of null per naam).
export async function vraagClaude(client, model, namen, ctx, categorieen) {
  const response = await client.messages.create({
    model,
    max_tokens: 16000,
    output_config: { effort: "low", format: { type: "json_schema", schema: schema(categorieen) } },
    system: "Je helpt een boekhoudapp voor Nederlandse ondernemers en huishoudens om bankboekingen in te delen. Antwoord alleen met de gevraagde gegevens.",
    messages: [{ role: "user", content: maakVraag(namen, ctx) }],
  });
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return namen.map(() => null);
  const tekst = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  let data;
  try { data = JSON.parse(tekst); } catch { return namen.map(() => null); }
  const uit = namen.map(() => null);
  for (const r of Array.isArray(data?.resultaten) ? data.resultaten : []) {
    const i = Number(r?.nr) - 1;
    if (!Number.isInteger(i) || i < 0 || i >= namen.length) continue;
    const categorie = r.categorie === ONBEKEND || !categorieen.includes(r.categorie) ? null : r.categorie;
    uit[i] = bijsturen({ categorie, zekerheid: ["hoog", "middel", "laag"].includes(r.zekerheid) ? r.zekerheid : "laag", soortBedrijf: String(r.soort_bedrijf || "").slice(0, 80) }, ctx, categorieen);
  }
  return uit;
}

// nieuw-V2R5 — vaste correcties na het antwoord (melding Boska 10-11), op basis van het soort bedrijf dat Claude noemt.
const HOTEL = /hotel|hostel|motel|overnacht|logies|bed (and|&) breakfast|b&b|vakantiepark|camping/i;
const ETENSWAREN = /supermarkt|markt|toko|slager|bakker|groothandel|groente|levensmiddel|food/i;
const FIETS = /fiets|e-?bike|bike/i;
export function bijsturen(a, { soort, branche } = {}, categorieen = []) {
  if (!a?.categorie) return a;
  const sb = a.soortBedrijf || "";
  const mag = (c) => categorieen.includes(c);
  if (HOTEL.test(sb) && !/restaurant|eten/i.test(a.categorie)) {
    if (soort === "zakelijk" && mag("Reiskosten (hotel & verblijf)")) return { ...a, categorie: "Reiskosten (hotel & verblijf)" };
  }
  if (soort === "zakelijk" && branche === "horeca" && ETENSWAREN.test(sb) && a.categorie === "Boodschappen" && mag("Zakelijke inkoop/uitgaven")) {
    return { ...a, categorie: "Zakelijke inkoop/uitgaven" };
  }
  if (soort === "zakelijk" && branche !== "vervoer" && FIETS.test(sb) && !/abonnement|lease|verhuur|huur/i.test(sb) && /^zakelijk/i.test(a.categorie) && mag("Privé: overig")) {
    return { ...a, categorie: "Privé: overig" };
  }
  return a;
}

async function telOp(db, account, dag, n) {
  await db.prepare(`INSERT INTO namen_ai_teller (account, dag, aantal) VALUES (?1, ?2, ?3)
    ON CONFLICT(account, dag) DO UPDATE SET aantal = aantal + ?3`).bind(account, dag, n).run();
}
async function telling(db, account, dag) {
  return Number((await db.prepare("SELECT aantal FROM namen_ai_teller WHERE account = ? AND dag = ?").bind(account, dag).first())?.aantal || 0);
}

// POST /api/namen/zoek { soort, branche, categorieen: [...], namen: [{ k: "sleutel|teken", naam }] }
// → { ok, uitkomst: { "sleutel|teken": { categorie, zekerheid, soortBedrijf } | null }, rest: aantal niet opgezocht (limiet) }
export async function zoekRoute(request, env, account, { maakClient = (e) => new Anthropic({ apiKey: e.ANTHROPIC_API_KEY }) } = {}) {
  if (!opzoekenAan(env)) return json({ ok: false, uit: true, fout: "Opzoeken met AI staat uit" }, 503);
  if (!env.DB) return json({ ok: false, fout: "Database niet gekoppeld" }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, fout: "Ongeldig bericht" }, 400); }
  const soort = SOORT_TEKST[body?.soort] ? body.soort : null;
  const branche = /^[a-z-]{0,30}$/.test(String(body?.branche || "")) ? String(body?.branche || "") : "";
  const categorieen = [...new Set((Array.isArray(body?.categorieen) ? body.categorieen : []).map(geldigeCategorie).filter((c) => c && !NOOIT_AI.test(c)))].slice(0, MAX_CATEGORIEEN);
  if (!soort || categorieen.length < 2) return json({ ok: false, fout: "Soort of categorieën ontbreken" }, 400);
  const namen = [];
  const gezien = new Set();
  for (const n of (Array.isArray(body?.namen) ? body.namen : []).slice(0, MAX_PER_VRAAG)) {
    const [s, t] = String(n?.k || "").split("|");
    const naam = schoneNaam(n?.naam);
    if (!/^[a-z][a-z ]{1,59}$/.test(s || "") || !/^(neg|pos)$/.test(t || "") || naam.length < 2 || gezien.has(`${s}|${t}`)) continue;
    gezien.add(`${s}|${t}`);
    namen.push({ s, t, naam });
  }
  await zorg(env.DB);
  const uitkomst = {};
  const nieuw = [];
  for (const n of namen) {
    const r = await env.DB.prepare("SELECT categorie, zekerheid, soort_bedrijf FROM namen_ai WHERE sleutel = ? AND teken = ? AND soort = ? AND branche = ? AND versie = ?").bind(n.s, n.t, soort, branche, VRAAG_VERSIE).first();
    if (r) uitkomst[`${n.s}|${n.t}`] = r.categorie && categorieen.includes(r.categorie) ? { categorie: r.categorie, zekerheid: r.zekerheid, soortBedrijf: r.soort_bedrijf || "" } : null;
    else nieuw.push(n);
  }
  // Limieten per dag (alleen echte vragen aan Claude tellen).
  const dag = new Date().toISOString().slice(0, 10);
  const ruimte = Math.max(0, Math.min(getal(env.NAMEN_AI_PER_DAG, 500) - (await telling(env.DB, account, dag)), getal(env.NAMEN_AI_TOTAAL_PER_DAG, 5000) - (await telling(env.DB, "*", dag))));
  const vragen = nieuw.slice(0, ruimte);
  const rest = nieuw.length - vragen.length;
  if (vragen.length) {
    const model = String(env.NAMEN_AI_MODEL || "").trim() || MODEL;
    const client = maakClient(env);
    const tijd = new Date().toISOString();
    for (const teken of ["neg", "pos"]) {
      const groep = vragen.filter((n) => n.t === teken);
      if (!groep.length) continue;
      let antwoord;
      try {
        antwoord = await vraagClaude(client, model, groep.map((n) => n.naam), { soort, branche, teken }, categorieen);
      } catch (err) {
        console.error("namen ai", err?.status || "", String(err?.message || err).slice(0, 200));
        return json({ ok: false, fout: "Opzoeken lukte nu niet", uitkomst }, 502);
      }
      await telOp(env.DB, account, dag, groep.length);
      await telOp(env.DB, "*", dag, groep.length);
      const stmts = [];
      groep.forEach((n, i) => {
        const a = antwoord[i];
        if (!a) return; // geen antwoord: niet bewaren, later opnieuw
        uitkomst[`${n.s}|${n.t}`] = a.categorie ? a : null;
        stmts.push(env.DB.prepare(`INSERT INTO namen_ai (sleutel, teken, soort, branche, categorie, zekerheid, soort_bedrijf, model, tijd, versie) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
          ON CONFLICT(sleutel, teken, soort, branche) DO UPDATE SET categorie = ?5, zekerheid = ?6, soort_bedrijf = ?7, model = ?8, tijd = ?9, versie = ?10`)
          .bind(n.s, n.t, soort, branche, a.categorie, a.zekerheid, a.soortBedrijf, model, tijd, VRAAG_VERSIE));
      });
      if (stmts.length) await env.DB.batch(stmts);
    }
  }
  return json({ ok: true, uitkomst, rest });
}
