// beide-V1R6 (fase 3) — de privécategorieën als gegevens. Geen logica: herkenning.js en weergave.js lezen
// deze lijsten. Bestaande namen (Boodschappen, Hypotheek, Privé - huur, …) blijven de opgeslagen waarde,
// zodat bestaande regels, kleuren en dossiers gewoon blijven werken; alleen het label is privévriendelijk.
//   soort:   "inkomen" | "uitgave" | "overboeking" (inkomen en overboeking zijn geen vaste/variabele last)
//   fiscaal: vlag voor de privéberekening (fase 5): hypotheekrente, zorgkosten, giften, lijfrente,
//            partneralimentatie. Alleen een aanwijzing: de berekening bepaalt zelf wat aftrekbaar is.
//   vast:    standaard een vaste last (Instellingen → Vaste/variabele kosten)
//   terugbetaling: geld dat terugkomt (Tikkie, retour, eindafrekening). Geen inkomen: het verlaagt de uitgaven
//            (beide-V2R2, budget.js), ook in de hoofdcategorie Overig.

export const PRIVE_HOOFDEN = Object.freeze([
  { naam: "Inkomen", kleur: "bg-emerald-100 text-emerald-800" },
  { naam: "Wonen", kleur: "bg-amber-100 text-amber-800" },
  { naam: "Verzekeringen", kleur: "bg-teal-100 text-teal-800" },
  { naam: "Zorg", kleur: "bg-red-100 text-red-800" },
  { naam: "Boodschappen", kleur: "bg-lime-100 text-lime-800" },
  { naam: "Vervoer", kleur: "bg-orange-100 text-orange-800" },
  { naam: "Kinderen", kleur: "bg-rose-100 text-rose-800" },
  { naam: "Abonnementen", kleur: "bg-violet-100 text-violet-800" },
  { naam: "Vrije tijd", kleur: "bg-sky-100 text-sky-800" },
  { naam: "Giften", kleur: "bg-pink-100 text-pink-800" },
  { naam: "Sparen en beleggen", kleur: "bg-cyan-100 text-cyan-800" },
  { naam: "Aflossingen", kleur: "bg-orange-200 text-orange-900" },
  { naam: "Belastingen", kleur: "bg-fuchsia-100 text-fuchsia-800" },
  { naam: "Overig", kleur: "bg-slate-100 text-slate-700" },
]);

// Hoofdcategorie voor een zelf toegevoegde of onbekende categorie.
export const PRIVE_STANDAARD_HOOFD = "Overig";

const c = (naam, hoofd, extra = {}) => Object.freeze({ naam, hoofd, label: naam, soort: "uitgave", ...extra });

// Volgorde binnen een hoofdcategorie = volgorde hier; de eerste is de standaardsoort van die hoofdcategorie.
export const PRIVE_CATEGORIEEN = Object.freeze([
  c("Loon", "Inkomen", { soort: "inkomen", label: "Loon of salaris", nieuw: true, kleur: "bg-emerald-100 text-emerald-800" }),
  c("Uitkering", "Inkomen", { soort: "inkomen", nieuw: true, kleur: "bg-emerald-50 text-emerald-700" }),
  c("Pensioen & AOW", "Inkomen", { soort: "inkomen", nieuw: true, kleur: "bg-emerald-50 text-emerald-700" }),
  c("Toeslagen", "Inkomen", { soort: "inkomen" }),
  c("Kinderbijslag", "Inkomen", { soort: "inkomen", nieuw: true, kleur: "bg-emerald-50 text-emerald-700" }),
  // beide-V3R3 — wens Boska 23-10. Geen box 1-inkomen: telt mee in het budget, niet in de IB-indicatie.
  c("Dividend & rente", "Inkomen", { soort: "inkomen", label: "Ontvangen dividend & rente", nieuw: true, kleur: "bg-emerald-50 text-emerald-700" }),
  c("Ontvangen schenkingen", "Inkomen", { soort: "inkomen", nieuw: true, kleur: "bg-emerald-50 text-emerald-700" }),
  c("Inkomsten", "Inkomen", { soort: "inkomen", label: "Overige inkomsten" }),

  c("Privé - huur", "Wonen", { label: "Huur", vast: true }),
  c("Hypotheek", "Wonen", { fiscaal: "hypotheekrente", vast: true }),
  c("Privé - energie-water", "Wonen", { label: "Energie & water", vast: true }),
  c("Privé - gemeentelijke kosten", "Wonen", { label: "Gemeentelijke belastingen", vast: true }),
  c("Wonen: onderhoud & inrichting", "Wonen", { label: "Onderhoud & inrichting", nieuw: true, kleur: "bg-amber-50 text-amber-700" }),

  c("Verzekeringen", "Verzekeringen", { vast: true }),

  c("Zorgverzekering", "Zorg", { nieuw: true, vast: true, kleur: "bg-red-50 text-red-700" }),
  c("Medische uitgaven", "Zorg", { label: "Zorgkosten (eigen betalingen)", fiscaal: "zorgkosten" }),

  c("Boodschappen", "Boodschappen"),

  c("Auto & brandstof", "Vervoer", { nieuw: true, kleur: "bg-orange-100 text-orange-800" }),
  // beide-V3R0 — ook privé kun je een auto, motor of fiets leasen (private lease): een vaste last.
  c("Private lease", "Vervoer", { label: "Lease (auto, motor, fiets)", nieuw: true, vast: true, kleur: "bg-orange-50 text-orange-700" }),
  c("Openbaar vervoer", "Vervoer", { nieuw: true, kleur: "bg-cyan-100 text-cyan-800" }),

  c("Kinderopvang", "Kinderen", { vast: true }),
  c("Kinderen: school & sport", "Kinderen", { label: "School, clubs & sport kinderen", nieuw: true, kleur: "bg-rose-50 text-rose-700" }),
  c("Kinderalimentatie", "Kinderen", { vast: true }),

  c("Privé - mobiel", "Abonnementen", { label: "Mobiel", vast: true }),
  c("Privé - internet/TV", "Abonnementen", { label: "Internet & tv", vast: true }),
  c("Privé overige abonnementen", "Abonnementen", { label: "Streaming & overige abonnementen", vast: true }),

  c("Privé - vrijetijd-uitgaan-vakantie & uit eten", "Vrije tijd", { label: "Uitgaan, vakantie & uit eten" }),
  c("Sport & hobby", "Vrije tijd", { nieuw: true, kleur: "bg-sky-50 text-sky-700" }),

  c("Giften", "Giften", { label: "Giften & donaties", fiscaal: "giften", nieuw: true, kleur: "bg-pink-100 text-pink-800" }),

  c("Interne overboeking: privé sparen", "Sparen en beleggen", { soort: "overboeking", label: "Sparen" }),
  c("Beleggen", "Sparen en beleggen", { soort: "overboeking", nieuw: true, kleur: "bg-cyan-50 text-cyan-700" }),
  c("Lijfrente", "Sparen en beleggen", { label: "Lijfrente & pensioensparen", fiscaal: "lijfrente", vast: true, nieuw: true, kleur: "bg-cyan-100 text-cyan-800" }),
  c("Interne overboeking", "Sparen en beleggen", { soort: "overboeking", label: "Overboeking eigen rekening" }),

  c("Leningen (privé)", "Aflossingen", { label: "Leningen & studieschuld", vast: true }),
  c("Incasso, juridisch & schulden", "Aflossingen", { label: "Schulden, incasso & juridisch" }),

  c("Belastingen: IB", "Belastingen", { label: "Inkomstenbelasting" }),
  c("Belastingen: Naheffingen IB voorgaande jaren", "Belastingen", { label: "Inkomstenbelasting eerdere jaren" }),
  c("Belastingen: ZVW", "Belastingen", { label: "Bijdrage Zvw" }),
  c("Belastingen: overig", "Belastingen", { label: "Belastingdienst overig" }),

  c("Privé: overig", "Overig", { label: "Overige privé-uitgaven" }),
  c("Winkels divers", "Overig", { label: "Winkels" }),
  c("Webshops & online aankopen", "Overig", { label: "Webshops" }),
  c("Contant geld", "Overig", { label: "Contant opgenomen", nieuw: true, kleur: "bg-amber-100 text-amber-800" }),
  c("Overboekingen aan personen", "Overig", { label: "Betaald aan personen" }),
  // beide-V2R2 — terugbetalingen zijn geen inkomen (wens Boska): gedeelde kosten, retour, te veel betaald.
  c("Overboeking van bekenden", "Overig", { label: "Terugbetaald door bekenden", terugbetaling: true }),
  c("Terugbetalingen & restituties", "Overig", { label: "Terugbetaald door bedrijven en winkels", terugbetaling: true, nieuw: true, kleur: "bg-slate-100 text-slate-700" }),
  c("Privé - bankkosten", "Overig", { label: "Bankkosten", vast: true }),
  c("Partneralimentatie", "Overig", { fiscaal: "partneralimentatie", vast: true }),
  c("Privé - overige kosten", "Overig", { label: "Overige kosten (controleren)" }),
  c("Persoonlijk & vertrouwelijk", "Overig"),
  c("Inkomsten/betalingen niet dit jaar", "Overig", { soort: "overboeking", label: "Buiten de gekozen jaren" }),
  c("Overig", "Overig", { label: "Nog te beoordelen" }),
]);

// Zoekwoorden voor de NIEUWE privécategorieën. Ze komen vóór de standaardregels in de categorieregels van
// een privédossier, en zijn daar net als de andere te bewerken. `leen` neemt de zoekwoorden van een bestaande
// standaardregel over (bijv. de OV-bedrijven), zodat die lijst op één plek bijgehouden blijft.
// `alleenInkomen`: alleen voor bijschrijvingen ("salaris" op een afschrijving is géén loon).
export const PRIVE_REGELS = Object.freeze([
  { naam: "Kinderbijslag", alleenInkomen: true, woorden: ["kinderbijslag"] },
  { naam: "Pensioen & AOW", alleenInkomen: true, woorden: [
    " aow", "aow-uitkering", "aow uitkering", "ouderdomspensioen", "pensioenuitkering", "pensioenfonds", " abp", "pfzw",
    "pensioenfonds zorg", " pmt ", " pme ", "bpfbouw", "bpf bouw", "pensioenfonds metaal", " anw ", "nabestaandenpensioen",
    "pensioen", " pensio ", "pensioenen", "pensioen uitvoering", "svb ",
  ] },
  { naam: "Loon", alleenInkomen: true, woorden: [
    "salaris", "nettoloon", "netto loon", " loon ", "loonbetaling", "loonstrook", "vakantiegeld", "eindejaarsuitkering",
    "dertiende maand", "13e maand",
  ] },
  { naam: "Uitkering", alleenInkomen: true, woorden: [
    " uwv", "ww-uitkering", "ww uitkering", "wia-uitkering", "wia uitkering", " wga ", "wajong", "ziektewet",
    " bijstand", "participatiewet", "ioaw", "uitkering",
  ] },
  { naam: "Zorgverzekering", woorden: [
    "zorgverzekering", "zorgverzekeraar", "zilveren kruis", "cz groep", "menzis", "zorg en zekerheid", "anderzorg", "ditzo",
    "dsw zorg", "ohra zorg", "fbto zorg", "interpolis zorg", "univé zorg", "unive zorg", "vgz", "de friesland zorg",
    "salland zorg", "stad holland zorg", "zekur", "ik kies zelf", "eigen risico",
    " cz ", "cz zorg", " dsw", "onvz", "ikz zorg", "asr zorg", "a.s.r. zorg", "asr ziektekosten", " izz", "aevitae", "eno zorg",
    "zorgpremie", "ziektekostenverzekering", "hema zorg", "jaaah", "pnoozorg", "caresq", "zorgdirect", "vvaa zorg", "nationale-nederlanden zorg",
  ] },
  { naam: "Private lease", woorden: [
    "private lease", "privatelease", "private-lease", "autolease", "auto lease", "fietslease", "fiets lease", "e-bike lease",
    "lease a bike", "leaseabike", "swapfiets", "motorlease", "motor lease", "scooterlease", "scooter lease", "lease fiets",
    "justlease", "directlease", "anwb private lease", "mobilease", "terberg", "athlon private", "ayvens", "leaseplan",
  ], leen: ["Lease (operationeel)"] },
  { naam: "Auto & brandstof", woorden: [], leen: ["Brandstof", "Autokosten", "Parkeren"] },
  { naam: "Openbaar vervoer", woorden: [
    " ns ", " ns-", "ns reizigers", "ns international", "nsinternational", "ns flex", "ov-chipkaart", "ov chipkaart",
    "ovchipkaart", "ov-chip", "ov-fiets", "ovfiets", "db bahn",
  ], leen: ["Reiskosten (OV)"] },
  { naam: "Wonen: onderhoud & inrichting", woorden: [
    "ikea", "kwantum", "leen bakker", "jysk", "loods 5", "beter bed", "swiss sense", "eijerkamp", "keukenkampioen",
    "woonboulevard", "gordijnen", "vloerenland", "carpetright", "leenbakker", "gamma", "karwei", "praxis", "hornbach",
    "hubo", "bouwmaterialen", "bouwmarkt",
    "kachel", "haard", "schoorsteenveger", "tuinmachines", "tuincentrum", "intratuin", "hovenier", // beide-V5R1
  ] },
  { naam: "Kinderen: school & sport", woorden: [
    "ouderbijdrage", "schoolgeld", "schoolreis", "zwemles", "zwemdiploma", "scouting", "kinderfeest",
  ] },
  { naam: "Sport & hobby", woorden: [
    "basic-fit", "basic fit", "sportschool", "fitness", "anytime fitness", "sportcity", "trainmore", "decathlon",
    "intersport", "contributie", "knvb", "knltb", "golfclub", "tennisclub", "voetbalvereniging", "muziekschool",
    // beide-V5R1 — uit de controle van het dossier van Boska (25-10)
    "yoga", "pilates", "bridge bond", "bridgeclub", "bridgevereniging", "ivn", "volksuniversiteit", "cursus", "schilderlokaal",
    "atelier", "museumkaart", "natuurmonumenten lid",
  ] },
  { naam: "Giften", woorden: [
    " gift ", "periodieke gift", "donatie", " anbi", "kwf", "rode kruis", "unicef", "artsen zonder grenzen", "greenpeace",
    "natuurmonumenten", "wereld natuur fonds", "wnf", "amnesty", "hartstichting", "nierstichting", "longfonds",
    "diabetes fonds", "alzheimer nederland", "leger des heils", "kerkbalans", "kerkelijke bijdrage", "parochie",
    "protestantse gemeente", "oxfam", "cordaid", "war child", "dierenbescherming", "kika", "voedselbank",
  ] },
  { naam: "Beleggen", woorden: [
    "degiro", "flatexdegiro", "saxo bank", "meesman", "trade republic", "etoro", "bitvavo", "beleggingsrekening",
    "beleggen", "brand new day beleggen", "peaks", "lynx b.v.", "bux zero", "scalable capital", "scalable",
    "interactive brokers", "binck", "freedom24", "bux b.v.", "coinbase", "kraken", "bitpanda",
  ] },
  { naam: "Lijfrente", woorden: ["lijfrente", "banksparen", "pensioensparen", "pensioenbeleggen", "oudedagsvoorziening"] },
  { naam: "Contant geld", woorden: [], leen: ["Privé opnames"] },
  // beide-V2R2 — geld dat terugkomt van een bedrijf of winkel (alleen bijschrijvingen): geen inkomen.
  { naam: "Terugbetalingen & restituties", alleenInkomen: true, woorden: [
    "terugbetaling", "restitutie", "retour", "refund", "storno", "terugstorting", "creditnota", "credit nota", "eindafrekening",
    "jaarafrekening", "teveel betaald", "te veel betaald", "terugboeking", "retourbetaling", "teruggave", "vergoeding schade",
  ] },
]);

// beide-V2R2 — extra zoekwoorden voor bestaande standaardregels, alleen in een privédossier (een zakelijk dossier
// ziet ze nooit). Bekende Nederlandse leveranciers die de standaardlijst nog miste.
export const PRIVE_EXTRA_WOORDEN = Object.freeze({
  "Energie-water": [
    "frank energie", "tibber", "nextenergy", "next energy", "energyzero", "vrijopnaam", "het energiebedrijf", "zonneplan", "mega energie", "budget thuis", "nederlandse energie maatschappij", " nle ",
    "innova energie", "coolblue energie", "energiek", "hezelaer", "ennatuurlijk", "warmtelevering", "stadsverwarming",
    "brabant water", " pwn", "oasen", " wmd", "waterleiding", "drinkwater",
  ],
  "Gemeentelijke kosten": [
    "bsgw", "gemeentebelasting", "gemeentelijke belasting", "waterschapsbelasting", "afvalstoffenheffing", "rioolheffing",
    " ozb", "hoogheemraadschap", "cocensus", "gbt ", "gbhu", "abg ", "noordenveld belasting",
  ],
  "Zakelijk mobiel": ["ben nederland", "lyca", "kpn mobiel", "tele2 mobiel", "odido mobiel"],
  "Zakelijk internet/TV": ["freedom internet", "jonaz", "tweak", "canaldigitaal", "canal digitaal", "m7 group", "glasvezel", "fiber nederland"],
  "Privé overige abonnementen": [
    "disney", "nlziet", "max.com", "apple.com/bill", "google play", "playstation", "xbox", "nintendo", "audible",
    "kobo", "bookbeat", "patreon", "ad abonnement", "dpg media", "mediahuis", "persgroep", "volkskrant", "trouw abonnement",
    "nrc media", "het parool", "telegraaf", "eindhovens dagblad", "brabants dagblad", "de limburger", "tijdschrift",
  ],
  "Medische uitgaven": [
    "infomedics", "fysio", "fysiotherapie", "fysiotherapeut", "tandarts", "mondzorg", "orthodontist", "huisarts", "apotheek",
    "ziekenhuis", "opticien", "optiek", "pearle", "hans anders", "specsavers", "audicien", "schoonenberg", "beter horen",
    "podotherapeut", "psycholoog", "logopedie", "dermatoloog", "ggz",
  ],
  Verzekeringen: [
    "enra", "enra verzekeringen", "centraal beheer", "interpolis", "nationale-nederlanden", "nationale nederlanden",
    " asr ", "a.s.r.", "ohra", "fbto", "univé", "unive", "allianz", "aegon", "inshared", "promovendum", "ditzo", "klaverblad",
    "london verzekeringen", "nh1816", "de goudse", "reaal", "anwb verzekering", "ing verzekeren", "rabobank verzekeringen",
  ],
  "Webshops & online aankopen": ["marktplaats", "vinted", "etsy", "aliexpress", "temu", "shein", "lidl shop", "action.com"],
  "Privé - vrijetijd-uitgaan-vakantie & uit eten": [
    "hostellerie", "hotel", "herberg", "restaurant", "brasserie", "bistro", "eetcafe", "eetcafé", "pizzeria", "lunchroom",
    "paviljoen", "airbnb", "natuurhuisje", "booking.com", "landal", "center parcs", "roompot", "camping", "vakantiepark",
    "bungalowpark", "museum", "theater", "schouwburg", "bioscoop", "kinepolis", "vue cinema", "efteling", "dierentuin",
    "pretpark", "horeca", "wijnbar", "taverne", "trattoria", "steakhouse", "sushi", "grand cafe", "grandcafe", "strandpaviljoen",
    "transavia", "klm", "ryanair", "easyjet", "corendon", "tui ", "sunweb",
  ],
  Huur: ["vestia", "de key", "woonpunt", "woonservice", "woonfriesland", "accolade", "dudok wonen", "woongoed", "wonen limburg"],
  Boodschappen: [
    "plus supermarkt", "hellofresh", "marley spoon", "bakkerij", "warme bakker", "slagerij", "keurslager", "groenteboer",
    "kaashandel", "visspecialist", "natuurwinkel", "toko ",
  ],
});

// beide-V2R2 — in een privédossier gaan deze standaardregels vóór de rest: "Disney Plus" is een abonnement, ook al
// staat "plus" (de supermarkt) bij Boodschappen.
export const PRIVE_VOORRANG = Object.freeze(["Privé overige abonnementen"]);

// Extra woorden voor bestaande categorieën, alleen bij het herkennen van bijschrijvingen in een privédossier.
export const PRIVE_INKOMEN_EXTRA = Object.freeze({
  Toeslagen: ["kindgebonden budget", "kinderopvangtoeslag", "zorgtoeslag", "huurtoeslag", "dienst toeslagen"],
  "Dividend & rente": ["dividend", "creditrente", "rentebijschrijving", "rente bijschrijving", "renteuitkering", "rente-uitkering",
    "rentevergoeding", "renteopbrengst", "uitbetaling rente", "interest", "couponrente"],
  "Ontvangen schenkingen": ["schenking", "geschonken", "jaarlijkse gift"],
  "Belastingen: IB": ["voorlopige aanslag", "voorlopige teruggaaf", "teruggaaf", "aanslag ib", "inkomstenbelasting"],
});

// Volgorde waarin een bijschrijving wordt herkend (eerste treffer wint). Toeslagen vóór de rest: een
// toeslag komt van de Belastingdienst; kinderbijslag vóór pensioen (allebei vaak via de SVB); loon vóór
// uitkering ("eindejaarsuitkering" is loon).
export const PRIVE_INKOMEN_VOLGORDE = Object.freeze([
  "Toeslagen", "Kinderbijslag", "Pensioen & AOW", "Loon", "Uitkering", "Belastingen: IB", "Dividend & rente", "Ontvangen schenkingen",
]);

// Een automatische uitkomst die alleen in een zakelijk dossier hoort, wordt in een privédossier deze
// privécategorie. Wat hier niet staat en ook geen privécategorie is: zie herkenning.js (vangnet).
export const ZAKELIJK_NAAR_PRIVE = Object.freeze({
  "Zakelijke inkomsten": "Inkomsten", "Zakelijke inkomsten 0%": "Inkomsten", "Zakelijke inkomsten 9%": "Inkomsten",
  "Zakelijke inkomsten 21%": "Inkomsten", "Verkoop activa": "Inkomsten",
  "Ontvangen van zakelijk": "Interne overboeking", "Terugboeking naar zakelijk": "Interne overboeking",
  "Terugboeking van privé": "Interne overboeking", "Interne overboeking: zakelijk sparen": "Interne overboeking: privé sparen",
  "Privé opnames": "Contant geld",
  "Autokosten": "Auto & brandstof", "Brandstof": "Auto & brandstof", "Parkeren": "Auto & brandstof",
  "Lease (operationeel)": "Private lease", "Lease (financieel)": "Private lease", "Belastingen: MRB": "Auto & brandstof",
  "Reiskosten (OV)": "Openbaar vervoer", "Privé - openbaar vervoer": "Openbaar vervoer",
  "Verzekering: Auto": "Verzekeringen", "Verzekering: Zakelijk": "Verzekeringen", "AOV (arbeidsongeschiktheidsverzekering)": "Verzekeringen",
  "Huur": "Privé - huur", "Energie-water": "Privé - energie-water", "Gemeentelijke kosten": "Privé - gemeentelijke kosten",
  "Huur (deels zakelijk)": "Privé - huur", "Energie-water (deels zakelijk)": "Privé - energie-water",
  "Gemeentelijke kosten (deels zakelijk)": "Privé - gemeentelijke kosten",
  "Zakelijk mobiel": "Privé - mobiel", "Zakelijk internet/TV": "Privé - internet/TV", "Bankkosten": "Privé - bankkosten", "Leningen": "Leningen (privé)",
  "Zakelijk overige abonnementen": "Privé overige abonnementen", "Streaming diensten": "Privé overige abonnementen",
  "Privé - streaming diensten": "Privé overige abonnementen", "Software & Online diensten": "Privé overige abonnementen",
  "Zakelijke inkoop/uitgaven": "Privé: overig",
  "Belastingen: OB": "Belastingen: overig", "Belastingen: LH": "Belastingen: overig", "Belastingen: IH": "Belastingen: overig",
  "Belastingen: Naheffingen OB voorgaande jaren": "Belastingen: overig", "Belastingen: Naheffingen LH voorgaande jaren": "Belastingen: overig",
});
