// beide-V1R8 (fase 5) — verdeling van gezamenlijke posten tussen fiscale partners: het saldo eigen woning,
// de persoonsgebonden aftrek en de grondslag box 3 mogen vrij verdeeld worden. Standaard kiezen we de
// verdeling met de laagste totale belasting (zoals de aangiftesoftware van de Belastingdienst ook voorstelt).
export const EW_DELEN = [0, 0.25, 0.5, 0.75, 1];
export const PGA_DELEN = [0, 1];
export const BOX3_DELEN = [0, 0.5, 1];

// rekenPer(verdeling) → { totaal, ... } ; verdeling = { ew, pga, box3 } = aandeel van persoon 1 (0..1)
export function besteVerdeling(rekenPer, metPartner) {
  if (!metPartner) return { verdeling: { ew: 1, pga: 1, box3: 1 }, uitkomst: rekenPer({ ew: 1, pga: 1, box3: 1 }) };
  let beste = null;
  for (const ew of EW_DELEN) for (const pga of PGA_DELEN) for (const b3 of BOX3_DELEN) {
    const verdeling = { ew, pga, box3: b3 };
    const uitkomst = rekenPer(verdeling);
    if (!beste || uitkomst.totaal < beste.uitkomst.totaal - 0.005) beste = { verdeling, uitkomst };
  }
  return beste;
}
