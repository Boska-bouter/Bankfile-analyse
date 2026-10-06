// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";


export function useAangifteOpenPunten(p) {
  const {
    activeYear, ibStatus, rechtsvorm, vpbStatus, yearlyProgress,
    zvwStatus,
  } = p;

  return useMemo(() => {
    if (!activeYear) return [];
    const items = [];
    if (yearlyProgress[activeYear]?.status === "rood") {
      items.push("Saldo tussen twee bestanden sluit dit jaar niet aan");
    }
    // v285 — een BV kent geen IB/Zvw (alleen Vpb) — zie ook yearlyProgress/werkelijkAangifteChecks.
    if (rechtsvorm === "bv") {
      if (!vpbStatus[activeYear]?.gedaan) items.push("Vpb-aangifte nog niet afgevinkt als gedaan");
    } else {
      if (!ibStatus[activeYear]?.gedaan) items.push("IB/IH nog niet afgevinkt als gedaan");
      if (!zvwStatus[activeYear]?.gedaan) items.push("Zvw nog niet afgevinkt als gedaan");
    }
    return items;
  }, [activeYear, yearlyProgress, ibStatus, zvwStatus, vpbStatus, rechtsvorm]);
}
