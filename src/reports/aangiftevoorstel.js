import { fiscalTreatmentOf } from "../classification/categories.js";
import { computeQuarterlyBtwForYear } from "../tax/btw.js";
import { computeYearlySummary } from "../tax/yearlySummary.js";
import {
  estimateIncomeTax, estimateZvw, estimateIncomeTaxScenarios, estimateHeffingskortingen, computeMogelijkeKia,
  IB_TARIEVEN_BY_YEAR, computeOndernemersaftrekMetReserve, estimateIncomeTaxMetOndernemersaftrek,
  estimateZvwMetOndernemersaftrek, estimateHeffingskortingenMetOndernemersaftrek,
} from "../tax/incomeTax.js";
import { computeIbBoxMapping } from "../tax/boxMapping.js";
import { computeChecklistLikeDataForYear } from "../tax/checklist.js";
import { CONTINUITY_GAP_THRESHOLD } from "../importers/transactions.js";
import { computeActivaSummary, computeActivaAfschrijvingForYear, computeInvesteringenForYear } from "../tax/activa.js";
import { computeLoanRenteForYear, computeLeaseRenteForYear } from "../tax/loanAmortization.js";
import { computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate } from "../tax/financialLease.js";
import { computeLeaseAutoKostenVoorJaar, MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN, AUTOKOSTEN_CATEGORIEN } from "../tax/autoBijtelling.js";
import { computeAutoActivaKostenVoorJaar, combineAutoKosten } from "../tax/autoActiva.js";
import { computeKmVergoedingVoorJaar } from "../tax/kmVergoeding.js";
import { computeGedeeldeHuurVoorJaar } from "../tax/gedeeldeHuur.js";
import { eur } from "../utils/amounts.js";

const STATUS_EMOJI = { groen: "🟢", oranje: "🟠", rood: "🔴" };
const STATUS_TEKST = { groen: "Klaar voor controle", oranje: "Controle nodig", rood: "Mogelijk ontbreekt een periode" };

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Eén rij in de winst-en-verliesrekening-stijl weergave — optioneel met toelichting en een
// uitsplitsing naar categorie eronder (zodat het bedrag terug te vinden is in de tool zelf).
function rubriekBlok(nr, naam, totaal, toelichting, perCategorie) {
  if (!totaal) return "";
  return `
  <div class="rubriek"><span>${nr ? `${nr}. ` : ""}${esc(naam)}</span><span class="num">${eur(totaal)}</span></div>
  ${toelichting ? `<p class="toelichting">${toelichting}</p>` : ""}
  ${categorieDetailHtml(perCategorie)}`;
}

// Zelfde als rubriekBlok, maar toont de rij ALTIJD (ook bij € 0,00) — voor rubrieken die expliciet
// als € 0,00 zichtbaar moeten blijven in plaats van stilzwijgend te verdwijnen (bijv. de nieuwe
// "Afschrijving auto's"/"Afschrijving machines" en de 3-voudige inkoopkosten-uitsplitsing).
function rubriekBlokAltijd(nr, naam, totaal, toelichting, perCategorie) {
  return `
  <div class="rubriek"><span>${nr ? `${nr}. ` : ""}${esc(naam)}</span><span class="num">${eur(totaal || 0)}</span></div>
  ${toelichting ? `<p class="toelichting">${toelichting}</p>` : ""}
  ${categorieDetailHtml(perCategorie)}`;
}

// Uitsplitsing per categorie onder een rubriek — zodat een bedrag in dit document direct terug te
// vinden is bij de gelijknamige categorie in de tool zelf (zie ook het categorieoverzicht onderaan).
function categorieDetailHtml(perCategorie) {
  if (!perCategorie || perCategorie.length === 0) return "";
  return perCategorie.map((r) => `<div class="categorie-detail"><span>${esc(r.categorie)}</span><span class="num">${eur(r.totaal)}</span></div>`).join("");
}

const fmtDatum = (d) => (d ? new Date(d).toLocaleDateString("nl-NL") : "onbekend");

// "Algemene gegevens" — welke bestanden, welke periode en hoeveel transacties aan dit jaar ten
// grondslag liggen, en of er bekende gaten in de bestandscontinuïteit zijn rond dit jaar. Puur
// samengesteld uit data die de tool al had (importdiagnostiek/bestandscontinuïteit) — geen nieuwe
// administratie, alleen zichtbaar gemaakt.
function buildAlgemeneGegevensHtml(year, importDiagnostics, accountTypeByFile, classified, gatenDitJaar) {
  if (!importDiagnostics || importDiagnostics.length === 0) return "";
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);
  const relevanteBestanden = importDiagnostics.filter((d) => d.from && d.to && d.from <= yearEnd && d.to >= yearStart);

  const bestandRows = relevanteBestanden
    .map((d) => {
      const type = accountTypeByFile?.[d.fileName] || "onbekend";
      return `<tr><td>${esc(d.fileName)}</td><td>${esc(type)}</td><td>${fmtDatum(d.from)} — ${fmtDatum(d.to)}</td><td class="num">${d.importedCount}</td></tr>`;
    })
    .join("");

  const zakTxDitJaar = classified.filter((tx) => tx.type === "Zakelijk" && !tx.isMirror && tx.year === year).length;

  const gatenHtml = gatenDitJaar.length > 0
    ? `<p class="toelichting" style="color:#b45309;">⚠ Mogelijk ontbreekt een periode: tussen ${esc(gatenDitJaar[0].fileA)} (t/m ${fmtDatum(gatenDitJaar[0].aTo)}) en ${esc(gatenDitJaar[0].fileB)} (vanaf ${fmtDatum(gatenDitJaar[0].bFrom)}) sluit het saldo niet aan (verschil ${eur(gatenDitJaar[0].diff)}, groter dan het gebruikelijke afrondingsverschil) — de moeite waard om na te gaan of daar nog een bestand bij hoort.</p>`
    : "";

  return `
  <h2>Algemene gegevens</h2>
  <table>
    <thead><tr><th>Bankbestand</th><th>Type</th><th>Periode gedekt</th><th class="num">Transacties</th></tr></thead>
    <tbody>${bestandRows}</tbody>
  </table>
  <p class="toelichting">Aantal zakelijke transacties in ${year}: ${zakTxDitJaar}.</p>
  ${gatenHtml}`;
}

// Alleen de winst voor een jaar — gebruikt in een pre-pass over alle te rapporteren jaren om de
// verrekening van niet-gerealiseerde zelfstandigenaftrek (die de jaren chronologisch aan elkaar
// koppelt) te kunnen berekenen vóórdat de eigenlijke jaarsecties worden opgebouwd.
function computeWinstVoorJaar(year, classified, categoryBtwRates, btwVerlegd, loanSummary, loanDetails, leaseSummary, leaseDetails, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails, activaDetails) {
  const loanRenteForYear = computeLoanRenteForYear(loanSummary || [], loanDetails || {}, year);
  const leaseRenteForYear = computeLeaseRenteForYear(leaseSummary || [], leaseDetails || {}, year, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
  const renteAftrekbaar = (loanRenteForYear?.totaalRente || 0) + (leaseRenteForYear?.totaalRente || 0);
  const leaseAutoKostenForYear = combineAutoKosten(
    computeLeaseAutoKostenVoorJaar(leaseSummary || [], leaseDetails || {}, year, classified, categoryBtwRates, btwVerlegd),
    computeAutoActivaKostenVoorJaar(autoActivaDetails, autoWizardStatus, year, classified, categoryBtwRates, btwVerlegd)
  );
  const gedeeldeHuurForYear = computeGedeeldeHuurVoorJaar(classified, year, huurZakelijkPercentageStatus, categoryBtwRates, btwVerlegd);
  const kmVergoedingForYear = computeKmVergoedingVoorJaar(kmVergoedingDetails, autoStatus, year);
  // v183: "Zakelijk - apparatuur/machines" telt niet meer als volledige kosten mee (zie
  // yearlySummary.js) — in plaats daarvan telt hier de daadwerkelijk berekende afschrijving mee,
  // exact dezelfde constructie als de financiële-lease-afschrijving hierboven.
  const activaSummary = computeActivaSummary(classified);
  const activaAfschrijvingForYear = computeActivaAfschrijvingForYear(activaSummary, activaDetails || {}, year);
  const winstCorrectie =
    (leaseAutoKostenForYear?.winstCorrectie || 0) - (gedeeldeHuurForYear?.nietAftrekbaarBedrag || 0) +
    (kmVergoedingForYear?.bedrag || 0) + (activaAfschrijvingForYear?.totaalAfschrijving || 0);
  return computeYearlySummary(classified, year, categoryBtwRates, btwVerlegd, [], [], [], renteAftrekbaar, winstCorrectie, categoryZakelijkPercentage, autoStatus).winst;
}

function buildYearSection(year, classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, importDiagnostics, accountTypeByFile, fileContinuity, kwartaalStatus, zelfstandigenaftrekStatus, ondernemersaftrekVoorJaar, startersaftrekStatus, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails) {
  // Route B: gebaseerd op de categorie (fiscalTreatmentOf), niet op tx.type — een privé-uitgave
  // betaald vanaf de zakelijke rekening hoort hier niet in, en een zakelijke uitgave betaald
  // vanaf de privérekening juist wél.
  const zakItems = classified.filter((tx) => !tx.isMirror && tx.year === year && fiscalTreatmentOf(tx.category) !== "geen");
  const loanRenteForYear = computeLoanRenteForYear(loanSummary || [], loanDetails || {}, year);
  const leaseRenteForYear = computeLeaseRenteForYear(leaseSummary || [], leaseDetails || {}, year, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
  const renteAftrekbaar = (loanRenteForYear?.totaalRente || 0) + (leaseRenteForYear?.totaalRente || 0);
  const leaseAutoKostenForYear = combineAutoKosten(
    computeLeaseAutoKostenVoorJaar(leaseSummary || [], leaseDetails || {}, year, classified, categoryBtwRates, btwVerlegd),
    computeAutoActivaKostenVoorJaar(autoActivaDetails, autoWizardStatus, year, classified, categoryBtwRates, btwVerlegd)
  );
  const gedeeldeHuurForYear = computeGedeeldeHuurVoorJaar(classified, year, huurZakelijkPercentageStatus, categoryBtwRates, btwVerlegd);
  const kmVergoedingForYear = computeKmVergoedingVoorJaar(kmVergoedingDetails, autoStatus, year);
  // v183: activaSummary/activaAfschrijvingForYear vóór de winstCorrectie berekend (was ná summary
  // hieronder) — "Zakelijk - apparatuur/machines" telt sinds v183 niet meer als volledige kosten mee
  // in yearlySummary.js, dus de daadwerkelijk berekende afschrijving moet hier alsnog worden
  // meegeteld, exact dezelfde constructie als de financiële-lease-afschrijving hierboven.
  const activaSummary = computeActivaSummary(classified);
  const activaAfschrijvingForYear = computeActivaAfschrijvingForYear(activaSummary, activaDetails || {}, year);
  const winstCorrectie =
    (leaseAutoKostenForYear?.winstCorrectie || 0) - (gedeeldeHuurForYear?.nietAftrekbaarBedrag || 0) +
    (kmVergoedingForYear?.bedrag || 0) + (activaAfschrijvingForYear?.totaalAfschrijving || 0);
  const summary = computeYearlySummary(classified, year, categoryBtwRates, btwVerlegd, [], [], [], renteAftrekbaar, winstCorrectie, categoryZakelijkPercentage, autoStatus);
  // Zelfstandigenaftrek: "nee" berekent zonder, "onbekend" toont zo dadelijk beide scenario's,
  // niets aangegeven (of "ja") houdt het bestaande gedrag aan (mét zelfstandigenaftrek) zodat
  // eerder opgeslagen projecten dezelfde cijfers blijven tonen totdat dit expliciet wordt gezet.
  const zaStatus = zelfstandigenaftrekStatus?.[year];
  const zelfstandigenaftrekToegepast = zaStatus !== "nee";
  const zaScenarios = zaStatus === "onbekend" ? estimateIncomeTaxScenarios(summary.winst, year) : null;
  const startersaftrekToegepast = startersaftrekStatus?.[year] === "ja";
  // ondernemersaftrekVoorJaar komt uit de pre-pass (computeOndernemersaftrekMetReserve) en houdt
  // rekening met verrekening van niet-gerealiseerde zelfstandigenaftrek uit eerdere jaren in dit
  // rapport, en met startersaftrek. Voor "onbekend"-jaren wordt dit bewust niet gebruikt (zie
  // hieronder bij zaScenarios) — die jaren doen niet mee in de reserveketen.
  const ondernemersaftrekBedrag = ondernemersaftrekVoorJaar
    ? ondernemersaftrekVoorJaar.zelfstandigenaftrekBedrag + ondernemersaftrekVoorJaar.startersaftrekBedrag
    : (zelfstandigenaftrekToegepast ? IB_TARIEVEN_BY_YEAR[Math.max(2023, Math.min(2026, year))].zelfstandigenaftrek : 0);
  const ibEstimate = ondernemersaftrekVoorJaar
    ? estimateIncomeTaxMetOndernemersaftrek(summary.winst, year, ondernemersaftrekBedrag, startersaftrekToegepast)
    : estimateIncomeTax(summary.winst, year, zelfstandigenaftrekToegepast);
  const zvwEstimate = ondernemersaftrekVoorJaar
    ? estimateZvwMetOndernemersaftrek(summary.winst, year, ondernemersaftrekBedrag, startersaftrekToegepast)
    : estimateZvw(summary.winst, year, zelfstandigenaftrekToegepast);
  const heffingskortingen = ondernemersaftrekVoorJaar
    ? estimateHeffingskortingenMetOndernemersaftrek(summary.winst, year, ondernemersaftrekBedrag, startersaftrekToegepast)
    : estimateHeffingskortingen(summary.winst, year, zelfstandigenaftrekToegepast);
  const investeringenForYear = computeInvesteringenForYear(activaSummary, activaDetails || {}, year);
  const mogelijkeKia = investeringenForYear.totaalInvestering > 0 ? computeMogelijkeKia(investeringenForYear.totaalInvestering, year) : 0;
  // v184 — punt 2 uit het reviewdocument: de "mogelijke KIA" hierboven werd tot nu toe alleen
  // getoond, nooit verwerkt in de IB-schatting. KIA is een aftrekpost op de winst zelf (vóór
  // zelfstandigenaftrek/mkb-winstvrijstelling), dus wordt hier een VOLLEDIG los, tweede scenario
  // doorgerekend op (winst − mogelijke KIA) — de bestaande ibEstimate/zvwEstimate/heffingskortingen
  // hierboven (op de winst ZONDER KIA) blijven het hoofdcijfer, ongewijzigd: niet elk bedrijfsmiddel
  // kwalificeert voor KIA (personenauto's, grond, een drempel per bedrijfsmiddel — deze tool kent dat
  // onderscheid niet uit bankgegevens), dus "ná KIA" is expliciet een scenario, geen vaststaand
  // bedrag. Bij mogelijkeKia === 0 zijn beide scenario's vanzelf aan elkaar gelijk.
  const winstNaKia = summary.winst - mogelijkeKia;
  const ibEstimateNaKia = ondernemersaftrekVoorJaar
    ? estimateIncomeTaxMetOndernemersaftrek(winstNaKia, year, ondernemersaftrekBedrag, startersaftrekToegepast)
    : estimateIncomeTax(winstNaKia, year, zelfstandigenaftrekToegepast);
  const zvwEstimateNaKia = ondernemersaftrekVoorJaar
    ? estimateZvwMetOndernemersaftrek(winstNaKia, year, ondernemersaftrekBedrag, startersaftrekToegepast)
    : estimateZvw(winstNaKia, year, zelfstandigenaftrekToegepast);
  const heffingskortingenNaKia = ondernemersaftrekVoorJaar
    ? estimateHeffingskortingenMetOndernemersaftrek(winstNaKia, year, ondernemersaftrekBedrag, startersaftrekToegepast)
    : estimateHeffingskortingen(winstNaKia, year, zelfstandigenaftrekToegepast);
  const zaScenariosNaKia = zaScenarios ? estimateIncomeTaxScenarios(winstNaKia, year) : null;
  const ib = computeIbBoxMapping(zakItems, loanRenteForYear, leaseRenteForYear, activaAfschrijvingForYear, categoryBtwRates, btwVerlegd, leaseAutoKostenForYear, year, categoryZakelijkPercentage, autoStatus, kmVergoedingForYear);

  // "Inkoopkosten, uitbesteed werk en andere externe kosten" (v150: één gecombineerde rubriek) hier
  // uitgesplitst in 3 losse regels, rechtstreeks uit dezelfde al berekende ib.inkoopkosten.perCategorie
  // (netto, exclusief BTW, zelfde sumCatNetto-conventie als de rest van boxMapping.js) — geen nieuwe
  // berekening, puur een andere weergave van precies dezelfde bedragen. "Andere externe kosten" heeft
  // in deze tool (nog) geen categorie gekoppeld en is daardoor altijd € 0,00.
  const inkoopkostenBedrag = ib.inkoopkosten.perCategorie.find((r) => r.categorie === "Zakelijke uitgaven")?.totaal || 0;
  const uitbesteedWerkBedrag = ib.inkoopkosten.perCategorie.find((r) => r.categorie === "Inhuur personeel")?.totaal || 0;
  const andereExterneKostenBedrag = 0;

  // "Afschrijvingen" (v150: één gecombineerde rubriek van Activa-register + financiële-lease-
  // afschrijving) hier uitgesplitst naar "Afschrijving auto's" en "Afschrijving machines", op basis
  // van het `soort`-veld dat elk leasecontract in ib.leaseAutoKosten.contracten al heeft (zie
  // computeLeaseAutoKostenVoorJaar in tax/autoBijtelling.js) — het Activa-register zelf bevat per
  // definitie geen auto's (dat is uitsluitend "apparatuur/machines"), dus die afschrijving telt
  // volledig mee bij "machines". Sommeert weer op tot exact hetzelfde totaal als v150's ene rubriek.
  const leaseAfschrijvingAuto = ib.leaseAutoKosten
    ? ib.leaseAutoKosten.contracten.filter((c) => c.soort === "auto").reduce((a, c) => a + c.afschrijving, 0)
    : 0;
  const leaseAfschrijvingMachine = ib.leaseAutoKosten
    ? ib.leaseAutoKosten.contracten.filter((c) => c.soort === "machine").reduce((a, c) => a + c.afschrijving, 0)
    : 0;
  const apparatuurAfschrijving = ib.afschrijvingen.berekendeApparatuurAfschrijving ?? ib.afschrijvingen.apparatuurInvestering ?? 0;

  // Gaten in de bestandscontinuïteit die dit jaar raken — eenmalig bepaald, gebruikt voor zowel de
  // status bovenaan als de "Algemene gegevens"-bijlage verderop.
  const gatenDitJaar = (fileContinuity || []).filter(
    (g) => !g.ok && Math.abs(g.diff) >= CONTINUITY_GAP_THRESHOLD && (g.aTo.getFullYear() === year || g.bFrom.getFullYear() === year)
  );
  const algemeneGegevensHtml = buildAlgemeneGegevensHtml(year, importDiagnostics, accountTypeByFile, classified, gatenDitJaar);

  const kwartalen = korRegeling ? [] : computeQuarterlyBtwForYear(classified, year, categoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus);

  // Dossierstatus + openstaande punten — hergebruikt dezelfde signalen als de live Aangifte-
  // checklist in de tool zelf (computeChecklistLikeDataForYear), zodat het rapport nooit iets
  // anders beweert dan wat je in de tool ook al ziet. IB-status (het "afgevinkt"-vinkje) telt
  // bewust niet mee — dat is een persoonlijke herinnering, geen signaal over de betrouwbaarheid
  // van deze reconstructie.
  const zakItemsChecklist = classified.filter((tx) => tx.type === "Zakelijk" && tx.year === year);
  const priItemsChecklist = classified.filter((tx) => tx.type === "Prive" && tx.year === year);
  const yc = computeChecklistLikeDataForYear(zakItemsChecklist, priItemsChecklist, kwartalen, kwartaalStatus || {});
  const onzekerDitJaar = [...zakItemsChecklist, ...priItemsChecklist].filter(
    (tx) => !tx.isMirror && tx.confidence?.level !== "override" && tx.confidence?.level !== "keyword" && tx.confidence?.level !== "heuristic"
  ).length;
  const yearStatus = gatenDitJaar.length > 0 ? "rood" : yc.categorizedPct === 100 && yc.quartersOpen.length === 0 && onzekerDitJaar === 0 ? "groen" : "oranje";

  const openPunten = [];
  if (yc.overigCount > 0) openPunten.push(`${yc.overigCount} transactie${yc.overigCount === 1 ? "" : "s"} nog in "Overig"`);
  if (yc.quartersNietAangegeven.length > 0) openPunten.push(`Nog niet aangegeven: ${yc.quartersNietAangegeven.map((q) => `Q${q.kwartaal}`).join(", ")}`);
  if (yc.quartersAangegevenNietBetaald.length > 0) openPunten.push(`Nog niet betaald: ${yc.quartersAangegevenNietBetaald.map((q) => `Q${q.kwartaal}`).join(", ")}`);
  if (gatenDitJaar.length > 0) openPunten.push(`Saldo tussen ${esc(gatenDitJaar[0].fileA)} en ${esc(gatenDitJaar[0].fileB)} sluit niet aan`);
  if (onzekerDitJaar > 0) openPunten.push(`${onzekerDitJaar} transactie${onzekerDitJaar === 1 ? "" : "s"} met onzekere classificatie`);
  if (yc.priveTransferMissingMirrors.length > 0) openPunten.push(`${yc.priveTransferMissingMirrors.length} privé-overboeking(en) zonder spiegelboeking`);
  if (yc.loonheffingBoetes.length > 0) openPunten.push(`${yc.loonheffingBoetes.length} boete(s) bij loonheffing (niet aftrekbaar)`);

  // Totaal zakelijke kosten (rubrieken 2 t/m 5) — voor de samenvatting, geen nieuwe berekening,
  // gewoon dezelfde bedragen als in de W&V hieronder bij elkaar opgeteld. Vanaf v161 ook de 5
  // gecategoriseerde autokosten (ib.autokostenOverig) meegeteld — die zaten tot v160 in
  // "overigeBedrijfskosten" (destijds "Auto- en transportkosten"), maar zijn sindsdien een eigen
  // veld (zie boxMapping.js) omdat ze nu in de "Auto's en machines"-rubriek getoond worden.
  const kostenTotaal =
    (ib.inkoopkosten.totaal || 0) +
    (ib.afschrijvingen.berekendeApparatuurAfschrijving ?? ib.afschrijvingen.apparatuurInvestering ?? 0) +
    (ib.afschrijvingen.berekendeLeaseAfschrijving || 0) +
    (ib.autokostenOverig.totaal || 0) +
    ib.overigeBedrijfskosten.reduce((a, r) => a + (r.totaal || 0), 0) +
    ib.nogNietIngedeeld.reduce((a, r) => a + (r.totaal || 0), 0) +
    renteAftrekbaar -
    (ib.leaseAutoKosten?.onttrekking || 0);

  const samenvattingHtml = `
  <div class="samenvatting">
    <div class="samenvatting-kerncijfers">
      <div><span class="label">Winst uit onderneming</span><span class="bedrag">${eur(summary.winst)}</span></div>
      <div><span class="label">Omzet</span><span class="bedrag">${eur(ib.opbrengsten.totaal)}</span></div>
      <div><span class="label">Zakelijke kosten</span><span class="bedrag">${eur(kostenTotaal)}</span></div>
      <div><span class="label">Geschatte inkomstenbelasting*</span><span class="bedrag">${eur(ibEstimate.belasting)}</span></div>
      <div><span class="label">Geschatte Zvw-bijdrage*</span><span class="bedrag">${eur(zvwEstimate.bijdrage)}</span></div>
    </div>
    <p class="toelichting">* Indicatie o.b.v. de geselecteerde ondernemersaftrek (zelfstandigenaftrek/startersaftrek), exclusief heffingskortingen en overig inkomen — zie "Indicatieve inkomstenbelasting en Zvw-bijdrage" hieronder.</p>
    ${kwartalen.length > 0
      ? `<table class="samenvatting-btw"><thead><tr><th>BTW</th>${kwartalen.map((q) => `<th>Q${q.kwartaal}</th>`).join("")}</tr></thead>
      <tbody><tr><td>Saldo</td>${kwartalen
        .map((q) => {
          const saldo = q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting;
          return `<td class="num">${eur(Math.abs(saldo))} ${saldo >= 0 ? "te betalen" : "terug"}</td>`;
        })
        .join("")}</tr></tbody></table>`
      : ""}
    <div class="samenvatting-status">
      <p><strong>Dossierstatus: ${STATUS_EMOJI[yearStatus]} ${STATUS_TEKST[yearStatus]}</strong></p>
      ${openPunten.length > 0 ? `<ul>${openPunten.map((p) => `<li>${p}</li>`).join("")}</ul>` : `<p class="toelichting">Geen belangrijke openstaande punten.</p>`}
    </div>
  </div>`;

  const overigeBedrijfskostenHtml =
    ib.overigeBedrijfskosten.length > 0
      ? `
  <div class="rubriek"><span>4. Overige bedrijfskosten</span><span></span></div>
  <p class="toelichting">Bedragen zijn netto (exclusief BTW).</p>
  ${ib.overigeBedrijfskosten
    .map(
      (r) =>
        `<div class="subrubriek"><span>${esc(r.naam)}</span><span class="num">${eur(r.totaal)}</span></div>${
          r.toelichting ? `<p class="toelichting">${esc(r.toelichting)}</p>` : ""
        }${categorieDetailHtml(r.perCategorie)}`
    )
    .join("")}`
      : "";

  // De rente van een financiële lease (auto of machine) is een aparte financieringskost, geen
  // "autokostenpost" — die blijft daarom altijd hier staan, volledig en ongewijzigd aftrekbaar, en
  // wordt (net als vóór v161) nooit meegeteld in de bijtelling-aftopping bij "Auto's en machines"
  // hieronder.
  const financieelTotaalRente = ib.financieleBatenLasten.renteLeningen + ib.financieleBatenLasten.renteLease;
  const financieelTotaalAflossing = ib.financieleBatenLasten.aflossingLeningen + ib.financieleBatenLasten.aflossingLease;
  const financieelHtml =
    financieelTotaalRente > 0 || ib.leningenTotal > 0 || ib.leaseFinancieelTotal > 0
      ? `
  <div class="rubriek"><span>5. Financiële baten en lasten</span><span class="num">${eur(financieelTotaalRente)}</span></div>
  <p class="toelichting">Aflossing (niet aftrekbaar): ${eur(financieelTotaalAflossing)}.${
          ib.financieleBatenLasten.onvolledig > 0 ? ` ⚠ ${ib.financieleBatenLasten.onvolledig} lening(en)/leasecontract(en) nog niet volledig ingevuld in de tool.` : ""
        }${
          ib.financieleBatenLasten.renteNietBerekenbaar > 0
            ? ` ⚠ Bij ${ib.financieleBatenLasten.renteNietBerekenbaar} leasecontract(en) kon het rentepercentage niet berekend worden, omdat de ingevulde bedragen niet bij elkaar aansluiten (de opgetelde termijnen dekken de te financieren hoofdsom niet) — controleer de invoer bij dat leasecontract. De rente hierover ontbreekt hierdoor (nog) in dit cijfer.`
            : ""
        } <span class="toelichting">Zie Bijlage: Toelichtingen voor de algemene uitleg (rente versus aflossing).</span></p>
  ${categorieDetailHtml([
    { categorie: "Rente Leningen", totaal: ib.financieleBatenLasten.renteLeningen },
    { categorie: "Rente Lease (financieel)", totaal: ib.financieleBatenLasten.renteLease },
  ])}`
      : "";

  // Vanaf v161: "Auto's en machines" als ÉÉN samengevoegde bedrijfskostenpost, in dezelfde stijl als
  // de officiële Belastingdienst-voorbeelden (bevestigd door de gebruiker) — één "totale autokosten"-
  // bedrag voor de auto (afschrijving + de 5 gecategoriseerde autokosten — NIET de lease-rente, die
  // blijft een aparte financieringskost bij "Financiële baten en lasten" hierboven), waar bij
  // privégebruik de bijtelling in zijn GEHEEL van wordt afgetrokken (afgetopt op nul, nooit een
  // negatief bedrag), in plaats van de vóór v161 gebruikte weergave met losse volledige aftrekposten
  // plus een aparte optelregel. Machines hebben geen bijtelling en blijven daarom een gewone, volledige
  // aftrekpost; ook een auto zonder bijtellingssituatie (geen privégebruik >500km, of geen lease)
  // blijft een gewone volledige aftrekpost — zie de "Auto — autokosten"-regel hieronder, die dan
  // gewoon gelijk is aan "totale autokosten".
  const autokostenOverigBedrag = ib.autokostenOverig.totaal || 0;
  const onttrekking = ib.leaseAutoKosten?.onttrekking || 0;
  const heeftBijtelling = onttrekking > 0;
  const totaleAutokosten = leaseAfschrijvingAuto + autokostenOverigBedrag;
  const aftrekbareAutokosten = Math.max(0, totaleAutokosten - onttrekking);
  // Zeldzame edge case: als in hetzelfde jaar zowel een auto ALS een machine financieel geleased is
  // én er bijtelling van toepassing is, wordt de aftopping intern (computeLeaseAutoKostenVoorJaar,
  // bestaand en ongewijzigd gedrag) berekend tegen de afschrijving van auto ÉN machine samen — terwijl
  // de bijtelling zelf uitsluitend een auto-mechanisme is. Dit rapport waarschuwt in dat zeldzame
  // geval dat dit met de hand gecontroleerd moet worden; de bedragen hierboven/hieronder tellen in dat
  // geval nog steeds correct op tot het echte "Resultaat uit onderneming", alleen de verdeling tussen
  // de "Auto"- en "Machines"-subregels kan er in dat geval technisch iets anders uitzien.
  const gemengdLeaseWaarschuwing = heeftBijtelling && leaseAfschrijvingMachine > 0;

  const autoMachineKostenHtml = (() => {
    const machineBedrag = leaseAfschrijvingMachine + apparatuurAfschrijving;
    const machineRegel = `
  <div class="subrubriek"><span>Afschrijving machines</span><span class="num">${eur(machineBedrag)}</span></div>
  ${ib.afschrijvingen.activaOnvolledig > 0 ? `<p class="toelichting">⚠ ${ib.afschrijvingen.activaOnvolledig} bedrijfsmiddel(en) nog niet volledig ingevuld bij Activa.</p>` : ""}
  ${categorieDetailHtml(ib.afschrijvingen.perCategorie)}`;

    const autoCategorieDetail = categorieDetailHtml([
      { categorie: "Afschrijving", totaal: leaseAfschrijvingAuto },
      { categorie: "Overige autokosten (MRB, verzekering, brandstof, parkeren, onderhoud)", totaal: autokostenOverigBedrag },
    ]);
    const renteVerwijzing =
      ib.leaseAutoKosten && ib.leaseAutoKosten.leaseRenteTotaal > 0
        ? ` Rente op de auto-lease (${eur(ib.leaseAutoKosten.leaseRenteTotaal)}) staat bij "Financiële baten en lasten", niet hier — dat is een financieringskost, geen autokostenpost, en telt niet mee in deze aftopping.`
        : "";
    const autoDetailHtml = !heeftBijtelling
      ? `
  <div class="subrubriek"><span>Auto — autokosten (afschrijving + gecategoriseerde kosten)</span><span class="num">${eur(totaleAutokosten)}</span></div>
  ${autoCategorieDetail}
  ${totaleAutokosten > 0 ? `<p class="toelichting">Volledig aftrekbaar — er is dit jaar geen bijtelling wegens privégebruik van toepassing.${renteVerwijzing} Zie Bijlage: Toelichtingen voor de algemene uitleg.</p>` : ""}`
      : `
  <div class="subrubriek"><span>Auto — totale autokosten (afschrijving + gecategoriseerde kosten)</span><span class="num">${eur(totaleAutokosten)}</span></div>
  ${autoCategorieDetail}
  <div class="subrubriek"><span>Auto — bijtelling privégebruik (afgetopt op de totale autokosten)</span><span class="num">- ${eur(onttrekking)}</span></div>
  <div class="subrubriek"><span>Auto — aftrekbare autokosten</span><span class="num">${eur(aftrekbareAutokosten)}</span></div>
  <p class="toelichting">${aftrekbareAutokosten <= 0 ? "Bij deze aftopping is per saldo niets van de autokosten dit jaar aftrekbaar. " : ""}${
        gemengdLeaseWaarschuwing
          ? "⚠ Dit jaar is zowel een auto als een machine financieel geleased — controleer de aftopping handmatig, de tool berekent deze nu tegen de afschrijving van auto én machine samen. "
          : ""
      }${renteVerwijzing} Zie Bijlage: Toelichtingen voor de algemene uitleg van dit mechanisme — de volledige berekening per contract staat in de tool zelf.</p>`;

    const totaalAutoMachine = machineBedrag + (heeftBijtelling ? aftrekbareAutokosten : totaleAutokosten);
    return `
  <div class="rubriek"><span>3. Auto's en machines</span><span class="num">${eur(totaalAutoMachine)}</span></div>
  <p class="toelichting">Bedragen zijn netto (exclusief BTW).</p>
  ${machineRegel}
  ${autoDetailHtml}`;
  })();

  // Transparante uitsplitsing van "Huur (deels zakelijk)" — alleen zichtbaar zodra er dit jaar
  // daadwerkelijk transacties in die categorie zijn (computeGedeeldeHuurVoorJaar geeft anders null
  // terug). Zelfde stijl als de financiële-lease-auto-uitsplitsing hierboven.
  const gedeeldeHuurHtml = (() => {
    const gh = gedeeldeHuurForYear;
    if (!gh) return "";
    // Vanaf v154 ook hier alleen de eindbedragen, geen volledige tabel meer — zelfde reden als bij
    // de financiële-lease-auto hierboven. Volledige uitsplitsing staat in de tool zelf.
    return `
  <div class="rubriek"><span>Huur (deels zakelijk) — aftrekbaar (${gh.percentage}% zakelijk)</span><span class="num">${eur(gh.aftrekbaarBedrag)}</span></div>
  <p class="toelichting">Niet aftrekbaar (privédeel): ${eur(gh.nietAftrekbaarBedrag)}${gh.totaalBtwOpHuur > 0 ? ` · aftrekbare voorbelasting: ${eur(gh.aftrekbareVoorbelasting)}` : ""}. Zie Bijlage: Toelichtingen voor de algemene uitleg — de volledige uitsplitsing staat in de tool zelf.</p>`;
  })();

  const priveHtml =
    ib.priveOnttrekkingen.totaal > 0 || ib.priveStortingen.totaal > 0
      ? `
  <div class="rubriek"><span>6. Privéonttrekkingen en -stortingen</span><span></span></div>
  ${ib.priveOnttrekkingen.totaal > 0 ? `<div class="subrubriek"><span>Privéonttrekkingen</span><span class="num">${eur(ib.priveOnttrekkingen.totaal)}</span></div>${categorieDetailHtml(ib.priveOnttrekkingen.perCategorie)}` : ""}
  ${ib.priveStortingen.totaal > 0 ? `<div class="subrubriek"><span>Privéstortingen</span><span class="num">${eur(ib.priveStortingen.totaal)}</span></div>${categorieDetailHtml(ib.priveStortingen.perCategorie)}` : ""}`
      : "";

  const belastingenHtml = rubriekBlok(null, ib.belastingenGeenKostenpost.naam, ib.belastingenGeenKostenpost.totaal, ib.belastingenGeenKostenpost.toelichting, ib.belastingenGeenKostenpost.perCategorie);
  const verkoopActivaHtml = rubriekBlok(
    null, "Verkoop activa", ib.verkoopActivaTotal,
    "Kan een boekwinst of -verlies opleveren — deze tool kent de boekwaarde niet en berekent dat niet automatisch."
  );
  const nogNietIngedeeldHtml =
    ib.nogNietIngedeeld.length > 0
      ? `
  <div class="rubriek"><span>Nog niet ingedeeld in deze structuur</span><span></span></div>
  ${ib.nogNietIngedeeld.map((r) => `<div class="subrubriek"><span>${esc(r.categorie)}</span><span class="num">${eur(r.totaal)}</span></div>`).join("")}`
      : "";

  return `
  <h1>Indicatieve aangifteberekening / fiscale reconstructie — ${year}</h1>
  <p class="subtitle">
    Status: ${STATUS_EMOJI[yearStatus]} ${STATUS_TEKST[yearStatus]} ·
    ${korRegeling ? "Valt onder de KOR" : btwVerlegd ? "BTW-verlegd van toepassing" : "Gewone BTW-plicht"} ·
    op basis van beschikbare bankgegevens
  </p>
  ${samenvattingHtml}

  <h2>Winst-en-verliesrekening — in de volgorde van de IB-aangifte</h2>
  <div class="wvr">
    ${rubriekBlok(1, ib.opbrengsten.naam, ib.opbrengsten.totaal, "Netto (exclusief BTW) — zoals in de IB-aangifte, niet het bruto bankbedrag.", ib.opbrengsten.perCategorie)}
    ${rubriekBlokAltijd(2, "Inkoopkosten", inkoopkostenBedrag, "Bedragen zijn netto (exclusief BTW).")}
    ${rubriekBlokAltijd(null, "Uitbesteed werk", uitbesteedWerkBedrag, "Inhuur van derden/freelancers. Bedragen zijn netto (exclusief BTW).")}
    ${rubriekBlokAltijd(null, "Andere externe kosten", andereExterneKostenBedrag, "Op dit moment zijn hier geen categorieën aan gekoppeld.")}
    ${autoMachineKostenHtml}
    ${overigeBedrijfskostenHtml}
    ${financieelHtml}
    ${gedeeldeHuurHtml}
    <div class="rubriek total"><span>Resultaat uit onderneming (winst, netto)</span><span class="num">${eur(summary.winst)}</span></div>
    ${priveHtml}
    ${belastingenHtml}
    ${verkoopActivaHtml}
    ${nogNietIngedeeldHtml}
  </div>

  ${!korRegeling && kwartalen.length > 0 ? `
  <h2>BTW per kwartaal</h2>
  <table>
    <thead><tr><th>Aangifterubriek</th>${kwartalen.map((q) => `<th class="num">Q${q.kwartaal}</th>`).join("")}</tr></thead>
    <tbody>
      <tr><td>1a Omzet 21%</td>${kwartalen.map((q) => `<td class="num">${eur(q.omzetBruto21 - q.verschuldigdBtw21)}</td>`).join("")}</tr>
      <tr><td>1b Omzet 9%</td>${kwartalen.map((q) => `<td class="num">${eur(q.omzetBruto9 - q.verschuldigdBtw9)}</td>`).join("")}</tr>
      <tr><td>1e Verlegd</td>${kwartalen.map((q) => `<td class="num">${eur(q.omzetBrutoVerlegd)}</td>`).join("")}</tr>
      <tr><td>5b Voorbelasting</td>${kwartalen.map((q) => `<td class="num">${eur(q.voorbelasting)}</td>`).join("")}</tr>
      <tr class="total"><td>Saldo</td>${kwartalen
        .map((q) => {
          const saldo = q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting;
          return `<td class="num">${eur(Math.abs(saldo))} ${saldo >= 0 ? "te betalen" : "terug"}</td>`;
        })
        .join("")}</tr>
    </tbody>
  </table>
  <p class="vergelijk-hint">Vergelijk het saldo per kwartaal hierboven met wat er daadwerkelijk is aangegeven en betaald.</p>` : ""}
  <p class="toelichting">Details van de onderliggende BTW-analyse per kwartaal en het volledige categorieoverzicht kun je in de tool zelf terugvinden.</p>

  <h2>Indicatieve inkomstenbelasting en Zvw-bijdrage</h2>
  ${zaScenarios ? `
  <p>Urencriterium onbekend — twee scenario's: 1. Mét zelfstandigenaftrek: <strong>${eur(zaScenarios.metZelfstandigenaftrek.belasting)}</strong>. 2. Zonder: <strong>${eur(zaScenarios.zonderZelfstandigenaftrek.belasting)}</strong>.${mogelijkeKia > 0 ? ` Ná mogelijke KIA*: 1. Mét zelfstandigenaftrek: <strong>${eur(zaScenariosNaKia.metZelfstandigenaftrek.belasting)}</strong>. 2. Zonder: <strong>${eur(zaScenariosNaKia.zonderZelfstandigenaftrek.belasting)}</strong>.` : ""}</p>
  ` : `
  <p>Geschatte inkomstenbelasting${zaStatus === "nee" ? " (zonder zelfstandigenaftrek — zo aangegeven)" : zaStatus === "ja" ? " (mét zelfstandigenaftrek — zo aangegeven)" : ""}${startersaftrekToegepast ? " en startersaftrek" : ""}: <strong>${eur(ibEstimate.belasting)}</strong>.${!zaStatus ? " ⚠ Urencriterium nog niet aangegeven in de tool." : ""}${mogelijkeKia > 0 ? ` Ná mogelijke KIA*: <strong>${eur(ibEstimateNaKia.belasting)}</strong>.` : ""}</p>
  ${ondernemersaftrekVoorJaar ? `
  <p class="toelichting">Toegepaste ondernemersaftrek: zelfstandigenaftrek <strong>${eur(ondernemersaftrekVoorJaar.zelfstandigenaftrekBedrag)}</strong>${
      ondernemersaftrekVoorJaar.verrekendUitReserve > 0
        ? ` (waarvan ${eur(ondernemersaftrekVoorJaar.verrekendUitReserve)} verrekend uit eerdere jaren)`
        : ""
    }${startersaftrekToegepast ? ` + startersaftrek <strong>${eur(ondernemersaftrekVoorJaar.startersaftrekBedrag)}</strong>` : ""}.${
      ondernemersaftrekVoorJaar.nietGerealiseerdNieuw > 0
        ? ` ⚠ ${eur(ondernemersaftrekVoorJaar.nietGerealiseerdNieuw)} niet benut (winst te laag), gereserveerd voor later.`
        : ""
    }</p>
  ` : ""}
  `}
  <p>Geschatte bijdrage Zvw: <strong>${eur(zvwEstimate.bijdrage)}</strong>${zvwEstimate.gemaximeerd ? " (gemaximeerd)" : ""}.${mogelijkeKia > 0 ? ` Ná mogelijke KIA*: <strong>${eur(zvwEstimateNaKia.bijdrage)}</strong>${zvwEstimateNaKia.gemaximeerd ? " (gemaximeerd)" : ""}.` : ""}</p>
  <p class="vergelijk-hint">Vergelijk met wat daadwerkelijk is aangegeven/betaald (zie ook "Al betaald ZVW/IH" in het meerjarenoverzicht).</p>
  <p class="toelichting">Zie Bijlage: Toelichtingen voor de algemene aannames (urencriterium, extrapolatie van schijven/percentages, startersaftrek en de 9-jaars-reserve) en het voorbehoud.</p>

  <h3>Geschatte heffingskortingen (indicatief)</h3>
  <p>Algemene heffingskorting: <strong>${eur(heffingskortingen.algemeneHeffingskorting)}</strong> + arbeidskorting: <strong>${eur(heffingskortingen.arbeidskorting)}</strong> = totaal <strong>${eur(heffingskortingen.totaal)}</strong></p>
  <p>Indicatieve IB ná heffingskortingen: <strong>${eur(Math.max(0, ibEstimate.belasting - heffingskortingen.totaal))}</strong> <span class="toelichting">Zie Bijlage.</span></p>

  <h3>Mogelijke investeringsaftrek (KIA)</h3>
  ${investeringenForYear.totaalInvestering > 0 ? `
  <p>Investeringen ${year}: <strong>${eur(investeringenForYear.totaalInvestering)}</strong> → mogelijke KIA: <strong>${eur(mogelijkeKia)}</strong>${investeringenForYear.onvolledig > 0 ? ` <span style="color:#b45309;">(⚠ ${investeringenForYear.onvolledig} bedrijfsmiddel(en) onvolledig ingevuld)</span>` : ""} <span class="toelichting">Zie Bijlage.</span></p>
  ${mogelijkeKia > 0 ? `
  <p><strong>* IB vóór mogelijke KIA: ${eur(ibEstimate.belasting)}. IB ná mogelijke KIA: ${eur(ibEstimateNaKia.belasting)}</strong> (ná heffingskortingen: ${eur(Math.max(0, ibEstimateNaKia.belasting - heffingskortingenNaKia.totaal))}).</p>
  <p class="toelichting">⚠ Dit is nadrukkelijk een scenario, geen vaststaand bedrag: niet elk bedrijfsmiddel kwalificeert voor KIA (bijv. personenauto's, grond en woningen meestal niet, en elk bedrijfsmiddel moet minimaal ca. €450 kosten) — deze tool kent dat onderscheid niet uit bankgegevens. Controleer zelf welke investeringen hierboven daadwerkelijk kwalificeren voordat je de KIA toepast.</p>
  ` : ""}
  ` : `<p class="toelichting">KIA niet vast te stellen — geen (volledig ingevulde) investeringen gevonden voor ${year} in het Activa-paneel.</p>`}

  ${algemeneGegevensHtml}`;
}

export function buildAangiftevoorstelHtml(yearsToInclude, classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, heeftVoorraad, importDiagnostics, accountTypeByFile, fileContinuity, kwartaalStatus, zelfstandigenaftrekStatus, startersaftrekStatus, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails) {
  // Pre-pass: winst per jaar bepalen (los van de rest van de sectie-opbouw hieronder) zodat de
  // verrekening van niet-gerealiseerde zelfstandigenaftrek chronologisch over de jaren in DIT
  // rapport kan worden doorgerekend, vóórdat de jaarsecties zelf worden gebouwd. Jaren met
  // zelfstandigenaftrekStatus "onbekend" doen bewust niet mee in deze keten (die tonen hun eigen
  // twee scenario's, los van reserveverrekening).
  const jarenVoorReserve = yearsToInclude
    .filter((year) => zelfstandigenaftrekStatus?.[year] !== "onbekend")
    .map((year) => ({
      year,
      winst: computeWinstVoorJaar(year, classified, categoryBtwRates, btwVerlegd, loanSummary, loanDetails, leaseSummary, leaseDetails, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails, activaDetails),
      zelfstandigenaftrekStatus: zelfstandigenaftrekStatus?.[year],
      startersaftrekToegepast: startersaftrekStatus?.[year] === "ja",
    }));
  const ondernemersaftrekPerJaar = computeOndernemersaftrekMetReserve(jarenVoorReserve);
  const alleJarenMetData = [...new Set(classified.filter((tx) => !tx.isMirror).map((tx) => tx.year))];
  const vroegsteJaarMetData = alleJarenMetData.length > 0 ? Math.min(...alleJarenMetData) : null;
  const vroegsteJaarInRapport = jarenVoorReserve.length > 0 ? Math.min(...jarenVoorReserve.map((j) => j.year)) : null;
  const reserveWaarschuwingHtml =
    vroegsteJaarMetData != null && vroegsteJaarInRapport != null && vroegsteJaarMetData < vroegsteJaarInRapport
      ? `<p class="toelichting">⚠ Dit rapport begint bij ${vroegsteJaarInRapport}, terwijl er ook bankgegevens zijn van vóór dat jaar — een eventuele niet-gerealiseerde zelfstandigenaftrek van vóór ${vroegsteJaarInRapport} is hierin niet meegenomen. Neem alle jaren mee in één rapport voor een volledige verrekening.</p>`
      : "";

  // Paginascheiding tussen jaarsecties (en vóór de bijlage) — zowel de oudere `page-break-before`
  // als de moderne `break-before` (browsers/PDF-generators op bijv. iPad/tablet ondersteunen niet
  // altijd dezelfde variant, dus beide staan op hetzelfde element).
  const PAGE_BREAK_DIVIDER = '\n  <div style="page-break-before: always; break-before: page;"></div>\n';

  const sections = yearsToInclude
    .map((year) => buildYearSection(year, classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, importDiagnostics, accountTypeByFile, fileContinuity, kwartaalStatus, zelfstandigenaftrekStatus, ondernemersaftrekPerJaar[year], startersaftrekStatus, huurZakelijkPercentageStatus, categoryZakelijkPercentage, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails))
    .join(PAGE_BREAK_DIVIDER);

  return `<!DOCTYPE html>
<html lang="nl"><head><meta charset="utf-8"><title>Indicatieve aangifteberekening ${yearsToInclude.join(", ")}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin: 0; padding: 24px 32px; font-size: 11px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .subtitle { color: #64748b; font-size: 11px; margin-bottom: 20px; }
  h2 { font-size: 14px; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin: 24px 0 10px; page-break-after: avoid; }
  h3 { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.02em; margin: 14px 0 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { padding: 4px 6px; border-bottom: 1px solid #f1f5f9; text-align: left; }
  th { font-size: 9px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #cbd5e1; }
  tr.total td { font-weight: bold; border-top: 1px solid #0f172a; border-bottom: none; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .wvr { margin-bottom: 8px; }
  .wvr .rubriek { display: flex; justify-content: space-between; padding: 5px 6px; border-bottom: 1px solid #f1f5f9; font-weight: 600; }
  .wvr .subrubriek { display: flex; justify-content: space-between; padding: 3px 6px 3px 18px; border-bottom: 1px solid #f8fafc; color: #475569; font-weight: 400; }
  .wvr .categorie-detail { display: flex; justify-content: space-between; padding: 2px 6px 2px 32px; color: #94a3b8; font-weight: 400; font-size: 9.5px; }
  .wvr .rubriek.total { border-top: 2px solid #0f172a; border-bottom: none; margin-top: 4px; padding-top: 8px; background: #f0fdf4; }
  .wvr .toelichting { color: #64748b; font-size: 9.5px; font-style: italic; margin: 0 0 6px 6px; }
  /* Belangrijke blokken niet halverwege laten afbreken over een paginagrens (zowel de moderne
     break-inside als de oudere page-break-inside — browsers/PDF-generators gebruiken wat ze
     kennen; vooral bij printen/opslaan-als-PDF op tablets is dit niet altijd betrouwbaar zonder
     beide varianten). */
  .rubriek, .wvr .rubriek { break-inside: avoid; page-break-inside: avoid; }
  .samenvatting { margin: 0 0 20px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; break-inside: avoid; page-break-inside: avoid; }
  .samenvatting-kerncijfers { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 10px; }
  .samenvatting-kerncijfers > div { display: flex; flex-direction: column; }
  .samenvatting-kerncijfers .label { font-size: 9px; text-transform: uppercase; color: #64748b; }
  .samenvatting-kerncijfers .bedrag { font-size: 15px; font-weight: bold; }
  .samenvatting-btw { margin: 0 0 10px; }
  .samenvatting-btw th, .samenvatting-btw td { border-bottom: 1px solid #e2e8f0; padding: 3px 6px; }
  .samenvatting-btw th:not(:first-child), .samenvatting-btw td.num { text-align: right; }
  .samenvatting-status ul { margin: 4px 0 0 16px; padding: 0; font-size: 10px; color: #78350f; }
  .samenvatting-status li { margin-bottom: 2px; }
  .samenvatting-status .toelichting { margin: 4px 0 0; font-size: 10px; color: #15803d; }
  .controledoel { margin: 20px 0; padding: 10px 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; color: #1e3a5f; font-size: 10.5px; line-height: 1.5; }
  .onzekerheden { margin: 0 0 20px; padding: 10px 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; color: #78350f; font-size: 10.5px; line-height: 1.5; }
  .onzekerheden ul { margin: 6px 0 6px 16px; padding: 0; }
  .onzekerheden li { margin-bottom: 3px; }
  .onzekerheden p { margin: 6px 0; }
  .vergelijk-hint { color: #2563eb; font-size: 9.5px; font-style: italic; margin: -4px 0 8px; }
  .disclaimer { margin-top: 28px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; color: #64748b; font-size: 9.5px; }
  @page { size: A4 portrait; margin: 16mm; }
</style></head>
<body>
  <p class="subtitle">Gegenereerd op ${new Date().toLocaleDateString("nl-NL")}</p>
  ${reserveWaarschuwingHtml}
  ${sections}
  ${PAGE_BREAK_DIVIDER}
  <h2>Lees dit voordat je de cijfers gebruikt</h2>
  <div class="controledoel">
    <strong>Waar is dit voor?</strong> Dit overzicht is een <strong>onafhankelijke reconstructie</strong>: het laat
    zien wat er volgens uitsluitend de bankgegevens aangegeven en betaald had moeten worden. Vergelijk de bedragen
    hierboven gerust met een eerder ingediende aangifte — maar een verschil betekent niet automatisch dat er iets
    misging in die eerdere aangifte, en ook niet automatisch dat deze reconstructie klopt. Een eerdere aangifte kan
    bijvoorbeeld gebaseerd zijn op facturen die niet via deze bankrekening liepen, memoriaalboekingen, correcties of
    suppleties — dingen die niet uit bankgegevens blijken. Een verschil is dus vooral een signaal om samen na te gaan
    waar het vandaan komt, niet een oordeel op zichzelf. De winst-en-verliesrekening hierboven staat bewust in
    dezelfde volgorde als de IB-aangifte zelf.
  </div>
  <div class="onzekerheden">
    <strong>Wat deze tool niet kan weten</strong>
    <p>Deze reconstructie is gebaseerd op uitsluitend de banktransacties. Een aantal dingen dat voor de aangifte
    relevant kan zijn, staat niet (of niet volledig) op een bankrekening, en zit dus niet in dit overzicht:</p>
    <ul>
      <li>Contante ontvangsten en uitgaven</li>
      <li>Openstaande facturen — nog te ontvangen bedragen (debiteuren) en nog te betalen bedragen (crediteuren) die aan het einde van het jaar nog niet via de bank zijn verwerkt</li>
      <li>Voorraad — inkoopwaarde en verkoopwaarde van onverkochte goederen aan het begin/einde van het jaar${
        heeftVoorraad ? " (je gaf aan dat er voorraad is — dat vraagt een eigen registratie, dit overzicht neemt dat niet mee)" : ""
      }</li>
      <li>Privégebruik van bedrijfsmiddelen (bijv. een auto) voor zover dat niet als aparte correctie is vastgelegd</li>
      <li>Inkomsten of kosten die buiten deze bankrekening om liepen (bijv. via een andere rekening, contant, of in natura)</li>
      <li>Fiscale situaties die niet uit bankgegevens blijken (bijv. specifieke regelingen rond de eigen woning of andere ondernemingen)</li>
      <li>Correcties, memoriaalboekingen of suppleties uit een eerdere administratie</li>
    </ul>
    <p>Dit maakt de reconstructie niet minder waardevol — het is juist onderdeel van een betrouwbare aanpak om
    zichtbaar te maken wat wél en niet uit de bankgegevens kan worden vastgesteld.</p>
  </div>
  <div class="disclaimer">
    Dit is een <strong>voorstel</strong>, samengesteld uit je eigen bankgegevens en categorie-indeling in deze tool —
    geen officiële aangifte en geen belastingadvies. Controleer de cijfers altijd zelf of met je boekhouder voordat
    je aangifte doet.
  </div>
  ${PAGE_BREAK_DIVIDER}
  ${buildBijlageToelichtingenHtml()}
</body></html>`;
}

// Bijlage met de algemene, niet-jaargebonden toelichtingen die tot v150 per jaar herhaald werden in
// buildYearSection — nu één keer, aan het eind van het hele (meerjaren-)rapport. In elke jaarsectie
// staat op de plek waar zo'n toelichting stond nu alleen nog het jaarspecifieke bedrag/de
// jaarspecifieke waarschuwing (indien van toepassing) plus een verwijzing hierheen. Puur tekst,
// géén bedragen die uit een jaarsectie zijn weggehaald — elk bedrag blijft in de jaarsectie zelf
// staan.
function buildBijlageToelichtingenHtml() {
  return `
  <h1>Bijlage: Toelichtingen</h1>
  <p class="subtitle">Algemene uitleg bij een aantal rubrieken hierboven — hier maar één keer uitgeschreven in plaats van per jaar.</p>

  <h2>Financiële baten en lasten — rente versus aflossing</h2>
  <p class="toelichting">
    Alleen de rente is een kostenpost — de rest van elke termijn is aflossing op de financiering, een
    balansmutatie, geen bedrijfskosten. Is bij een leasecontract de "soort" (auto/machine) ingevuld,
    dan is het geleasde object wél een eigen bedrijfsmiddel van de zzp'er dat gekapitaliseerd en
    afgeschreven wordt — zie dan "Afschrijving auto's"/"Afschrijving machines" in de jaarsectie (en
    bij een auto met privégebruik &gt;500 km/jaar ook de onttrekking, zie hieronder). Zonder ingevulde
    "soort" (het gebruikelijke geval tot nu toe) staat bij "Financiële baten en lasten" alleen de
    rente, zoals voorheen.
  </p>

  <h2>Afschrijvingen — algemeen</h2>
  <p class="toelichting">
    Een bedrijfsmiddel (auto, apparatuur of machine) mag niet in één keer als kosten worden
    afgetrokken — dit zijn bedrijfsmiddelen (activa) die over de gebruiksduur afgeschreven moeten
    worden (aanschafwaarde minus restwaarde, verdeeld over de jaren). Zodra bedrijfsmiddelen zijn
    geregistreerd bij "Activa" (aanschafwaarde, -datum, afschrijvingstermijn, restwaarde) gebruikt
    deze tool de daadwerkelijk berekende afschrijving voor het betreffende jaar; is dat nog niet
    ingevuld, dan berekent deze tool geen afschrijvingsschema en staat het bruto aanschafbedrag in de
    jaarsectie alleen ter herkenning.
  </p>

  <h2>Financiële lease auto/machine — kapitalisatie en (bij privégebruik) onttrekking</h2>
  <p class="toelichting">
    Bij financiële lease is het geleasde object (auto of machine) een eigen bedrijfsmiddel van de
    zzp'er, dat gekapitaliseerd en afgeschreven wordt (aanschafwaarde = het gefinancierde bedrag bij
    aanvang van het contract, niet de cataloguswaarde; bij een auto geldt een fiscale minimale
    afschrijvingstermijn van ${MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN} jaar). Bij een geleasede auto
    met meer dan 500 km privégebruik per jaar geldt daarnaast een "onttrekking": de normale bijtelling
    (bijtellingspercentage × cataloguswaarde) wordt afgetopt op de werkelijke totale autokosten van
    dat jaar — dit is geen gewone bijtelling zoals bij een werknemer, maar een correctie op de
    aftrekbare kosten van de zzp'er zelf.
  </p>
  <p class="toelichting">
    "Totale autokosten" voor deze aftopping bestaat uit de afschrijving plus de 5 gecategoriseerde
    autokosten (MRB, verzekering, brandstof, parkeren, onderhoud) — dezelfde bedragen die bij
    "Auto's en machines" in de jaarsectie staan. De rente van de financiële lease telt hier bewust
    NIET in mee: dat is een aparte financieringskost, geen autokostenpost, en blijft daarom altijd
    volledig en ongewijzigd aftrekbaar bij "Financiële baten en lasten" — ook als de bijtelling de
    overige autokosten volledig wegstreept.
  </p>
  <p class="toelichting">
    Bij "Auto's en machines" in de jaarsectie staat daarom één samengevoegd bedrag: de "totale
    autokosten" (afschrijving + gecategoriseerde kosten) minus de bijtelling, afgetopt op nul — nooit
    een negatieve aftrekpost. Is de bijtelling hoger dan of gelijk aan de totale autokosten, dan is er
    per saldo niets van die kosten dat jaar aftrekbaar (de lease-rente blijft daarbuiten, zoals
    hierboven beschreven).
  </p>
  <p class="toelichting" style="color:#b45309;">
    ⚠ Bij een tussentijds vervangen/geherfinancierd leasecontract van dezelfde auto (herkend op een
    gelijk kenteken) telt de afschrijving maar één keer mee, doorlopend vanaf de OORSPRONKELIJKE
    aanschaf/financiering — het bedrag van een later, gekoppeld contract wordt bewust NIET nogmaals
    als afschrijvingsbasis meegeteld (dat zou dubbel tellen), ook al kan het financieel om een nieuw,
    hoger bedrag gaan. Dit is een gangbare, maar door de gebruiker te controleren aanname: klopt het
    niet dat de herfinanciering puur het openstaande saldo van dezelfde auto oversluit (bijv. omdat er
    feitelijk extra in de auto is geïnvesteerd), controleer dan handmatig of de afschrijvingsbasis nog
    aansluit. De rente van elk gekoppeld contract blijft wel gewoon apart doorlopen over zijn eigen
    bedrag/periode.
  </p>

  <h2>Huur (deels zakelijk) — percentage zakelijk gebruik</h2>
  <p class="toelichting">
    Van deze huur is maar een deel zakelijk (bijv. een deels verhuurd/gebruikt pand of schuur) — het
    privédeel mag de winst niet verlagen, en is bij een belaste huur ook niet aftrekbaar als
    voorbelasting. Het volledige brutobedrag stroomt via de gewone categorie-indeling mee in
    "Inkoopkosten"/"Overige bedrijfskosten" in de jaarsectie (net als "Huur") — het niet-aftrekbare
    deel wordt daar apart weer bij de winst opgeteld, zodat "Resultaat uit onderneming" al de juiste,
    gecorrigeerde winst toont.
  </p>

  <h2>Zelfstandigenaftrek, startersaftrek en de 9-jaars-reserve</h2>
  <p class="toelichting">
    Startersaftrek mag maximaal 3 keer worden toegepast in de eerste 5 jaar van het ondernemerschap —
    controleer zelf of dat hier van toepassing is. Kan de zelfstandigenaftrek in een jaar niet (of niet
    volledig) worden benut omdat de winst te laag is, dan wordt het niet-gerealiseerde deel
    gereserveerd om tot 9 jaar later alsnog te verrekenen, mits in dit rapport ook een later jaar met
    voldoende winst wordt meegenomen (deze tool verrekent dit automatisch tussen de jaren die samen in
    één rapport zijn opgenomen).
  </p>

  <h2>Indicatieve inkomstenbelasting en Zvw-bijdrage — algemeen</h2>
  <p class="toelichting">
    Deze schatting gaat uit van het urencriterium (doorgaans: minimaal 1.225 uur per jaar aan de
    onderneming besteed) voor de zelfstandigenaftrek — geef in de tool aan ("Persoonlijke aannames
    voor IB") of daaraan is voldaan zodra dat bekend is; zonder die aangave rekent de tool voorlopig
    mét zelfstandigenaftrek. De IB-schatting is exclusief heffingskortingen en overig inkomen (die
    volgen apart hieronder in de jaarsectie). Zijn de belastingschijven of het Zvw-percentage van een
    jaar nog niet officieel bekend, dan benadert de tool die met de dichtstbijzijnde bekende
    schijven/het dichtstbijzijnde bekende percentage. Dit is in alle gevallen een indicatie, geen
    belastingadvies — vergelijk het altijd met wat daadwerkelijk is aangegeven/betaald.
  </p>

  <h2>Heffingskortingen — aannames</h2>
  <p class="toelichting">
    ⚠ Persoonlijke heffingskortingen zijn niet volledig meegenomen: deze schatting gaat ervan uit dat
    de winst uit onderneming je enige inkomen is, dat je nog geen AOW-leeftijd hebt bereikt, en dat er
    geen fiscale partner is om mee te verrekenen. Klopt een van die aannames niet, dan is deze
    indicatie minder betrouwbaar. Geen belastingadvies.
  </p>

  <h2>Investeringsaftrek (KIA) — algemene regels</h2>
  <p class="toelichting">
    De getoonde mogelijke KIA is een mógelijke, geen definitieve aftrek — niet elk bedrijfsmiddel telt
    mee voor de KIA (bijv. personenauto's en grond meestal niet, en elk bedrijfsmiddel moet minimaal
    circa €450 hebben gekost). Controleer dit zelf per aanschaf.
  </p>`;
}

export function downloadAangiftevoorstel(html, years) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Indicatieve_aangifteberekening_${years.join("-")}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
