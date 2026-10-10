// Gebruiksvoorwaarden — getoond bij het eerste gebruik (per apparaat/browser) en terug te lezen in de Help.
// Bij een inhoudelijke wijziging: VOORWAARDEN_VERSIE ophogen, dan moet iedereen opnieuw akkoord gaan.
export const VOORWAARDEN_VERSIE = "4";
export const VOORWAARDEN_SLEUTEL = "bankoverzicht-voorwaarden";

export const VOORWAARDEN_INHOUD = (
  <div className="space-y-3">
    <section>
      <h3 className="font-semibold text-slate-800">1. Waarvoor is deze app bedoeld</h3>
      <p>
        Bankoverzicht helpt om uit bankgegevens een administratie te reconstrueren en een <strong>indicatieve</strong>{" "}
        berekening te maken van winst, BTW en belasting. Het is een hulpmiddel voor wie zelf of namens een ander de
        administratie ordent, bijvoorbeeld voor een gesprek, een controle of de voorbereiding van een aangifte.
      </p>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">2. Wat de app niet is</h3>
      <p>
        De app is geen boekhoudprogramma, doet geen aangifte en geeft geen fiscaal, juridisch of financieel advies. Alle
        bedragen, aannames en uitkomsten zijn indicatief. Ze kunnen onvolledig of onjuist zijn, bijvoorbeeld door ontbrekende
        bankgegevens, een verkeerde indeling of een wijziging in de regels. De daadwerkelijke aangiften (IB, Zvw, BTW, Vpb)
        worden buiten deze app gedaan.
      </p>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">3. Jouw verantwoordelijkheid</h3>
      <p>
        Jij controleert de uitkomsten voordat je ze gebruikt, en jij bent verantwoordelijk voor wat je ermee doet: de
        gegevens die je laadt, de keuzes die je maakt, en elke aangifte, beslissing of advies die je op basis van de app
        geeft of neemt. Raadpleeg bij twijfel een belastingadviseur of accountant.
      </p>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">4. Gegevens en privacy</h3>
      <p>
        Je bankgegevens blijven op je eigen apparaat. Bankbestanden worden in je eigen browser verwerkt en bewaard; de transacties en je administratieve gegevens worden niet naar een server gestuurd voor de analyse of de fiscale berekeningen. Daardoor kan de
        maker ze ook niet inzien of terugzetten. Maak zelf een back-up met "Dossier opslaan". Wis je de browsergegevens (cache, websitegegevens) of werk je in een privévenster, dan zijn je bewaarde dossier en je akkoord op deze voorwaarden weg, en komt dit scherm opnieuw. Bij een dossier met wachtwoord
        is de herstelcode de enige weg terug; zonder wachtwoord en herstelcode is het dossier niet meer te openen. Alleen als je zelf een hulpvraag of feedback verstuurt, gaat die tekst via Cloudflare naar de maker, samen met je naam (als je die invult), het releasenummer en het e-mailadres waarmee je bent ingelogd; er worden geen dossiergegevens meegestuurd. Zet je klantgegevens in zo'n bericht, dan is dat je eigen keuze. Verder maakt de app alleen verbinding met internet om de app zelf te laden (inloggen en bestanden via Cloudflare, lettertypen via Google Fonts) en om te controleren of er een nieuwe versie is; daarbij gaan geen dossiergegevens mee. Je projectbestanden en exports (Dossier opslaan, Excel, rapporten) kunnen financiële en persoonlijke gegevens bevatten: bewaar ze zorgvuldig.
      </p>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">5. Toegang</h3>
      <p>
        Toegang tot de app is persoonlijk. Geef je inlog of de app niet door aan anderen zonder toestemming van de maker.
      </p>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">6. Aansprakelijkheid</h3>
      <p>
        De app wordt gebruikt zoals die is, zonder garantie op juistheid, volledigheid of geschiktheid voor een bepaald doel.
        Voor zover de wet dat toelaat is de maker niet aansprakelijk voor schade of nadeel dat voortvloeit uit het gebruik
        van de app of uit het vertrouwen op de uitkomsten, waaronder belastingaanslagen, boetes, rente, gemiste termijnen en
        verlies van gegevens. Een aansprakelijkheid die de wet niet kan uitsluiten, blijft bestaan.
      </p>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">7. Auteursrecht</h3>
      <p>
        De app, de teksten en de berekeningen zijn auteursrechtelijk beschermd. Alle rechten zijn voorbehouden aan Paul
        Gerits. Je krijgt een persoonlijk, niet-overdraagbaar gebruiksrecht. Kopiëren, verspreiden, doorverkopen of
        aanpassen van de app is zonder toestemming niet toegestaan.
      </p>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">8. Wijzigingen</h3>
      <p>
        De app en deze voorwaarden kunnen wijzigen. Bij een inhoudelijke wijziging vraagt de app opnieuw om akkoord.
      </p>
    </section>
  </div>
);
