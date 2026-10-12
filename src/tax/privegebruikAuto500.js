import { groupSegmentenOpKenteken } from "./autoBijtelling.js";

// Per auto: staat het vinkje "privégebruik meer dan 500 km" voor een jaar aan? De gegevens staan bij de auto zelf: bij een
// financiële lease in het (eerste) contractsegment van die auto (zelfde kenteken = zelfde auto, een vinkje bij een van de
// segmenten geldt voor de hele auto), bij een gekochte of operationeel geleasete auto in autoActivaDetails.
export function lijstPrivegebruikAutos({ leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus }) {
  const autos = [];
  for (const lease of leaseSummary || []) {
    if (lease.category !== "Lease (financieel)") continue;
    const details = leaseDetails?.[lease.key];
    if (!details || details.onbekend) continue;
    const segments = Array.isArray(details.contracts) && details.contracts.length > 0 ? details.contracts : [details];
    for (const group of groupSegmentenOpKenteken(segments)) {
      if (group[0].soort !== "auto") continue;
      const kenteken = group[0].kenteken;
      const naam = String(lease.name || "Lease").replace(/\s*—?\s*contract\s*/i, " ").replace(/\s+/g, " ").trim();
      autos.push({
        id: `lease:${lease.key}:${segments.indexOf(group[0])}`,
        kort: kenteken || (naam.length > 22 ? `${naam.slice(0, 21)}…` : naam),
        bron: "lease", leaseKey: lease.key, groep: group.map((s) => segments.indexOf(s)),
      });
    }
  }
  const soort = autoWizardStatus?.soort;
  if ((soort === "koop" || soort === "operational") && autoActivaDetails) {
    autos.push({ id: "eigen", kort: soort === "koop" ? "Auto (eigendom)" : "Auto (operationele lease)", bron: "eigen" });
  }
  return autos;
}

export function heeftPrivegebruik(auto, jaar, { leaseDetails, autoActivaDetails }) {
  if (auto.bron === "eigen") return !!autoActivaDetails?.privegebruikMeerDan500kmPerJaar?.[jaar];
  const details = leaseDetails?.[auto.leaseKey];
  const segments = Array.isArray(details?.contracts) && details.contracts.length > 0 ? details.contracts : [details];
  return auto.groep.some((i) => !!segments[i]?.privegebruikMeerDan500kmPerJaar?.[jaar]);
}

// Zet het vinkje voor dit jaar: alleen `gekozenId` krijgt "ja", alle andere auto's "nee" (gekozenId null = geen).
// Geeft { leaseDetails: { [leaseKey]: nieuweDetails }, autoActivaDetails } met alleen wat is veranderd.
export function zetPrivegebruikKeuze(autos, gekozenId, jaar, staat) {
  let leaseDetails = staat.leaseDetails;
  let autoActivaDetails = staat.autoActivaDetails;
  const gewijzigdeLeases = {};
  let eigenGewijzigd = false;
  const met = (seg, ja, isPrimair) => {
    const map = { ...(seg.privegebruikMeerDan500kmPerJaar || {}) };
    if (ja) { if (isPrimair) map[jaar] = true; } else delete map[jaar];
    return { ...seg, privegebruikMeerDan500kmPerJaar: map };
  };
  for (const auto of autos) {
    const ja = auto.id === gekozenId;
    if (heeftPrivegebruik(auto, jaar, { leaseDetails, autoActivaDetails }) === ja) continue;
    if (auto.bron === "eigen") { autoActivaDetails = met(autoActivaDetails || {}, ja, true); eigenGewijzigd = true; continue; }
    const details = leaseDetails[auto.leaseKey];
    const nieuw = Array.isArray(details.contracts) && details.contracts.length > 0
      ? { ...details, contracts: details.contracts.map((s, i) => (auto.groep.includes(i) ? met(s, ja, i === auto.groep[0]) : s)) }
      : met(details, ja, true);
    leaseDetails = { ...leaseDetails, [auto.leaseKey]: nieuw };
    gewijzigdeLeases[auto.leaseKey] = nieuw;
  }
  return { leaseDetails: gewijzigdeLeases, autoActivaDetails: eigenGewijzigd ? autoActivaDetails : null };
}
