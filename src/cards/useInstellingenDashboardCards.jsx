// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import CardIcon from "../components/shared/CardIcon.jsx";
import { Settings } from "lucide-react";
import { resolveZelfstandigenaftrekStatusForYear } from "../tax/incomeTax.js";

export function useInstellingenDashboardCards(p) {
  const {
    aannamesSectionRef, activaSectionRef, activaSummary, activeYear, autoStatus,
    btwRateCounts, btwSettingsSectionRef, btwVerlegd, businessExpenseEntries, businessIncomeEntries,
    categorieTotalenActiveYear, categoryPercentageSectionRef, categoryZakelijkPercentage, energieZakelijkPercentageStatus, gedeeldeEnergieForActiveYear,
    gedeeldeGemeentelijkeKostenForActiveYear, gedeeldeHuurForActiveYear, gemeentelijkeKostenZakelijkPercentageStatus, huurZakelijkPercentageStatus, incomeRatesSectionRef,
    incompleteActivaCount, incompleteLeasesCount, incompleteLoansCount, jumpToSection, korRegeling,
    leaseSummary, leasesSectionRef, loanSummary, loansSectionRef, parsedFiles,
    rechtsvorm, setExpandedBusinessExpenseList, setExpandedBusinessIncomeList, startersaftrekStatus, startersaftrekEff, transactions,
    zaLegacyJaDefault, zelfstandigenaftrekStatus,
  } = p;

  return useMemo(() => {
    if (transactions.length === 0) return [];
    const zelfstandigenaftrekStatusDitJaar = activeYear
      ? resolveZelfstandigenaftrekStatusForYear(zelfstandigenaftrekStatus, activeYear, zaLegacyJaDefault)
      : null;
    return [
      {
        key: "loans",
        title: "Leningen",
        icon: <CardIcon name="doc" />,
        value: loanSummary.length,
        openCount: incompleteLoansCount,
        subtitle:
          loanSummary.length === 0
            ? "Geen gevonden"
            : incompleteLoansCount === 0
            ? "Alle gegevens compleet"
            : incompleteLoansCount === loanSummary.length
            ? `🟠 Nog geen gegevens ingevuld`
            : `🟠 ${incompleteLoansCount} van ${loanSummary.length} heeft nog ontbrekende gegevens`,
        tone:
          loanSummary.length === 0
            ? "neutral"
            : incompleteLoansCount === 0
            ? "ok"
            : incompleteLoansCount === loanSummary.length
            ? "risk"
            : "attention",
        hint: "Naar de leningen-sectie",
        onClick: () => jumpToSection(loansSectionRef),
        actionLabel: incompleteLoansCount > 0 ? "Controleren" : null,
      },
      {
        key: "leases",
        title: "Lease",
        icon: <CardIcon name="car" />,
        value: leaseSummary.length,
        openCount: incompleteLeasesCount,
        subtitle:
          incompleteLeasesCount > 0
            ? `🟠 ${incompleteLeasesCount} ${incompleteLeasesCount === 1 ? "contract heeft" : "contracten hebben"} nog ontbrekende gegevens`
            : leaseSummary.length > 0
            ? "Alle gegevens compleet"
            : "Geen gevonden",
        tone: incompleteLeasesCount > 0 ? "attention" : leaseSummary.length > 0 ? "ok" : "neutral",
        hint: "Naar de lease-sectie",
        onClick: () => jumpToSection(leasesSectionRef),
        actionLabel: incompleteLeasesCount > 0 ? "Controleren" : null,
      },
      {
        key: "activa",
        title: "Activa (afschrijving)",
        icon: <CardIcon name="tag" />,
        value: activaSummary.length,
        openCount: incompleteActivaCount,
        subtitle:
          activaSummary.length === 0
            ? "Geen gevonden"
            : incompleteActivaCount === 0
            ? "Alle gegevens compleet"
            : incompleteActivaCount === activaSummary.length
            ? `🟠 Nog geen gegevens ingevuld`
            : `🟠 ${incompleteActivaCount} van ${activaSummary.length} heeft nog ontbrekende gegevens`,
        tone:
          activaSummary.length === 0
            ? "neutral"
            : incompleteActivaCount === 0
            ? "ok"
            : incompleteActivaCount === activaSummary.length
            ? "risk"
            : "attention",
        hint: "Naar de activa-sectie",
        onClick: () => jumpToSection(activaSectionRef),
        actionLabel: incompleteActivaCount > 0 ? "Controleren" : null,
      },
      // v261 — was alleen het urencriterium (1 item, en alleen zichtbaar/onzichtbaar i.p.v. duidelijk
      // "wel/niet opgegeven"); nu alle 3 persoonlijke-aannames-items die op dit jaar van toepassing
      // zijn, elk met een eigen 🟢/🟠/⚪-status: urencriterium (zelfstandigenaftrek), startersaftrek
      // en auto (zakelijk/privé gebruik) — zelfde 3 items als in het "Persoonlijke aannames"-paneel
      // zelf (PersoonlijkeAannamesPanel.jsx). Gedeelde huur staat hier bewust niet (meer) bij: dat
      // hoort bij "Percentage zakelijk per categorie", niet bij deze persoonlijke aannames.
      ...(rechtsvorm !== "bv" && activeYear
        ? (() => {
            const autoStatusDitJaar = autoStatus?.[activeYear];
            const autoLabel =
              autoStatusDitJaar === "zaak"
                ? "Op de zaak"
                : autoStatusDitJaar === "prive"
                ? "Privé zakelijk gebruikt"
                : autoStatusDitJaar === "geen"
                ? "Geen auto"
                : null;
            // Startersaftrek heeft geen "onbekend"-status: leeg/niet ingevuld betekent gewoon "Nee /
            // niet van toepassing" (zie PersoonlijkeAannamesPanel.jsx) — telt daarom niet mee als
            // "nog niet opgegeven".
            const startersaftrekGekozen = startersaftrekStatus?.[activeYear] === "ja";
            const startersaftrekAan = startersaftrekGekozen && (startersaftrekEff || startersaftrekStatus)?.[activeYear] === "ja";
            // v309 (V31) — de deels-zakelijke percentages (huur, energie-water, gemeentelijke kosten) tellen al
            // mee als aanname in de kop; nu staan ze ook als regel in deze kaart (alleen als dit jaar van toepassing).
            const gedeeldeLijnen = [
              { label: "% zakelijk huur", gedeelde: gedeeldeHuurForActiveYear, status: huurZakelijkPercentageStatus?.[activeYear] },
              { label: "% zakelijk energie-water", gedeelde: gedeeldeEnergieForActiveYear, status: energieZakelijkPercentageStatus?.[activeYear] },
              { label: "% zakelijk gemeentelijke kosten", gedeelde: gedeeldeGemeentelijkeKostenForActiveYear, status: gemeentelijkeKostenZakelijkPercentageStatus?.[activeYear] },
            ].filter((l) => l.gedeelde);
            const missing =
              (zelfstandigenaftrekStatusDitJaar === "onbekend" ? 1 : 0) +
              (autoLabel == null ? 1 : 0) +
              gedeeldeLijnen.filter((l) => l.status == null).length;
            return [
              {
                key: "aannames",
                title: `Persoonlijke aannames ${activeYear}`,
                openCount: missing,
                icon: <CardIcon name="user" />,
                lines: [
                  {
                    label: "Urencriterium",
                    value:
                      zelfstandigenaftrekStatusDitJaar === "onbekend"
                        ? "🟠 Niet opgegeven"
                        : zelfstandigenaftrekStatusDitJaar === "ja"
                        ? "🟢 Ja"
                        : "🟢 Nee",
                  },
                  { label: "Startersaftrek", value: startersaftrekAan ? "🟢 Ja" : startersaftrekGekozen ? "🟠 Aangegeven, maar niet toegepast" : "⚪ Nee" },
                  { label: "Auto", value: autoLabel ? `🟢 ${autoLabel}` : "🟠 Niet opgegeven" },
                  ...gedeeldeLijnen.map((l) => ({ label: l.label, value: l.status == null ? "🟠 Niet opgegeven" : `🟢 ${l.status}%` })),
                ],
                subtitle: missing === 0 ? "Alles opgegeven" : `${missing} ${missing === 1 ? "item" : "items"} nog niet opgegeven`,
                tone: missing === 0 ? "ok" : "attention",
                hint: "Naar de persoonlijke aannames voor dit jaar",
                onClick: () => jumpToSection(aannamesSectionRef),
                actionLabel: missing > 0 ? "Controleren" : null,
              },
            ];
          })()
        : []),
      // v261 — nieuw, informatief (geen "moet nog ingevuld worden"-toon: leeg laten = bewust de
      // standaard gebruiken, zie CategoryPercentagePanel.jsx) — laat in één oogopslag zien hoeveel
      // van de dit jaar relevante categorieën een expliciet percentage zakelijk hebben gekregen.
      ...(transactions.length > 0 && activeYear
        ? (() => {
            const categorieenSplitsbaar = Object.keys(categorieTotalenActiveYear || {});
            const percentageAangepast = categorieenSplitsbaar.filter((c) => categoryZakelijkPercentage?.[c]?.[activeYear] != null).length;
            return [
              {
                key: "categoryPercentages",
                title: "Percentage zakelijk/privé",
                icon: <CardIcon name="divide" />,
                value: `${percentageAangepast}/${categorieenSplitsbaar.length}`,
                subtitle:
                  categorieenSplitsbaar.length === 0
                    ? "Geen splitsbare categorieën dit jaar"
                    : percentageAangepast === 0
                    ? "Nog niets opgegeven — standaard percentages gebruikt"
                    : percentageAangepast === categorieenSplitsbaar.length
                    ? "Voor alle categorieën opgegeven"
                    : `Voor ${percentageAangepast} van ${categorieenSplitsbaar.length} categorieën opgegeven`,
                tone: "neutral",
                hint: "Naar percentage zakelijk per categorie",
                onClick: () => jumpToSection(categoryPercentageSectionRef),
              },
            ];
          })()
        : []),
      // v261 — was alleen zichtbaar zolang KOR/BTW-verlegd nog niet beantwoord waren ("!"-kaart);
      // blijft nu ook daarna staan, met de gevraagde 21%/9%/0%-verdeling van de categorieën, zodat
      // je in één oogopslag kunt zien of de BTW-instellingen er redelijk uitzien.
      ...(transactions.length > 0 && !korRegeling
        ? [
            korRegeling === null || btwVerlegd === null
              ? {
                  key: "btwSettings",
                  title: "BTW-instellingen",
                  icon: <Settings className="h-3.5 w-3.5" />,
                  value: "!",
                  openCount: (korRegeling === null ? 1 : 0) + (btwVerlegd === null ? 1 : 0),
                  subtitle: korRegeling === null ? "KOR-vraag nog niet beantwoord" : "BTW-verlegd-vraag nog niet beantwoord",
                  tone: "attention",
                  hint: "Naar de BTW-instellingen",
                  onClick: () => jumpToSection(btwSettingsSectionRef),
                  actionLabel: "Beantwoorden",
                }
              : {
                  key: "btwSettings",
                  title: "BTW-instellingen",
                  icon: <Settings className="h-3.5 w-3.5" />,
                  lines: [
                    { label: "21%", value: String(btwRateCounts?.c21 ?? 0) },
                    { label: "9%", value: String(btwRateCounts?.c9 ?? 0) },
                    { label: "0%", value: String(btwRateCounts?.c0 ?? 0) },
                  ],
                  subtitle: "Categorieën per BTW-tarief",
                  tone: "neutral",
                  hint: "Naar de BTW-instellingen",
                  onClick: () => jumpToSection(btwSettingsSectionRef),
                },
          ]
        : []),
      // v251 — "Zakelijke tegenpartijen (inkomsten)" en "Zakelijke inkoop/uitgaven (leveranciers)"
      // hadden nog geen eigen kaart — puur informatief (geen compleet/onvolledig-status, dus neutrale
      // kleur), maar wel handig als snelkoppeling. Een klik doet hetzelfde als het bestaande
      // uitklap-knopje in KeywordManager zelf (isExpanded/onToggleExpand): de betreffende lijst gaat
      // naar de volle-breedte "uitklap box"-weergave (de andere lijst klapt dan vanzelf weg, zie de
      // grid/!expandedBusiness...List-conditie hierboven bij incomeRatesSectionRef).
      ...(parsedFiles.length > 0
        ? [
            {
              key: "businessIncomeEntries",
              title: "Zakelijke tegenpartijen",
              icon: <CardIcon name="handshake" />,
              value: businessIncomeEntries.length,
              subtitle: businessIncomeEntries.length === 1 ? "klant herkend" : "klanten herkend",
              tone: "neutral",
              hint: "Zakelijke tegenpartijen (inkomsten) bekijken",
              onClick: () => {
                setExpandedBusinessIncomeList(true);
                jumpToSection(incomeRatesSectionRef);
              },
            },
            {
              key: "businessExpenseEntries",
              title: "Zakelijke inkoop/uitgaven",
              icon: <CardIcon name="package" />,
              value: businessExpenseEntries.length,
              subtitle: businessExpenseEntries.length === 1 ? "leverancier herkend" : "leveranciers herkend",
              tone: "neutral",
              hint: "Zakelijke inkoop/uitgaven (leveranciers) bekijken",
              onClick: () => {
                setExpandedBusinessExpenseList(true);
                jumpToSection(incomeRatesSectionRef);
              },
            },
          ]
        : []),
    ];
  }, [
    transactions.length,
    parsedFiles.length,
    loanSummary,
    incompleteLoansCount,
    leaseSummary,
    incompleteLeasesCount,
    activaSummary,
    incompleteActivaCount,
    gedeeldeHuurForActiveYear,
    gedeeldeEnergieForActiveYear,
    gedeeldeGemeentelijkeKostenForActiveYear,
    huurZakelijkPercentageStatus,
    energieZakelijkPercentageStatus,
    gemeentelijkeKostenZakelijkPercentageStatus,
    rechtsvorm,
    activeYear,
    zelfstandigenaftrekStatus,
    zaLegacyJaDefault,
    korRegeling,
    btwVerlegd,
    businessIncomeEntries,
    businessExpenseEntries,
    autoStatus,
    startersaftrekStatus,
    startersaftrekEff,
    categorieTotalenActiveYear,
    categoryZakelijkPercentage,
    btwRateCounts,
  ]);
}
