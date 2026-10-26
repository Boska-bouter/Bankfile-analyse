// beide-V3R2 / V7R8 — Eenvoudig → Uitgebreid gaat maar één kant op (besluit Boska 23-10): heen en weer wisselen gaf
// open vragen die terugkwamen en posten die opnieuw werden gevraagd. Daarom eerst deze bevestiging.
// beide-V7R1 — vooraf uitleggen wat blijft, wat verandert en waarom terug niet kan, met een klein voorbeeld (review punt 4).

const WAT_VERANDERT = {
  zakelijk: [
    "Alle tabbladen worden zichtbaar: Overzicht, Controleren en Instellingen.",
    "De wizard stelt de vragen die in Eenvoudig zijn overgeslagen, zoals over auto, bedrijfsmiddelen, leningen en het urencriterium.",
    "Rapporten krijgen de volledige onderbouwing, btw per kwartaal en de aangifteberekening.",
  ],
  prive: [
    "Alle tabbladen worden zichtbaar: Overzicht, Controleren en Instellingen.",
    "Er komen vaste lasten, sparen, box 3 en meerdere jaren naast elkaar bij.",
    "De wizard stelt de vragen die in Eenvoudig zijn overgeslagen.",
  ],
};

function Voorbeeld() {
  const blok = "rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600";
  return (
    <div className="mt-3 grid grid-cols-2 gap-2" aria-hidden="true">
      <div className={blok}>
        <p className="font-semibold text-slate-800">Eenvoudig</p>
        <div className="mt-1 flex gap-1">{[1, 2, 3, 4].map((n) => <span key={n} className="h-1.5 flex-1 rounded-full bg-teal-600/70" />)}</div>
        <p className="mt-1.5">Vier stappen, één vraag tegelijk, uitkomst in gewone taal.</p>
      </div>
      <div className={blok}>
        <p className="font-semibold text-slate-800">Uitgebreid</p>
        <div className="mt-1 flex gap-1 text-[10px]">{["Overzicht", "Controleren", "Instellingen"].map((t) => <span key={t} className="rounded border border-slate-300 bg-white px-1">{t}</span>)}</div>
        <p className="mt-1.5">Alle controles, instellingen en rapporten, ook meerdere jaren naast elkaar.</p>
      </div>
    </div>
  );
}

export default function OmzettenUitgebreid({ onJa, onNee, soort = "zakelijk", onOpslaan = null }) {
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 flex items-center justify-center p-3">
      <div role="dialog" aria-modal="true" className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold">Omzetten naar Uitgebreid?</h2>
        <Voorbeeld />
        <div className="mt-3 space-y-2.5 text-sm text-slate-600">
          <div>
            <p className="font-semibold text-slate-800">Wat blijft</p>
            <p>Alle bankgegevens, de gekozen categorieën, de antwoorden op vragen en het dossierbestand.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Wat verandert</p>
            <ul className="list-disc space-y-0.5 pl-5">{(WAT_VERANDERT[soort] || WAT_VERANDERT.zakelijk).map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Waarom terug niet kan</p>
            <p>In Uitgebreid kunnen keuzes worden gemaakt die Eenvoudig niet kan tonen. Terugzetten zou die ongemerkt verbergen; dan kloppen de cijfers in Eenvoudig niet meer met wat er is ingesteld.</p>
          </div>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
            Tip: sla het dossier eerst op. Dan blijft er altijd een kopie van de Eenvoudig-versie.
            {onOpslaan && <> <button type="button" onClick={onOpslaan} className="font-semibold underline">Dossier opslaan</button></>}
          </p>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onNee} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">In Eenvoudig blijven</button>
          <button type="button" onClick={onJa} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Ja, omzetten</button>
        </div>
      </div>
    </div>
  );
}
