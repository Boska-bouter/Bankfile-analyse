// nieuw-V10R0 — Boska 23-11: de voorlopige aanslag (IB/PVV en Zvw) gaat af van de uitkomst van de indicatieve berekening.
// Per jaar: { ib, zvw, betaald, betaaldZvw }. Bedrag positief = te betalen aan de Belastingdienst, negatief = terug te krijgen
// (voorlopige teruggaaf). betaald(Zvw): true = betaald/ontvangen, false = nog niet, ontbreekt = niet ingevuld.
const st = (x) => (x === true ? true : x === false ? false : null);
export function voorlopigVoorJaar(alle, jaar) {
  const v = alle?.[jaar] ?? alle?.[String(jaar)];
  if (!v) return null;
  const ib = Number(v.ib) || 0, zvw = Number(v.zvw) || 0;
  if (Math.abs(ib) < 0.5 && Math.abs(zvw) < 0.5) return null;
  return { ib, zvw, totaal: ib + zvw, betaald: st(v.betaald), betaaldZvw: st(v.betaaldZvw) };
}

// Regels voor onder "Totaal te betalen". definitief = totaal volgens de berekening (positief = te betalen).
// rest = wat er bij de definitieve aanslag overblijft; open = wat van de voorlopige aanslag nog betaald (+) of ontvangen (−) moet worden.
export function voorlopigRegels(definitief, v) {
  if (!v) return null;
  const regels = [];
  const lbl = (soort, b) => b < 0 ? `Al teruggegeven met de voorlopige aanslag ${soort} (teruggaaf)` : `Al opgelegd met de voorlopige aanslag ${soort}`;
  if (Math.abs(v.ib) >= 0.5) regels.push({ label: lbl("inkomstenbelasting/premie volksverzekeringen", v.ib), bedrag: -v.ib });
  if (Math.abs(v.zvw) >= 0.5) regels.push({ label: lbl("Zvw", v.zvw), bedrag: -v.zvw });
  const rest = definitief - v.totaal;
  const slot = { label: Math.abs(rest) < 0.5 ? "Bij de definitieve aanslag: ongeveer niets bij of terug" : rest > 0 ? "Nog bij te betalen bij de definitieve aanslag" : "Terug te krijgen bij de definitieve aanslag", bedrag: Math.abs(rest) };
  const open = (v.betaald === false ? v.ib : 0) + (v.betaaldZvw === false ? v.zvw : 0);
  const openRegel = Math.abs(open) >= 0.5 ? { label: open > 0 ? "Daarnaast eerst nog te betalen op de voorlopige aanslag" : "Daarnaast nog te ontvangen van de voorlopige aanslag", bedrag: Math.abs(open) } : null;
  const onbekend = (Math.abs(v.ib) >= 0.5 && v.betaald == null) || (Math.abs(v.zvw) >= 0.5 && v.betaaldZvw == null);
  const noot = onbekend ? "Niet bij alle bedragen aangegeven of de voorlopige aanslag al is betaald of ontvangen. Hierboven is aangenomen dat dat zo is." : "";
  return { regels, rest, slot, open, openRegel, noot };
}
