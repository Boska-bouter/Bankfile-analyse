import { useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronRight } from "lucide-react";
// nieuw-V9R8 — Boska 23-11: de signalen voor de balans per jaar in Controleren. Elk punt kan worden afgevinkt
// ("Gezien, klopt"); een punt dat niet is afgevinkt telt als open punt. Verandert het bedrag, dan komt het terug.
// lijst: [{ k, tekst (HTML, al ge-escaped), bevestigd }]
export default function BalansCheck({ jaar, lijst = [], onBevestig, onHerroep, onBestandToevoegen, onOmzet, omzetRekeningen = [], onOmzetTerug, andereJaren = [], andereLijsten = {} }) {
  const [keuze, setOpen] = useState(null);
  const [toonAfgevinkt, setToonAfgevinkt] = useState(false);
  if (!jaar) return null;
  const open_ = lijst.filter((m) => !m.bevestigd);
  const af = lijst.filter((m) => m.bevestigd);
  const n = open_.length;
  const nAnder = Object.values(andereLijsten).reduce((a, l) => a + l.length, 0);
  const open = keuze ?? (n + nAnder) > 0;
  const knop = "min-h-[44px] rounded-full border px-4 text-sm font-semibold";
  const punt = (m, j) => (
    <div key={`${j}-${m.k}`} className="rounded-lg border border-amber-200 bg-white p-3">
      <p className="max-w-4xl text-sm text-slate-800" dangerouslySetInnerHTML={{ __html: m.tekst }} />
      <div className="mt-2 flex flex-wrap gap-2">
        {(m.k.startsWith("intern:") || m.k.startsWith("spaarsaldo:")) && onBestandToevoegen && (
          <button type="button" onClick={onBestandToevoegen} className={`${knop} border-teal-700 bg-teal-700 text-white hover:bg-teal-800`}>Bankbestand toevoegen</button>
        )}
        <button type="button" onClick={() => onBevestig?.(m.k, j)} className={`${knop} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>{bevestigTekst(m.k)}</button>
        {m.k.startsWith("spaarsaldo:") && onOmzet && m.k.split(":")[1] !== "onbekend" && (
          <button type="button" onClick={() => onOmzet(m.k.split(":")[1])} className={`${knop} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>Ja, omzet (geen bankbestand)</button>
        )}
      </div>
    </div>
  );
  return (
    <section className={`rounded-xl border-2 ${n || nAnder ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <button type="button" onClick={() => setOpen(!open)} className="flex min-h-[44px] w-full items-center gap-2 px-4 py-3 text-left">
        {n || nAnder ? <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" /> : <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
        <span className={`text-sm font-semibold ${n || nAnder ? "text-amber-900" : "text-emerald-900"}`}>
          Balanscheck {jaar} — {n ? `${n} ${n === 1 ? "punt" : "punten"} open` : nAnder ? "geen punten in dit jaar" : lijst.length ? "alles afgevinkt" : "geen bijzonderheden"}
          {andereJaren.length > 0 && <span className="font-normal text-amber-800"> · ook open: {Object.keys(andereLijsten).sort().map((j) => `${j} (${andereLijsten[j].length})`).join(", ") || andereJaren.join(", ")}</span>}
        </span>
        <span className="flex-1" />
        {(lijst.length > 0 || nAnder > 0) && (open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />)}
      </button>
      {open && lijst.length > 0 && (
        <div className="space-y-2 px-4 pb-3">
          {nAnder > 0 && open_.length > 0 && <p className="pt-1 text-sm font-semibold text-amber-900">{jaar}</p>}
          {open_.map((m) => punt(m, jaar))}
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
      {open && nAnder > 0 && (
        <div className="space-y-2 px-4 pb-3">
          {Object.keys(andereLijsten).sort().map((j) => (
            <div key={j} className="space-y-2">
              <p className="pt-1 text-sm font-semibold text-amber-900">{j}</p>
              {andereLijsten[j].map((m) => punt(m, j))}
            </div>
          ))}
        </div>
      )}
      {omzetRekeningen.length > 0 && (
        <div className="space-y-1 px-4 pb-3">
          {omzetRekeningen.map((iban) => (
            <div key={iban} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              <span>Rekening {iban.replace(/(.{4})/g, "$1 ").trim()}: wat daarvandaan binnenkomt telt als omzet.</span>
              {onOmzetTerug && <button type="button" onClick={() => onOmzetTerug(iban)} className={`${knop} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>Ongedaan maken</button>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const bevestigTekst = (k) => k.startsWith("spaarsaldo:") ? "Nee, geen omzet of kosten" : k === "geenprive" ? "Klopt, geen privérekening" : k.startsWith("verschil:") ? "Verschil is verklaard" : k.startsWith("btwprive:") ? "Klopt, privé betaald" : "Gezien, klopt";
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
