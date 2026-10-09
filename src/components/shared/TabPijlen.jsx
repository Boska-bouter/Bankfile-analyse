import { useEffect, useState } from "react";

// Pijlen in de marge naast de inhoud: één tik naar het vorige/volgende hoofdtabblad. Alleen zichtbaar waar de
// marge breed genoeg is (vanaf 1024 px schermbreedte); blijft op halve schermhoogte staan terwijl je scrolt.
const TAB_VOLGORDE = [["overzicht", "Overzicht"], ["controleren", "Controleren"], ["instellingen", "Instellingen"]];

export default function TabPijlen({ activeTab, onSelect }) {
  const [breed, setBreed] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  useEffect(() => {
    const h = () => setBreed(window.innerWidth >= 1024);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const i = TAB_VOLGORDE.findIndex(([k]) => k === activeTab);
  if (!breed || i < 0) return null;
  const pijl = (doel, glyph, kant) => doel && (
    <button
      type="button"
      onClick={() => onSelect(doel[0])}
      title={`${kant === "links" ? "Vorig" : "Volgend"} tabblad: ${doel[1]}`}
      aria-label={`${kant === "links" ? "Vorig" : "Volgend"} tabblad: ${doel[1]}`}
      data-testid={`tab-pijl-${kant}`}
      style={{ position: "absolute", top: -26, [kant === "links" ? "left" : "right"]: -56, width: 44, height: 52, borderRadius: 999, border: "1px solid #e2e8f0", background: "rgba(255,255,255,0.85)", color: "#64748b", fontSize: 28, lineHeight: "48px", textAlign: "center", boxShadow: "0 1px 3px rgba(15,23,42,0.08)", cursor: "pointer" }}
    >
      {glyph}
    </button>
  );
  return (
    <div style={{ position: "sticky", top: "50vh", height: 0, zIndex: 45, flex: "0 0 auto", width: "100%", maxWidth: "80rem", margin: "0 auto", padding: "0 4rem", boxSizing: "border-box" }}>
      <div style={{ position: "relative", height: 0 }}>
        {pijl(TAB_VOLGORDE[i - 1], "‹", "links")}
        {pijl(TAB_VOLGORDE[i + 1], "›", "rechts")}
      </div>
    </div>
  );
}
