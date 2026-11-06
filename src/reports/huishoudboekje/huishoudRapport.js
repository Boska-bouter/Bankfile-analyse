// huishoudboekje-V1R0 — rapport (PDF/HTML/print) van een Huishoudboekje: één maand of week, met de vorige periode,
// vaste lasten, variabele uitgaven met budget, "past het bij je inkomen?", besparen en het verloop. Geen belasting.
import { esc, bedrag, rij, document } from "../prive/opmaak.js";
import { huishoudOverzicht, gemiddeldeLaatsteMaanden } from "../../calc/huishoudboekje/overzicht.js";
import { gewoonlijk, vergelijkGewoonlijk, opvallendeUitgaven, GEWOONLIJK_MAANDEN } from "../../calc/huishoudboekje/gewoonlijk.js";
import { periodeLabel, verschuif, kortLabel } from "../../calc/huishoudboekje/periodes.js";
import { verhoudingen, fmtPct } from "../../calc/huishoudboekje/verhoudingen.js";
import { budgetStatus } from "../../calc/huishoudboekje/budget.js";
import { terugkerend, bespaarPlekken } from "../../calc/huishoudboekje/besparen.js";
import { huishoudenUit } from "../../modus/huishoudboekje/wizard.js";

// huishoudboekje-V3R2 — vergelijking met wat gewoonlijk is (gemiddelde laatste zes volledige maanden), besluit Boska 4-11.
const GEWOON = { gewoon: "zoals gewoonlijk", hoger: "hoger dan gewoonlijk", lager: "lager dan gewoonlijk", nieuw: "niet gebruikelijk" };
const gewoonTekst = (nu, gem, soort, hogerIsBeter = false) => {
  const v = vergelijkGewoonlijk(nu, gem, soort);
  if (!v) return "";
  if (v === "gewoon") return GEWOON.gewoon;
  const goed = v === "lager" ? !hogerIsBeter : hogerIsBeter;
  return `<span class="${goed ? "groen" : "oranje"}">${GEWOON[v]}</span>`;
};

export const HUISHOUD_DISCLAIMER = "<strong>Let op:</strong> dit overzicht is gemaakt uit je bankgegevens. De vergelijking met wat gebruikelijk is, is een indicatie op basis van gemiddelden van het Nibud en het CBS; jouw situatie kan anders zijn.";

export function buildHuishoudRapportHtml({ transacties, vasteCategorieen: vasteInstelling = [], antwoorden = {}, budgetten = {}, soort = "maand", periode = null, label = (c) => c, namen = null, uitsmeren = true, vandaag = new Date() }) {
  // huishoudboekje-V1R1 — aangekruiste vaste lasten uit de wizard tellen mee; spaardoel per maand.
  const vasteCategorieen = [...new Set([...(vasteInstelling || []), ...(Array.isArray(antwoorden?.vasteLasten) ? antwoorden.vasteLasten : [])])];
  const spaardoel = Number(antwoorden?.spaardoel) > 0 ? Number(antwoorden.spaardoel) : 0;
  const ov = huishoudOverzicht(transacties, { soort, vasteCategorieen, uitsmeren, vandaag });
  const maandOv = soort === "maand" ? ov : huishoudOverzicht(transacties, { soort: "maand", vasteCategorieen, uitsmeren, vandaag });
  const p = periode && ov.per.has(periode) ? periode : [...ov.periodes].reverse().find((x) => ov.volledig.get(x)) || ov.periodes[ov.periodes.length - 1];
  const sub = `${namen?.ondernemer ? `${esc(namen.ondernemer)} · ` : ""}Huishoudboekje · opgesteld ${vandaag.toLocaleDateString("nl-NL")}`;
  if (!p) return document({ titel: "Huishoudboekje", sub, inhoud: "<p>Er staan nog geen bankgegevens in dit dossier.</p>", disclaimer: HUISHOUD_DISCLAIMER });
  const nu = ov.per.get(p);
  const gw = gewoonlijk(maandOv, p, soort);
  const volledigP = !!ov.volledig.get(p);
  const kol = (a, b, hb) => [bedrag(a), gw ? bedrag(b || 0) : "", gw && volledigP ? gewoonTekst(a, b || 0, soort, hb) : ""];

  const kop = `<tr><th></th><th class="num">${esc(periodeLabel(p))}</th><th class="num">gemiddeld</th><th class="num">vergeleken</th></tr>`;
  const uitlegGem = gw ? `<p class="sub">Gemiddeld = wat je gewoonlijk per ${soort} hebt: het gemiddelde van ${gw.maanden.length === GEWOONLIJK_MAANDEN ? `de laatste ${GEWOONLIJK_MAANDEN}` : gw.maanden.length} volledige maanden ervoor (${esc(kortLabel(gw.maanden[0]))} – ${esc(kortLabel(gw.maanden[gw.maanden.length - 1]))}). Alleen een duidelijk verschil (25% én € ${soort === "week" ? 10 : 25}) telt als hoger of lager.</p>` : "<p class=\"sub\">Nog te weinig volledige maanden om met je gewone uitgaven te vergelijken.</p>";
  const opv = opvallendeUitgaven(transacties, p, soort, gw, { onregelmatig: ov.onregelmatig });
  const opvallend = opv.length ? `<h2>Opvallende uitgaven</h2><p class="sub">Losse betalingen die veel groter zijn dan gewoonlijk voor die categorie.</p><table><tr><th>datum</th><th>tegenpartij</th><th>categorie</th><th class="num">bedrag</th></tr>${opv.map((o) => `<tr><td>${o.datum.toLocaleDateString("nl-NL")}</td><td>${esc(o.tegenpartij)}</td><td>${esc(label(o.categorie))}</td><td class="num">${bedrag(o.bedrag)}</td></tr>`).join("")}</table>` : "";
  const samen = `<table>${kop}${rij("Inkomsten", kol(nu.inkomsten, gw?.inkomsten, true))}${rij("Uitgaven", kol(nu.uitgaven, gw?.uitgaven))}${rij("waarvan vaste lasten", kol(nu.vasteLasten, gw?.vasteLasten), "sub")}${rij("waarvan variabel", kol(nu.variabel, gw?.variabel), "sub")}${rij("Gespaard", kol(nu.sparen, gw?.sparen, true))}${spaardoel ? rij(`Spaardoel${soort === "week" ? " (deze week)" : ""}`, [bedrag(soort === "week" ? (spaardoel * 12) / 52 : spaardoel), "", nu.sparen >= (soort === "week" ? (spaardoel * 12) / 52 : spaardoel) - 0.5 ? '<span class="groen">gehaald</span>' : '<span class="oranje">niet gehaald</span>'], "sub") : ""}${rij(nu.over >= 0 ? "Over" : "Tekort", kol(nu.over, gw?.over, true), "sterk")}</table>${ov.volledig.get(p) ? "" : `<p class="sub">Let op: van ${esc(periodeLabel(p))} staan nog niet alle dagen in je bankgegevens.</p>`}`;

  const budget = budgetStatus(nu, budgetten, soort);
  const budgetVan = (c) => budget.find((b) => b.categorie === c);
  const lijst = (isVast) => [...nu.perCategorie].filter(([, c]) => c.vast === isVast && Math.abs(c.bedrag) >= 0.5)
    .map(([naam, c]) => ({ naam, ...c, gem: gw?.perCategorie.get(naam) || 0 })).sort((a, b) => b.bedrag - a.bedrag);
  const vast = lijst(true), variabel = lijst(false);
  const vastTabel = vast.length ? `<table>${kop}${vast.map((c) => rij(`${label(c.naam)}${c.uitgesmeerd ? " (uitgesmeerd)" : ""}`, kol(c.bedrag, c.gem))).join("")}${rij("Totaal vaste lasten", kol(nu.vasteLasten, gw?.vasteLasten), "sterk")}</table>` : "<p>Geen vaste lasten in deze periode.</p>";
  const varKop = `<tr><th></th><th class="num">${esc(periodeLabel(p))}</th><th class="num">gemiddeld</th><th class="num">vergeleken</th><th class="num">budget</th></tr>`;
  const varTabel = variabel.length ? `<table>${varKop}${variabel.map((c) => { const b = budgetVan(c.naam); return rij(label(c.naam), [...kol(c.bedrag, c.gem), b ? `<span class="${b.status === "over" ? "rood" : b.status === "bijna" ? "oranje" : "groen"}">${bedrag(b.budget)}</span>` : ""]); }).join("")}${rij("Totaal variabel", [...kol(nu.variabel, gw?.variabel), ""], "sterk")}</table>` : "<p>Geen variabele uitgaven in deze periode.</p>";
  const over = budget.filter((b) => b.status === "over");
  const budgetMelding = over.length ? `<p class="rood"><strong>Over je budget:</strong> ${over.map((b) => `${esc(label(b.categorie))} (${bedrag(b.besteed)} van ${bedrag(b.budget)})`).join(", ")}.</p>` : "";

  const huishouden = huishoudenUit(antwoorden || {});
  const gem = gemiddeldeLaatsteMaanden(maandOv, 3, soort === "maand" ? p : null);
  const verh = verhoudingen(gem, huishouden);
  const pastBij = verh.zonderInkomen ? "<p>Er is nog geen volledige maand met inkomsten; de vergelijking volgt zodra die er is.</p>"
    : `<p class="sub">Gemiddeld per maand over ${esc((verh.maanden || []).map(periodeLabel).join(", "))}; inkomen ${bedrag(verh.inkomen)} per maand.</p><table><tr><th></th><th class="num">per maand</th><th class="num">van inkomen</th><th>gebruikelijk</th></tr>${verh.regels.map((r) => `<tr><td><span class="${r.kleur}">●</span> ${esc(r.label)}</td><td class="num">${bedrag(r.bedrag)}</td><td class="num">${fmtPct((r.bedrag / verh.inkomen) * 100)}</td><td>${esc(r.richtTekst)}</td></tr>`).join("")}</table>`;

  const gemVorig = gem ? gemiddeldeLaatsteMaanden(maandOv, 3, verschuif(gem.maanden[0], -1)) : null;
  const gemBudget = budgetStatus(gem ? { perCategorie: new Map([...gem.perCategorie].map(([c, b]) => [c, { bedrag: b }])) } : null, budgetten, "maand");
  const bes = bespaarPlekken({ gem, vorig: gemVorig, verh, budget: gemBudget, abonnementen: terugkerend(transacties, { vast: new Set(vasteCategorieen) }), label });
  const besparen = bes.plekken.length
    ? `${bes.tekort > 0 ? `<p class="rood">Je geeft gemiddeld ${bedrag(bes.tekort)} per maand meer uit dan er binnenkomt.</p>` : ""}<table><tr><th></th><th>waarom</th><th class="num">mogelijk per maand</th></tr>${bes.plekken.map((x) => `<tr><td><strong>${esc(x.titel)}</strong></td><td>${esc(x.tekst)}</td><td class="num">${bedrag(x.perMaand)}</td></tr>`).join("")}${rij("Samen", ["", bedrag(bes.samen)], "sterk")}</table>`
    : "<p>Geen opvallende plekken om te besparen gevonden.</p>";

  const idx = ov.periodes.indexOf(p);
  const reeks = ov.periodes.slice(Math.max(0, idx - 11), idx + 1);
  const verloop = `<table><tr><th></th><th class="num">Inkomsten</th><th class="num">Uitgaven</th><th class="num">Vast</th><th class="num">Gespaard</th><th class="num">Over</th></tr>${reeks.map((x) => { const d = ov.per.get(x); return rij(`${kortLabel(x)}${ov.volledig.get(x) ? "" : " *"}`, [bedrag(d.inkomsten), bedrag(d.uitgaven), bedrag(d.vasteLasten), bedrag(d.sparen), bedrag(d.over)]); }).join("")}</table>${reeks.some((x) => !ov.volledig.get(x)) ? '<p class="sub">* onvolledige periode</p>' : ""}`;

  const inhoud = `<h2>${esc(periodeLabel(p))} in het kort</h2>${samen}${uitlegGem}${budgetMelding}${opvallend}
<h2>Vaste lasten</h2>${vastTabel}
<h2>Variabele uitgaven</h2>${varTabel}
<h2>Past het bij je inkomen?</h2>${pastBij}
<h2>Waar kun je besparen?</h2>${besparen}
<h2>Verloop</h2>${verloop}`;
  return document({ titel: `Huishoudboekje ${periodeLabel(p)}`, sub, inhoud, disclaimer: HUISHOUD_DISCLAIMER });
}

// Excel: per maand en per week de totalen, per maand de uitgaven per categorie, en alle transacties.
export async function exportHuishoudExcel({ transacties, vasteCategorieen = [], label = (c) => c, uitsmeren = true }) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const soort of ["maand", "week"]) {
    const ov = huishoudOverzicht(transacties, { soort, vasteCategorieen, uitsmeren });
    const rijen = ov.periodes.map((p) => { const d = ov.per.get(p); return { Periode: periodeLabel(p), Volledig: ov.volledig.get(p) ? "ja" : "nee", Inkomsten: d.inkomsten, Uitgaven: d.uitgaven, "Vaste lasten": d.vasteLasten, Variabel: d.variabel, Gespaard: d.sparen, Over: d.over }; });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rijen), soort === "maand" ? "Per maand" : "Per week");
    if (soort === "maand") {
      const cats = [...new Set(ov.periodes.flatMap((p) => [...ov.per.get(p).perCategorie.keys()]))].sort();
      const perCat = cats.map((c) => Object.fromEntries([["Categorie", label(c)], ...ov.periodes.map((p) => [periodeLabel(p), Math.round((ov.per.get(p).perCategorie.get(c)?.bedrag || 0) * 100) / 100])]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(perCat), "Uitgaven per categorie");
    }
  }
  const rijen = (transacties || []).slice().sort((a, b) => a.date - b.date).map((t) => ({
    Datum: t.date.toLocaleDateString("nl-NL"), Bedrag: t.amount, Categorie: label(t.category), Tegenpartij: t.counterparty, Omschrijving: t.description, Bron: t.source,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rijen), "Transacties");
  XLSX.writeFile(wb, "BankafschriftenTool_Huishoudboekje.xlsx");
}
