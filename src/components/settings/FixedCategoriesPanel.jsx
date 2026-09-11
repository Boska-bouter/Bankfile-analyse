import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CATEGORY_ORDER, INCOME_TRANSFER_CATEGORIES } from "../../classification/categories.js";
import HelpHint from "../shared/HelpHint.jsx";

// Bepaalt welke categorieën als "vast" gelden (lopen door ongeacht omzet/activiteit — huur,
// verzekeringen, abonnementen e.d.) en welke als "variabel". Geldt voor zowel Zakelijk als Prive.
// Inkomsten en overboekingen tussen Zakelijk/Prive horen bij geen van beide.
export default function FixedCategoriesPanel({ fixedCategories, setFixedCategories, onOpenHelp }) {
  const [open, setOpen] = useState(false);
  const categories = CATEGORY_ORDER.filter((c) => !INCOME_TRANSFER_CATEGORIES.includes(c));

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
            Bepaalt welke categorieën als <strong>vast</strong> gelden en welke als <strong>variabel</strong> — terug te
            zien in het jaaroverzicht (bij "Toon vast/variabel").{" "}
            {onOpenHelp && <HelpHint chapter="vaste-variabele-kosten" onOpen={onOpenHelp} />}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {categories.map((c) => (
              <label key={c} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={fixedCategories.includes(c)}
                  onChange={(e) =>
                    setFixedCategories((prev) => (e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)))
                  }
                />
                {c}
              </label>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
