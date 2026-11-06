import { useEffect, useMemo, useState } from "react";

// beide-V7R3 — Beheer → Peiling: de antwoorden op de vrijwillige vraag bij verlengen, "zou je voor de app willen betalen,
// en zo ja hoeveel per maand?" (worker/peiling.js). Bedoeld voor het besluit over betaalde abonnementen.
// huishoudboekje-V1R0 — ook het Huishoudboekje, een filter per soort, en de vraag over (extra) betalen voor de bankkoppeling.

const BETALEN = { ja: "Ja", misschien: "Misschien", nee: "Nee" };
const KOPPELING = { ja: "Ja", misschien: "Misschien", nee: "Nee" };
const SOORT = { zakelijk: "Zakelijk", prive: "Privé", huishoudboekje: "Huishoudboekje" };
const euro = (b) => (b == null ? "–" : `€ ${Number(b).toFixed(2).replace(".", ",")}`);
const nlDatum = (iso) => (iso ? new Date(iso).toLocaleDateString("nl-NL") : "");

// Samenvatting over de gefilterde antwoorden (zelfde rekenwijze als de Worker).
export function vatSamen(rijen) {
  const aantal = { ja: 0, misschien: 0, nee: 0 }, koppeling = { ja: 0, misschien: 0, nee: 0 };
  for (const r of rijen) {
    if (aantal[r.betalen] != null) aantal[r.betalen]++;
    if (koppeling[r.koppeling] != null) koppeling[r.koppeling]++;
  }
  const b = rijen.map((r) => r.bedrag).filter((x) => x != null).sort((x, y) => x - y);
  const mediaan = b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : null;
  const gemiddeld = b.length ? Math.round((b.reduce((x, y) => x + y, 0) / b.length) * 100) / 100 : null;
  return { totaal: rijen.length, aantal, koppeling, koppelingTotaal: koppeling.ja + koppeling.misschien + koppeling.nee, bedragen: b.length, gemiddeld, mediaan };
}

function Tegels({ items }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([t, n]) => (
        <div key={t} className="rounded-xl border border-slate-200 px-3 py-2"><p className="text-xs text-slate-500">{t}</p><p className="text-lg font-semibold text-slate-800">{n}</p></div>
      ))}
    </div>
  );
}

export default function BeheerPeiling() {
  const [data, setData] = useState(null);
  const [fout, setFout] = useState("");
  const [soort, setSoort] = useState("alle");
  useEffect(() => {
    let weg = false;
    (async () => {
      try {
        const r = await fetch("/api/beheer/peiling", { credentials: "same-origin", cache: "no-store" });
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.ok) throw new Error(d?.fout || `Fout ${r.status}`);
        if (!weg) setData(d);
      } catch (e) { if (!weg) { setFout(e.message); setData({ antwoorden: [], samenvatting: null }); } }
    })();
    return () => { weg = true; };
  }, []);

  const rijen = useMemo(() => (data?.antwoorden || []).filter((a) => soort === "alle" || (a.gebruik || "zakelijk") === soort), [data, soort]);
  const s = useMemo(() => vatSamen(rijen), [rijen]);
  return (
    <div className="space-y-3">
      <p className="text-slate-500">Bij elke verlenging kan de gebruiker vrijwillig aangeven of betalen voor de app een optie is, en voor hoeveel per maand. Daarnaast de vraag of de gebruiker extra wil betalen voor de automatische bankkoppeling (ongeveer € 1 per rekening per maand).</p>
      {fout && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{fout}</p>}
      {data !== null && (data.antwoorden || []).length > 0 && (
        <select value={soort} onChange={(e) => setSoort(e.target.value)} aria-label="Soort" className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
          <option value="alle">Alle soorten</option>
          {Object.entries(SOORT).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
      )}
      {data === null ? <p className="text-slate-500">Laden…</p> : !s.totaal ? (
        <p className="text-slate-500">{(data.antwoorden || []).length ? "Geen antwoorden voor deze soort." : "Nog geen antwoorden. Ze komen binnen zodra gebruikers verlenging aanvragen."}</p>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Betalen voor de app</p>
          <Tegels items={[["Antwoorden", s.totaal], ["Ja", s.aantal.ja], ["Misschien", s.aantal.misschien], ["Nee", s.aantal.nee]]} />
          <p className="text-sm text-slate-700">
            Genoemd bedrag per maand ({s.bedragen}×): gemiddeld <b>{euro(s.gemiddeld)}</b>, mediaan <b>{euro(s.mediaan)}</b>.
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Extra betalen voor de bankkoppeling</p>
          <Tegels items={[["Antwoorden", s.koppelingTotaal], ["Ja", s.koppeling.ja], ["Misschien", s.koppeling.misschien], ["Nee", s.koppeling.nee]]} />
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {rijen.map((a, i) => (
              <li key={i} className="px-3 py-2">
                <p className="text-xs text-slate-500">{nlDatum(a.tijd)} · {SOORT[a.gebruik] || "Zakelijk"}{a.organisatie ? ` · ${a.organisatie}` : ""}</p>
                <p className="font-medium text-slate-800 break-all">{a.betalen ? `${BETALEN[a.betalen] || a.betalen}${a.bedrag != null ? ` · ${euro(a.bedrag)} per maand` : ""}` : "Betalen: –"}{a.koppeling ? ` · koppeling: ${KOPPELING[a.koppeling] || a.koppeling}` : ""} · {a.naam || a.email}</p>
                {a.toelichting && <p className="text-xs text-slate-600 break-words">{a.toelichting}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
