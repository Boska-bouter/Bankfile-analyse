import { KNOP_SECUNDAIR } from "../../components/ui/stijl.js";
// Jaarkeuze voor "Samenvatting voor klant" — zelfde patroon als bij de indicatieve aangifteberekening.
export default function KlantJaarKeuzeModal({ years, selected, setSelected, onOpen, onClose, vraag = "Voor welke jaren de samenvatting voor de klant?", knop = "Samenvatting tonen" }) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium">{vraag}</p>
        <div className="flex flex-wrap gap-2">
          {years.map((year) => (
            <label key={year} className={`inline-flex items-center gap-2 min-h-[44px] rounded-lg border px-3 text-sm cursor-pointer ${selected.includes(year) ? "border-teal-600 bg-teal-50" : "border-slate-300"}`}>
              <input type="checkbox" className="h-5 w-5" checked={selected.includes(year)}
                onChange={(e) => setSelected((prev) => (e.target.checked ? [...prev, year].sort() : prev.filter((y) => y !== year)))} />
              {year}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button disabled={selected.length === 0} onClick={() => onOpen(selected)} className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40">
            {knop}
          </button>
          <button onClick={onClose} className={KNOP_SECUNDAIR}>Annuleren</button>
        </div>
        {selected.length === 0 && <p className="text-xs text-slate-500">Kies minstens één jaar.</p>}
      </div>
    </div>
  );
}
