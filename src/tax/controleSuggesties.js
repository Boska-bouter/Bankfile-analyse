// Aanvullende controles voor een administratie-reconstructie (alleen lezen, wijzigt niets):
//  C1 — dekking per rekening: welke maanden zijn gedekt, waar ontbreekt mogelijk een afschrift?
//  C2 — terugkerende betalingen die in verschillende categorieën terecht zijn gekomen.
//  C3 — vergelijking tussen jaren: alleen grote, onverklaarde sprongen in zakelijke kosten.
// Uitgangspunt: liever te weinig dan te veel meldingen. Alles is per stuk te bevestigen ("klopt zo").
import { fiscalTreatmentOf } from "../classification/categories.js";
import { counterpartyKey } from "../utils/normalization.js";

export const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const ymNaarLabel = (s) => { const [y, m] = s.split("-"); return `${MAANDEN[Number(m) - 1]} ${y}`; };
const ymIndex = (s) => { const [y, m] = s.split("-").map(Number); return y * 12 + (m - 1); };
const indexNaarYm = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;

// ---------- C1 ----------
export function berekenDekking({ allTransactions = [], importDiagnostics = [], fileContinuity = [], accountTypeByFile = {}, ownAccountByFile = {}, bevestigd = {} }) {
  const perRekening = new Map();
  for (const tx of allTransactions) {
    if (!tx.date) continue;
    const key = ownAccountByFile[tx.source] || tx.source;
    if (!perRekening.has(key)) perRekening.set(key, { key, bronnen: new Set(), maanden: new Map(), type: accountTypeByFile[tx.source] || null });
    const r = perRekening.get(key);
    r.bronnen.add(tx.source);
    const m = ym(tx.date);
    r.maanden.set(m, (r.maanden.get(m) || 0) + 1);
  }
  const diagByFile = Object.fromEntries(importDiagnostics.map((d) => [d.fileName, d]));
  const rekeningen = [];
  for (const r of perRekening.values()) {
    const idxs = [...r.maanden.keys()].map(ymIndex);
    const van = Math.min(...idxs), tot = Math.max(...idxs);
    const bestanden = [...r.bronnen].map((b) => diagByFile[b]).filter(Boolean);
    const saldoSluit = (d) => !!d?.balanceCheck?.ok; // bewust strikt: een leeg/ontbrekend maandje valt anders weg in een "nagenoeg sluitend" saldo
    const maandStatus = {};
    const verdacht = [], bevestigdLeeg = [];
    for (let i = van; i <= tot; i++) {
      const m = indexNaarYm(i);
      if (r.maanden.has(m)) { maandStatus[m] = "data"; continue; }
      const start = new Date(Math.floor(i / 12), i % 12, 1), eind = new Date(Math.floor(i / 12), (i % 12) + 1, 0);
      // leeg maar binnen één bestand waarvan het saldo sluit → werkelijk geen mutaties
      const binnenBestand = bestanden.some((d) => d.from && d.to && d.from <= start && d.to >= eind && saldoSluit(d));
      // of tussen twee bestanden die saldo-technisch netjes aansluiten
      const tussenBestanden = fileContinuity.some((c) => c.ok && r.bronnen.has(c.fileA) && r.bronnen.has(c.fileB) && c.aTo < eind && c.bFrom > start);
      if (binnenBestand || tussenBestanden) { maandStatus[m] = "leeg-ok"; bevestigdLeeg.push(m); continue; }
      if (bevestigd[`dekking|${r.key}|${m}`]) { maandStatus[m] = "leeg-ok"; bevestigdLeeg.push(m); continue; }
      maandStatus[m] = "leeg";
      verdacht.push(m);
    }
    const jaren = {};
    for (let y = Math.floor(van / 12); y <= Math.floor(tot / 12); y++) {
      jaren[y] = Array.from({ length: 12 }, (_, k) => maandStatus[`${y}-${String(k + 1).padStart(2, "0")}`] || "buiten");
    }
    const iban = String(r.key).match(/^[A-Z]{2}\d{2}/) ? r.key : null;
    rekeningen.push({
      key: r.key, label: iban || [...r.bronnen][0], type: r.type, jaren, verdacht, bevestigdLeeg,
      verdachtLabels: verdacht.map(ymNaarLabel), eerste: indexNaarYm(van), laatste: indexNaarYm(tot),
      heeftSaldo: bestanden.some((d) => d.balanceCheck),
    });
  }
  rekeningen.sort((a, b) => String(a.type).localeCompare(String(b.type)) || String(a.label).localeCompare(String(b.label)));
  return { rekeningen, aantalVerdacht: rekeningen.reduce((n, r) => n + r.verdacht.length, 0) };
}

// ---------- C2 ----------
const STRUCTUREEL = /lease|lening|aflos|rente|interne overboeking|opname|terugboeking|overboeking/i;
const mediaan = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export function vindTerugkerendeInconsistenties({ classified = [], overridesByRow = {}, bevestigd = {} }) {
  const groepen = new Map();
  for (const tx of classified) {
    if (tx.transferLocked || !tx.date || !tx.amount) continue;
    const naam = tx.counterparty || tx.description;
    const key = (tx.counterpartyIban ? `iban:${String(tx.counterpartyIban).replace(/\s/g, "").toUpperCase()}` : counterpartyKey(naam, 1).replace(/::pos$/, "")) + (tx.amount < 0 ? "::af" : "::bij");
    if (!key || key.startsWith("::")) continue;
    if (!groepen.has(key)) groepen.set(key, { key, naam, txs: [] });
    groepen.get(key).txs.push(tx);
  }
  const resultaat = [];
  for (const g of groepen.values()) {
    if (g.txs.length < 4) continue;
    if (bevestigd[`terug|${g.key}`]) continue;
    const dagen = g.txs.map((t) => t.date.getTime() / 86400000).sort((a, b) => a - b);
    const intervallen = dagen.slice(1).map((d, i) => d - dagen[i]).filter((x) => x >= 1);
    if (intervallen.length < 3) continue;
    const med = mediaan(intervallen);
    const periodiek = (med >= 25 && med <= 35) ? "maandelijks" : (med >= 85 && med <= 95) ? "per kwartaal" : null;
    if (!periodiek) continue;
    const perCat = new Map();
    for (const t of g.txs) perCat.set(t.category, [...(perCat.get(t.category) || []), t]);
    if (perCat.size < 2) continue;
    const gesorteerd = [...perCat.entries()].sort((a, b) => b[1].length - a[1].length);
    const [hoofdCat, hoofdTxs] = gesorteerd[0];
    if (hoofdCat === "Overig" || STRUCTUREEL.test(hoofdCat)) continue;
    const rest = gesorteerd.slice(1).flatMap(([, ts]) => ts);
    if (hoofdTxs.length < 3 || rest.length > hoofdTxs.length * 0.5) continue; // duidelijke meerderheid vereist
    // handmatig bewust anders gezette regels, en structurele categorieën, laten we met rust
    const med$ = mediaan(g.txs.map((t) => Math.abs(t.amount)));
    // alleen regels met een vergelijkbaar bedrag (±25%): een ander bedrag kan best een andere soort betaling zijn
    const af = rest.filter((t) => !overridesByRow[t.id] && !STRUCTUREEL.test(t.category) && Math.abs(Math.abs(t.amount) - med$) <= med$ * 0.25);
    if (af.length === 0) continue;
    const bedragen = g.txs.map((t) => Math.abs(t.amount));
    resultaat.push({
      key: g.key, naam: g.naam, periodiek, aantal: g.txs.length, gemBedrag: Math.round(mediaan(bedragen) * 100) / 100,
      hoofdCategorie: hoofdCat, hoofdType: hoofdTxs[0].type,
      verdeling: gesorteerd.map(([c, ts]) => ({ categorie: c, aantal: ts.length })),
      afwijkend: af.map((t) => ({ id: t.id, date: t.date, amount: t.amount, category: t.category })),
    });
  }
  resultaat.sort((a, b) => b.afwijkend.length - a.afwijkend.length);
  return resultaat.slice(0, 10);
}

// ---------- C3 ----------
export function vindJaarSprongen({ classified = [], bevestigd = {}, maxPerJaar = 5, minEuro = 750, minPercentage = 40 }) {
  const maandenPerJaar = {};
  const perJaarCat = {};
  for (const tx of classified) {
    if (!tx.date) continue;
    const y = tx.date.getFullYear();
    (maandenPerJaar[y] ||= new Set()).add(tx.date.getMonth());
    if (tx.type !== "Zakelijk" || tx.amount >= 0 || tx.transferLocked) continue;
    const cat = tx.category;
    if (!cat || cat === "Overig" || STRUCTUREEL.test(cat) || /prive|privé|belasting|btw|salaris|dividend|persoonlijk/i.test(cat)) continue;
    if (fiscalTreatmentOf(cat) !== "kosten") continue;
    const o = ((perJaarCat[cat] ||= {})[y] ||= { totaal: 0, aantal: 0 });
    o.totaal += -tx.amount; o.aantal += 1;
  }
  const volledig = (y) => (maandenPerJaar[y]?.size || 0) >= 11;
  const jaren = Object.keys(maandenPerJaar).map(Number).sort();
  const meldingen = [];
  for (let i = 1; i < jaren.length; i++) {
    const vorig = jaren[i - 1], nu = jaren[i];
    if (nu !== vorig + 1 || !volledig(vorig) || !volledig(nu)) continue; // alleen opeenvolgende, volledige jaren
    const kandidaten = [];
    for (const [cat, perJaar] of Object.entries(perJaarCat)) {
      const a = perJaar[vorig]?.totaal || 0, b = perJaar[nu]?.totaal || 0;
      const verschil = b - a;
      if (Math.abs(verschil) < minEuro) continue;
      const basis = Math.max(a, b, 1);
      if ((Math.abs(verschil) / basis) * 100 < minPercentage) continue;
      if (bevestigd[`sprong|${cat}|${nu}`]) continue;
      const soort = b === 0 ? "verdwenen" : a === 0 ? "nieuw" : verschil > 0 ? "hoger" : "lager";
      kandidaten.push({ key: `sprong|${cat}|${nu}`, categorie: cat, vorig, nu, vorigTotaal: Math.round(a), nuTotaal: Math.round(b), verschil: Math.round(verschil), soort, aantalVorig: perJaar[vorig]?.aantal || 0, aantalNu: perJaar[nu]?.aantal || 0 });
    }
    kandidaten.sort((x, y) => Math.abs(y.verschil) - Math.abs(x.verschil));
    meldingen.push(...kandidaten.slice(0, maxPerJaar));
  }
  return meldingen;
}
