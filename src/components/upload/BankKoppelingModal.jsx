import { useEffect, useMemo, useState } from "react";
import ModalShell from "../modals/ModalShell.jsx";
import { KNOP_PRIMAIR, KNOP_SECUNDAIR_KLEIN, KNOP_PRIMAIR_KLEIN, VELD, VELD_KLEIN } from "../ui/stijl.js";
import { transactiesNaarRijen, voegRijenSamen, rijenNaarParsedFile } from "../../importers/enableBanking.js";

// nieuw-V3R8 — rechtstreekse bankkoppeling (proef, via Enable Banking en de Worker-routes /api/bank/*).
// nieuw-V4R0 — koppelingen (bank, rekeningen, versleuteld koppeltoken) horen bij het dossier en gaan mee met opslaan en
// laden. window.storage dient alleen als tussenstation: na terugkeer van de bank staat de nieuwe koppeling daar tot het
// koppelvenster haar in het open dossier zet (ook koppelingen uit V3R8/V3R9 komen zo in het dossier). Het token is alleen
// bruikbaar door de Worker, en alleen voor hetzelfde ingelogde e-mailadres.

const OPSLAG = "bankoverzicht:bankkoppelingen";
const STATE_KEY = "bankoverzicht:bankkoppeling-start";

async function api(pad, body, signal) {
  const r = await fetch(`/api/bank${pad}`, {
    signal,
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch { /* geen JSON, bijv. inlogpagina van Access */ }
  if (!r.ok || !data?.ok) throw Object.assign(new Error([data?.fout || `Fout ${r.status}`, data?.detail].filter(Boolean).join(" — ")), { data });
  return data;
}

async function leesKoppelingen() {
  try {
    const res = await window.storage.get(OPSLAG);
    const lijst = res?.value ? JSON.parse(res.value) : [];
    return Array.isArray(lijst) ? lijst : [];
  } catch { return []; }
}
async function bewaarKoppelingen(lijst) {
  try { await window.storage.set(OPSLAG, JSON.stringify(lijst)); } catch { /* opslag vol of niet beschikbaar */ }
}

const vandaag = () => new Date().toISOString().slice(0, 10);
const nlDatum = (iso) => (iso ? new Date(iso).toLocaleDateString("nl-NL") : "—");
const standaardVan = () => `${new Date().getFullYear() - 1}-01-01`;

// Terug van de bank (/bank/terug?code=…&state=…): de eenmalige code meteen inwisselen voor een koppeling en die
// bewaren. Geeft een melding terug, of gooit een fout met een leesbare tekst.
export async function rondKoppelingAf(terug) {
  let start = null;
  try { start = JSON.parse(sessionStorage.getItem(STATE_KEY) || "null"); } catch { /* leeg */ }
  try { sessionStorage.removeItem(STATE_KEY); } catch { /* leeg */ }
  if (terug.error) throw new Error(`De bank gaf geen toestemming: ${terug.error}`);
  if (!start || !terug.state || start.state !== terug.state) throw new Error("Deze terugkeer van de bank hoort niet bij een koppeling die in deze browser is gestart. Begin opnieuw.");
  const s = await api("/sessie", { code: terug.code, bank: start.bank, ...(start.pkce ? { pkce: start.pkce } : {}) });
  const nieuw = { id: crypto.randomUUID(), bank: s.bank || start.bank, psu: start.psu, token: s.token, rekeningen: s.rekeningen, geldigTot: s.geldigTot, gekoppeldOp: new Date().toISOString(), opgehaald: {} };
  await bewaarKoppelingen([...(await leesKoppelingen()), nieuw]);
  const n = s.rekeningen.length;
  return `${nieuw.bank} is gekoppeld (${n} rekening${n === 1 ? "" : "en"}). Kies hieronder "Ophalen".`;
}

export default function BankKoppelingModal({ afronding, parsedFiles, koppelingen = [], onKoppelingen, onImport, onClose }) {
  const [psu, setPsu] = useState("personal");
  const [banken, setBanken] = useState(null);
  const [zoek, setZoek] = useState("");
  const [gekozen, setGekozen] = useState("");
  const [bezig, setBezig] = useState("");
  const [fout, setFout] = useState("");
  const [melding, setMelding] = useState("");
  const [vanDatum, setVanDatum] = useState({});
  const [aanbieder, setAanbieder] = useState(null); // nieuw-V5R1 — "enablebanking" of "ponto" (instelling in de Worker)
  const isPonto = aanbieder === "ponto";

  // Koppelingen uit het tussenstation in het dossier zetten (dubbele id's overslaan) en het tussenstation leegmaken.
  const pakTussenstationOp = async () => {
    const wachtend = await leesKoppelingen();
    if (wachtend.length === 0) return;
    onKoppelingen((prev) => {
      const ids = new Set((prev || []).map((k) => k.id));
      return [...(prev || []), ...wachtend.filter((k) => !ids.has(k.id))];
    });
    await bewaarKoppelingen([]);
  };
  useEffect(() => { pakTussenstationOp(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Afronden na terugkeer van de bank gebeurt in App (rondKoppelingAf), ook als eerst het startscherm verschijnt.
  useEffect(() => {
    if (!afronding) return;
    if (afronding.fout) setFout(afronding.fout);
    if (afronding.melding) { setMelding(afronding.melding); pakTussenstationOp(); }
  }, [afronding]);

  const laadBanken = async (soort) => {
    setBanken(null); setGekozen(""); setFout("");
    try { const d = await api(`/banken?psu=${soort}`); setAanbieder(d.aanbieder || "enablebanking"); setBanken(d.banken); } catch (e) { setFout(e.message); setBanken([]); }
  };
  useEffect(() => { laadBanken(psu); }, [psu]);

  const gefilterd = useMemo(() => (banken || []).filter((b) => b.naam.toLowerCase().includes(zoek.trim().toLowerCase())), [banken, zoek]);

  const naarBank = async () => {
    const bank = isPonto ? { naam: "Ponto" } : (banken || []).find((b) => b.naam === gekozen);
    if (!bank) return;
    setBezig("start"); setFout("");
    try {
      const state = crypto.randomUUID();
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ state, bank: bank.naam, psu }));
      const s = await api("/start", { bank: bank.naam, psu, state, maxGeldigSec: bank.maxGeldigSec });
      // nieuw-V5R1 — bij Ponto gaat de (versleutelde) PKCE-code mee, nodig om de koppeling na terugkeer af te ronden.
      if (s.pkce) sessionStorage.setItem(STATE_KEY, JSON.stringify({ state, bank: bank.naam, psu, pkce: s.pkce }));
      window.location.assign(s.url);
    } catch (e) {
      setFout(e.message);
      setBezig("");
    }
  };

  const ophalen = async (k, idx) => {
    const rek = k.rekeningen[idx];
    const van = vanDatum[`${k.id}|${idx}`] || k.opgehaald?.[idx] || standaardVan();
    setBezig(`${k.id}|${idx}`); setFout(""); setMelding("");
    try {
      const d = await api("/transacties", { token: k.token, rekening: idx, van, tot: vandaag() });
      // nieuw-V5R1 — Ponto vervangt de sleutel bij elk gebruik: het nieuwe koppeltoken meteen in het dossier zetten.
      if (d.token) onKoppelingen((prev) => (prev || []).map((x) => (x.id === k.id ? { ...x, token: d.token } : x)));
      const nieuweRijen = transactiesNaarRijen(d.transacties, rek.iban);
      const label = rijenNaarParsedFile([], { bank: k.bank, iban: rek.iban }).fileName;
      const bestaand = (parsedFiles || []).find((p) => p.fileName === label);
      const { rijen, toegevoegd } = voegRijenSamen(bestaand?.rows || [], nieuweRijen);
      if (rijen.length === 0) { setMelding(`Geen geboekte transacties gevonden voor ${rek.iban || "deze rekening"} vanaf ${nlDatum(van)}.`); return; }
      onImport(rijenNaarParsedFile(rijen, { bank: k.bank, iban: rek.iban, naam: rek.naam }), k.psu === "business" ? "Zakelijk" : "Prive");
      // Volgende keer vanaf een week vóór de laatste boeking: overlap vangt late boekingen op, dubbelingen vallen weg.
      const laatste = rijen[rijen.length - 1]["Datum"];
      const volgende = new Date(Date.UTC(+laatste.slice(0, 4), +laatste.slice(4, 6) - 1, +laatste.slice(6, 8) - 7)).toISOString().slice(0, 10);
      onKoppelingen((prev) => (prev || []).map((x) => (x.id === k.id ? { ...x, opgehaald: { ...(x.opgehaald || {}), [idx]: volgende } } : x)));
      setMelding(`${toegevoegd} nieuwe boeking${toegevoegd === 1 ? "" : "en"} toegevoegd voor ${rek.iban || rek.naam}.${d.onvolledig ? " Niet alles kon in één keer worden opgehaald: haal nog een keer op." : ""}`);
      // nieuw-V3R9 — na een geslaagde ophaalactie het venster sluiten, zodat de import (en zo nodig de wizard) zichtbaar is.
      if (toegevoegd > 0 && !d.onvolledig) onClose();
    } catch (e) {
      if (e.data?.token) onKoppelingen((prev) => (prev || []).map((x) => (x.id === k.id ? { ...x, token: e.data.token } : x)));
      setFout(e.message);
    } finally {
      setBezig("");
    }
  };

  // nieuw-V4R1 — eerst uit het dossier halen (direct zichtbaar), daarna de toestemming bij Enable Banking intrekken.
  // Dat intrekken mag mislukken of lang duren (max. 15 s): de koppeling is dan toch al weg uit het dossier.
  const verwijder = async (k) => {
    setFout(""); setMelding("");
    onKoppelingen((prev) => (prev || []).filter((x) => x.id !== k.id));
    const rekeningen = k.rekeningen.map((r) => r.iban || r.naam).filter(Boolean).join(", ");
    const stop = new AbortController();
    const klok = setTimeout(() => stop.abort(), 15000);
    try {
      await api("/verwijder", { token: k.token }, stop.signal);
      setMelding(`${k.bank} is ontkoppeld${rekeningen ? ` (${rekeningen})` : ""}. Al opgehaalde boekingen blijven in het dossier; verwijder ze zo nodig bij de bankbestanden.`);
    } catch (e) {
      setMelding(`${k.bank} is uit dit dossier verwijderd. Het intrekken bij de bank lukte niet (${e.name === "AbortError" ? "geen antwoord" : e.message}); de toestemming verloopt dan vanzelf.`);
    } finally {
      clearTimeout(klok);
    }
  };

  return (
    <ModalShell title="Rechtstreeks koppelen met de bank (proef)" onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-5 text-sm text-slate-700">
        {isPonto ? (
          <p className="text-slate-500">
            Je logt in bij Ponto (een dienst van Isabel Group met een PSD2-vergunning) en kiest daar je bank en de
            rekeningen die je wilt delen. Heb je nog geen Ponto-account, dan maak je dat daar aan. De app kan alleen lezen,
            geen betalingen doen. De transacties gaan rechtstreeks naar deze browser en worden niet op een server bewaard.
            De koppeling wordt in dit dossier bewaard; Ponto vraagt ongeveer elk half jaar om opnieuw toestemming te geven.
          </p>
        ) : (
          <p className="text-slate-500">
            Je logt in bij je eigen bank en geeft toestemming om je transacties te lezen (alleen lezen, geen betalingen).
            De gegevens gaan via Enable Banking rechtstreeks naar deze browser en worden niet op een server bewaard.
            De koppeling wordt in dit dossier bewaard en gaat mee met opslaan en laden. De toestemming verloopt na maximaal 180 dagen.
          </p>
        )}

        {fout && <p className="rounded-veld bg-red-50 px-3 py-2 text-red-700 whitespace-pre-wrap">{fout}</p>}
        {melding && <p className="rounded-veld bg-teal-50 px-3 py-2 text-teal-800">{melding}</p>}
        {afronding?.bezig && <p className="text-slate-500">Koppeling met de bank afronden…</p>}

        {koppelingen.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-semibold text-slate-800">Gekoppelde banken</h3>
            {koppelingen.map((k) => {
              const verlopen = k.geldigTot && new Date(k.geldigTot) < new Date();
              return (
                <div key={k.id} className="rounded-veld border border-slate-200 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-medium">{k.bank}</span>
                      <span className="text-xs text-slate-500"> · {k.psu === "business" ? "zakelijk" : "privé"} · {verlopen ? <b className="text-red-700">verlopen, opnieuw koppelen</b> : k.geldigTot ? `geldig tot ${nlDatum(k.geldigTot)}` : "gekoppeld"}</span>
                    </div>
                    <button type="button" className={KNOP_SECUNDAIR_KLEIN} onClick={() => verwijder(k)}>Ontkoppelen</button>
                  </div>
                  {k.rekeningen.map((r, idx) => {
                    const sleutel = `${k.id}|${idx}`;
                    return (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <span className="min-w-[13rem] font-mono text-xs">{r.iban || r.naam || `Rekening ${idx + 1}`}</span>
                        <label className="text-xs text-slate-500">vanaf</label>
                        <input type="date" className={VELD_KLEIN} max={vandaag()}
                          value={vanDatum[sleutel] || k.opgehaald?.[idx] || standaardVan()}
                          onChange={(e) => setVanDatum((v) => ({ ...v, [sleutel]: e.target.value }))} />
                        <button className={KNOP_PRIMAIR_KLEIN} disabled={!!bezig || verlopen} onClick={() => ophalen(k, idx)}>
                          {bezig === sleutel ? "Ophalen…" : "Ophalen"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </section>
        )}

        <section className="space-y-2">
          <h3 className="font-semibold text-slate-800">Nieuwe bank koppelen</h3>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5"><input type="radio" checked={psu === "personal"} onChange={() => setPsu("personal")} /> Privé</label>
            <label className="flex items-center gap-1.5"><input type="radio" checked={psu === "business"} onChange={() => setPsu("business")} /> Zakelijk</label>
          </div>
          {isPonto ? (
            <p className="text-slate-500">Je kiest je bank bij Ponto. Na het koppelen kom je hier terug.</p>
          ) : (<>
          <input className={`${VELD} w-full`} placeholder="Zoek je bank" value={zoek} onChange={(e) => setZoek(e.target.value)} />
          <div className="max-h-56 overflow-y-auto rounded-veld border border-slate-200 divide-y divide-slate-100">
            {banken === null && <p className="px-3 py-2 text-slate-500">Banken laden…</p>}
            {banken && gefilterd.length === 0 && <p className="px-3 py-2 text-slate-500">Geen bank gevonden.</p>}
            {gefilterd.map((b) => (
              <label key={b.naam} className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 ${gekozen === b.naam ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                <input type="radio" name="bank" checked={gekozen === b.naam} onChange={() => setGekozen(b.naam)} />
                {b.logo && <img src={b.logo} alt="" className="h-5 w-5 object-contain" />}
                <span>{b.naam}</span>
                {b.beta && <span className="text-xs text-amber-700">bèta</span>}
              </label>
            ))}
          </div>
          </>)}
          <button className={KNOP_PRIMAIR} disabled={(!isPonto && !gekozen) || !aanbieder || !!bezig} onClick={naarBank}>
            {bezig === "start" ? "Doorsturen…" : isPonto ? "Naar Ponto" : "Naar mijn bank"}
          </button>
        </section>
      </div>
    </ModalShell>
  );
}
