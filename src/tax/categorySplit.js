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
// Andere kosten-/privé-categorieën (Zakelijke inkoop/uitgaven, Uitbetalen loon, Verkoop activa,
// Belastingen (incl. naheffingen), Onderhoud apparatuur/machines, Betaalautomaat kosten, Uitbetaling
// aan prive, Prive opnames, Lease (operationeel/financieel), etc.) zijn typisch volledig van het ene
// of het andere type — daar zou een percentage-instelling alleen maar voor verwarring zorgen, dus
// die blijven hier bewust buiten beeld. "Huur (deels zakelijk)", "Energie-water (deels zakelijk)" en
// "Gemeentelijke kosten (deels zakelijk)" staan er ook niet bij: die hebben elk al hun eigen, aparte
// percentage-mechanisme (zie gedeeldeHuur.js, instelbaar bij "Persoonlijke aannames") — dit hier is
// voor de gewone "Huur"/"Energie-water"/"Gemeentelijke kosten"-categorieën zelf. "Boekhouder,
// accountant & administratie" stond hier eerder ook bij deze
// uitzonderingen, maar is op verzoek (v288) alsnog aan SPLITSBARE_CATEGORIEEN toegevoegd — in de
// praktijk wordt een boekhouder/accountant soms ook voor privézaken ingeschakeld.
//
// "Brandstof" en "Parkeren" horen ook in deze lijst: vrijwel elke zzp'er/BV heeft een auto, en
// zonder deze twee categorieën zou een gemengd-gebruikte brandstof-/parkeertransactie per stuk naar
// een privé-categorie verplaatst moeten worden in plaats van gewoon één percentage per jaar in te
// stellen. Voor het jaar waarin de gebruiker "Auto op de zaak" heeft aangegeven worden ze weer
// uitgesloten (zie AUTO_SPLIT_UITSLUITING/autoStatus hieronder): het privégebruik loopt dan al via de
// bijtelling/onttrekkings-correctie (autoBijtelling.js), en een generiek %-zakelijk op dezelfde
// transacties zou daarmee in tegenspraak zijn. Bij "Onbekend" blijft deze generieke %-splitsing
// gewoon bruikbaar.
export const SPLITSBARE_CATEGORIEEN = [
  "Brandstof",
  "Zakelijk mobiel/internet",
  // Het privé-tegenhangster van "Zakelijk mobiel/internet" — anders dan "Brandstof" (dat op BEIDE
  // rekeningen gewoon dezelfde categorienaam houdt, zie SPLIT_CATEGORY_NAMES in categories.js)
  // krijgt een mobiel/internet-abonnement dat vanaf de privérekening wordt betaald een eigen naam
  // ("Privé - mobiel/internet") zodra het niet als bevestigde zakelijke uitgave herkend is — zonder
  // deze regel viel zo'n transactie dus BUITEN dit paneel, en kon een deels-zakelijk telefoon-/
  // internetabonnement dat toevallig vanaf privé betaald is nooit een percentage zakelijk krijgen.
  "Privé - mobiel/internet",
  "Reiskosten (OV)",
  "Parkeren",
  "Huur",
  "Streaming diensten",
  // v288 — privé-tegenhanger van "Streaming diensten" hierboven (zie categories.js), zelfde reden
  // als "Privé - mobiel/internet": zonder eigen entry hier zou een streamingabonnement dat je onder
  // hoofdcategorie "Privé" indeelt nooit een instelbaar percentage zakelijk gebruik kunnen krijgen.
  "Privé - streaming diensten",
  "Software & Online diensten",
  // v288 — op verzoek: een boekhouder/accountant/adviesbureau wordt in de praktijk soms ook voor
  // privézaken (bijv. de aangifte IB naast de aangifte OB) ingeschakeld, dus niet per se voor 100%
  // zakelijk — voorheen stond deze categorie bewust NIET in de lijst (zie de toelichting hierboven
  // bij "Andere kosten-/privé-categorieën"), maar in overleg alsnog toegevoegd.
  "Boekhouder, accountant & administratie",
  // V49 — huisvesting: gewone energie/gemeentelijke kosten (zakelijke rekening) en de privé-tegenhangers
  // voor kosten vanaf een privérekening (standaard 0% zakelijk) waren niet instelbaar. "Huur" stond er al.
  "Energie-water", "Gemeentelijke kosten",
  "Privé - huur", "Privé - energie-water", "Privé - gemeentelijke kosten", "Privé - overige kosten",
];

export function isSplitsbareCategorie(category) {
  return SPLITSBARE_CATEGORIEEN.includes(category);
}

export function defaultZakelijkPercentage(category) {
  return fiscalTreatmentOf(category) === "kosten" ? 100 : 0;
}

// Brandstof/Parkeren zijn WEL splitsbaar (zie SPLITSBARE_CATEGORIEEN), behalve in een jaar waarin
// de gebruiker heeft aangegeven dat de auto op de zaak staat (autoStatus "zaak", ingesteld via de
// wizard of "Persoonlijke aannames"). In dat geval hoort het privégebruik via de aparte
// bijtelling/onttrekkings-correctie te lopen (zie autoBijtelling.js) — een generiek %-zakelijk op
// dezelfde transacties zou daar in tegenspraak mee zijn. Bij "Privéauto zakelijk gebruikt" of
// "Onbekend" blijft de generieke splitsing gewoon bruikbaar.
const AUTO_SPLIT_UITSLUITING = ["Brandstof", "Parkeren"];

function autoOpDeZaak(year, autoStatus) {
  const status = autoStatus?.[year];
  return status === "zaak";
}

// Zowel computeLeaseAutoKostenVoorJaar (financiële lease, zie autoBijtelling.js) als
// computeAutoActivaKostenVoorJaar (koop/operationele lease, zie autoActiva.js) tellen 100% van
// Brandstof/Parkeren mee zodra er zo'n auto-op-de-zaak geregistreerd staat — voor ELK jaar, ongeacht
// wat `autoStatus` voor dat jaar zegt (geen van beide functies kijkt daarnaar). Zonder deze functie
// zou de generieke %-splitsing hierboven dezelfde Brandstof/Parkeren-transacties in een jaar met
// `autoStatus` nog op "Onbekend" tegelijk nog eens apart (en tegenstrijdig) kunnen verdelen. Deze
// functie detecteert alle drie de situaties rechtstreeks vanuit dezelfde bronnen en dezelfde
// voorwaarden als die twee berekenfuncties zelf gebruiken (leaseSummary/leaseDetails met
// `soort === "auto"` voor financiële lease; autoWizardStatus.soort "koop"/"operational" mét ingevulde
// autoActivaDetails voor de andere twee — zie combineAutoKosten in autoActiva.js, die om precies
// dezelfde reden "financiële lease OF koop/operational, ongeacht welke" samenvoegt) — bewust zonder
// jaarfilter: geen van beide brondfuncties filtert zijn resultaat op jaar, dus moet de generieke
// splitsing deze twee categorieën voor ELK jaar mijden zodra één van de drie autovormen ergens in het
// dossier geregistreerd staat, niet alleen de jaren binnen de looptijd van dat ene contract.
export function heeftGeregistreerdeAutoOpDeZaak(leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus) {
  for (const lease of leaseSummary || []) {
    if (lease.category !== "Lease (financieel)") continue;
    const details = leaseDetails?.[lease.key];
    if (!details || details.onbekend) continue;
    const segments = Array.isArray(details.contracts) && details.contracts.length > 0 ? details.contracts : [details];
    if (segments.some((s) => s.soort === "auto")) return true;
  }
  const soort = autoWizardStatus?.soort;
  if ((soort === "koop" || soort === "operational") && autoActivaDetails) return true;
  return false;
}

// Negeert een eventueel opgeslagen percentage voor een categorie die niet (meer) op
// SPLITSBARE_CATEGORIEEN staat, of voor Brandstof/Parkeren in een jaar met "auto op de zaak" — zo
// blijft die situatie altijd op het standaardgedrag (100%, gewone aftrekbare kosten; de eventuele
// bijtelling-correctie loopt apart via autoBijtelling.js), ook als er nog een percentage opgeslagen
// staat van vóór dat autoStatus werd ingesteld.
// Privéauto zakelijk gebruikt (autoStatus "prive"): de kilometervergoeding (tax/kmVergoeding.js) is dan de ENIGE
// aftrek voor de auto en dekt alle autokosten. De werkelijke autokosten uit de bank (brandstof, parkeren,
// verzekering, MRB, overige autokosten) tellen dus niet mee — noch als kosten, noch als voorbelasting.
// Dezelfde lijst als AUTOKOSTEN_CATEGORIEN in autoBijtelling.js (hier herhaald om een importcirkel te vermijden).
const PRIVEAUTO_UITGESLOTEN = ["Autokosten", "Brandstof", "Parkeren", "Verzekering: Auto", "Belastingen: MRB"];
export function isPriveAutoJaar(year, autoStatus) { return autoStatus?.[year] === "prive"; }

export function effectiveZakelijkPercentage(category, year, categoryZakelijkPercentage, autoStatus, heeftLeaseAuto = false) {
  if (PRIVEAUTO_UITGESLOTEN.includes(category) && isPriveAutoJaar(year, autoStatus)) return 0;
  if (!isSplitsbareCategorie(category)) return defaultZakelijkPercentage(category);
  if (AUTO_SPLIT_UITSLUITING.includes(category) && (autoOpDeZaak(year, autoStatus) || heeftLeaseAuto)) {
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
// voor dat jaar toch genegeerd wordt. `heeftLeaseAuto` (zie heeftGeregistreerdeAutoOpDeZaak
// hierboven) doet hetzelfde voor een geregistreerde auto-op-de-zaak (financiële lease met soort
// "auto", koop, of operationele lease), ongeacht wat autoStatus voor dit jaar zegt.
export function computeSplitsbareCategorieTotalenVoorJaar(classified, year, autoStatus, heeftLeaseAuto = false) {
  const netto = {};
  for (const tx of classified) {
    if (tx.isMirror || tx.year !== year) continue;
    if (!isSplitsbareCategorie(tx.category)) continue;
    if (AUTO_SPLIT_UITSLUITING.includes(tx.category) && (autoOpDeZaak(year, autoStatus) || isPriveAutoJaar(year, autoStatus) || heeftLeaseAuto)) continue;
    netto[tx.category] = (netto[tx.category] || 0) + tx.amount;
  }
  const totalen = {};
  for (const categorie of Object.keys(netto)) totalen[categorie] = Math.abs(netto[categorie]);
  return totalen;
}
