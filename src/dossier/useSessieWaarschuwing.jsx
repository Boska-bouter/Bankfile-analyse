import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

// release32V1 — waarschuwing voor het einde van de Cloudflare-inlogsessie. De Worker geeft op /api/sessie het
// verlooptijdstip uit het Access-inlogbewijs terug (getest: gelijk aan de in Cloudflare ingestelde sessieduur).
// 10 minuten voor het einde: gele balk; daarna: rode balk. Lukt het opvragen niet (offline, lokaal), dan niets.
// release32V6 — na het verlopen vernieuwt Cloudflare de sessie bij herladen meestal zonder inlogscherm (zolang de
// algemene Cloudflare-sessie nog geldt). Daarom "Sessie vernieuwen". Mislukt intussen het ophalen van een
// onderdeel (Excel) of het versturen van feedback, dan meldt de app dat ook als verlopen sessie.
const WAARSCHUW_MS = 10 * 60 * 1000;
const OPVRAGEN_MS = 5 * 60 * 1000;
const EVENT = "bankoverzicht:sessie-verlopen";

async function haalVerloop() {
  try {
    const r = await fetch("/api/sessie?json", { cache: "no-store", credentials: "same-origin", redirect: "manual" });
    if (!r.ok || !(r.headers.get("content-type") || "").includes("application/json")) return null;
    const d = await r.json();
    const exp = d?.header?.exp || d?.cookie?.exp;
    return exp ? exp * 1000 : null;
  } catch {
    return null;
  }
}

// Is de sessie verlopen? true = Cloudflare stuurt door naar het inlogscherm; false = bereikbaar; null = onbekend
// (offline of lokaal zonder Worker).
export async function sessieVerlopen() {
  try {
    const r = await fetch("/api/sessie?json", { cache: "no-store", credentials: "same-origin", redirect: "manual" });
    if (r.type === "opaqueredirect" || (r.status >= 300 && r.status < 400) || r.status === 401 || r.status === 403) return true;
    if (r.ok && (r.headers.get("content-type") || "").includes("application/json")) return false;
    return null;
  } catch {
    return null;
  }
}

export function meldSessieVerlopen() {
  try { window.dispatchEvent(new Event(EVENT)); } catch { /* ignore */ }
}

const isLaadfout = (e) => /dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to fetch|Load failed/i.test(String(e?.message || e || ""));

export function useSessieWaarschuwing() {
  const [verloopt, setVerloopt] = useState(null); // ms sinds epoch
  const [nu, setNu] = useState(() => Date.now());
  const [weggeklikt, setWeggeklikt] = useState(null); // verlooptijd waarvoor de gele balk is weggeklikt
  const [geblokkeerd, setGeblokkeerd] = useState(false); // een verzoek werd door Cloudflare tegengehouden
  const laatst = useRef(0);

  useEffect(() => {
    let weg = false;
    const vraag = async () => {
      laatst.current = Date.now();
      const v = await haalVerloop();
      if (!weg && v) setVerloopt(v);
    };
    vraag();
    const tik = setInterval(() => {
      setNu(Date.now());
      if (Date.now() - laatst.current >= OPVRAGEN_MS) vraag();
    }, 30 * 1000);
    const zichtbaar = () => { if (document.visibilityState === "visible") { setNu(Date.now()); vraag(); } };
    const gemeld = () => setGeblokkeerd(true);
    // Een onderdeel (bijv. Excel) dat niet geladen kan worden: controleer of de sessie verlopen is.
    let bezig = false;
    const laadfout = async (e) => {
      const fout = e?.reason || e?.payload || e?.error || e;
      if (e?.type !== "vite:preloadError" && !isLaadfout(fout)) return;
      if (bezig) return;
      bezig = true;
      const v = await sessieVerlopen();
      bezig = false;
      if (v && !weg) {
        setGeblokkeerd(true);
        window.alert("Je inlogsessie is verlopen; daardoor kon dit niet worden geladen.\n\nKlik bovenaan op \"Sessie vernieuwen\" en probeer het daarna opnieuw. Je gegevens blijven bewaard.");
      }
    };
    document.addEventListener("visibilitychange", zichtbaar);
    window.addEventListener(EVENT, gemeld);
    window.addEventListener("unhandledrejection", laadfout);
    window.addEventListener("vite:preloadError", laadfout);
    return () => {
      weg = true; clearInterval(tik);
      document.removeEventListener("visibilitychange", zichtbaar);
      window.removeEventListener(EVENT, gemeld);
      window.removeEventListener("unhandledrejection", laadfout);
      window.removeEventListener("vite:preloadError", laadfout);
    };
  }, []);

  if (geblokkeerd) return { status: "verlopen", verloopt: verloopt && verloopt <= nu ? verloopt : null };
  if (!verloopt) return { status: null };
  const rest = verloopt - nu;
  if (rest <= 0) return { status: "verlopen", verloopt };
  if (rest <= WAARSCHUW_MS && weggeklikt !== verloopt) return { status: "bijna", verloopt, rest, wegklikken: () => setWeggeklikt(verloopt) };
  return { status: null };
}

const tijd = (ms) => new Date(ms).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

// opgeslagenOm: tijdstip (Date) van het laatst opgeslagen dossierbestand, alleen als er sindsdien niets is gewijzigd.
export function SessieBalk({ sessie, onOpslaan, kanOpslaan, opgeslagenOm = null }) {
  if (!sessie?.status) return null;
  const opgeslagen = kanOpslaan && opgeslagenOm;
  if (sessie.status === "bijna") {
    const min = Math.max(1, Math.ceil(sessie.rest / 60000));
    return (
      <div className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${opgeslagen ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
        {opgeslagen ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />}
        <p className="flex-1 min-w-[14rem]">
          {opgeslagen
            ? <>Dossier opgeslagen om <strong>{tijd(+opgeslagenOm)}</strong>. Je inlogsessie verloopt om <strong>{tijd(sessie.verloopt)}</strong> (nog {min} min).</>
            : <>Je inlogsessie verloopt om <strong>{tijd(sessie.verloopt)}</strong> (nog {min} min). Sla je dossier op; daarna moet je de sessie vernieuwen.</>}
        </p>
        {kanOpslaan && !opgeslagen && <button type="button" onClick={onOpslaan} className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700">Dossier opslaan</button>}
        <button type="button" onClick={sessie.wegklikken} className={`shrink-0 rounded-lg p-1.5 ${opgeslagen ? "text-emerald-700 hover:bg-emerald-100" : "text-amber-700 hover:bg-amber-100"}`} title="Verbergen"><X className="h-4 w-4" /></button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm">
      <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
      <p className="flex-1 min-w-[14rem]">
        Je inlogsessie is verlopen{sessie.verloopt ? ` (om ${tijd(sessie.verloopt)})` : ""}. Klik op <strong>Sessie vernieuwen</strong> om verder te werken; meestal hoef je niet opnieuw in te loggen. Je gegevens blijven in deze browser bewaard.
        {opgeslagen && <> Dossier opgeslagen om {tijd(+opgeslagenOm)}.</>}
      </p>
      {kanOpslaan && !opgeslagen && <button type="button" onClick={onOpslaan} className="shrink-0 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100">Dossier opslaan</button>}
      <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800">Sessie vernieuwen</button>
    </div>
  );
}
