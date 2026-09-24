// Generieke percentage-zakelijk-splitsing per (bestaande) categorie per jaar — bijv. "70% van
// Brandstof is zakelijk" of "30% van Boodschappen is toch zakelijk". In tegenstelling tot "Huur
// (deels zakelijk)" (zie gedeeldeHuur.js, dat hiervoor een eigen, aparte categorie gebruikt) werkt
// dit mechanisme direct op elke bestaande "kosten"- of "geen" (privé)-categorie: transacties
// blijven gewoon in hun eigen categorie staan en tx.type blijft gewoon de rekening weergeven
// (Route B, zie categories.js) — alleen het bedrag dat in de winst-/BTW-berekening als zakelijk
// vs. privé meetelt, wordt naar rato verdeeld.
//
// `categoryZakelijkPercentage` is een { categorie: { jaar: percentage(0-100) } }-map. Ontbreekt een
// categorie/jaar (de situatie voor vrijwel elk bestaand dossier), dan geldt het standaardgedrag van
// fiscalTreatmentOf ongewijzigd: 100% voor "kosten" (volledig aftrekbaar, zoals nu), 0% voor "geen"
// (volledig privé, zoals nu) — dus 100% backwards compatible zolang niemand voor een categorie/jaar
// bewust een percentage instelt.
//
// Bewust beperkt tot "kosten"/"geen" ÉN een expliciete, korte lijst categorieën (zie
// SPLITSBARE_CATEGORIEEN hieronder) — een "omzet"-categorie blijft altijd voor 100% omzet, en
// "financiering" (Leningen/Lease financieel) blijft hier altijd buiten — daar is alleen de rente
// aftrekbaar (niet het termijnbedrag), en dat wordt al apart berekend (zie loanAmortization.js).
import { fiscalTreatmentOf } from "../classification/categories.js";

// Alleen deze categorieën komen in aanmerking voor de %-splitsing (in overleg bevestigd) — dit zijn
// kosten die in de praktijk vaak deels zakelijk/deels privé zijn, ongeacht welke rekening betaalt.
// Andere kosten-/privé-categorieën (Zakelijke inkoop/uitgaven, Uitbetalen loon, Verkoop activa, Boekhouder
// accountant & administratie, Belastingen (incl. naheffingen), Onderhoud apparatuur/machines,
// Betaalautomaat kosten, Uitbetaling aan prive, Prive opnames, Lease (operationeel/financieel),
// etc.) zijn typisch volledig van het ene of het andere type — daar zou een percentage-instelling
// alleen maar voor verwarring zorgen, dus die blijven hier bewust buiten beeld. "Huur (deels
// zakelijk)" staat er ook niet bij: die heeft al zijn eigen, aparte percentage-mechanisme (zie
// gedeeldeHuur.js) — dit is voor de gewone "Huur"-categorie.
//
// "Brandstof" en "Parkeren" zaten in v172 kortstondig NIET in deze lijst: bij een financial-lease-
// auto met bijtelling gebruikt computeLeaseAutoKostenVoorJaar (zie autoBijtelling.js) altijd 100%
// van deze autokosten voor de bijtelling-aftopping/onttrekking — een generiek %-zakelijk op
// dezelfde transacties zou daar in tegenspraak mee zijn. Maar "altijd uitsluiten" bleek zelf ook
// niet juist: vrijwel elke zzp'er/BV heeft een auto, en zonder deze twee categorieën moet een
// gemengd-gebruikte brandstof-/parkeertransactie per stuk naar een privé-categorie verplaatst
// worden in plaats van gewoon één percentage per jaar in te stellen — voor een dossier zonder
// auto-op-de-zaak is dat een onnodige verslechtering. Vanaf v173 daarom weer terug in de lijst;
// vanaf v175 worden ze alleen nog uitgesloten in het jaar waar de gebruiker expliciet "Auto op de
// zaak" heeft aangegeven (zie AUTO_SPLIT_UITSLUITING/autoStatus hieronder) — bij "Onbekend" blijft
// deze generieke %-splitsing gewoon bruikbaar.
export const SPLITSBARE_CATEGORIEEN = [
  "Brandstof",
  "Zakelijk mobiel/internet",
  "Reiskosten (OV)",
  "Parkeren",
  "Huur",
  "Streaming diensten",
  "Software & Online diensten",
];

export function isSplitsbareCategorie(category) {
  return SPLITSBARE_CATEGORIEEN.includes(category);
}

export function defaultZakelijkPercentage(category) {
  return fiscalTreatmentOf(category) === "kosten" ? 100 : 0;
}

// Vanaf v175: Brandstof/Parkeren zijn WEL splitsbaar (zie SPLITSBARE_CATEGORIEEN), behalve in een
// jaar waarin de gebruiker heeft aangegeven dat de auto op de zaak staat (autoStatus "zaak" of
// "beide" — zie autoStatus in App.jsx, ingesteld via de wizard of "Persoonlijke aannames"). In dat
// geval hoort het privégebruik via de aparte bijtelling/onttrekkings-correctie te lopen (zie
// autoBijtelling.js) — een generiek %-zakelijk op dezelfde transacties zou daar in tegenspraak mee
// zijn (dubbele/tegenstrijdige correctie op dezelfde kosten). Bij "Privéauto zakelijk gebruikt",
// "Beide" (de PRIVÉAUTO-transacties, zie hieronder) of "Onbekend" blijft de generieke splitsing
// gewoon bruikbaar — "Beide" sluit hier alleen uit omdat de tool niet uit banktransacties kan
// afleiden welke brandstof/parkeer-transactie bij de zaaks-auto hoort en welke bij de privéauto
// (zie ook de toelichting bij "Beide" in het stappenplan) — tot dat onderscheid er is (v177) is
// volledig uitsluiten de veiligere kant (voorkomt dat een deel van de zaaks-auto-kosten alsnog via
// de generieke %-splitsing wordt teruggedraaid).
const AUTO_SPLIT_UITSLUITING = ["Brandstof", "Parkeren"];

function autoOpDeZaak(year, autoStatus) {
  const status = autoStatus?.[year];
  return status === "zaak" || status === "beide";
}

// Negeert een eventueel opgeslagen percentage voor een categorie die niet (meer) op
// SPLITSBARE_CATEGORIEEN staat, of voor Brandstof/Parkeren in een jaar met "auto op de zaak" — zo
// blijft die situatie altijd op het standaardgedrag (100%, gewone aftrekbare kosten; de eventuele
// bijtelling-correctie loopt apart via autoBijtelling.js), ook als er nog een percentage opgeslagen
// staat van vóór dat autoStatus werd ingesteld.
export function effectiveZakelijkPercentage(category, year, categoryZakelijkPercentage, autoStatus) {
  if (!isSplitsbareCategorie(category)) return defaultZakelijkPercentage(category);
  if (AUTO_SPLIT_UITSLUITING.includes(category) && autoOpDeZaak(year, autoStatus)) {
    return defaultZakelijkPercentage(category);
  }
  const override = categoryZakelijkPercentage?.[category]?.[year];
  return override != null ? override : defaultZakelijkPercentage(category);
}

// BTW van een transactie, ZONDER de "fiscalTreatmentOf === 'geen' → altijd 0"-kortsluiting die
// computeBtw (zie btw.js) heeft — nodig omdat een privé-categorie met een ingesteld
// zakelijk-percentage >0% ook een deel van zijn BTW als voorbelasting mag meetellen. Voor een
// "kosten"-categorie (waar die kortsluiting toch nooit triggert) geeft dit exact hetzelfde
// resultaat als computeBtw.
export function rawBtw(tx, categoryBtwRates, btwVerlegd) {
  const effectiefVerlegd = tx.btwVerlegd != null ? tx.btwVerlegd : btwVerlegd;
  if (effectiefVerlegd && tx.category === "Zakelijke inkomsten") return 0;
  const rate = categoryBtwRates[tx.category];
  if (!rate) return 0;
  return tx.amount - tx.amount / (1 + rate / 100);
}

// Voor de instelpaneel-UI: van alle splitsbare (kosten/geen) categorieën met minstens 1 transactie
// in `classified` voor `year`, het totaalbedrag — zodat de UI alleen categorieën toont die er dit
// jaar daadwerkelijk toe doen, in plaats van alle categorieën.
//
// Eerst het NETTO bedrag optellen (met teken) en pas daarna Math.abs nemen — niet Math.abs per
// transactie optellen. Anders telt een terugboeking/correctie niet als correctie mee, maar wordt hij
// bovenop de uitgave opgeteld: -€100 Brandstof + €100 terugboeking zou dan als €200 getoond worden
// in plaats van het werkelijke netto bedrag van €0. Voor het normale geval (alleen uitgaven in een
// categorie) geeft dit hetzelfde bedrag als voorheen. Dit is alleen het getoonde totaal op het
// instellingenscherm — de fiscale berekening zelf (rawBtw/effectiveZakelijkPercentage) werkt al met
// het teken van elke transactie en is hier niet van afhankelijk.
// `autoStatus` optioneel — laat Brandstof/Parkeren weg voor een jaar met "auto op de zaak" (zie
// effectiveZakelijkPercentage hierboven), zodat het instelpaneel geen percentage-veld toont dat
// voor dat jaar toch genegeerd wordt.
export function computeSplitsbareCategorieTotalenVoorJaar(classified, year, autoStatus) {
  const netto = {};
  for (const tx of classified) {
    if (tx.isMirror || tx.year !== year) continue;
    if (!isSplitsbareCategorie(tx.category)) continue;
    if (AUTO_SPLIT_UITSLUITING.includes(tx.category) && autoOpDeZaak(year, autoStatus)) continue;
    netto[tx.category] = (netto[tx.category] || 0) + tx.amount;
  }
  const totalen = {};
  for (const categorie of Object.keys(netto)) totalen[categorie] = Math.abs(netto[categorie]);
  return totalen;
}
