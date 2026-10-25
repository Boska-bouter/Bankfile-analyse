// beide-V1R8 (fase 5) — eigen woning: eigenwoningforfait (percentage van de WOZ-waarde), aftrekbare
// hypotheekrente en de aftrek wegens geen of geringe eigenwoningschuld (Hillen).
import { priveTarief } from "./tarieven.js";

export function eigenwoningforfait(woz, jaar) {
  if (!(woz > 0)) return 0;
  const t = priveTarief("woning", jaar).waarde;
  if (woz <= t.villagrens) return woz * (t.forfaitPct / 100);
  return t.villagrens * (t.forfaitPct / 100) + (woz - t.villagrens) * (t.villaPct / 100);
}

// Renteaftrek alleen bij annuïtair of lineair aflossen voor leningen vanaf 2013; daarvoor ook aflossingsvrij.
export function renteAftrekbaar(vorm, startJaar) {
  if (vorm !== "aflossingsvrij") return true;
  return !(startJaar >= 2013);
}

// → { forfait, rente, hillen, saldo } — saldo = belastbaar inkomen uit eigen woning (negatief = aftrek).
export function eigenWoning({ woz = 0, rente = 0, vorm = null, startJaar = null }, jaar) {
  const forfait = eigenwoningforfait(woz, jaar);
  const r = renteAftrekbaar(vorm, startJaar) ? Math.max(0, rente || 0) : 0;
  const t = priveTarief("woning", jaar).waarde;
  const hillen = forfait > r ? (forfait - r) * (t.hillenPct / 100) : 0;
  return { forfait, rente: r, hillen, saldo: forfait - r - hillen };
}
