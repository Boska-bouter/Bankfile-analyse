import { RefreshCw } from "lucide-react";

// Verschijnt zodra useVersionCheck ziet dat er een nieuwere build op de server staat. Een gewone
// window.location.reload() bleek op iOS Safari — met name bij een bladwijzer op het beginscherm
// ("aan beginscherm toevoegen") — niet betrouwbaar door de cache heen te breken: de pagina meldde
// een nieuwere versie, maar bleef daarna toch de oude JavaScript draaien totdat de bladwijzer
// volledig werd verwijderd en opnieuw aangemaakt. Navigeren naar de eigen URL mét een vers
// tijdstempel als query-parameter dwingt de browser om dit als een nieuwe, nog niet gecachte
// aanvraag te behandelen — dat werkt breed betrouwbaarder dan reload() alleen.
export default function UpdateAvailableBanner() {
  const bijwerken = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("_v", Date.now().toString());
    window.location.replace(url.toString());
  };
  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-2 z-[90] rounded-lg border border-amber-300 bg-amber-50 shadow-lg px-4 py-2.5 flex items-center gap-3 max-w-[calc(100vw-1.5rem)]">
      <p className="text-xs text-amber-900">Er is een nieuwere versie van deze tool beschikbaar.</p>
      <button
        onClick={bijwerken}
        className="inline-flex items-center gap-1.5 shrink-0 rounded-md bg-amber-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Nu bijwerken
      </button>
    </div>
  );
}
