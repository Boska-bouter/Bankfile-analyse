import { useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronRight } from "lucide-react";
// nieuw-V9R8 — Boska 23-11: de signalen voor de balans per jaar in Controleren. Elk punt kan worden afgevinkt
// ("Gezien, klopt"); een punt dat niet is afgevinkt telt als open punt. Verandert het bedrag, dan komt het terug.
// lijst: [{ k, tekst (HTML, al ge-escaped), bevestigd }]
export default function BalansCheck({ jaar, lijst = [], onBevestig, onHerroep, onBestandToevoegen, onSaldo, andereJaren = [] }) {
  const [keuze, setOpen] = useState(null);
  const [toonAfgevinkt, setToonAfgevinkt] = useState(false);
  if (!jaar) return null;
  const open_ = lijst.filter((m) => !m.bevestigd);
  const af = lijst.filter((m) => m.bevestigd);
  const n = open_.length;
  const open = keuze ?? n > 0;
  const knop = "min-h-[44px] rounded-full border px-4 text-sm font-semibold";
  return (
    <section className={`rounded-xl border-2 ${n ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <button type="button" onClick={() => setOpen(!open)} className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-left">
        {n ? <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" /> : <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
        <span className={`text-sm font-semibold ${n ? "text-amber-900" : "text-emerald-900"}`}>
          Balanscheck {jaar} — {n ? `${n} ${n === 1 ? "punt" : "punten"} open` : lijst.length ? "alles afgevinkt" : "geen bijzonderheden"}
          {!n && andereJaren.length > 0 && <span className="font-normal text-amber-800"> · nog open in {andereJaren.join(", ")}</span>}
        </span>
        <span className="flex-1" />
        {lijst.length > 0 && (open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />)}
      </button>
      {open && lijst.length > 0 && (
        <div className="space-y-2 px-4 pb-3">
          {open_.map((m) => (
            <div key={m.k} className="rounded-lg border border-amber-200 bg-white p-3">
              <p className="max-w-4xl text-sm text-slate-800" dangerouslySetInnerHTML={{ __html: m.tekst }} />
              <div className="mt-2 flex flex-wrap gap-2">
                {m.k.startsWith("spaarsaldo:") && onSaldo && <SaldoInvoer k={m.k} onSaldo={onSaldo} />}
                {(m.k === "geenprive" || m.k.startsWith("intern:")) && onBestandToevoegen && (
                  <button type="button" onClick={onBestandToevoegen} className={`${knop} border-teal-700 bg-teal-700 text-white hover:bg-teal-800`}>Bankbestand toevoegen</button>
                )}
                <button type="button" onClick={() => onBevestig?.(m.k)} className={`${knop} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>{bevestigTekst(m.k)}</button>
              </div>
            </div>
          ))}
          {af.length > 0 && (
            <div>
              <button type="button" onClick={() => setToonAfgevinkt(!toonAfgevinkt)} className="min-h-[44px] text-sm text-slate-600 underline">
                {toonAfgevinkt ? "Afgevinkte punten verbergen" : `${af.length} ${af.length === 1 ? "afgevinkt punt" : "afgevinkte punten"} tonen`}
              </button>
              {toonAfgevinkt && af.map((m) => (
                <div key={m.k} className="mt-2 flex flex-wrap items-start gap-2 rounded-lg border border-slate-200 bg-white/60 p-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="max-w-3xl flex-1 text-sm text-slate-500" dangerouslySetInnerHTML={{ __html: m.tekst }} />
                  <button type="button" onClick={() => onHerroep?.(m.k)} className={`${knop} border-slate-300 bg-white text-slate-600 hover:bg-slate-50`}>Terugzetten</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// nieuw-V9R9 — saldo van een niet geladen eigen (spaar)rekening op 1-1 van het eerste jaar invullen (sleutel spaarsaldo:IBAN:jaar).
function SaldoInvoer({ k, onSaldo }) {
  const [, iban, jaar, min] = k.split(":");
  const [waarde, setWaarde] = useState("");
  const bedrag = leesBedrag(waarde);
  const geldig = bedrag != null;
  const minimum = Number(min) || 0;
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (geldig) onSaldo(iban, Number(jaar), bedrag); }}>
      <label className="text-sm text-slate-700" htmlFor={`saldo-${k}`}>Saldo 1-1-{jaar} €</label>
      <input id={`saldo-${k}`} inputMode="decimal" value={waarde} onChange={(e) => setWaarde(e.target.value)} placeholder={minimum ? `bijv. ${eur(minimum)}` : "bijv. 12.500"}
        className="min-h-[44px] w-36 rounded-lg border border-slate-300 px-3 text-sm" />
      <button type="submit" disabled={!geldig} className="min-h-[44px] rounded-full bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-40">Opslaan</button>
      {geldig && <span className={`w-full text-xs ${minimum && bedrag < minimum ? "text-amber-800" : "text-slate-500"}`}>Wordt opgeslagen als € {eur(bedrag, 2)}{minimum && bedrag < minimum ? `. Let op: lager dan het minimum van € ${eur(minimum)}.` : ""}</span>}
    </form>
  );
}
const eur = (n, d = 0) => Number(n).toLocaleString("nl-NL", { minimumFractionDigits: d, maximumFractionDigits: d });
const bevestigTekst = (k) => k === "geenprive" ? "Klopt, geen privérekening" : k.startsWith("spaarsaldo:") ? "Klopt, minimum is goed" : k.startsWith("verschil:") ? "Verschil is verklaard" : k.startsWith("btwprive:") ? "Klopt, privé betaald" : "Gezien, klopt";
// "36.207", "36.207,50", "36207,5" en "36207.50" (punt met 1 of 2 cijfers aan het eind = decimaalteken).
export function leesBedrag(t) {
  let s = String(t || "").trim().replace(/[€\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{1,2}$/.test(s)) s = s.slice(0, s.lastIndexOf(".")).replace(/\./g, "") + s.slice(s.lastIndexOf("."));
  else s = s.replace(/\./g, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}
