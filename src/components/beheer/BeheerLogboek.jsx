import { useEffect, useState } from "react";
import { VELD_KLEIN } from "../ui/stijl.js";

// beide-V6R8 — Beheer → Logboek: wie wijzigde wanneer wat (worker/logboek.js, laatste 200 regels, met zoeken).

const nlTijd = (iso) => (iso ? new Date(iso).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" }) : "");

export default function BeheerLogboek() {
  const [regels, setRegels] = useState(null);
  const [zoek, setZoek] = useState("");
  const [fout, setFout] = useState("");

  useEffect(() => {
    let weg = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/beheer/logboek${zoek.trim() ? `?zoek=${encodeURIComponent(zoek.trim())}` : ""}`, { credentials: "same-origin", cache: "no-store" });
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.ok) throw new Error(d?.fout || `Fout ${r.status}`);
        if (!weg) { setRegels(d.logboek); setFout(""); }
      } catch (e) { if (!weg) { setFout(e.message); setRegels((x) => x || []); } }
    }, zoek ? 300 : 0);
    return () => { weg = true; clearTimeout(t); };
  }, [zoek]);

  return (
    <div className="space-y-3">
      <p className="text-slate-500">Elke wijziging in het beheer: rechten, aanvragen, verwijderen en het tarievenbestand. De nieuwste staat bovenaan.</p>
      <input type="search" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Zoek op e-mailadres of actie"
        className={`${VELD_KLEIN} w-full`} autoCapitalize="off" autoCorrect="off" aria-label="Zoeken in logboek" />
      {fout && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{fout}</p>}
      {regels === null ? <p className="text-slate-500">Laden…</p> : regels.length === 0 ? (
        <p className="text-slate-500">{zoek ? "Niets gevonden." : "Nog niets in het logboek. Wijzigingen vanaf deze versie komen hier te staan."}</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {regels.map((r, i) => (
            <li key={i} className="px-3 py-2">
              <p className="text-xs text-slate-500">{nlTijd(r.tijd)}{r.door ? ` · door ${r.door}` : ""}</p>
              <p className="font-medium text-slate-800 break-all">{r.actie}{r.email ? ` · ${r.email}` : ""}</p>
              {r.details && <p className={`text-xs break-words ${/NIET verstuurd/.test(r.details) ? "text-amber-800" : "text-slate-600"}`}>{r.details}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
