// Rekening- en jaaroverzicht: geladen rekeningen, aansluitcontrole, checklist, onvolledige leningen/leases/activa en jaarvoortgang.
// nieuw-V1R0 — uit App.jsx gehaald (opruimronde 9-11). Alle invoer komt binnen via `invoer`; namen die App pas later maakt via invoer.appLaat.
import { computeBusinessAdvies, computeVolledigeJaren } from "../tax/yearlySummary.js";
import { computeChecklistLikeDataForYear } from "../tax/checklist.js";
import { isCompleteFinancialLeaseDetails } from "../tax/financialLease.js";
import { useAansluitControleInfo } from "../calc/useAansluitControleInfo.jsx";
import { useMemo } from "react";
import { useYearlyProgress } from "../calc/useYearlyProgress.jsx";

export function useRekeningOverzicht(invoer) {
  const { accountTypeByFile, activaDetails, activaSummary, activeYear, autoStatus, bevestigdInBulkVenster, bevestigdeControles, btwVerlegd, categoryZakelijkPercentageEff, classified, confirmedLeaseTypeKeys, effectiveCategoryBtwRates, eigenRekeningenExtra, eigenRekeningenGeladen, energieZakelijkPercentageStatus, fileContinuity, gemeentelijkeKostenZakelijkPercentageStatus, groups, heeftLeaseAutoDossierBreed, huurZakelijkPercentageStatus, ibEstimate, ibStatus, korRegeling, kwartaalStatus, leaseDetails, leaseSummary, loanDetails, loanSummary, modus, parsedFiles, periodePerSoort, periodeQuarterOverrides, priGroupForYear, priveOverzicht, quarterlyBtwData, rechtsvorm, reviewedOverigKeys, reviewedPersonKeys, voorbelastingExcluded, vpbStatus, yearlyOpenOB, yearlySummary, years, zakGroupForYear, zelfstandigenaftrekStatus, zvwEstimate, zvwStatus } = invoer;
  const volledigeJaren = useMemo(() => computeVolledigeJaren(classified), [classified]);
  // Is er daadwerkelijk een privérekening-BESTAND geladen in dit dossier? Zie de toelichting bij
  // `priveRekeningGeladen` in tax/checklist.js — bepaalt of de spiegelboeking-check daar nog
  // betekenis heeft, of dat de echte privétransacties zelf al hun eigen tegenboeking zijn.
  const rekeningTypeTekst = (() => {
    if (modus.rekeningen.vraagSoort === false) return ""; // beide-V1R8 — privé: alle rekeningen zijn privé
    const t = parsedFiles.map((f) => accountTypeByFile[f.fileName]).filter(Boolean);
    const z = t.filter((x) => x === "Zakelijk").length, p = t.filter((x) => x === "Prive").length;
    if (z + p === 0) return "";
    if (p === 0) return " — alleen zakelijk geladen";
    if (z === 0) return " — alleen privé geladen";
    return ` (${z} zakelijk, ${p} privé)`;
  })();
  const priveRekeningGeladen = useMemo(() => Object.values(accountTypeByFile).includes("Prive"), [accountTypeByFile]);
  // v233: zelfde soort vlag, maar dan voor de zakelijke kant — gebruikt door de "Controle
  // overboeking zakelijk ↔ privé"-banner in het Details-tabblad hieronder, om net als hierboven
  // dossierbreed (niet per item-aantal van het actieve jaar) te bepalen of er überhaupt een
  // rekening van dat type geladen is.
  const zakelijkRekeningGeladen = useMemo(() => Object.values(accountTypeByFile).includes("Zakelijk"), [accountTypeByFile]);
  // v286 — gedeelde berekening voor de "Controle overboeking zakelijk ↔ privé"-info (v283, eerder
  // gedupliceerd in AansluitingDetailPanel.jsx en de losse "aansluitControle"-kaart) — nu ook
  // hergebruikt door de nieuwe "Bestanden geladen"-kaart op Overzicht (zie dashboardCards), zodat er
  // maar één plek is die zakSum/priSum/diff uitrekent.
  const aansluitControleInfo = useAansluitControleInfo({
    priGroupForYear, priveRekeningGeladen, zakGroupForYear, zakelijkRekeningGeladen, toegelicht: bevestigdeControles,
    eigenRekeningenNietGeladen: (eigenRekeningenExtra || []).map((r) => r?.iban).filter(Boolean),
    eigenIbansAlle: [...eigenRekeningenGeladen, ...(eigenRekeningenExtra || [])].map((r) => r?.iban).filter(Boolean),
    periodeZak: periodePerSoort.Zakelijk || null, periodePri: periodePerSoort.Prive || null,
  });
  const checklistData = useMemo(
    () => computeChecklistLikeDataForYear(zakGroupForYear.items, priGroupForYear.items, quarterlyBtwData, kwartaalStatus, priveRekeningGeladen),
    [zakGroupForYear, priGroupForYear, quarterlyBtwData, kwartaalStatus, priveRekeningGeladen]
  );
  const businessAdvies = useMemo(() => {
    if (!activeYear || !yearlySummary) return null;
    return computeBusinessAdvies(activeYear, yearlySummary, yearlyOpenOB[activeYear] || 0, ibEstimate, priGroupForYear.items, zvwEstimate);
  }, [activeYear, yearlySummary, yearlyOpenOB, ibEstimate, zvwEstimate, ibStatus, priGroupForYear]);

  // v246 — hierboven stonden incompleteLoansCount/incompleteLeasesCount alleen lokaal in de
  // dashboardCards-berekening verderop; nu ook in een eigen useMemo (plus incompleteActivaCount,
  // die nog nergens dossierbreed werd bijgehouden) zodat het mini-dashboard op tabblad
  // "Instellingen" (instellingenDashboardCards) dezelfde tellingen kan hergebruiken i.p.v. ze een
  // tweede keer uit te rekenen. v254 — hiernaartoe verplaatst (was ná yearlyProgress) omdat
  // yearlyProgress ze nu zelf ook nodig heeft, voor het "aannames"-signaal bij Indicatieve aangifte.
  const incompleteLoansCount = useMemo(
    () => loanSummary.filter((l) => !(loanDetails[l.key]?.leningbedrag && loanDetails[l.key]?.startdatum) && !loanDetails[l.key]?.onbekend).length,
    [loanSummary, loanDetails]
  );
  const incompleteLeasesCount = useMemo(
    () =>
      leaseSummary.filter((l) => {
        if (!confirmedLeaseTypeKeys.includes(l.key)) return true;
        if (leaseDetails[l.key]?.onbekend) return false;
        return l.category === "Lease (financieel)" && !isCompleteFinancialLeaseDetails(leaseDetails[l.key]);
      }).length,
    [leaseSummary, leaseDetails, confirmedLeaseTypeKeys]
  );
  const incompleteActivaCount = useMemo(
    () =>
      activaSummary.filter((a) => {
        const details = activaDetails[a.key];
        if (details?.onbekend) return false;
        return !(details && details.aanschafwaarde && details.aanschafdatum && details.afschrijvingstermijnJaren);
      }).length,
    [activaSummary, activaDetails]
  );

  // ---- Voortgangspercentage per jaar (voor de jaarknoppen in "Werk te doen") ----
  //
  // v254 — herzien op expliciet verzoek: dit percentage/status ging voorheen ook over of de
  // IB/Zvw-aangifte en BTW-kwartalen al daadwerkelijk AANGEGEVEN/BETAALD/GEDAAN waren. Dat
  // suggereerde ten onrechte dat "100%"/groen zou betekenen dat de aangifte is ingediend. Vanaf nu
  // is dit zuiver een DOSSIERCONTROLE-percentage (is alles administratief op orde: ingedeeld,
  // beoordeeld, instellingen bekend?) — een dossier kan dus 100% groen staan terwijl de aangiften
  // zelf nog niet gedaan zijn. Die drie waren daarvoor gewone `checks`-fracties tussen de andere in;
  // nu apart in `werkelijkAangifteChecks`, dat NIET meetelt in `pct`/`status`, maar wel een eigen
  // signaal levert (`werkelijkAangifteStatus`) voor de losse "Werkelijke aangifte"-regel op de
  // dashboardkaart. Verder nieuw: `openPunten` (hoeveel van de dossiercontrole-checks nog niet
  // volledig klaar zijn — een klein, telbaar aantal i.p.v. alleen een percentage) en
  // `aannamesCount`/`aannamesStatus` — hoeveel aannames de INDICATIEVE berekening nog bevat
  // (urencriterium/gedeelde-huur-percentage onbevestigd, onvolledige leningen/lease/activa-
  // gegevens). Bewust NIET meegenomen als "aanname": startersaftrek (leeg laten is daar een
  // geldig, expliciet "nee/n.v.t." — geen open vraag) en het generieke "percentage zakelijk per
  // categorie"-systeem (te generiek om zonder ruis te tellen; huur (deels zakelijk) heeft wél een
  // eigen status-veld en telt daarom wel mee).
  const yearlyProgress = useYearlyProgress({
    autoStatus, bevestigdInBulkVenster, btwVerlegd, categoryZakelijkPercentageEff, classified,
    effectiveCategoryBtwRates, energieZakelijkPercentageStatus, fileContinuity, gemeentelijkeKostenZakelijkPercentageStatus, groups,
    heeftLeaseAutoDossierBreed, huurZakelijkPercentageStatus, ibStatus, incompleteActivaCount, incompleteLeasesCount,
    incompleteLoansCount, korRegeling, kwartaalStatus, periodeQuarterOverrides, priveRekeningGeladen,
    rechtsvorm, reviewedOverigKeys, reviewedPersonKeys, voorbelastingExcluded, vpbStatus,
    years, zelfstandigenaftrekStatus, zvwStatus, priveOverzicht,
  });
  return { aansluitControleInfo, businessAdvies, checklistData, incompleteActivaCount, incompleteLeasesCount, incompleteLoansCount, priveRekeningGeladen, rekeningTypeTekst, volledigeJaren, yearlyProgress, zakelijkRekeningGeladen };
}
