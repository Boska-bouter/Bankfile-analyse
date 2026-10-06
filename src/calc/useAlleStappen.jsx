// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";


export function useAlleStappen(p) {
  const {
    inTeStellenItems, stapVolgorde, teControlerenItems,
  } = p;

  return useMemo(() => {
    const lijst = [...teControlerenItems, ...inTeStellenItems];
    const rang = (k) => { const i = stapVolgorde.indexOf(k); return i === -1 ? 99 : i; };
    return lijst.map((it, idx) => ({ it, idx })).sort((a, b) => rang(a.it.key) - rang(b.it.key) || a.idx - b.idx).map((x) => x.it);
  }, [teControlerenItems, inTeStellenItems]);
}
