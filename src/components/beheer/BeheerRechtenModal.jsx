import { useEffect, useMemo, useState } from "react";
import ModalShell from "../modals/ModalShell.jsx";
import { KNOP_PRIMAIR, KNOP_SECUNDAIR_KLEIN, VELD_KLEIN } from "../ui/stijl.js";

// nieuw-V4R3 — "Gebruikers en rechten": de beheerder (Secret BEHEERDERS in de Worker) geeft per e-mailadres
// Uitgebreid en/of de bankkoppeling, eventueel tot een einddatum. Opslag in de D1-tabel "rechten" (worker/rechten.js).
// Let op: wie de app wil openen moet ook in Cloudflare Access binnen mogen; dit scherm regelt alleen wat iemand mag.

// beide-V1R0 — rechten per soort gebruik: zakelijk en privé zijn aparte abonnementen, elk met een eigen einddatum.
const SOORT = { zakelijk: "Zakelijk", prive: "Privé" };
const GEEN_SOORT = { eenvoudig: false, uitgebreid: false, koppelen: false, geldigTot: "" };
const LEEG = { email: "", zakelijk: { eenvoudig: true, uitgebreid: true, koppelen: false, geldigTot: "" }, prive: GEEN_SOORT, notitie: "" };
// nieuw-V4R5 — aanmeldingen: wat iemand heeft aangevraagd.
const PLAN = { eenvoudig: "Eenvoudig", uitgebreid: "Uitgebreid", koppelen: "Uitgebreid met bankkoppeling" };
const planNaam = (soort, plan) => `${SOORT[soort] || SOORT.zakelijk} · ${PLAN[plan] || plan}`;
// Wat iemand binnen één soort heeft, kort ("Uitgebreid + bankkoppeling"), of null.
const niveauTekst = (x) => (x?.uitgebreid ? (x.koppelen ? "Uitgebreid + bankkoppeling" : "Uitgebreid") : x?.eenvoudig ? "Eenvoudig" : null);
const verlopenOp = (x, vandaag) => x?.geldigTot && vandaag && x.geldigTot < vandaag;
// Rij uit een oudere Worker (zonder soorten) als zakelijk lezen.
const soortVan = (r, s) => r?.[s] || (s === "zakelijk" ? { eenvoudig: r?.eenvoudig, uitgebreid: r?.uitgebreid, koppelen: r?.koppelen, geldigTot: r?.geldigTot } : GEEN_SOORT);

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
  ["alle", "Alle abonnementen"], ["eenvoudig", "Alleen Eenvoudig"], ["uitgebreid", "Uitgebreid (zonder koppeling)"],
  ["koppelen", "Met bankkoppeling"], ["verlopen", "Verlopen"], ["geen", "Nog geen toegang"],
];
// beide-V1R0 — filter op soort gebruik (kolom rechten.gebruik).
const SOORT_FILTERS = [["alle", "Zakelijk en privé"], ["zakelijk", "Zakelijk"], ["prive", "Privé"], ["beide", "Beide"]];
const gebruikVan = (r) => r.gebruik || (r.aanvraag ? r.aanvraagGebruik || "zakelijk" : r.eenvoudig || r.uitgebreid ? "zakelijk" : null);
const pastBijSoort = (r, f, tab) => {
  if (f === "alle") return true;
  if (tab === "aanvragen") return (r.aanvraagGebruik || "zakelijk") === f;
  const g = gebruikVan(r);
  return f === "beide" ? g === "beide" : g === f || g === "beide";
};
// Badge met de soort gebruik.
function SoortLabel({ soort }) {
  if (!soort) return null;
  const tekst = soort === "beide" ? "Zakelijk + privé" : SOORT[soort] || soort;
  const kleur = soort === "prive" ? "bg-violet-100 text-violet-800" : soort === "beide" ? "bg-sky-100 text-sky-800" : "bg-teal-100 text-teal-800";
  return <span className={`mr-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold align-middle ${kleur}`}>{tekst}</span>;
}
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
  const [soortFilter, setSoortFilter] = useState("alle");
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
      const schoon = (x) => ({ eenvoudig: !!(x.uitgebreid || x.eenvoudig), uitgebreid: !!x.uitgebreid, koppelen: !!(x.uitgebreid && x.koppelen), geldigTot: x.geldigTot || null });
      await api("rechten", { email, zakelijk: schoon(form.zakelijk), prive: schoon(form.prive), notitie: form.notitie });
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
    const vul = (x) => ({ eenvoudig: !!x?.eenvoudig, uitgebreid: !!x?.uitgebreid, koppelen: !!x?.koppelen, geldigTot: x?.geldigTot || "" });
    setForm({ email: r.email, zakelijk: vul(soortVan(r, "zakelijk")), prive: vul(soortVan(r, "prive")), notitie: r.notitie || "" });
    setBewerkt(r.email); setMelding(""); setFout(""); setFormOpen(true);
    if (typeof window !== "undefined") window.setTimeout(() => document.getElementById("beheer-form")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0);
  };

  const zoekWoord = zoek.trim().toLowerCase();
  const aanvragen = useMemo(() => (lijst || []).filter((r) => r.aanvraag)
    .filter((r) => pastBijSoort(r, soortFilter, "aanvragen"))
    .filter((r) => !zoekWoord || zoekTekst(r).includes(zoekWoord))
    .sort((a, b) => String(a.aangevraagd || "").localeCompare(String(b.aangevraagd || ""))), [lijst, zoekWoord, soortFilter]); // oudste aanvraag eerst
  const gebruikers = useMemo(() => (lijst || [])
    .filter((r) => r.eenvoudig || r.uitgebreid || !r.aanvraag) // wie alleen een aanvraag heeft, staat bij Aanvragen
    .filter((r) => pastBijSoort(r, soortFilter, "gebruikers"))
    .filter((r) => {
      // Abonnementfilter: past als minstens één soort (binnen het soortfilter) eraan voldoet.
      const soorten = ["zakelijk", "prive"].filter((s) => soortFilter === "alle" || soortFilter === "beide" || soortFilter === s).map((s) => soortVan(r, s));
      if (filter === "eenvoudig") return soorten.some((x) => x.eenvoudig && !x.uitgebreid);
      if (filter === "uitgebreid") return soorten.some((x) => x.uitgebreid && !x.koppelen);
      if (filter === "koppelen") return soorten.some((x) => x.koppelen);
      if (filter === "verlopen") return soorten.some((x) => x.eenvoudig && verlopenOp(x, vandaag));
      if (filter === "geen") return !r.eenvoudig && !r.uitgebreid;
      return true;
    })
    .filter((r) => !zoekWoord || zoekTekst(r).includes(zoekWoord))
    .sort((a, b) => String(b.gewijzigd || "").localeCompare(String(a.gewijzigd || ""))), [lijst, filter, soortFilter, zoekWoord, vandaag]); // nieuwste eerst
  const totaalAanvragen = (lijst || []).filter((r) => r.aanvraag).length;
  const totaalGebruikers = (lijst || []).filter((r) => r.eenvoudig || r.uitgebreid || !r.aanvraag).length;
  const huidige = tab === "aanvragen" ? aanvragen : gebruikers;
  const maxPagina = Math.max(0, Math.ceil(huidige.length / PER_PAGINA) - 1);
  const pag = Math.min(pagina, maxPagina);
  const zichtbaar = huidige.slice(pag * PER_PAGINA, (pag + 1) * PER_PAGINA);
  const kiesTab = (t) => { setTab(t); setPagina(0); };

  const veld = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const soortVeld = (s, k) => (e) => setForm((f) => ({ ...f, [s]: { ...f[s], [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value } }));

  return (
    <ModalShell title="Gebruikers en rechten" onClose={onClose} maxWidth="max-w-3xl">
      <div className="space-y-5 text-sm text-slate-700">
        <p className="text-slate-500">
          Geef per e-mailadres toegang, apart voor zakelijk en privé: Eenvoudig, de uitgebreide weergave en de bankkoppeling.
          Zonder einddatum blijft het recht staan.
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
          <select value={soortFilter} onChange={(e) => { setSoortFilter(e.target.value); setPagina(0); }} className={VELD_KLEIN} aria-label="Soort gebruik">
            {SOORT_FILTERS.filter(([k]) => tab === "gebruikers" || k !== "beide").map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
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
            </div>
            {Object.entries(SOORT).map(([s, titel]) => {
              const x = form[s];
              return (
                <div key={s} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titel}</p>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <label className={`inline-flex items-center gap-2 ${x.uitgebreid ? "opacity-50" : ""}`}>
                      <input type="checkbox" checked={x.uitgebreid || x.eenvoudig} disabled={x.uitgebreid} onChange={soortVeld(s, "eenvoudig")} /> Eenvoudig
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={x.uitgebreid} onChange={soortVeld(s, "uitgebreid")} /> Uitgebreide weergave
                    </label>
                    <label className={`inline-flex items-center gap-2 ${x.uitgebreid ? "" : "opacity-50"}`}>
                      <input type="checkbox" checked={x.uitgebreid && x.koppelen} disabled={!x.uitgebreid} onChange={soortVeld(s, "koppelen")} /> Bankkoppeling
                    </label>
                  </div>
                  <label className="block max-w-xs">
                    <span className="block text-xs text-slate-500 mb-1">Geldig tot en met (leeg = altijd)</span>
                    <input type="date" value={x.geldigTot} onChange={soortVeld(s, "geldigTot")} className={`${VELD_KLEIN} w-full`} />
                  </label>
                </div>
              );
            })}
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
                      <p className="font-medium text-slate-800 break-all"><SoortLabel soort={r.aanvraagGebruik || "zakelijk"} />{r.naam ? `${r.naam} · ` : ""}{r.email}</p>
                      <p className="text-xs text-slate-600">vraagt <b>{planNaam(r.aanvraagGebruik, r.aanvraag)}</b>{r.aangevraagd ? ` · ${new Date(r.aangevraagd).toLocaleDateString("nl-NL")}` : ""}
                        {["zakelijk", "prive"].map((s) => niveauTekst(soortVan(r, s)) && ` · heeft nu ${SOORT[s]}: ${niveauTekst(soortVan(r, s))}`).filter(Boolean).join("")}</p>
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
                const delen = ["zakelijk", "prive"].map((s) => {
                  const x = soortVan(r, s), n = niveauTekst(x);
                  if (!n) return null;
                  return <span key={s}>{SOORT[s]}: {n}{x.geldigTot ? <> ({verlopenOp(x, vandaag) ? <span className="text-red-700">verlopen op {nlDatum(x.geldigTot)}</span> : `tot en met ${nlDatum(x.geldigTot)}`})</> : null}</span>;
                }).filter(Boolean);
                return (
                  <li key={r.email} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 break-all"><SoortLabel soort={gebruikVan(r)} />{r.naam ? `${r.naam} · ` : ""}{r.email}</p>
                      <p className="text-xs text-slate-500">
                        {delen.length ? delen.reduce((acc, d, i) => (i ? [...acc, " · ", d] : [d]), []) : "nog geen toegang"}
                        {r.aanvraag ? <> · <button type="button" onClick={() => kiesTab("aanvragen")} className="text-amber-700 underline">vraagt {planNaam(r.aanvraagGebruik, r.aanvraag)}</button></> : null}
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
