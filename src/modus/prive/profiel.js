// beide-V1R0 — het privéprofiel. Nog niet te kiezen: een dossier wordt pas privé vanaf fase 2 (Nieuw dossier →
// Zakelijk of Privé). De categorieën, wizard, kaarten en berekening worden in de volgende fases gevuld.
// Alle zakelijke onderdelen staan uit: ze worden in privé verborgen, niet leeg getoond.
export const PRIVE_PROFIEL = Object.freeze({
  soort: "prive",
  naam: "Privé",
  categorieen: null, // fase 3: modus/prive/categorieen.js
  wizard: null, // fase 4: modus/prive/wizard.js
  // fase 6 vult deze lijsten met de privékaarten; tot die tijd alleen de algemene controlekaarten.
  kaarten: Object.freeze({
    overzicht: ["confidence", "personReview", "overigReview", "duplicates", "bestandenOverzicht"],
    controleren: ["importControle", "confidence", "personReview", "overigReview", "duplicates"],
    instellingen: ["aannames"],
  }),
  // Rekeningen: in privé is elke rekening privé; niet vragen.
  rekeningen: Object.freeze({ vraagSoort: false, standaard: "Prive" }),
  berekening: "prive", // fase 5: tax/prive/
  rapport: "prive", // fase 7: reports/aangiftevoorstel-prive.js
  onderdelen: Object.freeze({
    btw: false, omzet: false, activa: false, auto: false, lease: false, holding: false, ondernemersaftrek: false, vpb: false,
    budget: true, eigenWoning: true, box3: true, partner: true,
  }),
});
