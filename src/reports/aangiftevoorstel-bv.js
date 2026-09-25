// BV-variant van het Aangiftevoorstel — een apart bestand in plaats van vertakkingen in
// aangiftevoorstel.js, zodat een wijziging aan de ene rapportvorm de andere nooit per ongeluk kan
// raken (zie het bouwplan). Hergebruikt bewust dezelfde onderliggende, categorie-gedreven
// berekeningen als de zzp-versie (computeYearlySummary, computeIbBoxMapping) — die zijn al
// rechtsvorm-onafhankelijk (Route B: gebaseerd op fiscalTreatmentOf(categorie), niet op wie de
// ondernemer is) — en voegt daar de BV-specifieke belastinglaag (Vpb/box 2) en balansmutaties
// (rekening-courant, kapitaalstorting, dividend) overheen.
import { CATEGORY_ORDER, fiscalTreatmentOf } from "../classification/categories.js";
import { computeBtw, computeQuarterlyBtwForYear } from "../tax/btw.js";
import { computeYearlySummary } from "../tax/yearlySummary.js";
import { estimateVpb, estimateBox2, checkGebruikelijkLoon } from "../tax/vpb.js";
import { computeRekeningCourantVerloop, computeEigenVermogenVerloop } from "../tax/bv.js";
import { computeIbBoxMapping } from "../tax/boxMapping.js";
import { computeChecklistLikeDataForYear } from "../tax/checklist.js";
import { CONTINUITY_GAP_THRESHOLD } from "../importers/transactions.js";
import { computeActivaSummary, computeActivaAfschrijvingForYear } from "../tax/activa.js";
import { computeLoanRenteForYear, computeLeaseRenteForYear } from "../tax/loanAmortization.js";
import { computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate } from "../tax/financialLease.js";
import { computeLeaseAutoKostenVoorJaar } from "../tax/autoBijtelling.js";
import { eur } from "../utils/amounts.js";

const STATUS_EMOJI = { groen: "🟢", oranje: "🟠", rood: "🔴" };
const STATUS_TEKST = { groen: "Klaar voor controle", oranje: "Controle nodig", rood: "Mogelijk ontbreekt een periode" };

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function rubriekBlok(nr, naam, totaal, toelichting, perCategorie) {
  if (!totaal) return "";
  return `
  <div class="rubriek"><span>${nr ? `${nr}. ` : ""}${esc(naam)}</span><span class="num">${eur(totaal)}</span></div>
  ${toelichting ? `<p class="toelichting">${toelichting}</p>` : ""}
  ${categorieDetailHtml(perCategorie)}`;
}

function categorieDetailHtml(perCategorie) {
  if (!perCategorie || perCategorie.length === 0) return "";
  return perCategorie.map((r) => `<div class="categorie-detail"><span>${esc(r.categorie)}</span><span class="num">${eur(r.totaal)}</span></div>`).join("");
}

const fmtDatum = (d) => (d ? new Date(d).toLocaleDateString("nl-NL") : "onbekend");

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
    ? `<p class="toelichting" style="color:#b45309;">⚠ Mogelijk ontbreekt een periode: tussen ${esc(gatenDitJaar[0].fileA)} (t/m ${fmtDatum(gatenDitJaar[0].aTo)}) en ${esc(gatenDitJaar[0].fileB)} (vanaf ${fmtDatum(gatenDitJaar[0].bFrom)}) sluit het saldo niet aan (verschil ${eur(gatenDitJaar[0].diff)}) — de moeite waard om na te gaan.</p>`
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

function buildYearSectionBv(
  year, classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides,
  loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, importDiagnostics, accountTypeByFile,
  fileContinuity, kwartaalStatus, rcVerloop, evVerloop, heeftHolding
) {
  const zakItems = classified.filter((tx) => !tx.isMirror && tx.year === year && fiscalTreatmentOf(tx.category) !== "geen");
  const loanRenteForYear = computeLoanRenteForYear(loanSummary || [], loanDetails || {}, year);
  const leaseRenteForYear = computeLeaseRenteForYear(leaseSummary || [], leaseDetails || {}, year, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
  const renteAftrekbaar = (loanRenteForYear?.totaalRente || 0) + (leaseRenteForYear?.totaalRente || 0);
  // v183: "Zakelijk - apparatuur/machines" telt sinds v183 niet meer als volledige kosten mee in
  // yearlySummary.js (zie de toelichting daar) — vóór deze aanpassing werd hier daarom niets meer
  // teruggegeven voor de aanschaf van een bedrijfsmiddel. activaSummary/activaAfschrijvingForYear
  // moeten daarom vóór computeYearlySummary worden bepaald, zodat de daadwerkelijk berekende
  // afschrijving alsnog wordt meegeteld — exact dezelfde constructie als bij de zzp-variant.
  const activaSummary = computeActivaSummary(classified);
  const activaAfschrijvingForYear = computeActivaAfschrijvingForYear(activaSummary, activaDetails || {}, year);
  const summary = computeYearlySummary(classified, year, categoryBtwRates, btwVerlegd, [], [], [], renteAftrekbaar, activaAfschrijvingForYear?.totaalAfschrijving || 0);
  const vpbEstimate = estimateVpb(summary.winst, year);
  const ib = computeIbBoxMapping(zakItems, loanRenteForYear, leaseRenteForYear, activaAfschrijvingForYear, categoryBtwRates, btwVerlegd);

  // DGA-salaris en dividend van dit jaar — voor de gebruikelijk-looncheck en de box 2-schatting.
  const dgaSalarisDitJaar = Math.abs(classified.filter((tx) => tx.category === "DGA-salaris" && !tx.isMirror && tx.year === year).reduce((a, tx) => a + tx.amount, 0));
  const dividendDitJaar = Math.abs(classified.filter((tx) => tx.category === "Dividenduitkering" && !tx.isMirror && tx.year === year).reduce((a, tx) => a + tx.amount, 0));
  // v201: bijtelling privégebruik auto bij een financial-lease auto van de BV. Dit is GEEN correctie
  // op de winst/Vpb (de volledige leasekosten blijven op vennootschapsniveau gewoon aftrekbaar,
  // ongewijzigd) — bijtelling hoort bij een BV bij de DGA persoonlijk, als loon in natura, en telt
  // dus mee voor de gebruikelijk-loonregeling en de loonheffing. computeLeaseAutoKostenVoorJaar is
  // dezelfde functie als voor een zzp'er, maar we gebruiken hier bewust normaleBijtellingTotaal (de
  // volledige, ongecapte bijtelling) — niet de afgetopte "onttrekking", die alleen relevant is voor
  // de zzp-winstcorrectie (aftopping op werkelijke autokosten hoort niet bij een BV/loon-in-natura).
  const leaseAutoKostenBv = computeLeaseAutoKostenVoorJaar(leaseSummary, leaseDetails, year, classified, categoryBtwRates, btwVerlegd);
  const bijtellingPrivegebruikAuto = leaseAutoKostenBv?.normaleBijtellingTotaal || 0;
  const gebruikelijkLoon = checkGebruikelijkLoon(dgaSalarisDitJaar + bijtellingPrivegebruikAuto, year);
  const box2Estimate = estimateBox2(dividendDitJaar, year);
  const rc = rcVerloop[year] || { mutatieDitJaar: 0, standEindJaar: 0 };
  const ev = evVerloop[year] || { kapitaalstorting: 0, resultaatNaVpb: summary.winst - vpbEstimate.belasting, dividend: dividendDitJaar, standEindJaar: null };

  const gatenDitJaar = (fileContinuity || []).filter(
    (g) => !g.ok && Math.abs(g.diff) >= CONTINUITY_GAP_THRESHOLD && (g.aTo.getFullYear() === year || g.bFrom.getFullYear() === year)
  );
  const algemeneGegevensHtml = buildAlgemeneGegevensHtml(year, importDiagnostics, accountTypeByFile, classified, gatenDitJaar);

  const zakTotals = {};
  const zakBtwByCat = {};
  for (const tx of zakItems) {
    zakTotals[tx.category] = (zakTotals[tx.category] || 0) + tx.amount;
    zakBtwByCat[tx.category] = (zakBtwByCat[tx.category] || 0) + computeBtw(tx, categoryBtwRates, btwVerlegd);
  }
  const zakGrandTotal = Object.values(zakTotals).reduce((a, b) => a + b, 0);
  const zakGrandBtw = Object.values(zakBtwByCat).reduce((a, b) => a + b, 0);
  const catRows = CATEGORY_ORDER.filter((c) => c in zakTotals)
    .map((c) => {
      const bruto = zakTotals[c];
      const btw = zakBtwByCat[c] || 0;
      return `<tr><td>${esc(c)}</td><td class="num">${eur(bruto)}</td><td class="num">${eur(bruto - btw)}</td><td class="num">${eur(btw)}</td></tr>`;
    })
    .join("");

  // BTW werkt voor een BV hetzelfde als voor een zzp — de KOR is alleen niet van toepassing
  // (rechtspersonen kunnen er geen gebruik van maken), dus hier altijd de volledige kwartaalberekening.
  const kwartalen = computeQuarterlyBtwForYear(classified, year, categoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides);
  const kwartaalRows = kwartalen
    .map((q) => {
      const saldo = q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting;
      return `<tr>
        <td>Q${q.kwartaal}</td>
        <td class="num">${eur(q.omzetBruto21)}</td><td class="num">${eur(q.verschuldigdBtw21)}</td>
        <td class="num">${eur(q.omzetBruto9)}</td><td class="num">${eur(q.verschuldigdBtw9)}</td>
        <td class="num">${eur(q.omzetBrutoVerlegd)}</td>
        <td class="num">${eur(q.kostenBruto)}</td><td class="num">${eur(q.voorbelasting)}</td>
        <td class="num">${eur(Math.abs(saldo))} ${saldo >= 0 ? "te betalen" : "terug te vragen"}</td>
      </tr>`;
    })
    .join("");

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
  if (dgaSalarisDitJaar > 0 && !gebruikelijkLoon.voldoetVermoedelijk) openPunten.push(`DGA-salaris (${eur(dgaSalarisDitJaar)}${bijtellingPrivegebruikAuto > 0 ? ` + bijtelling auto ${eur(bijtellingPrivegebruikAuto)}` : ""}) lijkt onder het gebruikelijk loon van ${eur(gebruikelijkLoon.minimum)} te liggen`);
  if (bijtellingPrivegebruikAuto > 0) {
    openPunten.push(
      `Bijtelling privégebruik auto (financial lease, ${eur(bijtellingPrivegebruikAuto)}) — dit is geen correctie op de winst/Vpb, maar hoort als loon in natura bij het DGA-salaris. Check of dit is verwerkt in de loonheffing.`
    );
  }

  // v161: "Overige autokosten" (MRB, verzekering, brandstof, parkeren, onderhoud) staat sinds die
  // versie niet meer standaard in ib.overigeBedrijfskosten (dat schuift bij de zzp-aangifte naar de
  // nieuwe "Auto's en machines"-post, zie aangiftevoorstel.js) — de BV-aangifte heeft die post niet
  // (geen bijtellingsmechanisme voor een BV/DGA-auto in deze tool), dus hier gewoon weer meetellen
  // als vanouds, ongewijzigd gedrag voor bestaande BV-dossiers.
  const overigeBedrijfskostenMetAuto = ib.autokostenOverig.totaal > 0
    ? [ib.autokostenOverig, ...ib.overigeBedrijfskosten]
    : ib.overigeBedrijfskosten;

  const kostenTotaal =
    (ib.inkoopkosten.totaal || 0) +
    (ib.afschrijvingen.berekendeApparatuurAfschrijving ?? ib.afschrijvingen.apparatuurInvestering ?? 0) +
    overigeBedrijfskostenMetAuto.reduce((a, r) => a + (r.totaal || 0), 0) +
    ib.nogNietIngedeeld.reduce((a, r) => a + (r.totaal || 0), 0) +
    renteAftrekbaar;

  const samenvattingHtml = `
  <div class="samenvatting">
    <div class="samenvatting-kerncijfers">
      <div><span class="label">Resultaat vóór Vpb</span><span class="bedrag">${eur(summary.winst)}</span></div>
      <div><span class="label">Omzet</span><span class="bedrag">${eur(ib.opbrengsten.totaal)}</span></div>
      <div><span class="label">Zakelijke kosten</span><span class="bedrag">${eur(kostenTotaal)}</span></div>
      <div><span class="label">Geschatte Vpb*</span><span class="bedrag">${eur(vpbEstimate.belasting)}</span></div>
      <div><span class="label">Resultaat ná Vpb</span><span class="bedrag">${eur(summary.winst - vpbEstimate.belasting)}</span></div>
    </div>
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
    overigeBedrijfskostenMetAuto.length > 0
      ? `
  <div class="rubriek"><span>4. Overige bedrijfskosten</span><span></span></div>
  <p class="toelichting">Bedragen zijn netto (exclusief BTW).</p>
  ${overigeBedrijfskostenMetAuto
    .map((r) => `<div class="subrubriek"><span>${esc(r.naam)}</span><span class="num">${eur(r.totaal)}</span></div>${categorieDetailHtml(r.perCategorie)}`)
    .join("")}`
      : "";

  const financieelTotaalRente = ib.financieleBatenLasten.renteLeningen + ib.financieleBatenLasten.renteLease;
  const financieelTotaalAflossing = ib.financieleBatenLasten.aflossingLeningen + ib.financieleBatenLasten.aflossingLease;
  const financieelHtml =
    financieelTotaalRente > 0 || ib.leningenTotal > 0 || ib.leaseFinancieelTotal > 0
      ? `
  <div class="rubriek"><span>5. Financiële baten en lasten</span><span class="num">${eur(financieelTotaalRente)}</span></div>
  <p class="toelichting">${ib.financieleBatenLasten.toelichting} Aflossing (niet aftrekbaar): ${eur(financieelTotaalAflossing)}.${
          ib.financieleBatenLasten.onvolledig > 0 ? ` ⚠ ${ib.financieleBatenLasten.onvolledig} lening(en)/leasecontract(en) nog niet volledig ingevuld in de tool.` : ""
        }${
          ib.financieleBatenLasten.renteNietBerekenbaar > 0
            ? ` ⚠ Bij ${ib.financieleBatenLasten.renteNietBerekenbaar} leasecontract(en) kon het rentepercentage niet berekend worden, omdat de ingevulde bedragen niet bij elkaar aansluiten (de opgetelde termijnen dekken de te financieren hoofdsom niet) — controleer de invoer bij dat leasecontract. De rente hierover ontbreekt hierdoor (nog) in dit cijfer.`
            : ""
        }</p>
  ${categorieDetailHtml([
    { categorie: "Rente Leningen", totaal: ib.financieleBatenLasten.renteLeningen },
    { categorie: "Rente Lease (financieel)", totaal: ib.financieleBatenLasten.renteLease },
  ])}`
      : "";

  const nogNietIngedeeldHtml =
    ib.nogNietIngedeeld.length > 0
      ? `
  <div class="rubriek"><span>Nog niet ingedeeld in deze structuur</span><span></span></div>
  ${ib.nogNietIngedeeld.map((r) => `<div class="subrubriek"><span>${esc(r.categorie)}</span><span class="num">${eur(r.totaal)}</span></div>`).join("")}`
      : "";

  // BV-specifiek blok: gebeurtenissen die de winst NIET raken (balansmutaties) — rekening-courant,
  // kapitaalstorting en dividend staan hier bewust apart van de winst-en-verliesrekening hierboven.
  const bvBalansHtml = `
  <h2>Rekening-courant, kapitaal en dividend</h2>
  <p class="toelichting">Dit zijn balansmutaties — ze tellen niet mee in het resultaat vóór Vpb hierboven.</p>
  <table>
    <thead><tr><th></th><th class="num">Dit jaar</th><th class="num">Stand/cumulatief eind ${year}</th></tr></thead>
    <tbody>
      <tr><td>Rekening-courant DGA (mutatie / stand)</td><td class="num">${eur(rc.mutatieDitJaar)}</td><td class="num">${eur(rc.standEindJaar)}</td></tr>
      <tr><td>Kapitaalstorting</td><td class="num">${eur(ev.kapitaalstorting)}</td><td class="num">—</td></tr>
      <tr><td>Dividenduitkering aan DGA privé</td><td class="num">${eur(ev.dividend)}</td><td class="num">—</td></tr>
      <tr class="total"><td>Indicatief eigen vermogen (cumulatief binnen dit rapport)</td><td class="num">—</td><td class="num">${eur(ev.standEindJaar)}</td></tr>
    </tbody>
  </table>
  <p class="toelichting">
    Het cumulatieve eigen vermogen begint bij het eerste jaar in dít rapport, niet noodzakelijk bij de
    oprichtingsdatum van de BV — jaren van vóór de geselecteerde periode tellen hier niet in mee. Rekening-courant
    boven ca. €500.000 kent aparte regels (excessief lenen bij eigen vennootschap) die deze tool niet toetst.
  </p>
  ${dgaSalarisDitJaar > 0 || bijtellingPrivegebruikAuto > 0 ? `<p class="toelichting">Gebruikelijk-loonregeling: DGA-salaris ${eur(dgaSalarisDitJaar)}${
    bijtellingPrivegebruikAuto > 0 ? ` + bijtelling privégebruik auto ${eur(bijtellingPrivegebruikAuto)} (loon in natura) = ${eur(dgaSalarisDitJaar + bijtellingPrivegebruikAuto)}` : ""
  } ${gebruikelijkLoon.voldoetVermoedelijk ? "voldoet vermoedelijk aan" : `lijkt ónder`} het wettelijk minimum van ${eur(gebruikelijkLoon.minimum)} voor ${year}${gebruikelijkLoon.geëxtrapoleerd ? " (minimum van dit jaar nog niet bekend, benaderd met het meest recente bekende bedrag)" : ""} — puur een signaal, geen definitieve toets.${
    bijtellingPrivegebruikAuto > 0 ? " De bijtelling zelf verandert de winst/Vpb-berekening niet — die blijft op vennootschapsniveau ongewijzigd (leasekosten blijven volledig aftrekbaar)." : ""
  }</p>` : ""}
  ${dividendDitJaar > 0 ? `<p class="toelichting">${
    heeftHolding
      ? `Je gaf aan dat er een holding boven deze BV staat: een winstuitkering van deze werkmaatschappij naar de holding valt onder de deelnemingsvrijstelling (geen box 2 hierover) — box 2 speelt pas als de holding op haar beurt aan de DGA privé uitkeert, wat deze tool niet ziet (die bankmutatie staat niet op dit dossier). Het hieronder getoonde bedrag (<strong>${eur(box2Estimate.belasting)}</strong>) gaat dus uit van een rechtstreekse uitkering aan de DGA privé — controleer of dat hier daadwerkelijk is gebeurd.`
      : `Geschatte box 2-belasting van de DGA over deze dividenduitkering: <strong>${eur(box2Estimate.belasting)}</strong>${box2Estimate.geëxtrapoleerd ? " (box 2-tarief van dit jaar nog niet bekend, benaderd met het dichtstbijzijnde bekende tarief)" : ""} — geen belastingadvies.`
  }</p>` : ""}`;

  return `
  <h1>Indicatieve aangifteberekening BV / fiscale reconstructie — ${year}</h1>
  <p class="subtitle">
    Status: ${STATUS_EMOJI[yearStatus]} ${STATUS_TEKST[yearStatus]} · Gewone BTW-plicht (KOR niet van toepassing voor een BV) ·
    op basis van beschikbare bankgegevens
  </p>
  ${samenvattingHtml}

  <h2>Resultatenrekening — vóór vennootschapsbelasting</h2>
  <div class="wvr">
    ${rubriekBlok(1, ib.opbrengsten.naam, ib.opbrengsten.totaal, "Netto (exclusief BTW).", ib.opbrengsten.perCategorie)}
    ${rubriekBlok(2, ib.inkoopkosten.naam, ib.inkoopkosten.totaal, `${ib.inkoopkosten.toelichting} Bedragen zijn netto (exclusief BTW).`, ib.inkoopkosten.perCategorie)}
    ${rubriekBlok(
      3, ib.afschrijvingen.naam,
      ib.afschrijvingen.berekendeApparatuurAfschrijving ?? ib.afschrijvingen.apparatuurInvestering,
      ib.afschrijvingen.toelichting + (ib.afschrijvingen.activaOnvolledig > 0 ? ` ⚠ ${ib.afschrijvingen.activaOnvolledig} bedrijfsmiddel(en) nog niet volledig ingevuld bij Activa.` : ""),
      ib.afschrijvingen.perCategorie
    )}
    ${overigeBedrijfskostenHtml}
    ${financieelHtml}
    <div class="rubriek total"><span>Resultaat vóór Vpb</span><span class="num">${eur(summary.winst)}</span></div>
    <div class="rubriek"><span>Geschatte vennootschapsbelasting*</span><span class="num">${eur(vpbEstimate.belasting)}</span></div>
    <div class="rubriek total"><span>Resultaat ná Vpb</span><span class="num">${eur(summary.winst - vpbEstimate.belasting)}</span></div>
    ${nogNietIngedeeldHtml}
  </div>

  ${bvBalansHtml}

  ${kwartalen.length > 0 ? `
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
  <p class="vergelijk-hint">Vergelijk het saldo per kwartaal hierboven met wat er daadwerkelijk is aangegeven en betaald.</p>

  <h3>Onderliggende bankanalyse</h3>
  <table>
    <thead><tr>
      <th>Kwartaal</th><th class="num">Omzet 21%</th><th class="num">BTW 21% (1a)</th>
      <th class="num">Omzet 9%</th><th class="num">BTW 9% (1b)</th><th class="num">Omzet verlegd (1e)</th>
      <th class="num">Uitgaven</th><th class="num">Voorbelasting (5b)</th><th class="num">Saldo</th>
    </tr></thead>
    <tbody>${kwartaalRows}</tbody>
  </table>` : ""}

  <h2>Categorieoverzicht — Zakelijk (bijlage, alle categorieën)</h2>
  <table>
    <thead><tr><th>Categorie</th><th class="num">Bruto</th><th class="num">Netto</th><th class="num">BTW</th></tr></thead>
    <tbody>${catRows}</tbody>
    <tfoot><tr class="total"><td>Totaal</td><td class="num">${eur(zakGrandTotal)}</td><td class="num">${eur(zakGrandTotal - zakGrandBtw)}</td><td class="num">${eur(zakGrandBtw)}</td></tr></tfoot>
  </table>

  ${algemeneGegevensHtml}`;
}

export function buildAangiftevoorstelBvHtml(yearsToInclude, classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, heeftVoorraad, importDiagnostics, accountTypeByFile, fileContinuity, kwartaalStatus, heeftHolding) {
  // Rekening-courant en eigen vermogen zijn cumulatief — over de jaren in dít rapport (zie de
  // toelichting die bij elk jaar wordt getoond). Winst per jaar wordt hier apart bepaald (los van
  // buildYearSectionBv) omdat resultaatNaVpbPerJaar voor ALLE jaren in dit rapport bekend moet zijn
  // vóórdat de cumulatieve reeks kan worden opgebouwd.
  const jaren = [...yearsToInclude].sort((a, b) => a - b);
  const resultaatNaVpbPerJaar = {};
  // v183: apart bepaald zodat computeActivaAfschrijvingForYear elk jaar dezelfde afschrijving
  // meetelt als buildYearSectionBv verderop (zie de toelichting daar).
  const activaSummaryVoorReserve = computeActivaSummary(classified);
  for (const year of jaren) {
    const loanRenteForYear = computeLoanRenteForYear(loanSummary || [], loanDetails || {}, year);
    const leaseRenteForYear = computeLeaseRenteForYear(leaseSummary || [], leaseDetails || {}, year, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate);
    const renteAftrekbaar = (loanRenteForYear?.totaalRente || 0) + (leaseRenteForYear?.totaalRente || 0);
    const activaAfschrijvingForYear = computeActivaAfschrijvingForYear(activaSummaryVoorReserve, activaDetails || {}, year);
    const summary = computeYearlySummary(classified, year, categoryBtwRates, btwVerlegd, [], [], [], renteAftrekbaar, activaAfschrijvingForYear?.totaalAfschrijving || 0);
    const vpbEstimate = estimateVpb(summary.winst, year);
    resultaatNaVpbPerJaar[year] = summary.winst - vpbEstimate.belasting;
  }
  const rcVerloop = computeRekeningCourantVerloop(classified, jaren);
  const evVerloop = computeEigenVermogenVerloop(classified, jaren, resultaatNaVpbPerJaar);

  const sections = jaren
    .map((year) =>
      buildYearSectionBv(
        year, classified, categoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides,
        loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, importDiagnostics, accountTypeByFile,
        fileContinuity, kwartaalStatus, rcVerloop, evVerloop, heeftHolding
      )
    )
    .join('\n  <div style="page-break-before: always;"></div>\n');

  return `<!DOCTYPE html>
<html lang="nl"><head><meta charset="utf-8"><title>Indicatieve aangifteberekening BV ${jaren.join(", ")}</title>
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
  .samenvatting { margin: 0 0 20px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; page-break-inside: avoid; }
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
  .bv-melding { margin: 0 0 20px; padding: 10px 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; color: #78350f; font-size: 10.5px; line-height: 1.5; }
  @page { size: A4 portrait; margin: 16mm; }
</style></head>
<body>
  <p class="subtitle">Gegenereerd op ${new Date().toLocaleDateString("nl-NL")}</p>
  <div class="bv-melding">
    <strong>De BV-tak van deze tool is nog in ontwikkeling.</strong> Deze reconstructie neemt geen holdingstructuur,
    fiscale eenheid of meerdere aandeelhouders mee, en de balans is beperkt tot rekening-courant en een indicatief
    eigen-vermogen-verloop (geen volledige jaarrekening). Gebruik dit als hulpmiddel, niet als vervanging van je
    boekhouder of accountant.
  </div>
  ${sections}
  <div style="page-break-before: always;"></div>
  <h2>Lees dit voordat je de cijfers gebruikt</h2>
  <div class="controledoel">
    <strong>Waar is dit voor?</strong> Dit overzicht is een <strong>onafhankelijke reconstructie</strong>: het laat
    zien wat er volgens uitsluitend de bankgegevens van de werkmaatschappij aan resultaat, Vpb en balansmutaties
    zou moeten zijn. Vergelijk de bedragen hierboven gerust met een eerder ingediende aangifte of jaarrekening —
    maar een verschil betekent niet automatisch dat er iets misging, en ook niet automatisch dat deze reconstructie
    klopt.
  </div>
  <div class="onzekerheden">
    <strong>Wat deze tool niet kan weten</strong>
    <p>Deze reconstructie is gebaseerd op uitsluitend de banktransacties van de werkmaatschappij. Een aantal dingen
    dat voor de jaarrekening/aangifte relevant is, staat niet (of niet volledig) op deze bankrekening:</p>
    <ul>
      <li>Contante ontvangsten en uitgaven</li>
      <li>Openstaande facturen — debiteuren en crediteuren die aan het einde van het jaar nog niet via de bank zijn verwerkt</li>
      <li>Voorraad — inkoop- en verkoopwaarde van onverkochte goederen${heeftVoorraad ? " (je gaf aan dat er voorraad is — dat vraagt een eigen registratie, dit overzicht neemt dat niet mee)" : ""}</li>
      <li>${heeftHolding ? "De holdingstructuur die je hebt aangegeven — bankmutaties van de holding zelf (kapitaalstorting bij oprichting, doorbetaalde dividenden, eventuele activa) worden hier niet meegenomen, alleen die van de werkmaatschappij hierboven" : "Een eventuele holdingstructuur — bankmutaties van een holding boven deze werkmaatschappij worden hier niet meegenomen"}</li>
      <li>Voorzieningen, langlopende schulden en overige balansposten van een volledige jaarrekening</li>
      <li>Correcties, memoriaalboekingen of suppleties uit een eerdere administratie</li>
    </ul>
  </div>
  <div class="disclaimer">
    Dit is een <strong>voorstel</strong>, samengesteld uit je eigen bankgegevens en categorie-indeling in deze tool —
    geen officiële aangifte, geen jaarrekening en geen belastingadvies. Controleer de cijfers altijd zelf of met je
    boekhouder/accountant voordat je aangifte doet.
  </div>
</body></html>`;
}

export function downloadAangiftevoorstelBv(html, years) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Indicatieve_aangifteberekening_BV_${years.join("-")}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
