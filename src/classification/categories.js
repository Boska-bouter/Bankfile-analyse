// Categorieregels — zelfde logica als het manuele werkblad, editable at runtime.

export const DEFAULT_RULES = [
  { name: "Autokosten", color: "bg-red-100 text-red-800", keywords: ["garage", "apk", "bandenbedrijf", "autoservice", "autoschade", "onderhoud auto"] },
  { name: "Bankkosten", color: "bg-slate-200 text-slate-800", keywords: [
    "kosten betaalpakket", "servicekosten", "bankkosten", "afschrijving rente", "provisie", "betalingsverkeer",
    "abn amro bank n.v.", "abn amro", "ing bank n.v.", "ing bank", "rabobank", "sns bank", "asn bank",
    "triodos bank", "bunq", "knab", "regiobank", "van lanschot", "nibc", "nibc direct", "achmea bank",
    "aegon bank", "nn bank", "nationale-nederlanden bank", "moneyou", "revolut", "n26", "openbank",
    "santander", "credit europe bank", "demir-halk bank", "anadolubank", "yapi kredi", "garantibank",
    "garanti bbva", "deutsche bank", "bnp paribas", "hsbc", "nwb bank", "bng bank", "transferwise",
    "saxo bank", "binckbank", "alex vermogensbank",
  ] },
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
  { name: "Boekhouder, accountant & administratie", color: "bg-purple-100 text-purple-800", keywords: ["boekhoud", "administratiekant", "accountant", "adviesbureau", "loonadministratie", "salarisverwerking", "loyalis", "raet", "nmbrs", "visma raet", "adp nederland", "deloitte", "pwc", "ernst & young", " ey ", "kpmg", "bdo", "flynth", "countus", "alfa accountants", "grant thornton", "mazars", "baker tilly",
    "sd worx", "loket.nl", "exact online", "afas", "salaris compleet", "salarispro", "employes", "unit4",
    "salarisonline", "payroll totaal", "tentoo", "merces", "flexpedia",
    "rsm nederland", "moore drv", "astrium accountants", "accon avm", "abab accountants", "van oers",
    "etl nederland", "kroesewevers",
    "snelstart", "moneybird", "e-boekhouden.nl", "rompslomp", "yuki boekhouden", "twinfield", "accountancy gemak"] },
  { name: "Boodschappen", color: "bg-lime-100 text-lime-800", keywords: [
    "jumbo", "albert heijn", " ah ", "ah to go", "dirk", "dirk van den broek", "linders", "jan linders",
    "gall&gall", "gall & gall", "mitra", "drankenhandel", "slijterij",
    "nettorama", "aldi", "lidl", "coop", " plus ", "dekamarkt", "deka markt", "ekoplaza", "spar",
    "kruidvat", "etos", "vomar", "vomar voordeelmarkt", "supersam", "supermarkt", "van cranenbroek",
    "boni", "hoogvliet", "poiesz", "em-té", "emté", " attent ", "mcd supermarkt", "sligro", "makro",
    "kaufland", "rewe", "edeka", "real,-", "delhaize", "carrefour", "colruyt", " okay ", "intermarché",
    "intermarche", " cora ", "picnic", "crisp", "ekoplaza", "odin", "marqt", "amazing oriental",
    "boon's markt", "dagwinkel", "supercoop", "aldi süd", "aldi nord", "netto markt", "penny markt", "dm-drogerie",
    "rossmann", "globus", "marktkauf", "trinkgut", "bio-planet",
  ] },
  { name: "Brandstof", color: "bg-orange-100 text-orange-800", keywords: [
    "shell", "esso", "esso express", "total", "totalenergies", "total energies", "lukoil", "avia",
    " bp ", "argos", "tamoil", "tinq", "haan", "texaco", "agri", "firezone", "tango", "gulf", "q8",
    "q8 easy", "greenpoint", "dcb energie", "berkman", "van der sluijs", "autofood", "travelcard",
    "wasstraat", "wasbox", "fastned", "allego", "shell recharge", "vattenfall incharge", "plenty",
    "multi tank card", "multi tankcard",
  ] },
  { name: "Energie-water", color: "bg-yellow-100 text-yellow-800", keywords: ["vattenfall", "nuon", "essent", "eneco", "greenchoice", "budget energie", "energiedirect", "energie direct", "oxxio", "vandebron", "pure energie", "engie", "delta energie", "qurrent", "powerpeers", "vitens", "waternet", "evides", "dunea", "wml", "waterbedrijf", "stedin", "joulz", "sepa green"] },
  { name: "Gemeentelijke kosten", color: "bg-stone-200 text-stone-800", keywords: ["gemeente", "waterschap", "brabant water"] },
  { name: "Huur", color: "bg-amber-100 text-amber-800", keywords: ["stichting halm", "huur "] },
  { name: "Incasso, juridisch & schulden", color: "bg-rose-100 text-rose-800", keywords: [
    "cjib",
    "flanderijn", "kancelaria adwokacka", "ggn", "centraal justitieel incass", "pkg tax",
    "trust krediet beheer", "groenendaal", "dutch finance", "syncasso", "cannock", "intrum", "vesting finance",
    "alektum", "bierens", "janssen & janssen", "rosmalen gerechtsdeurwaarders", "lavg", "agin",
    "bosveld incasso", "bvcm", "nib group", "coeo", "atradius collections", "coface", "vmp & partners",
    "nda incasso", "hafkamp", "yards deurwaardersdiensten", "deurwaarder.com", "digideur", "boitenluhrs",
    "jongerius gerechtsdeurwaarders", "via optima", "likifin", "armaere", "gerechtsdeurwaarders noord nederland",
    "stam gerechtsdeurwaarders", "bjk gerechtsdeurwaarders",
  ] },
  { name: "Inhuur personeel", color: "bg-indigo-200 text-indigo-900", keywords: ["randstad", "adecco", "tempo-team", "tempo team", "yacht", "uitzendbureau", "detachering"] },
  { name: "Toeslagen", color: "bg-emerald-50 text-emerald-700", keywords: ["kindertoeslag", "huurtoeslag", "zorgtoeslag", "kinderopvangtoeslag", "belastingdienst/toeslagen", "toeslagen"],
    description: "Ontvangen toeslagen van de Belastingdienst — kindertoeslag, huurtoeslag, zorgtoeslag en overige toeslagen. Persoonlijk inkomen, geen zakelijke omzet." },
  { name: "Leningen", color: "bg-orange-200 text-orange-900", keywords: [
    "duo", "dienst uitvoering onderwijs", "lening", "geldlening", "qredits", "new10", "bridgefund", "swishfund",
    "capitalbox", "nlinvesteert", "funding circle", "pin voorschot", "yeaz", "floryn", "voldaan facturen",
    "credion", "funding options", "findio zakelijk", "caple", "voordegroei", "altfin", "debitroom",
    "freelancefactoring", "o2 factoring", "bibby financial services", "svea finans", "factris",
    "atlantis financiers", "trefi", "collin crowdfund", "geldvoorelkaar.nl", "kapitaal op maat",
  ],
    description: "Leningen van derden — bijv. van familie/privépersonen, DUO (studiefinanciering/lesgeld-lening), of een commerciële lening bij een bank of andere kredietverstrekker. Zowel het opnemen als het aflossen van zo'n lening kan hier terechtkomen." },
  { name: "Uitbetalen loon", color: "bg-sky-100 text-sky-800", keywords: ["salaris", "nettoloon", "netto loon", "loonbetaling", "loon"],
    description: "Uitbetaald loon/salaris aan personeel. Het losse woord \"loon\" staat expres pas hier — de meer specifieke regels hierboven (loonheffing, loonadministratie) hebben voorrang." },
  { name: "Betaalautomaat kosten", color: "bg-slate-100 text-slate-700", keywords: [
    "sumup", "mollie", "ccv", "payleven", "adyen", "pin transactiekosten", "betaalautomaat", "pinautomaat",
    "worldline", "pay.nl", "buckaroo", "multisafepay", "mypos", "payter", "viva wallet", "zettle",
    "lightspeed", "stripe", "cm.com",
  ] },
  { name: "Onderhoud apparatuur/machines", color: "bg-orange-100 text-orange-800", keywords: [] },
  { name: "Persoonlijk & vertrouwelijk", color: "bg-slate-700 text-slate-100", keywords: [
    "holland casino", "jack's casino", "jacks casino", "circus casino", "toto.nl", "nederlandse loterij",
    "staatsloterij", "postcode loterij", "pokerstars", "unibet", "bet365", "betcity", "kansino",
    "napoleon games", "bingoal",
    "tinder", "bumble", "hinge", "parship", "lexa.nl", "match.com", "grindr", "happn",
    "onlyfans", "coffeeshop",
  ],
    description: "Persoonlijke, vertrouwelijke uitgaven die je bewust apart wilt houden van de rest (gokken, dating, adult content, drugs, en overige gevoelige uitgaven) — één subtype, geen verdere onderverdeling." },
  { name: "Personeel: overig", color: "bg-indigo-50 text-indigo-800", keywords: [],
    description: "Personeelskosten die niet specifiek Inhuur, Uitbetaald loon of Loonadministratie zijn." },
  { name: "Belastingen: overig", color: "bg-fuchsia-50 text-fuchsia-700", keywords: ["belastingdienst"],
    description: "Belastingen/heffingen waarvan nog niet duidelijk is om welk specifiek type het gaat (OB, LH, MRB, ZVW, IH) — later te verfijnen." },
  { name: "Prive: overig", color: "bg-stone-100 text-stone-700", keywords: [],
    description: "Privé-uitgaven/inkomsten die niet specifiek onder een van de andere privé-subtypes vallen." },
  { name: "Partneralimentatie", color: "bg-rose-100 text-rose-800", keywords: [
    "partneralimentatie", "partneralimentie",
  ],
    description: "Fiscaal anders dan de meeste privé-categorieën: bij de betaler is dit een persoonsgebonden aftrekpost (box 1), bij de ontvanger belast inkomen. Deze tool berekent dat niet mee in de IB-schatting (die is alleen op de winst uit onderneming gebaseerd) — betrek dit apart bij de daadwerkelijke aangifte." },
  { name: "Kinderalimentatie", color: "bg-rose-50 text-rose-700", keywords: [
    "kinderalimentatie", "lbio", "onderhoudsbijdrage",
  ],
    description: "Fiscaal neutraal — niet aftrekbaar bij de betaler, niet belast bij de ontvanger. Gewoon een privé-categorie, geen verdere fiscale behandeling nodig." },
  { name: "Winkels divers", color: "bg-lime-200 text-lime-900", keywords: [
    "jd sports", "shein", "zalando", "h&m", "hm.com", "c&a", "primark", "bershka", "zara", "asos",
    "urban outfitters", "bruna",
    "about you", "aboutyou", "nike", "adidas", "foot locker", "footlocker", "scapino", "deichmann",
    "van haren", "vanharen", "sacha", "manfield", "invito", "ziengs", "bristol", "hunkemöller",
    "hunkemoller", "we fashion", "wefashion", "vero moda", "veromoda", "jack & jones",
    "s.oliver", "esprit", "tommy hilfiger", "calvin klein", "shoeby", "cool cat", "coolcat",
    "america today", "rituals", "ici paris", "iciparisxl", "douglas", "omoda",
    "mango", "vinted", "g-star", "scotch & soda", "the sting", "sissy-boy", "costes", "uniqlo",
    "levi's", "suitsupply", "van dal", "wibra", "zeeman",
    "sneaker district", "aktiesport", "puma", "new balance", "skechers", "ecco", "clarks", "dr. martens",
    "lucardi", "siebel", "pandora", "swarovski", "my jewellery", "anna + nina", "ace & tate",
    "sunglass hut", "specsavers", "pearle", "hans anders",
    "dille & kamille", "kookpunt", "cookinglife", "kookwinkel oldenhof", "meesterslijpers",
    "knivesandtools", "le creuset", "kitchenaid", "magimix", "greenpan", "demeyere", "tefal",
    " action ", "hema", "blokker", "xenos", "haco", "leen bakker", "kwantum", " casa ",
    "søstrene grene", "big bazar", "marskramer", "praxis", "gamma", "karwei", "hornbach", "hubo", "homedeco",
    "bauhaus", " obi ", "trekpleister",
  ],
    description: "Fysieke en online winkelaankopen: kleding, schoenen, accessoires/sieraden, kookwinkels en huishoudwinkels." },
  { name: "Prive - mobiel/internet", color: "bg-indigo-50 text-indigo-700", keywords: [] },
  { name: "Prive overige abonnementen", color: "bg-violet-50 text-violet-700", keywords: [
    "netflix", "spotify", "videoland", "disney+", "disney plus", "hbo max", "hbomax", "npo start", "storytel",
    "npostart", "npo plus", "amazon prime", "prime video", "youtube premium", "apple music", "apple tv+",
    "deezer", "tidal", "viaplay", "dazn", "rtl+", "kijk.nl", "ziggo sport",
    // Kranten-/tijdschriftenabonnementen zijn vrijwel altijd privé, ook als ze vanaf een
    // zakelijke rekening betaald worden.
    "nrc", "volkskrant", "telegraaf", "trouw", "ad.nl", "parool", "metro nieuws", "nu.nl premium",
  ],
    description: "Streaming- en krantenabonnementen — deze blijven altijd Privé, ook wanneer ze vanaf een zakelijke rekening worden betaald (vrijwel nooit een echte zakelijke aftrekpost)." },
  { name: "Zakelijk - apparatuur/machines", color: "bg-orange-50 text-orange-700", keywords: [] },
  { name: "Kinderopvang", color: "bg-rose-50 text-rose-700", keywords: ["kinderopvang", "gastouder", "peuterspeelzaal", "kinderdagverblijf", " bso "] },
  { name: "Lease (operationeel)", color: "bg-teal-100 text-teal-800", keywords: [
    "lease", "leaseplan", "alphabet", "athlon", "arval", "ayvens", "grenke", "volkswagen pon financial services",
    "directlease", "hiltermann lease", "van mossel autolease", "international car lease holding", "iclh",
    "friesland lease", "business lease", "mkb lease", "zuidlease", "j&t autolease", "wagenplan",
    "terberg leasing", "mitsubishi motors financial services", "toyota financial services",
    "mercedes-benz financial services", "bmw financial services", "volvo car financial services",
    "renault financial services", "nissan financial services", "ford credit", "rci financial services",
    "opel financial services", "stellantis financial services",
  ] },
  { name: "Lease (financieel)", color: "bg-teal-200 text-teal-900", keywords: [] },
  { name: "Marketing-website", color: "bg-green-100 text-green-800", keywords: ["google ads", "google ireland", "meta ads", "facebook ads", "facebook payments", "mailchimp", "hostnet", "versio", "transip", "strato", "canva", "linkedin ads"] },
  { name: "Parkeren", color: "bg-cyan-100 text-cyan-800", keywords: ["parkingyou", "parking you", "parkeer", "q-park", "qpark"] },
  { name: "Prive opnames", color: "bg-amber-100 text-amber-800", keywords: ["geldautomaat", "pinopname", "contant opgenomen", " atm "] },
  { name: "Reiskosten (OV)", color: "bg-cyan-200 text-cyan-900", keywords: [
    "ns.nl", "ns-groep", "ns groep", "ovpay", "gvb", "ret", "htm", "arriva", "connexxion", "qbuzz",
    "9292", "syntus", "keolis", "breng", "u-ov", "r-net", "translink", "flixbus", "eurolines",
    "thalys", "eurostar", "ic direct",
  ] },
  { name: "Zakelijk mobiel/internet", color: "bg-indigo-100 text-indigo-800", keywords: [
    "t-mobile", "t.mobile", "odido", "kpn", "ziggo", "vodafone", "tele2", "simyo", "youfone", "lebara", "lycamobile",
    "hollandsnieuwe", "ben.nl", "telfort", "caiw", "belsimpel", "viata", "voiceworks", "aldi talk",
    "family mobile", "online.nl", "solcon", "xs4all", "budget mobiel", "budgetmobiel", "delta fiber",
    "kpn zakelijk", "vodafone business", "odido business", "voys", "speakup", "dean one", "vodafoneziggo",
    "caiway", "glasvezel buitenaf", "routit", "eurofiber", "brightfiber",
  ] },
  { name: "Zakelijk overige abonnementen", color: "bg-violet-100 text-violet-800", keywords: [
    "beveiliging", "alarmcentrale",
    "securitas", "verisure", "g4s", "trigion", "adt", "ajax systems", "alarm control", "heras", "kiwa",
    "cameranu", "hikvision", "dahua", "axis communications", "bosch security", "hanwha vision",
    "saval", "honeywell", "ansul", "somati", "firesense",
  ] },
  { name: "Prive - vrijetijd-uitgaan-vakantie & uit eten", color: "bg-teal-50 text-teal-700", keywords: [
    "takeaway", "thuisbezorgd", "mcdonald", "kfc", "subway", "ijssalon", "bastani", "zwembad", "casino", "pathe", "cinema", "restaurant", "cafe",
    "koffiehuisje", "coffeelab", "smullers", "bakhuisje", "ketelhuis", "tea stories", "lucifer coffee", "chaji",
    "soju bar", "zwartwit koffie", "eetcafe", "lunchroom", "grillroom", "snackbar", "cafetaria", "bistro", "brasserie",
    "feelgoods burgers",
  ] },
  { name: "Hypotheek", color: "bg-amber-200 text-amber-900", keywords: ["hypotheek", "hypotheekrente"] },
  { name: "Verzekering: Auto", color: "bg-sky-100 text-sky-800", keywords: ["autoverzekering", "wa verzekering", "motorrijtuigenverzekering", "anwb autoverzekering"] },
  { name: "Verzekering: Zakelijk", color: "bg-cyan-200 text-cyan-900", keywords: [
    "bedrijfsaansprakelijkheid", "zakelijke verzekering", "movir", "de goudse", "klaverblad", "chubb", "voogd",
    "aig", "hiscox", "zurich verzekeringen", "hdi global", "qbe", "liberty specialty markets", "ms amlin",
    "arag", " das ", "bovemij", "turien & co", "vivat", "aon",
  ],
    description: "Zakelijke verzekeringen. Let op: grote verzekeraars als Interpolis/Achmea/Allianz/Univé verkopen zowel zakelijke als privé-polissen — die staan daarom bij het privé-subtype \"Verzekeringen\" en moeten hier zo nodig handmatig op Zakelijk gezet worden." },
  { name: "AOV (arbeidsongeschiktheidsverzekering)", color: "bg-purple-100 text-purple-800", keywords: [
    "aov", "arbeidsongeschiktheidsverzekering", "broodfonds", "waarborgfonds", "movir aov",
  ],
    description: "Arbeidsongeschiktheidsverzekering — een veelvoorkomende, specifieke aftrekpost bij zzp'ers die anders in de generieke \"Verzekering: Zakelijk\" verdwijnt." },
  { name: "Verzekeringen", color: "bg-teal-100 text-teal-800", keywords: [
    "zorgverzekering", "zorgpremie", "zilveren kruis", " cz zorg", "cz zorgverzekering", "vgz", "menzis",
    "onvz", "dsw", "izz", "aevitae", "iza zorgverzekering",
    "achmea", "interpolis", "allianz", "independer", "assuradeur", "anwb", "nationale-nederlanden", "nationale nederlanden",
    "ohra", "vereniging eigen huis", "lemonade verzekering", "europeesche verzekeringen", "unigarant",
    "achmea rechtsbijstand", "a.s.r.",
    "centraal beheer", "aegon", "reaal", "ditzo", "fbto", "univé", "unive", "inshared",
    "opstalverzekering", "inboedelverzekering", "woonverzekering", "woonhuisverzekering",
  ],
    description: "Alle privé-verzekeringen op één subtype: ziektekosten, wonen en overige (zoals aansprakelijkheid, rechtsbijstand, reisverzekering) — alleen auto staat apart." },
  { name: "Webshops & online aankopen", color: "bg-violet-100 text-violet-800", keywords: [
    "bol.com", "decathlon", "mediamarkt", "mms online", "booking.com",
    "gadgetsalarm", "crazzy digidz", "moonflash", "epplejeck", "payu", "adyen", "autoverleden", "alipay",
    "amazon.nl", "amazon.de", "amazon", "coolblue", "wehkamp", "beslist.nl", "vidaxl", "aliexpress",
    "temu", "otto.nl", "de bijenkorf", "bijenkorf", "fonq", "alternate",
  ],
    description: "Algemene online aankopen (marktplaatsen, elektronica) die niet specifiek onder een andere categorie vallen. Kleding, schoenen, accessoires, kook- en huishoudwinkels (ook online) staan bij \"Winkels divers\"." },
  { name: "Zakelijke uitgaven", color: "bg-sky-200 text-sky-900", keywords: ["gamma", "praxis", "hornbach", "karwei", "hubo", "welkoop", "toolstation", "bouwmaat", "bauhaus", "klusmaat", "multimate", "boss", "raab karcher", "van neerbos"],
    description: "Algemene zakelijke kosten die nergens anders onder vallen." },
];

export const SPLIT_CATEGORY_NAMES = {
  "Zakelijk mobiel/internet": "Prive - mobiel/internet",
  "Zakelijk overige abonnementen": "Prive overige abonnementen",
};

export const CATEGORY_ORDER = [
  "Autokosten", "Bankkosten", "Belastingen: IB", "Belastingen: IH", "Belastingen: LH", "Belastingen: MRB", "Belastingen: OB",
  "Belastingen: ZVW", "Belastingen: Naheffingen OB voorgaande jaren", "Belastingen: Naheffingen LH voorgaande jaren", "Belastingen: Naheffingen IB voorgaande jaren", "Belastingen: overig", "Boekhouder, accountant & administratie", "Boodschappen", "Brandstof", "Energie-water", "Gemeentelijke kosten",
  "Huur", "Hypotheek", "Incasso, juridisch & schulden", "Inhuur personeel", "Inkomsten", "Inkomsten/betalingen niet dit jaar", "Kinderopvang", "Lease (operationeel)", "Lease (financieel)", "Leningen", "Marketing-website", "Overboekingen aan personen",
  "Overig", "Onderhoud apparatuur/machines", "Parkeren", "Betaalautomaat kosten", "Personeel: overig", "Prive - mobiel/internet", "Prive opnames", "Prive overige abonnementen", "Prive: overig", "Partneralimentatie", "Kinderalimentatie",
  "Terugboeking van prive",
  "Reiskosten (OV)", "Toeslagen", "Uitbetalen loon", "Uitbetaling aan prive", "Prive - vrijetijd-uitgaan-vakantie & uit eten",
  "Verkoop activa", "Verzekering: Auto", "Verzekering: Zakelijk", "Verzekeringen", "Persoonlijk & vertrouwelijk", "AOV (arbeidsongeschiktheidsverzekering)",
  "Webshops & online aankopen", "Winkels divers", "Zakelijk - apparatuur/machines", "Zakelijk mobiel/internet", "Zakelijk overige abonnementen", "Zakelijke inkomsten", "Zakelijke inkomsten 9%", "Zakelijke inkomsten 21%", "Zakelijke uitgaven",
].sort((a, b) => a.localeCompare(b));

export const CATEGORY_COLOR = Object.fromEntries([
  ["Zakelijke inkomsten", "bg-emerald-100 text-emerald-800"],
  ["Zakelijke inkomsten 9%", "bg-emerald-50 text-emerald-700"],
  ["Zakelijke inkomsten 21%", "bg-emerald-200 text-emerald-900"],
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
  "Lease (operationeel)", "Lease (financieel)", "Leningen", "Boekhouder, accountant & administratie",
  "Prive - mobiel/internet", "Prive overige abonnementen", "Uitbetalen loon",
  "Verzekering: Auto", "Verzekering: Zakelijk", "Verzekeringen",
  "Zakelijk mobiel/internet", "Zakelijk overige abonnementen",
];

export const INCOME_TRANSFER_CATEGORIES = [
  "Zakelijke inkomsten", "Zakelijke inkomsten 9%", "Zakelijke inkomsten 21%", "Inkomsten", "Verkoop activa", "Toeslagen",
  "Prive opnames", "Uitbetaling aan prive", "Terugboeking van prive",
  "Overboekingen aan personen", "Inkomsten/betalingen niet dit jaar",
];

// Route B (zie gesprek): telt een transactie mee als zakelijke omzet/kostenpost in W&V/BTW? Dat
// bepalen we voortaan op basis van de CATEGORIE, niet op basis van tx.type — een privé-uitgave die
// betaald is vanaf de zakelijke rekening (tx.type="Zakelijk") is nog steeds geen bedrijfskosten,
// en een zakelijke uitgave betaald vanaf de privérekening (tx.type="Prive") is dat juist wél.
// tx.type blijft alleen bepalen in welk overzicht je de transactie ziet en telt mee in de
// saldocontrole van de rekening zelf — niet meer in de fiscale telling.
//
// Dit vervangt de losse, verspreide uitsluitlijsten die voorheen in btw.js/yearlySummary.js/
// boxMapping.js stonden (ONTTREKKING_CATS, FINANCIERING_CATS, BTW_AANGIFTE_NIET_RELEVANT) — met
// dit veld op één centrale plek kan een categorie niet meer per ongeluk op de ene lijst wél, en de
// andere niet, staan (zoals bij "Prive: overig" en "Boodschappen" gebeurde).
//   "omzet"        - telt mee als zakelijke omzet
//   "kosten"       - telt volledig mee als aftrekbare zakelijke kostenpost
//   "financiering" - alleen de rente is aftrekbaar (Leningen/Lease financieel), niet de aflossing
//                    — de rente zelf wordt apart berekend (zie loanAmortization.js)
//   "geen"         - telt nooit mee als zakelijke omzet/kostenpost (privé, persoonlijke
//                    belastingafdracht, transfer, boekwinst, nog-te-beoordelen)
export const CATEGORY_FISCAL_TREATMENT = {
  // Omzet
  "Zakelijke inkomsten": "omzet", "Zakelijke inkomsten 9%": "omzet", "Zakelijke inkomsten 21%": "omzet",
  // Financiering — alleen de rente is aftrekbaar, niet het volledige termijnbedrag
  "Leningen": "financiering", "Lease (financieel)": "financiering",
  // Nooit een kostenpost, ongeacht tx.type: persoonlijke belastingafdrachten (MRB is de
  // uitzondering, dat is een genuine zakelijke autokostenpost)
  "Belastingen: IB": "geen", "Belastingen: IH": "geen", "Belastingen: LH": "geen", "Belastingen: OB": "geen",
  "Belastingen: ZVW": "geen", "Belastingen: overig": "geen",
  "Belastingen: Naheffingen OB voorgaande jaren": "geen", "Belastingen: Naheffingen LH voorgaande jaren": "geen",
  "Belastingen: Naheffingen IB voorgaande jaren": "geen",
  // Transfers/boekwinst/nog-te-beoordelen — geen gewone omzet of kostenpost
  "Inkomsten/betalingen niet dit jaar": "geen", "Verkoop activa": "geen", "Overig": "geen",
  // Alles met hoofdcategorie "Privé" of "Persoonlijk & vertrouwelijk": nooit een kostenpost,
  // ongeacht tx.type — dit was precies het gat waardoor "Prive: overig"/"Boodschappen" e.d. op de
  // zakelijke rekening ten onrechte als bedrijfskosten werden meegeteld
  "Boodschappen": "geen", "Hypotheek": "geen", "Incasso, juridisch & schulden": "geen", "Inkomsten": "geen",
  "Kinderopvang": "geen", "Overboekingen aan personen": "geen", "Prive - mobiel/internet": "geen",
  "Prive opnames": "geen", "Prive overige abonnementen": "geen", "Terugboeking van prive": "geen",
  "Toeslagen": "geen", "Uitbetaling aan prive": "geen", "Prive - vrijetijd-uitgaan-vakantie & uit eten": "geen",
  "Prive: overig": "geen", "Partneralimentatie": "geen", "Kinderalimentatie": "geen", "Verzekeringen": "geen",
  "Winkels divers": "geen", "Webshops & online aankopen": "geen", "Persoonlijk & vertrouwelijk": "geen",
  // Alle overige: gewone, volledig aftrekbare zakelijke kostenpost
  "Autokosten": "kosten", "Bankkosten": "kosten", "Belastingen: MRB": "kosten",
  "Boekhouder, accountant & administratie": "kosten", "Brandstof": "kosten", "Energie-water": "kosten",
  "Gemeentelijke kosten": "kosten", "Huur": "kosten", "Inhuur personeel": "kosten", "Lease (operationeel)": "kosten",
  "Marketing-website": "kosten", "Onderhoud apparatuur/machines": "kosten", "Parkeren": "kosten",
  "Betaalautomaat kosten": "kosten", "Personeel: overig": "kosten", "Reiskosten (OV)": "kosten",
  "Uitbetalen loon": "kosten", "Verzekering: Auto": "kosten", "Verzekering: Zakelijk": "kosten",
  "AOV (arbeidsongeschiktheidsverzekering)": "kosten", "Zakelijk - apparatuur/machines": "kosten",
  "Zakelijk mobiel/internet": "kosten", "Zakelijk overige abonnementen": "kosten", "Zakelijke uitgaven": "kosten",
};

// "Zakelijke inkoop" is samengevoegd met "Zakelijke uitgaven" — bestaande, eerder opgeslagen
// correcties/regels met de oude naam worden bij het laden automatisch omgezet.
export const LEGACY_CATEGORY_RENAMES = {
  "Zakelijke inkoop": "Zakelijke uitgaven",
  "Telecom & abonnementen": "Zakelijk mobiel/internet",
  "Energie": "Energie-water",
  "Prive - vrijetijd-uitgaan-vakantie": "Prive - vrijetijd-uitgaan-vakantie & uit eten",
  "Specials": "Overige gevoelige uitgaven",
  "Overig zakelijk: overig": "Zakelijke uitgaven",
  "Verzekering: Overig": "Verzekeringen",
  "Verzekering: Ziektekosten": "Verzekeringen",
  "Verzekering: Wonen": "Verzekeringen",
  "Overige gevoelige uitgaven": "Persoonlijk & vertrouwelijk",
  "Gokken": "Persoonlijk & vertrouwelijk",
  "Dating": "Persoonlijk & vertrouwelijk",
  "Adult content": "Persoonlijk & vertrouwelijk",
  "Drugs": "Persoonlijk & vertrouwelijk",
  "Uitgaan": "Prive - vrijetijd-uitgaan-vakantie & uit eten",
  "Prive mobiel/internet": "Prive - mobiel/internet",
  "Prive Vakantie - uitstapjes": "Prive - vrijetijd-uitgaan-vakantie & uit eten",
  "Vrije tijd - Uitgaan": "Prive - vrijetijd-uitgaan-vakantie & uit eten",
  "Prive - vakantie/uitstapjes": "Prive - vrijetijd-uitgaan-vakantie & uit eten",
  "Prive Hypotheek": "Hypotheek",
  "Lease": "Lease (operationeel)",
  "Belastingen: Naheffingen voorgaande jaren": "Belastingen: Naheffingen OB voorgaande jaren",
  "Loonadministratie": "Boekhouder, accountant & administratie",
  "Boekhouder & advies": "Boekhouder, accountant & administratie",
};

export function migrateLegacyCategoryName(name) {
  return LEGACY_CATEGORY_RENAMES[name] || name;
}

// CATEGORY_ORDER/CATEGORY_COLOR leven bewust buiten React-state: ze worden direct gelezen door
// meerdere componenten zonder prop-threading. Een nieuwe custom categorie wordt hier geregistreerd
// (in place gemuteerd) én tegelijk aan de `categoryRules`-state toegevoegd, waarvan de wijziging
// dan de re-render triggert die de bijgewerkte lijst oppikt.
// mainCategory is optioneel: alleen relevant bij een door de gebruiker zelf toegevoegde categorie
// waarbij Zakelijk/Privé is gekozen (zie CategoryRulesPanel). Zonder expliciete keuze — bijv. bij
// een oudere, al bestaande custom categorie uit een eerder opgeslagen project — blijft het oude
// gedrag intact: mainCategoryOf/fiscalTreatmentOf vallen dan terug op hun standaardwaarde.
export function registerCategory(name, color, mainCategory) {
  if (!CATEGORY_ORDER.includes(name)) {
    CATEGORY_ORDER.push(name);
    CATEGORY_ORDER.sort((a, b) => a.localeCompare(b));
  }
  if (!CATEGORY_COLOR[name]) {
    CATEGORY_COLOR[name] = color || NEW_CATEGORY_PALETTE[CATEGORY_ORDER.length % NEW_CATEGORY_PALETTE.length];
  }
  if (mainCategory) {
    SUBTYPE_TO_MAIN[name] = mainCategory;
    CATEGORY_FISCAL_TREATMENT[name] = mainCategory === "Privé" ? "geen" : "kosten";
  }
}

// Merget een opgeslagen categoryRules-array (uit storage of een projectbestand) met
// DEFAULT_RULES op naam, met behoud van custom categorieën die niet in DEFAULT_RULES zitten.
export function mergeCategoryRules(savedRules) {
  const rawSaved = Array.isArray(savedRules) ? savedRules : [];
  const saved = rawSaved.map((r) => ({ ...r, name: migrateLegacyCategoryName(r.name) }));
  const merged = DEFAULT_RULES.map((defRule) => {
    // Meerdere oudere namen kunnen na hernoemen op dezelfde nieuwe naam uitkomen (bijv. een
    // eerder losse "Loonadministratie" en "Boekhouder & advies" zijn nu allebei "Boekhouder,
    // accountant & administratie") — dan combineren we hun keywords, in plaats van dat de een de
    // ander overschrijft.
    const matches = saved.filter((r) => r.name === defRule.name);
    if (matches.length === 0) return defRule;
    // Samenvoegen met de HUIDIGE standaardlijst (niet vervangen): een opgeslagen project bevat
    // een momentopname van de zoekwoorden op het moment van opslaan. Zouden we die snapshot
    // domweg laten winnen, dan verdwijnen nieuwe standaard-zoekwoorden die nadien zijn toegevoegd
    // zodra een ouder project weer wordt geladen — precies het "Winkels divers is leeg"-effect.
    // Eigen, zelf toegevoegde zoekwoorden blijven zo ook behouden.
    const savedKeywords = matches.flatMap((m) => m.keywords || []);
    const combinedKeywords = [...new Set([...defRule.keywords, ...savedKeywords])];
    return { ...defRule, keywords: combinedKeywords };
  });
  const custom = saved.filter((r) => !DEFAULT_RULES.some((d) => d.name === r.name) && !(r.name in LEGACY_CATEGORY_RENAMES));
  for (const c of custom) registerCategory(c.name, c.color, c.mainCategory);
  return [...merged, ...custom];
}

export function migrateOverridesMap(map, counterpartyKeyFn) {
  const next = {};
  for (const [key, val] of Object.entries(map || {})) {
    const migratedVal = val && val.category ? { ...val, category: migrateLegacyCategoryName(val.category) } : val;
    // IBAN-sleutels blijven ongewijzigd — die zijn al stabiel en mogen nooit worden vervangen
    // door een op naam herberekende sleutel (dat zou precies het voordeel van IBAN tenietdoen).
    if (key.startsWith("IBAN::")) {
      next[key] = migratedVal;
      continue;
    }
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

// ---- Hoofdcategorieën — een overzichtelijke laag bovenop de fijnmazige subtypes hierboven ----
//
// Alle BTW-percentages, vaste/variabele-indeling, keyword-herkenning en fiscale speciale gevallen
// (zakelijke inkomsten, spiegelboekingen, "Overig"-review, personen-overboekingen) blijven
// werken op het fijnmazige subtype hierboven (het bestaande `category`-veld op een transactie) —
// daar verandert niets aan. Deze hoofdcategorie is puur een weergavelaag erbovenop: voor de
// categorie-overzichten en de dropdown in de detailtabel ziet de gebruiker maar ~17 categorieën,
// met de subtype-precisie er direct naast beschikbaar (net als "Categorie: Vervoer & auto,
// Subtype: Brandstof").
export const MAIN_CATEGORY_ORDER = [
  "Zakelijke inkomsten", "Huisvesting", "Vervoer & auto", "Inkoop & zakelijke uitgaven",
  "Apparatuur & inventaris", "Personeel", "Telecom & abonnementen",
  "Boekhouding & advies",
  "Financiering", "Belastingen & heffingen", "Privé", "Persoonlijk & vertrouwelijk", "Nog te beoordelen",
];

export const MAIN_CATEGORY_COLOR = {
  "Zakelijke inkomsten": "bg-emerald-100 text-emerald-800",
  "Huisvesting": "bg-amber-100 text-amber-800",
  "Vervoer & auto": "bg-orange-100 text-orange-800",
  "Inkoop & zakelijke uitgaven": "bg-sky-200 text-sky-900",
  "Apparatuur & inventaris": "bg-orange-50 text-orange-700",
  "Personeel": "bg-indigo-200 text-indigo-900",
  "Telecom & abonnementen": "bg-indigo-100 text-indigo-800",
  "Boekhouding & advies": "bg-purple-100 text-purple-800",
  "Financiering": "bg-teal-200 text-teal-900",
  "Belastingen & heffingen": "bg-fuchsia-200 text-fuchsia-900",
  "Privé": "bg-stone-200 text-stone-700",
  "Persoonlijk & vertrouwelijk": "bg-slate-700 text-slate-100",
  "Nog te beoordelen": "bg-slate-200 text-slate-700",
};

// Elk (fijnmazig) subtype hoort bij precies één hoofdcategorie. Structurele subtypes die de tool
// zelf herkent op naam (zakelijke inkomsten, spiegelboekingen zoals "Prive opnames"/"Uitbetaling
// aan prive"/"Terugboeking van prive", "Overboekingen aan personen", "Overig") blijven onder de
// motorkap gewoon dat subtype — alleen hun WEERGAVE valt hier onder een bredere hoofdcategorie.
export const SUBTYPE_TO_MAIN = {
  "Autokosten": "Vervoer & auto",
  "Bankkosten": "Inkoop & zakelijke uitgaven",
  "Belastingen: IB": "Belastingen & heffingen",
  "Belastingen: IH": "Belastingen & heffingen",
  "Belastingen: LH": "Belastingen & heffingen",
  "Belastingen: MRB": "Belastingen & heffingen",
  "Belastingen: OB": "Belastingen & heffingen",
  "Belastingen: ZVW": "Belastingen & heffingen",
  "Belastingen: overig": "Belastingen & heffingen",
  "Belastingen: Naheffingen OB voorgaande jaren": "Belastingen & heffingen",
  "Belastingen: Naheffingen LH voorgaande jaren": "Belastingen & heffingen",
  "Belastingen: Naheffingen IB voorgaande jaren": "Belastingen & heffingen",
  "Boekhouder, accountant & administratie": "Boekhouding & advies",
  "Boodschappen": "Privé",
  "Brandstof": "Vervoer & auto",
  "Energie-water": "Huisvesting",
  "Gemeentelijke kosten": "Huisvesting",
  "Huur": "Huisvesting",
  "Hypotheek": "Privé",
  "Incasso, juridisch & schulden": "Privé",
  "Inhuur personeel": "Personeel",
  "Personeel: overig": "Personeel",
  "Inkomsten": "Privé",
  "Inkomsten/betalingen niet dit jaar": "Zakelijke inkomsten",
  "Kinderopvang": "Privé",
  "Lease (operationeel)": "Vervoer & auto",
  "Lease (financieel)": "Financiering",
  "Leningen": "Financiering",
  "Marketing-website": "Inkoop & zakelijke uitgaven",
  "Overboekingen aan personen": "Privé",
  "Overig": "Nog te beoordelen",
  "Onderhoud apparatuur/machines": "Apparatuur & inventaris",
  "Parkeren": "Vervoer & auto",
  "Betaalautomaat kosten": "Inkoop & zakelijke uitgaven",
  "Prive - mobiel/internet": "Privé",
  "Prive opnames": "Privé",
  "Prive overige abonnementen": "Privé",
  "Terugboeking van prive": "Privé",
  "Reiskosten (OV)": "Vervoer & auto",
  "Persoonlijk & vertrouwelijk": "Persoonlijk & vertrouwelijk",
  "Toeslagen": "Privé",
  "Uitbetalen loon": "Personeel",
  "Uitbetaling aan prive": "Privé",
  "Prive - vrijetijd-uitgaan-vakantie & uit eten": "Privé",
  "Prive: overig": "Privé",
  "Partneralimentatie": "Privé",
  "Kinderalimentatie": "Privé",
  "Verkoop activa": "Zakelijke inkomsten",
  "Verzekering: Auto": "Vervoer & auto",
  "Verzekering: Zakelijk": "Inkoop & zakelijke uitgaven",
  "AOV (arbeidsongeschiktheidsverzekering)": "Inkoop & zakelijke uitgaven",
  "Verzekeringen": "Privé",
  "Winkels divers": "Privé",
  "Webshops & online aankopen": "Privé",
  "Zakelijk - apparatuur/machines": "Apparatuur & inventaris",
  "Zakelijk mobiel/internet": "Telecom & abonnementen",
  "Zakelijk overige abonnementen": "Telecom & abonnementen",
  "Zakelijke inkomsten": "Zakelijke inkomsten",
  "Zakelijke inkomsten 9%": "Zakelijke inkomsten",
  "Zakelijke inkomsten 21%": "Zakelijke inkomsten",
  "Zakelijke uitgaven": "Inkoop & zakelijke uitgaven",
};

// Als iemand in de detailtabel of bij "Zakelijke tegenpartijen/uitgaven" een hoofdcategorie kiest
// (in plaats van een specifiek subtype), moet er toch een concreet subtype worden opgeslagen —
// dat blijft namelijk het veld waarop BTW-percentage, vast/variabel en voorbelasting draaien. Dit
// is de meest voor de hand liggende, generieke vertegenwoordiger per hoofdcategorie; direct
// ernaast staat een subtype-dropdown om het gelijk preciezer te zetten als dat nodig is.
export const MAIN_CATEGORY_DEFAULT_SUBTYPE = {
  "Zakelijke inkomsten": "Zakelijke inkomsten",
  "Huisvesting": "Huur",
  "Vervoer & auto": "Autokosten",
  "Inkoop & zakelijke uitgaven": "Zakelijke uitgaven",
  "Apparatuur & inventaris": "Zakelijk - apparatuur/machines",
  "Personeel": "Personeel: overig",
  "Telecom & abonnementen": "Zakelijk overige abonnementen",
  "Boekhouding & advies": "Boekhouder, accountant & administratie",
  "Financiering": "Leningen",
  "Belastingen & heffingen": "Belastingen: overig",
  "Privé": "Prive: overig",
  "Persoonlijk & vertrouwelijk": "Persoonlijk & vertrouwelijk",
  "Nog te beoordelen": "Overig",
};

// Hoofdcategorie voor een subtype — onbekende/custom subtypes (bijv. een zelf toegevoegde
// categorie) vallen terug op "Inkoop & zakelijke uitgaven" zodat ze nooit onzichtbaar worden.
export function mainCategoryOf(subtype) {
  return SUBTYPE_TO_MAIN[subtype] || "Inkoop & zakelijke uitgaven";
}

// Zelfde soort veilige toegang als mainCategoryOf hierboven — een categorie zonder expliciete
// vermelding (bijv. een oudere, zelf toegevoegde categorie van vóór deze keuze bestond) valt terug
// op "kosten", exact het gedrag dat hij al had (mainCategoryOf valt ook terug op een zakelijke
// hoofdcategorie).
export function fiscalTreatmentOf(subtype) {
  return CATEGORY_FISCAL_TREATMENT[subtype] || "kosten";
}

// Alle subtypes die onder één hoofdcategorie vallen — voor de subtype-dropdown naast de
// hoofdcategorie-dropdown, en voor het groeperen van BTW-percentages/vaste-kosten-instellingen.
export function subtypesForMainCategory(mainCategory) {
  return CATEGORY_ORDER.filter((c) => mainCategoryOf(c) === mainCategory);
}
