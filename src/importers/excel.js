import * as XLSX from "xlsx";

export async function parseExcelFile(file) {
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
