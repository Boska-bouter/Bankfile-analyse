// huishoudboekje-V1R0 — maanden en weken. Een week is een ISO-week: maandag t/m zondag, week 1 = de week met de
// eerste donderdag van het jaar. Sleutels: "2026-03" (maand) en "2026-W09" (week).
const datumVan = (t) => (t instanceof Date ? t : new Date(t));
const dag = (d) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

export function maandSleutel(d) {
  const x = datumVan(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
}
export function weekSleutel(d) {
  const x = dag(datumVan(d));
  const wd = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - wd); // donderdag van deze week
  const jaar = x.getUTCFullYear();
  const w = Math.ceil(((x - Date.UTC(jaar, 0, 1)) / 86400000 + 1) / 7);
  return `${jaar}-W${String(w).padStart(2, "0")}`;
}
export const sleutelVan = (d, soort) => (soort === "week" ? weekSleutel(d) : maandSleutel(d));

// Begin en einde (inclusief) van een periode, als UTC-datums.
export function grenzen(sleutel) {
  const w = /^(\d{4})-W(\d{2})$/.exec(sleutel);
  if (w) {
    const jaar = +w[1], nr = +w[2];
    const vier = new Date(Date.UTC(jaar, 0, 4));
    const maandag = new Date(vier); maandag.setUTCDate(vier.getUTCDate() - ((vier.getUTCDay() || 7) - 1) + (nr - 1) * 7);
    const zondag = new Date(maandag); zondag.setUTCDate(maandag.getUTCDate() + 6);
    return { van: maandag, tot: zondag };
  }
  const [j, m] = sleutel.split("-").map(Number);
  return { van: new Date(Date.UTC(j, m - 1, 1)), tot: new Date(Date.UTC(j, m, 0)) };
}

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const kort = (d) => `${d.getUTCDate()} ${MAANDEN[d.getUTCMonth()].slice(0, 3)}`;
export function periodeLabel(sleutel) {
  if (/W/.test(sleutel)) {
    const { van, tot } = grenzen(sleutel);
    return `Week ${+sleutel.slice(-2)} · ${kort(van)} – ${kort(tot)} ${tot.getUTCFullYear()}`;
  }
  const [j, m] = sleutel.split("-").map(Number);
  return `${MAANDEN[m - 1].charAt(0).toUpperCase()}${MAANDEN[m - 1].slice(1)} ${j}`;
}
export const kortLabel = (sleutel) => (/W/.test(sleutel) ? `wk ${+sleutel.slice(-2)}` : `${MAANDEN[+sleutel.slice(5) - 1].slice(0, 3)} ${sleutel.slice(2, 4)}`);

// Volgende of vorige periode.
export function verschuif(sleutel, stap) {
  const { van } = grenzen(sleutel);
  if (/W/.test(sleutel)) { const d = new Date(van); d.setUTCDate(d.getUTCDate() + 7 * stap); return weekSleutel(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
  return maandSleutel(new Date(van.getUTCFullYear(), van.getUTCMonth() + stap, 1));
}

// Alle periodes van de eerste tot de laatste boeking (ook lege ertussen), oudste eerst.
export function periodesTussen(eerste, laatste, soort) {
  if (!eerste || !laatste) return [];
  const lijst = [];
  let s = sleutelVan(eerste, soort);
  const eind = sleutelVan(laatste, soort);
  for (let i = 0; i < 2000 && s <= eind; i++) { lijst.push(s); s = verschuif(s, 1); }
  return lijst;
}

// Een periode is volledig als de bankgegevens de hele periode dekken en hij voorbij is.
export function isVolledig(sleutel, { eerste, laatste, vandaag = new Date() }) {
  if (!eerste || !laatste) return false;
  const { van, tot } = grenzen(sleutel);
  const e = dag(datumVan(eerste)), l = dag(datumVan(laatste)), n = dag(datumVan(vandaag));
  return e <= van && l >= tot && tot < n;
}
