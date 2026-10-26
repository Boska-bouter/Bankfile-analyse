import { useEffect, useState } from "react";
import { VELD_KLEIN, KNOP_SECUNDAIR_KLEIN } from "../ui/stijl.js";

// beide-V6R8 — Beheer → Logboek: wie wijzigde wanneer wat (worker/logboek.js, laatste 200 regels, met zoeken).
// beide-V7R7 — exporteren (CSV voor Excel) en daarna opschonen; boven de grens een waarschuwing (en een mail).

const nlTijd = (iso) => (iso ? new Date(iso).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" }) : "");

export default function BeheerLogboek() {
  const [regels, setRegels] = useState(null);
  const [zoek, setZoek] = useState("");
  const [fout, setFout] = useState("");
  const [stand, setStand] = useState(null); // { aantal, grens }
  const [melding, setMelding] = useState("");
  const [bezig, setBezig] = useState(false);
  const [ververs, setVervers] = useState(0);

  const exporteer = async () => {
    setBezig(true); setFout(""); setMelding("");
    try {
      const r = await fetch("/api/beheer/logboek/export", { credentials: "same-origin", cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.fout || `Fout ${r.status}`);
      if (!d.aantal) { setMelding("Het logboek is leeg; er is niets te exporteren."); return; }
      const url = URL.createObjectURL(new Blob([d.csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url; a.download = `beheerlogboek-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (!window.confirm(`Het logboek is gedownload (${d.aantal} regels).\n\nDeze regels nu uit het logboek verwijderen? Doe dit alleen als het bestand goed is opgeslagen.`)) {
        setMelding(`Gedownload: ${d.aantal} regels. Het logboek is niet opgeschoond.`);
        return;
      }
      const o = await fetch("/api/beheer/logboek/opschonen", { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ totId: d.totId }) });
      const od = await o.json().catch(() => null);
      if (!o.ok || !od?.ok) throw new Error(od?.fout || `Fout ${o.status}`);
      setMelding(`Gedownload en opgeschoond: ${od.verwijderd} regels verwijderd.`);
      setVervers((n) => n + 1);
    } catch (e) { setFout(e.message); } finally { setBezig(false); }
  };

  useEffect(() => {
    let weg = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/beheer/logboek${zoek.trim() ? `?zoek=${encodeURIComponent(zoek.trim())}` : ""}`, { credentials: "same-origin", cache: "no-store" });
        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.ok) throw new Error(d?.fout || `Fout ${r.status}`);
        if (!weg) { setRegels(d.logboek); setStand(d.aantal != null ? { aantal: d.aantal, grens: d.grens } : null); setFout(""); }
      } catch (e) { if (!weg) { setFout(e.message); setRegels((x) => x || []); } }
    }, zoek ? 300 : 0);
    return () => { weg = true; clearTimeout(t); };
  }, [zoek, ververs]);

  return (
    <div className="space-y-3">
      <p className="text-slate-500">Elke wijziging in het beheer: rechten, aanvragen, verwijderen en het tarievenbestand. De nieuwste staat bovenaan.</p>
      <div className="flex flex-wrap items-center gap-3">
        <p className={`min-w-0 flex-1 text-sm ${stand && stand.aantal >= stand.grens ? "font-semibold text-amber-800" : "text-slate-600"}`}>
          {stand ? `${stand.aantal} regel${stand.aantal === 1 ? "" : "s"} in het logboek (grens ${stand.grens}${stand.aantal >= stand.grens ? ": exporteer en schoon op" : ""}).` : ""}
        </p>
        <button type="button" disabled={bezig} onClick={exporteer} className={`${KNOP_SECUNDAIR_KLEIN} disabled:opacity-50`}>Exporteren en opschonen…</button>
      </div>
      {melding && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{melding}</p>}
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
