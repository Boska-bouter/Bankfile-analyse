import { useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { HELP_CHAPTERS } from "../../content/helpChapters.jsx";

const INTRO_CONTENT = (
  <ol className="space-y-2.5 list-none">
    <li className="flex gap-2.5">
      <span className="text-slate-400 shrink-0">1.</span>
      Upload je bank-bestand(en) hieronder (CSV, Excel, MT940 of CAMT.053). De tool splitst transacties automatisch in Zakelijk en Prive, en deelt ze in categorieën in.
    </li>
    <li className="flex gap-2.5">
      <span className="text-slate-400 shrink-0">2.</span>
      Klopt een indeling niet? Pas 'm aan in de detailtabel — dat onthoudt de tool voortaan voor dezelfde tegenpartij, in alle jaren.
    </li>
    <li className="flex gap-2.5">
      <span className="text-slate-400 shrink-0">3.</span>
      Bovenaan verschijnt "Werk te doen" zodra er iets openstaat — klik erop om er direct naartoe te springen.
    </li>
    <li className="flex gap-2.5">
      <span className="text-slate-400 shrink-0">4.</span>
      Onder elk jaar vind je de aangifte-checklist, het BTW-kwartaaloverzicht, het aangiftevoorstel, en (bij meerdere jaren) een meerjarenoverzicht.
    </li>
    <li className="flex gap-2.5">
      <span className="text-slate-400 shrink-0">5.</span>
      Alles wordt automatisch bewaard in deze browser — gebruik "Project opslaan" om ook een back-upbestand te downloaden.
    </li>
  </ol>
);

// Alle uitgebreide toelichtingsteksten, gebundeld in inklapbare hoofdstukken — inclusief de
// introductie als eerste hoofdstuk. Bij de losse plekken in de tool staat een klein "?"-icoontje
// (HelpHint) dat direct naar het juiste hoofdstuk hier springt.
export default function HelpPanel({ onClose, openChapter }) {
  const [openKeys, setOpenKeys] = useState(() => new Set(["intro", ...(openChapter ? [openChapter] : [])]));
  const toggle = (key) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allChapters = [{ key: "intro", titel: "Welkom — zo werkt deze tool", inhoud: INTRO_CONTENT }, ...HELP_CHAPTERS];

  // Was een gewone (niet-zwevende) <section>, gerenderd als vaste sibling ná de hoofdinhoud van elk
  // tabblad — daardoor verscheen dit paneel gewoon inline in de pagina-flow op de plek waar dat in de
  // JSX staat (onderaan Overzicht, dat veel langer is dan Controleren/Instellingen), i.p.v. als
  // pop-up zoals de losse "?"-uitleg (HelpPopupModal.jsx) dat wel al deed. Nu dezelfde
  // overlay-wrapper (fixed/gecentreerd/backdrop) als die pop-up, zodat dit overal hetzelfde en
  // consistent als modaal venster verschijnt, ongeacht welk tabblad actief is.
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 rounded-t-xl">
          <h2 className="text-sm font-semibold text-slate-800">Help en uitleg</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="divide-y divide-slate-100 overflow-y-auto">
          {allChapters.map((chapter) => (
            <div key={chapter.key}>
              <button
                onClick={() => toggle(chapter.key)}
                className="w-full flex items-center justify-between gap-2 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 text-left"
              >
                <span>{chapter.titel}</span>
                {openKeys.has(chapter.key) ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              </button>
              {openKeys.has(chapter.key) && <div className="px-5 pb-4 text-xs text-slate-500 max-w-3xl">{chapter.inhoud}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
