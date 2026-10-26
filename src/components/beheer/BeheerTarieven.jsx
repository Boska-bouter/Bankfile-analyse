import { useEffect, useState } from "react";
import { KNOP_PRIMAIR_KLEIN, KNOP_SECUNDAIR_KLEIN } from "../ui/stijl.js";
import { controleerTarievenBestand } from "../../tax/tarievenBestand.js";
import { huidigeTarieven, tarievenInfo } from "../../tax/tarievenLaden.js";

// beide-V6R7 — Beheer → Tarieven: het tarievenbestand op de server zetten, bekijken of weghalen (worker/tarieven.js).
// Elke gebruiker krijgt het bij de volgende start van de app; zonder bestand gelden de tarieven die in de app zitten.

async function api(body) {
  const r = await fetch("/api/beheer/tarieven", body
    ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" }
    : { credentials: "same-origin", cache: "no-store" });
  let d = null;
  try { d = await r.json(); } catch { /* geen JSON */ }
  if (!r.ok || !d?.ok) throw new Error(d?.fout ? `${d.fout}${d.detail ? ` (${d.detail})` : ""}` : `Fout ${r.status}`);
  return d;
}

const jarenTekst = (bestand) => Object.entries(bestand?.jaren || {})
  .map(([j, w]) => `${j}${w.status === "voorlopig" ? " (voorlopig)" : ""}`).join(", ");
const nlTijd = (iso) => (iso ? new Date(iso).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" }) : "");

function bewaar(bestand, naam) {
  const blob = new Blob([JSON.stringify(bestand, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = naam;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function BeheerTarieven() {
  const [server, setServer] = useState(undefined); // undefined = laden, null = geen bestand
  const [nieuw, setNieuw] = useState(null); // gecontroleerd bestand dat klaarstaat om op de server te zetten
  const [fout, setFout] = useState("");
  const [melding, setMelding] = useState("");
  const [bezig, setBezig] = useState(false);

  const laad = async () => {
    try { const d = await api(); setServer(d.tarieven ? d : null); } catch (e) { setFout(e.message); setServer(null); }
  };
  useEffect(() => { laad(); }, []);

  const kies = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setFout(""); setMelding(""); setNieuw(null);
    if (!file) return;
    try {
      const r = controleerTarievenBestand(JSON.parse(await file.text()));
      if (!r.ok) { setFout(`Dit bestand klopt niet: ${r.fout}.`); return; }
      setNieuw({ ...r.bestand, bestandsnaam: file.name });
    } catch { setFout("Dit is geen leesbaar JSON-bestand."); }
  };

  const zetOpServer = async () => {
    setBezig(true); setFout("");
    try {
      const { bestandsnaam, ...tarieven } = nieuw;
      await api({ tarieven });
      setNieuw(null);
      setMelding("Het tarievenbestand staat op de server. Gebruikers krijgen het de volgende keer dat de app opent.");
      await laad();
    } catch (e) { setFout(e.message); } finally { setBezig(false); }
  };

  const wis = async () => {
    if (!window.confirm("Tarievenbestand van de server halen? Daarna rekent de app weer met de tarieven die erin zitten.")) return;
    setBezig(true); setFout("");
    try {
      await api({ wissen: true });
      setMelding("Het tarievenbestand is weg. De app rekent weer met de ingebouwde tarieven (na opnieuw openen).");
      await laad();
    } catch (e) { setFout(e.message); } finally { setBezig(false); }
  };

  const info = tarievenInfo();
  return (
    <div className="space-y-4">
      <p className="text-slate-500">
        Hier staan de belastingtarieven die de app gebruikt, los van de app zelf. Een nieuw jaar of een correctie zet je hier
        neer zonder nieuwe release. Elke gebruiker krijgt het bestand bij de volgende start van de app.
      </p>
      {melding && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{melding}</p>}
      {fout && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{fout}</p>}

      <div className="rounded-xl border border-slate-200 p-3 space-y-1">
        <p className="font-semibold text-slate-800">Op de server</p>
        {server === undefined ? <p className="text-slate-500">Laden…</p> : server ? (
          <>
            <p>Versie <b>{server.versie || "zonder versie"}</b>, gezet op {nlTijd(server.gewijzigd)}{server.door ? ` door ${server.door}` : ""}.</p>
            <p className="text-xs text-slate-500">Jaren: {jarenTekst(server.tarieven)}</p>
            {server.tarieven?.bron && <p className="text-xs text-slate-500">Bron: {server.tarieven.bron}</p>}
          </>
        ) : <p className="text-slate-500">Geen tarievenbestand. De app rekent met de tarieven die erin zitten.</p>}
        <p className="text-xs text-slate-500">
          Deze app gebruikt nu: {info ? `bestand versie ${info.versie || "zonder versie"}${info.herkomst === "bewaard" ? " (bewaarde kopie)" : ""}` : "de ingebouwde tarieven"}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => bewaar(huidigeTarieven(), `tarieven-${new Date().toISOString().slice(0, 10)}.json`)} className={KNOP_SECUNDAIR_KLEIN}>
          Huidige tarieven downloaden
        </button>
        <label className={`${KNOP_SECUNDAIR_KLEIN} cursor-pointer`}>
          Tarievenbestand kiezen…
          <input type="file" accept=".json,application/json" onChange={kies} className="sr-only" />
        </label>
        {server && (
          <button type="button" disabled={bezig} onClick={wis} className="rounded-veld border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
            Terug naar ingebouwde tarieven
          </button>
        )}
      </div>

      {nieuw && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 space-y-2">
          <p className="font-semibold text-slate-800">Klaar om op de server te zetten: {nieuw.bestandsnaam}</p>
          <p className="text-xs text-slate-600">Versie {nieuw.versie || "zonder versie"} · jaren: {jarenTekst(nieuw)}</p>
          {nieuw.bron && <p className="text-xs text-slate-600">Bron: {nieuw.bron}</p>}
          <p className="text-xs text-slate-600">Het bestand is gecontroleerd. Jaren en onderdelen die er niet in staan, blijven zoals in de app.</p>
          <div className="flex gap-2">
            <button type="button" disabled={bezig} onClick={zetOpServer} className={`${KNOP_PRIMAIR_KLEIN} disabled:opacity-50`}>Op de server zetten</button>
            <button type="button" disabled={bezig} onClick={() => setNieuw(null)} className={KNOP_SECUNDAIR_KLEIN}>Annuleren</button>
          </div>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Rond december en januari komt er elk jaar een nieuw tarievenbestand met de officiële bedragen. Zet dat bestand hier neer.
      </p>
    </div>
  );
}
