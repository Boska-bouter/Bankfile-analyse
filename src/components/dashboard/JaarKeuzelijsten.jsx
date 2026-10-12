import { toetsStartersaftrek } from "../../tax/startersaftrekToets.js";
import { heeftPrivegebruik } from "../../tax/privegebruikAuto500.js";

// Keuzelijsten boven "Indicatieve aangifte {jaar}" (Overzicht → Details en overzichten): de aannames per jaar die het
// totaal het meest beïnvloeden, direct bij het totaal. Het zijn dezelfde instellingen als in "Persoonlijke aannames"
// (Instellingen) — een wijziging hier past het dossier aan (met "Ongedaan maken") en het totaal rekent direct mee.
const PCT_STAPPEN = Array.from({ length: 21 }, (_, i) => i * 5);

function Kies({ label, children, breed = "w-44", titel }) {
  return (
    <label className={`flex flex-col gap-1 text-[11px] font-semibold text-slate-500 ${breed}`} title={titel || label}>
      <span className="truncate">{label}</span>
      {children}
    </label>
  );
}
const selectCls = "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-800";

function PctKies({ label, jaar, gedeelde, waarde, onSet }) {
  if (!gedeelde) return null;
  const huidig = waarde == null ? "" : Number(waarde);
  const opties = huidig !== "" && !PCT_STAPPEN.includes(huidig) ? [...PCT_STAPPEN, huidig].sort((a, b) => a - b) : PCT_STAPPEN;
  return (
    <Kies label={`${label} % zakelijk`} breed="w-40">
      <select key={`${label}-${jaar}`} value={huidig} className={selectCls}
        onChange={(e) => onSet(jaar, e.target.value === "" ? null : Number(e.target.value))}>
        <option value="">Niet ingevuld (100%)</option>
        {opties.map((p) => <option key={p} value={p}>{p}%</option>)}
      </select>
    </Kies>
  );
}

export default function JaarKeuzelijsten({
  year, rechtsvorm,
  zelfstandigenaftrekStatus, onSetZelfstandigenaftrekStatus, zaLegacyJaDefault,
  startersaftrekStatus, onSetStartersaftrekStatus,
  autoStatus, onSetAutoStatus,
  gedeeldeHuur, huurPct, onSetHuurPct,
  gedeeldeEnergie, energiePct, onSetEnergiePct,
  gedeeldeGemeentelijkeKosten, gemeentePct, onSetGemeentePct,
  privegebruikAutos = [], privegebruikBron, onSetPrivegebruik, kmVergoeding, onSetKmVergoedingField,
  overigInkomen, onSetOverigInkomen,
}) {
  if (!year) return null;
  const isBv = rechtsvorm === "bv";
  const raw = zelfstandigenaftrekStatus?.[year];
  const meldingen = isBv ? [] : toetsStartersaftrek(startersaftrekStatus, zelfstandigenaftrekStatus).meldingen;
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-3" data-testid="jaar-keuzelijsten">
      <p className="text-xs font-bold text-slate-700 mb-2">
        Aannames {year} <span className="font-normal text-slate-400">· wijzigt het dossier, het totaal rekent direct mee</span>
      </p>
      <div className="flex flex-wrap gap-3">
        {!isBv && (
          <>
            <Kies label="Urencriterium" breed="w-56">
              <select key={`za-${year}`} value={raw == null ? "" : raw} className={selectCls}
                onChange={(e) => onSetZelfstandigenaftrekStatus(year, e.target.value || null)}>
                <option value="">{zaLegacyJaDefault ? "Niet aangegeven (rekent met Ja)" : "Niet aangegeven (beide scenario's)"}</option>
                <option value="ja">Ja, voldaan</option>
                <option value="nee">Nee</option>
                <option value="onbekend">Onbekend — beide scenario's</option>
              </select>
            </Kies>
            <Kies label="Startersaftrek" breed="w-36">
              <select key={`st-${year}`} value={startersaftrekStatus?.[year] === "ja" ? "ja" : ""} className={selectCls}
                onChange={(e) => onSetStartersaftrekStatus(year, e.target.value || null)}>
                <option value="">Nee / n.v.t.</option>
                <option value="ja">Ja</option>
              </select>
            </Kies>
          </>
        )}
        <Kies label="Auto" breed="w-56">
          <select key={`auto-${year}`} value={autoStatus?.[year] || ""} className={selectCls}
            onChange={(e) => onSetAutoStatus(year, e.target.value || null)}>
            <option value="">Onbekend / niet aangegeven</option>
            <option value="zaak">Auto op de zaak</option>
            <option value="prive">Privéauto zakelijk (km-vergoeding)</option>
          </select>
        </Kies>
        {autoStatus?.[year] === "zaak" && privegebruikAutos.length > 0 && (() => {
          const jaIds = privegebruikAutos.filter((a) => heeftPrivegebruik(a, year, privegebruikBron)).map((a) => a.id);
          const waarde = jaIds.length === 0 ? "" : jaIds.length === 1 ? jaIds[0] : "meerdere";
          const enkel = privegebruikAutos.length === 1;
          return (
            <Kies label={privegebruikAutos.every((a) => a.bron === "lease") ? "Privégebruik leaseauto?" : "Privégebruik auto?"} breed="w-44">
              <select key={`p500-${year}-${waarde}`} value={waarde} className={selectCls}
                onChange={(e) => onSetPrivegebruik(privegebruikAutos, e.target.value || null, year)}>
                <option value="">Nee</option>
                {privegebruikAutos.map((a) => <option key={a.id} value={a.id}>{enkel ? "Ja" : `Ja — ${a.kort}`}</option>)}
                {waarde === "meerdere" && <option value="meerdere" disabled>Meerdere auto's</option>}
              </select>
            </Kies>
          );
        })()}
        {autoStatus?.[year] === "prive" && (
          <Kies label="Zakelijke kilometers" breed="w-36">
            <input key={`zkm-${year}`} type="text" inputMode="decimal" placeholder="km per jaar" value={kmVergoeding?.zakelijkeKilometers ?? ""}
              onChange={(e) => { const v = e.target.value.replace(",", "."); if (/^\d*\.?\d*$/.test(v)) onSetKmVergoedingField(year, "zakelijkeKilometers", v); }}
              className={selectCls} />
          </Kies>
        )}
        {!isBv && (
          <Kies label="Overig inkomen box 1 (€/jaar)" breed="w-44">
            <input key={`overig-${year}`} type="text" inputMode="decimal" placeholder="€ 0" defaultValue={overigInkomen ?? ""}
              onBlur={(e) => onSetOverigInkomen(year, e.target.value)}
              className={selectCls} />
          </Kies>
        )}
        <PctKies label="Huur" jaar={year} gedeelde={gedeeldeHuur} waarde={huurPct} onSet={onSetHuurPct} />
        <PctKies label="Energie-water" jaar={year} gedeelde={gedeeldeEnergie} waarde={energiePct} onSet={onSetEnergiePct} />
        <PctKies label="Gemeentelijke kosten" jaar={year} gedeelde={gedeeldeGemeentelijkeKosten} waarde={gemeentePct} onSet={onSetGemeentePct} />
      </div>
      {meldingen.map((m, i) => (
        <p key={i} className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">⚠ {m}</p>
      ))}
    </div>
  );
}
