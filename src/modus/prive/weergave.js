// beide-V1R6 (fase 3) — de privéindeling voor keuzelijsten, overzichten en instellingen. categories.js vraagt
// dit object (via setCategorieProfiel) om de hoofdcategorie, het label en de keuzes zodra een privédossier
// open is; zonder privédossier verandert er niets aan de zakelijke indeling.
import { CATEGORY_COLOR, sortNl } from "../../classification/categories.js";
import { PRIVE_HOOFDEN, PRIVE_CATEGORIEEN, PRIVE_STANDAARD_HOOFD } from "./categorieen.js";

const HOOFDNAMEN = PRIVE_HOOFDEN.map((h) => h.naam);
const PER_NAAM = new Map(PRIVE_CATEGORIEEN.map((c) => [c.naam, c]));
// Zelf toegevoegde privécategorieën (Instellingen → Categorieregels): naam → hoofdcategorie.
const eigen = new Map();

// Nieuwe privénamen bestaan niet in de zakelijke lijsten. Alleen een kleur krijgen ze meteen; hun hoofdcategorie
// en fiscale behandeling ("geen": nooit zakelijke omzet/kosten) gelden alleen zolang een privédossier open is
// (zie fiscaal hieronder), zodat een zakelijke eigen categorie met toevallig dezelfde naam niet verandert.
for (const c of PRIVE_CATEGORIEEN) {
  if (c.nieuw && !CATEGORY_COLOR[c.naam]) CATEGORY_COLOR[c.naam] = c.kleur || "bg-slate-200 text-slate-700";
}

export function registreerPriveCategorie(naam, hoofd) {
  const h = HOOFDNAMEN.includes(hoofd) ? hoofd : PRIVE_STANDAARD_HOOFD;
  eigen.set(naam, h);
  if (!CATEGORY_COLOR[naam]) CATEGORY_COLOR[naam] = "bg-slate-200 text-slate-700";
}

export function isPriveCategorie(naam) {
  return PER_NAAM.has(naam) || eigen.has(naam);
}

// Inkomen en overboekingen zijn geen vaste of variabele last.
export function priveSoort(naam) {
  return PER_NAAM.get(naam)?.soort || "uitgave";
}

export function fiscaleVlag(naam) {
  return PER_NAAM.get(naam)?.fiscaal || null;
}

const hoofdVan = (naam) => PER_NAAM.get(naam)?.hoofd || eigen.get(naam) || PRIVE_STANDAARD_HOOFD;
const label = (naam) => PER_NAAM.get(naam)?.label || naam;

function soorten(hoofd) {
  const vast = PRIVE_CATEGORIEEN.filter((c) => c.hoofd === hoofd).map((c) => c.naam);
  const zelf = [...eigen].filter(([, h]) => h === hoofd).map(([n]) => n);
  return [...vast, ...zelf];
}

const naamVoorLabel = (keuze) => {
  for (const c of PRIVE_CATEGORIEEN) if (c.label === keuze) return c.naam;
  return keuze;
};

export const PRIVE_WEERGAVE = Object.freeze({
  hoofden: HOOFDNAMEN,
  hoofdenAlfa: sortNl(HOOFDNAMEN),
  kleur: Object.freeze(Object.fromEntries(PRIVE_HOOFDEN.map((h) => [h.naam, h.kleur]))),
  standaard: Object.freeze(Object.fromEntries(HOOFDNAMEN.map((h) => [h, PRIVE_CATEGORIEEN.find((c) => c.hoofd === h)?.naam]))),
  hoofdVan,
  label,
  // Nieuwe en zelf toegevoegde privécategorieën tellen nooit als zakelijke omzet of kosten.
  fiscaal: (naam) => (PER_NAAM.get(naam)?.nieuw || eigen.has(naam) ? "geen" : null),
  soorten,
  bevat: isPriveCategorie,
  soortVan: priveSoort,
  registreer: registreerPriveCategorie,
  // Keuzelijst: per hoofdcategorie alle soorten (label zichtbaar, opgeslagen waarde = naam).
  keuzeGroepen(huidige = null) {
    const groepen = HOOFDNAMEN.map((h) => ({ groep: h, opties: soorten(h).map((n) => ({ value: n, label: label(n) })) }));
    // Een categorie van buiten de privélijst (bijv. een oude handmatige keuze) blijft zichtbaar.
    if (huidige && !isPriveCategorie(huidige)) groepen.find((g) => g.groep === PRIVE_STANDAARD_HOOFD).opties.push({ value: huidige, label: huidige });
    return groepen.filter((g) => g.opties.length > 0);
  },
  keuzes: (hoofd) => soorten(hoofd).map(label),
  opgeslagenVoorKeuze: (keuze) => naamVoorLabel(keuze),
});
