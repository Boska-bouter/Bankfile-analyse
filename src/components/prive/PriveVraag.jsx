// beide-V1R7 (fase 4) — tekent één vraag uit modus/prive/wizard.js, per type. Geen kennis van de vraag zelf:
// alles (tekst, opties, velden) komt uit de gegevens.
const KNOP = "rounded-lg px-3 py-1.5 text-xs font-medium border";
const UIT = "border-slate-300 text-slate-600 hover:bg-slate-50";
const AAN = "bg-teal-700 text-white border-teal-700";
const INVOER = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600";

// "12.345,67" of "12345.67" → getal; leeg → undefined.
export function leesBedrag(tekst) {
  const t = String(tekst ?? "").trim().replace(/[€\s]/g, "");
  if (!t) return undefined;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : undefined;
}

function Bedrag({ waarde, onChange, label }) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      {label && <span className="w-24 shrink-0">{label}</span>}
      <input
        inputMode="decimal"
        defaultValue={waarde ?? ""}
        onChange={(e) => onChange(leesBedrag(e.target.value))}
        placeholder="€"
        className={`${INVOER} max-w-[10rem] text-right`}
      />
    </label>
  );
}

const zonderLeeg = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && !(v && typeof v === "object" && Object.keys(v).length === 0)));

export default function PriveVraag({ vraag, waarde, onChange, jaren = [], bestanden = [] }) {
  const v = vraag;
  let invoer = null;
  if (v.type === "keuze") {
    invoer = (
      <div className="flex flex-wrap gap-2">
        {v.opties.map((o) => (
          <button key={o.waarde} type="button" onClick={() => onChange(o.waarde)} className={`${KNOP} ${waarde === o.waarde ? AAN : UIT}`}>{o.label}</button>
        ))}
      </div>
    );
  } else if (v.type === "meerkeuze") {
    const lijst = Array.isArray(waarde) ? waarde : [];
    const wissel = (w) => onChange(lijst.includes(w) ? lijst.filter((x) => x !== w) : [...lijst, w]);
    invoer = (
      <div className="flex flex-wrap gap-2">
        {v.opties.map((o) => (
          <button key={o.waarde} type="button" aria-pressed={lijst.includes(o.waarde)} onClick={() => wissel(o.waarde)} className={`${KNOP} ${lijst.includes(o.waarde) ? AAN : UIT}`}>{o.label}</button>
        ))}
      </div>
    );
  } else if (v.type === "naam") {
    invoer = <input value={waarde ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={v.placeholder || ""} className={INVOER} />;
  } else if (v.type === "jaartal") {
    invoer = (
      <input inputMode="numeric" value={waarde ?? ""} placeholder="Bijv. 2015" className={`${INVOER} max-w-[8rem]`}
        onChange={(e) => { const n = parseInt(e.target.value, 10); onChange(Number.isFinite(n) ? n : undefined); }} />
    );
  } else if (v.type === "bedragPerJaar") {
    const per = waarde && typeof waarde === "object" ? waarde : {};
    invoer = (
      <div className="space-y-1.5">
        {jaren.map((j) => <Bedrag key={j} label={String(j)} waarde={per[j]} onChange={(n) => onChange(zonderLeeg({ ...per, [j]: n }))} />)}
      </div>
    );
  } else if (v.type === "bedragenPerJaar") {
    const per = waarde && typeof waarde === "object" ? waarde : {};
    invoer = (
      <div className="space-y-2">
        {jaren.map((j) => (
          <div key={j} className="rounded-md border border-slate-100 p-2 space-y-1">
            <p className="text-xs font-semibold text-slate-700">1 januari {j}</p>
            {v.velden.map((f) => (
              <Bedrag key={f.key} label={f.label} waarde={per[j]?.[f.key]}
                onChange={(n) => onChange(zonderLeeg({ ...per, [j]: zonderLeeg({ ...(per[j] || {}), [f.key]: n }) }))} />
            ))}
          </div>
        ))}
      </div>
    );
  } else if (v.type === "perBestand") {
    const per = waarde && typeof waarde === "object" ? waarde : {};
    invoer = (
      <div className="space-y-2">
        {bestanden.map((b) => (
          <div key={b} className="space-y-1">
            <p className="text-xs text-slate-600 truncate">{b}</p>
            <div className="flex flex-wrap gap-1.5">
              {v.opties.map((o) => (
                <button key={o.waarde} type="button" onClick={() => onChange({ ...per, [b]: o.waarde })} className={`${KNOP} ${per[b] === o.waarde ? AAN : UIT}`}>{o.label}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-slate-200 p-3 space-y-2">
      <p className="text-sm font-medium text-slate-700">{v.vraag}{v.optioneel && <span className="font-normal text-slate-400"> (optioneel)</span>}</p>
      {v.uitleg && <p className="text-xs text-slate-400">{v.uitleg}</p>}
      {invoer}
    </div>
  );
}
