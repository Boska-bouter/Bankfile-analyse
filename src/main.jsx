import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ErrorBoundary } from "./ErrorBoundary.jsx";
import { installStoragePolyfill } from "./storage/projectStorage.js";
import { laadTarieven } from "./tax/tarievenLaden.js";
import "./index.css";

installStoragePolyfill();

// Escape sluit het bovenste open venster (de donkere achtergrond is het klikgebied dat het venster sluit).
// Niet als je in een invoerveld typt: dan is Escape voor dat veld.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || e.defaultPrevented) return;
  const el = e.target;
  if (el && el.closest && el.closest("input, textarea, select, [contenteditable='true']")) return;
  const vensters = document.querySelectorAll(".fixed.inset-0.bg-slate-900\\/50");
  if (vensters.length === 0) return;
  vensters[vensters.length - 1].click();
});

// beide-V6R7 — eerst het tarievenbestand van de server (hooguit 2,5 seconde), zodat alles meteen met de nieuwste
// tarieven rekent. Mislukt het, dan start de app gewoon met de bewaarde of ingebouwde tarieven.
laadTarieven().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
});
