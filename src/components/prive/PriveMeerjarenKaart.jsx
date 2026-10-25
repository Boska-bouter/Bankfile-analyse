// beide-V1R8 (fase 5) — jaaroverzicht van een privédossier: per jaar inkomsten, uitgaven per hoofdcategorie,
// sparen, wat over is en de belastingindicatie. Kolommen per categoriegroep in plaats van omzet en kosten.
import { useState } from "react";
import { eur } from "../../utils/amounts.js";
import { KAART } from "./PriveKaarten.jsx";
import { metTeken as teken } from "../../reports/prive/opmaak.js";
import { sparenLabel, hoofdLabel, overLabel, VASTE_LASTEN_LABEL, EIGEN_BETAAL_LABEL, SALDO_LABEL, VERSCHOVEN_LABEL } from "../../calc/prive/budget.js";

export default function PriveMeerjarenKaart({ jaren, perJaar }) {
  const [perHoofd, setPerHoofd] = useState(false);
  if (jaren.length < 1) return null;
  const hoofden = [...new Set(jaren.flatMap((j) => perJaar[j]?.budget.uitgavenPerHoofd.map((h) => h.hoofd) || []))];
  const tot = (j) => perJaar[j].budget.totaal;
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
            {rij("Inkomsten", (j) => teken(tot(j).inkomsten))}
            {rij("Uitgaven", (j) => teken(tot(j).uitgaven, true))}
            {perHoofd && hoofden.map((h) => <tr key={h} className="text-xs text-slate-500"><td className="py-0.5 pl-3 pr-2">{hoofdLabel(h, jaren.map((j) => hoofdBedrag(j, h)))}</td>{jaren.map((j) => <td key={j} className="py-0.5 px-2 text-right tabular-nums">{teken(hoofdBedrag(j, h), true)}</td>)}</tr>)}
            {rij(overLabel(jaren.map((j) => tot(j).over)), (j) => teken(tot(j).over), "font-semibold")}
            {rij(sparenLabel(jaren.map((j) => tot(j).sparen)), (j) => teken(tot(j).sparen, true))}
            {jaren.some((j) => Math.abs(tot(j).eigenBetaal || 0) >= 0.5) && rij(EIGEN_BETAAL_LABEL, (j) => teken(tot(j).eigenBetaal || 0))}
            {jaren.some((j) => Math.abs(tot(j).verschoven || 0) >= 0.5) && rij(VERSCHOVEN_LABEL, (j) => teken(tot(j).verschoven || 0))}
            {rij(SALDO_LABEL, (j) => teken(tot(j).saldo))}
            {perHoofd && rij(VASTE_LASTEN_LABEL, (j) => teken(tot(j).vasteLasten, true), "text-xs text-slate-500")}
            {rij("Inkomstenbelasting: terug (−) of bij (+)", (j) => eur(perJaar[j].belasting.verschil))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
