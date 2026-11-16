// nieuw-V3R8 — activa als lijst inlezen (wens Boska 12-11): uit Excel, CSV of een geplakte tabel, zodat je ze niet één voor één
// hoeft in te vullen. Herkent de kolommen op naam (ook als ze iets anders heten of in een andere volgorde staan), controleert
// elke regel, slaat activa over die er al staan en koppelt een regel aan een bankbetaling in "Zakelijk - apparatuur/machines"
// als bedrag en datum passen. Ook de omgekeerde weg: de activalijst als rijen voor Excel (sjabloon en export).

export const KOLOMMEN = [
  { veld: "naam", kop: "Omschrijving", namen: ["omschrijving", "naam", "bedrijfsmiddel", "activum", "activa", "object", "omschr", "beschrijving", "artikel", "item"] },
  { veld: "aanschafdatum", kop: "Aanschafdatum", namen: ["aanschafdatum", "datum aanschaf", "aankoopdatum", "datum aankoop", "datum", "gekocht op", "ingebruikname", "investeringsdatum"] },
  { veld: "aanschafwaarde", kop: "Aanschafwaarde excl. btw", namen: ["aanschafwaarde", "aanschafprijs", "aankoopprijs", "aankoopbedrag", "aanschafbedrag", "investering", "bedrag", "prijs", "waarde", "kostprijs"] },
  { veld: "afschrijvingstermijnJaren", kop: "Afschrijvingstermijn (jaren)", namen: ["afschrijvingstermijn", "termijn", "looptijd", "levensduur", "jaren", "afschrijven in jaren", "aantal jaren", "gebruiksduur"] },
  { veld: "restwaarde", kop: "Restwaarde", namen: ["restwaarde", "rest waarde", "eindwaarde", "residuwaarde"] },
  { veld: "staat", kop: "Nieuw of gebruikt", namen: ["nieuw of gebruikt", "nieuw gebruikt", "nieuw of tweedehands", "staat", "conditie", "tweedehands", "gebruikt", "occasion"] }, // wens Boska 12-11
  { veld: "einddatum", kop: "Einddatum (verkocht of weg)", namen: ["einddatum", "verkocht", "verkoopdatum", "datum verkoop", "afgestoten", "buiten gebruik", "desinvestering"] },
  { veld: "kia", kop: "KIA (ja/nee)", namen: ["kia", "kleinschaligheidsinvesteringsaftrek", "investeringsaftrek"] },
];

const plat = (t) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// Welke kolom hoort bij welk veld. Eerst een exacte naam, dan "begint met"/"bevat" (langste naam eerst, zodat "datum aanschaf" voor "datum" gaat).
export function herkenKolommen(koppen) {
  const kop = koppen.map(plat);
  const uit = {};
  const bezet = new Set();
  // Specifieke velden eerst, zodat "Restwaarde" niet als aanschafwaarde ("waarde") en "Einddatum" niet als aanschafdatum ("datum") telt.
  const VOLGORDE = ["naam", "staat", "einddatum", "restwaarde", "kia", "afschrijvingstermijnJaren", "aanschafwaarde", "aanschafdatum"].map((v) => KOLOMMEN.find((k) => k.veld === v));
  const probeer = (past) => {
    for (const k of VOLGORDE) {
      if (uit[k.veld] != null) continue;
      const namen = [...k.namen].sort((a, b) => b.length - a.length);
      for (const n of namen) {
        const i = kop.findIndex((h, j) => !bezet.has(j) && h && past(h, n));
        if (i >= 0) { uit[k.veld] = i; bezet.add(i); break; }
      }
    }
  };
  probeer((h, n) => h === n);
  probeer((h, n) => h.startsWith(n) || h.includes(` ${n}`) || h.includes(n));
  return uit;
}

// Bedrag: "€ 1.234,56", "1234.56", "1.234", "1,234.56", "-", getal uit Excel.
export function leesBedrag(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  let t = String(v).replace(/[€\s]|eur/gi, "").replace(/^-+$/, "");
  if (!t) return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) || /^-?\d+,\d+$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else t = t.replace(/,/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

const iso = (j, m, d) => {
  const dt = new Date(Date.UTC(j, m - 1, d));
  return dt.getUTCFullYear() === j && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${j}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null;
};
// Datum: dd-mm-jjjj, d/m/jj, jjjj-mm-dd, "15 maart 2024", Excel-getal, Date. Alleen een jaar is te weinig (de tijdklem hangt van de maand af).
export function leesDatum(v) {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? NaN : iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if (typeof v === "number") {
    if (v > 20000 && v < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000); return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }
    return NaN;
  }
  const t = String(v).trim();
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]) || NaN;
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (m) { const j = m[3].length === 2 ? 2000 + +m[3] : +m[3]; return iso(j, +m[2], +m[1]) || NaN; }
  const MAAND = { jan: 1, feb: 2, mrt: 3, maa: 3, apr: 4, mei: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dec: 12 };
  m = plat(t).match(/^(\d{1,2}) ([a-z]{3})[a-z]* (\d{4})$/);
  if (m && MAAND[m[2]]) return iso(+m[3], MAAND[m[2]], +m[1]) || NaN;
  return NaN;
}

// Nieuw of gebruikt (tweedehands) gekocht.
function leesStaat(v) {
  const t = plat(v);
  if (!t) return "";
  if (/^(nieuw|new|nieuw gekocht)$/.test(t)) return "nieuw";
  if (/^(gebruikt|tweedehands|2e ?hands|tweede ?hands|occasion|used|gebruikt gekocht)$/.test(t)) return "gebruikt";
  return "?";
}

function leesKia(v) {
  const t = plat(v);
  if (!t) return "";
  if (/^(ja|j|yes|y|1|waar|true|x)$/.test(t)) return "kwalificeert";
  if (/^(nee|n|no|0|onwaar|false|uitgesloten)$/.test(t)) return "uitgesloten";
  return "?";
}

// Geplakte tekst (uit Excel of Numbers: tab-gescheiden; ook ; of , als CSV) → rijen met cellen.
export function splitsTabel(tekst) {
  const regels = String(tekst || "").replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n"); // lege regels blijven staan: regelnummers kloppen dan
  if (!regels.some((r) => r.trim())) return [];
  // Scheidingsteken uit de hele tekst (een titelregel boven de tabel heeft er geen).
  const tel = (t) => regels.reduce((n, r) => n + r.split(t).length - 1, 0);
  const sep = tel("\t") > 0 ? "\t" : (tel(";") >= tel(",") ? ";" : ",");
  return regels.map((r) => {
    if (!r.trim()) return [];
    if (sep === "\t") return r.split("\t").map((c) => c.trim());
    const cellen = []; let cel = "", q = false;
    for (let i = 0; i < r.length; i++) {
      const ch = r[i];
      if (ch === '"') { if (q && r[i + 1] === '"') { cel += '"'; i++; } else q = !q; }
      else if (ch === sep && !q) { cellen.push(cel.trim()); cel = ""; }
      else cel += ch;
    }
    cellen.push(cel.trim());
    return cellen;
  });
}

// rijen: array van arrays (eerste rij met koppen ergens in de eerste 10 rijen). Geeft { regels, kolommen, fout }.
export function leesActivaTabel(rijen) {
  // Regelnummer = rij in het bestand (1 = eerste rij), ook als er lege rijen tussen staan.
  const lijst = (rijen || []).map((r, i) => (Array.isArray(r) ? Object.assign([...r], { nr: i + 1 }) : null)).filter((r) => r && r.some((c) => String(c ?? "").trim() !== ""));
  let kopRij = -1, kolommen = null;
  for (let i = 0; i < Math.min(lijst.length, 10); i++) {
    const k = herkenKolommen(lijst[i]);
    if (k.naam != null && (k.aanschafwaarde != null || k.aanschafdatum != null)) { kopRij = i; kolommen = k; break; }
  }
  if (!kolommen) return { regels: [], kolommen: null, fout: "Geen kolommen herkend. De eerste rij moet koppen hebben, zoals Omschrijving, Aanschafdatum en Aanschafwaarde. Gebruik zo nodig het sjabloon." };
  const cel = (r, veld) => (kolommen[veld] == null ? "" : r[kolommen[veld]]);
  const regels = [], leeg = [];
  lijst.slice(kopRij + 1).forEach((r) => {
    const naam = String(cel(r, "naam") ?? "").trim();
    if (/^(totaal|subtotaal|total)\b/i.test(naam)) return;
    const aanschafwaarde = leesBedrag(cel(r, "aanschafwaarde"));
    // nieuw-V4R2 — regel zonder omschrijving én zonder aanschafwaarde = lege regel, overslaan (wens Boska 13-11),
    // ook als er nog iets als "gebruikt" of een datum in staat (doorgetrokken kolommen in Excel).
    if (!naam && aanschafwaarde == null) { leeg.push(r.nr); return; }
    const fouten = [];
    const aanschafdatum = leesDatum(cel(r, "aanschafdatum"));
    const termijn = leesBedrag(cel(r, "afschrijvingstermijnJaren"));
    const restwaarde = leesBedrag(cel(r, "restwaarde"));
    const einddatum = leesDatum(cel(r, "einddatum"));
    const kia = leesKia(cel(r, "kia"));
    const staat = leesStaat(cel(r, "staat"));
    if (!naam) fouten.push("omschrijving ontbreekt");
    if (aanschafwaarde == null) fouten.push("aanschafwaarde ontbreekt"); else if (Number.isNaN(aanschafwaarde) || aanschafwaarde <= 0) fouten.push("aanschafwaarde is geen bedrag");
    if (aanschafdatum == null) fouten.push("aanschafdatum ontbreekt"); else if (Number.isNaN(aanschafdatum)) fouten.push("aanschafdatum niet herkend");
    if (termijn != null && (Number.isNaN(termijn) || termijn <= 0 || termijn > 50)) fouten.push("afschrijvingstermijn is geen aantal jaren");
    if (restwaarde != null && (Number.isNaN(restwaarde) || restwaarde < 0)) fouten.push("restwaarde is geen bedrag");
    else if (restwaarde != null && aanschafwaarde > 0 && restwaarde >= aanschafwaarde) fouten.push("restwaarde is niet lager dan de aanschafwaarde");
    if (einddatum != null && Number.isNaN(einddatum)) fouten.push("einddatum niet herkend");
    if (staat === "?") fouten.push("nieuw of gebruikt niet herkend");
    if (kia === "?") fouten.push("KIA moet ja of nee zijn");
    regels.push({
      regel: r.nr, naam, fouten,
      details: {
        naam,
        aanschafwaarde: Number.isFinite(aanschafwaarde) ? Math.round(aanschafwaarde * 100) / 100 : null,
        aanschafdatum: typeof aanschafdatum === "string" ? aanschafdatum : null,
        afschrijvingstermijnJaren: Number.isFinite(termijn) ? termijn : null,
        restwaarde: Number.isFinite(restwaarde) ? restwaarde : null,
        ...(typeof einddatum === "string" ? { einddatum } : {}),
        ...(staat && staat !== "?" ? { staat } : {}),
        ...(kia && kia !== "?" ? { kiaStatus: kia } : {}),
      },
    });
  });
  return { regels, kolommen, leeg, fout: regels.length ? null : "Geen regels gevonden onder de koppen." };
}

const dagen = (a, b) => Math.abs(new Date(a) - new Date(b)) / 86400000;
const dag = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d || "").slice(0, 10));

// Per regel wat er gebeurt: "fout" (niet toevoegen), "dubbel" (vraag: klopt dat?), "koppel" (gegevens bij een bankbetaling) of "nieuw".
// nieuw-V4R2 — een dubbele regel (twee keer in de lijst, of al in de activalijst) wordt NIET zelf overgeslagen: de gebruiker
// beslist (wens Boska 13-11: er kunnen meerdere dezelfde activa zijn). alsJa = wat er gebeurt als het toch wordt toegevoegd.
// Bankbetaling past als het bedrag gelijk is aan de aanschafwaarde of aanschafwaarde + 21% btw (± € 1), binnen 31 dagen, en die
// betaling nog geen ingevulde gegevens heeft. Elke betaling wordt hooguit één keer gebruikt.
export function bepaalActies(regels, activaSummary = [], activaDetails = {}) {
  const gebruikt = new Set();
  const bestaand = activaSummary.map((a) => {
    const d = activaDetails[a.key] || {};
    return { key: a.key, naam: plat(d.naam || a.naam), datum: d.aanschafdatum || dag(a.tx?.date), waarde: Number(d.aanschafwaarde) || Math.abs(Number(a.tx?.amount) || 0), bank: !a.handmatig, ingevuld: !!(d.aanschafwaarde && d.aanschafdatum && d.afschrijvingstermijnJaren), tx: a.tx };
  });
  const gezien = new Map();
  return regels.map((r) => {
    if (r.fouten.length) return { ...r, actie: "fout" };
    const d = r.details;
    const sleutel = `${plat(d.naam)}|${d.aanschafdatum}|${d.aanschafwaarde}`;
    if (gezien.has(sleutel)) return { ...r, actie: "dubbel", alsJa: "nieuw", reden: `staat ook op rij ${gezien.get(sleutel)}` };
    gezien.set(sleutel, r.regel);
    const zelfde = bestaand.find((b) => b.ingevuld && b.datum === d.aanschafdatum && Math.abs(b.waarde - d.aanschafwaarde) < 1 && (b.naam === plat(d.naam) || b.bank));
    if (zelfde) return { ...r, actie: "dubbel", alsJa: "nieuw", reden: "staat al in de activalijst" };
    const bank = bestaand
      .filter((b) => b.bank && !b.ingevuld && !gebruikt.has(b.key) && dagen(b.datum, d.aanschafdatum) <= 31
        && (Math.abs(b.waarde - d.aanschafwaarde) <= 1 || Math.abs(b.waarde - d.aanschafwaarde * 1.21) <= 1))
      .sort((a, b) => dagen(a.datum, d.aanschafdatum) - dagen(b.datum, d.aanschafdatum))[0];
    if (bank) { gebruikt.add(bank.key); return { ...r, actie: "koppel", key: bank.key, bank: { naam: bank.tx?.counterparty || bank.naam, bedrag: Math.abs(Number(bank.tx?.amount) || 0), datum: dag(bank.tx?.date) } }; }
    return { ...r, actie: "nieuw" };
  });
}

// Wat er na de antwoorden op de vragen gebeurt: dubbel + ja → alsJa, dubbel + nee → "overslaan", dubbel zonder antwoord → "vraag".
export function naAntwoorden(acties, antwoorden = {}) {
  return acties.map((r) => (r.actie !== "dubbel" ? r
    : antwoorden[r.regel] === true ? { ...r, actie: r.alsJa, gevraagd: true }
    : antwoorden[r.regel] === false ? { ...r, actie: "overslaan" } : { ...r, actie: "vraag" }));
}

// Activalijst als rijen voor Excel: koppen + een regel per activum (sjabloon: alleen de koppen en een voorbeeldregel).
export function activaNaarRijen(activaSummary = [], activaDetails = {}) {
  const rijen = [KOLOMMEN.map((k) => k.kop)];
  for (const a of activaSummary) {
    const d = activaDetails[a.key] || {};
    if (d.verwijderd) continue;
    rijen.push([
      d.naam || a.naam, d.aanschafdatum || dag(a.tx?.date), d.aanschafwaarde ?? Math.abs(Number(a.tx?.amount) || 0),
      d.afschrijvingstermijnJaren ?? "", d.restwaarde ?? "", d.staat || "", d.einddatum || "",
      d.kiaStatus === "kwalificeert" ? "ja" : d.kiaStatus === "uitgesloten" ? "nee" : "",
    ]);
  }
  return rijen;
}
export const SJABLOON_VOORBEELD = [
  ["Koelvitrine", "2024-03-15", 2450, 5, 0, "nieuw", "", "ja"],
  ["Laptop", "2024-09-02", 1199, 3, 100, "gebruikt", "", "ja"],
];
