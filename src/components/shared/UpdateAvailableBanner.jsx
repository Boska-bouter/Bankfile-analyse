import { RefreshCw } from "lucide-react";

// Verschijnt zodra useVersionCheck ziet dat er een nieuwere build op de server staat. Eén klik op
// "Nu bijwerken" haalt gewoon een verse pagina op (window.location.reload) — dat lost hetzelfde
// probleem op als het legen van de browsercache, alleen hoeft de gebruiker daar niets voor te
// weten of te doen.
export default function UpdateAvailableBanner() {
  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-2 z-[90] rounded-lg border border-amber-300 bg-amber-50 shadow-lg px-4 py-2.5 flex items-center gap-3 max-w-[calc(100vw-1.5rem)]">
      <p className="text-xs text-amber-900">Er is een nieuwere versie van deze tool beschikbaar.</p>
      <button
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-1.5 shrink-0 rounded-md bg-amber-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Nu bijwerken
      </button>
    </div>
  );
}
