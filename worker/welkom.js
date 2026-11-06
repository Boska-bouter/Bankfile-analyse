// beide-V4R0 (ook zakelijk-V8R4) — welkomstpagina (wens Boska 24-10): wie niet is ingelogd, ziet wat de app doet, de soorten dossier,
// de abonnementen met prijs en hoe het met je gegevens zit, met het inlogvak ernaast (breed) of erboven (smal).
// Bewust niet "alleen de eerste keer": dat is niet te weten (lege cache, privémodus, ander apparaat). Teksten en
// prijzen van de abonnementen komen uit rechten.js, net als op de aanmeldpagina.
import { GEBRUIK, PLANNEN, PLAN_UITLEG, plannenVoor, prijzen, prijsTekst } from "./rechten.js";
import { INZICHTEN, KEUZE, SOORT_KORT, PRIVACY_LABEL, PRIVACY_KERN, PRIVACY_SERVER, GRATIS_KORT, GRATIS_UITLEG, GRATIS_DAGEN, BANKKOPPELING_STATUS, OMZETTEN, OMZETTEN_KORTING, OMZETTEN_WELKOM, OMZETTEN_WELKOM_KORTING } from "../src/content/aanbod.js";

const e = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Breed scherm (iPad liggend, computer): uitleg links, inloggen rechts en blijft staan bij scrollen. Smal scherm:
// eerst inloggen, daaronder de uitleg. Eén inlogvak, geen tweede inlogknop onderaan (wens Boska 24-10).
// huishoudboekje-V1R5 — kleur per soort (akkoord Boska 2-11), gelijk aan de app (src/index.css): klassen s-zakelijk,
// s-prive en s-hb zetten --accent op het element (kaarten op welkomst- en aanmeldpagina, kolom in de vergelijking).
export const SOORT_KLEUR_STIJL = `.s-zakelijk{--accent:#0f766e}.s-prive{--accent:#24569f}.s-hb,.s-huishoudboekje{--accent:#8a3b7c}
@media (prefers-color-scheme:dark){.s-zakelijk{--accent:#2fb3a6}.s-prive{--accent:#6f9be0}.s-hb,.s-huishoudboekje{--accent:#cf86c0}}`;
export const WELKOM_STIJL = `main{max-width:1440px;padding-top:48px}
.drie{margin:8px 0 0;padding-left:20px;font-size:1rem;color:var(--muted)}.drie li{margin:4px 0}.drie b{color:var(--fg)}
.omzetband{margin:12px 0 0;padding:10px 14px;border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:8px;background:var(--card);font-size:14px}
.kop h1{font-size:clamp(1.45rem,6.5vw,2.2rem);letter-spacing:-.01em;margin:0;overflow-wrap:anywhere}.kop .sub{font-size:1.05rem;margin-top:6px}
.merk{display:flex;align-items:center;gap:14px}.merk svg{flex:none}.merk h1 .naar{font-weight:400;color:var(--muted)}.merk h1 .aangifte{color:var(--accent)}.merk .onder{color:var(--muted);font-size:14px}
.inlogkop{margin:0 0 -2px;font-size:1.2rem}.inlogkop span{color:var(--muted);font-weight:500}.welkom h2,.inlogkop{line-height:1.3}
.kenmerken{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;padding:0;list-style:none}
.kenmerken a{color:inherit;text-decoration:underline;text-underline-offset:2px}.kenmerken li{font-size:13px;color:var(--accent);background:var(--card);border:1px solid var(--line);border-radius:999px;padding:3px 12px}
.welkom-grid{display:grid;gap:28px;grid-template-areas:"kop" "inlog" "uitleg" "omzet" "veilig"}.omzetrij{grid-area:omzet;min-width:0}.omzetrij .omzetband{margin:0}.veiligrij{grid-area:veilig;min-width:0}.veiligrij .veilig{display:flex;flex-direction:column;gap:12px}.veiligrij h2{margin:0;font-size:1.2rem;line-height:1.3}.kop{grid-area:kop}
.inlogkolom{grid-area:inlog;display:flex;flex-direction:column;gap:14px;max-width:520px}.uitlegkolom{grid-area:uitleg;min-width:0}
@media (min-width:880px){.welkom-grid{grid-template-columns:minmax(0,1fr) 360px;grid-template-areas:"kop kop" "uitleg inlog" "omzet omzet" "veilig veilig";align-items:start;gap:32px 40px}
.alleen-smal{display:none}}
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
.klein{font-size:14px;color:var(--muted);margin:0}.klein.mi{font-weight:600;color:var(--fg);margin-top:4px}
.soortkaarten{display:grid;gap:12px;grid-template-columns:1fr}
.soortkaart{display:grid;grid-row:span 7;grid-template-rows:subgrid;row-gap:8px;align-content:start}.soortkaart h3{margin:0;font-size:1.1rem}
.soortkaart .kies{margin:0;font-size:14px;line-height:1.4}.soortkaart .kies span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--accent);font-weight:700;margin-bottom:2px}
.soortkaart{border-top:6px solid var(--accent)}.soortkaart h3{color:var(--accent)}
${SOORT_KLEUR_STIJL}
.soortkaart .klein.mi{margin-top:6px;padding-top:10px;border-top:1px solid var(--line)}.soortkaart ul{font-size:14px}.soortkaart ul.lang{grid-row:span 3}
@media (min-width:600px){.soortkaarten{grid-template-columns:repeat(3,minmax(0,1fr))}}
.let-op{margin:0;padding:10px 12px;border-radius:8px;border-left:4px solid #d97706;background:rgba(217,119,6,.08);font-size:14px}`;

// Zelfde tekst als VEILIG_KORT in src/content/veiligheid.jsx (de Worker laadt geen React-bestanden).
const VEILIG = "BankafschriftenTool vraagt je nooit om je rekeningnummer, inlogcodes, wachtwoord of bankbestanden per mail, sms, WhatsApp of telefoon. Krijg je zo'n verzoek, stuur dan niets. Help je iemand anders, vraag dan ook zelf nooit om zulke gegevens op die manier.";

// beide-V7R2 — abonnementen compact naast elkaar (ChatGPT-review punt 1): per regel wat elk abonnement heeft, plus
// waar de bankgegevens vandaan komen, wanneer het beschikbaar is en de prijs per soort. Ook op de aanmeldpagina.
// "alleen" = alleen bij die soort dossier; de soort komt erachter als beide soorten op de pagina staan.
const V = "✓", N = "–";

// soorten: zie welkomSoorten. Geeft de tabellen met de abonnementen als kolommen.
// beide-V13R6 (overgenomen in huishoudboekje-V1R7) — één tabel per soort (wens Boska 3-11: zakelijk heeft geen box 3,
// privé geen btw). De regels komen uit dezelfde lijst als de soortkaarten (INZICHTEN in src/content/aanbod.js): "beide" =
// in Eenvoudig en Uitgebreid, "uitgebreid" = alleen in Uitgebreid. Elke tabel in de kleur van zijn soort.
// huishoudboekje-V1R7 — het Huishoudboekje is een derde tabel (pruim) met één kolom, in plaats van de vroegere hb-kolom.
const ALGEMEEN_BOVEN = [
  { t: "Eerste inzicht", w: { eenvoudig: "± 30 min", uitgebreid: "± 60-90 min", koppelen: "± 60-90 min" } },
  { t: "Werkwijze", w: { eenvoudig: "begeleid, één vraag tegelijk", uitgebreid: "alle overzichten en controles, in je eigen volgorde", koppelen: "alle overzichten en controles, in je eigen volgorde" } },
];
const ALGEMEEN_ONDER = [
  { t: "Bankgegevens", w: { eenvoudig: "bestand van de bank", uitgebreid: "bestand van de bank", koppelen: "bestand of bankkoppeling" } },
  { t: "Beschikbaar", w: { eenvoudig: "na goedkeuring", uitgebreid: "na goedkeuring", koppelen: BANKKOPPELING_STATUS } },
];
const NIET_IN = {
  zakelijk: "Niet in Zakelijk: box 3 (sparen en beleggen) en eigen woning. Die horen bij Privé.",
  prive: "Niet in Privé: btw, aangifteberekening voor een onderneming, bedrijfsmiddelen en afschrijvingen. Die horen bij Zakelijk.",
  huishoudboekje: "Niet in het Huishoudboekje: belasting, btw en aangifte. Die horen bij Zakelijk en Privé.",
};
// huishoudboekje-V1R9 — de abonnementen staan in één gedeeld raster (CSS subgrid): gelijke regels (Eerste inzicht,
// Werkwijze, Bankgegevens, Beschikbaar, Prijs, "Niet in …") staan in alle tabellen op dezelfde hoogte, ook als een
// tabel minder regels heeft of een tekst over meer regels loopt (wens Boska 3-11). Elke kaart heeft dezelfde 9 rijen;
// de kenmerken staan per kaart in één blok, zodat een kortere lijst lege ruimte onderaan dat blok krijgt.
export function vergelijkTabel(soorten, { metHuishoudboekje = true } = {}) {
  const sleutels = soorten[0]?.plannen.map((p) => p.sleutel) || [];
  const meer = soorten.length > 1 || metHuishoudboekje;
  const cel = (w) => `<span role="cell" class="${w === V ? "ja" : w === N ? "nee" : ""}">${w === V ? '<span aria-label="ja">✓</span>' : w === N ? '<span aria-label="nee">–</span>' : e(w)}</span>`;
  // huishoudboekje-V2R6 — zachte afbreekstreepjes in lange woorden, zodat een smalle kolom (iPad) niet midden in een woord
  // afbreekt ("Aangifteberekenin g"); zonder hyphens:auto, dat in Safari de regelhoogte verstoorde.
  const zacht = (t) => e(t).replace(/(Aangifte|inkomsten|Bedrijfs|vermogen)(berekening|belasting|middelen)/gi, "$1&shy;$2");
  const rij = (t, w, ks, kl = "") => `<div role="row" class="vr${kl}"><span role="rowheader">${zacht(t)}</span>${ks.map((k) => cel(w[k])).join("")}</div>`;
  const alle = (w) => Object.fromEntries(sleutels.map((k) => [k, w(k)]));
  const kaarten = [];
  for (const s of soorten) {
    const plan = (k) => s.plannen.find((p) => p.sleutel === k) || {};
    kaarten.push({
      soort: s.soort, naam: s.naam, ks: sleutels, korting: s.korting || null,
      kop: sleutels.map((k) => plan(k).naam),
      boven: ALGEMEEN_BOVEN.map((r) => [r.t, r.w]),
      kenmerken: [...s.beide.map((t) => [t, alle(() => V)]), ...s.uitgebreid.map((t) => [t, alle((k) => (k === "eenvoudig" ? N : V))])],
      onder: ALGEMEEN_ONDER.map((r) => [r.t, r.w]),
      prijs: alle((k) => (plan(k).gratis ? `${GRATIS_DAGEN} dagen gratis` : String(plan(k).prijs).replace(" per maand", "/mnd"))),
    });
  }
  if (metHuishoudboekje) {
    kaarten.push({
      soort: "huishoudboekje", naam: HUISHOUDBOEKJE.naam, ks: ["hb"], kop: ["één abonnement"],
      boven: [["Eerste inzicht", { hb: "± 15-30 min" }], ["Werkwijze", { hb: "één overzicht per maand of week" }]],
      kenmerken: HUISHOUDBOEKJE.alles.map((t) => [t, { hb: V }]),
      onder: [["Bankgegevens", { hb: "bestand of bankkoppeling*" }], ["Beschikbaar", { hb: "na goedkeuring" }]],
      prijs: { hb: soorten.hbPrijs || HUISHOUDBOEKJE.prijs },
    });
  }
  // Rijen: naam, kop, 2× boven, blok kenmerken, 2× onder, prijs, niet-in.
  const rijen = 9;
  const kaart = (k) => `<div class="vergelijk s-${k.soort}" role="table" aria-label="${e(k.naam)}" style="grid-row:span ${rijen};--kol:${k.ks.length === 1 ? "62% minmax(0,1fr)" : `42% repeat(${k.ks.length},minmax(0,1fr))`}">
<div class="vnaam">${e(k.naam)}</div>
<div role="row" class="vr vkop"><span role="columnheader"></span>${k.kop.map((t) => `<span role="columnheader">${e(t)}</span>`).join("")}</div>
${k.boven.map(([t, w]) => rij(t, w, k.ks)).join("")}
<div role="rowgroup" class="vken">${k.kenmerken.map(([t, w]) => rij(t, w, k.ks)).join("")}</div>
${k.onder.map(([t, w]) => rij(t, w, k.ks)).join("")}
${rij("Prijs", k.prijs, k.ks, " prijsregel")}
<div class="niet-in">${meer && NIET_IN[k.soort] ? `<p>${e(NIET_IN[k.soort])}</p><p class="omzet">${e(OMZETTEN[k.soort])}${k.korting ? ` ${e(OMZETTEN_KORTING[k.soort](k.korting))}` : ""}</p>` : ""}</div></div>`;
  return `<div class="vergelijk-lijst">${kaarten.map(kaart).join("")}</div>${metHuishoudboekje ? `<p class="klein">* Bankkoppeling via Ponto: ${e(BANKKOPPELING_STATUS)}.</p>` : ""}${sleutels.includes("koppelen")
    ? `<p class="klein let">De bankkoppeling krijgt straks extra kosten, vanwege de koppeling met de bank en de extra beveiliging die daarvoor nodig is.</p>` : ""}`;
}
// beide-V14R6 — kolommen per regel via --kol i.p.v. subgrid in subgrid: Safari (iPad) berekende de regelhoogte
// dan verkeerd, waardoor regels over elkaar vielen (melding Boska 3-11). De rijen blijven subgrid (gelijke hoogte).
export const VERGELIJK_STIJL = `.vergelijk-lijst{display:grid;column-gap:16px;row-gap:0;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}
.vergelijk{display:grid;grid-template-rows:subgrid;grid-template-columns:var(--kol);align-content:start;margin-bottom:16px;background:var(--card);border:1px solid var(--line);border-top:6px solid var(--accent);border-radius:12px;font-size:13px;overflow:hidden}
.vergelijk>*{grid-column:1/-1}
.vergelijk .vr{grid-column:1/-1;display:grid;grid-template-columns:var(--kol);border-top:1px solid var(--line)}
.vergelijk .vken{display:flex;flex-direction:column}
.vergelijk .vr>span{padding:8px 10px;text-align:center;overflow-wrap:break-word}
.vergelijk .vr>span[role=rowheader]{text-align:left;font-weight:500;color:var(--muted)}
.vergelijk .vnaam{padding:10px 10px 6px;font-weight:700;font-size:1.05rem;color:var(--accent)}
.vergelijk .vkop{border-top:0;background:var(--bg);align-items:end}.vergelijk .vkop>span{color:var(--fg);font-weight:600}
.vergelijk .ja{color:var(--accent);font-weight:700}.vergelijk .nee{color:var(--muted)}.vergelijk .ja>span,.vergelijk .nee>span{font-size:16px;line-height:1}.legenda .ja{color:var(--accent);font-weight:700}.legenda .nee{font-weight:700}
.vergelijk .prijsregel>span:not([role=rowheader]){color:var(--accent);font-weight:600}
.vergelijk .niet-in{margin:0;padding:8px 10px 10px;font-size:12.5px;color:var(--muted);border-top:1px solid var(--line);background:var(--bg)}
.vergelijk .niet-in:empty{display:none}
.vergelijk .niet-in p{margin:0}
.vergelijk .niet-in .omzet{margin-top:6px;color:var(--fg);font-weight:500}
@media (max-width:1180px){.vergelijk{font-size:12.5px}.vergelijk .vr>span{padding:7px 6px}}
@media (max-width:520px){.vergelijk{font-size:12px}.vergelijk .vr>span{padding:6px 4px}}
.let{color:#b45309}`;

// soorten: [{ soort, naam, voor, beide: [..], uitgebreid: [..], plannen: [{ sleutel, naam, prijs, gratis }] }]
// beide-V13R1 — per soort wat er mogelijk is, verdeeld over Eenvoudig en Uitgebreid (wens Boska 31-10: niet beloven
// dat je alles altijd krijgt).
// beide-V13R3 — de lijsten zelf staan in src/content/aanbod.js (ook gebruikt door de app).
const SOORT_UITLEG = {
  prive: { voor: "Voor particulieren, eventueel met partner.", kies: KEUZE.prive, ...INZICHTEN.prive },
  zakelijk: { voor: "Voor zzp, eenmanszaak of BV.", kies: KEUZE.zakelijk, ...INZICHTEN.zakelijk },
};
// Huishoudboekje: derde soort dossier met één abonnement (wens Boska 2-11), met een eigen kolom in de vergelijktabel.
export const HUISHOUDBOEKJE = {
  naam: "Huishoudboekje",
  voor: "Voor iedereen die grip wil op het huishoudgeld.",
  kies: KEUZE.huishoudboekje,
  ...INZICHTEN.huishoudboekje,
  prijs: `${GRATIS_DAGEN} dagen gratis`, // huishoudboekje-V2R7 — zelfde schrijfwijze als Zakelijk en Privé
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
    soort: s, naam: GEBRUIK[s], ...SOORT_UITLEG[s], korting: pr.korting, // beide-V14R0
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
  const kenmerken = [soorten.length > 1 ? "Zakelijk, Privé en Huishoudboekje" : `Voor ${soorten[0]?.naam.toLowerCase() || "zakelijk"} gebruik`,
    { tekst: PRIVACY_LABEL, href: "#veilig" }, gratis ? GRATIS_KORT : null].filter(Boolean);
  return `<header class="kop">
<div class="merk"><svg width="52" height="52" viewBox="0 0 34 34" aria-hidden="true"><rect x="1" y="1" width="32" height="32" rx="8" fill="#1E2A4A"/><rect x="7" y="6" width="15" height="21" rx="2" fill="#fff"/><rect x="10" y="10" width="9" height="1.8" rx=".9" fill="#94a3b8"/><rect x="10" y="14" width="6" height="1.8" rx=".9" fill="#94a3b8"/><circle cx="21" cy="21" r="5" fill="#1E2A4A" stroke="#14b8a6" stroke-width="2.4"/><path d="M24.6 24.6l3.6 3.6" stroke="#14b8a6" stroke-width="2.8" stroke-linecap="round"/></svg><div><h1>Bankafschriften<span class="aangifte">Tool</span></h1><div class="onder">Inzicht in geldstromen, van bankafschrift tot indicatie voor de aangifte</div></div></div>
<p class="sub">Bankafschriften vanzelf ingedeeld, voor drie soorten gebruik:</p>
<ul class="drie"><li><b>Zakelijk</b> voor zzp, eenmanszaak en BV: winst, aftrekposten, afschrijvingen, indicatie btw- en IB-aangifte.</li><li><b>Privé</b> voor particulieren: inzicht in je privé-inkomsten en -uitgaven en een indicatie voor je IB-aangifte.</li><li><b>Huishoudboekje</b> voor iedereen: per week en per maand zien waar je geld naartoe gaat.<span class="alleen-smal"> <a href="#wat" style="color:var(--accent)">Meer weten</a></span></li></ul>
<ul class="kenmerken">${kenmerken.map((k) => k.href ? `<li><a href="${k.href}">${e(k.tekst)}</a></li>` : `<li>${e(k)}</li>`).join("")}</ul>
</header>`;
}

// In het aanvraagvak: in drie korte stappen hoe je begint (stond eerst dubbel, boven én onder de uitleg).
export const welkomNieuw = (gratis) => `<ol class="nieuw">
<li>Vul je e-mailadres in en kies <b>Account aanvragen</b>. Je krijgt een mail met een inloglink.</li>
<li>Log in met die link en kies je abonnement: Zakelijk, Privé of Huishoudboekje (bij Zakelijk en Privé ook Eenvoudig of Uitgebreid).</li>
<li>De beheerder beoordeelt je aanvraag. Na goedkeuring ontvang je een e-mail.${gratis ? ` Vanaf dat moment gaat je gratis proefperiode van ${GRATIS_DAGEN} dagen in.` : ""}</li>
<li>Stel een wachtwoord of passkey in. Daarna log je zonder mail in.</li></ol>`;

// beide-V12R7 — veiligheidsblok los, zodat de inlogpagina het onderaan over de volle breedte kan zetten (wens Boska 31-10).
export const welkomVeilig = (veilig = VEILIG) => `
  <section class="veilig">
    <h2 id="veilig">Je gegevens blijven op je eigen apparaat</h2>
    <div class="kaart">
      <p style="margin:0">${e(PRIVACY_KERN)} ${e(PRIVACY_SERVER)} Een kopie van het dossier kun je als bestand opslaan, als je wilt met een wachtwoord. De uitkomsten zijn een indicatie, geen aangifte of advies.</p>
      <p class="let-op">${e(veilig)}</p>
    </div>
  </section>
`;

// huishoudboekje-V1R0 — de soortkaarten staan op dezelfde regels (subgrid): naam, waarom kiezen, voor wie, eerste lijst, tweede lijst.
const soortKaart = (naam, kies, voor, lijsten, extra = "") => `
      <div class="kaart soortkaart s-${extra || "zakelijk"}"><h3>${e(naam)}</h3><p class="kies"><span>Kies dit voor</span>${e(kies)}</p><p class="klein">${e(voor)}</p>${lijsten.map(([kop, l], i) =>
    `<p class="klein mi">${e(kop)}</p><ul${lijsten.length === 1 ? ` class="lang"` : ""}>${l.map((k) => `<li>${e(k)}</li>`).join("")}</ul>`).join("")}</div>`;

// beide-V13R6 (overgenomen in huishoudboekje-V1R7) — abonnementen los, zodat de inlogpagina ze over de volle breedte kan
// zetten (tabellen naast elkaar, wens Boska 3-11).
export const welkomAbonnementen = (soorten) => `
  <section>
    <h2>Abonnementen</h2>
    ${vergelijkTabel(soorten)}
    <p class="klein legenda"><span class="ja">✓</span> inbegrepen · <span class="nee">–</span> niet inbegrepen</p>
    <p class="klein">Eenvoudig of Uitgebreid kies je per dossier bij Zakelijk en Privé. De tijden gaan uit van medewerking van de cliënt bij de vragen die de app stelt.</p>
    <p class="let-op">Let op: een dossier kun je één keer van Eenvoudig naar Uitgebreid omzetten. Terug naar Eenvoudig kan niet.</p>
  </section>
`;

// beide-V14R8 — uitleg over omzetten los, zodat de inlogpagina hem over de volle breedte kan zetten (wens Boska 4-11).
export const welkomOmzetband = (soorten) => soorten.length > 1
  ? `<p class="omzetband">${e(OMZETTEN_WELKOM)}${soorten[0]?.korting ? ` ${e(OMZETTEN_WELKOM_KORTING(soorten[0].korting))}` : ""}</p>` : "";

export function welkomInhoud({ soorten, veilig = VEILIG, metVeilig = true, metAbonnementen = true, abonKnop = false, metOmzetband = true }) {
  const meer = soorten.length > 1;
  const sleutels = soorten[0]?.plannen.map((p) => p.sleutel) || [];
  return `
<div class="welkom">
  <section aria-labelledby="wat">
    <h2 id="wat">Wat doet BankafschriftenTool?</h2>
    <div class="stappen">
      <div class="kaart stap"><b>Bankgegevens inlezen</b><p class="klein">Lees de bestanden van de bank in (CSV/XLS, MT940 of CAMT.053)${sleutels.includes("koppelen") ? ` of gebruik de bankkoppeling (${BANKKOPPELING_STATUS})` : ""}, ook van meerdere rekeningen en jaren.</p></div>
      <div class="kaart stap"><b>Indelen en controleren</b><p class="klein">De app deelt de boekingen zelf in. Wat niet zeker is, vraagt hij je, één voor één of in een lijst.</p></div>
      <div class="kaart stap"><b>Overzichten en rapportages</b><p class="klein">Inkomsten en uitgaven per maand en categorie. Bij Zakelijk en Privé met een indicatie voor de btw- en IB-aangifte; de aangifte zelf doe je bij de Belastingdienst. Te downloaden (PDF, HTML, Excel) en te printen.</p></div>
    </div>
  </section>

  <section>
    ${abonKnop ? `<div class="soortkop"><h2>${meer ? "Zakelijk, Privé of Huishoudboekje" : "Voor wie"}</h2><button type="button" id="abonknop" class="tweede abonknop" aria-haspopup="dialog">Abonnementen vergelijken</button></div>` // beide-V14R4: knop naast de kop (wens Boska 3-11)
      : `<h2>${meer ? "Zakelijk, Privé of Huishoudboekje" : "Voor wie"}</h2>`}
    <div class="soortkaarten">${soorten.map((s) => soortKaart(s.naam, s.kies, s.voor, [["In Eenvoudig en Uitgebreid", s.beide], ["Alleen in Uitgebreid", s.uitgebreid]], s.soort)).join("")}
      ${soortKaart(HUISHOUDBOEKJE.naam, HUISHOUDBOEKJE.kies, HUISHOUDBOEKJE.voor, [["Eén abonnement", HUISHOUDBOEKJE.alles]] /* huishoudboekje-V5R0 — "Eén abonnement" (ChatGPT-check, akkoord Boska 5-11); niet "alles erin" (4-11) */, "hb")}
    </div>
    ${meer ? `<p class="klein">Met één account kun je ze allemaal hebben, elk met een eigen dossier.</p>${metOmzetband ? welkomOmzetband(soorten) : ""}` : ""}
  </section>

${metAbonnementen ? welkomAbonnementen(soorten) : ""}

${metVeilig ? welkomVeilig(veilig) : ""}
</div>`;
}
