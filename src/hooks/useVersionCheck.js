import { useEffect, useState } from "react";

// __BUILD_ID__ wordt door Vite (zie vite.config.js) bij het bouwen vervangen door een vaste
// tijdstempel-string — dezelfde stempel staat ook in version.json op de server. Verschillen die
// twee, dan draait de gebruiker een oudere build dan wat er nu online staat.
const CURRENT_BUILD_ID = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : null;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // elke 5 minuten, en steeds als het tabblad weer actief wordt

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!CURRENT_BUILD_ID) return; // bijv. lokale dev-server zonder Vite-build — niets te checken
    let cancelled = false;

    const check = async () => {
      try {
        const base = import.meta.env.BASE_URL || "/";
        const res = await fetch(`${base}version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.buildId && data.buildId !== CURRENT_BUILD_ID) setUpdateAvailable(true);
      } catch {
        // geen internet / server niet bereikbaar — gewoon opnieuw proberen bij de volgende cyclus
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return { updateAvailable };
}
