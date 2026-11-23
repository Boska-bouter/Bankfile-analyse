import VoorlopigeAanslagInvoer from "./VoorlopigeAanslagInvoer.jsx";
import { useEffect, useState } from "react";
import { metBolletjes } from "../shared/StatusDot.jsx";
import JaarSwipe from "../shared/JaarSwipe.jsx";
import { KNOP_PRIMAIR, KNOP_SECUNDAIR } from "../../components/ui/stijl.js";
import { parseEuroNumber } from "../../utils/amounts.js";

// nieuw-V9R0 — "1.234,56", "1234.56", "€ 1.234" en "-250" als bedrag; leeg of onleesbaar = null.
export function leesSaldo(tekst) {
  let s = String(tekst ?? "").replace(/€/g, "").replace(/\s/g, "");
  if (!s) return null;
  if (!s.includes(",") && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const v = parseEuroNumber(s);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
}
// Keuzevenster "Indicatieve aangifteberekening": toont de status van het gekozen jaar en laat het
// rapport voor dat jaar (of meerdere jaren) openen. Puur weergave; de selectie en het genereren van het
// rapport zitten in App.jsx.

// Dezelfde statustekst als in het gegenereerde rapport (reports/aangiftevoorstel.js, functie
// statusTekst) — géén apart statussysteem, alleen dezelfde bestaande yearlyProgress-status (afgeleid
// uit categorisatie/onzekere transacties/bestandsgaten) ook zichtbaar vóórdat je het rapport
// genereert. "Groen" betekent hier uitdrukkelijk alleen dat
// de gegevenscontrole voldoende compleet is — niet dat de aangifte fiscaal correct is.
function aangifteStatusTekst(status, aantalPunten) {
  if (status === "rood") return "Nog onvoldoende gegevens voor een betrouwbare reconstructie";
  if (status === "oranje") return `Berekening beschikbaar — ${aantalPunten} punt${aantalPunten === 1 ? "" : "en"} controleren`;
  return "Berekening kan worden opgesteld";
}

export default function AangifteYearPickerModal({
  onClose, activeYear, onSelectYear, years, yearProgress, aangifteOpenPunten, meerdereJaren, setMeerdereJaren,
  selectedYears, setSelectedYears, onExport, toonBalansKeuze = false,
  rekeningenZonderSaldo = [], beginsaldo = {}, setBeginsaldo = null,
  voorlopigeAanslag = {}, setVoorlopigeAanslag = null, voorlopigBank = {},
}) {
  // nieuw-V8R7 — Boska 18-11: vooraf kiezen "met of zonder balans", zodat het overzicht maar één manier toont.
  const [balans, setBalans] = useState("zonder");
  // nieuw-V9R4 — Boska 19-11: bij meer jaren altijd eerst de jaarkeuze, zonder vooraf aangevinkt jaar
  // (niet automatisch het jaar dat open staat).
  const kiesJaren = (years || []).length > 1;
  const [gewist, setGewist] = useState(!kiesJaren);
  useEffect(() => {
    if (kiesJaren) { setSelectedYears([]); setMeerdereJaren(true); setGewist(true); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const gekozen = gewist ? selectedYears : []; // eerste frame: oude keuze niet tonen
  const balansKeuze = toonBalansKeuze ? (
    <fieldset className="rounded-lg border border-slate-200 p-2.5 space-y-1.5">
      <legend className="px-1 text-xs font-medium text-slate-600">Hoe vul je de aangifte in bij de Belastingdienst?</legend>
      <label className="flex items-start gap-2 text-sm">
        <input type="radio" name="balans" className="mt-1" checked={balans === "zonder"} onChange={() => setBalans("zonder")} />
        <span><b className="font-medium">Zonder balans</b><span className="block text-xs text-slate-500">Activa en passiva € 0; privéonttrekkingen sluiten aan op de winst.</span></span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="radio" name="balans" className="mt-1" checked={balans === "met"} onChange={() => setBalans("met")} />
        <span><b className="font-medium">Met balans</b><span className="block text-xs text-slate-500">Bezittingen en schulden op 1 januari en 31 december, met privéonttrekkingen en -stortingen.</span></span>
      </label>
      {balans === "met" && rekeningenZonderSaldo.length > 0 && setBeginsaldo && (
        <div className="mt-1 rounded-md bg-amber-50 border border-amber-200 p-2 space-y-1.5" data-beginsaldo>
          <p className="text-xs text-slate-700">Het bankbestand heeft geen saldo. Vul het banksaldo op 1 januari in (staat op je bankafschrift); het saldo op 31 december rekent de app uit met de boekingen.</p>
          {rekeningenZonderSaldo.map((r) => (
            <label key={r.key} className="block text-xs">
              <span className="block text-slate-600">Banksaldo op 1-1-{r.eersteJaar}, rekening {r.label}</span>
              <span className="flex items-center gap-1 mt-0.5">
                <span className="text-slate-500">€</span>
                <input
                  type="text" inputMode="decimal" placeholder="bijv. 2.500,00"
                  className="w-36 rounded border border-slate-300 px-2 py-1 text-sm"
                  defaultValue={beginsaldo?.[r.key] ? String(beginsaldo[r.key].bedrag).replace(".", ",") : ""}
                  onChange={(e) => {
                    const v = leesSaldo(e.target.value);
                    setBeginsaldo((oud) => {
                      const nieuw = { ...(oud || {}) };
                      if (v == null) delete nieuw[r.key]; else nieuw[r.key] = { jaar: r.eersteJaar, bedrag: v };
                      return nieuw;
                    });
                  }}
                />
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  ) : null;
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-auto p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        {!meerdereJaren && !kiesJaren ? (
          <JaarSwipe years={years} year={activeYear} onSelectYear={onSelectYear} style={{ display: "block" }}>
          <div className="space-y-3">
            <p className="text-sm font-medium">Indicatieve aangifteberekening voor {activeYear}</p>
            {yearProgress && (
              <div>
                <p className="text-sm flex items-center gap-1.5">
                  <span>{metBolletjes({ groen: "🟢", oranje: "🟠", rood: "🔴" }[yearProgress.status])}</span>
                  <span className="font-medium">
                    {aangifteStatusTekst(yearProgress.status, aangifteOpenPunten.length)}
                  </span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Gegevenscontrole, geen fiscale beoordeling.</p>
              </div>
            )}
            {aangifteOpenPunten.length > 0 && (
              <ul className="text-xs text-slate-500 list-disc pl-4 space-y-0.5">
                {aangifteOpenPunten.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            )}
            {balansKeuze}
            <VoorlopigeAanslagInvoer key={activeYear} jaren={[activeYear]} waarde={voorlopigeAanslag} onChange={setVoorlopigeAanslag} bank={voorlopigBank} />
            <div className="flex gap-2 flex-wrap pt-1">
              <button
                onClick={() => onExport([activeYear], balans)}
                className={KNOP_PRIMAIR}
              >
                Berekening bekijken
              </button>
              <button
                onClick={() => {
                  if (selectedYears.length === 0) setSelectedYears([activeYear]);
                  setMeerdereJaren(true);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Ander jaar/meerdere jaren kiezen
              </button>
              <button onClick={() => onClose()} className="text-xs text-slate-400 hover:text-slate-600">
                Annuleren
              </button>
            </div>
          </div>
          </JaarSwipe>
        ) : (
          <>
            <p className="text-sm font-medium mb-2">Voor welke jaren een indicatieve aangifteberekening?</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {years.map((year) => (
                <label key={year} className={`inline-flex items-center gap-2 min-h-[44px] rounded-lg border px-3 text-sm cursor-pointer ${gekozen.includes(year) ? "border-teal-600 bg-teal-50" : "border-slate-300"}`}>
                  <input
                    type="checkbox" className="h-5 w-5"
                    checked={gekozen.includes(year)}
                    onChange={(e) => setSelectedYears((prev) => (e.target.checked ? [...prev, year].sort() : prev.filter((y) => y !== year)))}
                  />
                  {year}
                </label>
              ))}
            </div>
            <div className="mb-3">{balansKeuze}</div>
            {gekozen.length > 0 && <div className="mb-3"><VoorlopigeAanslagInvoer key={gekozen.join(",")} jaren={gekozen} waarde={voorlopigeAanslag} onChange={setVoorlopigeAanslag} bank={voorlopigBank} /></div>}
            <div className="flex gap-2">
              <button disabled={gekozen.length === 0} onClick={() => onExport(undefined, balans)} className={`${KNOP_PRIMAIR} disabled:opacity-40`}>
                Berekening tonen
              </button>
              <button onClick={() => (kiesJaren ? onClose() : setMeerdereJaren(false))} className={KNOP_SECUNDAIR}>
                {kiesJaren ? "Annuleren" : "Terug"}
              </button>
            </div>
            {gekozen.length === 0 && <p className="mt-2 text-xs text-slate-500">Kies minstens één jaar.</p>}
          </>
        )}
      </div>
    </div>
  );
}
