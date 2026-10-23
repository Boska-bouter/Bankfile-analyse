// beide-V2R6 / V7R5 — het abonnement van de ingelogde gebruiker als korte tekst, voor de zijbalk (Uitgebreid) en de
// kopregel van Eenvoudig. Komt uit /api/rol (useRol.js): per soort (zakelijk, privé) of, zonder soorten, uit de
// algemene rechten.
const NIVEAU = ["", "Eenvoudig", "Uitgebreid", "Uitgebreid met bankkoppeling"];
const SOORT = { zakelijk: "Zakelijk", prive: "Privé" };
const niveau = (x) => (x?.koppelen ? 3 : x?.uitgebreid ? 2 : x?.eenvoudig ? 1 : 0);
const datum = (iso) => {
  const d = new Date(String(iso).length === 10 ? `${iso}T12:00:00` : iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
};
const totEnMet = (iso) => (iso && datum(iso) ? ` (t/m ${datum(iso)})` : "");

export function abonnementRegels({ soorten = null, mag = false, koppelen = false, geldigTot = null, beheerder = false } = {}) {
  if (beheerder) return ["Beheerder: alles"];
  if (soorten) {
    const regels = Object.keys(SOORT).map((s) => {
      const n = niveau(soorten[s]);
      return n ? `${SOORT[s]}: ${NIVEAU[n]}${totEnMet(soorten[s]?.geldigTot)}` : null;
    }).filter(Boolean);
    return regels.length ? regels : ["Nog geen abonnement"];
  }
  return [`${NIVEAU[koppelen ? 3 : mag ? 2 : 1]}${totEnMet(geldigTot)}`];
}
