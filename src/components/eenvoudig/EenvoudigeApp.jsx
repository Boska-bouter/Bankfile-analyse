import { useMemo, useRef, useState } from "react";
import { Check, Upload, Download, Save, ClipboardList, ChevronLeft, FileSpreadsheet, FileText, FolderOpen, FolderPlus, ChevronDown } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import { mainCategoryOf } from "../../classification/categories.js";
import CategorieSelect from "../shared/CategorieSelect.jsx";
import { metBegrippen } from "../shared/Begrip.jsx";
import { APP_RELEASE } from "../../version.js";
import {
  berekenBetrouwbaarheid, bouwVragen, categorieVoorAntwoord, voorstelVoor, maakBevestigd, DREMPEL_BETROUWBAAR, DREMPEL_REDELIJK,
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

function Zekerheid({ b, compact = false, nogVragen = null }) {
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
        <span className="text-slate-400">(naar bedrag)</span>
      </div>
      {nogVragen != null && b.oordeel !== "betrouwbaar" && (
        <p className="mt-2 text-xs text-slate-500">{nogVragen > 0 ? <>Nog ongeveer <b>{nogVragen} vra{nogVragen === 1 ? "ag" : "gen"}</b> tot Betrouwbaar ({DREMPEL_BETROUWBAAR}%).</> : "Beantwoord de overgeslagen vragen om verder te komen."}</p>
      )}
    </div>
  );
}

function Rij({ label, waarde, sterk = false }) {
  return <div className={`flex justify-between border-b border-slate-100 py-1.5 text-sm ${sterk ? "font-semibold" : ""}`}><span>{label}</span><b className="shrink-0 whitespace-nowrap font-mono">{waarde}</b></div>;
}

export default function EenvoudigeApp({
  klantNaam, jaar, jaren = [], onJaar, bestanden = [], classified, reviewedOverigKeys, reviewedPersonKeys,
  onAntwoord, onBestandToevoegen, onBasisvragen, onOpslaan, onUitgebreid, fiscaal, jaarSummary, isBV, onAangifte, onSamenvatting, onDossierLaden, onNieuwDossier, jaarKeuze, gezien = null, onGezien, onToegangAanvragen, toegangInfo = null,
}) {
  const [dossierMenu, setDossierMenu] = useState(false);
  // nieuw-V1R03 — geen vaste volgorde meer: je begint bij Nakijken als er nog vragen zijn, anders direct bij de
  // Uitkomst (een volledig nagekeken dossier hoeft niet opnieuw doorlopen te worden). Elke stap blijft aanklikbaar.
  const [gekozenStap, setStap] = useState(null);
  const [overgeslagen, setOvergeslagen] = useState([]);
  const [gedaan, setGedaan] = useState({});
  const maxTotaal = useRef({}); // vast totaal per jaar, zodat "Vraag x van y" niet verspringt // aantal beantwoorde vragen per jaar (voor de voortgangsbalk)
  const [anders, setAnders] = useState("");
  const bevestigd = useMemo(() => maakBevestigd(reviewedOverigKeys, reviewedPersonKeys), [reviewedOverigKeys, reviewedPersonKeys]);
  const b = useMemo(() => berekenBetrouwbaarheid(classified, jaar, bevestigd), [classified, jaar, bevestigd]);
  const alleVragen = useMemo(() => bouwVragen(classified, jaar, bevestigd), [classified, jaar, bevestigd]);
  const wachtrij = useMemo(() => [...alleVragen.filter((v) => !overgeslagen.includes(v.key)), ...alleVragen.filter((v) => overgeslagen.includes(v.key))], [alleVragen, overgeslagen]);
  const stap = gekozenStap ?? (bestanden.length === 0 ? 1 : alleVragen.length > 0 ? 2 : 3);
  const vraag = wachtrij[0] || null;
  const isTerug = vraag && overgeslagen.includes(vraag.key);
  // Hoeveel vragen (grootste eerst) zijn ongeveer nodig om op 90% herkend te komen?
  const nogVragen = useMemo(() => {
    const nodig = (DREMPEL_BETROUWBAAR / 100) * b.totaal - b.som.herkend;
    if (nodig <= 0) return 0;
    let s = 0, n = 0;
    for (const v of alleVragen) { s += Math.abs(v.bedrag); n += 1; if (s >= nodig) return n; }
    return 0;
  }, [alleVragen, b]);

  const beantwoord = (keuze) => {
    if (!vraag) return;
    for (const g of vraag.groepen) {
      const patch = keuze.category ? keuze : categorieVoorAntwoord(keuze, g.teken, g.rekening);
      onAntwoord(g.naam, g.txs[0].amount, patch);
    }
    setOvergeslagen((p) => p.filter((k) => k !== vraag.key));
    setGedaan((p) => ({ ...p, [jaar]: (p[jaar] || 0) + 1 }));
    setAnders("");
  };
  const slaOver = () => { if (vraag) setOvergeslagen((p) => [...p.filter((k) => k !== vraag.key), vraag.key]); setAnders(""); };
  const voorstel = vraag ? voorstelVoor(vraag) : null;
  const zak = vraag?.rekening === "Zakelijk";
  const KEUZES = vraag ? [
    { k: "bedrijf", t: "Voor mijn bedrijf", s: vraag.teken > 0 ? "betaling van een klant" : "bijv. inkoop, software, administratie" },
    { k: "prive", t: "Privé", s: vraag.teken > 0 ? "geld voor mezelf of het huishouden" : "voor mezelf of het huishouden" },
    { k: "eigen", t: zak ? "Naar / van mijn eigen privérekening" : "Van / naar mijn zakelijke rekening", s: "geld tussen je eigen rekeningen" },
  ] : [];

  const fis = fiscaal || null;
  const ibZvw = fis && fis.ib != null ? (fis.ib || 0) + (fis.zvw || 0) : null;
  const nogBelasting = ibZvw != null ? Math.max(0, ibZvw - (fis.betaald || 0)) : null;
  const btwJaar = fis?.btw ? fis.btw.reduce((a, v) => a + v, 0) : null;
  const bruikbaar = b.herkend >= DREMPEL_REDELIJK;
  // nieuw-V1R09 — wat is er veranderd sinds je Eenvoudig verliet (door wijzigingen in Uitgebreid)?
  const nu = { winst: Math.round(jaarSummary?.winst || 0), belasting: ibZvw != null ? Math.round(ibZvw) : null, btw: btwJaar != null ? Math.round(btwJaar) : null };
  const verschillen = gezien ? [
    ["winst", "Winst"], ["belasting", "Belasting (IB + Zvw)"], ["btw", "BTW over het jaar"],
  ].filter(([k]) => gezien[k] != null && nu[k] != null && Math.abs(gezien[k] - nu[k]) >= 1).map(([k, t]) => ({ k, t, van: gezien[k], naar: nu[k] })) : [];
  const overigeWinst = (jaarSummary?.winst || 0) - ((jaarSummary?.zakelijkeInkomstenNetto || 0) - (jaarSummary?.zakelijkeKostenNetto || 0));

  const downloadUitkomst = () => {
    const btwRij = fis?.btw ? fis.btw.map((v, i) => `<tr><td>Q${i + 1}</td><td class="r">${eur(Math.abs(v))} ${v < 0 ? "terug" : "te betalen"}</td></tr>`).join("") : "";
    const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Uitkomst ${jaar}${klantNaam ? ` — ${klantNaam}` : ""}</title><style>body{font-family:-apple-system,Arial,sans-serif;color:#1e293b;max-width:760px;margin:24px auto;padding:0 16px;font-size:13px}h1{font-size:20px}h2{font-size:15px;margin-top:20px}td{padding:4px 8px;border-bottom:1px solid #eee}.r{text-align:right}.noot{color:#64748b;font-size:11px}</style></head><body>
<h1>Uitkomst ${jaar}${klantNaam ? ` — ${klantNaam}` : ""}</h1>
<p>Zekerheid: <b>${OORDEEL[b.oordeel].tekst}</b> — ${b.herkend}% herkend, ${b.geschat}% geschat, ${b.onbekend}% nog onbekend (naar bedrag).</p>
<h2>Wat heeft het bedrijf verdiend?</h2><table><tr><td>Ontvangen van klanten (excl. BTW)</td><td class="r">${eur(jaarSummary?.zakelijkeInkomstenNetto || 0)}</td></tr><tr><td>Kosten van het bedrijf (excl. BTW)</td><td class="r">− ${eur(jaarSummary?.zakelijkeKostenNetto || 0)}</td></tr>${Math.abs(overigeWinst) >= 1 ? `<tr><td>Overige posten (bijv. afschrijving, rente)</td><td class="r">${eur(overigeWinst)}</td></tr>` : ""}<tr><td><b>Winst</b></td><td class="r"><b>${eur(jaarSummary?.winst || 0)}</b></td></tr></table>
<h2>Belasting (schatting)</h2>${isBV ? "<p>BV: vraag je adviseur naar de vennootschapsbelasting.</p>" : !bruikbaar ? "<p>Nog niet bruikbaar: er is te veel onbekend.</p>" : `<table><tr><td>Inkomstenbelasting</td><td class="r">${eur(fis?.ib || 0)}</td></tr><tr><td>Zvw-bijdrage</td><td class="r">${eur(fis?.zvw || 0)}</td></tr><tr><td>Al betaald via de bank</td><td class="r">${eur(fis?.betaald || 0)}</td></tr><tr><td><b>Nog te betalen</b></td><td class="r"><b>${eur(nogBelasting || 0)}</b></td></tr></table>`}
${fis?.btw ? `<h2>BTW per kwartaal</h2><table>${btwRij}</table>` : ""}
<p class="noot">Indicatief, op basis van de bankgegevens. Geen officiële aangifte. Gemaakt met Bankoverzicht op ${new Date().toLocaleDateString("nl-NL")}.</p></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url; a.download = `Uitkomst_${jaar}${klantNaam ? `_${klantNaam.replace(/\s+/g, "_")}` : ""}.html`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <div className="space-y-5" data-eenvoudig>
      {/* Kop: naam, jaar, schakelaar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#0f2a3a] px-5 py-3 text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 font-extrabold text-slate-900">B</span>
        <div className="leading-tight"><p className="font-bold">Bankoverzicht</p><p className="text-xs text-slate-300">{klantNaam || "Dossier"}</p></div>
        {jaarKeuze && <div className="ml-2">{jaarKeuze}</div>}
        <div className="flex min-w-0 flex-1 justify-center">
          {!onUitgebreid && (
            <div className="text-center leading-tight">
              <span className="inline-block rounded-full border border-amber-300/60 bg-amber-400/15 px-3 py-1 text-sm font-semibold text-amber-200">Eenvoudige weergave</span>
              <p className="mt-1 text-[11px] text-slate-300">U heeft geen toegang tot de uitgebreide versie{onToegangAanvragen && <> · <button type="button" onClick={onToegangAanvragen} style={{ minHeight: 0 }} className="underline hover:text-white">toegang aanvragen</button></>}</p>
              {toegangInfo && <p className="mt-0.5 text-[10px] text-slate-400">{{
                laden: "toegang wordt gecontroleerd…",
                geenEmail: "geen inlogadres ontvangen van Cloudflare",
                geenLijst: `ingelogd als ${toegangInfo.email} · toegangslijst AccessAll niet gevonden`,
                nietOpLijst: `ingelogd als ${toegangInfo.email} · niet in AccessAll`,
                fout: "toegang kon niet worden gecontroleerd (/api/rol niet bereikbaar)",
              }[toegangInfo.status] || ""}</p>}
            </div>
          )}
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
        <button type="button" onClick={onBasisvragen} className={`${KOPKNOP} border-white/30 text-slate-100 hover:bg-white/10`}><ClipboardList className="h-4 w-4" /> Basisvragen</button>
        {onUitgebreid && <button type="button" aria-pressed="true" className={`${KOPKNOP} border-white bg-white font-bold text-slate-900`}>Eenvoudig</button>}
        {onUitgebreid && <button type="button" onClick={onUitgebreid} className={`${KOPKNOP} border-white/30 text-slate-100 hover:bg-white/10`}>Uitgebreid</button>}
      </div>

      {/* Stappen */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        {STAPPEN.map((n, i) => {
          const nr = i + 1, nu = nr === stap, klaar = !nu && ((nr === 1 && bestanden.length > 0) || (nr === 2 && bestanden.length > 0 && alleVragen.length === 0));
          return (
            <button key={n} type="button" onClick={() => setStap(nr)} className={`flex flex-1 min-w-[8rem] items-center gap-2 text-sm ${nu ? "font-bold text-slate-900" : klaar ? "text-emerald-700" : "text-slate-400"}`}>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs ${klaar ? "border-emerald-700 bg-emerald-700 text-white" : nu ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-300"}`}>{klaar ? <Check className="h-3.5 w-3.5" /> : nr}</span>{n}
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
            <p className="mb-3 text-sm text-slate-600">{bestanden.length === 0 ? "Er zijn nog geen bankbestanden. Voeg de afschriften van je zakelijke (en eventueel privé) rekening toe; de app leest ze daarna in." : "Dit zijn de bankbestanden in dit dossier. Mist er een rekening of een periode? Voeg het bestand toe."}</p>
            <ul className="mb-3 space-y-1 text-sm">
              {bestanden.map((f) => <li key={f.naam} className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"><span className="truncate">{f.naam}</span><span className="shrink-0 text-slate-500">{f.type === "Zakelijk" ? "zakelijk" : f.type === "Prive" ? "privé" : "?"}</span></li>)}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onBestandToevoegen} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"><Upload className="h-4 w-4" /> Bankbestand toevoegen</button>
            </div>
            {bestanden.length > 0 && <button type="button" onClick={() => setStap(2)} className="mt-4 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800">Naar stap 2: Nakijken →</button>}
          </div>
          <Zekerheid b={b} compact />
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
                        <span><b>Vraag {klaar + 1} van {totaal}</b>{isTerug ? " · eerder overgeslagen" : " · grootste bedragen eerst"}</span>
                        <span>{b.oordeel === "betrouwbaar" ? <b className="text-emerald-700">Uitkomst is al betrouwbaar — de rest is optioneel</b> : nogVragen > 0 ? <>Nog ongeveer <b>{nogVragen}</b> tot Betrouwbaar</> : null}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200"><i className="block h-full bg-teal-600" style={{ width: `${totaal ? Math.round((klaar / totaal) * 100) : 0}%` }} /></div>
                    </div>
                  );
                })()}
                <h2 className="mb-1 text-xl font-bold">{vraag.soort === "kleinePin" ? "Waren dit privé-aankopen?" : vraag.teken > 0 ? "Waarvoor was dit geld?" : "Waarvoor was deze betaling?"}</h2>
                <p className="mb-3 text-sm text-slate-600">
                  {vraag.soort === "kleinePin"
                    ? "Kleine pinbetalingen die de app niet kon herkennen, bijvoorbeeld bij winkels. Je antwoord geldt voor allemaal."
                    : <>De app kon dit niet zeker herkennen. Het gaat om <b>{vraag.aantal} {vraag.aantal === 1 ? "boeking" : "boekingen"}</b>{vraag.aantal > 1 ? " met dezelfde naam" : ""}; je antwoord geldt voor allemaal, ook in andere jaren.</>}
                </p>
                <div className="mb-4 flex justify-between gap-3 rounded-xl bg-slate-100 px-4 py-3 text-sm">
                  <span className="min-w-0 truncate">{vraag.naam}{vraag.voorbeeld?.description && vraag.soort !== "kleinePin" ? <span className="block truncate text-xs text-slate-500">{String(vraag.voorbeeld.description).replace(/^Naam:.*?Omschrijving:\s*/, "").slice(0, 90)}</span> : null}</span>
                  <b className="shrink-0 font-mono">{eur(vraag.bedrag)}</b>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {KEUZES.map((c) => (
                    <button key={c.k} type="button" onClick={() => beantwoord(c.k)} className={`rounded-xl border-2 p-3 text-left text-[15px] font-semibold hover:border-teal-600 ${voorstel === c.k ? "border-teal-600 bg-teal-50" : "border-slate-300 bg-white"}`}>
                      {voorstel === c.k && <span className="mb-1 inline-block rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white">Voorstel</span>}
                      <span className="block">{c.t}</span><span className="block text-xs font-normal text-slate-500">{c.s}</span>
                    </button>
                  ))}
                  <div className="rounded-xl border-2 border-slate-300 bg-white p-3 text-[15px] font-semibold">
                    <span className="block">Iets anders…</span>
                    <CategorieSelect value={anders || null} onChange={(v) => setAnders(v)} placeholder="kies uit de lijst…" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-xs font-normal" />
                    {anders && <button type="button" onClick={() => beantwoord({ category: anders, type: /^Privé/.test(mainCategoryOf(anders)) || /^Privé/.test(anders) ? "Prive" : "Zakelijk" })} className="mt-2 rounded-lg bg-teal-700 px-3 py-1 text-xs font-bold text-white">Toepassen</button>}
                  </div>
                </div>
                <button type="button" onClick={slaOver} className="mt-3 text-sm text-slate-600 underline">Weet ik niet, sla over</button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold">Alles nagekeken</h2>
                <p className="text-sm text-slate-600">Er zijn geen vragen meer voor {jaar}. Ga verder naar de uitkomst.</p>
              </>
            )}
            <div className="mt-5"><button type="button" onClick={() => setStap(3)} className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800">Naar stap 3: Uitkomst →</button></div>
          </div>
          <div className="space-y-3">
            <Zekerheid b={b} compact nogVragen={nogVragen} />
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">Je kunt altijd stoppen: je antwoorden worden direct bewaard. {onUitgebreid ? <>Fijner werk (percentages, één boeking apart) doe je in <button type="button" onClick={onUitgebreid} className="underline">Uitgebreid</button>.</> : "Twijfel je over een boeking? Sla hem over of vraag het je adviseur."}</p>
          </div>
        </div>
      )}

      {stap === 3 && (
        <div className="space-y-4">
          <Zekerheid b={b} nogVragen={nogVragen} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={downloadUitkomst} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><Download className="h-4 w-4" /> Uitkomst downloaden</button>
            {onAangifte && <button type="button" onClick={onAangifte} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><FileSpreadsheet className="h-4 w-4" /> Indicatieve aangifteberekening</button>}
            {onSamenvatting && <button type="button" onClick={onSamenvatting} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><FileText className="h-4 w-4" /> Samenvatting</button>}
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
            <button type="button" onClick={downloadUitkomst} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><Download className="h-4 w-4" /> Uitkomst downloaden</button>
            <button type="button" onClick={() => setStap(3)} className="inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:underline"><ChevronLeft className="h-4 w-4" /> Terug naar de uitkomst</button>
          </div>
        </div>
      )}
      <p className="pt-2 text-center text-[11px] text-slate-400">Gegevens blijven lokaal · © {new Date().getFullYear()} Paul Gerits — alle rechten voorbehouden · {APP_RELEASE}</p>
    </div>
  );
}
