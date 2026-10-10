import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  estimateIncomeTax, estimateIncomeTaxScenarios, estimateHeffingskortingen, computeMogelijkeKia,
  resolveZelfstandigenaftrekStatusForYear,
} from "../../tax/incomeTax.js";
import { computeInvesteringenForYear } from "../../tax/activa.js";
import { computeLeaseInvesteringenForYear } from "../../tax/autoBijtelling.js";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";
import { toetsStartersaftrek } from "../../tax/startersaftrekToets.js";

// v291 — gedeeld blok voor Huur/Energie-water/Gemeentelijke kosten "(deels zakelijk)": drie losse
// categorieën met elk hun eigen percentage-per-jaar-instelling (zie tax/gedeeldeHuur.js), maar
// identieke UI — hier als één herbruikbare sub-component in plaats van drie keer dezelfde JSX.
function GedeeldeHuisvestingBlock({ label, helpChapter, gedeelde, percentageRaw, onSetPercentage, btwTarief, activeYear }) {
  if (!gedeelde) return null;
  return (
    <div className="pt-2 border-t border-slate-200">
      <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-1">
        Percentage zakelijk gebruik "{label}" in {activeYear}
        {helpChapter}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={percentageRaw ?? ""}
          placeholder="100"
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") { onSetPercentage(activeYear, null); return; }
            const n = Math.max(0, Math.min(100, Number(v)));
            onSetPercentage(activeYear, n);
          }}
          className="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
        />
        <span className="text-sm text-slate-500">%</span>
      </div>
      <p className="mt-1.5 text-xs text-slate-400">
        Er zijn dit jaar transacties in de categorie "{label}" — alleen dit percentage daarvan telt
        mee als aftrekbare zakelijke kosten (en, als er BTW op zit, als voorbelasting); de rest is
        privé en telt niet mee in de winst. Leeg/niet ingevuld = 100% (volledig aftrekbaar, hetzelfde
        als de gewone categorie).
      </p>

      <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1 text-xs">
        <p><span className="text-slate-500">Totaal (bruto, incl. BTW):</span> <strong>{eur(gedeelde.totaalHuurBruto)}</strong></p>
        <p><span className="text-slate-500">Totaal (netto, excl. BTW):</span> <strong>{eur(gedeelde.totaalHuurNetto)}</strong></p>
        <p><span className="text-slate-500">Percentage zakelijk:</span> <strong>{gedeelde.percentage}%</strong></p>
        <p className="pt-1 border-t border-slate-200"><span className="text-slate-500">Aftrekbaar bedrag:</span> <strong>{eur(gedeelde.aftrekbaarBedrag)}</strong></p>
        <p><span className="text-slate-500">Niet-aftrekbaar (privé)deel:</span> <strong>{eur(gedeelde.nietAftrekbaarBedrag)}</strong></p>
        {btwTarief > 0 && (
          <>
            <p className="pt-1 border-t border-slate-200"><span className="text-slate-500">Aftrekbare voorbelasting:</span> <strong>{eur(gedeelde.aftrekbareVoorbelasting)}</strong></p>
            <p><span className="text-slate-500">Niet-aftrekbare voorbelasting (privé):</span> <strong>{eur(gedeelde.nietAftrekbareVoorbelasting)}</strong></p>
          </>
        )}
      </div>
    </div>
  );
}

// Persoonlijke fiscale aannames die de app NIET uit bankgegevens kan afleiden: of aan het
// urencriterium voor de zelfstandigenaftrek is voldaan, en een indicatie van heffingskortingen en
// KIA die daarvan (en van eigen bedrijfsmiddel-investeringen) afhangen. Dit is bewust een apart,
// expliciet paneel — de app mag hier niets stilzwijgend aannemen (zie ook het aangiftevoorstel).
export default function PersoonlijkeAannamesPanel({
  rechtsvorm, activeYear, winst, zelfstandigenaftrekStatus, onSetZelfstandigenaftrekStatus, zaLegacyJaDefault,
  startersaftrekStatus, onSetStartersaftrekStatus,
  autoStatus, onSetAutoStatus,
  autoWizardStatus, onOpenAutoActivaModal,
  kmVergoedingDetails, onSetKmVergoedingField,
  activaSummary, activaDetails, leaseSummary, leaseDetails, onOpenHelp,
  gedeeldeHuur, huurZakelijkPercentageStatus, onSetHuurZakelijkPercentageStatus,
  // v291 — zelfde constructie, nu ook voor "Energie-water (deels zakelijk)"/"Gemeentelijke kosten
  // (deels zakelijk)" (zie tax/gedeeldeHuur.js).
  gedeeldeEnergie, energieZakelijkPercentageStatus, onSetEnergieZakelijkPercentageStatus,
  gedeeldeGemeentelijkeKosten, gemeentelijkeKostenZakelijkPercentageStatus, onSetGemeentelijkeKostenZakelijkPercentageStatus,
  categoryBtwRates,
}) {
  // v309 (V31) — het blok met o.a. de %-zakelijk-velden voor huur/energie-water/gemeentelijke kosten zat
  // in dit standaard ingeklapte onderdeel: een openstaand veld (en de aanname in de kop) was daardoor niet
  // te vinden. Staat er een nog niet ingevuld percentage open, dan klapt het onderdeel nu vanzelf open.
  const percentageOpen =
    (gedeeldeHuur && huurZakelijkPercentageStatus?.[activeYear] == null) ||
    (gedeeldeEnergie && energieZakelijkPercentageStatus?.[activeYear] == null) ||
    (gedeeldeGemeentelijkeKosten && gemeentelijkeKostenZakelijkPercentageStatus?.[activeYear] == null);
  const [open, setOpen] = useState(!!percentageOpen);
  useEffect(() => { if (percentageOpen) setOpen(true); }, [percentageOpen, activeYear]);
  // Dit paneel blijft altijd zichtbaar zodra er een actief jaar is — de auto-status-vraag hieronder
  // is relevant voor vrijwel elk dossier (bijna iedere zzp'er/BV heeft een auto), ongeacht of er dit
  // jaar winst is.
  //
  // Het zelfstandigenaftrek/startersaftrek/heffingskortingen/KIA-blok hieronder blijft ook zichtbaar
  // bij winst € 0 of negatief: juist in een verliesjaar is belangrijk om vast te leggen of aan het
  // urencriterium is voldaan — computeOndernemersaftrekMetReserve (tax/incomeTax.js) gebruikt de
  // status van dit jaar om te bepalen hoeveel niet-gerealiseerde zelfstandigenaftrek als reserve
  // meegaat naar een later jaar. Zonder deze invoer kan die keuze voor een verliesjaar niet gemaakt of
  // gecontroleerd worden. De bedragen zelf (IB, heffingskortingen) zijn bij winst ≤ € 0 gewoon € 0,00.
  if (!activeYear) return null;

  // Een onbeantwoord jaar mag niet stilzwijgend op "Ja" rekenen (via het "onbekend_default"-sentinel
  // hieronder) — dat geeft de indruk dat de app het al ongeveer goed heeft, terwijl het
  // urencriterium juist niet uit bankgegevens is af te leiden. Voor een nieuw dossier
  // (zaLegacyJaDefault=false) resolvet een onbeantwoord jaar naar "onbekend" (beide scenario's) —
  // zie resolveZelfstandigenaftrekStatusForYear. Voor een ouder dossier (van vóór deze regel bestond)
  // blijft het gedrag "ja" behouden, zodat een eerder opgeslagen dossier niet met terugwerkende kracht
  // van berekening verandert. rawStatus (i.p.v. de geresolveerde status) bepaalt of de dropdown de
  // placeholder toont — het onderscheid tussen "nog niet gekozen" en "expliciet gekozen" blijft zo
  // zichtbaar, ook al is het gedrag al bepaald.
  const isBv = rechtsvorm === "bv";
  const rawStatus = zelfstandigenaftrekStatus?.[activeYear];
  const status = resolveZelfstandigenaftrekStatusForYear(zelfstandigenaftrekStatus, activeYear, zaLegacyJaDefault);
  const zelfstandigenaftrekToegepast = status !== "nee";
  const startersaftrekAan = startersaftrekStatus?.[activeYear] === "ja";

  const heffingskortingen = estimateHeffingskortingen(winst, activeYear, zelfstandigenaftrekToegepast);
  const scenarios = status === "onbekend" ? estimateIncomeTaxScenarios(winst, activeYear) : null;

  // KIA-grondslag: activaregister + financiële-lease-objecten (auto/machine) samen — zie
  // computeLeaseInvesteringenForYear in tax/autoBijtelling.js voor waarom een geleasede personenauto
  // daar bewust NIET in meetelt.
  const activaInvestering = computeInvesteringenForYear(activaSummary || [], activaDetails || {}, activeYear);
  const leaseInvestering = computeLeaseInvesteringenForYear(leaseSummary || [], leaseDetails || {}, activeYear);
  const totaalInvestering = activaInvestering.totaalInvestering + leaseInvestering.totaalInvestering;
  const activaOnvolledig = activaInvestering.onvolledig + leaseInvestering.onvolledig;
  const mogelijkeKia = totaalInvestering > 0 ? computeMogelijkeKia(totaalInvestering, activeYear) : 0;

  const huurPercentageRaw = huurZakelijkPercentageStatus?.[activeYear];
  const huurBtwTarief = categoryBtwRates?.["Huur (deels zakelijk)"] || 0;
  // v291 — zelfde constructie, nu ook voor "Energie-water (deels zakelijk)"/"Gemeentelijke kosten
  // (deels zakelijk)".
  const energiePercentageRaw = energieZakelijkPercentageStatus?.[activeYear];
  const energieBtwTarief = categoryBtwRates?.["Energie-water (deels zakelijk)"] || 0;
  const gemeentelijkeKostenPercentageRaw = gemeentelijkeKostenZakelijkPercentageStatus?.[activeYear];
  const gemeentelijkeKostenBtwTarief = categoryBtwRates?.["Gemeentelijke kosten (deels zakelijk)"] || 0;

  return (
    <section className="rounded-xl border-2 border-slate-200 bg-white shadow-sm">
      {/* <div role="button"> i.p.v. <button>: HelpHint hieronder is zelf ook een button. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
        className="w-full flex items-center gap-2 p-5 text-sm font-semibold text-left cursor-pointer"
      >
        <span>{isBv ? "Aannames — auto-status" : "Persoonlijke aannames voor IB — zelfstandigenaftrek, heffingskortingen & KIA"}</span>
        {onOpenHelp && <HelpHint chapter="persoonlijke-aannames" onOpen={onOpenHelp} />}
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </div>
      {open && (
        <div className="px-5 pb-5 space-y-4">
          {!isBv && (<>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Voldaan aan het urencriterium voor de zelfstandigenaftrek in {activeYear}?
            </label>
            <select
              key={`za-${activeYear}`}
              value={rawStatus == null ? "" : rawStatus}
              onChange={(e) => onSetZelfstandigenaftrekStatus(activeYear, e.target.value || null)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
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
              persoonlijke voorwaarde die deze app niet uit bankgegevens kan afleiden.{" "}
              {zaLegacyJaDefault
                ? "Zolang je hier niets aangeeft, rekent de app zoals voorheen mét zelfstandigenaftrek — geef het hier aan zodra je dit weet."
                : "Zolang je hier niets aangeeft, toont de app voor de zekerheid beide scenario's (mét/zonder) naast elkaar — kies \"Ja\" of \"Nee\" zodra je dit weet."}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Startersaftrek toepassen in {activeYear}?
            </label>
            <select
              key={`starters-${activeYear}`}
              value={startersaftrekAan ? "ja" : ""}
              onChange={(e) => onSetStartersaftrekStatus(activeYear, e.target.value || null)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
            >
              <option value="">Nee / niet van toepassing</option>
              <option value="ja">Ja</option>
            </select>
            <p className="mt-1.5 text-xs text-slate-400">
              Alleen mogelijk als je ook zelfstandigenaftrek krijgt, in minstens 1 van de 5 voorgaande jaren nog
              geen ondernemer was, en dit in die periode niet vaker dan 2x eerder hebt toegepast (max. 3x in de
              eerste 5 jaar). Vast bedrag van € 2.123 (2023 t/m 2026 ongewijzigd) — controleer dit zelf.
            </p>
            {toetsStartersaftrek(startersaftrekStatus, zelfstandigenaftrekStatus).meldingen.map((m, i) => (
              <p key={i} className="mt-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">⚠ {m}</p>
            ))}
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs">
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
                <span className="text-slate-400">€0,00 (geen investeringen in bedrijfsmiddelen gevonden dit jaar in het Activa-paneel of bij financiële lease)</span>
              )}
              {activaOnvolledig > 0 && (
                <span className="block mt-1 text-amber-700">
                  ⚠ {activaOnvolledig} bedrijfsmiddel(en)/leaseobject(en) nog niet (volledig) ingevuld — de KIA hierboven is daardoor mogelijk te laag.
                </span>
              )}
              {totaalInvestering > 0 && (
                <span className="block mt-1 text-slate-400">
                  Een geleasede personenauto telt hier al niet mee (KIA geldt daar fiscaal niet voor); overige uitzonderingen (bijv. grond) kent deze app niet — controleer per bedrijfsmiddel de "KIA-beoordeling". Dit is een mogelijke, geen definitieve aftrek.
                </span>
              )}
            </p>
            <p className="pt-1.5 border-t border-slate-200 text-slate-400">
              Dit is een snelle indicatie voor {activeYear} alleen — startersaftrek en verrekening van
              niet-gerealiseerde zelfstandigenaftrek uit andere jaren tellen hier nog niet mee. Genereer het
              Indicatieve aangifteberekening-rapport (met alle jaren erin) voor die volledige berekening.
            </p>
          </div>
          </>)}

          <div className={isBv ? "" : "pt-2 border-t border-slate-200"}>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Auto-status in {activeYear}
            </label>
            <select
              key={`auto-${activeYear}`}
              value={autoStatus?.[activeYear] || ""}
              onChange={(e) => onSetAutoStatus(activeYear, e.target.value || null)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
            >
              <option value="">Onbekend/niet aangegeven — huidige percentage-splitsing op Brandstof/Parkeren blijft bruikbaar</option>
              <option value="zaak">Auto op de zaak (koop, operationele lease of financiële lease)</option>
              <option value="prive">Privéauto zakelijk gebruikt (kilometervergoeding)</option>
            </select>
                        <p className="mt-1.5 text-xs text-slate-400">
              Bepaalt welk fiscaal model voor autokosten geldt: bij "auto op de zaak" tellen werkelijke
              autokosten (brandstof, parkeren, verzekering, MRB) mee met een bijtellingscorrectie voor
              privégebruik, en vervalt de generieke %-splitsing op Brandstof/Parkeren voor dit jaar; bij
              "privéauto zakelijk gebruikt" geldt in plaats daarvan alleen een kilometervergoeding voor het
              zakelijke gebruik: de werkelijke autokosten (brandstof, parkeren, verzekering, MRB, onderhoud)
              tellen dan niet mee, die zitten in de vergoeding per kilometer.
            </p>
            {(autoStatus?.[activeYear] === "zaak") &&
              (autoWizardStatus?.soort === "koop" || autoWizardStatus?.soort === "operational") && (
                <button
                  onClick={onOpenAutoActivaModal}
                  className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Bijtelling{autoWizardStatus.soort === "koop" ? "/afschrijving" : ""}/btw auto op de zaak instellen →
                </button>
              )}
            {(autoStatus?.[activeYear] === "zaak") &&
              autoWizardStatus?.soort === "financial" && (
                <p className="mt-2 text-xs text-slate-400">
                  Bij financiële lease vul je de bijtelling/afschrijving in bij de leasegegevens zelf (zie
                  het leningen/lease-overzicht), niet hier. De btw-correctie privégebruik rekent de app dan automatisch (forfait) zodra er een bedrag bij "Te betalen BTW" staat.
                </p>
              )}
            {(autoStatus?.[activeYear] === "prive") && (
              <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-600 mb-2">
                  Kilometervergoeding privéauto zakelijk gebruik in {activeYear}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-sm">
                    <span className="block text-xs font-medium text-slate-600 mb-1">Zakelijke kilometers</span>
                    <input
                      type="text" inputMode="decimal"
                      value={kmVergoedingDetails?.[activeYear]?.zakelijkeKilometers ?? ""}
                      onChange={(e) => { const v = e.target.value.replace(",", "."); if (/^\d*\.?\d*$/.test(v)) onSetKmVergoedingField(activeYear, "zakelijkeKilometers", v); }}
                      className="w-32 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="block text-xs font-medium text-slate-600 mb-1">Vergoeding per km (€)</span>
                    <input
                      type="text" inputMode="decimal"
                      value={kmVergoedingDetails?.[activeYear]?.vergoedingPerKm ?? ""}
                      placeholder="bijv. 0,23"
                      onChange={(e) => { const v = e.target.value.replace(",", "."); if (/^\d*\.?\d*$/.test(v)) onSetKmVergoedingField(activeYear, "vergoedingPerKm", v); }}
                      className="w-32 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
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

          <GedeeldeHuisvestingBlock
            label="Huur (deels zakelijk)"
            helpChapter={onOpenHelp && <HelpHint chapter="huur-deels-zakelijk" onOpen={onOpenHelp} />}
            gedeelde={gedeeldeHuur}
            percentageRaw={huurPercentageRaw}
            onSetPercentage={onSetHuurZakelijkPercentageStatus}
            btwTarief={huurBtwTarief}
            activeYear={activeYear}
          />
          <GedeeldeHuisvestingBlock
            label="Energie-water (deels zakelijk)"
            helpChapter={onOpenHelp && <HelpHint chapter="huur-deels-zakelijk" onOpen={onOpenHelp} />}
            gedeelde={gedeeldeEnergie}
            percentageRaw={energiePercentageRaw}
            onSetPercentage={onSetEnergieZakelijkPercentageStatus}
            btwTarief={energieBtwTarief}
            activeYear={activeYear}
          />
          <GedeeldeHuisvestingBlock
            label="Gemeentelijke kosten (deels zakelijk)"
            helpChapter={onOpenHelp && <HelpHint chapter="huur-deels-zakelijk" onOpen={onOpenHelp} />}
            gedeelde={gedeeldeGemeentelijkeKosten}
            percentageRaw={gemeentelijkeKostenPercentageRaw}
            onSetPercentage={onSetGemeentelijkeKostenZakelijkPercentageStatus}
            btwTarief={gemeentelijkeKostenBtwTarief}
            activeYear={activeYear}
          />
        </div>
      )}
    </section>
  );
}
