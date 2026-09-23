import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  estimateIncomeTax, estimateIncomeTaxScenarios, estimateHeffingskortingen, computeMogelijkeKia,
} from "../../tax/incomeTax.js";
import { computeInvesteringenForYear } from "../../tax/activa.js";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";

// Persoonlijke fiscale aannames die de tool NIET uit bankgegevens kan afleiden: of aan het
// urencriterium voor de zelfstandigenaftrek is voldaan, en een indicatie van heffingskortingen en
// KIA die daarvan (en van eigen bedrijfsmiddel-investeringen) afhangen. Dit is bewust een apart,
// expliciet paneel — de tool mag hier niets stilzwijgend aannemen (zie ook het aangiftevoorstel).
export default function PersoonlijkeAannamesPanel({
  activeYear, winst, zelfstandigenaftrekStatus, onSetZelfstandigenaftrekStatus,
  startersaftrekStatus, onSetStartersaftrekStatus,
  activaSummary, activaDetails, onOpenHelp,
  gedeeldeHuur, huurZakelijkPercentageStatus, onSetHuurZakelijkPercentageStatus, categoryBtwRates,
}) {
  const [open, setOpen] = useState(false);
  // "Huur (deels zakelijk)" mag ook zichtbaar zijn in een jaar met winst €0 of negatief (bijv. een
  // verlieslatend jaar) — het paneel zelf blijft verder verborgen (net als voorheen) zolang er geen
  // enkele aanleiding is om het te tonen: gedeeldeHuur is null voor elk dossier dat deze nieuwe
  // categorie niet gebruikt, dus dit verandert niets aan bestaande dossiers.
  if (!activeYear || ((!winst || winst <= 0) && !gedeeldeHuur)) return null;

  const status = zelfstandigenaftrekStatus?.[activeYear] || "onbekend_default";
  const zelfstandigenaftrekToegepast = status !== "nee";
  const startersaftrekAan = startersaftrekStatus?.[activeYear] === "ja";

  const heffingskortingen = estimateHeffingskortingen(winst, activeYear, zelfstandigenaftrekToegepast);
  const scenarios = status === "onbekend" ? estimateIncomeTaxScenarios(winst, activeYear) : null;

  const { totaalInvestering, onvolledig: activaOnvolledig } = computeInvesteringenForYear(activaSummary || [], activaDetails || {}, activeYear);
  const mogelijkeKia = totaalInvestering > 0 ? computeMogelijkeKia(totaalInvestering, activeYear) : 0;
  const heeftWinst = winst > 0;

  const huurPercentageRaw = huurZakelijkPercentageStatus?.[activeYear];
  const huurBtwTarief = categoryBtwRates?.["Huur (deels zakelijk)"] || 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-5 text-sm font-semibold text-left">
        <span>Persoonlijke aannames voor IB — zelfstandigenaftrek, heffingskortingen &amp; KIA</span>
        {onOpenHelp && <HelpHint chapter="persoonlijke-aannames" onOpen={onOpenHelp} />}
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4">
          {heeftWinst && (
          <>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Voldaan aan het urencriterium voor de zelfstandigenaftrek in {activeYear}?
            </label>
            <select
              value={status === "onbekend_default" ? "" : status}
              onChange={(e) => onSetZelfstandigenaftrekStatus(activeYear, e.target.value || null)}
              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
            >
              <option value="">Niet aangegeven (rekent voorlopig met "Ja")</option>
              <option value="ja">Ja</option>
              <option value="nee">Nee</option>
              <option value="onbekend">Onbekend — toon beide scenario's</option>
            </select>
            <p className="mt-1.5 text-xs text-slate-400">
              Het urencriterium (doorgaans: minimaal 1.225 uur per jaar aan de onderneming besteed) is een
              persoonlijke voorwaarde die deze tool niet uit bankgegevens kan afleiden. Zolang je hier niets
              aangeeft, rekent de tool zoals voorheen mét zelfstandigenaftrek — geef het hier aan zodra je dit weet.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Startersaftrek toepassen in {activeYear}?
            </label>
            <select
              value={startersaftrekAan ? "ja" : ""}
              onChange={(e) => onSetStartersaftrekStatus(activeYear, e.target.value || null)}
              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
            >
              <option value="">Nee / niet van toepassing</option>
              <option value="ja">Ja</option>
            </select>
            <p className="mt-1.5 text-xs text-slate-400">
              Alleen mogelijk als je ook zelfstandigenaftrek krijgt, in minstens 1 van de 5 voorgaande jaren nog
              geen ondernemer was, en dit in die periode niet vaker dan 2x eerder hebt toegepast (max. 3x in de
              eerste 5 jaar). Vast bedrag van € 2.123 (2023 t/m 2026 ongewijzigd) — controleer dit zelf.
            </p>
          </div>

          <div className="rounded-md bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs">
            {scenarios ? (
              <>
                <p className="font-semibold text-slate-700">Twee scenario's ({activeYear}):</p>
                <p>Mét zelfstandigenaftrek: IB <strong>{eur(scenarios.metZelfstandigenaftrek.belasting)}</strong></p>
                <p>Zonder zelfstandigenaftrek: IB <strong>{eur(scenarios.zonderZelfstandigenaftrek.belasting)}</strong></p>
              </>
            ) : (
              <p>
                Indicatieve IB {activeYear} ({status === "nee" ? "zonder" : "mét"} zelfstandigenaftrek):{" "}
                <strong>{eur(estimateIncomeTax(winst, activeYear, zelfstandigenaftrekToegepast).belasting)}</strong>
              </p>
            )}
            <p className="pt-1.5 border-t border-slate-200">
              Geschatte heffingskortingen: algemene heffingskorting <strong>{eur(heffingskortingen.algemeneHeffingskorting)}</strong> +
              {" "}arbeidskorting <strong>{eur(heffingskortingen.arbeidskorting)}</strong> = <strong>{eur(heffingskortingen.totaal)}</strong>
              {" "}— ervan uitgaande dat de winst je enige inkomen is, je nog geen AOW-leeftijd hebt bereikt en er geen
              fiscale partner is om mee te verrekenen. Klopt een van die aannames niet, dan is dit minder betrouwbaar.
            </p>
            <p>
              Mogelijke investeringsaftrek (KIA) {activeYear}: {totaalInvestering > 0 ? (
                <strong>{eur(mogelijkeKia)}</strong>
              ) : (
                <span className="text-slate-400">€0,00 (geen investeringen in bedrijfsmiddelen gevonden dit jaar in het Activa-paneel)</span>
              )}
              {activaOnvolledig > 0 && (
                <span className="block mt-1 text-amber-700">
                  ⚠ {activaOnvolledig} bedrijfsmiddel(en) nog niet (volledig) ingevuld in het Activa-paneel — de KIA hierboven is daardoor mogelijk te laag.
                </span>
              )}
              {totaalInvestering > 0 && (
                <span className="block mt-1 text-slate-400">
                  Niet elk bedrijfsmiddel telt mee voor KIA (bijv. personenauto's en grond meestal niet) — controleer dit zelf per aanschaf. Dit is een mogelijke, geen definitieve aftrek.
                </span>
              )}
            </p>
            <p className="pt-1.5 border-t border-slate-200 text-slate-400">
              Dit is een snelle indicatie voor {activeYear} alleen — startersaftrek en verrekening van
              niet-gerealiseerde zelfstandigenaftrek uit andere jaren tellen hier nog niet mee. Genereer het
              Indicatieve aangifteberekening-rapport (met alle jaren erin) voor die volledige berekening.
            </p>
          </div>
          </>
          )}

          {gedeeldeHuur && (
            <div className={heeftWinst ? "pt-2 border-t border-slate-200" : ""}>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-1">
                Percentage zakelijk gebruik "Huur (deels zakelijk)" in {activeYear}
                {onOpenHelp && <HelpHint chapter="huur-deels-zakelijk" onOpen={onOpenHelp} />}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={huurPercentageRaw ?? ""}
                  placeholder="100"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") { onSetHuurZakelijkPercentageStatus(activeYear, null); return; }
                    const n = Math.max(0, Math.min(100, Number(v)));
                    onSetHuurZakelijkPercentageStatus(activeYear, n);
                  }}
                  className="w-24 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Er zijn dit jaar transacties in de categorie "Huur (deels zakelijk)" — alleen dit percentage
                daarvan telt mee als aftrekbare zakelijke kosten (en, als er BTW op zit, als voorbelasting); de
                rest is privé en telt niet mee in de winst. Leeg/niet ingevuld = 100% (volledig aftrekbaar,
                hetzelfde als gewone "Huur").
              </p>

              <div className="mt-3 rounded-md bg-slate-50 border border-slate-200 p-3 space-y-1 text-xs">
                <p><span className="text-slate-500">Totale huur (bruto, incl. BTW):</span> <strong>{eur(gedeeldeHuur.totaalHuurBruto)}</strong></p>
                <p><span className="text-slate-500">Totale huur (netto, excl. BTW):</span> <strong>{eur(gedeeldeHuur.totaalHuurNetto)}</strong></p>
                <p><span className="text-slate-500">Percentage zakelijk:</span> <strong>{gedeeldeHuur.percentage}%</strong></p>
                <p className="pt-1 border-t border-slate-200"><span className="text-slate-500">Aftrekbaar bedrag:</span> <strong>{eur(gedeeldeHuur.aftrekbaarBedrag)}</strong></p>
                <p><span className="text-slate-500">Niet-aftrekbaar (privé)deel:</span> <strong>{eur(gedeeldeHuur.nietAftrekbaarBedrag)}</strong></p>
                {huurBtwTarief > 0 && (
                  <>
                    <p className="pt-1 border-t border-slate-200"><span className="text-slate-500">Aftrekbare voorbelasting:</span> <strong>{eur(gedeeldeHuur.aftrekbareVoorbelasting)}</strong></p>
                    <p><span className="text-slate-500">Niet-aftrekbare voorbelasting (privé):</span> <strong>{eur(gedeeldeHuur.nietAftrekbareVoorbelasting)}</strong></p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
