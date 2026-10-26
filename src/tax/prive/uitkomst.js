// beide-V1R8 (fase 5) — de privéberekening van één jaar: box 1 (loon, uitkering, pensioen, eigen woning,
// aftrekposten), box 3, heffingskortingen, en de vergelijking met de ingehouden loonheffing (terug of
// bijbetalen). Alleen een indicatie.
//
// Invoer (bedragen per jaar, positief):
//   personen: [{ rol: "zelf"|"partner", loon, uitkering, pensioen, aow: bool, loonheffing: number|null }]
//     loon/uitkering/pensioen zijn wat op de bank binnenkwam (netto). Met de ingehouden loonheffing van de
//     jaaropgave rekenen we terug naar bruto; zonder schatten we de loonheffing (dan ligt de uitkomst dicht
//     bij nul, behalve het effect van aftrekposten).
//   woning: { woz, rente, vorm, startJaar } of null
//   aftrek: { giften, zorgkosten, lijfrente, partneralimentatie }
//   vermogen: { sparen, beleggen, schulden } of null (box 3 alleen als ingevuld)
import { belastingBox1 } from "./box1.js";
import { heffingskortingen } from "./heffingskortingen.js";
import { eigenWoning } from "./eigenWoning.js";
import { aftrekposten } from "./aftrekposten.js";
import { box3 } from "./box3.js";
import { besteVerdeling } from "./partner.js";
import { priveTariefStatus } from "./tarieven.js";
import { tariefStatusVoorJaar, combineerTariefStatus } from "../incomeTax.js";

const som = (p) => (p.loon || 0) + (p.uitkering || 0) + (p.pensioen || 0);

// Loonheffing die een werkgever/uitkeringsinstantie inhoudt bij dit bruto-inkomen (met heffingskortingen).
export function geschatteLoonheffing(bruto, aandeelLoon, jaar, aow) {
  if (!(bruto > 0)) return 0;
  const box1 = belastingBox1(bruto, jaar, { aow }).belasting;
  const k = heffingskortingen({ inkomen: bruto, arbeid: bruto * aandeelLoon, aow }, jaar).totaal;
  return Math.max(0, box1 - k);
}

// Bruto zoeken bij een netto bedrag: bruto − loonheffing(bruto) = netto (bisectie).
export function brutoUitNetto(netto, aandeelLoon, jaar, aow) {
  if (!(netto > 0)) return 0;
  let lo = netto, hi = netto * 3;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (mid - geschatteLoonheffing(mid, aandeelLoon, jaar, aow) < netto) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// beide-V2R8 — `zonderInhouding`: bruto inkomen waarop nog geen belasting is ingehouden (telt mee in het bruto,
// niet in de loonheffing).
function persoonBruto(p, jaar) {
  const netto = som(p);
  const zonder = Math.max(0, p.zonderInhouding || 0);
  const aandeelLoon = netto > 0 ? (p.loon || 0) / netto : 0;
  if (p.loonheffing != null && Number.isFinite(p.loonheffing)) {
    return { netto, zonderInhouding: zonder, bruto: netto + Math.max(0, p.loonheffing) + zonder, loonheffing: Math.max(0, p.loonheffing), geschat: false, aandeelLoon };
  }
  const bruto = brutoUitNetto(netto, aandeelLoon, jaar, !!p.aow);
  return { netto, zonderInhouding: zonder, bruto: bruto + zonder, loonheffing: bruto - netto, geschat: true, aandeelLoon };
}

export function berekenPriveJaar(invoer, jaar) {
  const personen = (invoer.personen || []).filter(Boolean);
  if (personen.length === 0) personen.push({ rol: "zelf" });
  const metPartner = personen.length > 1;
  const basis = personen.map((p) => ({ ...p, ...persoonBruto(p, jaar) }));
  const ew = invoer.woning ? eigenWoning(invoer.woning, jaar) : { forfait: 0, rente: 0, hillen: 0, saldo: 0 };
  const drempelinkomen = basis.reduce((a, p) => a + p.bruto, 0) + ew.saldo;
  const pga = aftrekposten(invoer.aftrek || {}, drempelinkomen, jaar);
  const b3 = invoer.vermogen ? box3(invoer.vermogen, jaar, metPartner ? 2 : 1) : null;

  const rekenPer = (v) => {
    const per = basis.map((p, i) => {
      const deel = (x) => (i === 0 ? x : 1 - x);
      const ewDeel = ew.saldo * deel(v.ew);
      const pgaDeel = pga.totaal * deel(v.pga);
      const belastbaar = p.bruto + ewDeel - pgaDeel;
      const aftrekDeel = Math.max(0, -ewDeel) + pgaDeel;
      const b1 = belastingBox1(belastbaar, jaar, { aow: !!p.aow, aftrek: aftrekDeel });
      const box3Deel = b3 ? b3.belasting * deel(v.box3) : 0;
      const box3Voordeel = b3 ? b3.voordeel * deel(v.box3) : 0;
      const kortingen = heffingskortingen({ inkomen: belastbaar + box3Voordeel, arbeid: p.bruto * p.aandeelLoon, aow: !!p.aow }, jaar);
      const ib = Math.max(0, b1.belasting + box3Deel - kortingen.totaal);
      return {
        rol: p.rol, aow: !!p.aow, netto: p.netto, bruto: p.bruto, zonderInhouding: p.zonderInhouding, brutoOpgegeven: p.brutoOpgegeven ?? null, loonheffing: p.loonheffing, loonheffingGeschat: p.geschat,
        eigenWoning: ewDeel, persoonsgebondenAftrek: pgaDeel, belastbaarBox1: belastbaar, belastingBox1: b1.belasting,
        beperkingAftrek: b1.beperking, box3: box3Deel, kortingen, ib, verschil: ib - p.loonheffing,
      };
    });
    return { per, totaal: per.reduce((a, p) => a + p.ib, 0) };
  };
  const { verdeling, uitkomst } = besteVerdeling(rekenPer, metPartner);
  const loonheffing = uitkomst.per.reduce((a, p) => a + p.loonheffing, 0);
  const tarieven = [tariefStatusVoorJaar(jaar).status, priveTariefStatus(jaar).status];
  return {
    jaar, metPartner, verdeling, personen: uitkomst.per, eigenWoning: ew, aftrekposten: pga, drempelinkomen, box3: b3,
    ib: uitkomst.totaal, loonheffing, loonheffingGeschat: uitkomst.per.some((p) => p.loonheffingGeschat),
    // positief = bijbetalen, negatief = terugkrijgen
    verschil: uitkomst.totaal - loonheffing,
    tariefStatus: combineerTariefStatus(tarieven),
  };
}
