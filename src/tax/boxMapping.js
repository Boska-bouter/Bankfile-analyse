import { CATEGORY_ORDER } from "../classification/categories.js";
import { computeBtw } from "./btw.js";

// Welke categorieën in welk vak van de BTW-aangifte terechtkomen — puur informatief, gebaseerd
// op de eigen BTW-instellingen (percentages, uitgesloten van voorbelasting).
export function computeBtwBoxMapping(effectiveCategoryBtwRates, voorbelastingExcluded) {
  const omzetRate = effectiveCategoryBtwRates["Zakelijke inkomsten"];
  const voorbelastingCategorieen = CATEGORY_ORDER.filter(
    (c) => c !== "Zakelijke inkomsten" && !voorbelastingExcluded.includes(c) && (effectiveCategoryBtwRates[c] || 0) > 0
  );
  const uitgeslotenMetBtw = voorbelastingExcluded.filter((c) => (effectiveCategoryBtwRates[c] || 0) > 0);
  return { omzetRate, voorbelastingCategorieen, uitgeslotenMetBtw };
}

// Koppeling naar de aangifte inkomstenbelasting (winst uit onderneming, eenmanszaak/zzp) — in
// exact dezelfde volgorde en rubrieken als de winst-en-verliesrekening op de Belastingdienst-
// aangifte zelf, zodat je één op één kunt meelezen. Categorieën die geen echte bedrijfskostenpost
// zijn (belastingafdrachten, aflossing op leningen/lease, geldbewegingen naar/van privé) staan
// bewust apart van deze winstberekening, net als op de aangifte zelf.
const RUBRIEK_OPBRENGSTEN = ["Zakelijke inkomsten", "Zakelijke inkomsten 0%", "Zakelijke inkomsten 9%", "Zakelijke inkomsten 21%"];
const RUBRIEK_INKOOP = ["Zakelijke uitgaven", "Inhuur personeel"];
const RUBRIEK_AUTO = ["Autokosten", "Brandstof", "Parkeren", "Verzekering: Auto", "Lease (operationeel)", "Reiskosten (OV)", "Belastingen: MRB"];
const RUBRIEK_HUISVESTING = ["Huur", "Huur (deels zakelijk)", "Energie-water", "Gemeentelijke kosten"];
const RUBRIEK_VERKOOP = ["Marketing-website"];
const RUBRIEK_ANDERE_KOSTEN = [
  "Bankkosten", "Betaalautomaat kosten", "Boekhouder, accountant & administratie", "Zakelijk mobiel/internet",
  "Zakelijk overige abonnementen", "Verzekering: Zakelijk", "Verzekeringen", "AOV (arbeidsongeschiktheidsverzekering)", "Onderhoud apparatuur/machines",
  "Webshops & online aankopen", "Winkels divers", "Personeel: overig", "Loonadministratie", "Uitbetalen loon",
  "Incasso, juridisch & schulden",
];
const RUBRIEK_ONTTREKKINGEN = ["Prive opnames", "Uitbetaling aan prive"];
const RUBRIEK_STORTINGEN = ["Terugboeking van prive"];
const BELASTINGEN_GEEN_KOSTENPOST = [
  "Belastingen: IB", "Belastingen: IH", "Belastingen: LH", "Belastingen: OB", "Belastingen: ZVW", "Belastingen: overig",
  "Belastingen: Naheffingen OB voorgaande jaren", "Belastingen: Naheffingen LH voorgaande jaren", "Belastingen: Naheffingen IB voorgaande jaren",
];
// Alles wat hierboven niet met naam genoemd wordt, en dus zonder toelichting in "nog niet
// ingedeeld" terecht zou komen als het toch een keer als Zakelijk voorkomt.
const AL_APART_BEHANDELD = ["Zakelijk - apparatuur/machines", "Verkoop activa", "Leningen", "Lease (financieel)"];

export function computeIbBoxMapping(zakItems, loanRenteForYear, leaseRenteForYear, activaAfschrijvingForYear, categoryBtwRates, btwVerlegd, leaseAutoKostenForYear = null) {
  const sumCat = (cats) => Math.abs(zakItems.filter((tx) => cats.includes(tx.category)).reduce((a, tx) => a + tx.amount, 0));
  const perCategorieVan = (cats) =>
    cats.map((c) => ({ categorie: c, totaal: sumCat([c]) })).filter((r) => r.totaal > 0);
  const rubriek = (naam, cats, toelichting) => ({
    naam, categorieen: cats, totaal: sumCat(cats), toelichting, perCategorie: perCategorieVan(cats),
  });

  // Voor de IB-aangifte moeten omzet en zakelijke kosten NETTO (exclusief BTW) worden opgegeven —
  // de bank laat altijd het bruto (inclusief-BTW) bedrag zien. Dit is exact dezelfde "bruto - BTW"-
  // correctie die elders al gebeurt (summary.winst in yearlySummary.js, en de netto-kolom van het
  // categorieoverzicht in het aangiftevoorstel zelf), nu ook toegepast op de rubrieken hieronder
  // zodat de losse regels van deze winst-en-verliesrekening optellen tot hetzelfde resultaat.
  const nettoOf = (tx) => tx.amount - computeBtw(tx, categoryBtwRates || {}, btwVerlegd);
  const sumCatNetto = (cats) => Math.abs(zakItems.filter((tx) => cats.includes(tx.category)).reduce((a, tx) => a + nettoOf(tx), 0));
  const perCategorieVanNetto = (cats) =>
    cats.map((c) => ({ categorie: c, totaal: sumCatNetto([c]) })).filter((r) => r.totaal > 0);
  const rubriekNetto = (naam, cats, toelichting) => ({
    naam, categorieen: cats, totaal: sumCatNetto(cats), toelichting, perCategorie: perCategorieVanNetto(cats),
  });

  const overigeBedrijfskosten = [
    rubriekNetto("Auto- en transportkosten", RUBRIEK_AUTO),
    rubriekNetto("Huisvestingskosten", RUBRIEK_HUISVESTING),
    rubriekNetto("Verkoopkosten", RUBRIEK_VERKOOP),
    rubriekNetto("Andere kosten", RUBRIEK_ANDERE_KOSTEN),
  ].filter((r) => r.totaal > 0);

  const apparatuurInvestering = sumCat(["Zakelijk - apparatuur/machines"]);
  const leaseFinancieelTotal = sumCat(["Lease (financieel)"]);
  const leningenTotal = sumCat(["Leningen"]);
  const verkoopActivaTotal = sumCat(["Verkoop activa"]);

  const alleGenoemdeCategorieen = [
    ...RUBRIEK_OPBRENGSTEN, ...RUBRIEK_INKOOP, ...RUBRIEK_AUTO, ...RUBRIEK_HUISVESTING, ...RUBRIEK_VERKOOP,
    ...RUBRIEK_ANDERE_KOSTEN, ...RUBRIEK_ONTTREKKINGEN, ...RUBRIEK_STORTINGEN, ...BELASTINGEN_GEEN_KOSTENPOST,
    ...AL_APART_BEHANDELD,
  ];
  const nogNietIngedeeld = [...new Set(zakItems.map((tx) => tx.category))]
    .filter((c) => !alleGenoemdeCategorieen.includes(c))
    .map((c) => ({ categorie: c, totaal: sumCat([c]) }))
    .filter((r) => r.totaal > 0);

  return {
    opbrengsten: rubriekNetto("Opbrengsten", RUBRIEK_OPBRENGSTEN),
    inkoopkosten: rubriekNetto(
      "Inkoopkosten, uitbesteed werk en andere externe kosten", RUBRIEK_INKOOP,
      "Inhuur van derden/freelancers staat hier onder \"uitbesteed werk\" — niet bij Personeelskosten."
    ),
    afschrijvingen: {
      naam: "Afschrijvingen",
      apparatuurInvestering,
      // Zodra bedrijfsmiddelen zijn geregistreerd bij "Activa" (aanschafwaarde, -datum,
      // afschrijvingstermijn, restwaarde), gebruiken we de daadwerkelijk berekende afschrijving
      // voor dit jaar in plaats van het bruto aanschafbedrag. Financiële lease van een auto of
      // machine staat hier ook bij zodra dat contract een "soort" heeft (zie berekendeLeaseAfschrijving
      // hieronder) — het geleasde object IS voor een zzp'er (eenmanszaak) een eigen bedrijfsmiddel dat
      // gekapitaliseerd en afgeschreven moet worden (dit stond hier eerder onterecht níet, zie de
      // gecorrigeerde toelichting bij "Financiële baten en lasten" hieronder). Zonder ingevulde
      // "soort" bij een leasecontract verandert hier niets — berekendeLeaseAfschrijving blijft dan null.
      berekendeApparatuurAfschrijving: activaAfschrijvingForYear ? activaAfschrijvingForYear.totaalAfschrijving : null,
      berekendeLeaseAfschrijving: leaseAutoKostenForYear ? leaseAutoKostenForYear.afschrijvingTotaal : null,
      activaOnvolledig: activaAfschrijvingForYear ? activaAfschrijvingForYear.onvolledig : 0,
      perCategorie: perCategorieVan(["Zakelijk - apparatuur/machines"]),
      toelichting:
        activaAfschrijvingForYear
          ? "Dit is de berekende afschrijving voor dit jaar op basis van de ingevulde gegevens bij Activa — niet het bruto aanschafbedrag (dat mag niet in één keer als kosten worden afgetrokken)."
          : "Dit mag niet in één keer als kosten worden afgetrokken — dit zijn bedrijfsmiddelen die over de gebruiksduur afgeschreven moeten worden (aanschafwaarde minus restwaarde, verdeeld over de jaren). Deze tool berekent geen afschrijvingsschema totdat je dit invult bij \"Activa\" — het bruto aanschafbedrag staat hier tot dan alleen ter herkenning.",
    },
    // Volledige uitsplitsing van gekapitaliseerde financiële-lease-auto's/machines (afschrijving,
    // lease-rente, gecategoriseerde autokosten, en bij een auto met privégebruik >500km/jaar ook de
    // bijtelling/onttrekking) — null zolang geen enkel contract een "soort" heeft ingevuld.
    leaseAutoKosten: leaseAutoKostenForYear,
    overigeBedrijfskosten,
    financieleBatenLasten: {
      naam: "Financiële baten en lasten",
      renteLeningen: loanRenteForYear?.totaalRente || 0,
      renteLease: leaseRenteForYear?.totaalRente || 0,
      aflossingLeningen: loanRenteForYear?.totaalAflossing || 0,
      aflossingLease: leaseRenteForYear?.totaalAflossing || 0,
      onvolledig: (loanRenteForYear?.onvolledig || 0) + (leaseRenteForYear?.onvolledig || 0),
      renteNietBerekenbaar: leaseRenteForYear?.renteNietBerekenbaar || 0,
      toelichting:
        "Alleen de rente is een kostenpost — de rest van elke termijn is aflossing op de financiering, een balansmutatie, geen bedrijfskosten. Is bij een leasecontract de \"soort\" (auto/machine) ingevuld, dan is het geleasde object wél een eigen bedrijfsmiddel van de zzp'er dat gekapitaliseerd en afgeschreven wordt — zie dan \"Afschrijvingen\" hierboven (en bij een auto met privégebruik >500 km/jaar ook de onttrekking daar). Zonder ingevulde \"soort\" (het gebruikelijke geval tot nu toe) staat hier alleen de rente, zoals voorheen.",
    },
    priveOnttrekkingen: rubriek("Privéonttrekkingen", RUBRIEK_ONTTREKKINGEN),
    priveStortingen: rubriek("Privéstortingen", RUBRIEK_STORTINGEN),
    belastingenGeenKostenpost: rubriek(
      "Belastingafdrachten (geen bedrijfskosten)", BELASTINGEN_GEEN_KOSTENPOST,
      "Dit zijn afdrachten van eerder verschuldigde belasting, geen kostenpost in de winst-en-verliesrekening."
    ),
    verkoopActivaTotal,
    apparatuurInvestering,
    leaseFinancieelTotal,
    leningenTotal,
    nogNietIngedeeld,
  };
}
