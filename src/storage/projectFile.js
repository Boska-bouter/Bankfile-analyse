// Bouwt, downloadt en leest het downloadbare projectbestand (.json) — los van de
// window.storage-polyfill in projectStorage.js, die is voor de automatische
// per-browser-opslag; dit hier is voor de expliciete "Project opslaan/laden"-actie.

import { nextVersionedFilename } from "./projectStorage.js";

export const PROJECT_FILE_TYPE = "bankoverzicht-project";
export const PROJECT_FILE_VERSION = 1;

// Bouwt het projectbestand-object. `state` is bewust een los object met alleen de velden die
// op dit moment al gemigreerd zijn (zie App.jsx) — dit groeit mee zodra er meer UI-panelen
// (en dus meer state) worden overgezet. Nieuwe velden hier toevoegen breekt het lezen van
// oudere projectbestanden niet, want loadProjectFile hieronder vult ontbrekende velden met
// een fallback in plaats van te falen.
export function buildProjectFile(state) {
  return {
    type: PROJECT_FILE_TYPE,
    version: PROJECT_FILE_VERSION,
    savedAt: new Date().toISOString(),
    ...state,
  };
}

// Downloadt het projectbestand als .json — hergebruikt dezelfde blob-downloadmethode als de
// rest van de tool (Excel-export, rapporten), die betrouwbaar werkt zonder browser-specifieke
// "Opslaan als"-API's nodig te hebben.
export function downloadProjectFile(project, previousFileName) {
  const json = JSON.stringify(project, null, 2);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = previousFileName ? nextVersionedFilename(previousFileName) : `Bankoverzicht_project_${stamp}.json`;

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

// Leest en valideert een geüpload projectbestand. Gooit een Error met een begrijpelijke
// boodschap bij een ongeldig bestand, zodat de UI dat direct kan tonen.
export async function readProjectFile(file) {
  let parsed;
  try {
    const text = await file.text();
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error("Kon het projectbestand niet lezen. Controleer of dit het juiste bestand is.");
  }
  if (!parsed || parsed.type !== PROJECT_FILE_TYPE) {
    throw new Error("Dit lijkt geen geldig projectbestand van deze tool te zijn.");
  }
  return parsed;
}
