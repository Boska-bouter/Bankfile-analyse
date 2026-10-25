// Aanmeldpagina en abonnementenpagina (uit rechten.js gehaald in beide-V1R0).
// - Wie geen toegang heeft en TOEGANG_VERPLICHT aan staat, ziet deze pagina in plaats van de app (status 403).
// - Op /aanmelden ziet iedereen die is ingelogd zijn abonnementen en kan een abonnement aanvragen, ook een tweede
//   (zakelijk naast privé of andersom). Vanuit de app: het kaart-icoon onderin de zijbalk.
// Op zichzelf staand (geen app-bestanden nodig).
import { PLANNEN, plannenVoor, PLAN_UITLEG, GEBRUIK, GEBRUIK_UITLEG, MIN_REDEN, prijzen, prijsTekst, planNaam, niveauVan, esc } from "./rechten.js";

const NIVEAU_PLAN = ["", "eenvoudig", "uitgebreid", "koppelen"];
const nlDatum = (iso) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam" });

// Wat iemand nu heeft, per soort, als leesbare regels (alleen soorten met een abonnement).
function huidigeAbonnementen(r) {
  return Object.keys(GEBRUIK).map((s) => {
    const x = r?.soorten?.[s];
    const n = niveauVan(x);
    if (!n) return x?.verlopen ? `${GEBRUIK[s]}: verlopen${x.geldigTot ? ` op ${nlDatum(x.geldigTot)}` : ""}` : null;
    return `${planNaam(s, NIVEAU_PLAN[n])}${x.geldigTot ? ` (tot en met ${nlDatum(x.geldigTot)})` : ""}`;
  }).filter(Boolean);
}

export function aanmeldPagina(email, r, env = {}, { status = 403, soort = null, plan = null, slot = true } = {}) {
  const prijs = prijzen(env);
  const heeftToegang = !!r?.toegang;
  const huidig = slot ? huidigeAbonnementen(r) : []; // zonder slot heeft iedereen Eenvoudig; dan niets tonen
  const kiesSoort = GEBRUIK[soort] ? soort : null;
  const kiesPlan = plannenVoor(env)[plan] ? plan : "eenvoudig";
  const [voornaam, ...rest] = String(r?.naam || "").trim().split(/\s+/);
  const achternaam = rest.join(" ");
  const soortKeuzes = Object.entries(GEBRUIK).map(([k, v]) => {
    const n = slot ? niveauVan(r?.soorten?.[k]) : 0;
    return `<label class="keuze"><input type="radio" name="gebruik" value="${k}" required${kiesSoort === k ? " checked" : ""}>
      <span><b>${v}</b><small>${esc(GEBRUIK_UITLEG[k])}${n ? ` · je hebt nu ${esc(PLANNEN[NIVEAU_PLAN[n]])}` : ""}</small></span></label>`;
  }).join("");
  const planKeuzes = Object.keys(plannenVoor(env)).map((k) => `
    <label class="keuze"><input type="radio" name="plan" value="${k}"${kiesPlan === k ? " checked" : ""}>
      <span><b>${PLANNEN[k]}</b> <span class="prijs" data-plan="${k}"></span><small data-uitleg="${k}"></small></span></label>`).join("");
  const loopt = r?.aanvraag && PLANNEN[r.aanvraag]
    ? `<p class="melding">Je aanvraag voor <b>${esc(planNaam(r.aanvraagGebruik || "zakelijk", r.aanvraag))}</b> is ontvangen${r.aangevraagd ? ` op ${esc(nlDatum(r.aangevraagd))}` : ""}. Zodra hij is goedgekeurd, krijg je een e-mail${heeftToegang ? "" : " met een knop om in te loggen. Je kunt dit tabblad nu sluiten"}. Wil je toch iets anders aanvragen, kies het dan hieronder; dat vervangt deze aanvraag.</p>`
    : "";
  // Teksten per soort voor het script (prijs, uitleg, voorbeeld bij de reden).
  const perSoort = Object.fromEntries(Object.keys(GEBRUIK).map((s) => [s, {
    prijs: Object.fromEntries(Object.keys(plannenVoor(env)).map((k) => [k, prijsTekst(prijs[s][k])])),
    uitleg: Object.fromEntries(Object.keys(plannenVoor(env)).map((k) => [k, PLAN_UITLEG[s][k].replace(/^./, (c) => c.toUpperCase())])),
    voorbeeld: s === "prive"
      ? "Bijvoorbeeld: ik wil inzicht in de uitgaven van ons huishouden en een indicatie van onze inkomstenbelasting."
      : "Bijvoorbeeld: ik ben zzp'er en wil mijn zakelijke rekening indelen voor de btw-aangifte.",
  }]));
  const titel = heeftToegang ? "Abonnementen" : "Aanmelden voor Bankoverzicht";
  return new Response(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${heeftToegang ? "Abonnementen" : "Aanmelden"} · Bankoverzicht</title>
<style>
:root{--bg:#f6f8f7;--fg:#0f172a;--muted:#475569;--card:#fff;--line:#d8e2de;--accent:#0f766e;--ok:#065f46;--okbg:#ecfdf5;--err:#b42318}
@media (prefers-color-scheme:dark){:root{--bg:#0f1715;--fg:#e4ece9;--muted:#9aaba5;--card:#16211e;--line:#2a3833;--accent:#2fb3a6;--ok:#a7f3d0;--okbg:#0b2b22;--err:#f97066}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,sans-serif}
main{max-width:560px;margin:0 auto;padding:32px 16px;display:flex;flex-direction:column;gap:16px}
h1{margin:0;font-size:1.4rem}h2{margin:4px 0 0;font-size:1rem}.sub{margin:0;color:var(--muted)}
form,.melding,.huidig{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
form{display:flex;flex-direction:column;gap:10px}.huidig ul{margin:6px 0 0;padding-left:20px}
fieldset{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}legend{font-weight:600;margin-bottom:8px}
.keuze{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);border-radius:10px;padding:10px;cursor:pointer}
.keuze:has(input:checked){border-color:var(--accent)}
.keuze small{display:block;color:var(--muted)}.prijs{color:var(--accent);font-weight:600;font-size:13px}
.soorten{display:grid;grid-template-columns:1fr 1fr;gap:8px}@media (max-width:420px){.soorten{grid-template-columns:1fr}}
textarea{font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg);resize:vertical}
.namen{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media (max-width:420px){.namen{grid-template-columns:1fr}}
.hint{display:block;color:var(--muted);font-size:13px;margin-top:4px}
input[type=text]{font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg)}
button{font:inherit;font-weight:600;background:var(--accent);color:#fff;border:0;border-radius:8px;padding:10px 16px;cursor:pointer;align-self:flex-start}
button[disabled]{opacity:.6}.melding{background:var(--okbg);color:var(--ok)}#status.err{color:var(--err)}
[hidden]{display:none!important}a{color:var(--accent)}
</style></head><body><main>
<h1>${titel}</h1>
<p class="sub">Je bent ingelogd als <b>${esc(email)}</b>. ${heeftToegang
    ? "Hier zie je je abonnementen en kun je er een aanvragen, bijvoorbeeld privé naast zakelijk. De beheerder keurt de aanvraag goed en je krijgt daarover een e-mail."
    : "Kies of je Bankoverzicht zakelijk of privé gebruikt, kies een abonnement en vertel kort waarom je toegang vraagt. De beheerder keurt je aanmelding goed en je krijgt daarover een e-mail."}</p>
${huidig.length ? `<div class="huidig"><b>Je abonnementen</b><ul>${huidig.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></div>` : ""}
${loopt}
<form id="f">
<fieldset><legend>Waarvoor gebruik je Bankoverzicht? (verplicht)</legend><div class="soorten">${soortKeuzes}</div></fieldset>
<fieldset id="plannen"${kiesSoort ? "" : " hidden"}><legend>Abonnement</legend>${planKeuzes}</fieldset>
<div class="namen"><label>Voornaam<br><input type="text" name="voornaam" required maxlength="60" autocomplete="given-name" value="${esc(voornaam || "")}" style="width:100%;box-sizing:border-box"></label>
<label>Achternaam<br><input type="text" name="achternaam" required maxlength="80" autocomplete="family-name" value="${esc(achternaam)}" style="width:100%;box-sizing:border-box"></label></div>
<label>Waarom vraag je toegang aan? (verplicht)<br><textarea name="reden" required minlength="${MIN_REDEN}" maxlength="1000" rows="4" style="width:100%;box-sizing:border-box"></textarea>
<small class="hint">Vertel kort wie je bent en waarvoor je de app wilt gebruiken. Zonder duidelijke reden kan ik je aanvraag niet goedkeuren.</small></label>
<button type="submit">${heeftToegang ? "Aanvraag versturen" : "Aanmelding versturen"}</button>
<p id="status" role="status"></p>
</form>
<p class="sub">${heeftToegang ? `<a href="/">Terug naar de app</a> · ` : ""}Ander e-mailadres? <a href="/uitloggen">Uitloggen</a></p>
</main><script>
const T=${JSON.stringify(perSoort).replace(/</g, "\\u003c")},TOEGANG=${heeftToegang ? "true" : "false"};
const f=document.getElementById("f"),st=document.getElementById("status"),pl=document.getElementById("plannen");
function soortGekozen(){const s=f.gebruik.value;if(!T[s])return;pl.hidden=false;
for(const e of f.querySelectorAll("[data-plan]"))e.textContent=T[s].prijs[e.dataset.plan];
for(const e of f.querySelectorAll("[data-uitleg]"))e.textContent=T[s].uitleg[e.dataset.uitleg];
f.reden.placeholder=T[s].voorbeeld}
for(const r of f.querySelectorAll("input[name=gebruik]"))r.addEventListener("change",soortGekozen);
soortGekozen();
f.addEventListener("submit",async(e)=>{e.preventDefault();if(!T[f.gebruik.value]){st.className="err";st.textContent="Kies eerst zakelijk of privé.";return}
const k=f.querySelector("button");k.disabled=true;st.className="";st.textContent="Bezig…";
try{const r=await fetch("/api/aanmelden",{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify({gebruik:f.gebruik.value,plan:f.plan.value,voornaam:f.voornaam.value,achternaam:f.achternaam.value,reden:f.reden.value})});
const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.fout||("Fout "+r.status));
if(d.alActief){st.textContent=d.melding||"Dit abonnement heb je al.";return}
st.textContent=TOEGANG?"Je aanvraag is verstuurd. Je krijgt een e-mail zodra de beheerder hem heeft beoordeeld.":"Je aanmelding is verstuurd. Je krijgt een e-mail zodra de beheerder hem heeft beoordeeld. Je kunt dit tabblad daarna sluiten.";setTimeout(()=>location.reload(),2500)}
catch(x){st.className="err";st.textContent="Versturen lukte niet: "+x.message}finally{k.disabled=false}});
</script></body></html>`, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
