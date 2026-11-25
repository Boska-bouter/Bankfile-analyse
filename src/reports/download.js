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
      // nieuw-V9R7 — vangnet: een uitklapblok (<details>) hoort niet in een PDF. Alleen de kopregel blijft staan,
      // zodat een open blok de pagina nooit meer breed en leeg maakt (melding Boska 23-11).
      for (const d of [...(doc?.querySelectorAll("details") || [])].reverse()) {
        const s = d.querySelector(":scope > summary");
        const div = doc.createElement("div");
        if (s) { div.className = s.className; div.append(...s.childNodes); }
        d.replaceWith(div);
      }
      const fonts = doc?.fonts?.ready || Promise.resolve();
      fonts.then(() => setTimeout(() => resolve(f), 50));
    };
    f.onload = klaar;
    f.onerror = () => reject(new Error("rapport kon niet worden opgemaakt"));
    // nieuw-V8R6 — html2canvas zet op iPad-Safari tekst met line-height "normal" te laag, zodat lijnen door de tekst
    // lopen (Boska 18-11). Een vaste line-height vooraan; eigen regels van het rapport gaan voor.
    let bron = zonderPrintOpLaden(html).replace(/<head([^>]*)>/i, '<head$1><style>body{line-height:1.35}</style>');
    // nieuw-V9R5 — de vaste Safari-CSS van V9R1 is vervangen door tekstKalibratie (meet de verschuiving zelf).
    f.srcdoc = bron;
    document.body.appendChild(f);
  });
}

// Waar mag een pagina eindigen? Bovenkanten van blokken en tabelrijen, niet midden in iets met break-inside: avoid
// (of een tabelrij). Verplichte breuken: page-break-before/after en break-before/after: page.
export function kiesBreuken(hoogte, pagina, kandidaten, vermijd, verplicht, voorkeur = [], hoofd = [], heel = []) {
  const breuken = [];
  const vrij = (y) => !vermijd.some(([a, b]) => y > a + 1 && y < b - 1);
  const goed = kandidaten.filter(vrij).sort((a, b) => a - b);
  const voorkeurGoed = voorkeur.filter(vrij).sort((a, b) => a - b);
  const hoofdGoed = hoofd.filter(vrij).sort((a, b) => a - b);
  const moet = [...verplicht].filter((y) => y > 1 && y < hoogte - 1).sort((a, b) => a - b);
  let y = 0;
  while (hoogte - y > pagina) {
    const doel = y + pagina;
    const harde = moet.find((m) => m > y + 1 && m <= doel);
    let b;
    // Een kader dat op één pagina past (aangiftekaart) niet doorsnijden: dan liever vóór het kader, of vóór de kop erboven.
    const kader = heel.find(([a, z]) => a > y + pagina * 0.1 && a <= doel && z > doel && z - a <= pagina);
    if (harde != null) b = harde;
    else if (kader) {
      const kop = hoofdGoed.filter((c) => c < kader[0] && c >= kader[0] - 200 && c > y + pagina * 0.1);
      b = kop.length ? kop[0] : kader[0];
    }
    else {
      // nieuw-V9R5 — Boska 20-11 ("vreemde pagina-overgangen"): liever breken vóór een nieuw blok of kopje
      // (onderste 40% van de pagina) dan midden in een blok.
      // Een nieuw hoofdstuk (h1/h2) begint liefst op een nieuwe pagina; anders het laatste tussenkopje.
      const nieuw = hoofdGoed.filter((c) => c > y + pagina * 0.6 && c <= doel);
      const mooi = voorkeurGoed.filter((c) => c > y + pagina * 0.6 && c <= doel);
      const kies = goed.filter((c) => c > y + pagina * 0.5 && c <= doel);
      b = nieuw.length ? nieuw[0] : mooi.length ? mooi[mooi.length - 1] : kies.length ? kies[kies.length - 1] : doel;
    }
    breuken.push(b); y = b;
  }
  for (const m of moet) if (m > y + 1 && m < hoogte - 1) { breuken.push(m); y = m; } // korte laatste stukken
  return breuken;
}

function meetBreuken(doc) {
  const win = doc.defaultView;
  const kandidaten = [], vermijd = [], verplicht = new Set(), voorkeur = [], hoofd = [], heel = [];
  const BLOK = /^(H[1-4])$/;
  const BLOKKLASSE = /\b(aangifte-kaart|ak-scherm|ak-sub|ak-sub2|ak-blok|kerncijfers-kaart|totaal-kaart|btw-kaart|status-kaart|rubriek)\b/;
  const sy = win.scrollY || 0;
  for (const el of doc.body.querySelectorAll("*")) {
    const cs = win.getComputedStyle(el);
    if (cs.display === "none" || cs.display.startsWith("inline")) continue;
    const r = el.getBoundingClientRect();
    // nieuw-V10R8 — Boska 25-11 ("ieder jaar op een nieuwe pagina"): de scheiding tussen de jaren is een leeg blok
    // zonder hoogte; die werd hier overgeslagen, zodat een nieuw jaar midden op een pagina begon.
    if (!r.height) {
      const t = Math.round(r.top + sy);
      if (/page|always/.test(cs.breakBefore || "") || cs.pageBreakBefore === "always" || /page|always/.test(cs.breakAfter || "") || cs.pageBreakAfter === "always") verplicht.add(t);
      continue;
    }
    const top = Math.round(r.top + sy), onder = Math.round(r.bottom + sy);
    kandidaten.push(top);
    if (cs.display === "table-row" || /avoid/.test(cs.breakInside || "") || /avoid/.test(cs.pageBreakInside || "")) vermijd.push([top, onder]);
    if (/page|always/.test(cs.breakBefore || "") || cs.pageBreakBefore === "always") verplicht.add(top);
    if (/page|always/.test(cs.breakAfter || "") || cs.pageBreakAfter === "always") verplicht.add(onder);
    if (/^h[1-4]$/i.test(el.tagName)) vermijd.push([top, onder + 60]); // kop niet los onderaan een pagina
    if (BLOK.test(el.tagName) || BLOKKLASSE.test(el.className || "")) voorkeur.push(top);
    if (/^H[12]$/.test(el.tagName)) hoofd.push(top);
    if (/\b(aangifte-kaart|kerncijfers-kaart|totaal-kaart)\b/.test(el.className || "")) heel.push([top, onder]);
    if (/\b(ak-scherm|ak-sub|ak-sub2)\b/.test(el.className || "")) vermijd.push([top, onder + 40]); // tussenkop bij de regels eronder
    // nieuw-V10R8 — Boska 25-11 ("niet middenin afbreken"): een kopregel met de regels die erbij horen
    // (categorieën, toelichting, "Hierin") niet over twee pagina's verdelen, als het geheel kort genoeg is.
    // Klassen als los woord (niet "bron-knop"); <details> zijn hier al vervangen door een div met de klasse van de summary.
    if (/(^|\s)(rubriek|subrubriek|ak-r)(\s|$)/.test(el.className || "")) {
      let eind = onder, nx = el.nextElementSibling;
      while (nx && /(^|\s)(categorie-detail|toelichting|ak-wat)(\s|$)/.test(nx.className || "")) {
        const rb = nx.getBoundingClientRect(); if (rb.height) eind = Math.max(eind, Math.round(rb.bottom + sy)); nx = nx.nextElementSibling;
      }
      // Ruim onder een halve pagina (staand ~1.112 px): anders kan er geen breukpunt overblijven en breekt de PDF door tekst.
      if (eind > onder && eind - top < 450) vermijd.push([top, eind]);
    }
  }
  return { kandidaten, vermijd, verplicht, voorkeur, hoofd, heel };
}


// nieuw-V9R5 — Boska 20-11 (PDF op iPad): html2canvas zet tekst op iPad/Safari enkele pixels lager dan de browser zelf,
// zodat blauwe vakken boven de tekst uitsteken en lijnen de tekst raken. In plaats van te gokken meten we het:
// per lettertype/-grootte/regelhoogte een proefregel "HHHH" met een merkteken op de echte basislijn, één keer
// gefotografeerd; het verschil tussen de getekende en de echte basislijn corrigeren we daarna bij elke tekst.
const tekstSleutel = (cs) => [cs.fontFamily, cs.fontSize, cs.fontWeight, cs.fontStyle, cs.lineHeight].join("|");

function simuleer(win) {
  // Alleen voor tests (DEV): bootst de iPad-verschuiving na in Chromium.
  const f = import.meta.env?.DEV && typeof window !== "undefined" ? window.__btPdfSimuleer : 0;
  if (!f) return;
  const verschuif = (r, el) => { const d = parseFloat(win.getComputedStyle(el).fontSize) * f; return new win.DOMRect(r.left, r.top + d, r.width, r.height); };
  const orig = win.Range.prototype.getClientRects;
  win.Range.prototype.getClientRects = function () {
    const el = this.startContainer?.parentElement;
    const rs = orig.call(this);
    return el ? Array.from(rs).map((r) => verschuif(r, el)) : rs;
  };
}

function corrigeer(win, correctie) {
  if (!correctie.size) return;
  // Onbekende stijl (bijv. na de grens van 80): correctie van de dichtstbijzijnde lettergrootte, naar verhouding.
  const perMaat = [...correctie].map(([k, v]) => [parseFloat(k.split("|")[1]), v]).filter(([m]) => m > 0);
  const schat = (maat) => { let best = null; for (const [m, v] of perMaat) if (!best || Math.abs(m - maat) < Math.abs(best[0] - maat)) best = [m, v]; return best ? Math.round(best[1] * maat / best[0] * 2) / 2 : 0; };
  const d = (node) => {
    const el = node?.nodeType === 3 ? node.parentElement : node;
    if (!el) return 0;
    const cs = win.getComputedStyle(el); const k = tekstSleutel(cs);
    return correctie.has(k) ? correctie.get(k) : (correctie.alleBekend ? 0 : schat(parseFloat(cs.fontSize)));
  };
  const omhoog = (r, v) => new win.DOMRect(r.left, r.top - v, r.width, r.height);
  const origRange = win.Range.prototype.getClientRects;
  win.Range.prototype.getClientRects = function () {
    const rs = origRange.call(this);
    const v = d(this.startContainer);
    return v ? Array.from(rs).map((r) => omhoog(r, v)) : rs;
  };
  const origEl = win.Element.prototype.getBoundingClientRect;
  win.Element.prototype.getBoundingClientRect = function () {
    const r = origEl.call(this);
    if (this.tagName !== "HTML2CANVASWRAPPER") return r; // html2canvas-pad zonder Range-ondersteuning
    const v = d(this.parentElement);
    return v ? omhoog(r, v) : r;
  };
}

export async function tekstKalibratie(doc, html2canvas, breedte, hoogte) {
  const win = doc.defaultView;
  const stijlen = new Map();
  const tw = doc.createTreeWalker(doc.body, 4);
  let teVeel = false;
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (!n.nodeValue.trim() || !n.parentElement) continue;
    const cs = win.getComputedStyle(n.parentElement);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const k = tekstSleutel(cs);
    if (!stijlen.has(k) && stijlen.size >= 80) { teVeel = true; continue; }
    if (!stijlen.has(k)) stijlen.set(k, { fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle, lineHeight: cs.lineHeight });
  }
  if (teVeel) console.warn("PDF-tekstkalibratie: meer dan 80 tekststijlen; overige krijgen de correctie van de dichtstbijzijnde lettergrootte");
  const correctie = new Map();
  correctie.alleBekend = !teVeel; // alle stijlen gemeten: wat niet in de map staat hoeft geen correctie
  if (!stijlen.size) return correctie;
  const top = hoogte + 50;
  const bak = doc.createElement("div");
  bak.style.cssText = `position:absolute;left:0;top:${top}px;width:${breedte}px;background:#fff;margin:0;padding:0`;
  const regels = [];
  const lat = doc.createElement("div"); // referentielijn: waar begint de foto precies?
  lat.style.cssText = "display:block;height:2px;margin:0 0 8px;padding:0;background:#000;width:40px";
  bak.appendChild(lat);
  for (const [k, st] of stijlen) {
    const r = doc.createElement("div");
    r.style.cssText = "display:block;margin:0;padding:6px 0;white-space:nowrap;color:#000;background:#fff;letter-spacing:0;text-transform:none";
    Object.assign(r.style, st);
    const t = doc.createElement("span"); t.textContent = "HHHH"; t.style.color = "#000";
    const m = doc.createElement("span"); m.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
    r.append(t, m); bak.appendChild(r); regels.push({ k, r, t, m });
  }
  doc.body.appendChild(bak);
  const fr = win.frameElement; const oudH = fr?.style.height;
  let canvas = null;
  try {
    const sy = win.scrollY || 0;
    const bakH = Math.ceil(bak.getBoundingClientRect().height);
    if (fr) fr.style.height = `${top + bakH + 10}px`;
    await new Promise((r) => setTimeout(r, 20));
    const schaal = 2;
    canvas = await html2canvas(doc.documentElement, {
      scale: schaal, backgroundColor: "#ffffff", logging: false, x: 0, y: top, width: breedte, height: bakH,
      windowWidth: breedte, windowHeight: top + bakH + 10, scrollX: 0, scrollY: 0,
      onclone: (kloon) => simuleer(kloon.defaultView),
    });
    const ctx = canvas.getContext("2d");
    const kolom = ctx.getImageData(10, 0, 1, Math.min(canvas.height, 200)).data;
    let latY = -1;
    for (let y = 0; y < kolom.length / 4; y++) if (kolom[y * 4] + kolom[y * 4 + 1] + kolom[y * 4 + 2] < 300) { latY = y; break; }
    if (latY < 0) throw new Error("referentielijn niet gevonden");
    const verschil = latY / schaal - (lat.getBoundingClientRect().top + sy - top); // verschuiving van de foto zelf
    for (const { k, r, t, m } of regels) {
      const rr = r.getBoundingClientRect(), tr = t.getBoundingClientRect();
      const echt = m.getBoundingClientRect().top + sy; // echte basislijn (opmaak van de browser)
      const x0 = Math.max(0, Math.floor(tr.left * schaal) + 1), x1 = Math.min(canvas.width, Math.ceil(tr.right * schaal) - 1);
      const y0 = Math.max(0, Math.floor((rr.top + sy - top) * schaal)), y1 = Math.min(canvas.height, Math.ceil((rr.bottom + sy - top) * schaal));
      if (x1 <= x0 || y1 <= y0) continue;
      const data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      const bw = x1 - x0;
      let onder = -1;
      for (let y = y1 - y0 - 1; y >= 0 && onder < 0; y--) {
        for (let x = 0; x < bw; x++) { const i = (y * bw + x) * 4; if (data[i] + data[i + 1] + data[i + 2] < 300) { onder = y; break; } }
      }
      if (onder < 0) continue;
      const getekend = top + (y0 + onder + 1) / schaal - verschil; // onderkant van de H = getekende basislijn
      const v = Math.round((getekend - echt) * 2) / 2;
      if (Math.abs(v) >= 1 && Math.abs(v) < 2 * parseFloat(stijlen.get(k).fontSize)) correctie.set(k, v); // kleine letters kunnen relatief veel verschuiven
    }
  } catch (e) {
    correctie.clear(); // meten mislukt: zonder correctie verder
    console.warn("PDF-tekstkalibratie overgeslagen:", e?.message || e);
  } finally {
    if (fr) fr.style.height = oudH;
    if (canvas) canvas.width = canvas.height = 0;
    bak.remove();
  }
  return correctie;
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
    const correctie = await tekstKalibratie(doc, html2canvas, breedte, hoogte);
    if (import.meta.env?.DEV && typeof window !== "undefined") window.__btPdfCorrectie = Object.fromEntries(correctie);
    const { kandidaten, vermijd, verplicht, voorkeur, hoofd, heel } = meetBreuken(doc);
    const grenzen = [0, ...kiesBreuken(hoogte, paginaPx, kandidaten, vermijd, verplicht, voorkeur, hoofd, heel), hoogte];
    const n = grenzen.length - 1;
    for (let i = 0; i < n; i++) {
      const y = grenzen[i], h = Math.max(1, grenzen[i + 1] - y);
      const canvas = await html2canvas(doc.documentElement, {
        scale: 2, backgroundColor: "#ffffff", logging: false, useCORS: true,
        x: 0, y, width: breedte, height: h, windowWidth: breedte, windowHeight: hoogte, scrollX: 0, scrollY: 0,
        onclone: (kloon) => { simuleer(kloon.defaultView); corrigeer(kloon.defaultView, correctie); },
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
