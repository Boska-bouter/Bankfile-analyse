import { useSyncExternalStore } from "react";
import { getToonFijn, subscribeToonFijn } from "../classification/categories.js";

// V82 — herrendert de component zodra de schakelaar "fijne categorieën tonen" omgaat.
export function useToonFijn() {
  return useSyncExternalStore(subscribeToonFijn, getToonFijn, getToonFijn);
}
