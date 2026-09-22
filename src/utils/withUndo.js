// Kleine factory om een setState-functie "undo-baar" te maken: neemt eerst een momentopname
// (voor de "Ongedaan maken"-knop), past de wijziging dan pas toe. Gebruikt voor panelen die de
// raw setState-functie rechtstreeks doorkrijgen (CategoryRulesPanel, FixedCategoriesPanel,
// BtwRatesPanel, CounterpartyRulesPanel) zodat ook die wijzigingen ongedaan te maken zijn.
export function makeUndoWrapped(snapshotBeforeAction) {
  return (label, setter) => (updaterOrValue) => {
    snapshotBeforeAction(label);
    setter(updaterOrValue);
  };
}
