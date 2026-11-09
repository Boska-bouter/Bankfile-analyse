// Voortgang van het dossier: open punten, badges, percentages en de stappen-lijsten van het dashboard.
// nieuw-V1R0 — uit App.jsx gehaald (opruimronde 9-11). Alle invoer komt binnen via `invoer`; namen die App pas later maakt via invoer.appLaat.
import { MOBIEL_CATS, MOBIEL_LABEL } from "./constanten.js";
import { autoJaren } from "../tax/eenvoudigLease.js";
import { counterpartyKey } from "../utils/normalization.js";
import { useMemo } from "react";
import { kleinInstelling } from "../classification/kleineBedragen.js";

export function useDossierVoortgang(invoer) {
  const { kleinBedragInstelling, activeYear, autoExactIngevuld, autoStatus, autoWizardStatus, bevestigdInBulkVenster, categoryZakelijkPercentage, classified, confidenceSummary, controlerenDashboardCards, dashboardCards, eenvoudigActief, eenvoudigLease, eigenNamen, eigenRekeningenExtra, heeftVoorraad, instellingenDashboardCards, korRegeling, leaseGroepenEenv, modus, overigInkomenBox1, parsedFiles, priveAntwoorden, rechtsvorm, reviewedOverigKeys, reviewedPersonKeys, setShowMultiYearModal, setShowQuarterlyBtwModal, startersaftrekStatus, verwachteAOV, verwachteLease, verwachteLeaseOverig, verwachteLening, werkruimteStatus, yearlyProgress, years, zelfstandigenaftrekStatus } = invoer;
  const tabsVisible = true;

  // Badges op de Controleren/Instellingen-tab in AppSidebar.jsx en de "open punten" in de
  // dashboardkop (v305, V27): het aantal CONCRETE open punten — de som van `openCount` over de kaarten
  // die aandacht vragen (tone "attention"/"risk") — niet meer het aantal kaarten. Voorheen kon
  // "Controleren 1" betekenen: 1 kaart, terwijl er 25 inkomsten te beoordelen waren. Een kaart zonder
  // eigen `openCount` telt als 1 punt.
  const openPointsOf = (c) =>
    c.tone === "attention" || c.tone === "risk" ? (typeof c.openCount === "number" ? c.openCount : 1) : 0;
  // V90 — Lease/Leningen/Activa zijn te controleren data (BTW/aftrek/kosten), geen instellingen: tellen bij Controleren
  const VERPLAATST_NAAR_CONTROLEREN = ["loans", "leases", "activa", "aannames"];
  const controlerenBadge = useMemo(
    () => controlerenDashboardCards.reduce((a, c) => a + openPointsOf(c), 0) + instellingenDashboardCards.filter((c) => VERPLAATST_NAAR_CONTROLEREN.includes(c.key)).reduce((a, c) => a + openPointsOf(c), 0),
    [controlerenDashboardCards, instellingenDashboardCards]
  );
  // release21V1 — basisvragen uit de wizard die nog openstaan (null = nooit beantwoord). Zelfde regels
  // als de wizard: vragen per jaar pas als er jaren zijn, en zzp-vragen (uren, starters, overig inkomen,
  // KOR) niet bij een BV. Telt mee in de Instellingen-badge en de routebalk.
  const mobielOpenJarenVan = (cat) => [...new Set(classified.filter((tx) => !tx.isMirror && tx.category === cat).map((tx) => tx.year))]
    .filter((y) => categoryZakelijkPercentage?.[cat]?.[y] == null).sort();
  const mobielOpen = MOBIEL_CATS.map((cat) => ({ cat, jaren: mobielOpenJarenVan(cat) })).filter((m) => m.jaren.length > 0);
  const openBasisvragen = (() => {
    const isBV = rechtsvorm === "bv";
    const heeftJaren = years.length > 0;
    const leeg = (m) => Object.keys(m || {}).length === 0;
    const lijst = [];
    // beide-V1R3 — alleen vragen van onderdelen die in dit dossier aan staan; in een privédossier
    // kwamen de zakelijke vragen (rechtsvorm, auto, KOR, uren …) anders altijd als open terug.
    const aan = (k) => modus.onderdelen[k] !== false;
    const voeg = (key, label, open, onderdeel = "omzet") => { if (open && (onderdeel === null || aan(onderdeel))) lijst.push({ key, label }); };
    voeg("naam", "Naam rekeninghouder", eigenNamen === null && !modus.wizard, null);
    // beide-V17R7 — soort bedrijf (alleen zakelijk dossier): helpt de herkenning, bijv. inkoop bij groothandel en slager voor horeca.
    voeg("branche", "Soort bedrijf", eigenNamen !== null && !eigenNamen?.branche && !modus.wizard, null);
    voeg("rechtsvorm", "Rechtsvorm", rechtsvorm === null);
    // beide-V8R4 — eigen rekeningen elders (ook in Eenvoudig, zie SetupWizardModal).
    voeg("andere", "Eigen rekeningen", !modus.wizard && parsedFiles.length > 0 && eigenRekeningenExtra === null, null);
    // nieuw-V6R9 — ook beantwoord als de auto per jaar is ingevuld (Persoonlijke aannames), zoals in oudere dossiers.
    voeg("auto", "Auto (zaak/privé)", autoWizardStatus === null && leeg(autoStatus), "auto");
    voeg("lease", "Leaseauto", verwachteLease === null, "lease");
    voeg("leaseOverig", "Overige lease", verwachteLeaseOverig === null, "lease");
    voeg("lening", "Leningen", verwachteLening === null);
    voeg("voorraad", "Voorraad", heeftVoorraad === null);
    voeg("aov", "AOV", verwachteAOV === null, "ondernemersaftrek");
    voeg("kor", "KOR", !isBV && korRegeling === null, "btw");
    voeg("uren", "Urencriterium", heeftJaren && !isBV && leeg(zelfstandigenaftrekStatus), "ondernemersaftrek");
    voeg("starters", "Startersaftrek", heeftJaren && !isBV && leeg(startersaftrekStatus), "ondernemersaftrek");
    voeg("werkruimte", "Werkruimte / huur", heeftJaren && leeg(werkruimteStatus));
    voeg("overig", "Overig inkomen box 1", heeftJaren && !isBV && leeg(overigInkomenBox1));
    // beide-V8R4 — Eenvoudig: welk deel van telefoon/internet is zakelijk? Zonder antwoord telde het voor 100%.
    // beide-V9R7 — lease in Eenvoudig: soort onbekend, en > 500 km privé per jaar met een auto van de zaak/leaseauto.
    if (eenvoudigActief && !modus.wizard && aan("lease")) {
      for (const g of leaseGroepenEenv) if (!g.soort) lijst.push({ key: "leaseSoort", label: `Lease ${g.name}: auto of apparatuur?` });
      const open500 = autoExactIngevuld ? [] : autoJaren(leaseGroepenEenv, autoStatus).filter((j) => eenvoudigLease?.prive500?.[j] == null);
      if (open500.length) lijst.push({ key: "lease500", label: `Auto meer dan 500 km privé? (${open500.join(", ")})` });
    }
    if (eenvoudigActief && !modus.wizard) for (const m of mobielOpen) lijst.push({ key: "mobiel", label: `${MOBIEL_LABEL[m.cat]}: zakelijk deel (${m.jaren.join(", ")})` });
    // beide-V1R7 — de vragen van de privéwizard (alleen in een privédossier).
    if (modus.wizard) lijst.push(...modus.wizard.openVragen(priveAntwoorden, { eigenNamen, jaren: years, bestanden: parsedFiles.map((f) => f.fileName) }, { eenvoudig: eenvoudigActief }));
    return lijst;
  })();
  // release21V7 — leeg dossier waarin nog geen enkele basisvraag beantwoord is (bijv. wizard direct
  // afgebroken na "Nieuw dossier"): geen gele lijst van 9 open punten en geen badge, maar één rustige
  // regel "Basisvragen nog niet doorlopen". De gele kaart komt pas zodra er een bestand is of iets is ingevuld.
  const basisvragenNietGestart = parsedFiles.length === 0 &&
    [eigenNamen, rechtsvorm, autoWizardStatus, verwachteLease, verwachteLeaseOverig, verwachteLening, heeftVoorraad, verwachteAOV, korRegeling].every((v) => v === null) &&
    Object.keys(priveAntwoorden || {}).length === 0;
  const openBasisvragenTelling = basisvragenNietGestart ? 0 : openBasisvragen.length;
  const instellingenBadge = useMemo(
    () => instellingenDashboardCards.filter((c) => !VERPLAATST_NAAR_CONTROLEREN.includes(c.key)).reduce((a, c) => a + openPointsOf(c), 0) + openBasisvragenTelling,
    [instellingenDashboardCards, openBasisvragenTelling]
  );

  const dossierOpenPoints = controlerenBadge + instellingenBadge;
  // V68 — het percentage in de ring volgt nu dezelfde telling als de "open punten": het deel van alle
  // te beoordelen groepen (tegenpartij + categorie) dat al zeker is ingedeeld. Overige open punten
  // (instellingen, duplicaten, enz.) tellen als open én als deel van het totaal. Nooit 100% zolang er
  // iets openstaat; voorheen was dit een gemiddelde van enkele losse checks (bijv. % transacties buiten
  // "Overig") en kon het 99% tonen bij honderden open punten.
  const dossierPct = useMemo(() => {
    if (!classified.length) return null;
    const classOpen = confidenceSummary.openExBulk;
    const overige = Math.max(0, dossierOpenPoints - classOpen);
    const totaal = Math.max(confidenceSummary.groupsTotal + overige, dossierOpenPoints, 1);
    if (dossierOpenPoints === 0) return 100;
    return Math.min(99, Math.floor((100 * (totaal - dossierOpenPoints)) / totaal));
  }, [classified, confidenceSummary, dossierOpenPoints]);
  // huishoudboekje-V6R9 — wens Boska 8-11: naast de ring (telt groepen) ook het deel van de BOEKINGEN dat zeker is ingedeeld.
  const boekingenInfo = useMemo(() => {
    let n = 0, zeker = 0, klein = 0;
    for (const tx of classified) {
      if (tx.isMirror) continue;
      n++;
      if (tx.kleinBedrag) klein++;
      else if (tx.confidence.level === "override" || tx.confidence.level === "keyword" || bevestigdInBulkVenster(tx)) zeker++;
    }
    // nieuw-V1R1 — grens erbij, zodat de kop "kleine transacties (< € 50)" kan zeggen
    return n ? { zeker: Math.floor((100 * zeker) / n), klein: Math.round((100 * klein) / n), grens: kleinInstelling(kleinBedragInstelling).grens } : null;
  }, [classified, reviewedOverigKeys, reviewedPersonKeys, kleinBedragInstelling]);
  // V74 — tweede ring: dezelfde berekening, maar alleen voor het gekozen jaar. Open = groepen met een
  // onzekere indeling in dat jaar + de administratieve jaarchecks die nog openstaan (KOR, BTW-verlegd,
  // personen/Overig beoordeeld, enz.); totaal = alle groepen van dat jaar + het aantal jaarchecks.
  const yearRing = useMemo(() => {
    if (!activeYear || !yearlyProgress[activeYear] || !classified.length) return null;
    const alle = new Set(), open = new Set();
    for (const tx of classified) {
      if (tx.isMirror || Number(tx.year) !== Number(activeYear)) continue;
      const gk = (tx.category === "Winkels divers" && tx.confidence.level === "heuristic" && /losse pinbetaling/i.test(tx.confidence.label || ""))
        ? "__losse-pinbetalingen__|Winkels divers"
        : `${counterpartyKey(tx.counterparty || tx.description, tx.amount) || tx.id}|${tx.category}`;
      alle.add(gk);
      if ((tx.confidence.level === "heuristic" || tx.confidence.level === "fallback") && !bevestigdInBulkVenster(tx)) open.add(gk);
    }
    const adminOpen = yearlyProgress[activeYear].openPunten || 0;
    const openN = open.size + adminOpen;
    const totaal = Math.max(alle.size + 5, openN, 1);
    const pct = openN === 0 ? 100 : Math.min(99, Math.floor((100 * (totaal - openN)) / totaal));
    return { pct, open: openN, jaar: activeYear };
  }, [classified, activeYear, yearlyProgress, reviewedOverigKeys, reviewedPersonKeys]);
  const dossierOpenBreakdown = [
    controlerenBadge > 0 ? `${controlerenBadge} controle` : null,
    instellingenBadge > 0 ? `${instellingenBadge} instelling${instellingenBadge === 1 ? "" : "en"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Fase 1, dashboard-restyling (Stijl F) — de 4 samenvattende categorie-kaarten bovenaan Overzicht
  // ("Nog te controleren"/"Nog in te stellen"/"Resultaten"/"Automatische herkenning" in het mockup).
  // Dit zijn ROLLUPS van bestaande data (controlerenDashboardCards/instellingenDashboardCards/
  // businessIncomeEntries/businessExpenseEntries) — geen nieuwe berekening, alleen samengevat en
  // doorklikbaar. Zie RollupCard.jsx.
  const dashboardCardsByKey = useMemo(() => Object.fromEntries(dashboardCards.map((c) => [c.key, c])), [dashboardCards]);
  const stapItem = (c) => ({ key: c.key, label: c.title, count: typeof c.openCount === "number" ? c.openCount : c.value, onClick: c.onClick });
  const teControlerenItems = useMemo(
    () => [
      ...controlerenDashboardCards.filter((c) => c.tone === "attention" || c.tone === "risk").map(stapItem),
      ...instellingenDashboardCards.filter((c) => VERPLAATST_NAAR_CONTROLEREN.includes(c.key) && (c.tone === "attention" || c.tone === "risk")).map(stapItem),
    ],
    [controlerenDashboardCards, instellingenDashboardCards]
  );
  const inTeStellenItems = useMemo(
    () => instellingenDashboardCards.filter((c) => !VERPLAATST_NAAR_CONTROLEREN.includes(c.key) && (c.tone === "attention" || c.tone === "risk")).map(stapItem),
    [instellingenDashboardCards]
  );
  const resultatenItems = useMemo(
    () => [
      { label: "Meerjarenoverzicht", onClick: () => setShowMultiYearModal(true) },
      { label: "BTW-aangifte per kwartaal", onClick: () => setShowQuarterlyBtwModal(true) },
    ],
    []
  );
  return { basisvragenNietGestart, boekingenInfo, controlerenBadge, dashboardCardsByKey, dossierOpenBreakdown, dossierOpenPoints, dossierPct, inTeStellenItems, instellingenBadge, mobielOpenJarenVan, openBasisvragen, openBasisvragenTelling, tabsVisible, teControlerenItems, yearRing };
}
