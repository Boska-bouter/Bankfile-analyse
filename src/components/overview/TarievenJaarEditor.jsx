import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { resolveTariefGroep, tariefStatusVoorJaar, IB_TARIEVEN_BY_YEAR } from "../../tax/incomeTax.js";

// Ingeklapt onderdeel van "Persoonlijke aannames voor IB": de tarieven en bedragen die de
// indicatieve berekening per jaar gebruikt. Standaard staan de officiële waarden ingevuld
// (tax/incomeTax.js); een jaar zonder eigen tabel — bijv. een jaar na het laatst bekende jaar — gebruikt
// tijdelijk de waarden van het dichtstbijzijnde eerdere jaar ("benadering"). Hier kun je elke waarde
// per jaar overschrijven ("aangepast") of een nieuw jaar invullen; alles wordt in het dossier bewaard.

const GROEPEN = [
  { key: "ib", titel: "Inkomstenbelasting box 1", velden: [
    ["zelfstandigenaftrek", "Zelfstandigenaftrek (€)"],
    ["mkbPct", "MKB-winstvrijstelling (%)"],
    ["aftrekBeperkingPct", "Aftrekposten beperkt tot tarief (%)"],
  ] },
  { key: "zvw", titel: "Zvw-bijdrage", velden: [
    ["pct", "Percentage (%)"],
    ["maxBijdrageInkomen", "Maximum bijdrage-inkomen (€)"],
  ] },
  { key: "ahk", titel: "Algemene heffingskorting", velden: [
    ["max", "Maximum (€)"],
    ["afbouwGrens", "Afbouw vanaf inkomen (€)"],
    ["afbouwPct", "Afbouwpercentage (%)"],
  ] },
  { key: "ak", titel: "Arbeidskorting", velden: [
    ["max", "Maximum (€)"],
    ["afbouwVanaf", "Afbouw vanaf arbeidsinkomen (€)"],
    ["afbouwPct", "Afbouwpercentage (%)"],
  ] },
  { key: "kia", titel: "Kleinschaligheidsinvesteringsaftrek (KIA)", velden: [
    ["drempel", "Ondergrens investering (€)"],
    ["vast1Tot", "28% tot investering van (€)"],
    ["pct1", "Percentage eerste staffel (%)"],
    ["vastBedrag", "Vast bedrag (€)"],
    ["vastTot", "Vast bedrag tot (€)"],
    ["afbouwPct", "Afbouwpercentage (%)"],
    ["nul", "Geen KIA vanaf (€)"],
  ] },
];

const STATUS_STIJL = {
  standaard: "bg-emerald-50 text-emerald-800 border-emerald-200",
  benadering: "bg-amber-50 text-amber-900 border-amber-300",
  aangepast: "bg-sky-50 text-sky-900 border-sky-300",
};
const STATUS_TEKST = { standaard: "standaard", benadering: "benadering", aangepast: "aangepast" };

// JSON kent geen Infinity — de bovenste schijf wordt als tot: null bewaard.
const naarOpslag = (w) => ({
  ...w,
  ...(Array.isArray(w.brackets) ? { brackets: w.brackets.map((b) => ({ ...b, tot: Number.isFinite(b.tot) ? b.tot : null })) } : {}),
});
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

function Veld({ label, value, onChange, stap = "any" }) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs text-slate-600">
      <span>{label}</span>
      <input
        type="number" step={stap} inputMode="decimal" value={value ?? ""}
        onChange={(e) => onChange(num(e.target.value))}
        className="w-28 rounded border border-slate-300 px-2 py-1 text-right text-xs"
      />
    </label>
  );
}

// beide-V1R9 — ook voor privé: andere groepen (modus/prive/tarievenEditor.js), eigen resolve en status; een veld kan een
// factor hebben (bijv. 100 om een fractie als percentage te tonen). Zonder die props precies het zakelijke gedrag.
export default function TarievenJaarEditor({
  activeYear, years = [], tariefOverrides, onSetTariefOverrides,
  groepen = GROEPEN, resolve = resolveTariefGroep, statusVoorJaar = (j) => tariefStatusVoorJaar(j).status, toonWerkelijk = true,
}) {
  const [open, setOpen] = useState(false);
  const [jaar, setJaar] = useState(activeYear);
  const [laatsteActief, setLaatsteActief] = useState(activeYear);
  if (laatsteActief !== activeYear) { setLaatsteActief(activeYear); setJaar(activeYear); }

  const bekendMax = Math.max(...Object.keys(IB_TARIEVEN_BY_YEAR).map(Number), ...years.map(Number), activeYear);
  const jarenLijst = [];
  for (let y = 2020; y <= bekendMax + 3; y++) jarenLijst.push(y);

  const overrides = tariefOverrides || {};
  const status = statusVoorJaar(jaar);
  const statusActief = statusVoorJaar(activeYear);

  const zetGroep = (groep, waarde) => {
    onSetTariefOverrides({ ...overrides, [jaar]: { ...(overrides[jaar] || {}), [groep]: naarOpslag(waarde) } });
  };
  const resetGroep = (groep) => {
    const rest = { ...(overrides[jaar] || {}) };
    delete rest[groep];
    const next = { ...overrides };
    if (Object.keys(rest).length) next[jaar] = rest; else delete next[jaar];
    onSetTariefOverrides(next);
  };
  const zetWerkelijk = (v) => {
    const rest = { ...(overrides[jaar] || {}) };
    if (v === "" || v == null) delete rest.werkelijkeHeffingskorting; else rest.werkelijkeHeffingskorting = num(v);
    const next = { ...overrides };
    if (Object.keys(rest).length) next[jaar] = rest; else delete next[jaar];
    onSetTariefOverrides(next);
  };

  return (
    <div className="pt-2 border-t border-slate-200">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-1.5 text-sm font-medium text-slate-700">
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Tarieven en bedragen {activeYear}
        <span className={`ml-1 rounded-full border px-2 py-0.5 text-[11px] font-normal ${STATUS_STIJL[statusActief]}`}>{STATUS_TEKST[statusActief]}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          <p className="text-xs text-slate-500">
            Standaard staan de officiële tarieven ingevuld. Een jaar zonder eigen tabel gebruikt tijdelijk de waarden van het
            dichtstbijzijnde eerdere jaar (benadering). Pas een waarde aan, of vul een nieuw jaar in, zodra de officiële
            cijfers bekend zijn.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Jaar:</span>
            <select value={jaar} onChange={(e) => setJaar(Number(e.target.value))} className="rounded border border-slate-300 px-2 py-1 text-xs">
              {jarenLijst.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS_STIJL[status]}`}>{STATUS_TEKST[status]}</span>
          </div>

          {groepen.map((g) => {
            const r = resolve(g.key, jaar);
            const w = r.waarde;
            return (
              <div key={g.key} className="rounded-lg border border-slate-200 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-700">{g.titel}</p>
                  <span className="flex items-center gap-2">
                    {r.status === "benadering" && <span className="text-[11px] text-amber-800">waarden {r.bronJaar}</span>}
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS_STIJL[r.status]}`}>{STATUS_TEKST[r.status]}</span>
                    {r.status === "aangepast" && (
                      <button type="button" onClick={() => resetGroep(g.key)} className="text-[11px] text-slate-500 underline hover:text-slate-700">Terug naar standaard</button>
                    )}
                  </span>
                </div>
                {g.key === "ib" && (
                  <div className="space-y-1">
                    {w.brackets.map((b, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 text-xs text-slate-600">
                        <span>Schijf {i + 1}{Number.isFinite(b.tot) ? " tot (€)" : " (daarboven)"}</span>
                        <span className="flex items-center gap-2">
                          {Number.isFinite(b.tot) ? (
                            <input type="number" step="any" value={b.tot} className="w-24 rounded border border-slate-300 px-2 py-1 text-right text-xs"
                              onChange={(e) => zetGroep("ib", { ...w, brackets: w.brackets.map((x, j) => (j === i ? { ...x, tot: num(e.target.value) } : x)) })} />
                          ) : <span className="w-24 text-right text-slate-400">∞</span>}
                          <input type="number" step="any" value={Math.round(b.tarief * 1e6) / 1e4} className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-xs"
                            onChange={(e) => zetGroep("ib", { ...w, brackets: w.brackets.map((x, j) => (j === i ? { ...x, tarief: num(e.target.value) / 100 } : x)) })} />
                          <span>%</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {g.key === "ak" && (
                  <div className="space-y-1">
                    {w.opbouw.map((st, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-xs text-slate-600">
                        <span>Opbouw {i + 1}: tot (€) / basis (€) / %</span>
                        <span className="flex items-center gap-1">
                          <input type="number" step="any" value={st.tot} className="w-20 rounded border border-slate-300 px-1.5 py-1 text-right text-xs"
                            onChange={(e) => zetGroep("ak", { ...w, opbouw: w.opbouw.map((x, j) => (j === i ? { ...x, tot: num(e.target.value) } : j === i + 1 ? { ...x, van: num(e.target.value) } : x)) })} />
                          {st.van != null ? (
                            <input type="number" step="any" value={st.basis} className="w-16 rounded border border-slate-300 px-1.5 py-1 text-right text-xs"
                              onChange={(e) => zetGroep("ak", { ...w, opbouw: w.opbouw.map((x, j) => (j === i ? { ...x, basis: num(e.target.value) } : x)) })} />
                          ) : <span className="w-16 text-center text-slate-400">—</span>}
                          <input type="number" step="any" value={st.pct} className="w-16 rounded border border-slate-300 px-1.5 py-1 text-right text-xs"
                            onChange={(e) => zetGroep("ak", { ...w, opbouw: w.opbouw.map((x, j) => (j === i ? { ...x, pct: num(e.target.value) } : x)) })} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {g.velden.map(([k, label, factor = 1]) => (
                  <Veld key={k} label={label} value={w[k] == null ? w[k] : Math.round(w[k] * factor * 1e6) / 1e6} onChange={(v) => zetGroep(g.key, { ...w, [k]: v / factor })} />
                ))}
              </div>
            );
          })}

          {toonWerkelijk && <div className="rounded-lg border border-slate-200 p-2.5 space-y-1">
            <p className="text-xs font-semibold text-slate-700">Werkelijke heffingskorting {jaar} (optioneel)</p>
            <label className="flex items-center justify-between gap-3 text-xs text-slate-600">
              <span>Totaal volgens aanslag (€)</span>
              <input type="number" step="any" inputMode="decimal" value={overrides[jaar]?.werkelijkeHeffingskorting ?? ""}
                onChange={(e) => zetWerkelijk(e.target.value)} className="w-28 rounded border border-slate-300 px-2 py-1 text-right text-xs" />
            </label>
            {overrides[jaar]?.werkelijkeHeffingskorting != null && (
              <button type="button" onClick={() => zetWerkelijk("")} className="text-[11px] text-slate-500 underline hover:text-slate-700">Leegmaken (weer schatten)</button>
            )}
            <p className="text-[11px] text-slate-400">Vervangt de geschatte algemene heffingskorting + arbeidskorting voor dit jaar. Leeg = geschat.</p>
          </div>}
        </div>
      )}
    </div>
  );
}
