// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import { AlertTriangle, Copy, HelpCircle, Settings, Users } from "lucide-react";
import CardIcon from "../components/shared/CardIcon.jsx";
import { eur } from "../utils/amounts.js";

export function useDashboardCards(p) {
  const {
    aansluitControleInfo, accountTypeByFile, activeYear, btwSettingsSectionRef, btwVerlegd,
    businessAdvies, bvSignalering, bvSignaleringSectionRef, checklistData, checklistSectionRef,
    confidenceSectionRef, confidenceSummary, confirmedLeaseTypeKeys, dashboardAangifteIndicatie, detailsSectionRef,
    duplicatePendingBreakdown, duplicatesSectionRef, ibStatus, incomeReviewSectionRef, incompleteLeasesCount,
    incompleteLoansCount, jumpToSection, korRegeling, leaseDetails, leaseSummary,
    leasesSectionRef, loanDetails, loanSummary, loansSectionRef, overigReviewSectionRef,
    pendingDuplicateCount, pendingIncomeReview, pendingOverigReview, pendingPersonReview, personReviewSectionRef,
    quarterlyBtwData, rechtsvorm, setDismissedDuplicateNotice, setOpenConfidenceLevel, setShowAangifteYearPicker,
    setShowMultiYearModal, setShowOverigReview, setShowPersonReview, setShowQuarterlyBtwModal, transactions,
    vpbStatus, yearlyProgress, yearlySummary, zvwStatus,
  } = p;

  return useMemo(() => {
    if (transactions.length === 0) return [];
    const yearProgress = activeYear ? yearlyProgress[activeYear] : null;
    const quartersOpenCount = checklistData?.quartersOpen?.length || 0;
    return [
      {
        key: "confidence",
        title: "Te controleren",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        value: confidenceSummary.needsReview,
        subtitle:
          confidenceSummary.needsReview > 0
            ? `${confidenceSummary.unclear} onduidelijk, ${confidenceSummary.review} controleren (${confidenceSummary.needsReviewTx} transacties)`
            : "Alles automatisch met vertrouwen ingedeeld",
        tone: confidenceSummary.needsReview > 0 ? "attention" : "ok",
        hint: "Transacties met onzekere classificatie bekijken",
        onClick: () => {
          if (confidenceSummary.needsReview > 0) setOpenConfidenceLevel(confidenceSummary.unclearExBulk > 0 || confidenceSummary.review === 0 ? "fallback" : "heuristic");
          jumpToSection(confidenceSectionRef);
        },
      },
      {
        key: "personReview",
        title: "Overboekingen aan personen",
        icon: <Users className="h-3.5 w-3.5" />,
        value: pendingPersonReview.length,
        subtitle: pendingPersonReview.length > 0 ? "nog te bepalen" : "Niets openstaand",
        tone: pendingPersonReview.length > 0 ? "attention" : "ok",
        hint: "Openstaande overboekingen aan personen bekijken",
        onClick: () => {
          // V90 — "Overboekingen aan personen" verschijnt pas als de herkomst van inkomsten is beantwoord;
          // zolang die nog openstaat, ga je eerst daarheen (anders gebeurde er niets).
          if (pendingIncomeReview.length > 0) { jumpToSection(incomeReviewSectionRef); return; }
          setShowPersonReview(true);
          jumpToSection(personReviewSectionRef);
        },
      },
      {
        key: "overigReview",
        title: '"Overig" opruimen',
        icon: <HelpCircle className="h-3.5 w-3.5" />,
        value: pendingOverigReview.length,
        subtitle: pendingOverigReview.length > 0 ? "tegenpartij(en) nog te bepalen" : "Niets openstaand",
        tone: pendingOverigReview.length > 0 ? "attention" : "ok",
        hint: 'Openstaande "Overig"-tegenpartijen bekijken',
        onClick: () => {
          setShowOverigReview(true);
          jumpToSection(overigReviewSectionRef);
        },
      },
      {
        // v246 — de kleur/melding is nu gebaseerd op duplicatePendingBreakdown.onzeker (echt zelf te
        // beoordelen) i.p.v. pendingDuplicateCount als geheel: zodra alle gevonden duplicaten met
        // zekerheid zijn bevestigd op basis van het lopende saldo, is er niets meer te BEOORDELEN (wel
        // nog te verwijderen), dus geen amber "aandacht" meer nodig.
        key: "duplicates",
        title: "Duplicaten",
        icon: <Copy className="h-3.5 w-3.5" />,
        value: pendingDuplicateCount,
        subtitle:
          duplicatePendingBreakdown.onzeker > 0
            ? `${duplicatePendingBreakdown.onzeker} zelf te beoordelen`
            : pendingDuplicateCount > 0
            ? "alle bevestigd — nog te verwijderen"
            : "Geen gevonden",
        tone: duplicatePendingBreakdown.onzeker > 0 ? "attention" : "ok",
        hint: "Mogelijk dubbele transacties bekijken",
        onClick: () => {
          if (pendingDuplicateCount > 0) setDismissedDuplicateNotice(false);
          jumpToSection(duplicatesSectionRef);
        },
      },
      // ---- Fase 2 (v218) — per geselecteerd jaar (activeYear), zelfde jaar als StickyYearNav. Deze
      // kaarten verschijnen alleen zodra er een jaar geselecteerd is (na het laden van transacties
      // is dat altijd het geval — zie de activeYear-init hieronder in de bestandsladers). ----
      ...(activeYear
        ? [
            // v254 — herzien op expliciet verzoek: deze kaart heette "Aangifte {jaar} X%", wat
            // suggereerde dat X% = hoe ver de aangifte zelf gevorderd is. Nu drie losse regels die
            // niet met elkaar verrekend worden: Dossiercontrole (zuiver administratief — is alles
            // ingedeeld/beoordeeld/bekend?), Indicatieve aangifte (hoeveel aannames zitten er nog in
            // de berekening?) en Werkelijke aangifte (is de aangifte zelf al geregistreerd als
            // gedaan?). Een dossier kan dus "Dossiercontrole: Compleet" tonen terwijl "Werkelijke
            // aangifte: Niet geregistreerd" blijft staan — dat is precies het punt.
            {
              key: "yearStatus",
              title: `Dossierstatus ${activeYear}`,
              icon: <CardIcon name="list" />,
              lines: [
                {
                  label: "Dossiercontrole",
                  value: !yearProgress || yearProgress.openPunten === 0 ? "🟢 Compleet" : `🟠 ${yearProgress.openPunten} ${yearProgress.openPunten === 1 ? "punt" : "punten"}`,
                },
                {
                  label: "Indicatieve aangifte",
                  value: !yearProgress || yearProgress.aannamesCount === 0 ? "🟢 Geen aannames" : `🟠 ${yearProgress.aannamesCount} ${yearProgress.aannamesCount === 1 ? "aanname" : "aannames"}${yearProgress.aannamesLabels?.length > 0 && yearProgress.aannamesLabels.length <= 2 ? ` (${yearProgress.aannamesLabels.join(", ")})` : ""}`,
                },
                {
                  // v285 — voorheen maar 3 vaste standen (Niet/Deels/Gedaan), ongeacht hoeveel van de
                  // aangiftes al waren afgevinkt — nu een concreet aantal ("X van N gedaan") met een
                  // kleur die per stap oploopt van rood (nog niks) naar groen (alles gedaan), zodat 1
                  // van de 6 gedaan er zichtbaar anders uitziet dan 5 van de 6. N is het werkelijke
                  // aantal verschuldigde aangiftes dit jaar (BTW-kwartalen die dit jaar transacties
                  // hadden, plus IB+Zvw voor zzp/eenmanszaak of Vpb voor een BV — zie yearlyProgress).
                  label: "Werkelijke aangifte",
                  value: (() => {
                    const done = yearProgress?.werkelijkAangifteDone ?? 0;
                    const total = yearProgress?.werkelijkAangifteTotal ?? 0;
                    if (total === 0) return "⚪ Niet van toepassing";
                    const frac = done / total;
                    const dot = frac === 0 ? "🔴" : frac < 0.5 ? "🟠" : frac < 1 ? "🟡" : "🟢";
                    return `${dot} ${done} van ${total} gedaan`;
                  })(),
                },
              ],
              subtitle: yearProgress?.gatDitJaar
                ? "Gat in bestandscontinuïteit (verschil ≥ €1000)"
                : yearProgress?.onzekerDitJaar > 0
                ? `${yearProgress.onzekerDitJaar} onzeker dit jaar`
                : yearProgress?.geelDitJaar
                ? "Saldo tussen bestanden sluit niet helemaal aan (verschil €500–€999)"
                : null,
              tone: yearProgress?.status === "groen" ? "ok" : yearProgress?.status === "rood" ? "attention" : "neutral",
              hint: "Naar de controlelijst voor dit jaar",
              onClick: () => jumpToSection(checklistSectionRef),
            },
            {
              // v246 — deze kaart keek voorheen alleen naar de winst zelf (pas amber bij een verlies).
              // Daardoor kon een jaar met prima winst hier "neutraal" ogen, terwijl het Meerjarenoverzicht
              // verderop (ingeklapt, dus niet altijd zichtbaar) al een Tekort/Over-waarschuwing toont —
              // winst die niet volstaat naast privé-uitgaven + belasting. Nu neemt deze kaart dat signaal
              // (businessAdvies, dezelfde berekening als de rode balk in het Meerjarenoverzicht) mee, zodat
              // je het niet kunt missen zonder dat blok open te klappen. Een echt verlies (winst < 0) blijft
              // het meest ernstige signaal (rood/"risk"); een tekort ondanks positieve winst is amber.
              // v254 — de kaart toonde voorheen alleen de winst zelf als groot bedrag, met de Tekort/Over-
              // duiding puur in de subtitel-tekst. Dat liet de indruk ontstaan dat een "tekort" een fiscaal
              // verlies zou zijn. Nu twee losse, duidelijk gelabelde regels (zelfde "lines"-opzet als de
              // IB & Zvw-kaart hieronder): het fiscale resultaat (winst uit onderneming) los van het
              // privé/kasstroomsignaal (Tekort/Over — dekt de winst de privé-uitgaven + belasting?).
              key: "result",
              title: `Resultaat ${activeYear}`,
              icon: <CardIcon name="euro" />,
              lines: [
                { label: "Fiscaal resultaat", value: yearlySummary ? `Winst ${eur(yearlySummary.winst)}` : "—" },
                {
                  label: "Privé/kasstroomsignaal",
                  value:
                    businessAdvies == null
                      ? "—"
                      : businessAdvies.niveau === "negatief"
                      ? `Indicatief tekort ${eur(Math.abs(businessAdvies.verschil))}`
                      : `Indicatief over ${eur(businessAdvies.verschil)}`,
                },
              ],
              subtitle:
                yearlySummary && yearlySummary.winst < 0
                  ? "Fiscaal verlies"
                  : businessAdvies?.niveau === "negatief"
                  ? "Winst, maar tekort t.o.v. privé-uitgaven + belasting — geen fiscaal verlies"
                  : "Winst (indicatief)",
              tone:
                yearlySummary && yearlySummary.winst < 0
                  ? "risk"
                  : businessAdvies?.niveau === "negatief"
                  ? "attention"
                  : "ok",
              hint: "Naar het jaaroverzicht",
              onClick: () => setShowMultiYearModal(true),
            },
            // v237 — twee kaarten met de indicatieve fiscale doorrekening voor het geselecteerde jaar,
            // naast de "Resultaat"-kaart hierboven: IB+Zvw in 1 box, de drie aftrekposten in de andere.
            // Alleen bij zzp/eenmanszaak (rechtsvorm !== "bv") — een BV kent deze posten niet op deze
            // manier. Beide klikken door naar dezelfde "Indicatieve aangifteberekening" als elders in
            // de app, waar de volledige, preciezere uitsplitsing (incl. het "onbekend"-urencriterium-
            // scenario) te zien is — deze kaarten zijn bewust een vereenvoudigde samenvatting.
            ...(rechtsvorm !== "bv" && dashboardAangifteIndicatie
              ? [
                  {
                    key: "ibZvw",
                    title: `IB & Zvw ${activeYear} (indicatief)`,
                    icon: <CardIcon name="calc" />,
                    // v239 — losse bedragen (geen opgeteld totaal) — zie "lines" in DashboardOverview.jsx.
                    lines: [
                      { label: "IB", value: eur(dashboardAangifteIndicatie.ib.belasting) },
                      { label: "Zvw", value: eur(dashboardAangifteIndicatie.zvw.bijdrage) },
                    ],
                    tone: "neutral",
                    hint: "Naar de indicatieve aangifteberekening",
                    onClick: () => setShowAangifteYearPicker(true),
                  },
                  {
                    key: "aftrekposten",
                    title: "Aftrekposten (indicatief)",
                    icon: <CardIcon name="minus" />,
                    lines: [
                      { label: "Zelfstandigenaftrek", value: eur(dashboardAangifteIndicatie.zelfstandigenaftrekBedrag) },
                      { label: "MKB-winstvrijstelling", value: eur(dashboardAangifteIndicatie.mkbVrijstellingBedrag) },
                      { label: "Startersaftrek", value: eur(dashboardAangifteIndicatie.startersaftrekBedrag) },
                    ],
                    tone: "neutral",
                    hint: "Naar de indicatieve aangifteberekening",
                    onClick: () => setShowAangifteYearPicker(true),
                  },
                ]
              : []),
            {
              key: "loans",
              title: "Leningen",
              icon: <CardIcon name="doc" />,
              value: loanSummary.length,
              // v242 — 3 aparte kleurtoestanden i.p.v. 2 ("attention" dekte zowel "1 van de 3 nog
              // onvolledig" als "geen enkele lening heeft gegevens" met dezelfde amber kleur): "goed"
              // (alles compleet, groen), "deels" (sommige wel/sommige niet, amber) en "ontbreekt" (er
              // zijn leningen gevonden maar nergens iets ingevuld, rood — dringender dan "deels").
              // "Geen gevonden" (0 leningen) blijft neutraal, dat is geen echt op te lossen punt.
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
              subtitle:
                incompleteLeasesCount > 0
                  ? `🟠 ${incompleteLeasesCount} ${incompleteLeasesCount === 1 ? "contract heeft" : "contracten hebben"} nog ontbrekende gegevens`
                  : leaseSummary.length > 0
                  ? "Alle gegevens compleet"
                  : "Geen gevonden",
              // v234-fix: zelfde correctie als bij "Leningen" hierboven.
              tone: incompleteLeasesCount > 0 ? "attention" : leaseSummary.length > 0 ? "ok" : "neutral",
              hint: "Naar de lease-sectie",
              onClick: () => jumpToSection(leasesSectionRef),
              actionLabel: incompleteLeasesCount > 0 ? "Controleren" : null,
            },
            {
              // Toonde eerst alleen een getal ("X nog niet aangegeven/betaald") — nu per kwartaal
              // meteen het BTW-saldo (verschuldigde BTW min voorbelasting, zelfde berekening als de
              // "BTW-saldo per kwartaal"-regel in het aangiftevoorstel), zodat je in één oogopslag
              // ziet om welke bedragen het gaat i.p.v. alleen dát er nog iets openstaat. Een kwartaal
              // zonder transacties (nog) telt hier als € 0,00, niet als ontbrekend.
              key: "btwQuarters",
              title: `BTW-kwartalen ${activeYear}`,
              icon: <CardIcon name="receipt" />,
              // v284 — rechtsboven in de kop van deze kaart nu ook het jaartotaal (som van de 4
              // kwartaalsaldo's), eveneens met expliciet "te betalen"/"te ontvangen" — zelfde
              // dubbelzinnigheid-fix als bij de losse Q1-Q4-regels hieronder, maar dan voor het jaar
              // als geheel, zodat je dat in één oogopslag ziet zonder de 4 regels bij elkaar op te
              // hoeven tellen.
              value: (() => {
                const totaal = [1, 2, 3, 4].reduce((a, kwartaal) => {
                  const q = quarterlyBtwData.find((item) => item.kwartaal === kwartaal);
                  return a + (q ? q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting + (q.btwPrivegebruikAuto || 0) : 0);
                }, 0);
                return `${eur(Math.abs(totaal))} ${totaal < 0 ? "te ontvangen" : "te betalen"}`;
              })(),
              lines: [1, 2, 3, 4].map((kwartaal) => {
                const q = quarterlyBtwData.find((item) => item.kwartaal === kwartaal);
                const saldo = q ? q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting + (q.btwPrivegebruikAuto || 0) : 0;
                // v283 — voorheen stond er bij een positief saldo alleen het bedrag (zonder "te
                // betalen"), en bij een negatief saldo "terug" — op verzoek nu bij élk kwartaal
                // expliciet "te betalen" of "te ontvangen" erachter, zodat het nooit dubbelzinnig is.
                return {
                  label: `Q${kwartaal}`,
                  value: `${eur(Math.abs(saldo))} ${saldo < 0 ? "te ontvangen" : "te betalen"}`,
                };
              }),
              subtitle: quartersOpenCount > 0 ? "nog niet aangegeven/betaald" : "Alle kwartalen bijgewerkt",
              tone: quartersOpenCount > 0 ? "attention" : "ok",
              hint: "Naar het BTW-kwartaaloverzicht",
              onClick: () => setShowQuarterlyBtwModal(true),
            },
            // v240 — vervangt de "Factuurperiode"-kaart die hier stond (die is verhuisd naar het
            // Controleren-tabblad) — zelfde stijl als "BTW-kwartalen" hierboven: een getal per
            // openstaand item (hier: IB/IH en Zvw voor {activeYear}, max. 2), i.p.v. een bedrag.
            // v285 — deze kaart ging er tot nu toe altijd van uit dat IB/Zvw bestaan, ook voor een BV
            // (die kent geen IB/Zvw, alleen Vpb) — daardoor stond dit voor een BV eeuwig op "1 open"
            // (Zvw wordt nooit afgevinkt) terwijl er niets fout was. Nu voor een BV de Vpb-aangifte
            // i.p.v. IB/Zvw.
            rechtsvorm === "bv"
              ? {
                  key: "ibZvwAangiften",
                  title: `Vpb-aangifte ${activeYear}`,
                  icon: <CardIcon name="mail" />,
                  value: vpbStatus[activeYear]?.gedaan ? 0 : 1,
                  subtitle: vpbStatus[activeYear]?.gedaan ? "Afgehandeld" : "nog niet afgevinkt als gedaan",
                  tone: vpbStatus[activeYear]?.gedaan ? "ok" : "attention",
                  hint: "Naar de controlelijst voor dit jaar",
                  onClick: () => jumpToSection(checklistSectionRef),
                }
              : {
                  key: "ibZvwAangiften",
                  title: `IB/Zvw aangiften ${activeYear}`,
                  icon: <CardIcon name="mail" />,
                  value: (ibStatus[activeYear]?.gedaan ? 0 : 1) + (zvwStatus[activeYear]?.gedaan ? 0 : 1),
                  subtitle: ibStatus[activeYear]?.gedaan && zvwStatus[activeYear]?.gedaan ? "Beide afgehandeld" : "nog niet afgevinkt als gedaan",
                  tone: ibStatus[activeYear]?.gedaan && zvwStatus[activeYear]?.gedaan ? "ok" : "attention",
                  hint: "Naar de controlelijst voor dit jaar",
                  onClick: () => jumpToSection(checklistSectionRef),
                },
            // v286 — op verzoek: nergens was in één oogopslag te zien hoeveel bestanden zakelijk/
            // privé geladen zijn en of die onderling matchen (overboekingen zakelijk ↔ privé) — deze
            // kaart hergebruikt dezelfde aansluitControleInfo als de "Controle zakelijk ↔ privé"-kaart
            // op Controleren (geen tweede berekening), plus een simpele telling uit accountTypeByFile.
            {
              key: "bestandenOverzicht",
              title: "Bestanden geladen",
              icon: <CardIcon name="folder" />,
              lines: [
                { label: "Zakelijk", value: `${Object.values(accountTypeByFile).filter((t) => t === "Zakelijk").length}x` },
                { label: "Privé", value: `${Object.values(accountTypeByFile).filter((t) => t === "Prive").length}x` },
              ],
              subtitle: aansluitControleInfo.heeftData
                ? aansluitControleInfo.subtitle
                : `Geen overboekingen zakelijk ↔ privé gevonden in ${activeYear}.`,
              tone: aansluitControleInfo.heeftData ? aansluitControleInfo.tone : "neutral",
              hint: "Naar de aansluiting & detailtabellen",
              onClick: () => jumpToSection(detailsSectionRef),
            },
            // ---- Fase 3 (v219): situationeel, alleen als er echt een signaal is ----
            ...(rechtsvorm === "bv" && bvSignalering
              ? [
                  {
                    key: "bvSignalering",
                    title: "BV-signalering",
                    icon: <AlertTriangle className="h-3.5 w-3.5" />,
                    value: "!",
                    subtitle: bvSignalering.redenen[0] || "Bekijk de toelichting",
                    tone: "attention",
                    hint: "Naar de BV-signalering",
                    onClick: () => jumpToSection(bvSignaleringSectionRef),
                  },
                ]
              : []),
          ]
        : []),
      // ---- Fase 3 (v219, vervolg) — dossierbreed, niet jaar-gebonden ----
      ...(transactions.length > 0 && (korRegeling === null || (korRegeling === false && btwVerlegd === null))
        ? [
            {
              key: "btwSettings",
              title: "BTW-instellingen",
              icon: <Settings className="h-3.5 w-3.5" />,
              value: "!",
              subtitle: korRegeling === null ? "KOR-vraag nog niet beantwoord" : "BTW-verlegd-vraag nog niet beantwoord",
              tone: "attention",
              hint: "Naar de BTW-instellingen",
              onClick: () => jumpToSection(btwSettingsSectionRef),
            },
          ]
        : []),
      // v240 — "Factuurperiode" is verhuisd naar het nieuwe mini-dashboard op tabblad "Controleren"
      // (zie controlerenDashboardCards hieronder) — hier op Overzicht vervangen door "IB/Zvw
      // aangiften" hierboven, in dezelfde stijl (getal = nog te doen) als de BTW-kwartalen-kaart.
    ];
  }, [
    transactions.length,
    confidenceSummary,
    pendingPersonReview.length, pendingIncomeReview.length,
    pendingOverigReview.length,
    pendingDuplicateCount,
    duplicatePendingBreakdown,
    activeYear,
    yearlyProgress,
    yearlySummary,
    businessAdvies,
    dashboardAangifteIndicatie,
    ibStatus,
    zvwStatus,
    vpbStatus,
    accountTypeByFile,
    aansluitControleInfo,
    loanSummary,
    loanDetails,
    incompleteLoansCount,
    leaseSummary,
    leaseDetails,
    confirmedLeaseTypeKeys,
    incompleteLeasesCount,
    checklistData,
    rechtsvorm,
    bvSignalering,
    korRegeling,
    btwVerlegd,
    quarterlyBtwData,
  ]);
}
