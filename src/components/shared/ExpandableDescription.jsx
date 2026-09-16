import { useState } from "react";

// Toont de (korte) omschrijving, met een klik om de volledige bankomschrijving te tonen/verbergen
// — zelfde interactie als in het hoofdoverzicht (GroupView), nu ook in de andere vensters waar een
// transactie-omschrijving voorkomt. Handig om bij twijfel snel te checken of een transactie
// terecht zo is ingedeeld.
export default function ExpandableDescription({ tx, prefix = "", className = "", short }) {
  const [expanded, setExpanded] = useState(false);
  const full = tx.fullDescription || tx.description;
  const kort = short ?? tx.description ?? "";
  if (!full) {
    if (!kort) return null;
    return <span className={className}>{prefix}{kort}</span>;
  }
  return (
    <span
      className={`cursor-pointer ${expanded ? "whitespace-normal break-words" : "truncate block"} ${className}`}
      onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
      title="Klik om de volledige bankomschrijving te tonen/verbergen"
    >
      {prefix}{expanded ? full : kort}
    </span>
  );
}
