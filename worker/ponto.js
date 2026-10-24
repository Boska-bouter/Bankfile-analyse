// nieuw-V5R1 — bankkoppeling via Ponto (Isabel Group) als alternatief voor Enable Banking.
// Aan met de variabele BANK_AANBIEDER = "ponto". De gebruiker logt in bij Ponto (OAuth2 met PKCE), maakt daar zo nodig een
// Ponto-account aan en kiest welke rekeningen hij deelt. De Worker wisselt de code in voor een refresh token, haalt
// rekeningen en transacties op en geeft die door aan de browser; er wordt niets opgeslagen. Het refresh token en de
// rekening-id's zitten versleuteld in hetzelfde soort koppeltoken als bij Enable Banking (gebonden aan het e-mailadres).
// Ponto vervangt het refresh token bij elk gebruik; de Worker geeft daarom na elke actie een nieuw koppeltoken terug.
//
// Instellingen:
//   Secrets   PONTO_CLIENT_ID, PONTO_CLIENT_SECRET  (Ponto-dashboard → je integratie → Security)
//             EB_TOKEN_GEHEIM                        (versleutelt de koppeltokens; dezelfde als voor Enable Banking)
//   Binding   PONTO_CERT (mtls_certificates)         certificaat + sleutel van Ponto, geüpload met
//             `npx wrangler mtls-certificate upload --cert certificate.pem --key private_key.pem --name ponto`
//   Variabele PONTO_OMGEVING = "sandbox" | "live"    (standaard "sandbox")

const API = "https://api.ibanity.com";
const MAX_PAGINAS = 30;
const SCOPE = "ai name offline_access";

const authHost = (env) => (String(env.PONTO_OMGEVING || "").trim().toLowerCase() === "live"
  ? "https://authorization.myponto.com" : "https://sandbox-authorization.myponto.com");

const enc = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const pontoOntbreekt = (env) => [
  ...["PONTO_CLIENT_ID", "PONTO_CLIENT_SECRET", "EB_TOKEN_GEHEIM"].filter((k) => !String(env[k] || "").trim()),
  ...(env.PONTO_CERT?.fetch ? [] : ["PONTO_CERT (mTLS-certificaat)"]),
];

// Alle verzoeken naar Ponto gaan via de mTLS-binding: Ponto weigert verzoeken zonder het certificaat.
async function ponto(env, pad, { method = "GET", token, form, body } = {}) {
  const headers = { accept: "application/vnd.api+json" };
  if (form) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    headers.authorization = `Basic ${btoa(`${env.PONTO_CLIENT_ID}:${env.PONTO_CLIENT_SECRET}`)}`;
  } else if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  if (body) headers["content-type"] = "application/vnd.api+json";
  const r = await env.PONTO_CERT.fetch(pad.startsWith("http") ? pad : `${API}${pad}`, {
    method,
    headers,
    body: form ? new URLSearchParams(form).toString() : body ? JSON.stringify(body) : undefined,
  });
  const tekst = await r.text();
  let data = null;
  try { data = tekst ? JSON.parse(tekst) : null; } catch { data = { message: tekst.slice(0, 300) }; }
  if (!r.ok) {
    const e0 = data?.errors?.[0];
    // beide-V4R4 — bij een antwoord zonder JSON (zoals 520) ook laten zien wie antwoordde, voor de diagnose.
    const wie = ["server", "cf-ray"].map((h) => r.headers.get(h) && `${h}: ${r.headers.get(h)}`).filter(Boolean).join(", ");
    const melding = data?.error_description || data?.error || e0?.detail || e0?.code
      || `Ponto gaf status ${r.status}${wie ? ` (${wie})` : ""}${data?.message ? `: ${data.message.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)}` : ""}`;
    throw Object.assign(new Error(melding), { status: r.status, ponto: data });
  }
  return data;
}

// beide-V4R4 — diagnose: kan de Worker via de mTLS-binding een token bij Ponto halen (client_credentials)? Geeft
// alleen status, een paar headers en het begin van het antwoord terug, nooit een token.
export async function pontoTest(env) {
  const ontbreekt = pontoOntbreekt(env);
  if (ontbreekt.length) return { ok: false, ontbreekt };
  const uit = { omgeving: env.PONTO_OMGEVING || "sandbox", clientId: `${String(env.PONTO_CLIENT_ID).slice(0, 8)}…` };
  try {
    const r = await env.PONTO_CERT.fetch(`${API}/ponto-connect/oauth2/token`, {
      method: "POST",
      headers: {
        accept: "application/vnd.api+json",
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${btoa(`${env.PONTO_CLIENT_ID}:${env.PONTO_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: env.PONTO_CLIENT_ID }).toString(),
    });
    const tekst = (await r.text()).replace(/"(access_token|refresh_token)":"[^"]*"/g, '"$1":"(verborgen)"');
    const headers = Object.fromEntries(["server", "cf-ray", "content-type", "date"].map((h) => [h, r.headers.get(h)]).filter(([, v]) => v));
    return { ...uit, ok: r.ok, status: r.status, headers, antwoord: tekst.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400) };
  } catch (e) {
    return { ...uit, ok: false, uitzondering: String(e?.message || e).slice(0, 300) };
  }
}

async function vernieuw(env, refresh) {
  const t = await ponto(env, "/ponto-connect/oauth2/token", {
    method: "POST",
    form: { grant_type: "refresh_token", refresh_token: refresh, client_id: env.PONTO_CLIENT_ID },
  });
  return { toegang: t.access_token, refresh: t.refresh_token || refresh };
}

async function pkce() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", enc.encode(verifier)));
  return { verifier, challenge };
}

const dag = (s) => String(s || "").slice(0, 10);

// Ponto-transactie omzetten naar de vorm van Enable Banking, zodat de browser (importers/enableBanking.js) ongewijzigd
// werkt. Ponto geeft alleen geboekte transacties; "pending" staat op een aparte route die we niet gebruiken.
function naarEbVorm(t) {
  const a = t.attributes || {};
  const bedrag = Number(a.amount);
  const af = bedrag < 0;
  const tegen = a.counterpartName ? { name: a.counterpartName } : null;
  const tegenRek = a.counterpartReference ? { iban: String(a.counterpartReference).replace(/\s+/g, "") } : null;
  return {
    entry_reference: t.id,
    booking_date: dag(a.executionDate || a.valueDate),
    value_date: dag(a.valueDate),
    status: "BOOK",
    credit_debit_indicator: af ? "DBIT" : "CRDT",
    transaction_amount: { amount: String(Math.abs(bedrag)), currency: a.currency || "EUR" },
    ...(af ? { creditor: tegen, creditor_account: tegenRek } : { debtor: tegen, debtor_account: tegenRek }),
    remittance_information: [a.remittanceInformation].filter(Boolean),
    note: a.description && a.description !== a.remittanceInformation ? a.description : undefined,
    bank_transaction_code: a.bankTransactionCode ? { description: a.bankTransactionCode } : undefined,
  };
}

// Ponto vraagt de bank alleen om nieuwe gegevens na een "synchronization". We starten er een en wachten kort;
// lukt dat niet (bijv. binnen 30 minuten al gedaan), dan krijg je de gegevens van de laatste synchronisatie.
async function synchroniseer(env, toegang, rekeningId) {
  try {
    const s = await ponto(env, "/ponto-connect/synchronizations", {
      method: "POST", token: toegang,
      body: { data: { type: "synchronization", attributes: { resourceType: "account", resourceId: rekeningId, subtype: "accountTransactions" } } },
    });
    const id = s?.data?.id;
    for (let i = 0; id && i < 8; i += 1) {
      await new Promise((r) => setTimeout(r, 1000));
      const st = await ponto(env, `/ponto-connect/synchronizations/${encodeURIComponent(id)}`, { token: toegang });
      const status = st?.data?.attributes?.status;
      if (status === "success" || status === "error") return status;
    }
  } catch { /* dan de bestaande gegevens */ }
  return "onbekend";
}

export async function pontoRoute(request, env, url, pad, email, { json, leesBody, versleutel, ontsleutel, isDatum }) {
  const ontbreekt = pontoOntbreekt(env);
  if (ontbreekt.length) return json({ ok: false, fout: "Bankkoppeling via Ponto is nog niet ingesteld", detail: `Ontbreekt: ${ontbreekt.join(", ")}` }, 503);
  const redirect = `${url.origin}/bank/terug`;

  // Geen banklijst: de gebruiker kiest zijn bank bij Ponto zelf.
  if (pad === "/banken" && request.method === "GET") return json({ ok: true, aanbieder: "ponto", banken: [] });

  if (pad === "/start" && request.method === "POST") {
    const b = await leesBody(request);
    const state = String(b.state || "").slice(0, 100) || crypto.randomUUID();
    const { verifier, challenge } = await pkce();
    const q = new URLSearchParams({
      client_id: env.PONTO_CLIENT_ID, redirect_uri: redirect, response_type: "code", scope: SCOPE,
      state, code_challenge: challenge, code_challenge_method: "S256",
    });
    // De verifier gaat versleuteld mee naar de browser en komt bij /sessie terug. Sinds beide-V3R4 bewaart bank.js dit
    // versleutelde stuk ook kort in D1, zodat de Worker de terugkeer zelf kan afronden (bankTerugRoute).
    return json({ ok: true, url: `${authHost(env)}/oauth2/auth?${q}`, state, pkce: await versleutel(env, email, { v: verifier, st: state }) });
  }

  if (pad === "/sessie" && request.method === "POST") {
    const b = await leesBody(request);
    const code = String(b.code || "").slice(0, 1000);
    const p = await ontsleutel(env, email, b.pkce);
    if (!code || !p?.v) return json({ ok: false, fout: "Koppeling niet af te ronden; begin opnieuw" }, 400);
    const t = await ponto(env, "/ponto-connect/oauth2/token", {
      method: "POST",
      form: { grant_type: "authorization_code", code, client_id: env.PONTO_CLIENT_ID, redirect_uri: redirect, code_verifier: p.v },
    });
    const acc = await ponto(env, "/ponto-connect/accounts?page[limit]=100", { token: t.access_token });
    const lijst = acc?.data || [];
    const rekeningen = lijst.map((a) => ({
      iban: String(a.attributes?.reference || "").replace(/\s+/g, ""),
      naam: a.attributes?.description || a.attributes?.holderName || a.attributes?.product || "",
      valuta: a.attributes?.currency || "EUR",
      soort: a.attributes?.subtype || "",
    }));
    const verloop = lijst.map((a) => a.attributes?.authorizationExpirationExpectedAt).filter(Boolean).sort()[0] || null;
    const token = await versleutel(env, email, { p: 1, r: t.refresh_token, u: lijst.map((a) => a.id), t: verloop });
    return json({ ok: true, token, bank: "Ponto", rekeningen, geldigTot: verloop });
  }

  if (pad === "/transacties" && request.method === "POST") {
    const b = await leesBody(request);
    const k = await ontsleutel(env, email, b.token);
    if (!k?.p) return json({ ok: false, fout: "Koppeling ongeldig of van een andere gebruiker" }, 403);
    const id = k.u?.[Number(b.rekening)];
    if (!id) return json({ ok: false, fout: "Onbekende rekening" }, 400);
    const { toegang, refresh } = await vernieuw(env, k.r);
    const nieuwToken = await versleutel(env, email, { ...k, r: refresh });
    // Vanaf hier is het oude token waardeloos: ook bij een fout het nieuwe token teruggeven.
    try {
      const van = isDatum(b.van) ? b.van : "0000-00-00";
      const tot = isDatum(b.tot) ? b.tot : "9999-99-99";
      const sync = await synchroniseer(env, toegang, id);
      const transacties = [];
      let volgende = `/ponto-connect/accounts/${encodeURIComponent(id)}/transactions?page[limit]=100`;
      let paginas = 0;
      let klaar = false;
      // Ponto geeft de nieuwste transacties eerst; stoppen zodra we vóór "van" zitten.
      while (volgende && paginas < MAX_PAGINAS && !klaar) {
        const data = await ponto(env, volgende, { token: toegang });
        for (const t of data?.data || []) {
          const d = dag(t.attributes?.executionDate || t.attributes?.valueDate);
          if (d < van) { klaar = true; break; }
          if (d <= tot) transacties.push(naarEbVorm(t));
        }
        volgende = data?.links?.next || null;
        paginas += 1;
      }
      let saldi = [];
      try {
        const a = await ponto(env, `/ponto-connect/accounts/${encodeURIComponent(id)}`, { token: toegang });
        const at = a?.data?.attributes || {};
        if (at.currentBalance != null) saldi = [{ balance_type: "CLBD", balance_amount: { amount: String(at.currentBalance), currency: at.currency || "EUR" }, reference_date: dag(at.currentBalanceChangedAt) }];
      } catch { /* saldo is optioneel */ }
      return json({ ok: true, transacties, saldi, onvolledig: !!volgende && !klaar, token: nieuwToken, sync });
    } catch (e) {
      return json({ ok: false, fout: "Ophalen via Ponto mislukt", detail: [e.status, e.message].filter(Boolean).join(" — ").slice(0, 400), token: nieuwToken }, e.status === 429 ? 429 : 502);
    }
  }

  if (pad === "/verwijder" && request.method === "POST") {
    const b = await leesBody(request);
    const k = await ontsleutel(env, email, b.token);
    if (!k?.p) return json({ ok: false, fout: "Koppeling ongeldig of van een andere gebruiker" }, 403);
    try {
      await ponto(env, "/ponto-connect/oauth2/revoke", { method: "POST", form: { token: k.r, client_id: env.PONTO_CLIENT_ID } });
    } catch (e) { if (e.status !== 400 && e.status !== 404) throw e; }
    return json({ ok: true });
  }

  return json({ ok: false, fout: "Onbekende route" }, 404);
}
