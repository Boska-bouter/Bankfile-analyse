// V65 — suggesties voor de wizard, afgeleid uit de al ingelezen en geclassificeerde transacties:
// "gevonden in je bankdata". Alleen een hulpmiddel om niet te hoeven typen; niets wordt zonder
// bevestiging in het dossier gezet.

const LEVERANCIER_CATEGORIEEN = new Set(["Zakelijke inkoop/uitgaven", "Inhuur personeel", "Zakelijk - apparatuur/machines", "Overig"]);
const OMZET_CATEGORIEEN = new Set(["Zakelijke inkomsten", "Inkomsten", "Zakelijke inkomsten 0%", "Zakelijke inkomsten 9%", "Zakelijke inkomsten 21%"]);

// Zelfde partij onder iets andere schrijfwijze (hoofdletters, punten, afgekapte naam) wordt één suggestie.
const sleutel = (naam) => naam.toLowerCase().replace(/[^a-z0-9]/g, "");
const LEASE_NAAM = /lease|leasing|financial services|\bvwpfs\b|alphabet|athlon|ayvens|arval|hiltermann|de lage landen|\bdll\b|alfam|\bpfs\b|ald automotive|volkswagen pon/i;

function topNamen(txs, { max, perAantal = false }) {
  const map = new Map();
  for (const tx of txs) {
    const naam = String(tx.counterparty || "").replace(/\s+/g, " ").trim();
    if (naam.length < 3) continue;
    const k = sleutel(naam);
    let key = k;
    for (const bestaand of map.keys()) {
      if (bestaand === k || (Math.min(bestaand.length, k.length) >= 8 && (bestaand.startsWith(k) || k.startsWith(bestaand)))) { key = bestaand; break; }
    }
    const e = map.get(key) || { naam, count: 0, total: 0 };
    if (naam.length > e.naam.length && !naam.endsWith(" ")) e.naam = naam.length <= e.naam.length + 6 ? naam : e.naam;
    e.count += 1;
    e.total += Math.abs(Number(tx.amount) || 0);
    map.set(key, e);
  }
  return [...map.values()]
    .sort((a, b) => (perAantal ? b.count - a.count : b.total - a.total))
    .slice(0, max)
    .map(({ naam, count }) => ({ naam, count }));
}

export function computeWizardSuggesties(classified) {
  if (!Array.isArray(classified) || classified.length === 0) return {};
  const echt = classified.filter((tx) => !tx.isMirror);
  const uit = (cat) => echt.filter((tx) => tx.amount < 0 && tx.category === cat);
  const zakelijk = echt.filter((tx) => tx.accountType === "Zakelijk");
  return {
    leaseAuto: topNamen(
      echt.filter((tx) => tx.amount < 0 && (tx.category === "Lease (financieel)" || tx.category === "Lease (operationeel)" || LEASE_NAAM.test(tx.counterparty || ""))),
      { max: 3, perAantal: true }
    ),
    lening: topNamen(uit("Leningen"), { max: 3, perAantal: true }),
    aov: topNamen(uit("AOV (arbeidsongeschiktheidsverzekering)"), { max: 2, perAantal: true }),
    opdrachtgevers: topNamen(zakelijk.filter((tx) => tx.amount > 0 && OMZET_CATEGORIEEN.has(tx.category)), { max: 6 }),
    // Alleen echte inkoop/onderaanneming: geen energie, supermarkt, telecom, boekhouder of software
    // (die zijn algemene bedrijfskosten, geen leveranciers). Onherkende uitgaven ("Overig") horen er wel
    // bij, want dat zijn vaak leveranciers die de tool nog niet kent.
    leveranciers: topNamen(
      zakelijk.filter((tx) => tx.amount < 0 && LEVERANCIER_CATEGORIEEN.has(tx.category) && !LEASE_NAAM.test(tx.counterparty || "")),
      { max: 6 }
    ),
  };
}
