import { keuzeGroepen, keuzeWaarde } from "../../classification/categories.js";

// release30V6 — één keuzelijst voor een categorie, gegroepeerd per hoofdcategorie met direct alle soorten.
// value = opgeslagen (fijne) categorie; onChange krijgt de gekozen opgeslagen categorie. Kies je bij
// "Privé kosten algemeen" opnieuw dezelfde groep, dan blijft de huidige soort staan (geen wijziging).
export default function CategorieSelect({ value, onChange, className = "", placeholder = null }) {
  let groepen = keuzeGroepen(value || null);
  let huidig = value ? keuzeWaarde(value) : "";
  // release30V8 — valt de huidige categorie onder een groep zonder eigen soorten (bijv. "Overboekingen aan
  // personen" onder "Privé kosten algemeen"), toon dan die categorie zelf, zodat je ziet wat er nu staat.
  if (value && huidig !== value) {
    const verborgen = huidig;
    groepen = groepen.map((g) => {
      const i = g.opties.findIndex((o) => o.value === verborgen);
      if (i < 0) return g;
      const opties = [...g.opties];
      opties.splice(i + 1, 0, { value, label: `${opties[i].label} – ${value}` });
      return { ...g, opties };
    });
    huidig = value;
  }
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
