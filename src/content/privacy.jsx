// beide-V6R9 — alle privacyteksten op één plek, zodat ze overal hetzelfde zeggen (zijbalk, voettekst, wizards, help).
// De volledige afspraken staan in de gebruiksvoorwaarden, artikel 4 (content/voorwaarden.jsx); dit is de korte uitleg.

// Korte zin voor de zijbalk, de voettekst en de wizards.
export const PRIVACY_LABEL = "Bankgegevens blijven lokaal";
export const PRIVACY_KORT = "Bankgegevens en het dossier blijven in deze browser en gaan niet naar een server.";
export const PRIVACY_TITEL = `${PRIVACY_KORT} Account en inlog staan wel op de server; bij de bankkoppeling worden de boekingen alleen doorgegeven. Zie Help → Privacy, of de voorwaarden artikel 4.`;

// De drie onderdelen, voor de help en het welkomstscherm.
export const PRIVACY_BLOKKEN = [
  {
    titel: "Bankbestanden en dossier",
    tekst: "Worden alleen in deze browser verwerkt en bewaard: inlezen, indelen en alle berekeningen. Ze gaan niet naar een server, dus de maker kan ze niet inzien. \"Dossier opslaan\" maakt een eigen kopie als bestand, eventueel met wachtwoord.",
  },
  {
    titel: "Account",
    tekst: "E-mailadres, naam, organisatie, abonnement, de aanvraag, het telefoonnummer (alleen tot de aanvraag is beoordeeld, hooguit 30 dagen), het antwoord op de vrijwillige vraag over betalen bij verlengen, het wachtwoord (alleen onleesbaar versleuteld), de passkey (alleen het openbare deel) en het akkoord met de voorwaarden staan op de server van de app bij Cloudflare. Hulpvragen en feedback gaan alleen als ze zelf worden verstuurd per e-mail naar de maker, zonder dossiergegevens.",
  },
  {
    titel: "Bankkoppeling",
    tekst: "Loopt via Ponto en de server van de app. De boekingen worden direct doorgegeven aan deze browser en niet op de server bewaard. Alleen om het koppelen af te ronden staan de namen en nummers van de rekeningen hooguit 2 uur op de server. De koppelcode staat versleuteld in het dossier; de app kan alleen lezen, nooit betalen.",
  },
  {
    titel: "Zonder verbinding",
    tekst: "Is de server even niet bereikbaar, dan opent de laatst gebruikte versie van de app op dit apparaat: hooguit 7 dagen na het laatste bezoek en nooit na de einddatum van het abonnement. Na uitloggen is die bewaarde versie weg.",
  },
];

export function PrivacyBlokken() {
  return (
    <div className="space-y-2.5">
      {PRIVACY_BLOKKEN.map((b) => (
        <p key={b.titel}><strong>{b.titel}.</strong> {b.tekst}</p>
      ))}
      <p>Exports en dossierbestanden kunnen financiële en persoonlijke gegevens bevatten: bewaar ze zorgvuldig. De volledige afspraken staan in de gebruiksvoorwaarden, artikel 4.</p>
    </div>
  );
}
