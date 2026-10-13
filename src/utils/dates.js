export function parseDate(raw) {
  if (raw instanceof Date) return raw;
  if (typeof raw === "number") {
    // Excel serial date
    // Zelfde grenzen als de xlsx-bibliotheek (die hier niet meer nodig is, zodat hij pas bij een Excel-import of
    // -export wordt geladen): buiten 0 t/m 2958465 is het geen Excel-datum maar bijv. 20230115.
    if (raw >= 0 && raw <= 2958465) {
      const u = new Date(Math.round((Math.floor(raw) - 25569) * 86400000));
      return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
    }
  }
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

export const MAAND_NAMEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
