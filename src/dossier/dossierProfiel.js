import { getLeaseSegments } from "../tax/financialLease.js";
// Dossierprofiel: een compacte, leesbare samenvatting van wat het dossier "weet" uit de wizard en
// de instellingen — zodat de gebruiker in één oogopslag kan nagaan of het klopt. Puur lezen: er
// wordt niets gewijzigd of berekend dat de cijfers raakt.
const SOORT_AUTO = { koop: "gekocht", operational: "operational lease", financial: "financial lease" };

// "2020, 2021, 2022" → "2020–2022" waar jaren opeenvolgend zijn.
export function jarenBereik(jaren) {
  const l = [...new Set((jaren || []).map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
  if (l.length === 0) return "";
  const delen = [];
  let start = l[0], vorig = l[0];
  for (const j of [...l.slice(1), null]) {
    if (j !== null && j === vorig + 1) { vorig = j; continue; }
    delen.push(start === vorig ? `${start}` : vorig === start + 1 ? `${start}, ${vorig}` : `${start}–${vorig}`);
    start = j; vorig = j;
  }
  return delen.join(", ");
}

const lijstNamen = (l) => (Array.isArray(l) ? l.map((x) => x?.naam).filter(Boolean) : []);

export function bouwDossierProfiel(p) {
  const {
    parsedFiles = [], accountTypeByFile = {}, years = [], rechtsvorm, heeftHolding, korRegeling, btwVerlegd,
    kwartaalStatus = {}, autoWizardStatus, verwachteLease, verwachteLeaseOverig, verwachteLening, verwachteAOV,
    heeftVoorraad, zelfstandigenaftrekStatus = {}, startersaftrekStatus = {}, eigenNamen, eigenRekeningenExtra,
    zakelijkeSpaarRekening, leaseSummary = [], leaseMerges = [], confirmedLeaseTypeKeys = [], leaseDetails = {},
  } = p;
  const isBV = rechtsvorm === "bv";
  const blokken = [];

  // Onderneming
  const onderneming = [];
  if (rechtsvorm) onderneming.push(isBV ? `BV${heeftHolding ? " met holding" : ""}` : "Eenmanszaak / zzp");
  else onderneming.push("Rechtsvorm: nog niet opgegeven");
  if (years.length > 0) onderneming.push(`Jaren in dossier: ${jarenBereik(years)}`);
  const naam = eigenNamen?.ondernemer;
  if (naam) onderneming.push(`Rekeninghouder: ${naam}${eigenNamen?.partner ? ` (partner: ${eigenNamen.partner})` : ""}`);
  blokken.push({ titel: "Onderneming", regels: onderneming });

  // Rekeningen
  const types = Object.values(accountTypeByFile);
  const nZak = types.filter((t) => t === "Zakelijk").length;
  const nPriv = types.filter((t) => t === "Prive").length;
  const rekeningen = [];
  if (parsedFiles.length > 0) rekeningen.push(`${parsedFiles.length} bankbestand${parsedFiles.length === 1 ? "" : "en"} geladen (${nZak} zakelijk, ${nPriv} privé)`);
  const extra = Array.isArray(eigenRekeningenExtra) ? eigenRekeningenExtra : null;
  if (extra) rekeningen.push(extra.length > 0 ? `${extra.length} andere eigen rekening${extra.length === 1 ? "" : "en"} niet geladen` : "Geen andere eigen rekeningen");
  if (zakelijkeSpaarRekening?.status === "ja") rekeningen.push(`Zakelijke spaarrekening${zakelijkeSpaarRekening.naam ? `: ${zakelijkeSpaarRekening.naam}` : ""}`);
  if (zakelijkeSpaarRekening?.priveStatus === "ja") rekeningen.push(`Privé-spaarrekening${zakelijkeSpaarRekening.priveNaam ? `: ${zakelijkeSpaarRekening.priveNaam}` : ""}`);
  if (rekeningen.length === 0) rekeningen.push("Nog geen bankbestanden geladen");
  blokken.push({ titel: "Rekeningen", regels: rekeningen });

  // BTW
  const btw = [];
  if (korRegeling === true) btw.push("Kleineondernemersregeling (KOR)");
  else if (korRegeling === false) btw.push("Geen KOR — gewone BTW-plicht");
  else btw.push("KOR: nog niet opgegeven");
  if (korRegeling !== true) {
    if (btwVerlegd === true) btw.push("BTW-verlegd op zakelijke inkomsten");
    else if (btwVerlegd === false) btw.push("Geen BTW-verlegd");
    const kw = Object.entries(kwartaalStatus).filter(([, s]) => s?.aangegeven);
    const kwJaren = [...new Set(kw.map(([k]) => k.split("-")[0]))];
    if (kw.length > 0) btw.push(`${kw.length} kwartalen aangegeven (${jarenBereik(kwJaren)})`);
  }
  blokken.push({ titel: "BTW", regels: btw });

  // Auto, lease en lening
  const auto = [];
  if (autoWizardStatus?.status === "zaak") auto.push(`Auto op de zaak${autoWizardStatus.soort ? ` — ${SOORT_AUTO[autoWizardStatus.soort] || autoWizardStatus.soort}` : ""}`);
  else if (autoWizardStatus?.status === "prive") auto.push("Privéauto zakelijk gebruikt (kilometervergoeding)");
  else if (autoWizardStatus?.status === "geen") auto.push("Geen auto");
  else auto.push("Auto: nog niet opgegeven");
  const lease = lijstNamen(verwachteLease), leaseO = lijstNamen(verwachteLeaseOverig), lening = lijstNamen(verwachteLening);
  // Kort en bondig: alleen WAT is aangegeven (geen namen/aliassen — die staan bij Controleren > Bedrijfsmiddelen).
  const leaseSoorten = [];
  if (lease.length || autoWizardStatus?.soort === "financial") leaseSoorten.push("financiële autolease");
  if (leaseO.length) leaseSoorten.push("financiële machinelease");
  if (leaseSoorten.length) auto.push(`Lease: ${leaseSoorten.join(" en ")}`);
  else if (leaseSummary.length) auto.push(`Lease in bankdata: ${leaseSummary.length}`);
  if (lening.length) auto.push(`Lening: ${lening.join(", ")}`);
  if (heeftVoorraad === true) auto.push("Voorraad aanwezig");
  blokken.push({ titel: "Auto, lease en lening", regels: auto });

  // Persoonlijk (niet bij BV)
  if (!isBV) {
    const pers = [];
    const uren = Object.entries(zelfstandigenaftrekStatus);
    if (uren.length === 0) pers.push("Urencriterium: nog niet opgegeven");
    else {
      const ja = uren.filter(([, v]) => v === "ja").map(([j]) => j);
      const nee = uren.filter(([, v]) => v === "nee").map(([j]) => j);
      const onb = uren.filter(([, v]) => v === "onbekend").map(([j]) => j);
      if (ja.length === uren.length) pers.push("Urencriterium: ja (alle jaren)");
      else {
        if (ja.length) pers.push(`Urencriterium ja: ${jarenBereik(ja)}`);
        if (nee.length) pers.push(`Urencriterium nee: ${jarenBereik(nee)}`);
        if (onb.length) pers.push(`Urencriterium onbekend: ${jarenBereik(onb)}`);
      }
    }
    const st = Object.entries(startersaftrekStatus).filter(([, v]) => v === "ja").map(([j]) => j);
    pers.push(st.length ? `Startersaftrek: ${jarenBereik(st)}` : "Geen startersaftrek");
    if (verwachteAOV?.status === "ja") pers.push(`AOV: ja${verwachteAOV.naam ? ` (${verwachteAOV.naam})` : ""}`);
    else if (verwachteAOV?.status === "nee") pers.push("AOV: nee");
    blokken.push({ titel: "Persoonlijk", regels: pers });
  }
  return blokken;
}
