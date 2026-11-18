// Kilometervergoeding voor een privéauto die zakelijk wordt gebruikt (autoStatus "prive" — zie de wizard-vraag "Heeft de zaak een auto?" in SetupWizardModal.jsx en de
// "Auto-status"-vraag per jaar in Persoonlijke aannames/App.jsx). Anders dan bij "auto op de zaak"
// (financiële lease/koop/operationele lease, zie autoBijtelling.js/autoActiva.js) is er hier geen
// bedrijfsmiddel om af te schrijven en geen bijtelling: de zakelijke kilometers worden vergoed
// tegen een vast bedrag per kilometer, dat als kostenpost aftrekbaar is, ongeacht wat de werkelijke
// autokosten zijn. De aftrek zelf komt hier niet uit banktransacties (het is geen aparte
// bankbetaling, tenzij de gebruiker zichzelf daadwerkelijk een vergoeding overmaakt — dat zou dan
// als "Uitbetaling aan prive" al meetellen en is geen dubbele aftrek, want deze functie berekent
// een NOTIONELE aftrekpost los van de bank).
//
// Volledig opt-in en 100% backwards compatible: 0/null zolang er niets is ingevuld bij
// kmVergoedingDetails, dus geen enkele invloed op een bestaand dossier.
// beide-V8R4 — zonder ingevuld bedrag per km rekent de app met het fiscale maximum van dat jaar (en nooit met meer). Eenvoudig vraagt alleen de
// kilometers; voorheen telden die dan niet mee (vergelijking Houtman 27-10: 20.000 km zonder aftrek).
// nieuw-V8R1 — tabel vanaf 2021, 2026 naar € 0,25 (Boska 18-11).
export const KM_MAX = { 2021: 0.19, 2022: 0.19, 2023: 0.21, 2024: 0.23, 2025: 0.23, 2026: 0.25 };
// nieuw-V8R1 — een nieuw jaar (bijv. 2027) komt via het tarievenbestand (Beheer → Tarieven, veld kmVergoeding) of een release.
// Zolang het ontbreekt, vult de app het veld niet zelf in (kmBekend) en rekent hij met het laatst bekende jaar.
// Oude jaren blijven in de tabel staan (oude dossiers).
export const kmBekend = (year) => KM_MAX[Number(year)] != null;
export function kmMaxVoorJaar(year) {
  const jaren = Object.keys(KM_MAX).map(Number).sort((a, b) => a - b);
  const j = Number(year);
  if (KM_MAX[j] != null) return KM_MAX[j];
  return j > jaren[jaren.length - 1] ? KM_MAX[jaren[jaren.length - 1]] : KM_MAX[jaren[0]];
}
export function computeKmVergoedingVoorJaar(kmVergoedingDetails, autoStatus, year) {
  const status = autoStatus?.[year];
  if (status !== "prive") return null;
  const details = kmVergoedingDetails?.[year];
  if (!details || !details.zakelijkeKilometers) return null;
  const zakelijkeKilometers = Number(details.zakelijkeKilometers);
  // Meer dan het fiscale maximum is niet aftrekbaar: dan telt het maximum.
  const vergoedingPerKm = Number(details.vergoedingPerKm) > 0 ? Math.min(Number(details.vergoedingPerKm), kmMaxVoorJaar(year)) : kmMaxVoorJaar(year);
  const bedrag = zakelijkeKilometers * vergoedingPerKm;
  if (!(bedrag > 0)) return null;
  return { zakelijkeKilometers, vergoedingPerKm, bedrag };
}
