// window.storage-polyfill bovenop localStorage — dezelfde interface die het Claude-artifact
// gebruikt, zodat de rest van de app (persistData/persistSettings in App.jsx) ongewijzigd werkt
// tussen de artifact-variant en de standalone GitHub Pages-build.
export function installStoragePolyfill() {
  if (typeof window === "undefined" || window.storage) return;
  window.storage = {
    get: async (key) => {
      const v = localStorage.getItem(key);
      return v == null ? null : { key, value: v };
    },
    set: async (key, value) => {
      localStorage.setItem(key, value);
      return { key, value };
    },
    delete: async (key) => {
      const existed = localStorage.getItem(key) != null;
      localStorage.removeItem(key);
      return { key, deleted: existed };
    },
  };
}

// Automatische per-browser opslag van de geüploade bestanden — dezelfde sleutel als de
// originele tool gebruikte ("bankoverzicht:data"), zodat een eerder opgeslagen project in deze
// browser blijft werken na de migratie. Los van het downloadbare projectbestand (zie
// projectFile.js) — dit hier gebeurt automatisch, op de achtergrond, bij elke wijziging.
const DATA_KEY = "bankoverzicht:data";

export async function loadPersistedParsedFiles() {
  try {
    const res = await window.storage.get(DATA_KEY);
    if (res && res.value) {
      const parsed = JSON.parse(res.value);
      if (Array.isArray(parsed.parsedFiles) && parsed.parsedFiles.length > 0) {
        return parsed.parsedFiles;
      }
    }
  } catch (e) {
    // nog geen eerder opgeslagen data — dat is prima, gewoon leeg beginnen
  }
  return null;
}

export async function persistParsedFiles(parsedFiles) {
  try {
    const result = await window.storage.set(DATA_KEY, JSON.stringify({ parsedFiles }));
    return !!result;
  } catch (e) {
    return false;
  }
}

export async function clearPersistedData() {
  try {
    await window.storage.delete(DATA_KEY);
  } catch (e) {
    // al leeg, niets te doen
  }
}

// Bouwt de volgende versienaam voor een projectbestand: "naam.json" -> "naam_v2.json", en
// "naam_v3.json" -> "naam_v4.json".
export function nextVersionedFilename(name) {
  const m = name.match(/^(.*)_v(\d+)\.json$/i);
  if (m) {
    const base = m[1];
    const nextVer = parseInt(m[2], 10) + 1;
    return `${base}_v${nextVer}.json`;
  }
  const base = name.replace(/\.json$/i, "");
  return `${base}_v2.json`;
}
