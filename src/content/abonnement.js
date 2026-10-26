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

// beide-V7R3 — abonnementen die binnen `dagen` aflopen (gratis abonnement loopt 30 dagen), voor de melding in de app
// met de knop "Verlengen". Beheerders hebben geen einddatum. vandaag = JJJJ-MM-DD.
export function aflopendeAbonnementen(soorten, { vandaag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }), dagen = 10, beheerder = false } = {}) {
  if (beheerder || !soorten) return [];
  const grens = new Date(`${vandaag}T12:00:00Z`);
  grens.setUTCDate(grens.getUTCDate() + dagen);
  const g = grens.toISOString().slice(0, 10);
  return Object.keys(SOORT).map((s) => {
    const x = soorten[s];
    if (!niveau(x) || !x.geldigTot || x.geldigTot < vandaag || x.geldigTot > g) return null;
    const over = Math.round((new Date(`${x.geldigTot}T12:00:00Z`) - new Date(`${vandaag}T12:00:00Z`)) / 86400000);
    return { soort: s, tekst: `${SOORT[s]}: ${NIVEAU[niveau(x)]}`, datum: datum(x.geldigTot), dagen: over };
  }).filter(Boolean);
}
