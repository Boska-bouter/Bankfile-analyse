import { useState } from "react";
import { ChevronDown, ChevronRight, Check, AlertCircle } from "lucide-react";
import { MAANDEN } from "../../tax/controleSuggesties.js";
import { eur } from "../../utils/amounts.js";
import { mainCategoryOf } from "../../classification/categories.js";
import CategorieSelect from "../shared/CategorieSelect.jsx";

const KLEUR = { data: "bg-emerald-400", "leeg-ok": "bg-slate-300", leeg: "bg-amber-400", buiten: "bg-slate-100" };
const dat = (d) => new Date(d).toLocaleDateString("nl-NL");
const ymLabel = (s) => { const [y, m] = s.split("-"); return `${MAANDEN[Number(m) - 1]} ${y}`; };

function Knop({ children, onClick, primair }) {
  return <button type="button" onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-semibold ${primair ? "bg-teal-700 text-white hover:bg-teal-800" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{children}</button>;
}

// C1 + C2 + C3 in één opklapbare sectie. Zonder meldingen is hij dicht en groen.
// release22V9 — per terugkerende reeks: afwijkende betalingen mét hun huidige categorie, het voorstel
// (meest voorkomende categorie), "alle op: [eigen keuze]" en "verdeling laten zoals hij is".
function TerugkerendItem({ t, onBevestig, onToepassenTerugkerend, onToepassenTerugkerendAlle }) {
  const [keuze, setKeuze] = useState("");
  const toon = t.afwijkend.slice(0, 6);
  return (
    <div className="rounded-lg bg-white border border-slate-100 p-3 mb-2">
      <p><strong>{t.naam}</strong> — {t.aantal}x {t.periodiek}, ongeveer {eur(t.gemBedrag)}</p>
      <p className="text-slate-500">Nu ingedeeld als: {t.verdeling.map((v) => `${v.categorie} (${v.aantal}x)`).join(", ")}</p>
      <p className="mt-1 text-slate-600">Afwijkend van {t.hoofdCategorie}:</p>
      <ul className="text-slate-500">
        {toon.map((a) => <li key={a.id}>{dat(a.date)} {eur(Math.abs(a.amount))} — nu: {a.category}</li>)}
        {t.afwijkend.length > toon.length && <li>+ {t.afwijkend.length - toon.length} meer</li>}
      </ul>
      {t.nietInVoorstel > 0 && (
        <p className="text-slate-400">{t.nietInVoorstel} andere betaling{t.nietInVoorstel === 1 ? "" : "en"} met een duidelijk ander bedrag of handmatig ingedeeld {t.nietInVoorstel === 1 ? "blijft" : "blijven"} buiten het voorstel.</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Knop primair onClick={() => onToepassenTerugkerend(t)}>Zet {t.afwijkend.length} op {t.hoofdCategorie}</Knop>
        {onToepassenTerugkerendAlle && (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-slate-500">of alle {t.aantal} op:</span>
            <CategorieSelect value={keuze || null} onChange={setKeuze} placeholder="kies categorie…" className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs max-w-[16rem]" />
            {keuze && (
              <Knop primair onClick={() => {
                onToepassenTerugkerendAlle(t, keuze, mainCategoryOf(keuze) === "Privé" ? "Prive" : t.hoofdType);
                setKeuze("");
              }}>Toepassen</Knop>
            )}
          </span>
        )}
        <Knop onClick={() => onBevestig(`terug|${t.key}`)}>Verdeling laten zoals hij is</Knop>
      </div>
    </div>
  );
}

// release33V7 — bijschrijvingen in een kostencategorie (vaak omzet of terugbetalingen die verkeerd staan).
function KostenInItem({ k, onBevestig, onVerplaats }) {
  const [keuze, setKeuze] = useState({});
  return (
    <div className="rounded-lg bg-white border border-slate-100 p-3 mb-2">
      <p><strong>{k.categorie} {k.jaar}</strong>: {k.aantalIn}× bijgeschreven, samen {eur(k.in)}; betaald {eur(k.uit)}.{k.positief ? <> Per saldo <strong>{eur(k.saldo)} ontvangen</strong> — voor een kostenpost is dat ongebruikelijk.</> : " Veel bijschrijvingen voor een kostenpost."}</p>
      <p className="mt-1 text-slate-600">Grootste bijschrijvingen:</p>
      {k.tegenpartijen.map((t) => (
        <div key={t.naam} className="mt-1 flex flex-wrap items-center gap-2">
          <span className="flex-1 min-w-[14rem]">{t.naam} — {t.aantal}× samen {eur(t.bedrag)}</span>
          {onVerplaats && (
            <span className="inline-flex items-center gap-1.5">
              <Knop primair onClick={() => onVerplaats(t.ids, "Zakelijke inkomsten", t.naam)}>Zet op Zakelijke inkomsten</Knop>
              <span className="text-slate-500">of op:</span>
              <CategorieSelect value={keuze[t.naam] || null} onChange={(v) => setKeuze((p) => ({ ...p, [t.naam]: v }))} placeholder="kies categorie…" className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs max-w-[14rem]" />
              {keuze[t.naam] && <Knop primair onClick={() => { onVerplaats(t.ids, keuze[t.naam], t.naam); setKeuze((p) => ({ ...p, [t.naam]: "" })); }}>Toepassen</Knop>}
            </span>
          )}
        </div>
      ))}
      <div className="mt-2"><Knop onClick={() => onBevestig(k.key)}>Klopt zo (bijv. terugbetalingen)</Knop></div>
    </div>
  );
}

// beide-V11R7 — omzet in het factuurjaar (classification/factuurjaar.js): wat er per jaar uit begin volgend jaar bij is gekomen.
function FactuurjaarBlok({ overzicht, uit, onFactuurjaar, onFactuurjaarBoeking }) {
  const [toon, setToon] = useState(null);
  if (!overzicht || overzicht.length === 0) return null;
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-900">
      <h4 className="font-semibold mb-1">Omzet in het jaar van de factuur</h4>
      <p className="text-sky-800 mb-2">
        Ontvangsten in januari–juni met een eigen factuurnummer van het jaar ervoor tellen als omzet van dat jaar (factuurstelsel, zoals een accountant
        rekent; btw in het vierde kwartaal). Alleen als dat jaar ook geladen is.
      </p>
      {overzicht.map((r) => (
        <div key={r.jaar} className="rounded-md bg-white border border-sky-100 p-2 mb-1.5">
          <p>
            <strong>{r.jaar}</strong>: {r.aantal} ontvangst{r.aantal === 1 ? "" : "en"} uit {r.jaar + 1}, samen <strong>{eur(r.bedrag)}</strong> (incl. btw), {uit ? "zou" : "telt"} mee in {r.jaar}
            {r.aantalUit > 0 && !uit && <> · {r.aantalUit} bewust in {r.jaar + 1} gelaten ({eur(r.bedragUit)})</>}
            {" "}<button type="button" className="underline" onClick={() => setToon(toon === r.jaar ? null : r.jaar)}>{toon === r.jaar ? "verbergen" : "bekijken"}</button>
          </p>
          {toon === r.jaar && (
            <ul className="mt-1 space-y-0.5 text-slate-700">
              {r.items.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2">
                  <span className="flex-1 min-w-[14rem]">{dat(t.date)} · {eur(t.amount)} · {t.counterparty || "(geen naam)"} · <span className="text-slate-500">{t.description}</span></span>
                  {!uit && (t.factuurjaarVerschoven
                    ? <Knop onClick={() => onFactuurjaarBoeking(t.id, true)}>Toch in {r.jaar + 1}</Knop>
                    : <Knop onClick={() => onFactuurjaarBoeking(t.id, false)}>In {r.jaar} tellen</Knop>)}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <div className="mt-1.5">
        {uit
          ? <Knop primair onClick={() => onFactuurjaar(false)}>Omzet in het factuurjaar tellen</Knop>
          : <Knop onClick={() => onFactuurjaar(true)}>Alles in het jaar van ontvangst tellen (kasstelsel)</Knop>}
      </div>
    </div>
  );
}

export default function AanvullendeControles({ data, onBevestig, onBevestigAlles, onToepassenTerugkerend, onToepassenTerugkerendAlle, onVerplaatsBijschrijvingen, onFactuurjaar, onFactuurjaarBoeking }) {
  const [openOverride, setOpenOverride] = useState(null);
  if (!data) return null;
  const { dekking, terugkerend, sprongen } = data;
  const kostenIn = data.kostenIn || [];
  // 15V7: jaarverschillen (sprongen) zijn "inzicht" en tellen niet mee als punt om te bekijken.
  const totaal = (dekking.aantalVerdacht > 0 ? 1 : 0) + terugkerend.length + kostenIn.length;
  const gatenAlleen = !!data.gatenAlleen;
  const open = openOverride === null ? totaal > 0 : openOverride;
  const inzichtTekst = sprongen.length > 0 ? ` · inzicht: ${sprongen.length}` : "";
  return (
    <section className={`rounded-xl border-2 ${totaal > 0 ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <button onClick={() => setOpenOverride(!open)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
        {totaal > 0 ? <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" /> : <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
        <span className={`text-sm font-semibold ${totaal > 0 ? "text-amber-900" : "text-emerald-900"}`}>
          Aanvullende controles — {totaal > 0 ? `${totaal} punt${totaal === 1 ? "" : "en"} om te bekijken` : "geen bijzonderheden"}{inzichtTekst}
        </span>
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 text-xs text-slate-700">
          <p className="text-slate-500">Dit zijn suggesties, geen verplichte stappen. "Klopt zo" en "Verdeling laten zoals hij is" laten alles ongewijzigd; de app onthoudt alleen dat het is bekeken.</p>

          <div>
            <h4 className="font-semibold text-slate-800 mb-1.5">Dekking per rekening</h4>
            {dekking.rekeningen.map((r) => (
              <div key={r.key} className="rounded-lg bg-white border border-slate-100 p-3 mb-2">
                <p className="font-semibold mb-1.5">{r.label}{r.type ? ` · ${r.type === "Zakelijk" ? "zakelijk" : "privé"}` : ""}</p>
                <div className="space-y-0.5">
                  {Object.entries(r.jaren).map(([jaar, maanden]) => (
                    <div key={jaar} className="flex items-center gap-2">
                      <span className="w-9 text-slate-500">{jaar}</span>
                      <div className="flex gap-0.5">
                        {maanden.map((st, i) => <span key={i} title={`${MAANDEN[i]} ${jaar}: ${st === "data" ? "transacties aanwezig" : st === "leeg-ok" ? "geen mutaties (klopt met saldo)" : st === "leeg" ? "geen transacties — ontbreekt er een afschrift?" : "buiten de geladen periode"}`} className={`h-3.5 w-5 rounded-sm ${KLEUR[st]}`} />)}
                      </div>
                    </div>
                  ))}
                </div>
                {r.verdacht.length > 0 ? (
                  <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2">
                    <p>Geen transacties in <strong>{r.verdachtLabels.join(", ")}</strong>{r.heeftSaldo ? "" : " (dit bestand heeft geen saldokolom om dat te controleren)"}. Ontbreekt er een afschrift?</p>
                    <div className="mt-1.5"><Knop onClick={() => r.verdacht.forEach((m) => onBevestig(`dekking|${r.key}|${m}`))}>Klopt zo, geen mutaties</Knop></div>
                  </div>
                ) : <p className="mt-1.5 text-emerald-700">Geen gaten gevonden.</p>}
              </div>
            ))}
            {/* release31V4 — maanden waarin maar één van beide rekeningen geladen is */}
            {(data.eenzijdig || []).length > 0 && (
              <div className="mb-2 rounded-md border border-sky-200 bg-sky-50 p-2 text-sky-900">
                {data.eenzijdig.map((e) => (
                  <p key={e.tekst + e.alleen}><strong>{e.tekst}</strong>: alleen {e.alleen} geladen.</p>
                ))}
                <p className="mt-1 text-sky-800">In die maanden kan de controle zakelijk ↔ privé overboekingen niet koppelen; ze tellen daar niet als open punt. De indeling in categorieën werkt gewoon. Zijn de afschriften van de andere rekening er, laad ze dan ook.</p>
              </div>
            )}
            <p className="text-xs text-slate-400">Groen = transacties · grijs = geen mutaties (saldo klopt) · amber = controleren · licht = buiten de geladen periode</p>
          </div>

          <FactuurjaarBlok overzicht={data.factuurjaar} uit={data.factuurjaarUit} onFactuurjaar={onFactuurjaar} onFactuurjaarBoeking={onFactuurjaarBoeking} />

          <div>
            <h4 className="font-semibold text-slate-800 mb-1.5">Terugkerende betalingen in verschillende categorieën</h4>
            {terugkerend.length === 0 ? <p className="text-emerald-700">Geen afwijkingen gevonden.</p> : terugkerend.map((t) => (
              <TerugkerendItem key={t.key} t={t} onBevestig={onBevestig} onToepassenTerugkerend={onToepassenTerugkerend} onToepassenTerugkerendAlle={onToepassenTerugkerendAlle} />
            ))}
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 mb-1.5">Bijschrijvingen in een kostencategorie</h4>
            {kostenIn.length === 0 ? <p className="text-emerald-700">Geen kostencategorieën met opvallende bijschrijvingen.</p> : kostenIn.map((k) => (
              <KostenInItem key={k.key} k={k} onBevestig={onBevestig} onVerplaats={onVerplaatsBijschrijvingen} />
            ))}
            <p className="text-xs text-slate-400">Gemeld als een kostencategorie in een jaar per saldo positief is met minstens € 1.000 aan bijschrijvingen, of minstens 10 bijschrijvingen van samen € 1.000 of meer heeft. Vaak omzet of terugbetalingen die in de verkeerde categorie staan.</p>
          </div>

          <div className={sprongen.length > 0 ? "rounded-lg border border-slate-200 bg-slate-50 p-3" : ""}>
            <h4 className="font-semibold text-slate-800 mb-1.5">{gatenAlleen ? "Inzicht: mogelijk ontbrekende vaste betalingen" : "Inzicht: grote verschillen tussen jaren (zakelijke kosten)"}</h4>
            {sprongen.length === 0 ? <p className="text-emerald-700">{gatenAlleen ? "Geen vaste betalingen gevonden die in een jaar ontbreken." : "Geen opvallende sprongen tussen volledige jaren."}</p> : (
              <p className="text-slate-500 mb-2">Alleen ter info — verschillen tussen jaren zijn bij een eigen onderneming normaal (zakelijk en privé lopen vaak door elkaar). Hier hoeft niets mee te gebeuren.</p>
            )}
            {sprongen.map((s) => (
              <div key={s.key} className="rounded-lg bg-white border border-slate-100 p-3 mb-2 flex flex-wrap items-center gap-2">
                <p className="flex-1 min-w-[16rem]">
                  <strong>{s.categorie}</strong>: {eur(s.vorigTotaal)} in {s.vorig} → {eur(s.nuTotaal)} in {s.nu}
                  {s.soort === "verdwenen" && (gatenAlleen ? " — in dit jaar geen boeking, terwijl het jaar ervoor en erna wél boekingen heeft. Ontbreken er betalingen?" : " — in dit jaar geen enkele boeking. Ontbreken er betalingen of is dit gestopt?")}
                  {s.soort === "nieuw" && " — nieuw dit jaar. Klopt de categorie?"}
                  {s.soort === "hoger" && ` — ${eur(s.verschil)} hoger.`}
                  {s.soort === "lager" && ` — ${eur(-s.verschil)} lager.`}
                </p>
                <Knop onClick={() => onBevestig(s.key)}>Klopt zo</Knop>
              </div>
            ))}
            {sprongen.length > 1 && (
              <div className="mb-2"><Knop primair onClick={() => (onBevestigAlles ? onBevestigAlles(sprongen.map((s) => s.key)) : sprongen.forEach((s) => onBevestig(s.key)))}>Alles klopt zo ({sprongen.length})</Knop></div>
            )}
            <p className="text-xs text-slate-400">{gatenAlleen ? "Alleen volledige, opeenvolgende jaren; alleen vaste betalingen (minimaal 3 boekingen in het jaar ervoor en erna) die in één jaar helemaal ontbreken; maximaal 3 per jaar." : "Alleen volledige, opeenvolgende jaren; alleen grote verschillen (minimaal €750 én 40%); maximaal 5 per jaar."}</p>
          </div>
        </div>
      )}
    </section>
  );
}
