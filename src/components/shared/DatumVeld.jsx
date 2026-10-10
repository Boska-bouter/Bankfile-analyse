import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";

// Datumveld waar je een datum kunt TYPEN (dd-mm-jjjj, ook 8/10/2026, 8.10.26 of 08102026) én die je
// via het kalendertje kunt kiezen. Waarde in/uit is altijd ISO (jjjj-mm-dd), net als <input type="date">;
// onChange krijgt een event-achtig object { target: { value } } zodat bestaande handlers gewoon blijven werken.
const naarIso = (d, m, j) => {
  const jaar = j < 100 ? 2000 + j : j;
  const dt = new Date(Date.UTC(jaar, m - 1, d));
  if (dt.getUTCFullYear() !== jaar || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${String(jaar).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};
export function parseDatumTekst(tekst) {
  const t = String(tekst || "").trim();
  if (!t) return "";
  let m = t.match(/^(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{2}|\d{4})$/);
  if (m) return naarIso(Number(m[1]), Number(m[2]), Number(m[3]));
  m = t.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (m) return naarIso(Number(m[1]), Number(m[2]), Number(m[3]));
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return naarIso(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
}
const naarTekst = (iso) => {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

export default function DatumVeld({ value, onChange, className = "", style, type: _type, ...rest }) {
  const [tekst, setTekst] = useState(naarTekst(value));
  const [fout, setFout] = useState(false);
  useEffect(() => { setTekst(naarTekst(value)); setFout(false); }, [value]);
  const zend = (iso) => onChange?.({ target: { value: iso } });
  const commit = () => {
    const iso = parseDatumTekst(tekst);
    if (iso === null) { setFout(true); return; }
    setFout(false);
    if (iso !== (value || "")) zend(iso);
    else setTekst(naarTekst(iso));
  };
  return (
    <span className="relative block w-full">
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        placeholder="dd-mm-jjjj"
        value={tekst}
        onChange={(e) => { setTekst(e.target.value); const iso = parseDatumTekst(e.target.value); if (iso && /^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(e.target.value.trim())) { setFout(false); if (iso !== (value || "")) zend(iso); } }}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
        className={`${className} pr-9 ${fout ? "border-red-400" : ""}`}
        style={style}
        aria-invalid={fout || undefined}
      />
      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-500" title="Kies in de kalender">
        <Calendar className="h-5 w-5 pointer-events-none" />
        <input
          type="date"
          tabIndex={-1}
          aria-label="Kies datum in kalender"
          value={value || ""}
          onChange={(e) => { zend(e.target.value); }}
          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
        />
      </span>
      {fout && <span className="block text-xs text-red-600 mt-0.5">Geen geldige datum — typ bijv. 08-10-2026.</span>}
    </span>
  );
}
