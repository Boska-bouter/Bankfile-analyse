import { useEffect, useMemo, useRef, useState } from "react";
import ModalShell from "../modals/ModalShell.jsx";
import { KNOP_PRIMAIR, KNOP_SECUNDAIR_KLEIN, KNOP_PRIMAIR_KLEIN, VELD, VELD_KLEIN } from "../ui/stijl.js";
import { transactiesNaarRijen, voegRijenSamen, rijenNaarParsedFile } from "../../importers/enableBanking.js";
import { BankkoppelingStatus } from "../../content/bankkoppelingStatus.jsx";

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
// beide-V3R4 — koppelingen die de Worker na terugkeer van de bank zelf heeft afgerond (ook als die terugkeer in een
// andere browser binnenkwam, zoals Safari bij de app als icoon op het beginscherm) ophalen en in het tussenstation zetten.
// beide-V3R6 — de server bewaart het resultaat tot het eerste gebruik (max. 2 uur); "bekend" zijn de id's die al in het
// dossier staan, die worden overgeslagen.
// De states van koppelingen die in deze app zijn gestart (localStorage: blijft bewaard als de app herlaadt na de bank).
const STATES_KEY = "bankoverzicht:bankkoppeling-states";
const leesStates = () => {
  try {
    const l = JSON.parse(localStorage.getItem(STATES_KEY) || "[]");
    return Array.isArray(l) ? l.filter((x) => x && Date.now() - x.t < 3 * 3600 * 1000) : [];
  } catch { return []; }
};
const bewaarState = (state) => { try { localStorage.setItem(STATES_KEY, JSON.stringify([...leesStates(), { s: state, t: Date.now() }].slice(-5))); } catch { /* geen opslag */ } };

export async function haalWachtendeOp(bekend = new Set()) {
  const states = leesStates().map((x) => x.s);
  const d = await api(`/wachtend?states=${encodeURIComponent(states.join(","))}`);
  const nieuw = (d.koppelingen || []).filter((k) => !bekend.has(k.id));
  if (nieuw.length > 0) {
    const bestaand = await leesKoppelingen();
    const ids = new Set(bestaand.map((k) => k.id));
    await bewaarKoppelingen([...bestaand, ...nieuw.filter((k) => !ids.has(k.id))]);
    try { sessionStorage.removeItem(STATE_KEY); } catch { /* leeg */ }
  }
  const melding = nieuw.map((k) => {
    const n = k.rekeningen?.length || 0;
    return `${k.bank} is gekoppeld (${n} rekening${n === 1 ? "" : "en"}). Kies hieronder "Ophalen".`;
  }).join(" ");
  return { melding, fout: (d.fouten || []).join("\n") };
}

export async function rondKoppelingAf(terug) {
  // beide-V3R4 — de Worker heeft de koppeling al afgerond (zie bankTerugRoute in worker/bank.js).
  if (terug.klaar) {
    const r = await haalWachtendeOp(new Set());
    if (r.fout && !r.melding) throw new Error(r.fout);
    if (!r.melding) throw new Error("Terug van de bank, maar deze app vond geen klaarstaande koppeling. Begin opnieuw met koppelen.");
    // Staat de koppeling al in het dossier, dan meldt het koppelvenster dat zelf (pakServerOp slaat bekende id's over).
    return r.melding || "";
  }
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

  // beide-V3R4 — terug in de app na koppelen in een ander venster (bijv. Safari bij de app als icoon op het
  // beginscherm): de koppeling staat dan klaar op de server. Ophalen bij openen, zodra de app weer in beeld komt, en
  // na "Naar Ponto"/"Naar mijn bank" elke paar seconden zolang het venster openstaat.
  const [wachtOpBank, setWachtOpBank] = useState(false);
  const bekendRef = useRef(new Set());
  bekendRef.current = new Set((koppelingen || []).map((k) => k.id));
  const pakServerOp = async () => {
    try {
      const r = await haalWachtendeOp(bekendRef.current);
      if (!r.melding && !r.fout) return;
      if (r.fout) setFout(r.fout);
      if (r.melding) setMelding(r.melding);
      setBezig("");
      setWachtOpBank(false);
      await pakTussenstationOp();
    } catch { /* geen verbinding of geen recht: later opnieuw */ }
  };
  useEffect(() => {
    pakServerOp();
    const zichtbaar = () => { if (document.visibilityState === "visible") pakServerOp(); };
    document.addEventListener("visibilitychange", zichtbaar);
    window.addEventListener("focus", zichtbaar);
    return () => { document.removeEventListener("visibilitychange", zichtbaar); window.removeEventListener("focus", zichtbaar); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!wachtOpBank) return undefined;
    let n = 0;
    const iv = setInterval(() => {
      n += 1;
      if (n > 200) { setWachtOpBank(false); setBezig(""); return; } // na ongeveer 10 minuten stoppen
      if (document.visibilityState === "visible") pakServerOp();
    }, 3000);
    return () => clearInterval(iv);
  }, [wachtOpBank]); // eslint-disable-line react-hooks/exhaustive-deps

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
      bewaarState(state);
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ state, bank: bank.naam, psu }));
      const s = await api("/start", { bank: bank.naam, psu, state, maxGeldigSec: bank.maxGeldigSec });
      // nieuw-V5R1 — bij Ponto gaat de (versleutelde) PKCE-code mee, nodig om de koppeling na terugkeer af te ronden.
      if (s.pkce) sessionStorage.setItem(STATE_KEY, JSON.stringify({ state, bank: bank.naam, psu, pkce: s.pkce }));
      setWachtOpBank(true);
      window.location.assign(s.url);
    } catch (e) {
      setFout(e.message);
      setBezig("");
    }
  };

  // beide-V4R8 — twee rekeningen met hetzelfde rekeningnummer (kan bij Ponto) krijgen elk een eigen bestand.
  const volgnrVan = (k, idx) => {
    const iban = k.rekeningen[idx]?.iban;
    if (!iban) return 1;
    return k.rekeningen.slice(0, idx).filter((r) => r.iban === iban).length + 1;
  };
  const dubbelIban = (k, idx) => !!k.rekeningen[idx]?.iban && k.rekeningen.filter((r) => r.iban === k.rekeningen[idx].iban).length > 1;

  // Eén rekening ophalen. Ponto vervangt de sleutel bij elk gebruik: geeft het nieuwe koppeltoken terug, zodat "Alles
  // ophalen" de volgende rekening met de juiste sleutel ophaalt.
  const haalRekeningOp = async (k, idx, token) => {
    const rek = k.rekeningen[idx];
    const van = vanDatum[`${k.id}|${idx}`] || k.opgehaald?.[idx] || standaardVan();
    let d;
    try {
      d = await api("/transacties", { token, rekening: idx, van, tot: vandaag() });
    } catch (e) {
      if (e.data?.token) onKoppelingen((prev) => (prev || []).map((x) => (x.id === k.id ? { ...x, token: e.data.token } : x)));
      throw Object.assign(e, { nieuwToken: e.data?.token || null });
    }
    const nieuwToken = d.token || token;
    if (d.token) onKoppelingen((prev) => (prev || []).map((x) => (x.id === k.id ? { ...x, token: d.token } : x)));
    const opties = { bank: k.bank, iban: rek.iban, naam: rek.naam, volgnr: volgnrVan(k, idx) };
    const nieuweRijen = transactiesNaarRijen(d.transacties, rek.iban);
    const label = rijenNaarParsedFile([], opties).fileName;
    const bestaand = (parsedFiles || []).find((p) => p.fileName === label);
    const { rijen, toegevoegd } = voegRijenSamen(bestaand?.rows || [], nieuweRijen);
    const naam = rek.iban || rek.naam || `rekening ${idx + 1}`;
    if (rijen.length === 0) return { token: nieuwToken, tekst: `Geen geboekte transacties gevonden voor ${naam} vanaf ${nlDatum(van)}.`, toegevoegd: 0 };
    onImport(rijenNaarParsedFile(rijen, opties), k.psu === "business" ? "Zakelijk" : "Prive");
    // Volgende keer vanaf een week vóór de laatste boeking: overlap vangt late boekingen op, dubbelingen vallen weg.
    const laatste = rijen[rijen.length - 1]["Datum"];
    const volgende = new Date(Date.UTC(+laatste.slice(0, 4), +laatste.slice(4, 6) - 1, +laatste.slice(6, 8) - 7)).toISOString().slice(0, 10);
    onKoppelingen((prev) => (prev || []).map((x) => (x.id === k.id ? { ...x, opgehaald: { ...(x.opgehaald || {}), [idx]: volgende } } : x)));
    return { token: nieuwToken, toegevoegd, onvolledig: !!d.onvolledig, tekst: `${toegevoegd} nieuwe boeking${toegevoegd === 1 ? "" : "en"} voor ${naam}.${d.onvolledig ? " Niet alles kon in één keer worden opgehaald: haal nog een keer op." : ""}` };
  };

  // beide-V4R8 — het venster blijft na één rekening open, zodat je ook de andere rekeningen kunt ophalen. Sluit je het
  // venster, dan opent de app de wizard (zie handleBankImport in App.jsx).
  const ophalen = async (k, idx) => {
    setBezig(`${k.id}|${idx}`); setFout(""); setMelding("");
    try {
      const r = await haalRekeningOp(k, idx, k.token);
      const rest = k.rekeningen.length > 1 ? " Haal zo nodig ook de andere rekeningen op en sluit daarna dit venster." : "";
      setMelding(`${r.tekst}${rest}`);
      if (k.rekeningen.length === 1 && r.toegevoegd > 0 && !r.onvolledig) onClose();
    } catch (e) {
      setFout(e.message);
    } finally {
      setBezig("");
    }
  };

  // beide-V4R8 — alle rekeningen van een koppeling na elkaar ophalen; daarna het venster sluiten als alles lukte.
  const allesOphalen = async (k) => {
    setBezig(`${k.id}|alles`); setFout(""); setMelding("");
    let token = k.token;
    const teksten = [];
    let fouten = 0, onvolledig = false;
    for (let idx = 0; idx < k.rekeningen.length; idx += 1) {
      try {
        const r = await haalRekeningOp(k, idx, token);
        token = r.token;
        onvolledig = onvolledig || r.onvolledig;
        teksten.push(r.tekst);
      } catch (e) {
        if (e.nieuwToken) token = e.nieuwToken;
        fouten += 1;
        teksten.push(`${k.rekeningen[idx].iban || `Rekening ${idx + 1}`}: ${e.message}`);
      }
    }
    setBezig("");
    if (fouten === 0 && !onvolledig) { onClose(); return; }
    (fouten ? setFout : setMelding)(teksten.join("\n"));
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
    <ModalShell title="Rechtstreeks koppelen met de bank (in ontwikkeling)" onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-5 text-sm text-slate-700">
        <BankkoppelingStatus />
        {isPonto ? (
          <p className="text-slate-500">
            Inloggen gaat bij Ponto (een dienst van Isabel Group met een PSD2-vergunning); daar worden de bank en de
            te delen rekeningen gekozen. Is er nog geen Ponto-account, dan wordt dat daar aangemaakt. De app kan alleen lezen,
            geen betalingen doen. De transacties gaan rechtstreeks naar deze browser en worden niet op een server bewaard.
            De koppeling wordt in dit dossier bewaard; Ponto vraagt ongeveer elk half jaar om opnieuw toestemming te geven.
          </p>
        ) : (
          <p className="text-slate-500">
            Inloggen gaat bij de eigen bank, met toestemming om de transacties te lezen (alleen lezen, geen betalingen).
            De gegevens gaan via Enable Banking rechtstreeks naar deze browser en worden niet op een server bewaard.
            De koppeling wordt in dit dossier bewaard en gaat mee met opslaan en laden. De toestemming verloopt na maximaal 180 dagen.
          </p>
        )}

        {fout && <p className="rounded-veld bg-red-50 px-3 py-2 text-red-700 whitespace-pre-wrap">{fout}</p>}
        {melding && <p className="rounded-veld bg-teal-50 px-3 py-2 text-teal-800 whitespace-pre-wrap">{melding}</p>}
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
                    <div className="flex gap-2">
                      {k.rekeningen.length > 1 && (
                        <button type="button" className={KNOP_PRIMAIR_KLEIN} disabled={!!bezig || verlopen} onClick={() => allesOphalen(k)}>
                          {bezig === `${k.id}|alles` ? "Ophalen…" : "Alles ophalen"}
                        </button>
                      )}
                      <button type="button" className={KNOP_SECUNDAIR_KLEIN} onClick={() => verwijder(k)}>Ontkoppelen</button>
                    </div>
                  </div>
                  {k.rekeningen.map((r, idx) => {
                    const sleutel = `${k.id}|${idx}`;
                    return (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <span className="min-w-[13rem] text-xs"><span className="font-mono">{r.iban || r.naam || `Rekening ${idx + 1}`}</span>{r.iban && r.naam ? <span className="text-slate-500"> · {r.naam}</span> : null}{dubbelIban(k, idx) ? <span className="text-slate-500"> ({volgnrVan(k, idx)})</span> : null}</span>
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
            <p className="text-slate-500">De bank wordt bij Ponto gekozen. Na het koppelen komt de app hier terug.</p>
          ) : (<>
          <input className={`${VELD} w-full`} placeholder="Zoek de bank" value={zoek} onChange={(e) => setZoek(e.target.value)} />
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
          {wachtOpBank && (
            <p className="text-slate-500">
              Wachten op de koppeling… Na afronden bij {isPonto ? "Ponto" : "de bank"} en terugkeer hier verschijnen de
              rekeningen vanzelf. <button type="button" className="underline" onClick={() => { setWachtOpBank(false); setBezig(""); }}>Stoppen met wachten</button>
            </p>
          )}
        </section>
      </div>
    </ModalShell>
  );
}
