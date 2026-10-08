// Jaarkeuze voor "Samenvatting voor klant" — zelfde patroon als bij de indicatieve aangifteberekening.
export default function KlantJaarKeuzeModal({ years, selected, setSelected, onOpen, onClose, vraag = "Voor welke jaren wil je de samenvatting voor de klant?", knop = "Samenvatting tonen" }) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium">{vraag}</p>
        <div className="flex flex-wrap gap-3">
          {years.map((year) => (
            <label key={year} className="inline-flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={selected.includes(year)}
                onChange={(e) => setSelected((prev) => (e.target.checked ? [...prev, year].sort() : prev.filter((y) => y !== year)))} />
              {year}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button disabled={selected.length === 0} onClick={() => onOpen(selected)} className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-40">
            {knop}
          </button>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuleren</button>
        </div>
      </div>
    </div>
  );
}
