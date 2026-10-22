// beide-V1R2 — fase 2: de soort (zakelijk/privé) kiezen bij een nieuw dossier en bewaken bij laden.
// Welke soorten mogen, komt van de Worker (/api/rol → soorten, zie worker/rechten.js).
import { useEffect, useMemo, useState } from "react";
import SoortKeuze from "../components/eenvoudig/SoortKeuze.jsx";
import { SOORTEN, dossierSoort } from "./index.js";

// Soorten waarvoor het account minstens Eenvoudig heeft. Zonder gegevens van de Worker (oudere Worker): alleen zakelijk.
export function beschikbareSoorten(soorten) {
  if (!soorten || typeof soorten !== "object") return ["zakelijk"];
  const lijst = Object.keys(SOORTEN).filter((s) => soorten[s]?.eenvoudig);
  return lijst.length ? lijst : ["zakelijk"];
}

// Mag deze soort Uitgebreid/de bankkoppeling? Zonder soorten van de Worker geldt het accountbrede recht (zoals vóór beide-V1R0).
export const rechtVoorSoort = (soorten, soort, recht, accountRecht) =>
  soorten && typeof soorten === "object" ? !!soorten[dossierSoort(soort)]?.[recht] : !!accountRecht;

export function useDossierSoort({ soorten, soortDossier, setSoortDossier, heeftDossier, setDialog, onNieuwDossier }) {
  const beschikbaar = useMemo(() => beschikbareSoorten(soorten), [soorten]);
  const [verder, setVerder] = useState(null); // wat er na de keuze gebeurt (Eenvoudig/Uitgebreid kiezen)

  // Nieuw dossier: met één soort meteen door, met twee eerst de vraag.
  const startMetSoort = (daarna) => {
    if (beschikbaar.length === 1) { setSoortDossier(beschikbaar[0]); daarna(beschikbaar[0]); return; }
    setVerder(() => daarna);
  };
  const keuze = verder ? (
    <SoortKeuze beschikbaar={beschikbaar}
      onKies={(s) => { const v = verder; setVerder(null); setSoortDossier(s); v(s); }}
      onClose={() => setVerder(null)} />
  ) : null;

  // Geladen of hervat dossier van een soort zonder abonnement: melden, met de weg naar een abonnement of een nieuw dossier.
  const soortBekend = !!soorten && typeof soorten === "object";
  const toegestaan = !soortBekend || beschikbaar.includes(soortDossier);
  useEffect(() => {
    if (toegestaan || !heeftDossier) return;
    const naam = SOORTEN[soortDossier].toLowerCase();
    setDialog({
      title: `Dit is een ${naam} dossier`,
      message: <p>Je account heeft (nog) geen abonnement voor {naam} gebruik, dus dit dossier kun je hier niet gebruiken. Vraag een abonnement aan, of start een nieuw dossier.</p>,
      actions: [
        { label: "Abonnement aanvragen", variant: "primary", onClick: () => { window.location.href = `/aanmelden?soort=${soortDossier}`; } },
        { label: "Nieuw dossier starten", onClick: onNieuwDossier },
      ],
    });
  }, [toegestaan, heeftDossier, soortDossier]); // eslint-disable-line react-hooks/exhaustive-deps

  return { beschikbaar, startMetSoort, keuze, toegestaan, meerdereSoorten: beschikbaar.length > 1 };
}
