import { CATEGORY_ORDER } from "../classification/categories.js";

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
const RUBRIEK_OPBRENGSTEN = ["Zakelijke inkomsten", "Zakelijke inkomsten 9%", "Zakelijke inkomsten 21%"];
const RUBRIEK_INKOOP = ["Zakelijke uitgaven", "Inhuur personeel"];
const RUBRIEK_AUTO = ["Autokosten", "Brandstof", "Parkeren", "Verzekering: Auto", "Lease (operationeel)", "Reiskosten (OV)", "Belastingen: MRB"];
const RUBRIEK_HUISVESTING = ["Huur", "Energie-water", "Gemeentelijke kosten"];
const RUBRIEK_VERKOOP = ["Marketing-website"];
const RUBRIEK_ANDERE_KOSTEN = [
  "Bankkosten", "Betaalautomaat kosten", "Boekhouder, accountant & administratie", "Zakelijk mobiel/internet",
  "Zakelijk overige abonnementen", "Verzekering: Zakelijk", "Verzekeringen", "Onderhoud apparatuur/machines",
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

export function computeIbBoxMapping(zakItems, loanRenteForYear, leaseRenteForYear) {
  const sumCat = (cats) => Math.abs(zakItems.filter((tx) => cats.includes(tx.category)).reduce((a, tx) => a + tx.amount, 0));
  const rubriek = (naam, cats, toelichting) => ({ naam, categorieen: cats, totaal: sumCat(cats), toelichting });

  const overigeBedrijfskosten = [
    rubriek("Auto- en transportkosten", RUBRIEK_AUTO),
    rubriek("Huisvestingskosten", RUBRIEK_HUISVESTING),
    rubriek("Verkoopkosten", RUBRIEK_VERKOOP),
    rubriek("Andere kosten", RUBRIEK_ANDERE_KOSTEN),
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
    opbrengsten: rubriek("Opbrengsten", RUBRIEK_OPBRENGSTEN),
    inkoopkosten: rubriek(
      "Inkoopkosten, uitbesteed werk en andere externe kosten", RUBRIEK_INKOOP,
      "Inhuur van derden/freelancers staat hier onder \"uitbesteed werk\" — niet bij Personeelskosten."
    ),
    afschrijvingen: {
      naam: "Afschrijvingen",
      apparatuurInvestering,
      leaseFinancieelTotal,
      toelichting:
        'Zakelijk - apparatuur/machines" mag niet in één keer als kosten worden afgetrokken — dit zijn bedrijfsmiddelen die over de gebruiksduur afgeschreven moeten worden. Deze tool berekent geen afschrijvingsschema (aanschafwaarde, restwaarde en afschrijvingstermijn zijn hier niet uit de bankgegevens af te leiden) — het bruto aankoopbedrag staat hier alleen ter herkenning.',
    },
    overigeBedrijfskosten,
    financieleBatenLasten: {
      naam: "Financiële baten en lasten",
      renteLeningen: loanRenteForYear?.totaalRente || 0,
      renteLease: leaseRenteForYear?.totaalRente || 0,
      aflossingLeningen: loanRenteForYear?.totaalAflossing || 0,
      aflossingLease: leaseRenteForYear?.totaalAflossing || 0,
      onvolledig: (loanRenteForYear?.onvolledig || 0) + (leaseRenteForYear?.onvolledig || 0),
      toelichting: "Alleen de rente is een kostenpost — de aflossing op leningen en financiële lease is een balansmutatie, geen bedrijfskosten.",
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
