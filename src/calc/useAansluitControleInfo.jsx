// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import { eur } from "../utils/amounts.js";

// Sleutel waaronder een toegelichte (bekende) niet-gekoppelde overboeking in bevestigdeControles staat.
// Bewust géén tx.id (een teller die per keer laden kan verschuiven) maar datum + bedrag + tegenrekening/naam.
export function onverklaardSleutel(tx, kant) {
  const d = tx.date instanceof Date ? tx.date.toISOString().slice(0, 10) : String(tx.date || "");
  return `onverklaard|${kant}|${d}|${Math.round(tx.amount * 100)}|${tx.counterpartyIban || tx.counterparty || ""}`;
}

export function useAansluitControleInfo(p) {
  const {
    priGroupForYear, priveRekeningGeladen, zakGroupForYear, zakelijkRekeningGeladen, toegelicht = {},
  } = p;

  return useMemo(() => {
    const isZakTransferCat = (c) => c === "Privé opnames" || c === "Terugboeking van privé";
    const isPriTransferCat = (c) => c === "Ontvangen van zakelijk" || c === "Terugboeking naar zakelijk";
    const zakSum = zakGroupForYear.items.filter((t) => isZakTransferCat(t.category)).reduce((a, t) => a + t.amount, 0);
    const priSum = priGroupForYear.items.filter((t) => isPriTransferCat(t.category)).reduce((a, t) => a + t.amount, 0);
    const diff = Math.round((zakSum + priSum) * 100) / 100;
    // V73 — welke boekingen hebben aan de andere kant géén tegenboeking (zelfde bedrag, binnen 5 dagen)?
    // Zo toont de kaart bij een verschil waar het vandaan komt, en kun je het meteen indelen.
    const zakTx = zakGroupForYear.items.filter((t) => isZakTransferCat(t.category));
    const priTx = priGroupForYear.items.filter((t) => isPriTransferCat(t.category));
    const dagen5 = 5 * 86400000;
    const gebruiktPri = new Set();
    const zakZonder = [];
    for (const z of zakTx) {
      const m = priTx.find((q) => !gebruiktPri.has(q.id) && Math.abs(z.amount + q.amount) < 0.005 && Math.abs(z.date - q.date) <= dagen5);
      if (m) gebruiktPri.add(m.id); else zakZonder.push(z);
    }
    const priZonder = priTx.filter((q) => !gebruiktPri.has(q.id));
    const onverklaardAlle = [
      ...zakZonder.map((t) => ({ tx: t, kant: "Zakelijk" })),
      ...priZonder.map((t) => ({ tx: t, kant: "Prive" })),
    ].sort((a, b) => Math.abs(b.tx.amount) - Math.abs(a.tx.amount)).map((x) => ({ ...x, sleutel: onverklaardSleutel(x.tx, x.kant) }));
    // 15V7: bekende boekingen waarvan je de oorzaak hebt toegelicht tellen niet meer als "niet gekoppeld".
    const onverklaard = onverklaardAlle.filter((x) => !toegelicht[x.sleutel]);
    const toegelichtLijst = onverklaardAlle.filter((x) => toegelicht[x.sleutel]).map((x) => ({ ...x, uitleg: toegelicht[x.sleutel] }));
    const toegelichtBedrag = Math.round(toegelichtLijst.reduce((a, x) => a + x.tx.amount, 0) * 100) / 100;
    const diffOpen = Math.round((diff - toegelichtBedrag) * 100) / 100;
    // V71 — "geladen" is per jaar bekeken: een privébestand dat alleen 2024-2025 beslaat zegt niets
    // over 2020 — daar staat Privé dan op € 0,00 omdat er geen data is, niet omdat het niet klopt.
    const zijdeOntbreekt = !priveRekeningGeladen || priGroupForYear.items.length === 0 ? "Prive"
      : !zakelijkRekeningGeladen || zakGroupForYear.items.length === 0 ? "Zakelijk" : null;
    const heeftData = !(zakSum === 0 && priSum === 0);
    let tone, subtitle;
    if (!heeftData) {
      tone = "neutral";
      subtitle = "Geen overboekingen tussen zakelijk en privé gevonden dit jaar.";
    } else if (zijdeOntbreekt) {
      tone = "ok";
      subtitle = `Geen ${zijdeOntbreekt === "Prive" ? "privé" : "zakelijke"}-transacties geladen voor dit jaar, dus niet te verifiëren — dat is geen fout. ${zijdeOntbreekt === "Prive" ? "Zakelijk" : "Privé"}: ${eur(zijdeOntbreekt === "Prive" ? zakSum : priSum)}.`;
    } else {
      const ok = Math.abs(diffOpen) < 0.01;
      const toegelichtTekst = toegelichtLijst.length > 0 ? ` ${toegelichtLijst.length} boeking${toegelichtLijst.length === 1 ? "" : "en"} toegelicht (${eur(toegelichtBedrag)}).` : "";
      tone = ok ? "ok" : "attention";
      subtitle = ok
        ? (toegelichtLijst.length > 0 ? `Zakelijk ${eur(zakSum)} tegenover Privé ${eur(priSum)} — verschil ${eur(diff)}, volledig toegelicht.${toegelichtTekst}` : `Zakelijk ${eur(zakSum)} tegenover Privé ${eur(priSum)} — komt overeen (samen nul, zoals het hoort).`)
        : `Zakelijk ${eur(zakSum)} tegenover Privé ${eur(priSum)} — komt niet overeen (verschil ${eur(diffOpen)}).${toegelichtTekst}`;
    }
    return { zakSum, priSum, diff, diffOpen, zijdeOntbreekt, heeftData, tone, subtitle, onverklaard, toegelicht: toegelichtLijst, toegelichtBedrag };
  }, [zakGroupForYear, priGroupForYear, priveRekeningGeladen, zakelijkRekeningGeladen, toegelicht]);
}
