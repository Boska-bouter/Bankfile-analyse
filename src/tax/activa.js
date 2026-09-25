// Activaregister — houdt per bedrijfsmiddel (machine, gereedschap, inventaris) de gegevens bij
// die de Belastingdienst nodig heeft om de jaarlijkse afschrijving te berekenen: aanschafwaarde,
// aanschafdatum, afschrijvingstermijn (in jaren) en restwaarde. Rekent lineair af (het gangbare,
// standaard afschrijvingsstelsel) — versneld/vrij afschrijven is een uitzondering die de aangifte
// zelf apart moet aangeven, niet iets wat deze tool aanneemt.

// Jaarlijkse afschrijving = (aanschafwaarde − restwaarde) / termijn in jaren. In het jaar van
// aanschaf zelf mag je alleen afschrijven naar rato van de resterende maanden van dat jaar (de
// "tijdklem") — bijvoorbeeld bij aanschaf in oktober nog maar 3/12 van een vol jaar. De maanden
// die daardoor in het eerste jaar "gemist" worden, komen aan het eind van de looptijd terug als
// een extra, deels jaar — anders zou er in totaal minder worden afgeschreven dan aanschafwaarde
// minus restwaarde, wat niet klopt.
// v205: optioneel `activum.einddatum` — vroegtijdige beëindiging/verkoop van het bedrijfsmiddel vóór
// het einde van de normale afschrijvingstermijn (tot nu toe alleen relevant voor een verkocht/
// geveild financieel-geleased object, zie computeLeaseAfschrijvingVoorJaar in tax/autoBijtelling.js,
// maar generiek genoeg om ook voor een los aangeschaft activum te gebruiken). Zonder dit veld (elk
// bestaand activum/dossier) verandert er niets — 100% backwards compatible. Mét een ingevulde
// einddatum wordt de afschrijving vanaf de maand ná die datum bevroren: geen verdere afschrijving in
// latere jaren, en in het jaar van beëindiging zelf alleen naar rato tot en met de eindmaand (net als
// de "tijdklem" in het jaar van aanschaf hierboven). De boekwaarde op dat bevriezingsmoment
// (`boekwaardeEindJaar` voor het beëindigingsjaar en elk jaar erna) is de fiscale boekwaarde die
// vergeleken moet worden met de verkoop-/veilingopbrengst om een boekwinst/-verlies te bepalen.
export function computeAfschrijvingPerJaar(activum, year) {
  const aanschafwaarde = Number(activum.aanschafwaarde);
  const restwaarde = activum.restwaarde === "" || activum.restwaarde == null ? 0 : Number(activum.restwaarde);
  const termijn = Number(activum.afschrijvingstermijnJaren);
  if (!(aanschafwaarde > 0) || !(termijn > 0) || !activum.aanschafdatum) return null;

  const aanschafdatum = new Date(activum.aanschafdatum);
  const aanschafjaar = aanschafdatum.getFullYear();
  const volAfSchrijfBedrag = aanschafwaarde - restwaarde;
  const totaalMaanden = termijn * 12;
  const maandelijksBedrag = volAfSchrijfBedrag / totaalMaanden;
  const eersteJaarMaanden = 12 - aanschafdatum.getMonth(); // incl. de aanschafmaand zelf

  if (year < aanschafjaar) return { afschrijving: 0, boekwaardeEindJaar: aanschafwaarde };

  const eindDatum = activum.einddatum ? new Date(activum.einddatum) : null;
  // Cumulatief aantal maanden vanaf aanschaf t/m (incl.) de eindmaand — dezelfde "incl. de
  // aanschafmaand zelf"-telling als eersteJaarMaanden hierboven, alleen dan over de volledige periode
  // aanschaf → beëindiging in plaats van aanschaf → einde eerste jaar.
  const maandenTotBeeindiging = eindDatum
    ? Math.max(0, Math.min((eindDatum.getFullYear() - aanschafjaar) * 12 + (eindDatum.getMonth() - aanschafdatum.getMonth()) + 1, totaalMaanden))
    : null;

  // Cumulatief aantal afschrijvingsmaanden t/m het einde van een gegeven jaar, gekapt op de
  // totale looptijd in maanden (en, bij een vroegtijdige beëindiging, ook gekapt op
  // maandenTotBeeindiging — dat is voor elk jaar t/m het beëindigingsjaar zelf nooit lager dan wat er
  // normaliter al zou zijn afgeschreven, en bevriest de teller voor elk jaar erna).
  const maandenTotEindeVan = (j) => {
    const normaal = j < aanschafjaar ? 0 : j === aanschafjaar ? Math.min(eersteJaarMaanden, totaalMaanden) : Math.min(eersteJaarMaanden + (j - aanschafjaar) * 12, totaalMaanden);
    return maandenTotBeeindiging == null ? normaal : Math.min(normaal, maandenTotBeeindiging);
  };

  const totVorigJaar = maandenTotEindeVan(year - 1);
  if (totVorigJaar >= totaalMaanden) return { afschrijving: 0, boekwaardeEindJaar: restwaarde, volledigAfgeschreven: true };

  const totDitJaar = maandenTotEindeVan(year);
  const maandenDitJaar = totDitJaar - totVorigJaar;
  const afschrijvingDitJaar = maandelijksBedrag * maandenDitJaar;
  const boekwaardeEindJaar = Math.max(aanschafwaarde - totDitJaar * maandelijksBedrag, restwaarde);
  const volledigAfgeschreven = totDitJaar >= totaalMaanden;

  return { afschrijving: Math.max(afschrijvingDitJaar, 0), boekwaardeEindJaar, volledigAfgeschreven };
}

// Volledig schema over de hele afschrijvingstermijn — voor de weergave in de detailmodal, zodat
// je in één keer ziet of de berekening klopt (net als bij de leaseschema's).
export function computeAfschrijvingSchema(activum) {
  const aanschafwaarde = Number(activum.aanschafwaarde);
  const termijn = Number(activum.afschrijvingstermijnJaren);
  if (!(aanschafwaarde > 0) || !(termijn > 0) || !activum.aanschafdatum) return [];
  const aanschafjaar = new Date(activum.aanschafdatum).getFullYear();
  const rows = [];
  for (let j = aanschafjaar; j <= aanschafjaar + Math.ceil(termijn); j++) {
    const r = computeAfschrijvingPerJaar(activum, j);
    if (!r) break;
    rows.push({ jaar: j, ...r });
    if (r.volledigAfgeschreven) break;
  }
  return rows;
}

// Groepeert "Zakelijk - apparatuur/machines"-transacties — anders dan bij Leningen/Lease is elke
// aanschaf meestal een losse, eenmalige betaling (geen terugkerende termijnen), dus groeperen we
// per transactie in plaats van per tegenpartij: dezelfde leverancier kan immers op verschillende
// data totaal verschillende bedrijfsmiddelen leveren, elk met een eigen afschrijvingstermijn.
export function computeActivaSummary(classified) {
  return classified
    .filter((tx) => tx.category === "Zakelijk - apparatuur/machines" && !tx.isMirror)
    .map((tx) => ({ key: String(tx.id), naam: tx.counterparty || tx.description || "(onbekend)", tx }))
    .sort((a, b) => b.tx.date - a.tx.date);
}

// Som van de berekende afschrijving over alle geregistreerde activa voor een specifiek jaar —
// voor het aangiftevoorstel, net als bij de rente van leningen/financiële lease. Activa zonder
// (volledig) ingevulde gegevens tellen niet mee in het bedrag, maar wel in de "onvolledig"-teller.
export function computeActivaAfschrijvingForYear(activaSummary, activaDetails, year) {
  let totaalAfschrijving = 0;
  let onvolledig = 0;
  for (const activum of activaSummary) {
    const details = activaDetails[activum.key];
    if (!details || details.onbekend) { onvolledig++; continue; }
    if (!details.aanschafwaarde || !details.aanschafdatum || !details.afschrijvingstermijnJaren) { onvolledig++; continue; }
    const r = computeAfschrijvingPerJaar(details, year);
    if (r) totaalAfschrijving += r.afschrijving;
  }
  return { totaalAfschrijving, onvolledig };
}

// Som van de aanschafwaarde van bedrijfsmiddelen die dit specifieke jaar zijn aangeschaft — de
// grondslag voor een indicatie van de kleinschaligheidsinvesteringsaftrek (KIA). Anders dan bij
// afschrijving (die over meerdere jaren loopt) telt voor KIA het jaar van aanschaf, niet de jaren
// erna. Activa zonder volledig ingevulde gegevens tellen niet mee in het bedrag, maar wel in de
// "onvolledig"-teller, zodat een KIA-indicatie niet stilzwijgend een te laag investeringsbedrag
// toont.
export function computeInvesteringenForYear(activaSummary, activaDetails, year) {
  let totaalInvestering = 0;
  let onvolledig = 0;
  for (const activum of activaSummary) {
    const details = activaDetails[activum.key];
    if (!details || details.onbekend) { onvolledig++; continue; }
    if (!details.aanschafwaarde || !details.aanschafdatum) { onvolledig++; continue; }
    if (new Date(details.aanschafdatum).getFullYear() === year) {
      totaalInvestering += Number(details.aanschafwaarde);
    }
  }
  return { totaalInvestering, onvolledig };
}
