// D3 — korte uitleg bij vakbegrippen. `zoek` is een regex (zonder vlaggen) die het begrip in lopende
// tekst herkent; `uitleg` is bewust kort en neutraal ("indicatief", geen fiscaal advies).
export const BEGRIPPEN = [
  { id: "kor", term: "KOR", zoek: "Kleineondernemersregeling|KOR", uitleg: "Kleineondernemersregeling: onder een omzetgrens van €20.000 per jaar kan de ondernemer vrijstelling van BTW vragen. Er wordt dan geen BTW gerekend en geen BTW afgetrokken." },
  { id: "urencriterium", term: "Urencriterium", zoek: "Urencriterium", uitleg: "Voorwaarde voor ondernemersaftrek: minstens 1.225 uur per jaar aan de onderneming, en meer dan de helft van de werktijd." },
  { id: "zelfstandigenaftrek", term: "Zelfstandigenaftrek", zoek: "Zelfstandigenaftrek", uitleg: "Vaste aftrek op de winst voor ondernemers die aan het urencriterium voldoen. Het bedrag verschilt per jaar." },
  { id: "startersaftrek", term: "Startersaftrek", zoek: "Startersaftrek", uitleg: "Extra aftrek bovenop de zelfstandigenaftrek in de eerste jaren van de onderneming (maximaal drie keer, binnen de eerste vijf jaar)." },
  { id: "mkb", term: "MKB-winstvrijstelling", zoek: "MKB-winstvrijstelling|MKB-vrijstelling", uitleg: "Een percentage van de winst na ondernemersaftrek is vrijgesteld van belasting. Deze gaat automatisch mee in de aangifte." },
  { id: "verlegd", term: "BTW-verlegd", zoek: "BTW-verlegd|BTW verlegd|verlegde BTW", uitleg: "De BTW is naar de afnemer verlegd: de factuur gaat zonder BTW en de afnemer geeft de BTW aan. Komt voor bij bepaalde diensten, bijv. aan buitenlandse klanten of in de bouw." },
  { id: "zvw", term: "Zvw", zoek: "Zvw", uitleg: "Zorgverzekeringswet: over de winst is een inkomensafhankelijke bijdrage verschuldigd (Zvw-bijdrage), die de Belastingdienst apart oplegt." },
  { id: "financiele-lease", term: "financiële lease", zoek: "financiële (auto)?lease|financiële machinelease|financiële", uitleg: "De ondernemer is economisch eigenaar van het object: het staat op de balans (activa) en de lening ernaast. Er wordt afgeschreven en de rente is aftrekbaar; de aflossing is geen kosten." },
  { id: "operationele-lease", term: "operationele lease", zoek: "operationele lease|operationele", uitleg: "Het object wordt gehuurd: de volledige leasetermijn is gewoon een kostenpost (met BTW-aftrek voor zover zakelijk)." },
  { id: "activa", term: "Activa", zoek: "Activa|bedrijfsmiddel(en)?", uitleg: "Bedrijfsmiddelen die langer dan een jaar meegaan (auto, laptop, machine). Ze worden niet in één keer als kosten geboekt, maar in meerdere jaren afgeschreven." },
  { id: "afschrijving", term: "Afschrijving", zoek: "Afschrijving(en)?", uitleg: "Het verdelen van de aanschafprijs van een bedrijfsmiddel over de jaren dat het wordt gebruikt. De afschrijving is aftrekbaar van de winst." },
  { id: "kia", term: "KIA", zoek: "KIA|Kleinschaligheidsinvesteringsaftrek", uitleg: "Kleinschaligheidsinvesteringsaftrek: extra aftrek op de winst als er in een jaar voor een bepaald bedrag aan bedrijfsmiddelen koopt." },
  { id: "aov", term: "AOV", zoek: "AOV", uitleg: "Arbeidsongeschiktheidsverzekering voor zelfstandigen. De premie is in de regel privé en niet meer aftrekbaar van de winst." },
  { id: "rekening-courant", term: "Rekening-courant", zoek: "Rekening-courant|rekening courant", uitleg: "Bij een BV: de lopende schuld of vordering tussen de BV en de eigenaar (DGA), bijv. door privé-opnames of privébetalingen door de BV." },
  { id: "dga", term: "DGA", zoek: "DGA", uitleg: "Directeur-grootaandeelhouder: eigenaar van een BV die er ook directeur van is." },
  { id: "vpb", term: "Vpb", zoek: "Vpb|Vennootschapsbelasting", uitleg: "Vennootschapsbelasting: de belasting over de winst van een BV (in plaats van inkomstenbelasting)." },
  { id: "ib", term: "IB", zoek: "IB", uitleg: "Inkomstenbelasting: de belasting over het inkomen, bij een eenmanszaak inclusief de winst uit onderneming." },
  { id: "voorbelasting", term: "Voorbelasting", zoek: "Voorbelasting|voorbelasting", uitleg: "De BTW die betaald is op zakelijke inkopen. Die gaat af van de BTW die zelf in rekening is gebracht." },
  { id: "aannames", term: "Aannames", zoek: "Aannames|aannames", uitleg: "Punten waarop de app een redelijke veronderstelling heeft gedaan (bijv. een zakelijk/privé-percentage). Bevestig of pas aan." },
  { id: "spiegel", term: "spiegelboeking", zoek: "spiegelboeking(en)?|Privé ↔ spiegel", uitleg: "Een door de app aangemaakte tegenboeking aan de andere kant (zakelijk/privé) van een overboeking tussen eigen rekeningen. Telt niet dubbel mee." },
];

const RE = new RegExp(`(?<![\\p{L}\\p{N}])(${BEGRIPPEN.map((b) => `(?:${b.zoek})`).join("|")})(?![\\p{L}\\p{N}])`, "gu");

export function vindBegrip(tekst) {
  const t = String(tekst).toLowerCase();
  return BEGRIPPEN.find((b) => new RegExp(`^(?:${b.zoek})$`, "iu").test(String(tekst)) || b.term.toLowerCase() === t) || null;
}
export { RE as BEGRIPPEN_RE };
