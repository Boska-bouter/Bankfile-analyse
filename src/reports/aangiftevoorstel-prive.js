// beide-V1R8 (fase 7) — indicatieve aangifteberekening inkomstenbelasting voor een privédossier:
// box 1 (inkomen, eigen woning, aftrekposten), box 3, heffingskortingen, ingehouden loonheffing en het
// verschil (terug of bijbetalen). Zelfde cijfers als het Overzicht (calc/prive, tax/prive).
import { esc, bedrag, rij, document } from "./prive/opmaak.js";

const naamVan = (rol, namen) => (rol === "partner" ? namen?.partner || "Partner" : namen?.ondernemer || "Jij");

function persoonTabel(p, namen, metPartner) {
  const regels = [
    rij(`Bruto inkomen uit werk, uitkering en pensioen${p.loonheffingGeschat ? " (teruggerekend uit netto, geen jaaropgave)" : ""}`, [bedrag(p.bruto)]),
    rij("  waarvan op de bank ontvangen (netto)", [bedrag(p.netto)], "sub"),
    rij(`  waarvan ingehouden loonheffing${p.loonheffingGeschat ? " (geschat)" : ""}`, [bedrag(p.loonheffing)], "sub"),
  ];
  if (p.zonderInhouding) regels.push(rij("  waarvan zonder ingehouden belasting", [bedrag(p.zonderInhouding)], "sub"));
  if (p.eigenWoning) regels.push(rij("Inkomen eigen woning (deel)", [bedrag(p.eigenWoning)]));
  if (p.persoonsgebondenAftrek) regels.push(rij("Persoonsgebonden aftrek (deel)", [`− ${bedrag(p.persoonsgebondenAftrek)}`]));
  regels.push(rij("Belastbaar inkomen box 1", [bedrag(p.belastbaarBox1)], "sterk"));
  regels.push(rij(`Belasting box 1${p.aow ? " (tarief AOW-leeftijd)" : ""}`, [bedrag(p.belastingBox1)]));
  if (p.beperkingAftrek > 0.5) regels.push(rij("  waarvan beperking aftrek in hoogste schijf", [bedrag(p.beperkingAftrek)], "sub"));
  if (p.box3) regels.push(rij("Belasting box 3 (deel)", [bedrag(p.box3)]));
  regels.push(rij("Algemene heffingskorting", [`− ${bedrag(p.kortingen.algemeen)}`]));
  if (p.kortingen.arbeidskorting) regels.push(rij("Arbeidskorting", [`− ${bedrag(p.kortingen.arbeidskorting)}`]));
  if (p.kortingen.ouderen) regels.push(rij("Ouderenkorting", [`− ${bedrag(p.kortingen.ouderen)}`]));
  regels.push(rij("Inkomstenbelasting", [bedrag(p.ib)], "sterk"));
  regels.push(rij("Al ingehouden loonheffing", [`− ${bedrag(p.loonheffing)}`]));
  regels.push(rij(p.verschil < 0 ? "Terug te krijgen" : "Bij te betalen", [bedrag(Math.abs(p.verschil))], "sterk"));
  return `${metPartner ? `<h3>${esc(naamVan(p.rol, namen))}</h3>` : ""}<table>${regels.join("")}</table>`;
}

function jaarBlok(jaar, d, namen) {
  const b = d.belasting;
  const ew = b.eigenWoning;
  const pga = b.aftrekposten;
  const inv = d.invoer;
  const delen = [];
  delen.push(`<div class="uitkomst ${b.verschil < 0 ? "terug" : "bij"}">${Math.abs(b.verschil) < 1 ? "Ongeveer niets terug of bij te betalen" : `${bedrag(Math.abs(b.verschil))} ${b.verschil < 0 ? "terug te krijgen" : "bij te betalen"}`}${b.metPartner ? " (samen)" : ""}</div>`);
  if (inv.woning) {
    delen.push(`<h3>Eigen woning</h3><table>${[
      rij("WOZ-waarde", [inv.woning.woz ? bedrag(inv.woning.woz) : "onbekend"]),
      rij("Eigenwoningforfait", [bedrag(ew.forfait)]),
      rij("Aftrekbare hypotheekrente", [`− ${bedrag(ew.rente)}`]),
      ew.hillen ? rij("Aftrek geen of geringe eigenwoningschuld", [`− ${bedrag(ew.hillen)}`]) : "",
      rij("Inkomen uit eigen woning", [bedrag(ew.saldo)], "sterk"),
    ].join("")}</table>`);
  }
  if (pga.totaal > 0 || Object.values(inv.aftrek).some((v) => v > 0)) {
    delen.push(`<h3>Persoonsgebonden aftrek</h3><table>${[
      rij(`Giften (betaald ${bedrag(inv.aftrek.giften)}, na drempel)`, [bedrag(pga.giften)]),
      rij(`Specifieke zorgkosten (betaald ${bedrag(inv.aftrek.zorgkosten)}, na drempel)`, [bedrag(pga.zorgkosten)]),
      rij("Lijfrentepremie", [bedrag(pga.lijfrente)]),
      rij("Partneralimentatie", [bedrag(pga.partneralimentatie)]),
      rij("Totaal aftrek", [bedrag(pga.totaal)], "sterk"),
    ].join("")}</table><p class="sub">Drempelinkomen ${bedrag(b.drempelinkomen)}.</p>`);
  }
  if (b.box3) {
    delen.push(`<h3>Box 3: sparen en beleggen (forfaitair)</h3><table>${[
      rij("Vermogen op 1 januari (bezittingen min schulden)", [bedrag(b.box3.grondslag)]),
      rij("Heffingsvrij vermogen", [`− ${bedrag(b.box3.heffingsvrij)}`]),
      rij("Belastbaar voordeel", [bedrag(b.box3.voordeel)]),
      rij(`Belasting box 3 (${b.box3.tariefPct}%)`, [bedrag(b.box3.belasting)], "sterk"),
    ].join("")}</table>`);
  }
  delen.push(`<h3>Box 1${b.metPartner ? " per partner" : ""}</h3>`);
  delen.push(b.personen.map((p) => persoonTabel(p, namen, b.metPartner)).join(""));
  if (b.metPartner) {
    const pct = (x) => `${Math.round(x * 100)}%`;
    delen.push(`<p class="sub">Verdeling gezamenlijke posten (laagste totale belasting): eigen woning ${pct(b.verdeling.ew)} / ${pct(1 - b.verdeling.ew)}, aftrekposten ${pct(b.verdeling.pga)} / ${pct(1 - b.verdeling.pga)}, box 3 ${pct(b.verdeling.box3)} / ${pct(1 - b.verdeling.box3)} (${esc(naamVan("zelf", namen))} / ${esc(naamVan("partner", namen))}).</p>`);
  }
  if (d.aannames.length) delen.push(`<div class="aannames"><strong>Aannames</strong><ul>${d.aannames.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>`);
  return `<section class="jaar"><h2>Inkomstenbelasting ${esc(jaar)}</h2>${delen.join("")}</section>`;
}

export function buildAangiftevoorstelPriveHtml({ jaren, overzicht, namen = null, vandaag = new Date() }) {
  const blokken = jaren.filter((j) => overzicht?.perJaar?.[j]).map((j) => jaarBlok(j, overzicht.perJaar[j], namen)).join("");
  return document({
    titel: `Indicatie inkomstenbelasting ${jaren.join(", ")}`,
    sub: `${namen?.ondernemer ? `${esc(namen.ondernemer)}${namen?.partner ? ` en ${esc(namen.partner)}` : ""} · ` : ""}privé · opgesteld ${vandaag.toLocaleDateString("nl-NL")}`,
    inhoud: blokken || "<p>Geen gegevens voor deze jaren.</p>",
  });
}
