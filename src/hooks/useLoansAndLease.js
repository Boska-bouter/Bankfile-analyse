import { useMemo } from "react";
import { computeLoanSummary, computeLeaseSummary } from "../tax/loanAmortization.js";
import { normalizeKenteken } from "../tax/financialLease.js";

// Twee leaseovereenkomsten kunnen in de bank onder verschillende tegenpartijnamen verschijnen
// (bijv. de eerste afschrijving anders benoemd dan de maandelijkse termijnen) — automatisch
// samenvoegen op basis van gelijkenis is te riskant (kan onterecht twee verschillende leases
// samenvoegen), dus dit blijft een bewuste, handmatige keuze (zie mergeLeaseInto in App.jsx).
// "bron" verdwijnt uit de lijst; zijn transacties en totaal gaan over naar "doel".
// Werkt op een KOPIE van elk item (nooit de meegegeven leaseSummary zelf muteren) — anders zou een
// hergebruikte/gecachte "ruwe" (nog niet samengevoegde) lijst per ongeluk mee-muteren, met een
// dubbeltelling tot gevolg zodra dezelfde ruwe lijst een volgende keer weer als basis dient (zie
// rawLeaseSummary hieronder, die nodig is om een samenvoeging weer ongedaan te kunnen maken).
// V58 — automatische samenvoeging: dezelfde leasemaatschappij verschijnt in de bank onder wisselende
// namen (Volkswagen Leasing → VWPFS → Volkswagen Pon Financial Services), maar altijd met dezelfde
// tegenrekening (IBAN). Groepen die uitsluitend over één en dezelfde IBAN lopen worden daarom
// automatisch samengevoegd — behalve als die IBAN ook bij niet-lease-transacties voorkomt (dan is het
// een betaalprovider als Mollie/Adyen met meerdere partijen erachter) en behalve groepen die al op een
// specifiek contractnummer zijn gesplitst ("contract::…"). Handmatig loskoppelen blijft kunnen: dat
// legt `null` vast in leaseMergedInto, en dat wint van de automatische samenvoeging.
function normIban(v) { return String(v || "").replace(/\s+/g, "").toUpperCase(); }
export function computeAutoLeaseMerges(rawLeaseSummary, classified, leaseDetails) {
  const isLease = (c) => c === "Lease (financieel)" || c === "Lease (operationeel)";
  const nonLeaseIbans = new Set();
  for (const tx of classified) {
    if (tx.isMirror || !tx.counterpartyIban || isLease(tx.category)) continue;
    nonLeaseIbans.add(normIban(tx.counterpartyIban));
  }
  const byIban = {};
  for (const l of rawLeaseSummary) {
    if (l.key.startsWith("contract::")) continue;
    if (!l.transactions.every((t) => t.counterpartyIban)) continue;
    const ibans = new Set(l.transactions.map((t) => normIban(t.counterpartyIban)));
    if (ibans.size !== 1) continue;
    const iban = [...ibans][0];
    if (nonLeaseIbans.has(iban)) continue;
    (byIban[`${iban}|${l.category}`] ??= []).push(l);
  }
  const merges = {};
  const hasDetails = (l) => (leaseDetails && leaseDetails[l.key] && Object.keys(leaseDetails[l.key]).length > 0 ? 1 : 0);
  for (const group of Object.values(byIban)) {
    if (group.length < 2) continue;
    const target = [...group].sort((a, b) => (hasDetails(b) - hasDetails(a)) || (b.count - a.count))[0];
    for (const l of group) if (l !== target) merges[l.key] = target.key;
  }
  return merges;
}

function applyLeaseMerges(leaseSummary, leaseMergedInto) {
  if (!leaseMergedInto || Object.keys(leaseMergedInto).length === 0) return leaseSummary;
  const byKey = Object.fromEntries(leaseSummary.map((l) => [l.key, { ...l, transactions: [...l.transactions] }]));
  const merged = new Set();
  for (const [sourceKey, targetKey] of Object.entries(leaseMergedInto)) {
    if (!targetKey) continue; // null = bewust niet (automatisch) samenvoegen
    const source = byKey[sourceKey];
    const target = byKey[targetKey];
    if (!source || !target || merged.has(sourceKey)) continue;
    target.transactions = [...target.transactions, ...source.transactions].sort((a, b) => a.date - b.date);
    target.total += source.total;
    target.count += source.count;
    merged.add(sourceKey);
  }
  return leaseSummary.filter((l) => !merged.has(l.key)).map((l) => byKey[l.key]);
}

export const txSleutel = (tx) => `${tx.date instanceof Date ? tx.date.toISOString().slice(0, 10) : tx.date}|${tx.amount}|${String(tx.description || "").slice(0, 60)}`;

// Bundelt de leningen/lease-logica (samenvattingen + correctie-handlers) die verder los staat
// van de rest van de app — de ruwe state (loanDetails/leaseDetails/...) en de persistence
// daarvan blijven bewust in App.jsx, dit hook-bestand voegt alleen de handelingen erop toe.
export function useLoansAndLease({
  classified, setLoanDetails, setLeaseDetails, setConfirmedLeaseTypeKeys, setLeaseDetailsModalKey, openLeaseWizard,
  snapshotBeforeAction, setCounterpartyOverride, leaseMergedInto = {}, setLeaseMergedInto, leaseDetails = {}, onHerbeoordeelOverig,
}) {
  const loanSummary = useMemo(() => computeLoanSummary(classified), [classified]);
  // Leningen die eerder expliciet als privé zijn aangemerkt ("Leningen (privé)") — apart
  // bijgehouden zodat LoanInterestPanel.jsx ook voor déze leningen nog een "toch zakelijk"-knop kan
  // tonen. Zonder dit zou zo'n lening, eenmaal op "Leningen (privé)" gezet, volledig uit het
  // leningenoverzicht verdwijnen en alleen nog via de algemene categorie-editor terug te zetten
  // zijn — dat kan nog steeds, maar dit maakt het ook rechtstreeks vanuit dit paneel mogelijk.
  const privateLoanSummary = useMemo(() => computeLoanSummary(classified, "Leningen (privé)"), [classified]);
  // Ongesamenvoegde (ruwe) lijst apart bewaard — nodig om bij "Loskoppelen" nog te weten hoe een
  // eerder samengevoegde bron-lease heette (die is in leaseSummary hieronder niet meer zichtbaar,
  // want die lijst toont juist het resultaat NA samenvoeging).
  const rawLeaseSummary = useMemo(() => computeLeaseSummary(classified), [classified]);
  const autoLeaseMerges = useMemo(
    () => computeAutoLeaseMerges(rawLeaseSummary, classified, leaseDetails),
    [rawLeaseSummary, classified, leaseDetails]
  );
  // Handmatige keuzes (ook de expliciete `null` = loskoppelen) gaan altijd vóór de automatische.
  const effectiveLeaseMerges = useMemo(() => {
    const merged = { ...autoLeaseMerges };
    for (const [k, v] of Object.entries(leaseMergedInto || {})) {
      if (v) merged[k] = v; else delete merged[k];
    }
    return merged;
  }, [autoLeaseMerges, leaseMergedInto]);
  // Handmatig toegevoegde leases (contract van een leasemaatschappij zonder betalingen in de geladen
  // bankgegevens): bewaard in leaseDetails onder een eigen sleutel met `handmatigeNaam`.
  const leaseSummary = useMemo(() => {
    const basis = applyLeaseMerges(rawLeaseSummary, effectiveLeaseMerges);
    const bestaand = new Set(basis.map((l) => l.key));
    // Kenteken van een los (apart) contract: uit de ingevulde gegevens, anders het bij het toevoegen opgegeven kenteken.
    const platTekst = (tx) => `${tx.counterparty || ""} ${tx.description || ""}`.toUpperCase().replace(/[\s-]/g, "");
    // Herkenning in het afschrift: kenteken of type auto/object van het nieuwe contract.
    const kenmerkenVan = (d) => {
      const segs = [d, ...(Array.isArray(d.contracts) ? d.contracts : [])].filter(Boolean);
      const lijst = [d.splitKenteken, ...segs.map((x) => x.kenteken), ...segs.map((x) => x.voertuigtype)]
        .map((x) => String(x || "").toUpperCase().replace(/[\s-]/g, ""))
        .filter((x) => x.length >= 5);
      return [...new Set(lijst)];
    };
    const bedragVan = (d) => Number(d.maandbedrag) || Number(d.contracts?.[0]?.maandbedrag) || 0;
    const normNaam = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const basisKopie = basis.map((l) => ({ ...l }));
    const handmatig = Object.entries(leaseDetails || {})
      .filter(([k, d]) => d && d.handmatigeNaam && !bestaand.has(k))
      .map(([k, d]) => {
        let transactions = [];
        let splitKandidaten = [];
        const bron = d.splitVan ? basisKopie.find((l) => l.key === d.splitVan) : null;
        // Betalingen uit een bestaand contract gaan NOOIT op grond van het bedrag vanzelf naar een nieuw contract.
        // Vanzelf alleen als kenteken/type in de omschrijving staat, of als de gebruiker het zelf heeft bevestigd.
        if (bron) {
          const kenmerken = kenmerkenVan(d);
          const toegewezen = new Set(d.toegewezen || []);
          transactions = bron.transactions.filter((tx) => toegewezen.has(txSleutel(tx)) || kenmerken.some((kt) => platTekst(tx).includes(kt)));
          if (transactions.length) {
            const weg = new Set(transactions);
            bron.transactions = bron.transactions.filter((tx) => !weg.has(tx));
            bron.count = bron.transactions.length;
            bron.total = bron.transactions.reduce((a, tx) => a + (Number(tx.amount) || 0), 0);
          }
          // Lijken resterende betalingen op het leasebedrag van dit contract? Dan een vraag, geen automatische keuze.
          const bedrag = bedragVan(d);
          if (bedrag > 0 && !d.kandidatenAfgewezen) {
            const marge = Math.max(1.5, bedrag * 0.02);
            splitKandidaten = bron.transactions.filter((tx) => tx.amount < 0 && Math.abs(Math.abs(tx.amount) - bedrag) <= marge);
          }
        }
        // Handmatig toegevoegde maatschappij (geen apart contract): zoek betalingen aan die naam in de bankgegevens.
        // 1) Staan ze al als lease herkend (onder een eigen naam), dan horen ze bij dit contract. 2) Staan ze onder een andere
        // categorie (bijv. omdat tijdens het inlezen nog niet bekend was dat het lease is), dan stellen we voor ze als lease te behandelen.
        let zoekKandidaten = [];
        if (!d.splitVan) {
          const naamNorm = normNaam(d.handmatigeNaam);
          if (naamNorm.length >= 4) {
            const raakt = (tx) => normNaam(tx.counterparty).includes(naamNorm) || normNaam(tx.description).includes(naamNorm);
            for (const l of basisKopie) {
              if (l.splitVan || l.absorbedInto) continue;
              if (l.transactions.some(raakt) || normNaam(l.name).includes(naamNorm)) {
                transactions = [...transactions, ...l.transactions];
                l.absorbedInto = k;
              }
            }
            transactions.sort((a, b) => a.date - b.date);
            if (transactions.length === 0 && !d.zoekAfgewezen) {
              zoekKandidaten = (classified || []).filter((tx) => tx.amount < 0 && !tx.isMirror && !String(tx.category || "").startsWith("Lease") && raakt(tx));
            }
          }
        }
        const total = transactions.reduce((a, tx) => a + (Number(tx.amount) || 0), 0);
        return { zoekKandidaten, key: k, name: d.handmatigeNaam, total, count: transactions.length, transactions, category: "Lease (financieel)", handmatig: transactions.length === 0, absorbed: !d.splitVan && transactions.length > 0, splitVan: d.splitVan || null, splitKandidaten, splitBron: bron || null, splitBedrag: bedragVan(d), handmatigeGroep: d.handmatigeGroep || "auto" };
      });
    const basisNaSplit = basisKopie.filter((l) => !l.absorbedInto);
    return [...basisNaSplit, ...handmatig];
  }, [rawLeaseSummary, effectiveLeaseMerges, leaseDetails, classified]);
  // Overzicht van actieve samenvoegingen, met de namen erbij (voor de "Loskoppelen"-knop in de
  // UI) — filtert automatisch samenvoegingen weg waarvan bron of doel niet meer bestaat (bijv. na
  // het wijzigen van classificatieregels, waardoor een lease-groep is opgesplitst of verdwenen).
  const leaseMerges = useMemo(() => {
    const rawByKey = Object.fromEntries(rawLeaseSummary.map((l) => [l.key, l]));
    return Object.entries(effectiveLeaseMerges || {})
      .filter(([sourceKey, targetKey]) => targetKey && rawByKey[sourceKey] && rawByKey[targetKey])
      .map(([sourceKey, targetKey]) => ({
        sourceKey, targetKey,
        sourceName: rawByKey[sourceKey].name,
        targetName: rawByKey[targetKey].name,
      }));
  }, [rawLeaseSummary, effectiveLeaseMerges]);

  const setLoanDetailField = (key, newDetails) => {
    snapshotBeforeAction("Leninggegevens aangepast");
    setLoanDetails((prev) => ({ ...prev, [key]: newDetails }));
  };
  const markLoanUnknown = (key) => {
    snapshotBeforeAction("Lening op onbekend gezet");
    setLoanDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: true } }));
  };
  const unmarkLoanUnknown = (key) => {
    snapshotBeforeAction("Lening op onbekend gezet");
    setLoanDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: false } }));
  };

  const setLeaseDetailField = (key, newDetails) => {
    snapshotBeforeAction("Leasegegevens aangepast");
    setLeaseDetails((prev) => {
      const meta = prev[key]?.handmatigeNaam ? { handmatigeNaam: prev[key].handmatigeNaam, handmatigeGroep: prev[key].handmatigeGroep, zoekAfgewezen: prev[key].zoekAfgewezen, omgezet: prev[key].omgezet, ...(prev[key].splitVan ? { splitVan: prev[key].splitVan, splitKenteken: prev[key].splitKenteken, toegewezen: prev[key].toegewezen, kandidatenAfgewezen: prev[key].kandidatenAfgewezen } : {}) } : {};
      return { ...prev, [key]: { ...newDetails, ...meta } };
    });
  };
  const markLeaseUnknown = (key) => {
    snapshotBeforeAction("Lease op onbekend gezet");
    setLeaseDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: true } }));
  };
  const unmarkLeaseUnknown = (key) => {
    snapshotBeforeAction("Lease op onbekend gezet");
    setLeaseDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: false } }));
  };
  const confirmLeaseType = (lease, type) => {
    snapshotBeforeAction("Lease-type bevestigd");
    const category = type === "financieel" ? "Lease (financieel)" : "Lease (operationeel)";
    // Per transactie overriden, niet op lease.name (dat is de opgemaakte weergavenaam mét
    // "— contract 432633"-achtige toevoeging — die tekst komt in geen enkele bankomschrijving
    // letterlijk voor, dus een override daarop zou nooit een echte transactie raken).
    for (const tx of lease.transactions) {
      setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, { category, type: "Zakelijk" }, tx.counterpartyIban);
    }
    setConfirmedLeaseTypeKeys((prev) => (prev.includes(lease.key) ? prev : [...prev, lease.key]));
    if (type === "financieel") (openLeaseWizard || setLeaseDetailsModalKey)(lease.key);
  };
  // Nieuwe lease zonder bankbetalingen (bijv. contract waarvan de client de betalingen niet aanleverde).
  const addManualLease = (naam, groep, extra) => {
    const schoon = String(naam || "").trim();
    if (!schoon) return null;
    snapshotBeforeAction("Lease handmatig toegevoegd");
    const slug = schoon.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    let key = `handmatig::${slug}`;
    let weergave = schoon;
    const split = extra?.splitVan ? { splitVan: extra.splitVan, splitKenteken: String(extra.splitKenteken || "") } : null;
    if (split) {
      // Apart (parallel) contract bij dezelfde maatschappij: eigen sleutel.
      let n = 2;
      while (leaseDetails[`handmatig::${slug}-${n}`]) n += 1;
      key = `handmatig::${slug}-${n}`;
      weergave = `${schoon} — apart contract ${n}`;
    }
    setLeaseDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), handmatigeNaam: weergave, handmatigeGroep: groep === "overig" ? "overig" : "auto", ...(split || {}) } }));
    setConfirmedLeaseTypeKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    return key;
  };
  // Betalingen aan deze tegenpartij(en) voortaan als financiële lease behandelen (categorie aanpassen).
  const behandelAlsLease = (txs, leaseKey) => {
    const gezien = new Set();
    const omgezet = [];
    for (const tx of txs || []) {
      const k = `${tx.counterparty}|${tx.amount < 0 ? "neg" : "pos"}`;
      if (gezien.has(k)) continue;
      gezien.add(k);
      omgezet.push({ counterparty: tx.counterparty || tx.description, amount: tx.amount, iban: tx.counterpartyIban || null, categorie: tx.category || null });
      setCounterpartyOverride(tx.counterparty || tx.description, tx.amount, { category: "Lease (financieel)", type: "Zakelijk" }, tx.counterpartyIban);
    }
    // Onthouden welke tegenpartijen door dit contract als lease zijn gaan tellen — nodig om het terug te draaien bij verwijderen.
    if (leaseKey) setLeaseDetails((prev) => ({ ...prev, [leaseKey]: { ...(prev[leaseKey] || {}), omgezet: [...(prev[leaseKey]?.omgezet || []), ...omgezet] } }));
  };
  const wijsZoekAf = (key) => {
    setLeaseDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), zoekAfgewezen: true } }));
  };
  const koppelBetalingen = (key, sleutels) => {
    snapshotBeforeAction("Betalingen aan contract gekoppeld");
    setLeaseDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), toegewezen: [...new Set([...(prev[key]?.toegewezen || []), ...sleutels])] } }));
  };
  const wijsKandidatenAf = (key) => {
    snapshotBeforeAction("Betalingen blijven bij bestaand contract");
    setLeaseDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), kandidatenAfgewezen: true } }));
  };
  const removeManualLease = (key) => {
    snapshotBeforeAction("Handmatige lease verwijderd");
    // Betalingen die dankzij dit zelf aangemaakte contract als lease zijn gaan tellen: terug naar "Overig" zodat ze opnieuw beoordeeld worden.
    for (const o of leaseDetails[key]?.omgezet || []) {
      setCounterpartyOverride(o.counterparty, o.amount, { category: "Overig", type: "Zakelijk" }, o.iban);
    }
    // Eerder als "Klopt zo" beoordeelde tegenpartijen opnieuw laten beoordelen.
    if (leaseDetails[key]?.omgezet?.length) onHerbeoordeelOverig?.(leaseDetails[key].omgezet);
    setLeaseDetails((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setConfirmedLeaseTypeKeys((prev) => prev.filter((k) => k !== key));
  };

  // Voegt twee lease-groepen samen die eigenlijk hetzelfde contract blijken te zijn (bijv.
  // verschillende tegenpartijnaam voor de eerste afschrijving vs. de maandelijkse termijnen).
  // De bron-groep verdwijnt, zijn transacties tellen voortaan mee bij de doel-groep.
  const mergeLeaseInto = (sourceKey, targetKey) => {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    snapshotBeforeAction("Lease-contracten samengevoegd");
    setLeaseMergedInto((prev) => ({ ...prev, [sourceKey]: targetKey }));
  };
  const undoMergeLease = (sourceKey) => {
    snapshotBeforeAction("Lease-samenvoeging ongedaan gemaakt");
    setLeaseMergedInto((prev) => {
      const next = { ...prev };
      // Was dit een automatische samenvoeging? Dan `null` vastleggen, anders komt hij meteen terug.
      if (autoLeaseMerges[sourceKey]) next[sourceKey] = null;
      else delete next[sourceKey];
      return next;
    });
  };

  return {
    loanSummary, privateLoanSummary, leaseSummary, leaseMerges,
    setLoanDetailField, markLoanUnknown, unmarkLoanUnknown,
    setLeaseDetailField, markLeaseUnknown, unmarkLeaseUnknown, confirmLeaseType, mergeLeaseInto, undoMergeLease, addManualLease, removeManualLease, koppelBetalingen, wijsKandidatenAf, behandelAlsLease, wijsZoekAf,
  };
}
