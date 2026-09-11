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
