# BankafschriftenTool (Vite/React + Cloudflare Worker)

Hulpmiddel voor hulpverleners en bewindvoerders om uit bankgegevens een administratie te reconstrueren, te controleren en
fiscale uitkomsten voor te bereiden. Bankgegevens en dossiers worden alleen lokaal in de browser verwerkt; account, inlog,
rechten, tarieven en de bankkoppeling lopen via een Cloudflare Worker (zie Privacy).

Live: https://bankafschriftentool.app

## Wat de app kan

- **Import**: CSV, Excel (.xlsx), MT940 en CAMT.053, met controle op saldo-aansluiting, ontbrekende periodes en dubbele boekingen.
- **Drie soorten dossier**: zakelijk (eenmanszaak/zzp of BV), privé en huishoudboekje; elk in de weergave Eenvoudig of Uitgebreid.
- **Indeling**: automatisch op zoekwoorden, tegenpartij, IBAN en eerdere keuzes (punten per zoekwoord, twijfel = controleren).
  Eigen correcties per boeking, per tegenpartij of via zoeken (vastgelegde boekingen blijven staan). Een te breed zoekwoord
  (meer dan 10 tegenpartijen, plaatsnaam) geeft een waarschuwing; vaste banktekst (Transactie, Term, Pasvolgnr …) telt niet mee.
- **Controleren**: open punten per tegenpartijgroep en per jaar, kleine bedragen, Overig, overboekingen aan personen,
  inkomsten, leningen, lease, activa.
- **Fiscaal (indicatief)**: btw per kwartaal (KOR, verlegd, privégebruik auto), winst, zelfstandigen- en startersaftrek
  (met niet-gerealiseerde aftrek over alle jaren), mkb-winstvrijstelling, IB, Zvw, heffingskortingen, overig inkomen,
  giften aan een ANBI, KIA, lease en bijtelling, Vpb en box 2 voor een BV; privé: toeslagen en persoonsgebonden aftrek.
- **Rapporten**: indicatieve aangifteberekening (met onderbouwing), btw-overzicht, samenvatting voor de klant,
  inkomen per maand, controlebestand (Excel).
- **Opslag**: automatisch in de browser (IndexedDB, terugval localStorage) en als dossierbestand, optioneel versleuteld
  (AES-256-GCM, met herstelcode). Noodmodus: de app opent zonder server hooguit 7 dagen na het laatste bezoek.
- **Account en beheer**: aanmelden, goedkeuren door de beheerder, abonnementen per soort, beheerscherm.

## Beperkingen

- Alle uitkomsten zijn indicatief: geen aangifte en geen fiscaal advies.
- Wat niet uit de bank blijkt (urencriterium, voorraad, privégebruik, ANBI-status) vraagt de app of neemt hij aan; de
  aannames staan in het rapport.
- De automatische browseropslag is niet met een wachtwoord versleuteld. Gebruik op een gedeeld apparaat alleen
  versleutelde dossierbestanden en log uit.

## In ontwikkeling

- Rechtstreekse bankkoppeling (proef via Ponto; Enable Banking als alternatief). Tot die beschikbaar is: bestanden importeren.
- Bedrijfsnamen opzoeken met AI (fase 2); de gedeelde namenlijst (fase 1) bestaat, toestemming staat standaard uit.
- `App.jsx` (± 3.300 regels) verder opsplitsen, alleen waar een wijziging daar aanleiding voor geeft.

## Projectstructuur

```
src/
├── App.jsx              — centrale coördinatie: state en doorgeven aan panelen
├── app/, cards/, calc/   — hooks per onderdeel (acties, kaarten, jaarberekening, voortgang)
├── classification/       — categorieregels, indeling, zekerheid, leren van keuzes
├── importers/            — CSV/Excel/MT940/CAMT, kolomherkenning, duplicaten, bankkoppeling
├── review/               — open punten, categoriewijziging, vergelijkbare boekingen
├── tax/                  — btw, IB/Zvw, Vpb, aftrek, lease, leningen, activa, tarieven
├── modus/                — dossiersoorten (zakelijk, privé, huishoudboekje)
├── dossier/, storage/    — dossier laden/opslaan/omzetten, browseropslag, versleuteling
├── reports/              — rapporten en exports
├── content/              — help-, privacy- en voorwaardenteksten
├── components/           — UI per domein
└── noodmodus/            — service worker voor gebruik zonder server
worker/                   — Cloudflare Worker: inloggen, rechten, beheer, tarieven, bankkoppeling, namenlijst
```

## Lokaal draaien

```bash
npm install
npm run dev       # lokale ontwikkelserver
npm run build     # productie-build naar dist/
```

## Deployen

De app en de Worker draaien als Cloudflare Worker, gebouwd vanuit GitHub. `wrangler.jsonc` beheert de eigenaar zelf
(D1-database, variabelen, `previews` voor DEV en top-level voor PROD); dat bestand zit nooit in een release-zip.
Geheimen (zoals API-sleutels) staan alleen als Worker Secret, nooit in code of `wrangler.jsonc`.

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

## Tests

De map `tests/` zit niet in de release-zip (`bankoverzicht-nieuw-VxRy.zip`), wel in de bronzip
(`releases/bron/bankoverzicht-nieuw-VxRy-bron.zip`). Bij elke release draaien:

- `npm test`: alle unit- en scenariotests (o.a. vaste zakelijke berekening `tests/vastgelegd/zakelijk.json`, open punten,
  zoekwoorden, giften, rechten in de Worker);
- elk bestand in `worker/` los importeren;
- `npm run test:e2e`: 9 hoofdroutes in de browser;
- trefkans van de automatische indeling op 10 testdossiers (`tests/regressie/trefkans.test.js`, mag niet dalen);
- `npm run test:fiscaal`: winst, IB, Zvw, Vpb en btw-saldo per testdossier en jaar uit het rapport, vergeleken met
  `tests/regressie/fiscaal-vastgelegd.json`. Een bewuste wijziging leg je opnieuw vast met
  `node tests/regressie/fiscaal.mjs --vastleggen`.

Daarnaast: `npm run test:noodmodus` (na `npm run build`) en `npm run test:reis` (aanmelden tot verlengen, zie
`tests/e2e/LEESMIJ.md`). De regressietests gebruiken de testdossiers in `/mnt/project-files/testdossiers`.
