// beide-V1R8 (fase 5) — belasting box 1 over inkomen uit werk en woning. Schijven uit incomeTax.js
// (IB_TARIEVEN_BY_YEAR, met eigen aanpassingen via de tarieveneditor); voor AOW-gerechtigden een lagere
// eerste schijf (aowTarief).
import { resolveTariefGroep } from "../incomeTax.js";
import { priveTarief } from "./tarieven.js";

export function schijvenVoor(jaar, aow = false) {
  const { waarde: t, status } = resolveTariefGroep("ib", jaar);
  if (!aow) return { schijven: t.brackets, beperkingPct: t.aftrekBeperkingPct || 0, status };
  const a = priveTarief("aow", jaar).waarde;
  const rest = t.brackets.filter((b) => b.tot > a.tot);
  return { schijven: [{ tot: a.tot, tarief: a.tarief }, ...rest], beperkingPct: t.aftrekBeperkingPct || 0, status };
}

export function belastingOverSchijven(bedrag, schijven) {
  if (!(bedrag > 0)) return 0;
  let belasting = 0;
  let vorige = 0;
  for (const s of schijven) {
    const deel = Math.min(bedrag, s.tot) - vorige;
    if (deel > 0) belasting += deel * s.tarief;
    vorige = s.tot;
    if (bedrag <= s.tot) break;
  }
  return belasting;
}

// Belasting over het belastbaar inkomen box 1. `aftrek` = het deel van de aftrekposten (hypotheekrente,
// persoonsgebonden aftrek) dat al van het inkomen af is: het deel daarvan dat in de hoogste schijf valt,
// geeft maar voordeel tegen het maximale aftrektarief (beperking aftrekposten).
export function belastingBox1(belastbaar, jaar, { aow = false, aftrek = 0 } = {}) {
  const { schijven, beperkingPct, status } = schijvenVoor(jaar, aow);
  const b = Math.max(0, belastbaar || 0);
  const basis = belastingOverSchijven(b, schijven);
  const topGrens = schijven.length > 1 ? schijven[schijven.length - 2].tot : 0;
  const toptarief = schijven[schijven.length - 1].tarief;
  const verschil = beperkingPct ? Math.max(0, toptarief - beperkingPct / 100) : 0;
  const zonderAftrek = b + Math.max(0, aftrek || 0);
  const inTop = Math.max(0, Math.min(Math.max(0, aftrek || 0), zonderAftrek - topGrens));
  const beperking = inTop * verschil;
  return { belasting: basis + beperking, beperking, status };
}
