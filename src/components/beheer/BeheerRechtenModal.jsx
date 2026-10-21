import { useEffect, useMemo, useState } from "react";
import ModalShell from "../modals/ModalShell.jsx";
import { KNOP_PRIMAIR, KNOP_SECUNDAIR_KLEIN, VELD_KLEIN } from "../ui/stijl.js";

// nieuw-V4R3 — "Gebruikers en rechten": de beheerder (Secret BEHEERDERS in de Worker) geeft per e-mailadres
// Uitgebreid en/of de bankkoppeling, eventueel tot een einddatum. Opslag in de D1-tabel "rechten" (worker/rechten.js).
// Let op: wie de app wil openen moet ook in Cloudflare Access binnen mogen; dit scherm regelt alleen wat iemand mag.

const LEEG = { email: "", eenvoudig: true, uitgebreid: true, koppelen: false, geldigTot: "", notitie: "" };
// nieuw-V4R5 — aanmeldingen: wat iemand heeft aangevraagd.
const PLAN = { eenvoudig: "Eenvoudig", uitgebreid: "Uitgebreid", koppelen: "Uitgebreid met bankkoppeling" };

async function api(pad, body) {
  const r = await fetch(`/api/beheer/${pad}`, body
    ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" }
    : { credentials: "same-origin", cache: "no-store" });
  let d = null;
  try { d = await r.json(); } catch { /* geen JSON */ }
  if (!r.ok || !d?.ok) throw new Error(d?.fout ? `${d.fout}${d.detail ? ` (${d.detail})` : ""}` : `Fout ${r.status}`);
  return d;
}

// nieuw-V6R4 — ook bij honderden gebruikers werkbaar: twee aparte lijsten (Aanvragen en Gebruikers), zoeken op naam,
// e-mailadres of notitie, filteren op abonnement, en per PER_PAGINA rijen bladeren (nieuwste eerst).
const PER_PAGINA = 50;
const FILTERS = [
  ["alle", "Alle gebruikers"], ["eenvoudig", "Alleen Eenvoudig"], ["uitgebreid", "Uitgebreid (zonder koppeling)"],
  ["koppelen", "Met bankkoppeling"], ["verlopen", "Verlopen"], ["geen", "Nog geen toegang"],
];
const zoekTekst = (r) => `${r.email} ${r.naam || ""} ${r.notitie || ""} ${r.reden || ""}`.toLowerCase();

function Bladeren({ pagina, totaal, onPagina }) {
  const paginas = Math.max(1, Math.ceil(totaal / PER_PAGINA));
  if (totaal <= PER_PAGINA) return null;
  const van = pagina * PER_PAGINA + 1, tot = Math.min(totaal, (pagina + 1) * PER_PAGINA);
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
      <span>{van}–{tot} van {totaal}</span>
      <span className="flex gap-2">
        <button type="button" disabled={pagina === 0} onClick={() => onPagina(pagina - 1)} className={`${KNOP_SECUNDAIR_KLEIN} disabled:opacity-40`}>Vorige</button>
        <button type="button" disabled={pagina >= paginas - 1} onClick={() => onPagina(pagina + 1)} className={`${KNOP_SECUNDAIR_KLEIN} disabled:opacity-40`}>Volgende</button>
      </span>
    </div>
  );
}

const nlDatum = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("nl-NL") : "");

export default function BeheerRechtenModal({ eigenEmail, onAanvragen, onClose }) {
  const [lijst, setLijst] = useState(null);
  const [vandaag, setVandaag] = useState("");
  const [slot, setSlot] = useState(false);
  const [fout, setFout] = useState("");
  const [melding, setMelding] = useState("");
  const [bezig, setBezig] = useState(false);
  const [form, setForm] = useState(LEEG);
  const [bewerkt, setBewerkt] = useState(null); // e-mailadres van de rij die in het formulier staat
  const [tab, setTab] = useState(null); // "aanvragen" | "gebruikers"; null = kies zelf bij het laden
  const [zoek, setZoek] = useState("");
  const [filter, setFilter] = useState("alle");
  const [pagina, setPagina] = useState(0);
  const [formOpen, setFormOpen] = useState(false);

  const laad = async () => {
    try {
      const d = await api("rechten");
      setLijst(d.rechten);
      setVandaag(d.vandaag);
      setSlot(!!d.slot);
      onAanvragen?.(d.rechten.filter((r) => r.aanvraag).length);
      setTab((t) => t || (d.rechten.some((r) => r.aanvraag) ? "aanvragen" : "gebruikers"));
      setFout("");
    } catch (e) { setFout(e.message); setLijst((l) => l || []); }
  };
  useEffect(() => { laad(); }, []);

  const opslaan = async (e) => {
    e.preventDefault();
    setBezig(true); setFout(""); setMelding("");
    try {
      const email = form.email.trim().toLowerCase();
      await api("rechten", { ...form, email, eenvoudig: form.uitgebreid || form.eenvoudig, koppelen: form.uitgebreid && form.koppelen, geldigTot: form.geldigTot || null });
      setMelding(`${email} is opgeslagen.`);
      setForm(LEEG); setBewerkt(null); setFormOpen(false);
      await laad();
    } catch (e2) { setFout(e2.message); } finally { setBezig(false); }
  };

  const verwijder = async (email) => {
    setBezig(true); setFout(""); setMelding("");
    try {
      await api("verwijder", { email });
      setMelding(`${email} is verwijderd.`);
      if (bewerkt === email) { setForm(LEEG); setBewerkt(null); }
      await laad();
    } catch (e) { setFout(e.message); } finally { setBezig(false); }
  };

  const beslis = async (email, actie) => {
    setBezig(true); setFout(""); setMelding("");
    try {
      const d = await api(actie, { email });
      // nieuw-V4R8 — de Worker mailt de aanvrager; meld het als die mail niet weg kon.
      setMelding(`${actie === "goedkeuren" ? `De aanvraag van ${email} is goedgekeurd` : `De aanvraag van ${email} is afgewezen`}${d.mailFout ? `, maar de e-mail aan de aanvrager is niet verstuurd (${d.mailFout}).` : " en de aanvrager krijgt een e-mail."}`);
      await laad();
    } catch (e) { setFout(e.message); } finally { setBezig(false); }
  };

  const bewerk = (r) => {
    setForm({ email: r.email, eenvoudig: r.eenvoudig, uitgebreid: r.uitgebreid, koppelen: r.koppelen, geldigTot: r.geldigTot || "", notitie: r.notitie || "" });
    setBewerkt(r.email); setMelding(""); setFout(""); setFormOpen(true);
    if (typeof window !== "undefined") window.setTimeout(() => document.getElementById("beheer-form")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0);
  };

  const zoekWoord = zoek.trim().toLowerCase();
  const aanvragen = useMemo(() => (lijst || []).filter((r) => r.aanvraag)
    .filter((r) => !zoekWoord || zoekTekst(r).includes(zoekWoord))
    .sort((a, b) => String(a.aangevraagd || "").localeCompare(String(b.aangevraagd || ""))), [lijst, zoekWoord]); // oudste aanvraag eerst
  const gebruikers = useMemo(() => (lijst || [])
    .filter((r) => r.eenvoudig || r.uitgebreid || !r.aanvraag) // wie alleen een aanvraag heeft, staat bij Aanvragen
    .filter((r) => {
      const verlopen = r.geldigTot && vandaag && r.geldigTot < vandaag;
      if (filter === "eenvoudig") return r.eenvoudig && !r.uitgebreid;
      if (filter === "uitgebreid") return r.uitgebreid && !r.koppelen;
      if (filter === "koppelen") return r.koppelen;
      if (filter === "verlopen") return verlopen;
      if (filter === "geen") return !r.eenvoudig && !r.uitgebreid;
      return true;
    })
    .filter((r) => !zoekWoord || zoekTekst(r).includes(zoekWoord))
    .sort((a, b) => String(b.gewijzigd || "").localeCompare(String(a.gewijzigd || ""))), [lijst, filter, zoekWoord, vandaag]); // nieuwste eerst
  const totaalAanvragen = (lijst || []).filter((r) => r.aanvraag).length;
  const totaalGebruikers = (lijst || []).filter((r) => r.eenvoudig || r.uitgebreid || !r.aanvraag).length;
  const huidige = tab === "aanvragen" ? aanvragen : gebruikers;
  const maxPagina = Math.max(0, Math.ceil(huidige.length / PER_PAGINA) - 1);
  const pag = Math.min(pagina, maxPagina);
  const zichtbaar = huidige.slice(pag * PER_PAGINA, (pag + 1) * PER_PAGINA);
  const kiesTab = (t) => { setTab(t); setPagina(0); };

  const veld = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  return (
    <ModalShell title="Gebruikers en rechten" onClose={onClose} maxWidth="max-w-3xl">
      <div className="space-y-5 text-sm text-slate-700">
        <p className="text-slate-500">
          Geef per e-mailadres toegang tot de uitgebreide weergave en de bankkoppeling. Zonder einddatum blijft het recht
          staan.
          {eigenEmail ? <> Jij bent ingelogd als <b>{eigenEmail}</b> en staat als beheerder in de Worker.</> : null}
        </p>
        <p className="text-xs text-slate-500">
          Toegangsslot: <b>{slot ? "aan" : "uit"}</b>. {slot
            ? "Alleen wie hieronder Eenvoudig of Uitgebreid heeft, krijgt de app; anderen zien de aanmeldpagina."
            : "Iedereen die inlogt, kan Eenvoudig gebruiken. Zet TOEGANG_VERPLICHT op \"ja\" om alleen goedgekeurde gebruikers toe te laten."}
        </p>
        {melding && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{melding}</p>}
        {fout && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{fout}</p>}

        <div className="flex gap-1 border-b border-slate-200" role="tablist">
          {[["aanvragen", `Aanvragen (${totaalAanvragen})`], ["gebruikers", `Gebruikers (${totaalGebruikers})`]].map(([k, t]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => kiesTab(k)}
              className={`-mb-px border-b-2 px-3 py-2 font-medium ${tab === k ? "border-teal-700 text-teal-800" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t}{k === "aanvragen" && totaalAanvragen > 0 ? <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" /> : null}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <input type="search" value={zoek} onChange={(e) => { setZoek(e.target.value); setPagina(0); }} placeholder="Zoek op naam, e-mailadres of notitie"
            className={`${VELD_KLEIN} min-w-0 flex-1`} autoCapitalize="off" autoCorrect="off" aria-label="Zoeken" />
          {tab === "gebruikers" && (
            <select value={filter} onChange={(e) => { setFilter(e.target.value); setPagina(0); }} className={VELD_KLEIN} aria-label="Filter">
              {FILTERS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
          )}
          {tab === "gebruikers" && !formOpen && (
            <button type="button" onClick={() => { setForm(LEEG); setBewerkt(null); setFormOpen(true); }} className={KNOP_SECUNDAIR_KLEIN}>+ Gebruiker toevoegen</button>
          )}
        </div>

        {tab === "gebruikers" && formOpen && (
          <form id="beheer-form" onSubmit={opslaan} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="font-semibold text-slate-800">{bewerkt ? `Wijzigen: ${bewerkt}` : "Gebruiker toevoegen"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="block text-xs text-slate-500 mb-1">E-mailadres</span>
                <input type="email" required value={form.email} onChange={veld("email")} disabled={!!bewerkt}
                  className={`${VELD_KLEIN} w-full disabled:bg-slate-100`} placeholder="naam@voorbeeld.nl" autoCapitalize="off" autoCorrect="off" />
              </label>
              <label className="block">
                <span className="block text-xs text-slate-500 mb-1">Geldig tot en met (leeg = altijd)</span>
                <input type="date" value={form.geldigTot} onChange={veld("geldigTot")} className={`${VELD_KLEIN} w-full`} />
              </label>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className={`inline-flex items-center gap-2 ${form.uitgebreid ? "opacity-50" : ""}`}>
                <input type="checkbox" checked={form.uitgebreid || form.eenvoudig} disabled={form.uitgebreid} onChange={veld("eenvoudig")} /> Eenvoudig
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={form.uitgebreid} onChange={veld("uitgebreid")} /> Uitgebreide weergave
              </label>
              <label className={`inline-flex items-center gap-2 ${form.uitgebreid ? "" : "opacity-50"}`}>
                <input type="checkbox" checked={form.uitgebreid && form.koppelen} disabled={!form.uitgebreid} onChange={veld("koppelen")} /> Bankkoppeling
              </label>
            </div>
            <label className="block">
              <span className="block text-xs text-slate-500 mb-1">Notitie (alleen voor jou)</span>
              <input type="text" maxLength={300} value={form.notitie} onChange={veld("notitie")} className={`${VELD_KLEIN} w-full`} placeholder="bijv. proefperiode, lid sinds oktober" />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={bezig} className={`${KNOP_PRIMAIR} disabled:opacity-50`}>Opslaan</button>
              <button type="button" onClick={() => { setForm(LEEG); setBewerkt(null); setFormOpen(false); }} className={KNOP_SECUNDAIR_KLEIN}>Annuleren</button>
            </div>
          </form>
        )}

        {lijst === null ? <p className="text-slate-500">Laden…</p> : tab === "aanvragen" ? (
          aanvragen.length === 0 ? (
            <p className="text-slate-500">{zoekWoord ? "Geen aanvragen gevonden voor deze zoekterm." : "Er zijn geen openstaande aanvragen."}</p>
          ) : (
            <>
              <ul className="divide-y divide-amber-200 rounded-xl border border-amber-300 bg-amber-50">
                {zichtbaar.map((r) => (
                  <li key={r.email} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 break-all">{r.naam ? `${r.naam} · ` : ""}{r.email}</p>
                      <p className="text-xs text-slate-600">vraagt <b>{PLAN[r.aanvraag] || r.aanvraag}</b>{r.aangevraagd ? ` · ${new Date(r.aangevraagd).toLocaleDateString("nl-NL")}` : ""}
                        {r.eenvoudig || r.uitgebreid ? ` · heeft nu ${r.uitgebreid ? (r.koppelen ? "Uitgebreid + bankkoppeling" : "Uitgebreid") : "Eenvoudig"}` : ""}</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{r.reden ? `Reden: ${r.reden}` : "Geen reden opgegeven"}</p>
                    </div>
                    <button type="button" disabled={bezig} onClick={() => beslis(r.email, "goedkeuren")} className={`${KNOP_PRIMAIR} disabled:opacity-50`}>Goedkeuren</button>
                    <button type="button" disabled={bezig} onClick={() => beslis(r.email, "afwijzen")} className={KNOP_SECUNDAIR_KLEIN}>Afwijzen</button>
                  </li>
                ))}
              </ul>
              <Bladeren pagina={pag} totaal={aanvragen.length} onPagina={setPagina} />
            </>
          )
        ) : gebruikers.length === 0 ? (
          <p className="text-slate-500">{totaalGebruikers === 0
            ? "Nog geen gebruikers in de lijst. Adressen in de Secrets AccessAll en BEHEERDERS hebben altijd alle rechten en staan hier niet."
            : "Geen gebruikers gevonden met deze zoekterm of dit filter."}</p>
        ) : (
          <>
            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
              {zichtbaar.map((r) => {
                const verlopen = r.geldigTot && vandaag && r.geldigTot < vandaag;
                return (
                  <li key={r.email} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 break-all">{r.naam ? `${r.naam} · ` : ""}{r.email}</p>
                      <p className="text-xs text-slate-500">
                        {r.uitgebreid ? ["Uitgebreid", r.koppelen ? "bankkoppeling" : null].filter(Boolean).join(" + ") : r.eenvoudig ? "Eenvoudig" : "nog geen toegang"}
                        {r.aanvraag ? <> · <button type="button" onClick={() => kiesTab("aanvragen")} className="text-amber-700 underline">vraagt {PLAN[r.aanvraag] || r.aanvraag}</button></> : null}
                        {r.geldigTot ? <> · {verlopen ? <span className="text-red-700">verlopen op {nlDatum(r.geldigTot)}</span> : `tot en met ${nlDatum(r.geldigTot)}`}</> : null}
                        {r.bron && r.bron !== "handmatig" ? ` · via ${r.bron}` : null}
                        {r.notitie ? ` · ${r.notitie}` : null}
                      </p>
                    </div>
                    <button type="button" disabled={bezig} onClick={() => bewerk(r)} className={KNOP_SECUNDAIR_KLEIN}>Wijzigen</button>
                    <button type="button" disabled={bezig} onClick={() => verwijder(r.email)} className="rounded-veld border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">Verwijderen</button>
                  </li>
                );
              })}
            </ul>
            <Bladeren pagina={pag} totaal={gebruikers.length} onPagina={setPagina} />
          </>
        )}
      </div>
    </ModalShell>
  );
}
