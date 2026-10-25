import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { INCOME_TRANSFER_CATEGORIES, subtypesForMainCategory, groepeerPerWeergave, CATEGORY_COLOR, hoofdcategorieen, hoofdKleur, getCategorieProfiel, categorieLabel } from "../../classification/categories.js";
import HelpHint from "../shared/HelpHint.jsx";

// Bepaalt welke categorieën als "vast" gelden (lopen door ongeacht omzet/activiteit — huur,
// verzekeringen, abonnementen e.d.) en welke als "variabel". Geldt voor zowel Zakelijk als Prive.
// Inkomsten en overboekingen tussen Zakelijk/Prive horen bij geen van beide. Gegroepeerd per
// hoofdcategorie — de instelling zelf blijft per subtype (zo kan bijv. "Autokosten" variabel zijn
// terwijl "Lease (operationeel)" binnen dezelfde hoofdcategorie "Vervoer & auto" vast is).
// beide-V5R7 — de link "Kiezen wat vaste lasten zijn" op de privékaart Vaste lasten opent dit
// paneel meteen (in plaats van alleen naar Instellingen te gaan). Het verzoek blijft staan tot het
// paneel gemount is, want de kaart Automatisering wordt pas na de tabwissel uitgeklapt.
let openVerzocht = false;
const OPEN_EVENT = "bankoverzicht:vaste-lasten-openen";
export function openVasteLastenPaneel() {
  openVerzocht = true;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_EVENT));
}

export default function FixedCategoriesPanel({ fixedCategories, setFixedCategories, onOpenHelp }) {
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);
  const sectieRef = useRef(null);

  useEffect(() => {
    const openen = () => {
      if (!openVerzocht) return;
      openVerzocht = false;
      setOpen(true);
      window.setTimeout(() => sectieRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 350);
    };
    openen();
    window.addEventListener(OPEN_EVENT, openen);
    return () => window.removeEventListener(OPEN_EVENT, openen);
  }, []);

  return (
    <section ref={sectieRef} className="rounded-paneel border border-slate-200 bg-white shadow-sm scroll-mt-28">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-5 text-sm font-semibold text-left">
        <span>Vaste/variabele kosten</span>
        <span className="text-xs font-normal text-slate-400">({fixedCategories.length} vast)</span>
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-xs text-slate-500 mb-3">
            Bepaalt welke subtypes als <strong>vast</strong> gelden en welke als <strong>variabel</strong> — terug te
            zien in het jaaroverzicht (bij "Toon vast/variabel"). Gegroepeerd per hoofdcategorie.{" "}
            {onOpenHelp && <HelpHint chapter="vaste-variabele-kosten" onOpen={onOpenHelp} />}
          </p>
          <div className="space-y-1.5">
            {hoofdcategorieen().map((main) => {
              // beide-V1R6 — in een privédossier zijn inkomen en overboekingen geen vaste/variabele last.
              const cp = getCategorieProfiel();
              const subtypes = subtypesForMainCategory(main).filter((c) => (cp ? cp.soortVan(c) === "uitgave" : !INCOME_TRANSFER_CATEGORIES.includes(c)));
              if (subtypes.length === 0) return null;
              const isOpen = openGroup === main;
              const vastCount = subtypes.filter((c) => fixedCategories.includes(c)).length;
              return (
                <div key={main} className="rounded-lg border border-slate-100">
                  <button onClick={() => setOpenGroup((v) => (v === main ? null : main))} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs">
                    <span className={`rounded-md px-2 py-0.5 font-medium truncate ${hoofdKleur(main)}`}>
                      {main} <span className="opacity-60">({vastCount}/{subtypes.length} vast)</span>
                    </span>
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-1.5 px-3 pb-3">
                      {groepeerPerWeergave(subtypes).map((blok) => {
                        const checkbox = (c, label) => (
                          <label key={c} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                            <input
                              type="checkbox"
                              checked={fixedCategories.includes(c)}
                              onChange={(e) => setFixedCategories((prev) => (e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)))}
                            />
                            {label ?? categorieLabel(c)}
                          </label>
                        );
                        if (!blok.groep) return <div key={blok.naam}>{checkbox(blok.leden[0])}</div>;
                        const vast = blok.leden.filter((c) => fixedCategories.includes(c)).length;
                        return (
                          <details key={blok.naam} className="rounded-md border border-slate-100 px-2 py-1">
                            <summary className="cursor-pointer text-xs font-medium text-slate-700">
                              {blok.naam} <span className="font-normal text-slate-400">({vast}/{blok.leden.length} vast)</span>
                            </summary>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1.5 pb-1">{blok.leden.map((c) => checkbox(c))}</div>
                          </details>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
