import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  estimateIncomeTax, estimateIncomeTaxScenarios, estimateHeffingskortingen, computeMogelijkeKia,
  resolveZelfstandigenaftrekStatusForYear,
} from "../../tax/incomeTax.js";
import { computeInvesteringenForYear } from "../../tax/activa.js";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";

// Persoonlijke fiscale aannames die de tool NIET uit bankgegevens kan afleiden: of aan het
// urencriterium voor de zelfstandigenaftrek is voldaan, en een indicatie van heffingskortingen en
// KIA die daarvan (en van eigen bedrijfsmiddel-investeringen) afhangen. Dit is bewust een apart,
// expliciet paneel — de tool mag hier niets stilzwijgend aannemen (zie ook het aangiftevoorstel).
export default function PersoonlijkeAannamesPanel({
  activeYear, winst, zelfstandigenaftrekStatus, onSetZelfstandigenaftrekStatus, zaLegacyJaDefault,
  startersaftrekStatus, onSetStartersaftrekStatus,
  autoStatus, onSetAutoStatus,
  autoWizardStatus, onOpenAutoActivaModal,
  kmVergoedingDetails, onSetKmVergoedingField,
  activaSummary, activaDetails, onOpenHelp,
  gedeeldeHuur, huurZakelijkPercentageStatus, onSetHuurZakelijkPercentageStatus, categoryBtwRates,
}) {
  const [open, setOpen] = useState(false);
  // Vanaf v173 blijft dit paneel altijd zichtbaar zodra er een actief jaar is — de auto-status-vraag
  // hieronder is relevant voor vrijwel elk dossier (bijna iedere zzp'er/BV heeft een auto), ongeacht
  // of er dit jaar winst is.
  //
  // v186: het zelfstandigenaftrek/startersaftrek/heffingskortingen/KIA-blok hieronder werd tot nu toe
  // nóg verborgen bij winst € 0 of negatief ("heeftWinst"-gate, een restant van vóór v173, toen het
  // hele paneel op die voorwaarde verborgen bleef). Dat verborg ook de vraag zelf ("voldaan aan het
  // urencriterium?") in een verliesjaar — terwijl juist in een verliesjaar belangrijk is om dit vast
  // te leggen: computeOndernemersaftrekMetReserve (tax/incomeTax.js) gebruikt de status van dit jaar
  // om te bepalen hoeveel niet-gerealiseerde zelfstandigenaftrek als reserve meegaat naar een later
  // jaar. Zonder deze invoer kon die keuze voor een verliesjaar niet gemaakt of gecontroleerd worden.
  // De bedragen zelf (IB, heffingskortingen) zijn bij winst ≤ € 0 gewoon € 0,00 — dat blijft kloppen,
  // dus alleen de zichtbaarheid van het blok is aangepast, niet de onderliggende berekeningen.
  if (!activeYear) return null;

  // v194 — punt 13 uit het reviewdocument: een onbeantwoord jaar liet dit paneel altijd stilzwijgend
  // op "Ja" rekenen (via het "onbekend_default"-sentinel hieronder) — dat gaf een gebruiker het idee
  // dat de tool het al ongeveer goed had, terwijl het urencriterium juist niet uit bankgegevens is af
  // te leiden. Voor een nieuw dossier (zaLegacyJaDefault=false) resolvet een onbeantwoord jaar nu naar
  // "onbekend" (beide scenario's) in plaats van stilzwijgend "ja" — zie resolveZelfstandigenaftrekStatusForYear.
  // Voor een dossier van vóór deze wijziging blijft het oude gedrag ("ja") behouden. rawStatus (i.p.v.
  // het geresolveerde status) bepaalt of de dropdown de placeholder toont — het onderscheid tussen
  // "nog niet gekozen" en "expliciet gekozen" blijft zo zichtbaar, ook al is het gedrag al bepaald.
  const rawStatus = zelfstandigenaftrekStatus?.[activeYear];
  const status = resolveZelfstandigenaftrekStatusForYear(zelfstandigenaftrekStatus, activeYear, zaLegacyJaDefault);
  const zelfstandigenaftrekToegepast = status !== "nee";
  const startersaftrekAan = startersaftrekStatus?.[activeYear] === "ja";

  const heffingskortingen = estimateHeffingskortingen(winst, activeYear, zelfstandigenaftrekToegepast);
  const scenarios = status === "onbekend" ? estimateIncomeTaxScenarios(winst, activeYear) : null;

  const { totaalInvestering, onvolledig: activaOnvolledig } = computeInvesteringenForYear(activaSummary || [], activaDetails || {}, activeYear);
  const mogelijkeKia = totaalInvestering > 0 ? computeMogelijkeKia(totaalInvestering, activeYear) : 0;

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
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Voldaan aan het urencriterium voor de zelfstandigenaftrek in {activeYear}?
            </label>
            <select
              value={rawStatus == null ? "" : rawStatus}
              onChange={(e) => onSetZelfstandigenaftrekStatus(activeYear, e.target.value || null)}
              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
            >
              <option value="">
                {zaLegacyJaDefault ? "Niet aangegeven (rekent voorlopig met \"Ja\")" : "Niet aangegeven (toont voorlopig beide scenario's)"}
              </option>
              <option value="ja">Ja</option>
              <option value="nee">Nee</option>
              <option value="onbekend">Onbekend — toon beide scenario's</option>
            </select>
            <p className="mt-1.5 text-xs text-slate-400">
              Het urencriterium (doorgaans: minimaal 1.225 uur per jaar aan de onderneming besteed) is een
              persoonlijke voorwaarde die deze tool niet uit bankgegevens kan afleiden.{" "}
              {zaLegacyJaDefault
                ? "Zolang je hier niets aangeeft, rekent de tool zoals voorheen mét zelfstandigenaftrek — geef het hier aan zodra je dit weet."
                : "Zolang je hier niets aangeeft, toont de tool voor de zekerheid beide scenario's (mét/zonder) naast elkaar — kies \"Ja\" of \"Nee\" zodra je dit weet."}
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

          <div className="pt-2 border-t border-slate-200">
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Auto-status in {activeYear}
            </label>
            <select
              value={autoStatus?.[activeYear] || ""}
              onChange={(e) => onSetAutoStatus(activeYear, e.target.value || null)}
              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
            >
              <option value="">Onbekend/niet aangegeven — huidige percentage-splitsing op Brandstof/Parkeren blijft bruikbaar</option>
              <option value="zaak">Auto op de zaak (koop, operational lease of financial lease)</option>
              <option value="prive">Privéauto zakelijk gebruikt (kilometervergoeding)</option>
              <option value="beide">Beide — zowel een auto op de zaak als een privéauto zakelijk gebruikt</option>
            </select>
            <p className="mt-1.5 text-xs text-slate-400">
              Bepaalt welk fiscaal model voor autokosten geldt: bij "auto op de zaak" (of "beide") tellen
              werkelijke autokosten (brandstof, parkeren, verzekering, MRB) mee met een
              bijtellingscorrectie voor privégebruik, en vervalt de generieke %-splitsing op
              Brandstof/Parkeren voor dit jaar; bij "privéauto zakelijk gebruikt" (of "beide") geldt in
              plaats daarvan een kilometervergoeding voor het zakelijke gebruik.
            </p>
            {(autoStatus?.[activeYear] === "zaak" || autoStatus?.[activeYear] === "beide") &&
              (autoWizardStatus?.soort === "koop" || autoWizardStatus?.soort === "operational") && (
                <button
                  onClick={onOpenAutoActivaModal}
                  className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Bijtelling{autoWizardStatus.soort === "koop" ? "/afschrijving" : ""} auto op de zaak instellen →
                </button>
              )}
            {(autoStatus?.[activeYear] === "zaak" || autoStatus?.[activeYear] === "beide") &&
              autoWizardStatus?.soort === "financial" && (
                <p className="mt-2 text-xs text-slate-400">
                  Bij financial lease vul je de bijtelling/afschrijving in bij de leasegegevens zelf (zie
                  het leningen/lease-overzicht), niet hier.
                </p>
              )}
            {(autoStatus?.[activeYear] === "prive" || autoStatus?.[activeYear] === "beide") && (
              <div className="mt-3 rounded-md bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-600 mb-2">
                  Kilometervergoeding privéauto zakelijk gebruik in {activeYear}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-sm">
                    <span className="block text-xs font-medium text-slate-600 mb-1">Zakelijke kilometers</span>
                    <input
                      type="number" min={0} step={1}
                      value={kmVergoedingDetails?.[activeYear]?.zakelijkeKilometers ?? ""}
                      onChange={(e) => onSetKmVergoedingField(activeYear, "zakelijkeKilometers", e.target.value)}
                      className="w-32 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="block text-xs font-medium text-slate-600 mb-1">Vergoeding per km (€)</span>
                    <input
                      type="number" min={0} step={0.01}
                      value={kmVergoedingDetails?.[activeYear]?.vergoedingPerKm ?? ""}
                      placeholder="bijv. 0,23"
                      onChange={(e) => onSetKmVergoedingField(activeYear, "vergoedingPerKm", e.target.value)}
                      className="w-32 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                    />
                  </label>
                  {kmVergoedingDetails?.[activeYear]?.zakelijkeKilometers > 0 && kmVergoedingDetails?.[activeYear]?.vergoedingPerKm > 0 && (
                    <div className="text-xs text-slate-500">
                      Aftrekbaar: <strong className="text-slate-800">
                        {eur(kmVergoedingDetails[activeYear].zakelijkeKilometers * kmVergoedingDetails[activeYear].vergoedingPerKm)}
                      </strong>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Controleer zelf het voor {activeYear} geldende fiscale maximum onbelast per kilometer — dit
                  veld vult niets automatisch in. Deze vergoeding komt niet uit banktransacties; ze is volledig
                  aftrekbaar naast (niet in plaats van) een eventuele daadwerkelijke overboeking naar privé.
                </p>
              </div>
            )}
          </div>

          {gedeeldeHuur && (
            <div className="pt-2 border-t border-slate-200">
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
