// Nalopen: samenvattingen en acties voor onzekere boekingen, inkomsten, personen, Overig, trefwoorden en btw per tegenpartij.
// nieuw-V1R0 — uit App.jsx gehaald (opruimronde 9-11). Alle invoer komt binnen via `invoer`; namen die App pas later maakt via invoer.appLaat.
import { MAIN_CATEGORY_DEFAULT_SUBTYPE } from "../classification/categories.js";
import { bevestigdVoor, computeCategorySummary, computeIncomeCategorySummary, computeIncomeSummary, rekeningSoortVan, sleutelZonderNaam } from "../classification/reviewSummaries.js";
import { counterpartyKey, ibanKey, normKey } from "../utils/normalization.js";
import { overrideSleutel, sleutelVoorTegenpartij } from "../classification/classify.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { vindMogelijkeEigenRekeningen } from "../classification/mogelijkeEigenRekeningen.js";

export function useReviewActies(invoer) {
  const { accountTypeByFile, activeYear, bevestigdeControles, businessKeywords, classified, eenvoudigActief, eigenNamen, eigenRekeningenExtra, eigenRekeningenGeladen, incomeReviewSectionRef, modus, openConfidenceLevel, overigReviewSectionRef, overridesByCounterparty, ownAccountByFile, parsedFiles, personReviewSectionRef, reviewedIncomeKeys, reviewedOverigKeys, reviewedPersonKeys, setBevestigdeControles, setBusinessExpenseKeywords, setBusinessKeywords, setCategoryBtwRatesWithUndo, setEigenRekeningenExtra, setIncomeBtwTarieven, setMeerdereTarievenBevestigd, setOpenConfidenceLevel, setOverridesByCounterparty, setOverridesByRow, setReviewedIncomeKeys, setReviewedOverigKeys, setReviewedPersonKeys, setShowOverigReview, setShowPersonReview, showSetupWizard, snapshotBeforeAction, transactions } = invoer;
  const jumpToSection = (...args) => invoer.appLaat.jumpToSection(...args);
  const requestCategoryChange = (...args) => invoer.appLaat.requestCategoryChange(...args);
  const bekekenOverigSet = useMemo(() => new Set(reviewedOverigKeys), [reviewedOverigKeys]);
  const bekekenPersonenSet = useMemo(() => new Set(reviewedPersonKeys), [reviewedPersonKeys]);
  const bevestigdInBulkVenster = (tx) => {
    if (tx.kleinBedrag) return true; // huishoudboekje-V6R9 — klein bedrag, weinig invloed: geen open punt
    if (tx.category !== "Overig" && tx.category !== "Overboekingen aan personen") return false;
    const k = counterpartyKey(tx.counterparty || tx.description, tx.amount) || sleutelZonderNaam(tx);
    return bevestigdVoor(tx.category === "Overig" ? bekekenOverigSet : bekekenPersonenSet, k, tx);
  };
  const confidenceSummary = useMemo(() => {
    let approved = 0, reviewTx = 0, unclearTx = 0;
    const reviewGroups = new Set(), unclearGroups = new Set(), allGroups = new Set(), unclearExBulk = new Set(), reviewExBulk = new Set();
    for (const tx of classified) {
      if (tx.isMirror) continue;
      // V70 — losse pinbetalingen zonder herkend zoekwoord (categorie "Winkels divers", geschat) zijn
      // geen beslissingen per winkel: ze vormen samen ÉÉN controlepunt (de transacties zelf blijven
      // in de lijst "Classificatie zekerheid" staan).
      const losseWinkel = tx.category === "Winkels divers" && tx.confidence.level === "heuristic" && /losse pinbetaling/i.test(tx.confidence.label || "");
      const gk = losseWinkel ? "__losse-pinbetalingen__|Winkels divers" : `${counterpartyKey(tx.counterparty || tx.description, tx.amount) || tx.id}|${tx.category}`;
      allGroups.add(gk);
      if (tx.confidence.level === "override" || tx.confidence.level === "keyword") { approved++; continue; }
      // V90 — "Klopt zo" in het Overig-/Personen-venster telt als beoordeeld (anders blijft het onduidelijk tellen)
      if (bevestigdInBulkVenster(tx)) { approved++; continue; }
      if (tx.confidence.level === "heuristic") { reviewTx++; reviewGroups.add(gk); if (tx.category !== "Overig" && tx.category !== "Overboekingen aan personen") reviewExBulk.add(gk); }
      else { unclearTx++; unclearGroups.add(gk); if (tx.category !== "Overig" && tx.category !== "Overboekingen aan personen") unclearExBulk.add(gk); }
    }
    const review = reviewGroups.size, unclear = unclearGroups.size;
    // release31V1 — `openExBulk`: alleen wat NIET al in "Overig opruimen" of "Overboekingen aan personen" staat.
    // Die twee hebben een eigen kaart; voorheen telden dezelfde boekingen dubbel mee in de open punten
    // (bijv. 347 bij Classificatie, terwijl het venster "0 groepen + 555 elders" toonde).
    return { groupsTotal: allGroups.size, approved, review, unclear, unclearExBulk: unclearExBulk.size, reviewExBulk: reviewExBulk.size, openExBulk: reviewExBulk.size + unclearExBulk.size, reviewTx, unclearTx, needsReview: review + unclear, needsReviewTx: reviewTx + unclearTx, total: approved + reviewTx + unclearTx };
  }, [classified, reviewedOverigKeys, reviewedPersonKeys]);

  // ---- Data voor de 🟡/🔴-pop-up: "Overig" en "Overboekingen aan personen" horen daar altijd al
  // bij (die twee categorieën leveren per definitie nooit 🟢 op), dus die tellen we apart en
  // wijzen we liever naar de daarvoor bedoelde review-vensters dan dat we ze hier dupliceren. ----
  const uncertainModalData = useMemo(() => {
    if (!openConfidenceLevel) return null;
    const all = classified.filter((tx) => !tx.isMirror && tx.confidence.level === openConfidenceLevel && !bevestigdInBulkVenster(tx));
    const overigCount = all.filter((tx) => tx.category === "Overig").length;
    const personenCount = all.filter((tx) => tx.category === "Overboekingen aan personen").length;
    const rest = all.filter((tx) => tx.category !== "Overig" && tx.category !== "Overboekingen aan personen");
    return { transactions: rest, bulkCounts: { overig: overigCount, personen: personenCount } };
  }, [classified, openConfidenceLevel, reviewedOverigKeys, reviewedPersonKeys]);
  // V90 — een venster dat "0 open" meldt is overbodig: sluit automatisch zodra er niets (meer) te beoordelen is
  useEffect(() => {
    if (!openConfidenceLevel || !uncertainModalData) return;
    const b = uncertainModalData.bulkCounts;
    if (uncertainModalData.transactions.length === 0 && (b.overig || 0) + (b.personen || 0) === 0) setOpenConfidenceLevel(null);
  }, [openConfidenceLevel, uncertainModalData]);
  const jumpToOverigFromModal = () => {
    setOpenConfidenceLevel(null);
    setShowOverigReview(true);
    setShowPersonReview(false);
    jumpToSection(overigReviewSectionRef);
  };
  const jumpToPersonenFromModal = () => {
    setOpenConfidenceLevel(null);
    if (pendingIncomeReview.length > 0) { jumpToSection(incomeReviewSectionRef); return; }
    setShowPersonReview(true);
    setShowOverigReview(false);
    jumpToSection(personReviewSectionRef);
  };

  // ---- Inkomstenbronnen-review ----
  // beide-V3R0 — "Wie zijn je zakelijke klanten?" bestaat niet in een privédossier (daar geen omzet).
  const incomeSummary = useMemo(() => (modus.onderdelen.omzet === false ? [] : computeIncomeSummary(classified, accountTypeByFile, businessKeywords, ownAccountByFile)), [classified, accountTypeByFile, businessKeywords, modus.onderdelen.omzet, ownAccountByFile]);
  const pendingIncomeReview = useMemo(() => incomeSummary.filter((i) => !reviewedIncomeKeys.includes(i.key)), [incomeSummary, reviewedIncomeKeys]);
  // beide-V3R0 — opruimen in een privédossier: antwoorden op de (daar ten onrechte getoonde) vraag "Wie zijn je
  // zakelijke klanten?" zetten bijschrijvingen op "Overig" of "Zakelijke inkomsten". Die keuzes gaan weg, zodat de
  // automatische herkenning (pensioen, loon, terugbetaling) weer geldt. Een later gekozen andere categorie blijft.
  useEffect(() => {
    if (modus.onderdelen.omzet !== false || reviewedIncomeKeys.length === 0) return;
    const sleutels = new Set(reviewedIncomeKeys.map((k) => `${k}::pos`));
    setOverridesByCounterparty((prev) => {
      const weg = Object.keys(prev).filter((k) => sleutels.has(k) && ["Overig", "Zakelijke inkomsten"].includes(prev[k]?.category));
      if (weg.length === 0) return prev;
      const next = { ...prev };
      for (const k of weg) delete next[k];
      return next;
    });
    setReviewedIncomeKeys([]);
  }, [modus.onderdelen.omzet, reviewedIncomeKeys]); // eslint-disable-line react-hooks/exhaustive-deps
  const markIncomeSource = (item, choice) => {
    if (choice === "zakelijk") {
      setBusinessKeywords((prev) => (prev.includes(item.name) ? prev : [...prev, item.name]));
      setCounterpartyOverride(item.name, 1, { category: "Zakelijke inkomsten", type: "Zakelijk" });
      const kw = item.name.trim().toLowerCase();
      const matchingKeys = incomeSummary
        .filter((i) => {
          const n = i.name.trim().toLowerCase();
          return kw && n && (n.includes(kw) || kw.includes(n));
        })
        .map((i) => i.key);
      setReviewedIncomeKeys((prev) => [...new Set([...prev, item.key, ...matchingKeys])]);
      return;
    }
    // "Nee" — niet zakelijk: naar Overig, verder te verfijnen in de "Overig"-review of detailtabel
    // (in plaats van meteen een specifieke aanname als "Inkomsten" te forceren).
    setCounterpartyOverride(item.name, 1, { category: "Overig", type: "Prive" });
    setReviewedIncomeKeys((prev) => (prev.includes(item.key) ? prev : [...prev, item.key]));
  };

  // ---- "Overboekingen aan personen" en "Overig" opruimen ----
  const rekeningInfo = useMemo(() => ({ accountTypeByFile, ownAccountByFile }), [accountTypeByFile, ownAccountByFile]); // beide-V11R2
  // beide-V11R3 — tegenpartij per rekening splitsen (wens Boska 30-10): zelfde verzekeraar of Tikkie zakelijk én privé.
  const gesplitst = useCallback((tx) => !!overridesByCounterparty[sleutelVoorTegenpartij(tx, overridesByCounterparty)]?.gesplitst, [overridesByCounterparty]);
  const splitsRekening = (item, aan) => {
    const key = sleutelVoorTegenpartij(item.voorbeeldTx, overridesByCounterparty);
    if (!key) return;
    snapshotBeforeAction(aan ? "Gesplitst per rekening" : "Splitsen per rekening ongedaan");
    setOverridesByCounterparty((prev) => {
      const oud = prev[key] || {};
      if (aan) return { ...prev, [key]: { ...oud, gesplitst: true, displayName: oud.displayName || item.name, sign: item.amount >= 0 ? "pos" : "neg" } };
      const { gesplitst: _g, perRekening: _p, ...rest } = oud;
      const next = { ...prev };
      if (rest.category) next[key] = rest; else delete next[key];
      return next;
    });
  };
  const setRekeningKeuzeOpSleutel = (key, soort, patch, naam, amount) => {
    snapshotBeforeAction("Categorie/type aangepast (per rekening)");
    setOverridesByCounterparty((prev) => {
      const oud = prev[key] || {};
      const per = oud.perRekening || {};
      return { ...prev, [key]: { ...oud, displayName: oud.displayName || naam, sign: amount >= 0 ? "pos" : "neg", gesplitst: true, perRekening: { ...per, [soort]: { ...(per[soort] || {}), ...patch } } } };
    });
    const ids = new Set(classified.filter((tx) => (keyForTx(tx) === key || sleutelVoorTegenpartij(tx, overridesByCounterparty) === key) && rekeningSoortVan(tx) === soort).map((tx) => tx.id));
    if (ids.size) setOverridesByRow((prev) => (Object.keys(prev).some((id) => ids.has(Number(id)) || ids.has(id)) ? Object.fromEntries(Object.entries(prev).filter(([id]) => !ids.has(Number(id)) && !ids.has(id))) : prev));
  };
  const setRekeningKeuze = (item, patch) => {
    const key = sleutelVoorTegenpartij(item.voorbeeldTx, overridesByCounterparty);
    if (key) setRekeningKeuzeOpSleutel(key, item.rekeningSoort, patch, item.name, item.amount);
  };
  // beide-V11R4 — sleutel waaronder de (gesplitste) keuze van deze tegenpartij staat, anders die van de detailtabel.
  const keuzeSleutel = (tx) => { const k = sleutelVoorTegenpartij(tx, overridesByCounterparty); return overridesByCounterparty[k] ? k : keyForTx(tx); };
  const personSummary = useMemo(() => computeCategorySummary(classified, "Overboekingen aan personen", { metZonderNaam: true, rekening: rekeningInfo, gesplitst, sortering: "aantal" }), [classified, rekeningInfo, gesplitst]);
  const nogTeBekijken = (lijst, bekeken) => lijst.filter((i) => !i.handmatig && !i.alleKlein && !bekeken.includes(i.key) && !bekeken.includes(i.basisKey));
  const pendingPersonReview = useMemo(() => nogTeBekijken(personSummary, reviewedPersonKeys), [personSummary, reviewedPersonKeys]);
  // release31V0 — regel zonder tegenpartijnaam: alleen die ene boeking aanpassen.
  const zetVoorItem = (item, patch) => (item.zonderNaam ? setRowOverride(item.txId, patch) : item.rekeningSoort ? setRekeningKeuze(item, patch) : setCounterpartyOverride(item.name, item.amount, patch));
  const markPersonSource = (item, category, type) => {
    zetVoorItem(item, { category, type });
    setReviewedPersonKeys((prev) => (prev.includes(item.key) ? prev : [...prev, item.key]));
  };
  const confirmPersonAsIs = (item) => {
    snapshotBeforeAction('"Klopt zo" bevestigd');
    setReviewedPersonKeys((prev) => (prev.includes(item.key) ? prev : [...prev, item.key]));
  };

  const overigSummary = useMemo(() => computeCategorySummary(classified, "Overig", { metZonderNaam: true, rekening: rekeningInfo, gesplitst, sortering: "aantal" }), [classified, rekeningInfo, gesplitst]);
  const pendingOverigReview = useMemo(() => nogTeBekijken(overigSummary, reviewedOverigKeys), [overigSummary, reviewedOverigKeys]);
  const markOverigItem = (item, category, type) => {
    zetVoorItem(item, { category, type });
    setReviewedOverigKeys((prev) => (prev.includes(item.key) ? prev : [...prev, item.key]));
  };
  // V90 — de bulkknoppen werken per TYPE: alleen de tegenpartijen die nu als Zakelijk (resp. Privé) staan.
  const overigZakelijkPending = pendingOverigReview.filter((i) => i.type === "Zakelijk");
  const overigPrivePending = pendingOverigReview.filter((i) => i.type !== "Zakelijk");
  const bulkMarkOverigAsPriveOpname = () => {
    for (const item of overigZakelijkPending) markOverigItem(item, "Privé opnames", "Zakelijk");
  };
  const bulkMarkOverigAsWinkelsDivers = () => {
    for (const item of overigPrivePending) markOverigItem(item, "Winkels divers", "Prive");
  };
  // V90 — "Overboekingen aan personen": alles in één keer bevestigen, of alles naar Overig
  const personBulkAction = [
    {
      label: `Alles is aan personen: ja (${pendingPersonReview.length})`,
      confirmText: `${pendingPersonReview.length} tegenpartij(en) allemaal bevestigen als "Overboeking aan personen"?`,
      onApply: () => {
        snapshotBeforeAction('"Klopt zo" bevestigd (alles)');
        const keys = pendingPersonReview.map((i) => i.key);
        setReviewedPersonKeys((prev) => [...new Set([...prev, ...keys])]);
      },
    },
    {
      label: `Alles is aan personen: nee (${pendingPersonReview.length})`,
      confirmText: `${pendingPersonReview.length} tegenpartij(en) allemaal NIET als overboeking aan personen zien? Ze komen dan bij "Overig" te staan, waar je ze verder kunt indelen.`,
      onApply: () => { for (const item of pendingPersonReview) markPersonSource(item, "Overig", item.type); },
    },
  ];
  const confirmOverigAsIs = (item) => {
    snapshotBeforeAction('"Klopt zo" bevestigd');
    setReviewedOverigKeys((prev) => (prev.includes(item.key) ? prev : [...prev, item.key]));
  };

  const addBusinessKeyword = (kw) => {
    snapshotBeforeAction("Zakelijke tegenpartij toegevoegd");
    setBusinessKeywords((prev) => (prev.includes(kw) ? prev : [...prev, kw]));
  };
  const removeBusinessKeyword = (kw) => {
    snapshotBeforeAction("Zakelijke tegenpartij verwijderd");
    setBusinessKeywords((prev) => prev.filter((k) => k !== kw));
  };
  const addBusinessExpenseKeyword = (kw) => {
    snapshotBeforeAction("Zakelijke uitgave toegevoegd");
    setBusinessExpenseKeywords((prev) => (prev.includes(kw) ? prev : [...prev, kw]));
  };
  const removeBusinessExpenseKeyword = (kw) => {
    snapshotBeforeAction("Zakelijke uitgave verwijderd");
    setBusinessExpenseKeywords((prev) => prev.filter((k) => k !== kw));
  };
  const businessIncomeEntries = useMemo(() => computeIncomeCategorySummary(classified), [classified]);
  const businessExpenseEntries = useMemo(() => computeCategorySummary(classified, "Zakelijke inkoop non-voedingsmiddelen"), [classified]);
  const reclassifyBusinessEntry = (item, newMainCategory) => {
    const newSubtype = MAIN_CATEGORY_DEFAULT_SUBTYPE[newMainCategory] || newMainCategory;
    // "Zakelijke tegenpartijen (inkomsten)" en "Zakelijke inkoop non-voedingsmiddelen (leveranciers)" zijn per definitie
    // al bevestigd Zakelijk — hier alleen de categorie wijzigen mag dat nooit stilzwijgend naar
    // Prive omzetten (defaultTypeForCategory zou voor de meeste categorieën "Prive" teruggeven).
    requestCategoryChange({ counterparty: item.name, amount: item.amount }, { category: newSubtype, type: "Zakelijk" });
  };
  // Voor wie zowel laag- als hoogbelaste diensten factureert (zie de wizard-vraag na "BTW-verlegd:
  // nee"): hiermee kies je per klant tussen de generieke "Zakelijke inkomsten" en de twee
  // tariefspecifieke subtypes.
  const setIncomeRate = (item, choice) => {
    const category = choice === "0" ? "Zakelijke inkomsten 0%" : choice === "9" ? "Zakelijke inkomsten 9%" : choice === "21" ? "Zakelijke inkomsten 21%" : "Zakelijke inkomsten";
    requestCategoryChange({ counterparty: item.name, amount: item.amount }, { category, type: "Zakelijk" });
  };
  // Wizard-vraag "onder welk(e) BTW-tarief(ven) vallen je diensten" — nu een aanvinklijst (kan meer
  // dan één tarief zijn). Bij precies één gekozen tarief is dat meteen het standaardtarief voor de
  // generieke "Zakelijke inkomsten"-categorie. Bij meerdere is "standaard" het tarief dat het meeste
  // voorkomt (apart gevraagd in de wizard, zie TarievenVraag) — de overige tarieven blijven gewoon
  // beschikbaar als eigen categorie ("Zakelijke inkomsten 0%/9%/21%") om per klant/transactie te
  // kiezen via setIncomeRate hierboven. incomeBtwTarieven onthoudt de hele keuze zodat de "Werk te
  // doen"-herinnering hieronder weet dat er meerdere tarieven zijn en het dus de moeite waard is om
  // dat na te lopen.
  const setIncomeBtwRateChoice = (tarieven, standaard) => {
    setCategoryBtwRatesWithUndo((prev) => ({ ...prev, "Zakelijke inkomsten": Number(standaard) }));
    setIncomeBtwTarieven(tarieven);
    if (tarieven.length > 1) setMeerdereTarievenBevestigd(false);
  };
  // Sommige zzp'ers hebben tegelijk klanten met BTW-verlegd (bijv. onderaannemer in de bouw) én
  // klanten waar ze zelf gewoon 21% BTW over factureren — dat is dus geen aan/uit-instelling voor
  // de hele onderneming, maar iets per klant. De globale BTW-verlegd-instelling (uit de wizard)
  // blijft de standaardwaarde voor nog niet expliciet ingestelde tegenpartijen; hiermee wijk je
  // daar per klant van af. category/type expliciet meegeven zodat de override altijd compleet
  // blijft (anders zou een tegenpartij die nog geen eigen correctie had er ineens zonder categorie
  // bij kunnen komen te staan).
  const setCounterpartyBtwVerlegd = (item, value) => {
    setCounterpartyOverride(item.name, item.amount, { category: item.category, type: item.type, btwVerlegd: value });
  };



  // Tegenpartij-brede correctie: geldt voor alle transacties van diezelfde tegenpartij (zelfde
  // teken), in alle jaren. Ruimt een eventuele losse rij-correctie voor diezelfde tegenpartij op
  // — anders zou die voorrang blijven houden boven deze bredere wijziging.
  // IBAN is stabieler dan de naam (die per bank-export kan wisselen) — dus die heeft voorrang
  // wanneer het bankbestand een tegenrekening-IBAN bevatte, zowel bij het opslaan van een
  // correctie als bij het zoeken naar "vergelijkbare transacties van dezelfde tegenpartij".
  // V53 — een IBAN is alleen een goede tegenpartij-sleutel als er (vrijwel) maar één partij achter zit.
  // Tussenpersonen (Mollie/Adyen/"via Stichting ...", ING-betaalverzoek) delen één IBAN voor tientallen
  // verschillende bedrijven; daar bepaalde de IBAN ten onrechte dat een wijziging voor IWG ook voor
  // alle andere winkels gold. Is minder dan 90% van de transacties met dezelfde IBAN (+teken) van
  // dezelfde partij (eerste woord van de naam), dan gebruiken we de naam als sleutel.
  const ibanExclusiveMap = useMemo(() => {
    const per = {};
    for (const tx of transactions) {
      const ik = ibanKey(tx.counterpartyIban, tx.amount);
      if (!ik) continue;
      const w = (normKey(tx.counterparty || tx.description || "").split(" ")[0]) || "";
      const e = (per[ik] ||= { n: 0, w: {} });
      e.n++;
      e.w[w] = (e.w[w] || 0) + 1;
    }
    const res = {};
    for (const [k, e] of Object.entries(per)) res[k] = Math.max(...Object.values(e.w)) / e.n >= 0.9;
    return res;
  }, [transactions]);
  const exclusiveIbanKey = (iban, amount) => {
    const ik = ibanKey(iban, amount);
    return ik && ibanExclusiveMap[ik] !== false ? ik : "";
  };
  const keyForTx = (tx) => exclusiveIbanKey(tx.counterpartyIban, tx.amount) || counterpartyKey(tx.counterparty || tx.description, tx.amount);

  const setCounterpartyOverride = (counterparty, amount, patch, iban) => {
    snapshotBeforeAction("Categorie/type aangepast");
    // beide-V15R2 — staat er al een keuze op de IBAN, dan gaat die bij het indelen vóór de naam (resolveClassification). Een nieuwe
    // keuze moet dan ook daar landen, anders verandert er niets (Boska 4-11: "Dit is geen lening" deed niets bij een lening waarvan
    // de IBAN onder meerdere namen voorkomt, bijv. "S.R. Reijnhout" en "n reijnhout").
    const ik = iban && ibanKey(iban, amount);
    const key = (ik && overridesByCounterparty[ik] ? ik : "") || (iban && exclusiveIbanKey(iban, amount)) || counterpartyKey(counterparty, amount);
    if (!key) return;
    setOverridesByCounterparty((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), ...patch, displayName: prev[key]?.displayName || counterparty, sign: amount >= 0 ? "pos" : "neg" },
    }));
    setOverridesByRow((prev) => {
      const idsToClear = classified.filter((tx) => keyForTx(tx) === key || ibanKey(tx.counterpartyIban, tx.amount) === key).map((tx) => tx.id);
      if (idsToClear.length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      for (const id of idsToClear) {
        if (id in next) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };
  // nieuw-V3R1 — "Mijn antwoorden" in de eenvoudige weergave: alle keuzes per tegenpartij, met bedrag in het gekozen jaar.
  const eenvoudigAntwoordenLijst = useMemo(() => {
    if (!eenvoudigActief) return [];
    const per = {}, auto = {};
    for (const tx of classified) {
      if (tx.isMirror) continue;
      const k = overrideSleutel(tx, overridesByCounterparty); // beide-V8R3 — zelfde sleutel als de indeling (IBAN of naam)
      if (!k) {
        // beide-V8R4 — ook automatisch ingedeelde namen zijn vindbaar (wens Boska 27-10: KPN, Centraal Beheer); een wijziging
        // wordt dan een gewone keuze op dezelfde sleutel als bij "Nakijken".
        const ak = keyForTx(tx);
        if (!ak) continue;
        const a = (auto[ak] ||= { naam: tx.counterparty || tx.description || ak, rekening: tx.accountType, teken: tx.amount >= 0 ? 1 : -1, cats: {}, boekingen: [], bedragJaar: 0 });
        a.cats[tx.category] = (a.cats[tx.category] || 0) + 1;
        a.boekingen.push({ datum: tx.date, jaar: tx.year, bedrag: tx.amount });
        if (tx.year === activeYear) a.bedragJaar += tx.amount;
        continue;
      }
      // beide-V11R4 — keuze per rekening (gesplitst): telt onder sleutel@Zakelijk / sleutel@Prive.
      const kr = overridesByCounterparty[k]?.perRekening?.[rekeningSoortVan(tx)] ? `${k}@${rekeningSoortVan(tx)}` : k;
      const g = (per[kr] ||= { aantal: 0, bedragJaar: 0, rekening: tx.accountType, teken: tx.amount >= 0 ? 1 : -1, boekingen: [] });
      g.aantal += 1;
      g.boekingen.push({ datum: tx.date, jaar: tx.year, bedrag: tx.amount }); // beide-V8R2 — zoeken op bedrag of datum (MijnAntwoorden)
      if (tx.year === activeYear) g.bedragJaar += tx.amount;
    }
    const REK = { Zakelijk: "zakelijke rekening", Prive: "privérekening" };
    return Object.entries(overridesByCounterparty)
      .flatMap(([k, o]) => (!o ? [] : [
        ...(o.category ? [[k, o]] : []),
        ...Object.entries(o.perRekening || {}).filter(([, p]) => p?.category)
          .map(([soort, p]) => [`${k}@${soort}`, { ...o, ...p, displayName: `${o.displayName || k} · ${REK[soort] || soort}`, type: soort }]),
      ]))
      .map(([k, o]) => ({
        key: k, naam: o.displayName || k, categorie: o.category,
        teken: per[k]?.teken ?? (o.sign === "pos" ? 1 : -1), rekening: per[k]?.rekening || (o.type === "Zakelijk" ? "Zakelijk" : "Prive"),
        aantal: per[k]?.aantal || 0, bedragJaar: Math.round((per[k]?.bedragJaar || 0) * 100) / 100, boekingen: per[k]?.boekingen || [],
      }))
      .concat(Object.entries(auto).map(([k, a]) => {
        const cats = Object.entries(a.cats).sort((x, y) => y[1] - x[1]);
        return {
          key: k, naam: a.naam, categorie: cats[0][0], categorieen: cats.length > 1 ? cats.map(([c]) => c) : null, automatisch: true,
          basis: { displayName: a.naam, sign: a.teken > 0 ? "pos" : "neg" }, teken: a.teken, rekening: a.rekening,
          aantal: a.boekingen.length, bedragJaar: Math.round(a.bedragJaar * 100) / 100, boekingen: a.boekingen,
        };
      }));
  }, [eenvoudigActief, classified, overridesByCounterparty, activeYear]); // eslint-disable-line react-hooks/exhaustive-deps
  // beide-V8R7 — mogelijke eigen rekeningen (wens Boska 27-10). "Nee" staat in bevestigdeControles.eigenRekeningenNee.
  const eigenKandidaten = useMemo(() => (parsedFiles.length === 0 ? [] : vindMogelijkeEigenRekeningen(classified, {
    eigenIbans: [...eigenRekeningenGeladen, ...(eigenRekeningenExtra || [])].map((r) => r?.iban).filter(Boolean),
    eigenNamen, afgewezen: bevestigdeControles?.eigenRekeningenNee || [],
  })), [classified, eigenRekeningenGeladen, eigenRekeningenExtra, eigenNamen, bevestigdeControles, parsedFiles.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const [eigenKandidatenOpen, setEigenKandidatenOpen] = useState(false);
  const kiesEigenKandidaat = (iban, patch) => {
    snapshotBeforeAction("Eigen rekening toegevoegd");
    setEigenRekeningenExtra((prev) => [...(prev || []).filter((r) => r?.iban !== iban), { iban, ...patch }]);
  };
  const neeEigenKandidaat = (iban) => {
    snapshotBeforeAction("Geen eigen rekening");
    setBevestigdeControles((prev) => ({ ...(prev || {}), eigenRekeningenNee: [...new Set([...(prev?.eigenRekeningenNee || []), iban])] }));
  };
  // Na de wizard die bij het laden van een bankbestand opengaat: het overzicht vanzelf tonen als er iets gevonden is.
  const wizardWasOpen = useRef(false);
  useEffect(() => {
    if (wizardWasOpen.current && !showSetupWizard && eigenKandidaten.length > 0) setEigenKandidatenOpen(true);
    wizardWasOpen.current = showSetupWizard;
  }, [showSetupWizard]); // eslint-disable-line react-hooks/exhaustive-deps
  // beide-V11R4 — sleutel@Zakelijk / sleutel@Prive = de keuze voor één rekening van een gesplitste tegenpartij.
  const splitsSleutel = (key) => { const m = /^(.*)@(Zakelijk|Prive)$/.exec(key); return m ? [m[1], m[2]] : [key, null]; };
  const wijzigAntwoord = (key, patch) => {
    snapshotBeforeAction("Categorie/type aangepast");
    const [k, soort] = splitsSleutel(key);
    setOverridesByCounterparty((prev) => (soort
      ? { ...prev, [k]: { ...(prev[k] || {}), gesplitst: true, perRekening: { ...(prev[k]?.perRekening || {}), [soort]: { ...(prev[k]?.perRekening?.[soort] || {}), ...patch } } } }
      : { ...prev, [key]: { ...(prev[key] || {}), ...patch } }));
  };
  const rijAntwoord = (ids, patch) => {
    snapshotBeforeAction("Categorie/type aangepast");
    setOverridesByRow((prev) => { const n = { ...prev }; for (const id of ids) n[id] = { ...(n[id] || {}), ...patch }; return n; });
  };
  const wisAntwoord = (key) => {
    snapshotBeforeAction("Tegenpartijregel verwijderd");
    const [k, soort] = splitsSleutel(key);
    setOverridesByCounterparty((prev) => {
      const n = { ...prev };
      if (!soort) { delete n[key]; return n; }
      const { [soort]: _weg, ...rest } = prev[k]?.perRekening || {};
      n[k] = { ...prev[k], perRekening: rest };
      if (!n[k].category && !Object.keys(rest).length) delete n[k];
      return n;
    });
  };
  const setRowOverride = (id, patch) => {
    snapshotBeforeAction("Categorie/type aangepast");
    setOverridesByRow((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
  };
  return { addBusinessExpenseKeyword, addBusinessKeyword, bevestigdInBulkVenster, bulkMarkOverigAsPriveOpname, bulkMarkOverigAsWinkelsDivers, businessExpenseEntries, businessIncomeEntries, confidenceSummary, confirmOverigAsIs, confirmPersonAsIs, eenvoudigAntwoordenLijst, eigenKandidaten, eigenKandidatenOpen, exclusiveIbanKey, gesplitst, incomeSummary, jumpToOverigFromModal, jumpToPersonenFromModal, keuzeSleutel, keyForTx, kiesEigenKandidaat, markIncomeSource, markOverigItem, markPersonSource, neeEigenKandidaat, overigPrivePending, overigSummary, overigZakelijkPending, pendingIncomeReview, pendingOverigReview, pendingPersonReview, personBulkAction, personSummary, reclassifyBusinessEntry, removeBusinessExpenseKeyword, removeBusinessKeyword, rijAntwoord, setCounterpartyBtwVerlegd, setCounterpartyOverride, setEigenKandidatenOpen, setIncomeBtwRateChoice, setIncomeRate, setRekeningKeuzeOpSleutel, setRowOverride, splitsRekening, uncertainModalData, wijzigAntwoord, wisAntwoord };
}
