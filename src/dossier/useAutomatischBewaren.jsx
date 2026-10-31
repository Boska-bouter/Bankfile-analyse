import { useEffect, useRef } from "react";
import { BTW_RATES_VERSION } from "../tax/btw.js";
import { persistParsedFiles, persistSettings } from "../storage/projectStorage.js";
import { dossierWaardenLijst, NIET_GETELD, DOSSIER_VELDEN, wijzigingsLabel } from "./dossierVelden.js";

// beide-V11R8 — uit App.jsx gehaald (opsplitsing): automatisch bewaren per browser en wijzigingen sinds de laatste export.
export function useAutomatischBewaren(p) {
  const {
    parsedFiles, soortDossier, loaded, setSaveState, changesSinceExport, setChangesSinceExport, lastExportAt, suppressChangeCountUntilRef, restoredChangesRef, setLastSavedAt, loadedProjectFileName, skipNextPersistRef, dossierGegevens, setAuditLog,
  } = p;
  const vorigeWaarden = useRef(null); // beide-V13R0 — om te zien welke velden veranderden

  // ---- Automatisch bewaren per browser bij elke wijziging ----
  useEffect(() => {
    if (!loaded) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    (async () => {
      setSaveState("saving");
      const ok1 = await persistParsedFiles(parsedFiles);
      const { parsedFiles: _bestanden, ...instellingen } = dossierGegevens;
      const ok2 = await persistSettings({
        ...instellingen, dossierSoort: soortDossier, btwRatesVersion: BTW_RATES_VERSION, loadedProjectFileName,
        changesSinceExport, lastExportAtMs: lastExportAt ? +lastExportAt : null,
      });
      setSaveState(ok1 && ok2 ? "saved" : "error");
      if (ok1 && ok2) setLastSavedAt(new Date());
    })();
  }, [...dossierWaardenLijst(dossierGegevens), soortDossier, loadedProjectFileName, changesSinceExport, lastExportAt, loaded]);

  // nieuw-V6R6 — `weergave` (Eenvoudig/Uitgebreid) telt niet als wijziging: alleen van weergave wisselen
  // (ook de keuze direct na het laden) maakt een bewaard dossier niet ‘niet opgeslagen’.
  // v305 (V27) — telt wijzigingen sinds de laatste export. Zelfde afhankelijkheden als de autosave
  // hierboven, maar bewust zonder loadedProjectFileName (die verandert bij het exporteren zelf).
  useEffect(() => {
    if (!loaded) return;
    const nu = {};
    for (const k of DOSSIER_VELDEN) if (!NIET_GETELD.has(k)) nu[k] = dossierGegevens[k];
    const vorig = vorigeWaarden.current;
    vorigeWaarden.current = nu;
    // Binnen het venster na laden/nieuw dossier telt niets mee. Het venster wordt bewust NIET na de eerste
    // keer gesloten: na het laden kunnen er nog meer afgeleide waarden bijkomen (een tweede render), en die
    // gaven anders een schijnbare "1 wijziging" bij een dossier waar je nog niets aan had gedaan.
    if (Date.now() < suppressChangeCountUntilRef.current) {
      setChangesSinceExport(restoredChangesRef.current);
      return;
    }
    setChangesSinceExport((n) => n + 1);
    // beide-V13R0 — ook in het wijzigingslog, tenzij een eigen actie het net (binnen 3 s) al vastlegde.
    const velden = vorig ? Object.keys(nu).filter((k) => nu[k] !== vorig[k]) : [];
    if (setAuditLog && velden.length) {
      setAuditLog((prev) => {
        const laatste = prev[prev.length - 1];
        if (laatste && Date.now() - laatste.t < 3000) return prev;
        return [...prev, { t: Date.now(), label: wijzigingsLabel(velden) }].slice(-300);
      });
    }
  }, dossierWaardenLijst(dossierGegevens, NIET_GETELD));

  // v305 (V27) — waarschuwing bij het sluiten/verversen van de pagina zolang er wijzigingen zijn die
  // nog niet als dossierbestand zijn geëxporteerd. (De automatische browseropslag blijft gewoon
  // bestaan; dit is voor wie op een ander apparaat/browser verder wil of de browserdata wist.)
  const heeftNietGeexporteerdeWijzigingen = changesSinceExport > 0 && parsedFiles.length > 0;
  useEffect(() => {
    if (!heeftNietGeexporteerdeWijzigingen) return;
    const waarschuw = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", waarschuw);
    return () => window.removeEventListener("beforeunload", waarschuw);
  }, [heeftNietGeexporteerdeWijzigingen]);


}
