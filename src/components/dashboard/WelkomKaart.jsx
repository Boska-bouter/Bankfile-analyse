import { Check, ClipboardList, Lock, Upload, ListChecks } from "lucide-react";

// release22V0 — lege staat van Overzicht (nog geen bankbestand). Vervangt de stapel losse blokken
// (ringmeter "nog geen data", aangifteblok, reconstructielink, routebalk met 5× "nog geen input",
// hulpregel, basisvragenkaart en de grote privacybalk) door één kaart met drie stappen.
// release30V4 — status: "klaar" (vinkje), "nu" (de stap die aan de beurt is: gevuld rondje + gevulde knop),
// "later" (kan al, maar is niet aan de beurt: grijs rondje + omlijnde knop), "wacht" (nog niet mogelijk).
function Stap({ nr, titel, tekst, status, knop, Icon }) {
  const klaar = status === "klaar";
  const uit = status === "wacht";
  const nu = status === "nu";
  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${uit ? "border-slate-100 bg-slate-50/60" : "border-slate-200 bg-white"}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${klaar ? "bg-emerald-600 text-white" : nu ? "bg-teal-700 text-white" : uit ? "bg-slate-200 text-slate-400" : "border-2 border-slate-300 bg-white text-slate-500"}`}>
        {klaar ? <Check className="h-4 w-4" /> : nr}
      </span>
      <div className="flex-1 min-w-[12rem]">
        <p className={`text-sm font-semibold ${uit ? "text-slate-400" : "text-slate-900"}`}>{titel}</p>
        <p className={`text-xs ${uit ? "text-slate-400" : "text-slate-500"}`}>{tekst}</p>
      </div>
      {knop && (
        <button type="button" onClick={knop.onClick}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${nu ? "bg-teal-700 text-white hover:bg-teal-800" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
          {Icon && <Icon className="h-4 w-4" />} {knop.label}
        </button>
      )}
    </li>
  );
}

// beide-V1R7 — teksten per soort dossier (privé: uit modus/prive/wizard.js); zonder = de zakelijke.
const ZAKELIJK = {
  onderwerpen: "rechtsvorm, auto, lease en dergelijke",
  basis: "Rechtsvorm, auto, lease, BTW — zo rekent de app met de juiste regels.",
  bestanden: "Zakelijk en privé · CSV, Excel, MT940 of CAMT.053 · per jaar of meerdere jaren.",
  controleren: "Indeling, bedrijfsmiddelen en instellingen nalopen. Beschikbaar na de import.",
};

export default function WelkomKaart({ basisStatus, basisOpen, onBasisvragen, onBankbestand, onDossierLaden, teksten = null }) {
  // basisStatus: "nog-niet" | "deels" | "klaar"
  const t = { ...ZAKELIJK, ...(teksten || {}) };
  const basisTekst =
    basisStatus === "klaar" ? "Beantwoord — aanpassen kan altijd via Basisvragen bewerken."
      : basisStatus === "deels" ? `${basisOpen} vra${basisOpen === 1 ? "ag" : "gen"} nog open: ${t.onderwerpen}.`
        : t.basis;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Nieuw dossier opzetten</h2>
        <p className="text-sm text-slate-500 mt-0.5">Drie stappen, in deze volgorde. Je kunt tussendoor stoppen; alles wordt bewaard.</p>
      </div>
      <ol className="space-y-2">
        <Stap nr={1} titel="Basisvragen" tekst={basisTekst} status={basisStatus === "klaar" ? "klaar" : "nu"} Icon={ClipboardList}
          knop={basisStatus === "klaar" ? null : { label: basisStatus === "deels" ? "Verder" : "Start", onClick: onBasisvragen }} />
        <Stap nr={2} titel="Bankbestanden toevoegen" tekst={t.bestanden} status={basisStatus === "klaar" ? "nu" : "later"} Icon={Upload}
          knop={{ label: "Toevoegen", onClick: onBankbestand }} />
        <Stap nr={3} titel="Controleren" tekst={t.controleren} status="wacht" Icon={ListChecks} />
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Lock className="h-3.5 w-3.5 text-emerald-600" /> Bankgegevens blijven op dit apparaat; er gaat niets naar een server.
        </p>
        {onDossierLaden && (
          <button type="button" onClick={onDossierLaden} className="text-xs font-medium text-teal-800 underline decoration-dotted hover:text-teal-950">
            Of laad een eerder opgeslagen dossier
          </button>
        )}
      </div>
    </section>
  );
}
