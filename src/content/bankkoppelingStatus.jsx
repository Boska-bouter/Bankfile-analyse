// zakelijk-V7R2 — de rechtstreekse bankkoppeling is nog in ontwikkeling. Eén tekst voor de koppelvensters en meldingen;
// de Worker (aanmeldpagina, mails) heeft een eigen korte zin bij "Uitgebreid met bankkoppeling".
export const BANKKOPPELING_STATUS =
  "De rechtstreekse bankkoppeling is nog in ontwikkeling. Of en wanneer hij voor iedereen beschikbaar komt, hangt af van het aantal gebruikers: een koppeling met de banken brengt vaste kosten mee, die pas verantwoord zijn als genoeg mensen hem gebruiken. Tot die tijd werkt de app volledig met bankbestanden (CSV, MT940 of CAMT) die je zelf bij je bank downloadt.";

export function BankkoppelingStatus() {
  return <p className="rounded-veld border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">{BANKKOPPELING_STATUS}</p>;
}
