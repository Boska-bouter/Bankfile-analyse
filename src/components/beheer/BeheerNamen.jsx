import { useCallback, useEffect, useState } from "react";
import CategorieSelect from "../shared/CategorieSelect.jsx";
import { KNOP_SECUNDAIR_KLEIN, VELD_KLEIN } from "../ui/stijl.js";
import { keuzeGroepen } from "../../classification/categories.js";
import { namenNaarRijen, leesNamenRijen } from "../../beheer/namenExcel.js";
import { leesExcelBladen, schrijfExcel } from "../../importers/excel.js";

// nieuw-V3R6 — Beheer → Namenlijst (wens Boska 12-11): de opgeslagen bedrijfsnamen inzien en aanpassen (worker/namenBeheer.js).
// Per naam het AI-voorstel en de keuzes van gebruikers. De beheerder kan de categorie van het AI-voorstel zetten, het AI-voorstel
// wissen (dan wordt de naam opnieuw opgezocht) of de keuzes van gebruikers wissen.

const BRON = [["alle", "Alle namen"], ["ai", "Opgezocht met AI"], ["gebruikers", "Keuzes van gebruikers"]];
const SOORT = { zakelijk: "Zakelijk", prive: "Privé", "prive-dossier": "Privé-dossier" };
const ZEKER = { hoog: "zeker", middel: "waarschijnlijk", laag: "twijfel" };
// Dezelfde naam als in de keuzelijst (bijv. "Abonnementen – Overige (…)" voor "Privé overige abonnementen").
export function naamVanCategorie(c) {
  if (!c) return "";
  for (const g of keuzeGroepen(c)) for (const o of g.opties) if (o.value === c) return o.label;
  return c;
}
const nlDatum = (iso) => (iso ? new Date(iso).toLocaleDateString("nl-NL") : "");

async function vraag(pad, body) {
  const r = await fetch(pad, body
    ? { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
    : { credentials: "same-origin", cache: "no-store" });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d?.ok) throw new Error(d?.fout || `Fout ${r.status}`);
  return d;
}

function NaamRij({ n, opnieuw }) {
  const [cat, setCat] = useState(n.ai?.categorie || "");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const doe = async (pad, body, vraagEerst) => {
    if (vraagEerst && !window.confirm(vraagEerst)) return;
    setBezig(true); setFout("");
    try { await vraag(pad, body); await opnieuw(); } catch (e) { setFout(e.message); } finally { setBezig(false); }
  };
  const stemmen = Object.entries(n.stemmen || {}).sort((a, b) => b[1] - a[1]);
  const gewijzigd = cat && cat !== (n.ai?.categorie || "");
  return (
    <li className="space-y-2 px-3 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold text-slate-800">{n.naam}</span>
        <span className="text-xs text-slate-500">{n.teken === "pos" ? "bijschrijving" : "afschrijving"} · {SOORT[n.soort] || n.soort}{n.branche ? ` · ${n.branche}` : ""}</span>
      </div>
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI-voorstel</p>
        {n.ai ? (
          <>
            <p className="text-slate-700">
              {n.ai.categorie ? naamVanCategorie(n.ai.categorie) : "geen categorie (onbekend)"}
              {n.ai.beheerder
                ? <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">door beheerder</span>
                : n.ai.zekerheid ? <span className="ml-2 text-xs text-slate-500">{ZEKER[n.ai.zekerheid] || n.ai.zekerheid}</span> : null}
              {n.ai.verouderd && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">oude vraagversie</span>}
            </p>
            {n.ai.soortBedrijf && <p className="text-xs text-slate-500">Soort bedrijf: {n.ai.soortBedrijf}</p>}
            <p className="text-xs text-slate-400">{nlDatum(n.ai.tijd)}</p>
          </>
        ) : <p className="text-slate-500">Nog niet opgezocht.</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <CategorieSelect value={cat} onChange={setCat} placeholder="Categorie kiezen…" className={`${VELD_KLEIN} min-w-[14rem] bg-white`} />
          <button type="button" disabled={!gewijzigd || bezig} onClick={() => doe("/api/beheer/namen/ai", { k: n.k, categorie: cat })}
            className="rounded-lg bg-teal-700 px-3 py-1 text-sm font-medium text-white disabled:opacity-40">Opslaan</button>
          {n.ai && (
            <button type="button" disabled={bezig} className={KNOP_SECUNDAIR_KLEIN}
              onClick={() => doe("/api/beheer/namen/ai-wis", { k: n.k }, `Het AI-voorstel voor "${n.naam}" wissen? De naam wordt de volgende keer opnieuw opgezocht.`)}>
              Opnieuw laten opzoeken
            </button>
          )}
        </div>
      </div>
      {stemmen.length > 0 && (
        <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Keuzes van gebruikers ({n.accounts})</p>
          <ul className="text-slate-700">
            {stemmen.map(([c, x]) => <li key={c}>{naamVanCategorie(c)}: {x}×</li>)}
          </ul>
          <button type="button" disabled={bezig} className={`${KNOP_SECUNDAIR_KLEIN} mt-2`}
            onClick={() => doe("/api/beheer/namen/stem-wis", { k: n.k }, `Alle keuzes van gebruikers voor "${n.naam}" wissen?`)}>
            Keuzes wissen
          </button>
        </div>
      )}
      {fout && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}
    </li>
  );
}

// nieuw-V4R5 — "Naar Excel" en "Excel inlezen" (wens Boska 13-11).
function ExcelKnoppen({ opnieuw }) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [lees, setLees] = useState(null); // { bestand, wijzigingen, fouten }
  const [klaar, setKlaar] = useState("");
  const naarExcel = async () => {
    setBezig(true); setFout(""); setKlaar("");
    try {
      const d = await vraag("/api/beheer/namen/alles");
      const datum = new Date().toISOString().slice(0, 10);
      await schrijfExcel(namenNaarRijen(d.namen, naamVanCategorie), "Namenlijst", `Namenlijst ${datum}.xlsx`);
    } catch (e) { setFout(e.message); } finally { setBezig(false); }
  };
  const kies = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setFout(""); setKlaar("");
    try {
      const bladen = await leesExcelBladen(f);
      const u = bladen.map((b) => leesNamenRijen(b.rijen)).find((x) => !x.fout || x.wijzigingen.length || x.fouten.length) || leesNamenRijen(bladen[0]?.rijen || []);
      if (u.fout && !u.wijzigingen.length && !u.fouten.length) { setFout(u.fout); return; }
      setLees({ bestand: f.name, ...u });
    } catch (err) { setFout(err.message || "Het bestand kon niet worden gelezen."); }
  };
  const opslaan = async () => {
    setBezig(true); setFout("");
    try {
      const d = await vraag("/api/beheer/namen/ai-lijst", { items: lees.wijzigingen.map((w) => ({ k: w.k, categorie: w.categorie })) });
      setKlaar(`${d.opgeslagen} categorie${d.opgeslagen === 1 ? "" : "ën"} opgeslagen${d.overgeslagen?.length ? `, ${d.overgeslagen.length} overgeslagen` : ""}.`);
      setLees(null); await opnieuw();
    } catch (e) { setFout(e.message); } finally { setBezig(false); }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={bezig} onClick={naarExcel} className={KNOP_SECUNDAIR_KLEIN}>{bezig && !lees ? "Bezig…" : "Naar Excel"}</button>
        <label className={`${KNOP_SECUNDAIR_KLEIN} inline-flex cursor-pointer items-center`}>
          Excel inlezen
          <input type="file" accept=".xlsx,.xls,.ods,.csv" className="hidden" onChange={kies} />
        </label>
      </div>
      <p className="text-xs text-slate-500">Vul in Excel de kolom "Nieuwe categorie" in (de naam zoals in de keuzelijst) en lees het bestand weer in. Lege regels blijven zoals ze zijn.</p>
      {fout && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{fout}</p>}
      {klaar && <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">{klaar}</p>}
      {lees && (
        <div className="space-y-2 rounded-xl border border-slate-200 p-3 text-sm">
          <p className="text-slate-600">Uit <b>{lees.bestand}</b>: {lees.wijzigingen.length} categorie{lees.wijzigingen.length === 1 ? "" : "ën"} om op te slaan{lees.fouten.length ? `, ${lees.fouten.length} met een fout` : ""}. Er verandert pas iets na "Opslaan".</p>
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100 text-xs">
            {lees.wijzigingen.map((w) => <li key={`w${w.regel}`} className="flex gap-2 px-2 py-1.5"><span className="w-10 shrink-0 text-slate-400">{w.regel}</span><span className="font-medium">{w.naam}</span><span className="text-slate-500">→ {naamVanCategorie(w.categorie)}</span></li>)}
            {lees.fouten.map((f) => <li key={`f${f.regel}`} className="flex gap-2 bg-red-50/60 px-2 py-1.5 text-red-700"><span className="w-10 shrink-0 text-red-400">{f.regel}</span><span className="font-medium">{f.naam}</span><span>{f.reden}</span></li>)}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={bezig || !lees.wijzigingen.length} onClick={opslaan} className="rounded-lg bg-teal-700 px-3 py-1 text-sm font-medium text-white disabled:opacity-40">
              {lees.wijzigingen.length} opslaan
            </button>
            <button type="button" className={KNOP_SECUNDAIR_KLEIN} onClick={() => setLees(null)}>Annuleren</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BeheerNamen() {
  const [zoek, setZoek] = useState("");
  const [bron, setBron] = useState("alle");
  const [data, setData] = useState(null);
  const [fout, setFout] = useState("");
  const laad = useCallback(async () => {
    try {
      const d = await vraag(`/api/beheer/namen?zoek=${encodeURIComponent(zoek.trim())}&bron=${bron}`);
      setData(d); setFout("");
    } catch (e) { setFout(e.message); setData({ namen: [] }); }
  }, [zoek, bron]);
  useEffect(() => {
    const t = setTimeout(laad, 300);
    return () => clearTimeout(t);
  }, [laad]);

  return (
    <div className="space-y-3">
      <p className="text-slate-500">De bedrijfsnamen die de app heeft opgeslagen: wat de AI voorstelt en hoe gebruikers ze indeelden. Een categorie die je hier zet, geldt voor iedereen.</p>
      <div className="flex flex-wrap gap-2">
        <input type="search" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek naam, bijv. albert heijn" aria-label="Zoek naam"
          className={`${VELD_KLEIN} min-w-[12rem] flex-1`} autoComplete="off" />
        <select value={bron} onChange={(e) => setBron(e.target.value)} aria-label="Bron" className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
          {BRON.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
      </div>
      <ExcelKnoppen opnieuw={laad} />
      {fout && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{fout}</p>}
      {data === null ? <p className="text-slate-500">Laden…</p> : !data.namen?.length ? (
        <p className="text-slate-500">{zoek.trim() ? "Geen namen gevonden." : "Nog geen namen opgeslagen."}</p>
      ) : (
        <>
          <p className="text-xs text-slate-500">{data.namen.length} {data.namen.length === 1 ? "naam" : "namen"}{data.meer ? " (de eerste 300; zoek om verder te filteren)" : ""}</p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {data.namen.map((n) => <NaamRij key={`${n.k}|${n.ai?.categorie || ""}|${n.ai?.tijd || ""}`} n={n} opnieuw={laad} />)}
          </ul>
        </>
      )}
    </div>
  );
}
