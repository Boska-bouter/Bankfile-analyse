// V8R4 (ook beide-V4R0) — welkomstpagina (wens Boska 24-10): wie niet is ingelogd, ziet wat de app doet, de soorten dossier,
// de abonnementen met prijs en hoe het met je gegevens zit, met het inlogvak ernaast (breed) of erboven (smal).
// Bewust niet "alleen de eerste keer": dat is niet te weten (lege cache, privémodus, ander apparaat). Teksten en
// prijzen van de abonnementen komen uit rechten.js, net als op de aanmeldpagina.
const e = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Breed scherm (iPad liggend, computer): uitleg links, inloggen rechts en blijft staan bij scrollen. Smal scherm:
// eerst inloggen, daaronder de uitleg. Eén inlogvak, geen tweede inlogknop onderaan (wens Boska 24-10).
export const WELKOM_STIJL = `main{max-width:1080px;padding-top:48px}
.kop h1{font-size:2rem;letter-spacing:-.01em}.kop .sub{font-size:1.05rem;margin-top:6px;max-width:640px}
.kenmerken{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;padding:0;list-style:none}
.kenmerken li{font-size:13px;color:var(--accent);background:var(--card);border:1px solid var(--line);border-radius:999px;padding:3px 12px}
.welkom-grid{display:grid;gap:28px;grid-template-areas:"kop" "inlog" "uitleg"}.kop{grid-area:kop}
.inlogkolom{grid-area:inlog;display:flex;flex-direction:column;gap:14px;max-width:520px}.uitlegkolom{grid-area:uitleg;min-width:0}
@media (min-width:880px){.welkom-grid{grid-template-columns:minmax(0,1fr) 360px;grid-template-areas:"kop inlog" "uitleg inlog";align-items:start;gap:32px 40px}
.inlogkolom{position:sticky;top:24px}.alleen-smal{display:none}}
.inlogkaart{gap:10px;padding:20px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 24px rgba(15,118,110,.07)}
.inlogkaart h2{margin:0 0 2px;font-size:1.1rem;line-height:1.35}.inlogkaart [role=status]:empty{display:none}
#status2{margin:0;color:var(--muted)}#status2.err{color:var(--err)}#status2.ok{color:var(--ok)}
.inlogkaart .linkknop{align-self:flex-start}.linkknop{background:none;border:0;padding:2px 0;color:var(--accent);font-weight:500;font-size:14px;text-align:left;text-decoration:underline;text-underline-offset:2px}
.scheiding{border-top:1px solid var(--line);margin:4px 0 0}
.nieuw{margin:0;padding-left:20px;color:var(--muted);font-size:14px}.nieuw li{margin:3px 0}
.welkom{display:flex;flex-direction:column;gap:32px}.welkom section{display:flex;flex-direction:column;gap:12px}
.welkom h2{margin:0;font-size:1.2rem}.welkom ul{margin:0;padding-left:18px}.welkom li{margin:3px 0}
.stappen{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));counter-reset:stap}
.stap{counter-increment:stap;gap:4px}.stap::before{content:counter(stap);display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--accent);color:#fff;font-weight:700;font-size:13px}
.stap p{margin:0}.duo{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.klein{font-size:13px;color:var(--muted);margin:0}
.tabel{padding:0;overflow:hidden}.tabel table{width:100%;border-collapse:collapse}
.tabel th,.tabel td{padding:12px 16px;text-align:left;vertical-align:top;border-top:1px solid var(--line)}
.tabel thead th{border-top:0;font-size:13px;color:var(--muted);font-weight:600;background:var(--bg)}
.tabel td.prijs,.tabel th.prijs{text-align:right;white-space:nowrap}.tabel td.prijs{color:var(--accent);font-weight:600}
.tabel td p{margin:2px 0 0}.tabel td p.let{color:#b45309}
@media (max-width:520px){.tabel th,.tabel td{padding:10px 12px}}
.let-op{margin:0;padding:10px 12px;border-radius:8px;border-left:4px solid #d97706;background:rgba(217,119,6,.08);font-size:14px}`;

// Zelfde tekst als VEILIG_KORT in src/content/veiligheid.jsx (de Worker laadt geen React-bestanden).
const VEILIG = "Bankoverzicht vraagt je nooit om je rekeningnummer, inlogcodes, wachtwoord of bankbestanden per mail, sms, WhatsApp of telefoon. Krijg je zo'n verzoek, stuur dan niets. Help je iemand anders, vraag dan ook zelf nooit om zulke gegevens op die manier.";

// Per abonnement: korte omschrijving en welke overzichten en rapportages erbij horen (wens Boska 24-10: dan is het verschil
// tussen de abonnementen duidelijker). "alleen" = alleen bij die soort dossier; staan beide soorten op de pagina, dan
// komt de soort tussen haakjes erachter. De lange teksten per soort staan op de aanmeldpagina.
const PLAN_INFO = {
  eenvoudig: {
    tekst: "Vier stappen, één vraag tegelijk, de uitkomst in gewone taal.",
    rapporten: [{ t: "samenvatting" }, { t: "maandoverzicht" }, { t: "indicatieve belastingoverzichten" }],
  },
  uitgebreid: {
    tekst: "Alle overzichten, controles en instellingen, ook meerdere jaren naast elkaar.",
    rapporten: [{ t: "alles van Eenvoudig" }, { t: "overzichten per categorie, maand en jaar" }, { t: "downloaden in PDF, HTML of Excel en printen" },
      { t: "btw per kwartaal en aangifteberekening", alleen: "zakelijk" }, { t: "budget, vaste lasten en sparen", alleen: "prive" }],
  },
  koppelen: {
    tekst: "Alles van Uitgebreid, en je transacties rechtstreeks bij je bank ophalen in plaats van bestanden te downloaden. Nog in ontwikkeling.",
    rapporten: [{ t: "alles van Uitgebreid" }],
    let: "Straks met extra kosten, vanwege de koppeling met je bank en de extra beveiliging die daarvoor nodig is.",
  },
};
const SOORT_NAAM = { zakelijk: "zakelijk", prive: "privé" };
function rapportTekst(k, sleutels) {
  const lijst = (PLAN_INFO[k]?.rapporten || []).filter((x) => !x.alleen || sleutels.includes(x.alleen))
    .map((x) => (x.alleen && sleutels.length > 1 ? `${x.t} (${SOORT_NAAM[x.alleen]})` : x.t));
  return lijst.length ? `Overzichten en rapportages: ${lijst.join(", ")}.` : "";
}

// soorten: [{ soort, naam, voor, kan: [..], plannen: [{ sleutel, naam, prijs, gratis }] }]
export const alleGratis = (soorten) => soorten.every((s) => s.plannen.every((p) => p.gratis));

export function welkomKop(soorten) {
  const gratis = alleGratis(soorten);
  const kenmerken = [soorten.length > 1 ? "Privé en zakelijk" : `Voor ${soorten[0]?.naam.toLowerCase() || "zakelijk"} gebruik`,
    "Je bankbestanden blijven in je browser", gratis ? "Voorlopig gratis" : null].filter(Boolean);
  return `<header class="kop">
<h1>Bankoverzicht</h1>
<p class="sub">Je bankafschriften vanzelf ingedeeld: wat er binnenkomt, wat er uitgaat, en een indicatie van je belasting.<span class="alleen-smal"> <a href="#wat" style="color:var(--accent)">Meer weten</a></span></p>
<ul class="kenmerken">${kenmerken.map((k) => `<li>${e(k)}</li>`).join("")}</ul>
</header>`;
}

// In het aanvraagvak: in drie korte stappen hoe je begint (stond eerst dubbel, boven én onder de uitleg).
export const welkomNieuw = (gratis) => `<ol class="nieuw">
<li>Vul je e-mailadres in en kies <b>Stuur inloglink</b>.</li>
<li>Kies na het inloggen je abonnement${gratis ? " (voorlopig gratis)" : ""}. Je krijgt een mail zodra het is goedgekeurd.</li>
<li>Stel een wachtwoord of passkey in; daarna log je zonder mail in.</li></ol>`;

export function welkomInhoud({ soorten, veilig = VEILIG }) {
  const meer = soorten.length > 1;
  const sleutels = soorten[0]?.plannen.map((p) => p.sleutel) || [];
  const soortSleutels = soorten.map((s) => s.soort);
  const plan = (s, k) => s.plannen.find((p) => p.sleutel === k) || {};
  return `
<div class="welkom">
  <section aria-labelledby="wat">
    <h2 id="wat">Wat doet Bankoverzicht?</h2>
    <div class="stappen">
      <div class="kaart stap"><b>Inlezen (CSV, MT940, CAMT)</b><p class="klein">Download je afschriften bij je bank en laad ze in de app, ook van meerdere rekeningen en jaren.</p></div>
      <div class="kaart stap"><b>Indelen en begeleiden</b><p class="klein">De app deelt de boekingen zelf in en helpt je met de rest: wat hij niet zeker weet, vraagt hij je, één voor één of in een lijst.</p></div>
      <div class="kaart stap"><b>Overzichten en rapportages</b><p class="klein">Waar je geld vandaan komt en heen gaat, per maand en categorie, en indicatieve belastingoverzichten. Te downloaden in PDF, HTML of Excel, en te printen.</p></div>
    </div>
  </section>

  <section>
    <h2>${meer ? "Privé of zakelijk" : "Voor wie"}</h2>
    <div class="duo">${soorten.map((s) => `
      <div class="kaart"><b>${e(s.naam)}</b><p class="klein">${e(s.voor)}</p><ul>${s.kan.map((k) => `<li>${e(k)}</li>`).join("")}</ul></div>`).join("")}
    </div>
    ${meer ? `<p class="klein">Met één account kun je beide hebben, elk met een eigen dossier.</p>` : ""}
  </section>

  <section>
    <h2>Abonnementen</h2>
    <div class="kaart tabel"><table>
      <thead><tr><th>Abonnement</th>${soorten.map((s) => `<th class="prijs">${meer ? e(s.naam) : "Prijs"}</th>`).join("")}</tr></thead>
      <tbody>${sleutels.map((k) => `
        <tr><td><b>${e(plan(soorten[0], k).naam)}</b><p class="klein">${e(PLAN_INFO[k]?.tekst || "")}</p><p class="klein">${e(rapportTekst(k, soortSleutels))}</p>${PLAN_INFO[k]?.let ? `<p class="klein let">${e(PLAN_INFO[k].let)}</p>` : ""}</td>${soorten.map((s) => `<td class="prijs">${e(plan(s, k).gratis ? "Gratis" : plan(s, k).prijs)}</td>`).join("")}</tr>`).join("")}
      </tbody></table></div>
    <p class="klein">Eenvoudig of Uitgebreid kies je per dossier. Een dossier in Eenvoudig kun je later één keer omzetten naar Uitgebreid; terug kan niet.</p>
  </section>

  <section>
    <h2>De veiligheid van jouw gegevens</h2>
    <div class="kaart">
      <p style="margin:0">Je bankbestanden worden in je eigen browser verwerkt en niet naar een server gestuurd. Je dossier bewaar je zelf als bestand, desgewenst met een wachtwoord. De uitkomsten zijn een indicatie, geen aangifte of advies.</p>
      <p class="let-op">${e(veilig)}</p>
    </div>
  </section>
</div>`;
}
