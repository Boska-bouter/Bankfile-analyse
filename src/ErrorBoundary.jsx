import React from "react";

// v222 — zonder dit ving een render-fout ergens in de app (bijv. een JavaScript-fout in een
// component) helemaal niets op: React stopt dan gewoon met renderen en je krijgt een volledig wit
// scherm, zonder enige aanwijzing wat er mis ging. Vooral vervelend op een tablet/iPad, waar geen
// browserconsole (F12) beschikbaar is om de fout alsnog te zien. Deze ErrorBoundary vangt zo'n fout
// op en toont 'm gewoon leesbaar op het scherm (inclusief technische details om te kunnen delen),
// in plaats van niets te laten zien.
// Noodback-up: de automatisch bewaarde browsergegevens als gewoon dossierbestand downloaden (te laden via
// "Dossier laden"), zodat er niets verloren gaat als de app niet meer opstart.
function downloadNoodBackup() {
  try {
    const data = JSON.parse(localStorage.getItem("bankoverzicht:data") || "{}");
    const settings = JSON.parse(localStorage.getItem("bankoverzicht:settings") || "{}");
    const project = { type: "bankoverzicht-project", version: 1, savedAt: new Date().toISOString(), noodBackup: true, ...settings, parsedFiles: data.parsedFiles || [] };
    const blob = new Blob([JSON.stringify(project)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Bankoverzicht_noodbackup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) { alert("Back-up maken mislukt: " + e); }
}
// Herstel: bewaart eerst niets anders dan de lease-/leninggegevens weg uit de opgeslagen instellingen en laadt opnieuw.
function herstelZonderLease() {
  if (!window.confirm("Dit wist alleen de ingevulde leasegegevens uit de automatische opslag van dit apparaat (bankbestanden en overige instellingen blijven staan). Download eerst de noodback-up. Doorgaan?")) return;
  try {
    const settings = JSON.parse(localStorage.getItem("bankoverzicht:settings") || "{}");
    for (const k of ["leaseDetails", "confirmedLeaseTypeKeys", "leaseMergedInto", "verwachteLease", "verwachteLeaseOverig", "autoWizardStatus"]) delete settings[k];
    settings.changesSinceExport = 1;
    localStorage.setItem("bankoverzicht:settings", JSON.stringify(settings));
  } catch (e) { alert("Herstel mislukt: " + e); return; }
  window.location.reload();
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // Ook naar de console loggen, voor het geval iemand wél toegang heeft tot devtools.
    // eslint-disable-next-line no-console
    console.error("Onverwachte fout in Bankoverzicht:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { error, info } = this.state;
    return (
      <div style={{ minHeight: "100vh", background: "#fef2f2", padding: "24px", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#991b1b", marginBottom: "8px" }}>
            Er is een onverwachte fout opgetreden
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#7f1d1d", marginBottom: "16px" }}>
            De pagina kon niet (volledig) geladen worden. Maak hier een screenshot van en stuur die door —
            dit is precies de informatie die nodig is om de oorzaak te vinden. Je opgeslagen dossier in deze browser
            is niet aangetast; een pagina-herlaadknop hieronder probeert het gewoon opnieuw.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginBottom: "16px",
              borderRadius: "6px",
              background: "#991b1b",
              color: "white",
              padding: "8px 16px",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            Pagina opnieuw laden
          </button>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            <button onClick={downloadNoodBackup} style={{ borderRadius: "6px", background: "white", color: "#991b1b", padding: "8px 16px", fontSize: "0.875rem", fontWeight: 500, border: "1px solid #991b1b", cursor: "pointer" }}>
              Noodback-up van het dossier downloaden
            </button>
            <button onClick={herstelZonderLease} style={{ borderRadius: "6px", background: "white", color: "#991b1b", padding: "8px 16px", fontSize: "0.875rem", fontWeight: 500, border: "1px solid #991b1b", cursor: "pointer" }}>
              Herstel: leasegegevens wissen en opnieuw laden
            </button>
          </div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "white",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "0.75rem",
              color: "#450a0a",
              overflow: "auto",
            }}
          >
            {error && error.message ? `${error.name || "Error"}: ${error.message}\n\n` : ""}{String(error && (error.stack || error.message || error))}
            {info && info.componentStack ? `\n\nComponent-stack:${info.componentStack}` : ""}
          </pre>
        </div>
      </div>
    );
  }
}
