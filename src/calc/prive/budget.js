// beide-V1R8 (fase 5) — budgetoverzicht van een privédossier: inkomsten, uitgaven per hoofdcategorie en
// categorie, vaste lasten, sparen en wat er overblijft; per jaar en per maand. Geen omzet, geen BTW.
// Werkt op de ingedeelde transacties (useClassified). Overboekingen tussen eigen rekeningen tellen niet mee.
import { PRIVE_WEERGAVE, priveSoort, isTerugbetaling } from "../../modus/prive/weergave.js";

const OVERIG = "Overig";
const SPAREN = new Set(["Interne overboeking: privé sparen", "Beleggen"]);
const NIET_MEETELLEN = new Set(["Interne overboeking", "Inkomsten/betalingen niet dit jaar"]);

const leeg = () => ({ inkomsten: 0, uitgaven: 0, vasteLasten: 0, sparen: 0, over: 0 });

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
  for (const t of transacties) {
    if (t.year !== jaar) continue;
    let soort = budgetSoort(t.category);
    if (!soort) continue;
    aantal++;
    const m = perMaand[(t.date instanceof Date ? t.date : new Date(t.date)).getMonth()] || perMaand[0];
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
  for (const x of [totaal, ...perMaand]) x.over = x.inkomsten - x.uitgaven - x.sparen;
  const metLabel = (map) => [...map.entries()].map(([naam, bedrag]) => ({ naam, label: PRIVE_WEERGAVE.label(naam), bedrag })).sort((a, b) => b.bedrag - a.bedrag);
  const volgorde = PRIVE_WEERGAVE.hoofden;
  const uitgavenPerHoofd = [...uitgaven.entries()]
    .map(([hoofd, cats]) => ({ hoofd, bedrag: [...cats.values()].reduce((a, b) => a + b, 0), categorieen: metLabel(cats) }))
    .sort((a, b) => b.bedrag - a.bedrag || volgorde.indexOf(a.hoofd) - volgorde.indexOf(b.hoofd));
  const maandenMetData = new Set(transacties.filter((t) => t.year === jaar).map((t) => (t.date instanceof Date ? t.date : new Date(t.date)).getMonth()));
  return {
    jaar, totaal, perMaand, aantal, maanden: maandenMetData.size,
    inkomstenPerCategorie: metLabel(inkomsten),
    uitgavenPerHoofd,
    vasteLastenPerCategorie: metLabel(vasteLasten),
    // fiscaal relevante uitgaven (voor de belastingberekening)
    som: (categorie) => -(transacties.filter((t) => t.year === jaar && t.category === categorie).reduce((a, t) => a + (Number(t.amount) || 0), 0)),
  };
}
