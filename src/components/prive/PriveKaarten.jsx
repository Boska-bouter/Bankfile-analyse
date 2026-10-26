// beide-V1R8 (fase 6) — de kaarten van het Overzicht in een privédossier: inkomsten en uitgaven,
// uitgaven per categorie, vaste lasten, sparen en de indicatie inkomstenbelasting. Alleen weergave; de
// cijfers komen uit calc/prive (usePriveOverzicht).
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import { hoofdKleur } from "../../classification/categories.js";
import { sparenLabel, hoofdLabel, budgetJaarVan } from "../../calc/prive/budget.js";

export const KAART = "rounded-paneel border border-slate-200 bg-white p-4 shadow-sm space-y-3";
const KOP = "text-sm font-semibold text-slate-900";
const LINK = "text-xs font-medium text-teal-800 underline decoration-dotted hover:text-teal-950";

// beide-V5R1 — teken "− " = bedrag gaat eraf (uitgaven, sparen), "+ " = komt erbij; per saldo andersom → ander teken.
const tekenVan = (bedrag, teken) => (!teken || Math.abs(bedrag) < 0.005 ? "" : (bedrag > 0) === (teken.trim() === "−") ? "− " : "+ ");

export function Regel({ label, bedrag, sterk = false, teken = "", kleur = "" }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 text-sm ${sterk ? "font-semibold text-slate-900 border-t border-slate-100 pt-1.5" : "text-slate-700"}`}>
      <span>{label}</span>
      <span className={`tabular-nums whitespace-nowrap ${kleur}`}>{tekenVan(bedrag, teken)}{eur(teken ? Math.abs(bedrag) : bedrag)}</span>
    </div>
  );
}

export function InkomstenUitgavenKaart({ jaar, budget, onPerMaand }) {
  const t = budget.totaal;
  const maanden = Math.max(1, budget.maanden || 12);
  return (
    <section className={KAART}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={KOP}>Inkomsten en uitgaven {jaar}</h3>
        {onPerMaand && <button type="button" onClick={onPerMaand} className={LINK}>Per maand →</button>}
      </div>
      <Regel label="Inkomsten" bedrag={t.inkomsten} teken="+ " />
      <Regel label="Uitgaven" bedrag={t.uitgaven} teken="− " />
      <Regel label={t.over >= 0 ? "Over" : "Meer uitgegeven dan binnengekomen"} bedrag={Math.abs(t.over)} sterk kleur={t.over >= 0 ? "text-emerald-700" : "text-rose-700"} />
      {/* beide-V5R4 — waar het overschot bleef: sparen/beleggen en het saldo van je rekening (wens Boska 25-10). */}
      <div className="rounded-lg bg-slate-50 px-2.5 py-2 space-y-1">
        <Regel label={sparenLabel(t.sparen)} bedrag={t.sparen} teken="− " />
        {Math.abs(t.eigenBetaal || 0) >= 0.5 && <Regel label="Van (+) of naar (−) andere eigen betaalrekeningen" bedrag={t.eigenBetaal} teken="+ " />}
        {Math.abs(t.verschoven || 0) >= 0.5 && <Regel label="Rond de jaarwisseling in een ander jaar geteld" bedrag={t.verschoven} teken="+ " />}
        <Regel label="Verandering saldo van de rekening" bedrag={t.saldo} teken="+ " />
        <p className="text-xs text-slate-500">Wat over is, gaat naar sparen en beleggen of blijft op de rekening. Gaat er in een jaar meer opzij dan er over is, dan daalt het saldo van de rekening; dat is geen tekort.</p>
      </div>
      {/* beide-V5R6 — uitgaven die volgens de omschrijving bij een ander jaar horen ("PREMIE 2026." in december 2025) */}
      {[...(budget.verschovenUit || []), ...(budget.verschovenIn || [])].length > 0 && (
        <ul className="text-xs text-slate-500 space-y-0.5">
          {(budget.verschovenUit || []).map((x) => <li key={`u${x.id}`}>{(x.description || x.counterparty || "").slice(0, 40)} ({x.date.toLocaleDateString("nl-NL")}, {eur(x.amount)}) telt mee in {budgetJaarVan(x)}.</li>)}
          {(budget.verschovenIn || []).map((x) => <li key={`i${x.id}`}>{(x.description || x.counterparty || "").slice(0, 40)} (betaald {x.date.toLocaleDateString("nl-NL")}, {eur(x.amount)}) telt mee in {jaar}.</li>)}
        </ul>
      )}
      <p className="text-xs text-slate-500">Gemiddeld per maand ({maanden} {maanden === 1 ? "maand" : "maanden"} met gegevens): {eur(t.inkomsten / maanden)} in, {eur(t.uitgaven / maanden)} uit.</p>
      {budget.inkomstenPerCategorie.length > 0 && (
        <ul className="text-xs text-slate-600 space-y-0.5">
          {budget.inkomstenPerCategorie.map((c) => <li key={c.naam} className="flex justify-between"><span>{c.label}</span><span className="tabular-nums">{eur(c.bedrag)}</span></li>)}
        </ul>
      )}
    </section>
  );
}

export function UitgavenPerCategorieKaart({ jaar, budget }) {
  const [open, setOpen] = useState(null);
  const max = Math.max(1, ...budget.uitgavenPerHoofd.map((h) => h.bedrag));
  return (
    <section className={KAART}>
      <h3 className={KOP}>Uitgaven per categorie {jaar}</h3>
      {budget.uitgavenPerHoofd.length === 0 && <p className="text-sm text-slate-500">Nog geen uitgaven in dit jaar.</p>}
      <ul className="space-y-1.5">
        {budget.uitgavenPerHoofd.map((h) => (
          <li key={h.hoofd}>
            <button type="button" onClick={() => setOpen(open === h.hoofd ? null : h.hoofd)} className="w-full text-left">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1 text-slate-800">
                  {open === h.hoofd ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <span className={`rounded px-1.5 py-0.5 text-xs ${hoofdKleur(h.hoofd)}`}>{hoofdLabel(h.hoofd, h.bedrag)}</span>
                </span>
                <span className={`tabular-nums ${h.bedrag < 0 ? "text-emerald-700" : "text-slate-700"}`}>{h.bedrag < 0 ? `+ ${eur(-h.bedrag)}` : eur(h.bedrag)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.max(0, (100 * h.bedrag) / max)}%` }} /></div>
            </button>
            {open === h.hoofd && (
              <ul className="mt-1 ml-5 text-xs text-slate-600 space-y-0.5">
                {h.categorieen.map((c) => <li key={c.naam} className="flex justify-between"><span>{c.label}</span><span className="tabular-nums">{eur(c.bedrag)}</span></li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function VasteLastenKaart({ jaar, budget, onInstellen }) {
  const maanden = Math.max(1, budget.maanden || 12);
  return (
    <section className={KAART}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={KOP}>Vaste lasten {jaar}</h3>
        {onInstellen && <button type="button" onClick={onInstellen} className={LINK} title="Kies in Instellingen welke categorieën als vaste lasten tellen">Kiezen wat vaste lasten zijn →</button>}
      </div>
      {budget.vasteLastenPerCategorie.length === 0 ? (
        <p className="text-sm text-slate-500">Geen vaste lasten gevonden. Kies via de link hierboven welke categorieën vaste lasten zijn.</p>
      ) : (
        <>
          <ul className="text-sm text-slate-700 space-y-0.5">
            {budget.vasteLastenPerCategorie.map((c) => (
              <li key={c.naam} className="flex justify-between gap-2"><span>{c.label}</span><span className="tabular-nums">{eur(c.bedrag / maanden)} p/m</span></li>
            ))}
          </ul>
          <Regel label="Totaal per maand" bedrag={budget.totaal.vasteLasten / maanden} sterk />
          <p className="text-xs text-slate-500">{budget.totaal.inkomsten > 0 ? `${Math.round((100 * budget.totaal.vasteLasten) / budget.totaal.inkomsten)}% van de inkomsten gaat naar vaste lasten. ` : ""}Deze bedragen zitten al in de uitgaven.</p>
        </>
      )}
    </section>
  );
}

export function SparenKaart({ jaar, budget, belasting }) {
  const b3 = belasting?.box3;
  return (
    <section className={KAART}>
      <h3 className={KOP}>Sparen {jaar}</h3>
      <Regel label={sparenLabel(budget.totaal.sparen)} bedrag={Math.abs(budget.totaal.sparen)} />
      {budget.totaal.inkomsten > 0 && budget.totaal.sparen > 0 && <p className="text-xs text-slate-500">Dat is {Math.round((100 * budget.totaal.sparen) / budget.totaal.inkomsten)}% van de inkomsten.</p>}
      {b3 && (
        <div className="border-t border-slate-100 pt-2 space-y-1">
          <Regel label="Vermogen box 3 (1 januari)" bedrag={b3.grondslag} />
          <Regel label="Heffingsvrij vermogen" bedrag={b3.heffingsvrij} />
          <Regel label="Box 3-belasting (indicatie)" bedrag={b3.belasting} />
        </div>
      )}
    </section>
  );
}

const som = (lijst, veld) => lijst.reduce((t, p) => t + (p[veld] || 0), 0);

export function BelastingKaart({ jaar, belasting, aannames = [], onBerekening, onVragen, gedaan, onGedaan }) {
  const [details, setDetails] = useState(false);
  const v = belasting.verschil;
  const terug = v < 0;
  return (
    <section className={KAART}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={KOP}>Indicatie inkomstenbelasting {jaar}</h3>
        {onBerekening && <button type="button" onClick={onBerekening} className={LINK}>Volledige berekening →</button>}
      </div>
      <p className={`text-lg font-bold ${Math.abs(v) < 1 ? "text-slate-800" : terug ? "text-emerald-700" : "text-rose-700"}`}>
        {Math.abs(v) < 1 ? "Ongeveer niets terug of bij te betalen" : `${eur(Math.abs(v))} ${terug ? "terug te krijgen" : "bij te betalen"}`}
      </p>
      {/* beide-V2R8 — privé: inkomen op de bank is netto, de belasting is al ingehouden. Zonder jaaropgave tonen we
          dus geen (geschatte) inkomstenbelasting, alleen wat er nog terug of bij komt door aftrekposten, woning,
          box 3 of inkomen zonder inhouding. Met de loonheffing van de jaaropgave: de volledige vergelijking. */}
      <Regel label="Netto inkomen (belasting al ingehouden)" bedrag={som(belasting.personen, "netto")} />
      {som(belasting.personen, "zonderInhouding") > 0 && <Regel label="Inkomen zonder ingehouden belasting" bedrag={som(belasting.personen, "zonderInhouding")} />}
      {!belasting.loonheffingGeschat && <>
        {som(belasting.personen, "brutoOpgegeven") > 0 && <Regel label="Bruto inkomen (jaaropgave)" bedrag={som(belasting.personen, "brutoOpgegeven")} />}
        <Regel label="Inkomstenbelasting (na heffingskortingen)" bedrag={belasting.ib} />
        <Regel label={`Al ingehouden loonheffing (${som(belasting.personen, "brutoOpgegeven") > 0 ? "bruto min netto" : "jaaropgave"})`} bedrag={belasting.loonheffing} teken="− " />
      </>}
      {belasting.loonheffingGeschat && (
        <p className="text-xs text-slate-500">Over het netto inkomen is de belasting al betaald. Wat hierboven staat, komt alleen nog uit de aftrekposten, de woning{som(belasting.personen, "zonderInhouding") > 0 ? ", box 3 en het inkomen zonder ingehouden belasting" : " en box 3"}.</p>
      )}
      <button type="button" onClick={() => setDetails((d) => !d)} className={LINK}>{details ? "Minder details" : "Hoe is dit berekend?"}</button>
      {details && (
        <div className="space-y-2 text-xs text-slate-600">
          {belasting.personen.map((p) => (
            <div key={p.rol} className="rounded-lg bg-slate-50 p-2 space-y-0.5">
              <p className="font-semibold text-slate-700">{p.rol === "partner" ? "Partner" : belasting.metPartner ? "Hoofdpersoon" : "Box 1"}{p.aow ? " (AOW-leeftijd)" : ""}</p>
              <Regel label={`Bruto inkomen (loon, uitkering, pensioen)${p.loonheffingGeschat ? ", teruggerekend uit netto" : ""}`} bedrag={p.bruto} />
              {p.eigenWoning !== 0 && <Regel label="Eigen woning (forfait min rente)" bedrag={p.eigenWoning} />}
              {p.persoonsgebondenAftrek > 0 && <Regel label="Aftrekposten" bedrag={p.persoonsgebondenAftrek} teken="− " />}
              <Regel label="Belastbaar inkomen box 1" bedrag={p.belastbaarBox1} />
              <Regel label="Belasting box 1" bedrag={p.belastingBox1} />
              {p.box3 > 0 && <Regel label="Belasting box 3" bedrag={p.box3} />}
              <Regel label="Heffingskortingen" bedrag={p.kortingen.totaal} teken="− " />
              <Regel label="Inkomstenbelasting" bedrag={p.ib} sterk />
              <Regel label={`Al ingehouden loonheffing${p.loonheffingGeschat ? " (geschat)" : ""}`} bedrag={p.loonheffing} teken="− " />
            </div>
          ))}
        </div>
      )}
      {aannames.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
          <p className="text-xs font-semibold text-amber-900">Aannames</p>
          <ul className="list-disc pl-4 text-xs text-amber-900 space-y-0.5">{aannames.map((a) => <li key={a}>{a}</li>)}</ul>
          {onVragen && <button type="button" onClick={onVragen} className={`${LINK} mt-1`}>Gegevens aanvullen →</button>}
        </div>
      )}
      {onGedaan && (
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={!!gedaan} onChange={(e) => onGedaan(e.target.checked)} /> Aangifte inkomstenbelasting {jaar} gedaan
        </label>
      )}
      <p className="text-xs text-slate-400">Indicatie op basis van de bankgegevens en antwoorden; geen vervanging van de aangifte bij de Belastingdienst. Toeslagen worden niet berekend.</p>
    </section>
  );
}

// beide-V1R8 (fase 6) — Controleren in een privédossier: welke gegevens de belastingindicatie nog mist
// (jaaropgave loonheffing, WOZ, hypotheekrente, vermogen box 3). Komt uit dezelfde aannames als het Overzicht.
export function PriveGegevensKaart({ jaar, aannames = [], onAanvullen }) {
  return (
    <section className={KAART}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={KOP}>Gegevens voor de belasting {jaar}</h3>
        {aannames.length > 0 && onAanvullen && <button type="button" onClick={onAanvullen} className={LINK}>Aanvullen →</button>}
      </div>
      {aannames.length === 0
        ? <p className="text-sm text-emerald-700">Alles wat de berekening nodig heeft is ingevuld.</p>
        : <ul className="list-disc pl-4 text-sm text-slate-700 space-y-1">{aannames.map((a) => <li key={a}>{a}</li>)}</ul>}
    </section>
  );
}
