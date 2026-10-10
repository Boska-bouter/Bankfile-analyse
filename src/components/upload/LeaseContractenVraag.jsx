import { useState } from "react";

// Indeling van de in de nieuw-dossier-wizard opgegeven leasenamen in CONTRACTEN.
// `contracten` is null (nog niet beantwoord) of een lijst van groepen namen: één groep = één contract.
// Verschillende namen in één groep zijn hetzelfde contract (bijv. leasemaatschappij én incassonaam);
// dezelfde naam in twee groepen zijn twee contracten bij dezelfde maatschappij (bedrijfsbus + privéauto).

export function contractenVan(namen, contracten) {
  if (Array.isArray(contracten)) return contracten.filter((g) => g.length > 0);
  if (namen.length >= 2) return null; // eerst beantwoorden: bij elkaar of los?
  return namen.map((n) => [n]);
}

// Houdt de indeling in lijn met de namenlijst na toevoegen/verwijderen van een naam.
export function syncContracten(contracten, nieuweNamen) {
  if (!Array.isArray(contracten)) return null;
  const lower = new Set(nieuweNamen.map((n) => n.toLowerCase()));
  const groepen = contracten.map((g) => g.filter((n) => lower.has(n.toLowerCase()))).filter((g) => g.length > 0);
  const gebruikt = new Set(groepen.flat().map((n) => n.toLowerCase()));
  for (const n of nieuweNamen) if (!gebruikt.has(n.toLowerCase())) groepen.push([n]);
  return groepen;
}

const KNOP = "rounded-lg border px-2.5 py-1.5 text-xs font-medium";

export default function LeaseContractenVraag({ namen, contracten, onChange, soortTekst = "lease" }) {
  const [extraOpen, setExtraOpen] = useState(false);
  const [extraNaam, setExtraNaam] = useState("");
  const [extraNieuw, setExtraNieuw] = useState("");
  if (namen.length === 0) return null;

  const beslist = Array.isArray(contracten);
  const groepen = beslist ? contracten : [];
  const verplaats = (naam, vanIdx, naarIdx) => {
    const g = groepen.map((x) => [...x]);
    g[vanIdx] = g[vanIdx].filter((n) => n !== naam);
    if (naarIdx === "nieuw") g.push([naam]); else g[Number(naarIdx)].push(naam);
    onChange(g.filter((x) => x.length > 0));
  };
  const voegContractToe = () => {
    const naam = extraNaam === "__nieuw__" ? extraNieuw.trim() : extraNaam;
    if (!naam) return;
    const basis = beslist ? groepen : namen.map((n) => [n]);
    onChange([...basis, [naam]]);
    setExtraOpen(false); setExtraNaam(""); setExtraNieuw("");
  };

  return (
    <div className="space-y-2">
      {!beslist && namen.length >= 2 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-900">
            Er zijn {namen.length} verschillende namen. Horen die bij <strong>hetzelfde {soortTekst}contract</strong>, of zijn het <strong>losse contracten</strong>?
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onChange([[...namen]])} className={`${KNOP} border-teal-700 bg-teal-700 text-white`}>Eén contract (zelfde lease)</button>
            <button type="button" onClick={() => onChange(namen.map((n) => [n]))} className={`${KNOP} border-slate-300 bg-white text-slate-700`}>Losse contracten</button>
          </div>
          <p className="text-xs text-amber-800">Bijvoorbeeld: de leasemaatschappij en de naam van de incasso zijn één contract; een bedrijfsbus en een privéauto zijn twee.</p>
        </div>
      )}

      {beslist && (groepen.length > 1 || namen.length > 1) && (
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <p className="text-xs font-medium text-slate-700">Contracten: {groepen.length}</p>
          {groepen.map((g, gi) => (
            <div key={gi} className="rounded-lg bg-slate-50 px-3 py-2 text-xs space-y-1">
              <p className="font-semibold text-slate-600">Contract {gi + 1}</p>
              {g.map((n) => (
                <div key={n} className="flex items-center justify-between gap-2">
                  <span className="truncate">{n}</span>
                  {(groepen.length > 1 || g.length > 1) && (
                    <select value="" onChange={(e) => e.target.value && verplaats(n, gi, e.target.value)} className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-600">
                      <option value="">Verplaats naar…</option>
                      {groepen.map((_, j) => j !== gi && <option key={j} value={j}>Contract {j + 1}</option>)}
                      {g.length > 1 && <option value="nieuw">Eigen contract</option>}
                    </select>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div>
        {!extraOpen ? (
          <button type="button" onClick={() => setExtraOpen(true)} className={`${KNOP} border-teal-700 text-teal-800 bg-white hover:bg-teal-50`}>
            + Contract toevoegen
          </button>
        ) : (
          <div className="rounded-lg border border-slate-200 p-3 space-y-2">
            <p className="text-xs font-medium text-slate-700">Extra contract — bij welke leasemaatschappij?</p>
            <select value={extraNaam} onChange={(e) => setExtraNaam(e.target.value)} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs max-w-full">
              <option value="">Kies…</option>
              {namen.map((n) => <option key={n} value={n}>{n}</option>)}
              <option value="__nieuw__">Andere leasemaatschappij…</option>
            </select>
            {extraNaam === "__nieuw__" && (
              <input value={extraNieuw} onChange={(e) => setExtraNieuw(e.target.value)} placeholder="Naam leasemaatschappij" className="block rounded border border-slate-300 px-2 py-1 text-xs w-64 max-w-full" />
            )}
            <div className="flex gap-2">
              <button type="button" disabled={!extraNaam || (extraNaam === "__nieuw__" && extraNieuw.trim().length < 2)} onClick={voegContractToe} className={`${KNOP} border-teal-700 bg-teal-700 text-white disabled:opacity-40`}>Toevoegen</button>
              <button type="button" onClick={() => setExtraOpen(false)} className={`${KNOP} border-slate-300 bg-white text-slate-600`}>Annuleren</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
