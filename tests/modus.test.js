import { describe, it, expect } from "vitest";
import { kiesProfiel, dossierSoort, kaartenVolgensProfiel, ZAKELIJK_PROFIEL, PRIVE_PROFIEL } from "../src/modus/index.js";
import { resolveDossierSoort } from "../src/dossier/dossierMigraties.js";

describe("soort van een dossier", () => {
  it("een oud dossier zonder soort is zakelijk", () => {
    expect(resolveDossierSoort({ rechtsvorm: "zzp" })).toBe("zakelijk");
    expect(resolveDossierSoort(null)).toBe("zakelijk");
    expect(resolveDossierSoort({ dossierSoort: "iets anders" })).toBe("zakelijk");
  });
  it("alleen \"prive\" maakt een dossier privé", () => {
    expect(resolveDossierSoort({ dossierSoort: "prive" })).toBe("prive");
    expect(dossierSoort("prive")).toBe("prive");
    expect(dossierSoort(undefined)).toBe("zakelijk");
  });
  it("kiesProfiel geeft het juiste profiel", () => {
    expect(kiesProfiel("zakelijk")).toBe(ZAKELIJK_PROFIEL);
    expect(kiesProfiel(null)).toBe(ZAKELIJK_PROFIEL);
    expect(kiesProfiel("prive")).toBe(PRIVE_PROFIEL);
  });
});

describe("kaarten volgens het profiel", () => {
  const kaarten = [{ key: "a" }, { key: "btwQuarters" }, { key: "b" }];
  it("zakelijk laat alle kaarten ongewijzigd (zelfde lijst)", () => {
    for (const tab of ["overzicht", "controleren", "instellingen"]) {
      expect(kaartenVolgensProfiel(kaarten, ZAKELIJK_PROFIEL.kaarten[tab])).toBe(kaarten);
    }
  });
  it("een lijst met sleutels filtert en zet in volgorde", () => {
    expect(kaartenVolgensProfiel(kaarten, ["b", "a", "bestaatNiet"]).map((k) => k.key)).toEqual(["b", "a"]);
  });
  it("privé toont geen BTW-, activa- of BV-kaarten", () => {
    const zakelijk = ["btwQuarters", "btwSettings", "activa", "leases", "bvSignalering", "ibZvw", "result"];
    for (const tab of Object.values(PRIVE_PROFIEL.kaarten)) for (const k of zakelijk) expect(tab).not.toContain(k);
    expect(PRIVE_PROFIEL.onderdelen.btw).toBe(false);
  });
  it("zakelijk heeft alle zakelijke onderdelen aan en geen privéonderdelen", () => {
    const o = ZAKELIJK_PROFIEL.onderdelen;
    expect([o.btw, o.activa, o.auto, o.lease, o.holding]).toEqual([true, true, true, true, true]);
    expect([o.budget, o.eigenWoning, o.box3, o.partner]).toEqual([false, false, false, false]);
  });
});
