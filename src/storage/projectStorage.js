// window.storage-polyfill — dezelfde interface die het Claude-artifact gebruikt, zodat de rest van de
// app (persistData/persistSettings in App.jsx) ongewijzigd werkt.
// release22V6 — opslag in IndexedDB i.p.v. localStorage. localStorage heeft (o.a. in Safari op de iPad)
// een limiet van ca. 5 MB per site; een dossier met meerdere jaren en bankbestanden paste daar niet meer
// in ("Opslaan mislukt"), waardoor bij het heropenen "Verder met dit dossier" ontbrak. IndexedDB heeft
// ruim genoeg ruimte. Bestaande gegevens in localStorage worden bij het eerste lezen nog gevonden en bij
// de eerstvolgende opslag naar IndexedDB verplaatst. Lukt IndexedDB niet, dan valt alles terug op localStorage.
const IDB_NAAM = "bankoverzicht";
const IDB_STORE = "kv";
let dbBelofte = null;
function openDb() {
  if (dbBelofte) return dbBelofte;
  dbBelofte = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("geen IndexedDB")); return; }
    const req = indexedDB.open(IDB_NAAM, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((e) => { dbBelofte = null; throw e; });
  return dbBelofte;
}
async function idb(modus, actie) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, modus);
    const req = actie(tx.objectStore(IDB_STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("afgebroken"));
  });
}
const lsGet = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const lsDel = (key) => { try { localStorage.removeItem(key); } catch { /* ignore */ } };

export function installStoragePolyfill() {
  if (typeof window === "undefined" || window.storage) return;
  window.storage = {
    get: async (key) => {
      let v = null;
      try { v = await idb("readonly", (st) => st.get(key)); } catch { v = null; }
      if (v == null) v = lsGet(key); // oude opslag (vóór release22V6) of IndexedDB niet beschikbaar
      return v == null ? null : { key, value: v };
    },
    set: async (key, value) => {
      try {
        await idb("readwrite", (st) => st.put(value, key));
        lsDel(key); // ruimte vrijmaken in localStorage; de gegevens staan nu in IndexedDB
      } catch {
        localStorage.setItem(key, value); // terugval; gooit bij een volle opslag zoals voorheen
      }
      return { key, value };
    },
    delete: async (key) => {
      const existed = lsGet(key) != null;
      lsDel(key);
      try { await idb("readwrite", (st) => st.delete(key)); } catch { /* ignore */ }
      return { key, deleted: existed };
    },
  };
}

// Automatische per-browser opslag van de geüploade bestanden — dezelfde sleutel als de
// originele app gebruikte ("bankoverzicht:data"), zodat een eerder opgeslagen dossier in deze
// browser blijft werken na de migratie. Los van het downloadbare dossierbestand (zie
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

// Instellingen (rekeningtype per bestand, correcties, categorieregels, ...) worden apart van de
// geüploade bestanden bewaard — zelfde opzet als de originele app ("bankoverzicht:settings").
const SETTINGS_KEY = "bankoverzicht:settings";

export async function loadPersistedSettings() {
  try {
    const res = await window.storage.get(SETTINGS_KEY);
    if (res && res.value) return JSON.parse(res.value);
  } catch (e) {
    // nog geen eerder opgeslagen instellingen
  }
  return null;
}

export async function persistSettings(settings) {
  try {
    const result = await window.storage.set(SETTINGS_KEY, JSON.stringify(settings));
    return !!result;
  } catch (e) {
    return false;
  }
}

export async function clearPersistedSettings() {
  try {
    await window.storage.delete(SETTINGS_KEY);
  } catch (e) {
    // al leeg, niets te doen
  }
}

// Bouwt de volgende versienaam voor een dossierbestand: "naam.json" -> "naam_v2.json", en
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
