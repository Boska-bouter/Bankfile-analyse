// beide-V1R7 (fase 4) — de wizard van een privédossier. De vragen komen uit het profiel (modus/prive/wizard.js);
// dit scherm doet alleen de volgorde, de concept-antwoorden en het opslaan. Zakelijke vragen (rechtsvorm, KOR,
// auto, lease, activa, voorraad, startersaftrek) bestaan hier niet.
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Check, FileSpreadsheet, X } from "lucide-react";
import PriveVraag from "./PriveVraag.jsx";
import { KNOP_PRIMAIR_GROOT } from "../ui/stijl.js";

const BESTANDEN = "bestanden";
const OPSLAAN = "opslaan";

export default function PriveWizardModal({
  wizard, antwoorden, setAntwoorden, eigenNamen, setEigenNamen,
  years = [], loadedFileNames = [], eenvoudig = false, volledig = false, alleenVragen = null,
  loadFilesFirst = false, onPickFiles, onKoppelen = null, importBezig = false, importFout = null,
  onSaveProject, onClose,
}) {
  const a = antwoorden || {};
  const ctx = { eigenNamen, jaren: years, bestanden: loadedFileNames };
  // Bij het openen vastgelegd: welke vragen deze keer gesteld worden. Volledig (nieuw dossier of "Basisvragen")
  // = alle vragen, ingevuld met wat er al is; anders alleen wat nog open staat.
  const [teStellen] = useState(() => {
    const keys = new Set();
    for (const s of wizard.stappen) for (const v of s.vragen) {
      if (eenvoudig && v.uitgebreid) continue;
      if (Array.isArray(alleenVragen) && !alleenVragen.includes(v.key)) continue;
      if (volledig || Array.isArray(alleenVragen) || !wizard.isBeantwoord(v, a, ctx)) keys.add(v.key);
    }
    return keys;
  });
  const [concept, setConcept] = useState({});
  const [klaar, setKlaar] = useState([]);
  const waardeVan = (v) => (v.key in concept ? concept[v.key] : v.type === "naam" ? eigenNamen?.[v.veld] ?? "" : a[v.key]);
  const huidigeAntwoorden = { ...a, ...Object.fromEntries(Object.entries(concept)) };

  const vragenVan = (s) => s.vragen.filter((v) => teStellen.has(v.key) && wizard.vraagRelevant(v, huidigeAntwoorden, ctx, { eenvoudig }));
  const stappen = [
    ...(loadFilesFirst && !Array.isArray(alleenVragen) ? [{ id: BESTANDEN, titel: "Bankbestanden laden" }] : []),
    ...wizard.stappen.filter((s) => vragenVan(s).length > 0 || klaar.includes(s.id)),
    { id: OPSLAAN, titel: "Dossier opslaan" },
  ];
  const open = stappen.filter((s) => !klaar.includes(s.id));
  const huidig = open[0];

  useEffect(() => { if (!huidig) onClose(); }, [huidig]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!huidig) return null;

  const vragen = huidig.vragen ? vragenVan(huidig) : [];
  const ingevuld = (v) => v.optioneel || wizard.isBeantwoord(v, huidigeAntwoorden, { ...ctx, eigenNamen: { ...(eigenNamen || {}), ...namenUitConcept() } });
  function namenUitConcept() {
    const n = {};
    for (const s of wizard.stappen) for (const v of s.vragen) if (v.type === "naam" && v.key in concept) n[v.veld] = String(concept[v.key] || "").trim() || null;
    return n;
  }
  const kanDoor = vragen.every(ingevuld);

  const volgende = () => setKlaar((k) => [...k, huidig.id]);
  const terug = () => setKlaar((k) => k.slice(0, -1));
  const bewaarEnDoor = () => {
    const patch = {};
    let namen = null;
    for (const v of vragen) {
      if (!(v.key in concept)) continue;
      if (v.type === "naam") namen = { ...(namen || eigenNamen || { ondernemer: null, partner: null }), [v.veld]: String(concept[v.key] || "").trim() || null };
      else patch[v.key] = concept[v.key];
    }
    // Geen partner meer: de partnernaam ook weg, anders telt een overboeking naar die naam als eigen rekening.
    if (patch.partner === "nee" && eigenNamen?.partner) namen = { ...(namen || eigenNamen), partner: null };
    if (vragen.some((v) => v.type === "naam") && !namen && eigenNamen === null) namen = { ondernemer: null, partner: null };
    if (Object.keys(patch).length) setAntwoorden((p) => ({ ...(p || {}), ...patch }));
    if (namen) setEigenNamen(namen);
    volgende();
  };

  const nr = stappen.findIndex((s) => s.id === huidig.id) + 1;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" style={{ paddingBottom: "calc(7.5rem + env(safe-area-inset-bottom, 0px))" }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col" style={{ maxHeight: "calc(100dvh - 10.5rem - env(safe-area-inset-bottom, 0px))" }}>
        <div className="relative px-5 py-3 border-b border-slate-200 bg-teal-700 text-white shrink-0">
          <button type="button" onClick={onClose} title="Afbreken — al gegeven antwoorden blijven bewaard"
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-teal-50 hover:bg-white/15">
            <X className="h-4 w-4" /> Afbreken
          </button>
          <p className="text-xs text-slate-300">Stap {nr} van {stappen.length}</p>
          <h2 className="text-sm font-semibold mt-0.5">{huidig.titel}</h2>
          <div className="mt-2 flex gap-1" aria-hidden="true">
            {stappen.map((s) => (
              <span key={s.id} title={s.titel} className={`h-1.5 flex-1 rounded-full ${s.id === huidig.id ? "bg-white" : klaar.includes(s.id) ? "bg-white/70" : "bg-white/20"}`} />
            ))}
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {huidig.id === BESTANDEN && (
            <>
              <p className="text-sm font-medium text-slate-800">Wil je al bankbestand(en) toevoegen?</p>
              <p className="text-sm text-slate-600">Afschriften van je eigen rekeningen (en die van je partner), per jaar of over meerdere jaren. Je kunt ze ook later laden.</p>
              {importBezig && <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">Bestanden worden ingelezen…</p>}
              {!importBezig && importFout && <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900 whitespace-pre-line">{importFout}</p>}
              <button type="button" disabled={importBezig} onClick={() => onPickFiles?.()}
                className="w-full disabled:opacity-50 inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800">
                <FileSpreadsheet className="h-4 w-4" /> {loadedFileNames.length > 0 ? "Nog een bestand kiezen" : "Ja, bestanden kiezen"}
              </button>
              {onKoppelen && (
                <button type="button" disabled={importBezig} onClick={onKoppelen}
                  className="w-full disabled:opacity-50 rounded-lg border border-teal-700 px-4 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">
                  Of rechtstreeks koppelen met de bank (proef)
                </button>
              )}
              {loadedFileNames.length === 0 ? (
                <button type="button" onClick={volgende} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Nee, ik laad ze later — eerst de vragen
                </button>
              ) : (
                <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {loadedFileNames.map((n) => <li key={n} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /><span className="truncate">{n}</span></li>)}
                </ul>
              )}
              <p className="text-xs text-slate-500"><strong>Privacy:</strong> bankgegevens worden lokaal in je browser verwerkt en niet naar een externe server gestuurd voor analyse.</p>
            </>
          )}
          {vragen.map((v) => (
            <PriveVraag key={v.key} vraag={v} waarde={waardeVan(v)} jaren={years} bestanden={loadedFileNames}
              onChange={(w) => setConcept((c) => ({ ...c, [v.key]: w }))} />
          ))}
          {huidig.vragen && (
            <button type="button" disabled={!kanDoor} onClick={bewaarEnDoor} className={KNOP_PRIMAIR_GROOT}>Doorgaan</button>
          )}
          {huidig.id === OPSLAAN && (
            <>
              <p className="text-sm text-slate-700 font-medium">Niet vergeten: sla je dossier op, anders gaan je aanpassingen verloren.</p>
              <p className="text-sm text-slate-600">Je antwoorden en correcties worden automatisch bewaard in déze browser op dit apparaat. Ze gaan verloren als je de browsergegevens wist.</p>
              <p className="text-sm text-slate-600">Een <strong>dossier opslaan</strong> maakt een apart bestand, los van de browser: veilig bij een nieuw apparaat of om te bewaren. Sla na elke sessie op.</p>
              {onSaveProject && (
                <button onClick={onSaveProject} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Dossier nu opslaan</button>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {klaar.length > 0 && (
              <button onClick={terug} className="inline-flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-600"><ChevronLeft className="h-3.5 w-3.5" /> Terug</button>
            )}
            {huidig.vragen && <button onClick={volgende} className="text-xs text-slate-400 hover:text-slate-600">Later invullen</button>}
          </div>
          {(huidig.id === OPSLAAN || (huidig.id === BESTANDEN && loadedFileNames.length > 0)) && (
            <button onClick={volgende} className={KNOP_PRIMAIR_GROOT}>{open.length === 1 ? "Klaar" : "Doorgaan"} <ChevronRight className="h-3.5 w-3.5" /></button>
          )}
        </div>
      </div>
    </div>
  );
}
