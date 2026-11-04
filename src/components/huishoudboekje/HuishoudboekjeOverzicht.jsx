// huishoudboekje-V1R0 — het Overzicht van een Huishoudboekje (wens Boska 2-11): per maand of per week de inkomsten,
// vaste lasten en variabele uitgaven met het verschil met de vorige periode, budgetten met waarschuwing, het verloop,
// "Past het bij je inkomen?" en "Waar kun je besparen?". Rekenwerk in src/calc/huishoudboekje/.
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, PiggyBank, FileDown, Printer, Pencil } from "lucide-react";
import { huishoudOverzicht, gemiddeldeLaatsteMaanden } from "../../calc/huishoudboekje/overzicht.js";
import { gewoonlijk, vergelijkGewoonlijk, opvallendeUitgaven, GEWOONLIJK_MAANDEN } from "../../calc/huishoudboekje/gewoonlijk.js";
import { periodeLabel, kortLabel, verschuif } from "../../calc/huishoudboekje/periodes.js";
import { verhoudingen, fmtPct } from "../../calc/huishoudboekje/verhoudingen.js";
import { budgetStatus } from "../../calc/huishoudboekje/budget.js";
import { bespaarPlekken, terugkerend } from "../../calc/huishoudboekje/besparen.js";
import { huishoudenUit } from "../../modus/huishoudboekje/wizard.js";
import { RICHTWAARDEN } from "../../calc/huishoudboekje/richtwaarden.js";
import BudgetModal from "./BudgetModal.jsx";

const eur = (v) => `€\u00a0${Math.round(v || 0).toLocaleString("nl-NL")}`;
const eur2 = (v) => `€\u00a0${(Math.round((v || 0) * 100) / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const KLEUR = { groen: "bg-emerald-100 text-emerald-800", oranje: "bg-amber-100 text-amber-800", rood: "bg-red-100 text-red-800" };
const KLEUR_TEKST = { groen: "Past", oranje: "Iets hoog", rood: "Hoog" };

// huishoudboekje-V3R2 — vergelijking met wat gewoonlijk is: het eigen gemiddelde van de laatste zes volledige maanden
// (besluit Boska 4-11; eerder een % of een bedrag verschil met de vorige periode). Alleen een duidelijke afwijking krijgt
// een kleur: meer uitgeven oranje, meer inkomen of over groen.
const GEWOON_TEKST = { gewoon: "zoals gewoonlijk", hoger: "hoger dan gewoonlijk", lager: "lager dan gewoonlijk", nieuw: "niet gebruikelijk" };
function Gewoon({ nu, gem, soort, hogerIsBeter = false, volledig = true, metBedrag = true }) {
  if (!volledig) return <span className="text-xs text-slate-400">onvolledig</span>;
  const v = vergelijkGewoonlijk(nu, gem, soort);
  if (!v) return null;
  if (v === "gewoon") return <span className="whitespace-nowrap text-xs text-slate-400">{GEWOON_TEKST.gewoon}</span>;
  const goed = v === "lager" ? !hogerIsBeter : hogerIsBeter;
  return <span className={`whitespace-nowrap text-xs font-semibold ${goed ? "text-emerald-700" : "text-amber-700"}`}>{GEWOON_TEKST[v]}{metBedrag && v !== "nieuw" ? <span className="font-normal text-slate-500"> (gem. {eur(gem)})</span> : null}</span>;
}

function Kpi({ titel, bedrag, gem, soort, hogerIsBeter, volledig, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titel}</div>
      <div className={`mt-1 text-2xl font-bold ${accent || "text-slate-900"}`}>{eur(bedrag)}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2">{gem != null && <span className="text-xs text-slate-500">gemiddeld {eur(gem)}</span>}<Gewoon nu={bedrag} gem={gem} soort={soort} hogerIsBeter={hogerIsBeter} volledig={volledig} metBedrag={false} /></div>
    </div>
  );
}

function Verloop({ data, soort }) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data.flatMap((d) => [d.inkomsten, d.uitgaven]));
  const w = 640, h = 160, pad = 24, bw = (w - pad) / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + 22}`} className="w-full" role="img" aria-label={`Inkomsten en uitgaven per ${soort}`}>
      {data.map((d, i) => {
        const x = pad + i * bw;
        const hu = (d.uitgaven / max) * h, hi = (d.inkomsten / max) * h;
        return (
          <g key={d.p}>
            <rect x={x + bw * 0.12} y={h - hi} width={bw * 0.36} height={hi} rx="2" className="fill-emerald-400" opacity={d.volledig ? 1 : 0.45}><title>{`${periodeLabel(d.p)}: inkomsten ${eur(d.inkomsten)}`}</title></rect>
            <rect x={x + bw * 0.5} y={h - hu} width={bw * 0.36} height={hu} rx="2" className={d.uitgaven > d.inkomsten ? "fill-red-400" : "fill-slate-400"} opacity={d.volledig ? 1 : 0.45}><title>{`${periodeLabel(d.p)}: uitgaven ${eur(d.uitgaven)}`}</title></rect>
            <text x={x + bw / 2} y={h + 15} textAnchor="middle" className="fill-slate-500" fontSize="10">{kortLabel(d.p)}</text>
          </g>
        );
      })}
      <line x1={pad} x2={w} y1={h} y2={h} className="stroke-slate-300" />
    </svg>
  );
}

export default function HuishoudboekjeOverzicht({ transacties, vasteCategorieen: vasteInstelling, antwoorden, budgetten, onBudgetten, label = (c) => c, onVragen, onVasteLasten, onRapport, onPrint, onToonCategorie }) {
  // huishoudboekje-V1R1 — wat in de wizard als vaste last is aangekruist, telt ook als vaste last.
  const opgegevenVast = useMemo(() => (Array.isArray(antwoorden?.vasteLasten) ? antwoorden.vasteLasten : []), [antwoorden?.vasteLasten]);
  const vasteCategorieen = useMemo(() => [...new Set([...(vasteInstelling || []), ...opgegevenVast])], [vasteInstelling, opgegevenVast]);
  const spaardoel = Number(antwoorden?.spaardoel) > 0 ? Number(antwoorden.spaardoel) : 0;
  const [soort, setSoort] = useState("maand");
  const [uitsmeren, setUitsmeren] = useState(true);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const ov = useMemo(() => huishoudOverzicht(transacties, { soort, vasteCategorieen, uitsmeren }), [transacties, soort, vasteCategorieen, uitsmeren]);
  const maandOv = useMemo(() => (soort === "maand" ? ov : huishoudOverzicht(transacties, { soort: "maand", vasteCategorieen, uitsmeren })), [ov, soort, transacties, vasteCategorieen, uitsmeren]);
  // Standaard de laatste volledige periode, anders de laatste.
  const standaard = useMemo(() => [...ov.periodes].reverse().find((p) => ov.volledig.get(p)) || ov.periodes[ov.periodes.length - 1] || null, [ov]);
  const [gekozen, setGekozen] = useState(null);
  useEffect(() => { setGekozen(null); }, [soort]);
  const p = gekozen && ov.per.has(gekozen) ? gekozen : standaard;
  const nu = p ? ov.per.get(p) : null;
  const volledig = p ? !!ov.volledig.get(p) : false;
  const idx = ov.periodes.indexOf(p);
  const gw = useMemo(() => gewoonlijk(maandOv, p, soort), [maandOv, p, soort]);
  const opvallend = useMemo(() => opvallendeUitgaven(transacties, p, soort, gw, { onregelmatig: ov.onregelmatig }), [transacties, p, soort, gw, ov.onregelmatig]);

  const huishouden = huishoudenUit(antwoorden || {});
  const refMaand = p ? (soort === "maand" ? p : null) : null;
  const gem = useMemo(() => gemiddeldeLaatsteMaanden(maandOv, 3, refMaand), [maandOv, refMaand]);
  const gemVorig = useMemo(() => (gem ? gemiddeldeLaatsteMaanden(maandOv, 3, verschuif(gem.maanden[0], -1)) : null), [maandOv, gem]);
  const verh = useMemo(() => verhoudingen(gem, huishouden), [gem, huishouden.volwassenen, huishouden.kinderen, huishouden.wonen]); // eslint-disable-line react-hooks/exhaustive-deps
  const budget = useMemo(() => budgetStatus(nu, budgetten, soort), [nu, budgetten, soort]);
  const vast = useMemo(() => new Set(vasteCategorieen), [vasteCategorieen]);
  const abonnementen = useMemo(() => terugkerend(transacties, { vast }), [transacties, vast]);
  const besparen = useMemo(() => bespaarPlekken({ gem, vorig: gemVorig, verh, budget: budgetStatus(gem ? { perCategorie: new Map([...gem.perCategorie].map(([c, b]) => [c, { bedrag: b }])) } : null, budgetten, "maand"), abonnementen, label }), [gem, gemVorig, verh, budgetten, abonnementen, label]);

  if (!ov.periodes.length || !nu) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Voeg een bankbestand toe of gebruik de bankkoppeling. Daarna zie je hier per maand en per week waar je geld blijft.</div>;
  }
  const cats = (isVast) => [...nu.perCategorie].filter(([, c]) => c.vast === isVast && Math.abs(c.bedrag) >= 0.5)
    .map(([naam, c]) => ({ naam, ...c, gem: gw ? gw.perCategorie.get(naam) || 0 : null }))
    .sort((a, b) => b.bedrag - a.bedrag);
  const vasteLijst = cats(true), variabelLijst = cats(false);
  // Vaste lasten die er gewoonlijk zijn (gemiddeld minstens € 5), maar deze periode niet.
  const verdwenen = gw ? [...gw.perCategorie].filter(([n, b]) => vast.has(n) && b >= 5 && !nu.perCategorie.has(n) && !ov.onregelmatig.has(n)).map(([n, b]) => ({ naam: n, gem: b })) : [];
  const maxVar = Math.max(1, ...variabelLijst.map((c) => Math.max(c.bedrag, c.gem || 0)));
  const verloop = ov.periodes.slice(Math.max(0, idx - 11), idx + 1).map((x) => ({ p: x, ...ov.per.get(x), volledig: ov.volledig.get(x) }));
  const budgetOver = budget.filter((b) => b.status === "over");
  // huishoudboekje-V1R1 — aangekruiste vaste lasten zonder enige betaling in de laatste drie maanden (of in de hele periode).
  const nietGevonden = opgegevenVast.filter((c) => !(gem?.perCategorie?.get(c) > 0) && !nu.perCategorie.has(c) && !transacties.some((t) => t.category === c));
  const budgetVan = (cat) => budget.find((b) => b.categorie === cat);

  return (
    <div className="space-y-5">
      {/* Kop: maand of week, bladeren */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-semibold" role="tablist">
          {["maand", "week"].map((s) => (
            <button key={s} type="button" role="tab" aria-selected={soort === s} onClick={() => setSoort(s)} className={`rounded-lg px-4 py-1.5 ${soort === s ? "bg-white text-teal-800 shadow-sm" : "text-slate-600"}`}>{s === "maand" ? "Maand" : "Week"}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Vorige periode" disabled={idx <= 0} onClick={() => setGekozen(ov.periodes[idx - 1])} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-30 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
          <div className="min-w-[12rem] text-center"><div className="font-bold text-slate-900">{periodeLabel(p)}</div>{!volledig && <div className="text-xs text-amber-700">onvolledig: nog niet alle dagen in je bankgegevens</div>}</div>
          <button type="button" aria-label="Volgende periode" disabled={idx >= ov.periodes.length - 1} onClick={() => setGekozen(ov.periodes[idx + 1])} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-30 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setBudgetOpen(true)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"><Pencil className="h-4 w-4" /> Budgetten</button>
          {onRapport && <button type="button" onClick={() => onRapport({ soort, periode: p })} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"><FileDown className="h-4 w-4" /> PDF</button>}
          {onPrint && <button type="button" onClick={() => onPrint({ soort, periode: p })} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"><Printer className="h-4 w-4" /> Printen</button>}
        </div>
      </div>

      {/* De vraag naar het huishouden staat al in de kaart "Nog niet beantwoord" erboven (basisvragen). */}

      {budgetOver.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><b>Over je budget:</b> {budgetOver.map((b) => `${label(b.categorie)} (${eur(b.besteed)} van ${eur(b.budget)})`).join(", ")}.</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titel="Inkomsten" bedrag={nu.inkomsten} gem={gw ? gw.inkomsten : null} soort={soort} hogerIsBeter volledig={volledig} accent="text-emerald-700" />
        <Kpi titel="Vaste lasten" bedrag={nu.vasteLasten} gem={gw ? gw.vasteLasten : null} soort={soort} volledig={volledig} />
        <Kpi titel="Variabele uitgaven" bedrag={nu.variabel} gem={gw ? gw.variabel : null} soort={soort} volledig={volledig} />
        <Kpi titel={nu.over >= 0 ? "Over" : "Tekort"} bedrag={nu.over} gem={gw ? gw.over : null} soort={soort} hogerIsBeter volledig={volledig} accent={nu.over >= 0 ? "text-teal-800" : "text-red-700"} />
      </div>
      <p className="-mt-2 text-xs text-slate-500">{gw
        ? <>Gemiddeld = wat je gewoonlijk per {soort} hebt: het gemiddelde van {gw.maanden.length === GEWOONLIJK_MAANDEN ? `de laatste ${GEWOONLIJK_MAANDEN}` : `${gw.maanden.length}`} volledige maanden ervoor ({kortLabel(gw.maanden[0])} – {kortLabel(gw.maanden[gw.maanden.length - 1])}). Alleen een duidelijk verschil krijgt een kleur.</>
        : <>Nog te weinig volledige maanden om met je gewone uitgaven te vergelijken (minstens 2 nodig).</>}</p>
      {opvallend.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-bold text-amber-900">Opvallende uitgaven deze {soort}</h3>
          <p className="mb-2 text-xs text-amber-800">Losse betalingen die veel groter zijn dan gewoonlijk voor die categorie, zoals een grote aankoop.</p>
          <ul className="space-y-1 text-sm">
            {opvallend.map((o, k) => (
              <li key={k} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span><span className="text-slate-500">{o.datum.toLocaleDateString("nl-NL")}</span> · {o.tegenpartij} <button type="button" className="text-xs text-amber-800 underline" onClick={() => onToonCategorie?.(o.categorie, p)}>{label(o.categorie)}</button></span>
                <span className="font-semibold">{eur(o.bedrag)}{o.gemiddeld >= 0.5 && <span className="ml-1 text-xs font-normal text-slate-500">(gewoonlijk {eur(o.gemiddeld)} per maand)</span>}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {(nu.sparen !== 0 || spaardoel > 0) && <p className="-mt-2 text-xs text-slate-500">{nu.sparen >= 0 ? `Naar sparen en beleggen: ${eur(nu.sparen)}` : `Opgenomen van sparen: ${eur(-nu.sparen)}`} (telt niet als uitgave).{spaardoel > 0 && (() => {
        // huishoudboekje-V1R1 — spaardoel per maand (een week: 12/52 daarvan).
        const doel = soort === "week" ? (spaardoel * 12) / 52 : spaardoel;
        return nu.sparen >= doel - 0.5
          ? <span className="ml-1 font-semibold text-emerald-700">Spaardoel {eur(doel)} gehaald.</span>
          : <span className="ml-1 font-semibold text-amber-700">Spaardoel {eur(doel)}: nog {eur(doel - Math.max(0, nu.sparen))} te gaan.</span>;
      })()}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between"><h3 className="font-bold text-slate-900">Vaste lasten</h3>{onVasteLasten && <button type="button" onClick={onVasteLasten} className="text-xs text-teal-700 underline">Welke zijn vast?</button>}</div>
          <table className="w-full text-sm"><tbody>
            {vasteLijst.map((c) => (
              <tr key={c.naam} className="border-t border-slate-100">
                <td className="py-1.5"><button type="button" className="text-left hover:underline" onClick={() => onToonCategorie?.(c.naam, p)}>{label(c.naam)}</button>{c.uitgesmeerd && <span className="ml-1 text-xs text-slate-400">(uitgesmeerd)</span>}</td>
                <td className="whitespace-nowrap py-1.5 text-right font-medium">{eur(c.bedrag)}</td>
                <td className="py-1.5 pl-2 text-right"><Gewoon nu={c.bedrag} gem={c.gem} soort={soort} volledig={volledig} /></td>
              </tr>
            ))}
            {verdwenen.map((c) => <tr key={c.naam} className="border-t border-slate-100 text-slate-400"><td className="py-1.5">{label(c.naam)} <span className="rounded bg-slate-100 px-1 text-xs">niet deze {soort}</span></td><td className="py-1.5 text-right">{eur(0)}</td><td className="py-1.5 pl-2 text-right text-xs">gem. {eur(c.gem)}</td></tr>)}
            {!vasteLijst.length && <tr><td className="py-2 text-slate-500">Geen vaste lasten in deze {soort}.</td></tr>}
          </tbody></table>
          {nietGevonden.length > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <b>Opgegeven, maar niet in je bankgegevens:</b> {nietGevonden.map(label).join(", ")}. Betaal je dit van een andere rekening, voeg die dan toe. Of de app heeft het anders ingedeeld: kijk bij Controleren.
            </p>
          )}
                    <label className="mt-3 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={uitsmeren} onChange={(e) => setUitsmeren(e.target.checked)} /> Vaste lasten die een paar keer per jaar komen, uitsmeren over de maanden</label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 font-bold text-slate-900">Variabele uitgaven</h3>
          <ul className="space-y-2.5">
            {variabelLijst.map((c) => {
              const b = budgetVan(c.naam);
              const kleur = b?.status === "over" ? "bg-red-500" : b?.status === "bijna" ? "bg-amber-400" : "bg-teal-500";
              return (
                <li key={c.naam}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <button type="button" className="truncate text-left hover:underline" onClick={() => onToonCategorie?.(c.naam, p)}>{label(c.naam)}</button>
                    <span className="shrink-0"><span className="font-medium">{eur(c.bedrag)}</span>{b && <span className={`ml-1 text-xs ${b.status === "over" ? "text-red-700 font-semibold" : "text-slate-500"}`}>/ {eur(b.budget)}</span>} <Gewoon nu={c.bedrag} gem={c.gem} soort={soort} volledig={volledig} /></span>
                  </div>
                  <div className="mt-1 h-2 rounded bg-slate-100"><div className={`h-2 rounded ${kleur}`} style={{ width: `${Math.max(0, Math.min(100, (c.bedrag / (b ? Math.max(b.budget, c.bedrag) : maxVar)) * 100))}%` }} /></div>
                  {gw && <div className="mt-0.5 h-1 rounded bg-slate-100"><div className="h-1 rounded bg-slate-300" style={{ width: `${Math.max(0, Math.min(100, ((c.gem || 0) / (b ? Math.max(b.budget, c.bedrag) : maxVar)) * 100))}%` }} title={`Gemiddeld per ${soort}: ${eur(c.gem)}`} /></div>}
                </li>
              );
            })}
            {!variabelLijst.length && <li className="text-sm text-slate-500">Geen variabele uitgaven in deze {soort}.</li>}
          </ul>
          {gw && variabelLijst.length > 0 && <p className="mt-2 text-xs text-slate-400">Dunne grijze balk = wat je gewoonlijk per {soort} uitgeeft.</p>}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="font-bold text-slate-900">Verloop: inkomsten en uitgaven per {soort}</h3>
        <p className="mb-2 text-xs text-slate-500"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" /> inkomsten · <span className="inline-block h-2 w-2 rounded-sm bg-slate-400" /> uitgaven · <span className="inline-block h-2 w-2 rounded-sm bg-red-400" /> uitgaven hoger dan inkomsten</p>
        <Verloop data={verloop} soort={soort} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="font-bold text-slate-900">Past het bij je inkomen?</h3>
        {verh.zonderInkomen ? (
          <p className="mt-1 text-sm text-slate-600">Nog niet te zeggen: er zijn minstens één volledige maand met inkomen nodig.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-600">Gemiddeld netto inkomen {eur(verh.inkomen)} per maand ({verh.maanden.length === 1 ? "1 maand" : `laatste ${verh.maanden.length} volledige maanden`}: {verh.maanden.map(kortLabel).join(", ")}).</p>
            {/* Per regel: onderdeel met de vergelijking eronder, bedrag, % van het inkomen en het oordeel (past ook op een telefoon). */}
            <ul className="mt-3 divide-y divide-slate-100 text-sm">{verh.regels.map((r) => (
              <li key={r.id} className="flex items-start gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-slate-800">{r.label}</div>
                  <div className="text-xs text-slate-500">{r.richtTekst}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-right sm:flex-row sm:items-start sm:gap-3">
                <div>
                  <div className="whitespace-nowrap font-semibold">{eur(r.bedrag)}</div>
                  <div className="whitespace-nowrap text-xs text-slate-500">{fmtPct((r.bedrag / verh.inkomen) * 100)} van inkomen</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${KLEUR[r.kleur]}`}>{r.hogerIsBeter ? (r.kleur === "groen" ? "Goed" : r.kleur === "oranje" ? "Iets laag" : "Laag") : KLEUR_TEKST[r.kleur]}</span>
                </div>
              </li>
            ))}</ul>
            <p className="mt-2 text-xs text-slate-400">Indicatie op basis van Nibud en CBS (stand {RICHTWAARDEN.stand}), geen persoonlijk advies.{!huishouden.beantwoord ? " Huishouden nog niet ingevuld: de app rekent met één volwassene." : ""}</p>
          </>
        )}
      </section>

      {besparen.tonen && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <h3 className="flex items-center gap-2 font-bold text-amber-950"><PiggyBank className="h-5 w-5" /> Waar kun je het meest besparen?</h3>
          <p className="mt-1 text-sm text-amber-900">{besparen.tekort > 0 ? <>Je gaf de laatste maanden gemiddeld <b>{eur(besparen.tekort)} per maand meer uit</b> dan er binnenkwam.</> : "Niet alle uitgaven passen bij je inkomen."}{besparen.plekken.length > 0 && <> Deze plekken leveren samen ongeveer <b>{eur(besparen.samen)} per maand</b> op{besparen.tekort > 0 ? (besparen.samen >= besparen.tekort ? ", genoeg om het tekort weg te werken." : `; dan blijft er ${eur(besparen.tekort - besparen.samen)} tekort over.`) : "."}</>}</p>
          <ol className="mt-3 space-y-2">
            {besparen.plekken.map((b, i) => (
              <li key={b.titel} className="flex gap-3 rounded-xl bg-white p-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-500 text-xs font-bold text-white">{i + 1}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:gap-3">
                  <span className="flex-1"><b>{b.titel}</b> <span className="text-slate-600">{b.tekst}</span></span>
                  <span className="shrink-0 whitespace-nowrap font-semibold text-emerald-700">± {eur(b.perMaand)}/mnd</span>
                </span>
              </li>
            ))}
            {!besparen.plekken.length && <li className="text-sm text-amber-900">De app ziet geen duidelijke uitschieters. Kijk naar de grootste variabele uitgaven hierboven.</li>}
          </ol>
          {besparen.tekort > 0 && <p className="mt-3 text-xs text-amber-900">Kom je structureel tekort? Op <a className="underline" href="https://www.nibud.nl" target="_blank" rel="noreferrer">nibud.nl</a> en <a className="underline" href="https://www.geldfit.nl" target="_blank" rel="noreferrer">geldfit.nl</a> vind je hulp, en je gemeente heeft gratis schuldhulpverlening.</p>}
        </section>
      )}

      {abonnementen.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-bold text-slate-900">Terugkerende afschrijvingen</h3>
          <p className="mb-2 text-xs text-slate-500">Partijen die je in minstens 3 van de laatste 6 maanden betaalde, met het bedrag per jaar.</p>
          <table className="w-full text-sm"><tbody>{abonnementen.slice(0, 15).map((a) => (
            <tr key={a.partij} className="border-t border-slate-100 align-top"><td className="py-1.5">{a.partij}<span className="block text-xs text-slate-500 sm:hidden">{label(a.categorie)}</span></td><td className="hidden py-1.5 text-xs text-slate-500 sm:table-cell">{label(a.categorie)}</td><td className="whitespace-nowrap py-1.5 pl-2 text-right">{eur2(a.perMaand)}/mnd<span className="block font-medium sm:hidden">{eur(a.perJaar)}/jaar</span></td><td className="hidden whitespace-nowrap py-1.5 pl-2 text-right font-medium sm:table-cell">{eur(a.perJaar)}/jaar</td></tr>
          ))}</tbody></table>
        </section>
      )}

      {budgetOpen && <BudgetModal budgetten={budgetten} spaardoel={spaardoel} categorieen={[...new Set([...variabelLijst, ...vasteLijst].map((c) => c.naam).concat(Object.keys(budgetten || {})))]} gemiddeld={gem?.perCategorie} label={label} onOpslaan={(b, doel) => { onBudgetten(b, doel); setBudgetOpen(false); }} onClose={() => setBudgetOpen(false)} />}
    </div>
  );
}
