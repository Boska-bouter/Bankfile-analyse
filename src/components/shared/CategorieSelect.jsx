import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { keuzeGroepen, keuzeWaarde } from "../../classification/categories.js";

// release30V6 — één keuzelijst voor een categorie, gegroepeerd per hoofdcategorie met direct alle soorten.
// value = opgeslagen (fijne) categorie; onChange krijgt de gekozen opgeslagen categorie. Kies je bij
// "Privé kosten algemeen" opnieuw dezelfde groep, dan blijft de huidige soort staan (geen wijziging).
// beide-V15R4 — met zoekveld (wens Boska 4-11): typ een paar letters en de lijst toont alleen de categorieën (of groepen) waarin
// die letters voorkomen. Enter kiest de eerste, Esc sluit. Niet sluiten bij resize: het iPad-toetsenbord verandert de hoogte. Een gewone <select> kan op de iPad niet zoeken, daarom een eigen lijst.
const zonderAccent = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function CategorieSelect({ value, onChange, className = "", placeholder = null }) {
  const [open, setOpen] = useState(false);
  const [zoek, setZoek] = useState("");
  const [plek, setPlek] = useState(null);
  const knopRef = useRef(null);
  const lijstRef = useRef(null);
  const zoekRef = useRef(null);

  const { groepen, huidig } = useMemo(() => {
    let groepen = keuzeGroepen(value || null);
    let huidig = value ? keuzeWaarde(value) : "";
    // release30V8 — valt de huidige categorie onder een groep zonder eigen soorten (bijv. "Overboekingen aan
    // personen" onder "Privé kosten algemeen"), toon dan die categorie zelf, zodat je ziet wat er nu staat.
    if (value && huidig !== value) {
      const verborgen = huidig;
      groepen = groepen.map((g) => {
        const i = g.opties.findIndex((o) => o.value === verborgen);
        if (i < 0) return g;
        const opties = [...g.opties];
        opties.splice(i + 1, 0, { value, label: `${opties[i].label} – ${value}` });
        return { ...g, opties };
      });
      huidig = value;
    }
    return { groepen, huidig };
  }, [value]);

  const huidigLabel = useMemo(() => {
    for (const g of groepen) for (const o of g.opties) if (o.value === huidig) return o.label;
    return huidig || "";
  }, [groepen, huidig]);

  const gefilterd = useMemo(() => {
    const z = zonderAccent(zoek.trim());
    if (!z) return groepen;
    return groepen
      .map((g) => (zonderAccent(g.groep).includes(z) ? g : { ...g, opties: g.opties.filter((o) => zonderAccent(o.label).includes(z) || zonderAccent(o.value).includes(z)) }))
      .filter((g) => g.opties.length > 0);
  }, [groepen, zoek]);

  const kies = (v) => {
    setOpen(false);
    setZoek("");
    if (!v || v === huidig) return;
    onChange(v);
  };

  const openen = () => {
    const r = knopRef.current?.getBoundingClientRect();
    if (r) {
      const breedte = Math.min(352, window.innerWidth - 16);
      const links = Math.max(8, Math.min(r.left, window.innerWidth - breedte - 8));
      const onder = window.innerHeight - r.bottom;
      const boven = onder < 280 && r.top > onder;
      const hoogte = Math.max(200, Math.min(440, (boven ? r.top : onder) - 16));
      setPlek({ links, breedte, hoogte, ...(boven ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
    }
    setZoek("");
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => zoekRef.current?.focus(), 0);
    const buiten = (e) => {
      if (lijstRef.current?.contains(e.target) || knopRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", buiten);
    document.addEventListener("touchstart", buiten);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("touchstart", buiten);
    };
  }, [open]);

  const eerste = gefilterd[0]?.opties[0]?.value;

  return (
    <>
      <button
        type="button"
        ref={knopRef}
        onClick={() => (open ? setOpen(false) : openen())}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1 text-left ${className}`}
      >
        <span className={`flex-1 truncate ${huidigLabel ? "" : "text-slate-400"}`}>{huidigLabel || placeholder || "kies categorie…"}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>
      {open && plek && createPortal(
        <div
          ref={lijstRef}
          className="fixed z-[200] flex flex-col rounded-xl border border-slate-200 bg-white shadow-xl text-sm"
          style={{ left: plek.links, width: plek.breedte, maxHeight: plek.hoogte, top: plek.top, bottom: plek.bottom }}
        >
          <div className="p-2 border-b border-slate-100">
            <input
              ref={zoekRef}
              type="search"
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
                if (e.key === "Enter") { e.preventDefault(); if (eerste) kies(eerste); }
              }}
              placeholder="Zoek categorie, bijv. sport"
              aria-label="Zoek categorie"
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
              autoComplete="off"
            />
          </div>
          <div role="listbox" className="overflow-y-auto py-1">
            {gefilterd.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">Geen categorie gevonden.</p>}
            {gefilterd.map((g) => (
              <div key={g.groep}>
                <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.groep}</div>
                {g.opties.map((o) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === huidig}
                    key={o.value}
                    onClick={() => kies(o.value)}
                    className={`block w-full px-3 py-1.5 text-left hover:bg-slate-50 ${o.value === huidig ? "font-semibold text-teal-800 bg-teal-50" : "text-slate-700"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
