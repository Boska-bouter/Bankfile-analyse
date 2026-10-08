// Periode die van een boekjaar in de geladen bankdata zit, bijv. "t/m aug", "sep–dec" of "heel jaar".
const MND = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function berekenJaarPeriodes(transactions) {
  const res = {};
  for (const tx of transactions || []) {
    if (!tx.date) continue;
    const y = tx.date.getFullYear(), m = tx.date.getMonth();
    const r = (res[y] ||= { eerste: m, laatste: m });
    if (m < r.eerste) r.eerste = m;
    if (m > r.laatste) r.laatste = m;
  }
  const uit = {};
  for (const [y, r] of Object.entries(res)) {
    const heel = r.eerste === 0 && r.laatste === 11;
    uit[y] = {
      ...r, heel,
      label: heel ? "heel jaar" : r.eerste === 0 ? `t/m ${MND[r.laatste]}` : r.eerste === r.laatste ? MND[r.eerste] : `${MND[r.eerste]}–${MND[r.laatste]}`,
    };
  }
  return uit;
}
