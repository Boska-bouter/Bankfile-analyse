import { useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import { displayCategory } from "../../classification/categories.js";

// D2 — één zoekveld over alle transacties (alle jaren, alle bestanden). Zoekt in tegenpartij,
// omschrijving, categorie, datum (dd-mm-jjjj), jaar en bedrag (1250 / 1.250,00). Meerdere woorden = allemaal.
const normBedrag = (n) => Math.abs(n).toFixed(2).replace(".", ",");
const MAX = 200;

export default function ZoekAllesModal({ transacties, jaren = [], onClose, onGaNaarJaar }) {
  const [q, setQ] = useState("");
  const [jaar, setJaar] = useState("alle");
  const [soort, setSoort] = useState("alle");
  const [zonderSpiegel, setZonderSpiegel] = useState(true);

  const index = useMemo(() => (transacties || []).filter((t) => t && t.date).map((t) => ({
    t,
    hay: `${t.counterparty || ""} ${t.description || ""} ${t.fullDescription || ""} ${displayCategory(t.category) || ""} ${t.date.toLocaleDateString("nl-NL").replace(/\//g, "-")} ${t.year} ${normBedrag(t.amount)} ${Math.abs(t.amount).toFixed(2)}`.toLowerCase(),
  })), [transacties]);

  const { rijen, totaal, som } = useMemo(() => {
    const woorden = q.toLowerCase().split(/\s+/).map((w) => w.replace(/^€/, "").replace(/\.(?=\d{3}\b)/g, "")).filter(Boolean);
    const hits = index.filter(({ t, hay }) =>
      (jaar === "alle" || String(t.year) === jaar) &&
      (soort === "alle" || (soort === "zakelijk" ? t.accountType === "Zakelijk" : t.accountType === "Prive")) &&
      (!zonderSpiegel || !t.isMirror) &&
      woorden.every((w) => hay.includes(w))
    ).map((x) => x.t).sort((a, b) => b.date - a.date);
    return { rijen: hits.slice(0, MAX), totaal: hits.length, som: hits.reduce((s, t) => s + (t.amount || 0), 0) };
  }, [index, q, jaar, soort, zonderSpiegel]);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 flex items-start justify-center p-3 pt-10" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl max-h-[88dvh] flex flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 px-5 pt-4 pb-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Escape" && onClose()}
            placeholder="Zoek in alle transacties: tegenpartij, omschrijving, categorie, bedrag of datum…"
            className="flex-1 min-w-0 text-sm outline-none" data-testid="zoek-alles-input" />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Sluiten"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-5 pb-2 text-xs text-slate-600">
          <select value={jaar} onChange={(e) => setJaar(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1">
            <option value="alle">Alle jaren</option>
            {jaren.map((j) => <option key={j} value={String(j)}>{j}</option>)}
          </select>
          <select value={soort} onChange={(e) => setSoort(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1">
            <option value="alle">Zakelijk en privé</option><option value="zakelijk">Alleen zakelijke rekening</option><option value="prive">Alleen privérekening</option>
          </select>
          <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={zonderSpiegel} onChange={(e) => setZonderSpiegel(e.target.checked)} /> spiegelboekingen verbergen</label>
          <span className="ml-auto text-slate-500" data-testid="zoek-alles-telling">{totaal} {totaal === 1 ? "resultaat" : "resultaten"} · saldo {eur(som)}{totaal > MAX ? ` · eerste ${MAX} getoond` : ""}</span>
        </div>
        <div className="overflow-auto px-2 pb-3">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white text-slate-500"><tr>
              <th className="text-left font-medium px-3 py-1.5">Datum</th><th className="text-right font-medium px-3 py-1.5">Bedrag</th>
              <th className="text-left font-medium px-3 py-1.5">Categorie</th><th className="text-left font-medium px-3 py-1.5">Tegenpartij</th><th className="text-left font-medium px-3 py-1.5">Omschrijving</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rijen.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => onGaNaarJaar?.(String(t.year))} title={`Ga naar ${t.year}`}>
                  <td className="px-3 py-1.5 whitespace-nowrap font-mono text-slate-500">{t.date.toLocaleDateString("nl-NL")}</td>
                  <td className={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${t.amount >= 0 ? "text-emerald-700" : "text-slate-700"}`}>{eur(t.amount)}</td>
                  <td className="px-3 py-1.5 text-slate-700">{displayCategory(t.category)}<span className="ml-1 text-[10px] text-slate-400">{t.accountType === "Prive" ? "privé" : "zakelijk"}</span></td>
                  <td className="px-3 py-1.5 text-slate-800 max-w-[14rem] truncate">{t.counterparty}</td>
                  <td className="px-3 py-1.5 text-slate-500 max-w-[18rem] truncate">{t.description}</td>
                </tr>
              ))}
              {rijen.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">{q.trim() ? "Niets gevonden." : "Typ om te zoeken."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
