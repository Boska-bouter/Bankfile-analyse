import { useState, useEffect } from "react";
import { Building2, Home, FileSpreadsheet, ChevronRight, Check, AlertCircle } from "lucide-react";
import { eur } from "../../utils/amounts.js";

const STEP_LABELS = {
  10: "Eigen naam", 11: "Andere eigen rekening",
  6: "Leaseauto", 7: "Zakelijke lening", 8: "AOV", 9: "Voorraad",
  0: "Rekening", 1: "KOR", 2: "BTW-verlegd", 5: "BTW-tarief op facturen", 3: "BTW-kwartalen", 4: "Project opslaan",
};

export default function SetupWizardModal({
  pendingFileNames, onAccountTypeChoose,
  korRegeling, setKorRegeling,
  btwVerlegd, setBtwVerlegd,
  onSetIncomeBtwRateChoice,
  quartersToAsk, kwartaalStatus, setKwartaalStatusField,
  fileContinuity = [],
  onSaveProject,
  verwachteLease, setVerwachteLease,
  verwachteLening, setVerwachteLening,
  verwachteAOV, setVerwachteAOV,
  heeftVoorraad, setHeeftVoorraad,
  eigenNamen, setEigenNamen,
  eigenRekeningenExtra, setEigenRekeningenExtra,
  onClose,
}) {
  const [typedNow, setTypedNow] = useState({});

  // Bevriest bij het openen welke stappen er ÜBERHAUPT relevant zijn — dat mag daarna niet meer
  // veranderen door het beantwoorden van een vraag zelf (dat veranderde namelijk precies de
  // voorwaarde die bepaalde of de wizard nog iets te doen had, waardoor die zichzelf verdween of
  // bleef hangen op een net-beantwoorde stap). Een "wachtrij" van resterende stappen (in plaats
  // van een index in een krimpende lijst) kan nooit vastlopen: elke voltooide stap wordt expliciet
  // gemarkeerd, en de KOR=Ja-uitzondering (BTW-verlegd/kwartalen worden dan overbodig) filtert
  // alleen toekomstige, nog niet getoonde stappen weg. Stap 5 (BTW-tarief) hoort hier om dezelfde
  // reden al bij vanaf het begin, ook al is pas ná het antwoord op stap 2 bekend of hij relevant
  // is (alleen bij "nee" op BTW-verlegd) — dat wordt hieronder net als de KOR-uitzondering pas
  // live bepaald, niet bij het openen.
  //
  // De vragen over lease/lening/AOV/voorraad (6-9) staan bewust vóór alles — op het moment dat de
  // wizard opent zijn de net geladen bestanden al ingelezen en geclassificeerd (dat gebeurt vóórdat
  // de wizard verschijnt), dus een hier ingevulde naam kan meteen gezocht worden in de transacties
  // die er al liggen. Ze worden alleen ÉÉN keer gevraagd (niet opnieuw bij een volgend bestand) —
  // dat is waarom ze hier conditioneel zijn op "nog niet beantwoord" (null), in plaats van steeds
  // opnieuw in de wachtrij te komen zoals stap 0 dat wel doet.
  const [initialSteps] = useState(() => {
    const list = [];
    if (eigenNamen === null) list.push(10);
    if (eigenRekeningenExtra === null) list.push(11);
    if (verwachteLease === null) list.push(6);
    if (verwachteLening === null) list.push(7);
    if (verwachteAOV === null) list.push(8);
    if (heeftVoorraad === null) list.push(9);
    if (pendingFileNames.length > 0) list.push(0);
    if (korRegeling === null) list.push(1);
    if (korRegeling !== true && btwVerlegd === null) {
      list.push(2);
      list.push(5);
    }
    if (korRegeling !== true && quartersToAsk.length > 0) list.push(3);
    list.push(4); // altijd als laatste: herinnering om het project op te slaan
    return list;
  });
  const [doneIds, setDoneIds] = useState(() => new Set());

  const remainingSteps = initialSteps.filter((id) => {
    if (doneIds.has(id)) return false;
    if ((id === 2 || id === 3) && korRegeling === true) return false;
    if (id === 5 && btwVerlegd !== false) return false; // alleen relevant ná een "nee" op BTW-verlegd
    return true;
  });

  useEffect(() => {
    if (remainingSteps.length === 0) onClose();
  }, [remainingSteps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (remainingSteps.length === 0) return null;
  const currentStepId = remainingSteps[0];
  const isLastStep = remainingSteps.length === 1;

  const goNext = () => {
    setDoneIds((prev) => new Set([...prev, currentStepId]));
  };

  const allTypedNow = pendingFileNames.every((f) => typedNow[f]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-900 text-white shrink-0">
          <p className="text-xs text-slate-300">Stap {initialSteps.indexOf(currentStepId) + 1} van {initialSteps.length}</p>
          <h2 className="text-sm font-semibold mt-0.5">{STEP_LABELS[currentStepId]}</h2>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {currentStepId === 10 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Wat is je eigen naam (en die van je fiscaal partner, indien van toepassing)? Zo herkent de tool een
                overboeking naar/van jezelf als privé, ook als de tegenrekening niet is geladen.
              </p>
              <input
                type="text"
                value={typedNow.eigenNaamOndernemer ?? ""}
                onChange={(e) => setTypedNow((p) => ({ ...p, eigenNaamOndernemer: e.target.value }))}
                placeholder="Naam rekeninghouder"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={typedNow.eigenNaamPartner ?? ""}
                onChange={(e) => setTypedNow((p) => ({ ...p, eigenNaamPartner: e.target.value }))}
                placeholder="Naam fiscaal partner (optioneel)"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="text-xs text-slate-400">Optioneel — je kunt dit ook later nog invullen, of overslaan.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEigenNamen({ ondernemer: typedNow.eigenNaamOndernemer?.trim() || null, partner: typedNow.eigenNaamPartner?.trim() || null }); goNext(); }}
                  className="rounded-md px-4 py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-700"
                >
                  Doorgaan
                </button>
              </div>
            </div>
          )}
          {currentStepId === 11 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Heb je nog andere eigen rekeningen (bijv. een privérekening, of nog een zakelijke rekening) die je niet
                gaat laden? Met het rekeningnummer kan de tool een overboeking daarheen alsnog herkennen als privé.
                Je kunt er meerdere toevoegen.
              </p>
              {(typedNow.eigenRekeningenLijst || []).length > 0 && (
                <ul className="space-y-1">
                  {typedNow.eigenRekeningenLijst.map((r, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-1.5 text-sm">
                      <span className="truncate">{r.iban || "(geen rekeningnummer)"} — {r.accountType === "Zakelijk" ? "Zakelijk" : "Privé"}</span>
                      <button
                        onClick={() => setTypedNow((p) => ({ ...p, eigenRekeningenLijst: p.eigenRekeningenLijst.filter((_, j) => j !== i) }))}
                        className="shrink-0 text-xs text-slate-400 hover:text-slate-700"
                      >
                        Verwijderen
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                type="text"
                value={typedNow.eigenRekeningIban ?? ""}
                onChange={(e) => setTypedNow((p) => ({ ...p, eigenRekeningIban: e.target.value }))}
                placeholder="Rekeningnummer (IBAN)"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setTypedNow((p) => ({ ...p, eigenRekeningType: "Zakelijk" }))}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium border ${typedNow.eigenRekeningType === "Zakelijk" ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600"}`}
                >
                  Zakelijke rekening
                </button>
                <button
                  onClick={() => setTypedNow((p) => ({ ...p, eigenRekeningType: "Prive" }))}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium border ${typedNow.eigenRekeningType === "Prive" ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600"}`}
                >
                  Privérekening
                </button>
                <button
                  onClick={() => {
                    if (!typedNow.eigenRekeningIban?.trim() && !typedNow.eigenRekeningType) return;
                    setTypedNow((p) => ({
                      ...p,
                      eigenRekeningenLijst: [...(p.eigenRekeningenLijst || []), { iban: p.eigenRekeningIban?.trim() || null, accountType: p.eigenRekeningType || null }],
                      eigenRekeningIban: "", eigenRekeningType: null,
                    }));
                  }}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  + Toevoegen
                </button>
              </div>
              <p className="text-xs text-slate-400">De gegevens zijn niet verplicht — je kunt dit ook later nog invullen of aanvullen.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    let lijst = typedNow.eigenRekeningenLijst || [];
                    if (typedNow.eigenRekeningIban?.trim() || typedNow.eigenRekeningType) {
                      lijst = [...lijst, { iban: typedNow.eigenRekeningIban?.trim() || null, accountType: typedNow.eigenRekeningType || null }];
                    }
                    setEigenRekeningenExtra(lijst);
                    goNext();
                  }}
                  className="rounded-md px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Klaar
                </button>
              </div>
            </div>
          )}
          {currentStepId === 6 && (
            <VerwachteNaamVraag
              vraag='Is er een leaseauto (financieel) in dit bedrijf?'
              placeholder="Naam leasemaatschappij (bijv. Hiltermann Lease)"
              value={typedNow.lease ?? ""}
              onChange={(v) => setTypedNow((p) => ({ ...p, lease: v }))}
              onJa={(naam) => { setVerwachteLease({ status: "ja", naam: naam || null }); goNext(); }}
              onNee={() => { setVerwachteLease({ status: "nee" }); goNext(); }}
            />
          )}
          {currentStepId === 7 && (
            <VerwachteNaamVraag
              vraag="Is er een zakelijke lening (bank, Qredits, familie, etc.)?"
              placeholder="Bij wie is de lening (bijv. Qredits)"
              value={typedNow.lening ?? ""}
              onChange={(v) => setTypedNow((p) => ({ ...p, lening: v }))}
              onJa={(naam) => { setVerwachteLening({ status: "ja", naam: naam || null }); goNext(); }}
              onNee={() => { setVerwachteLening({ status: "nee" }); goNext(); }}
            />
          )}
          {currentStepId === 8 && (
            <VerwachteNaamVraag
              vraag="Heb je een AOV (arbeidsongeschiktheidsverzekering)?"
              placeholder="Naam verzekeraar (bijv. Movir, Achmea)"
              value={typedNow.aov ?? ""}
              onChange={(v) => setTypedNow((p) => ({ ...p, aov: v }))}
              onJa={(naam) => { setVerwachteAOV({ status: "ja", naam: naam || null }); goNext(); }}
              onNee={() => { setVerwachteAOV({ status: "nee" }); goNext(); }}
            />
          )}
          {currentStepId === 9 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Heb je voorraad in het bedrijf (goederen die je inkoopt om door te verkopen)?</p>
              <p className="text-xs text-slate-400">
                Dit werkt fiscaal anders dan afschrijving — de tool gebruikt dit alleen als signaal, er wordt nog niets
                automatisch berekend.
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setHeeftVoorraad(true); goNext(); }} className="rounded-md px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50">Ja</button>
                <button onClick={() => { setHeeftVoorraad(false); goNext(); }} className="rounded-md px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50">Nee</button>
              </div>
            </div>
          )}
          {currentStepId === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Is dit een zakelijke rekening of een privérekening?</p>
              {pendingFileNames.map((fileName) => {
                const continuityMatch = fileContinuity.find((c) => c.fileA === fileName || c.fileB === fileName);
                return (
                  <div key={fileName} className="rounded-md border border-slate-200 p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="flex-1 min-w-[8rem] text-sm font-medium truncate">{fileName}</span>
                      <button
                        onClick={() => {
                          onAccountTypeChoose(fileName, "Zakelijk");
                          setTypedNow((p) => ({ ...p, [fileName]: "Zakelijk" }));
                          if (pendingFileNames.length === 1) goNext(); // dit was de laatste — meteen door naar de volgende vraag
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium ${typedNow[fileName] === "Zakelijk" ? "border-emerald-400 bg-emerald-100 text-emerald-800" : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                      >
                        <Building2 className="h-3.5 w-3.5" /> Zakelijk
                      </button>
                      <button
                        onClick={() => {
                          onAccountTypeChoose(fileName, "Prive");
                          setTypedNow((p) => ({ ...p, [fileName]: "Prive" }));
                          if (pendingFileNames.length === 1) goNext();
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium ${typedNow[fileName] === "Prive" ? "border-slate-400 bg-slate-200 text-slate-800" : "border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                      >
                        <Home className="h-3.5 w-3.5" /> Privé
                      </button>
                    </div>
                    {typedNow[fileName] && continuityMatch && (
                      <div className={`flex items-start gap-1.5 rounded-md px-2.5 py-2 text-xs ${continuityMatch.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                        {continuityMatch.ok ? <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                        <span>
                          {continuityMatch.fileA === fileName ? (
                            <>Dit bestand loopt door in <strong>{continuityMatch.fileB}</strong> — eindsaldo hier {eur(continuityMatch.aLastBalance)}, beginsaldo daar {eur(continuityMatch.bOpeningBalance)}.</>
                          ) : (
                            <>Dit lijkt een vervolg op <strong>{continuityMatch.fileA}</strong> — eindsaldo daar {eur(continuityMatch.aLastBalance)}, beginsaldo hier {eur(continuityMatch.bOpeningBalance)}.</>
                          )}
                          {!continuityMatch.ok && ` Verschil ${eur(continuityMatch.diff)} — kan een periodegrens zijn, of de moeite waard om na te gaan.`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {currentStepId === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Val je onder de kleineondernemersregeling (KOR)?</p>
              <p className="text-xs text-slate-400">Bij KOR bereken je geen BTW en is er geen BTW-aangifteplicht.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setKorRegeling(true); goNext(); }}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${korRegeling === true ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  Ja, KOR
                </button>
                <button
                  onClick={() => { setKorRegeling(false); goNext(); }}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${korRegeling === false ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  Nee
                </button>
              </div>
            </div>
          )}

          {currentStepId === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Werk je met BTW-verlegd (bijv. onderaannemer in de bouw)?</p>
              <p className="text-xs text-slate-400">
                Dit is de standaardinstelling. Werk je met sommige klanten met BTW-verlegd en factureer je anderen
                gewoon met 21% BTW? Kies hier de situatie die het vaakst voorkomt — per klant is dit later nog aan te
                passen bij "Zakelijke tegenpartijen (inkomsten)".
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setBtwVerlegd(true); goNext(); }}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${btwVerlegd === true ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  Ja
                </button>
                <button
                  onClick={() => { setBtwVerlegd(false); goNext(); }}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${btwVerlegd === false ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  Nee
                </button>
              </div>
            </div>
          )}

          {currentStepId === 5 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Onder welk BTW-tarief vallen de diensten die je factureert?</p>
              <p className="text-xs text-slate-400">
                De meeste diensten vallen onder het hoge tarief (21%) — het lage tarief (9%) geldt voor een beperkte
                groep diensten/producten. Lever je aan sommige klanten laag- en aan andere hoogbelast? Kies dan
                "Allebei" — je kunt dat daarna per klant instellen bij "Zakelijke tegenpartijen (inkomsten)".
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { onSetIncomeBtwRateChoice?.("21"); goNext(); }}
                  className="rounded-md px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50 text-left"
                >
                  Hoog tarief (21%)
                </button>
                <button
                  onClick={() => { onSetIncomeBtwRateChoice?.("9"); goNext(); }}
                  className="rounded-md px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50 text-left"
                >
                  Laag tarief (9%)
                </button>
                <button
                  onClick={() => { onSetIncomeBtwRateChoice?.("beide"); goNext(); }}
                  className="rounded-md px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50 text-left"
                >
                  Allebei, afhankelijk van klant/dienst
                </button>
              </div>
            </div>
          )}

          {currentStepId === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Welke BTW-kwartalen zijn al aangegeven en/of betaald?</p>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-md">
                {quartersToAsk.map((q) => {
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
            </div>
          )}

          {currentStepId === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-700 font-medium">
                Niet vergeten: sla je project op, anders gaan je correcties en aanpassingen verloren.
              </p>
              <p className="text-sm text-slate-600">
                Alles wat je in deze tool instelt — rekeningtypes, categorieën, "Klopt zo"-bevestigingen, zelf
                toegevoegde trefwoorden, KOR/BTW-instellingen — wordt bewaard in het geheugen van déze browser op dit
                apparaat. Dat geldt voor tablets en laptops, en voor de meest gangbare browsers (Safari, Edge, Chrome,
                Firefox, Opera). Het overleeft een herstart van je apparaat prima, maar gaat verloren zodra je op "Wis
                alles" klikt, of wanneer je de browsergeschiedenis en websitegegevens wist (in veel browsers is dat
                één en dezelfde knop, ook al lijkt het om alleen je surfgeschiedenis te gaan).
              </p>
              <p className="text-sm text-slate-600">
                Een <strong>project opslaan</strong> maakt hier een apart bestand van, los van de browser — dat
                bestand overleeft dus ook een cache-wis, een nieuw apparaat, of het overzetten naar iemand anders (bijv.
                je boekhouder). Sla vooral geregeld op, niet pas aan het eind — bijvoorbeeld na elke sessie waarin je
                een aantal correcties hebt gedaan.
              </p>
              {onSaveProject && (
                <button
                  onClick={onSaveProject}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Project nu opslaan
                </button>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 shrink-0 flex items-center justify-between">
          {currentStepId !== 4 ? (
            <button onClick={goNext} className="text-xs text-slate-400 hover:text-slate-600">
              Later invullen
            </button>
          ) : (
            <span />
          )}
          {(currentStepId !== 0 || allTypedNow) && (
            <button
              onClick={goNext}
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              {isLastStep ? "Klaar" : "Volgende"} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Gedeelde vraag-vorm voor lease/lening/AOV: een naam (optioneel) plus Ja/Nee. Bij "Ja" mag de
// naam leeg blijven — de gegevens (en ook de naam zelf) mogen altijd later nog worden ingevuld,
// dit is puur om meteen te kunnen zoeken in de net geladen transacties als de naam al bekend is.
function VerwachteNaamVraag({ vraag, placeholder, value, onChange, onJa, onNee }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">{vraag}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <p className="text-xs text-slate-400">
        De naam is niet verplicht — je kunt "Ja" ook zonder naam invullen, en de gegevens altijd later aanvullen.
        Weet je de naam wel? Dan kan de tool meteen zoeken of die al in de geladen bestanden voorkomt.
      </p>
      <div className="flex gap-2">
        <button onClick={() => onJa(value.trim())} className="rounded-md px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50">
          Ja
        </button>
        <button onClick={onNee} className="rounded-md px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50">
          Nee
        </button>
      </div>
    </div>
  );
}
