// release30V7 — de Excel-lezer is een los deel van de app dat pas bij het eerste Excel-bestand wordt
// opgehaald. Stond de app al open toen er een nieuwe versie online kwam (of is de inlogsessie verlopen),
// dan bestaat dat deel niet meer of wordt het geweigerd: het inlezen mislukte dan zonder zichtbare
// melding. Nu: kort na het opstarten alvast ophalen, één keer opnieuw proberen, en anders een duidelijke melding.
let xlsxBelofte = null;
const laadXlsx = () => {
  if (!xlsxBelofte) {
    xlsxBelofte = import("xlsx").catch(() => import("xlsx")).catch((e) => {
      xlsxBelofte = null;
      const fout = new Error("De Excel-lezer kon niet worden geladen. Waarschijnlijk is de app intussen bijgewerkt of is je inlogsessie verlopen. Sluit de app, open hem opnieuw en laad de bestanden nog eens.");
      fout.herladen = true;
      fout.cause = e;
      throw fout;
    });
  }
  return xlsxBelofte;
};
export function voorladenExcel() {
  laadXlsx().catch(() => { /* melding volgt pas als er echt een Excel-bestand wordt ingelezen */ });
}

export async function parseExcelFile(file) {
  const XLSX = await laadXlsx(); // pas laden als er echt een Excel-bestand wordt ingelezen
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false });
  const rows = [];
  wb.SheetNames.forEach((sn) => {
    const ws = wb.Sheets[sn];
    const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
    rows.push(...json);
  });
  return rows;
}
