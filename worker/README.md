# Hulpvraag/feedback — instellen in Cloudflare

De knop "Hulpvraag of feedback" in de app stuurt een bericht naar `/api/feedback` op dezelfde hostnaam als de app.
Deze Worker ontvangt dat en mailt het naar jou. Het ontvangeradres staat alleen in deze instelling, niet in de app.

## Eenmalig instellen
1. **E-mail op je domein.** Cloudflare → het domein `paulgerits.eu` → *Email* → *Email Routing* → inschakelen
   (Cloudflare voegt zelf de DNS-records toe). Voeg `paul@paulgerits.eu` toe als **bestemmingsadres** en bevestig de
   mail die Cloudflare daarheen stuurt. Alleen naar een bevestigd adres kan de Worker sturen (kosteloos).
2. **Afzender.** De Worker verstuurt als `feedback@paulgerits.eu` (aan te passen in `wrangler.jsonc`, `FEEDBACK_FROM`).
   Dat adres hoeft geen echte mailbox te zijn, maar moet op een domein staan waar Email Routing aan staat.
3. **Hostnaam van de app.** Open `wrangler.jsonc` en vervang `VUL-HIER-DE-HOSTNAAM-VAN-DE-APP-IN` door de hostnaam
   waarop de app draait (de hostnaam die je in Cloudflare Access hebt beveiligd).
4. **Uploaden.** In deze map: `npx wrangler login` en daarna `npx wrangler deploy`.
5. **Controleren.** Open de app (ingelogd), kies *Hulpvraag of feedback*, verstuur een test. Binnen een minuut moet er een
   mail in je inbox staan. Antwoorden gaat naar het e-mailadres waarmee de gebruiker is ingelogd.

## Hoe het is beveiligd
- Alleen verzoeken met de header `Cf-Access-Authenticated-User-Email` worden verwerkt; die zet Cloudflare Access na inloggen.
- Lengte van naam, onderwerp en bericht is begrensd. Er worden geen dossiergegevens meegestuurd.

## Als er iets niet werkt
- *"Versturen mislukt"* in de app: controleer stap 1 (bevestigd bestemmingsadres) en de afzender in stap 2.
- Werkt de Email-binding in jouw account anders (dat is nog een bètafunctie), kijk dan in de Cloudflare-documentatie
  bij "Send emails from Workers". Het verzenden zit in één blok in `index.js`.
- In de app staat bij een fout een noodknop waarmee de gebruiker het bericht via zijn eigen mailapp kan sturen.

## Toegang tot de uitgebreide weergave (nieuw-V2R0)

`GET /api/rol` geeft `{ uitgebreid: true|false }` terug voor de ingelogde gebruiker (header `Cf-Access-Authenticated-User-Email`).
De lijst staat in de Secret **`AccessAll`** (Workers & Pages → bankfile-analyse → Settings → Variables and Secrets), níet in
`wrangler.jsonc`: adressen gescheiden door komma's, `*@domein.nl` voor een heel domein. Geen lijst of niet op de lijst = alleen
de eenvoudige weergave. Dit schermt schermen af; het beveiligt geen gegevens (alles rekent in de browser).

## Rechtstreekse bankkoppeling via Enable Banking (nieuw-V3R8, proef)

Routes `/api/bank/*` (code in `worker/bank.js`). Alleen voor gebruikers op de lijst `AccessAll`. Er wordt niets opgeslagen
op de server: transacties gaan rechtstreeks door naar de browser.

### Eenmalig instellen
1. **Enable Banking Control Panel** → je applicatie:
   - Noteer de **Application ID**.
   - Bewaar het **.pem-bestand** dat bij het registreren is gedownload (de private sleutel). Niet in de repo zetten.
   - Zet bij *Redirect URLs* precies: `https://<hostnaam-van-de-app>/bank/terug` (de dev-hostnaam voor de dev-omgeving).
2. **Secrets in Cloudflare** (Workers & Pages → de dev-worker → Settings → Variables and Secrets → *Add* → type *Secret*),
   of in deze map met wrangler:
   ```
   npx wrangler secret put EB_APP_ID          # plak de Application ID
   npx wrangler secret put EB_PRIVATE_KEY < pad/naar/<application-id>.pem
   npx wrangler secret put EB_TOKEN_GEHEIM    # plak een lange willekeurige tekst (bijv. uit: openssl rand -base64 48)
   ```
   Gebruik bij een aparte dev-worker `--name <naam-van-de-dev-worker>` of `--env`.
3. **Deploy** zoals gewoonlijk (`npm run build` en `npx wrangler deploy`).
4. **Testen in de sandbox**: in de app → *Bankbestand toevoegen* → *Rechtstreeks koppelen met de bank (proef)* → kies een
   bank → *Naar mijn bank*. Log in bij de testbank van Enable Banking (de inloggegevens staan in het Control Panel of in de
   documentatie), en kies daarna *Ophalen*.
5. **Eigen echte rekeningen**: een sandbox-app toont alleen testbanken en kan niet naar productie worden omgezet. Registreer
   in het Control Panel een **tweede applicatie** met omgeving *Production* (zelfde redirect-URL), koppel daar je eigen
   rekeningen via *Link accounts* (gratis, "restricted"), en vervang op de Worker de secrets `EB_APP_ID` en `EB_PRIVATE_KEY`
   door die van de nieuwe app. Alleen de gekoppelde rekeningen zijn daarna via de app op te halen.

### Hoe het is beveiligd
- De private sleutel staat alleen als Secret in de Worker. De Worker ondertekent elk verzoek aan Enable Banking (RS256-JWT, 1 uur geldig).
- De sessie-id en rekening-id's van Enable Banking gaan versleuteld (AES-GCM) als "koppeltoken" naar de browser, gebonden aan het
  e-mailadres van de ingelogde gebruiker. Een andere gebruiker kan er niets mee (403).
- *Ontkoppelen* in de app trekt de toestemming ook bij Enable Banking in.

## Gebruikers en rechten (nieuw-V4R3)

Wie Uitgebreid en de bankkoppeling mag gebruiken, komt nu uit drie bronnen (zie `worker/rechten.js`):

| Bron | Waar | Geeft |
|---|---|---|
| Secret `BEHEERDERS` | Worker → Settings → Variables and Secrets | Alles, plus het scherm *Gebruikers en rechten* (personen-icoon onderin de zijbalk) |
| Secret `AccessAll` | idem | Uitgebreid + bankkoppeling (zoals voorheen) |
| D1-tabel `rechten` (binding `DB`) | via het beheerscherm | Per e-mailadres Uitgebreid en/of bankkoppeling, eventueel met einddatum |

De tabel maakt de Worker zelf aan bij het eerste gebruik; je hoeft geen SQL uit te voeren. Zonder binding `DB` werkt alles
zoals voorheen met alleen de twee Secrets.

Instellen:

1. Cloudflare → **Storage & Databases → D1 SQL Database → Create**. Naam: `bankoverzicht-rechten`. Kopieer het **Database ID**.
2. In `wrangler.jsonc` staat `"d1_databases"` op twee plekken (in `previews` en onderin) met het Database ID. Bij een nieuwe
   database vervang je daar het ID. De binding moet in `wrangler.jsonc` staan: een binding die je alleen in het
   dashboard toevoegt, verdwijnt bij de volgende deploy.
3. Secret `BEHEERDERS` toevoegen met je eigen e-mailadres (hetzelfde als waarmee je via Access inlogt).
4. Deployen zoals gewend.
5. Nieuwe gebruikers moeten ook de app kunnen openen: zet ze in de policy van de Access-applicatie
   (Zero Trust → Access → Applications → de app → Policies), of gebruik een Access-groep.

## Aanmelden en toegangsslot (nieuw-V4R5)

- Iedereen die inlogt zonder toegang ziet (met het slot aan) de aanmeldpagina en kiest Eenvoudig, Uitgebreid of
  Uitgebreid met bankkoppeling. Vanuit Eenvoudig kan ook Uitgebreid worden aangevraagd ("toegang aanvragen").
- De beheerder krijgt een e-mail (binding `EMAIL`, naar `FEEDBACK_TO`) en ziet de aanvraag met een teller bij het
  personen-icoon. In *Gebruikers en rechten* staat een blok *Aanmeldingen* met Goedkeuren en Afwijzen.
- Slot: variabele `TOEGANG_VERPLICHT` (`"ja"` of `"nee"`, standaard nee). Met `"ja"` levert de Worker de app alleen aan
  beheerders, AccessAll en wie in de tabel Eenvoudig of Uitgebreid heeft. Daarvoor staat in `wrangler.jsonc`
  `"run_worker_first": true`, zodat ook de app-bestanden langs de Worker gaan.
- De tabel krijgt de nieuwe kolommen (`eenvoudig`, `aanvraag`, `aangevraagd`, `naam`) automatisch.

## Eigen inlog met passkeys (nieuw-V4R6)

Vervangt Cloudflare Access (geen code per e-mail, geen kosten per gebruiker). Zie `worker/inloggen.js`.

- Variabele `INLOG_MODUS`: `"access"` (standaard, zoals voorheen) of `"eigen"`.
- Met `"eigen"`: wie niet is ingelogd, gaat naar `/inloggen`. Inloggen met een passkey (Face ID, Touch ID, pincode)
  of met een inloglink per e-mail (15 minuten geldig, één keer). Na de eerste inlog kan de gebruiker een passkey
  aanmaken op `/inloggen/passkey` (ook via het sleutel-icoon in de zijbalk). Sessie: 30 dagen, verlengt bij gebruik.
- De inloglink gaat via de binding `EMAIL`, afzender `INLOG_FROM` (of anders `FEEDBACK_FROM`). Die binding moet naar
  willekeurige adressen kunnen mailen.
- `/uitloggen` beëindigt de eigen sessie, of stuurt bij Access door naar `/cdn-cgi/access/logout`.
- Overstappen: eerst `"eigen"` testen terwijl Access nog aan staat, daarna de Access-applicatie voor de hostnaam
  verwijderen. Rechten (BEHEERDERS, AccessAll, de tabel) blijven gewoon op e-mailadres werken.
- Prijzen: variabele `PRIJZEN`, bijv. `{"eenvoudig":0,"uitgebreid":4.95,"koppelen":7.5}` (euro per maand). Standaard
  alles 0 (gratis, beheerder keurt goed). Een prijs boven 0 vraagt de betaalstap, die nog niet is gebouwd.

### E-mail voor inloglinks (nieuw-V4R7)

De binding `EMAIL` (Cloudflare Email Routing) mailt alleen naar adressen die in Email Routing als *destination address*
zijn geverifieerd ("destination address is not a verified address"). Voor gebruikers in het algemeen:
Secret `RESEND_API_KEY` (resend.com, gratis tot 3.000 mails per maand) en variabele `INLOG_FROM` met een afzender op
een bij Resend geverifieerd domein, bijv. `"Bankoverzicht <inloggen@bankafschriftentool.app>"`.

## E-mail naar gebruikers (nieuw-V4R8)

Inloglinks en de berichten "aanmelding goedgekeurd" / "afgewezen" gaan via de binding `EMAIL` naar willekeurige
adressen. Daarvoor moet **Cloudflare Email Sending** aan staan (Compute → Email Service → Email Sending → Onboard Domain,
vereist Workers Paid). Afzender: `INLOG_FROM`, anders `FEEDBACK_FROM`; die moet op het onboarde domein staan.
Alleen Email Routing is niet genoeg: dan kan de Worker alleen naar geverifieerde adressen mailen.

## Bankkoppeling via Ponto (nieuw-V5R1)

Met de variabele `BANK_AANBIEDER = "ponto"` lopen nieuwe koppelingen via Ponto (Isabel Group) in plaats van Enable
Banking. Bestaande Enable Banking-koppelingen blijven werken zolang die secrets er staan. Code: `worker/ponto.js`.

1. Ponto-dashboard → Integrations → integratie aanmaken (eerst sandbox). Redirect URI: `https://<hostnaam>/bank/terug`.
   Scopes: `ai`, `name`, `offline_access` (geen `pi`).
2. Secrets op de Worker: `PONTO_CLIENT_ID`, `PONTO_CLIENT_SECRET` (en `EB_TOKEN_GEHEIM` als die er nog niet staat).
3. Certificaat en sleutel van Ponto uploaden (eenmalig). Zonder computer: GitHub Actions → "Ponto-certificaat uploaden"
   (`.github/workflows/ponto-certificaat.yml`, uitleg bovenin dat bestand). Op een computer:
   `openssl rsa -in private_key.pem -out key-zonder-wachtwoord.pem` (vraagt de passphrase van Ponto), dan
   `npx wrangler mtls-certificate upload --cert certificate.pem --key key-zonder-wachtwoord.pem --name ponto-sandbox`
   en het getoonde ID in wrangler.jsonc: `"mtls_certificates": [{ "binding": "PONTO_CERT", "certificate_id": "<ID>" }]`.
   Verwijder daarna het bestand zonder wachtwoord.
4. Variabelen: `"BANK_AANBIEDER": "ponto"` en `"PONTO_OMGEVING": "sandbox"` (later `"live"`, met de live-integratie,
   een eigen certificaat en eigen client-ID/secret).
Ponto vervangt het refresh token bij elk gebruik; de Worker geeft daarom na elke ophaalactie een nieuw koppeltoken terug
dat de app in het dossier zet. Laad je een oudere dossierkopie, dan is de koppeling daarin niet meer bruikbaar: opnieuw koppelen.

## Zakelijk en privé (beide-V1R0)

Zakelijk en privé zijn aparte abonnementen. Bij het aanmelden kiest iemand verplicht **Zakelijk** (eenmanszaak, zzp, BV) of
**Privé** (alleen eigen huishouden). Eén account (mailadres) kan beide hebben; via `/aanmelden` (kaart-icoon onderin de
zijbalk) vraagt iemand met toegang een tweede abonnement aan.

- D1-tabel `rechten` krijgt vanzelf de kolommen `gebruik` (zakelijk, prive of beide), `aanvraag_gebruik` en
  `prive_eenvoudig`, `prive_uitgebreid`, `prive_koppelen`, `prive_geldig_tot`. De bestaande kolommen zijn zakelijk.
  Bestaande rijen worden bij het eerste gebruik op zakelijk gezet. Je hoeft geen SQL uit te voeren.
- `/api/rol` geeft naast de bekende velden ook `soorten` ({zakelijk, prive}, elk eenvoudig/uitgebreid/koppelen) en `gebruik`.
- Prijzen per soort in de variabele `PRIJZEN`, bijv. `{"zakelijk":{"uitgebreid":4.95},"prive":{"uitgebreid":2.95}}`.
  De oude vorm zonder soort (`{"uitgebreid":4.95}`) geldt voor zakelijk. Zonder variabele is alles €0.

### Voorwaarden per soort (beide-V1R9)

Privé heeft eigen gebruiksvoorwaarden (`src/content/voorwaardenPrive.jsx`, versie `VOORWAARDEN_PRIVE_VERSIE`). Wie een
privéabonnement heeft, gaat daar één keer mee akkoord; wie beide heeft, ziet beide teksten en geeft één akkoord. Het akkoord
staat in de D1-tabel `voorwaarden_akkoord`: `versie`/`tijd` voor zakelijk, `versie_prive`/`tijd_prive` voor privé. De
Worker voegt die twee kolommen zelf toe; geen SQL nodig. `/api/rol` geeft `voorwaarden` (zakelijk) en `voorwaardenPrive`.

## Tarievenbestand (beide-V6R7)

De belastingtarieven kunnen los van de app worden bijgewerkt. De beheerder zet een tarievenbestand (JSON) op de server via
Gebruikers en rechten → Tarieven; het staat in de D1-tabel `tarieven` (maakt de Worker zelf aan, geen SQL nodig). De app haalt
het bij het starten op via `GET /api/tarieven` (alleen ingelogd) en bewaart een kopie in de browser. Zonder bestand, of als de
server niet bereikbaar is, gelden de tarieven die in de app zitten. Vorm en controle: `src/tax/tarievenBestand.js` (de Worker
gebruikt dezelfde controle, dus een onvolledig bestand wordt geweigerd). Geen wijziging in wrangler.jsonc nodig.
