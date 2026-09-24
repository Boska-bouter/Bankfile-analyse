import { fiscalTreatmentOf, GEDEELDE_HUUR_CATEGORIE } from "../classification/categories.js";
import { effectiveZakelijkPercentage, rawBtw } from "./categorySplit.js";
import { eur } from "../utils/amounts.js";

// Winst uit onderneming (bruto) voor één jaar = Zakelijke inkomsten min BTW min de overige
// zakelijke kosten (na aftrek BTW), plus alleen de aftrekbare rente op leningen/financiële lease
// (niet de volledige termijn). Welke categorie meetelt als omzet/kosten/financiering/geheel-niet
// wordt bepaald door fiscalTreatmentOf (zie categories.js) — dus op basis van de CATEGORIE, niet
// van tx.type: een privé-uitgave betaald vanaf de zakelijke rekening telt hier niet mee, en een
// zakelijke uitgave betaald vanaf de privérekening telt wél mee. `renteAftrekbaar` is de som van
// de rente-over-dit-jaar op leningen en financiële lease (positief getal, een kostenpost) — laat
// je dit weg, dan wordt er conservatief 0 rente afgetrokken (nooit te veel winst wegschrijven).
// `fixedCategories` en `incomeTransferCategories` zijn optioneel — zonder die twee worden
// zakVast/zakVariabel/priVast/priVariabel gewoon op 0 gehouden (bijv. voor code die deze
// uitsplitsing niet nodig heeft). `leaseAutoWinstCorrectie` is optioneel en standaard 0 (dus
// bestaande aanroepen zonder dit argument rekenen exact als voorheen): het is de per saldo
// bijkomende correctie op de winst van gekapitaliseerde financiële-lease-auto's/machines — de
// nieuwe afschrijving (verlaagt de winst) minus de onttrekking bij privégebruik van een leaseauto
// (verhoogt de winst weer) — zie tax/autoBijtelling.js. 0 zolang geen enkel leasecontract een
// `soort` heeft ingevuld, dus 100% backwards compatible.
// Sinds "Huur (deels zakelijk)" (zie tax/gedeeldeHuur.js) is dit param bewust een algemene "extra
// winst-correctie"-optelsom geworden in plaats van puur lease: de aanroeper (App.jsx/
// aangiftevoorstel.js) telt de lease-winstcorrectie en `-nietAftrekbaarBedrag` van de gedeelde-huur-
// berekening bij elkaar op vóórdat die hier binnenkomt (het niet-aftrekbare deel moet de winst juist
// verhogen — het was hierboven via zakBruto/zakBtwTotaal al ten onrechte voor 100% afgetrokken, dus
// gaat er hier als NEGATIEVE bijdrage in zodat de aftrek van "- leaseAutoWinstCorrectie" de winst per
// saldo verhoogt). Geen enkele bestaande aanroep verandert hierdoor: zonder "Huur (deels zakelijk)"-
// transacties blijft deze correctie exact wat hij al was (de lease-correctie, of 0).
// `categoryZakelijkPercentage` is optioneel — een generieke { categorie: { jaar: percentage } }-map
// (zie tax/categorySplit.js) waarmee voor élke bestaande "kosten"/"geen"-categorie een percentage
// zakelijk gebruik kan worden ingesteld, zonder dat de transactie zelf van categorie hoeft te
// wisselen. Weggelaten (of geen entry voor categorie+jaar), dan rekent elke "kosten"-categorie voor
// 100% en elke "geen"-categorie voor 0% mee, exact het gedrag van vóór dit mechanisme bestond — dus
// 100% backwards compatible voor elke aanroep die dit argument niet meegeeft.
export function computeYearlySummary(classified, year, categoryBtwRates, btwVerlegd, fixedCategories = [], incomeTransferCategories = [], voorbelastingExcluded = [], renteAftrekbaar = 0, leaseAutoWinstCorrectie = 0, categoryZakelijkPercentage = null, autoStatus = null, heeftLeaseAuto = false) {
  let zakBruto = 0, zakBtwTotaal = 0, zakelijkeInkomsten = 0, uitkeringenAanPrive = 0, priUitgegeven = 0;
  let zakVast = 0, zakVariabel = 0, priVast = 0, priVariabel = 0, zakelijkeUitgaven = 0, alBetaaldeZvwIh = 0;
  let verschuldigdBtw = 0, voorbelasting = 0, zakelijkVanPriveRekening = 0, zakelijkeKostenNetto = 0;
  for (const tx of classified) {
    if (tx.type === "Prive" && !tx.isMirror && tx.amount < 0 && tx.year === year) {
      // "Terugboeking van prive" (en de andere incomeTransferCategories) zijn geen persoonlijke
      // uitgave maar een verschuiving tussen rekeningen — geld dat vanaf de privérekening
      // terugstroomt naar zakelijk telt dus niet mee als "priUitgegeven" (privé-uitgaven), net
      // zoals het al niet meetelde in priVast/priVariabel hieronder. Zonder deze uitsluiting werd
      // zo'n terugboeking ten onrechte als privé-consumptie opgeteld in plaats van ervan afgetrokken.
      if (!incomeTransferCategories.includes(tx.category)) {
        priUitgegeven += Math.abs(tx.amount);
        if (fixedCategories.includes(tx.category)) priVast += Math.abs(tx.amount);
        else priVariabel += Math.abs(tx.amount);
      }
      // Bekend nevenoeffect van Route B (zie het gesprek): deze uitgave telt tegelijk mee als
      // zakelijke kostenpost (hieronder, via fiscalTreatmentOf) én als persoonlijk uitgegeven
      // (hierboven) — allebei terecht, maar dat kan de Tekort/Over-indicatie iets strenger maken
      // bij wie vaak zakelijke kosten van de privérekening betaalt. Puur signalerend, geen fout.
      if (fiscalTreatmentOf(tx.category) !== "geen") zakelijkVanPriveRekening += Math.abs(tx.amount);
    }
    if (tx.isMirror || tx.year !== year) continue;

    // Wat is er al vanaf de zakelijke rekening zelf betaald/opgenomen? Dit is een rekeningvraag
    // (welke rekening het geld verliet, voor de "Tekort/Over"-vergelijking) — blijft dus bewust
    // op tx.type gebaseerd, niet op categorie.
    if (tx.type === "Zakelijk") {
      if (tx.category === "Belastingen: ZVW" || tx.category === "Belastingen: IH") alBetaaldeZvwIh += Math.abs(tx.amount);
      if (tx.category === "Uitbetaling aan prive" || tx.category === "Prive opnames") uitkeringenAanPrive += Math.abs(tx.amount);
      // "Terugboeking van prive": geld dat vanuit privé terugkomt op de zakelijke rekening — dit
      // verlaagt het bedrag dat per saldo naar privé is gegaan (dus aftrekken, niet los laten
      // staan). Zonder deze aftrek liet "Overboeking naar privé" (en de "Privé uitgaven"-schatting
      // die hierop terugvalt als de privérekening zelf niet is geladen) het volledige oorspronkelijk
      // opgenomen bedrag zien, ook als een deel daarvan later is teruggestort.
      if (tx.category === "Terugboeking van prive") uitkeringenAanPrive -= Math.abs(tx.amount);
    }

    // De fiscale zakelijke berekening (winst/BTW) zelf: gebaseerd op de categorie, niet op
    // tx.type — zie fiscalTreatmentOf hierboven.
    const behandeling = fiscalTreatmentOf(tx.category);
    if (behandeling === "geen") {
      // Generieke %-splitsing (zie categorySplit.js): een privé-categorie kan een ingesteld
      // zakelijk-percentage >0 hebben (bijv. 30% van Boodschappen blijkt toch zakelijk) — dan
      // telt dat deel hieronder alsnog mee als kostenpost. Zonder ingesteld percentage (verreweg
      // de meeste dossiers/categorieën) is dit exact 0, dus identiek aan de oude "continue" hierboven.
      const percentage = effectiveZakelijkPercentage(tx.category, year, categoryZakelijkPercentage, autoStatus, heeftLeaseAuto);
      if (percentage <= 0) continue;
      const factor = percentage / 100;
      const btw = rawBtw(tx, categoryBtwRates, btwVerlegd) * factor;
      const bedrag = tx.amount * factor;
      zakBruto += bedrag;
      zakBtwTotaal += btw;
      if (!voorbelastingExcluded.includes(tx.category)) voorbelasting += -btw;
      zakelijkeKostenNetto += -(bedrag - btw);
      if (bedrag < 0) {
        if (fixedCategories.includes(tx.category)) zakVast += Math.abs(bedrag);
        else zakVariabel += Math.abs(bedrag);
      }
      continue;
    }

    // Ook een normale "kosten"-categorie kan een ingesteld zakelijk-percentage <100 hebben (bijv.
    // maar 70% van Brandstof is zakelijk) — ontbreekt dat, dan is percentage/factor exact 100/1 en
    // verandert er niets aan de berekening hieronder (100% backwards compatible). "omzet" en
    // "financiering" doen bewust niet mee aan dit mechanisme (percentage blijft dan altijd 100).
    const percentage = behandeling === "kosten" ? effectiveZakelijkPercentage(tx.category, year, categoryZakelijkPercentage, autoStatus, heeftLeaseAuto) : 100;
    const factor = percentage / 100;
    const btwVol = rawBtw(tx, categoryBtwRates, btwVerlegd);
    const btw = btwVol * factor;
    const bedrag = tx.amount * factor;
    // v183 — "Zakelijk - apparatuur/machines" is een bedrijfsmiddel (zie tax/activa.js): de aanschaf
    // zelf mag fiscaal niet in één keer als kosten worden afgetrokken, alleen de jaarlijkse
    // afschrijving. Vóór v183 werd hier toch het VOLLEDIGE aanschafbedrag als normale "kosten"-
    // categorie meegeteld in zakBruto/zakBtwTotaal/zakelijkeKostenNetto — tegelijk toonde het
    // Aangiftevoorstel (boxMapping.js) er al wél de correct berekende afschrijving voor, zodra een
    // activum was geregistreerd bij "Activa". Dat gaf twee verschillende bedragen voor dezelfde
    // aanschaf: de getoonde "Zakelijke kosten" gebruikte de afschrijving, maar de onderliggende
    // "winst" (en dus de IB/Zvw-schatting) gebruikte nog de volledige aanschaf. Vanaf nu telt de
    // aanschaftransactie zelf hier NIET meer mee (net als "financiering" hieronder) — de aanroeper
    // (App.jsx/aangiftevoorstel(-bv).js) telt in plaats daarvan de daadwerkelijk berekende
    // afschrijving (computeActivaAfschrijvingForYear, tax/activa.js) op bij de winstCorrectie die
    // hier binnenkomt, exact dezelfde constructie als bij de financiële-lease-afschrijving hierboven.
    // Zonder geregistreerd activum (nog niets ingevuld bij "Activa") is die afschrijving € 0 — dan
    // telt de aanschaf dit jaar terecht nergens in de winst mee, precies zoals het Aangiftevoorstel
    // dat al liet zien ("dit mag niet in één keer als kosten worden afgetrokken").
    const isApparatuurActivum = tx.category === "Zakelijk - apparatuur/machines";
    if (behandeling !== "financiering" && !isApparatuurActivum) {
      zakBruto += bedrag;
      zakBtwTotaal += btw;
    }
    if (behandeling === "omzet") {
      zakelijkeInkomsten += bedrag;
      const effectiefVerlegd = tx.btwVerlegd != null ? tx.btwVerlegd : btwVerlegd;
      if (!effectiefVerlegd) verschuldigdBtw += btw;
    } else {
      // Een positief bedrag hier is een terugbetaling/creditnota — die verlaagt de kosten
      // (en de bijbehorende voorbelasting) juist, in plaats van er verkeerd bovenop te komen.
      // De voorbelasting (BTW-aangifte) blijft hier ONVERANDERD ook voor een apparatuur/machine-
      // aanschaf — dat is een apart mechanisme (BTW-teruggave in het kwartaal van aanschaf) dat los
      // staat van de afschrijving over meerdere jaren voor de IB (zie hierboven).
      if (!voorbelastingExcluded.includes(tx.category)) voorbelasting += -btw;
      // Netto (exclusief BTW) zakelijke kosten — dezelfde "bedrag min BTW"-correctie als bij de
      // omzet hierboven, en dezelfde definitie als in het Aangiftevoorstel (computeIbBoxMapping) —
      // exclusief financiering én exclusief een apparatuur/machine-aanschaf (die tellen hier bewust
      // niet mee, alleen hun rente resp. afschrijving via renteAftrekbaar/winstCorrectie hieronder).
      if (behandeling === "kosten" && !isApparatuurActivum) zakelijkeKostenNetto += -(bedrag - btw);
    }
    if (tx.category === "Zakelijke inkoop/uitgaven") zakelijkeUitgaven += -bedrag;
    if (bedrag < 0) {
      if (fixedCategories.includes(tx.category)) zakVast += Math.abs(bedrag);
      else zakVariabel += Math.abs(bedrag);
    }
  }
  return {
    zakBruto, zakBtwTotaal, zakelijkeInkomsten, uitkeringenAanPrive, priUitgegeven,
    winst: zakBruto - zakBtwTotaal - renteAftrekbaar - leaseAutoWinstCorrectie, zakVast, zakVariabel, priVast, priVariabel,
    zakelijkeUitgaven, alBetaaldeZvwIh, verschuldigdBtw, voorbelasting, zakelijkVanPriveRekening,
    // Netto omzet = zakelijke inkomsten min de daarover verschuldigde BTW — zelfde bedrag als
    // "1. Opbrengsten" in het Aangiftevoorstel. zakelijkeKostenNetto is netto zakelijke kosten
    // (excl. financiering/rente, die apart als renteAftrekbaar wordt afgetrokken in "winst").
    zakelijkeInkomstenNetto: zakelijkeInkomsten - verschuldigdBtw,
    zakelijkeKostenNetto,
  };
}

// Welke jaren zijn "volledig" (alle 4 kwartalen hebben minstens 1 zakelijke transactie)? Een
// trendvergelijking tussen twee jaren heeft alleen zin als BEIDE jaren volledig zijn.
export function computeVolledigeJaren(classified) {
  const kwartalenPerJaar = {};
  for (const tx of classified) {
    if (tx.type !== "Zakelijk" || tx.isMirror) continue;
    const [y, m] = tx.month.split("-");
    const kwartaal = Math.ceil(Number(m) / 3);
    if (!kwartalenPerJaar[y]) kwartalenPerJaar[y] = new Set();
    kwartalenPerJaar[y].add(kwartaal);
  }
  const result = new Set();
  for (const [y, kwartalen] of Object.entries(kwartalenPerJaar)) {
    if ([1, 2, 3, 4].every((q) => kwartalen.has(q))) result.add(Number(y));
  }
  return result;
}

// Kwalitatief advies voor het actieve jaar: is het resultaat per saldo positief of negatief,
// en staan er wel typische privé-uitgaven tussen (anders is het beeld mogelijk vertekend omdat
// niet alle privé-uitgaven zijn opgegeven).
const TYPISCHE_PRIVE_CATEGORIEEN = ["Boodschappen", "Huur", "Hypotheek", "Energie-water", "Prive - vrijetijd-uitgaan-vakantie & uit eten"];
export function computeBusinessAdvies(activeYear, summary, openOB, ibEstimate, ibGedaan, priItems, zvwEstimate) {
  if (!activeYear || !summary) return null;
  const ibBelastingEffectief = ibEstimate.belasting + (zvwEstimate?.bijdrage || 0);
  const effectievePriveUitgegeven = summary.priUitgegeven > 0 ? summary.priUitgegeven : summary.uitkeringenAanPrive;
  const verschil = summary.winst - effectievePriveUitgegeven - openOB - ibBelastingEffectief;

  let niveau, tekst;
  if (verschil < 0) {
    niveau = "negatief";
    tekst = `Er is in totaal een negatief resultaat: winst ${eur(summary.winst)}, maar de privé-uitgaven (of het bedrag dat is overgemaakt/opgenomen naar privé) en de belastingen samen zijn hoger dan wat de winst dekt (tekort ${eur(Math.abs(verschil))}).`;
  } else {
    niveau = "positief";
    tekst = `Er is in totaal een positief resultaat: winst ${eur(summary.winst)}, en de uitgaven/belastingen worden gedekt (over ${eur(verschil)}).`;
  }
  const heeftTypischePriveUitgaven = priItems.some((tx) => !tx.isMirror && TYPISCHE_PRIVE_CATEGORIEEN.includes(tx.category));
  if (summary.uitkeringenAanPrive > 0 && !heeftTypischePriveUitgaven) {
    tekst += ` Let op: er staan geen typische, alledaagse privé-uitgaven tussen (zoals boodschappen, huur/hypotheek, energie-water, vrijetijd-uitgaan/vakantie) — mogelijk zijn niet alle privé-uitgaven opgegeven, waardoor het beeld bij Tekort/Over kan afwijken van de werkelijkheid.`;
  }
  if (summary.zakelijkVanPriveRekening > 0) {
    tekst += ` Let op: ${eur(summary.zakelijkVanPriveRekening)} hiervan zijn zakelijke kosten die vanaf de privérekening zijn betaald — die tellen terecht mee in de winst, maar ook mee als "persoonlijk uitgegeven" hierboven. Tekort/Over kan daardoor iets strenger uitvallen dan strikt nodig.`;
  }
  return { niveau, tekst };
}

// Nog te betalen/terug te vragen OB per jaar — alleen de kwartalen die nog NIET als "betaald"
// zijn aangevinkt tellen mee (een al betaald kwartaal hoort niet meer als openstaand).
// `huurZakelijkPercentageStatus` is optioneel — zie computeQuarterlyBtwForYear in btw.js voor
// dezelfde correctie/achtergrond. Weggelaten, dan telt de BTW op "Huur (deels zakelijk)" hier voor
// 100% mee als voorbelasting, exact zoals voorheen. `categoryZakelijkPercentage` is de generieke
// tegenhanger daarvan (zie categorySplit.js) — zelfde soort optionele correctie, maar dan voor élke
// "kosten"/"geen"-categorie met een ingesteld percentage in plaats van alleen "Huur (deels zakelijk)".
export function computeYearlyOpenOB(classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, kwartaalStatus, huurZakelijkPercentageStatus = null, categoryZakelijkPercentage = null, autoStatus = null, heeftLeaseAuto = false) {
  const perQuarter = {};
  for (const tx of classified) {
    if (tx.isMirror) continue;
    const [y, m] = tx.month.split("-");
    const year = Number(y);
    const behandeling = fiscalTreatmentOf(tx.category);
    // Standaard 100 voor "omzet"/"financiering" (dit mechanisme raakt die niet) — voor "kosten"/
    // "geen" geldt effectiveZakelijkPercentage (100/0 zonder ingesteld percentage, dus ongewijzigd
    // gedrag zolang niemand een percentage instelt).
    const percentage = (behandeling === "kosten" || behandeling === "geen")
      ? effectiveZakelijkPercentage(tx.category, year, categoryZakelijkPercentage, autoStatus, heeftLeaseAuto)
      : 100;
    if (behandeling === "geen" && percentage <= 0) continue;
    const kwartaal = Math.ceil(Number(m) / 3);
    const key = `${y}-Q${kwartaal}`;
    if (!perQuarter[key]) perQuarter[key] = { year, verschuldigdBtw: 0, voorbelasting: 0 };
    const factor = percentage / 100;
    const btw = rawBtw(tx, categoryBtwRates, btwVerlegd) * factor;
    if (tx.category === "Zakelijke inkomsten" || tx.category === "Zakelijke inkomsten 9%" || tx.category === "Zakelijke inkomsten 21%") {
      const effectiefVerlegd = tx.btwVerlegd != null ? tx.btwVerlegd : btwVerlegd;
      if (!effectiefVerlegd) perQuarter[key].verschuldigdBtw += btw;
    } else if (!voorbelastingExcluded.includes(tx.category)) {
      const huurPercentage = tx.category === GEDEELDE_HUUR_CATEGORIE
        ? (huurZakelijkPercentageStatus?.[year] ?? 100)
        : 100;
      perQuarter[key].voorbelasting += -btw * (huurPercentage / 100);
    }
  }
  const result = {};
  for (const [key, q] of Object.entries(perQuarter)) {
    if (!result[q.year]) result[q.year] = 0;
    result[q.year] += q.verschuldigdBtw - q.voorbelasting;
  }
  return result;
}
