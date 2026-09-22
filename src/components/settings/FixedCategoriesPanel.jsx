import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MAIN_CATEGORY_ORDER, MAIN_CATEGORY_COLOR, INCOME_TRANSFER_CATEGORIES, subtypesForMainCategory } from "../../classification/categories.js";
import HelpHint from "../shared/HelpHint.jsx";

// Bepaalt welke categorieën als "vast" gelden (lopen door ongeacht omzet/activiteit — huur,
// verzekeringen, abonnementen e.d.) en welke als "variabel". Geldt voor zowel Zakelijk als Prive.
// Inkomsten en overboekingen tussen Zakelijk/Prive horen bij geen van beide. Gegroepeerd per
// hoofdcategorie — de instelling zelf blijft per subtype (zo kan bijv. "Autokosten" variabel zijn
// terwijl "Lease (operationeel)" binnen dezelfde hoofdcategorie "Vervoer & auto" vast is).
export default function FixedCategoriesPanel({ fixedCategories, setFixedCategories, onOpenHelp }) {
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState(null);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
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
            {MAIN_CATEGORY_ORDER.map((main) => {
              const subtypes = subtypesForMainCategory(main).filter((c) => !INCOME_TRANSFER_CATEGORIES.includes(c));
              if (subtypes.length === 0) return null;
              const isOpen = openGroup === main;
              const vastCount = subtypes.filter((c) => fixedCategories.includes(c)).length;
              return (
                <div key={main} className="rounded-md border border-slate-100">
                  <button onClick={() => setOpenGroup((v) => (v === main ? null : main))} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs">
                    <span className={`rounded px-2 py-0.5 font-medium truncate ${MAIN_CATEGORY_COLOR[main] || "bg-slate-200 text-slate-700"}`}>
                      {main} <span className="opacity-60">({vastCount}/{subtypes.length} vast)</span>
                    </span>
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-3 pb-3">
                      {subtypes.map((c) => (
                        <label key={c} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={fixedCategories.includes(c)}
                            onChange={(e) => setFixedCategories((prev) => (e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)))}
                          />
                          {c}
                        </label>
                      ))}
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
