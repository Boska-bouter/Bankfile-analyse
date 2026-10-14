import { keuzeGroepen, keuzeWaarde } from "../../classification/categories.js";

// release30V6 — één keuzelijst voor een categorie, gegroepeerd per hoofdcategorie met direct alle soorten.
// value = opgeslagen (fijne) categorie; onChange krijgt de gekozen opgeslagen categorie. Kies je bij
// "Privé kosten algemeen" opnieuw dezelfde groep, dan blijft de huidige soort staan (geen wijziging).
export default function CategorieSelect({ value, onChange, className = "", placeholder = null }) {
  const groepen = keuzeGroepen(value || null);
  const huidig = value ? keuzeWaarde(value) : "";
  return (
    <select
      value={huidig}
      onChange={(e) => { const v = e.target.value; if (!v || v === huidig) return; onChange(v); }}
      className={className}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {groepen.map((g) => (
        <optgroup key={g.groep} label={g.groep}>
          {g.opties.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
