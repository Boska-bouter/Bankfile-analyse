// Optionele versleuteling van het dossierbestand (wachtwoord). AES-256-GCM, sleutel afgeleid met
// PBKDF2-SHA256 (250.000 iteraties) en een willekeurige salt per bestand. Alles gebeurt lokaal in de
// browser (WebCrypto); het wachtwoord wordt nergens opgeslagen of verstuurd. Een vergeten wachtwoord
// is niet te herstellen.
export const VERSLEUTELD_TYPE = "bankoverzicht-project-versleuteld";
const ITERATIES = 250000;

const naarB64 = (buf) => {
  const b = new Uint8Array(buf); let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
const vanB64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

function subtle() {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error("Versleutelen wordt door deze browser niet ondersteund (open de app via https of localhost).");
  return s;
}
async function sleutel(wachtwoord, salt, iteraties) {
  const s = subtle();
  const basis = await s.importKey("raw", new TextEncoder().encode(wachtwoord), "PBKDF2", false, ["deriveKey"]);
  return s.deriveKey({ name: "PBKDF2", salt, iterations: iteraties, hash: "SHA-256" }, basis, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function versleutelTekst(tekst, wachtwoord) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await sleutel(wachtwoord, salt, ITERATIES);
  const data = await subtle().encrypt({ name: "AES-GCM", iv }, k, new TextEncoder().encode(tekst));
  return { type: VERSLEUTELD_TYPE, version: 1, kdf: "PBKDF2-SHA256", iterations: ITERATIES, salt: naarB64(salt), iv: naarB64(iv), data: naarB64(data) };
}

// Gooit Error met code "FOUT_WACHTWOORD" bij een onjuist wachtwoord (of beschadigd bestand).
export async function ontsleutelTekst(obj, wachtwoord) {
  try {
    const k = await sleutel(wachtwoord, vanB64(obj.salt), obj.iterations || ITERATIES);
    const plain = await subtle().decrypt({ name: "AES-GCM", iv: vanB64(obj.iv) }, k, vanB64(obj.data));
    return new TextDecoder().decode(plain);
  } catch (e) {
    const err = new Error("Onjuist wachtwoord.");
    err.code = "FOUT_WACHTWOORD";
    throw err;
  }
}
