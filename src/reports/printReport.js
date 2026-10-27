// beide-V8R0 — het zakelijke geldstroomoverzicht (buildReportHtml/printReport) is weg (wens Boska 27-10); hier staat
// alleen nog het printen van een kant-en-klaar HTML-rapport.

// Print van een reeds opgebouwd HTML-rapport (bijv. het aangiftevoorstel) in een nieuw tabblad.
export function printHtmlDocument(html) {
  const isStandaloneApp =
    (typeof window.navigator.standalone !== "undefined" && window.navigator.standalone) ||
    (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches);
  if (isStandaloneApp) {
    window.alert(
      "Printen lukt helaas niet vanuit de app-versie op het beginscherm — dit is een bekende beperking van iOS zelf.\n\n" +
        'Gebruik in plaats daarvan "Downloaden": open het gedownloade bestand daarna in de browser, en gebruik van daaruit het deel-menu om te printen of als PDF op te slaan.'
    );
    return;
  }
  let win = null;
  try {
    win = window.open("", "_blank");
  } catch (e) {
    win = null;
  }
  if (win) {
    try {
      win.document.open();
      win.document.write(html.replace("<body>", `<body onload="window.print()">`));
      win.document.close();
      return;
    } catch (e) {
      try { win.close(); } catch (e2) { /* ignore */ }
    }
  }
  window.alert('Kon geen nieuw venster openen om te printen — gebruik in plaats daarvan "Downloaden".');
}
