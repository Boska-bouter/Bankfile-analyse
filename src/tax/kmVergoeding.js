// Kilometervergoeding voor een privéauto die zakelijk wordt gebruikt (autoStatus "prive" of
// "beide" — zie de wizard-vraag "Heeft de zaak een auto?" in SetupWizardModal.jsx en de
// "Auto-status"-vraag per jaar in Persoonlijke aannames/App.jsx). Anders dan bij "auto op de zaak"
// (financial lease/koop/operational lease, zie autoBijtelling.js/autoActiva.js) is er hier geen
// bedrijfsmiddel om af te schrijven en geen bijtelling: de zakelijke kilometers worden vergoed
// tegen een vast bedrag per kilometer, dat als kostenpost aftrekbaar is, ongeacht wat de werkelijke
// autokosten zijn. De aftrek zelf komt hier niet uit banktransacties (het is geen aparte
// bankbetaling, tenzij de gebruiker zichzelf daadwerkelijk een vergoeding overmaakt — dat zou dan
// als "Uitbetaling aan prive" al meetellen en is geen dubbele aftrek, want deze functie berekent
// een NOTIONELE aftrekpost los van de bank).
//
// Volledig opt-in en 100% backwards compatible: 0/null zolang er niets is ingevuld bij
// kmVergoedingDetails, dus geen enkele invloed op een bestaand dossier.
export function computeKmVergoedingVoorJaar(kmVergoedingDetails, autoStatus, year) {
  const status = autoStatus?.[year];
  if (status !== "prive" && status !== "beide") return null;
  const details = kmVergoedingDetails?.[year];
  if (!details || !details.zakelijkeKilometers || !details.vergoedingPerKm) return null;
  const zakelijkeKilometers = Number(details.zakelijkeKilometers);
  const vergoedingPerKm = Number(details.vergoedingPerKm);
  const bedrag = zakelijkeKilometers * vergoedingPerKm;
  if (!(bedrag > 0)) return null;
  return { zakelijkeKilometers, vergoedingPerKm, bedrag };
}
