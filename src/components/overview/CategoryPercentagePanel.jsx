import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { defaultZakelijkPercentage } from "../../tax/categorySplit.js";
import { eur } from "../../utils/amounts.js";
import HelpHint from "../shared/HelpHint.jsx";
import { useOpenOnJump } from "../shared/useOpenOnJump.js";
import { WERKRUIMTE_CATEGORIEEN, WERKRUIMTE_LABELS, WERKRUIMTE_NIET_AFTREKBAAR } from "../../tax/werkruimte.js";

// Eén categorie-rij met een eigen "concept"-waarde (draft) — de wijziging wordt bewust pas
// doorgegeven bij het verlaten van het veld (blur) of op Enter, niet bij elke toetsaanslag. Zou dat
// wel per toetsaanslag gebeuren, dan gaat bijv. het intypen van "70" al bij de eerste "7" een
// wijziging (en bij meerdere jaren dus ook de "voor welke jaren?"-vraag, zie App.jsx) in gang
// zetten — met een halve, nog niet afgemaakte waarde, en het veld verdwijnt dan meteen achter die
// vraag voordat de rest is ingetypt.
function CategoryPercentageRow({ categorie, totaal, raw, standaard, onCommit, uitgeschakeld = false, betaling = null }) {
  const [draft, setDraft] = useState(raw ?? "");
  // Als de opgeslagen waarde van buitenaf verandert (bijv. na het beantwoorden van de "voor welke
  // jaren?"-vraag, of bij het wisselen van jaar), moet het veld dat overnemen.
  useEffect(() => setDraft(raw ?? ""), [raw]);
  // release19V9: sluit je de "voor welke jaren?"-vraag met X, dan is er niets toegepast — het getypte
  // percentage hoort dan terug te springen naar de opgeslagen waarde (App.jsx stuurt dit signaal).
  useEffect(() => {
    const onReset = (e) => { if (e.detail?.category === categorie) setDraft(raw ?? ""); };
    window.addEventListener("percentage-concept-terugzetten", onReset);
    return () => window.removeEventListener("percentage-concept-terugzetten", onReset);
  }, [categorie, raw]);

  const commit = () => {
    if (draft === "" || draft == null) {
      if (raw != null) onCommit(null);
      return;
    }
    const n = Math.max(0, Math.min(100, Number(draft)));
    if (n !== raw) onCommit(n);
    else setDraft(n); // normaliseer de weergave (bijv. "070" -> "70") zonder een wijziging te melden
  };

  return (
    <div className="flex items-center gap-3 text-sm rounded-lg border border-slate-100 p-2.5">
      <span className="flex-1 min-w-[10rem] font-medium">
        <span className="block truncate">{categorie}</span>
        {betaling && (
          <span className="block text-xs font-normal text-slate-500">
            Zakelijke rekening: {betaling.aantalZakelijk > 0 ? `${eur(betaling.zakelijk)} (${betaling.aantalZakelijk}×)` : "—"} · Privérekening: {betaling.aantalPrive > 0 ? `${eur(betaling.prive)} (${betaling.aantalPrive}×)` : "—"}
            {betaling.beide && <span className="ml-1 font-medium text-amber-700">⚠ beide rekeningen{betaling.gelijk ? ", gelijke bedragen" : ", verschillende bedragen"}</span>}
          </span>
        )}
        {categorie === "Privé - overige kosten" && (
          <span className="block text-xs font-normal text-slate-500">Uitgaven vanaf je privérekening die op zakelijke kosten lijken — mogelijk (deels) zakelijk, controleer ze.</span>
        )}
      </span>
      <span className="text-xs text-slate-400 font-mono">totaal {eur(totaal)}</span>
      <input
        type="number"
        min={0}
        max={100}
        step={1}
        value={uitgeschakeld ? 0 : draft}
        disabled={uitgeschakeld}
        title={uitgeschakeld ? "Niet aftrekbaar: werkruimte in de eigen woning is niet zelfstandig" : undefined}
        placeholder={String(standaard)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
      />
      <span className="text-xs text-slate-400">% zakelijk</span>
    </div>
  );
}

// release20V6 — één rekening (zakelijk of privé) van een huisvestingscategorie: eigen bedrag, eigen percentage.
function RekeningVeld({ label, bedrag, aantal, raw, soort, standaard, onCommit }) {
  const uit = WERKRUIMTE_NIET_AFTREKBAAR.includes(soort);
  const [draft, setDraft] = useState(raw ?? "");
  useEffect(() => setDraft(raw ?? ""), [raw]);
  const commit = () => {
    if (draft === "" || draft == null) { if (raw != null) onCommit(null); return; }
    const n = Math.max(0, Math.min(100, Number(draft)));
    if (n !== raw) onCommit(n); else setDraft(n);
  };
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="flex-1 min-w-[10rem] text-xs text-slate-600">{label}: <span className="font-mono">{eur(bedrag)}</span> ({aantal}×)</span>
      <input
        type="number" min={0} max={100} step={1}
        value={uit ? 0 : draft}
        disabled={uit}
        title={uit ? "Niet aftrekbaar bij de gekozen soort" : undefined}
        placeholder={String(standaard)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        className="w-20 rounded-veld border border-slate-300 px-2 py-1 text-sm"
      />
      <span className="text-xs text-slate-400">% zakelijk</span>
    </div>
  );
}

function WerkruimteCategorieRij({ categorie, betaling, rawPlain, rawZakelijk, rawPrive, werkruimte, standaard, onCommit }) {
  return (
    <div className="rounded-veld border border-slate-100 p-2.5 text-sm space-y-2">
      <div className="font-medium">
        {categorie}
        {betaling.beide && <span className="ml-2 text-xs font-medium text-amber-700">⚠ beide rekeningen{betaling.gelijk ? ", gelijke bedragen" : ", verschillende bedragen"}</span>}
      </div>
      {betaling.aantalZakelijk > 0 && (
        <RekeningVeld label="Zakelijke rekening" bedrag={betaling.zakelijk} aantal={betaling.aantalZakelijk} raw={rawZakelijk ?? rawPlain} soort={werkruimte?.zakelijk} standaard={standaard} onCommit={(p) => onCommit("zakelijk", p)} />
      )}
      {betaling.aantalPrive > 0 && (
        <RekeningVeld label="Privérekening" bedrag={betaling.prive} aantal={betaling.aantalPrive} raw={rawPrive ?? rawPlain} soort={werkruimte?.prive} standaard={standaard} onCommit={(p) => onCommit("prive", p)} />
      )}
    </div>
  );
}

// Generieke %-splitsing zakelijk/privé per bestaande categorie (zie tax/categorySplit.js) — in
// tegenstelling tot "Huur (deels zakelijk)" (zie PersoonlijkeAannamesPanel.jsx) hoeft hiervoor geen
// aparte categorie te bestaan: transacties blijven gewoon in hun eigen categorie staan (en tx.type
// blijft gewoon de rekening weergeven), alleen het bedrag dat in de winst-/BTW-berekening meetelt
// wordt naar rato verdeeld. Toont alleen categorieën die dit jaar daadwerkelijk transacties hebben
// (`categorieTotalen`, zie computeSplitsbareCategorieTotalenVoorJaar), zodat de lijst niet nodeloos
// lang wordt met categorieën die toch niet relevant zijn. Alfabetisch gesorteerd, niet op bedrag —
// zo staat een categorie altijd op dezelfde plek, ook als de bedragen per jaar wisselen.
export default function CategoryPercentagePanel({
  defaultOpen = false, activeYear, categorieTotalen, categoryZakelijkPercentage, huisvestingStandaardNul = [], onSetCategoryZakelijkPercentage, autoOpDeZaakDitJaar, onOpenHelp, gedeeldeRijen, werkruimte = { zakelijk: null, prive: null }, onSetWerkruimte, werkruimteBetaling = {}, onSetRekeningPercentage,
  andereJarenWerkruimte = [], onSetWerkruimteJaren,
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  // release33V4 — na een keuze: "geldt dit ook voor de andere jaren?" { rek, waarde, jaar }
  const [jarenVraag, setJarenVraag] = useState(null);
  const sectionRef = useOpenOnJump(setOpen);
  const categorieen = Object.keys(categorieTotalen || {}).sort((a, b) => a.localeCompare(b));
  // Blijft ook zichtbaar zonder splitsbare categorieën als er dit jaar "auto op de zaak" is
  // aangegeven — anders verdwijnt het paneel stilletjes zodra Brandstof/Parkeren (vaak de enige
  // splitsbare categorieën in zo'n jaar) daardoor zijn uitgesloten, zonder dat duidelijk is waarom.
  const gedeeldeZichtbaar = (gedeeldeRijen || []).filter((r) => r.gedeelde);
  if (!activeYear || (categorieen.length === 0 && !autoOpDeZaakDitJaar && gedeeldeZichtbaar.length === 0)) return null;

  const heeftHuisvesting = categorieen.some((c) => WERKRUIMTE_CATEGORIEEN.includes(c)) || gedeeldeZichtbaar.length > 0;
  const rekeningTotaal = (rek) => Object.values(werkruimteBetaling).reduce((a, r) => ({ som: a.som + (rek === "zakelijk" ? r.zakelijk : r.prive), n: a.n + (rek === "zakelijk" ? r.aantalZakelijk : r.aantalPrive) }), { som: 0, n: 0 });
  const rekeningen = ["zakelijk", "prive"].filter((rek) => rekeningTotaal(rek).n > 0);
  const toonWerkruimte = rekeningen.length > 0 && !!onSetWerkruimte;
  const aangepast = gedeeldeZichtbaar.filter((r) => r.raw != null).length + categorieen.filter((c) => categoryZakelijkPercentage?.[c]?.[activeYear] != null).length;

  return (
    <section ref={sectionRef} className="rounded-paneel border border-slate-200 bg-white shadow-sm">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-5 text-sm font-semibold text-left">
        <span>Percentage zakelijk per categorie</span>
        {aangepast > 0 && <span className="text-xs font-normal text-slate-400">({aangepast} aangepast)</span>}
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-xs text-slate-500 mb-3">
            Sommige kosten zijn deels zakelijk en deels privé, ongeacht van welke rekening ze betaald zijn
            (bijv. brandstof, telefonie/internet, reiskosten OV, parkeren of huur die deels privé gebruikt
            wordt). Vul hieronder een percentage zakelijk gebruik in per categorie voor {activeYear} — de transacties zelf blijven gewoon in hun
            eigen categorie staan, alleen het bedrag dat in de winst en (voor zover van toepassing) de BTW
            meetelt wordt naar rato verdeeld. Leeg laten = standaard (100% voor een normaal-zakelijke
            kostenpost, 0% voor een normaal-privé categorie) — ongewijzigd gedrag. De wijziging wordt
            doorgevoerd zodra je het veld verlaat of op Enter drukt.
            {onOpenHelp && <HelpHint chapter="categorie-percentage-zakelijk" onOpen={onOpenHelp} />}
          </p>
          <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg p-2 mb-3">
            Heb je een pand (loods/schuur) dat deels zakelijk en deels privé wordt gebruikt? Zet dan bij Huur,
            Energie-water en/of Gemeentelijke kosten het percentage zakelijk voor het jaar. Dit vervangt de
            vroegere aparte categorieën "… (deels zakelijk)"; in oudere dossiers zijn die automatisch omgezet.
          </p>
          {toonWerkruimte && (
            <div className="rounded-veld border border-slate-200 bg-slate-50 p-3 mb-3 space-y-3">
              <p className="text-sm font-medium text-slate-700">
                Huur, energie-water en gemeentelijke kosten in {activeYear}: waarvoor is het betaald? Kies dit per rekening.
              </p>
              {rekeningen.map((rek) => {
                const t = rekeningTotaal(rek);
                const soort = werkruimte[rek] || "";
                return (
                  <div key={rek}>
                    <label className="text-xs font-medium text-slate-600 block mb-1" htmlFor={`werkruimte-${rek}`}>
                      Betaald vanaf de {rek === "zakelijk" ? "zakelijke rekening" : "privérekening"} ({eur(t.som)}, {t.n}×)
                    </label>
                    <select
                      id={`werkruimte-${rek}`}
                      key={`werkruimte-${rek}-${activeYear}`}
                      value={soort}
                      onChange={(e) => { const w = e.target.value || null; onSetWerkruimte(rek, w); setJarenVraag(w && onSetWerkruimteJaren ? { rek, waarde: w, jaar: activeYear } : null); }}
                      className="rounded-veld border border-slate-300 bg-white px-2.5 py-1.5 text-sm max-w-full"
                    >
                      <option value="">Niet aangegeven (rekent met de percentages hieronder)</option>
                      {Object.entries(WERKRUIMTE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      {soort === "bedrijfsruimte" && "Zakelijk gehuurde ruimte: zakelijke huisvestingskosten voor het percentage zakelijk hieronder."}
                      {soort === "zelfstandig" && "Zelfstandige werkruimte (eigen ingang en voorzieningen, niet via de woonruimte bereikbaar, en aan de extra voorwaarden voldaan): het percentage hieronder telt mee als bedrijfskosten. Controleer de voorwaarden zelf."}
                      {soort === "niet_zelfstandig" && "Kamer of hoek in de eigen woning: niet aftrekbaar, telt voor deze rekening niet mee (0%). De ingevulde percentages blijven bewaard."}
                      {soort === "prive" && "Privé: telt niet mee als zakelijke kosten (0%)."}
                      {!soort && "Kies wat van toepassing is: voor een thuiskantoor in de eigen woning gelden andere regels dan voor een zakelijk gehuurd pand."}
                    </p>
                    {jarenVraag && jarenVraag.rek === rek && jarenVraag.jaar === activeYear && (() => {
                      const leeg = andereJarenWerkruimte.filter((j) => !j[rek]).map((j) => j.jaar);
                      const anders = andereJarenWerkruimte.filter((j) => j[rek] && j[rek] !== jarenVraag.waarde);
                      if (leeg.length === 0 && anders.length === 0) return null;
                      const label = WERKRUIMTE_LABELS[jarenVraag.waarde];
                      const zet = (jaren) => { onSetWerkruimteJaren(jaren, rek, jarenVraag.waarde); };
                      return (
                        <div className="mt-2 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-2 text-xs text-teal-900 space-y-1.5">
                          <p className="font-medium">Geldt "{label}" voor de {rek === "zakelijk" ? "zakelijke rekening" : "privérekening"} ook voor de andere jaren?</p>
                          <div className="flex flex-wrap gap-1.5">
                            {leeg.length > 0 && <button type="button" onClick={() => zet(leeg)} className="rounded-md bg-teal-700 px-2.5 py-1 font-semibold text-white hover:bg-teal-800">Ja, ook voor {leeg.join(", ")}</button>}
                            {anders.map((j) => (
                              <button key={j.jaar} type="button" onClick={() => zet([j.jaar])} className="rounded-md border border-teal-300 bg-white px-2.5 py-1 font-medium hover:bg-teal-100">{j.jaar} staat op "{WERKRUIMTE_LABELS[j[rek]]}" — ook aanpassen</button>
                            ))}
                            <button type="button" onClick={() => setJarenVraag(null)} className="rounded-md px-2.5 py-1 text-teal-800 underline">Alleen {activeYear}</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
              {Object.values(werkruimteBetaling).some((r) => r.beide) && (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                  ⚠ {Object.entries(werkruimteBetaling).filter(([, r]) => r.beide).map(([c]) => c).join(", ")}: betaald vanaf zowel de zakelijke als de privérekening.
                  {Object.values(werkruimteBetaling).some((r) => r.gelijk) ? " Bij een of meer is het bedrag op beide rekeningen gelijk — controleer of dit niet dubbel is geboekt." : " De bedragen verschillen; de app telt beide mee, elk met het percentage van die rekening."}
                </p>
              )}
            </div>
          )}
          {autoOpDeZaakDitJaar && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
              Je hebt voor {activeYear} "Auto op de zaak" aangegeven — Brandstof en Parkeren staan daarom
              niet (meer) in de lijst hieronder. Het privégebruik daarvan loopt voor dit jaar via de
              bijtelling/onttrekkings-correctie bij de leaseauto-gegevens, niet via dit percentage.
            </p>
          )}
          <div className="space-y-2">
            {/* v310 (V32) — de drie "(deels zakelijk)"-categorieën hebben een eigen opslag (per jaar, zie
                App.jsx) maar stonden alleen bij Persoonlijke aannames; een openstaande aanname daarvan was
                hier niet terug te vinden. Zelfde waarde, nu ook in dit overzicht aan te passen. */}
            {gedeeldeZichtbaar.map((r) => (
              <CategoryPercentageRow
                key={r.label}
                categorie={r.label}
                totaal={r.gedeelde.totaalBruto}
                raw={r.raw}
                standaard={100}
                onCommit={(percentage) => r.onSet(activeYear, percentage)}
              />
            ))}
            {categorieen.map((categorie) => (
              onSetRekeningPercentage && WERKRUIMTE_CATEGORIEEN.includes(categorie) && werkruimteBetaling[categorie] ? (
                <WerkruimteCategorieRij
                  key={categorie}
                  categorie={categorie}
                  betaling={werkruimteBetaling[categorie]}
                  rawPlain={categoryZakelijkPercentage?.[categorie]?.[activeYear]}
                  rawZakelijk={categoryZakelijkPercentage?.[categorie]?.[`${activeYear}:zakelijk`]}
                  rawPrive={categoryZakelijkPercentage?.[categorie]?.[`${activeYear}:prive`]}
                  werkruimte={werkruimte}
                  standaard={huisvestingStandaardNul.includes(categorie) ? 0 : defaultZakelijkPercentage(categorie)}
                  onCommit={(rek, percentage) => onSetRekeningPercentage(categorie, rek, percentage)}
                />
              ) : (
                <CategoryPercentageRow
                  key={categorie}
                  categorie={categorie}
                  totaal={categorieTotalen[categorie]}
                  raw={categoryZakelijkPercentage?.[categorie]?.[activeYear]}
                  standaard={huisvestingStandaardNul.includes(categorie) ? 0 : defaultZakelijkPercentage(categorie)}
                  onCommit={(percentage) => onSetCategoryZakelijkPercentage(categorie, activeYear, percentage)}
                />
              )
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
