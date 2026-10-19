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
