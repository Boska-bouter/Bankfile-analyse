// beide-V1R8 (fase 5) — persoonsgebonden aftrek: giften (drempel en maximum), specifieke zorgkosten
// (drempel), lijfrentepremie en partneralimentatie. De drempels gaan over het gezamenlijke drempelinkomen
// van de fiscale partners. Lijfrente: zonder jaarruimte te kennen nemen we het betaalde bedrag (indicatie).
import { priveTarief } from "./tarieven.js";

export function giftenAftrek(giften, drempelinkomen, jaar) {
  if (!(giften > 0)) return 0;
  const t = priveTarief("aftrek", jaar).waarde;
  const ink = Math.max(0, drempelinkomen);
  const drempel = Math.max(t.giftenMin, ink * (t.giftenPct / 100));
  const max = ink * (t.giftenMaxPct / 100);
  return Math.max(0, Math.min(giften, max) - drempel);
}

export function zorgDrempel(drempelinkomen, jaar) {
  const t = priveTarief("aftrek", jaar).waarde;
  const ink = Math.max(0, drempelinkomen);
  if (ink <= t.zorgLaag) return t.zorgVast;
  if (ink <= t.zorgHoog) return ink * (t.zorgPct / 100);
  return t.zorgHoog * (t.zorgPct / 100) + (ink - t.zorgHoog) * (t.zorgExtraPct / 100);
}

export function zorgkostenAftrek(zorgkosten, drempelinkomen, jaar) {
  if (!(zorgkosten > 0)) return 0;
  return Math.max(0, zorgkosten - zorgDrempel(drempelinkomen, jaar));
}

// → { giften, zorgkosten, lijfrente, partneralimentatie, totaal } (alle bedragen positief = aftrek)
export function aftrekposten({ giften = 0, zorgkosten = 0, lijfrente = 0, partneralimentatie = 0 }, drempelinkomen, jaar) {
  const g = giftenAftrek(giften, drempelinkomen, jaar);
  const z = zorgkostenAftrek(zorgkosten, drempelinkomen, jaar);
  const l = Math.max(0, lijfrente || 0);
  const p = Math.max(0, partneralimentatie || 0);
  return { giften: g, zorgkosten: z, lijfrente: l, partneralimentatie: p, totaal: g + z + l + p };
}
