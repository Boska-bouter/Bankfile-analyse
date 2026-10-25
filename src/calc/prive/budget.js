// beide-V1R8 (fase 5) — budgetoverzicht van een privédossier: inkomsten, uitgaven per hoofdcategorie en
// categorie, vaste lasten, sparen en wat er overblijft; per jaar en per maand. Geen omzet, geen BTW.
// Werkt op de ingedeelde transacties (useClassified). Overboekingen tussen eigen rekeningen tellen niet mee.
import { PRIVE_WEERGAVE, priveSoort, isTerugbetaling } from "../../modus/prive/weergave.js";

const OVERIG = "Overig";
const SPAREN = new Set(["Interne overboeking: privé sparen", "Beleggen"]);
const NIET_MEETELLEN = new Set(["Interne overboeking", "Inkomsten/betalingen niet dit jaar"]);

// beide-V5R1 — labels die meebewegen met het teken (wens Boska 25-10): geld dat per saldo terugkwam van sparen of
// uit een uitgavengroep (bijv. een belastingteruggaaf) heet ook zo. Werkt op één bedrag of een lijst (meerdere jaren).
const allemaal = (b, f) => (Array.isArray(b) ? b.length > 0 && b.every(f) : f(b));
export const sparenLabel = (b) => (allemaal(b, (x) => x < 0) ? "Opgenomen van sparen en beleggen" : allemaal(b, (x) => x >= 0) ? "Naar sparen en beleggen" : "Sparen en beleggen (− erbij, + opgenomen)");
export const hoofdLabel = (hoofd, b) => (allemaal(b, (x) => x < 0) ? `${hoofd} (per saldo terugontvangen)` : hoofd);
// beide-V5R4 — "Over" is inkomsten min uitgaven (wens Boska 25-10: "we houden altijd over"). Wat je daarvan spaart of
// belegt en wat er met het saldo van je rekening gebeurt, staat eronder (zie SALDO_LABEL).
export const overLabel = (b) => (allemaal(b, (x) => x >= 0) ? "Over (inkomsten min uitgaven)" : allemaal(b, (x) => x < 0) ? "Meer uitgegeven dan binnengekomen" : "Over (+) of meer uitgegeven (−)");
export const SALDO_LABEL = "Verandering saldo van je rekening";
export const VERSCHOVEN_LABEL = "Rond de jaarwisseling in een ander jaar geteld";
export const VASTE_LASTEN_LABEL = "Vaste lasten (zit al in de uitgaven)";

// beide-V5R2 — eigenBetaal: saldo van overboekingen met je andere (betaal)rekeningen; telt niet mee in het budget, maar
// over − sparen + eigenBetaal = saldo: de verandering van het saldo van je geladen rekening(en).
const leeg = () => ({ inkomsten: 0, uitgaven: 0, vasteLasten: 0, sparen: 0, over: 0, eigenBetaal: 0, saldo: 0, verschoven: 0 });

// beide-V5R6 — een uitgave rond de jaarwisseling die zelf zegt voor welk jaar hij is ("PREMIE 2026." betaald op
// 29-12-2025, "contributie 2025" betaald in januari 2025 telt al goed): in december met het volgende jaar, of in januari
// met het vorige jaar in de omschrijving, telt in het budget van dat jaar (wens Boska 25-10). Alleen het budget; de
// belasting rekent met de betaaldatum. Niet voor inkomen en belastingen (een teruggaaf "IB 2024" is geld van nu).
const datumVan = (t) => (t.date instanceof Date ? t.date : new Date(t.date));
export function budgetJaarVan(t, jaren = null) {
  const d = datumVan(t);
  const jaar = t.year ?? d.getFullYear();
  const maand = d.getMonth();
  if ((maand !== 11 && maand !== 0) || !(Number(t.amount) < 0) || budgetSoort(t.category) !== "uitgave") return jaar;
  if (["Belastingen", "Giften"].includes(PRIVE_WEERGAVE.hoofdVan(t.category))) return jaar;
  const tekst = `${t.description || ""} ${t.fullDescription || ""}`;
  const noemt = (j) => new RegExp(`(^|[^0-9])${j}([^0-9]|$)`).test(tekst);
  const ander = maand === 11 ? jaar + 1 : jaar - 1;
  // "vanaf 2025" zegt niet voor welk jaar; en een jaar zonder gegevens in het dossier laat de uitgave niet verdwijnen
  if (new RegExp(`(vanaf|sinds|per)\\s+(\\d{1,2}[-\\s/]\\w+[-\\s/])?${ander}`, "i").test(tekst)) return jaar;
  if (jaren && !jaren.has(ander)) return jaar;
  return noemt(ander) && !noemt(jaar) ? ander : jaar;
}
export const EIGEN_BETAAL_LABEL = "Overboekingen met je andere betaalrekeningen (telt niet mee)";

// soort van een boeking in het budget: "inkomen" | "uitgave" | "sparen" | null (telt niet mee)
export function budgetSoort(categorie) {
  if (NIET_MEETELLEN.has(categorie)) return null;
  if (SPAREN.has(categorie)) return "sparen";
  const s = priveSoort(categorie);
  if (s === "overboeking") return null;
  return s === "inkomen" ? "inkomen" : "uitgave";
}

// → { jaar, totaal, perMaand[12], inkomstenPerCategorie, uitgavenPerHoofd: [{hoofd, bedrag, categorieen:[{naam,label,bedrag}]}],
//     vasteLastenPerCategorie, aantal }
export function budgetJaar(transacties, jaar, vasteCategorieen = []) {
  const vast = new Set(vasteCategorieen);
  const totaal = leeg();
  const perMaand = Array.from({ length: 12 }, () => leeg());
  const inkomsten = new Map();
  const uitgaven = new Map(); // hoofd → Map(categorie → bedrag)
  const vasteLasten = new Map();
  let aantal = 0;
  const verschovenUit = [], verschovenIn = [];
  const jaren = new Set(transacties.map((t) => t.year));
  for (const t of transacties) {
    const bj = budgetJaarVan(t, jaren);
    if (t.year !== jaar && bj !== jaar) continue;
    if (bj !== t.year) {
      // verschoven: in het betaaljaar alleen in het saldo, in het budgetjaar als uitgave (in januari of december)
      const bedrag = Number(t.amount) || 0;
      if (t.year === jaar) { totaal.verschoven += bedrag; verschovenUit.push(t); continue; }
      totaal.verschoven -= bedrag; verschovenIn.push(t);
    }
    let soort = budgetSoort(t.category);
    if (t.category === "Interne overboeking") {
      const m0 = perMaand[(t.date instanceof Date ? t.date : new Date(t.date)).getMonth()] || perMaand[0];
      totaal.eigenBetaal += Number(t.amount) || 0; m0.eigenBetaal += Number(t.amount) || 0;
    }
    if (!soort) continue;
    aantal++;
    const m = perMaand[bj !== t.year ? (bj > t.year ? 0 : 11) : datumVan(t).getMonth()] || perMaand[0];
    const bedrag = Number(t.amount) || 0;
    // Geld dat binnenkomt in een algemene categorie (hoofd "Overig", bijv. "Nog te beoordelen") is inkomen,
    // geen negatieve uitgave; een terugbetaling in een gewone uitgavencategorie verlaagt die uitgave wel.
    // beide-V2R2 — behalve een terugbetaling (Tikkie, retour, eindafrekening): die verlaagt de uitgaven.
    if (soort === "uitgave" && bedrag > 0 && PRIVE_WEERGAVE.hoofdVan(t.category) === OVERIG && !isTerugbetaling(t.category)) soort = "inkomen";
    if (soort === "inkomen") {
      totaal.inkomsten += bedrag; m.inkomsten += bedrag;
      inkomsten.set(t.category, (inkomsten.get(t.category) || 0) + bedrag);
    } else if (soort === "sparen") {
      totaal.sparen -= bedrag; m.sparen -= bedrag;
    } else {
      totaal.uitgaven -= bedrag; m.uitgaven -= bedrag;
      const hoofd = PRIVE_WEERGAVE.hoofdVan(t.category);
      if (!uitgaven.has(hoofd)) uitgaven.set(hoofd, new Map());
      const h = uitgaven.get(hoofd);
      h.set(t.category, (h.get(t.category) || 0) - bedrag);
      if (vast.has(t.category)) {
        totaal.vasteLasten -= bedrag; m.vasteLasten -= bedrag;
        vasteLasten.set(t.category, (vasteLasten.get(t.category) || 0) - bedrag);
      }
    }
  }
  for (const x of [totaal, ...perMaand]) { x.over = x.inkomsten - x.uitgaven; x.saldo = x.over - x.sparen + x.eigenBetaal + x.verschoven; }
  const metLabel = (map) => [...map.entries()].map(([naam, bedrag]) => ({ naam, label: PRIVE_WEERGAVE.label(naam), bedrag })).sort((a, b) => b.bedrag - a.bedrag);
  const volgorde = PRIVE_WEERGAVE.hoofden;
  const uitgavenPerHoofd = [...uitgaven.entries()]
    .map(([hoofd, cats]) => ({ hoofd, bedrag: [...cats.values()].reduce((a, b) => a + b, 0), categorieen: metLabel(cats) }))
    .sort((a, b) => b.bedrag - a.bedrag || volgorde.indexOf(a.hoofd) - volgorde.indexOf(b.hoofd));
  const maandenMetData = new Set(transacties.filter((t) => t.year === jaar).map((t) => (t.date instanceof Date ? t.date : new Date(t.date)).getMonth()));
  return {
    jaar, totaal, perMaand, aantal, maanden: maandenMetData.size, verschovenUit, verschovenIn,
    inkomstenPerCategorie: metLabel(inkomsten),
    uitgavenPerHoofd,
    vasteLastenPerCategorie: metLabel(vasteLasten),
    // fiscaal relevante uitgaven (voor de belastingberekening)
    som: (categorie) => -(transacties.filter((t) => t.year === jaar && t.category === categorie).reduce((a, t) => a + (Number(t.amount) || 0), 0)),
  };
}
