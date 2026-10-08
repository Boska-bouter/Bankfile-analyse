// Dialogen rond "Dossier laden" en "Nieuw dossier starten" (uit App.jsx gehaald, stap 3 van de opsplitsing).
// Alleen de vragen/waarschuwingen staan hier; het daadwerkelijke opslaan, laden en wissen blijft in App.jsx
// en wordt als functie meegegeven.

export function useDossierDialogen({
  parsedFilesCount, changesSinceExport, eigenNamen, lastExportAt, loadedProjectFileName,
  setDialog, saveProjectFile, openProjectPicker, doClearAllData, setActiveTab, setManualWizardOpen,
}) {
  const wijzigingWaarschuwing = () => (
    <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      ⚠ Er {changesSinceExport === 1 ? "is 1 wijziging" : `zijn ${changesSinceExport} wijzigingen`} sinds{" "}
      {lastExportAt ? `de laatste opslag (${new Date(lastExportAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })})` : loadedProjectFileName ? `het laden van "${loadedProjectFileName}"` : "het starten van dit dossier (nog niet als bestand opgeslagen)"}.
      Als je niet opslaat, zijn deze wijzigingen weg.
    </p>
  );

  const naamRegel = () => (
    <>{eigenNamen?.ondernemer || "zonder naam"} · {parsedFilesCount} bankbestand{parsedFilesCount === 1 ? "" : "en"}</>
  );

  // Opslaan, daarna bevestigen dat het bestand echt is opgeslagen (een browser kan niet zien of het
  // "Bewaar als"-venster is afgebroken), met één herkansing; pas dan gaat het vervolg door.
  const opslaanEnBevestig = (uitleg, jaLabel, vervolg) => {
    saveProjectFile();
    setDialog({
      title: "Is het dossier opgeslagen?",
      message: <p>{uitleg}</p>,
      actions: [
        { label: jaLabel, variant: "primary", onClick: vervolg },
        { label: "Nee, opnieuw opslaan", onClick: () => { saveProjectFile(); setDialog({
          title: "Is het dossier opgeslagen?",
          message: <p>Bevestig pas als het bestand echt is opgeslagen.</p>,
          actions: [{ label: jaLabel, variant: "primary", onClick: vervolg }],
        }); } },
      ],
    });
  };

  const startLoadProject = () => {
    if (parsedFilesCount === 0 || changesSinceExport === 0) { openProjectPicker(); return; }
    setDialog({
      title: "Huidig dossier opslaan?",
      message: (
        <>
          <p>
            <span className="text-slate-400">Huidig dossier: </span>
            <strong className="text-slate-700">{eigenNamen?.ondernemer || "zonder naam"}</strong> · {parsedFilesCount} bankbestand{parsedFilesCount === 1 ? "" : "en"}
          </p>
          {wijzigingWaarschuwing()}
          <p className="text-xs text-slate-400 pt-1">
            Hierna kies je het dossier dat je wilt laden. Dat vervangt het huidige dossier. Via "Ongedaan maken" in de zijbalk kun je dit direct terugdraaien.
          </p>
        </>
      ),
      actions: [
        { label: "Opslaan en daarna dossier kiezen", variant: "primary", onClick: () => opslaanEnBevestig(
          "Het dossier is aangeboden om te downloaden. Controleer of het bestand echt is opgeslagen voordat je een ander dossier kiest.",
          "Ja, opgeslagen — dossier kiezen", openProjectPicker) },
        { label: "Niet opslaan, dossier kiezen", variant: "danger", onClick: openProjectPicker },
      ],
    });
  };

  const clearAllData = () => {
    // Leeg dossier (bijv. net een nieuw dossier gestart en de wizard afgebroken): niets om te wissen, dus direct de wizard.
    if (parsedFilesCount === 0) { setActiveTab("overzicht"); setManualWizardOpen(true); return; }
    // Niets gewijzigd sinds de laatste opslag/het laden: geen vraag nodig (het dossier is al in een bestand te vinden).
    if (changesSinceExport === 0) { doClearAllData(true); return; }
    const nieuw = () => doClearAllData(true);
    setDialog({
      title: "Nieuw dossier starten? Het huidige dossier wordt nu gesloten",
      message: (
        <>
          <p>
            Het huidige dossier ({naamRegel()}) wordt
            gesloten: bestanden, rekeningtypes, correcties en instellingen worden leeggemaakt.
          </p>
          {wijzigingWaarschuwing()}
          <p className="text-xs text-slate-400 pt-1">
            Stop je daarna halverwege de wizard, dan houd je een leeg dossier. Direct daarna kun je dit nog terugdraaien via "Ongedaan maken" in de zijbalk.
          </p>
        </>
      ),
      actions: [
        { label: "Opslaan en nieuw dossier starten", variant: "primary", onClick: () => opslaanEnBevestig(
          "Het dossier is aangeboden om te downloaden. Controleer of het bestand echt is opgeslagen voordat het huidige dossier wordt gesloten.",
          "Ja, opgeslagen — nieuw dossier starten", nieuw) },
        { label: "Nieuw dossier starten zonder opslaan", variant: "danger", onClick: nieuw },
      ],
    });
  };

  return { startLoadProject, clearAllData };
}
