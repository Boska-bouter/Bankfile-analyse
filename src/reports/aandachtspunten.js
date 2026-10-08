import { eur } from "../utils/amounts.js";

// A4 — "Aandachtspunten voor de adviseur": alleen wat de app zelf niet kan beoordelen en wat de
// uitkomst kan beïnvloeden. Bewust anders dan "Nog open" (dat is werk voor de gebruiker zelf).
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const jarenTekst = (js) => [...js].sort().join(", ");

export function bepaalAandachtspunten({
  years = [], yearPeriod = {}, classified = [], incompleteLeases = 0, incompleteLoans = 0,
  zelfstandigenaftrekStatus = {}, startersaftrekStatus = {}, autoStatus = {}, priveRekeningGeladen = true, heeftVoorraad = null, rechtsvorm,
}) {
  const jaren = years.map(String);
  const p = [];
  const onvolledig = jaren.filter((y) => yearPeriod[y] && !yearPeriod[y].heel);
  if (onvolledig.length) p.push(`Niet-volledig jaar: ${onvolledig.map((y) => `${y} (${yearPeriod[y].label})`).join(", ")}. De cijfers gaan alleen over de periode met bankgegevens; een eventuele extrapolatie of jaarcorrectie is niet beoordeeld.`);

  const onzeker = classified.filter((t) => !t.isMirror && jaren.includes(String(t.year)) && (t.confidence?.level === "heuristic" || t.confidence?.level === "fallback"));
  if (onzeker.length) p.push(`${onzeker.length} transactie${onzeker.length === 1 ? "" : "s"} (samen ${eur(onzeker.reduce((a, t) => a + Math.abs(t.amount || 0), 0))}) ${onzeker.length === 1 ? "heeft" : "hebben"} een indeling die de app niet zeker kent en die niet is bevestigd. Controleer de indeling.`);

  if (incompleteLeases > 0) p.push(`${incompleteLeases} leasecontract${incompleteLeases === 1 ? "" : "en"} met onvolledige gegevens: bijtelling, afschrijving en rente zijn daardoor onzeker.`);
  if (incompleteLoans > 0) p.push(`${incompleteLoans} lening${incompleteLoans === 1 ? "" : "en"} met onvolledige gegevens: de verdeling rente/aflossing is onzeker.`);

  if (rechtsvorm !== "bv") {
    const onb = jaren.filter((y) => { const v = zelfstandigenaftrekStatus?.[y]; return v === "onbekend" || v == null; });
    if (onb.length) p.push(`Urencriterium onbekend of niet beantwoord (${jarenTekst(onb)}): de zelfstandigenaftrek is niet vastgesteld.`);
    const st = jaren.filter((y) => startersaftrekStatus?.[y] === "ja");
    if (st.length) p.push(`Startersaftrek toegepast (${jarenTekst(st)}): toets of aan de voorwaarden is voldaan (o.a. maximaal drie keer, binnen vijf jaar na start).`);
    const pa = jaren.filter((y) => autoStatus?.[y] === "prive");
    if (pa.length) p.push(`Privéauto zakelijk gebruikt (${jarenTekst(pa)}): de kilometers komen uit de opgave in de app; de onderbouwing (ritregistratie) zit niet in de bankgegevens.`);
  }
  if (!priveRekeningGeladen) p.push("Geen privérekening geladen: privéopnamen, privébetalingen en eventuele zakelijke uitgaven vanaf privé ontbreken in de cijfers.");
  if (heeftVoorraad === true) p.push("Voorraad aanwezig: de waardering is niet uit bankgegevens af te leiden en zit niet in de winst.");
  p.push("Reconstructie op basis van bankbetalingen: openstaande facturen, nog niet betaalde kosten en niet-bancaire boekingen (bijv. contant of creditcard buiten de rekening) staan er niet in.");
  return p.slice(0, 10);
}

export function aandachtspuntenHtml(punten) {
  if (!punten || punten.length === 0) return "";
  return `
  <div style="page-break-before: always; break-before: page;"></div>
  <h2>Aandachtspunten voor de adviseur</h2>
  <p class="toelichting">Punten die de app niet zelf kan beoordelen en die de uitkomst kunnen beïnvloeden.</p>
  <ol style="margin:6px 0 0 18px;padding:0;line-height:1.5">${punten.map((t) => `<li style="margin-bottom:5px">${esc(t)}</li>`).join("")}</ol>`;
}
