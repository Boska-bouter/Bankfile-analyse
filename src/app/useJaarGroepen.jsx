// Groepen per jaar, percentages, btw per kwartaal en de jaar-samenvattingen voor het actieve jaar.
// nieuw-V1R0 — uit App.jsx gehaald (opruimronde 9-11). Alle invoer komt binnen via `invoer`; namen die App pas later maakt via invoer.appLaat.
import { PRIVE_ONLY_HUISVESTING_STANDAARD_NUL } from "./constanten.js";
import { autoPriveMarkering, leaseGroepen, registreerEenvoudigLease } from "../tax/eenvoudigLease.js";
import { computeBtwPrivegebruikAuto } from "../tax/btwPrivegebruikAuto.js";
import { computeBvSignalering, computeEigenVermogenVerloop, computeRekeningCourantVerloop } from "../tax/bv.js";
import { computePeriodeMismatches } from "../tax/periodDetection.js";
import { computeQuarterlyBtwForYear, computeQuarterlyCostBreakdown, computeYearlyCostBreakdown } from "../tax/btw.js";
import { computeSplitsbareCategorieTotalenVoorJaar, heeftGeregistreerdeAutoOpDeZaak } from "../tax/categorySplit.js";
import { estimateVpb } from "../tax/vpb.js";
import { lijstPrivegebruikAutos } from "../tax/privegebruikAuto500.js";
import { normKey } from "../utils/normalization.js";
import { percentagesMetWerkruimte } from "../tax/werkruimte.js";
import { useBelastingTotaalJaar } from "../calc/useBelastingTotaalJaar.jsx";
import { useDashboardVpbBreakdown } from "../calc/useDashboardVpbBreakdown.jsx";
import { useHoldingSummaryCard } from "../calc/useHoldingSummaryCard.jsx";
import { useJaarBerekening } from "../calc/useJaarBerekening.jsx";
import { useMemo } from "react";

export function useJaarGroepen(invoer) {
  const { accountTypeByFile, activaDetails, activaSummary, activeYear, autoActivaDetails, autoStatus, autoWizardStatus, bevestigdInBulkVenster, bevestigdeControles, btwVerlegd, categoryZakelijkPercentage, classified, eenvoudigActief, effectiveCategoryBtwRates, eigenRekeningenExtra, eigenRekeningenGeladen, energieZakelijkPercentageStatus, fixedCategories, gemeentelijkeKostenZakelijkPercentageStatus, groups, heeftHolding, holdingBoekingen, holdingBoekingenSectionRef, huurZakelijkPercentageStatus, importDiagnostics, kmVergoedingDetails, korRegeling, kwartaalStatus, leaseDetails, leaseSummary, loanDetails, loanSummary, modus, overigInkomenBox1, ownAccountByFile, periodeQuarterOverrides, priveAntwoorden, rechtsvorm, reviewedOverigKeys, reviewedPeriodeKeys, reviewedPersonKeys, setBevestigdeControles, setPeriodeQuarterOverrides, setReviewedPeriodeKeys, setShowHoldingBoekingen, snapshotBeforeAction, startersaftrekEff, tariefOverrides, voorbelastingExcluded, werkruimteStatus, years, zaLegacyJaDefault, zelfstandigenaftrekStatus } = invoer;
  const jumpToSection = (...args) => invoer.appLaat.jumpToSection(...args);
  const yearCoverage = useMemo(() => {
    const c = {};
    for (const g of groups) {
      if (!g.items || g.items.length === 0) continue;
      const e = (c[g.year] ||= { zakelijk: false, prive: false, zakelijkBestanden: 0, priveBestanden: 0 });
      if (g.type === "Zakelijk") e.zakelijk = true; else e.prive = true;
    }
    // Aantal bestanden per type dat het jaar overlapt (op basis van de periode van elk bestand).
    for (const [jaar, e] of Object.entries(c)) {
      const start = new Date(Number(jaar), 0, 1), eind = new Date(Number(jaar), 11, 31, 23, 59, 59);
      for (const d of importDiagnostics || []) {
        if (!d.from || !d.to || d.from > eind || d.to < start) continue;
        if (accountTypeByFile[d.fileName] === "Prive") e.priveBestanden++; else e.zakelijkBestanden++;
      }
      // De bestanden zelf bepalen wat er geladen is: een privé-boeking op een zakelijke rekening maakt
      // wel een "Prive"-groep, maar is geen privé-bestand.
      if (e.zakelijkBestanden + e.priveBestanden > 0) { e.zakelijk = e.zakelijkBestanden > 0; e.prive = e.priveBestanden > 0; }
      if (e.zakelijk && !e.zakelijkBestanden) e.zakelijkBestanden = 1;
      if (e.prive && !e.priveBestanden) e.priveBestanden = 1;
    }
    return c;
  }, [groups, importDiagnostics, accountTypeByFile]);
  // release22V10 — rekeningnummer(s) bij de categorietabellen: de geladen rekeningen waarvan dit jaar
  // transacties in de tabel staan, plus de bij Eigen rekeningen opgegeven (niet geladen) rekeningen van die soort.
  const ibanTekst = (iban) => String(iban).replace(/\s/g, "").toUpperCase().replace(/(.{4})(?=.)/g, "$1 ");
  const rekeningenVoorGroep = (group, soort) => {
    const gezien = new Set();
    const lijst = [];
    for (const tx of group?.items || []) {
      if (tx.isMirror) continue;
      const iban = ownAccountByFile[tx.source];
      const id = iban ? normKey(iban) : `bestand:${tx.source}`;
      if (gezien.has(id)) continue;
      gezien.add(id);
      lijst.push({ id, tekst: iban ? ibanTekst(iban) : String(tx.source || "onbekend bestand") });
    }
    for (const r of eigenRekeningenExtra || []) {
      if (!r?.iban || r.accountType !== soort) continue;
      const id = normKey(r.iban);
      if (gezien.has(id)) continue;
      gezien.add(id);
      lijst.push({ id, tekst: ibanTekst(r.iban), opgegeven: true });
    }
    return { lijst, leegTekst: soort === "Zakelijk" ? "Geen zakelijke rekening geladen of opgegeven" : "Geen privérekening geladen of opgegeven" };
  };
  const zakGroupForYear = groups.find((g) => g.year === activeYear && g.type === "Zakelijk") || { label: `Zakelijk ${activeYear}`, type: "Zakelijk", year: activeYear, items: [] };
  const priGroupForYear = groups.find((g) => g.year === activeYear && g.type === "Prive") || { label: `Privé ${activeYear}`, type: "Prive", year: activeYear, items: [] };
  // V46 — privé-only dossier: de privékant toont álle transacties van de rekening (ook die met een
  // zakelijke categorie, die aan de zakelijke kant gespiegeld staan). Alleen voor weergave; controles
  // en checklists blijven op `priGroupForYear` rekenen zodat niets dubbel geteld wordt.
  const priGroupShown = useMemo(() => {
    if (Object.values(accountTypeByFile).includes("Zakelijk")) return priGroupForYear;
    const extra = zakGroupForYear.items.filter((t) => !t.isMirror);
    return extra.length ? { ...priGroupForYear, items: [...priGroupForYear.items, ...extra].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)) } : priGroupForYear;
  }, [priGroupForYear, zakGroupForYear, accountTypeByFile]);
  // V28 — in de detailtabellen telt een "Overig"/personen-transactie die je in het opschoonvenster met
  // "Klopt zo" hebt bevestigd als 🟢 (zoals de controlekaart dat al deed); anders bleef hij daar 🟡
  // staan en klopte "Controleren (N)" niet met "Classificatie zekerheid 0".
  const metBevestiging = (g) => {
    if (!g.items.some(bevestigdInBulkVenster)) return g;
    return { ...g, items: g.items.map((t) => (bevestigdInBulkVenster(t) ? { ...t, confidence: { ...t.confidence, level: "override", label: "Bevestigd in het opschoonvenster (Klopt zo)" } } : t)) };
  };
  const zakGroupWeergave = useMemo(() => metBevestiging(zakGroupForYear), [zakGroupForYear, reviewedOverigKeys, reviewedPersonKeys]);
  const priGroupWeergave = useMemo(() => metBevestiging(priGroupShown), [priGroupShown, reviewedOverigKeys, reviewedPersonKeys]);

  // Zodra er ÉÉN auto-op-de-zaak geregistreerd staat — financiële lease (soort "auto"), koop, of
  // operationele lease — tellen computeLeaseAutoKostenVoorJaar (autoBijtelling.js) resp.
  // computeAutoActivaKostenVoorJaar (autoActiva.js) voor ELK jaar 100% van Brandstof/Parkeren mee —
  // ongeacht wat autoStatus voor dat jaar zegt. De generieke %-splitsing hieronder moet die twee
  // categorieën daarom ook mijden zodra dit dossierbreed het geval is, niet alleen in een jaar met
  // expliciet "Auto op de zaak" (zie heeftGeregistreerdeAutoOpDeZaak in tax/categorySplit.js).
  // Dossierbreed (geen jaarfilter) omdat de bronnen zelf dat ook niet hebben.
  const priveOnlyDossier = useMemo(() => {
    const types = Object.values(accountTypeByFile);
    return types.includes("Prive") && !types.includes("Zakelijk");
  }, [accountTypeByFile]);
  const categoryZakelijkPercentageEff0 = useMemo(() => {
    // release20V3: een jaar met "werkruimte niet zelfstandig" telt huur/energie/gemeentelijke lasten voor 0% mee.
    const basis = percentagesMetWerkruimte(categoryZakelijkPercentage, werkruimteStatus, [...new Set(classified.map((tx) => tx.year))]);
    if (!priveOnlyDossier) return basis;
    const jaren = [...new Set(classified.map((tx) => tx.year))];
    const result = { ...basis };
    for (const cat of PRIVE_ONLY_HUISVESTING_STANDAARD_NUL) {
      const perJaar = { ...(result[cat] || {}) };
      for (const y of jaren) if (perJaar[y] == null) perJaar[y] = 0;
      result[cat] = perJaar;
    }
    return result;
  }, [priveOnlyDossier, categoryZakelijkPercentage, classified, werkruimteStatus]);
  // beide-V9R7 — lease in Eenvoudig (tax/eenvoudigLease.js): auto of apparatuur, en > 500 km privé → autokosten vallen weg.
  const eenvoudigLease = bevestigdeControles?.eenvoudigLease || null;
  const leaseGroepenEenv = useMemo(() => leaseGroepen(leaseSummary, eenvoudigLease), [leaseSummary, eenvoudigLease]);
  const autoExactIngevuld = useMemo(() => lijstPrivegebruikAutos({ leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus }).length > 0,
    [leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus]);
  registreerEenvoudigLease({ groepen: leaseGroepenEenv, antwoorden: eenvoudigLease, exact: autoExactIngevuld }); // btw-correctie (tax/btwPrivegebruikAuto.js)
  const categoryZakelijkPercentageEff = useMemo(() => {
    const m = autoPriveMarkering(leaseGroepenEenv, eenvoudigLease, autoStatus, autoExactIngevuld);
    return m ? { ...categoryZakelijkPercentageEff0, __eenvoudigAutoPrive: m } : categoryZakelijkPercentageEff0;
  }, [categoryZakelijkPercentageEff0, leaseGroepenEenv, eenvoudigLease, autoStatus, autoExactIngevuld]);
  const zetEenvoudigLease = (veld, sleutel, waarde) => {
    snapshotBeforeAction("Lease-antwoord ingevuld");
    setBevestigdeControles((prev) => {
      const oud = prev?.eenvoudigLease || {};
      return { ...(prev || {}), eenvoudigLease: { ...oud, [veld]: { ...(oud[veld] || {}), [sleutel]: waarde } } };
    });
  };
  const heeftLeaseAutoDossierBreed = useMemo(
    () => heeftGeregistreerdeAutoOpDeZaak(leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus),
    [leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus]
  );
  // V15 — lichte periode-melding in het BTW-per-kwartaal-venster (alleen het actieve jaar).
  const periodeSignalenActiefJaar = useMemo(
    () => (activeYear ? computePeriodeMismatches(classified, reviewedPeriodeKeys, periodeQuarterOverrides).filter((m) => m.boekingKwartaal.startsWith(`${activeYear}-`) || m.voorgesteldKwartaal.startsWith(`${activeYear}-`)) : []),
    [classified, reviewedPeriodeKeys, periodeQuarterOverrides, activeYear]
  );
  const confirmPeriodeAsIs = (tx) => {
    snapshotBeforeAction("Periode laten staan");
    setReviewedPeriodeKeys((prev) => (prev.includes(tx.id) ? prev : [...prev, tx.id]));
  };
  const movePeriodeToQuarter = (tx, quarterKey) => {
    snapshotBeforeAction("Periode verplaatst");
    setPeriodeQuarterOverrides((prev) => ({ ...prev, [tx.id]: quarterKey }));
  };
  // Btw-correctie privégebruik auto (alleen zzp) — zie tax/btwPrivegebruikAuto.js.
  const btwPrivegebruikAutoActiefJaar = useMemo(
    () => (activeYear ? computeBtwPrivegebruikAuto(activeYear, { leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus, autoStatus, classified, categoryBtwRates: effectiveCategoryBtwRates, btwVerlegd, rechtsvorm }) : null),
    [activeYear, leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus, autoStatus, classified, effectiveCategoryBtwRates, btwVerlegd, rechtsvorm, eenvoudigLease, leaseGroepenEenv, autoExactIngevuld]
  );
  const quarterlyBtwData = useMemo(
    () => (activeYear ? computeQuarterlyBtwForYear(classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, btwPrivegebruikAutoActiefJaar) : []),
    [classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, btwPrivegebruikAutoActiefJaar]
  );
  // Uitsluitend voor de "Uitgaven (netto)"-pop-up: dezelfde indeling als hierboven, alleen per
  // categorie apart gehouden — geen nieuwe berekening, puur het al berekende bedrag herleidbaar
  // maken.
  const costBreakdownByQuarter = useMemo(
    () => (activeYear ? computeQuarterlyCostBreakdown(classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed) : {}),
    [classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed]
  );
  // Zelfde soort uitsplitsing, maar per jaar in één keer — voor de pop-ups bij "Voorbelasting" en
  // "Zakelijk totaal (netto)" in het meerjarenoverzicht.
  const costBreakdownByYear = useMemo(() => {
    const map = {};
    for (const year of years) {
      map[year] = computeYearlyCostBreakdown(classified, year, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed);
    }
    return map;
  }, [classified, years, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed]);
  // Totalen per (splitsbare) categorie voor het actieve jaar — voor CategoryPercentagePanel, zodat
  // die alleen categorieën toont die dit jaar daadwerkelijk transacties hebben.
  const categorieTotalenActiveYear = useMemo(
    () => (activeYear ? computeSplitsbareCategorieTotalenVoorJaar(classified, activeYear, autoStatus, heeftLeaseAutoDossierBreed) : {}),
    [classified, activeYear, autoStatus, heeftLeaseAutoDossierBreed]
  );
  const { yearlySummaries, yearlyOpenOB, yearlySummary, dashboardAangifteIndicatie, ibEstimate, zvwEstimate, priveOverzicht, gedeeldeEnergieForActiveYear, gedeeldeGemeentelijkeKostenForActiveYear, gedeeldeHuurForActiveYear, ondernemersaftrekPerJaar, fiscaalVoorJaar, kostenTotaalByYear, overigeDelen, eigenPriveIbans } = useJaarBerekening({
    btwVerlegd, korRegeling, rechtsvorm, modus, priveAntwoorden, kwartaalStatus, voorbelastingExcluded, fixedCategories, zelfstandigenaftrekStatus, zaLegacyJaDefault, tariefOverrides, overigInkomenBox1, startersaftrekEff, autoStatus, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, periodeQuarterOverrides, loanDetails, leaseDetails, activaDetails, autoWizardStatus, autoActivaDetails, kmVergoedingDetails, eigenRekeningenExtra, activeYear, eenvoudigActief, effectiveCategoryBtwRates, eigenRekeningenGeladen, classified, loanSummary, leaseSummary, activaSummary, years, eenvoudigLease, categoryZakelijkPercentageEff, heeftLeaseAutoDossierBreed,
  });
  // BV-specifiek: alleen berekend/gebruikt als rechtsvorm === "bv" (zie Meerjarenoverzicht BV en het
  // BV-Aangiftevoorstel), maar hier al altijd bijgehouden — dezelfde Route B-redenering als de rest
  // van de app: deze categorieën bestaan niet in een zzp-dossier, dus deze waarden zijn dan gewoon
  // allemaal 0/leeg en hebben geen enkele invloed op de zzp-weergave.
  const dgaSalarisByYear = useMemo(() => {
    const map = {};
    for (const y of years) {
      map[y] = Math.abs(classified.filter((tx) => tx.category === "DGA-salaris" && !tx.isMirror && tx.year === y).reduce((a, tx) => a + tx.amount, 0));
    }
    return map;
  }, [classified, years]);
  const rcVerloop = useMemo(() => computeRekeningCourantVerloop(classified, years), [classified, years]);
  const evVerloop = useMemo(() => {
    const resultaatNaVpbPerJaar = {};
    for (const y of years) {
      const s = yearlySummaries[y];
      if (s) resultaatNaVpbPerJaar[y] = s.winst - estimateVpb(s.winst, y).belasting;
    }
    return computeEigenVermogenVerloop(classified, years, resultaatNaVpbPerJaar);
  }, [classified, years, yearlySummaries]);
  const bvSignalering = useMemo(
    () => (rechtsvorm === "bv" ? computeBvSignalering(activeYear, yearlySummaries, evVerloop, yearlyOpenOB, years) : null),
    [rechtsvorm, activeYear, yearlySummaries, evVerloop, yearlyOpenOB, years]
  );
  // v282 — BV-equivalent van dashboardAangifteIndicatie hierboven, voor de "Indicatieve
  // vennootschapsbelasting"-kaart in DetailsPanel.jsx (Overzicht-tabblad, sub-tab Jaaroverzicht).
  // Zelfde estimateVpb(...) als evVerloop hierboven en het BV-Aangiftevoorstel — geen nieuwe/
  // afwijkende berekening.
  const dashboardVpbIndicatie = useMemo(() => {
    if (rechtsvorm !== "bv" || !activeYear || !yearlySummary) return null;
    return estimateVpb(yearlySummary.winst, activeYear);
  }, [rechtsvorm, activeYear, yearlySummary]);
  // V16 — optelling onderaan "Details en overzichten": BTW (4 kwartalen) + IB na heffingskorting + Zvw
  // (zzp) of Vpb (BV). Positief = te betalen, negatief = terug te krijgen.
  const belastingTotaalJaar = useBelastingTotaalJaar({
    activeYear, dashboardAangifteIndicatie, dashboardVpbIndicatie, korRegeling, quarterlyBtwData,
    rechtsvorm,
  });
  // v283 — zelfde drieluik (Omzet incl. BTW / Omzet excl. BTW / Zakelijke kosten) als de
  // "kerncijfers"-kaart in het BV-Aangiftevoorstel (reports/aangiftevoorstel-bv.js), nu ook als korte
  // toelichting onder "Indicatieve vennootschapsbelasting" op het Jaaroverzicht. Geen nieuwe
  // berekening: omzetExclBtw = yearlySummary.zakelijkeInkomstenNetto (zelfde definitie als "1.
  // Opbrengsten" in het Aangiftevoorstel), omzetInclBtw = daar de over dit jaar verschuldigde BTW op
  // de omzet (som van box 1a/1b per kwartaal, uit quarterlyBtwData) bovenop, en zakelijkeKosten wordt
  // afgeleid uit winst = omzetExclBtw - kosten (dezelfde identiteit als het Aangiftevoorstel, dat
  // hetzelfde totaal via een andere optelling — inkoop/afschrijving/overig/rente — uitrekent), zodat
  // dit bedrag hier altijd exact aansluit bij "Resultaat vóór Vpb" hierboven.
  const dashboardVpbBreakdown = useDashboardVpbBreakdown({
    activeYear, quarterlyBtwData, rechtsvorm, yearlySummary,
  });
  // v282 — samenvatting van de holding-boekingen voor het actieve jaar, als compacte kaart (zelfde
  // vorm als aannamesCard) voor diezelfde Jaaroverzicht-sub-tab. Herhaalt bewust dezelfde
  // verschil-berekening als de rij voor dit jaar in HoldingBoekingenPanel.jsx — puur een
  // samenvatting/link daarnaartoe, geen nieuwe databron.
  const holdingSummaryCard = useHoldingSummaryCard({
    activeYear, evVerloop, heeftHolding, holdingBoekingen, holdingBoekingenSectionRef,
    jumpToSection: (...a) => jumpToSection(...a), rechtsvorm, setShowHoldingBoekingen,
  });
  return { autoExactIngevuld, belastingTotaalJaar, bvSignalering, categorieTotalenActiveYear, categoryZakelijkPercentageEff, confirmPeriodeAsIs, costBreakdownByQuarter, costBreakdownByYear, dashboardAangifteIndicatie, dashboardVpbBreakdown, dashboardVpbIndicatie, dgaSalarisByYear, eenvoudigLease, eigenPriveIbans, evVerloop, fiscaalVoorJaar, gedeeldeEnergieForActiveYear, gedeeldeGemeentelijkeKostenForActiveYear, gedeeldeHuurForActiveYear, heeftLeaseAutoDossierBreed, holdingSummaryCard, ibEstimate, kostenTotaalByYear, leaseGroepenEenv, movePeriodeToQuarter, ondernemersaftrekPerJaar, overigeDelen, periodeSignalenActiefJaar, priGroupForYear, priGroupShown, priGroupWeergave, priveOnlyDossier, priveOverzicht, quarterlyBtwData, rcVerloop, rekeningenVoorGroep, yearCoverage, yearlyOpenOB, yearlySummaries, yearlySummary, zakGroupForYear, zakGroupWeergave, zetEenvoudigLease, zvwEstimate };
}
