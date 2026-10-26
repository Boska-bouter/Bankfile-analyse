// Bankoverzicht — hulpvraag/feedback ontvangen en per e-mail doorsturen (Cloudflare Worker).
// De app (React) stuurt een POST naar /api/feedback op dezelfde hostnaam als de app. Die hostnaam staat achter
// Cloudflare Access, dus alleen ingelogde gebruikers komen hier. Access zet hun e-mailadres in de header
// "Cf-Access-Authenticated-User-Email"; dat gebruiken we als antwoordadres.
//
// Instellingen (zie wrangler.jsonc): binding EMAIL (send_email), variabelen FEEDBACK_TO en FEEDBACK_FROM.

import { bankRoute, bankTerugRoute } from "./bank.js";
import { eigenInlog, wieIsIngelogd, inlogRoute, isOpenPad, passkeyAanbieden, PASSKEY_GEVRAAGD } from "./inloggen.js";
import { aanmeldPagina } from "./aanmeldpagina.js";
import { tarievenRoute, tarievenBeheerRoute, tarievenHerinneringMail } from "./tarieven.js";
import { opLijst, rechtenVan, bankkoppelingVoor, bankkoppelingHelemaalUit, beheerRoute, aanmeldRoute, heeftToegang, toegangVerplicht, telAanvragen, voorwaardenVan, voorwaardenRoute, wisOudeTelefoons, verloopHerinneringen, logboekControle } from "./rechten.js";

const MAX = { naam: 100, onderwerp: 150, bericht: 5000 };
const SOORTEN = ["Hulpvraag", "Feedback"];

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const schoon = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// nieuw-V2R0 — mag de ingelogde gebruiker de uitgebreide weergave gebruiken? Sinds nieuw-V4R3: Secret "AccessAll",
// Secret "BEHEERDERS" en de D1-tabel "rechten" (zie rechten.js). Geen recht of niet ingelogd = alleen Eenvoudig.
export const magUitgebreid = opLijst; // nieuw-V4R3 — verhuisd naar rechten.js (daar ook BEHEERDERS en de D1-tabel)

let laatsteHerinnering = 0;

export default {
  // beide-V6R8 — geplande taken (alleen met een Cron Trigger in wrangler.jsonc): herinnering tarieven bijwerken.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(tarievenHerinneringMail(env));
    if (env.DB) ctx.waitUntil(wisOudeTelefoons(env.DB).catch(() => {})); // beide-V7R1 — telefoonnummers niet langer bewaren dan nodig
    ctx.waitUntil(verloopHerinneringen(env).catch(() => {})); // beide-V7R3 — knop in de mail alleen met variabele APP_URL
    ctx.waitUntil(logboekControle(env).catch(() => {})); // beide-V7R7
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // nieuw-V4R6 — wie is ingelogd? Met INLOG_MODUS = "eigen" uit de eigen sessiecookie (zie inloggen.js), anders
    // van Cloudflare Access. De rest van de Worker leest het adres uit de header Cf-Access-Authenticated-User-Email;
    // bij eigen inlog zetten we die header hier zelf, en gooien we een meegestuurde header weg (anders kan iedereen
    // zich als een ander voordoen zodra Access er niet meer voor zit).
    const ingelogd = await wieIsIngelogd(request, env);
    if (eigenInlog(env)) {
      const h = new Headers(request.headers);
      h.delete("Cf-Access-Authenticated-User-Email");
      if (ingelogd) h.set("Cf-Access-Authenticated-User-Email", ingelogd);
      request = new Request(request, { headers: h });
    }
    if (isOpenPad(url.pathname)) return inlogRoute(request, env, url, ingelogd);
    // beide-V3R4 — terugkeer van de bank: de Worker rondt de koppeling zelf af, ook als deze browser niet is ingelogd
    // (app als icoon op het beginscherm: de bank opent dan in Safari). Zie bankTerugRoute in bank.js.
    if (url.pathname === "/bank/terug" && url.searchParams.has("state")) {
      if (bankkoppelingHelemaalUit(env)) return Response.redirect(`${url.origin}/`, 302); // beide-V5R8 — bankkoppeling staat uit
      const r = await bankTerugRoute(request, env, url);
      if (r) return r;
    }
    if (eigenInlog(env) && !ingelogd) {
      if (url.pathname.startsWith("/api/")) return json({ ok: false, fout: "Niet ingelogd" }, 401);
      return Response.redirect(`${url.origin}/inloggen`, 302);
    }
    // beide-V6R3 — alleen nog "ben je ingelogd?" (401 hierboven = nee), gebruikt door useSessieWaarschuwing/FeedbackModal.
    // De oude testpagina met de tijden uit het Cloudflare Access-inlogbewijs is weg.
    if (url.pathname === "/api/sessie") return json({ ok: true });
    // beide-V6R7 — tarievenbestand (zie tarieven.js): ophalen door de app, wijzigen alleen door BEHEERDERS.
    if (url.pathname === "/api/tarieven") return tarievenRoute(request, env);
    if (url.pathname === "/api/beheer/tarieven") return tarievenBeheerRoute(request, env, url, request.headers.get("Cf-Access-Authenticated-User-Email"));
    if (url.pathname === "/api/rol") {
      const email = request.headers.get("Cf-Access-Authenticated-User-Email");
      const r = await rechtenVan(email, env);
      const aanvragen = r.beheerder ? await telAanvragen(env) : 0;
      // beide-V7R3 — herinneringen "abonnement loopt af" versturen als de beheerder de app opent (hooguit eens per uur
      // per isolate), zodat er geen Cron Trigger nodig is. Dubbel versturen kan niet: de database onthoudt het per einddatum.
      if (r.beheerder && env.DB && Date.now() - laatsteHerinnering > 3600_000) {
        laatsteHerinnering = Date.now();
        ctx.waitUntil(verloopHerinneringen(env, { origin: url.origin }).catch((e) => console.error("herinneringen", e?.message)));
        ctx.waitUntil(logboekControle(env).catch((e) => console.error("logboek", e?.message))); // beide-V7R7 — logboek te groot?
      }
      // lijst = is er een bron van rechten (AccessAll of de database); de inhoud wordt niet teruggegeven.
      const akkoord = await voorwaardenVan(email, env);
      return json({ ok: true, email: email || null, lijst: !!String(env.AccessAll || "").trim() || !!env.DB, db: !!env.DB, slot: toegangVerplicht(env), aanvragen, inlog: eigenInlog(env) ? "eigen" : "access", voorwaarden: akkoord.zakelijk, voorwaardenPrive: akkoord.prive, bankkoppeling: bankkoppelingVoor(env, r.beheerder), ...r });
    }
    if (url.pathname === "/api/voorwaarden") return voorwaardenRoute(request, env, url, request.headers.get("Cf-Access-Authenticated-User-Email"));
    // nieuw-V4R5 — aanmelden voor een abonnement (Eenvoudig, Uitgebreid, met bankkoppeling)
    if (url.pathname === "/api/aanmelden") {
      return aanmeldRoute(request, env, url, request.headers.get("Cf-Access-Authenticated-User-Email"), ctx);
    }
    // beide-V1R0 — abonnementenpagina: ook wie al toegang heeft kan hier een (tweede) abonnement aanvragen.
    if (url.pathname === "/aanmelden") {
      const email = request.headers.get("Cf-Access-Authenticated-User-Email");
      return aanmeldPagina(email, await rechtenVan(email, env), env,
        { status: 200, soort: url.searchParams.get("soort"), plan: url.searchParams.get("plan"), verlengen: url.searchParams.get("verlengen"), slot: toegangVerplicht(env) });
    }
    // nieuw-V4R5 — toegangsslot: met TOEGANG_VERPLICHT = "ja" krijgt alleen wie toegang heeft de app; de rest de
    // aanmeldpagina. Vereist "run_worker_first": true in wrangler.jsonc, anders komen de app-bestanden niet langs hier.
    if (toegangVerplicht(env) && !url.pathname.startsWith("/api/")) {
      const email = request.headers.get("Cf-Access-Authenticated-User-Email");
      const r = await heeftToegang(email, env);
      if (!r.toegang) return aanmeldPagina(email, r, env);
    }
    if (url.pathname === "/" && (await passkeyAanbieden(request, env, request.headers.get("Cf-Access-Authenticated-User-Email")))) {
      return new Response(null, { status: 302, headers: { Location: "/inloggen/passkey", "Set-Cookie": PASSKEY_GEVRAAGD, "cache-control": "no-store" } });
    }
    // nieuw-V4R3 — beheerscherm "Gebruikers en rechten" (alleen Secret BEHEERDERS)
    if (url.pathname.startsWith("/api/beheer/")) {
      return beheerRoute(request, env, url, request.headers.get("Cf-Access-Authenticated-User-Email"));
    }
    // nieuw-V3R8 — rechtstreekse bankkoppeling (zie bank.js). Sinds nieuw-V4R3 alleen met het recht "koppelen".
    if (url.pathname.startsWith("/api/bank/")) {
      if (bankkoppelingHelemaalUit(env)) return json({ ok: false, fout: "De bankkoppeling staat op dit moment uit" }, 403);
      if (!(await rechtenVan(request.headers.get("Cf-Access-Authenticated-User-Email"), env)).koppelen) {
        return json({ ok: false, fout: "Bankkoppeling staat niet aan voor jouw account" }, 403);
      }
      return bankRoute(request, env, url);
    }
    // Alles behalve /api/feedback is de app zelf (statische bestanden): doorgeven aan de assets-binding.
    if (url.pathname !== "/api/feedback") return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not found", { status: 404 });
    if (request.method !== "POST") return json({ ok: false, fout: "Alleen POST" }, 405);

    const email = request.headers.get("Cf-Access-Authenticated-User-Email");
    if (!email) return json({ ok: false, fout: "Niet ingelogd" }, 401);

    let body;
    try { body = await request.json(); } catch { return json({ ok: false, fout: "Ongeldig bericht" }, 400); }

    const soort = SOORTEN.includes(body?.soort) ? body.soort : "Hulpvraag";
    const naam = schoon(body?.naam, MAX.naam);
    const onderwerp = schoon(body?.onderwerp, MAX.onderwerp);
    const bericht = schoon(body?.bericht, MAX.bericht);
    const release = schoon(body?.release, 40);
    if (!bericht) return json({ ok: false, fout: "Bericht is leeg" }, 400);

    const subject = `[Bankoverzicht] ${soort}${onderwerp ? `: ${onderwerp.replace(/[\r\n]+/g, " ")}` : ""}`;
    const regels = [`Van: ${naam || "(geen naam)"} <${email}>`, `App: ${release || "onbekend"}`];
    const text = `${bericht}\n\n—\n${regels.join("\n")}`;
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${esc(bericht)}</div><hr><p style="font-family:Arial,sans-serif;font-size:12px;color:#555">${regels.map(esc).join("<br>")}</p>`;

    const bericht_ = { to: env.FEEDBACK_TO, from: env.FEEDBACK_FROM, subject, text, html };
    try {
      if (!env.EMAIL) throw Object.assign(new Error("Binding EMAIL ontbreekt in deze deployment"), { code: "NO_BINDING" });
      try {
        await env.EMAIL.send({ ...bericht_, replyTo: email });
      } catch {
        // Niet elke versie van de binding kent replyTo: probeer zonder (het antwoordadres staat in de tekst).
        await env.EMAIL.send(bericht_);
      }
    } catch (e) {
      // Technische melding meegeven (code + tekst van Cloudflare), zodat de oorzaak in de app zichtbaar is.
      const detail = [e?.code, e?.message].filter(Boolean).join(" — ").slice(0, 300);
      return json({ ok: false, fout: "Versturen mislukt", detail }, 502);
    }
    return json({ ok: true });
  },
};
