// beide-V6R7 — het tarievenbestand: alle tarieven per jaar als één JSON-bestand, los van de app-code. De beheerder zet het
// op de server (Beheer → Tarieven, D1-tabel "tarieven"); de app haalt het bij het starten op (tax/tarievenLaden.js) en
// gebruikt het boven de ingebouwde tabellen. Zo is een nieuw jaar of een correctie geen nieuwe app-release.
//
// Dit bestand bevat alleen de vorm en de controle, zonder de tabellen zelf: de Worker (worker/tarieven.js) gebruikt
// dezelfde controle, zodat er nooit een half of verkeerd bestand op de server komt.
//
// Vorm:
// { "formaat": 1, "versie": "2026-12-05", "bron": "Belastingdienst …",
//   "jaren": { "2027": { "status": "voorlopig" | "definitief", "ib": { "brackets": [{ "tot": 39247, "tarief": 0.3623 }, …,
//              { "tot": null, "tarief": 0.495 }], "zelfstandigenaftrek": 900, … }, "zvw": { … }, …, "startersaftrek": 10 } } }
// Elke groep is per jaar optioneel, maar een groep die er staat moet compleet zijn. "tot": null = geen bovengrens.

export const TARIEVEN_FORMAAT = 1;

// Per groep: losse getallen (velden), plus eventueel schijven (brackets) of de opbouw van de arbeidskorting.
export const TARIEF_GROEPEN = {
  ib: { titel: "Box 1: schijven en ondernemersaftrek", brackets: true, velden: ["zelfstandigenaftrek", "mkbPct", "aftrekBeperkingPct"] },
  zvw: { titel: "Zvw-bijdrage", velden: ["pct", "maxBijdrageInkomen"] },
  ahk: { titel: "Algemene heffingskorting", velden: ["max", "afbouwGrens", "afbouwPct"] },
  ak: { titel: "Arbeidskorting", opbouw: true, velden: ["max", "afbouwVanaf", "afbouwPct"] },
  kia: { titel: "Kleinschaligheidsinvesteringsaftrek", velden: ["drempel", "vast1Tot", "pct1", "vastBedrag", "vastTot", "afbouwPct", "nul"] },
  aow: { titel: "Box 1 eerste schijf AOW-leeftijd", velden: ["tot", "tarief"] },
  ouderen: { titel: "Ouderenkorting", velden: ["max", "grens", "afbouwPct"] },
  woning: { titel: "Eigen woning", velden: ["forfaitPct", "villagrens", "villaPct", "hillenPct"] },
  box3: { titel: "Box 3", velden: ["heffingsvrij", "sparenPct", "beleggenPct", "schuldenPct", "schuldendrempel", "tariefPct"] },
  aftrek: { titel: "Giften en zorgkosten", velden: ["giftenMin", "giftenPct", "giftenMaxPct", "zorgVast", "zorgLaag", "zorgPct", "zorgHoog", "zorgExtraPct"] },
  vpb: { titel: "Vennootschapsbelasting", brackets: true, velden: [] },
  box2: { titel: "Box 2", brackets: true, velden: [] },
};
// Losse bedragen per jaar.
export const TARIEF_LOSSE = { gebruikelijkLoon: "Gebruikelijk loon (minimum)", startersaftrek: "Startersaftrek" };
export const JAAR_STATUSSEN = ["definitief", "voorlopig"];

const MAX_GETAL = 100_000_000;
const isGetal = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= MAX_GETAL;
const tekst = (v, max) => String(v ?? "").replace(/[\u0000-\u001F]/g, " ").trim().slice(0, max);

function controleerSchijven(lijst, waar) {
  if (!Array.isArray(lijst) || lijst.length < 1 || lijst.length > 10) return `${waar}: schijven ontbreken`;
  let vorige = 0;
  for (const [i, b] of lijst.entries()) {
    const laatste = i === lijst.length - 1;
    if (!b || typeof b !== "object") return `${waar}: schijf ${i + 1} is geen object`;
    if (!(typeof b.tarief === "number" && b.tarief >= 0 && b.tarief < 1)) return `${waar}: schijf ${i + 1} heeft geen tarief tussen 0 en 1`;
    if (laatste ? b.tot !== null : !isGetal(b.tot)) return `${waar}: schijf ${i + 1} ${laatste ? "moet tot: null hebben (geen bovengrens)" : "heeft geen geldige bovengrens"}`;
    if (!laatste && b.tot <= vorige) return `${waar}: schijven moeten oplopen`;
    if (!laatste) vorige = b.tot;
  }
  return null;
}

function controleerOpbouw(lijst, waar) {
  if (!Array.isArray(lijst) || lijst.length < 1 || lijst.length > 10) return `${waar}: opbouw ontbreekt`;
  for (const [i, s] of lijst.entries()) {
    if (!s || typeof s !== "object" || !isGetal(s.tot) || !isGetal(s.pct)) return `${waar}: opbouwstap ${i + 1} mist tot of pct`;
    if (i > 0 && (!isGetal(s.van) || !isGetal(s.basis))) return `${waar}: opbouwstap ${i + 1} mist van of basis`;
  }
  return null;
}

// Controleert een tarievenbestand. → { ok: true, bestand } (opgeschoond: alleen bekende velden) of { ok: false, fout }.
export function controleerTarievenBestand(invoer) {
  if (!invoer || typeof invoer !== "object" || Array.isArray(invoer)) return { ok: false, fout: "Het bestand is geen tarievenbestand" };
  if (invoer.formaat !== TARIEVEN_FORMAAT) return { ok: false, fout: `Onbekend formaat (verwacht "formaat": ${TARIEVEN_FORMAAT})` };
  const jaren = invoer.jaren;
  if (!jaren || typeof jaren !== "object" || Array.isArray(jaren)) return { ok: false, fout: "Het onderdeel \"jaren\" ontbreekt" };
  const schoon = {};
  const sleutels = Object.keys(jaren);
  if (sleutels.length === 0 || sleutels.length > 60) return { ok: false, fout: "Geen jaren, of te veel jaren" };
  for (const j of sleutels) {
    const jaar = Number(j);
    if (!/^\d{4}$/.test(j) || jaar < 2020 || jaar > 2100) return { ok: false, fout: `Ongeldig jaar: ${j}` };
    const bron = jaren[j];
    if (!bron || typeof bron !== "object") return { ok: false, fout: `${j}: geen gegevens` };
    const uit = { status: JAAR_STATUSSEN.includes(bron.status) ? bron.status : "definitief" };
    for (const [groep, spec] of Object.entries(TARIEF_GROEPEN)) {
      const g = bron[groep];
      if (g == null) continue;
      const waar = `${j} ${spec.titel}`;
      if (typeof g !== "object" || Array.isArray(g)) return { ok: false, fout: `${waar}: geen object` };
      const w = {};
      for (const veld of spec.velden) {
        if (!isGetal(g[veld])) return { ok: false, fout: `${waar}: "${veld}" ontbreekt of is geen getal` };
        w[veld] = g[veld];
      }
      if (spec.brackets) {
        const f = controleerSchijven(g.brackets, waar);
        if (f) return { ok: false, fout: f };
        w.brackets = g.brackets.map((b) => ({ tot: b.tot, tarief: b.tarief }));
      }
      if (spec.opbouw) {
        const f = controleerOpbouw(g.opbouw, waar);
        if (f) return { ok: false, fout: f };
        w.opbouw = g.opbouw.map((s, i) => (i === 0 ? { tot: s.tot, pct: s.pct } : { tot: s.tot, van: s.van, basis: s.basis, pct: s.pct }));
      }
      uit[groep] = w;
    }
    for (const veld of Object.keys(TARIEF_LOSSE)) {
      if (bron[veld] == null) continue;
      if (!isGetal(bron[veld])) return { ok: false, fout: `${j}: "${veld}" is geen getal` };
      uit[veld] = bron[veld];
    }
    if (Object.keys(uit).length === 1) return { ok: false, fout: `${j}: geen enkele tariefgroep` };
    schoon[j] = uit;
  }
  return {
    ok: true,
    bestand: { formaat: TARIEVEN_FORMAAT, versie: tekst(invoer.versie, 40) || null, bron: tekst(invoer.bron, 300) || null, jaren: schoon },
  };
}
