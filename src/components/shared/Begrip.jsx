import { useEffect, useRef, useState } from "react";
import { BEGRIPPEN_RE, vindBegrip } from "../../content/begrippen.js";

// D3 — een vakbegrip met stippellijntje; hover/focus/klik toont een korte uitleg.
export function Begrip({ children, begrip }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const sluit = (e) => { if (e.type === "keydown" ? e.key === "Escape" : !ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", sluit); document.addEventListener("keydown", sluit);
    return () => { document.removeEventListener("mousedown", sluit); document.removeEventListener("keydown", sluit); };
  }, [open]);
  return (
    <span ref={ref} className="relative inline" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span
        role="button" tabIndex={0} data-begrip={begrip.id}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen((v) => !v); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); setOpen((v) => !v); } }}
        onFocus={() => setOpen(true)}
        className="cursor-help underline decoration-dotted decoration-slate-400 underline-offset-2"
      >{children}</span>
      {open && (
        <span role="tooltip" className="absolute left-0 top-full z-50 mt-1 block w-64 max-w-[80vw] rounded-lg border border-slate-200 bg-white p-2.5 text-left text-[11.5px] font-normal normal-case leading-snug tracking-normal text-slate-700 shadow-lg">
          <strong className="block text-slate-900">{begrip.term}</strong>{begrip.uitleg}
        </span>
      )}
    </span>
  );
}

// Zet vakbegrippen in een tekst om naar <Begrip>; andere tekst blijft ongewijzigd. Elk begrip max. 1x per tekst.
export function metBegrippen(tekst) {
  if (typeof tekst !== "string") return tekst;
  const delen = []; const gezien = new Set(); let last = 0; let m;
  BEGRIPPEN_RE.lastIndex = 0;
  while ((m = BEGRIPPEN_RE.exec(tekst))) {
    const b = vindBegrip(m[0]);
    if (!b || gezien.has(b.id)) continue;
    gezien.add(b.id);
    if (m.index > last) delen.push(tekst.slice(last, m.index));
    delen.push(<Begrip key={m.index} begrip={b}>{m[0]}</Begrip>);
    last = m.index + m[0].length;
  }
  if (delen.length === 0) return tekst;
  if (last < tekst.length) delen.push(tekst.slice(last));
  return delen;
}
