// beide-V1R9 — akkoord met de gebruiksvoorwaarden per soort (zakelijk/privé). Uit App.jsx gehaald; voor zakelijk precies
// het oude gedrag (nieuw-V2R3: per e-mailadres per apparaat; nieuw-V5R9: ook op de server, zodat het niet verloren gaat
// als de browseropslag leeg is). Welke soorten nodig zijn, volgt uit de abonnementen van het account.
import { useEffect, useMemo, useState } from "react";
import { VOORWAARDEN_VERSIE, VOORWAARDEN_SLEUTEL } from "../content/voorwaarden.jsx";
import { VOORWAARDEN_PRIVE_VERSIE, VOORWAARDEN_PRIVE_SLEUTEL } from "../content/voorwaardenPrive.jsx";
import { beschikbareSoorten } from "../modus/useDossierSoort.jsx";

export const VOORWAARDEN_PER_SOORT = {
  zakelijk: { versie: VOORWAARDEN_VERSIE, sleutel: VOORWAARDEN_SLEUTEL },
  prive: { versie: VOORWAARDEN_PRIVE_VERSIE, sleutel: VOORWAARDEN_PRIVE_SLEUTEL },
};

const lees = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

export function useVoorwaarden({ email, rolStatus, soorten, server = {} }) {
  const nodig = useMemo(() => beschikbareSoorten(soorten), [soorten]);
  const sleutel = (soort) => (email ? `${VOORWAARDEN_PER_SOORT[soort].sleutel}:${email}` : VOORWAARDEN_PER_SOORT[soort].sleutel);
  const [tik, setTik] = useState(0);
  const [akkoordNu, setAkkoordNu] = useState([]);
  const lokaal = useMemo(
    () => Object.fromEntries(Object.keys(VOORWAARDEN_PER_SOORT).map((s) => [s, lees(sleutel(s)) === VOORWAARDEN_PER_SOORT[s].versie])),
    [email, tik], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const opServer = (s) => !!email && server[s] === VOORWAARDEN_PER_SOORT[s].versie;
  const ontbrekend = nodig.filter((s) => !lokaal[s] && !akkoordNu.includes(s) && !opServer(s));

  const meld = (s) => {
    if (!email) return;
    fetch("/api/voorwaarden", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ versie: VOORWAARDEN_PER_SOORT[s].versie, soort: s }) }).catch(() => {});
  };
  // Lokaal akkoord dat de server nog niet kent, wordt alsnog doorgegeven.
  useEffect(() => {
    if (rolStatus === "laden" || !email) return;
    for (const s of nodig) if (lokaal[s] && !opServer(s)) meld(s);
  }, [rolStatus, email, nodig, lokaal, server.zakelijk, server.prive]); // eslint-disable-line react-hooks/exhaustive-deps

  const akkoord = () => {
    for (const s of ontbrekend) {
      try { localStorage.setItem(sleutel(s), VOORWAARDEN_PER_SOORT[s].versie); } catch { /* geen opslag: de server onthoudt het */ }
      meld(s);
    }
    setAkkoordNu((p) => [...p, ...ontbrekend]);
    setTik((t) => t + 1);
  };
  return { ok: ontbrekend.length === 0, ontbrekend, akkoord };
}
