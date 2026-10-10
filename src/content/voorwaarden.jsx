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
      <ol className="space-y-1.5 mt-1">
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">2.1</span><span>De app is geen boekhoudprogramma, doet geen aangifte en geeft geen fiscaal, juridisch of financieel advies.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">2.2</span><span>Alle bedragen, aannames en uitkomsten zijn indicatief. Ze kunnen onvolledig of onjuist zijn, bijvoorbeeld door ontbrekende bankgegevens, een verkeerde indeling of een wijziging in de regels.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">2.3</span><span>De daadwerkelijke aangiften (IB, Zvw, BTW, Vpb) worden buiten deze app gedaan.</span></li>
      </ol>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">3. Jouw verantwoordelijkheid</h3>
      <ol className="space-y-1.5 mt-1">
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">3.1</span><span>Jij controleert de uitkomsten voordat je ze gebruikt.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">3.2</span><span>Jij bent verantwoordelijk voor wat je ermee doet: de gegevens die je laadt, de keuzes die je maakt, en elke aangifte, beslissing of advies die je op basis van de app geeft of neemt.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">3.3</span><span>Raadpleeg bij twijfel een belastingadviseur of accountant.</span></li>
      </ol>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">4. Gegevens en privacy</h3>
      <ol className="space-y-1.5 mt-1">
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">4.1</span><span><strong>Je bankgegevens blijven op je eigen apparaat.</strong> Bankbestanden worden in je eigen browser verwerkt en bewaard. De transacties en je administratieve gegevens worden niet naar een server gestuurd voor de analyse of de fiscale berekeningen. Daardoor kan de maker ze ook niet inzien of terugzetten.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">4.2</span><span><strong>Back-up en verlies van gegevens.</strong> Maak zelf een back-up met "Dossier opslaan". Wis je de browsergegevens (cache, websitegegevens) of werk je in een privévenster, dan zijn je bewaarde dossier en je akkoord op deze voorwaarden weg, en komt dit scherm opnieuw.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">4.3</span><span><strong>Wachtwoord en herstelcode.</strong> Bij een dossier met wachtwoord is de herstelcode de enige weg terug. Zonder wachtwoord en herstelcode is het dossier niet meer te openen.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">4.4</span><span><strong>Hulpvraag of feedback.</strong> Alleen als je zelf een hulpvraag of feedback verstuurt, gaat die tekst via Cloudflare naar de maker, samen met je naam (als je die invult), het releasenummer en het e-mailadres waarmee je bent ingelogd. Er worden geen dossiergegevens meegestuurd. Zet je klantgegevens in zo'n bericht, dan is dat je eigen keuze.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">4.5</span><span><strong>Internetverbinding.</strong> Verder maakt de app alleen verbinding met internet om de app zelf te laden (inloggen en bestanden via Cloudflare, lettertypen via Google Fonts) en om te controleren of er een nieuwe versie is. Daarbij gaan geen dossiergegevens mee.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">4.6</span><span><strong>Exports en projectbestanden.</strong> Je projectbestanden en exports (Dossier opslaan, Excel, rapporten) kunnen financiële en persoonlijke gegevens bevatten: bewaar ze zorgvuldig.</span></li>
      </ol>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">5. Toegang</h3>
      <p>
        Toegang tot de app is persoonlijk. Geef je inlog of de app niet door aan anderen zonder toestemming van de maker.
      </p>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">6. Aansprakelijkheid</h3>
      <ol className="space-y-1.5 mt-1">
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">6.1</span><span>De app wordt gebruikt zoals die is, zonder garantie op juistheid, volledigheid of geschiktheid voor een bepaald doel.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">6.2</span><span>Voor zover de wet dat toelaat is de maker niet aansprakelijk voor schade of nadeel dat voortvloeit uit het gebruik van de app of uit het vertrouwen op de uitkomsten, waaronder belastingaanslagen, boetes, rente, gemiste termijnen en verlies van gegevens.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">6.3</span><span>Een aansprakelijkheid die de wet niet kan uitsluiten, blijft bestaan.</span></li>
      </ol>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">7. Auteursrecht</h3>
      <ol className="space-y-1.5 mt-1">
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">7.1</span><span>De app, de teksten en de berekeningen zijn auteursrechtelijk beschermd. Alle rechten zijn voorbehouden aan Paul Gerits.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">7.2</span><span>Je krijgt een persoonlijk, niet-overdraagbaar gebruiksrecht.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">7.3</span><span>Kopiëren, verspreiden, doorverkopen of aanpassen van de app is zonder toestemming niet toegestaan.</span></li>
      </ol>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">8. Wijzigingen</h3>
      <p>
        De app en deze voorwaarden kunnen wijzigen. Bij een inhoudelijke wijziging vraagt de app opnieuw om akkoord.
      </p>
    </section>
  </div>
);
