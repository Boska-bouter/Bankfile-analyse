// beide-V6R7 — het tarievenbestand van de server toepassen op de ingebouwde tabellen (zie tax/tarievenBestand.js).
// main.jsx roept laadTarieven() aan vóór de app tekent: dan rekent alles meteen met de nieuwste tarieven. Lukt het
// ophalen niet (offline, server traag), dan geldt de laatst opgehaalde versie uit de browser, en anders de tabellen
// die in de app zitten.

import {
  IB_TARIEVEN_BY_YEAR, ZVW_TARIEVEN_BY_YEAR, ALGEMENE_HEFFINGSKORTING_BY_YEAR, ARBEIDSKORTING_BY_YEAR, KIA_STAFFEL_BY_YEAR,
  STARTERSAFTREK_BY_YEAR, VOORLOPIGE_JAREN,
} from "./incomeTax.js";
import { AOW_SCHIJF_BY_YEAR, OUDERENKORTING_BY_YEAR, EIGEN_WONING_BY_YEAR, BOX3_BY_YEAR, AFTREK_BY_YEAR } from "./prive/tarieven.js";
import { VPB_TARIEVEN_BY_YEAR, BOX2_TARIEVEN_BY_YEAR, GEBRUIKELIJK_LOON_MINIMUM_BY_YEAR } from "./vpb.js";
import { controleerTarievenBestand, TARIEF_GROEPEN, TARIEF_LOSSE, TARIEVEN_FORMAAT } from "./tarievenBestand.js";

const TABEL = {
  ib: IB_TARIEVEN_BY_YEAR, zvw: ZVW_TARIEVEN_BY_YEAR, ahk: ALGEMENE_HEFFINGSKORTING_BY_YEAR, ak: ARBEIDSKORTING_BY_YEAR,
  kia: KIA_STAFFEL_BY_YEAR, aow: AOW_SCHIJF_BY_YEAR, ouderen: OUDERENKORTING_BY_YEAR, woning: EIGEN_WONING_BY_YEAR,
  box3: BOX3_BY_YEAR, aftrek: AFTREK_BY_YEAR, vpb: VPB_TARIEVEN_BY_YEAR, box2: BOX2_TARIEVEN_BY_YEAR,
  gebruikelijkLoon: GEBRUIKELIJK_LOON_MINIMUM_BY_YEAR, startersaftrek: STARTERSAFTREK_BY_YEAR,
};
const CACHE_SLEUTEL = "bankoverzicht:tarieven";

// Welk tarievenbestand is in gebruik? null = alleen de ingebouwde tabellen.
let _info = null;
export const tarievenInfo = () => _info;

const naarInfinity = (lijst) => lijst.map((b) => ({ ...b, tot: b.tot == null ? Infinity : b.tot }));

// Past een (gecontroleerd) bestand toe. Een jaar of groep die er niet in staat, blijft zoals in de app.
export function pasTarievenToe(bestand, herkomst = "server") {
  const r = controleerTarievenBestand(bestand);
  if (!r.ok) return r;
  for (const [j, jaar] of Object.entries(r.bestand.jaren)) {
    const y = Number(j);
    for (const groep of Object.keys(TARIEF_GROEPEN)) {
      if (!jaar[groep]) continue;
      const w = { ...jaar[groep] };
      if (w.brackets) w.brackets = naarInfinity(w.brackets);
      TABEL[groep][y] = w;
    }
    for (const veld of Object.keys(TARIEF_LOSSE)) if (jaar[veld] != null) TABEL[veld][y] = jaar[veld];
    if (jaar.status === "voorlopig") VOORLOPIGE_JAREN.add(y);
    else VOORLOPIGE_JAREN.delete(y);
  }
  _info = { versie: r.bestand.versie, bron: r.bestand.bron, jaren: Object.keys(r.bestand.jaren).map(Number), herkomst };
  return { ok: true };
}

// De tarieven zoals de app ze nu gebruikt, als tarievenbestand (voorbeeld en startpunt voor een nieuw jaar).
export function huidigeTarieven(versie = new Date().toISOString().slice(0, 10)) {
  const jaren = {};
  const zet = (y) => (jaren[y] ||= { status: VOORLOPIGE_JAREN.has(Number(y)) ? "voorlopig" : "definitief" });
  for (const groep of Object.keys(TARIEF_GROEPEN)) {
    for (const [y, w] of Object.entries(TABEL[groep])) {
      const kopie = JSON.parse(JSON.stringify(w, (k, v) => (v === Infinity ? null : v)));
      zet(y)[groep] = kopie;
    }
  }
  for (const veld of Object.keys(TARIEF_LOSSE)) for (const [y, v] of Object.entries(TABEL[veld])) zet(y)[veld] = v;
  return { formaat: TARIEVEN_FORMAAT, versie, bron: "Bankoverzicht", jaren };
}

function leesCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_SLEUTEL) || "null"); } catch { return null; }
}
function schrijfCache(bestand) {
  try { localStorage.setItem(CACHE_SLEUTEL, JSON.stringify(bestand)); } catch { /* geen opslag: dan de volgende keer opnieuw ophalen */ }
}
function wisCache() {
  try { localStorage.removeItem(CACHE_SLEUTEL); } catch { /* niets */ }
}

// Haalt /api/tarieven op (hooguit `wacht` ms) en past het toe. Nooit een fout naar buiten: de app moet altijd starten.
export async function laadTarieven({ wacht = 2500 } = {}) {
  let bestand;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), wacht);
    const r = await fetch("/api/tarieven", { credentials: "same-origin", cache: "no-store", signal: ctrl.signal });
    clearTimeout(t);
    const d = r.ok && String(r.headers.get("content-type") || "").includes("json") ? await r.json() : null;
    if (d?.ok) {
      bestand = d.tarieven || null;
      if (bestand) schrijfCache(bestand);
      else wisCache(); // de beheerder heeft het bestand weggehaald: terug naar de ingebouwde tarieven
      if (!bestand) return;
    }
  } catch { /* offline of te traag: hieronder de laatst bekende versie */ }
  if (bestand) { pasTarievenToe(bestand, "server"); return; }
  const bewaard = leesCache();
  if (bewaard) pasTarievenToe(bewaard, "bewaard");
}
