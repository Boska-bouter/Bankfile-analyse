// Herstelcode: bij een dossier met wachtwoord hoort één willekeurige code (bijv. HK7P-93QD-…). Het wachtwoord wordt
// óók versleuteld met een sleutel afgeleid van die code en in het bestand gezet. Wie de code heeft kan het bestand
// openen zonder wachtwoord; er is GEEN algemene sleutel of achterdeur — de code hoort bij dit ene dossier en wordt
// alleen aan de gebruiker getoond (en zit versleuteld in het dossier zelf, zodat hij bij een volgende keer opslaan gelijk blijft).
const ALFABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // zonder I, O, 0, 1
const ITER = 250000;
const naarB64 = (buf) => { const b = new Uint8Array(buf); let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const vanB64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
export const normaliseerCode = (c) => String(c || "").toUpperCase().replace(/[^A-Z2-9]/g, "");

export function maakHerstelcode() {
  const b = crypto.getRandomValues(new Uint8Array(20));
  const tekens = Array.from(b, (x) => ALFABET[x % 32]); // 20 tekens = 100 bits
  return tekens.join("").match(/.{4}/g).join("-");
}
async function sleutel(code, salt) {
  const basis = await crypto.subtle.importKey("raw", new TextEncoder().encode(normaliseerCode(code)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, basis, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export async function wikkelWachtwoord(wachtwoord, code) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await sleutel(code, salt), new TextEncoder().encode(wachtwoord));
  return { alg: "PBKDF2-AES-GCM", iterations: ITER, salt: naarB64(salt), iv: naarB64(iv), data: naarB64(data) };
}
export async function herstelWachtwoord(herstelObj, code) {
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: vanB64(herstelObj.iv) }, await sleutel(code, vanB64(herstelObj.salt)), vanB64(herstelObj.data));
    return new TextDecoder().decode(plain);
  } catch {
    throw new Error("Onjuiste herstelcode.");
  }
}
