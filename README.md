# Bankoverzicht — Zakelijk & Privé (Vite/React)

Bankbestandanalyse-tool voor Over Rood schuldhulpverlening: verwerkt CSV/Excel/MT940-bankexports
voor ZZP/eenmanszaak, met automatische classificatie, BTW-berekening, jaaroverzicht en een
aangiftevoorstel. Bankgegevens en dossiers worden alleen lokaal in de browser verwerkt; account, inlog,
rechten en de bankkoppeling lopen via een Cloudflare Worker (zie Privacy).

Live: https://boska-bouter.github.io/Bankfile-analyse/

Dit is de Vite/React-opvolger van de oorspronkelijke standalone `index.html`
(https://boska-bouter.github.io/Bankfile-inzicht/). De migratie is voltooid: alle functionaliteit
van de oorspronkelijke tool is overgezet, plus een aantal nieuwe verbeteringen (zie hieronder).

## Functionaliteit

- **Import**: CSV, Excel (.xlsx), MT940, CAMT.053 (XML).
- **Classificatie**: automatische indeling op basis van tegenpartij/omschrijving-zoekwoorden,
  met handmatige correcties die tegenpartij-breed (alle jaren) worden onthouden.
- **Categorieën**: een laag van ~14 hoofdcategorieën voor het overzicht (Huisvesting, Vervoer & auto,
  Personeel, Belastingen & heffingen, Privé, ...), met de fijnmazige subtypes (Brandstof, Parkeren,
  Belastingen: LH, ...) behouden onder de motorkap voor BTW-percentage, vast/variabel-indeling en
  fiscale precisie. Zie `src/classification/categories.js` (`SUBTYPE_TO_MAIN`).
- **BTW**: percentage per subtype, kwartaaloverzicht (netto + BTW-uitsplitsing), KOR- en
  BTW-verlegd-instelling, voorbelasting.
- **Jaaroverzicht**: winst uit onderneming, geschat IB, tekort/over, meerjarenoverzicht met trend,
  vaste/variabele kosten.
- **Reviewstappen**: inkomstenbronnen, overboekingen aan personen, "Overig" opruimen, factuurperiode
  vs. boekingskwartaal.
- **Leningen & lease**: rente/aflossing-splitsing per betaling (leningbedrag + startdatum + rente),
  operationeel vs. financieel.
- **Aangifte**: checklist, uitleg "wat waar invullen bij OB/IB", aangiftevoorstel met voorvertoning
  (download/printen).
- **Overig**: "Werk te doen"-dashboard met voortgang per jaar, ongedaan maken (laatste actie),
  duplicaatdetectie, saldo-per-bestand-controle, terugkerende betalingen, project opslaan/laden,
  automatisch bewaren per browser, Help-systeem met per-onderdeel "?"-uitleg.

## Projectstructuur

```
src/
├── App.jsx              — hoofdcomponent: state, coördinatie tussen alle panelen
├── classification/       — categorieregels, classificatie-engine, hoofdcategorie-mapping
├── importers/             — CSV/Excel/MT940-parsing, kolomherkenning, duplicaatdetectie
├── tax/                   — BTW, IB-schatting, leningen/lease, checklist, jaaroverzicht
├── storage/               — browser-opslag, projectbestand-formaat
├── reports/               — Excel-export, aangiftevoorstel, printen
├── content/               — Help-teksten (gedeeld tussen het Help-paneel en de "?"-pop-ups)
└── components/            — UI, per domein (overview, btw, review, loans, settings, dashboard, shared)
```

`App.jsx` is met opzet nog de centrale coördinator (state + doorgeven aan panelen). Een verdere
opsplitsing in bijv. React Context/hooks staat op de planning zodra dat nodig wordt.

## Lokaal draaien

```bash
npm install
npm run dev       # lokale ontwikkelserver
npm run build     # productie-build naar dist/
```

## Deployen

De workflow in `.github/workflows/deploy.yml` bouwt en publiceert automatisch naar GitHub Pages
bij elke push naar `main`. Eenmalig nodig: onder repo-instellingen → Pages → bron instellen op de
`gh-pages`-branch (die de workflow aanmaakt bij de eerste run). Controleer ook `base` in
`vite.config.js` — die moet overeenkomen met je repo-naam.

### Bijwerken zonder handmatig cache legen

`index.html` krijgt bij elke build cache-control-meta's mee zodat browsers die niet vasthouden
(de gehashte JS/CSS-bestanden zelf blijven wél veilig gecachet — hun bestandsnaam verandert
vanzelf bij elke wijziging). Daarnaast schrijft `vite.config.js` bij elke build een `version.json`
met een tijdstempel; de draaiende app (`src/hooks/useVersionCheck.js`) vergelijkt die periodiek
met zijn eigen build-tijdstempel en toont een "Nu bijwerken"-melding met één knop zodra er een
nieuwere versie beschikbaar is. Gebruikers hoeven dus niets over browsercache te weten — dit werkt
volledig automatisch bij elke `npm run build`, geen extra stap nodig.

## Privacy

Dezelfde uitleg als in de app (`src/content/privacy.jsx`, voorwaarden artikel 4 in `src/content/voorwaarden.jsx`):

- **Bankbestanden en dossier**: alleen in de browser verwerkt en bewaard (`window.storage`-polyfill). Ze gaan
  niet naar de server. "Dossier opslaan" maakt een bestand op het apparaat, eventueel met wachtwoord.
- **Account** (Worker + D1, `worker/rechten.js`, `worker/inloggen.js`): e-mailadres, naam, organisatie,
  abonnement en einddatum, aanvraag (telefoonnummer hooguit 30 dagen), wachtwoord-hash, openbare deel van de
  passkey, sessies, akkoord met de voorwaarden, antwoord op de peilvraag en het beheerlogboek.
- **Feedback/hulpvragen** (`/api/feedback`): alleen wat de gebruiker zelf verstuurt, per e-mail naar de maker,
  zonder dossiergegevens.
- **Bankkoppeling** (`worker/bank.js`, `worker/ponto.js`): de Worker geeft boekingen door aan de browser en
  bewaart ze niet; rekeningnamen en -nummers hooguit 2 uur om het koppelen af te ronden. De koppelcode staat
  versleuteld in het dossier.
- **Tarieven** (`/api/tarieven`): de app haalt het tarievenbestand op; er gaat niets van de gebruiker heen.
- **Zonder verbinding (noodmodus, `src/noodmodus/sw.js`)**: de laatst gebruikte versie van de app opent hooguit
  7 dagen na het laatste bezoek en nooit na de einddatum van het abonnement; uitloggen wist die versie. De
  rechten in de app schermen schermen af, ze beveiligen geen gegevens: alle berekeningen draaien in de browser.

## Bekende openstaande punten

- Een zichtbaar zekerheids-/confidence-systeem in de UI is aanwezig (`src/classification/confidence.js`,
  aangesloten via het paneel "Classificatiezekerheid")
- Tegenpartijregels zijn expliciet beheerbaar (`CounterpartyRulesPanel`) en werken op IBAN waar het
  bankbestand die bevat
- Importcontrole-scherm aanwezig (samenvattend overzicht vóór classificatie, met saldo-aansluiting
  per bestand en tussen bestanden)
- `App.jsx` verder opsplitsen naarmate de tool groeit — staat nog open

## Tests (sinds beide-V1R0)

De map `tests/` zit niet in de release-zip (`bankoverzicht-beide-VYRX.zip`), wel in de bronzip
(`releases/bron/bankoverzicht-beide-VYRX-bron.zip`). Bij elke release draaien `npm test`, `npm run test:e2e`,
`npm run build && npm run test:noodmodus` en `npm run test:reis` (de hele gebruikersreis van aanmelden tot verlengen,
zie `tests/e2e/LEESMIJ.md`); zonder de map `tests/` werken die scripts niet.

`npm test` draait de tests in `tests/`: een vaste controle dat de zakelijke berekening niet verandert
(`tests/vastgelegd/zakelijk.json`), het dossierprofiel (`src/modus/`) en de rechten per soort in de Worker.
