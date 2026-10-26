import { useEffect, useState } from "react";

// beide-V7R3 — Beheer → Peiling: de antwoorden op de vrijwillige vraag bij verlengen, "zou je voor de app willen betalen,
// en zo ja hoeveel per maand?" (worker/peiling.js). Bedoeld voor het besluit over betaalde abonnementen.

const BETALEN = { ja: "Ja", misschien: "Misschien", nee: "Nee" };
const euro = (b) => (b == null ? "–" : `€ ${Number(b).toFixed(2).replace(".", ",")}`);
const nlDatum = (iso) => (iso ? new Date(iso).toLocaleDateString("nl-NL") : "");

export default function BeheerPeiling() {
  const [data, setData] = useState(null);
  const [fout, setFout] = useState("");
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

  const s = data?.samenvatting;
  return (
    <div className="space-y-3">
      <p className="text-slate-500">Bij elke verlenging kan de gebruiker vrijwillig aangeven of betalen voor de app een optie is, en voor hoeveel per maand.</p>
      {fout && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{fout}</p>}
      {data === null ? <p className="text-slate-500">Laden…</p> : !s?.totaal ? (
        <p className="text-slate-500">Nog geen antwoorden. Ze komen binnen zodra gebruikers verlenging aanvragen.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[["Antwoorden", s.totaal], ["Ja", s.aantal.ja], ["Misschien", s.aantal.misschien], ["Nee", s.aantal.nee]].map(([t, n]) => (
              <div key={t} className="rounded-xl border border-slate-200 px-3 py-2"><p className="text-xs text-slate-500">{t}</p><p className="text-lg font-semibold text-slate-800">{n}</p></div>
            ))}
          </div>
          <p className="text-sm text-slate-700">
            Genoemd bedrag per maand ({s.bedragen}×): gemiddeld <b>{euro(s.gemiddeld)}</b>, mediaan <b>{euro(s.mediaan)}</b>.
          </p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {data.antwoorden.map((a, i) => (
              <li key={i} className="px-3 py-2">
                <p className="text-xs text-slate-500">{nlDatum(a.tijd)} · {a.gebruik === "prive" ? "Privé" : "Zakelijk"}{a.organisatie ? ` · ${a.organisatie}` : ""}</p>
                <p className="font-medium text-slate-800 break-all">{BETALEN[a.betalen] || a.betalen}{a.bedrag != null ? ` · ${euro(a.bedrag)} per maand` : ""} · {a.naam || a.email}</p>
                {a.toelichting && <p className="text-xs text-slate-600 break-words">{a.toelichting}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
