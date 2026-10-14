import { useState } from "react";
import { X, Lock, Check } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import { displayCategory } from "../../classification/categories.js";
import ExpandableDescription from "../shared/ExpandableDescription.jsx";
import CategorieSelect from "../shared/CategorieSelect.jsx";
import { betaalSoort } from "../../classification/classify.js";

// V73 — bij een verschil in "Controle zakelijk ↔ privé": toont precies welke boekingen aan de andere
// kant geen tegenboeking hebben (zelfde bedrag, binnen 5 dagen), met per boeking wat je eraan kunt doen.
const REDENEN = [
  { k: "bestand", t: "Bestand van de andere rekening ontbreekt of bestaat niet" },
  { k: "contant", t: "Contant, of via een rekening buiten dit dossier" },
  { k: "eenmalig", t: "Eenmalig, oorzaak bekend (eigen toelichting)" },
];

// 15V7: een niet-gekoppelde boeking kun je "toelichten" als je weet waarom er geen tegenboeking is. De
// indeling (en dus winst/aangifte) verandert niet — alleen de controle telt de boeking niet meer als open.
function ToelichtForm({ aantal, onOpslaan, onAnnuleer }) {
  const [reden, setReden] = useState("bestand");
  const [notitie, setNotitie] = useState("");
  const r = REDENEN.find((x) => x.k === reden);
  const kan = reden !== "eenmalig" || notitie.trim().length > 0;
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-2">
      <select value={reden} onChange={(e) => setReden(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs bg-white">
        {REDENEN.map((x) => <option key={x.k} value={x.k}>{x.t}</option>)}
      </select>
      <input value={notitie} onChange={(e) => setNotitie(e.target.value)} placeholder={reden === "eenmalig" ? "Toelichting (verplicht)" : "Notitie (optioneel)"} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
      <div className="flex gap-2">
        <button disabled={!kan} onClick={() => onOpslaan({ reden, redenTekst: r.t, notitie: notitie.trim() })} className="rounded-full bg-teal-700 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-40">Opslaan{aantal > 1 ? ` (${aantal})` : ""}</button>
        <button onClick={onAnnuleer} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700">Annuleren</button>
      </div>
      <p className="text-[11px] text-slate-400">Wordt in het dossier en het wijzigingslog bewaard. De boeking blijft ingedeeld zoals nu; je kunt de toelichting later intrekken.</p>
    </div>
  );
}

const STANDAARD_UITLEG = { reden: REDENEN[0].k, redenTekst: REDENEN[0].t, notitie: "" };
// release31V2 — voorstel per boeking: een opwaardering van een betaaldienst (PayPal, bunq, ...) komt niet op de privérekening.
const OPWAARDEER_UITLEG = { reden: "contant", redenTekst: "Opgewaardeerd tegoed bij een betaaldienst (bijv. PayPal) — niet op de privérekening", notitie: "" };
const voorstelVoor = (tx, kant) => (kant === "Zakelijk" && betaalSoort(tx) === "opwaardering" ? OPWAARDEER_UITLEG : STANDAARD_UITLEG);
const normIban = (x) => String(x || "").replace(/\s/g, "").toUpperCase();
const ibanTekst = (x) => normIban(x).replace(/(.{4})(?=.)/g, "$1 ");

// release22V10 — één niet-gekoppelde boeking: de voorgestelde toelichting staat er direct bij, met
// "Akkoord" (die toelichting overnemen) en "Andere toelichting" (het formulier).
function Boeking({ tx, kant, sleutel, openSleutel, setOpenSleutel, onToelichten, onRequestChange }) {
  const voorstel = voorstelVoor(tx, kant);
  const [wijzig, setWijzig] = useState(false);
  return (
                <div className="p-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${kant === "Zakelijk" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      {kant === "Zakelijk" ? "Zakelijke rekening" : "Privérekening"}
                    </span>
                    <div className="flex-1 min-w-[9rem]">
                      <p className="font-medium truncate">{tx.counterparty || tx.description || "(geen omschrijving)"}</p>
                      <ExpandableDescription tx={tx} className="text-[11px] text-slate-400" />
                      <p className="text-[11px] text-slate-400 font-mono select-all">
                        {tx.date.toLocaleDateString("nl-NL")} · {displayCategory(tx.category)} · {tx.counterpartyIban || "geen tegenrekening"}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-slate-700 w-24 text-right">{eur(tx.amount)}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {onToelichten && (
                      <>
                        <button onClick={() => onToelichten([{ sleutel }], voorstel)} className="rounded-lg bg-teal-700 px-2 py-1 text-xs font-medium text-white hover:bg-teal-800">Akkoord</button>
                        <button onClick={() => setOpenSleutel(openSleutel === sleutel ? null : sleutel)} className="rounded-lg border border-teal-600 bg-white px-2 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50">Andere toelichting</button>
                      </>
                    )}
                    {/* release31V2 — klopt de categorie zelf niet (bijv. geen privé-opname maar een zakelijke uitgave)? */}
                    {onRequestChange && !tx.transferLocked && (
                      wijzig ? (
                        <CategorieSelect value={tx.category} onChange={(c) => { setWijzig(false); onRequestChange(tx, { category: c, type: tx.type }); }} className="rounded-lg border border-slate-300 px-2 py-1 text-xs max-w-[16rem]" />
                      ) : (
                        <button onClick={() => setWijzig(true)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Categorie wijzigen</button>
                      )
                    )}
                    {kant === "Prive" && !tx.transferLocked ? (
                      <>
                        <button
                          onClick={() => onRequestChange(tx, { category: "Interne overboeking", type: tx.type })}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          title="Het geld kwam niet van de zakelijke rekening: telt dan niet mee in deze controle"
                        >
                          Indelen als interne overboeking
                        </button>
                        <span className="text-[11px] text-slate-400">Kwam dit geld niet van zakelijk (bijv. terugbetaling)? Dan hoort het hier niet.</span>
                      </>
                    ) : kant === "Prive" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><Lock className="h-3 w-3" /> Herkend op rekeningnummer — de categorie ligt vast. Controleer of het zakelijke bankbestand compleet is.</span>
                    ) : voorstel === OPWAARDEER_UITLEG ? (
                      <span className="text-[11px] text-slate-500">
                        Dit is een opwaardering van een betaaldienst: het geld staat daarna als tegoed bij die dienst, niet op de privérekening.
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        Op de privérekening staat geen ontvangst met dit bedrag. Het geld ging waarschijnlijk naar een andere eigen rekening: laad het bestand van die rekening, of controleer of de privé-afschriften van deze periode compleet zijn.
                      </span>
                    )}
                  </div>
                  {onToelichten && openSleutel !== sleutel && (
                    <p className="mt-1 text-[11px] text-slate-500">Voorgestelde toelichting bij "Akkoord": <span className="text-slate-700">{voorstel.redenTekst}</span></p>
                  )}
                  {openSleutel === sleutel && (
                    <ToelichtForm aantal={1} onAnnuleer={() => setOpenSleutel(null)} onOpslaan={(u) => { onToelichten([{ sleutel }], u); setOpenSleutel(null); }} />
                  )}
                </div>
  );
}

export default function OnverklaardeOverboekingenModal({ items, toegelicht = [], buitenPeriode = [], eenzijdigTekst = "", onToelichten, onHerroepToelichting, diff, jaar, onRequestChange, onClose, bekendeIbans = [], onEigenRekeningToevoegen }) {
  const [openSleutel, setOpenSleutel] = useState(null); // sleutel van de boeking, "ALLES" of "GROEP:<iban>"
  const [groepOpen, setGroepOpen] = useState({});
  // release22V10 — boekingen met dezelfde tegenrekening (2 of meer) als groep bovenaan, met één keer
  // akkoord of "toevoegen als eigen rekening"; de rest blijft per boeking.
  const perIban = new Map();
  for (const it of items) {
    const k = normIban(it.tx.counterpartyIban);
    if (!k) continue;
    if (!perIban.has(k)) perIban.set(k, []);
    perIban.get(k).push(it);
  }
  const groepen = [...perIban.entries()].filter(([, l]) => l.length >= 2).sort((a, b) => b[1].length - a[1].length);
  const inGroep = new Set(groepen.flatMap(([, l]) => l.map((x) => x.sleutel)));
  const losse = items.filter((x) => !inGroep.has(x.sleutel));
  const bekend = new Set(bekendeIbans.map(normIban));
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <p className="text-sm font-semibold text-slate-800">
            Niet-gekoppelde overboekingen zakelijk ↔ privé {jaar} ({items.length})
          </p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 pt-3 text-xs text-slate-600 shrink-0">
          Verschil: <strong className="font-mono">{eur(diff)}</strong>. Dit zijn de boekingen waarvan aan de andere kant geen boeking met
          hetzelfde bedrag (binnen 5 dagen) staat. Als je deze goed indeelt of het ontbrekende bestand laadt, wordt het verschil kleiner.
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {/* release22V10 — "Alles toelichten" bovenaan, zodat het formulier direct in beeld komt */}
          {onToelichten && items.length > 1 && (
            <div className="mb-3">
              <button onClick={() => setOpenSleutel(openSleutel === "ALLES" ? null : "ALLES")} className="rounded-full border border-teal-600 bg-white px-3 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-50">Alles toelichten ({items.length})</button>
              {openSleutel === "ALLES" && (
                <ToelichtForm aantal={items.length} onAnnuleer={() => setOpenSleutel(null)} onOpslaan={(u) => { onToelichten(items.map((x) => ({ sleutel: x.sleutel })), u); setOpenSleutel(null); }} />
              )}
            </div>
          )}
          {groepen.map(([iban, lijst]) => {
            const totaal = lijst.reduce((a, x) => a + x.tx.amount, 0);
            const naam = lijst[0].tx.counterparty || lijst[0].tx.description || "";
            const kanten = [...new Set(lijst.map((x) => x.kant))];
            const kanToevoegen = onEigenRekeningToevoegen && !bekend.has(iban);
            const gk = `GROEP:${iban}`;
            return (
              <div key={iban} className="mb-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3 text-xs">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="flex-1 min-w-[12rem]">
                    <p className="font-semibold text-slate-800">{lijst.length} boekingen met tegenrekening <span className="font-mono">{ibanTekst(iban)}</span></p>
                    <p className="text-slate-500">{naam}{naam ? " · " : ""}{kanten.map((k) => (k === "Zakelijk" ? "zakelijke rekening" : "privérekening")).join(" en ")} · totaal <span className="font-mono">{eur(totaal)}</span></p>
                  </div>
                </div>
                {onToelichten && openSleutel !== gk && (
                  <p className="mt-1.5 text-[11px] text-slate-500">Voorgestelde toelichting bij "Alle akkoord": <span className="text-slate-700">{STANDAARD_UITLEG.redenTekst}</span></p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {kanToevoegen && (
                    <button onClick={() => {
                      onEigenRekeningToevoegen(iban, kanten.includes("Zakelijk") ? "Prive" : "Zakelijk");
                      onToelichten?.(lijst.map((x) => ({ sleutel: x.sleutel })), { reden: "contant", redenTekst: "Eigen rekening buiten dit dossier (niet geladen)", notitie: ibanTekst(iban) });
                    }} className="rounded-lg bg-teal-700 px-2 py-1 text-xs font-medium text-white hover:bg-teal-800" title="Wordt opgenomen bij Instellingen → Eigen rekeningen (opgegeven, niet geladen)">
                      Toevoegen als eigen rekening
                    </button>
                  )}
                  {onToelichten && (
                    <button onClick={() => onToelichten(lijst.map((x) => ({ sleutel: x.sleutel })), { ...STANDAARD_UITLEG, notitie: `Tegenrekening ${ibanTekst(iban)}` })}
                      className={`rounded-lg px-2 py-1 text-xs font-medium ${kanToevoegen ? "border border-teal-600 bg-white text-teal-800 hover:bg-teal-50" : "bg-teal-700 text-white hover:bg-teal-800"}`}>
                      Alle akkoord ({lijst.length})
                    </button>
                  )}
                  {onToelichten && (
                    <button onClick={() => setOpenSleutel(openSleutel === gk ? null : gk)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Andere toelichting</button>
                  )}
                  <button onClick={() => setGroepOpen((p) => ({ ...p, [iban]: !p[iban] }))} className="text-[11px] text-slate-500 underline decoration-dotted">
                    {groepOpen[iban] ? "Boekingen verbergen" : "Boekingen tonen"}
                  </button>
                </div>
                {openSleutel === gk && (
                  <ToelichtForm aantal={lijst.length} onAnnuleer={() => setOpenSleutel(null)} onOpslaan={(u) => { onToelichten(lijst.map((x) => ({ sleutel: x.sleutel })), u); setOpenSleutel(null); }} />
                )}
                {groepOpen[iban] && (
                  <div className="mt-2 divide-y divide-slate-100 border border-slate-100 rounded-lg bg-white">
                    {lijst.map(({ tx, kant, sleutel }) => (
                      <Boeking key={tx.id} tx={tx} kant={kant} sleutel={sleutel} openSleutel={openSleutel} setOpenSleutel={setOpenSleutel} onToelichten={onToelichten} onRequestChange={onRequestChange} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {items.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">{buitenPeriode.length > 0 ? "Alle te controleren boekingen zijn gekoppeld." : "Alle boekingen zijn gekoppeld."}</p>
          ) : losse.length === 0 ? null : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {losse.map(({ tx, kant, sleutel }) => (
                <Boeking key={tx.id} tx={tx} kant={kant} sleutel={sleutel} openSleutel={openSleutel} setOpenSleutel={setOpenSleutel} onToelichten={onToelichten} onRequestChange={onRequestChange} />
              ))}
            </div>
          )}
          {/* release31V4 — buiten de periode die beide rekeningen dekken: niet te controleren, geen open punt */}
          {buitenPeriode.length > 0 && (
            <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50">
              <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700">
                Buiten de gezamenlijke periode — niet te controleren ({buitenPeriode.length})
              </summary>
              <p className="px-3 pb-2 text-[11px] text-slate-500">
                {eenzijdigTekst ? `Geladen: ${eenzijdigTekst}. ` : ""}In die maanden is de andere rekening niet geladen, dus er kan geen tegenboeking zijn. Deze boekingen tellen niet als open punt. Laad je de ontbrekende afschriften alsnog, dan worden ze vanzelf gecontroleerd. De indeling (categorie) verandert hier niet door.
              </p>
              <div className="divide-y divide-slate-100 border-t border-slate-200 bg-white">
                {buitenPeriode.map(({ tx, kant, sleutel }) => (
                  <div key={sleutel} className="p-2.5 text-xs flex flex-wrap items-center gap-2">
                    <div className="flex-1 min-w-[10rem]">
                      <p className="font-medium truncate">{tx.counterparty || tx.description || "(geen omschrijving)"} <span className="text-slate-400 font-normal">· {kant === "Zakelijk" ? "zakelijk" : "privé"} · {tx.date.toLocaleDateString("nl-NL")} · {displayCategory(tx.category)}</span></p>
                    </div>
                    <span className="shrink-0 font-mono text-slate-700 w-24 text-right">{eur(tx.amount)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
          {toegelicht.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-600" /> Toegelicht ({toegelicht.length})</p>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {toegelicht.map(({ tx, kant, sleutel, uitleg }) => (
                  <div key={sleutel} className="p-2.5 text-xs flex flex-wrap items-center gap-2">
                    <div className="flex-1 min-w-[10rem]">
                      <p className="font-medium truncate">{tx.counterparty || tx.description || "(geen omschrijving)"} <span className="text-slate-400 font-normal">· {kant === "Zakelijk" ? "zakelijk" : "privé"} · {tx.date.toLocaleDateString("nl-NL")}</span></p>
                      <p className="text-[11px] text-slate-500">{uitleg?.redenTekst}{uitleg?.notitie ? ` — ${uitleg.notitie}` : ""}</p>
                    </div>
                    <span className="shrink-0 font-mono text-slate-700 w-24 text-right">{eur(tx.amount)}</span>
                    {uitleg?.automatisch
                      ? <span className="text-[11px] text-slate-400" title="Automatisch: deze rekening staat bij Instellingen → Eigen rekeningen als opgegeven (niet geladen). Verwijder hem daar om dit terug te draaien.">automatisch</span>
                      : onHerroepToelichting && <button onClick={() => onHerroepToelichting(sleutel)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Intrekken</button>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
