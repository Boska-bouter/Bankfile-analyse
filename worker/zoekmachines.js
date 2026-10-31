// beide-V12R4 — vindbaarheid (besluit Boska 31-10): alleen de openbare welkomstpagina (/inloggen, waar "/" zonder inlog naartoe
// gaat) mag in zoekmachines. De app zelf, de aanmeld- en beheerpagina's en alle andere inlogpagina's blijven noindex.
// robots.txt en sitemap.xml komen uit de Worker (niet uit public/), met het adres waarop ze worden opgevraagd, en zijn ook
// zonder inlog bereikbaar. Op *.workers.dev (DEV en previews) en localhost blijft alles afgeschermd. Uitzetten kan met
// variabele ZOEKMACHINES = "uit" in wrangler.jsonc.
export const WELKOM_PAD = "/inloggen";

export function zoekmachinesWelkom(env, url) {
  if (String(env?.ZOEKMACHINES || "").trim().toLowerCase() === "uit") return false;
  const h = url.hostname;
  return !(h.endsWith(".workers.dev") || h === "localhost" || h === "127.0.0.1");
}

export const WELKOM_TITEL = "BankafschriftenTool — van bankafschrift naar btw- en IB-aangifte";
export const WELKOM_BESCHRIJVING = "Bankafschriften inlezen (CSV, MT940, CAMT.053) en automatisch indelen in inkomsten en uitgaven, met een indicatie voor de btw-aangifte en de aangifte inkomstenbelasting. Voor zzp, eenmanszaak, BV en een privé budgetoverzicht.";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// <head>-regels voor de welkomstpagina: index met beschrijving, vaste URL en gegevens voor zoekresultaten; anders noindex.
export function welkomHead(env, url) {
  if (!zoekmachinesWelkom(env, url)) return `<meta name="robots" content="noindex, nofollow">`;
  const adres = `${url.origin}${WELKOM_PAD}`;
  const ld = { "@context": "https://schema.org", "@type": "WebApplication", name: "BankafschriftenTool", url: adres, inLanguage: "nl",
    applicationCategory: "FinanceApplication", operatingSystem: "Web", description: WELKOM_BESCHRIJVING };
  return `<meta name="robots" content="index, follow">
<meta name="description" content="${esc(WELKOM_BESCHRIJVING)}">
<link rel="canonical" href="${esc(adres)}">
<meta property="og:type" content="website"><meta property="og:locale" content="nl_NL"><meta property="og:site_name" content="BankafschriftenTool">
<meta property="og:title" content="${esc(WELKOM_TITEL)}"><meta property="og:description" content="${esc(WELKOM_BESCHRIJVING)}"><meta property="og:url" content="${esc(adres)}">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`;
}

const tekst = (body, type) => new Response(body, { headers: { "content-type": `${type}; charset=utf-8`, "cache-control": "public, max-age=3600" } });

// /robots.txt en /sitemap.xml; null = geen van beide.
export function zoekmachineRoute(env, url) {
  if (url.pathname === "/robots.txt") {
    if (!zoekmachinesWelkom(env, url)) return tekst("User-agent: *\nDisallow: /\n", "text/plain");
    return tekst(`User-agent: *\nAllow: /$\nAllow: ${WELKOM_PAD}$\nDisallow: /\n\nSitemap: ${url.origin}/sitemap.xml\n`, "text/plain");
  }
  if (url.pathname === "/sitemap.xml") {
    if (!zoekmachinesWelkom(env, url)) return new Response("Not found", { status: 404 });
    return tekst(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${esc(url.origin + WELKOM_PAD)}</loc></url></urlset>\n`, "application/xml");
  }
  return null;
}
