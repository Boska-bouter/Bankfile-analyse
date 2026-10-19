import { useEffect, useState } from "react";
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

  const laad = async () => {
    try {
      const d = await api("rechten");
      setLijst(d.rechten);
      setVandaag(d.vandaag);
      setSlot(!!d.slot);
      onAanvragen?.(d.rechten.filter((r) => r.aanvraag).length);
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
      setForm(LEEG); setBewerkt(null);
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
    setBewerkt(r.email); setMelding(""); setFout("");
  };

  const veld = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  return (
    <ModalShell title="Gebruikers en rechten" onClose={onClose} maxWidth="max-w-3xl">
      <div className="space-y-5 text-sm text-slate-700">
        <p className="text-slate-500">
          Geef per e-mailadres toegang tot de uitgebreide weergave en de bankkoppeling. Zonder einddatum blijft het recht
          staan. De persoon moet de app ook kunnen openen via Cloudflare Access.
          {eigenEmail ? <> Jij bent ingelogd als <b>{eigenEmail}</b> en staat als beheerder in de Worker.</> : null}
        </p>
        <p className="text-xs text-slate-500">
          Toegangsslot: <b>{slot ? "aan" : "uit"}</b>. {slot
            ? "Alleen wie hieronder Eenvoudig of Uitgebreid heeft, krijgt de app; anderen zien de aanmeldpagina."
            : "Iedereen die via Cloudflare Access binnenkomt, kan Eenvoudig gebruiken. Zet TOEGANG_VERPLICHT op \"ja\" om alleen goedgekeurde gebruikers toe te laten."}
        </p>
        {(lijst || []).some((r) => r.aanvraag) && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
            <p className="font-semibold text-amber-900">Aanmeldingen</p>
            <ul className="divide-y divide-amber-200">
              {lijst.filter((r) => r.aanvraag).map((r) => (
                <li key={r.email} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 break-all">{r.naam ? `${r.naam} · ` : ""}{r.email}</p>
                    <p className="text-xs text-slate-600">vraagt <b>{PLAN[r.aanvraag] || r.aanvraag}</b>{r.aangevraagd ? ` · ${new Date(r.aangevraagd).toLocaleDateString("nl-NL")}` : ""}</p>
                  </div>
                  <button type="button" disabled={bezig} onClick={() => beslis(r.email, "goedkeuren")} className={`${KNOP_PRIMAIR} disabled:opacity-50`}>Goedkeuren</button>
                  <button type="button" disabled={bezig} onClick={() => beslis(r.email, "afwijzen")} className={KNOP_SECUNDAIR_KLEIN}>Afwijzen</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={opslaan} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
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
            {bewerkt && <button type="button" onClick={() => { setForm(LEEG); setBewerkt(null); }} className={KNOP_SECUNDAIR_KLEIN}>Annuleren</button>}
          </div>
        </form>

        {melding && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{melding}</p>}
        {fout && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{fout}</p>}

        {lijst === null ? <p className="text-slate-500">Laden…</p> : lijst.length === 0 ? (
          <p className="text-slate-500">Nog geen gebruikers in de lijst. Adressen in de Secrets AccessAll en BEHEERDERS hebben altijd alle rechten en staan hier niet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
            {lijst.map((r) => {
              const verlopen = r.geldigTot && vandaag && r.geldigTot < vandaag;
              return (
                <li key={r.email} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 break-all">{r.email}</p>
                    <p className="text-xs text-slate-500">
                      {r.uitgebreid ? ["Uitgebreid", r.koppelen ? "bankkoppeling" : null].filter(Boolean).join(" + ") : r.eenvoudig ? "Eenvoudig" : "nog geen toegang"}
                      {r.aanvraag ? ` · vraagt ${PLAN[r.aanvraag] || r.aanvraag}` : null}
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
        )}
      </div>
    </ModalShell>
  );
}
