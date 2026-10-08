// Bouwt, downloadt en leest het downloadbare dossierbestand (.json) — los van de
// window.storage-polyfill in projectStorage.js, die is voor de automatische
// per-browser-opslag; dit hier is voor de expliciete "Dossier opslaan/laden"-actie.

import { nextVersionedFilename } from "./projectStorage.js";
import { herstelWachtwoord } from "./herstelcode.js";
import { VERSLEUTELD_TYPE, versleutelTekst, ontsleutelTekst } from "./projectCrypto.js";

export const PROJECT_FILE_TYPE = "bankoverzicht-project";
export const PROJECT_FILE_VERSION = 1;

// Bouwt het dossierbestand-object. `state` is bewust een los object met alleen de velden die
// op dit moment al gemigreerd zijn (zie App.jsx) — dit groeit mee zodra er meer UI-panelen
// (en dus meer state) worden overgezet. Nieuwe velden hier toevoegen breekt het lezen van
// oudere dossierbestanden niet, want loadProjectFile hieronder vult ontbrekende velden met
// een fallback in plaats van te falen.
export function buildProjectFile(state) {
  return {
    type: PROJECT_FILE_TYPE,
    version: PROJECT_FILE_VERSION,
    savedAt: new Date().toISOString(),
    ...state,
  };
}

// Downloadt het dossierbestand als .json — hergebruikt dezelfde blob-downloadmethode als de
// rest van de app (Excel-export, rapporten), die betrouwbaar werkt zonder browser-specifieke
// "Opslaan als"-API's nodig te hebben.
// Maakt een naam geschikt als (deel van een) bestandsnaam — verwijdert tekens die op Windows/
// macOS/iOS niet in bestandsnamen mogen, en houdt spaties/liggende streepjes leesbaar.
function sanitizeForFilename(naam) {
  return (naam || "").trim().replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
}

export async function downloadProjectFile(project, previousFileName, rekeninghouderNaam, wachtwoord = null, herstelcode = null) {
  // De herstelcode gaat versleuteld mee in het dossier zelf, zodat hij bij een volgende keer opslaan gelijk blijft.
  let json = JSON.stringify(wachtwoord && herstelcode ? { ...project, herstelcode } : project, null, 2);
  if (wachtwoord) json = JSON.stringify(await versleutelTekst(json, wachtwoord, herstelcode));
  const stamp = new Date().toISOString().slice(0, 10);
  // De naam van de rekeninghouder (uit de wizard) komt, indien bekend, in de bestandsnaam bij de
  // EERSTE keer opslaan — zo is bij het laden (bijv. in de Bestanden-app) al aan de bestandsnaam
  // te zien van wie het project is, zonder het eerst te hoeven openen. Bij een vervolgopslag
  // (previousFileName gezet) blijft de bestaande naam + "_vN"-teller intact, zoals al het geval
  // was — die verandert dus niet met terugwerkende kracht als de naam later pas wordt ingevuld.
  const schoneNaam = sanitizeForFilename(rekeninghouderNaam);
  const filename = previousFileName
    ? nextVersionedFilename(previousFileName)
    : schoneNaam
      ? `Bankoverzicht_dossier_${schoneNaam}_${stamp}.json`
      : `Bankoverzicht_dossier_${stamp}.json`;

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return filename;
}

// Leest en valideert een geüpload dossierbestand. Gooit een Error met een begrijpelijke
// boodschap bij een ongeldig bestand, zodat de UI dat direct kan tonen.
export async function readProjectFile(file, vraagWachtwoord = null) {
  let parsed;
  try {
    const text = await file.text();
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error("Kon het dossierbestand niet lezen. Controleer of dit het juiste bestand is.");
  }
  let wachtwoord = null;
  if (parsed && parsed.type === VERSLEUTELD_TYPE) {
    if (!vraagWachtwoord) throw new Error("Dit dossierbestand is beveiligd met een wachtwoord.");
    let fout = null;
    for (;;) {
      const pw = await vraagWachtwoord(fout);
      if (pw == null) { const e = new Error("Laden geannuleerd."); e.code = "GEANNULEERD"; throw e; }
      let pwGebruik = pw;
      if (pw && typeof pw === "object" && pw.herstelcode) {
        if (!parsed.herstel || !parsed.herstel.iv) throw new Error("Dit bestand heeft geen herstelcode (het is opgeslagen vóór de herstelcode bestond).");
        try { pwGebruik = await herstelWachtwoord(parsed.herstel, pw.herstelcode); }
        catch { fout = "Onjuiste herstelcode, probeer het opnieuw."; continue; }
      }
      try {
        parsed = JSON.parse(await ontsleutelTekst(parsed, pwGebruik));
        wachtwoord = pwGebruik;
        break;
      } catch (e) {
        if (e.code !== "FOUT_WACHTWOORD") throw new Error("Kon het dossierbestand niet lezen. Controleer of dit het juiste bestand is.");
        fout = "Onjuist wachtwoord, probeer het opnieuw.";
      }
    }
  }
  if (!parsed || parsed.type !== PROJECT_FILE_TYPE) {
    throw new Error("Dit lijkt geen geldig dossierbestand van deze app te zijn.");
  }
  if (wachtwoord) Object.defineProperty(parsed, "__wachtwoord", { value: wachtwoord, enumerable: false });
  if (wachtwoord && parsed.herstelcode) Object.defineProperty(parsed, "__herstelcode", { value: parsed.herstelcode, enumerable: false });
  return parsed;
}
