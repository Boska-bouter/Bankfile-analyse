// beide-V1R8 (fase 6) — korte regels over het huishouden uit de antwoorden van de privéwizard, voor het
// dossierprofiel (Instellingen) en de samenvatting. Leest de labels uit de vragenlijst zelf.
import { PRIVE_WIZARD_STAPPEN } from "./wizard.js";

const vraag = (key) => PRIVE_WIZARD_STAPPEN.flatMap((s) => s.vragen).find((v) => v.key === key);
const labelVan = (key, w) => vraag(key)?.opties?.find((o) => o.waarde === w)?.label || null;
const lijst = (key, ws) => (Array.isArray(ws) && ws.length ? ws.map((w) => labelVan(key, w) || w).join(", ") : null);

export function huishoudenRegels(a = {}) {
  const r = [];
  if (a.partner === "ja") r.push("Met fiscale partner");
  else if (a.partner === "nee") r.push("Geen fiscale partner");
  else r.push("Fiscale partner: nog niet opgegeven");
  const ink = lijst("inkomen", a.inkomen);
  r.push(ink ? `Inkomen: ${ink}` : "Inkomen: nog niet opgegeven");
  if (a.partner === "ja") { const ip = lijst("inkomenPartner", a.inkomenPartner); if (ip) r.push(`Inkomen partner: ${ip}`); }
  const w = labelVan("wonen", a.wonen);
  r.push(w ? `Wonen: ${w}${a.hypotheekVorm ? ` (${labelVan("hypotheekVorm", a.hypotheekVorm).toLowerCase()}${a.hypotheekStart ? `, sinds ${a.hypotheekStart}` : ""})` : ""}` : "Wonen: nog niet opgegeven");
  const v = labelVan("vermogen", a.vermogen);
  if (v) r.push(`Spaargeld/beleggen boven de vrijstelling: ${v.toLowerCase()}`);
  return r;
}
