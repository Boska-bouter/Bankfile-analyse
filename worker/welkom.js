// beide-V4R0 (ook zakelijk-V8R4) — welkomstpagina (wens Boska 24-10): wie niet is ingelogd, ziet wat de app doet, de soorten dossier,
// de abonnementen met prijs en hoe het met je gegevens zit, met het inlogvak ernaast (breed) of erboven (smal).
// Bewust niet "alleen de eerste keer": dat is niet te weten (lege cache, privémodus, ander apparaat). Teksten en
// prijzen van de abonnementen komen uit rechten.js, net als op de aanmeldpagina.
import { GEBRUIK, PLANNEN, PLAN_UITLEG, plannenVoor, prijzen, prijsTekst } from "./rechten.js";
import { INZICHTEN, KEUZE, SOORT_KORT, PRIVACY_LABEL, PRIVACY_KERN, PRIVACY_SERVER, GRATIS_KORT, GRATIS_UITLEG, BANKKOPPELING_STATUS } from "../src/content/aanbod.js";

const e = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Breed scherm (iPad liggend, computer): uitleg links, inloggen rechts en blijft staan bij scrollen. Smal scherm:
// eerst inloggen, daaronder de uitleg. Eén inlogvak, geen tweede inlogknop onderaan (wens Boska 24-10).
// beide-V13R4 (uit huishoudboekje-V1R5) — kleur per soort, gelijk aan de app (src/index.css): klassen s-zakelijk en
// s-prive zetten --accent op het element (kaarten op welkomst- en aanmeldpagina).
export const SOORT_KLEUR_STIJL = `.s-zakelijk{--accent:#0f766e}.s-prive{--accent:#24569f}
@media (prefers-color-scheme:dark){.s-zakelijk{--accent:#2fb3a6}.s-prive{--accent:#6f9be0}}`;
export const WELKOM_STIJL = `main{max-width:1080px;padding-top:48px}
.drie{margin:8px 0 0;padding-left:20px;font-size:1rem;color:var(--muted)}.drie li{margin:4px 0}.drie b{color:var(--fg)}
.soortkaarten{display:grid;gap:12px;grid-template-columns:1fr}
.soortkaart{display:grid;grid-row:span 7;grid-template-rows:subgrid;row-gap:8px;align-content:start;border-top:6px solid var(--accent)}.soortkaart h3{margin:0;font-size:1.1rem;color:var(--accent)}
.soortkaart .kies{margin:0;font-size:14px;line-height:1.4}.soortkaart .kies span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--accent);font-weight:700;margin-bottom:2px}
.soortkaart .klein.mi{margin-top:6px}
@media (min-width:600px){.soortkaarten{grid-template-columns:repeat(2,minmax(0,1fr))}}
${SOORT_KLEUR_STIJL}
.kop h1{font-size:clamp(1.45rem,6.5vw,2.2rem);letter-spacing:-.01em;margin:0;overflow-wrap:anywhere}.kop .sub{font-size:1.05rem;margin-top:6px}
.merk{display:flex;align-items:center;gap:14px}.merk svg{flex:none}.merk h1 .naar{font-weight:400;color:var(--muted)}.merk h1 .aangifte{color:var(--accent)}.merk .onder{color:var(--muted);font-size:14px}
.inlogkop{margin:0 0 -2px;font-size:1.2rem}.inlogkop span{color:var(--muted);font-weight:500}.welkom h2,.inlogkop{line-height:1.3}
.kenmerken{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;padding:0;list-style:none}
.kenmerken a{color:inherit;text-decoration:underline;text-underline-offset:2px}.kenmerken li{font-size:13px;color:var(--accent);background:var(--card);border:1px solid var(--line);border-radius:999px;padding:3px 12px}
.welkom-grid{display:grid;gap:28px;grid-template-areas:"kop" "inlog" "uitleg" "abon" "veilig"}.veiligrij{grid-area:veilig;min-width:0}.abonrij{grid-area:abon;min-width:0}.abonrij section{display:flex;flex-direction:column;gap:12px}.abonrij h2{margin:0;font-size:1.2rem}.veiligrij .veilig{display:flex;flex-direction:column;gap:12px}.veiligrij h2{margin:0;font-size:1.2rem;line-height:1.3}.kop{grid-area:kop}
.inlogkolom{grid-area:inlog;display:flex;flex-direction:column;gap:14px;max-width:520px}.uitlegkolom{grid-area:uitleg;min-width:0}
@media (min-width:880px){.welkom-grid{grid-template-columns:minmax(0,1fr) 360px;grid-template-areas:"kop kop" "uitleg inlog" "abon abon" "veilig veilig";align-items:start;gap:32px 40px}
.inlogkolom{position:sticky;top:24px}.alleen-smal{display:none}}
.inlogkaart{gap:10px;padding:20px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 24px rgba(15,118,110,.07)}
.inlogkaart h2{margin:0 0 2px;font-size:1rem;line-height:1.35}.inlogkaart [role=status]:empty{display:none}
#status2{margin:0;color:var(--muted)}#status2.err{color:var(--err)}#status2.ok{color:var(--ok)}
.inlogkaart .linkknop{align-self:flex-start}.linkknop{background:none;border:0;padding:2px 0;color:var(--accent);font-weight:500;font-size:14px;text-align:left;text-decoration:underline;text-underline-offset:2px}
.scheiding{border-top:1px solid var(--line);margin:4px 0 0}
.nieuw{margin:0;padding-left:20px;color:var(--muted);font-size:14px}.nieuw li{margin:3px 0}
.welkom{display:flex;flex-direction:column;gap:32px}.welkom section{display:flex;flex-direction:column;gap:12px}
.welkom h2{margin:0;font-size:1.2rem}.welkom ul{margin:0;padding-left:18px}.welkom li{margin:3px 0}
.stappen{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));counter-reset:stap}
.stap{counter-increment:stap;gap:4px}.stap::before{content:counter(stap);display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--accent);color:#fff;font-weight:700;font-size:13px}
.stap p{margin:0}.duo{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.klein{font-size:13px;color:var(--muted);margin:0}.klein.mi{font-weight:600;color:var(--fg);margin-top:4px}
.let-op{margin:0;padding:10px 12px;border-radius:8px;border-left:4px solid #d97706;background:rgba(217,119,6,.08);font-size:14px}`;

// Zelfde tekst als VEILIG_KORT in src/content/veiligheid.jsx (de Worker laadt geen React-bestanden).
const VEILIG = "BankafschriftenTool vraagt je nooit om je rekeningnummer, inlogcodes, wachtwoord of bankbestanden per mail, sms, WhatsApp of telefoon. Krijg je zo'n verzoek, stuur dan niets. Help je iemand anders, vraag dan ook zelf nooit om zulke gegevens op die manier.";

// beide-V7R2 — abonnementen compact naast elkaar (ChatGPT-review punt 1): per regel wat elk abonnement heeft, plus
// waar de bankgegevens vandaan komen, wanneer het beschikbaar is en de prijs per soort. Ook op de aanmeldpagina.
// "alleen" = alleen bij die soort dossier; de soort komt erachter als beide soorten op de pagina staan.
const V = "✓", N = "–";

// soorten: zie welkomSoorten. Geeft de tabel met de abonnementen als kolommen.
// beide-V13R6 — één tabel per soort (wens Boska 3-11: zakelijk heeft geen box 3, privé geen btw). De regels komen uit
// dezelfde lijst als de soortkaarten (INZICHTEN in src/content/aanbod.js): "beide" = in Eenvoudig en Uitgebreid,
// "uitgebreid" = alleen in Uitgebreid. Elke tabel in de kleur van zijn soort.
const ALGEMEEN_BOVEN = [
  { t: "Eerste inzicht", w: { eenvoudig: "± 30 min", uitgebreid: "± 60-90 min", koppelen: "± 60-90 min" } },
  { t: "Werkwijze", w: { eenvoudig: "4 stappen, één vraag tegelijk", uitgebreid: "alle overzichten en controles", koppelen: "alle overzichten en controles" } },
];
const ALGEMEEN_ONDER = [
  { t: "Bankgegevens", w: { eenvoudig: "bestand van de bank", uitgebreid: "bestand van de bank", koppelen: "bestand of bankkoppeling" } },
  { t: "Beschikbaar", w: { eenvoudig: "na goedkeuring", uitgebreid: "na goedkeuring", koppelen: BANKKOPPELING_STATUS } },
];
const NIET_IN = {
  zakelijk: "Niet in Zakelijk: box 3 (sparen en beleggen) en eigen woning. Die horen bij Privé.",
  prive: "Niet in Privé: btw, aangifteberekening voor een onderneming, bedrijfsmiddelen en afschrijvingen. Die horen bij Zakelijk.",
};
export function vergelijkTabel(soorten) {
  const sleutels = soorten[0]?.plannen.map((p) => p.sleutel) || [];
  const meer = soorten.length > 1;
  const cel = (w) => `<td class="${w === V ? "ja" : w === N ? "nee" : ""}">${e(w)}</td>`;
  const rij = (t, w) => `<tr><th scope="row">${e(t)}</th>${sleutels.map((k) => cel(w[k])).join("")}</tr>`;
  const alle = (w) => Object.fromEntries(sleutels.map((k) => [k, w(k)]));
  const tabel = (s) => {
    const plan = (k) => s.plannen.find((p) => p.sleutel === k) || {};
    const regels = [
      ...ALGEMEEN_BOVEN.map((r) => rij(r.t, r.w)),
      ...s.beide.map((t) => rij(t, alle(() => V))),
      ...s.uitgebreid.map((t) => rij(t, alle((k) => (k === "eenvoudig" ? N : V)))),
      ...ALGEMEEN_ONDER.map((r) => rij(r.t, r.w)),
      `<tr class="prijsregel"><th scope="row">Prijs</th>${sleutels.map((k) => `<td>${e(plan(k).gratis ? "gratis" : String(plan(k).prijs).replace(" per maand", "/mnd"))}</td>`).join("")}</tr>`,
    ];
    return `<div class="vergelijk s-${s.soort}"><table>
<caption>${e(s.naam)}</caption>
<thead><tr><th></th>${sleutels.map((k) => `<th scope="col">${e(plan(k).naam)}</th>`).join("")}</tr></thead>
<tbody>${regels.join("")}</tbody></table>${meer && NIET_IN[s.soort] ? `<p class="niet-in">${e(NIET_IN[s.soort])}</p>` : ""}</div>`;
  };
  return `<div class="vergelijk-lijst">${soorten.map(tabel).join("")}</div>${sleutels.includes("koppelen")
    ? `<p class="klein let">De bankkoppeling krijgt straks extra kosten, vanwege de koppeling met de bank en de extra beveiliging die daarvoor nodig is.</p>` : ""}`;
}
export const VERGELIJK_STIJL = `.vergelijk-lijst{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));align-items:start}
.vergelijk{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-top:6px solid var(--accent);border-radius:12px}
.vergelijk caption{text-align:left;padding:10px 10px 6px;font-weight:700;font-size:1.05rem;color:var(--accent)}
.vergelijk .niet-in{margin:0;padding:8px 10px 10px;font-size:12.5px;color:var(--muted);border-top:1px solid var(--line)}
.vergelijk table{width:100%;border-collapse:collapse;font-size:13px}
.vergelijk th,.vergelijk td{padding:8px 10px;text-align:center;vertical-align:top;border-top:1px solid var(--line)}
.vergelijk thead th{border-top:0;color:var(--fg);font-weight:600;background:var(--bg)}
.vergelijk tbody th{text-align:left;font-weight:500;color:var(--muted)}.vergelijk .soort{font-weight:400}
.vergelijk td.ja{color:var(--accent);font-weight:700}.vergelijk td.nee{color:var(--muted)}
.vergelijk .prijsregel td{color:var(--accent);font-weight:600}
@media (max-width:520px){.vergelijk th,.vergelijk td{padding:6px}.vergelijk table{font-size:12px}}
.let{color:#b45309}`;

// soorten: [{ soort, naam, voor, beide: [..], uitgebreid: [..], plannen: [{ sleutel, naam, prijs, gratis }] }]
// beide-V13R1 — per soort wat er mogelijk is, verdeeld over Eenvoudig en Uitgebreid (wens Boska 31-10: niet beloven
// dat je alles altijd krijgt).
// beide-V13R3 — de lijsten zelf staan in src/content/aanbod.js (ook gebruikt door de app).
const SOORT_UITLEG = {
  prive: { voor: "Voor particulieren en hun huishouden, eventueel met partner.", kies: KEUZE.prive, ...INZICHTEN.prive },
  zakelijk: { voor: "Voor zzp, eenmanszaak of BV.", kies: KEUZE.zakelijk, ...INZICHTEN.zakelijk },
};
export function welkomSoorten(env) {
  const pr = prijzen(env);
  return ["zakelijk", "prive"].map((s) => ({ // beide-V13R5: zakelijk eerst (als huishoudboekje-V1R6)
    soort: s, naam: GEBRUIK[s], ...SOORT_UITLEG[s],
    plannen: Object.keys(plannenVoor(env)).map((k) => ({ sleutel: k, naam: PLANNEN[k], uitleg: PLAN_UITLEG[s][k], prijs: prijsTekst(pr[s][k]), gratis: !Number(pr[s][k]) })),
  }));
}
export const alleGratis = (soorten) => soorten.every((s) => s.plannen.every((p) => p.gratis));

export function welkomKop(soorten) {
  const gratis = alleGratis(soorten);
  const kenmerken = [soorten.length > 1 ? "Zakelijk en privé" : `Voor ${soorten[0]?.naam.toLowerCase() || "zakelijk"} gebruik`,
    { tekst: PRIVACY_LABEL, href: "#veilig" }, gratis ? GRATIS_KORT : null].filter(Boolean);
  return `<header class="kop">
<div class="merk"><svg width="52" height="52" viewBox="0 0 34 34" aria-hidden="true"><rect x="1" y="1" width="32" height="32" rx="8" fill="#1E2A4A"/><rect x="7" y="6" width="15" height="21" rx="2" fill="#fff"/><rect x="10" y="10" width="9" height="1.8" rx=".9" fill="#94a3b8"/><rect x="10" y="14" width="6" height="1.8" rx=".9" fill="#94a3b8"/><circle cx="21" cy="21" r="5" fill="#1E2A4A" stroke="#14b8a6" stroke-width="2.4"/><path d="M24.6 24.6l3.6 3.6" stroke="#14b8a6" stroke-width="2.8" stroke-linecap="round"/></svg><div><h1>Bankafschriften<span class="aangifte">Tool</span></h1><div class="onder">Inzicht in geldstromen, van bankafschrift naar aangifte</div></div></div>
${soorten.length > 1 ? `<p class="sub">Bankafschriften vanzelf ingedeeld, voor twee soorten gebruik:</p>
<ul class="drie">${soorten.map((s, i) => `<li><b>${e(s.naam)}</b> ${e(SOORT_KORT[s.soort])}${i === soorten.length - 1 ? `<span class="alleen-smal"> <a href="#wat" style="color:var(--accent)">Meer weten</a></span>` : ""}</li>`).join("")}</ul>`
  : `<p class="sub">Bankafschriften vanzelf ingedeeld: wat er binnenkomt, wat er uitgaat, en een indicatie voor de btw-aangifte en de aangifte inkomstenbelasting.<span class="alleen-smal"> <a href="#wat" style="color:var(--accent)">Meer weten</a></span></p>`}
<ul class="kenmerken">${kenmerken.map((k) => k.href ? `<li><a href="${k.href}">${e(k.tekst)}</a></li>` : `<li>${e(k)}</li>`).join("")}</ul>
</header>`;
}

// In het aanvraagvak: in drie korte stappen hoe je begint (stond eerst dubbel, boven én onder de uitleg).
export const welkomNieuw = (gratis) => `<ol class="nieuw">
<li>Vul je e-mailadres in en kies <b>Stuur inloglink</b>.</li>
<li>Kies na het inloggen je abonnement. Je krijgt een mail zodra het is goedgekeurd.${gratis ? ` ${e(GRATIS_UITLEG)}` : ""}</li>
<li>Stel een wachtwoord of passkey in; daarna log je zonder mail in.</li></ol>`;

// beide-V12R7 — veiligheidsblok los, zodat de inlogpagina het onderaan over de volle breedte kan zetten (wens Boska 31-10).
export const welkomVeilig = (veilig = VEILIG) => `
  <section class="veilig">
    <h2 id="veilig">De veiligheid van jouw gegevens</h2>
    <div class="kaart">
      <p style="margin:0">${e(PRIVACY_KERN)} ${e(PRIVACY_SERVER)} Een eigen kopie van het dossier kan als bestand worden opgeslagen, desgewenst met een wachtwoord. De uitkomsten zijn een indicatie, geen aangifte of advies.</p>
      <p class="let-op">${e(veilig)}</p>
    </div>
  </section>
`;

// beide-V13R5 (uit huishoudboekje-V1R0) — de soortkaarten staan op dezelfde regels (subgrid): naam, waarom kiezen, voor wie, lijsten.
const soortKaart = (naam, kies, voor, lijsten, soort) => `
      <div class="kaart soortkaart s-${soort}"><h3>${e(naam)}</h3><p class="kies"><span>Kies dit voor</span>${e(kies)}</p><p class="klein">${e(voor)}</p>${lijsten.map(([kop, l]) =>
    `<p class="klein mi">${e(kop)}</p><ul>${l.map((k) => `<li>${e(k)}</li>`).join("")}</ul>`).join("")}</div>`;

// beide-V13R6 — abonnementen los, zodat de inlogpagina ze over de volle breedte kan zetten (tabellen naast elkaar, wens Boska 3-11).
export const welkomAbonnementen = (soorten) => `
  <section>
    <h2>Abonnementen</h2>
    ${vergelijkTabel(soorten)}
    <p class="klein">De tijden gaan uit van medewerking van de cliënt bij de vragen die de app stelt.</p>
    <p class="klein">Eenvoudig of Uitgebreid kies je per dossier. Een dossier in Eenvoudig kun je later één keer omzetten naar Uitgebreid; terug kan niet.</p>
  </section>
`;

export function welkomInhoud({ soorten, veilig = VEILIG, metVeilig = true, metAbonnementen = true }) {
  const meer = soorten.length > 1;
  const sleutels = soorten[0]?.plannen.map((p) => p.sleutel) || [];
  return `
<div class="welkom">
  <section aria-labelledby="wat">
    <h2 id="wat">Wat doet BankafschriftenTool?</h2>
    <div class="stappen">
      <div class="kaart stap"><b>Bankgegevens inlezen</b><p class="klein">Als bestand van de bank (CSV/XLS, MT940 of CAMT.053)${sleutels.includes("koppelen") ? ` of via de automatische bankkoppeling (${BANKKOPPELING_STATUS})` : ""}. Ook van meerdere rekeningen en jaren.</p></div>
      <div class="kaart stap"><b>Indelen en begeleiden</b><p class="klein">De app deelt de boekingen zelf in en helpt je met de rest: wat hij niet zeker weet, vraagt hij je, één voor één of in een lijst.</p></div>
      <div class="kaart stap"><b>Overzichten en rapportages</b><p class="klein">Waar het geld vandaan komt en heen gaat, per maand en categorie, en een indicatie voor de btw-aangifte en de aangifte inkomstenbelasting (IB). Te downloaden in PDF, HTML of Excel, en te printen.</p></div>
    </div>
  </section>

  <section>
    <h2>${meer ? "Zakelijk of privé" : "Voor wie"}</h2>
    <div class="soortkaarten">${soorten.map((s) => soortKaart(s.naam, s.kies, s.voor, [["In Eenvoudig en Uitgebreid", s.beide], ["Alleen in Uitgebreid", s.uitgebreid]], s.soort)).join("")}
    </div>
    ${meer ? `<p class="klein">Met één account kun je beide hebben, elk met een eigen dossier.</p>` : ""}
  </section>

${metAbonnementen ? welkomAbonnementen(soorten) : ""}

${metVeilig ? welkomVeilig(veilig) : ""}
</div>`;
}
