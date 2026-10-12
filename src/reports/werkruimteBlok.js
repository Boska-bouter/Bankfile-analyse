// release20V6 — blok in de indicatieve aangifteberekening over huur/energie/gemeentelijke lasten, per rekening.
import { computeSplitsbareCategorieTotalenVoorJaar, defaultZakelijkPercentage } from "../tax/categorySplit.js";
import { WERKRUIMTE_CATEGORIEEN, WERKRUIMTE_LABELS, werkruimteSoorten, betaaldPerRekening } from "../tax/werkruimte.js";
import { eur } from "../utils/amounts.js";

const REK_LABEL = { zakelijk: "Zakelijke rekening", prive: "Privérekening" };
const UITLEG = {
  bedrijfsruimte: "Zakelijk gehuurde ruimte: zakelijke huisvestingskosten voor het zakelijke deel.",
  zelfstandig: "Zelfstandige werkruimte in de eigen woning (eigen ingang en voorzieningen, niet via de woonruimte bereikbaar, en aan de extra voorwaarden voldaan): voor het zakelijke deel bedrijfskosten van de werkruimte, geen aparte aftrekpost naast de ondernemersaftrek. Controleer de voorwaarden zelf.",
  niet_zelfstandig: "Kamer of hoek in de eigen woning (niet zelfstandig): huur, energie en gemeentelijke lasten zijn niet aftrekbaar en tellen niet mee. Alleen de inrichting (bureau, stoel, verlichting) kan aftrekbaar zijn.",
  prive: "Privé: telt niet mee als zakelijke kosten.",
};

// `categoryZakelijkPercentage` is de effectieve map (niet-aftrekbare soorten staan daar al op 0).
export function werkruimteRegelsVoorJaar(year, classified, categoryZakelijkPercentage, werkruimteStatus) {
  const soorten = werkruimteSoorten(werkruimteStatus, year);
  const perRek = betaaldPerRekening(classified, year);
  const regels = [];
  for (const cat of WERKRUIMTE_CATEGORIEEN) {
    const r = perRek[cat];
    if (!r) continue;
    for (const rek of ["zakelijk", "prive"]) {
      const aantal = rek === "zakelijk" ? r.aantalZakelijk : r.aantalPrive;
      if (!aantal) continue;
      const bedrag = rek === "zakelijk" ? r.zakelijk : r.prive;
      const eigen = categoryZakelijkPercentage?.[cat]?.[`${year}:${rek}`];
      const gewoon = categoryZakelijkPercentage?.[cat]?.[year];
      const pct = eigen ?? gewoon ?? defaultZakelijkPercentage(cat);
      regels.push({ categorie: cat, rekening: rek, soort: soorten[rek], bedrag, aantal, percentage: pct, zakelijk: bedrag * (pct / 100), expliciet: eigen != null || gewoon != null, beide: r.beide, gelijk: r.gelijk });
    }
  }
  return { soorten, regels };
}

export function werkruimteBlokHtml(year, classified, categoryZakelijkPercentage, werkruimteStatus) {
  const { soorten, regels } = werkruimteRegelsVoorJaar(year, classified, categoryZakelijkPercentage, werkruimteStatus);
  if (regels.length === 0) return "";
  if (!soorten.zakelijk && !soorten.prive && !regels.some((r) => r.expliciet)) return "";
  const uitleg = ["zakelijk", "prive"]
    .filter((rek) => regels.some((r) => r.rekening === rek))
    .map((rek) => {
      const soort = soorten[rek];
      return `<p class="toelichting"><strong>${REK_LABEL[rek]}:</strong> ${soort ? `${WERKRUIMTE_LABELS[soort]}. ${UITLEG[soort]}` : "soort ruimte niet aangegeven — de app rekent met de ingestelde percentages. Geef dit aan in de app, want voor een werkruimte in de eigen woning gelden andere regels dan voor een zakelijk gehuurd pand."}</p>`;
    }).join("");
  const dubbel = [...new Set(regels.filter((r) => r.beide).map((r) => r.categorie))];
  const gelijk = [...new Set(regels.filter((r) => r.beide && r.gelijk).map((r) => r.categorie))];
  const waarschuwing = dubbel.length === 0 ? "" :
    '<p class="toelichting" style="color:#b45309;">⚠ ' + dubbel.join(", ") + ": dit jaar betaald vanaf zowel de zakelijke als de privérekening" +
    (gelijk.length > 0 ? " — bij " + gelijk.join(", ") + " zijn de bedragen op beide rekeningen gelijk, controleer of dit niet dubbel is geboekt" : "") +
    ". Elke rekening is hieronder apart berekend.</p>";
  const totaalBedrag = regels.reduce((a, r) => a + r.bedrag, 0);
  const totaalZakelijk = regels.reduce((a, r) => a + r.zakelijk, 0);
  return `
  <div class="totaal-kaart">
    <p class="aannames-kop">Huur, energie en gemeentelijke lasten ${year} — per rekening</p>
    ${uitleg}
    <table class="samenvatting-scenarios"><thead><tr><th>Kostensoort</th><th>Betaald vanaf</th><th>Soort ruimte</th><th class="num">Bedrag (bruto)</th><th class="num">% zakelijk</th><th class="num">Zakelijk deel</th></tr></thead><tbody>
      ${regels.map((r) => `<tr><td>${r.categorie}</td><td>${REK_LABEL[r.rekening]} (${r.aantal}×)</td><td>${r.soort ? WERKRUIMTE_LABELS[r.soort] : "niet aangegeven"}</td><td class="num">${eur(r.bedrag)}</td><td class="num">${r.percentage}%</td><td class="num">${eur(r.zakelijk)}</td></tr>`).join("")}
      <tr class="total"><td>Totaal</td><td></td><td></td><td class="num">${eur(totaalBedrag)}</td><td></td><td class="num">${eur(totaalZakelijk)}</td></tr>
    </tbody></table>
    ${waarschuwing}
    <p class="toelichting">Vanaf de zakelijke rekening betaald: dat deel is door de onderneming betaald; het privé-deel wordt als privéonttrekking gezien. Vanaf de privérekening betaald: het zakelijke deel is een zakelijke kost die privé is voorgeschoten.</p>
  </div>`;
}
