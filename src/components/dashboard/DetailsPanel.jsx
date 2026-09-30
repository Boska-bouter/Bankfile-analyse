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
        <h3 className="text-sm font-bold text-slate-900 mb-0.5">Details en overzichten</h3>
        <p className="text-[12.5px] text-slate-500 mb-3">
          Bekijk en beheer de volledige administratie. Gebruik de navigatie om snel naar het juiste onderdeel te gaan.
        </p>
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
          <p className="text-sm text-slate-400 italic">Laad eerst een bankbestand om deze gegevens te zien.</p>
        ) : (
          <>
        {tab === "jaaroverzicht" && (
          rechtsvorm === "bv" ? (
            // v282 — BV kent geen IB/Zvw-indicatie (dat bestaat alleen in de IB), maar wél een
            // eigen indicatieve Vpb-berekening plus (als er een holding is) de holding-boekingen
            // voor het actieve jaar — zelfde opzet als de zzp-kant hieronder.
            <div className="grid md:grid-cols-2 gap-4 items-start">
              <IndicatieveVpbCard
                year={year}
                winst={winst}
                vpbIndicatie={vpbIndicatie}
                breakdown={vpbBreakdown}
                showTrend={showTrend}
                prevWinst={previousWinst}
                onShowFullCalculation={onShowFullCalculation}
              />
              <div className="flex flex-col gap-4">
                {CardTile(holdingCard)}
                {CardTile(btwQuarters)}
              </div>
            </div>
          ) : dashboardAangifteIndicatie ? (
            <div className="grid md:grid-cols-2 gap-4 items-start">
              <IndicatieveAangifteCard
                year={year}
                winst={winst}
                indicatie={dashboardAangifteIndicatie}
                showTrend={showTrend}
                prevWinst={previousWinst}
                onShowFullCalculation={onShowFullCalculation}
              />
              <div className="flex flex-col gap-4">
                {CardTile(aannamesCard)}
                {CardTile(btwQuarters)}
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 items-start">{CardTile(btwQuarters)}</div>
          )
        )}

        {tab === "transacties" && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">
              {zakCount} zakelijke en {priCount} privé-transacties in {year}.
            </p>
            <LinkOut label="Bekijk detailoverzicht" onClick={() => onJump("details")} />
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
