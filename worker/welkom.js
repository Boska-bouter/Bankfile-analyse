// beide-V4R0 (ook zakelijk-V8R4) — welkomstpagina (wens Boska 24-10): wie niet is ingelogd, ziet wat de app doet, de soorten dossier,
// de abonnementen met prijs en hoe het met je gegevens zit, met het inlogvak ernaast (breed) of erboven (smal).
// Bewust niet "alleen de eerste keer": dat is niet te weten (lege cache, privémodus, ander apparaat). Teksten en
// prijzen van de abonnementen komen uit rechten.js, net als op de aanmeldpagina.
import { GEBRUIK, PLANNEN, PLAN_UITLEG, plannenVoor, prijzen, prijsTekst } from "./rechten.js";
import { INZICHTEN, KEUZE, PRIVACY_LABEL, PRIVACY_KERN, PRIVACY_SERVER, GRATIS_KORT, GRATIS_UITLEG, BANKKOPPELING_STATUS } from "../src/content/aanbod.js";

const e = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Breed scherm (iPad liggend, computer): uitleg links, inloggen rechts en blijft staan bij scrollen. Smal scherm:
// eerst inloggen, daaronder de uitleg. Eén inlogvak, geen tweede inlogknop onderaan (wens Boska 24-10).
// huishoudboekje-V1R5 — kleur per soort (akkoord Boska 2-11), gelijk aan de app (src/index.css): klassen s-zakelijk,
// s-prive en s-hb zetten --accent op het element (kaarten op welkomst- en aanmeldpagina, kolom in de vergelijking).
export const SOORT_KLEUR_STIJL = `.s-zakelijk{--accent:#0f766e}.s-prive{--accent:#24569f}.s-hb,.s-huishoudboekje{--accent:#8a3b7c}
@media (prefers-color-scheme:dark){.s-zakelijk{--accent:#2fb3a6}.s-prive{--accent:#6f9be0}.s-hb,.s-huishoudboekje{--accent:#cf86c0}}`;
export const WELKOM_STIJL = `main{max-width:1080px;padding-top:48px}
.drie{margin:8px 0 0;padding-left:20px;font-size:1rem;color:var(--muted)}.drie li{margin:4px 0}.drie b{color:var(--fg)}
.kop h1{font-size:clamp(1.45rem,6.5vw,2.2rem);letter-spacing:-.01em;margin:0;overflow-wrap:anywhere}.kop .sub{font-size:1.05rem;margin-top:6px}
.merk{display:flex;align-items:center;gap:14px}.merk svg{flex:none}.merk h1 .naar{font-weight:400;color:var(--muted)}.merk h1 .aangifte{color:var(--accent)}.merk .onder{color:var(--muted);font-size:14px}
.inlogkop{margin:0 0 -2px;font-size:1.2rem}.inlogkop span{color:var(--muted);font-weight:500}.welkom h2,.inlogkop{line-height:1.3}
.kenmerken{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;padding:0;list-style:none}
.kenmerken a{color:inherit;text-decoration:underline;text-underline-offset:2px}.kenmerken li{font-size:13px;color:var(--accent);background:var(--card);border:1px solid var(--line);border-radius:999px;padding:3px 12px}
.welkom-grid{display:grid;gap:28px;grid-template-areas:"kop" "inlog" "uitleg" "veilig"}.veiligrij{grid-area:veilig;min-width:0}.veiligrij .veilig{display:flex;flex-direction:column;gap:12px}.veiligrij h2{margin:0;font-size:1.2rem;line-height:1.3}.kop{grid-area:kop}
.inlogkolom{grid-area:inlog;display:flex;flex-direction:column;gap:14px;max-width:520px}.uitlegkolom{grid-area:uitleg;min-width:0}
@media (min-width:880px){.welkom-grid{grid-template-columns:minmax(0,1fr) 360px;grid-template-areas:"kop kop" "uitleg inlog" "veilig veilig";align-items:start;gap:32px 40px}
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
.stap p{margin:0}.duo{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}
.klein{font-size:13px;color:var(--muted);margin:0}.klein.mi{font-weight:600;color:var(--fg);margin-top:4px}
.soortkaarten{display:grid;gap:12px;grid-template-columns:1fr}
.soortkaart{display:grid;grid-row:span 7;grid-template-rows:subgrid;row-gap:8px;align-content:start}.soortkaart h3{margin:0;font-size:1.1rem}
.soortkaart .kies{margin:0;font-size:14px;line-height:1.4}.soortkaart .kies span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--accent);font-weight:700;margin-bottom:2px}
.soortkaart{border-top:6px solid var(--accent)}.soortkaart h3{color:var(--accent)}
${SOORT_KLEUR_STIJL}
.soortkaart .klein.mi{margin-top:6px}.soortkaart ul.lang{grid-row:span 3}
@media (min-width:600px){.soortkaarten{grid-template-columns:repeat(3,minmax(0,1fr))}}
.let-op{margin:0;padding:10px 12px;border-radius:8px;border-left:4px solid #d97706;background:rgba(217,119,6,.08);font-size:14px}`;

// Zelfde tekst als VEILIG_KORT in src/content/veiligheid.jsx (de Worker laadt geen React-bestanden).
const VEILIG = "BankafschriftenTool vraagt je nooit om je rekeningnummer, inlogcodes, wachtwoord of bankbestanden per mail, sms, WhatsApp of telefoon. Krijg je zo'n verzoek, stuur dan niets. Help je iemand anders, vraag dan ook zelf nooit om zulke gegevens op die manier.";

// beide-V7R2 — abonnementen compact naast elkaar (ChatGPT-review punt 1): per regel wat elk abonnement heeft, plus
// waar de bankgegevens vandaan komen, wanneer het beschikbaar is en de prijs per soort. Ook op de aanmeldpagina.
// "alleen" = alleen bij die soort dossier; de soort komt erachter als beide soorten op de pagina staan.
const V = "✓", N = "–";
const VERGELIJK = [
  { t: "Eerste inzicht", w: { eenvoudig: "± 30 min", uitgebreid: "± 60-90 min", koppelen: "± 60-90 min" }, hb: "± 15-30 min" },
  { t: "Werkwijze", w: { eenvoudig: "4 stappen, één vraag tegelijk", uitgebreid: "alle overzichten en controles", koppelen: "alle overzichten en controles" }, hb: "één overzicht per maand of week" },
  { t: "Samenvatting om te bewaren of printen", w: { eenvoudig: V, uitgebreid: V, koppelen: V }, hb: V },
  { t: "Indicatie belasting", w: { eenvoudig: V, uitgebreid: V, koppelen: V }, hb: N },
  { t: "Inkomsten en uitgaven per maand en categorie", alleen: "prive", w: { eenvoudig: V, uitgebreid: V, koppelen: V }, hb: V },
  { t: "Inkomen per maand", alleen: "zakelijk", w: { eenvoudig: N, uitgebreid: V, koppelen: V }, hb: N },
  { t: "Meerdere jaren naast elkaar", w: { eenvoudig: N, uitgebreid: V, koppelen: V }, hb: "verloop 12 maanden" },
  { t: "Downloaden (PDF, HTML, Excel)", w: { eenvoudig: N, uitgebreid: V, koppelen: V }, hb: "PDF" },
  { t: "Btw per kwartaal", alleen: "zakelijk", w: { eenvoudig: V, uitgebreid: V, koppelen: V }, hb: N },
  { t: "Aangifteberekening", alleen: "zakelijk", w: { eenvoudig: N, uitgebreid: V, koppelen: V }, hb: N },
  { t: "Vaste lasten, sparen, box 3 en eigen woning", alleen: "prive", w: { eenvoudig: N, uitgebreid: V, koppelen: V }, hb: "vaste lasten en sparen" },
  { t: "Per week, en hoger of lager dan vorige maand", w: { eenvoudig: N, uitgebreid: N, koppelen: N }, hb: V },
  { t: "Eigen budget per categorie met waarschuwing", w: { eenvoudig: N, uitgebreid: N, koppelen: N }, hb: V },
  { t: "Past het bij je inkomen (Nibud, CBS)", w: { eenvoudig: N, uitgebreid: N, koppelen: N }, hb: V },
  { t: "Waar je het meest kunt besparen", w: { eenvoudig: N, uitgebreid: N, koppelen: N }, hb: V },
  { t: "Bankgegevens", w: { eenvoudig: "bestand van de bank", uitgebreid: "bestand van de bank", koppelen: "bestand of bankkoppeling" }, hb: "bestand of bankkoppeling*" },
  { t: "Beschikbaar", w: { eenvoudig: "na goedkeuring", uitgebreid: "na goedkeuring", koppelen: BANKKOPPELING_STATUS }, hb: "na goedkeuring" },
];
const SOORT_NAAM = { zakelijk: "zakelijk", prive: "privé" };

// soorten: zie welkomSoorten. Geeft de tabel met de abonnementen als kolommen.
// huishoudboekje-V1R0 (wens Boska 2-11) — Huishoudboekje als eigen kolom naast Eenvoudig en Uitgebreid.
// Het heeft één abonnement, dus één kolom; regels die alleen voor privé of zakelijk gelden krijgen daar een streepje.
export function vergelijkTabel(soorten, { metHuishoudboekje = true } = {}) {
  const sleutels = soorten[0]?.plannen.map((p) => p.sleutel) || [];
  const soortSleutels = soorten.map((s) => s.soort);
  const meer = soorten.length > 1;
  const hb = metHuishoudboekje;
  const plan = (s, k) => s.plannen.find((p) => p.sleutel === k) || {};
  const cel = (w, k = "") => `<td class="${[w === V ? "ja" : w === N ? "nee" : "", k].filter(Boolean).join(" ")}">${e(w ?? "")}</td>`;
  const regels = VERGELIJK.filter((r) => !r.alleen || soortSleutels.includes(r.alleen)).map((r) =>
    `<tr><th scope="row">${e(r.t)}${r.alleen && meer ? ` <span class="soort">(${SOORT_NAAM[r.alleen]})</span>` : ""}</th>${sleutels.map((k) => cel(r.w[k])).join("")}${hb ? cel(r.hb ?? N, "hbk s-hb") : ""}</tr>`);
  const prijs = (s, k) => (plan(s, k).gratis ? "gratis" : String(plan(s, k).prijs).replace(" per maand", "/mnd"));
  const prijzen = soorten.map((s, i) =>
    `<tr class="prijsregel"><th scope="row">Prijs${meer ? ` ${e(SOORT_NAAM[s.soort])}` : ""}</th>${sleutels.map((k) => `<td>${e(prijs(s, k))}</td>`).join("")}${hb && i === 0 ? `<td class="hbk s-hb" rowspan="${soorten.length}">${e(soorten.hbPrijs || HUISHOUDBOEKJE.prijs)}</td>` : ""}</tr>`);
  const groep = hb ? `<tr class="groep"><th></th><th scope="colgroup" colspan="${sleutels.length}">Zakelijk en privé</th><th scope="col" class="hbk s-hb" rowspan="2">Huishoud&shy;boekje<span>één abonnement</span></th></tr>` : "";
  return `<div class="vergelijk"><table>
<thead>${groep}<tr><th></th>${sleutels.map((k) => `<th scope="col">${e(plan(soorten[0], k).naam)}</th>`).join("")}</tr></thead>
<tbody>${regels.join("")}${prijzen.join("")}</tbody></table></div>${hb ? `<p class="klein">* Bankkoppeling via Ponto: ${e(BANKKOPPELING_STATUS)}.</p>` : ""}${sleutels.includes("koppelen")
    ? `<p class="klein let">De bankkoppeling krijgt straks extra kosten, vanwege de koppeling met de bank en de extra beveiliging die daarvoor nodig is.</p>` : ""}`;
}
export const VERGELIJK_STIJL = `.vergelijk{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:12px}
.vergelijk table{width:100%;border-collapse:collapse;font-size:13px}
.vergelijk th,.vergelijk td{padding:8px 10px;text-align:center;vertical-align:top;border-top:1px solid var(--line)}
.vergelijk thead th{border-top:0;color:var(--fg);font-weight:600;background:var(--bg)}
.vergelijk tbody th{text-align:left;font-weight:500;color:var(--muted)}.vergelijk .soort{font-weight:400}
.vergelijk td.ja{color:var(--accent);font-weight:700}.vergelijk td.nee{color:var(--muted)}
.vergelijk .prijsregel td{color:var(--accent);font-weight:600}
.vergelijk .groep th{font-size:12px;font-weight:600;color:var(--muted);background:var(--bg);padding-bottom:0}
.vergelijk .hbk{border-left:3px solid var(--accent)}.vergelijk thead th.hbk{border-top:4px solid var(--accent)}.vergelijk thead .hbk{vertical-align:bottom;color:var(--fg)}
.vergelijk thead .hbk span{display:block;font-weight:400;font-size:11px;color:var(--muted)}
.vergelijk .prijsregel td.hbk{vertical-align:middle}
@media (max-width:520px){.vergelijk th,.vergelijk td{padding:6px 4px !important;font-size:11px;hyphens:auto}.vergelijk tbody th{width:32%}.vergelijk thead .hbk{font-size:11px}}
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
// Huishoudboekje: derde soort dossier met één abonnement (wens Boska 2-11), met een eigen kolom in de vergelijktabel.
export const HUISHOUDBOEKJE = {
  naam: "Huishoudboekje",
  voor: "Voor iedereen die grip wil op het huishoudgeld, alleen of samen.",
  kies: KEUZE.huishoudboekje,
  ...INZICHTEN.huishoudboekje,
  prijs: "Gratis, 1 maand",
};
// huishoudboekje-V1R0 — prijs van het Huishoudboekje uit PRIJZEN (gratis: de eerste maand gratis).
export function huishoudPrijs(env) {
  const plan = Object.keys(plannenVoor(env, "huishoudboekje"))[0];
  const bedrag = Number(prijzen(env).huishoudboekje[plan]) || 0;
  const korting = prijzen(env).huishoudboekjeMetUitgebreid; // huishoudboekje-V1R3
  const metKorting = bedrag > 0 && korting !== null && korting < bedrag ? ` · met Uitgebreid € ${korting.toFixed(2).replace(".", ",")}/mnd` : "";
  return { tekst: bedrag > 0 ? `€ ${bedrag.toFixed(2).replace(".", ",")}/mnd${metKorting}` : HUISHOUDBOEKJE.prijs, gratis: !bedrag };
}
export function welkomSoorten(env) {
  const pr = prijzen(env);
  const lijst = ["zakelijk", "prive"].map((s) => ({
    soort: s, naam: GEBRUIK[s], ...SOORT_UITLEG[s],
    plannen: Object.keys(plannenVoor(env)).map((k) => ({ sleutel: k, naam: PLANNEN[k], uitleg: PLAN_UITLEG[s][k], prijs: prijsTekst(pr[s][k]), gratis: !Number(pr[s][k]) })),
  }));
  const hb = huishoudPrijs(env);
  lijst.hbPrijs = hb.tekst; // voor de kolom Huishoudboekje in vergelijkTabel
  lijst.hbGratis = hb.gratis;
  return lijst;
}
export const alleGratis = (soorten) => soorten.every((s) => s.plannen.every((p) => p.gratis)) && soorten.hbGratis !== false;

export function welkomKop(soorten) {
  const gratis = alleGratis(soorten);
  const kenmerken = [soorten.length > 1 ? "Zakelijk, privé en huishoudboekje" : `Voor ${soorten[0]?.naam.toLowerCase() || "zakelijk"} gebruik`,
    { tekst: PRIVACY_LABEL, href: "#veilig" }, gratis ? GRATIS_KORT : null].filter(Boolean);
  return `<header class="kop">
<div class="merk"><svg width="52" height="52" viewBox="0 0 34 34" aria-hidden="true"><rect x="1" y="1" width="32" height="32" rx="8" fill="#1E2A4A"/><rect x="7" y="6" width="15" height="21" rx="2" fill="#fff"/><rect x="10" y="10" width="9" height="1.8" rx=".9" fill="#94a3b8"/><rect x="10" y="14" width="6" height="1.8" rx=".9" fill="#94a3b8"/><circle cx="21" cy="21" r="5" fill="#1E2A4A" stroke="#14b8a6" stroke-width="2.4"/><path d="M24.6 24.6l3.6 3.6" stroke="#14b8a6" stroke-width="2.8" stroke-linecap="round"/></svg><div><h1>Bankafschriften<span class="aangifte">Tool</span></h1><div class="onder">Inzicht in geldstromen, van bankafschrift naar aangifte</div></div></div>
<p class="sub">Bankafschriften vanzelf ingedeeld, voor drie soorten gebruik:</p>
<ul class="drie"><li><b>Zakelijk</b> voor zzp, eenmanszaak en BV: winst, aftrekposten, afschrijvingen, indicatie btw- en IB-aangifte.</li><li><b>Privé</b> voor particulieren: inzicht in je privégeld en voorbereiding op de IB-aangifte.</li><li><b>Huishoudboekje</b>: per week en per maand zien waar je geld blijft.<span class="alleen-smal"> <a href="#wat" style="color:var(--accent)">Meer weten</a></span></li></ul>
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

// huishoudboekje-V1R0 — de soortkaarten staan op dezelfde regels (subgrid): naam, waarom kiezen, voor wie, eerste lijst, tweede lijst.
const soortKaart = (naam, kies, voor, lijsten, extra = "") => `
      <div class="kaart soortkaart s-${extra || "zakelijk"}"><h3>${e(naam)}</h3><p class="kies"><span>Kies dit voor</span>${e(kies)}</p><p class="klein">${e(voor)}</p>${lijsten.map(([kop, l], i) =>
    `<p class="klein mi">${e(kop)}</p><ul${lijsten.length === 1 ? ` class="lang"` : ""}>${l.map((k) => `<li>${e(k)}</li>`).join("")}</ul>`).join("")}</div>`;

export function welkomInhoud({ soorten, veilig = VEILIG, metVeilig = true }) {
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
    <h2>${meer ? "Zakelijk, privé of huishoudboekje" : "Voor wie"}</h2>
    <div class="soortkaarten">${soorten.map((s) => soortKaart(s.naam, s.kies, s.voor, [["In Eenvoudig en Uitgebreid", s.beide], ["Alleen in Uitgebreid", s.uitgebreid]], s.soort)).join("")}
      ${soortKaart(HUISHOUDBOEKJE.naam, HUISHOUDBOEKJE.kies, HUISHOUDBOEKJE.voor, [["Eén abonnement, alles erin", HUISHOUDBOEKJE.alles]], "hb")}
    </div>
    ${meer ? `<p class="klein">Met één account kun je ze allemaal hebben, elk met een eigen dossier.</p>` : ""}
  </section>

  <section>
    <h2>Abonnementen</h2>
    ${vergelijkTabel(soorten)}
    <p class="klein">De tijden gaan uit van medewerking van de cliënt bij de vragen die de app stelt.</p>
    <p class="klein">Eenvoudig of Uitgebreid kies je per dossier bij Privé en Zakelijk. Een dossier in Eenvoudig kun je later één keer omzetten naar Uitgebreid; terug kan niet.</p>
  </section>

${metVeilig ? welkomVeilig(veilig) : ""}
</div>`;
}
