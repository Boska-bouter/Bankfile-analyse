// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";


export function useBelastingTotaalJaar(p) {
  const {
    activeYear, dashboardAangifteIndicatie, dashboardVpbIndicatie, korRegeling, quarterlyBtwData,
    rechtsvorm,
  } = p;

  return useMemo(() => {
    if (!activeYear) return null;
    const btw = korRegeling ? 0 : [1, 2, 3, 4].reduce((acc, k) => {
      const q = quarterlyBtwData.find((item) => item.kwartaal === k);
      return acc + (q ? q.verschuldigdBtw21 + q.verschuldigdBtw9 - q.voorbelasting + (q.btwPrivegebruikAuto || 0) : 0);
    }, 0);
    let delen = [{ label: "BTW", bedrag: btw }];
    if (rechtsvorm === "bv") {
      if (!dashboardVpbIndicatie) return null;
      delen.push({ label: "Vpb", bedrag: dashboardVpbIndicatie.belasting || 0 });
    } else {
      if (!dashboardAangifteIndicatie) return null;
      const hk = dashboardAangifteIndicatie.heffingskortingen?.totaal || 0;
      delen.push({ label: "IB (na heffingskorting)", bedrag: Math.max(0, (dashboardAangifteIndicatie.ib?.belasting || 0) - hk) });
      delen.push({ label: "Zvw", bedrag: dashboardAangifteIndicatie.zvw?.bijdrage || 0 });
    }
    return { delen, totaal: delen.reduce((a, d) => a + d.bedrag, 0) };
  }, [activeYear, korRegeling, quarterlyBtwData, rechtsvorm, dashboardVpbIndicatie, dashboardAangifteIndicatie]);
}
