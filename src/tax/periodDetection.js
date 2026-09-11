// Herkent een periode-notatie in een bankomschrijving, zoals "20250301-20250331" of varianten
// daarop. Puur voor het signaleren van mogelijke factuurstelsel/kasstelsel-verschillen bij
// "Zakelijke inkomsten" — geen automatische correctie, alleen een suggestie.
export function detectPeriodeInDescription(description) {
  if (!description) return null;
  // Bouwt een Date, maar wijst 'm af als jaar/maand/dag ongeldig zijn — JavaScript's eigen Date
  // "rolt" een ongeldige maand/dag anders stilzwijgend door naar een andere, verkeerde datum.
  const strictDate = (y, mo, d) => {
    y = Number(y); mo = Number(mo); d = Number(d);
    if (y < 1900 || y > 2099 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dt;
  };
  const patterns = [
    { re: /(\d{4})(\d{2})(\d{2})\s*-\s*(\d{4})(\d{2})(\d{2})/, parse: (m) => [[m[1], m[2], m[3]], [m[4], m[5], m[6]]] },
    { re: /(\d{4})-(\d{2})-(\d{2})\s*(?:-|t\/m|tot)\s*(\d{4})-(\d{2})-(\d{2})/i, parse: (m) => [[m[1], m[2], m[3]], [m[4], m[5], m[6]]] },
    { re: /(\d{2})(\d{2})(\d{4})\s*-\s*(\d{2})(\d{2})(\d{4})/, parse: (m) => [[m[3], m[2], m[1]], [m[6], m[5], m[4]]] },
    { re: /(\d{2})[-.](\d{2})[-.](\d{4})\s*(?:-|t\/m|tot)\s*(\d{2})[-.](\d{2})[-.](\d{4})/i, parse: (m) => [[m[3], m[2], m[1]], [m[6], m[5], m[4]]] },
  ];
  for (const { re, parse } of patterns) {
    const m = description.match(re);
    if (!m) continue;
    const [[y1, mo1, d1], [y2, mo2, d2]] = parse(m);
    const start = strictDate(y1, mo1, d1);
    const end = strictDate(y2, mo2, d2);
    if (!start || !end || end < start) continue;
    // Een periode van meer dan ~370 dagen is vrijwel zeker geen factuurperiode maar toeval.
    if ((end - start) / 86400000 > 370) continue;
    return { start, end };
  }
  return null;
}
