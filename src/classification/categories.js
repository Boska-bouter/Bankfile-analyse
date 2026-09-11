// Categorieregels — zelfde logica als het manuele werkblad, editable at runtime.

export const DEFAULT_RULES = [
  { name: "Autokosten", color: "bg-red-100 text-red-800", keywords: ["garage", "apk", "bandenbedrijf", "autoservice", "autoschade", "onderhoud auto"] },
  { name: "Bankkosten", color: "bg-slate-200 text-slate-800", keywords: ["kosten betaalpakket", "servicekosten", "bankkosten", "afschrijving rente", "provisie", "abn amro bank n.v.", "ing bank n.v.", "rabobank", "sns bank", "asn bank", "triodos bank", "bunq", "knab", "regiobank", "van lanschot"] },
  // Let op volgorde: deze drie staan bewust VOOR de gewone Belastingen: IB/LH/OB-regels hieronder.
  // "Naheffingsaanslag omzetbelasting" bevat namelijk ook gewoon het woord "omzetbelasting" —
  // zonder deze volgorde zou zo'n naheffing dus altijd al bij de gewone "Belastingen: OB" zijn
  // beland, vóórdat de specifiekere naheffingen-regel ooit aan de beurt kwam.
  { name: "Belastingen: Naheffingen OB voorgaande jaren", color: "bg-rose-100 text-rose-800", keywords: ["naheffing omzetbelasting", "naheffingsaanslag omzetbelasting"] },
  { name: "Belastingen: Naheffingen LH voorgaande jaren", color: "bg-rose-200 text-rose-900", keywords: ["naheffing loonheffing", "naheffingsaanslag loonheffing"] },
  { name: "Belastingen: Naheffingen IB voorgaande jaren", color: "bg-rose-50 text-rose-700", keywords: ["naheffing inkomstenbelasting", "naheffingsaanslag inkomstenbelasting"] },
  { name: "Belastingen: IB", color: "bg-fuchsia-100 text-fuchsia-800", keywords: ["inkomstenbelasting", " ib "] },
  { name: "Belastingen: IH", color: "bg-purple-300 text-purple-900", keywords: ["inkomstenheffing", " ih "] },
  { name: "Belastingen: LH", color: "bg-purple-100 text-purple-800", keywords: ["loonheffing", " lh "] },
  { name: "Belastingen: MRB", color: "bg-fuchsia-300 text-fuchsia-900", keywords: ["motorrijtuigenbelasting", "mrb"] },
  { name: "Belastingen: OB", color: "bg-fuchsia-200 text-fuchsia-900", keywords: ["omzetbelasting", " ob "] },
  { name: "Belastingen: ZVW", color: "bg-purple-200 text-purple-900", keywords: ["zvw", "zorgverzekeringswet"] },
  { name: "Boekhouder & advies", color: "bg-purple-100 text-purple-800", keywords: ["boekhoud", "administratiekantoor", "accountant", "adviesbureau"] },
  { name: "Boodschappen", color: "bg-lime-100 text-lime-800", keywords: ["jumbo", "albert heijn", " ah ", "ah to go", "dirk", "linders", "jan linders", "nettorama", "aldi", "lidl", "coop", " plus ", "dekamarkt", "deka markt", "ekoplaza", "spar", "kruidvat", "etos", "vomar", "supersam", "supermarkt", "van cranenbroek"] },
  { name: "Brandstof", color: "bg-orange-100 text-orange-800", keywords: ["shell", "esso", "esso express", "total", "lukoil", "avia", " bp ", "argos", "tamoil", "tinq", "haan", "texaco", "agri", "firezone", "tango", "gulf", "autofood", "travelcard", "wasstraat", "wasbox"] },
  { name: "Energie-water", color: "bg-yellow-100 text-yellow-800", keywords: ["vattenfall", "nuon", "essent", "eneco", "greenchoice", "budget energie", "energiedirect", "energie direct", "oxxio", "vandebron", "pure energie", "engie", "delta energie", "qurrent", "powerpeers", "vitens", "waternet", "evides", "dunea", "wml", "waterbedrijf"] },
  { name: "Gemeentelijke kosten", color: "bg-stone-200 text-stone-800", keywords: ["gemeente", "waterschap", "brabant water"] },
  { name: "Huur", color: "bg-amber-100 text-amber-800", keywords: ["stichting halm", "huur "] },
  { name: "Incasso, juridisch & schulden", color: "bg-rose-100 text-rose-800", keywords: ["flanderijn", "kancelaria adwokacka", "stichting derdengelden", "ggn", "centraal justitieel incass", "pkg tax", "trust krediet beheer", "groenendaal", "dutch finance"] },
  { name: "Inhuur personeel", color: "bg-indigo-200 text-indigo-900", keywords: ["randstad", "adecco", "tempo-team", "tempo team", "yacht", "uitzendbureau", "detachering"] },
  { name: "Leningen", color: "bg-orange-200 text-orange-900", keywords: ["duo", "dienst uitvoering onderwijs", "lening", "geldlening"],
    description: "Leningen van derden — bijv. van familie/privépersonen, DUO (studiefinanciering/lesgeld-lening), of een commerciële lening bij een bank of andere kredietverstrekker. Zowel het opnemen als het aflossen van zo'n lening kan hier terechtkomen." },
  { name: "Loonadministratie", color: "bg-indigo-100 text-indigo-900", keywords: ["loonadministratie", "salarisverwerking", "loyalis", "raet", "nmbrs", "visma raet", "adp nederland"] },
  { name: "Uitbetalen loon", color: "bg-sky-100 text-sky-800", keywords: ["salaris", "nettoloon", "netto loon", "loonbetaling", "loon"],
    description: "Uitbetaald loon/salaris aan personeel. Het losse woord \"loon\" staat expres pas hier — de meer specifieke regels hierboven (loonheffing, loonadministratie) hebben voorrang." },
  { name: "Betaalautomaat kosten", color: "bg-slate-100 text-slate-700", keywords: ["sumup", "mollie", "ccv", "payleven", "adyen", "pin transactiekosten", "betaalautomaat", "pinautomaat"] },
  { name: "Onderhoud apparatuur/machines", color: "bg-orange-100 text-orange-800", keywords: [] },
  { name: "Specials", color: "bg-rose-200 text-rose-900", keywords: [],
    description: "Betalingen aan uiteenlopende, minder gangbare derde partijen die je bewust apart wilt houden van de rest." },
  { name: "Prive - mobiel/internet", color: "bg-indigo-50 text-indigo-700", keywords: [] },
  { name: "Prive overige abonnementen", color: "bg-violet-50 text-violet-700", keywords: [] },
  { name: "Zakelijk - apparatuur/machines", color: "bg-orange-50 text-orange-700", keywords: [] },
  { name: "Kinderopvang", color: "bg-rose-50 text-rose-700", keywords: ["kinderopvang", "gastouder", "peuterspeelzaal", "kinderdagverblijf", " bso "] },
  { name: "Lease (operationeel)", color: "bg-teal-100 text-teal-800", keywords: ["lease", "leaseplan", "alphabet", "athlon", "arval"] },
  { name: "Lease (financieel)", color: "bg-teal-200 text-teal-900", keywords: [] },
  { name: "Marketing-website", color: "bg-green-100 text-green-800", keywords: ["google ads", "google ireland", "meta ads", "facebook ads", "mailchimp", "hostnet", "versio", "transip", "strato", "canva", "linkedin ads"] },
  { name: "Parkeren", color: "bg-cyan-100 text-cyan-800", keywords: ["parkingyou", "parking you", "parkeer", "q-park", "qpark"] },
  { name: "Prive opnames", color: "bg-amber-100 text-amber-800", keywords: ["geldautomaat", "pinopname", "contant opgenomen", " atm "] },
  { name: "Reiskosten (OV)", color: "bg-cyan-200 text-cyan-900", keywords: ["ns.nl", "ns-groep", "ns groep", "ovpay", "gvb", "ret", "htm", "arriva", "connexxion", "qbuzz", "9292"] },
  { name: "Zakelijk mobiel/internet", color: "bg-indigo-100 text-indigo-800", keywords: ["t-mobile", "odido", "kpn", "ziggo", "vodafone", "tele2", "simyo", "youfone", "lebara", "lycamobile", "hollandsnieuwe", "ben.nl", "telfort", "caiw", "belsimpel", "viata"] },
  { name: "Zakelijk overige abonnementen", color: "bg-violet-100 text-violet-800", keywords: ["netflix", "spotify", "videoland", "disney+", "beveiliging", "alarmcentrale", "securitas", "verisure"] },
  { name: "Prive - vrijetijd-uitgaan-vakantie", color: "bg-teal-50 text-teal-700", keywords: ["takeaway", "thuisbezorgd", "mcdonald", "kfc", "subway", "ijssalon", "bastani", "zwembad", "casino", "pathe", "cinema", "restaurant", "cafe"] },
  { name: "Hypotheek", color: "bg-amber-200 text-amber-900", keywords: ["hypotheek", "hypotheekrente"] },
  { name: "Verzekering: Auto", color: "bg-sky-100 text-sky-800", keywords: ["autoverzekering", "wa verzekering", "motorrijtuigenverzekering", "anwb autoverzekering"] },
  { name: "Verzekering: Overig", color: "bg-sky-200 text-sky-900", keywords: [
    "asr schade", "allianz", "independer", "assuradeur", "anwb", "nationale-nederlanden", "nationale nederlanden",
    "interpolis", "ohra", "centraal beheer", "aegon", "reaal", "ditzo", "fbto", "univé", "unive",
  ] },
  { name: "Verzekering: Wonen", color: "bg-sky-300 text-sky-900", keywords: ["opstalverzekering", "inboedelverzekering", "woonverzekering", "woonhuisverzekering"] },
  { name: "Verzekering: Zakelijk", color: "bg-cyan-200 text-cyan-900", keywords: ["bedrijfsaansprakelijkheid", "zakelijke verzekering", "movir", "de goudse", "klaverblad", "chubb"] },
  { name: "Verzekering: Ziektekosten", color: "bg-teal-100 text-teal-800", keywords: [
    "zorgverzekering", "zorgpremie", "zilveren kruis", " cz zorg", "cz zorgverzekering", "vgz", "menzis",
    "onvz", "dsw", "izz", "aevitae", "iza zorgverzekering",
  ] },
  { name: "Webshops & online aankopen", color: "bg-violet-100 text-violet-800", keywords: ["bol.com", "jd sports", "shein", "decathlon", "mediamarkt", "mms online", "booking.com", "gadgetsalarm", "crazzy digidz", "moonflash", "epplejeck", "payu", "adyen", "autoverleden", "alipay"] },
  { name: "Winkels divers", color: "bg-lime-200 text-lime-900", keywords: [] },
  { name: "Zakelijke uitgaven", color: "bg-sky-200 text-sky-900", keywords: ["gamma", "praxis", "hornbach", "karwei", "hubo", "welkoop", "toolstation", "bouwmaat", "bauhaus", "klusmaat", "multimate", "boss", "raab karcher", "van neerbos"],
    description: "Algemene zakelijke kosten die nergens anders onder vallen." },
];

export const SPLIT_CATEGORY_NAMES = {
  "Zakelijk mobiel/internet": "Prive - mobiel/internet",
  "Zakelijk overige abonnementen": "Prive overige abonnementen",
};

export const CATEGORY_ORDER = [
  "Autokosten", "Bankkosten", "Belastingen: IB", "Belastingen: IH", "Belastingen: LH", "Belastingen: MRB", "Belastingen: OB",
  "Belastingen: ZVW", "Belastingen: Naheffingen OB voorgaande jaren", "Belastingen: Naheffingen LH voorgaande jaren", "Belastingen: Naheffingen IB voorgaande jaren", "Boekhouder & advies", "Boodschappen", "Brandstof", "Energie-water", "Gemeentelijke kosten",
  "Huur", "Hypotheek", "Incasso, juridisch & schulden", "Inhuur personeel", "Inkomsten", "Inkomsten/betalingen niet dit jaar", "Kinderopvang", "Lease (operationeel)", "Lease (financieel)", "Leningen", "Loonadministratie", "Marketing-website", "Overboekingen aan personen",
  "Overig", "Onderhoud apparatuur/machines", "Parkeren", "Betaalautomaat kosten", "Prive - mobiel/internet", "Prive opnames", "Prive overige abonnementen",
  "Terugboeking van prive",
  "Reiskosten (OV)", "Specials", "Uitbetalen loon", "Uitbetaling aan prive", "Prive - vrijetijd-uitgaan-vakantie",
  "Verkoop activa", "Verzekering: Auto", "Verzekering: Overig", "Verzekering: Wonen", "Verzekering: Zakelijk", "Verzekering: Ziektekosten",
  "Webshops & online aankopen", "Winkels divers", "Zakelijk - apparatuur/machines", "Zakelijk mobiel/internet", "Zakelijk overige abonnementen", "Zakelijke inkomsten", "Zakelijke uitgaven",
].sort((a, b) => a.localeCompare(b));

export const CATEGORY_COLOR = Object.fromEntries([
  ["Zakelijke inkomsten", "bg-emerald-100 text-emerald-800"],
  ["Inkomsten", "bg-teal-100 text-teal-800"],
  ["Inkomsten/betalingen niet dit jaar", "bg-stone-200 text-stone-700"],
  ["Uitbetalen loon", "bg-sky-100 text-sky-800"],
  ["Verkoop activa", "bg-lime-100 text-lime-800"],
  ["Uitbetaling aan prive", "bg-amber-200 text-amber-900"],
  ["Terugboeking van prive", "bg-amber-100 text-amber-800"],
  ["Overboekingen aan personen", "bg-fuchsia-100 text-fuchsia-800"],
  ["Overig", "bg-slate-200 text-slate-700"],
  ...DEFAULT_RULES.map((r) => [r.name, r.color]),
]);

export const NEW_CATEGORY_PALETTE = [
  "bg-cyan-100 text-cyan-800", "bg-lime-200 text-lime-900", "bg-orange-200 text-orange-900",
  "bg-violet-200 text-violet-900", "bg-rose-200 text-rose-900", "bg-teal-200 text-teal-900",
  "bg-indigo-100 text-indigo-800", "bg-amber-100 text-amber-800", "bg-sky-100 text-sky-800",
  "bg-emerald-200 text-emerald-900",
];

export const DEFAULT_FIXED_CATEGORIES = [
  "Bankkosten", "Belastingen: LH", "Belastingen: MRB", "Belastingen: ZVW",
  "Energie-water", "Gemeentelijke kosten", "Huur", "Hypotheek", "Kinderopvang",
  "Lease (operationeel)", "Lease (financieel)", "Leningen", "Loonadministratie",
  "Prive - mobiel/internet", "Prive overige abonnementen", "Uitbetalen loon",
  "Verzekering: Auto", "Verzekering: Overig", "Verzekering: Wonen", "Verzekering: Zakelijk", "Verzekering: Ziektekosten",
  "Zakelijk mobiel/internet", "Zakelijk overige abonnementen",
];

export const INCOME_TRANSFER_CATEGORIES = [
  "Zakelijke inkomsten", "Inkomsten", "Verkoop activa",
  "Prive opnames", "Uitbetaling aan prive", "Terugboeking van prive",
  "Overboekingen aan personen", "Inkomsten/betalingen niet dit jaar",
];

// "Zakelijke inkoop" is samengevoegd met "Zakelijke uitgaven" — bestaande, eerder opgeslagen
// correcties/regels met de oude naam worden bij het laden automatisch omgezet.
export const LEGACY_CATEGORY_RENAMES = {
  "Zakelijke inkoop": "Zakelijke uitgaven",
  "Telecom & abonnementen": "Zakelijk mobiel/internet",
  "Energie": "Energie-water",
  "Uitgaan": "Prive - vrijetijd-uitgaan-vakantie",
  "Prive mobiel/internet": "Prive - mobiel/internet",
  "Prive Vakantie - uitstapjes": "Prive - vrijetijd-uitgaan-vakantie",
  "Vrije tijd - Uitgaan": "Prive - vrijetijd-uitgaan-vakantie",
  "Prive - vakantie/uitstapjes": "Prive - vrijetijd-uitgaan-vakantie",
  "Prive Hypotheek": "Hypotheek",
  "Lease": "Lease (operationeel)",
  "Belastingen: Naheffingen voorgaande jaren": "Belastingen: Naheffingen OB voorgaande jaren",
};

export function migrateLegacyCategoryName(name) {
  return LEGACY_CATEGORY_RENAMES[name] || name;
}

// CATEGORY_ORDER/CATEGORY_COLOR leven bewust buiten React-state: ze worden direct gelezen door
// meerdere componenten zonder prop-threading. Een nieuwe custom categorie wordt hier geregistreerd
// (in place gemuteerd) én tegelijk aan de `categoryRules`-state toegevoegd, waarvan de wijziging
// dan de re-render triggert die de bijgewerkte lijst oppikt.
export function registerCategory(name, color) {
  if (!CATEGORY_ORDER.includes(name)) {
    CATEGORY_ORDER.push(name);
    CATEGORY_ORDER.sort((a, b) => a.localeCompare(b));
  }
  if (!CATEGORY_COLOR[name]) {
    CATEGORY_COLOR[name] = color || NEW_CATEGORY_PALETTE[CATEGORY_ORDER.length % NEW_CATEGORY_PALETTE.length];
  }
}

// Merget een opgeslagen categoryRules-array (uit storage of een projectbestand) met
// DEFAULT_RULES op naam, met behoud van custom categorieën die niet in DEFAULT_RULES zitten.
export function mergeCategoryRules(savedRules) {
  const rawSaved = Array.isArray(savedRules) ? savedRules : [];
  const saved = rawSaved.map((r) => ({ ...r, name: migrateLegacyCategoryName(r.name) }));
  const merged = DEFAULT_RULES.map((defRule) => {
    const match = saved.find((r) => r.name === defRule.name);
    return match ? { ...defRule, keywords: match.keywords } : defRule;
  });
  const custom = saved.filter((r) => !DEFAULT_RULES.some((d) => d.name === r.name) && !(r.name in LEGACY_CATEGORY_RENAMES));
  for (const c of custom) registerCategory(c.name, c.color);
  return [...merged, ...custom];
}

export function migrateOverridesMap(map, counterpartyKeyFn) {
  const next = {};
  for (const [key, val] of Object.entries(map || {})) {
    const migratedVal = val && val.category ? { ...val, category: migrateLegacyCategoryName(val.category) } : val;
    // Sleutel opnieuw berekenen aan de hand van de bewaarde weergavenaam — zo blijven oude,
    // opgeslagen tegenpartij-correcties correct matchen ook als de sleutelberekening verbetert.
    if (migratedVal && migratedVal.displayName) {
      const sign = migratedVal.sign === "neg" ? -1 : 1;
      const newKey = counterpartyKeyFn(migratedVal.displayName, sign);
      if (newKey) {
        next[newKey] = migratedVal;
        continue;
      }
    }
    next[key] = migratedVal;
  }
  return next;
}
