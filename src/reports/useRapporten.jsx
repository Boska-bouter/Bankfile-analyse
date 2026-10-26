// beide-V7R8 — rapporten uit App.jsx gehaald: indicatieve aangifteberekening (voorstel), samenvatting voor de klant,
// onderbouwing en BTW per kwartaal, elk met jaarkeuze en voorbeeldvenster (download, print). App geeft de dossiergegevens
// mee; de hook houdt welk rapport openstaat en geeft de vensters terug als `rapportVensters`.
import { useState } from "react";
import { berekenBetrouwbaarheid, maakBevestigd } from "../calc/eenvoudig.js";
import AangifteVoorstelPreviewModal from "../components/modals/AangifteVoorstelPreviewModal.jsx";
import KlantJaarKeuzeModal from "../components/modals/KlantJaarKeuzeModal.jsx";
import { jarenBereik } from "../dossier/dossierProfiel.js";
import { computeQuarterlyBtwForYear } from "../tax/btw.js";
import { computeBtwPrivegebruikAuto } from "../tax/btwPrivegebruikAuto.js";
import { estimateHeffingskortingenMetOndernemersaftrek, estimateIncomeTaxMetOndernemersaftrek, estimateZvwMetOndernemersaftrek } from "../tax/incomeTax.js";
import { estimateVpb } from "../tax/vpb.js";
import { eur } from "../utils/amounts.js";
import { aandachtspuntenHtml, bepaalAandachtspunten } from "./aandachtspunten.js";
import { buildAangiftevoorstelBvHtml, downloadAangiftevoorstelBv } from "./aangiftevoorstel-bv.js";
import { buildAangiftevoorstelPriveHtml } from "./aangiftevoorstel-prive.js";
import { buildAangiftevoorstelHtml, downloadAangiftevoorstel, stripBronHtml, zonderUitlegHtml } from "./aangiftevoorstel.js";
import { buildBtwOverzichtHtml, downloadBtwOverzicht } from "./btwOverzicht.js";
import { buildKlantSamenvattingHtml, downloadKlantSamenvatting } from "./klantSamenvatting.js";
import { buildOnderbouwingHtml, downloadOnderbouwing } from "./onderbouwing.js";
import { printHtmlDocument } from "./printReport.js";
import { buildPriveSamenvattingHtml } from "./prive/budgetRapport.js";
import { metRapportKop } from "./rapportKop.js";

export function useRapporten({
  accountTypeByFile, activaDetails, activaSummary, activeYear, alleStappen, autoActivaDetails, autoStatus,
  autoWizardStatus, btwVerlegd, categoryZakelijkPercentageEff, classified, dossierProfiel, eenvoudigActief,
  effectiveCategoryBtwRates, eigenNamen, energieZakelijkPercentageStatus, fileContinuity,
  gemeentelijkeKostenZakelijkPercentageStatus, heeftHolding, heeftLeaseAutoDossierBreed, heeftVoorraad,
  huurZakelijkPercentageStatus, importDiagnostics, incompleteLeasesCount, incompleteLoansCount, kmVergoedingDetails,
  korRegeling, kwartaalStatus, leaseDetails, leaseSummary, loanDetails, loanSummary, ondernemersaftrekPerJaar,
  overigInkomenBox1, periodeQuarterOverrides, priveOverzicht, priveRekeningGeladen, rechtsvorm, reviewedOverigKeys,
  reviewedPersonKeys, selectedAangifteYears, setSelectedAangifteYears, setShowAangifteMeerdereJaren,
  setShowAangifteYearPicker, startersaftrekEff, startersaftrekStatus, tariefOverrides, voorbelastingExcluded,
  werkruimteStatus, yearPeriod, yearlySummaries, years, zaLegacyJaDefault, zelfstandigenaftrekStatus,
}) {
  const [aangiftevoorstelPreview, setAangiftevoorstelPreview] = useState(null); // HTML-string of null

  // yearsOverride: gebruikt door de "Voorstel bekijken"-snelknop voor het actieve jaar, die niet
  // wil wachten op de (asynchrone) state-update van selectedAangifteYears. Zonder override wordt
  // gewoon de bestaande jaren-selectie (uit de checkboxes) gebruikt.
  const exportAangiftevoorstel = (yearsOverride) => {
    const targetYears = yearsOverride || selectedAangifteYears;
    if (targetYears.length === 0) {
      window.alert("Selecteer minstens één jaar.");
      return;
    }
    if (yearsOverride) setSelectedAangifteYears(yearsOverride);
    const aandachtspuntenBlok = aandachtspuntenHtml(bepaalAandachtspunten({
      years: targetYears, yearPeriod, classified, incompleteLeases: incompleteLeasesCount, incompleteLoans: incompleteLoansCount,
      zelfstandigenaftrekStatus, startersaftrekStatus, tariefOverrides, overigInkomenBox1, autoStatus, priveRekeningGeladen, heeftVoorraad, rechtsvorm,
    }));
    const html = priveOverzicht
      ? buildAangiftevoorstelPriveHtml({ jaren: [...targetYears].sort(), overzicht: priveOverzicht, namen: eigenNamen })
      : rechtsvorm === "bv"
      ? buildAangiftevoorstelBvHtml(targetYears, classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, heeftVoorraad, importDiagnostics, accountTypeByFile, fileContinuity, kwartaalStatus, heeftHolding, { categoryZakelijkPercentage: categoryZakelijkPercentageEff, autoStatus, heeftLeaseAuto: heeftLeaseAutoDossierBreed, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, aandachtspuntenBlok, werkruimteStatus })
      : buildAangiftevoorstelHtml(targetYears, classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, korRegeling, periodeQuarterOverrides, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, heeftVoorraad, importDiagnostics, accountTypeByFile, fileContinuity, kwartaalStatus, zelfstandigenaftrekStatus, startersaftrekEff, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, autoActivaDetails, autoWizardStatus, kmVergoedingDetails, zaLegacyJaDefault, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, aandachtspuntenBlok, werkruimteStatus);
    setAangiftevoorstelPreview(metRapportKop(html, targetYears));
    setShowAangifteYearPicker(false);
    setShowAangifteMeerdereJaren(false);
  };
  // E2 — samenvatting voor de klant (één pagina, zelfde cijfers als het Overzicht).
  const [klantSamenvattingHtml, setKlantSamenvattingHtml] = useState(null);
  const [klantJaarKeuze, setKlantJaarKeuze] = useState(null); // null = picker dicht, anders gekozen jaren
  const [klantSamenvattingJaren, setKlantSamenvattingJaren] = useState([]);
  const klantJaarData = (y) => {
    const s = yearlySummaries[y];
    if (!s) return { jaar: y, periode: yearPeriod[y]?.label, omzetNetto: null, winst: null, belasting: null };
    let delen = [];
    let btwSaldo = null;
    if (!korRegeling) {
      const q = computeQuarterlyBtwForYear(classified, y, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, computeBtwPrivegebruikAuto(y, { leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus, autoStatus, classified, categoryBtwRates: effectiveCategoryBtwRates, btwVerlegd, rechtsvorm }));
      btwSaldo = [1, 2, 3, 4].reduce((acc, k) => { const r = q.find((i) => i.kwartaal === k); return acc + (r ? r.verschuldigdBtw21 + r.verschuldigdBtw9 - r.voorbelasting + (r.btwPrivegebruikAuto || 0) : 0); }, 0);
    }
    if (rechtsvorm === "bv") {
      delen.push({ label: "Vpb", bedrag: estimateVpb(s.winst, y).belasting || 0 });
    } else {
      const aftrek = ondernemersaftrekPerJaar[y];
      const starters = startersaftrekEff?.[y] === "ja";
      const bedragAftrek = aftrek ? aftrek.zelfstandigenaftrekBedrag + aftrek.startersaftrekBedrag : 0;
      const ib = estimateIncomeTaxMetOndernemersaftrek(s.winst, y, bedragAftrek, starters);
      const hk = estimateHeffingskortingenMetOndernemersaftrek(s.winst, y, bedragAftrek, starters)?.totaal || 0;
      const zvw = estimateZvwMetOndernemersaftrek(s.winst, y, bedragAftrek, starters);
      delen.push({ label: "IB (na heffingskorting)", bedrag: Math.max(0, (ib?.belasting || 0) - hk) });
      delen.push({ label: "Zvw", bedrag: zvw?.bijdrage || 0 });
    }
    return { jaar: y, periode: yearPeriod[y]?.label, omzetNetto: s.zakelijkeInkomstenNetto, winst: s.winst, belasting: { delen, totaal: delen.reduce((a, d) => a + d.bedrag, 0), btw: btwSaldo } };
  };
  const [onderbouwingKeuze, setOnderbouwingKeuze] = useState(null);
  const [onderbouwingHtml, setOnderbouwingHtml] = useState(null);
  const [onderbouwingJaren, setOnderbouwingJaren] = useState([]);
  const openOnderbouwing = (gekozen) => {
    const jaren = [...gekozen].sort();
    if (jaren.length === 0) return;
    setOnderbouwingKeuze(null);
    setOnderbouwingJaren(jaren);
    setOnderbouwingHtml(metRapportKop(buildOnderbouwingHtml({ klantNaam: eigenNamen?.ondernemer, jaren, classified, categoryZakelijkPercentage: categoryZakelijkPercentageEff, werkruimteStatus }), jaren));
  };
  // BTW-aangifte per kwartaal als los document (één of meer jaren).
  const [btwOverzichtKeuze, setBtwOverzichtKeuze] = useState(null);
  const [btwOverzichtHtml, setBtwOverzichtHtml] = useState(null);
  const [btwOverzichtJaren, setBtwOverzichtJaren] = useState([]);
  const openBtwOverzicht = (gekozen) => {
    const jaren = [...gekozen].sort();
    if (jaren.length === 0) return;
    setBtwOverzichtKeuze(null);
    setBtwOverzichtJaren(jaren);
    setBtwOverzichtHtml(metRapportKop(buildBtwOverzichtHtml({
      klantNaam: eigenNamen?.ondernemer, kwartaalStatus,
      jaren: jaren.map((y) => ({
        year: y,
        quarters: computeQuarterlyBtwForYear(classified, y, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, computeBtwPrivegebruikAuto(y, { leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus, autoStatus, classified, categoryBtwRates: effectiveCategoryBtwRates, btwVerlegd, rechtsvorm })),
      })),
    }), jaren));
  };
  const startBtwOverzicht = () => {
    if (!activeYear) return;
    if ((years || []).length > 1) setBtwOverzichtKeuze([activeYear]);
    else openBtwOverzicht([activeYear]);
  };
  const startOnderbouwing = () => {
    if (!activeYear) return;
    if ((years || []).length > 1) setOnderbouwingKeuze([activeYear]);
    else openOnderbouwing([activeYear]);
  };
  const startKlantSamenvatting = () => {
    if (!activeYear) return;
    if ((years || []).length > 1) setKlantJaarKeuze([activeYear]);
    else openKlantSamenvatting([activeYear]);
  };
  const openKlantSamenvatting = (gekozen) => {
    const jaren = [...gekozen].sort();
    if (jaren.length === 0) return;
    setKlantJaarKeuze(null);
    setKlantSamenvattingJaren(jaren);
    if (priveOverzicht) {
      setKlantSamenvattingHtml(metRapportKop(buildPriveSamenvattingHtml({ jaren, overzicht: priveOverzicht, namen: eigenNamen, openPunten: alleStappen.map((s) => ({ label: s.label, count: s.count })) }), jaren));
      return;
    }
    setKlantSamenvattingHtml(metRapportKop(buildKlantSamenvattingHtml({
      klantNaam: eigenNamen?.ondernemer, rechtsvorm,
      jaren: jaren.map(klantJaarData),
      profiel: dossierProfiel,
      openPunten: alleStappen.map((s) => ({ label: s.label, count: s.count })),
      // nieuw-V3R7 — vanuit Eenvoudig: één regel met de zekerheid per jaar (onzeker bedrag in euro's).
      zekerheid: eenvoudigActief ? jaren.map((y) => {
        const z = berekenBetrouwbaarheid(classified, y, maakBevestigd(reviewedOverigKeys, reviewedPersonKeys), yearlySummaries?.[y]?.zakelijkeInkomstenNetto || 0);
        const oordeel = { betrouwbaar: "Betrouwbaar", redelijk: "Redelijk", onzeker: "Nog onzeker", geen: "Geen gegevens" }[z.oordeel];
        return { jaar: y, tekst: z.onzeker > 0 ? `${oordeel} – nog ${eur(Math.round(z.onzeker))} onzeker` : `${oordeel} – niets meer onzeker` };
      }) : null,
      meegenomen: (() => {
        const m = [];
        const act = activaSummary.map((a) => activaDetails[a.key]?.naam || a.naam).filter(Boolean);
        if (act.length) m.push({ label: "Bedrijfsmiddelen (activa)", items: act });
        const len = loanSummary.map((l) => l.name).filter(Boolean);
        if (len.length) m.push({ label: "Leningen", items: len });
        const fin = leaseSummary.filter((l) => l.category === "Lease (financieel)").map((l) => l.name);
        const op = leaseSummary.filter((l) => l.category !== "Lease (financieel)").map((l) => l.name);
        if (fin.length) m.push({ label: "Financiële lease", items: fin });
        if (op.length) m.push({ label: "Operationele lease", items: op });
        const soortTxt = autoWizardStatus?.soort === "financial" ? " (financiële lease)" : autoWizardStatus?.soort === "koop" ? " (gekocht)" : autoWizardStatus?.soort === "operational" ? " (operationele lease)" : "";
        const metJaren = (txt, js) => (jaren.length > 1 ? `${txt} (${jarenBereik(js)})` : txt);
        const priveJ = jaren.filter((j) => autoStatus?.[j] === "prive");
        const zaakJ = jaren.filter((j) => autoStatus?.[j] === "zaak");
        const autoItems = [];
        if (priveJ.length) autoItems.push(metJaren("privéauto zakelijk gebruikt", priveJ));
        if (zaakJ.length) autoItems.push(metJaren(`auto op de zaak${soortTxt}`, zaakJ));
        if (autoItems.length) m.push({ label: "Auto", items: autoItems });
        if (heeftVoorraad === true) m.push({ label: "Voorraad", items: ["aanwezig"] });
        return m;
      })(),
    }), jaren));
  };
  const [uitlegMeenemen, setUitlegMeenemen] = useState(false);
  const voorstelHtmlWeergave = uitlegMeenemen ? aangiftevoorstelPreview : zonderUitlegHtml(aangiftevoorstelPreview);
  const printAangiftevoorstelPreview = () => printHtmlDocument(stripBronHtml(voorstelHtmlWeergave));
  const downloadAangiftevoorstelPreview = (soort) => (rechtsvorm === "bv" ? downloadAangiftevoorstelBv : downloadAangiftevoorstel)(stripBronHtml(voorstelHtmlWeergave), selectedAangifteYears, soort);

  const rapportVensters = (
    <>
      {onderbouwingKeuze && (
        <KlantJaarKeuzeModal years={years} selected={onderbouwingKeuze} setSelected={setOnderbouwingKeuze} onOpen={openOnderbouwing} onClose={() => setOnderbouwingKeuze(null)}
          vraag="Voor welke jaren het onderbouwingsoverzicht?" knop="Onderbouwing tonen" />
      )}
      {onderbouwingHtml && (
        <AangifteVoorstelPreviewModal html={onderbouwingHtml} years={onderbouwingJaren} titel={`Onderbouwing ${jarenBereik(onderbouwingJaren)}`}
          onDownload={(soort) => downloadOnderbouwing(onderbouwingHtml, onderbouwingJaren, soort)} onPrint={() => printHtmlDocument(onderbouwingHtml)} onClose={() => setOnderbouwingHtml(null)} />
      )}
      {btwOverzichtKeuze && (
        <KlantJaarKeuzeModal years={years} selected={btwOverzichtKeuze} setSelected={setBtwOverzichtKeuze} onOpen={openBtwOverzicht} onClose={() => setBtwOverzichtKeuze(null)}
          vraag="Voor welke jaren het BTW-overzicht per kwartaal?" knop="Overzicht tonen" />
      )}
      {btwOverzichtHtml && (
        <AangifteVoorstelPreviewModal html={btwOverzichtHtml} years={btwOverzichtJaren} titel={`BTW per kwartaal ${jarenBereik(btwOverzichtJaren)}`}
          onDownload={(soort) => downloadBtwOverzicht(btwOverzichtHtml, btwOverzichtJaren, soort)} onPrint={() => printHtmlDocument(btwOverzichtHtml)} onClose={() => setBtwOverzichtHtml(null)} />
      )}
      {klantJaarKeuze && (
        <KlantJaarKeuzeModal years={years} selected={klantJaarKeuze} setSelected={setKlantJaarKeuze} onOpen={openKlantSamenvatting} onClose={() => setKlantJaarKeuze(null)} />
      )}
      {klantSamenvattingHtml && (
        <AangifteVoorstelPreviewModal
          html={klantSamenvattingHtml}
          years={klantSamenvattingJaren}
          titel={`Samenvatting voor klant ${jarenBereik(klantSamenvattingJaren)}`}
          onDownload={(soort) => downloadKlantSamenvatting(klantSamenvattingHtml, jarenBereik(klantSamenvattingJaren), soort)}
          onPrint={() => printHtmlDocument(klantSamenvattingHtml)}
          onClose={() => setKlantSamenvattingHtml(null)}
        />
      )}
      {aangiftevoorstelPreview && (
        <AangifteVoorstelPreviewModal
          html={voorstelHtmlWeergave}
          years={selectedAangifteYears}
          uitleg={uitlegMeenemen}
          setUitleg={setUitlegMeenemen}
          onDownload={downloadAangiftevoorstelPreview}
          onPrint={printAangiftevoorstelPreview}
          onClose={() => setAangiftevoorstelPreview(null)}
          extraKnop={{ label: "Onderbouwing tonen", title: "Overzicht van de transacties achter de bedragen in deze berekening", onClick: () => { const jaren = selectedAangifteYears; setAangiftevoorstelPreview(null); openOnderbouwing(jaren); } }}
        />
      )}
    </>
  );

  return {
    exportAangiftevoorstel, setAangiftevoorstelPreview, startBtwOverzicht, startKlantSamenvatting, startOnderbouwing,
    rapportVensters,
  };
}
