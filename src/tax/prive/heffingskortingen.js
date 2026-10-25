// beide-V1R8 (fase 5) — heffingskortingen voor een privépersoon. Algemene heffingskorting en arbeidskorting
// uit incomeTax.js; voor AOW-gerechtigden ongeveer de helft daarvan plus de ouderenkorting.
import { computeAlgemeneHeffingskorting, computeArbeidskorting } from "../incomeTax.js";
import { priveTarief, AOW_KORTING_FACTOR } from "./tarieven.js";

export function ouderenkorting(inkomen, jaar) {
  const o = priveTarief("ouderen", jaar).waarde;
  if (!(inkomen > 0)) return o.max;
  return Math.max(0, o.max - Math.max(0, inkomen - o.grens) * (o.afbouwPct / 100));
}

// inkomen = belastbaar inkomen (grondslag afbouw), arbeid = loon (voor de arbeidskorting).
export function heffingskortingen({ inkomen, arbeid = 0, aow = false }, jaar) {
  const f = aow ? AOW_KORTING_FACTOR : 1;
  const algemeen = computeAlgemeneHeffingskorting(Math.max(0, inkomen), jaar) * f;
  const arbeidskorting = arbeid > 0 ? computeArbeidskorting(arbeid, jaar) * f : 0;
  const ouderen = aow ? ouderenkorting(Math.max(0, inkomen), jaar) : 0;
  return { algemeen, arbeidskorting, ouderen, totaal: algemeen + arbeidskorting + ouderen };
}
