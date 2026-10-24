// beide-V4R9 / zakelijk-V9R1 — rustige achtergrond op de welkomstpagina (variant D, wens Boska 24-10):
// zachte groene band bovenaan en langzaam scrollende, verzonnen afschriftregels met een gekleurde stip per categorie.
// Weghalen: dit bestand verwijderen en in inloggen.js de import en ${WELKOM_ACHTERGROND} weghalen.

// Draait in de browser; wordt als tekst in de pagina gezet.
function decor() {
  const c = document.getElementById("decor"), x = c.getContext("2d");
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  // Categorie: 0 inkomsten, 1 boodschappen, 2 vaste lasten, 3 sparen. Bedragen en datums zijn verzonnen.
  const omschr = [["Albert Heijn 1403", 1], ["Salaris oktober", 0], ["Eneco energie", 2], ["NS Reizigers", 2], ["Belastingdienst", 0], ["Huur november", 2], ["Zorgverzekering CZ", 2], ["Spaarrekening", 3], ["Bol.com", 1], ["Tikkie terugbetaling", 0], ["Ziggo internet", 2], ["Jumbo", 1], ["Pensioenfonds", 0], ["Kruidvat", 1], ["Vattenfall", 2], ["Beleggen Meesman", 3], ["Coolblue", 1], ["Huurtoeslag", 0]];
  let r = 7;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const regels = [];
  for (let i = 0; i < 60; i++) {
    const [o, k] = omschr[Math.floor(rnd() * omschr.length)];
    const plus = k === 0;
    const bedrag = (plus ? 400 + rnd() * 2600 : 5 + rnd() * 180).toFixed(2).replace(".", ",");
    const d = String(1 + Math.floor(rnd() * 28)).padStart(2, "0") + "-" + String(1 + Math.floor(rnd() * 12)).padStart(2, "0");
    regels.push({ d, o, k, b: (plus ? "+ " : "− ") + "€ " + bedrag, plus });
  }
  let w, h, y0 = 0;
  const LH = 30;
  function maat() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = innerWidth; h = innerHeight; c.width = w * dpr; c.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function teken() {
    x.clearRect(0, 0, w, h);
    x.font = "13px ui-monospace,SFMono-Regular,Menlo,monospace";
    // Breed scherm: twee kolommen naast de inhoud. Smal: één vage kolom over de hele breedte.
    const zij = (w - 1080) / 2 - 40, ruim = zij >= 220, f = ruim ? 1 : 0.45, kb0 = Math.min(360, zij);
    const kolommen = ruim ? [[24, kb0], [w - kb0 - 24, kb0]] : [[16, w - 32]];
    const reg = css("--regel"), plus = css("--plus"), min = css("--min"), kl = [css("--k1"), css("--k2"), css("--k3"), css("--k4")];
    kolommen.forEach(([kx, kb], ki) => {
      for (let i = -1; i < h / LH + 2; i++) {
        const n = Math.floor(y0 / LH + i + ki * 17), g = regels[((n % 60) + 60) % 60], y = i * LH - (y0 % LH) + 20;
        x.fillStyle = "rgba(" + reg + "," + 0.1 * f + ")"; x.fillRect(kx, y + 9, kb, 1);
        x.beginPath(); x.arc(kx + 4, y - 4, 3.2, 0, 7); x.fillStyle = "rgba(" + kl[g.k] + "," + 0.55 * f + ")"; x.fill();
        x.fillStyle = "rgba(" + min + "," + 0.22 * f + ")"; x.fillText(g.d, kx + 14, y);
        if (kb > 330) x.fillText(g.o, kx + 70, y);
        x.fillStyle = g.plus ? "rgba(" + plus + "," + 0.4 * f + ")" : "rgba(" + min + "," + 0.22 * f + ")";
        x.fillText(g.b, kx + kb - x.measureText(g.b).width, y);
      }
    });
  }
  const stil = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let vorige = 0;
  function loop(t) { if (vorige) y0 += (t - vorige) * 0.012; vorige = t; teken(); requestAnimationFrame(loop); }
  maat();
  addEventListener("resize", () => { maat(); teken(); });
  if (stil) teken(); else requestAnimationFrame(loop);
}

export const WELKOM_ACHTERGROND = `<style>
:root{--band:#e6f2ef;--regel:15,118,110;--plus:6,95,70;--min:71,85,105;--k1:15,118,110;--k2:217,119,6;--k3:79,70,229;--k4:6,95,70}
@media (prefers-color-scheme:dark){:root{--band:#13211e;--regel:47,179,166;--plus:110,231,183;--min:154,171,165;--k1:47,179,166;--k2:251,191,36;--k3:165,180,252;--k4:110,231,183}}
html,body{min-height:100%}
body{position:relative;isolation:isolate;background:linear-gradient(var(--band),var(--bg) 640px) no-repeat,var(--bg)}
main{position:relative;z-index:1}
#decor{position:fixed;inset:0;z-index:0;pointer-events:none;display:block;width:100%;height:100%;-webkit-mask-image:linear-gradient(transparent,#000 12%,#000 80%,transparent);mask-image:linear-gradient(transparent,#000 12%,#000 80%,transparent)}
</style>
<canvas id="decor" aria-hidden="true"></canvas>
<script>(${decor})()</script>`;
