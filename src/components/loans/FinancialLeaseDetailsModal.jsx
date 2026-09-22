import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  computeOnbetaaldGedeelteKoop, computeFinancialLeaseRate, computeTotaleLeaseBetalingen,
  generateProjectedLeasePayments, matchLeasePaymentsToSchedule, getLeaseSegments, assignLeaseTransactionsToSegments,
  normalizeKenteken,
} from "../../tax/financialLease.js";
import { computeLoanAmortization, groupAmortizationByYear } from "../../tax/loanAmortization.js";
import { computeLeaseAfschrijvingVoorJaar, MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN } from "../../tax/autoBijtelling.js";
import { eur } from "../../utils/amounts.js";

const FIELDS_AANKOOP = [
  ["koopprijs", "Koopprijs"],
  ["teBetalenBtw", "Te betalen BTW"],
  ["aanbetaling", "Aanbetaling"],
  ["inruilwaarde", "Inruilwaarde"],
  ["inlossingLopendeLening", "Inlossing lopende lening"],
];
const FIELDS_LEASE = [
  ["leaseVergoeding", "Lease vergoeding (financieringskosten, bovenop het koopbedrag)"],
  ["looptijd", "Looptijd (maanden)"],
  ["maandbedrag", "Maandbedrag"],
  ["eindbetaling", "Eindbetaling (indien van toepassing)"],
  ["extraBedrag1eTermijn", "Extra bedrag 1e termijn"],
];

// Vult een opgeslagen (of nog lege) contractsegment aan tot het volledige formuliershape — zelfde
// velden als voorheen op het topniveau van leaseDetails, nu per segment.
function formFromSegment(segment) {
  const s = segment || {};
  return {
    koopprijs: s.koopprijs ?? "",
    teBetalenBtw: s.teBetalenBtw ?? "",
    aanbetaling: s.aanbetaling ?? "",
    inruilwaarde: s.inruilwaarde ?? "",
    inlossingLopendeLening: s.inlossingLopendeLening ?? "",
    leaseVergoeding: s.leaseVergoeding ?? "",
    looptijd: s.looptijd ?? "",
    maandbedrag: s.maandbedrag ?? "",
    eindbetaling: s.eindbetaling ?? "",
    extraBedrag1eTermijn: s.extraBedrag1eTermijn ?? "",
    startdatum: s.startdatum ?? "",
    datumEersteTermijn: s.datumEersteTermijn ?? "",
    contractBeeindigd: s.contractBeeindigd ?? false,
    einddatumContract: s.einddatumContract ?? "",
    verkoopsom: s.verkoopsom ?? "",
    restschuld: s.restschuld ?? "",
    // Kapitalisatie/afschrijving + bijtelling (financiële lease auto/machine, zie
    // tax/autoBijtelling.js) — allemaal optioneel en standaard leeg, zodat een bestaand contract
    // (zonder deze velden) exact hetzelfde blijft rekenen als voorheen.
    soort: s.soort ?? "",
    afschrijvingstermijnJaren: s.afschrijvingstermijnJaren ?? "",
    cataloguswaarde: s.cataloguswaarde ?? "",
    bijtellingspercentage: s.bijtellingspercentage ?? "",
    privegebruikMeerDan500kmPerJaar: s.privegebruikMeerDan500kmPerJaar ?? {},
    // Kenteken (v150): koppelt contractsegmenten van DEZELFDE auto aan elkaar bij een tussentijds
    // vervangen/geherfinancierd leasecontract — zie tax/autoBijtelling.js. Alleen relevant/getoond
    // bij soort "auto". Optioneel en standaard leeg, dus geen enkel bestaand contract heeft dit al
    // ingevuld.
    kenteken: s.kenteken ?? "",
  };
}

// Een nieuw vervolgcontract begint logischerwijs de dag na het einde van het vorige — die datum
// hoeft niet exact te kloppen (net als bij de "startdatum → suggestie 1e termijn" hierboven, mag
// altijd nog aangepast worden), maar is een zinniger startpunt dan een leeg veld.
// Bij een "nieuw vervolgcontract" is het overgrote deel van de gevallen een herfinanciering van
// PRECIES DEZELFDE auto (zie de toelichting bij groupSegmentenOpKenteken in tax/autoBijtelling.js) —
// daarom wordt hier, als suggestie, ook "Soort" en (bij een auto) het kenteken van het vorige
// contract alvast overgenomen. Dit is puur een startpunt: net als de startdatum-suggestie hierboven
// blijft dit veld gewoon aanpasbaar (of leeg te maken) als het vervolgcontract toch een ander
// bedrijfsmiddel betreft.
function blankVervolgContract(vorigeSegment) {
  const form = formFromSegment(null);
  if (vorigeSegment?.einddatumContract) {
    const d = new Date(vorigeSegment.einddatumContract);
    d.setDate(d.getDate() + 1);
    form.startdatum = d.toISOString().slice(0, 10);
  }
  if (vorigeSegment?.soort) form.soort = vorigeSegment.soort;
  if (vorigeSegment?.soort === "auto" && vorigeSegment.kenteken) form.kenteken = vorigeSegment.kenteken;
  return form;
}

function cleanSegment(form) {
  const n = (v) => (v === "" ? null : Number(v));
  return {
    koopprijs: n(form.koopprijs), teBetalenBtw: n(form.teBetalenBtw), aanbetaling: n(form.aanbetaling),
    inruilwaarde: n(form.inruilwaarde), inlossingLopendeLening: n(form.inlossingLopendeLening),
    leaseVergoeding: n(form.leaseVergoeding), looptijd: n(form.looptijd), maandbedrag: n(form.maandbedrag),
    eindbetaling: n(form.eindbetaling), extraBedrag1eTermijn: n(form.extraBedrag1eTermijn),
    startdatum: form.startdatum || null,
    datumEersteTermijn: form.datumEersteTermijn || null,
    contractBeeindigd: form.contractBeeindigd,
    einddatumContract: form.contractBeeindigd ? (form.einddatumContract || null) : null,
    verkoopsom: form.contractBeeindigd ? n(form.verkoopsom) : null,
    restschuld: form.contractBeeindigd ? n(form.restschuld) : null,
    soort: form.soort || null,
    afschrijvingstermijnJaren: form.soort ? n(form.afschrijvingstermijnJaren) : null,
    cataloguswaarde: form.soort === "auto" ? n(form.cataloguswaarde) : null,
    bijtellingspercentage: form.soort === "auto" ? n(form.bijtellingspercentage) : null,
    privegebruikMeerDan500kmPerJaar: form.soort === "auto" ? form.privegebruikMeerDan500kmPerJaar || {} : null,
    kenteken: form.soort === "auto" ? (form.kenteken || null) : null,
  };
}

// Eén contractsegment — precies dezelfde velden/previews die dit venster altijd al toonde, nu
// herbruikbaar per segment. `segmentTransactions` zijn alleen de banktransacties die (op basis van
// de startdatum van dit én het eventuele volgende segment) bij dít contract horen.
function LeaseContractSection({ form, onChange, segmentTransactions, title, canRemove, onRemove, canAddNext, onAddNext, precedingSegments }) {
  const set = (field) => (e) => onChange({ ...form, [field]: e.target.value });
  const setChecked = (field) => (e) => onChange({ ...form, [field]: e.target.checked });

  // v150: is het ingevulde kenteken (genormaliseerd) hetzelfde als bij een EERDER contractsegment
  // van deze zelfde lease? Zo ja, dan gaat het (zie tax/autoBijtelling.js) fiscaal om dezelfde auto —
  // cataloguswaarde/bijtellingspercentage worden dan overgenomen van dat eerdere segment, in plaats
  // van opnieuw ingevuld te moeten worden. Bij meerdere eerdere matches (zou niet moeten voorkomen,
  // maar voor de zekerheid) telt de EERSTE (oudste) — dezelfde "eerste segment is leidend"-regel als
  // in de berekening zelf.
  const matchedPreceding = useMemo(() => {
    const norm = normalizeKenteken(form.kenteken);
    if (!norm || form.soort !== "auto") return null;
    return (precedingSegments || []).find((s) => s.soort === "auto" && normalizeKenteken(s.kenteken) === norm) || null;
  }, [form.kenteken, form.soort, precedingSegments]);

  const [overrideCapitalisatie, setOverrideCapitalisatie] = useState(false);
  // Zodra het kenteken niet (meer) matcht, vervalt een eventuele eerdere "toch los invullen" — een
  // nieuw, ander kenteken is een andere situatie.
  useEffect(() => {
    if (!matchedPreceding) setOverrideCapitalisatie(false);
  }, [!!matchedPreceding]);

  const capitalisatieOvergenomen = !!matchedPreceding && !overrideCapitalisatie;

  // Zolang de waarden zijn overgenomen (niet losgemaakt), automatisch synchroon houden met het
  // gekoppelde eerdere segment — zodat een latere wijziging daar (bijv. de accountant corrigeert de
  // cataloguswaarde) hier vanzelf meekomt. De waarde-vergelijking hieronder voorkomt een oneindige
  // onChange-lus: er wordt alleen bijgewerkt als er daadwerkelijk iets afwijkt.
  useEffect(() => {
    if (!capitalisatieOvergenomen) return;
    if (form.cataloguswaarde === matchedPreceding.cataloguswaarde && form.bijtellingspercentage === matchedPreceding.bijtellingspercentage) return;
    onChange({ ...form, cataloguswaarde: matchedPreceding.cataloguswaarde, bijtellingspercentage: matchedPreceding.bijtellingspercentage });
  });

  // Waarschuwing (niet blokkerend, zie toelichting bij "toch los invullen" hieronder): hetzelfde
  // kenteken, maar toch een andere cataloguswaarde/bijtellingspercentage dan het gekoppelde eerdere
  // segment — dat is normaal gesproken een eigenschap van dezelfde auto, dus vermoedelijk een
  // vergissing (kan ook een bewuste correctie zijn).
  const capitalisatieWijktAf =
    !!matchedPreceding && overrideCapitalisatie &&
    (Number(form.cataloguswaarde || 0) !== Number(matchedPreceding.cataloguswaarde || 0) ||
      Number(form.bijtellingspercentage || 0) !== Number(matchedPreceding.bijtellingspercentage || 0));

  const onbetaaldGedeelteKoop = useMemo(() => computeOnbetaaldGedeelteKoop(form), [form]);
  const renteJaarlijks = useMemo(() => computeFinancialLeaseRate(form), [form]);
  const totaleLeaseBetalingen = useMemo(() => computeTotaleLeaseBetalingen(form), [form]);
  const amortization = useMemo(() => {
    if (renteJaarlijks == null || !form.startdatum) return null;
    const projectedPayments = generateProjectedLeasePayments(form);
    if (projectedPayments.length === 0) return null;
    return computeLoanAmortization(projectedPayments, { leasebedrag: onbetaaldGedeelteKoop, startdatum: form.startdatum, rente: renteJaarlijks });
  }, [form, onbetaaldGedeelteKoop, renteJaarlijks]);
  const perJaar = useMemo(() => groupAmortizationByYear(amortization), [amortization]);
  const projectedPayments = useMemo(() => generateProjectedLeasePayments(form), [form]);
  const paymentCheck = useMemo(() => {
    if (projectedPayments.length === 0) return null;
    return matchLeasePaymentsToSchedule(projectedPayments, segmentTransactions, Number(form.maandbedrag) || 0);
  }, [projectedPayments, segmentTransactions, form.maandbedrag]);

  // Aanvullende, grovere controle náást de per-termijn vergelijking hierboven: als de datums/
  // bedragen per termijn niet allemaal exact matchen (bijv. door een net iets verkeerd ingevulde
  // datum, of een incasso die een paar dagen buiten de marge valt) kan de lijst hierboven onterecht
  // alarmerend ogen terwijl er financieel niets misgaat. Deze telt daarom gewoon op: is er, in
  // totaal, ongeveer evenveel aan deze leasemaatschappij betaald als er volgens het schema betaald
  // had moeten zijn tot de datum van de laatste gevonden transactie? Vervangt de losse meldingen
  // hierboven niet (die blijven nuttig om te zien WELKE termijn afwijkt), maar is een geruststellend
  // (of juist waarschuwend) totaalsignaal ernaast.
  const laatsteTransactieDatum = useMemo(
    () => segmentTransactions.reduce((max, tx) => (!max || tx.date > max ? tx.date : max), null),
    [segmentTransactions]
  );
  const totaalControle = useMemo(() => {
    if (!laatsteTransactieDatum || projectedPayments.length === 0) return null;
    // Netto optellen (mét teken) en pas dan absoluut nemen — een bijschrijving (terugboeking/
    // correctie van de leasemaatschappij) moet een eerdere betaling verrekenen, niet als extra
    // betaling erbovenop tellen (dat gaf voorheen een te hoog "totaal betaald").
    const totaalBetaald = Math.abs(segmentTransactions.reduce((a, tx) => a + tx.amount, 0));
    const verwachtTotNu = projectedPayments
      .filter((p) => p.date <= laatsteTransactieDatum)
      .reduce((a, p) => a + Math.abs(p.amount), 0);
    if (verwachtTotNu === 0) return null;
    const verschil = totaalBetaald - verwachtTotNu;
    const marge = Math.max(Number(form.maandbedrag) || 0, 25);
    return { totaalBetaald, verwachtTotNu, verschil, klopt: Math.abs(verschil) <= marge, aantal: segmentTransactions.filter((tx) => tx.amount < 0).length };
  }, [segmentTransactions, projectedPayments, laatsteTransactieDatum, form.maandbedrag]);

  // Berekende afschrijving per jaar voor dit contract als "Soort" is ingevuld — puur ter controle/
  // preview in dit venster, dezelfde berekening (computeLeaseAfschrijvingVoorJaar) als het
  // aangiftevoorstel gebruikt.
  const leaseActivumAfschrijvingPerJaar = useMemo(() => {
    if (!form.soort || !form.startdatum) return [];
    const segment = cleanSegment(form);
    const startYear = new Date(segment.startdatum).getFullYear();
    const termijn = segment.afschrijvingstermijnJaren || (segment.soort === "auto" ? MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN : 0);
    if (!(termijn > 0)) return [];
    const rows = [];
    for (let j = startYear; j <= startYear + Math.ceil(termijn); j++) {
      const afschrijving = computeLeaseAfschrijvingVoorJaar(segment, j);
      if (rows.length > 0 && afschrijving <= 0) break;
      rows.push({ jaar: j, afschrijving });
    }
    return rows;
  }, [form]);

  // Welke jaren zijn relevant om de privégebruik-toggle voor te tonen: alle jaren waarin er
  // daadwerkelijk banktransacties voor dit contract zijn, plus het huidige kalenderjaar en het
  // startjaar van het contract (ook als daar nog geen transacties over zijn geïmporteerd).
  const jarenVoorPrivegebruik = useMemo(() => {
    const jarenSet = new Set(segmentTransactions.map((tx) => tx.date.getFullYear()));
    jarenSet.add(new Date().getFullYear());
    if (form.startdatum) jarenSet.add(new Date(form.startdatum).getFullYear());
    return [...jarenSet].sort((a, b) => a - b);
  }, [segmentTransactions, form.startdatum]);

  const leaseVergoedingWijktAf =
    form.leaseVergoeding !== "" && totaleLeaseBetalingen != null &&
    Math.abs(onbetaaldGedeelteKoop + Number(form.leaseVergoeding) - totaleLeaseBetalingen) > 25;

  // "Datum 1e termijn" is alleen ooit bedoeld als een kleine correctie op de startdatum (de eerste
  // termijn valt weleens iets eerder dan de vervolgtermijnen, zie de toelichting hieronder) — maar
  // eenmaal ingevuld wordt die nooit meer automatisch bijgewerkt als de startdatum daarna verandert
  // (zie de onChange van Startdatum hierboven: de suggestie slaat alleen aan als het veld nog leeg
  // is). Staat er een datum in die meer dan een half jaar van de startdatum afligt — bijvoorbeeld na
  // een abuis-klik in de datumkiezer — dan schuift het HELE schema daardoor jaren op, zonder dat dat
  // verder ergens opvalt. Dat is precies wat hier gebeurde: een "Datum 1e termijn" die per ongeluk op
  // een datum ver in de toekomst kwam te staan, waardoor de vergelijking met de bank niet meer klopte.
  const datumEersteTermijnWijktAf = (() => {
    if (!form.startdatum || !form.datumEersteTermijn) return false;
    const maanden = (new Date(form.datumEersteTermijn) - new Date(form.startdatum)) / (1000 * 60 * 60 * 24 * 30.44);
    return Math.abs(maanden) > 6;
  })();

  return (
    <div className="rounded-lg border border-slate-200 p-4 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {canRemove && (
          <button onClick={onRemove} className="text-xs text-red-600 hover:text-red-800">
            Verwijderen
          </button>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Aankoop</p>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS_AANKOOP.map(([field, label]) => (
            <label key={field} className="text-sm">
              <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
              <input type="number" min="0" step="0.01" value={form[field]} onChange={set(field)} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Onbetaald gedeelte koop</span>
        <span className="text-sm font-mono font-semibold text-slate-900">{eur(onbetaaldGedeelteKoop)}</span>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Leasestructuur</p>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS_LEASE.map(([field, label]) => (
            <label key={field} className="text-sm">
              <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
              <input type="number" min="0" step="0.01" value={form[field]} onChange={set(field)} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
          ))}
          <label className="text-sm">
            <span className="block text-xs font-medium text-slate-600 mb-1">Startdatum *</span>
            <input
              type="date"
              value={form.startdatum}
              onChange={(e) => {
                const nieuweStartdatum = e.target.value;
                // Suggestie voor de datum van de eerste termijn: de 1e van de maand ná de
                // startdatum — dat klopt lang niet altijd (de eerste termijn valt vaak al binnen
                // twee weken na het afsluiten), maar is een redelijk startpunt dat je hieronder
                // direct kunt aanpassen. Overschrijft nooit een datum die je zelf al hebt ingevuld.
                if (form.datumEersteTermijn || !nieuweStartdatum) { onChange({ ...form, startdatum: nieuweStartdatum }); return; }
                const suggestie = new Date(nieuweStartdatum);
                suggestie.setMonth(suggestie.getMonth() + 1, 1);
                onChange({ ...form, startdatum: nieuweStartdatum, datumEersteTermijn: suggestie.toISOString().slice(0, 10) });
              }}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5"
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs font-medium text-slate-600 mb-1">Datum 1e termijn</span>
            <input type="date" value={form.datumEersteTermijn} onChange={set("datumEersteTermijn")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
          </label>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          * Startdatum is nodig om de betalingen aan het schema te koppelen. De eerste termijn valt vaak eerder dan
          de vervolgtermijnen (soms al binnen twee weken) — pas de datum hierboven aan als die afwijkt van de
          voorgestelde 1e van de volgende maand.
        </p>
        {datumEersteTermijnWijktAf && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mt-2">
            ⚠ "Datum 1e termijn" ({new Date(form.datumEersteTermijn).toLocaleDateString("nl-NL")}) ligt meer dan een half jaar
            van de startdatum ({new Date(form.startdatum).toLocaleDateString("nl-NL")}) af — dit schuift het hele schema hieronder
            mee, waardoor het niet meer aansluit bij de echte betalingen. Klopt dit niet, pas de datum hierboven aan (meestal
            dicht bij de startdatum, of leeg laten voor de voorgestelde 1e van de volgende maand).
          </p>
        )}
      </div>

      <div className="border-t border-slate-200 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Kapitalisatie &amp; afschrijving (optioneel)
        </p>
        <p className="text-xs text-slate-400 mb-2">
          Vul dit in als dit leasecontract een auto of machine betreft — het geleasde object is dan een
          eigen bedrijfsmiddel dat gekapitaliseerd en afgeschreven wordt. Laat "Soort" op "Niet ingevuld"
          staan om de bestaande berekening (alleen rente aftrekbaar) ongewijzigd te laten.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block text-xs font-medium text-slate-600 mb-1">Soort</span>
            <select
              value={form.soort || ""}
              onChange={(e) => onChange({ ...form, soort: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5"
            >
              <option value="">Niet ingevuld (geen kapitalisatie)</option>
              <option value="auto">Auto</option>
              <option value="machine">Machine/overig</option>
            </select>
          </label>
          {form.soort && (
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-600 mb-1">
                Afschrijvingstermijn (jaren){form.soort === "auto" ? ` — minimaal ${MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN}` : ""}
              </span>
              <input
                type="number" min="1" step="1" value={form.afschrijvingstermijnJaren} onChange={set("afschrijvingstermijnJaren")}
                placeholder={form.soort === "auto" ? String(MINIMALE_AFSCHRIJVINGSTERMIJN_AUTO_JAREN) : ""}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5"
              />
            </label>
          )}
          {form.soort === "auto" && (
            <>
              <label className="text-sm">
                <span className="block text-xs font-medium text-slate-600 mb-1">Kenteken</span>
                <input
                  type="text" value={form.kenteken} onChange={set("kenteken")}
                  placeholder="bijv. 12-ABC-3"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 uppercase"
                />
              </label>
              <label className="text-sm">
                <span className="block text-xs font-medium text-slate-600 mb-1">Cataloguswaarde (voor bijtelling)</span>
                <input
                  type="number" min="0" step="0.01" value={form.cataloguswaarde} onChange={set("cataloguswaarde")}
                  disabled={capitalisatieOvergenomen}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </label>
              <label className="text-sm">
                <span className="block text-xs font-medium text-slate-600 mb-1">Bijtellingspercentage (%)</span>
                <input
                  type="number" min="0" step="0.1" value={form.bijtellingspercentage} onChange={set("bijtellingspercentage")}
                  disabled={capitalisatieOvergenomen}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </label>
            </>
          )}
        </div>
        {capitalisatieOvergenomen && (
          <p className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 mt-2">
            Overgenomen van eerdere contractperiode (kenteken {form.kenteken}) — dezelfde auto heeft
            fiscaal maar één cataloguswaarde en bijtellingspercentage, ook al is het leasecontract
            ervoor tussentijds vervangen/geherfinancierd. Ook de afschrijving loopt in dat geval door
            vanaf de oorspronkelijke aanschaf, niet opnieuw vanaf dit vervolgcontract.{" "}
            <button type="button" onClick={() => setOverrideCapitalisatie(true)} className="underline font-medium text-slate-700 hover:text-slate-900">
              Toch los invullen
            </button>
          </p>
        )}
        {matchedPreceding && overrideCapitalisatie && (
          <p className="text-xs text-slate-400 mt-2">
            Cataloguswaarde/bijtellingspercentage van dit segment worden nu los ingevuld (niet meer
            automatisch overgenomen van het gekoppelde eerdere contract met kenteken {form.kenteken}).{" "}
            <button type="button" onClick={() => setOverrideCapitalisatie(false)} className="underline font-medium text-slate-600 hover:text-slate-800">
              Weer koppelen
            </button>
          </p>
        )}
        {capitalisatieWijktAf && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mt-2">
            ⚠ Dit kenteken is ook gebruikt bij een eerdere contractperiode met een andere
            cataloguswaarde/bijtellingspercentage — normaal gesproken zijn dit eigenschappen van
            dezelfde auto. Weet je zeker dat dit klopt?
          </p>
        )}

        {form.soort && leaseActivumAfschrijvingPerJaar.length > 0 && (
          <div className="mt-3 rounded-md bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Berekende afschrijving per jaar</p>
            {matchedPreceding && (
              <p className="text-xs text-slate-400 mb-2">
                Ter info: dit is de afschrijving als dít segment op zichzelf zou staan. Omdat het
                kenteken gekoppeld is aan een eerdere contractperiode, telt in het aangiftevoorstel de
                afschrijving mee vanaf die OORSPRONKELIJKE aanschaf/financiering (één doorlopende
                tijdlijn per auto), niet nogmaals vanaf dit vervolgcontract.
              </p>
            )}
            <table className="w-full text-sm text-slate-800">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="text-left font-medium pb-1">Jaar</th>
                  <th className="text-right font-medium pb-1">Afschrijving</th>
                </tr>
              </thead>
              <tbody>
                {leaseActivumAfschrijvingPerJaar.map(({ jaar, afschrijving }) => (
                  <tr key={jaar} className="border-t border-slate-200/60">
                    <td className="py-1">{jaar}</td>
                    <td className="text-right font-mono">{eur(afschrijving)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {form.soort === "auto" && jarenVoorPrivegebruik.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-slate-600 mb-1">Privégebruik meer dan 500 km per jaar?</p>
            <div className="flex flex-wrap gap-3">
              {jarenVoorPrivegebruik.map((jaar) => (
                <label key={jaar} className="flex items-center gap-1.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!form.privegebruikMeerDan500kmPerJaar?.[jaar]}
                    onChange={(e) =>
                      onChange({
                        ...form,
                        privegebruikMeerDan500kmPerJaar: { ...(form.privegebruikMeerDan500kmPerJaar || {}), [jaar]: e.target.checked },
                      })
                    }
                  />
                  {jaar}
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Alleen bij meer dan 500 km privégebruik per jaar geldt de bijtelling/onttrekking (afgetopt op de
              werkelijke totale autokosten) — anders blijven de volledige autokosten gewoon aftrekbaar.
            </p>
          </div>
        )}
      </div>

      {leaseVergoedingWijktAf && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
          ⚠ Onbetaald gedeelte koop + lease vergoeding ({eur(onbetaaldGedeelteKoop + Number(form.leaseVergoeding))}) wijkt meer dan
          €25 af van maandbedrag × looptijd + eindbetaling + extra ({eur(totaleLeaseBetalingen)}) — controleer de invoer.
        </p>
      )}

      <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700" title="Nominaal jaarpercentage (maandrente × 12), niet samengesteld/effectief">
          Nominale rente per jaar
        </span>
        <span className="text-sm font-mono font-semibold text-slate-900">
          {renteJaarlijks != null ? `${renteJaarlijks.toFixed(2)}%` : "—"}
        </span>
      </div>

      {amortization && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 mb-2">
            Volledig schema over de{form.contractBeeindigd ? " (afgebroken)" : ""} looptijd — voor de belastingaangifte
            telt per jaar wat er aan rente/aflossing is betaald, niet het totaal ineens
          </p>
          <table className="w-full text-sm text-emerald-900">
            <thead>
              <tr className="text-xs text-emerald-700">
                <th className="text-left font-medium pb-1">Jaar</th>
                <th className="text-right font-medium pb-1">Rente (aftrekbaar)</th>
                <th className="text-right font-medium pb-1">Aflossing</th>
                <th className="text-right font-medium pb-1">Saldo eind jaar</th>
              </tr>
            </thead>
            <tbody>
              {perJaar.map((j) => (
                <tr key={j.year} className="border-t border-emerald-200/60">
                  <td className="py-1">{j.year}</td>
                  <td className="text-right font-mono">{eur(j.rente)}</td>
                  <td className="text-right font-mono">{eur(j.aflossing)}</td>
                  <td className="text-right font-mono">{eur(j.saldoEindJaar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-emerald-700 mt-2 pt-2 border-t border-emerald-200">
            Totaal over de volledige{form.contractBeeindigd ? ", afgebroken" : ""} looptijd ({amortization.rows.length}{" "}
            termijnen): rente {eur(amortization.totaalRente)}, aflossing {eur(amortization.totaalAflossing)}.
            {form.contractBeeindigd
              ? " Dit schema stopt bij de opgegeven einddatum — de restschuld hieronder is de werkelijke afkoopsom/overname, die kan afwijken van dit theoretische schema."
              : " Dit is de volledige looptijd zoals ingevuld, ongeacht hoeveel er al daadwerkelijk via de bank is betaald."}
          </p>
        </div>
      )}

      {paymentCheck && (() => {
        const counts = { gevonden: 0, "gevonden-afwijkend": 0, "gevonden-samen": 0, ontbrekend: 0, "nog-niet-in-beeld": 0 };
        for (const r of paymentCheck.results) counts[r.status]++;
        const aandacht = paymentCheck.results.filter((r) => r.status === "ontbrekend" || r.status === "gevonden-afwijkend");
        const inBeeldTotaal = paymentCheck.results.length - counts["nog-niet-in-beeld"];
        return (
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
              Controle: zijn alle termijnen ook echt betaald?
            </p>
            <p className="text-sm text-slate-700">
              <strong>{counts.gevonden + counts["gevonden-afwijkend"] + counts["gevonden-samen"]}</strong> van{" "}
              <strong>{inBeeldTotaal}</strong> verwachte termijnen gevonden in de geïmporteerde bestanden
              {counts.ontbrekend > 0 && <> — <strong className="text-red-700">{counts.ontbrekend} ontbrekend</strong></>}
              {counts["gevonden-afwijkend"] > 0 && <> — <strong className="text-amber-700">{counts["gevonden-afwijkend"]} met een afwijkend bedrag</strong></>}
              {counts["nog-niet-in-beeld"] > 0 && <span className="text-slate-400"> ({counts["nog-niet-in-beeld"]} termijnen liggen na de laatst geïmporteerde datum, nog niet te controleren)</span>}
              .
            </p>
            {totaalControle && (counts.ontbrekend > 0 || counts["gevonden-afwijkend"] > 0) && (
              <p className={`mt-2 text-xs rounded-md px-2.5 py-1.5 ${totaalControle.klopt ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                {totaalControle.klopt ? "✓ " : "⚠ "}
                <strong>Totaalcontrole:</strong> in totaal is {eur(totaalControle.totaalBetaald)} betaald in {totaalControle.aantal} betaling(en)
                aan deze leasemaatschappij, tegenover een verwacht totaal van {eur(totaalControle.verwachtTotNu)} tot en met de laatst
                gevonden betaling — verschil {eur(Math.abs(totaalControle.verschil))} {totaalControle.verschil >= 0 ? "meer" : "minder"} dan verwacht.
                {totaalControle.klopt
                  ? " Dat klopt (binnen de gebruikelijke marge) — de losse meldingen hieronder wijzen dus waarschijnlijk op net iets andere data/bedragen per termijn, niet op geld dat daadwerkelijk mist."
                  : " Dat wijkt meer af dan de gebruikelijke marge — de losse meldingen hieronder wijzen dan mogelijk wél op een echt gemiste of dubbele betaling."}
              </p>
            )}
            {aandacht.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {aandacht.map((r, i) => (
                  <li key={i} className={r.status === "ontbrekend" ? "text-red-700" : "text-amber-700"}>
                    {r.status === "ontbrekend" ? "⚠ Ontbrekend: " : "⚠ Afwijkend bedrag: "}
                    verwacht {eur(Math.abs(r.projected.amount))} rond {new Date(r.projected.date).toLocaleDateString("nl-NL")}
                    {r.status === "gevonden-afwijkend" && r.matchedTx && (
                      <> — gevonden: {eur(Math.abs(r.matchedTx.amount))} op {new Date(r.matchedTx.date).toLocaleDateString("nl-NL")} (verschil {eur(r.bedragVerschil)})</>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {paymentCheck.onverwachteBetalingen.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Daarnaast {paymentCheck.onverwachteBetalingen.length} betaling(en) in deze periode die niet bij een
                verwachte termijn passen — mogelijk een extra aflossing.
              </p>
            )}
          </div>
        );
      })()}

      <div className="border-t border-slate-200 pt-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={form.contractBeeindigd} onChange={setChecked("contractBeeindigd")} />
          Contract vroegtijdig beëindigd / vervangen door een nieuw contract
        </label>
        {form.contractBeeindigd && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block text-xs font-medium text-slate-600 mb-1">Einddatum contract</span>
                <input type="date" value={form.einddatumContract} onChange={set("einddatumContract")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
              </label>
              <label className="text-sm">
                <span className="block text-xs font-medium text-slate-600 mb-1">Verkoopsom (indien van toepassing)</span>
                <input type="number" min="0" step="0.01" value={form.verkoopsom} onChange={set("verkoopsom")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
              </label>
              <label className="text-sm">
                <span className="block text-xs font-medium text-slate-600 mb-1">Restschuld (indien van toepassing)</span>
                <input type="number" min="0" step="0.01" value={form.restschuld} onChange={set("restschuld")} className="w-full rounded-md border border-slate-300 px-2 py-1.5" />
              </label>
            </div>
            <p className="text-xs text-slate-400">
              Ging het contract simpelweg over in een nieuw contract (zie hieronder), zonder aparte verkoop/afkoop? Dan
              kun je verkoopsom en restschuld leeg laten — die zijn alleen relevant bij een daadwerkelijke
              verkoop/afkoop van het leaseobject.
            </p>
            {form.verkoopsom !== "" && form.restschuld !== "" && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Resultaat bij beëindiging (verkoopsom − restschuld)</span>
                <span className={`text-sm font-mono font-semibold ${Number(form.verkoopsom) - Number(form.restschuld) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {eur(Number(form.verkoopsom) - Number(form.restschuld))}
                </span>
              </div>
            )}
            {form.restschuld !== "" && amortization && Math.abs(Number(form.restschuld) - amortization.saldoNu) > 25 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                ⚠ De opgegeven restschuld ({eur(Number(form.restschuld))}) wijkt meer dan €25 af van het op basis van de
                bankbetalingen berekende openstaande saldo ({eur(amortization.saldoNu)}) — controleer de invoer, of dit
                verschil kan kloppen (bijv. bij afwijkende voorwaarden bij vroegtijdige beëindiging).
              </p>
            )}
            {canAddNext && (
              <button
                onClick={onAddNext}
                disabled={!form.einddatumContract}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Nieuw contract toevoegen vanaf deze einddatum
              </button>
            )}
            {canAddNext && !form.einddatumContract && (
              <p className="text-xs text-slate-400">Vul eerst de einddatum in om een nieuw contract te kunnen toevoegen.</p>
            )}
          </div>
        )}
      </div>

      {!amortization && renteJaarlijks == null && onbetaaldGedeelteKoop > 0 && Number(form.looptijd) > 0 && Number(form.maandbedrag) > 0 ? (
        <p className="text-xs text-slate-400">
          Rentepercentage kan niet berekend worden: maandbedrag × looptijd + eindbetaling + extra is niet genoeg om het
          onbetaalde gedeelte koop terug te betalen, zelfs zonder rente. Controleer koopprijs, looptijd, maandbedrag en
          eindbetaling hierboven{leaseVergoedingWijktAf ? " (zie ook de waarschuwing hierboven)" : ""}.
        </p>
      ) : (
        !amortization && renteJaarlijks == null && (form.koopprijs || form.maandbedrag) && (
          <p className="text-xs text-slate-400">
            Nog niet genoeg ingevuld om het rentepercentage te kunnen berekenen (in elk geval koopprijs, looptijd en maandbedrag nodig).
          </p>
        )
      )}
    </div>
  );
}

export default function FinancialLeaseDetailsModal({ lease, details, onSave, onClose }) {
  const [contracts, setContracts] = useState(() => getLeaseSegments(details).map(formFromSegment));

  const segmentsWithTx = useMemo(
    () => assignLeaseTransactionsToSegments(lease.transactions, contracts),
    [lease, contracts]
  );

  const updateContract = (idx, newForm) => {
    setContracts((prev) => prev.map((c, i) => (i === idx ? newForm : c)));
  };
  const removeContract = (idx) => {
    setContracts((prev) => prev.filter((_, i) => i !== idx));
  };
  const addNextContract = (afterIdx) => {
    setContracts((prev) => [...prev, blankVervolgContract(prev[afterIdx])]);
  };

  const handleSave = () => {
    const cleaned = contracts.map(cleanSegment);
    onSave(lease.key, cleaned.length === 1 ? cleaned[0] : { contracts: cleaned });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <p className="text-sm font-semibold text-slate-800">Financiële lease — {lease.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{lease.count}x, totaal {eur(lease.total)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-5">
          <p className="text-xs text-slate-500">
            Vul de aankoop- en leasestructuur in zoals die op het leasecontract staat — het jaarlijkse
            rentepercentage berekent de tool daaruit vanzelf, in plaats van dat je dat zelf moet opzoeken.
            De lease vergoeding is de financieringskost bovenop het onbetaalde koopbedrag: samen vormen ze
            het totaal dat je terugbetaalt via de maandbedragen en de eventuele eindbetaling.
            {contracts.length > 1 && (
              <> Dit contract is halverwege vervangen door een nieuw contract — elk contract hieronder rekent
              onafhankelijk met zijn eigen bedrag, looptijd en de banktransacties uit zijn eigen periode.</>
            )}
          </p>

          {contracts.map((form, idx) => (
            <LeaseContractSection
              key={idx}
              form={form}
              onChange={(newForm) => updateContract(idx, newForm)}
              segmentTransactions={segmentsWithTx[idx]?.transactions || []}
              title={idx === 0 ? "Contract" : `Vervolgcontract ${idx + 1} (vanaf ${form.startdatum || "?"})`}
              canRemove={contracts.length > 1 && idx === contracts.length - 1}
              onRemove={() => removeContract(idx)}
              canAddNext={idx === contracts.length - 1}
              onAddNext={() => addNextContract(idx)}
              precedingSegments={contracts.slice(0, idx)}
            />
          ))}
        </div>
        <div className="px-5 py-3 border-t border-slate-200 shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-400">Later altijd aan te passen.</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuleren</button>
            <button onClick={handleSave} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">Opslaan</button>
          </div>
        </div>
      </div>
    </div>
  );
}
