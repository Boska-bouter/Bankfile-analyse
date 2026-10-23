// V7R8 / beide-V3R2 — Eenvoudig → Uitgebreid gaat maar één kant op (besluit Boska 23-10): heen en weer wisselen gaf
// open vragen die terugkwamen en posten die opnieuw werden gevraagd. Daarom eerst deze bevestiging.
export default function OmzettenUitgebreid({ onJa, onNee }) {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-3">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold">Omzetten naar Uitgebreid?</h2>
        <p className="mt-2 text-sm text-slate-600">Dit dossier gaat over naar de uitgebreide weergave. Alles wat je in Eenvoudig hebt gedaan, blijft bewaard.</p>
        <p className="mt-2 text-sm font-semibold text-slate-800">Terug naar Eenvoudig kan daarna niet meer.</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onNee} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">In Eenvoudig blijven</button>
          <button type="button" onClick={onJa} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Ja, omzetten</button>
        </div>
      </div>
    </div>
  );
}
