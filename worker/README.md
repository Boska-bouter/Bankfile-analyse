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
- Lokaal testen zonder Access: zet de variabele `EB_DEV_EMAIL` (alleen in `.dev.vars`, nooit in productie).
