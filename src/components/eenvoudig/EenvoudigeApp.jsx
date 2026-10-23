import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Upload, Download, Save, ClipboardList, ChevronLeft, FileSpreadsheet, FileText, FolderOpen, FolderPlus, ChevronDown, BookOpen, CalendarDays } from "lucide-react";
import UitlegEenvoudig from "./UitlegEenvoudig.jsx";
import MijnAntwoorden from "./MijnAntwoorden.jsx";
import { eur } from "../../utils/amounts.js";
import { mainCategoryOf } from "../../classification/categories.js";
import CategorieSelect from "../shared/CategorieSelect.jsx";
import { metBegrippen } from "../shared/Begrip.jsx";
import {
  berekenBetrouwbaarheid, bouwVragen, categorieVoorAntwoord, voorstelVoor, maakBevestigd,
} from "../../calc/eenvoudig.js";

// nieuw-V1R01 — eenvoudige weergave voor niet-deskundigen: vier stappen (Gegevens · Nakijken · Uitkomst · Bewaren),
// één vraag tegelijk, een betrouwbaarheidsbalk naar bedrag en een uitkomst in gewone taal. Rekent met precies
// dezelfde gegevens als de uitgebreide weergave; antwoorden worden gewone keuzes per tegenpartij.
const STAPPEN = ["Gegevens", "Nakijken", "Uitkomst", "Bewaren"];
const OORDEEL = {
  betrouwbaar: { tekst: "Betrouwbaar", cls: "bg-emerald-100 text-emerald-800" },
  redelijk: { tekst: "Redelijk", cls: "bg-amber-100 text-amber-800" },
  onzeker: { tekst: "Nog onzeker", cls: "bg-rose-100 text-rose-800" },
  geen: { tekst: "Geen gegevens", cls: "bg-slate-100 text-slate-600" },
};
const KOPKNOP = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm";
const r0 = (v) => eur(Math.round(v || 0)).replace(/,00$/, "");

function Balk({ b, groot = false }) {
  return (
    <div className={`flex ${groot ? "h-3" : "h-2.5"} w-full overflow-hidden rounded-full bg-slate-200`}>
      <i className="block bg-emerald-600" style={{ width: `${b.herkend}%` }} />
      <i className="block bg-amber-500" style={{ width: `${b.geschat}%` }} />
      <i className="block bg-rose-600" style={{ width: `${b.onbekend}%` }} />
    </div>
  );
}

function Zekerheid({ b, compact = false, nogVragen = null, onzekerTekst = null }) {
  const o = OORDEEL[b.oordeel];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <b className="text-sm">Hoe zeker is de uitkomst?</b>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${o.cls}`}>{o.tekst}</span>
      </div>
      <div className="my-2.5"><Balk b={b} groot={!compact} /></div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-600" /><b>{b.herkend}%</b> herkend</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />{b.geschat}% geschat</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-600" />{b.onbekend}% nog onbekend</span>
        <span className="text-slate-400">(voortgang, naar bedrag)</span>
      </div>
      {b.oordeel !== "geen" && (
        <p className="mt-2 text-xs text-slate-600">{b.onzeker > 0 ? <>Nog <b>{r0(b.onzeker)}</b> onzeker; {onzekerTekst ? `${onzekerTekst}.` : <>de belasting kan daardoor ongeveer <b>{r0(b.belastingAfwijking)}</b> afwijken.</>}</> : "Niets meer onzeker."}</p>
      )}
      {nogVragen != null && b.oordeel !== "betrouwbaar" && b.oordeel !== "geen" && (
        <p className="mt-1 text-xs text-slate-500">{nogVragen > 0 ? <>Nog ongeveer <b>{nogVragen} vra{nogVragen === 1 ? "ag" : "gen"}</b> tot Betrouwbaar (hooguit {r0(b.grens.betrouwbaar)} onzeker).</> : "Beantwoord de overgeslagen vragen om verder te komen."}</p>
      )}
    </div>
  );
}

function Rij({ label, waarde, sterk = false }) {
  return <div className={`flex justify-between border-b border-slate-100 py-1.5 text-sm ${sterk ? "font-semibold" : ""}`}><span>{label}</span><b className="shrink-0 whitespace-nowrap font-mono">{waarde}</b></div>;
}

export default function EenvoudigeApp({
  klantNaam, jaar, jaren = [], onJaar, bestanden = [], classified, reviewedOverigKeys, reviewedPersonKeys,
  onAntwoord, onBestandToevoegen, onBasisvragen, onOpslaan, onUitgebreid, fiscaal, jaarSummary, isBV, onAangifte, onSamenvatting, onMaandoverzicht, opgeslagen = false, onDossierLaden, onNieuwDossier, jaarKeuze, gezien = null, onGezien, onToegangAanvragen, toegangInfo = null, onUitloggen = null, abonnement = null, onAbonnementen = null, onUitlegZichtbaar = null, antwoordenLijst = [], onWijzigAntwoord, onWisAntwoord, onRijAntwoord,
  teksten = null, uitkomst = null, // beide-V1R8 — privédossier: andere keuzes/teksten (modus/prive/eenvoudig.js) en eigen uitkomst
  extraGegevens = null, // beide-V2R2 — privédossier: eigen rekeningen (spaarrekening) opgeven in stap 1
}) {
  // nieuw-V3R1 — corrigeren: "← Vorige vraag" (geschiedenis van deze sessie) en "Mijn antwoorden" (alle keuzes).
  const [geschiedenis, setGeschiedenis] = useState([]); // [{ vraag, keuze }]
  const [terugIdx, setTerugIdx] = useState(null);
  const [gekozenKeys, setGekozenKeys] = useState([]);
  const [antwoordenOpen, setAntwoordenOpen] = useState(false);
  const [dossierMenu, setDossierMenu] = useState(false);
  // nieuw-V3R0 — uitleg: de eerste keer (per gebruiker, per apparaat) vanzelf open, daarna via de knop "Uitleg".
  const uitlegSleutel = `bankoverzicht.uitlegEenvoudigGezien${toegangInfo?.email ? `:${toegangInfo.email}` : ""}`;
  const [uitleg, setUitleg] = useState(null); // null | "eerste" | "knop"
  useEffect(() => {
    if (toegangInfo?.status === "laden") return;
    try { if (!localStorage.getItem(uitlegSleutel)) setUitleg("eerste"); } catch { /* geen opslag: niet automatisch tonen */ }
  }, [uitlegSleutel, toegangInfo?.status]);
  // nieuw-V7R0 — App laat de wizard pas zien als deze uitleg dicht is (anders stond de wizard eroverheen).
  useEffect(() => { onUitlegZichtbaar?.(!!uitleg); }, [uitleg]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onUitlegZichtbaar?.(false), []); // eslint-disable-line react-hooks/exhaustive-deps
  const sluitUitleg = () => { try { localStorage.setItem(uitlegSleutel, "1"); } catch { /* geen opslag */ } setUitleg(null); };
  const [toonBoekingen, setToonBoekingen] = useState(false);
  // nieuw-V1R03 — geen vaste volgorde meer: je begint bij Nakijken als er nog vragen zijn, anders direct bij de
  // Uitkomst (een volledig nagekeken dossier hoeft niet opnieuw doorlopen te worden). Elke stap blijft aanklikbaar.
  const [gekozenStap, setStap] = useState(null);
  const [overgeslagen, setOvergeslagen] = useState([]);
  const [gedaan, setGedaan] = useState({});
  const maxTotaal = useRef({}); // vast totaal per jaar, zodat "Vraag x van y" niet verspringt // aantal beantwoorde vragen per jaar (voor de voortgangsbalk)
  const [anders, setAnders] = useState("");
  const bevestigd = useMemo(() => maakBevestigd(reviewedOverigKeys, reviewedPersonKeys), [reviewedOverigKeys, reviewedPersonKeys]);
  const omzet = jaarSummary?.zakelijkeInkomstenNetto || 0;
  const b = useMemo(() => berekenBetrouwbaarheid(classified, jaar, bevestigd, omzet), [classified, jaar, bevestigd, omzet]);
  const alleVragen = useMemo(() => bouwVragen(classified, jaar, bevestigd), [classified, jaar, bevestigd]);
  const wachtrij = useMemo(() => [...alleVragen.filter((v) => !overgeslagen.includes(v.key)), ...alleVragen.filter((v) => overgeslagen.includes(v.key))], [alleVragen, overgeslagen]);
  const stap = gekozenStap ?? (bestanden.length === 0 ? 1 : alleVragen.length > 0 ? 2 : 3);
  const terug = terugIdx != null ? geschiedenis[terugIdx] : null;
  const vraag = terug ? terug.vraag : wachtrij[0] || null;
  useEffect(() => setToonBoekingen(false), [vraag?.key]);
  const isTerug = vraag && overgeslagen.includes(vraag.key);
  // Hoeveel vragen (grootste eerst) zijn ongeveer nodig om op 90% herkend te komen?
  const nogVragen = useMemo(() => {
    const nodig = b.onzeker - b.grens.betrouwbaar;
    if (nodig <= 0) return 0;
    let s = 0, n = 0;
    for (const v of alleVragen) { s += v.gewicht || 0; n += 1; if (s >= nodig) return n; }
    return 0;
  }, [alleVragen, b]);

  const beantwoord = (keuze) => {
    if (!vraag) return;
    for (const g of vraag.groepen) {
      const patch = keuze.category ? keuze : categorieVoorAntwoord(keuze, g.teken, g.rekening);
      if (g.perBoeking && onRijAntwoord) onRijAntwoord(g.txs.map((t) => t.id), patch);
      else onAntwoord(g.naam, g.txs[0].amount, patch);
    }
    const k = typeof keuze === "string" ? keuze : `cat:${keuze.category}`;
    setGekozenKeys((p) => [...vraag.groepen.map((g) => g.key), ...p.filter((x) => !vraag.groepen.some((g) => g.key === x))]);
    if (terug) {
      setGeschiedenis((p) => p.map((h, i) => (i === terugIdx ? { ...h, keuze: k } : h)));
      setTerugIdx(null);
    } else {
      setGeschiedenis((p) => [...p, { vraag, keuze: k }]);
      setOvergeslagen((p) => p.filter((x) => x !== vraag.key));
      setGedaan((p) => ({ ...p, [jaar]: (p[jaar] || 0) + 1 }));
    }
    setAnders("");
  };
  const vorigeVraag = () => { const i = (terugIdx ?? geschiedenis.length) - 1; if (i >= 0) { setTerugIdx(i); setAnders(""); } };
  const slaOver = () => { if (terug) { setTerugIdx(null); return; } if (vraag) setOvergeslagen((p) => [...p.filter((k) => k !== vraag.key), vraag.key]); setAnders(""); };
  const voorstel = vraag ? (teksten ? teksten.voorstel(vraag) : voorstelVoor(vraag)) : null;
  const zak = vraag?.rekening === "Zakelijk";
  const KEUZES = vraag && teksten ? teksten.keuzes(vraag) : vraag ? [
    { k: "bedrijf", t: "Voor mijn bedrijf", s: vraag.teken > 0 ? "betaling van een klant" : "bijv. inkoop, software, administratie" },
    { k: "prive", t: "Privé", s: vraag.teken > 0 ? "geld voor mezelf of het huishouden" : "voor mezelf of het huishouden" },
    { k: "eigen", t: zak ? "Naar / van mijn eigen privérekening" : "Van / naar mijn zakelijke rekening", s: "geld tussen je eigen rekeningen" },
  ] : [];

  const fis = fiscaal || null;
  const ibZvw = fis && fis.ib != null ? (fis.ib || 0) + (fis.zvw || 0) : null;
  const nogBelasting = ibZvw != null ? Math.max(0, ibZvw - (fis.betaald || 0)) : null;
  const btwJaar = fis?.btw ? fis.btw.reduce((a, v) => a + v, 0) : null;
  const bruikbaar = b.oordeel !== "onzeker"; // nieuw-V3R4 — op het onzekere bedrag in euro's, zie calc/eenvoudig.js
  // nieuw-V1R09 — wat is er veranderd sinds je Eenvoudig verliet (door wijzigingen in Uitgebreid)?
  const nu = { winst: Math.round(jaarSummary?.winst || 0), belasting: ibZvw != null ? Math.round(ibZvw) : null, btw: btwJaar != null ? Math.round(btwJaar) : null };
  const verschillen = gezien && !uitkomst ? [
    ["winst", "Winst"], ["belasting", "Belasting (IB + Zvw)"], ["btw", "BTW over het jaar"],
  ].filter(([k]) => gezien[k] != null && nu[k] != null && Math.abs(gezien[k] - nu[k]) >= 1).map(([k, t]) => ({ k, t, van: gezien[k], naar: nu[k] })) : [];
  const overigeWinst = (jaarSummary?.winst || 0) - ((jaarSummary?.zakelijkeInkomstenNetto || 0) - (jaarSummary?.zakelijkeKostenNetto || 0));


  return (
    <div className="space-y-5" data-eenvoudig>
      {/* Kop: naam, jaar, schakelaar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#0f2a3a] px-5 py-3 text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 font-extrabold text-slate-900">B</span>
        <div className="leading-tight"><p className="font-bold">Bankoverzicht</p><p className="text-xs text-slate-300">{klantNaam || "Dossier"}</p></div>
        {jaarKeuze && <div className="ml-2">{jaarKeuze}</div>}
        <div className="flex min-w-0 flex-1 justify-center">
          <div className="text-center leading-tight">
              <span className="inline-block rounded-full border border-amber-300/60 bg-amber-400/15 px-3 py-1 text-sm font-semibold text-amber-200">Eenvoudige weergave</span>
              {!onUitgebreid && <>
              <p className="mt-1 text-[11px] text-slate-300">U heeft geen toegang tot de uitgebreide versie{onToegangAanvragen && <> · <button type="button" onClick={onToegangAanvragen} style={{ minHeight: 0 }} className="underline hover:text-white">toegang aanvragen</button></>}</p>
              {toegangInfo && <p className="mt-0.5 text-[10px] text-slate-400">{{
                laden: "toegang wordt gecontroleerd…",
                geenEmail: "geen inlogadres ontvangen van Cloudflare",
                geenLijst: `ingelogd als ${toegangInfo.email} · geen toegangslijst gevonden`,
                nietOpLijst: `ingelogd als ${toegangInfo.email} · geen uitgebreid account`,
                fout: "toegang kon niet worden gecontroleerd (/api/rol niet bereikbaar)",
              }[toegangInfo.status] || ""}</p>}
              </>}
              {abonnement?.length > 0 && <p className="mt-0.5 text-[10px] text-slate-300">Abonnement: {abonnement.join(" · ")}{onAbonnementen && <> · <button type="button" onClick={onAbonnementen} style={{ minHeight: 0 }} className="underline hover:text-white">bekijken of wijzigen</button></>}</p>}
              {onUitloggen && toegangInfo?.email && <p className="mt-0.5 text-[10px] text-slate-400">{onUitgebreid ? `ingelogd als ${toegangInfo.email} · ` : ""}<button type="button" onClick={onUitloggen} style={{ minHeight: 0 }} className="underline hover:text-white">uitloggen</button></p>}
            </div>
        </div>
        <div className="relative">
          <button type="button" onClick={() => setDossierMenu((v) => !v)} aria-expanded={dossierMenu} className={`${KOPKNOP} border-white/30 text-slate-100 hover:bg-white/10`}><FolderOpen className="h-4 w-4" /> Dossier <ChevronDown className="h-3.5 w-3.5" /></button>
          {dossierMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDossierMenu(false)} />
              <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm text-slate-800 shadow-xl">
                {[["Dossier opslaan", onOpslaan, Save], ["Dossier laden", onDossierLaden, FolderOpen], ["Nieuw dossier", onNieuwDossier, FolderPlus]].map(([t, f, Icoon]) => f && (
                  <button key={t} type="button" onClick={() => { setDossierMenu(false); f(); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50"><Icoon className="h-4 w-4 text-slate-500" /> {t}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <button type="button" onClick={() => setUitleg("knop")} className={`${KOPKNOP} border-white/30 text-slate-100 hover:bg-white/10`}><BookOpen className="h-4 w-4" /> Uitleg</button>
        <button type="button" onClick={onBasisvragen} className={`${KOPKNOP} border-white/30 text-slate-100 hover:bg-white/10`}><ClipboardList className="h-4 w-4" /> Basisvragen</button>
        {onUitgebreid && <button type="button" aria-pressed="true" className={`${KOPKNOP} border-white bg-white font-bold text-slate-900`}>Eenvoudig</button>}
        {onUitgebreid && <button type="button" onClick={onUitgebreid} className={`${KOPKNOP} border-white/30 text-slate-100 hover:bg-white/10`}>Uitgebreid</button>}
      </div>

      {/* Stappen */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        {STAPPEN.map((n, i) => {
          // nieuw-V3R6 — stap 3 klaar als de uitkomst Betrouwbaar is; stap 4 als het dossier is opgeslagen en sindsdien niet gewijzigd.
          const nr = i + 1, nu = nr === stap;
          const klaar = bestanden.length > 0 && (nr === 1 || (nr === 2 && alleVragen.length === 0) || (nr === 3 && b.oordeel === "betrouwbaar") || (nr === 4 && opgeslagen));
          return (
            <button key={n} type="button" onClick={() => setStap(nr)} className={`flex flex-1 min-w-[8rem] items-center gap-2 text-sm ${nu ? `font-bold ${klaar ? "text-emerald-800" : "text-slate-900"}` : klaar ? "text-emerald-700" : "text-slate-400"}`}>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs ${klaar ? `border-emerald-700 bg-emerald-700 text-white${nu ? " ring-2 ring-emerald-300 ring-offset-1" : ""}` : nu ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-300"}`}>{klaar ? <Check className="h-3.5 w-3.5" /> : nr}</span>{n}
            </button>
          );
        })}
      </div>

      {verschillen.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">De uitkomst voor {jaar} is veranderd door wijzigingen in Uitgebreid</p>
            <p className="mt-0.5">{verschillen.map((v, i) => <span key={v.k}>{i > 0 && " · "}{v.t}: {r0(v.van)} → <b>{r0(v.naar)}</b></span>)}</p>
          </div>
          <button type="button" onClick={onGezien} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700">Begrepen</button>
        </div>
      )}

      {stap === 1 && (
        <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold">Je gegevens</h2>
            <p className="mb-3 text-sm text-slate-600">{bestanden.length === 0 ? (teksten?.bestandenLeeg || "Er zijn nog geen bankbestanden. Voeg de afschriften van je zakelijke (en eventueel privé) rekening toe; de app leest ze daarna in.") : "Dit zijn de bankbestanden in dit dossier. Mist er een rekening of een periode? Voeg het bestand toe."}</p>
            <ul className="mb-3 space-y-1 text-sm">
              {bestanden.map((f) => <li key={f.naam} className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"><span className="truncate">{f.naam}</span><span className="shrink-0 text-slate-500">{f.type === "Zakelijk" ? "zakelijk" : f.type === "Prive" ? "privé" : "?"}</span></li>)}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onBestandToevoegen} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"><Upload className="h-4 w-4" /> Bankbestand toevoegen</button>
            </div>
            {extraGegevens && <div className="mt-4">{extraGegevens}</div>}
            {bestanden.length > 0 && <button type="button" onClick={() => setStap(2)} className="mt-4 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800">Naar stap 2: Nakijken →</button>}
          </div>
          <Zekerheid b={b} compact onzekerTekst={teksten?.onzeker} />
        </div>
      )}

      {stap === 2 && (
        <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            {vraag ? (
              <>
                {(() => {
                  const klaar = gedaan[jaar] || 0;
                  const totaal = (maxTotaal.current[jaar] = Math.max(maxTotaal.current[jaar] || 0, klaar + wachtrij.length));
                  return (
                    <div className="mb-4 rounded-xl bg-slate-50 px-3 py-2.5">
                      <div className="mb-1.5 flex flex-wrap justify-between gap-2 text-xs text-slate-600">
                        <span>{terug ? <b className="text-amber-700">Eerder beantwoorde vraag aanpassen</b> : <><b>Vraag {klaar + 1} van {totaal}</b>{isTerug ? " · eerder overgeslagen" : " · meeste invloed eerst"}</>}</span>
                        <span>{b.oordeel === "betrouwbaar" ? <b className="text-emerald-700">Uitkomst is al betrouwbaar — de rest is optioneel</b> : nogVragen > 0 ? <>Nog ongeveer <b>{nogVragen}</b> tot Betrouwbaar</> : null}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200"><i className="block h-full bg-teal-600" style={{ width: `${totaal ? Math.round((klaar / totaal) * 100) : 0}%` }} /></div>
                    </div>
                  );
                })()}
                <h2 className="mb-1 text-xl font-bold">{vraag.soort === "kleinePin" ? (teksten?.vraagKleinePin || "Waren dit privé-aankopen?") : vraag.teken > 0 ? "Waarvoor was dit geld?" : "Waarvoor was deze betaling?"}</h2>
                <p className="mb-3 text-sm text-slate-600">
                  {vraag.soort === "kleinePin"
                    ? "Kleine pinbetalingen die de app niet kon herkennen, bijvoorbeeld bij winkels. Je antwoord geldt voor allemaal."
                    : vraag.groepen[0]?.perBoeking
                      ? <>Betaling via een betaaldienst. De app kon dit niet zeker herkennen. Het gaat om <b>{vraag.aantal} {vraag.aantal === 1 ? "boeking" : "boekingen"}</b> van deze partij; je antwoord geldt alleen daarvoor.</>
                      : <>De app kon dit niet zeker herkennen. Het gaat om <b>{vraag.aantal} {vraag.aantal === 1 ? "boeking" : "boekingen"}</b>{vraag.aantal > 1 ? " met dezelfde naam" : ""}; je antwoord geldt voor allemaal, ook in andere jaren.</>}
                </p>
                {vraag.betaaldienst && !vraag.groepen[0]?.perBoeking && (
                  <p className="-mt-1 mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Dit is een betaaldienst: hierachter kunnen verschillende betalingen zitten, zakelijk en privé. Twijfel je? Kies <b>Weet ik niet</b>; dan kan het in Uitgebreid per boeking worden ingedeeld.</p>
                )}
                {(() => {
                  // nieuw-V3R2 — geen voorbeeldomschrijving meer in dit vak: het bedrag is het totaal van alle boekingen in het jaar.
                  const nJaar = vraag.groepen.flatMap((g) => g.txs).filter((t) => jaar == null || t.year === jaar).length;
                  return (
                    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-slate-100 px-4 py-3 text-sm">
                      <span className="min-w-0 truncate font-semibold">{vraag.naam}</span>
                      <span className="shrink-0 text-right"><b className="block font-mono">{eur(vraag.bedrag)}</b><span className="block text-xs text-slate-500">totaal van {nJaar} {nJaar === 1 ? "boeking" : "boekingen"}{jaar ? ` in ${jaar}` : ""}</span></span>
                    </div>
                  );
                })()}
                {(() => {
                  const alle = vraag.groepen.flatMap((g) => g.txs);
                  const txs = alle.filter((t) => jaar == null || t.year === jaar).sort((x, y) => (y.date?.getTime?.() || 0) - (x.date?.getTime?.() || 0));
                  const elders = alle.length - txs.length;
                  return (
                    <div className="-mt-2 mb-4">
                      <button type="button" onClick={() => setToonBoekingen((v) => !v)} style={{ minHeight: 0 }} className="text-sm font-semibold text-teal-700 hover:underline">{toonBoekingen ? "Verberg de boekingen" : `Toon de ${txs.length === 1 ? "boeking" : `${txs.length} boekingen`}${jaar ? ` in ${jaar}` : ""}`}</button>
                      {toonBoekingen && (
                        <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                          <table className="w-full text-xs">
                            <tbody>
                              {txs.slice(0, 100).map((t) => (
                                <tr key={t.id} className="border-b border-slate-100 align-top last:border-0">
                                  <td className="whitespace-nowrap px-3 py-1.5 font-mono text-slate-500">{t.date?.toLocaleDateString?.("nl-NL")}</td>
                                  <td className="px-2 py-1.5"><span className="block font-medium text-slate-800">{t.counterparty || "—"}</span><span className="block text-slate-500">{String(t.description || "").replace(/^Naam:.*?Omschrijving:\s*/, "").slice(0, 140)}</span></td>
                                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{t.accountType === "Zakelijk" ? "zakelijk" : "privé"}</td>
                                  <td className={`whitespace-nowrap px-3 py-1.5 text-right font-mono ${t.amount < 0 ? "text-slate-800" : "text-emerald-700"}`}>{eur(t.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {txs.length > 100 && <p className="px-3 py-1.5 text-xs text-slate-500">… en nog {txs.length - 100} boekingen</p>}
                          {elders > 0 && <p className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-500">Daarnaast {elders} {elders === 1 ? "boeking" : "boekingen"} in andere jaren; je antwoord geldt ook daarvoor.</p>}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className="grid gap-2 sm:grid-cols-2">
                  {KEUZES.map((c) => (
                    <button key={c.k} type="button" onClick={() => beantwoord(c.keuze || c.k)} className={`rounded-xl border-2 p-3 text-left text-[15px] font-semibold hover:border-teal-600 ${(terug ? terug.keuze === c.k : voorstel === c.k) ? (terug ? "border-amber-500 bg-amber-50" : "border-teal-600 bg-teal-50") : "border-slate-300 bg-white"}`}>
                      {terug ? terug.keuze === c.k && <span className="mb-1 inline-block rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">Je koos</span>
                        : voorstel === c.k && <span className="mb-1 inline-block rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white">Voorstel</span>}
                      <span className="block">{c.t}</span><span className="block text-xs font-normal text-slate-500">{c.s}</span>
                    </button>
                  ))}
                  <div className="rounded-xl border-2 border-slate-300 bg-white p-3 text-[15px] font-semibold">
                    <span className="block">Iets anders…</span>
                    <CategorieSelect value={anders || null} onChange={(v) => setAnders(v)} placeholder="kies uit de lijst…" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-xs font-normal" />
                    {anders && <button type="button" onClick={() => beantwoord({ category: anders, type: teksten?.soort || (/^Privé/.test(mainCategoryOf(anders)) || /^Privé/.test(anders) ? "Prive" : "Zakelijk") })} className="mt-2 rounded-lg bg-teal-700 px-3 py-1 text-xs font-bold text-white">Toepassen</button>}
                  </div>
                </div>
                {terug && terug.keuze?.startsWith("cat:") && <p className="mt-2 text-xs text-amber-700">Je koos: {terug.keuze.slice(4)}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  <button type="button" onClick={slaOver} style={{ minHeight: 0 }} className="text-slate-600 underline">{terug ? "Laat zo, terug naar de huidige vraag" : "Weet ik niet, sla over"}</button>
                  {(terugIdx ?? geschiedenis.length) > 0 && <button type="button" onClick={vorigeVraag} style={{ minHeight: 0 }} className="text-slate-600 underline">← Vorige vraag</button>}
                  {onWijzigAntwoord && <button type="button" onClick={() => setAntwoordenOpen(true)} style={{ minHeight: 0 }} className="text-slate-600 underline">Mijn antwoorden</button>}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold">Alles nagekeken</h2>
                <p className="text-sm text-slate-600">Er zijn geen vragen meer voor {jaar}. Ga verder naar de uitkomst.</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  {geschiedenis.length > 0 && <button type="button" onClick={vorigeVraag} style={{ minHeight: 0 }} className="text-slate-600 underline">← Vorige vraag</button>}
                  {onWijzigAntwoord && <button type="button" onClick={() => setAntwoordenOpen(true)} style={{ minHeight: 0 }} className="text-slate-600 underline">Mijn antwoorden</button>}
                </div>
              </>
            )}
            <div className="mt-5"><button type="button" onClick={() => setStap(3)} className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800">Naar stap 3: Uitkomst →</button></div>
          </div>
          <div className="space-y-3">
            <Zekerheid b={b} compact nogVragen={nogVragen} onzekerTekst={teksten?.onzeker} />
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">Je kunt altijd stoppen: je antwoorden worden direct bewaard. {onUitgebreid ? <>{teksten?.uitgebreidTip || "Fijner werk (percentages, één boeking apart) doe je in"} <button type="button" onClick={onUitgebreid} className="underline">Uitgebreid</button>.</> : "Twijfel je over een boeking? Sla hem over of vraag het je adviseur."}</p>
          </div>
        </div>
      )}

      {stap === 3 && (
        <div className="space-y-4">
          <Zekerheid b={b} nogVragen={nogVragen} onzekerTekst={teksten?.onzeker} />
          {uitkomst ? uitkomst({ bruikbaar, naarNakijken: () => setStap(2) }) : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Wat heeft je bedrijf verdiend?</p>
              <p className="my-1 text-3xl font-extrabold">{r0(jaarSummary?.winst)}</p>
              <Rij label="Ontvangen van klanten" waarde={r0(jaarSummary?.zakelijkeInkomstenNetto)} />
              <Rij label="Kosten van het bedrijf" waarde={`− ${r0(jaarSummary?.zakelijkeKostenNetto)}`} />
              {Math.abs(overigeWinst) >= 1 && <Rij label="Overige posten (bijv. afschrijving, rente)" waarde={`${overigeWinst < 0 ? "− " : ""}${r0(Math.abs(overigeWinst))}`} />}
              <p className="mt-2 text-xs text-slate-500">{metBegrippen("Dit is de winst: wat overblijft na de kosten, zonder BTW.")}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">Hoeveel belasting ongeveer?</p>
              {isBV ? <p className="mt-2 text-sm text-slate-600">Een BV betaalt vennootschapsbelasting. Vraag je adviseur.</p>
                : !bruikbaar ? <><p className="my-1 text-2xl font-extrabold text-slate-400">nog niet bruikbaar</p><p className="text-xs text-slate-500">Er is nog te veel onbekend. Ga terug naar Nakijken.</p><button type="button" onClick={() => setStap(2)} className="mt-2 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white">Verder met nakijken</button></>
                : <>
                  <p className="my-1 text-3xl font-extrabold">{r0(nogBelasting)}</p>
                  <Rij label={metBegrippen("Inkomstenbelasting")} waarde={r0(fis?.ib)} />
                  <Rij label={metBegrippen("Zvw-bijdrage")} waarde={r0(fis?.zvw)} />
                  {fis?.betaald > 0 && <Rij label="Al betaald via de bank" waarde={`− ${r0(fis.betaald)}`} />}
                  <Rij label="Per maand opzij zetten" waarde={r0((nogBelasting || 0) / 12)} />
                  <p className="mt-2 text-xs text-slate-500">Een schatting. De echte aanslag kan anders zijn.</p>
                </>}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">BTW per kwartaal</p>
              {fis?.kor ? <p className="mt-2 text-sm text-slate-600">Je gebruikt de kleineondernemersregeling: geen BTW afdragen.</p>
                : !fis?.btw ? <p className="mt-2 text-sm text-slate-600">Geen BTW-gegevens voor dit jaar.</p>
                : <>
                  <p className={`my-1 text-3xl font-extrabold ${btwJaar < 0 ? "text-emerald-700" : ""}`}>{r0(Math.abs(btwJaar))} <span className="text-base font-semibold">{btwJaar < 0 ? "terug" : "te betalen"}</span></p>
                  {fis.btw.map((v, i) => <Rij key={i} label={`Kwartaal ${i + 1}`} waarde={`${r0(Math.abs(v))} ${v < 0 ? "terug" : ""}`} />)}
                  <p className="mt-2 text-xs text-slate-500">Is een kwartaal nog niet aangegeven? Dan moet die aangifte nog gedaan worden.</p>
                </>}
            </div>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="mb-2 font-semibold text-slate-800">Meer details?</p>
              <p>{onUitgebreid ? <>Lease, afschrijvingen, percentages zakelijk/privé en het meerjarenoverzicht staan in <button type="button" onClick={onUitgebreid} className="font-semibold underline">Uitgebreid</button>. </> : "Lease, afschrijvingen en percentages zakelijk/privé bekijkt je adviseur. "}Twijfel je over iets? Vraag het je adviseur.</p>
            </div>
          </div>}
          <div className="flex flex-wrap gap-2">
            {onSamenvatting && <button type="button" onClick={onSamenvatting} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><FileText className="h-4 w-4" /> Samenvatting</button>}
            {onMaandoverzicht && <button type="button" onClick={onMaandoverzicht} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><CalendarDays className="h-4 w-4" /> Maandoverzicht</button>}
            {onAangifte && <button type="button" onClick={onAangifte} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><FileSpreadsheet className="h-4 w-4" /> Indicatieve aangifteberekening</button>}
            {alleVragen.length > 0 && <button type="button" onClick={() => setStap(2)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Verder met nakijken</button>}
          </div>
        </div>
      )}

      {stap === 4 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Bewaren</h2>
          <p className="mb-3 text-sm text-slate-600">Je werk staat al in deze browser. Wil je het op een andere plek bewaren of later verder op een ander apparaat? Sla dan het dossier op als bestand.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onOpslaan} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800"><Save className="h-4 w-4" /> Dossier opslaan</button>
            <button type="button" onClick={() => setStap(3)} className="inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:underline"><ChevronLeft className="h-4 w-4" /> Terug naar de uitkomst</button>
          </div>
        </div>
      )}
      {uitleg && <UitlegEenvoudig eersteKeer={uitleg === "eerste"} onClose={sluitUitleg} Inhoud={teksten?.uitleg} />}
      {antwoordenOpen && <MijnAntwoorden lijst={antwoordenLijst} gekozenKeys={gekozenKeys} jaar={jaar} onWijzig={onWijzigAntwoord} onWis={onWisAntwoord} onClose={() => setAntwoordenOpen(false)} />}
    </div>
  );
}
