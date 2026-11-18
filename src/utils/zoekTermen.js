// nieuw-V6R9 — zoeken op meerdere woorden, gescheiden door een komma of puntkomma (wens Boska 17-11).
// Een boeking past als minstens één van de woorden erin voorkomt. Hoofdletters en accenten tellen niet.
export const zoekNorm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export const zoekTermen = (q) => zoekNorm(q).split(/[,;]/).map((t) => t.trim()).filter(Boolean);
export const zoektermTreft = (tekst, termen) => { const t = zoekNorm(tekst); return termen.some((w) => t.includes(w)); };
// Het woord waar je nu aan typt (na de laatste komma/puntkomma) en het stuk ervoor.
export const laatsteTerm = (q) => { const m = String(q || "").match(/^(.*[,;]\s*)?([^,;]*)$/); return { voor: m?.[1] || "", term: (m?.[2] || "").trim() }; };
