import React from "react";

// v222 — zonder dit ving een render-fout ergens in de app (bijv. een JavaScript-fout in een
// component) helemaal niets op: React stopt dan gewoon met renderen en je krijgt een volledig wit
// scherm, zonder enige aanwijzing wat er mis ging. Vooral vervelend op een tablet/iPad, waar geen
// browserconsole (F12) beschikbaar is om de fout alsnog te zien. Deze ErrorBoundary vangt zo'n fout
// op en toont 'm gewoon leesbaar op het scherm (inclusief technische details om te kunnen delen),
// in plaats van niets te laten zien.
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
            dit is precies de informatie die nodig is om de oorzaak te vinden. Je opgeslagen project in deze browser
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
            {String(error && (error.stack || error.message || error))}
            {info && info.componentStack ? `\n\nComponent-stack:${info.componentStack}` : ""}
          </pre>
        </div>
      </div>
    );
  }
}
