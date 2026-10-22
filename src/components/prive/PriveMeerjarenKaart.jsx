// beide-V1R8 (fase 5) — jaaroverzicht van een privédossier: per jaar inkomsten, uitgaven per hoofdcategorie,
// sparen, wat over is en de belastingindicatie. Kolommen per categoriegroep in plaats van omzet en kosten.
import { useState } from "react";
import { eur } from "../../utils/amounts.js";
import { KAART } from "./PriveKaarten.jsx";

export default function PriveMeerjarenKaart({ jaren, perJaar }) {
  const [perHoofd, setPerHoofd] = useState(false);
  if (jaren.length < 1) return null;
  const hoofden = [...new Set(jaren.flatMap((j) => perJaar[j]?.budget.uitgavenPerHoofd.map((h) => h.hoofd) || []))];
  const hoofdBedrag = (j, h) => perJaar[j]?.budget.uitgavenPerHoofd.find((x) => x.hoofd === h)?.bedrag || 0;
  const rij = (label, f, cls = "") => (
    <tr className={`border-b border-slate-100 ${cls}`}>
      <td className="py-1 pr-2 text-slate-600">{label}</td>
      {jaren.map((j) => <td key={j} className="py-1 px-2 text-right tabular-nums">{f(j)}</td>)}
    </tr>
  );
  return (
    <section className={KAART}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Meerjarenoverzicht</h3>
        <button type="button" onClick={() => setPerHoofd((v) => !v)} className="text-xs font-medium text-teal-800 underline decoration-dotted">{perHoofd ? "Zonder categorieën" : "Per categorie"}</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-slate-500 border-b border-slate-200"><th className="text-left py-1 pr-2" />{jaren.map((j) => <th key={j} className="py-1 px-2 text-right">{j}</th>)}</tr></thead>
          <tbody>
            {rij("Inkomsten", (j) => eur(perJaar[j].budget.totaal.inkomsten))}
            {rij("Uitgaven", (j) => eur(perJaar[j].budget.totaal.uitgaven))}
            {perHoofd && hoofden.map((h) => <tr key={h} className="text-xs text-slate-500"><td className="py-0.5 pl-3 pr-2">{h}</td>{jaren.map((j) => <td key={j} className="py-0.5 px-2 text-right tabular-nums">{eur(hoofdBedrag(j, h))}</td>)}</tr>)}
            {rij("Sparen", (j) => eur(perJaar[j].budget.totaal.sparen))}
            {rij("Over", (j) => eur(perJaar[j].budget.totaal.over), "font-semibold")}
            {rij("Inkomstenbelasting: terug (−) of bij (+)", (j) => eur(perJaar[j].belasting.verschil))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
