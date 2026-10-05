import { useState } from "react";
import { SectionCard } from "./SectionCard.jsx";
import IndicatieveAangifteCard from "./IndicatieveAangifteCard.jsx";
import IndicatieveVpbCard from "./IndicatieveVpbCard.jsx";

// Fase 1, dashboard-restyling (Stijl F) — "Details en overzichten"-paneel onderaan het Overzicht-
// tabblad, met sub-tabs (Jaaroverzicht/Transacties/Categorieën/Activa/Leningen/Lease/BTW/
// Rapportages) zoals in het mockup-canvas. Dit paneel bouwt GEEN nieuwe interactieve tabellen na —
// het echte werk (transacties bewerken, categorieën instellen, leningdetails invullen) blijft op
// Controleren/Instellingen staan, exact zoals het al werkte. Elke sub-tab hier toont een korte,
// realistische samenvatting (uit dezelfde dashboardCards-data) plus een knop die naar de bijbehorende
// plek springt (dezelfde jumpToSection-functie als de rest van de app al gebruikt).
const TABS = [
  { key: "jaaroverzicht", label: "Jaaroverzicht" },
  { key: "transacties", label: "Transacties" },
  { key: "categorieen", label: "Categorieën" },
  { key: "activa", label: "Activa" },
  { key: "leningen", label: "Leningen" },
  { key: "lease", label: "Lease" },
  { key: "btw", label: "BTW" },
  { key: "rapportages", label: "Rapportages" },
];

// dashboardCards-objecten dragen een `key`-veld (voor React-lijsten in SectionCardGrid) — dat mag
// nooit meegespreid worden in JSX (React reserveert `key` en waarschuwt anders), dus hier eruit
// gehaald vóór het doorgeven aan een los <SectionCard />.
function CardTile(card) {
  if (!card) return null;
  const { key, ...rest } = card;
  return <SectionCard {...rest} />;
}

function LinkOut({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full px-3 py-1.5"
    >
      {label} →
    </button>
  );
}


// v305 (V27) — de indicatieve aangifte (IB) / Vpb (BV) stond verstopt in "Details en overzichten" >
// Jaaroverzicht; dit is het resultaat waar de gebruiker het dossier voor opbouwt en staat nu direct
// onder de vier samenvattende kaarten. De persoonlijke aannames zijn een compacte statusregel
// (klik → detail) i.p.v. een volle kaart.
export function IndicatieSection({ year, rechtsvorm, dashboardAangifteIndicatie, vpbIndicatie, vpbBreakdown, winst, previousWinst, showTrend, onShowFullCalculation, aannamesCard }) {
  if (!year) return null;
  if (rechtsvorm === "bv") {
    return (
      <IndicatieveVpbCard year={year} winst={winst} vpbIndicatie={vpbIndicatie} breakdown={vpbBreakdown} showTrend={showTrend} prevWinst={previousWinst} onShowFullCalculation={onShowFullCalculation} />
    );
  }
  if (!dashboardAangifteIndicatie) return null;
  const open = aannamesCard?.openCount || 0;
  return (
    <div className="space-y-2">
      <IndicatieveAangifteCard year={year} winst={winst} indicatie={dashboardAangifteIndicatie} showTrend={showTrend} prevWinst={previousWinst} onShowFullCalculation={onShowFullCalculation} />
      {aannamesCard && (
        <button
          onClick={aannamesCard.onClick}
          className={`w-full text-left rounded-xl border px-4 py-2.5 text-sm flex flex-wrap items-center gap-x-3 gap-y-1 ${
            open === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"
          } hover:brightness-95`}
        >
          <span className="font-semibold">Aannames {year}</span>
          <span>{open === 0 ? "Alles opgegeven" : `${open} ${open === 1 ? "aanname" : "aannames"} nog niet opgegeven`}</span>
          <span className="text-xs opacity-80">{(aannamesCard.lines || []).map((l) => `${l.label}: ${String(l.value).replace(/^\S+\s/, "")}`).join(" · ")}</span>
          <span className="ml-auto text-xs font-bold">Bekijk →</span>
        </button>
      )}
    </div>
  );
}

export default function DetailsPanel({
  year,
  cardsByKey,
  aannamesCard,
  dashboardAangifteIndicatie,
  rechtsvorm,
  vpbIndicatie,
  vpbBreakdown,
  holdingCard,
  winst,
  previousWinst,
  showTrend,
  onShowFullCalculation,
  zakCount,
  priCount,
  onJump,
}) {
  const [tab, setTab] = useState("jaaroverzicht");
  const btwQuarters = cardsByKey.btwQuarters;
  const loans = cardsByKey.loans;
  const leases = cardsByKey.leases;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="px-5 pt-4">
        <h3 className="text-sm font-bold text-slate-900 mb-2">Details en overzichten</h3>
        <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                tab === t.key ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 p-5">
        {/* v273 — voorheen werd dit hele paneel niet gerenderd zolang er geen activeYear was; nu
            toont het altijd de kop + sub-tabs, met deze neutrale lege-staat als body i.p.v. content
            die uitgaat van bestaande jaardata (zakCount/priCount/cardsByKey e.d.). */}
        {!year ? (
          <p className="text-sm text-slate-400 italic">Laad eerst een bankbestand of een eerder opgeslagen project (links onder bij "Beheer") om deze gegevens te zien.</p>
        ) : (
          <>
        {tab === "jaaroverzicht" && (
          rechtsvorm === "bv" ? (
            <div className="grid md:grid-cols-2 gap-4 items-start">
              {CardTile(holdingCard)}
              {CardTile(btwQuarters)}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 items-start">{CardTile(btwQuarters)}</div>
          )
        )}

        {tab === "transacties" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-600">
                {zakCount} zakelijke en {priCount} privé-transacties in {year}.
              </p>
              <LinkOut label="Bekijk detailoverzicht" onClick={() => onJump("details")} />
            </div>
            {/* v286 — op verzoek: hoeveel bestanden zakelijk/privé geladen zijn stond nergens, en of
                ze onderling matchen (overboekingen zakelijk ↔ privé) al helemaal niet op dit
                tabblad — zelfde kaart/berekening als op Controleren ("Controle zakelijk ↔ privé"). */}
            <div className="grid md:grid-cols-2 gap-4 items-start">{CardTile(cardsByKey.bestandenOverzicht)}</div>
          </div>
        )}

        {tab === "categorieen" && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">Categorieën zakelijk/privé, inclusief BTW per categorie voor {year}.</p>
            <LinkOut label="Bekijk categorieën" onClick={() => onJump("categorieen")} />
          </div>
        )}

        {tab === "activa" && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">Activa en afschrijving worden bij Instellingen bijgehouden.</p>
            <LinkOut label="Bekijk activa" onClick={() => onJump("activa")} />
          </div>
        )}

        {tab === "leningen" && (
          <div className="grid md:grid-cols-2 gap-4 items-start">
            {CardTile(loans)}
            <div className="flex items-center">
              <LinkOut label="Leningdetails bewerken" onClick={() => onJump("leningen")} />
            </div>
          </div>
        )}

        {tab === "lease" && (
          <div className="grid md:grid-cols-2 gap-4 items-start">
            {CardTile(leases)}
            <div className="flex items-center">
              <LinkOut label="Leasedetails bewerken" onClick={() => onJump("lease")} />
            </div>
          </div>
        )}

        {tab === "btw" && (
          <div className="grid md:grid-cols-2 gap-4 items-start">
            {CardTile(btwQuarters)}
            <div className="flex items-center">
              <LinkOut label="BTW-tarieven bekijken" onClick={() => onJump("btw")} />
            </div>
          </div>
        )}

        {tab === "rapportages" && (
          <div className="flex flex-wrap gap-3">
            <LinkOut label="Excel exporteren" onClick={() => onJump("excel")} />
            <LinkOut label="Print" onClick={() => onJump("print")} />
            <LinkOut label="Indicatieve aangifteberekening" onClick={() => onJump("aangifte")} />
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
