// nieuw-V10R2 — Boska 24-11: een eigen zakelijke rekening zonder bankbestand waarop omzet binnenkomt (bijv. pin of contant).
// Besluit Boska 24-11 11:05: alles wat van die rekening naar de geladen rekening gaat is omzet ("Zakelijke inkomsten", incl. btw);
// wat de geladen rekening erheen stuurt blijft een interne overboeking.
// rekeningen: IBAN's (spaties en hoofdletters maken niet uit).
const norm = (x) => String(x || "").replace(/\s+/g, "").toUpperCase();
export const OMZET_VIA_REKENING_LABEL = "Omzet via eigen rekening zonder bankbestand";

// opties.geladen: IBAN's waarvan het bankbestand is geladen (dan telt de omzet al via dat bestand: niets markeren).
// opties.overridesByRow: een boeking die de gebruiker zelf heeft ingedeeld blijft zoals die is.
export function markeerOmzetViaRekening(classified, rekeningen, opties = {}) {
  const geladen = new Set([...(opties.geladen || [])].map(norm));
  const rijen = opties.overridesByRow || {};
  const set = new Set([...(rekeningen || [])].map(norm).filter((i) => i && !geladen.has(i)));
  if (!set.size || !classified?.length) return classified;
  let gewijzigd = false;
  const uit = classified.map((tx) => {
    if (tx.isMirror || !(tx.amount > 0) || !set.has(norm(tx.counterpartyIban)) || rijen[tx.id]) return tx;
    if (tx.category !== "Interne overboeking" && tx.category !== "Interne overboeking: zakelijk sparen") return tx;
    gewijzigd = true;
    return { ...tx, category: "Zakelijke inkomsten", omzetViaRekening: true, confidence: { ...(tx.confidence || {}), level: "override", label: OMZET_VIA_REKENING_LABEL } };
  });
  return gewijzigd ? uit : classified;
}
