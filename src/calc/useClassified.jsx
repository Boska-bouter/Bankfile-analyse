// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import { SPLIT_CATEGORY_NAMES } from "../classification/categories.js";
import { ibansMatch } from "../utils/normalization.js";
import { detectOwnAccountTransfer, eigenRekeningVast, resolveClassification, overrideSleutel } from "../classification/classify.js";
import { koppelDoorsluisOverboekingen } from "../classification/doorsluis.js";
import { scoreClassification } from "../classification/confidence.js";
import { percentagesMetWerkruimte } from "../tax/werkruimte.js";
import { herkenTerugbetalingen } from "../classification/terugbetalingen.js";
import { personenViaIban } from "../classification/personenViaIban.js";
import { markeerNakijkSignalen } from "../classification/nakijkSignalen.js";
import { verschuifNaarFactuurjaar, verschuifKostenNaarVorigJaar } from "../classification/factuurjaar.js";
import { LENING_CATS, heeftLeningWoord, hoortBijLening, LENING_EIGEN } from "../classification/leningBoeking.js";
import { gedeeldeKeuzeLabel } from "../classification/gedeeldeNamen.js";
import { maakLeerModel, leerVoorstel, leerLabel, LEER_ONBEKEND } from "../classification/lerenVanKeuzes.js";

export function useClassified(p) {
  const {
    ZAKELIJKE_SPIEGEL_CATEGORIEEN, accountTypeByFile, businessExpenseKeywords, businessKeywords, categoryRules,
    eigenNamenKeywords, overridesByCounterparty, overridesByRow, ownAccountsElsewhereByFile: ownAccountsElsewhereByFile0, parsedFiles,
    transactions, zakelijkeSpaarKeywords, categoryZakelijkPercentage, werkruimteStatus, herkenning = null,
    leaseSoortWizard = null, // beide-V10R5 — "financial": automatisch herkende lease wordt financiële lease
    kostenVorigJaarNiet = null, // nieuw-V3R0 — [ids] automatisch verschoven teruggaven die toch in het jaar van ontvangst tellen
    kostenVorigJaar = null, // nieuw-V3R0 — [ids] teruggaven in een kostencategorie die bij het vorige jaar horen
    factuurjaar = null, // beide-V11R7 — { uit, niet: [ids] } uit bevestigdeControles (classification/factuurjaar.js)
    gedeeldeNamenVersie = 0, // nieuw-V2R1 — opnieuw indelen als de gedeelde namenlijst binnen is
    eigenRekeningAanpasbaar = false, // huishoudboekje-V1R2 — opgegeven (niet geladen) eigen rekening ligt niet vast
  } = p;
  const ownAccountsElsewhereByFile = useMemo(() => {
    if (!eigenRekeningAanpasbaar) return ownAccountsElsewhereByFile0;
    return Object.fromEntries(Object.entries(ownAccountsElsewhereByFile0 || {}).map(([f, l]) => [f, (l || []).map((o) => (o.isLoadedFile ? o : { ...o, aanpasbaar: true }))]));
  }, [ownAccountsElsewhereByFile0, eigenRekeningAanpasbaar]);

  return useMemo(() => {
    // release32V4 — zelfde percentages als de aangifte, dus ook "soort ruimte = privé / niet zelfstandig" telt als 0%.
    const pctEff = percentagesMetWerkruimte(categoryZakelijkPercentage, werkruimteStatus, [...new Set(transactions.map((tx) => tx.year))]);
    // beide-V1R6 — privédossier: de profielherkenning verfijnt de automatische uitkomst (modus/prive/herkenning.js).
    const autoRegels = herkenning ? herkenning.uitgaveRegels(categoryRules) : categoryRules;
    const herkenCtx = herkenning?.context ? herkenning.context(transactions, { eigenNamen: eigenNamenKeywords }) : null; // beide-V2R2 — o.a. terugbetalingen
    // huishoudboekje-V6R2 — een keuze "Lening" op de hele tegenpartij geldt alleen voor de leningboekingen van die tegenpartij, als
    // die er zijn (Boska 6-11, Dakhlaoui: "snappcar", "brandstof", "ticket", "brandblusser" van dezelfde persoon stonden onder de lening).
    // Boekingen zonder omschrijving blijven wel bij de lening (Boska 6-11).
    // Heeft geen enkele boeking van die tegenpartij een lening-woord, dan geldt de keuze zoals altijd voor alles (zelf aangewezen lening).
    const leningSleutel = (tx) => {
      if (overridesByRow[tx.id]) return "";
      const k = overrideSleutel(tx, overridesByCounterparty, accountTypeByFile[tx.source]);
      return k && LENING_CATS.has(overridesByCounterparty[k]?.category) ? k : "";
    };
    const leningMetWoord = new Set(transactions.filter(heeftLeningWoord).map(leningSleutel).filter(Boolean));
    const keuzesZonder = new Map();
    const keuzesVoor = (tx) => {
      const k = leningMetWoord.size && !hoortBijLening(tx) ? leningSleutel(tx) : "";
      if (!k || !leningMetWoord.has(k)) return overridesByCounterparty;
      if (!keuzesZonder.has(k)) { const { [k]: _weg, ...rest } = overridesByCounterparty; keuzesZonder.set(k, rest); }
      return keuzesZonder.get(k);
    };
    const base00ruw = transactions.map((tx) => {
      const overridesByCounterparty = keuzesVoor(tx);
      let resolved = resolveClassification(
        tx, autoRegels, businessKeywords, businessExpenseKeywords, accountTypeByFile[tx.source],
        overridesByCounterparty, overridesByRow, ownAccountsElsewhereByFile[tx.source] || [], eigenNamenKeywords, zakelijkeSpaarKeywords,
        herkenning ? (uitkomst) => herkenning.verfijn(tx, uitkomst, categoryRules, herkenCtx) : null
      );
      // beide-V10R5 — in de wizard "financiële lease" gekozen: een leasemaatschappij die alleen op naam als lease is herkend (geen eigen
      // keuze) telt als financiële lease (test R. Meijer 28-10: Volkswagen Pon Financial Services werd operationeel, VWPFS financieel).
      if (leaseSoortWizard === "financial" && resolved.category === "Lease (operationeel)" && !overridesByRow[tx.id] && !overrideSleutel(tx, overridesByCounterparty)) {
        resolved = { ...resolved, category: "Lease (financieel)" };
      }
      const transferLocked = eigenRekeningVast(tx, accountTypeByFile[tx.source], ownAccountsElsewhereByFile[tx.source] || []);
      const eigenOverboeking = transferLocked || !!detectOwnAccountTransfer(tx, accountTypeByFile[tx.source], ownAccountsElsewhereByFile[tx.source] || []);
      if (herkenning?.naKeuze) resolved = herkenning.naKeuze(tx, resolved, { eigenKeuzeVoorBoeking: !!overridesByRow[tx.id] || (!transferLocked && !!overrideSleutel(tx, overridesByCounterparty)), vastgezet: eigenOverboeking, eigenRekeningen: ownAccountsElsewhereByFile[tx.source] || [] });
      let confidence = scoreClassification(tx, categoryRules, overridesByCounterparty, overridesByRow, resolved.category, ownAccountsElsewhereByFile[tx.source] || [], businessKeywords, businessExpenseKeywords);
      // nieuw-V2R1 — uit de gedeelde namenlijst: zeker telt als herkend, een voorstel blijft op "nakijken".
      if (resolved.gedeeld && confidence.level !== "override") confidence = { level: resolved.gedeeld.zeker ? "keyword" : "heuristic", label: gedeeldeKeuzeLabel(resolved.gedeeld) };
      // accountType = het type van de REKENING waar de boeking op staat (weergave in detailvensters). `type`
      // blijft zoals het was: een override (bijv. een bevestigde zakelijke klant) kan daar "Zakelijk" op zetten
      // zodat de boeking in de zakelijke overzichten meetelt, ook als hij op een privérekening staat.
      // Oudere dossiers hebben voor privé-boekingen soms nog de zakelijke fijne categorie als handmatige keuze
      // ("Huur", "Energie-water", …). Blijft de boeking privé en staat het %-zakelijk van die categorie in
      // dat jaar uitdrukkelijk op 0 (dus: geen bedrag verschuift), dan krijgt hij de privé-tegenhanger
      // ("Privé - huur", …) zoals nieuwe boekingen. Is er een percentage > 0 of niets ingesteld, dan blijft
      // alles ongewijzigd, zodat er nooit een bedrag stilzwijgend verspringt.
      const tegenhanger = SPLIT_CATEGORY_NAMES[resolved.category];
      if (tegenhanger && resolved.type === "Prive" && accountTypeByFile[tx.source] !== "Zakelijk") {
        const pct = (c) => { const m = pctEff?.[c]; return m?.[`${tx.year}:prive`] ?? m?.[tx.year]; };
        if (pct(resolved.category) === 0 && !(pct(tegenhanger) > 0)) resolved = { ...resolved, category: tegenhanger };
      }
      // nieuw-V1R9 — geld van of naar een eigen of partnerrekening met "lening" in de omschrijving is een lening, geen privé storting/opname
      // (besluit Boska 10-11, Dakhlaoui: partner leende het bedrijf geld en kreeg het terug). Op controleren; voorgeschoten inkopen niet.
      //   Omdat de boeking dan niet meer vastligt, kan de gebruiker hem ook zelf anders indelen (per boeking of per tegenpartij).
      if (transferLocked && accountTypeByFile[tx.source] === "Zakelijk" && LENING_EIGEN.test(`${tx.description || ""} ${tx.fullDescription || ""}`)) {
        const sleutel = overrideSleutel(tx, overridesByCounterparty, accountTypeByFile[tx.source]);
        const eigen = overridesByRow[tx.id] || (sleutel ? overridesByCounterparty[sleutel] : null);
        const lening = { ...tx, ...resolved, category: "Leningen", transferLocked: false, leningEigenRekening: true, accountType: "Zakelijk" };
        if (eigen?.category) return { ...lening, category: eigen.category, confidence: { level: "override", label: overridesByRow[tx.id] ? "Handmatig bevestigd (deze transactie)" : "Handmatig bevestigd (tegenpartij)" } };
        return { ...lening, confidence: { level: "heuristic", label: "Lening van of naar eigen/partnerrekening (staat in de omschrijving)" } };
      }
      return { ...tx, ...resolved, confidence, transferLocked, accountType: accountTypeByFile[tx.source] === "Zakelijk" ? "Zakelijk" : "Prive" };
    });
    // beide-V16R1 — leren van je eigen keuzes (classification/lerenVanKeuzes.js): een onbekende boeking krijgt een voorstel als je bij
    // vergelijkbare onbekende boekingen (zelfde rekening, richting, pin/overboeking, bedraggroep) meestal hetzelfde koos. Op "nakijken".
    const base00 = (() => {
      const eigen = base00ruw.filter((t) => t.confidence?.level === "override" && !t.transferLocked);
      if (eigen.length < 5) return base00ruw;
      const perId = new Map(transactions.map((x) => [x.id, x]));
      const keuzes = eigen.map((t) => {
        const tx = perId.get(t.id) || t;
        const auto = resolveClassification(
          tx, autoRegels, businessKeywords, businessExpenseKeywords, accountTypeByFile[tx.source], {}, {},
          ownAccountsElsewhereByFile[tx.source] || [], eigenNamenKeywords, zakelijkeSpaarKeywords,
          herkenning ? (uitkomst) => herkenning.verfijn(tx, uitkomst, categoryRules, herkenCtx) : null
        )?.category;
        return { tx, accountType: accountTypeByFile[tx.source], auto, categorie: t.category };
      });
      const model = maakLeerModel(keuzes);
      return base00ruw.map((t) => {
        if (t.transferLocked || t.confidence?.level === "override" || !LEER_ONBEKEND.has(t.category)) return t;
        const v = leerVoorstel(model, t, accountTypeByFile[t.source], t.category, { eigenNamen: eigenNamenKeywords });
        return v ? { ...t, category: v.categorie, geleerd: v, confidence: { level: "heuristic", label: leerLabel(v, t), geleerd: true } } : t;
      });
    })();
    // beide-V5R1 — privé: dezelfde eigen rekening in beide richtingen dezelfde soort (sparen/beleggen), zie herkenning.js.
    const vasteSoortIbans = new Set(Object.values(ownAccountsElsewhereByFile).flat().filter((o) => o?.soort).map((o) => String(o.iban).replace(/\s+/g, "").toUpperCase()));
    const base0a = herkenTerugbetalingen(personenViaIban(base00)); // beide-V8R4 — terugbetaling is geen omzet; nieuw-V1R8 — persoon via rekeningnummer
    const base0 = herkenning?.samenhang ? herkenning.samenhang(base0a, { vasteSoortIbans }) : base0a;
    // Een geladen privérekening die geld krijgt van/stuurt naar een opgegeven maar niet geladen ándere
    // eigen privérekening wordt herkend als "Interne overboeking" (twee privérekeningen onderling). Staat er
    // aan de zakelijke kant een opname/terugboeking met hetzelfde bedrag, dezelfde tegenrekening en een
    // datum binnen 5 dagen, dan is dit in werkelijkheid de privékant van die zakelijke boeking
    // (zakelijk -> andere privérekening -> deze rekening): noem hem dan "Ontvangen van zakelijk" /
    // "Terugboeking naar zakelijk", zodat beide kanten van het overzicht gelijk zijn.
    const dagen5 = 5 * 86400000;
    const zakKandidaten = base0.filter((t) => t.type === "Zakelijk" && (t.category === "Privé opnames" || t.category === "Terugboeking van privé") && t.counterpartyIban);
    const gebruiktZak = new Set();
    const base1 = zakKandidaten.length === 0 ? base0 : base0.map((tx) => {
      if (tx.category !== "Interne overboeking" || tx.type !== "Prive" || tx.accountType !== "Prive" || !tx.counterpartyIban) return tx;
      const naarNietGeladen = (ownAccountsElsewhereByFile[tx.source] || []).some(
        (o) => o.accountType === "Prive" && !o.isLoadedFile && ibansMatch(tx.counterpartyIban, o.iban)
      );
      if (!naarNietGeladen) return tx;
      const wil = tx.amount > 0 ? "Privé opnames" : "Terugboeking van privé";
      const z = zakKandidaten.find((q) =>
        !gebruiktZak.has(q.id) && q.category === wil && Math.abs(q.amount + tx.amount) < 0.005 &&
        ibansMatch(q.counterpartyIban, tx.counterpartyIban) && Math.abs(q.date - tx.date) <= dagen5
      );
      if (!z) return tx;
      gebruiktZak.add(z.id);
      const nieuweCat = tx.amount > 0 ? "Ontvangen van zakelijk" : "Terugboeking naar zakelijk";
      // nieuw-V3R2 — label past bij de nieuwe categorie (was nog het label van "Interne overboeking").
      return { ...tx, category: nieuweCat, confidence: { level: "keyword", label: `Gekoppeld aan de zakelijke boeking van ${z.date.toLocaleDateString("nl-NL")} (${nieuweCat})` } };
    });
    // beide-V11R7 — borg/eenmalig/loon/verzekering nakijken, daarna omzet in het factuurjaar.
    const base = verschuifKostenNaarVorigJaar(verschuifNaarFactuurjaar(markeerNakijkSignalen(koppelDoorsluisOverboekingen(base1, Object.values(accountTypeByFile).includes("Zakelijk"))), factuurjaar), kostenVorigJaar, kostenVorigJaarNiet);
    // "Privé opnames"/"Terugboeking van privé" (zakelijke kant) zijn geld dat tussen zakelijk en
    // privé beweegt. Staat zo'n boeking aan de zakelijke kant, dan voegen we er een
    // spiegelboeking van hetzelfde bedrag met omgekeerd teken aan toe — zodat de balans tussen
    // zakelijk en privé in beide richtingen klopt, zonder de oorspronkelijke boeking te veranderen.
    // Alleen als de bijbehorende privérekening niet zelf ook geladen is: staat die er wél bij, dan
    // heeft die eigen transactie via de eigen-rekening-herkenning hierboven al zijn eigen kant van
    // dezelfde overboeking gekregen — een spiegel zou die dan dubbel tellen.
    // `isLoadedFile` (zie ownAccountsElsewhereByFile hierboven) is hier bewust vereist: een via de
    // wizard opgegeven, maar nog niet geladen rekening levert nog GEEN eigen transactie op de andere
    // kant op — zonder deze voorwaarde werd de spiegel voor zo'n rekening ten onrechte óók
    // onderdrukt, waardoor het bedrag nergens meer zichtbaar was (geen spiegel én geen echte
    // transactie) totdat die rekening alsnog werd geladen.
    // v220: naast de specifieke IBAN-koppeling hieronder ook een generieke vangnet-check — is er
    // ÜBERHAUPT een privérekening-bestand in dit dossier geladen, dan is een spiegelboeking zo goed
    // als altijd overbodig (dit project volgt precies één ondernemer met hooguit een handvol eigen
    // rekeningen). Zonder dit vangnet bleef de spiegel ten onrechte bestaan zodra de IBAN-koppeling
    // om wat voor reden dan ook niet rond kwam (bijv. het bankbestand van de privérekening vermeldt
    // zijn eigen rekeningnummer niet op een manier die computeOwnAccountByFile herkent) — met een
    // reëel geladen privérekening-bestand ernaast leverde dat dan EXACT dezelfde overboeking dubbel
    // op: één keer als de echte, correct geclassificeerde privé-transactie, en één keer als
    // spiegelboeking die (per ongeluk) nog de zakelijke categorienaam ("Privé opnames"/"Terugboeking
    // van prive") droeg. Dit vangnet kiest bewust voor "geen spiegel" boven "misschien dubbel".
    const anyPriveFileLoaded = parsedFiles.some((pf) => accountTypeByFile[pf.fileName] === "Prive");
    const mirrors = [];
    for (const tx of base) {
      const otherSideAlsoLoaded =
        anyPriveFileLoaded || (ownAccountsElsewhereByFile[tx.source] || []).some((o) => o.accountType === "Prive" && o.isLoadedFile);
      if (
        (tx.category === "Privé opnames" || tx.category === "Terugboeking van privé") &&
        tx.type === "Zakelijk" && !otherSideAlsoLoaded
      ) {
        // viewType expliciet "Prive": de spiegel hoort in het PRIVÉ-overzicht. Zonder dit erfde hij viewType "Zakelijk" van het origineel
        // (via de spread) en viel hij in het zakelijke overzicht tegen de opname weg (netto € 0,00).
        mirrors.push({ ...tx, id: `${tx.id}-prive-spiegel`, amount: -tx.amount, type: "Prive", viewType: "Prive", isMirror: true });
      }
    }
    const result = mirrors.length ? [...base, ...mirrors] : base;
    // V46 — dossier met ALLEEN privérekening(en): elke transactie met categorie "Zakelijke
    // inkomsten"/"Zakelijke inkoop non-voedingsmiddelen" is een zakelijke boeking via de privérekening. Het
    // `type` blijft de rekening (Prive); alleen de zakelijke OVERZICHTEN (viewType) tonen ze, zodat
    // de zakelijke kant exact de spiegel is van die categorieën op de privékant.
    const heeftZakelijkeRekening = Object.values(accountTypeByFile).includes("Zakelijk");
    if (heeftZakelijkeRekening) return result;
    return result.map((tx) =>
      !tx.isMirror && tx.viewType !== "Zakelijk" && ZAKELIJKE_SPIEGEL_CATEGORIEEN.includes(tx.category) ? { ...tx, viewType: "Zakelijk" } : tx
    );
  }, [transactions, categoryZakelijkPercentage, werkruimteStatus, categoryRules, businessKeywords, businessExpenseKeywords, accountTypeByFile, overridesByCounterparty, overridesByRow, ownAccountsElsewhereByFile, eigenNamenKeywords, zakelijkeSpaarKeywords, parsedFiles, herkenning, leaseSoortWizard, factuurjaar, kostenVorigJaar, kostenVorigJaarNiet, gedeeldeNamenVersie]);
}
