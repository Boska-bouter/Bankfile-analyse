import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CATEGORY_COLOR } from "../../classification/categories.js";
import { KIA_MIN_TOTAAL, KIA_MAX_TOTAAL } from "../../tax/incomeTax.js";
import { eur } from "../../utils/amounts.js";

// Uitsplitsing per categorie onder een rubriek — dezelfde kleur-badges als elders in de tool, zodat
// je een bedrag hier direct kunt terugvinden bij "Categorieregels"/de detailtabellen.
function CategorieBreakdown({ perCategorie }) {
  if (!perCategorie || perCategorie.length === 0) return null;
  return (
    <div className="mt-1.5 space-y-0.5">
      {perCategorie.map((r) => (
        <div key={r.categorie} className="flex items-center justify-between gap-2 text-[11px]">
          <span className={`inline-block rounded px-1.5 py-0.5 font-medium truncate max-w-[13rem] ${CATEGORY_COLOR[r.categorie] || "bg-slate-200 text-slate-700"}`}>{r.categorie}</span>
          <span className="font-mono text-slate-500 shrink-0">{eur(r.totaal)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ObIbExplanationPanel({ activeYear, btwBoxMapping, ibBoxMapping, korRegeling, ibGedaan, setIbGedaan, loanSummary, loanDetails, loanRenteForYear, leaseRenteForYear }) {
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
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs text-blue-900">
              <strong>Waar is dit voor?</strong> Deze tool is een <strong>controle-instrument</strong>: de bedragen
              hieronder laten zien wat er volgens de bankgegevens aangegeven en betaald had moeten worden — niet per
              se wat er daadwerkelijk bij de Belastingdienst is aangegeven en betaald. Vergelijk deze bedragen dus
              altijd met de eerder ingediende aangifte(s). Komt dat niet overeen, dan is dát precies waar dit
              overzicht bij helpt: een mogelijke fout in een eerdere aangifte opsporen.
            </p>
          </div>
          <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3">
            <label className="inline-flex items-center gap-2 text-sm text-emerald-900">
              <input type="checkbox" checked={!!ibGedaan} onChange={(e) => setIbGedaan(activeYear, e.target.checked)} />
              IB-aangifte {activeYear} is al gedaan
            </label>
            <p className="mt-1 text-xs text-emerald-700">
              Vink dit aan als herinnering/status voor jezelf — het bedrag bij "Geschat IB" en Tekort/Over blijft
              gewoon zichtbaar, juist zodat je het kunt vergelijken met wat er daadwerkelijk is aangegeven.
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
          <p className="text-xs text-slate-400">
            In dezelfde volgorde als de winst-en-verliesrekening op de aangifte zelf — zo kun je één op één meelezen.
          </p>

          <div className="rounded-md bg-slate-50 p-3">
            <p className="font-medium text-xs uppercase tracking-wide text-slate-500 mb-1 flex items-center justify-between gap-2">
              <span>1. {ibBoxMapping.opbrengsten.naam}</span>
              <span className="font-mono text-slate-600 normal-case tracking-normal">{eur(ibBoxMapping.opbrengsten.totaal)}</span>
            </p>
            <CategorieBreakdown perCategorie={ibBoxMapping.opbrengsten.perCategorie} />
          </div>

          {ibBoxMapping.inkoopkosten.totaal > 0 && (
            <div className="rounded-md bg-slate-50 p-3">
              <p className="font-medium text-xs uppercase tracking-wide text-slate-500 mb-1 flex items-center justify-between gap-2">
                <span>2. {ibBoxMapping.inkoopkosten.naam}</span>
                <span className="font-mono text-slate-600 normal-case tracking-normal">{eur(ibBoxMapping.inkoopkosten.totaal)}</span>
              </p>
              <p className="text-slate-500 text-xs">{ibBoxMapping.inkoopkosten.toelichting}</p>
              <CategorieBreakdown perCategorie={ibBoxMapping.inkoopkosten.perCategorie} />
            </div>
          )}

          {(ibBoxMapping.afschrijvingen.apparatuurInvestering > 0 || ibBoxMapping.afschrijvingen.leaseKoopprijsTotal > 0) && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="font-medium text-xs uppercase tracking-wide text-amber-800 mb-1">3. {ibBoxMapping.afschrijvingen.naam}</p>
              <p className="text-amber-900 text-xs">
                {ibBoxMapping.afschrijvingen.apparatuurInvestering > 0 && <>"Zakelijk - apparatuur/machines" ({eur(ibBoxMapping.afschrijvingen.apparatuurInvestering)}){ibBoxMapping.afschrijvingen.leaseKoopprijsTotal > 0 ? " en " : " "}</>}
                {ibBoxMapping.afschrijvingen.leaseKoopprijsTotal > 0 && <>de koopprijs van bedrijfsmiddelen bij financiële lease ({eur(ibBoxMapping.afschrijvingen.leaseKoopprijsTotal)})</>}
                {" "}{ibBoxMapping.afschrijvingen.toelichting}
                {ibBoxMapping.afschrijvingen.apparatuurInvestering >= KIA_MIN_TOTAAL && ibBoxMapping.afschrijvingen.apparatuurInvestering <= KIA_MAX_TOTAAL && (
                  <> Mogelijk komt de apparatuur/machines-investering ook in aanmerking voor de kleinschaligheidsinvesteringsaftrek (KIA).</>
                )}
              </p>
              <CategorieBreakdown perCategorie={ibBoxMapping.afschrijvingen.perCategorie} />
            </div>
          )}

          {ibBoxMapping.overigeBedrijfskosten.length > 0 && (
            <div>
              <p className="font-medium text-xs uppercase tracking-wide text-slate-500 mb-1.5">4. Overige bedrijfskosten</p>
              <div className="space-y-1.5">
                {ibBoxMapping.overigeBedrijfskosten.map((r) => (
                  <div key={r.naam} className="rounded-md bg-slate-50 p-3">
                    <p className="font-medium text-xs uppercase tracking-wide text-slate-500 mb-1 flex items-center justify-between gap-2">
                      <span>{r.naam}</span>
                      <span className="font-mono text-slate-600 normal-case tracking-normal">{eur(r.totaal)}</span>
                    </p>
                    <CategorieBreakdown perCategorie={r.perCategorie} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {(ibBoxMapping.financieleBatenLasten.renteLeningen > 0 || ibBoxMapping.financieleBatenLasten.renteLease > 0 || ibBoxMapping.leningenTotal > 0 || ibBoxMapping.leaseFinancieelTotal > 0) && (
            <div className="rounded-md bg-orange-50 border border-orange-200 p-3">
              <p className="font-medium text-xs uppercase tracking-wide text-orange-800 mb-1">5. {ibBoxMapping.financieleBatenLasten.naam}</p>
              <p className="text-orange-900 text-xs">{ibBoxMapping.financieleBatenLasten.toelichting}</p>
              <p className="text-orange-900 text-xs mt-1">
                Rente in {activeYear}: <strong>{eur(ibBoxMapping.financieleBatenLasten.renteLeningen + ibBoxMapping.financieleBatenLasten.renteLease)}</strong> (aftrekbaar)
                {" "}· aflossing: {eur(ibBoxMapping.financieleBatenLasten.aflossingLeningen + ibBoxMapping.financieleBatenLasten.aflossingLease)} (niet aftrekbaar)
              </p>
              {ibBoxMapping.financieleBatenLasten.onvolledig > 0 && (
                <p className="text-orange-700 text-xs mt-1">
                  ⚠ {ibBoxMapping.financieleBatenLasten.onvolledig} lening(en)/leasecontract(en) nog niet (volledig) ingevuld — dit bedrag is daardoor nog niet compleet.
                </p>
              )}
              <CategorieBreakdown perCategorie={[
                { categorie: "Leningen", totaal: ibBoxMapping.leningenTotal },
                { categorie: "Lease (financieel)", totaal: ibBoxMapping.leaseFinancieelTotal },
              ].filter((r) => r.totaal > 0)} />
              {loanSummary && loanSummary.length > 0 && (
                <p className="text-orange-900 text-xs mt-1.5">
                  {loanSummary.map((loan) => (
                    <span key={loan.key} className="block">
                      {loan.name}: {loanDetails?.[loan.key]?.rente != null && loanDetails[loan.key].rente !== "" ? `${loanDetails[loan.key].rente}%` : "nog niet ingevuld"}
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}

          {(ibBoxMapping.priveOnttrekkingen.totaal > 0 || ibBoxMapping.priveStortingen.totaal > 0) && (
            <div className="rounded-md bg-slate-50 p-3">
              <p className="font-medium text-xs uppercase tracking-wide text-slate-500 mb-1.5">6. Privéonttrekkingen en -stortingen</p>
              {ibBoxMapping.priveOnttrekkingen.totaal > 0 && (
                <>
                  <p className="text-slate-600 text-xs flex items-center justify-between gap-2">
                    <span>Privéonttrekkingen</span><span className="font-mono">{eur(ibBoxMapping.priveOnttrekkingen.totaal)}</span>
                  </p>
                  <CategorieBreakdown perCategorie={ibBoxMapping.priveOnttrekkingen.perCategorie} />
                </>
              )}
              {ibBoxMapping.priveStortingen.totaal > 0 && (
                <>
                  <p className="text-slate-600 text-xs flex items-center justify-between gap-2 mt-2">
                    <span>Privéstortingen</span><span className="font-mono">{eur(ibBoxMapping.priveStortingen.totaal)}</span>
                  </p>
                  <CategorieBreakdown perCategorie={ibBoxMapping.priveStortingen.perCategorie} />
                </>
              )}
            </div>
          )}

          {ibBoxMapping.belastingenGeenKostenpost.totaal > 0 && (
            <div className="rounded-md bg-rose-50 border border-rose-200 p-3">
              <p className="font-medium text-xs uppercase tracking-wide text-rose-800 mb-1 flex items-center justify-between gap-2">
                <span>{ibBoxMapping.belastingenGeenKostenpost.naam}</span>
                <span className="font-mono normal-case tracking-normal">{eur(ibBoxMapping.belastingenGeenKostenpost.totaal)}</span>
              </p>
              <p className="text-rose-900 text-xs">{ibBoxMapping.belastingenGeenKostenpost.toelichting}</p>
              <CategorieBreakdown perCategorie={ibBoxMapping.belastingenGeenKostenpost.perCategorie} />
            </div>
          )}

          {ibBoxMapping.verkoopActivaTotal > 0 && (
            <div className="rounded-md bg-slate-50 p-3">
              <p className="font-medium text-xs uppercase tracking-wide text-slate-500 mb-1 flex items-center justify-between gap-2">
                <span>Verkoop activa</span>
                <span className="font-mono normal-case tracking-normal">{eur(ibBoxMapping.verkoopActivaTotal)}</span>
              </p>
              <p className="text-slate-500 text-xs">
                Verkoop van een bedrijfsmiddel kan een boekwinst of -verlies opleveren — deze tool kent de boekwaarde
                niet en berekent dat niet automatisch.
              </p>
            </div>
          )}

          {ibBoxMapping.nogNietIngedeeld.length > 0 && (
            <div className="rounded-md bg-slate-50 border border-slate-200 p-3">
              <p className="font-medium text-xs uppercase tracking-wide text-slate-500 mb-1">Nog niet ingedeeld in deze structuur</p>
              <div className="text-slate-600 text-xs space-y-0.5">
                {ibBoxMapping.nogNietIngedeeld.map((r) => (
                  <p key={r.categorie} className="flex items-center justify-between gap-2">
                    <span>{r.categorie}</span><span className="font-mono">{eur(r.totaal)}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
