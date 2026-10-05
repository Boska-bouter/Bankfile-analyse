import { useState, useEffect } from "react";
import { Building2, Home, FileSpreadsheet, ChevronRight, ChevronLeft, Check, AlertCircle, X } from "lucide-react";
import { eur } from "../../utils/amounts.js";

// V65 — de wizard is herindeeld van 17 losse vragen naar 7 schermen. Elk scherm bundelt vragen die bij
// elkaar horen; de antwoorden worden met één "Doorgaan" vastgelegd via exact dezelfde setters als voorheen.
//   20 Bankbestanden laden            (alleen bij een leeg dossier)
//   31 Rekeningen en rekeninghouder   (rekeningtype per bestand, eigen naam, rechtsvorm, holding)
//   32 Andere rekeningen              (niet geladen rekeningen + spaarrekeningen)
//   33 Klanten en leveranciers
//   34 Auto, lease en lening          (auto, leaseauto, overige lease, lening, voorraad)
//   35 Aangiftevragen                 (AOV, KOR, BTW-verlegd + tarief, urencriterium)
//   36 Fiscale jaren                  (startersaftrek, BTW-kwartalen)
//    4 Dossier opslaan
const STEP_LABELS = {
  20: "Bankbestanden laden",
  31: "Rekeningen en rekeninghouder",
  32: "Andere rekeningen",
  33: "Klanten en leveranciers",
  34: "Auto, lease en lening",
  35: "Verzekering en BTW",
  36: "Fiscale jaren",
  4: "Dossier opslaan",
};

const KNOP = "rounded-lg px-3 py-1.5 text-xs font-medium border";
const KNOP_UIT = "border-slate-300 text-slate-600 hover:bg-slate-50";
const KNOP_AAN = "bg-teal-700 text-white border-teal-700";
const PRIMAIR = "rounded-lg px-4 py-2 text-sm font-medium bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40 disabled:hover:bg-teal-700";

export default function SetupWizardModal({
  forceRechtsvormStep = false,
  alreadyEstablished = false,
  pendingFileNames, onAccountTypeChoose,
  loadFilesFirst = false, loadedFileNames = [], onPickFiles,
  korRegeling, setKorRegeling,
  rechtsvorm, setRechtsvorm,
  heeftHolding, setHeeftHolding,
  btwVerlegd, setBtwVerlegd,
  onSetIncomeBtwRateChoice,
  quartersToAsk, kwartaalStatus, setKwartaalStatusField,
  fileContinuity = [],
  onSaveProject,
  verwachteLease, setVerwachteLease,
  verwachteLeaseOverig, setVerwachteLeaseOverig,
  verwachteLening, setVerwachteLening,
  verwachteAOV, setVerwachteAOV,
  autoWizardStatus, setAutoWizardStatus,
  years, onSeedAutoStatus,
  zelfstandigenaftrekStatus, onSeedZelfstandigenaftrekStatus, onSeedZelfstandigenaftrekMap,
  startersaftrekStatus, onSeedStartersaftrekStatus,
  heeftVoorraad, setHeeftVoorraad,
  eigenNamen, setEigenNamen,
  eigenRekeningenExtra, setEigenRekeningenExtra,
  zakelijkeSpaarRekening, setZakelijkeSpaarRekening,
  opdrachtgeversGevraagd, onAddBusinessKeywords, onAddBusinessExpenseKeywords,
  suggesties = {},
  onClose,
}) {
  // Concept-antwoorden per scherm (blijven bewaard bij "Terug").
  const [typedNow, setTypedNow] = useState({});
  const zet = (patch) => setTypedNow((p) => ({ ...p, ...patch }));

  // Alle bestanden waarvan in DEZE wizard het rekeningtype is (of wordt) gevraagd, ook nadat ze zijn
  // beantwoord — zodat "Terug" een gemaakte keuze nog laat corrigeren.
  const [sessionFiles, setSessionFiles] = useState(() => [...pendingFileNames]);
  useEffect(() => {
    setSessionFiles((prev) => {
      const add = pendingFileNames.filter((f) => !prev.includes(f));
      return add.length ? [...prev, ...add] : prev;
    });
  }, [pendingFileNames.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bij het openen bevroren: welke vragen zijn nog onbeantwoord (null) en dus relevant. Een antwoord
  // mag dit later niet veranderen (de wizard verdween anders onder je handen). Alleen toekomstige
  // schermen worden live gefilterd (BV, KOR) — zie remainingSteps.
  const [needs] = useState(() => {
    const vol = !(alreadyEstablished && !forceRechtsvormStep);
    return {
      naam: vol && eigenNamen === null,
      rechtsvorm: vol && (rechtsvorm === null || forceRechtsvormStep),
      holding: vol && heeftHolding === null,
      andere: vol && (eigenRekeningenExtra === null || forceRechtsvormStep),
      spaar: vol && zakelijkeSpaarRekening === null,
      klanten: vol && opdrachtgeversGevraagd === null,
      auto: vol && autoWizardStatus === null,
      lease: vol && verwachteLease === null,
      leaseOverig: vol && verwachteLeaseOverig === null,
      lening: vol && verwachteLening === null,
      voorraad: vol && heeftVoorraad === null,
      aov: vol && verwachteAOV === null,
      uren: vol && Object.keys(zelfstandigenaftrekStatus || {}).length === 0,
      starters: vol && Object.keys(startersaftrekStatus || {}).length === 0,
      kor: vol && korRegeling === null,
      verlegd: vol && korRegeling !== true && btwVerlegd === null,
      kwartalen: vol && korRegeling !== true && quartersToAsk.length > 0,
    };
  });
  // De kwartalenlijst wordt bij het openen vastgezet: een aangevinkt kwartaal verdwijnt anders direct
  // uit `quartersToAsk` (het heeft dan al een status) en de rij springt weg terwijl je nog aan het klikken bent.
  const [kwartalenLijst] = useState(() => [...quartersToAsk]);

  const [initialSteps] = useState(() => {
    const list = [];
    const vol = !(alreadyEstablished && !forceRechtsvormStep);
    if (vol && loadFilesFirst) list.push(20);
    // Scherm 31: rekeningtype per bestand (alleen als er bestanden zijn), naam, rechtsvorm, holding.
    if (pendingFileNames.length > 0 || loadFilesFirst || needs.naam || needs.rechtsvorm || needs.holding) list.push(31);
    if (needs.andere || needs.spaar) list.push(32);
    if (needs.klanten) list.push(33);
    if (needs.auto || needs.lease || needs.leaseOverig || needs.lening || needs.voorraad) list.push(34);
    if (needs.aov || needs.kor || needs.verlegd || needs.uren) list.push(35);
    if (needs.starters || needs.kwartalen) list.push(36);
    list.push(4); // altijd als laatste: herinnering om het dossier op te slaan
    return list;
  });
  const [doneIds, setDoneIds] = useState(() => new Set());
  const [showStepList, setShowStepList] = useState(false);
  const [history, setHistory] = useState([]);

  const isBV = rechtsvorm === "bv";
  const remainingSteps = initialSteps.filter((id) => {
    // Scherm 31 komt terug zolang er een ongetypeerd bestand is (bijv. na "Terug" naar 20 nog een bestand geladen).
    if (doneIds.has(id) && !(id === 31 && pendingFileNames.length > 0)) return false;
    if (id === 31 && sessionFiles.length === 0 && !needs.naam && !needs.rechtsvorm && !needs.holding) return false;
    // Scherm 35 heeft niets te vragen als alleen KOR/verlegd/uren openstaan en het een BV is.
    if (id === 35 && !(needs.aov || (!isBV && (needs.kor || needs.verlegd || needs.uren)))) return false;
    // Scherm 36: startersaftrek niet bij een BV; kwartalen niet bij KOR.
    if (id === 36 && !((needs.starters && !isBV) || (needs.kwartalen && korRegeling !== true && kwartalenLijst.length > 0))) return false;
    return true;
  });

  useEffect(() => {
    if (remainingSteps.length === 0) onClose();
  }, [remainingSteps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (remainingSteps.length === 0) return null;
  const currentStepId = remainingSteps[0];
  const isLastStep = remainingSteps.length === 1;

  const goNext = () => {
    setHistory((prev) => [...prev, currentStepId]);
    setDoneIds((prev) => new Set([...prev, currentStepId]));
  };
  const goBack = () => {
    if (history.length === 0) return;
    const vorige = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setDoneIds((prev) => { const next = new Set(prev); next.delete(vorige); return next; });
  };

  const allTypedNow = sessionFiles.every((f) => typedNow[f]);
  const props = {
    typedNow, zet, needs, isBV, goNext, years: years || [],
    sessionFiles, fileContinuity, onAccountTypeChoose, allTypedNow, pendingFileNames,
    rechtsvorm, setRechtsvorm, heeftHolding, setHeeftHolding, korRegeling, setKorRegeling, btwVerlegd, setBtwVerlegd,
    eigenNamen, setEigenNamen,
    eigenRekeningenExtra, setEigenRekeningenExtra, zakelijkeSpaarRekening, setZakelijkeSpaarRekening,
    onAddBusinessKeywords, onAddBusinessExpenseKeywords, suggesties,
    autoWizardStatus, setAutoWizardStatus, onSeedAutoStatus,
    setVerwachteLease, setVerwachteLeaseOverig, setVerwachteLening, setHeeftVoorraad, setVerwachteAOV,
    onSetIncomeBtwRateChoice, onSeedZelfstandigenaftrekStatus, onSeedZelfstandigenaftrekMap, zelfstandigenaftrekStatus,
    onSeedStartersaftrekStatus, kwartalenLijst, kwartaalStatus, setKwartaalStatusField,
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[88vh] flex flex-col">
        <div className="relative px-5 py-3 border-b border-slate-200 bg-teal-700 text-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-teal-50 hover:bg-white/15"
            title="Afbreken — al gegeven antwoorden blijven bewaard"
          >
            <X className="h-4 w-4" /> Afbreken
          </button>
          <p className="text-xs text-slate-300">Scherm {initialSteps.indexOf(currentStepId) + 1} van {initialSteps.length}</p>
          <h2 className="text-sm font-semibold mt-0.5">{STEP_LABELS[currentStepId]}</h2>
          <div className="mt-2 h-1 rounded-full bg-white/20 overflow-hidden" aria-hidden="true">
            <div className="h-full bg-white/80" style={{ width: `${Math.round((doneIds.size / Math.max(initialSteps.length, 1)) * 100)}%` }} />
          </div>
          <button type="button" onClick={() => setShowStepList((v) => !v)} className="mt-1.5 text-[11px] text-teal-100 hover:text-white underline decoration-dotted">
            {showStepList ? "Overzicht verbergen" : `Alle schermen (${Math.max(initialSteps.length - doneIds.size, 0)} nog open)`}
          </button>
          {showStepList && (
            <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
              {initialSteps.map((id) => (
                <li key={id} className={`flex items-center gap-1 truncate ${id === currentStepId ? "font-semibold text-white" : doneIds.has(id) ? "text-teal-100" : "text-teal-200/70"}`}>
                  {doneIds.has(id) ? <Check className="h-3 w-3 shrink-0" /> : <span className="inline-block h-3 w-3 shrink-0 text-center leading-3">{id === currentStepId ? "›" : "·"}</span>}
                  <span className="truncate">{STEP_LABELS[id]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {currentStepId === 20 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Laad de afschriften van een Nederlandse bank, zakelijk en privé, per jaar of over meerdere jaren.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["CSV", "XLS / XLSX", "MT940 (.sta / .940)", "CAMT.053 (.xml)"].map((f) => (
                  <span key={f} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{f}</span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onPickFiles && onPickFiles()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800"
              >
                <FileSpreadsheet className="h-4 w-4" /> {loadedFileNames.length > 0 ? "Nog een bestand kiezen" : "Bestanden kiezen"}
              </button>
              {loadedFileNames.length > 0 && (
                <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {loadedFileNames.map((n) => (
                    <li key={n} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> <span className="truncate">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-slate-400">
                Tip: laad zowel de zakelijke als de privérekening, anders kan de tool overboekingen tussen je rekeningen niet controleren.
              </p>
            </div>
          )}
          {currentStepId === 31 && <Scherm31 {...props} />}
          {currentStepId === 32 && <Scherm32 {...props} />}
          {currentStepId === 33 && <Scherm33 {...props} />}
          {currentStepId === 34 && <Scherm34 {...props} />}
          {currentStepId === 35 && <Scherm35 {...props} />}
          {currentStepId === 36 && <Scherm36 {...props} />}
          {currentStepId === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-700 font-medium">
                Niet vergeten: sla je dossier op, anders gaan je correcties en aanpassingen verloren.
              </p>
              <p className="text-sm text-slate-600">
                Je instellingen en correcties worden automatisch bewaard in déze browser op dit apparaat. Ze gaan verloren als je de browsergegevens of websitegegevens wist (in veel browsers is dat dezelfde knop als de surfgeschiedenis).
              </p>
              <p className="text-sm text-slate-600">
                Een <strong>dossier opslaan</strong> maakt een apart bestand, los van de browser: veilig bij een cache-wis, een nieuw apparaat of delen met je boekhouder. Sla na elke sessie op.
              </p>
              {onSaveProject && (
                <button
                  onClick={onSaveProject}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Dossier nu opslaan
                </button>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button onClick={goBack} className="inline-flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-600">
                <ChevronLeft className="h-3.5 w-3.5" /> Terug
              </button>
            )}
            {currentStepId !== 4 ? (
              <button
                onClick={() => {
                  if (currentStepId === 33 && opdrachtgeversGevraagd === null) {
                    onAddBusinessKeywords ? onAddBusinessKeywords([]) : null;
                  }
                  goNext();
                }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                {currentStepId === 20 ? "Later bestanden laden" : "Later invullen"}
              </button>
            ) : (
              <span />
            )}
          </div>
          {/* Schermen 31 t/m 36 hebben een eigen "Doorgaan"-knop die de antwoorden eerst vastlegt;
              een tweede, niets-opslaande knop hier zou dat stilletjes negeren. */}
          {(currentStepId === 4 || (currentStepId === 20 && loadedFileNames.length > 0)) && (
            <button
              onClick={goNext}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              {isLastStep ? "Klaar" : "Doorgaan"} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Hulpcomponenten
// ---------------------------------------------------------------------------------------------

function Sectie({ titel, children, uitleg }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 space-y-2">
      <p className="text-sm font-medium text-slate-700">{titel}</p>
      {uitleg && <p className="text-xs text-slate-400">{uitleg}</p>}
      {children}
    </div>
  );
}

// Ja/Nee-keuze (+ optioneel extra opties) met uitklapbare inhoud bij "Ja".
function JaNee({ value, onChange, opties, children }) {
  const lijst = opties || [{ k: true, l: "Ja" }, { k: false, l: "Nee" }];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {lijst.map((o) => (
          <button key={String(o.k)} type="button" onClick={() => onChange(o.k)} className={`${KNOP} ${value === o.k ? KNOP_AAN : KNOP_UIT}`}>
            {o.l}
          </button>
        ))}
      </div>
      {value === true && children}
    </div>
  );
}

// Lijst met namen (typen of uit suggesties kiezen).
function NaamLijst({ lijst, onChange, placeholder, max, suggesties = [] }) {
  const [huidig, setHuidig] = useState("");
  const vol = max != null && lijst.length >= max;
  const voeg = (naam) => {
    const n = (naam || "").trim();
    if (!n || vol || lijst.some((x) => x.toLowerCase() === n.toLowerCase())) return;
    onChange([...lijst, n]);
  };
  const open = suggesties.filter((s) => !lijst.some((x) => x.toLowerCase() === s.naam.toLowerCase()));
  return (
    <div className="space-y-2">
      {lijst.length > 0 && (
        <ul className="space-y-1">
          {lijst.map((naam, i) => (
            <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
              <span className="truncate">{naam}</span>
              <button type="button" onClick={() => onChange(lijst.filter((_, j) => j !== i))} className="shrink-0 text-xs text-slate-400 hover:text-slate-700">Verwijderen</button>
            </li>
          ))}
        </ul>
      )}
      {!vol && (
        <div className="flex gap-2">
          <input
            type="text"
            value={huidig}
            onChange={(e) => setHuidig(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); voeg(huidig); setHuidig(""); } }}
            onBlur={() => { if (huidig.trim()) { voeg(huidig); setHuidig(""); } }}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => { voeg(huidig); setHuidig(""); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap">
            + Toevoegen
          </button>
        </div>
      )}
      {open.length > 0 && !vol && (
        <div className="space-y-1">
          <p className="text-[11px] text-slate-400">Gevonden in je bankdata — klik om toe te voegen:</p>
          <div className="flex flex-wrap gap-1.5">
            {open.map((s) => (
              <button key={s.naam} type="button" onClick={() => voeg(s.naam)} className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] text-teal-800 hover:bg-teal-100">
                + {s.naam} <span className="text-teal-600">({s.count}×)</span>
              </button>
            ))}
            {open.length > 1 && (
              <button type="button" onClick={() => onChange([...lijst, ...open.map((s) => s.naam)].slice(0, max ?? 99))} className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-50">
                Alles overnemen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Zet bij "Ja" automatisch de gevonden suggesties in een nog lege lijst.
function jaMetSuggesties(huidigeLijst, suggestieLijst, max) {
  if (huidigeLijst && huidigeLijst.length > 0) return huidigeLijst;
  return (suggestieLijst || []).slice(0, max ?? 3).map((s) => s.naam);
}

// ---------------------------------------------------------------------------------------------
// Scherm 31 — rekeningen en rekeninghouder
// ---------------------------------------------------------------------------------------------
function Scherm31({
  typedNow, zet, needs, goNext, sessionFiles, fileContinuity, onAccountTypeChoose, allTypedNow,
  rechtsvorm, setRechtsvorm, heeftHolding, setHeeftHolding, setKorRegeling, setBtwVerlegd, eigenNamen, setEigenNamen,
}) {
  const toonRechtsvorm = needs.rechtsvorm;
  const toonHolding = needs.holding && rechtsvorm === "bv";
  const klaar =
    (sessionFiles.length === 0 || allTypedNow) &&
    (!toonRechtsvorm || rechtsvorm != null) &&
    (!toonHolding || heeftHolding != null);
  const naamO = typedNow.eigenNaamOndernemer ?? eigenNamen?.ondernemer ?? "";
  const naamP = typedNow.eigenNaamPartner ?? eigenNamen?.partner ?? "";
  return (
    <div className="space-y-4">
      {sessionFiles.length > 0 && (
        <Sectie titel="Is dit een zakelijke rekening of een privérekening?">
          {sessionFiles.map((fileName) => {
            const continuityMatch = fileContinuity.find((c) => c.fileA === fileName || c.fileB === fileName);
            return (
              <div key={fileName} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="flex-1 min-w-[8rem] text-sm font-medium truncate">{fileName}</span>
                  <button
                    type="button"
                    onClick={() => { onAccountTypeChoose(fileName, "Zakelijk"); zet({ [fileName]: "Zakelijk" }); }}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${typedNow[fileName] === "Zakelijk" ? "border-emerald-400 bg-emerald-100 text-emerald-800" : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                  >
                    <Building2 className="h-3.5 w-3.5" /> Zakelijk
                  </button>
                  <button
                    type="button"
                    onClick={() => { onAccountTypeChoose(fileName, "Prive"); zet({ [fileName]: "Prive" }); }}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${typedNow[fileName] === "Prive" ? "border-slate-400 bg-slate-200 text-slate-800" : "border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                  >
                    <Home className="h-3.5 w-3.5" /> Privé
                  </button>
                </div>
                {typedNow[fileName] && continuityMatch && (
                  <div className={`flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-xs ${continuityMatch.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                    {continuityMatch.ok ? <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                    <span>
                      {continuityMatch.fileA === fileName ? (
                        <>Dit bestand loopt door in <strong>{continuityMatch.fileB}</strong> — eindsaldo hier {eur(continuityMatch.aLastBalance)}, beginsaldo daar {eur(continuityMatch.bOpeningBalance)}.</>
                      ) : (
                        <>Dit lijkt een vervolg op <strong>{continuityMatch.fileA}</strong> — eindsaldo daar {eur(continuityMatch.aLastBalance)}, beginsaldo hier {eur(continuityMatch.bOpeningBalance)}.</>
                      )}
                      {!continuityMatch.ok && ` Verschil ${eur(continuityMatch.diff)} — kan een periodegrens zijn, of de moeite waard om na te gaan.${Math.abs(continuityMatch.diff) < 100 ? " Een verschil van een paar euro is meestal gewoon afronding." : ""}`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </Sectie>
      )}

      {needs.naam && (
        <Sectie titel="Eigen naam (en die van je fiscaal partner)" uitleg="Zo herkent de tool overboekingen naar/van jezelf als privé. Optioneel.">
          <input
            type="text"
            value={naamO}
            onChange={(e) => zet({ eigenNaamOndernemer: e.target.value })}
            placeholder="Naam rekeninghouder"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={naamP}
            onChange={(e) => zet({ eigenNaamPartner: e.target.value })}
            placeholder="Naam fiscaal partner (optioneel)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </Sectie>
      )}

      {toonRechtsvorm && (
        <Sectie titel="Onderneem je als eenmanszaak/zzp of vanuit een BV?" uitleg="Bepaalt de berekening: IB en Zvw (eenmanszaak) of Vpb (BV). Later aanpasbaar.">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                // Terug van BV naar zzp: KOR/BTW-verlegd stonden bij BV stilzwijgend op "nee" — dat is geen
                // echt antwoord voor de zzp-situatie, dus die gelden weer als onbeantwoord.
                if (rechtsvorm === "bv") { setKorRegeling(null); setBtwVerlegd(null); }
                setRechtsvorm("zzp");
              }}
              className={`${KNOP} ${rechtsvorm === "zzp" ? KNOP_AAN : KNOP_UIT}`}
            >
              Eenmanszaak/zzp
            </button>
            <button
              type="button"
              onClick={() => {
                setRechtsvorm("bv");
                // Een BV kent geen KOR en geen BTW-verlegd-regeling: ook de waarden zelf op "false".
                setKorRegeling(false);
                setBtwVerlegd(false);
              }}
              className={`${KNOP} ${rechtsvorm === "bv" ? KNOP_AAN : KNOP_UIT}`}
            >
              BV
            </button>
          </div>
          {toonHolding && (
            <div className="pt-2 space-y-1.5">
              <p className="text-xs text-slate-600">Staat er een holding boven deze BV?</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setHeeftHolding(true)} className={`${KNOP} ${heeftHolding === true ? KNOP_AAN : KNOP_UIT}`}>Ja, holding + werkmaatschappij</button>
                <button type="button" onClick={() => setHeeftHolding(false)} className={`${KNOP} ${heeftHolding === false ? KNOP_AAN : KNOP_UIT}`}>Nee, alleen deze BV</button>
              </div>
            </div>
          )}
        </Sectie>
      )}

      <button
        type="button"
        disabled={!klaar}
        onClick={() => {
          if (needs.naam) {
            setEigenNamen({ ondernemer: naamO.trim() || null, partner: naamP.trim() || null });
          }
          goNext();
        }}
        className={PRIMAIR}
      >
        Doorgaan
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Scherm 32 — andere rekeningen (niet geladen) + spaarrekeningen
// ---------------------------------------------------------------------------------------------
const REKENING_SOORTEN = [
  { k: "Zakelijk", spaar: false, l: "Zakelijke rekening" },
  { k: "Prive", spaar: false, l: "Privérekening" },
  { k: "Zakelijk", spaar: true, l: "Zakelijke spaarrekening" },
  { k: "Prive", spaar: true, l: "Privé-spaarrekening" },
];
const soortLabel = (r) => REKENING_SOORTEN.find((s) => s.k === r.accountType && !!s.spaar === !!r.soort)?.l || (r.accountType === "Zakelijk" ? "Zakelijk" : "Privé");

function Scherm32({ typedNow, zet, needs, goNext, eigenRekeningenExtra, setEigenRekeningenExtra, zakelijkeSpaarRekening, setZakelijkeSpaarRekening }) {
  const lijst = typedNow.eigenRekeningenLijst ?? eigenRekeningenExtra ?? [];
  const spaarGekoppeld = typedNow.spaarGekoppeld ?? (zakelijkeSpaarRekening?.status === "ja" ? true : null);
  const spaarNaam = typedNow.zakelijkeSpaarNaam ?? zakelijkeSpaarRekening?.naam ?? "";
  const maakEntry = () => {
    if (!typedNow.eigenRekeningIban?.trim() && typedNow.eigenRekeningSoort == null) return null;
    const s = REKENING_SOORTEN[typedNow.eigenRekeningSoort ?? 1];
    return { iban: typedNow.eigenRekeningIban?.trim() || null, accountType: s.k, ...(s.spaar ? { soort: "spaar" } : {}) };
  };
  return (
    <div className="space-y-4">
      {needs.andere && (
        <Sectie
          titel="Andere eigen rekeningen die je niet laadt?"
          uitleg="Met het rekeningnummer herkent de tool overboekingen daarheen als eigen geld (privé-opname of interne overboeking). Ook spaarrekeningen die je niet laadt kun je hier opgeven."
        >
          {lijst.length > 0 && (
            <ul className="space-y-1">
              {lijst.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                  <span className="truncate">{r.iban || "(geen rekeningnummer)"} — {soortLabel(r)}</span>
                  <button type="button" onClick={() => zet({ eigenRekeningenLijst: lijst.filter((_, j) => j !== i) })} className="shrink-0 text-xs text-slate-400 hover:text-slate-700">Verwijderen</button>
                </li>
              ))}
            </ul>
          )}
          <input
            type="text"
            value={typedNow.eigenRekeningIban ?? ""}
            onChange={(e) => zet({ eigenRekeningIban: e.target.value })}
            placeholder="Rekeningnummer (IBAN)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {REKENING_SOORTEN.map((s, idx) => (
              <button key={s.l} type="button" onClick={() => zet({ eigenRekeningSoort: idx })} className={`${KNOP} ${typedNow.eigenRekeningSoort === idx ? KNOP_AAN : KNOP_UIT}`}>{s.l}</button>
            ))}
            <button
              type="button"
              onClick={() => {
                const e = maakEntry();
                if (!e) return;
                zet({ eigenRekeningenLijst: [...lijst, e], eigenRekeningIban: "", eigenRekeningSoort: null });
              }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              + Toevoegen
            </button>
          </div>
          <p className="text-[11px] text-slate-400">Meerdere rekeningen? Klik na elke rekening op <strong>"+ Toevoegen"</strong>.</p>
        </Sectie>
      )}

      {needs.spaar && (
        <Sectie
          titel="Zakelijke spaarrekening gekoppeld aan je zakelijke rekening?"
          uitleg="Meestal een pakketkeuze bij dezelfde bank: die overboekingen staan dan gewoon tussen de transacties van je zakelijke rekening."
        >
          <JaNee value={spaarGekoppeld === null ? null : spaarGekoppeld} onChange={(v) => zet({ spaarGekoppeld: v })}>
            <input
              type="text"
              value={spaarNaam}
              onChange={(e) => zet({ zakelijkeSpaarNaam: e.target.value })}
              placeholder="Naam zoals in je bankexport (bijv. Zakelijke Oranje Spaarrekening) — optioneel"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </JaNee>
        </Sectie>
      )}

      <p className="text-xs text-slate-400">Niet verplicht — je kunt dit ook later nog invullen of aanvullen.</p>
      <button
        type="button"
        onClick={() => {
          if (needs.andere) {
            let l = lijst;
            const e = maakEntry();
            if (e) l = [...lijst, e];
            setEigenRekeningenExtra(l);
          }
          if (needs.spaar) {
            setZakelijkeSpaarRekening(spaarGekoppeld === true ? { status: "ja", naam: spaarNaam.trim() || null } : { status: "nee", naam: null });
          }
          goNext();
        }}
        className={PRIMAIR}
      >
        Doorgaan
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Scherm 33 — klanten en leveranciers
// ---------------------------------------------------------------------------------------------
function Scherm33({ typedNow, zet, goNext, onAddBusinessKeywords, onAddBusinessExpenseKeywords, suggesties }) {
  const klanten = typedNow.opdrachtgeversLijst || [];
  const lev = typedNow.leveranciersLijst || [];
  return (
    <div className="space-y-4">
      <Sectie
        titel="Grootste of vaste opdrachtgevers (max. 5)"
        uitleg="Zo herkent de tool binnenkomende betalingen van deze klanten meteen als omzet, in plaats van dat je dat achteraf per klant moet bevestigen."
      >
        <NaamLijst lijst={klanten} onChange={(l) => zet({ opdrachtgeversLijst: l })} placeholder="Naam opdrachtgever" max={5} suggesties={suggesties.opdrachtgevers || []} />
      </Sectie>
      <Sectie titel="Grootste of vaste leveranciers (max. 5, optioneel)" uitleg="Zelfde idee, maar dan voor vaste zakelijke uitgaven.">
        <NaamLijst lijst={lev} onChange={(l) => zet({ leveranciersLijst: l })} placeholder="Naam leverancier" max={5} suggesties={suggesties.leveranciers || []} />
      </Sectie>
      <p className="text-xs text-slate-400">Niet verplicht — je kunt dit ook later nog aanvullen.</p>
      <button
        type="button"
        onClick={() => {
          onAddBusinessKeywords(klanten);
          onAddBusinessExpenseKeywords(lev);
          goNext();
        }}
        className={PRIMAIR}
      >
        Doorgaan
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Scherm 34 — auto, lease en lening
// ---------------------------------------------------------------------------------------------
function Scherm34({
  typedNow, zet, needs, goNext, years,
  autoWizardStatus, setAutoWizardStatus, onSeedAutoStatus,
  setVerwachteLease, setVerwachteLeaseOverig, setVerwachteLening, setHeeftVoorraad, suggesties,
}) {
  const t = typedNow;
  const autoKeuze = t.autoKeuze ?? null;
  // Is er per definitie geen auto van de zaak (nee / privéauto)? Dan vervalt de leaseauto-vraag.
  const autoNu = autoKeuze ?? autoWizardStatus?.status ?? null;
  const geenZaakAuto = autoNu === "geen" || autoNu === "prive";
  const toonLeaseAuto = needs.lease && !geenZaakAuto;
  const toonAuto = needs.auto;
  const leaseAutoJa = t.leaseAutoJa ?? null;
  const klaar =
    (!toonAuto || (autoKeuze != null && (autoKeuze !== "zaak" || t.autoSoort))) &&
    (!toonLeaseAuto || leaseAutoJa != null) &&
    (!needs.leaseOverig || t.leaseOverigJa != null) &&
    (!needs.lening || t.leningJa != null) &&
    (!needs.voorraad || t.voorraadJa != null);
  const alleNee = () => {
    const patch = {};
    if (toonLeaseAuto) { patch.leaseAutoJa = false; patch.leaseLijst = []; }
    if (needs.leaseOverig) { patch.leaseOverigJa = false; patch.leaseOverigLijst = []; }
    if (needs.lening) { patch.leningJa = false; patch.leningLijst = []; }
    if (needs.voorraad) patch.voorraadJa = false;
    if (toonAuto) { patch.autoKeuze = "geen"; patch.autoSoort = null; }
    zet(patch);
  };
  return (
    <div className="space-y-4">
      {toonAuto && (
        <Sectie titel="Heeft de zaak een auto?" uitleg="Bepaalt welk fiscaal model voor autokosten geldt: bijtelling bij een auto op de zaak, kilometervergoeding bij een privéauto. Per jaar nog te corrigeren in Persoonlijke aannames.">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "geen", label: "Nee" },
              { key: "zaak", label: "Auto op de zaak" },
              { key: "prive", label: "Privéauto zakelijk gebruikt" },
            ].map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => zet({ autoKeuze: o.key, autoSoort: o.key === "zaak" ? t.autoSoort : null })}
                className={`${KNOP} ${autoKeuze === o.key ? KNOP_AAN : KNOP_UIT}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {autoKeuze === "zaak" && (
            <div className="pt-1 space-y-1.5">
              <p className="text-xs text-slate-600">Gekocht, operational lease of financial lease?</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "koop", label: "Gekocht (eigendom)" },
                  { key: "operational", label: "Operational lease" },
                  { key: "financial", label: "Financial lease" },
                ].map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => {
                      const patch = { autoSoort: o.key };
                      // Financial lease → de leaseauto-vraag hieronder staat meteen op "Ja".
                      if (o.key === "financial" && t.leaseAutoJa == null) {
                        patch.leaseAutoJa = true;
                        patch.leaseLijst = jaMetSuggesties(t.leaseLijst, suggesties.leaseAuto);
                      }
                      zet(patch);
                    }}
                    className={`${KNOP} ${t.autoSoort === o.key ? KNOP_AAN : KNOP_UIT}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {t.autoSoort === "koop" && (
                <p className="text-xs text-slate-400">Een gekochte auto is een bedrijfsmiddel — geef 'm zo op in het Activa-paneel verderop (voor afschrijving en mogelijke KIA).</p>
              )}
            </div>
          )}
        </Sectie>
      )}

      {toonLeaseAuto && (
        <Sectie
          titel="Is er een leaseauto (financieel) in dit bedrijf?"
          uitleg={t.autoSoort === "financial" ? "Je gaf aan dat de auto financial lease is — vul de leasemaatschappij in. Meerdere auto's? Voeg ze allemaal toe." : "Meerdere auto's? Voeg ze allemaal toe."}
        >
          <JaNee
            value={leaseAutoJa}
            onChange={(v) => zet({ leaseAutoJa: v, leaseLijst: v ? jaMetSuggesties(t.leaseLijst, suggesties.leaseAuto) : [] })}
          >
            <NaamLijst lijst={t.leaseLijst || []} onChange={(l) => zet({ leaseLijst: l })} placeholder="Naam leasemaatschappij (bijv. Hiltermann Lease)" suggesties={suggesties.leaseAuto || []} />
          </JaNee>
        </Sectie>
      )}

      {needs.leaseOverig && (
        <Sectie titel="Nog een ander financieel leaseobject (bijv. machine of apparatuur, geen auto)?">
          <JaNee value={t.leaseOverigJa ?? null} onChange={(v) => zet({ leaseOverigJa: v, leaseOverigLijst: v ? t.leaseOverigLijst || [] : [] })}>
            <NaamLijst lijst={t.leaseOverigLijst || []} onChange={(l) => zet({ leaseOverigLijst: l })} placeholder="Naam leasemaatschappij (bijv. DLL, Alfam)" />
          </JaNee>
        </Sectie>
      )}

      {needs.lening && (
        <Sectie titel="Is er een zakelijke lening (bank, Qredits, familie, etc.)?" uitleg="Meerdere? Voeg ze allemaal toe.">
          <JaNee value={t.leningJa ?? null} onChange={(v) => zet({ leningJa: v, leningLijst: v ? jaMetSuggesties(t.leningLijst, suggesties.lening) : [] })}>
            <NaamLijst lijst={t.leningLijst || []} onChange={(l) => zet({ leningLijst: l })} placeholder="Bij wie is de lening (bijv. Qredits)" suggesties={suggesties.lening || []} />
          </JaNee>
        </Sectie>
      )}

      {needs.voorraad && (
        <Sectie titel="Heb je voorraad (goederen die je inkoopt om door te verkopen)?" uitleg="Alleen een signaal; er wordt nog niets automatisch berekend.">
          <JaNee value={t.voorraadJa ?? null} onChange={(v) => zet({ voorraadJa: v })} />
        </Sectie>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!klaar}
          onClick={() => {
            if (toonAuto) {
              const status = autoKeuze === "geen" ? null : autoKeuze;
              const soort = autoKeuze === "zaak" ? t.autoSoort || null : null;
              setAutoWizardStatus({ status: autoKeuze, soort });
              onSeedAutoStatus(years, status);
            }
            if (needs.lease) {
              const l = toonLeaseAuto && leaseAutoJa ? t.leaseLijst || [] : [];
              setVerwachteLease(l.map((naam) => ({ naam, gevonden: false })));
            }
            if (needs.leaseOverig) {
              const l = t.leaseOverigJa ? t.leaseOverigLijst || [] : [];
              setVerwachteLeaseOverig(l.map((naam) => ({ naam, gevonden: false })));
            }
            if (needs.lening) {
              const l = t.leningJa ? t.leningLijst || [] : [];
              setVerwachteLening(l.map((naam) => ({ naam, gevonden: false })));
            }
            if (needs.voorraad) setHeeftVoorraad(!!t.voorraadJa);
            goNext();
          }}
          className={PRIMAIR}
        >
          Doorgaan
        </button>
        <button type="button" onClick={alleNee} className="text-xs text-slate-500 underline hover:text-slate-700">Alles nee</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Scherm 35 — AOV, KOR, BTW-verlegd (+ tarief), urencriterium
// ---------------------------------------------------------------------------------------------
const TARIEF_OPTIES = [
  { waarde: "21", label: "Hoog tarief (21%)" },
  { waarde: "9", label: "Laag tarief (9%)" },
  { waarde: "0", label: "Vrijgesteld (0%) — bijv. bepaalde zorg-, onderwijs- of financiële diensten" },
];
const UREN_OPTIES = [
  { k: "ja", l: "Ja" },
  { k: "nee", l: "Nee" },
  { k: "onbekend", l: "Onbekend" },
];

function Scherm35({
  typedNow, zet, needs, isBV, goNext, years,
  korRegeling, setKorRegeling, btwVerlegd, setBtwVerlegd, setVerwachteAOV,
  onSetIncomeBtwRateChoice, onSeedZelfstandigenaftrekStatus, onSeedZelfstandigenaftrekMap, suggesties,
}) {
  const t = typedNow;
  const toonKor = needs.kor && !isBV;
  const kor = korRegeling; // direct vastgelegd bij een klik (zoals voorheen)
  const toonVerlegd = needs.verlegd && !isBV && kor !== true;
  const toonUren = needs.uren && !isBV;
  const tarieven = t.btwTarieven || [];
  const urenModus = t.urenModus ?? null; // "ja" | "nee" | "onbekend" | "perjaar"
  const urenPerJaar = t.urenPerJaar || {};
  const verlegd = btwVerlegd; // true/false/null
  const tariefKlaar = verlegd !== false || (tarieven.length > 0 && (tarieven.length === 1 || t.btwStandaard));
  const klaar =
    (!needs.aov || t.aovJa != null) &&
    (!toonKor || (kor !== null && kor !== undefined)) &&
    (!toonVerlegd || (kor === true || (verlegd !== null && verlegd !== undefined && tariefKlaar))) &&
    (!toonUren || (urenModus != null && (urenModus !== "perjaar" || years.every((y) => urenPerJaar[y]))));
  const alleNee = () => {
    if (needs.aov) zet({ aovJa: false, aovNaam: "" });
    if (toonKor) setKorRegeling(false);
    if (toonVerlegd) setBtwVerlegd(false);
  };
  const toggleTarief = (w) => {
    const next = tarieven.includes(w) ? tarieven.filter((x) => x !== w) : [...tarieven, w];
    zet({ btwTarieven: next, btwStandaard: next.length === 1 ? next[0] : next.includes(t.btwStandaard) ? t.btwStandaard : null });
  };
  const aovSug = suggesties.aov || [];
  return (
    <div className="space-y-4">
      {needs.aov && (
        <Sectie titel="Heb je een AOV (arbeidsongeschiktheidsverzekering)?">
          <JaNee
            value={t.aovJa ?? null}
            onChange={(v) => zet({ aovJa: v, aovNaam: v ? t.aovNaam || aovSug[0]?.naam || "" : "" })}
          >
            <input
              type="text"
              value={t.aovNaam ?? ""}
              onChange={(e) => zet({ aovNaam: e.target.value })}
              placeholder="Naam verzekeraar (bijv. Movir, Achmea) — optioneel"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {aovSug.length > 0 && !t.aovNaam && (
              <p className="text-[11px] text-slate-400">Gevonden in je bankdata: {aovSug.map((s) => `${s.naam} (${s.count}×)`).join(", ")}</p>
            )}
          </JaNee>
        </Sectie>
      )}

      {toonKor && (
        <Sectie titel="Val je onder de kleineondernemersregeling (KOR)?" uitleg="Bij KOR bereken je geen BTW en is er geen BTW-aangifteplicht.">
          <JaNee value={kor ?? null} onChange={(v) => setKorRegeling(v)} opties={[{ k: true, l: "Ja, KOR" }, { k: false, l: "Nee" }]} />
        </Sectie>
      )}

      {toonVerlegd && kor !== true && (
        <Sectie titel="Werk je met BTW-verlegd (bijv. onderaannemer in de bouw)?" uitleg="Standaardinstelling. Kies de situatie die het vaakst voorkomt; per klant later aan te passen bij &quot;Zakelijke tegenpartijen (inkomsten)&quot;.">
          <JaNee value={verlegd ?? null} onChange={(v) => setBtwVerlegd(v)} />
          {verlegd === false && (
            <div className="pt-1 space-y-1.5">
              <p className="text-xs text-slate-600">Onder welk(e) BTW-tarief(ven) vallen de diensten die je factureert? (meer dan één mag)</p>
              <div className="flex flex-col gap-1.5">
                {TARIEF_OPTIES.map((o) => (
                  <label key={o.waarde} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={tarieven.includes(o.waarde)} onChange={() => toggleTarief(o.waarde)} />
                    {o.label}
                  </label>
                ))}
              </div>
              {tarieven.length > 1 && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-600">Welk tarief komt het meeste voor? Dat wordt het standaardtarief; de andere kies je per klant of transactie.</p>
                  <div className="flex flex-wrap gap-2">
                    {TARIEF_OPTIES.filter((o) => tarieven.includes(o.waarde)).map((o) => (
                      <button key={o.waarde} type="button" onClick={() => zet({ btwStandaard: o.waarde })} className={`${KNOP} ${t.btwStandaard === o.waarde ? KNOP_AAN : KNOP_UIT}`}>
                        {o.waarde}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Sectie>
      )}

      {toonUren && (
        <Sectie
          titel="Voldoe je aan het urencriterium voor de zelfstandigenaftrek?"
          uitleg="Minimaal 1.225 uur per jaar (en meer dan de helft van je werktijd, tenzij je pas start). Niet zeker? Kies Onbekend: dan toont de tool beide scenario's naast elkaar."
        >
          <div className="space-y-1.5">
            <p className="text-xs text-slate-600">In alle jaren ({years[0]}{years.length > 1 ? `–${years[years.length - 1]}` : ""}):</p>
            <div className="flex flex-wrap gap-2">
              {[...UREN_OPTIES, { k: "perjaar", l: "Per jaar verschillend" }].map((o) => (
                <button key={o.k} type="button" onClick={() => zet({ urenModus: o.k })} className={`${KNOP} ${urenModus === o.k ? KNOP_AAN : KNOP_UIT}`}>{o.l}</button>
              ))}
            </div>
          </div>
          {urenModus === "perjaar" && (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {years.map((y) => (
                <div key={y} className="flex items-center gap-3 p-2 text-sm">
                  <span className="w-12 font-medium">{y}</span>
                  <div className="flex gap-1.5">
                    {UREN_OPTIES.map((o) => (
                      <button key={o.k} type="button" onClick={() => zet({ urenPerJaar: { ...urenPerJaar, [y]: o.k } })} className={`${KNOP} ${urenPerJaar[y] === o.k ? KNOP_AAN : KNOP_UIT}`}>{o.l}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Sectie>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!klaar}
          onClick={() => {
            if (needs.aov) setVerwachteAOV(t.aovJa ? { status: "ja", naam: (t.aovNaam || "").trim() || null } : { status: "nee" });
            if (toonVerlegd && kor !== true && verlegd === false && onSetIncomeBtwRateChoice) {
              onSetIncomeBtwRateChoice(tarieven, tarieven.length === 1 ? tarieven[0] : t.btwStandaard);
            }
            if (toonUren) {
              if (urenModus === "perjaar") {
                if (onSeedZelfstandigenaftrekMap) onSeedZelfstandigenaftrekMap(urenPerJaar);
                else for (const y of years) onSeedZelfstandigenaftrekStatus([y], urenPerJaar[y]);
              } else onSeedZelfstandigenaftrekStatus(years, urenModus);
            }
            goNext();
          }}
          className={PRIMAIR}
        >
          Doorgaan
        </button>
        <button type="button" onClick={alleNee} className="text-xs text-slate-500 underline hover:text-slate-700">Alles nee (AOV, KOR, BTW-verlegd)</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Scherm 36 — fiscale jaren: startersaftrek en BTW-kwartalen
// ---------------------------------------------------------------------------------------------
function Scherm36({
  typedNow, zet, needs, isBV, goNext, years, korRegeling,
  onSeedStartersaftrekStatus, kwartalenLijst, kwartaalStatus, setKwartaalStatusField,
}) {
  const toonStarters = needs.starters && !isBV;
  const toonKwartalen = needs.kwartalen && korRegeling !== true && kwartalenLijst.length > 0;
  const starterJaren = typedNow.starterJaren || [];
  return (
    <div className="space-y-4">
      {toonStarters && (
        <Sectie
          titel="In welke jaren heb je startersaftrek toegepast?"
          uitleg="Alleen voor starters: maximaal 3 keer in de eerste 5 jaar van de onderneming, bovenop de zelfstandigenaftrek (en alleen als je aan het urencriterium voldoet). Geen enkel jaar aangevinkt = geen startersaftrek."
        >
          <div className="flex flex-wrap gap-2">
            {years.map((y) => {
              const aan = starterJaren.includes(y);
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => zet({ starterJaren: aan ? starterJaren.filter((j) => j !== y) : [...starterJaren, y] })}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium border ${aan ? KNOP_AAN : KNOP_UIT}`}
                >
                  {y}
                </button>
              );
            })}
          </div>
        </Sectie>
      )}

      {toonKwartalen && (
        <Sectie titel="Welke BTW-kwartalen zijn al aangegeven en/of betaald?">
          <div className="flex items-center gap-4 text-xs">
            <span className="w-24" />
            <button type="button" onClick={() => kwartalenLijst.forEach((q) => setKwartaalStatusField(`${q.year}-Q${q.kwartaal}`, "aangegeven", true))} className="text-slate-500 underline hover:text-slate-700">Alles aangegeven</button>
            <button type="button" onClick={() => kwartalenLijst.forEach((q) => setKwartaalStatusField(`${q.year}-Q${q.kwartaal}`, "betaald", true))} className="text-slate-500 underline hover:text-slate-700">Alles betaald</button>
          </div>
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg max-h-64 overflow-y-auto">
            {kwartalenLijst.map((q) => {
              const key = `${q.year}-Q${q.kwartaal}`;
              const status = kwartaalStatus[key] || {};
              return (
                <div key={key} className="flex items-center gap-4 p-2.5 text-sm">
                  <span className="w-24 font-medium">{q.year} — Q{q.kwartaal}</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    <input type="checkbox" checked={!!status.aangegeven} onChange={(e) => setKwartaalStatusField(key, "aangegeven", e.target.checked)} />
                    Aangegeven
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    <input type="checkbox" checked={!!status.betaald} onChange={(e) => setKwartaalStatusField(key, "betaald", e.target.checked)} />
                    Betaald
                  </label>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400">Dit kan later altijd nog aangepast worden bij "BTW per kwartaal".</p>
        </Sectie>
      )}

      <button
        type="button"
        onClick={() => {
          if (toonStarters) onSeedStartersaftrekStatus(years, starterJaren);
          goNext();
        }}
        className={PRIMAIR}
      >
        {toonStarters && starterJaren.length === 0 ? "Geen startersaftrek — doorgaan" : "Doorgaan"}
      </button>
    </div>
  );
}
