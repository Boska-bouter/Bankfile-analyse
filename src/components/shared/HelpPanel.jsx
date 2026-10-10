import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { isValidElement } from "react";
import { HELP_CHAPTERS, HELP_GROEPEN } from "../../content/helpChapters.jsx";

const INTRO_CONTENT = (
  <ol className="space-y-2.5 list-none">
    <li className="flex gap-2.5">
      <span className="text-slate-400 shrink-0">1.</span>
      Start een nieuw dossier: het stappenplan stelt eerst een paar vragen (rekening, rechtsvorm, BTW, auto, lease, urencriterium, startersaftrek) en laadt dan je bankbestanden (CSV, Excel, MT940 of CAMT.053). De app deelt transacties automatisch in Zakelijk/Prive en in categorieën in.
    </li>
    <li className="flex gap-2.5">
      <span className="text-slate-400 shrink-0">2.</span>
      Klopt een indeling niet? Pas 'm aan in de detailtabel of bij Controleren — dat onthoudt de app voortaan voor dezelfde tegenpartij, in alle jaren.
    </li>
    <li className="flex gap-2.5">
      <span className="text-slate-400 shrink-0">3.</span>
      De route onder de kop (Import → Controleren → Bedrijfsmiddelen → Instellingen → Advies) en de kaart "Eerstvolgende stap" laten zien wat je nu moet doen. De kaart "Dossiercontrole" toont hoeveel open punten er nog zijn.
    </li>
    <li className="flex gap-2.5">
      <span className="text-slate-400 shrink-0">4.</span>
      Per jaar vind je onder "Details en overzichten" het jaaroverzicht, de BTW-kwartalen en (bij meerdere jaren) het meerjarenoverzicht. Links bij Acties maak je de indicatieve aangifteberekening, de samenvatting voor de klant en de onderbouwing.
    </li>
    <li className="flex gap-2.5">
      <span className="text-slate-400 shrink-0">5.</span>
      Je bankgegevens worden lokaal in deze browser verwerkt en automatisch bewaard — ze gaan niet naar een server. Gebruik "Dossier opslaan" om ook een back-upbestand te downloaden, eventueel met wachtwoord (en een herstelcode). Zie "Dossier opslaan en nieuw dossier starten" hieronder.
    </li>
  </ol>
);

// V73 — platte tekst uit een React-element halen, zodat je in de Help op inhoud kunt zoeken.
const tekstVan = (node) => {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(tekstVan).join(" ");
  if (isValidElement(node)) return tekstVan(node.props?.children);
  return "";
};

// Alle uitgebreide toelichtingsteksten, gebundeld in inklapbare hoofdstukken — inclusief de
// introductie als eerste hoofdstuk. Bij de losse plekken in de app staat een klein "?"-icoontje
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

  const [zoek, setZoek] = useState("");
  const allChapters = [{ key: "intro", groep: "beginnen", titel: "Welkom — zo werkt deze app", inhoud: INTRO_CONTENT }, ...HELP_CHAPTERS];
  const zoekTerm = zoek.trim().toLowerCase();
  const doorzoekbaar = useMemo(() => allChapters.map((c) => ({ c, tekst: `${c.titel} ${tekstVan(c.inhoud)}`.toLowerCase() })), []);
  const zichtbareHoofdstukken = zoekTerm ? doorzoekbaar.filter((d) => d.tekst.includes(zoekTerm)).map((d) => d.c) : allChapters;

  // Was een gewone (niet-zwevende) <section>, gerenderd als vaste sibling ná de hoofdinhoud van elk
  // tabblad — daardoor verscheen dit paneel gewoon inline in de pagina-flow op de plek waar dat in de
  // JSX staat (onderaan Overzicht, dat veel langer is dan Controleren/Instellingen), i.p.v. als
  // pop-up zoals de losse "?"-uitleg (HelpPopupModal.jsx) dat wel al deed. Nu dezelfde
  // overlay-wrapper (fixed/gecentreerd/backdrop) als die pop-up, zodat dit overal hetzelfde en
  // consistent als modaal venster verschijnt, ongeacht welk tabblad actief is.
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 rounded-t-xl">
          <h2 className="text-sm font-semibold text-slate-800">Help en uitleg</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-2.5 border-b border-slate-200 shrink-0">
          <input
            type="search"
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoek in de uitleg (bijv. lease, BTW, dossiercontrole)…"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Zoek in de uitleg"
          />
        </div>
        <div className="divide-y divide-slate-100 overflow-y-auto">
          {zoekTerm && zichtbareHoofdstukken.length === 0 && (
            <p className="px-5 py-6 text-xs text-slate-400 text-center">Geen hoofdstuk gevonden voor "{zoek}".</p>
          )}
          {HELP_GROEPEN.map((groep) => {
            const lijst = zichtbareHoofdstukken.filter((c) => c.groep === groep.key);
            if (lijst.length === 0) return null;
            return (
              <div key={groep.key}>
                <h3 className="px-5 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-teal-700 bg-slate-50/60">{groep.titel}</h3>
                <div className="mb-2" style={{ marginLeft: 20, marginRight: 12, borderLeft: "2px solid #ccfbf1" }}>
                {lijst.map((chapter) => (
                  <div key={chapter.key}>
                    <button
                      onClick={() => toggle(chapter.key)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <span>{chapter.titel}</span>
                      {openKeys.has(chapter.key) || zoekTerm ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    </button>
                    {(openKeys.has(chapter.key) || zoekTerm) && <div className="px-3 pb-4 text-xs text-slate-500 max-w-3xl">{chapter.inhoud}</div>}
                  </div>
                ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
