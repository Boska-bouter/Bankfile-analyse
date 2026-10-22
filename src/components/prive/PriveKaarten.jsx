// beide-V1R8 (fase 6) — de kaarten van het Overzicht in een privédossier: inkomsten en uitgaven,
// uitgaven per categorie, vaste lasten, sparen en de indicatie inkomstenbelasting. Alleen weergave; de
// cijfers komen uit calc/prive (usePriveOverzicht).
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { eur } from "../../utils/amounts.js";
import { hoofdKleur } from "../../classification/categories.js";

export const KAART = "rounded-paneel border border-slate-200 bg-white p-4 shadow-sm space-y-3";
const KOP = "text-sm font-semibold text-slate-900";
const LINK = "text-xs font-medium text-teal-800 underline decoration-dotted hover:text-teal-950";

export function Regel({ label, bedrag, sterk = false, teken = "", kleur = "" }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 text-sm ${sterk ? "font-semibold text-slate-900 border-t border-slate-100 pt-1.5" : "text-slate-700"}`}>
      <span>{label}</span>
      <span className={`tabular-nums whitespace-nowrap ${kleur}`}>{teken && bedrag < 0 ? "+ " : teken}{eur(teken && bedrag < 0 ? -bedrag : bedrag)}</span>
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
      <Regel label="Inkomsten" bedrag={t.inkomsten} />
      <Regel label="Uitgaven" bedrag={t.uitgaven} teken="− " />
      <Regel label="Gespaard en belegd" bedrag={t.sparen} teken="− " />
      <Regel label={t.over >= 0 ? "Over" : "Tekort"} bedrag={Math.abs(t.over)} sterk kleur={t.over >= 0 ? "text-emerald-700" : "text-rose-700"} />
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
                  <span className={`rounded px-1.5 py-0.5 text-xs ${hoofdKleur(h.hoofd)}`}>{h.hoofd}</span>
                </span>
                <span className="tabular-nums text-slate-700">{eur(h.bedrag)}</span>
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
        {onInstellen && <button type="button" onClick={onInstellen} className={LINK}>Aanpassen →</button>}
      </div>
      {budget.vasteLastenPerCategorie.length === 0 ? (
        <p className="text-sm text-slate-500">Geen vaste lasten gevonden. Kies bij Instellingen welke categorieën vaste lasten zijn.</p>
      ) : (
        <>
          <ul className="text-sm text-slate-700 space-y-0.5">
            {budget.vasteLastenPerCategorie.map((c) => (
              <li key={c.naam} className="flex justify-between gap-2"><span>{c.label}</span><span className="tabular-nums">{eur(c.bedrag / maanden)} p/m</span></li>
            ))}
          </ul>
          <Regel label="Totaal per maand" bedrag={budget.totaal.vasteLasten / maanden} sterk />
          <p className="text-xs text-slate-500">{budget.totaal.inkomsten > 0 ? `${Math.round((100 * budget.totaal.vasteLasten) / budget.totaal.inkomsten)}% van je inkomsten gaat naar vaste lasten.` : ""}</p>
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
      <Regel label="Netto naar sparen en beleggen" bedrag={budget.totaal.sparen} />
      {budget.totaal.inkomsten > 0 && <p className="text-xs text-slate-500">Dat is {Math.round((100 * budget.totaal.sparen) / budget.totaal.inkomsten)}% van je inkomsten.</p>}
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
      <Regel label="Inkomstenbelasting (na heffingskortingen)" bedrag={belasting.ib} />
      <Regel label={`Al ingehouden loonheffing${belasting.loonheffingGeschat ? " (geschat)" : ""}`} bedrag={belasting.loonheffing} teken="− " />
      <button type="button" onClick={() => setDetails((d) => !d)} className={LINK}>{details ? "Minder details" : "Hoe is dit berekend?"}</button>
      {details && (
        <div className="space-y-2 text-xs text-slate-600">
          {belasting.personen.map((p) => (
            <div key={p.rol} className="rounded-lg bg-slate-50 p-2 space-y-0.5">
              <p className="font-semibold text-slate-700">{p.rol === "partner" ? "Partner" : belasting.metPartner ? "Jij" : "Box 1"}{p.aow ? " (AOW-leeftijd)" : ""}</p>
              <Regel label="Bruto inkomen (loon, uitkering, pensioen)" bedrag={p.bruto} />
              {p.eigenWoning !== 0 && <Regel label="Eigen woning (forfait min rente)" bedrag={p.eigenWoning} />}
              {p.persoonsgebondenAftrek > 0 && <Regel label="Aftrekposten" bedrag={p.persoonsgebondenAftrek} teken="− " />}
              <Regel label="Belastbaar inkomen box 1" bedrag={p.belastbaarBox1} />
              <Regel label="Belasting box 1" bedrag={p.belastingBox1} />
              {p.box3 > 0 && <Regel label="Belasting box 3" bedrag={p.box3} />}
              <Regel label="Heffingskortingen" bedrag={p.kortingen.totaal} teken="− " />
              <Regel label="Inkomstenbelasting" bedrag={p.ib} sterk />
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
      <p className="text-xs text-slate-400">Indicatie op basis van je bankgegevens en antwoorden; geen vervanging van de aangifte bij de Belastingdienst. Toeslagen worden niet berekend.</p>
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
