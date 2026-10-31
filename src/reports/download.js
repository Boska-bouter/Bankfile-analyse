// beide-V4R1 / V8R5 — één manier van downloaden voor alle rapporten (wens Boska 24-10): de gebruiker kiest PDF,
// Excel of HTML. Het rapport is overal al een HTML-document; PDF en Excel worden daaruit gemaakt, in de browser.
// - PDF: het rapport wordt in een onzichtbaar iframe opgemaakt en per pagina gefotografeerd (html2canvas) en in een
//   A4-PDF gezet (jsPDF). Per pagina, omdat iPad-Safari geen heel groot canvas toestaat. Pagina's breken bij voorkeur
//   tussen regels, tabelrijen en kaarten, en altijd waar het rapport zelf een nieuwe pagina vraagt (page-break).
//   Staand of liggend volgt uit @page in het rapport.
// - Excel: het hele rapport in leesvolgorde op één tabblad (tabellen en naast-elkaar-regels als cellen); bedragen
//   worden getallen. Waar een rapport een eigen Excel-export heeft, wordt die gebruikt.
// Beide bibliotheken worden pas geladen als iemand voor PDF kiest.

export const DOWNLOAD_SOORTEN = {
  pdf: { label: "PDF", uitleg: "om te bewaren, te mailen of te printen" },
  excel: { label: "Excel", uitleg: "om zelf verder mee te rekenen" },
  html: { label: "HTML", uitleg: "opent in elke browser" },
};

const veiligeNaam = (naam) => String(naam || "BankafschriftenTool").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "_");

export function downloadBlob(blob, naam) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = naam;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const zonderPrintOpLaden = (html) => String(html).replace(/\s*onload="window\.print\(\)"/g, "");

export function downloadHtmlBestand(html, naam) {
  downloadBlob(new Blob([zonderPrintOpLaden(html)], { type: "text/html" }), `${veiligeNaam(naam)}.html`);
}

// soort: "pdf" | "excel" | "html". excel: eigen Excel-export van het rapport (als die er is), anders de tabellen.
export async function downloadRapport({ soort = "html", html, naam, excel = null }) {
  const h = typeof html === "function" ? html() : html;
  try {
    if (soort === "pdf") await htmlNaarPdf(h, naam);
    else if (soort === "excel") { if (excel) await excel(); else await htmlNaarExcel(h, naam); }
    else downloadHtmlBestand(h, naam);
  } catch (e) {
    window.alert(`Downloaden als ${DOWNLOAD_SOORTEN[soort]?.label || soort} lukte niet: ${e?.message || e}`);
  }
}

// ---- PDF ----

const isLiggend = (html) => /@page[^{]*\{[^}]*landscape/i.test(html);

function laadInIframe(html, breedte) {
  return new Promise((resolve, reject) => {
    const f = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true");
    f.style.cssText = `position:fixed;left:-30000px;top:0;width:${breedte}px;height:1000px;border:0;background:#fff`;
    const klaar = () => {
      const doc = f.contentDocument;
      const fonts = doc?.fonts?.ready || Promise.resolve();
      fonts.then(() => setTimeout(() => resolve(f), 50));
    };
    f.onload = klaar;
    f.onerror = () => reject(new Error("rapport kon niet worden opgemaakt"));
    f.srcdoc = zonderPrintOpLaden(html);
    document.body.appendChild(f);
  });
}

// Waar mag een pagina eindigen? Bovenkanten van blokken en tabelrijen, niet midden in iets met break-inside: avoid
// (of een tabelrij). Verplichte breuken: page-break-before/after en break-before/after: page.
export function kiesBreuken(hoogte, pagina, kandidaten, vermijd, verplicht) {
  const breuken = [];
  const vrij = (y) => !vermijd.some(([a, b]) => y > a + 1 && y < b - 1);
  const goed = kandidaten.filter(vrij).sort((a, b) => a - b);
  const moet = [...verplicht].filter((y) => y > 1 && y < hoogte - 1).sort((a, b) => a - b);
  let y = 0;
  while (hoogte - y > pagina) {
    const doel = y + pagina;
    const harde = moet.find((m) => m > y + 1 && m <= doel);
    let b;
    if (harde != null) b = harde;
    else {
      const kies = goed.filter((c) => c > y + pagina * 0.5 && c <= doel);
      b = kies.length ? kies[kies.length - 1] : doel;
    }
    breuken.push(b); y = b;
  }
  for (const m of moet) if (m > y + 1 && m < hoogte - 1) { breuken.push(m); y = m; } // korte laatste stukken
  return breuken;
}

function meetBreuken(doc) {
  const win = doc.defaultView;
  const kandidaten = [], vermijd = [], verplicht = new Set();
  const sy = win.scrollY || 0;
  for (const el of doc.body.querySelectorAll("*")) {
    const cs = win.getComputedStyle(el);
    if (cs.display === "none" || cs.display.startsWith("inline")) continue;
    const r = el.getBoundingClientRect();
    if (!r.height) continue;
    const top = Math.round(r.top + sy), onder = Math.round(r.bottom + sy);
    kandidaten.push(top);
    if (cs.display === "table-row" || /avoid/.test(cs.breakInside || "") || /avoid/.test(cs.pageBreakInside || "")) vermijd.push([top, onder]);
    if (/page|always/.test(cs.breakBefore || "") || cs.pageBreakBefore === "always") verplicht.add(top);
    if (/page|always/.test(cs.breakAfter || "") || cs.pageBreakAfter === "always") verplicht.add(onder);
    if (/^h[1-4]$/i.test(el.tagName)) vermijd.push([top, onder + 60]); // kop niet los onderaan een pagina
  }
  return { kandidaten, vermijd, verplicht };
}

export async function htmlNaarPdf(html, naam) {
  const liggend = isLiggend(html);
  const breedte = liggend ? 1100 : 780; // CSS-pixels van de opgemaakte pagina
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const f = await laadInIframe(html, breedte);
  try {
    const doc = f.contentDocument;
    const hoogte = Math.ceil(Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight));
    f.style.height = `${hoogte}px`;
    await new Promise((r) => setTimeout(r, 30));
    const pdf = new jsPDF({ orientation: liggend ? "landscape" : "portrait", unit: "mm", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    const marge = 10, voet = 6;
    const mmPerPx = (pw - 2 * marge) / breedte;
    const paginaPx = Math.floor((ph - 2 * marge - voet) / mmPerPx);
    const { kandidaten, vermijd, verplicht } = meetBreuken(doc);
    const grenzen = [0, ...kiesBreuken(hoogte, paginaPx, kandidaten, vermijd, verplicht), hoogte];
    const n = grenzen.length - 1;
    for (let i = 0; i < n; i++) {
      const y = grenzen[i], h = Math.max(1, grenzen[i + 1] - y);
      const canvas = await html2canvas(doc.documentElement, {
        scale: 2, backgroundColor: "#ffffff", logging: false, useCORS: true,
        x: 0, y, width: breedte, height: h, windowWidth: breedte, windowHeight: hoogte, scrollX: 0, scrollY: 0,
      });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", marge, marge, breedte * mmPerPx, h * mmPerPx);
      pdf.setFontSize(8); pdf.setTextColor(120);
      pdf.text(`Pagina ${i + 1} van ${n}`, pw - marge, ph - marge + 2, { align: "right" });
      canvas.width = canvas.height = 0; // geheugen vrijgeven (iPad)
    }
    pdf.save(`${veiligeNaam(naam)}.pdf`);
  } finally {
    f.remove();
  }
}

// ---- Excel ----

const tekst = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
const BEDRAG = /^(-|−)?\s*(€)?\s*(-|−)?\s*(\d{1,3}(?:\.\d{3})+|\d+)(,\d+)?$/;

// "€ 1.234,56", "-€ 12", "1.234" → getal; al het andere blijft tekst. Percentages en jaartallen blijven tekst.
export function naarGetal(s) {
  const m = BEDRAG.exec(String(s).trim());
  if (!m) return null;
  if (!m[2] && !m[5] && !m[4].includes(".") && m[4].length === 4 && !m[1] && !m[3]) return null; // jaartal
  const n = Number(m[4].replace(/\./g, "") + (m[5] ? "." + m[5].slice(1) : ""));
  return { v: (m[1] || m[3]) ? -n : n, euro: !!m[2] || !!m[5] };
}

// Het rapport als regels, in leesvolgorde, met de opmaak uit het iframe: tabelrijen worden rijen met cellen, een
// rij naast elkaar (flex/grid, zoals "Omzet … € 1.234") wordt ook één rij met cellen, en elk ander blok (kop,
// alinea, opsomming) een regel met één cel.
const isBlok = (win, el) => { const d = win.getComputedStyle(el).display; return d !== "none" && !d.startsWith("inline") && d !== "contents"; };
const heeftBlokken = (win, el) => [...el.children].some((c) => isBlok(win, c) || heeftBlokken(win, c));
export function rapportRegels(doc) {
  const win = doc.defaultView;
  const rijen = [];
  const verborgen = (el) => win.getComputedStyle(el).display === "none" || /^(SCRIPT|STYLE|TEMPLATE)$/.test(el.tagName);
  const loop = (el) => {
    if (verborgen(el)) return;
    if (el.tagName === "TABLE") {
      for (const tr of el.rows) {
        if (verborgen(tr)) continue;
        const rij = [];
        for (const td of tr.cells) { rij.push(tekst(td)); for (let k = 1; k < (td.colSpan || 1); k++) rij.push(""); }
        if (rij.some((c) => c !== "")) rijen.push(rij);
      }
      rijen.push([]);
      return;
    }
    if (!heeftBlokken(win, el)) { const t = tekst(el); if (t) rijen.push([t]); return; }
    const cs = win.getComputedStyle(el);
    const kinderen = [...el.children].filter((c) => !verborgen(c));
    if ((/flex/.test(cs.display) && !/column/.test(cs.flexDirection)) || /grid/.test(cs.display)) {
      if (kinderen.length >= 2 && kinderen.length <= 8 && kinderen.every((c) => !c.querySelector("table") && !heeftBlokken(win, c) )) {
        const rij = kinderen.map(tekst).filter((t) => t !== "");
        if (rij.length) rijen.push(rij);
        return;
      }
    }
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { const t = n.textContent.replace(/\s+/g, " ").trim(); if (t) rijen.push([t]); }
      else if (n.nodeType === 1) loop(n);
    }
  };
  loop(doc.body);
  // dubbele lege regels weg
  return rijen.filter((r, i) => r.length || (i > 0 && rijen[i - 1].length));
}

export async function htmlNaarExcel(html, naam) {
  const XLSX = await import("xlsx");
  const f = await laadInIframe(html, 1000);
  let rijen;
  try { rijen = rapportRegels(f.contentDocument); } finally { f.remove(); }
  if (!rijen.length) throw new Error("dit rapport is leeg");
  const ws = XLSX.utils.aoa_to_sheet(rijen);
  const breed = [];
  rijen.forEach((rij, r) => rij.forEach((c, k) => {
    const g = naarGetal(c);
    const adres = XLSX.utils.encode_cell({ r, c: k });
    if (g && ws[adres]) { ws[adres] = { t: "n", v: g.v, z: g.euro ? "#,##0.00" : "#,##0" }; }
    if (rij.length > 1 || k > 0) breed[k] = Math.min(60, Math.max(breed[k] || 8, String(c).length + 2));
  }));
  ws["!cols"] = breed.map((w) => ({ wch: w || 10 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rapport");
  XLSX.writeFile(wb, `${veiligeNaam(naam)}.xlsx`);
}
