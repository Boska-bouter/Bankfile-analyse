// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";


export function useAangifteOpenPunten(p) {
  const {
    activeYear, ibStatus, rechtsvorm, vpbStatus, yearlyProgress,
    zvwStatus, prive = false,
  } = p;

  return useMemo(() => {
    if (!activeYear) return [];
    const items = [];
    if (yearlyProgress[activeYear]?.status === "rood") {
      items.push("Saldo tussen twee bestanden sluit dit jaar niet aan");
    }
    // v285 — een BV kent geen IB/Zvw (alleen Vpb) — zie ook yearlyProgress/werkelijkAangifteChecks.
    // beide-V1R8 — privédossier: alleen de aangifte inkomstenbelasting (geen IH/Zvw/Vpb).
    if (prive) {
      if (!ibStatus[activeYear]?.gedaan) items.push("Aangifte inkomstenbelasting nog niet afgevinkt als gedaan");
    } else if (rechtsvorm === "bv") {
      if (!vpbStatus[activeYear]?.gedaan) items.push("Vpb-aangifte nog niet afgevinkt als gedaan");
    } else {
      if (!ibStatus[activeYear]?.gedaan) items.push("IB/IH nog niet afgevinkt als gedaan");
      if (!zvwStatus[activeYear]?.gedaan) items.push("Zvw nog niet afgevinkt als gedaan");
    }
    return items;
  }, [activeYear, yearlyProgress, ibStatus, zvwStatus, vpbStatus, rechtsvorm, prive]);
}
