import { useState, useEffect } from "react";
import { Building2, Home, FileSpreadsheet, ChevronRight, ChevronLeft, Check, AlertCircle, X } from "lucide-react";
import { eur } from "../../utils/amounts.js";

const STEP_LABELS = {
  10: "Eigen naam", 11: "Andere eigen rekening", 16: "Zakelijk sparen", 12: "Grootste opdrachtgevers", 13: "Grootste leveranciers",
  17: "Auto", 6: "Leaseauto", 19: "Leaseobjecten (overig)", 7: "Zakelijke lening", 8: "AOV", 9: "Voorraad", 18: "Urencriterium",
  20: "Bankbestanden laden", 0: "Rekening", 14: "Rechtsvorm", 15: "Holdingstructuur", 1: "KOR", 2: "BTW-verlegd", 5: "BTW-tarief op facturen", 3: "BTW-kwartalen", 4: "Dossier opslaan",
};

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
  zelfstandigenaftrekStatus, onSeedZelfstandigenaftrekStatus,
  heeftVoorraad, setHeeftVoorraad,
  eigenNamen, setEigenNamen,
  eigenRekeningenExtra, setEigenRekeningenExtra,
  zakelijkeSpaarRekening, setZakelijkeSpaarRekening,
  opdrachtgeversGevraagd, onAddBusinessKeywords, onAddBusinessExpenseKeywords,
  onClose,
}) {
  const [typedNow, setTypedNow] = useState({});
  // V42 — alle bestanden waarvan in DEZE wizard het rekeningtype is (of wordt) gevraagd, ook nadat ze
  // zijn beantwoord. `pendingFileNames` bevat alleen nog ongetypeerde bestanden, waardoor "Terug" naar
  // stap 0 een lege vraag gaf en een gemaakte keuze niet meer te corrigeren was.
  const [sessionFiles, setSessionFiles] = useState(() => [...pendingFileNames]);
  useEffect(() => {
    setSessionFiles((prev) => {
      const add = pendingFileNames.filter((f) => !prev.includes(f));
      return add.length ? [...prev, ...add] : prev;
    });
  }, [pendingFileNames.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // De vragen over lease/lening/AOV/voorraad (6, 19, 7-9) staan bewust vóór alles — op het moment dat de
  // wizard opent zijn de net geladen bestanden al ingelezen en geclassificeerd (dat gebeurt vóórdat
  // de wizard verschijnt), dus een hier ingevulde naam kan meteen gezocht worden in de transacties
  // die er al liggen. Ze worden alleen ÉÉN keer gevraagd (niet opnieuw bij een volgend bestand) —
  // dat is waarom ze hier conditioneel zijn op "nog niet beantwoord" (null), in plaats van steeds
  // opnieuw in de wachtrij te komen zoals stap 0 dat wel doet.
  const [initialSteps] = useState(() => {
    // alreadyEstablished: dit is geen gloednieuw dossier maar een bestaand project waar al minstens
    // één bestand een rekeningtype heeft (dus de dossierbrede vragen hieronder zijn ooit al gesteld,
    // beantwoord óf bewust met "Later invullen" overgeslagen). In dat laatste geval bleef de bijbehorende
    // state op null staan, waardoor zo'n vraag — zonder deze uitzondering — bij ÉLK nieuw geladen
    // bestand weer terug zou komen (bijv. de zakelijke-spaarrekening- of auto-vraag). Dat is verwarrend
    // bij een bestaand project: op expliciet verzoek wordt dan alleen nog het rekeningtype gevraagd
    // (stap 0) plus de vaste opslag-herinnering (stap 4) — de rest geldt als al afgehandeld en is,
    // indien alsnog nodig, gewoon te beantwoorden via "Basisvragen bewerken" (forceRechtsvormStep).
    if (alreadyEstablished && !forceRechtsvormStep) {
      const list = [];
      if (pendingFileNames.length > 0) list.push(0);
      list.push(4);
      return list;
    }
    const list = [];
    // V38 — leeg dossier: eerst de bankbestanden laden (stap 20), daarna per bestand het rekeningtype
    // (stap 0, wordt live verborgen zolang er geen ongetypeerd bestand is).
    if (loadFilesFirst) { list.push(20); list.push(0); }
    // Rekeningtype (zakelijk/privé) van het/de net geladen bestand(en) eerst vragen — dat is de
    // meest concrete, direct te beantwoorden vraag over wat er nu ligt, vóórdat de (dossierbrede)
    // vragen hieronder volgen. Heeft geen invloed op de lease/lening/AOV-zoekacties verderop (die
    // zoeken sowieso los van het rekeningtype in de tekst van de al ingelezen transacties).
    if (pendingFileNames.length > 0 && !loadFilesFirst) list.push(0);
    if (eigenNamen === null) list.push(10);
    // Rechtsvorm (en de holding-vraag die daarvan afhangt) komt bewust meteen na de naam van de
    // rekeninghouder — vóór alle andere vragen — zodat KOR/BTW-verlegd hieronder al weten of ze
    // relevant zijn (beide zijn niet van toepassing bij een BV, zie de live-filter verderop).
    // forceRechtsvormStep: handmatig geopend via "Basisvragen bewerken" (in plaats van bij het
    // laden van een nieuw bestand) — dan hoort de Rechtsvorm-vraag er altijd bij, ook als hij al
    // eerder beantwoord is, zodat zzp/BV achteraf nog omgezet kan worden. De live-filter hieronder
    // (op rechtsvorm) zorgt er vanzelf voor dat na een wissel de juiste vervolgvragen verschijnen.
    if (rechtsvorm === null || forceRechtsvormStep) list.push(14);
    if (heeftHolding === null) list.push(15);
    // forceRechtsvormStep (handmatig geopend via "Basisvragen bewerken") hoort ook deze stap altijd
    // weer te tonen — anders is er, zodra er ooit al een (lege of gevulde) lijst is opgeslagen, geen
    // enkele manier meer om later alsnog een privé-tegenrekening toe te voegen of te wijzigen.
    if (eigenRekeningenExtra === null || forceRechtsvormStep) list.push(11);
    if (zakelijkeSpaarRekening === null) list.push(16);
    if (opdrachtgeversGevraagd === null) { list.push(12); list.push(13); }
    // Auto-vraag staat bewust vóór de leaseauto-vraag: bij "financial lease" als antwoord schakelt
    // die vraag door naar stap 6 hieronder (die dan al in de wachtrij staat) voor de
    // contractdetails, in plaats van twee keer los naar een auto/lease te vragen.
    if (autoWizardStatus === null) list.push(17);
    if (verwachteLease === null) list.push(6);
    // v275 — losse, altijd gestelde vraag voor overige financiële leaseobjecten (machines,
    // apparatuur, geen auto) — onafhankelijk van het antwoord op de auto-vraag, zodat die niet
    // langer meelift op de (nu conditionele) leaseauto-vraag.
    if (verwachteLeaseOverig === null) list.push(19);
    if (verwachteLening === null) list.push(7);
    if (verwachteAOV === null) list.push(8);
    if (heeftVoorraad === null) list.push(9);
    // Urencriterium is een IB/Zvw-vraag (zelfstandigenaftrek) en dus niet van toepassing bij een BV
    // — bij het openen van de wizard is rechtsvorm echter nog niet per se al beantwoord (die vraag
    // staat verderop in deze lijst), dus wordt de BV-uitzondering hieronder pas live gefilterd
    // (net als bij stap 15/1/2), niet hier bij het opbouwen van de lijst.
    if (Object.keys(zelfstandigenaftrekStatus || {}).length === 0) list.push(18);
    if (korRegeling === null) list.push(1);
    if (korRegeling !== true && btwVerlegd === null) {
      list.push(2);
      list.push(5);
    }
    if (korRegeling !== true && quartersToAsk.length > 0) list.push(3);
    list.push(4); // altijd als laatste: herinnering om het dossier op te slaan
    return list;
  });
  const [doneIds, setDoneIds] = useState(() => new Set());
  const [showStepList, setShowStepList] = useState(false);
  const [history, setHistory] = useState([]);

  const remainingSteps = initialSteps.filter((id) => {
    // Stap 0 blijft/komt terug zolang er een ongetypeerd bestand is (bijv. na "Terug" naar stap 20 nog een bestand geladen).
    if (doneIds.has(id) && !(id === 0 && pendingFileNames.length > 0)) return false;
    if (id === 0 && sessionFiles.length === 0) return false; // geen bestanden in deze wizard
    if ((id === 2 || id === 3) && korRegeling === true) return false;
    if (id === 5 && btwVerlegd !== false) return false; // alleen relevant ná een "nee" op BTW-verlegd
    if (id === 15 && rechtsvorm !== "bv") return false; // holding-vraag is alleen relevant bij BV
    if ((id === 1 || id === 2) && rechtsvorm === "bv") return false; // KOR en BTW-verlegd zijn n.v.t. bij een BV (altijd gewone BTW-plicht, niet verlegd)
    if (id === 18 && rechtsvorm === "bv") return false; // zelfstandigenaftrek/urencriterium is n.v.t. bij een BV
    // v274 — stap 6 (leaseauto) stond altijd los in de wachtrij (zie de toelichting bij stap 17
    // hierboven) om ook een leaseobject te kunnen vragen los van de auto-vraag. Maar als bij de
    // auto-vraag (stap 17) al "Nee" of "Privéauto zakelijk gebruikt" is gekozen, is er per
    // definitie geen auto van de zaak — dan is "Is er een leaseauto (financieel) in dit bedrijf?"
    // een verwarrende herhaling i.p.v. een zinvolle vervolgvraag, dus die slaan we dan over.
    if (id === 6 && autoWizardStatus && (autoWizardStatus.status === "prive" || autoWizardStatus.status === "geen")) return false;
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

  const allTypedNow = sessionFiles.every((f) => typedNow[f]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="relative px-5 py-3 border-b border-slate-200 bg-teal-700 text-white shrink-0">
          {/* v307 (V30) — afbreken: per ongeluk (bijv. met een aanraakscherm) op "Basisvragen bewerken"
              getikt, of de vragen later willen invullen. Al gegeven antwoorden blijven bewaard. */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-teal-50 hover:bg-white/15"
            title="Afbreken — al gegeven antwoorden blijven bewaard"
          >
            <X className="h-4 w-4" /> Afbreken
          </button>
          <p className="text-xs text-slate-300">Stap {initialSteps.indexOf(currentStepId) + 1} van {initialSteps.length}</p>
          <h2 className="text-sm font-semibold mt-0.5">{STEP_LABELS[currentStepId]}</h2>
          {/* v306 (V28) — voortgangsbalk + uitklapbaar overzicht van alle vragen (✓ beantwoord / huidige /
              nog open), zodat je ziet hoeveel er nog komt en niet blind door "Stap x van y" klikt. */}
          <div className="mt-2 h-1 rounded-full bg-white/20 overflow-hidden" aria-hidden="true">
            <div className="h-full bg-white/80" style={{ width: `${Math.round((doneIds.size / Math.max(initialSteps.length, 1)) * 100)}%` }} />
          </div>
          <button type="button" onClick={() => setShowStepList((v) => !v)} className="mt-1.5 text-[11px] text-teal-100 hover:text-white underline decoration-dotted">
            {showStepList ? "Overzicht verbergen" : `Alle vragen (${Math.max(initialSteps.length - doneIds.size, 0)} nog open)`}
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
          {currentStepId === 10 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Eigen naam (en die van je fiscaal partner)? Zo herkent de tool overboekingen naar/van jezelf als privé.
              </p>
              <input
                type="text"
                value={typedNow.eigenNaamOndernemer ?? ""}
                onChange={(e) => setTypedNow((p) => ({ ...p, eigenNaamOndernemer: e.target.value }))}
                placeholder="Naam rekeninghouder"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={typedNow.eigenNaamPartner ?? ""}
                onChange={(e) => setTypedNow((p) => ({ ...p, eigenNaamPartner: e.target.value }))}
                placeholder="Naam fiscaal partner (optioneel)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="text-xs text-slate-400">Optioneel — je kunt dit ook later nog invullen, of overslaan.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEigenNamen({ ondernemer: typedNow.eigenNaamOndernemer?.trim() || null, partner: typedNow.eigenNaamPartner?.trim() || null }); goNext(); }}
                  className="rounded-lg px-4 py-2 text-sm font-medium bg-teal-700 text-white hover:bg-teal-800"
                >
                  Doorgaan
                </button>
              </div>
            </div>
          )}
          {currentStepId === 11 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Andere eigen rekeningen die je niet laadt? Met het rekeningnummer herkent de tool overboekingen daarheen als privé.
              </p>
              {(() => {
                // Bij het opnieuw openen van deze stap (bijv. via "Basisvragen bewerken", nadat
                // deze lijst al eerder is opgeslagen) staat er in typedNow nog niets — val dan terug
                // op de al opgeslagen eigenRekeningenExtra, zodat die niet stilzwijgend leeg lijkt en
                // bij op "Doorgaan" klikken per ongeluk wordt overschreven met een lege lijst.
                const huidigeLijst = typedNow.eigenRekeningenLijst ?? eigenRekeningenExtra ?? [];
                if (huidigeLijst.length === 0) return null;
                return (
                  <ul className="space-y-1">
                    {huidigeLijst.map((r, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                        <span className="truncate">{r.iban || "(geen rekeningnummer)"} — {r.accountType === "Zakelijk" ? "Zakelijk" : "Privé"}</span>
                        <button
                          onClick={() => setTypedNow((p) => ({ ...p, eigenRekeningenLijst: huidigeLijst.filter((_, j) => j !== i) }))}
                          className="shrink-0 text-xs text-slate-400 hover:text-slate-700"
                        >
                          Verwijderen
                        </button>
                      </li>
                    ))}
                  </ul>
                );
              })()}
              <input
                type="text"
                value={typedNow.eigenRekeningIban ?? ""}
                onChange={(e) => setTypedNow((p) => ({ ...p, eigenRekeningIban: e.target.value }))}
                placeholder="Rekeningnummer (IBAN)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setTypedNow((p) => ({ ...p, eigenRekeningType: "Zakelijk" }))}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${typedNow.eigenRekeningType === "Zakelijk" ? "bg-teal-700 text-white border-teal-700" : "border-slate-300 text-slate-600"}`}
                >
                  Zakelijke rekening
                </button>
                <button
                  onClick={() => setTypedNow((p) => ({ ...p, eigenRekeningType: "Prive" }))}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${typedNow.eigenRekeningType === "Prive" ? "bg-teal-700 text-white border-teal-700" : "border-slate-300 text-slate-600"}`}
                >
                  Privérekening
                </button>
                <button
                  onClick={() => {
                    if (!typedNow.eigenRekeningIban?.trim() && !typedNow.eigenRekeningType) return;
                    setTypedNow((p) => ({
                      ...p,
                      eigenRekeningenLijst: [...(p.eigenRekeningenLijst ?? eigenRekeningenExtra ?? []), { iban: p.eigenRekeningIban?.trim() || null, accountType: p.eigenRekeningType || null }],
                      eigenRekeningIban: "", eigenRekeningType: null,
                    }));
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
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
                    let lijst = typedNow.eigenRekeningenLijst ?? eigenRekeningenExtra ?? [];
                    if (typedNow.eigenRekeningIban?.trim() || typedNow.eigenRekeningType) {
                      lijst = [...lijst, { iban: typedNow.eigenRekeningIban?.trim() || null, accountType: typedNow.eigenRekeningType || null }];
                      setTypedNow((p) => ({ ...p, eigenRekeningenLijst: lijst, eigenRekeningIban: "", eigenRekeningType: null }));
                    }
                    setEigenRekeningenExtra(lijst);
                    goNext();
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Doorgaan
                </button>
              </div>
            </div>
          )}
          {currentStepId === 16 && (
            <VerwachteNaamVraag
              vraag="Heb je een zakelijke spaarrekening gekoppeld aan je zakelijke rekening? Dit is meestal een pakketkeuze bij dezelfde bank, dus die overboekingen staan gewoon tussen de transacties van je zakelijke rekening zelf."
              placeholder="Naam zoals in je bankexport (bijv. Zakelijke Oranje Spaarrekening)"
              value={typedNow.zakelijkeSpaarNaam ?? ""}
              onChange={(v) => setTypedNow((p) => ({ ...p, zakelijkeSpaarNaam: v }))}
              onJa={(naam) => { setZakelijkeSpaarRekening({ status: "ja", naam: naam || null }); goNext(); }}
              onNee={() => { setZakelijkeSpaarRekening({ status: "nee", naam: null }); goNext(); }}
            />
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
          {currentStepId === 17 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Heeft de zaak een auto?</p>
              <div className="flex flex-wrap gap-2">
                {/* v256 — optie "Beide" verwijderd op verzoek: komt vrijwel nooit voor. De
                    "=== 'beide'"-checks verderop (en in categorySplit.js/boxMapping.js/
                    kmVergoeding.js) blijven bestaan zodat een dossier dat dit al eerder via een
                    ouder dossierbestand had, gewoon blijft werken. */}
                {[
                  { key: "geen", label: "Nee" },
                  { key: "zaak", label: "Auto op de zaak" },
                  { key: "prive", label: "Privéauto zakelijk gebruikt" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setTypedNow((p) => ({ ...p, autoKeuze: opt.key, autoSoort: opt.key === "prive" ? null : p.autoSoort }))}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${typedNow.autoKeuze === opt.key ? "bg-teal-700 text-white border-teal-700" : "border-slate-300 text-slate-600"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {(typedNow.autoKeuze === "zaak" || typedNow.autoKeuze === "beide") && (
                <div className="pt-1">
                  <p className="text-sm text-slate-600 mb-2">Is die auto (van de zaak) gekocht, operational lease, of financial lease?</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "koop", label: "Gekocht (eigendom)" },
                      { key: "operational", label: "Operational lease" },
                      { key: "financial", label: "Financial lease" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setTypedNow((p) => ({ ...p, autoSoort: opt.key }))}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${typedNow.autoSoort === opt.key ? "bg-teal-700 text-white border-teal-700" : "border-slate-300 text-slate-600"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {typedNow.autoSoort === "koop" && (
                    <p className="mt-2 text-xs text-slate-400">
                      Een gekochte auto is een bedrijfsmiddel — geef 'm zo op in het Activa-paneel verderop (voor afschrijving en mogelijke KIA).
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-400">
                Bepaalt op termijn welk fiscaal model voor autokosten geldt (bijtelling bij een auto op de zaak,
                kilometervergoeding bij een privéauto). Per jaar nog te corrigeren in "Persoonlijke aannames"
                als de situatie halverwege het dossier verandert.
              </p>

              <div className="flex gap-2">
                <button
                  disabled={!typedNow.autoKeuze || ((typedNow.autoKeuze === "zaak" || typedNow.autoKeuze === "beide") && !typedNow.autoSoort)}
                  onClick={() => {
                    const status = typedNow.autoKeuze === "geen" ? null : typedNow.autoKeuze;
                    const soort = typedNow.autoKeuze === "prive" ? null : (typedNow.autoSoort || null);
                    setAutoWizardStatus({ status: typedNow.autoKeuze, soort });
                    onSeedAutoStatus(years, status);
                    goNext();
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-40"
                >
                  Doorgaan
                </button>
              </div>
            </div>
          )}
          {currentStepId === 6 && (
            <VerwachteLijstVraag
              vraag="Is er een leaseauto (financieel) in dit bedrijf?"
              toelichting={
                typedNow.autoSoort === "financial"
                  ? "Je gaf net aan dat de auto van de zaak financial lease is — vul hieronder de gegevens in. Kunnen er meerdere zijn (bijv. nog een auto)? Voeg ze dan allemaal toe."
                  : "Kunnen er meerdere zijn (bijv. meerdere auto's)? Voeg ze dan allemaal toe."
              }
              placeholder="Naam leasemaatschappij (bijv. Hiltermann Lease)"
              lijst={typedNow.leaseLijst || []}
              onChangeLijst={(lijst) => setTypedNow((p) => ({ ...p, leaseLijst: lijst }))}
              onKlaar={(lijst) => { setVerwachteLease(lijst.map((naam) => ({ naam, gevonden: false }))); goNext(); }}
            />
          )}
          {currentStepId === 19 && (
            <VerwachteLijstVraag
              vraag="Is er nog een ander financieel leaseobject in dit bedrijf (bijv. een machine of apparatuur, geen auto)?"
              toelichting="Kunnen er meerdere zijn? Voeg ze dan allemaal toe. Gaat het juist om een leaseauto? Die is bij de auto-vraag hiervoor al aan bod gekomen."
              placeholder="Naam leasemaatschappij (bijv. DLL, Alfam)"
              lijst={typedNow.leaseOverigLijst || []}
              onChangeLijst={(lijst) => setTypedNow((p) => ({ ...p, leaseOverigLijst: lijst }))}
              onKlaar={(lijst) => { setVerwachteLeaseOverig(lijst.map((naam) => ({ naam, gevonden: false }))); goNext(); }}
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
                Alleen een signaal; er wordt nog niets automatisch berekend.
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setHeeftVoorraad(true); goNext(); }} className="rounded-lg px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50">Ja</button>
                <button onClick={() => { setHeeftVoorraad(false); goNext(); }} className="rounded-lg px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50">Nee</button>
              </div>
            </div>
          )}
          {currentStepId === 18 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Voldoe je aan het urencriterium voor de zelfstandigenaftrek?</p>
              <p className="text-xs text-slate-400">
                Minimaal 1.225 uur per jaar (en meer dan de helft van je werktijd, tenzij je pas start). Niet zeker? Kies "Onbekend": dan toont de tool beide scenario's naast elkaar.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { onSeedZelfstandigenaftrekStatus(years, "ja"); goNext(); }}
                  className="rounded-lg px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Ja
                </button>
                <button
                  onClick={() => { onSeedZelfstandigenaftrekStatus(years, "nee"); goNext(); }}
                  className="rounded-lg px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Nee
                </button>
                <button
                  onClick={() => { onSeedZelfstandigenaftrekStatus(years, "onbekend"); goNext(); }}
                  className="rounded-lg px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Onbekend — toon beide scenario's
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Per jaar nog te corrigeren in "Persoonlijke aannames" als de situatie halverwege het dossier
                verandert.
              </p>
            </div>
          )}
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
          {currentStepId === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Is dit een zakelijke rekening of een privérekening?</p>
              {sessionFiles.map((fileName) => {
                const continuityMatch = fileContinuity.find((c) => c.fileA === fileName || c.fileB === fileName);
                return (
                  <div key={fileName} className="rounded-lg border border-slate-200 p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="flex-1 min-w-[8rem] text-sm font-medium truncate">{fileName}</span>
                      <button
                        onClick={() => {
                          onAccountTypeChoose(fileName, "Zakelijk");
                          setTypedNow((p) => ({ ...p, [fileName]: "Zakelijk" }));
                          if (sessionFiles.every((f) => f === fileName || typedNow[f])) goNext(); // dit was de laatste — meteen door naar de volgende vraag
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${typedNow[fileName] === "Zakelijk" ? "border-emerald-400 bg-emerald-100 text-emerald-800" : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                      >
                        <Building2 className="h-3.5 w-3.5" /> Zakelijk
                      </button>
                      <button
                        onClick={() => {
                          onAccountTypeChoose(fileName, "Prive");
                          setTypedNow((p) => ({ ...p, [fileName]: "Prive" }));
                          if (sessionFiles.every((f) => f === fileName || typedNow[f])) goNext();
                        }}
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
            </div>
          )}

          {currentStepId === 14 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Onderneem je als eenmanszaak/zzp of vanuit een BV?</p>
              <p className="text-xs text-slate-400">
                Bepaalt de berekening: IB en Zvw (eenmanszaak) of Vpb (BV). Later aanpasbaar.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Omzetting van BV terug naar zzp: bij het kiezen van BV worden KOR/BTW-verlegd
                    // hieronder stilzwijgend op "nee" gezet (niet van toepassing bij een BV) — dat is
                    // geen echt antwoord voor de zzp-situatie, dus die moeten weer als onbeantwoord
                    // gaan gelden. Deze wizard-sessie vraagt ze zelf niet meteen opnieuw (de
                    // wachtrij ligt al vast bij het openen), maar de bestaande checklist/"Werk te
                    // doen" en het BTW-instellingenpaneel signaleren daarna vanzelf dat KOR en
                    // BTW-verlegd nog beantwoord moeten worden.
                    if (rechtsvorm === "bv") {
                      setKorRegeling(null);
                      setBtwVerlegd(null);
                    }
                    setRechtsvorm("zzp");
                    goNext();
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${rechtsvorm === "zzp" ? "bg-teal-700 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  Eenmanszaak/zzp
                </button>
                <button
                  onClick={() => {
                    setRechtsvorm("bv");
                    // Een BV kent geen KOR en heeft normaliter geen BTW-verlegd-regeling nodig — deze
                    // vragen worden hierboven al uit de wachtrij gefilterd zodra rechtsvorm "bv" is,
                    // maar ook de onderliggende waarden zelf op "false" zetten voorkomt dat elders in
                    // de app (aangifte-overzicht, to-do-lijst) deze nog als "nog niet beantwoord" tonen.
                    setKorRegeling(false);
                    setBtwVerlegd(false);
                    goNext();
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${rechtsvorm === "bv" ? "bg-teal-700 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  BV
                </button>
              </div>
            </div>
          )}

          {currentStepId === 15 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Staat er een holding boven deze BV (een holding-werkmaatschappijstructuur)?</p>
              <p className="text-xs text-slate-400">
                Dit dossier volgt de bankrekening van de werkmaatschappij. Het antwoord bepaalt alleen welke toelichting de tool toont (o.a. bij winstuitkering en liquidatieverliesregeling).
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setHeeftHolding(true); goNext(); }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${heeftHolding === true ? "bg-teal-700 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  Ja, holding + werkmaatschappij
                </button>
                <button
                  onClick={() => { setHeeftHolding(false); goNext(); }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${heeftHolding === false ? "bg-teal-700 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  Nee, alleen deze BV
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
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${korRegeling === true ? "bg-teal-700 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  Ja, KOR
                </button>
                <button
                  onClick={() => { setKorRegeling(false); goNext(); }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${korRegeling === false ? "bg-teal-700 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
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
                Standaardinstelling. Kies de situatie die het vaakst voorkomt; per klant later aan te passen bij "Zakelijke tegenpartijen (inkomsten)".
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setBtwVerlegd(true); goNext(); }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${btwVerlegd === true ? "bg-teal-700 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
                >
                  Ja
                </button>
                <button
                  onClick={() => { setBtwVerlegd(false); goNext(); }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${btwVerlegd === false ? "bg-teal-700 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}
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
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
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
                  if ((currentStepId === 12 || currentStepId === 13) && opdrachtgeversGevraagd === null) {
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
          {/* Elke stap met een eigen "Ja"/"Nee"/"Doorgaan"-knop die al opslaat én doorgaat staat
              hieronder in de uitsluitingslijst — een extra "Doorgaan" hieronder zou dubbelop zijn,
              en erger: die knop slaat niets op, dus zou het zojuist gekozen antwoord (of getypte
              tekst) stilletjes negeren. Stap 1 (KOR) en 2 (BTW-verlegd) hoorden hier eerder ten
              onrechte niet bij — die hebben net als de andere Ja/Nee-stappen al hun eigen knoppen,
              dus stond er per ongeluk een tweede, niets-opslaande "Doorgaan"-knop naast. Stap 17
              (Auto) hoorde hier v275/v276 ook nog niet bij: die heeft zelf al een eigen "Doorgaan"-
              knop die autoWizardStatus opslaat vóór goNext() — met deze tweede, niets-opslaande knop
              ernaast leek de auto-vraag beantwoord (de wizard ging door) terwijl autoWizardStatus in
              werkelijkheid null bleef, waardoor de leaseauto-vraag (stap 6) alsnog verscheen alsof er
              nooit "Privéauto"/"Nee" was gekozen. */}
          {![1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19].includes(currentStepId) && (currentStepId !== 0 || allTypedNow) && (currentStepId !== 20 || loadedFileNames.length > 0) && (
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
          Dit wordt het standaardtarief. Andere tarieven kies je per klant of transactie (categorie "Zakelijke inkomsten 0%/9%/21%").
        </p>
        <div className="flex flex-col gap-2">
          {TARIEF_OPTIES.filter((o) => gekozen.includes(o.waarde)).map((o) => (
            <button
              key={o.waarde}
              onClick={() => onKlaar(gekozen, o.waarde)}
              className="rounded-lg px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50 text-left"
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
        Vink aan wat van toepassing is (meer dan één mag). Meestal 21%; 9% voor een beperkte groep; 0% voor vrijgestelde diensten (o.a. zorg, onderwijs, financieel).
      </p>
      <div className="flex flex-col gap-2">
        {TARIEF_OPTIES.map((o) => (
          <label key={o.waarde} className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" checked={gekozen.includes(o.waarde)} onChange={() => toggle(o.waarde)} />
            {o.label}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={doorgaan}
          disabled={gekozen.length === 0}
          className="rounded-lg px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
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
            <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
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
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button onClick={voegToe} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap">
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
        <button onClick={doorgaan} className="rounded-lg px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50">
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
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <p className="text-xs text-slate-400">
        De naam is niet verplicht — je kunt "Ja" ook zonder naam invullen, en de gegevens altijd later aanvullen.
        Weet je de naam wel? Dan kan de tool meteen zoeken of die al in de geladen bestanden voorkomt.
      </p>
      <div className="flex gap-2">
        <button onClick={() => onJa(value.trim())} className="rounded-lg px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50">
          Ja
        </button>
        <button onClick={onNee} className="rounded-lg px-4 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50">
          Nee
        </button>
      </div>
    </div>
  );
}
