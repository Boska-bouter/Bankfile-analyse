import { useState, useEffect } from "react";
import { Building2, Home, FileSpreadsheet, ChevronRight, ChevronLeft, Check, AlertCircle } from "lucide-react";
import { eur } from "../../utils/amounts.js";

const STEP_LABELS = {
  10: "Eigen naam", 11: "Andere eigen rekening", 12: "Grootste opdrachtgevers", 13: "Grootste leveranciers",
  6: "Leaseauto", 7: "Zakelijke lening", 8: "AOV", 9: "Voorraad",
  0: "Rekening", 14: "Rechtsvorm", 1: "KOR", 2: "BTW-verlegd", 5: "BTW-tarief op facturen", 3: "BTW-kwartalen", 4: "Project opslaan",
};

export default function SetupWizardModal({
  pendingFileNames, onAccountTypeChoose,
  korRegeling, setKorRegeling,
  rechtsvorm, setRechtsvorm,
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
  opdrachtgeversGevraagd, onAddBusinessKeywords, onAddBusinessExpenseKeywords,
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
    if (opdrachtgeversGevraagd === null) { list.push(12); list.push(13); }
    if (verwachteLease === null) list.push(6);
    if (verwachteLening === null) list.push(7);
    if (verwachteAOV === null) list.push(8);
    if (heeftVoorraad === null) list.push(9);
    if (pendingFileNames.length > 0) list.push(0);
    if (rechtsvorm === null) list.push(14);
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
  const [history, setHistory] = useState([]);

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
    setHistory((prev) => [...prev, currentStepId]);
    setDoneIds((prev) => new Set([...prev, currentStepId]));
  };
  // Terug naar de vorige vraag — haalt de laatst-voltooide stap uit doneIds, waardoor die
  // vanzelf weer als eerste in remainingSteps verschijnt (dezelfde volgorde als initialSteps).
  // Kan tot en met de allerlaatste stap, zolang de wizard nog open is.
  const goBack = () => {
    if (history.length === 0) return;
    const vorige = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setDoneIds((prev) => { const next = new Set(prev); next.delete(vorige); return next; });
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
              <p className="text-[11px] text-slate-400">
                Meerdere rekeningen? Klik na elke rekening op <strong>"+ Toevoegen"</strong> om 'm aan de lijst
                hierboven te zetten, en vul daarna de volgende in.
              </p>
              <p className="text-xs text-slate-400">De gegevens zijn niet verplicht — je kunt dit ook later nog invullen of aanvullen.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    let lijst = typedNow.eigenRekeningenLijst || [];
                    if (typedNow.eigenRekeningIban?.trim() || typedNow.eigenRekeningType) {
                      lijst = [...lijst, { iban: typedNow.eigenRekeningIban?.trim() || null, accountType: typedNow.eigenRekeningType || null }];
                      setTypedNow((p) => ({ ...p, eigenRekeningenLijst: lijst, eigenRekeningIban: "", eigenRekeningType: null }));
                    }
                    setEigenRekeningenExtra(lijst);
                    goNext();
                  }}
                  className="rounded-md px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Doorgaan
                </button>
              </div>
            </div>
          )}
          {currentStepId === 12 && (
            <LijstVraag
              vraag="Wat zijn je grootste of vaste opdrachtgevers? (max. 5)"
              toelichting="Zo kan de tool binnenkomende betalingen van deze klanten meteen als omzet herkennen, in plaats van dat je dat achteraf per klant moet bevestigen."
              placeholder="Naam opdrachtgever"
              maxItems={5}
              lijst={typedNow.opdrachtgeversLijst || []}
              onChangeLijst={(lijst) => setTypedNow((p) => ({ ...p, opdrachtgeversLijst: lijst }))}
              onKlaar={(lijst) => { onAddBusinessKeywords(lijst); goNext(); }}
            />
          )}
          {currentStepId === 13 && (
            <LijstVraag
              vraag="En je grootste of vaste leveranciers? (optioneel)"
              toelichting="Zelfde idee, maar dan voor vaste zakelijke uitgaven."
              placeholder="Naam leverancier"
              maxItems={5}
              lijst={typedNow.leveranciersLijst || []}
              onChangeLijst={(lijst) => setTypedNow((p) => ({ ...p, leveranciersLijst: lijst }))}
              onKlaar={(lijst) => { onAddBusinessExpenseKeywords(lijst); goNext(); }}
            />
          )}
          {currentStepId === 6 && (
            <VerwachteLijstVraag
              vraag="Is er een leaseauto (financieel) in dit bedrijf?"
              toelichting="Kunnen er meerdere zijn (bijv. meerdere auto's of machines)? Voeg ze dan allemaal toe."
              placeholder="Naam leasemaatschappij (bijv. Hiltermann Lease)"
              lijst={typedNow.leaseLijst || []}
              onChangeLijst={(lijst) => setTypedNow((p) => ({ ...p, leaseLijst: lijst }))}
              onKlaar={(lijst) => { setVerwachteLease(lijst.map((naam) => ({ naam, gevonden: false }))); goNext(); }}
            />
          )}
          {currentStepId === 7 && (
            <VerwachteLijstVraag
              vraag="Is er een zakelijke lening (bank, Qredits, familie, etc.)?"
              toelichting="Kunnen er meerdere zijn? Voeg ze dan allemaal toe."
              placeholder="Bij wie is de lening (bijv. Qredits)"
              lijst={typedNow.leningLijst || []}
              onChangeLijst={(lijst) => setTypedNow((p) => ({ ...p, leningLijst: lijst }))}
              onKlaar={(lijst) => { setVerwachteLening(lijst.map((naam) => ({ naam, gevonden: false }))); goNext(); }}
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
                          {!continuityMatch.ok && ` Verschil ${eur(continuityMatch.diff)} — kan een periodegrens zijn, of de moeite waard om na te gaan.${Math.abs(continuityMatch.diff) < 100 ? " Een verschil van een paar euro is meestal gewoon afronding." : ""}`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {currentStepId === 14 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Onderneem je als eenmanszaak/zzp of vanuit een BV?</p>
              <p className="text-xs text-slate-400">
                Dit bepaalt welke belastingberekening de tool laat zien: inkomstenbelasting (IB) en Zvw voor een
                eenmanszaak, of vennootschapsbelasting (Vpb) voor een BV. Dit kan later nog aangepast worden.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setRechtsvorm("zzp"); goNext(); }}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${rechtsvorm === "zzp" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  Eenmanszaak/zzp
                </button>
                <button
                  onClick={() => { setRechtsvorm("bv"); goNext(); }}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${rechtsvorm === "bv" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  BV
                </button>
              </div>
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
            <TarievenVraag
              gekozen={typedNow.btwTarieven || []}
              onChangeGekozen={(lijst) => setTypedNow((p) => ({ ...p, btwTarieven: lijst }))}
              onKlaar={(tarieven, standaard) => { onSetIncomeBtwRateChoice?.(tarieven, standaard); goNext(); }}
            />
          )}

          {currentStepId === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Welke BTW-kwartalen zijn al aangegeven en/of betaald?</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="w-24" />
                <button
                  onClick={() => quartersToAsk.forEach((q) => setKwartaalStatusField(`${q.year}-Q${q.kwartaal}`, "aangegeven", true))}
                  className="text-slate-500 underline hover:text-slate-700"
                >
                  Alles aangegeven
                </button>
                <button
                  onClick={() => quartersToAsk.forEach((q) => setKwartaalStatusField(`${q.year}-Q${q.kwartaal}`, "betaald", true))}
                  className="text-slate-500 underline hover:text-slate-700"
                >
                  Alles betaald
                </button>
              </div>
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
                  if ((currentStepId === 12 || currentStepId === 13) && opdrachtgeversGevraagd === null) {
                    onAddBusinessKeywords ? onAddBusinessKeywords([]) : null;
                  }
                  goNext();
                }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Later invullen
              </button>
            ) : (
              <span />
            )}
          </div>
          {/* Stappen 6-11 hebben allemaal hun eigen "Ja"/"Nee"/"Doorgaan"-knop die al opslaat
              én doorgaat — een extra "Doorgaan" hieronder zou dubbelop zijn, en erger: die knop
              slaat niets op, dus zou de zojuist getypte tekst stilletjes negeren. */}
          {![5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(currentStepId) && (currentStepId !== 0 || allTypedNow) && (
            <button
              onClick={goNext}
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              {isLastStep ? "Klaar" : "Doorgaan"} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// BTW-tarief-op-omzet-vraag: een aanvinklijst van de drie mogelijke tarieven (kan er meer dan één
// zijn — sommige zzp'ers factureren zowel 21% als 9%, of hebben daarnaast nog een vrijgestelde
// dienst). Bij precies één aangevinkt tarief gaat de wizard meteen door; bij meerdere volgt een
// tweede fase die vraagt welk tarief het meeste voorkomt — dat wordt het standaardtarief voor de
// generieke "Zakelijke inkomsten"-categorie, de rest blijft als eigen categorie beschikbaar om per
// klant/transactie te kiezen (met een latere "Werk te doen"-herinnering om dat na te lopen).
const TARIEF_OPTIES = [
  { waarde: "21", label: "Hoog tarief (21%)" },
  { waarde: "9", label: "Laag tarief (9%)" },
  { waarde: "0", label: "Vrijgesteld (0%) — bijv. bepaalde zorg-, onderwijs- of financiële diensten" },
];
function TarievenVraag({ gekozen, onChangeGekozen, onKlaar }) {
  const [fase, setFase] = useState("kiezen"); // "kiezen" | "meestVoorkomend"
  const toggle = (waarde) => {
    onChangeGekozen(gekozen.includes(waarde) ? gekozen.filter((w) => w !== waarde) : [...gekozen, waarde]);
  };
  const doorgaan = () => {
    if (gekozen.length === 0) return;
    if (gekozen.length === 1) { onKlaar(gekozen, gekozen[0]); return; }
    setFase("meestVoorkomend");
  };
  if (fase === "meestVoorkomend") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">Welk tarief komt het meeste voor?</p>
        <p className="text-xs text-slate-400">
          Dat wordt het standaardtarief. De minder vaak voorkomende tarieven blijven gewoon beschikbaar als eigen
          categorie ("Zakelijke inkomsten 0%/9%/21%") om per klant of transactie te kiezen bij "Zakelijke
          tegenpartijen (inkomsten)" — de tool herinnert je er straks aan om dat na te lopen.
        </p>
        <div className="flex flex-col gap-2">
          {TARIEF_OPTIES.filter((o) => gekozen.includes(o.waarde)).map((o) => (
            <button
              key={o.waarde}
              onClick={() => onKlaar(gekozen, o.waarde)}
              className="rounded-md px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50 text-left"
            >
              {o.label}
            </button>
          ))}
        </div>
        <button onClick={() => setFase("kiezen")} className="text-xs text-slate-400 hover:text-slate-600">
          ← Tarieven aanpassen
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Onder welk(e) BTW-tarief(ven) vallen de diensten die je factureert?</p>
      <p className="text-xs text-slate-400">
        Vink aan wat van toepassing is — kan er meer dan één zijn. De meeste diensten vallen onder het hoge tarief
        (21%) — het lage tarief (9%) geldt voor een beperkte groep diensten/producten, en een klein aantal diensten
        (bijv. bepaalde zorg-, onderwijs- of financiële diensten) is helemaal vrijgesteld (0%).
      </p>
      <div className="flex flex-col gap-2">
        {TARIEF_OPTIES.map((o) => (
          <label key={o.waarde} className="flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" checked={gekozen.includes(o.waarde)} onChange={() => toggle(o.waarde)} />
            {o.label}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={doorgaan}
          disabled={gekozen.length === 0}
          className="rounded-md px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Doorgaan
        </button>
      </div>
    </div>
  );
}

// Gedeelde vraag-vorm voor een lijstje namen (opdrachtgevers/leveranciers): typen, op "+
// Toevoegen" klikken, herhalen, en "Klaar" om door te gaan — dezelfde opzet als bij de extra
// eigen rekeningen, maar zonder het type-veld.
function LijstVraag({ vraag, toelichting, placeholder, maxItems, lijst, onChangeLijst, onKlaar }) {
  const [huidig, setHuidig] = useState("");
  const vol = maxItems != null && lijst.length >= maxItems;
  const voegToe = () => {
    if (!huidig.trim() || vol) return;
    onChangeLijst([...lijst, huidig.trim()]);
    setHuidig("");
  };
  const doorgaan = () => {
    // Vergeet nooit tekst die nog in het invoerveld staat maar niet expliciet is toegevoegd —
    // anders lijkt het net of "Doorgaan" het gewoon negeert. Ook de lokale lijst zelf bijwerken
    // (niet alleen wat aan onKlaar wordt doorgegeven), anders is deze tekst weer weg zodra je met
    // "Terug" naar deze stap terugkeert.
    const finalLijst = huidig.trim() && !vol ? [...lijst, huidig.trim()] : lijst;
    if (finalLijst !== lijst) onChangeLijst(finalLijst);
    onKlaar(finalLijst);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">{vraag}</p>
      {toelichting && <p className="text-xs text-slate-400">{toelichting}</p>}
      {lijst.length > 0 && (
        <ul className="space-y-1">
          {lijst.map((naam, i) => (
            <li key={i} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-1.5 text-sm">
              <span className="truncate">{naam}</span>
              <button onClick={() => onChangeLijst(lijst.filter((_, j) => j !== i))} className="shrink-0 text-xs text-slate-400 hover:text-slate-700">
                Verwijderen
              </button>
            </li>
          ))}
        </ul>
      )}
      {!vol && (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={huidig}
              onChange={(e) => setHuidig(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); voegToe(); } }}
              placeholder={placeholder}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button onClick={voegToe} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap">
              + Toevoegen
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Kan het er meer dan één zijn? Klik na elke naam op <strong>"+ Toevoegen"</strong> om 'm aan de lijst
            hierboven te zetten, en typ daarna de volgende.
          </p>
        </div>
      )}
      <p className="text-xs text-slate-400">Niet verplicht — je kunt dit ook later nog aanvullen.</p>
      <div className="flex gap-2">
        <button onClick={doorgaan} className="rounded-md px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50">
          Doorgaan
        </button>
      </div>
    </div>
  );
}

// Zelfde lijst-opzet als LijstVraag, specifiek voor lease/lening — het verschil is puur
// terminologie in de tekst (deze vraag gaat over "is er een X", niet over "wat zijn je grootste Y").
function VerwachteLijstVraag({ vraag, toelichting, placeholder, lijst, onChangeLijst, onKlaar }) {
  return <LijstVraag vraag={vraag} toelichting={toelichting} placeholder={placeholder} lijst={lijst} onChangeLijst={onChangeLijst} onKlaar={onKlaar} />;
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
