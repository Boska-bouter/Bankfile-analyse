// Toont het dossierprofiel (zie dossier/dossierProfiel.js) als compacte blokken.
export default function DossierProfielLijst({ blokken }) {
  if (!blokken || blokken.length === 0) return null;
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {blokken.map((b) => (
        <div key={b.titel}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-0.5">{b.titel}</p>
          <ul className="space-y-0.5">
            {b.regels.map((r, i) => (
              <li key={i} className={`text-[12.5px] leading-snug ${/nog niet opgegeven/.test(r) ? "text-amber-700" : "text-slate-700"}`}>{r}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
