import { groupSegmentenOpKenteken } from "./autoBijtelling.js";

// Per auto: staat het vinkje "privégebruik meer dan 500 km" voor een jaar aan, en hoeveel privékilometers zijn er opgegeven.
// De gegevens staan bij de auto zelf: bij een financiële lease in het (eerste) contractsegment van die auto (zelfde
// kenteken = zelfde auto, een vinkje bij een van de segmenten geldt voor de hele auto), bij een gekochte of operationeel
// geleasete auto in autoActivaDetails. De bijtelling hangt alleen af van het vinkje; de kilometers zijn onderbouwing.
export function lijstPrivegebruikAutos({ leaseSummary, leaseDetails, autoActivaDetails, autoWizardStatus }) {
  const autos = [];
  for (const lease of leaseSummary || []) {
    if (lease.category !== "Lease (financieel)") continue;
    const details = leaseDetails?.[lease.key];
    if (!details || details.onbekend) continue;
    const segments = Array.isArray(details.contracts) && details.contracts.length > 0 ? details.contracts : [details];
    for (const group of groupSegmentenOpKenteken(segments)) {
      if (group[0].soort !== "auto") continue;
      autos.push({
        id: `lease:${lease.key}:${segments.indexOf(group[0])}`,
        naam: group[0].kenteken ? `${lease.name || "Auto"} (${group[0].kenteken})` : (lease.name || "Auto (financiële lease)"),
        bron: "lease", leaseKey: lease.key, segments, groep: group.map((s) => segments.indexOf(s)),
      });
    }
  }
  const soort = autoWizardStatus?.soort;
  if ((soort === "koop" || soort === "operational") && autoActivaDetails) {
    autos.push({ id: "eigen", naam: soort === "koop" ? "Auto (eigendom)" : "Auto (operationele lease)", bron: "eigen" });
  }
  return autos;
}

export function leesPrivegebruik(auto, jaar, { leaseDetails, autoActivaDetails }) {
  if (auto.bron === "eigen") {
    const d = autoActivaDetails || {};
    return { ja: !!d.privegebruikMeerDan500kmPerJaar?.[jaar], km: d.privegebruikKmPerJaar?.[jaar] ?? "" };
  }
  const details = leaseDetails?.[auto.leaseKey];
  const segments = Array.isArray(details?.contracts) && details.contracts.length > 0 ? details.contracts : [details];
  return {
    ja: auto.groep.some((i) => !!segments[i]?.privegebruikMeerDan500kmPerJaar?.[jaar]),
    km: segments[auto.groep[0]]?.privegebruikKmPerJaar?.[jaar] ?? "",
  };
}

// patch: { ja?: boolean, km?: string|number|null }. Geeft { leaseKey, leaseDetails } of { autoActivaDetails } terug.
export function pasPrivegebruikToe(auto, jaar, patch, { leaseDetails, autoActivaDetails }) {
  const werk = (seg, isPrimair) => {
    const ja = { ...(seg.privegebruikMeerDan500kmPerJaar || {}) };
    const km = { ...(seg.privegebruikKmPerJaar || {}) };
    if (patch.ja !== undefined) {
      if (patch.ja) { if (isPrimair) ja[jaar] = true; } else { delete ja[jaar]; delete km[jaar]; }
    }
    if (patch.km !== undefined && isPrimair) {
      if (patch.km === "" || patch.km == null) delete km[jaar]; else km[jaar] = patch.km;
    }
    return { ...seg, privegebruikMeerDan500kmPerJaar: ja, privegebruikKmPerJaar: km };
  };
  if (auto.bron === "eigen") return { autoActivaDetails: werk(autoActivaDetails || {}, true) };
  const details = leaseDetails[auto.leaseKey];
  if (Array.isArray(details.contracts) && details.contracts.length > 0) {
    return { leaseKey: auto.leaseKey, leaseDetails: { ...details, contracts: details.contracts.map((s, i) => (auto.groep.includes(i) ? werk(s, i === auto.groep[0]) : s)) } };
  }
  return { leaseKey: auto.leaseKey, leaseDetails: werk(details, true) };
}
