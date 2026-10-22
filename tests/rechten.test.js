// beide-V1R0 — aanmelden met de keuze zakelijk of privé, rechten per soort, goedkeuren en het beheerscherm.
import { describe, it, expect, beforeEach } from "vitest";
import { nepD1 } from "./nepD1.js";
import { aanmeldRoute, beheerRoute, rechtenVan, prijzen, rechtenUitRij } from "../worker/rechten.js";
import { aanmeldPagina } from "../worker/aanmeldpagina.js";

const BEHEERDER = "beheer@voorbeeld.nl";
let env, mails;
const post = (pad, body) => new Request(`https://app.test${pad}`, { method: "POST", headers: { "content-type": "application/json", Origin: "https://app.test" }, body: JSON.stringify(body) });
const get = (pad) => new Request(`https://app.test${pad}`);
const aanmelden = async (email, body) => (await aanmeldRoute(post("/api/aanmelden", body), env, new URL("https://app.test/api/aanmelden"), email)).json();
const beheer = async (pad, body) => {
  const req = body ? post(`/api/beheer/${pad}`, body) : get(`/api/beheer/${pad}`);
  return (await beheerRoute(req, env, new URL(req.url), BEHEERDER)).json();
};
const AANVRAAG = { voornaam: "Anna", achternaam: "de Vries", reden: "Ik wil graag inzicht in de uitgaven van ons huishouden." };

beforeEach(() => {
  mails = [];
  env = {
    DB: nepD1(), TOEGANG_VERPLICHT: "ja", BEHEERDERS: BEHEERDER, INLOG_FROM: "app@voorbeeld.nl", FEEDBACK_TO: "beheer@voorbeeld.nl",
    EMAIL: { send: async (m) => { mails.push(m); } },
  };
});

describe("aanmelden met keuze zakelijk of privé", () => {
  it("zonder keuze wordt de aanvraag geweigerd", async () => {
    const d = await aanmelden("anna@voorbeeld.nl", { plan: "uitgebreid", ...AANVRAAG });
    expect(d.ok).toBe(false);
    expect(d.fout).toMatch(/zakelijk of privé/);
  });
  it("een privéaanvraag komt met soort in de tabel en in de mails", async () => {
    const d = await aanmelden("anna@voorbeeld.nl", { gebruik: "prive", plan: "uitgebreid", ...AANVRAAG });
    expect(d).toMatchObject({ ok: true, gebruik: "prive" });
    const lijst = (await beheer("rechten")).rechten;
    expect(lijst[0]).toMatchObject({ email: "anna@voorbeeld.nl", aanvraag: "uitgebreid", aanvraagGebruik: "prive", gebruik: "prive", eenvoudig: false });
    expect(mails.find((m) => m.to === "beheer@voorbeeld.nl").subject).toContain("Privé · Uitgebreid");
    expect(mails.find((m) => m.to === "anna@voorbeeld.nl").text).toContain("privégebruik");
  });
  it("goedkeuren geeft alleen de privérechten", async () => {
    await aanmelden("anna@voorbeeld.nl", { gebruik: "prive", plan: "uitgebreid", ...AANVRAAG });
    mails = [];
    expect((await beheer("goedkeuren", { email: "anna@voorbeeld.nl" })).ok).toBe(true);
    const r = await rechtenVan("anna@voorbeeld.nl", env);
    expect(r.soorten.prive).toMatchObject({ eenvoudig: true, uitgebreid: true, koppelen: false });
    expect(r.soorten.zakelijk).toMatchObject({ eenvoudig: false, uitgebreid: false });
    expect(r).toMatchObject({ toegang: true, uitgebreid: true, gebruik: "prive", aanvraag: null });
    expect(mails[0].subject).toContain("goedgekeurd");
    expect(mails[0].text).toContain("Privé · Uitgebreid");
  });
  it("een tweede abonnement erbij: zakelijk naast privé", async () => {
    await aanmelden("anna@voorbeeld.nl", { gebruik: "prive", plan: "uitgebreid", ...AANVRAAG });
    await beheer("goedkeuren", { email: "anna@voorbeeld.nl" });
    expect((await aanmelden("anna@voorbeeld.nl", { gebruik: "prive", plan: "eenvoudig", ...AANVRAAG })).alActief).toBe(true);
    await aanmelden("anna@voorbeeld.nl", { gebruik: "zakelijk", plan: "koppelen", ...AANVRAAG });
    expect((await rechtenVan("anna@voorbeeld.nl", env)).aanvraagGebruik).toBe("zakelijk");
    await beheer("goedkeuren", { email: "anna@voorbeeld.nl" });
    const r = await rechtenVan("anna@voorbeeld.nl", env);
    expect(r.gebruik).toBe("beide");
    expect(r.soorten.zakelijk.koppelen).toBe(true);
    expect(r.soorten.prive).toMatchObject({ uitgebreid: true, koppelen: false });
  });
  it("afwijzen wist een rij die alleen een aanvraag was", async () => {
    await aanmelden("bob@voorbeeld.nl", { gebruik: "prive", plan: "eenvoudig", ...AANVRAAG });
    await beheer("afwijzen", { email: "bob@voorbeeld.nl" });
    expect((await beheer("rechten")).rechten).toHaveLength(0);
  });
});

describe("beheerscherm: rechten per soort", () => {
  it("opslaan per soort, met einddatum per soort", async () => {
    await beheer("rechten", { email: "c@voorbeeld.nl", zakelijk: { eenvoudig: true }, prive: { uitgebreid: true, koppelen: true, geldigTot: "2020-01-01" }, notitie: "x" });
    const rij = (await beheer("rechten")).rechten[0];
    expect(rij.zakelijk).toMatchObject({ eenvoudig: true, uitgebreid: false });
    expect(rij.prive).toMatchObject({ eenvoudig: true, uitgebreid: true, koppelen: true, geldigTot: "2020-01-01" });
    expect(rij.gebruik).toBe("beide");
    const r = await rechtenVan("c@voorbeeld.nl", env);
    expect(r.soorten.prive).toMatchObject({ eenvoudig: false, verlopen: true }); // verlopen
    expect(r.soorten.zakelijk.eenvoudig).toBe(true);
  });
  it("een bericht van de oude app (zonder soorten) wijzigt alleen zakelijk", async () => {
    await beheer("rechten", { email: "d@voorbeeld.nl", zakelijk: {}, prive: { eenvoudig: true } });
    await beheer("rechten", { email: "d@voorbeeld.nl", uitgebreid: true });
    const rij = (await beheer("rechten")).rechten[0];
    expect(rij.zakelijk.uitgebreid).toBe(true);
    expect(rij.prive.eenvoudig).toBe(true);
  });
});

describe("bestaande gegevens", () => {
  it("rijen van vóór de privémodus worden zakelijk", async () => {
    const db = env.DB._db;
    db.exec(`CREATE TABLE rechten (email TEXT PRIMARY KEY, uitgebreid INTEGER NOT NULL DEFAULT 0, koppelen INTEGER NOT NULL DEFAULT 0,
      geldig_tot TEXT, bron TEXT NOT NULL DEFAULT 'handmatig', notitie TEXT, gewijzigd TEXT NOT NULL, gewijzigd_door TEXT,
      eenvoudig INTEGER NOT NULL DEFAULT 0, aanvraag TEXT, aangevraagd TEXT, naam TEXT, reden TEXT)`);
    db.exec(`INSERT INTO rechten (email, uitgebreid, gewijzigd) VALUES ('oud@voorbeeld.nl', 1, 'x')`);
    db.exec(`INSERT INTO rechten (email, aanvraag, gewijzigd) VALUES ('wacht@voorbeeld.nl', 'eenvoudig', 'x')`);
    const lijst = (await beheer("rechten")).rechten;
    expect(lijst.find((r) => r.email === "oud@voorbeeld.nl")).toMatchObject({ gebruik: "zakelijk", zakelijk: { uitgebreid: true } });
    expect(lijst.find((r) => r.email === "wacht@voorbeeld.nl")).toMatchObject({ gebruik: "zakelijk", aanvraagGebruik: "zakelijk" });
  });
  it("prijzen: de oude vorm geldt voor zakelijk, privé apart", () => {
    expect(prijzen({ PRIJZEN: '{"uitgebreid":4.95}' })).toEqual({ zakelijk: { eenvoudig: 0, uitgebreid: 4.95, koppelen: 0 }, prive: { eenvoudig: 0, uitgebreid: 0, koppelen: 0 } });
    expect(prijzen({ PRIJZEN: '{"zakelijk":{"koppelen":7.5},"prive":{"uitgebreid":2.5}}' }).prive.uitgebreid).toBe(2.5);
  });
  it("beheerders hebben beide soorten volledig", async () => {
    const r = await rechtenVan(BEHEERDER, env);
    expect(r.soorten.prive.koppelen && r.soorten.zakelijk.koppelen).toBe(true);
  });
  it("zonder slot mag iedereen Eenvoudig, in beide soorten", () => {
    const r = rechtenUitRij(null, { open: true });
    expect(r.toegang).toBe(true);
    expect(r.soorten.prive.eenvoudig && r.soorten.zakelijk.eenvoudig).toBe(true);
  });
});

describe("aanmeldpagina", () => {
  it("vraagt zakelijk of privé en toont bestaande abonnementen", async () => {
    await beheer("rechten", { email: "e@voorbeeld.nl", zakelijk: { uitgebreid: true } });
    const r = await rechtenVan("e@voorbeeld.nl", env);
    const html = await aanmeldPagina("e@voorbeeld.nl", r, env, { status: 200, soort: "prive" }).text();
    expect(html).toContain('name="gebruik" value="prive" required checked');
    expect(html).toContain("Zakelijk · Uitgebreid");
    expect(html).toContain("Terug naar de app");
  });
});
