import { useMemo, useState } from "react";
import { useToonFijn } from "../../utils/useToonFijn.js";
import { X, Search } from "lucide-react";
import { MAIN_CATEGORY_COLOR, CATEGORY_COLOR, subtypesForMainCategory, displayCategory, CATEGORIE_GROEPEN, ZAK_GROEPEN, PRIVE_KEUZE } from "../../classification/categories.js";

// Puur een opzoekvenster: "waar hoort dit onder" — geen bewerkmogelijkheden hier (dat blijft
// Categorieregels), alleen een snel, doorzoekbaar overzicht van de volledige structuur.
// Vaste, logische volgorde (niet alfabetisch): eerst alles wat zakelijk is, dan privé, dan de rest.
const SECTIES = [
  { titel: "Zakelijk", mains: ["Zakelijke inkomsten", "Inkoop & zakelijke uitgaven", "Vervoer & auto", "Huisvesting", "Telecom & abonnementen", "Apparatuur & inventaris", "Personeel", "Financiering", "Belastingen & heffingen", "Interne overboekingen"] },
  { titel: "Privé", mains: ["Privé", "Persoonlijk & vertrouwelijk"] },
  { titel: "Overig", mains: ["Nog te beoordelen"] },
];
// Alleen bij een BV in gebruik; bij een eenmanszaak/zzp tonen we ze niet.
const ALLEEN_BV = new Set(["DGA-salaris", "Dividenduitkering", "Rekening-courant DGA", "Kapitaalstorting", "Vergoeding/huur aan holding"]);

export default function CategoryOverviewModal({ onClose, rechtsvorm }) {
  const [query, setQuery] = useState("");
  const toonFijn = useToonFijn();

  const secties = useMemo(() => {
    const q = query.trim().toLowerCase();
    const isBv = rechtsvorm === "bv";
    const fijn = (main) => {
      const alle = subtypesForMainCategory(main).filter((c) => isBv || !ALLEEN_BV.has(c));
      if (main === "Privé") {
        // Volgorde van de privé-keuzelijst: opnames en teruggeboekt eerst.
        const keuze = PRIVE_KEUZE.map((k) => (isBv || !ALLEEN_BV.has(k) ? k : null)).filter(Boolean);
        return [...new Set([...keuze, ...alle.map(displayCategory)])];
      }
      const volgorde = (ZAK_GROEPEN[main] || []).map((l) => l.key).filter((k) => alle.includes(k));
      const rest = alle.filter((c) => !volgorde.includes(c));
      return [...volgorde, ...rest];
    };
    const leden = (d) => (CATEGORIE_GROEPEN[d] || []).map((l) => l.key.toLowerCase()).join(" ");
    return SECTIES.map((sec) => ({
      titel: sec.titel,
      groups: sec.mains.map((main) => {
        const subtypes = fijn(main);
        const mainMatches = !q || main.toLowerCase().includes(q);
        const zichtbaar = mainMatches ? subtypes : subtypes.filter((x) => x.toLowerCase().includes(q) || leden(x).includes(q));
        return { main, subtypes: zichtbaar };
      }).filter((g) => g.subtypes.length > 0),
    })).filter((sec) => sec.groups.length > 0);
  }, [query, toonFijn, rechtsvorm]);
  const geenResultaat = secties.length === 0;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-slate-800">Categorieën &amp; subtypes — waar hoort dit onder?</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pt-3 shrink-0">
          <div className="flex items-center rounded-lg border border-slate-300 bg-white">
            <Search className="h-3.5 w-3.5 text-slate-400 ml-2.5 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoeken op categorie of subtype…"
              className="w-full min-w-0 rounded-lg border-0 px-2 py-1.5 text-sm focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="shrink-0 pr-2.5 pl-1 text-slate-400 hover:text-slate-700">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {geenResultaat && <p className="text-sm text-slate-400 text-center py-6">Niets gevonden voor "{query}".</p>}
          {secties.map((sec) => (
            <div key={sec.titel} className="space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">{sec.titel}</div>
              {sec.groups.map(({ main, subtypes }) => (
                <div key={main}>
                  <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${MAIN_CATEGORY_COLOR[main] || "bg-slate-200 text-slate-700"}`}>
                    {main}
                  </span>
                  {subtypes.filter((x) => x !== main).length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {subtypes.filter((x) => x !== main).map((x) => (
                        <span key={x} className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium ${CATEGORY_COLOR[x] || "bg-slate-100 text-slate-600"}`}>
                          {x}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="px-5 py-2.5 border-t border-slate-200 shrink-0">
          <p className="text-[11px] text-slate-400">
            Alleen ter oriëntatie — trefwoorden en indeling zelf aanpassen kan bij "Categorieregels".
          </p>
        </div>
      </div>
    </div>
  );
}
