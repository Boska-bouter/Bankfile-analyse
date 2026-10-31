// Gebruiksvoorwaarden — getoond bij het eerste gebruik (per apparaat/browser) en terug te lezen in de Help.
// Bij een inhoudelijke wijziging: VOORWAARDEN_VERSIE ophogen, dan moet iedereen opnieuw akkoord gaan.
export const VOORWAARDEN_VERSIE = "11"; // beide-V12R8 — 4.8: inlogmomenten in beheerlogboek. beide-V7R3 — 4.8: antwoord peilvraag; 5: gratis abonnement 30 dagen en verlengen (V7R1: telefoon en organisatie)
export const VOORWAARDEN_SLEUTEL = "bankoverzicht-voorwaarden";

// beide-V1R9 — artikel 4 t/m 8 gelden voor zakelijk en privé; de privévoorwaarden (voorwaardenPrive.jsx) gebruiken ze ook.
export const VOORWAARDEN_ALGEMEEN = (
  <>
    <section>
      <h3 className="font-semibold text-slate-800">4. Gegevens en privacy</h3>
      <ol className="space-y-1.5 mt-1">
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">4.1</span><span><strong>Je dossier blijft op je eigen apparaat.</strong> De analyse, de indeling en de fiscale berekeningen gebeuren in je eigen browser. Je dossier wordt alleen daar bewaard, en in de bestanden die je zelf opslaat met "Dossier opslaan". Je transacties en administratieve gegevens worden niet op een server opgeslagen, dus de maker kan ze niet inzien of terugzetten. Op de server van de app bij Cloudflare staan alleen je accountgegevens (zie 4.8) en, als je de bankkoppeling gebruikt, kort de gegevens uit 4.7.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">4.2</span><span><strong>Back-up en verlies van gegevens.</strong> Maak zelf een back-up met "Dossier opslaan". Wis je de browsergegevens (cache, websitegegevens) of werk je in een privévenster, dan zijn je bewaarde dossier en je akkoord op deze voorwaarden weg, en komt dit scherm opnieuw.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">4.3</span><span><strong>Wachtwoord en herstelcode.</strong> Bij een dossier met wachtwoord is de herstelcode de enige weg terug. Zonder wachtwoord en herstelcode is het dossier niet meer te openen.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">4.4</span><span><strong>Hulpvraag of feedback.</strong> Alleen als je zelf een hulpvraag of feedback verstuurt, gaat die tekst via Cloudflare naar de maker, samen met je naam (als je die invult), het releasenummer en het e-mailadres waarmee je bent ingelogd. Er worden geen dossiergegevens meegestuurd. Zet je klantgegevens in zo'n bericht, dan is dat je eigen keuze.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">4.5</span><span><strong>Internetverbinding.</strong> Naast 4.4, 4.7 en 4.8 maakt de app alleen verbinding met internet om de app zelf te laden (de app-bestanden via Cloudflare, lettertypen via Google Fonts) en om te controleren of er een nieuwe versie is. Daarbij gaan geen dossiergegevens mee.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">4.6</span><span><strong>Exports en projectbestanden.</strong> Je projectbestanden en exports (Dossier opslaan, Excel, rapporten) kunnen financiële en persoonlijke gegevens bevatten: bewaar ze zorgvuldig.</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">4.7</span><span><strong>Bankkoppeling (op dit moment niet beschikbaar; alleen als je die zelf gebruikt).</strong> Koppel je een rekening rechtstreeks, dan geef je bij je eigen bank toestemming om je saldo en transacties te laten lezen. Dat loopt via Enable Banking of Ponto van Isabel Group (vergunninghoudende diensten voor rekeninginformatie onder de Europese PSD2-regels) en de server van de app bij Cloudflare. De server geeft de transacties direct door aan je browser en slaat ze niet op. Alleen om het koppelen af te ronden, bijvoorbeeld als de bank in een ander venster opent, bewaart de server maximaal 2 uur de namen en rekeningnummers van de gekoppelde rekeningen en een versleutelde koppelcode; daarna worden ze gewist. Om later opnieuw te kunnen ophalen, bewaart je dossier die versleutelde koppelcode; de app kan alleen lezen, nooit betalen. Gebruik je Ponto, dan gelden ook de voorwaarden van Ponto voor je Ponto-account. Je kunt een koppeling altijd intrekken met "Ontkoppelen" of bij je bank. De toestemming verloopt vanzelf na de termijn die je bank of Ponto hanteert (meestal 90 tot 180 dagen).</span></li>
        <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">4.8</span><span><strong>Inloggen en account.</strong> Voor je account bewaart de app op de server bij Cloudflare je e-mailadres, je voor- en achternaam, je organisatie (als je die opgeeft), je abonnement, je aanvraag en de reden die je daarbij opgeeft, je telefoonnummer (alleen om na te gaan of de aanvraag echt is; het wordt gewist zodra de aanvraag is goedgekeurd of afgewezen, en uiterlijk na 30 dagen), je antwoord op de vrijwillige vraag over betalen als je verlenging aanvraagt (bewaard tot je account wordt verwijderd), je wachtwoord (alleen als onomkeerbare hash, nooit leesbaar), je passkey (alleen het openbare deel, geen vingerafdruk of gezicht) je inlogsessie en wanneer je inlogt (datum, tijd en manier; de beheerder ziet dat in het beheerlogboek tot dat wordt opgeschoond). Inloglinks en berichten over je aanmelding worden per e-mail verstuurd via Cloudflare. Wil je je account laten verwijderen, neem dan contact op met de maker.</span></li>
      </ol>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">5. Toegang</h3>
      <p>
        Toegang tot de app is persoonlijk. Geef je inlog of de app niet door aan anderen zonder toestemming van de maker.
        Een gratis abonnement loopt 30 dagen vanaf de goedkeuring. Daarna kun je verlenging aanvragen; de maker beslist
        daarover. Je krijgt vooraf een herinnering. Na afloop kun je niet meer in de app werken, maar je dossiers blijven
        van jou: die bewaar je zelf als bestand.
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
  </>
);

export const VOORWAARDEN_INHOUD = (
  <div className="space-y-3">
    <section>
      <h3 className="font-semibold text-slate-800">1. Waarvoor is deze app bedoeld</h3>
      <p>
        BankafschriftenTool helpt om uit bankgegevens een administratie te reconstrueren en een <strong>indicatieve</strong>{" "}
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
    {VOORWAARDEN_ALGEMEEN}
  </div>
);
