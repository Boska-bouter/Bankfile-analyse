// beide-V1R0 — vaste controle dat de zakelijke uitkomsten niet veranderen door de bouw van de privémodus.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { berekenAlles } from "./zakelijkInvoer.js";

const vastgelegd = JSON.parse(readFileSync(new URL("./vastgelegd/zakelijk.json", import.meta.url), "utf8"));

// Vergelijkt op de cent; tekst en ja/nee exact.
function gelijk(nu, toen, pad) {
  if (typeof toen === "number") return expect(nu, pad).toBeCloseTo(toen, 2);
  if (toen && typeof toen === "object") {
    expect(Object.keys(nu ?? {}).sort(), pad).toEqual(Object.keys(toen).sort());
    for (const k of Object.keys(toen)) gelijk(nu[k], toen[k], `${pad}.${k}`);
    return;
  }
  expect(nu, pad).toEqual(toen);
}

describe("zakelijke berekening blijft gelijk", () => {
  const nu = berekenAlles();
  for (const sleutel of Object.keys(vastgelegd)) {
    it(sleutel, () => gelijk(nu[sleutel], vastgelegd[sleutel], sleutel));
  }
});
