import { useMemo } from "react";
import { INCOME_TRANSFER_CATEGORIES } from "../classification/categories.js";
import { computeQuarterlyBtwForYear } from "../tax/btw.js";
import { computeYearlySummary, computeYearlyOpenOB } from "../tax/yearlySummary.js";
import { computeGedeeldeHuurVoorJaar, computeGedeeldeEnergieVoorJaar, computeGedeeldeGemeentelijkeKostenVoorJaar } from "../tax/gedeeldeHuur.js";
import { estimateIncomeTax, estimateZvw, estimateIncomeTaxMetOndernemersaftrek, estimateZvwMetOndernemersaftrek, estimateHeffingskortingenMetOndernemersaftrek } from "../tax/incomeTax.js";
import { useYearlySummaries } from "./useYearlySummaries.jsx";
import { useDashboardAangifteIndicatie } from "./useDashboardAangifteIndicatie.jsx";
import { useKostenTotaalByYear } from "./useKostenTotaalByYear.jsx";
import { useOndernemersaftrekPerJaar } from "./useOndernemersaftrekPerJaar.jsx";
import { usePriveOverzicht } from "./prive/usePriveOverzicht.jsx";
import { computeActivaAfschrijvingForYear } from "../tax/activa.js";
import { computeBvWinstInvoer } from "../reports/aangiftevoorstel-bv.js";
import { computeLoanRenteForYear, computeLeaseRenteForYear } from "../tax/loanAmortization.js";
import { computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate } from "../tax/financialLease.js";
import { computeLeaseAutoKostenVoorJaar } from "../tax/autoBijtelling.js";
import { computeBtwPrivegebruikAuto } from "../tax/btwPrivegebruikAuto.js";
import { computeAutoActivaKostenVoorJaar, combineAutoKosten } from "../tax/autoActiva.js";
import { computeKmVergoedingVoorJaar } from "../tax/kmVergoeding.js";

// beide-V11R8 — uit App.jsx gehaald (opsplitsing): rente, kosten, winst en belasting voor het actieve jaar en per jaar.
export function useJaarBerekening(p) {
  const {
    btwVerlegd, korRegeling, rechtsvorm, modus, priveAntwoorden, kwartaalStatus, voorbelastingExcluded, fixedCategories, zelfstandigenaftrekStatus, zaLegacyJaDefault, tariefOverrides, overigInkomenBox1, startersaftrekEff, autoStatus, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, periodeQuarterOverrides, loanDetails, leaseDetails, activaDetails, autoWizardStatus, autoActivaDetails, kmVergoedingDetails, eigenRekeningenExtra, activeYear, eenvoudigActief, effectiveCategoryBtwRates, eigenRekeningenGeladen, classified, loanSummary, leaseSummary, activaSummary, years, eenvoudigLease, categoryZakelijkPercentageEff, heeftLeaseAutoDossierBreed,
  } = p;

  // Rente-voor-jaar staat hier vóór yearlySummary/yearlySummaries: de winstberekening trekt alleen
  // de aftrekbare rente op leningen/financiële lease af (niet de volledige termijn), dus die rente
  // moet al bekend zijn vóórdat de winst berekend wordt — zie yearlySummary.js voor de achtergrond.
  const loanRenteForYear = useMemo(
    () => (activeYear ? computeLoanRenteForYear(loanSummary, loanDetails, activeYear) : null),
    [loanSummary, loanDetails, activeYear]
  );
  const leaseRenteForYear = useMemo(
    () => (activeYear ? computeLeaseRenteForYear(leaseSummary, leaseDetails, activeYear, computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate) : null),
    [leaseSummary, leaseDetails, activeYear, eenvoudigLease]
  );
  const renteAftrekbaarActiveYear = (loanRenteForYear?.totaalRente || 0) + (leaseRenteForYear?.totaalRente || 0);
  // Financiële-lease-auto/machine kapitalisatie + afschrijving (en bij een auto met privégebruik
  // >500 km/jaar de bijtelling/onttrekking) — zie tax/autoBijtelling.js. Volledig opt-in: null/0
  // zolang geen enkel leasecontract een "soort" heeft ingevuld, dus geen enkele invloed op
  // bestaande dossiers. Bewust alleen voor een zzp-dossier (rechtsvorm !== "bv") — de
  // onttrekkingsberekening hier is de IB-regel voor een eenmanszaak; een BV/DGA heeft een heel
  // andere bijtellingssystematiek (via de loonheffing), die deze app niet nabootst.
  const leaseAutoKostenForActiveYear = useMemo(
    () =>
      activeYear && rechtsvorm !== "bv"
        ? combineAutoKosten(
            computeLeaseAutoKostenVoorJaar(leaseSummary, leaseDetails, activeYear, classified, effectiveCategoryBtwRates, btwVerlegd),
            computeAutoActivaKostenVoorJaar(autoActivaDetails, autoWizardStatus, activeYear, classified, effectiveCategoryBtwRates, btwVerlegd),
            autoStatus, activeYear
          )
        : null,
    [leaseSummary, leaseDetails, activeYear, classified, rechtsvorm, effectiveCategoryBtwRates, btwVerlegd, autoActivaDetails, autoWizardStatus, autoStatus]
  );
  // "Huur (deels zakelijk)" — null zolang er dit jaar geen enkele transactie in deze categorie
  // voorkomt (verreweg de meeste dossiers), dus zonder enige invloed op de winst/voorbelasting
  // hieronder in dat (huidige) geval.
  const gedeeldeHuurForActiveYear = useMemo(
    () => (activeYear ? computeGedeeldeHuurVoorJaar(classified, activeYear, huurZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd) : null),
    [classified, activeYear, huurZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd]
  );
  // v291 — zelfde constructie, nu ook voor "Energie-water (deels zakelijk)"/"Gemeentelijke kosten
  // (deels zakelijk)" (zie tax/gedeeldeHuur.js).
  const gedeeldeEnergieForActiveYear = useMemo(
    () => (activeYear ? computeGedeeldeEnergieVoorJaar(classified, activeYear, energieZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd) : null),
    [classified, activeYear, energieZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd]
  );
  const gedeeldeGemeentelijkeKostenForActiveYear = useMemo(
    () => (activeYear ? computeGedeeldeGemeentelijkeKostenVoorJaar(classified, activeYear, gemeentelijkeKostenZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd) : null),
    [classified, activeYear, gemeentelijkeKostenZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd]
  );
  // Kilometervergoeding voor een privéauto die zakelijk gebruikt wordt (autoStatus "prive")
  // — zie tax/kmVergoeding.js. Zelfde rechtsvorm-beperking als leaseAutoKostenForActiveYear
  // hierboven (alleen zzp/eenmanszaak; een BV/DGA heeft hiervoor een andere systematiek).
  const kmVergoedingForActiveYear = useMemo(
    () => (activeYear && rechtsvorm !== "bv" ? computeKmVergoedingVoorJaar(kmVergoedingDetails, autoStatus, activeYear) : null),
    [kmVergoedingDetails, autoStatus, activeYear, rechtsvorm]
  );
  // "Zakelijk - apparatuur/machines" telt niet als volledige kosten mee in yearlySummary.js (zie de
  // toelichting daar), dus de daadwerkelijk berekende afschrijving moet worden meegeteld in
  // winstCorrectieActiveYear hieronder, exact dezelfde constructie als de financiële-lease-afschrijving.
  const activaAfschrijvingForYear = useMemo(
    () => (activeYear ? computeActivaAfschrijvingForYear(activaSummary, activaDetails, activeYear) : null),
    [activaSummary, activaDetails, activeYear]
  );
  // V23 — BV: afschrijving (en boekresultaat bij beëindiging) van een financiële-lease-auto/machine telt ook op de
  // kaart mee in de winst — zelfde bedrag als in het BV-rapport (computeBvWinstInvoer in aangiftevoorstel-bv.js).
  const bvLeaseAutoWinstCorrectieActiveYear = useMemo(
    () => (activeYear && rechtsvorm === "bv" ? computeBvWinstInvoer(activeYear, classified, effectiveCategoryBtwRates, btwVerlegd, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails, {}).leaseAutoWinstCorrectie : 0),
    [activeYear, rechtsvorm, classified, effectiveCategoryBtwRates, btwVerlegd, loanSummary, loanDetails, leaseSummary, leaseDetails, activaDetails]
  );
  const winstCorrectieActiveYear =
    (leaseAutoKostenForActiveYear?.winstCorrectie || 0) - (gedeeldeHuurForActiveYear?.nietAftrekbaarBedrag || 0) -
    (gedeeldeEnergieForActiveYear?.nietAftrekbaarBedrag || 0) - (gedeeldeGemeentelijkeKostenForActiveYear?.nietAftrekbaarBedrag || 0) +
    (kmVergoedingForActiveYear?.bedrag || 0) + (activaAfschrijvingForYear?.totaalAfschrijving || 0) +
    (bvLeaseAutoWinstCorrectieActiveYear || 0);
  // beide-V8R9 — uitsplitsing van "Overige posten" voor Eenvoudig (vraag Boska 27-10: wat is dat, waar na te kijken?).
  // Teken zoals op de kaart: negatief verlaagt de winst.
  const overigeDelen = [
    kmVergoedingForActiveYear && { label: `Km-vergoeding privéauto: ${Number(kmVergoedingForActiveYear.zakelijkeKilometers).toLocaleString("nl-NL")} km × € ${kmVergoedingForActiveYear.vergoedingPerKm.toFixed(2).replace(".", ",")}`, bedrag: -kmVergoedingForActiveYear.bedrag, km: true },
    activaAfschrijvingForYear?.totaalAfschrijving && { label: "Afschrijving bedrijfsmiddelen", bedrag: -activaAfschrijvingForYear.totaalAfschrijving },
    leaseAutoKostenForActiveYear?.winstCorrectie && { label: "Lease-auto of -machine (afschrijving min privégebruik)", bedrag: -leaseAutoKostenForActiveYear.winstCorrectie },
    bvLeaseAutoWinstCorrectieActiveYear && { label: "Lease (afschrijving)", bedrag: -bvLeaseAutoWinstCorrectieActiveYear },
    (renteAftrekbaarActiveYear - (leaseRenteForYear?.schattingZonderContract || 0)) && { label: "Rente op leningen en lease", bedrag: -(renteAftrekbaarActiveYear - (leaseRenteForYear?.schattingZonderContract || 0)) },
    // beide-V11R6 — financiële lease zonder contractgegevens: geschat (termijnen als rente + afschrijving).
    leaseRenteForYear?.schattingZonderContract && { label: "Financiële lease zonder contract: SCHATTING (termijnen als rente + afschrijving)", bedrag: -leaseRenteForYear.schattingZonderContract },
    ((gedeeldeHuurForActiveYear?.nietAftrekbaarBedrag || 0) + (gedeeldeEnergieForActiveYear?.nietAftrekbaarBedrag || 0) + (gedeeldeGemeentelijkeKostenForActiveYear?.nietAftrekbaarBedrag || 0)) &&
      { label: "Niet-aftrekbaar deel huur, energie en gemeentelijke kosten", bedrag: (gedeeldeHuurForActiveYear?.nietAftrekbaarBedrag || 0) + (gedeeldeEnergieForActiveYear?.nietAftrekbaarBedrag || 0) + (gedeeldeGemeentelijkeKostenForActiveYear?.nietAftrekbaarBedrag || 0) },
  ].filter((d) => d && Math.abs(d.bedrag) >= 0.5);
  const yearlySummary = useMemo(
    () => (activeYear ? computeYearlySummary(classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, INCOME_TRANSFER_CATEGORIES, voorbelastingExcluded, renteAftrekbaarActiveYear, winstCorrectieActiveYear, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed) : null),
    [classified, activeYear, effectiveCategoryBtwRates, btwVerlegd, fixedCategories, voorbelastingExcluded, renteAftrekbaarActiveYear, winstCorrectieActiveYear, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed]
  );
  const yearlyOpenOB = useMemo(
    () => computeYearlyOpenOB(classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus),
    [classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, kwartaalStatus, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus]
  );
  const ibEstimate = useMemo(
    () => (yearlySummary ? estimateIncomeTax(yearlySummary.winst, activeYear) : { belasting: 0, geëxtrapoleerd: false }),
    [yearlySummary, activeYear, tariefOverrides, overigInkomenBox1]
  );
  const zvwEstimate = useMemo(
    () => (yearlySummary ? estimateZvw(yearlySummary.winst, activeYear) : { bijdrage: 0, geëxtrapoleerd: false, grondslag: 0, gemaximeerd: false }),
    [yearlySummary, activeYear, tariefOverrides, overigInkomenBox1]
  );
  // beide-V1R8 (fase 5) — privédossier: budget en belastingindicatie per jaar (calc/prive, tax/prive).
  const priveOverzicht = usePriveOverzicht({ actief: modus.berekening === "prive", transacties: classified, jaren: years, vasteCategorieen: fixedCategories, antwoorden: priveAntwoorden, eenvoudig: eenvoudigActief, tarieven: tariefOverrides });
  const yearlySummaries = useYearlySummaries({
    activaDetails, activaSummary, autoActivaDetails, autoStatus, autoWizardStatus,
    btwVerlegd, categoryZakelijkPercentageEff, classified, effectiveCategoryBtwRates, energieZakelijkPercentageStatus,
    fixedCategories, gemeentelijkeKostenZakelijkPercentageStatus, heeftLeaseAutoDossierBreed, huurZakelijkPercentageStatus, kmVergoedingDetails,
    leaseDetails, leaseSummary, loanDetails, loanSummary, rechtsvorm, eenvoudigLease,
    voorbelastingExcluded, years,
  });
  // v237 — Zelfde reserve-keten (niet-gerealiseerde zelfstandigenaftrek over de jaren heen) en
  // dezelfde "...MetOndernemersaftrek"-functies als het volledige Aangiftevoorstel-rapport
  // (reports/aangiftevoorstel.js), nu ook lichtgewicht herbruikt voor de dashboardkaarten "IB & Zvw"
  // en "Aftrekposten" bij het geselecteerde jaar — zodat die kaarten dezelfde bedragen tonen als de
  // uitgebreide berekening, i.p.v. een losstaande, mogelijk afwijkende schatting. Alleen relevant voor
  // zzp/eenmanszaak (rechtsvorm !== "bv"); een BV kent geen zelfstandigenaftrek/Zvw op deze manier.
  // Bewuste vereenvoudiging t.o.v. het volledige rapport: een jaar met "onbekend" urencriterium wordt
  // hier behandeld als "ja" (in plaats van beide scenario's apart te tonen) — te veel nuance voor een
  // compacte kaart; de volledige, preciezere uitsplitsing (incl. beide scenario's) staat in de
  // "Indicatieve aangifteberekening" zelf, waar deze kaarten ook naartoe doorklikken.
  const ondernemersaftrekPerJaar = useOndernemersaftrekPerJaar({
    rechtsvorm, startersaftrekStatus: startersaftrekEff, yearlySummaries, years, zaLegacyJaDefault,
    zelfstandigenaftrekStatus, tariefOverrides,
  });
  // release32V3 — voor "Inkomen per maand": indicatieve IB/Zvw, wat er dat jaar al via de bank is betaald, en het
  // BTW-saldo per kwartaal. Dezelfde berekeningen als de indicatieve aangifte en de BTW-kwartalen.
  const eigenPriveIbans = useMemo(
    () => [...eigenRekeningenGeladen, ...(eigenRekeningenExtra || [])].filter((r) => r?.accountType === "Prive" && r.iban).map((r) => r.iban),
    [eigenRekeningenGeladen, eigenRekeningenExtra]
  );
  const fiscaalVoorJaar = (y) => {
    const uit = { jaar: y, ib: null, zvw: null, betaald: 0, btw: null, isBV: rechtsvorm === "bv", kor: !!korRegeling };
    const ys = yearlySummaries?.[y];
    if (rechtsvorm !== "bv" && ys) {
      const aftrek = ondernemersaftrekPerJaar[y];
      const starters = startersaftrekEff?.[y] === "ja";
      const bedrag = aftrek ? aftrek.zelfstandigenaftrekBedrag + aftrek.startersaftrekBedrag : 0;
      // Zelfde rekenwijze als de kaart "Totaal belasting en premies": IB ná heffingskorting + Zvw-bijdrage.
      const ib = estimateIncomeTaxMetOndernemersaftrek(ys.winst, y, bedrag, starters);
      const hk = estimateHeffingskortingenMetOndernemersaftrek(ys.winst, y, bedrag, starters);
      const zvw = estimateZvwMetOndernemersaftrek(ys.winst, y, bedrag, starters);
      uit.ib = Math.round(Math.max(0, (ib?.belasting || 0) - (hk?.totaal || 0)) * 100) / 100;
      uit.zvw = Math.round((zvw?.bijdrage || 0) * 100) / 100;
    }
    uit.betaald = Math.round(-classified.filter((tx) => !tx.isMirror && tx.year === y && (tx.category === "Belastingen: IB" || tx.category === "Belastingen: ZVW")).reduce((a, tx) => a + tx.amount, 0) * 100) / 100;
    if (!korRegeling) {
      const privegebruik = computeBtwPrivegebruikAuto(y, { leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus, autoStatus, classified, categoryBtwRates: effectiveCategoryBtwRates, btwVerlegd, rechtsvorm });
      const qs = computeQuarterlyBtwForYear(classified, y, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, privegebruik);
      uit.btw = [1, 2, 3, 4].map((k) => {
        const q = qs.find((x) => x.kwartaal === k && x.year === y);
        return q ? Math.round((q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting + (q.btwPrivegebruikAuto || 0)) * 100) / 100 : 0;
      });
    }
    return uit;
  };
  const dashboardAangifteIndicatie = useDashboardAangifteIndicatie({
    activeYear, ondernemersaftrekPerJaar, rechtsvorm, startersaftrekStatus: startersaftrekEff, yearlySummary, tariefOverrides, overigInkomenBox1,
  });
  // "Zakelijke kosten" per jaar, exact dezelfde optelsom als "Zakelijke kosten" in het
  // Aangiftevoorstel (zie buildYearSection/kostenTotaal in aangiftevoorstel.js): inkoopkosten +
  // afschrijving (berekend als Activa is ingevuld, anders het bruto aanschafbedrag ter herkenning)
  // + overige bedrijfskosten + aftrekbare rente. Bewust NIET zelf opnieuw berekend vanuit
  // computeYearlySummary — dat zou de kans op verschil met het Aangiftevoorstel juist vergroten.
  const kostenTotaalByYear = useKostenTotaalByYear({
    activaDetails, activaSummary, autoActivaDetails, autoStatus, autoWizardStatus,
    btwVerlegd, categoryZakelijkPercentageEff, classified, effectiveCategoryBtwRates, kmVergoedingDetails,
    leaseDetails, leaseSummary, loanDetails, loanSummary, rechtsvorm, eenvoudigLease,
    years, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus,
  });

  return { yearlySummaries, yearlyOpenOB, yearlySummary, dashboardAangifteIndicatie, ibEstimate, zvwEstimate, priveOverzicht, gedeeldeEnergieForActiveYear, gedeeldeGemeentelijkeKostenForActiveYear, gedeeldeHuurForActiveYear, ondernemersaftrekPerJaar, fiscaalVoorJaar, kostenTotaalByYear, overigeDelen, eigenPriveIbans };
}
