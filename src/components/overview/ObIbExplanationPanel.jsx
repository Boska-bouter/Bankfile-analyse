import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CATEGORY_COLOR } from "../../classification/categories.js";
import { KIA_MIN_TOTAAL, KIA_MAX_TOTAAL } from "../../tax/incomeTax.js";
import { eur } from "../../utils/amounts.js";

export default function ObIbExplanationPanel({ activeYear, btwBoxMapping, ibBoxMapping, korRegeling, ibGedaan, setIbGedaan, loanSummary, loanDetails }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 p-5 text-sm font-semibold">
        <span>Waar wat invullen bij OB/IB aangiften — {activeYear}</span>
        <span className="flex-1" />
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 text-sm">
          <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
            <label className="inline-flex items-center gap-2 text-sm text-emerald-900">
              <input type="checkbox" checked={!!ibGedaan} onChange={(e) => setIbGedaan(activeYear, e.target.checked)} />
              IB-aangifte {activeYear} is al gedaan
            </label>
            <p className="mt-1 text-xs text-emerald-700">
              Vink dit aan zodra je voor dit jaar daadwerkelijk IB-aangifte hebt gedaan. "Geschat IB" telt dan niet meer mee als nog openstaand bedrag bij Tekort/Over.
            </p>
          </div>

          {!korRegeling && (
            <>
              <p className="text-xs font-semibold text-slate-600">Waar vind ik dit op het BTW-aangifteformulier?</p>
              <p className="text-xs text-slate-400">Gebaseerd op je eigen BTW-instellingen — puur ter oriëntatie, geen belastingadvies.</p>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="font-medium text-xs uppercase tracking-wide text-slate-500 mb-1">Vak 1a / 1b — Omzet en BTW hoog/laag tarief</p>
                <p className="text-slate-600">
                  Categorie "Zakelijke inkomsten" staat bij jou op <strong>{btwBoxMapping.omzetRate}%</strong> BTW
                  {btwBoxMapping.omzetRate === 21 ? " → dit gaat naar vak 1a (hoog tarief)." : btwBoxMapping.omzetRate === 9 ? " → dit gaat naar vak 1b (laag tarief)." : " (0%)."}
                  {" "}BTW-verlegde bedragen gaan naar vak 1e in plaats van 1a/1b.
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="font-medium text-xs uppercase tracking-wide text-slate-500 mb-1">Vak 5b — Voorbelasting</p>
                <p className="text-slate-600 mb-1.5">De BTW over onderstaande categorieën telt mee als aftrekbare voorbelasting:</p>
                {btwBoxMapping.voorbelastingCategorieen.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {btwBoxMapping.voorbelastingCategorieen.map((c) => (
                      <span key={c} className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLOR[c] || "bg-slate-200 text-slate-700"}`}>{c}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs">Geen categorieën — check je BTW-percentages en uitsluitingen.</p>
                )}
                {btwBoxMapping.uitgeslotenMetBtw.length > 0 && (
                  <p className="text-xs text-slate-400 mt-2">Wél BTW, maar bewust uitgesloten van voorbelasting: {btwBoxMapping.uitgeslotenMetBtw.join(", ")}.</p>
                )}
              </div>
            </>
          )}

          <p className="text-xs font-semibold text-slate-600 pt-2">Waar vind ik dit bij de aangifte inkomstenbelasting (winst uit onderneming)?</p>
          <p className="text-xs text-slate-400">De IB-winstaangifte werkt met uitklapbare rubrieken, geen genummerde vakken — hieronder per rubriek welke categorieën daarin horen.</p>
          {ibBoxMapping.rubrieken.map((r) => (
            <div key={r.naam} className="rounded-md bg-slate-50 p-3">
              <p className="font-medium text-xs uppercase tracking-wide text-slate-500 mb-1 flex items-center justify-between gap-2">
                <span>{r.naam}</span>
                <span className="font-mono text-slate-600 normal-case tracking-normal">{eur(r.totaal)}</span>
              </p>
              {r.toelichting && <p className="text-slate-500 text-xs">{r.toelichting}</p>}
            </div>
          ))}

          {(ibBoxMapping.apparatuurInvestering > 0 || ibBoxMapping.leaseFinancieelTotal > 0) && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="font-medium text-xs uppercase tracking-wide text-amber-800 mb-1">Afschrijvingen — geen directe kosten</p>
              <p className="text-amber-900 text-xs">
                {ibBoxMapping.apparatuurInvestering > 0 && <>"Zakelijk - apparatuur/machines" ({eur(ibBoxMapping.apparatuurInvestering)}){ibBoxMapping.leaseFinancieelTotal > 0 ? " en " : " "}</>}
                {ibBoxMapping.leaseFinancieelTotal > 0 && <>"Lease (financieel)" ({eur(ibBoxMapping.leaseFinancieelTotal)})</>}
                {" "}mogen doorgaans niet in één keer als kosten worden afgetrokken — dit zijn bedrijfsmiddelen die over de gebruiksduur afgeschreven moeten worden.
                {ibBoxMapping.apparatuurInvestering >= KIA_MIN_TOTAAL && ibBoxMapping.apparatuurInvestering <= KIA_MAX_TOTAAL && (
                  <> Mogelijk komt de apparatuur/machines-investering ook in aanmerking voor de kleinschaligheidsinvesteringsaftrek (KIA).</>
                )}
              </p>
            </div>
          )}

          {ibBoxMapping.leningenTotal > 0 && (
            <div className="rounded-md bg-orange-50 border border-orange-200 p-3">
              <p className="font-medium text-xs uppercase tracking-wide text-orange-800 mb-1">Leningen — alleen het rentedeel is aftrekbaar</p>
              <p className="text-orange-900 text-xs">
                "Leningen" ({eur(ibBoxMapping.leningenTotal)}) is geen kostenpost in één keer: de <strong>aflossing</strong> is niet aftrekbaar, alleen de <strong>rente</strong>.
                {loanSummary && loanSummary.length > 0 && (
                  <span className="block mt-1">
                    {loanSummary.map((loan) => (
                      <span key={loan.key} className="block">
                        {loan.name}: {loanDetails?.[loan.key]?.rente != null && loanDetails[loan.key].rente !== "" ? `${loanDetails[loan.key].rente}%` : "nog niet ingevuld"}
                      </span>
                    ))}
                  </span>
                )}
              </p>
            </div>
          )}

          {(ibBoxMapping.naheffingOBTotal > 0 || ibBoxMapping.naheffingLHTotal > 0 || ibBoxMapping.naheffingIBTotal > 0) && (
            <div className="rounded-md bg-rose-50 border border-rose-200 p-3">
              <p className="font-medium text-xs uppercase tracking-wide text-rose-800 mb-1">Naheffingen voorgaande jaren — per belastingsoort verschillend</p>
              <div className="text-rose-900 text-xs space-y-1">
                {ibBoxMapping.naheffingOBTotal > 0 && (
                  <p>
                    <strong>OB</strong> ({eur(ibBoxMapping.naheffingOBTotal)}): de hoofdsom is <strong>geen kostenpost</strong> — het is het aflossen van een schuld aan de Belastingdienst.
                  </p>
                )}
                {ibBoxMapping.naheffingLHTotal > 0 && (
                  <p><strong>LH</strong> ({eur(ibBoxMapping.naheffingLHTotal)}): telt gewoon mee als kosten, net als reguliere loonheffing.</p>
                )}
                {ibBoxMapping.naheffingIBTotal > 0 && (
                  <p><strong>IB</strong> ({eur(ibBoxMapping.naheffingIBTotal)}): net als reguliere IB altijd <strong>privé</strong>, nooit een zakelijke kostenpost.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
