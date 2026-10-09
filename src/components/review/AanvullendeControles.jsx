import { useState } from "react";
import { ChevronDown, ChevronRight, Check, AlertCircle } from "lucide-react";
import { MAANDEN } from "../../tax/controleSuggesties.js";
import { eur } from "../../utils/amounts.js";

const KLEUR = { data: "bg-emerald-400", "leeg-ok": "bg-slate-300", leeg: "bg-amber-400", buiten: "bg-slate-100" };
const dat = (d) => new Date(d).toLocaleDateString("nl-NL");
const ymLabel = (s) => { const [y, m] = s.split("-"); return `${MAANDEN[Number(m) - 1]} ${y}`; };

function Knop({ children, onClick, primair }) {
  return <button type="button" onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-semibold ${primair ? "bg-teal-700 text-white hover:bg-teal-800" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{children}</button>;
}

// C1 + C2 + C3 in één opklapbare sectie. Zonder meldingen is hij dicht en groen.
export default function AanvullendeControles({ data, onBevestig, onBevestigAlles, onToepassenTerugkerend }) {
  const [openOverride, setOpenOverride] = useState(null);
  if (!data) return null;
  const { dekking, terugkerend, sprongen } = data;
  const totaal = (dekking.aantalVerdacht > 0 ? 1 : 0) + terugkerend.length + sprongen.length;
  const open = openOverride === null ? totaal > 0 : openOverride;
  return (
    <section className={`rounded-xl border-2 ${totaal > 0 ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <button onClick={() => setOpenOverride(!open)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
        {totaal > 0 ? <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" /> : <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
        <span className={`text-sm font-semibold ${totaal > 0 ? "text-amber-900" : "text-emerald-900"}`}>
          Aanvullende controles — {totaal > 0 ? `${totaal} punt${totaal === 1 ? "" : "en"} om te bekijken` : "geen bijzonderheden"}
        </span>
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 text-xs text-slate-700">
          <p className="text-slate-500">Dit zijn suggesties, geen verplichte stappen. "Klopt zo" onthoudt je keuze in het dossier.</p>

          <div>
            <h4 className="font-semibold text-slate-800 mb-1.5">Dekking per rekening</h4>
            {dekking.rekeningen.map((r) => (
              <div key={r.key} className="rounded-lg bg-white border border-slate-100 p-3 mb-2">
                <p className="font-semibold mb-1.5">{r.label}{r.type ? ` · ${r.type === "Zakelijk" ? "zakelijk" : "privé"}` : ""}</p>
                <div className="space-y-0.5">
                  {Object.entries(r.jaren).map(([jaar, maanden]) => (
                    <div key={jaar} className="flex items-center gap-2">
                      <span className="w-9 text-slate-500">{jaar}</span>
                      <div className="flex gap-0.5">
                        {maanden.map((st, i) => <span key={i} title={`${MAANDEN[i]} ${jaar}: ${st === "data" ? "transacties aanwezig" : st === "leeg-ok" ? "geen mutaties (klopt met saldo)" : st === "leeg" ? "geen transacties — ontbreekt er een afschrift?" : "buiten de geladen periode"}`} className={`h-3.5 w-5 rounded-sm ${KLEUR[st]}`} />)}
                      </div>
                    </div>
                  ))}
                </div>
                {r.verdacht.length > 0 ? (
                  <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2">
                    <p>Geen transacties in <strong>{r.verdachtLabels.join(", ")}</strong>{r.heeftSaldo ? "" : " (dit bestand heeft geen saldokolom om dat te controleren)"}. Ontbreekt er een afschrift?</p>
                    <div className="mt-1.5"><Knop onClick={() => r.verdacht.forEach((m) => onBevestig(`dekking|${r.key}|${m}`))}>Klopt zo, geen mutaties</Knop></div>
                  </div>
                ) : <p className="mt-1.5 text-emerald-700">Geen gaten gevonden.</p>}
              </div>
            ))}
            <p className="text-[11px] text-slate-400">Groen = transacties · grijs = geen mutaties (saldo klopt) · amber = controleren · licht = buiten de geladen periode</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 mb-1.5">Terugkerende betalingen in verschillende categorieën</h4>
            {terugkerend.length === 0 ? <p className="text-emerald-700">Geen afwijkingen gevonden.</p> : terugkerend.map((t) => (
              <div key={t.key} className="rounded-lg bg-white border border-slate-100 p-3 mb-2">
                <p><strong>{t.naam}</strong> — {t.aantal}x {t.periodiek}, ongeveer {eur(t.gemBedrag)}</p>
                <p className="text-slate-500">Verdeling: {t.verdeling.map((v) => `${v.categorie} (${v.aantal}x)`).join(", ")}</p>
                <p className="text-slate-500">Afwijkend: {t.afwijkend.map((a) => `${dat(a.date)} ${eur(Math.abs(a.amount))}`).slice(0, 4).join(" · ")}{t.afwijkend.length > 4 ? ` · +${t.afwijkend.length - 4}` : ""}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <Knop primair onClick={() => onToepassenTerugkerend(t)}>Zet {t.afwijkend.length} op {t.hoofdCategorie}</Knop>
                  <Knop onClick={() => onBevestig(`terug|${t.key}`)}>Klopt zo</Knop>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 mb-1.5">Grote verschillen tussen jaren (zakelijke kosten)</h4>
            {sprongen.length === 0 ? <p className="text-emerald-700">Geen opvallende sprongen tussen volledige jaren.</p> : sprongen.map((s) => (
              <div key={s.key} className="rounded-lg bg-white border border-slate-100 p-3 mb-2 flex flex-wrap items-center gap-2">
                <p className="flex-1 min-w-[16rem]">
                  <strong>{s.categorie}</strong>: {eur(s.vorigTotaal)} in {s.vorig} → {eur(s.nuTotaal)} in {s.nu}
                  {s.soort === "verdwenen" && " — in dit jaar geen enkele boeking. Ontbreken er betalingen of is dit gestopt?"}
                  {s.soort === "nieuw" && " — nieuw dit jaar. Klopt de categorie?"}
                  {s.soort === "hoger" && ` — ${eur(s.verschil)} hoger.`}
                  {s.soort === "lager" && ` — ${eur(-s.verschil)} lager.`}
                </p>
                <Knop onClick={() => onBevestig(s.key)}>Klopt zo</Knop>
              </div>
            ))}
            {sprongen.length > 1 && (
              <div className="mb-2"><Knop primair onClick={() => (onBevestigAlles ? onBevestigAlles(sprongen.map((s) => s.key)) : sprongen.forEach((s) => onBevestig(s.key)))}>Alles klopt zo ({sprongen.length})</Knop></div>
            )}
            <p className="text-[11px] text-slate-400">Alleen volledige, opeenvolgende jaren; alleen grote verschillen (minimaal €750 én 40%); maximaal 5 per jaar.</p>
          </div>
        </div>
      )}
    </section>
  );
}
