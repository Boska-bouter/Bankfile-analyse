// huishoudboekje-V1R0 — zoekwoorden voor de fijnere indeling van het Huishoudboekje (wens Boska 2-11): energie en
// water apart, uit eten, vakantie en dagjes uit, bioscoop/theater/concerten, kleding en schoenen, drogist en huishouden.
// Ze staan vóór de privéregels (prive: true, huishoud: true), zodat bijvoorbeeld een restaurant "Uit eten & afhalen"
// wordt in plaats van het bredere "Uitgaan, vakantie & uit eten". In een privé- of zakelijk dossier gaan ze er weer uit.
import { CATEGORY_COLOR } from "../../classification/categories.js";
import { metPriveRegels, PRIVE_VASTE_LASTEN, metPriveVasteLasten } from "../prive/regels.js";

export const HUISHOUD_REGELS_DATA = Object.freeze([
  { naam: "Privé - water", woorden: [
    "vitens", "evides", "brabant water", "dunea", " pwn", "oasen", " wml", "waternet", " wmd", "waterbedrijf",
    "waterleiding", "drinkwater", "waterlevering",
  ] },
  { naam: "Privé - energie", woorden: [
    "vattenfall", "eneco", "essent", "greenchoice", "budget energie", "energiedirect", "oxxio", "vandebron", "pure energie",
    "engie", "delta energie", "united consumers", "frank energie", "tibber", "nextenergy", "next energy", "energyzero",
    "vrijopnaam", "zonneplan", "mega energie", "coolblue energie", "innova energie", "energiek", "hezelaer", "ennatuurlijk",
    "warmtelevering", "stadsverwarming", "nederlandse energie maatschappij", "het energiebedrijf", "budget thuis",
    "energierekening", "termijnbedrag energie",
  ] },
  { naam: "Uit eten & afhalen", woorden: [
    "thuisbezorgd", "takeaway", "uber eats", "ubereats", "deliveroo", "just eat", "restaurant", "brasserie", "bistro",
    "eetcafe", "eetcafé", "pizzeria", "lunchroom", "trattoria", "steakhouse", "sushi", "grand cafe", "grandcafe",
    "mcdonald", "burger king", " kfc", "domino's", "dominos", "new york pizza", "febo", "starbucks", "cafetaria",
    "snackbar", "friture", "frituur", "wokrestaurant", "horeca", "wijnbar", "taverne", "strandpaviljoen", "lunchcafe",
    "koffiebar", "ijssalon", "poké", "poke bowl", "la place", "happy italy", "vapiano", "loetje", "van der valk restaurant",
  ] },
  { naam: "Cultuur & concerten", woorden: [
    "pathé", "pathe", "vue cinema", "kinepolis", "bioscoop", "filmhuis", "filmtheater", "theater", "schouwburg",
    "concertgebouw", "ziggo dome", "afas live", "ticketmaster", "eventim", "ticketswap", "see tickets", "paylogic",
    "poppodium", "paradiso", "melkweg", "tivolivredenburg", "stadsschouwburg", "musical", "stage entertainment", "cinema",
  ] },
  { naam: "Vakantie & dagjes uit", woorden: [
    "booking.com", "airbnb", "natuurhuisje", "landal", "center parcs", "roompot", "camping", "vakantiepark",
    "bungalowpark", "hotel", "transavia", " klm", "ryanair", "easyjet", "corendon", "tui ", "sunweb", "expedia", "vrbo",
    "efteling", "dierentuin", "pretpark", "walibi", "artis", "blijdorp", "burgers zoo", "duinrell", "attractiepark",
    "museum", "rijksmuseum", "van gogh museum", "beekse bergen", "toverland", "slagharen", "skipas", "wintersport",
    "vakantie", "hostel",
  ] },
  { naam: "Kleding & schoenen", woorden: [
    "zalando", "h&m", "h & m", "hm.com", "c&a", "c & a", "primark", "zeeman", "van haren", "scapino", "nelson schoenen",
    "omoda", "bristol", "the sting", "we fashion", "jack & jones", "jack&jones", "zara", "mango", "bershka",
    "pull&bear", "uniqlo", "vero moda", "esprit", "about you", "aboutyou", "shoeby", "peek & cloppenburg", "score jeans",
    "america today", "hunkemöller", "hunkemoller", "manfield", "sacha schoenen", "kleding", "schoenen", "only stores",
  ] },
  { naam: "Drogist & huishouden", woorden: [
    "kruidvat", "etos", "trekpleister", "da drogist", "holland & barrett", "holland and barrett", " action", "hema",
    "blokker", "xenos", "big bazar", "wibra", "drogist", "drogisterij", "douglas", "ici paris", "rituals", "lucardi",
    "flying tiger", "søstrene grene", "sostrene grene", "dille & kamille",
  ] },
]);

export const HUISHOUD_STANDAARD_REGELS = Object.freeze(HUISHOUD_REGELS_DATA.map((r) => Object.freeze({
  name: r.naam, color: CATEGORY_COLOR[r.naam] || "bg-slate-200 text-slate-700", keywords: [...r.woorden], prive: true, huishoud: true,
})));

// Huishoudregels vooraan (met opgeslagen extra zoekwoorden), dan de privéregels zoals altijd. Geeft `regels` zelf terug
// als er niets verandert.
export function metHuishoudRegels(regels) {
  const opgeslagen = regels.filter((r) => r.huishoud);
  const basis = metPriveRegels(regels.filter((r) => !r.huishoud));
  const standaard = HUISHOUD_STANDAARD_REGELS.map((d) => {
    const eerder = opgeslagen.find((r) => r.name === d.name);
    if (!eerder) return d;
    const woorden = [...new Set([...d.keywords, ...(eerder.keywords || [])])];
    return woorden.length === (eerder.keywords || []).length ? eerder : { ...d, keywords: woorden };
  });
  const nieuw = [...standaard, ...basis];
  return nieuw.length === regels.length && nieuw.every((r, i) => r === regels[i]) ? regels : nieuw;
}

export const HUISHOUD_VASTE_LASTEN = PRIVE_VASTE_LASTEN;
export const metHuishoudVasteLasten = metPriveVasteLasten;
