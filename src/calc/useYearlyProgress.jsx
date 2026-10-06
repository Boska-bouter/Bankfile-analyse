// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import { classifyContinuityGap } from "../importers/transactions.js";
import { computeChecklistLikeDataForYear } from "../tax/checklist.js";
import { computeGedeeldeEnergieVoorJaar, computeGedeeldeGemeentelijkeKostenVoorJaar, computeGedeeldeHuurVoorJaar } from "../tax/gedeeldeHuur.js";
import { computeQuarterlyBtwForYear } from "../tax/btw.js";
import { counterpartyKey } from "../utils/normalization.js";

export function useYearlyProgress(p) {
  const {
    autoStatus, bevestigdInBulkVenster, btwVerlegd, categoryZakelijkPercentageEff, classified,
    effectiveCategoryBtwRates, energieZakelijkPercentageStatus, fileContinuity, gemeentelijkeKostenZakelijkPercentageStatus, groups,
    heeftLeaseAutoDossierBreed, huurZakelijkPercentageStatus, ibStatus, incompleteActivaCount, incompleteLeasesCount,
    incompleteLoansCount, korRegeling, kwartaalStatus, periodeQuarterOverrides, priveRekeningGeladen,
    rechtsvorm, reviewedOverigKeys, reviewedPersonKeys, voorbelastingExcluded, vpbStatus,
    years, zelfstandigenaftrekStatus, zvwStatus,
  } = p;

  return useMemo(() => {
    const map = {};
    for (const year of years) {
      const zakItems = (groups.find((g) => g.year === year && g.type === "Zakelijk") || { items: [] }).items;
      const priItems = (groups.find((g) => g.year === year && g.type === "Prive") || { items: [] }).items;
      const allYearItems = [...zakItems, ...priItems];
      const quartersForYear = computeQuarterlyBtwForYear(classified, year, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, huurZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus);
      const yc = computeChecklistLikeDataForYear(zakItems, priItems, quartersForYear, kwartaalStatus, priveRekeningGeladen);
      const checks = [];

      const personKeysThisYear = new Set(
        allYearItems.filter((tx) => tx.category === "Overboekingen aan personen" && !tx.isMirror).map((tx) => counterpartyKey(tx.counterparty || tx.description, tx.amount)).filter(Boolean)
      );
      if (personKeysThisYear.size > 0) {
        const done = [...personKeysThisYear].filter((k) => reviewedPersonKeys.includes(k)).length;
        checks.push({ frac: done / personKeysThisYear.size });
      }
      const overigKeysThisYear = new Set(
        allYearItems.filter((tx) => tx.category === "Overig" && !tx.isMirror).map((tx) => counterpartyKey(tx.counterparty || tx.description, tx.amount)).filter(Boolean)
      );
      if (overigKeysThisYear.size > 0) {
        const done = [...overigKeysThisYear].filter((k) => reviewedOverigKeys.includes(k)).length;
        checks.push({ frac: done / overigKeysThisYear.size });
      }
      // V90 — "Overig" dat je bewust met "Klopt zo" hebt bevestigd telt als gecategoriseerd (het eigen
      // Overig-check hierboven bewaakt dat al per tegenpartij); anders bleef dit jaar altijd 1 punt open.
      const overigAlleBevestigd = overigKeysThisYear.size > 0 && [...overigKeysThisYear].every((k) => reviewedOverigKeys.includes(k));
      checks.unshift({ frac: overigAlleBevestigd ? 1 : yc.categorizedPct / 100 });
      checks.push({ frac: korRegeling !== null ? 1 : 0 });
      const kwTotal = quartersForYear.length;
      if (korRegeling === false) {
        checks.push({ frac: btwVerlegd !== null ? 1 : 0 });
      }
      // avgFrac/pct/openPunten hieronder zijn zuiver DOSSIERCONTROLE (administratief) — of de
      // aangiften al daadwerkelijk gedaan/betaald zijn, telt hier bewust niet meer mee (zie
      // werkelijkAangifteChecks verderop).
      const avgFrac = checks.length ? checks.reduce((a, c) => a + c.frac, 0) / checks.length : 1;
      const openPunten = checks.filter((c) => c.frac < 0.999).length;

      // ---- Werkelijke aangifte — apart signaal, telt niet mee in pct/status hierboven ----
      // v285 — voorheen telde de BTW (alle kwartalen samen) hier als ÉÉN item, even zwaar als IB of
      // Zvw afzonderlijk — een dossier met 1 van de 4 BTW-kwartalen gedaan en IB/Zvw nog niet kon zo
      // al "deels" tonen, terwijl feitelijk pas 1 van de (in totaal) 6 aangiftes rond was. Nu telt elk
      // afzonderlijk BTW-kwartaal als eigen item (net als IB/Zvw), zodat "X van N gedaan" hieronder
      // klopt met het werkelijke aantal aangiftes. Bewust nog steeds gebaseerd op quartersForYear (de
      // kwartalen die dit jaar daadwerkelijk transacties bevatten) i.p.v. altijd vaste 4 — een
      // onvolledig eerste/laatste jaar hoeft niet alle 4 kwartalen verschuldigd te zijn. Maandaangifte
      // (i.p.v. kwartaal) is bewust nog niet ondersteund — dat is een aparte, grotere uitbreiding
      // (nieuwe wizardvraag + eigen maandregistratie) die nog niet is gebouwd.
      const btwAangifteChecks =
        korRegeling === false
          ? quartersForYear.map((q) => {
              const s = kwartaalStatus[`${q.year}-Q${q.kwartaal}`] || {};
              return {
                frac: (s.aangegeven ? 0.5 : 0) + (s.betaald ? 0.5 : 0),
                label: `BTW Q${q.kwartaal}`, doel: "btw",
                detail: s.aangegeven && s.betaald ? "aangegeven en betaald" : s.aangegeven ? "aangegeven, nog niet betaald" : s.betaald ? "betaald, nog niet aangegeven" : "nog niet aangegeven",
              };
            })
          : [];
      // v285 — een BV kent geen IB/Zvw (dat bestaat alleen voor een zzp/eenmanszaak) maar wel een
      // jaarlijkse Vpb-aangifte — vpbStatus vervangt ibStatus/zvwStatus hier zodra rechtsvorm "bv" is,
      // i.p.v. dat IB/Zvw daar (nooit ingevuld, want niet van toepassing) de teller eeuwig op "deels"
      // hielden.
      const overigeAangifteChecks =
        rechtsvorm === "bv"
          ? [{ frac: vpbStatus[year]?.gedaan ? 1 : 0, label: "Vpb", doel: "meerjaren", detail: vpbStatus[year]?.gedaan ? "gedaan" : "nog niet gedaan" }]
          : [
              { frac: ibStatus[year]?.gedaan ? 1 : 0, label: "Inkomstenbelasting (IB)", doel: "meerjaren", detail: ibStatus[year]?.gedaan ? "gedaan" : "nog niet gedaan" },
              { frac: zvwStatus[year]?.gedaan ? 1 : 0, label: "Zvw-bijdrage", doel: "meerjaren", detail: zvwStatus[year]?.gedaan ? "gedaan" : "nog niet gedaan" },
            ];
      const werkelijkAangifteChecks = [...btwAangifteChecks, ...overigeAangifteChecks];
      const werkelijkAangifteDone = werkelijkAangifteChecks.filter((c) => c.frac >= 0.999).length;
      const werkelijkAangifteTotal = werkelijkAangifteChecks.length;
      const werkelijkAangifteStatus =
        werkelijkAangifteDone === 0 ? "niet-geregistreerd" : werkelijkAangifteDone === werkelijkAangifteTotal ? "gedaan" : "deels";

      // ---- Indicatieve aangifte — aantal aannames dat de berekening nog bevat (v254) ----
      // Bewust dossierbreed voor leningen/lease/activa (net als instellingenDashboardCards) — een
      // lening/lease/activum loopt meestal over meerdere jaren, dus een aparte telling per jaar zou
      // hier geen scherper beeld geven. Alleen relevant voor zzp/eenmanszaak: een BV kent het
      // urencriterium/zelfstandigenaftrek niet.
      // v308 (V31) — naast het aantal nu ook WELKE aannames het zijn, zodat de kop en het rapport kunnen
      // tonen waar het "1 aanname" over gaat (BTW-verlegd/KOR zijn feiten uit de basisvragen, geen aanname).
      const aannamesLabels = [];
      if (incompleteLoansCount > 0) aannamesLabels.push(`${incompleteLoansCount === 1 ? "lening" : "leningen"} onvolledig`);
      if (incompleteLeasesCount > 0) aannamesLabels.push(`${incompleteLeasesCount === 1 ? "leasecontract" : "leasecontracten"} onvolledig`);
      if (incompleteActivaCount > 0) aannamesLabels.push(`activa onvolledig`);
      if (rechtsvorm !== "bv") {
        const zaRaw = zelfstandigenaftrekStatus?.[year];
        if (zaRaw == null || zaRaw === "onbekend") aannamesLabels.push("urencriterium onbekend");
      }
      const gedeeldeHuurDitJaar = computeGedeeldeHuurVoorJaar(classified, year, huurZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd);
      if (gedeeldeHuurDitJaar && huurZakelijkPercentageStatus?.[year] == null) aannamesLabels.push("% zakelijk huur");
      const gedeeldeEnergieDitJaar = computeGedeeldeEnergieVoorJaar(classified, year, energieZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd);
      if (gedeeldeEnergieDitJaar && energieZakelijkPercentageStatus?.[year] == null) aannamesLabels.push("% zakelijk energie/water");
      const gedeeldeGemeentelijkeKostenDitJaar = computeGedeeldeGemeentelijkeKostenVoorJaar(classified, year, gemeentelijkeKostenZakelijkPercentageStatus, effectiveCategoryBtwRates, btwVerlegd);
      if (gedeeldeGemeentelijkeKostenDitJaar && gemeentelijkeKostenZakelijkPercentageStatus?.[year] == null) aannamesLabels.push("% zakelijk gemeentelijke kosten");
      const aannamesCount = (incompleteLoansCount + incompleteLeasesCount + incompleteActivaCount) + aannamesLabels.filter((l) => !/onvolledig$/.test(l)).length;

      // Samenvattende status — afgeleid uit bestaande controles, geen nieuw controlesysteem: het
      // voortgangspercentage hierboven, plus hoeveel transacties dit jaar nog onzeker zijn
      // geclassificeerd, plus of er een bekend gat in de bestandscontinuïteit dit jaar raakt.
      const onzekerDitJaar = allYearItems.filter((tx) => !tx.isMirror && tx.confidence.level !== "override" && tx.confidence.level !== "keyword" && tx.confidence.level !== "heuristic" && !bevestigdInBulkVenster(tx)).length;
      // v260 — drie niveaus i.p.v. één harde grens (zie classifyContinuityGap in transactions.js):
      // tot €500 verschil bij een bestandsovergang is voor het dossier verwaarloosbaar (groen, geen
      // invloed op de jaarstatus), €500–€999 is "geel" (zet de status op zijn minst op oranje, ook
      // als verder alles compleet is), vanaf €1000 is het een echt gat (rood).
      const gatDitJaar = fileContinuity.some((g) => !g.ok && classifyContinuityGap(g.diff) === "rood" && (g.aTo.getFullYear() === year || g.bFrom.getFullYear() === year));
      const geelDitJaar = fileContinuity.some((g) => !g.ok && classifyContinuityGap(g.diff) === "geel" && (g.aTo.getFullYear() === year || g.bFrom.getFullYear() === year));
      let status;
      if (gatDitJaar) status = "rood";
      else if (openPunten === 0 && onzekerDitJaar === 0 && !geelDitJaar) status = "groen";
      else status = "oranje";

      map[year] = {
        pct: openPunten > 0 ? Math.min(99, Math.round(avgFrac * 100)) : Math.round(avgFrac * 100), status, onzekerDitJaar, gatDitJaar, geelDitJaar, openPunten, aannamesCount, aannamesLabels,
        werkelijkAangifteStatus, werkelijkAangifteDone, werkelijkAangifteTotal,
        werkelijkAangifteItems: werkelijkAangifteChecks.map((c) => ({ label: c.label, detail: c.detail, doel: c.doel, done: c.frac >= 0.999 })),
      };
    }
    return map;
  }, [years, groups, classified, effectiveCategoryBtwRates, btwVerlegd, voorbelastingExcluded, periodeQuarterOverrides, kwartaalStatus, korRegeling, reviewedPersonKeys, reviewedOverigKeys, fileContinuity, ibStatus, zvwStatus, vpbStatus, huurZakelijkPercentageStatus, energieZakelijkPercentageStatus, gemeentelijkeKostenZakelijkPercentageStatus, categoryZakelijkPercentageEff, autoStatus, heeftLeaseAutoDossierBreed, priveRekeningGeladen, incompleteLoansCount, incompleteLeasesCount, incompleteActivaCount, rechtsvorm, zelfstandigenaftrekStatus]);
}
