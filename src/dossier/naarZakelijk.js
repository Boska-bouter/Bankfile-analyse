// beide-V14R0 — van een privédossier een zakelijk dossier maken (wens Boska 3-11), de omgekeerde weg van naarPrive.js.
// Voor wie een bedrijf start: de personen, rekeningen, boekingen, keuzes en notities gaan mee; de rekeningen blijven
// privérekeningen. Het bankbestand van de zakelijke rekening voegt de gebruiker daarna toe. Omdat alle bestanden
// meegaan, blijven de boekingsnummers gelijk. Het origineel blijft zoals het is; de twee dossiers zijn daarna los.

// Voortgang van de privé-wizard en controles: die horen bij het oude dossier; het zakelijke dossier begint opnieuw.
const NIET_MEE = ["resumePositie", "overgeslagenStappen", "eenvoudigGezien", "bevestigdeControles"];

export function naarZakelijk(project, { weergave = "uitgebreid" } = {}) {
  const bestanden = Array.isArray(project.parsedFiles) ? project.parsedFiles : [];
  const uit = { ...project };
  for (const k of NIET_MEE) delete uit[k];
  const types = {};
  for (const pf of bestanden) types[pf.fileName] = "Prive";
  return {
    ...uit,
    dossierSoort: "zakelijk",
    weergave,
    parsedFiles: bestanden,
    accountTypeByFile: types,
    // privéregels (prive:true) ruimt het zakelijke profiel zelf op; eigen regels gaan mee
    categoryRules: Array.isArray(project.categoryRules) ? project.categoryRules.filter((r) => !r?.prive) : project.categoryRules,
    eigenRekeningenExtra: (Array.isArray(project.eigenRekeningenExtra) ? project.eigenRekeningenExtra : []).map((r) => ({ ...r, accountType: r?.accountType || "Prive" })),
    auditLog: [...(Array.isArray(project.auditLog) ? project.auditLog.slice(-280) : []), { t: Date.now(), label: `Zakelijk dossier gemaakt van een privédossier (${bestanden.length} ${bestanden.length === 1 ? "bestand" : "bestanden"}, als privérekening)` }],
    savedAt: new Date().toISOString(),
  };
}
