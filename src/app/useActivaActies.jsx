// Activa: samenvatting en acties (toevoegen, verwijderen, onbekend markeren).
// nieuw-V1R0 — uit App.jsx gehaald (opruimronde 9-11). Alle invoer komt binnen via `invoer`; namen die App pas later maakt via invoer.appLaat.
import { computeActivaSummary } from "../tax/activa.js";
import { useMemo } from "react";

export function useActivaActies(invoer) {
  const { activaDetails, classified, setActivaDetails, setActivaDetailsModalKey, snapshotBeforeAction } = invoer;
  const activaSummary = useMemo(() => computeActivaSummary(classified, activaDetails), [classified, activaDetails]);
  const setActivaDetailField = (key, newDetails) => {
    snapshotBeforeAction("Activagegevens aangepast");
    setActivaDetails((prev) => ({ ...prev, [key]: { ...(prev[key]?.handmatig ? { handmatig: true } : {}), ...newDetails } }));
  };
  // Bedrijfsmiddel handmatig toevoegen (zonder bankbetaling), vanuit de wizard (namen) of het Activa-paneel.
  const maakActivaSleutel = (i = 0) => `handmatig::${Date.now().toString(36)}${i}`;
  const voegActivaToe = (namen) => {
    const lijst = (namen || []).map((n) => String(n).trim()).filter(Boolean);
    if (lijst.length === 0) return;
    snapshotBeforeAction("Bedrijfsmiddelen toegevoegd");
    setActivaDetails((prev) => { const next = { ...prev }; lijst.forEach((naam, i) => { next[maakActivaSleutel(i)] = { handmatig: true, naam }; }); return next; });
  };
  const addManualActiva = () => {
    const key = maakActivaSleutel();
    snapshotBeforeAction("Bedrijfsmiddel toegevoegd");
    setActivaDetails((prev) => ({ ...prev, [key]: { handmatig: true, nieuw: true, naam: "Nieuw bedrijfsmiddel" } }));
    setActivaDetailsModalKey(key);
  };
  const removeActivum = (key) => {
    snapshotBeforeAction("Bedrijfsmiddel verwijderd");
    setActivaDetails((prev) => { const next = { ...prev }; delete next[key]; return next; });
  };
  const markActivaUnknown = (key) => {
    snapshotBeforeAction("Activum op onbekend gezet");
    setActivaDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: true } }));
  };
  const unmarkActivaUnknown = (key) => {
    snapshotBeforeAction("Activum toch invullen");
    setActivaDetails((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), onbekend: false } }));
  };
  return { activaSummary, addManualActiva, markActivaUnknown, removeActivum, setActivaDetailField, unmarkActivaUnknown, voegActivaToe };
}
