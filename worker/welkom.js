// V8R2 / beide-V3R8 — welkomstpagina (wens Boska 24-10): wie niet is ingelogd, ziet bovenaan het inlogvak en daaronder
// wat de app doet, de soorten dossier, Eenvoudig/Uitgebreid, de abonnementen met prijs, privacy en hoe je begint.
// Bewust niet "alleen de eerste keer": dat is niet te weten (lege cache, privémodus, ander apparaat). Teksten en
// prijzen van de abonnementen komen uit rechten.js, net als op de aanmeldpagina.
const e = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hoofdletter = (s) => String(s || "").replace(/^./, (c) => c.toUpperCase());

export const WELKOM_STIJL = `main{max-width:640px}
.welkom h2{margin:8px 0 0;font-size:1.1rem}.welkom ul,.welkom ol{margin:0;padding-left:20px}.welkom li{margin:4px 0}
.duo{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.plan{border-top:1px solid var(--line);padding-top:8px}.plan:first-of-type{border-top:0;padding-top:0}
.prijs{color:var(--accent);font-weight:600;white-space:nowrap}.klein{font-size:13px;color:var(--muted);margin:0}
.waarschuwing{border-left:4px solid #d97706}`;

// soorten: [{ naam, voor, kan: [..], plannen: [{ naam, uitleg, prijs }] }]
// Zelfde tekst als VEILIG_KORT in src/content/veiligheid.jsx (de Worker laadt geen React-bestanden).
const VEILIG = "Bankoverzicht vraagt je nooit om je rekeningnummer, inlogcodes, wachtwoord of bankbestanden per mail, sms, WhatsApp of telefoon. Krijg je zo'n verzoek, stuur dan niets. Help je iemand anders, vraag dan ook zelf nooit om zulke gegevens op die manier.";

export function welkomInhoud({ soorten, veilig = VEILIG }) {
  const meer = soorten.length > 1;
  return `
<section class="welkom" style="display:flex;flex-direction:column;gap:16px" aria-labelledby="wat">
  <h2 id="wat">Wat doet Bankoverzicht?</h2>
  <div class="kaart">
    <ol>
      <li><b>Inlezen:</b> je downloadt de afschriften bij je bank (CSV, MT940 of CAMT) en laadt ze in de app.</li>
      <li><b>Indelen:</b> de app deelt de boekingen zelf in. Wat hij niet zeker weet, vraagt hij je één voor één of in een lijst.</li>
      <li><b>Overzicht:</b> je ziet waar je geld vandaan komt en heen gaat, met een indicatie van je belasting.</li>
    </ol>
  </div>

  <h2>${meer ? "Privé of zakelijk" : "Voor wie"}</h2>
  <div class="duo">${soorten.map((s) => `
    <div class="kaart"><b>${e(s.naam)}</b><p class="klein">${e(s.voor)}</p><ul>${s.kan.map((k) => `<li>${e(k)}</li>`).join("")}</ul></div>`).join("")}
  </div>
  ${meer ? `<p class="sub">Met één account kun je beide hebben, elk met een eigen dossier.</p>` : ""}

  <h2>Eenvoudig of Uitgebreid</h2>
  <div class="kaart">
    <p style="margin:0"><b>Eenvoudig</b>: vier stappen (Gegevens, Nakijken, Uitkomst, Bewaren), één vraag tegelijk, de uitkomst in gewone taal.</p>
    <p style="margin:0"><b>Uitgebreid</b>: alle overzichten, controles en instellingen, ook voor meerdere jaren naast elkaar.</p>
    <p class="klein">Je kiest per dossier. Een dossier in Eenvoudig kun je later één keer omzetten naar Uitgebreid; terug kan niet.</p>
  </div>

  <h2>Abonnementen</h2>
  <div class="duo">${soorten.map((s) => `
    <div class="kaart"><b>${e(s.naam)}</b>${s.plannen.map((p) => `
      <div class="plan"><div style="display:flex;justify-content:space-between;gap:8px"><b>${e(p.naam)}</b><span class="prijs">${e(p.prijs)}</span></div><p class="klein">${e(hoofdletter(p.uitleg))}</p></div>`).join("")}
    </div>`).join("")}
  </div>

  <h2>Je gegevens</h2>
  <div class="kaart">
    <p style="margin:0">Je bankbestanden worden in je eigen browser verwerkt en niet naar een server gestuurd. Je dossier bewaar je zelf als bestand, desgewenst met een wachtwoord.</p>
    <p class="klein">De uitkomsten zijn een indicatie, geen aangifte of advies.</p>
  </div>
  <div class="kaart waarschuwing"><p style="margin:0">${e(veilig)}</p></div>

  <h2>Zo begin je</h2>
  <div class="kaart">
    <ol>
      <li>Vul bovenaan je e-mailadres in en kies <b>Stuur inloglink</b>. Je krijgt een mail met een link.</li>
      <li>Kies na het inloggen welk abonnement je wilt en vertel kort waarvoor. Je krijgt een mail zodra je aanmelding is goedgekeurd.</li>
      <li>Stel een wachtwoord of passkey in. Daarna log je zonder mail in.</li>
    </ol>
    <button type="button" class="tweede" onclick="var i=document.querySelector('input[name=email]');window.scrollTo({top:0,behavior:'smooth'});i&&i.focus()">Naar het inlogvak</button>
  </div>
</section>`;
}
