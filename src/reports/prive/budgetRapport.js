// beide-V1R8 (fase 7) — budgetrapport (print) en Excel-export voor een privédossier: per jaar inkomsten,
// uitgaven per categorie, vaste lasten, sparen, per maand, en de belastingindicatie. Plus de samenvatting.
import { esc, bedrag, rij, kopRij, document } from "./opmaak.js";
import { maandRegels, MAANDEN } from "./maandoverzicht.js";

function jaarBudget(jaar, d) {
  const b = d.budget;
  const t = b.totaal;
  const uitgaven = b.uitgavenPerHoofd.map((h) => [
    rij(h.hoofd, [bedrag(h.bedrag)], "sterkLicht"),
    ...h.categorieen.map((c) => rij(c.label, [bedrag(c.bedrag)], "sub")),
  ].join("")).join("");
  const maand = maandRegels(b).map((r) => rij(r.maand, [bedrag(r.inkomsten), bedrag(r.uitgaven), bedrag(r.vasteLasten), bedrag(r.sparen), bedrag(r.over)], r.totaal ? "sterk" : "")).join("");
  const v = d.belasting.verschil;
  return `<section class="jaar"><h2>${esc(jaar)}</h2>
<table>${rij("Inkomsten", [bedrag(t.inkomsten)])}${b.inkomstenPerCategorie.map((c) => rij(c.label, [bedrag(c.bedrag)], "sub")).join("")}${rij("Uitgaven", [`− ${bedrag(t.uitgaven)}`])}${rij("Gespaard en belegd", [`− ${bedrag(t.sparen)}`])}${rij(t.over >= 0 ? "Over" : "Tekort", [bedrag(t.over)], "sterk")}</table>
<h3>Uitgaven per categorie</h3><table>${uitgaven || rij("Geen uitgaven", [""])}</table>
<h3>Vaste lasten</h3><table>${b.vasteLastenPerCategorie.map((c) => rij(c.label, [bedrag(c.bedrag)])).join("")}${rij("Totaal vaste lasten", [bedrag(t.vasteLasten)], "sterk")}</table>
<h3>Per maand</h3><table><tr><th></th><th class="num">Inkomsten</th><th class="num">Uitgaven</th><th class="num">Vast</th><th class="num">Sparen</th><th class="num">Over</th></tr>${maand}</table>
<h3>Indicatie inkomstenbelasting</h3><p class="uitkomst ${v < 0 ? "terug" : "bij"}">${Math.abs(v) < 1 ? "Ongeveer niets terug of bij te betalen" : `${bedrag(Math.abs(v))} ${v < 0 ? "terug te krijgen" : "bij te betalen"}`}</p>
</section>`;
}

export function buildBudgetRapportHtml({ jaren, overzicht, namen = null, vandaag = new Date() }) {
  return document({
    titel: `Budgetoverzicht ${jaren.join(", ")}`,
    sub: `${namen?.ondernemer ? `${esc(namen.ondernemer)} · ` : ""}privé · opgesteld ${vandaag.toLocaleDateString("nl-NL")}`,
    inhoud: jaren.filter((j) => overzicht?.perJaar?.[j]).map((j) => jaarBudget(j, overzicht.perJaar[j])).join(""),
  });
}

// Samenvatting in één oogopslag (vervangt de zakelijke klantsamenvatting in een privédossier).
export function buildPriveSamenvattingHtml({ jaren, overzicht, namen = null, openPunten = [], vandaag = new Date() }) {
  const js = jaren.filter((j) => overzicht?.perJaar?.[j]);
  const d = (j) => overzicht.perJaar[j];
  const r = (l, f, cls) => rij(l, js.map(f), cls);
  const hoofden = [...new Set(js.flatMap((j) => d(j).budget.uitgavenPerHoofd.map((h) => h.hoofd)))];
  const inhoud = `<h2>Budget</h2><table>${kopRij(js)}
${r("Inkomsten", (j) => bedrag(d(j).budget.totaal.inkomsten))}
${r("Uitgaven", (j) => bedrag(d(j).budget.totaal.uitgaven))}
${hoofden.map((h) => r(h, (j) => bedrag(d(j).budget.uitgavenPerHoofd.find((x) => x.hoofd === h)?.bedrag || 0), "sub")).join("")}
${r("waarvan vaste lasten", (j) => bedrag(d(j).budget.totaal.vasteLasten), "sub")}
${r("Gespaard en belegd", (j) => bedrag(d(j).budget.totaal.sparen))}
${r("Over", (j) => bedrag(d(j).budget.totaal.over), "sterk")}</table>
<h2>Indicatie inkomstenbelasting</h2><table>${kopRij(js)}
${r("Inkomstenbelasting", (j) => (d(j).belasting.loonheffingGeschat ? "al ingehouden" : bedrag(d(j).belasting.ib)))}
${r("Al ingehouden loonheffing", (j) => (d(j).belasting.loonheffingGeschat ? "al ingehouden" : bedrag(d(j).belasting.loonheffing)))}
${r("Terug (−) of bij (+)", (j) => bedrag(d(j).belasting.verschil), "sterk")}</table>
${js.some((j) => d(j).aannames.length) ? `<div class="aannames"><strong>Aannames</strong><ul>${[...new Set(js.flatMap((j) => d(j).aannames))].map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>` : ""}
<h2>Nog open</h2>${openPunten.length ? `<ul>${openPunten.map((o) => `<li>${esc(o.label)}${o.count != null ? ` (${o.count})` : ""}</li>`).join("")}</ul>` : "<p>Er staan geen open punten meer.</p>"}`;
  return document({
    titel: `Samenvatting ${js.join(", ")}`,
    sub: `${namen?.ondernemer ? `${esc(namen.ondernemer)} · ` : ""}privé · opgesteld ${vandaag.toLocaleDateString("nl-NL")}`,
    inhoud,
  });
}

// Excel: per jaar een tabblad budget en per maand, plus alle transacties met de privécategorie.
export async function exportPriveExcel({ jaren, overzicht, transacties, label }) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const j of jaren) {
    const d = overzicht?.perJaar?.[j];
    if (!d) continue;
    const b = d.budget;
    const regels = [
      { Post: "Inkomsten", Bedrag: b.totaal.inkomsten },
      ...b.inkomstenPerCategorie.map((c) => ({ Post: `  ${c.label}`, Bedrag: c.bedrag })),
      { Post: "Uitgaven", Bedrag: -b.totaal.uitgaven },
      ...b.uitgavenPerHoofd.flatMap((h) => [{ Post: `  ${h.hoofd}`, Bedrag: -h.bedrag }, ...h.categorieen.map((c) => ({ Post: `    ${c.label}`, Bedrag: -c.bedrag }))]),
      { Post: "Gespaard en belegd", Bedrag: -b.totaal.sparen },
      { Post: "Over", Bedrag: b.totaal.over },
      { Post: "" },
      // beide-V2R8 — zonder jaaropgave is de belasting al ingehouden (netto inkomen): geen geschatte bedragen tonen.
      ...(d.belasting.loonheffingGeschat ? [{ Post: "Inkomstenbelasting", Bedrag: "al ingehouden (netto inkomen)" }] : [
        { Post: "Inkomstenbelasting (indicatie)", Bedrag: d.belasting.ib },
        { Post: "Ingehouden loonheffing", Bedrag: -d.belasting.loonheffing },
      ]),
      { Post: "Terug (−) of bij (+)", Bedrag: d.belasting.verschil },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(regels), `Budget ${j}`);
    const maand = b.perMaand.map((m, i) => ({ Maand: MAANDEN[i], Inkomsten: m.inkomsten, Uitgaven: m.uitgaven, "Vaste lasten": m.vasteLasten, Sparen: m.sparen, Over: m.over }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(maand), `Per maand ${j}`);
  }
  const rijen = transacties.filter((t) => jaren.includes(t.year)).slice().sort((a, b) => a.date - b.date).map((t) => ({
    Jaar: t.year, Datum: t.date.toLocaleDateString("nl-NL"), Bedrag: t.amount, Categorie: label(t.category), Tegenpartij: t.counterparty, Omschrijving: t.description, Bron: t.source,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rijen), "Transacties");
  XLSX.writeFile(wb, `Budgetoverzicht_${jaren.join("-")}.xlsx`);
}
