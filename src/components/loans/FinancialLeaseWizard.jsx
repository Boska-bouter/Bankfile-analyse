import { useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import {
  computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate, computeTotaleLeaseBetalingen,
  generateProjectedLeasePayments, matchLeasePaymentsToSchedule, getLeaseSegments, assignLeaseTransactionsToSegments,
  normalizeKenteken, mergeHandmatigeTermijnen, isCompleteLeaseSegment,
} from "../../tax/financialLease.js";
import { eur } from "../../utils/amounts.js";
import { formFromSegment, blankVervolgContract, cleanSegment, jarenVoorPrivegebruikVan, PrivegebruikJaren, restantAfschrijving, restantTekst } from "./FinancialLeaseDetailsModal.jsx";

// Stappenscherm voor het invullen van een financial lease. Gebruikt exact hetzelfde opslagformaat
// (en dezelfde berekeningen) als het volledige gegevensscherm (FinancialLeaseDetailsModal) — het is een
// andere, begeleide manier om dezelfde velden in te vullen: Contract → Aankoop → Leasevoorwaarden →
// (Bedrijfsmiddel) → Controle → Verloop. Waarden uit de bank worden alleen als VOORSTEL getoond
// (een knop om over te nemen), nooit stilzwijgend ingevuld.

const iso = (d) => (d instanceof Date && !isNaN(d) ? d.toISOString().slice(0, 10) : "");
const dagNa = (s) => { if (!s) return ""; const d = new Date(s); d.setDate(d.getDate() + 1); return iso(d); };
const maandenErbij = (s, m) => { if (!s || !(Number(m) > 0)) return ""; const d = new Date(s); d.setMonth(d.getMonth() + Number(m)); return iso(d); };

// Een eerste voorstel voor startdatum en maandbedrag op basis van de banktransacties van dit contract.
function voorstellenUitBank(segTx) {
  const neg = (segTx || []).filter((t) => t.amount < 0).sort((a, b) => a.date - b.date);
  if (neg.length === 0) return {};
  const telling = new Map();
  for (const t of neg) { const k = Math.abs(t.amount).toFixed(2); telling.set(k, (telling.get(k) || 0) + 1); }
  const [bedrag, aantal] = [...telling.entries()].sort((a, b) => b[1] - a[1])[0];
  return { startdatum: iso(neg[0].date), maandbedrag: aantal >= 2 ? bedrag : null, aantal: neg.length, laatste: iso(neg[neg.length - 1].date) };
}

// Signaal voor de lease zelf (buiten de wizard): lijkt er een nieuw contract te zijn begonnen?
// Twee eenvoudige, datumgebaseerde signalen — betalingen ná de einddatum van het laatste contract,
// of ruim na het einde van de ingevulde looptijd — en pas bij minstens 2 betalingen, om een losse
// nabetaling niet als nieuw contract te zien.
export function detecteerNieuwContract(lease, details) {
  const segs = getLeaseSegments(details).filter((s) => s && isCompleteLeaseSegment(s));
  if (segs.length === 0) return null;
  const laatste = segs[segs.length - 1];
  const eind = laatste.contractBeeindigd && laatste.einddatumContract
    ? new Date(laatste.einddatumContract)
    : (() => { const e = new Date(maandenErbij(laatste.startdatum, laatste.looptijd)); e.setDate(e.getDate() + 45); return e; })();
  const erna = lease.transactions.filter((t) => t.amount < 0 && t.date > eind);
  return erna.length >= 2 ? { aantal: erna.length, vanaf: iso(erna.sort((a, b) => a.date - b.date)[0].date) } : null;
}

// Laatste contract is afgelopen (ruim) zonder dat is aangegeven wat er daarna met het object gebeurt en
// zonder nieuwe betalingen: vraag of het object blijft of is ingeleverd/verkocht.
export function detecteerAfgelopenZonderBesluit(lease, details) {
  const segs = getLeaseSegments(details).filter(Boolean);
  if (segs.length === 0) return null;
  const laatste = segs[segs.length - 1];
  if (!isCompleteLeaseSegment(laatste) || !laatste.soort || laatste.contractBeeindigd || laatste.naAfloop) return null;
  const eind = new Date(maandenErbij(laatste.startdatum, laatste.looptijd));
  if (isNaN(eind)) return null;
  const grens = new Date(); grens.setDate(grens.getDate() - 60);
  if (eind > grens) return null;
  const erna = lease.transactions.filter((t) => t.amount < 0 && t.date > new Date(eind.getTime() + 45 * 86400000));
  if (erna.length >= 2) return null; // dan is er waarschijnlijk een nieuw contract (zie detecteerNieuwContract)
  return { eind: iso(eind), contract: segs.length - 1 };
}

const STAPPEN = {
  type: "Soort lease", contract: "Contract", aankoop: "Aankoop", voorwaarden: "Leasevoorwaarden",
  bedrijfsmiddel: "Bedrijfsmiddel", controle: "Controle", verloop: "Verloop",
};
const INPUT = "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm";
const KNOP = "rounded-lg px-3 py-1.5 text-xs font-medium border";
const KNOP_AAN = "bg-teal-700 text-white border-teal-700";
const KNOP_UIT = "border-slate-300 text-slate-600 hover:bg-slate-50";

function Veld({ label, hint, children }) {
  return (
    <label className="block text-sm">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-0.5">{hint}</span>}
    </label>
  );
}
function Voorstel({ tekst, onNeem }) {
  return (
    <button type="button" onClick={onNeem} className="mt-1 text-[11px] text-teal-700 underline decoration-dotted hover:text-teal-900">
      Voorstel uit je bank: {tekst} — overnemen
    </button>
  );
}

export default function FinancialLeaseWizard({ lease, details, typeConfirmed, onConfirmType, onSave, onClose, onOpenAdvanced, nieuwContract = false, startContract = null, startStap = null, nieuwSoort = null, onFinished }) {
  const [contracts, setContracts] = useState(() => {
    const bestaand = getLeaseSegments(details).filter(Boolean).map(formFromSegment);
    const metSoort = (f) => {
      if (!nieuwSoort) return f;
      f.soort = nieuwSoort;
      if (nieuwSoort !== "auto") { f.kenteken = ""; f.voertuigtype = ""; if (nieuwSoort === "machine" && !f.afschrijvingstermijnJaren) f.afschrijvingstermijnJaren = "5"; }
      return f;
    };
    if (bestaand.length === 0) return [metSoort(formFromSegment(null))];
    return nieuwContract ? [...bestaand, metSoort(blankVervolgContract(bestaand[bestaand.length - 1]))] : bestaand;
  });
  const [cIdx, setCIdx] = useState(() => {
    const n = getLeaseSegments(details).filter(Boolean).length;
    if (startContract != null && startContract < n) return startContract;
    return nieuwContract && n > 0 ? n : 0;
  });
  const [typeGekozen, setTypeGekozen] = useState(!!typeConfirmed);
  const form = contracts[cIdx];
  const set = (patch) => setContracts((prev) => prev.map((c, i) => (i === cIdx ? { ...c, ...patch } : c)));
  const isLaatste = cIdx === contracts.length - 1;

  const stappen = useMemo(() => {
    const l = ["contract", "aankoop", "voorwaarden"];
    if (form.soort) l.push("bedrijfsmiddel");
    l.push("controle");
    if (isLaatste) l.push("verloop");
    return l;
  }, [form.soort, isLaatste]);
  const [stap, setStap] = useState(startStap || "contract");
  const stapNu = stappen.includes(stap) ? stap : stappen[0];
  const pos = stappen.indexOf(stapNu);

  const segmentsWithTx = useMemo(() => assignLeaseTransactionsToSegments(lease.transactions, contracts), [lease, contracts]);
  const segTx = segmentsWithTx[cIdx]?.transactions || [];
  const bank = useMemo(() => voorstellenUitBank(segTx), [segTx]);

  // Overnemen kenteken-gekoppelde auto-gegevens van een eerder contract van dezelfde auto.
  const eerderZelfdeAuto = useMemo(() => {
    const norm = normalizeKenteken(form.kenteken);
    if (!norm || form.soort !== "auto") return null;
    return contracts.slice(0, cIdx).find((s) => s.soort === "auto" && normalizeKenteken(s.kenteken) === norm) || null;
  }, [form.kenteken, form.soort, contracts, cIdx]);

  // Controle-berekeningen (zelfde functies als het volledige scherm).
  const controle = useMemo(() => {
    const onbetaald = computeOnbetaaldGedeelteKoop(form);
    const rente = computeFinancialLeaseRate(form);
    const projected = generateProjectedLeasePayments(form);
    const eff = mergeHandmatigeTermijnen(cleanSegment(form), segTx);
    const match = projected.length ? matchLeasePaymentsToSchedule(projected, eff, Number(form.maandbedrag) || 0) : null;
    const laatste = eff.reduce((m, t) => (!m || t.date > m ? t.date : m), null);
    let totaal = null;
    if (laatste && projected.length) {
      const betaald = Math.abs(eff.reduce((a, t) => a + t.amount, 0));
      const verwacht = projected.filter((p) => p.date <= laatste).reduce((a, p) => a + Math.abs(p.amount), 0);
      if (verwacht > 0) {
        const marge = Math.max(Number(form.maandbedrag) || 0, 25);
        totaal = { betaald, verwacht, verschil: betaald - verwacht, klopt: Math.abs(betaald - verwacht) <= marge };
      }
    }
    const genoeg = onbetaald > 0 && Number(form.looptijd) > 0 && Number(form.maandbedrag) > 0;
    const totaleBetalingen = computeTotaleLeaseBetalingen(form);
    const extra = form.extraBedrag1eTermijn === "" ? 0 : Number(form.extraBedrag1eTermijn);
    const vergoedingWijktAf = form.leaseVergoeding !== "" && totaleBetalingen != null &&
      Math.abs(onbetaald + Number(form.leaseVergoeding) + extra - totaleBetalingen) > 25;
    const status = !genoeg ? null : rente == null ? "rood" : (vergoedingWijktAf || (totaal && !totaal.klopt)) ? "oranje" : "groen";
    return { onbetaald, rente, projected, match, totaal, genoeg, status, vergoedingWijktAf };
  }, [form, segTx]);

  const verplichtOntbreekt = [
    !form.startdatum && "startdatum", !form.koopprijs && "koopprijs", !form.looptijd && "looptijd", !form.maandbedrag && "maandbedrag",
  ].filter(Boolean);

  const bewaar = (lijst = contracts) => {
    const cleaned = lijst.map(cleanSegment);
    onSave(lease.key, cleaned.length === 1 ? cleaned[0] : { contracts: cleaned });
  };
  const klaar = () => { bewaar(); onClose(); };
  // "Afronden": daarna meteen door naar het volgende in de nieuw-dossier-wizard opgegeven contract (als er nog een is).
  const afronden = () => { bewaar(); onClose(); onFinished?.(); };

  // Nieuw vervolgcontract (bij "vervangen" of "verlengd"): sla het huidige contract op in de lijst en ga
  // verder met een leeg vervolgcontract vanaf stap 1.
  const startVervolg = (verlengd) => {
    const huidig = { ...form, contractBeeindigd: !verlengd };
    const nieuw = blankVervolgContract(huidig);
    if (verlengd) nieuw.startdatum = maandenErbij(form.startdatum, form.looptijd) || nieuw.startdatum;
    const lijst = [...contracts.slice(0, cIdx), huidig, nieuw];
    setContracts(lijst);
    setCIdx(lijst.length - 1);
    setStap("contract");
  };

  // Eerste scherm bij een lease waarvan het soort nog niet is bevestigd.
  if (!typeGekozen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
          <div className="px-5 py-3 bg-teal-700 text-white rounded-t-xl flex items-center justify-between">
            <div><p className="text-xs text-teal-100">Lease — {lease.name}</p><h2 className="text-sm font-semibold">{STAPPEN.type}</h2></div>
            <button onClick={onClose} className="text-teal-50 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-sm text-slate-700">Is dit een <strong>financial lease</strong> (je leent in feite het bedrag; alleen de rente is aftrekbaar) of een <strong>operational lease</strong> (de hele termijn is aftrekbaar)?</p>
            <div className="flex gap-2">
              <button className={`${KNOP} ${KNOP_UIT}`} onClick={() => { onConfirmType(lease, "operationeel"); onClose(); onFinished?.(); }}>Operational — klaar, geen gegevens nodig</button>
              <button className={`${KNOP} ${KNOP_AAN}`} onClick={() => { onConfirmType(lease, "financieel"); setTypeGekozen(true); }}>Financial — gegevens invullen</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusKleur = { groen: "bg-emerald-50 border-emerald-200 text-emerald-800", oranje: "bg-amber-50 border-amber-200 text-amber-800", rood: "bg-red-50 border-red-200 text-red-800" };
  const statusTekst = { groen: "Berekening sluit aan op je betalingen", oranje: "Kleine afwijking — controleer de invoer", rood: "Rente niet betrouwbaar te berekenen — controleer koopprijs, looptijd en maandbedrag" };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="relative px-5 py-3 border-b border-slate-200 bg-teal-700 text-white rounded-t-xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-teal-50 hover:bg-white/15"
            title="Sluiten zonder opslaan"
          >
            <X className="h-4 w-4" /> Afbreken
          </button>
          <p className="text-xs text-slate-300 pr-24">
            Financial lease{form?.soort === "auto" ? " (auto)" : form?.soort === "machine" ? " (machine/ander middel)" : ""} — {lease.name}{contracts.length > 1 ? ` · contract ${cIdx + 1} van ${contracts.length}` : ""}
          </p>
          <h2 className="text-sm font-semibold mt-0.5">{STAPPEN[stapNu]}</h2>
          <div className="mt-2 h-1 rounded-full bg-white/20 overflow-hidden" aria-hidden="true">
            <div className="h-full bg-white/80" style={{ width: `${Math.round((pos / Math.max(stappen.length, 1)) * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-teal-100">Stap {pos + 1} van {stappen.length}</p>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {stapNu === "contract" && (
            <>
              <p className="text-xs text-slate-500">Wanneer begon dit contract en om wat voor soort object gaat het?</p>
              <Veld label="Startdatum contract">
                <input type="date" className={INPUT} value={form.startdatum} onChange={(e) => set({ startdatum: e.target.value })} />
                {bank.startdatum && form.startdatum !== bank.startdatum && (
                  <Voorstel tekst={`eerste betaling op ${new Date(bank.startdatum).toLocaleDateString("nl-NL")}`} onNeem={() => set({ startdatum: bank.startdatum })} />
                )}
              </Veld>
              <Veld label="Soort object" hint="Auto of machine: dan wordt het geleasede object ook als bedrijfsmiddel afgeschreven. 'Niet ingevuld': alleen de rente is aftrekbaar.">
                <select className={INPUT} value={form.soort || ""} onChange={(e) => set({ soort: e.target.value, ...(e.target.value && form.afschrijvingstermijnJaren === "" && !eerderZelfdeAuto ? { afschrijvingstermijnJaren: "5" } : {}) })}>
                  <option value="">Niet ingevuld</option>
                  <option value="auto">Auto</option>
                  <option value="machine">Machine/overig</option>
                </select>
              </Veld>
              {form.soort === "auto" && (
                <Veld label="Kenteken" hint="Hetzelfde kenteken bij een vervolgcontract = dezelfde auto; gegevens van het eerdere contract worden dan overgenomen.">
                  <input className={INPUT} value={form.kenteken} onChange={(e) => set({ kenteken: e.target.value })} placeholder="bijv. AB-123-C" />
                </Veld>
              )}
            </>
          )}

          {stapNu === "aankoop" && (
            <>
              <p className="text-xs text-slate-500">Zoals op het leasecontract of de offerte staat. Weet je een bedrag niet, laat het dan leeg (alleen de koopprijs is nodig).</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Veld label="Koopprijs (excl. BTW)"><input type="number" step="0.01" className={INPUT} value={form.koopprijs} onChange={(e) => set({ koopprijs: e.target.value })} /></Veld>
                <Veld label="Te betalen BTW"><input type="number" step="0.01" className={INPUT} value={form.teBetalenBtw} onChange={(e) => set({ teBetalenBtw: e.target.value })} /></Veld>
                <Veld label="Aanbetaling"><input type="number" step="0.01" className={INPUT} value={form.aanbetaling} onChange={(e) => set({ aanbetaling: e.target.value })} /></Veld>
                <Veld label="Inruilwaarde"><input type="number" step="0.01" className={INPUT} value={form.inruilwaarde} onChange={(e) => set({ inruilwaarde: e.target.value })} /></Veld>
                <Veld label="Inlossing lopende lening"><input type="number" step="0.01" className={INPUT} value={form.inlossingLopendeLening} onChange={(e) => set({ inlossingLopendeLening: e.target.value })} /></Veld>
              </div>
              <p className="text-xs text-slate-500">Onbetaald gedeelte (basis voor de rente): <strong>{eur(computeOnbetaaldGedeelteKoop(form))}</strong></p>
            </>
          )}

          {stapNu === "voorwaarden" && (
            <>
              <p className="text-xs text-slate-500">De betalingsstructuur van het contract. De app berekent hieruit het rentepercentage.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Veld label="Looptijd (maanden)"><input type="number" className={INPUT} value={form.looptijd} onChange={(e) => set({ looptijd: e.target.value })} /></Veld>
                <Veld label="Maandbedrag">
                  <input type="number" step="0.01" className={INPUT} value={form.maandbedrag} onChange={(e) => set({ maandbedrag: e.target.value })} />
                  {bank.maandbedrag && String(form.maandbedrag) !== bank.maandbedrag && (
                    <Voorstel tekst={`${eur(Number(bank.maandbedrag))} per betaling (${bank.aantal} betalingen gevonden)`} onNeem={() => set({ maandbedrag: bank.maandbedrag })} />
                  )}
                </Veld>
                <Veld label="Eindbetaling (indien van toepassing)"><input type="number" step="0.01" className={INPUT} value={form.eindbetaling} onChange={(e) => set({ eindbetaling: e.target.value })} /></Veld>
                <Veld label="Extra bedrag 1e termijn"><input type="number" step="0.01" className={INPUT} value={form.extraBedrag1eTermijn} onChange={(e) => set({ extraBedrag1eTermijn: e.target.value })} /></Veld>
                <Veld label="Leasevergoeding (financieringskosten)" hint="Bovenop het koopbedrag. Optioneel; gebruikt voor een extra controle."><input type="number" step="0.01" className={INPUT} value={form.leaseVergoeding} onChange={(e) => set({ leaseVergoeding: e.target.value })} /></Veld>
              </div>
            </>
          )}

          {stapNu === "bedrijfsmiddel" && (
            <>
              <p className="text-xs text-slate-500">Voor de afschrijving{form.soort === "auto" ? " en bijtelling" : ""} van het geleasede object. Alles is optioneel; leeg laten geeft de bestaande berekening.</p>
              {eerderZelfdeAuto && (
                <p className="text-xs text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-2.5 py-1.5">Zelfde kenteken als een eerder contract — cataloguswaarde en bijtelling worden daarvan overgenomen.</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {eerderZelfdeAuto ? (
                  <div className="text-sm">
                    <span className="block text-xs font-medium text-slate-600 mb-1">Afschrijvingstermijn</span>
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">Loopt door vanaf het eerste contract van deze auto: {restantTekst(restantAfschrijving(contracts.find((c) => c.soort === "auto" && normalizeKenteken(c.kenteken) === normalizeKenteken(form.kenteken)), form.startdatum))}.</p>
                  </div>
                ) : (
                  <Veld label="Afschrijvingstermijn (jaren)" hint={`= ${(100 / Math.max(Number(form.afschrijvingstermijnJaren) || 0, 5)).toFixed(2).replace(".", ",")}% per jaar. Minimaal 5 jaar (fiscale 20%-cap); langer kan, het percentage gaat dan evenredig omlaag.`}><input type="number" className={INPUT} value={form.afschrijvingstermijnJaren} onChange={(e) => set({ afschrijvingstermijnJaren: e.target.value })} /></Veld>
                )}
                <Veld label="Restwaarde"><input type="number" step="0.01" className={INPUT} value={form.restwaarde} onChange={(e) => set({ restwaarde: e.target.value })} /></Veld>
                {form.soort === "auto" && !eerderZelfdeAuto && (
                  <>
                    <Veld label="Cataloguswaarde"><input type="number" step="0.01" className={INPUT} value={form.cataloguswaarde} onChange={(e) => set({ cataloguswaarde: e.target.value })} /></Veld>
                    <Veld label="Bijtellingspercentage"><input type="number" step="0.01" className={INPUT} value={form.bijtellingspercentage} onChange={(e) => set({ bijtellingspercentage: e.target.value })} /></Veld>
                  </>
                )}
              </div>
              {form.soort === "auto" && (
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-1">Privégebruik meer dan 500 km per jaar?</p>
                  <PrivegebruikJaren
                    form={form}
                    jaren={jarenVoorPrivegebruikVan(form, segTx, !contracts.slice(cIdx + 1).some((c) => c.soort === "auto" && normalizeKenteken(c.kenteken) && normalizeKenteken(c.kenteken) === normalizeKenteken(form.kenteken)))}
                    anderen={contracts.filter((c, i) => i !== cIdx && c.soort === "auto" && normalizeKenteken(c.kenteken) && normalizeKenteken(c.kenteken) === normalizeKenteken(form.kenteken))}
                    onChange={(map) => set({ privegebruikMeerDan500kmPerJaar: map })}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Alleen bij meer dan 500 km privé per jaar geldt de bijtelling. Voor dezelfde auto telt een vinkje voor alle contracten.</p>
                </div>
              )}
              <p className="text-[11px] text-slate-400">KIA-beoordeling stel je in via "Meer opties" (alles op één scherm).</p>
            </>
          )}

          {stapNu === "controle" && (
            <>
              {verplichtOntbreekt.length > 0 && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">Nog nodig voor de berekening: {verplichtOntbreekt.join(", ")}. Ga terug om dit in te vullen.</p>
              )}
              {controle.status && (
                <p className={`text-xs border rounded-lg px-2.5 py-1.5 font-medium ${statusKleur[controle.status]}`}>{statusTekst[controle.status]}</p>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-slate-500">Onbetaald gedeelte</dt><dd className="text-right font-medium">{eur(controle.onbetaald)}</dd>
                <dt className="text-slate-500">Nominale rente per jaar</dt><dd className="text-right font-medium">{controle.rente != null ? `${controle.rente.toFixed(2).replace(".", ",")}%` : "—"}</dd>
                {controle.totaal && (
                  <>
                    <dt className="text-slate-500">Betaald tot nu toe</dt><dd className="text-right font-medium">{eur(controle.totaal.betaald)}</dd>
                    <dt className="text-slate-500">Volgens schema</dt><dd className="text-right font-medium">{eur(controle.totaal.verwacht)}</dd>
                    <dt className="text-slate-500">Verschil</dt>
                    <dd className={`text-right font-medium ${controle.totaal.klopt ? "text-emerald-700" : "text-amber-700"}`}>{eur(controle.totaal.verschil)}</dd>
                  </>
                )}
              </dl>
              {controle.vergoedingWijktAf && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">De ingevulde leasevergoeding sluit niet aan op koopprijs + betalingen. Controleer stap Aankoop en Leasevoorwaarden.</p>
              )}
              {controle.match && ((controle.match.results || []).some((r) => !r.matchedTx) || (controle.match.onverwachteBetalingen?.length > 0)) && (
                <p className="text-xs text-slate-500">Niet elke termijn in het schema is in je bank terug te vinden. Dat kan kloppen (bijv. een deel is van een andere rekening betaald); het volledige schema zie je in "Meer opties".</p>
              )}
              {!controle.genoeg && verplichtOntbreekt.length === 0 && <p className="text-xs text-slate-500">Nog niet genoeg ingevuld om te controleren.</p>}
            </>
          )}

          {stapNu === "verloop" && (
            <>
              <p className="text-xs text-slate-500">Hoe staat dit contract er nu voor?</p>
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm"><input type="radio" name="verloop" checked={!form.contractBeeindigd && form.naAfloop !== "blijft"} onChange={() => set({ contractBeeindigd: false, naAfloop: "" })} /> <span><strong>Loopt nog</strong></span></label>
                <label className="flex items-start gap-2 text-sm"><input type="radio" name="verloop" checked={!form.contractBeeindigd && form.naAfloop === "blijft"} onChange={() => set({ contractBeeindigd: false, naAfloop: "blijft" })} /> <span><strong>Afgelopen — het object blijft in het bedrijf</strong> (eindbetaling gedaan, overgenomen of herfinancierd). De afschrijving loopt door tot de totale termijn.</span></label>
                <label className="flex items-start gap-2 text-sm"><input type="radio" name="verloop" checked={!!form.contractBeeindigd} onChange={() => set({ contractBeeindigd: true, naAfloop: "", einddatumContract: form.einddatumContract || maandenErbij(form.startdatum, form.looptijd) })} /> <span><strong>Gestopt — ingeleverd, verkocht of geveild.</strong> De afschrijving stopt op de einddatum.</span></label>
              </div>
              {form.contractBeeindigd && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                  <Veld label="Einddatum"><input type="date" className={INPUT} value={form.einddatumContract} onChange={(e) => set({ einddatumContract: e.target.value })} /></Veld>
                  <Veld label="Opbrengst (verkoop/veiling/inlevering)" hint="Vul 0 in als het object zonder vergoeding is ingeleverd — de resterende boekwaarde wordt dan als verlies genomen. Leeg laten alleen bij een gewone herfinanciering."><input type="number" step="0.01" className={INPUT} value={form.verkoopsom} onChange={(e) => set({ verkoopsom: e.target.value })} /></Veld>
                </div>
              )}
              <div className="border-t border-slate-100 pt-3 space-y-1.5">
                <p className="text-xs font-medium text-slate-600">Volgt er een nieuw contract?</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={`${KNOP} ${KNOP_UIT}`} onClick={() => startVervolg(false)} title="Het huidige contract wordt als beëindigd gemarkeerd en je vult het vervangende contract in">Vervangen door een nieuw contract</button>
                  <button type="button" className={`${KNOP} ${KNOP_UIT}`} onClick={() => startVervolg(true)} title="Het huidige contract loopt gewoon uit; je vult het vervolgcontract in dat daarna begint">Verlengd / vervolgcontract</button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {pos > 0 && (
              <button onClick={() => setStap(stappen[pos - 1])} className="inline-flex items-center gap-0.5 text-xs text-slate-500 hover:text-slate-700"><ChevronLeft className="h-3.5 w-3.5" /> Terug</button>
            )}
            {onOpenAdvanced && (
              <button onClick={() => { bewaar(); onClose(); onOpenAdvanced(lease.key); }} className="text-xs text-slate-400 hover:text-slate-600 underline decoration-dotted">Meer opties (alles op één scherm)</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pos < stappen.length - 1 ? (
              <>
                <button onClick={klaar} className="text-xs text-slate-500 hover:text-slate-700 underline decoration-dotted">Opslaan en sluiten</button>
                <button onClick={() => setStap(stappen[pos + 1])} className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">Volgende <ChevronRight className="h-3.5 w-3.5" /></button>
              </>
            ) : (
              <button onClick={afronden} className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"><Check className="h-3.5 w-3.5" /> Opslaan en afronden</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
