import { toetsStartersaftrek } from "../../tax/startersaftrekToets.js";
import { leesPrivegebruik } from "../../tax/privegebruikAuto500.js";

// Keuzelijsten boven "Indicatieve aangifte {jaar}" (Overzicht → Details en overzichten): de aannames per jaar die het
// totaal het meest beïnvloeden, direct bij het totaal. Het zijn dezelfde instellingen als in "Persoonlijke aannames"
// (Instellingen) — een wijziging hier past het dossier aan (met "Ongedaan maken") en het totaal rekent direct mee.
const PCT_STAPPEN = Array.from({ length: 21 }, (_, i) => i * 5);

function Kies({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500 min-w-[9rem]">
      {label}
      {children}
    </label>
  );
}
const selectCls = "rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-800";

function PctKies({ label, jaar, gedeelde, waarde, onSet }) {
  if (!gedeelde) return null;
  const huidig = waarde == null ? "" : Number(waarde);
  const opties = huidig !== "" && !PCT_STAPPEN.includes(huidig) ? [...PCT_STAPPEN, huidig].sort((a, b) => a - b) : PCT_STAPPEN;
  return (
    <Kies label={`${label} % zakelijk`}>
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
  privegebruikAutos = [], privegebruikBron, onSetPrivegebruik,
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
            <Kies label="Urencriterium (zelfstandigenaftrek)">
              <select key={`za-${year}`} value={raw == null ? "" : raw} className={selectCls}
                onChange={(e) => onSetZelfstandigenaftrekStatus(year, e.target.value || null)}>
                <option value="">{zaLegacyJaDefault ? "Niet aangegeven (rekent met Ja)" : "Niet aangegeven (beide scenario's)"}</option>
                <option value="ja">Ja, voldaan</option>
                <option value="nee">Nee</option>
                <option value="onbekend">Onbekend — beide scenario's</option>
              </select>
            </Kies>
            <Kies label="Startersaftrek">
              <select key={`st-${year}`} value={startersaftrekStatus?.[year] === "ja" ? "ja" : ""} className={selectCls}
                onChange={(e) => onSetStartersaftrekStatus(year, e.target.value || null)}>
                <option value="">Nee / n.v.t.</option>
                <option value="ja">Ja</option>
              </select>
            </Kies>
          </>
        )}
        <Kies label="Auto">
          <select key={`auto-${year}`} value={autoStatus?.[year] || ""} className={selectCls}
            onChange={(e) => onSetAutoStatus(year, e.target.value || null)}>
            <option value="">Onbekend / niet aangegeven</option>
            <option value="zaak">Auto op de zaak</option>
            <option value="prive">Privéauto zakelijk (km-vergoeding)</option>
          </select>
        </Kies>
        {autoStatus?.[year] !== "prive" && privegebruikAutos.map((auto) => {
          const { ja, km } = leesPrivegebruik(auto, year, privegebruikBron);
          const kmGetal = parseFloat(String(km).replace(",", "."));
          return (
            <div key={auto.id} className="flex flex-wrap items-end gap-3">
              <Kies label={`Privégebruik > 500 km${privegebruikAutos.length > 1 ? ` — ${auto.naam}` : ""}`}>
                <select key={`p500-${auto.id}-${year}`} value={ja ? "ja" : "nee"} className={selectCls}
                  onChange={(e) => onSetPrivegebruik(auto, year, { ja: e.target.value === "ja" })}>
                  <option value="nee">Nee</option>
                  <option value="ja">Ja</option>
                </select>
              </Kies>
              {ja && (
                <Kies label="Privékilometers per jaar">
                  <input key={`km-${auto.id}-${year}`} type="text" inputMode="decimal" placeholder="bijv. 4.500" defaultValue={km}
                    onBlur={(e) => { const v = e.target.value.replace(",", "."); if (v === "" || /^\d*\.?\d*$/.test(v)) onSetPrivegebruik(auto, year, { km: v }); }}
                    className={`${selectCls} w-32`} />
                </Kies>
              )}
              {ja && Number.isFinite(kmGetal) && kmGetal > 0 && kmGetal <= 500 && (
                <p className="basis-full rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">⚠ {kmGetal} km is niet meer dan 500 km: dan geldt geen bijtelling. Kies "Nee" als dit klopt.</p>
              )}
            </div>
          );
        })}
        {!isBv && (
          <Kies label="Overig inkomen box 1 (€ per jaar)">
            <input key={`overig-${year}`} type="text" inputMode="decimal" placeholder="€ 0" defaultValue={overigInkomen ?? ""}
              onBlur={(e) => onSetOverigInkomen(year, e.target.value)}
              className={`${selectCls} w-36`} />
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
