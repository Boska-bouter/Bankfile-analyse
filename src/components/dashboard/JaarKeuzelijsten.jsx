import { useEffect, useState } from "react";
import { TONE } from "./SectionCard.jsx";
import { toetsStartersaftrek } from "../../tax/startersaftrekToets.js";
import { heeftPrivegebruik } from "../../tax/privegebruikAuto500.js";

// Kaart "Persoonlijke aannames {jaar}" (Overzicht → Details en overzichten) met de keuzes direct in de kaart: de aannames per jaar
// die het totaal het meest beïnvloeden. Het zijn dezelfde instellingen als in Persoonlijke aannames (Instellingen) — een wijziging
// hier past het dossier aan (met "Ongedaan maken") en het totaal rekent direct mee.
const PCT_STAPPEN = Array.from({ length: 21 }, (_, i) => i * 5);

// Invoerveld dat live meerekent en toch de ingetypte tekst laat staan (bijv. "30." of "30,5"); wijzigt de waarde van buiten
// (bijv. door "Ongedaan maken" of een ander jaar), dan volgt het veld die.
function parseBedrag(t) {
  const x = String(t).trim();
  const v = parseFloat(x.includes(",") ? x.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(x) ? x.replace(/\./g, "") : x);
  return Number.isFinite(v) && v > 0 ? v : null;
}
function BedragVeld({ waarde, onChange, className }) {
  const [tekst, setTekst] = useState(waarde ?? "");
  useEffect(() => { if (parseBedrag(tekst) !== (waarde ?? null)) setTekst(waarde ?? ""); }, [waarde]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <input type="text" inputMode="decimal" placeholder="€ 0" value={tekst} className={className}
      onChange={(e) => { setTekst(e.target.value); onChange(e.target.value); }} />
  );
}

const veldCls = "w-44 max-w-[58%] rounded-lg border bg-white px-2 py-1 text-[13px] font-normal text-slate-800";
const normaal = "border-slate-300";
const open = "border-amber-400 bg-amber-50";

function Rij({ label, children, titel }) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-[30px]" title={titel}>
      <span className="text-[11.5px] text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function PctRij({ label, jaar, gedeelde, waarde, onSet }) {
  if (!gedeelde) return null;
  const huidig = waarde == null ? "" : Number(waarde);
  const opties = huidig !== "" && !PCT_STAPPEN.includes(huidig) ? [...PCT_STAPPEN, huidig].sort((a, b) => a - b) : PCT_STAPPEN;
  return (
    <Rij label={`${label} % zakelijk`}>
      <select key={`${label}-${jaar}`} value={huidig} className={`${veldCls} ${huidig === "" ? open : normaal}`}
        onChange={(e) => onSet(jaar, e.target.value === "" ? null : Number(e.target.value))}>
        <option value="">Niet ingevuld (100%)</option>
        {opties.map((p) => <option key={p} value={p}>{p}%</option>)}
      </select>
    </Rij>
  );
}

export default function AannamesKaart({
  card, year, rechtsvorm,
  zelfstandigenaftrekStatus, onSetZelfstandigenaftrekStatus, zaLegacyJaDefault,
  startersaftrekStatus, onSetStartersaftrekStatus,
  autoStatus,
  gedeeldeHuur, huurPct, onSetHuurPct,
  gedeeldeEnergie, energiePct, onSetEnergiePct,
  gedeeldeGemeentelijkeKosten, gemeentePct, onSetGemeentePct,
  privegebruikAutos = [], privegebruikBron, onSetPrivegebruik,
  kmVergoeding, onSetKmVergoedingField,
  overigInkomen, onSetOverigInkomen,
}) {
  if (!year) return null;
  const isBv = rechtsvorm === "bv";
  const t = TONE[card?.tone] || TONE.neutral;
  const raw = zelfstandigenaftrekStatus?.[year];
  const meldingen = isBv ? [] : toetsStartersaftrek(startersaftrekStatus, zelfstandigenaftrekStatus).meldingen;
  const autoTekst = autoStatus?.[year] === "zaak" ? "Op de zaak" : autoStatus?.[year] === "prive" ? "Privé zakelijk gebruikt" : "Niet opgegeven";
  const jaIds = privegebruikAutos.filter((a) => heeftPrivegebruik(a, year, privegebruikBron)).map((a) => a.id);
  const pgWaarde = jaIds.length === 0 ? "" : jaIds.length === 1 ? jaIds[0] : "meerdere";
  const enkel = privegebruikAutos.length === 1;
  return (
    <div className={`rounded-[20px] border ${t.border} bg-white p-4 flex flex-col gap-2 shadow-sm`} data-testid="jaar-keuzelijsten">
      <div className="flex items-center gap-2 mb-0.5">
        <div className={`rounded-full ${t.bg} flex items-center justify-center text-sm shrink-0`} style={{ width: 26, height: 26 }}>{card?.icon}</div>
        <span className="flex-grow text-[13px] font-bold text-slate-900 truncate">{card?.title || `Persoonlijke aannames ${year}`}</span>
      </div>
      {!isBv && (
        <>
          <Rij label="Urencriterium">
            <select key={`za-${year}`} value={raw == null ? "" : raw} className={`${veldCls} ${raw == null || raw === "onbekend" ? open : normaal}`}
              onChange={(e) => onSetZelfstandigenaftrekStatus(year, e.target.value || null)}>
              <option value="">{zaLegacyJaDefault ? "Niet aangegeven (rekent met Ja)" : "Niet aangegeven"}</option>
              <option value="ja">Ja, voldaan</option>
              <option value="nee">Nee</option>
              <option value="onbekend">Onbekend — beide scenario's</option>
            </select>
          </Rij>
          <Rij label="Startersaftrek">
            <select key={`st-${year}`} value={startersaftrekStatus?.[year] === "ja" ? "ja" : ""} className={`${veldCls} ${normaal}`}
              onChange={(e) => onSetStartersaftrekStatus(year, e.target.value || null)}>
              <option value="">Nee / n.v.t.</option>
              <option value="ja">Ja</option>
            </select>
          </Rij>
        </>
      )}
      <Rij label="Auto">
        <span className={`text-[13px] font-semibold ${autoStatus?.[year] ? t.text : "text-amber-700"}`}>{autoTekst}</span>
      </Rij>
      {autoStatus?.[year] === "zaak" && privegebruikAutos.length > 0 && (
        <Rij label={privegebruikAutos.every((a) => a.bron === "lease") ? "Privégebruik leaseauto?" : "Privégebruik auto?"}>
          <select key={`p500-${year}-${pgWaarde}`} value={pgWaarde} className={`${veldCls} ${normaal}`}
            onChange={(e) => onSetPrivegebruik(privegebruikAutos, e.target.value || null, year)}>
            <option value="">Nee</option>
            {privegebruikAutos.map((a) => <option key={a.id} value={a.id}>{enkel ? "Ja" : `Ja — ${a.kort}`}</option>)}
            {pgWaarde === "meerdere" && <option value="meerdere" disabled>Meerdere auto's</option>}
          </select>
        </Rij>
      )}
      {autoStatus?.[year] === "prive" && (
        <Rij label="Zakelijke kilometers">
          <input key={`zkm-${year}`} type="text" inputMode="decimal" placeholder="km per jaar" value={kmVergoeding?.zakelijkeKilometers ?? ""}
            onChange={(e) => { const v = e.target.value.replace(",", "."); if (/^\d*\.?\d*$/.test(v)) onSetKmVergoedingField(year, "zakelijkeKilometers", v); }}
            className={`${veldCls} ${normaal}`} />
        </Rij>
      )}
      {!isBv && (
        <Rij label="Overig inkomen box 1 (€/jaar)">
          <BedragVeld key={`overig-${year}`} waarde={overigInkomen} onChange={(tekst) => onSetOverigInkomen(year, tekst)} className={`${veldCls} ${normaal}`} />
        </Rij>
      )}
      <PctRij label="Huur" jaar={year} gedeelde={gedeeldeHuur} waarde={huurPct} onSet={onSetHuurPct} />
      <PctRij label="Energie-water" jaar={year} gedeelde={gedeeldeEnergie} waarde={energiePct} onSet={onSetEnergiePct} />
      <PctRij label="Gemeentelijke kosten" jaar={year} gedeelde={gedeeldeGemeentelijkeKosten} waarde={gemeentePct} onSet={onSetGemeentePct} />
      {meldingen.map((m, i) => (
        <p key={i} className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">⚠ {m}</p>
      ))}
      {card?.subtitle && (
        <div className="flex items-center justify-between gap-2 pt-1 mt-0.5 border-t border-slate-100">
          <p className={`text-[11.5px] ${card.tone === "attention" ? "text-amber-700" : "text-slate-500"}`}>{card.subtitle}</p>
          {card.onClick && <button type="button" onClick={card.onClick} className="text-[11.5px] font-bold text-teal-700 hover:underline">Alle aannames →</button>}
        </div>
      )}
    </div>
  );
}
