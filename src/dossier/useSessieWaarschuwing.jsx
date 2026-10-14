import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

// release32V1 — waarschuwing voor het einde van de Cloudflare-inlogsessie. De Worker geeft op /api/sessie het
// verlooptijdstip uit het Access-inlogbewijs terug (getest: gelijk aan de in Cloudflare ingestelde sessieduur).
// 10 minuten voor het einde: gele balk; daarna: rode balk. Lukt het opvragen niet (offline, lokaal), dan niets.
const WAARSCHUW_MS = 10 * 60 * 1000;
const OPVRAGEN_MS = 5 * 60 * 1000;

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

export function useSessieWaarschuwing() {
  const [verloopt, setVerloopt] = useState(null); // ms sinds epoch
  const [nu, setNu] = useState(() => Date.now());
  const [weggeklikt, setWeggeklikt] = useState(null); // verlooptijd waarvoor de gele balk is weggeklikt
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
    document.addEventListener("visibilitychange", zichtbaar);
    return () => { weg = true; clearInterval(tik); document.removeEventListener("visibilitychange", zichtbaar); };
  }, []);

  if (!verloopt) return { status: null };
  const rest = verloopt - nu;
  if (rest <= 0) return { status: "verlopen", verloopt };
  if (rest <= WAARSCHUW_MS && weggeklikt !== verloopt) return { status: "bijna", verloopt, rest, wegklikken: () => setWeggeklikt(verloopt) };
  return { status: null };
}

const tijd = (ms) => new Date(ms).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

export function SessieBalk({ sessie, onOpslaan, kanOpslaan }) {
  if (!sessie?.status) return null;
  if (sessie.status === "bijna") {
    const min = Math.max(1, Math.ceil(sessie.rest / 60000));
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
        <p className="flex-1 min-w-[14rem]">
          Je inlogsessie verloopt om <strong>{tijd(sessie.verloopt)}</strong> (nog {min} min). Sla je dossier op; daarna moet je opnieuw inloggen.
        </p>
        {kanOpslaan && <button type="button" onClick={onOpslaan} className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700">Dossier opslaan</button>}
        <button type="button" onClick={sessie.wegklikken} className="shrink-0 rounded-lg p-1.5 text-amber-700 hover:bg-amber-100" title="Verbergen"><X className="h-4 w-4" /></button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm">
      <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
      <p className="flex-1 min-w-[14rem]">
        Je inlogsessie is verlopen (om {tijd(sessie.verloopt)}). Je gegevens staan veilig in deze browser; na opnieuw inloggen ga je verder met "Verder met dit dossier".
      </p>
      {kanOpslaan && <button type="button" onClick={onOpslaan} className="shrink-0 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100">Dossier opslaan</button>}
      <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800">Opnieuw inloggen</button>
    </div>
  );
}
