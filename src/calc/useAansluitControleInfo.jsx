// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import { eur } from "../utils/amounts.js";
import { betaalSoort } from "../classification/classify.js";
import { looksLikePerson } from "../utils/normalization.js";
import { gezamenlijkePeriode } from "./periodeDekking.js";

// Sleutel waaronder een toegelichte (bekende) niet-gekoppelde overboeking in bevestigdeControles staat.
// Bewust géén tx.id (een teller die per keer laden kan verschuiven) maar datum + bedrag + tegenrekening/naam.
export function onverklaardSleutel(tx, kant) {
  const d = tx.date instanceof Date ? tx.date.toISOString().slice(0, 10) : String(tx.date || "");
  return `onverklaard|${kant}|${d}|${Math.round(tx.amount * 100)}|${tx.counterpartyIban || tx.counterpartyOrigineel || tx.counterparty || ""}`;
}

export function useAansluitControleInfo(p) {
  const {
    priGroupForYear, priveRekeningGeladen, zakGroupForYear, zakelijkRekeningGeladen, toegelicht = {}, eigenRekeningenNietGeladen = [],
    periodeZak = null, periodePri = null, eigenIbansAlle = [],
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
    // release30V5 — boekingen naar/van een eigen rekening die bij "Eigen rekeningen" als opgegeven (niet geladen)
    // staat, zijn vanzelf verklaard: daar is geen tegenboeking in de geladen bestanden te verwachten.
    const norm = (x) => String(x || "").replace(/\s/g, "").toUpperCase();
    const nietGeladen = new Set(eigenRekeningenNietGeladen.map(norm));
    const eigen = new Set(eigenIbansAlle.map(norm));
    const autoUitleg = (x) => {
      const iban = norm(x.tx.counterpartyIban);
      if (iban && nietGeladen.has(iban)) return { reden: "eigen-rekening", redenTekst: `Eigen rekening ${iban.replace(/(.{4})(?=.)/g, "$1 ")}, niet geladen`, notitie: "", automatisch: true };
      // release31V2 — een contante opname of een pinbetaling met de zakelijke pas komt nooit als ontvangst op een
      // privérekening; daar is dus nooit een tegenboeking te verwachten.
      if (x.kant === "Zakelijk") {
        const soort = betaalSoort(x.tx);
        if (soort === "contant") return { reden: "contant", redenTekst: "Contant opgenomen", notitie: "", automatisch: true };
        if (soort === "pin") return { reden: "pin", redenTekst: "Gepind met de zakelijke pas", notitie: "", automatisch: true };
        // release33V8 — privé rechtstreeks betaald aan een ander (iDEAL, Tikkie, Mollie, incassobureau, webshop) vanaf de
        // zakelijke rekening: ook dat komt nooit op een privérekening. Alleen als de tegenrekening geen eigen rekening is,
        // en het geen overboeking aan een persoon lijkt (dat kan een niet-opgegeven eigen rekening zijn) — behalve via een
        // betaaldienst zoals Tikkie.
        if (x.tx.category === "Privé opnames" && x.tx.amount < 0 && !eigen.has(iban)) {
          const tekst = `${x.tx.counterparty || ""} ${x.tx.description || ""}`;
          const viaDienst = /tikkie|mollie|ideal|adyen|buckaroo|pay\.nl|stripe|klarna|paypal|sisow|multisafepay|ccv|worldline/i.test(tekst);
          if (viaDienst || !looksLikePerson(x.tx.counterparty || "")) {
            return { reden: "derden", redenTekst: "Aan een ander betaald", notitie: "", automatisch: true };
          }
        }
        // nieuw-V5R4 — de eigen rekeningen zijn opgegeven (of de privérekening is geladen): een rekeningnummer dat daar
        // niet bij staat, is geen eigen rekening. Dan is het privé aan een ander betaald of van een ander ontvangen (Boska 15-11).
        if (x.tx.category === "Privé opnames" && iban && !eigen.has(iban) && !nietGeladen.has(iban) && (nietGeladen.size > 0 || priveRekeningGeladen)) {
          return x.tx.amount < 0
            ? { reden: "derden", redenTekst: "Aan een ander betaald", notitie: "", automatisch: true }
            : { reden: "derden", redenTekst: "Van een ander ontvangen", notitie: "", automatisch: true };
        }
      }
      return null;
    };
    const uitlegVan = (x) => {
      const handmatig = toegelicht[x.sleutel];
      const auto = autoUitleg(x);
      // Eerder met "Akkoord" de algemene tekst "bestand ontbreekt" gegeven bij een contante opname of pinbetaling:
      // dan is de automatische (juiste) reden beter. Een eigen notitie of andere reden blijft staan.
      if (auto && (auto.reden === "contant" || auto.reden === "pin" || auto.reden === "derden") && handmatig && handmatig.reden === "bestand" && !handmatig.notitie) return auto;
      return handmatig || auto;
    };
    // release31V4 — buiten de periode die zakelijk én privé samen dekken kan een boeking nooit een tegenboeking
    // vinden (de andere kant is niet geladen). Zulke boekingen tellen niet als open punt; ze staan apart.
    const periode = gezamenlijkePeriode(periodeZak, periodePri);
    const marge = 5 * 86400000;
    const buiten = (x) => !!periode && (!periode.overlap || x.tx.date < periode.van - marge || x.tx.date > periode.tot.getTime() + marge);
    // 15V7: bekende boekingen waarvan je de oorzaak hebt toegelicht tellen niet meer als "niet gekoppeld".
    const buitenLijst = onverklaardAlle.filter((x) => !uitlegVan(x) && buiten(x));
    const onverklaard = onverklaardAlle.filter((x) => !uitlegVan(x) && !buiten(x));
    const toegelichtLijst = onverklaardAlle.filter((x) => uitlegVan(x)).map((x) => ({ ...x, uitleg: uitlegVan(x) }));
    const toegelichtBedrag = Math.round(toegelichtLijst.reduce((a, x) => a + x.tx.amount, 0) * 100) / 100;
    const buitenBedrag = Math.round(buitenLijst.reduce((a, x) => a + x.tx.amount, 0) * 100) / 100;
    const diffOpen = Math.round((diff - toegelichtBedrag - buitenBedrag) * 100) / 100;
    const eenzijdigTekst = periode ? periode.eenzijdig.map((e) => `${e.tekst} alleen ${e.alleen}`).join(", ") : "";
    const buitenTekst = buitenLijst.length > 0 ? ` ${buitenLijst.length} boeking${buitenLijst.length === 1 ? "" : "en"} niet te controleren (${eenzijdigTekst || "buiten de gezamenlijke periode"}).` : "";
    // V71 — "geladen" is per jaar bekeken: een privébestand dat alleen 2024-2025 beslaat zegt niets
    // over 2020 — daar staat Privé dan op € 0,00 omdat er geen data is, niet omdat het niet klopt.
    const zijdeOntbreekt = !priveRekeningGeladen || priGroupForYear.items.length === 0 ? "Prive"
      : !zakelijkRekeningGeladen || zakGroupForYear.items.length === 0 ? "Zakelijk" : null;
    const heeftData = !(zakSum === 0 && priSum === 0);
    // nieuw-V5R4 — privé opnames in twee soorten (Boska 15-11: "waar slaat tegenboeking op?"):
    // (1) naar een eigen privérekening: daar hoort hetzelfde bedrag binnen te komen;
    // (2) contant opgenomen of vanaf zakelijk rechtstreeks aan een ander betaald: komt nooit op een privérekening.
    const zakOnverklaard = new Map(onverklaardAlle.filter((x) => x.kant === "Zakelijk").map((x) => [x.tx.id, x]));
    const soortVan = (t) => {
      const x = zakOnverklaard.get(t.id);
      if (!x) return "terug"; // teruggevonden op een geladen privérekening
      const a = autoUitleg(x);
      if (a && (a.reden === "contant" || a.reden === "pin" || a.reden === "derden")) return "ander";
      const iban = norm(t.counterpartyIban);
      if (iban && (eigen.has(iban) || nietGeladen.has(iban))) return "eigen";
      return "onbekend";
    };
    const som = (l) => Math.round(l.reduce((a, t) => a + t.amount, 0) * 100) / 100;
    const openIds = new Set(onverklaard.map((x) => x.tx.id));
    const groep = (soort) => {
      const l = zakTx.filter((t) => soortVan(t) === soort);
      return { n: l.length, bedrag: som(l), open: l.filter((t) => openIds.has(t.id)).length, ibans: [...new Set(l.map((t) => norm(t.counterpartyIban)).filter(Boolean))].map((i) => i.replace(/(.{4})(?=.)/g, "$1 ")) };
    };
    // nieuw-V5R4 — vier soorten, op rekeningnummer (Boska 15-11: "hoe weet je dat het naar een privérekening ging?")
    const soorten = { terug: groep("terug"), eigen: groep("eigen"), ander: groep("ander"), onbekend: groep("onbekend") };
    let tone, subtitle;
    if (!heeftData) {
      tone = "neutral";
      subtitle = "Geen overboekingen tussen zakelijk en privé gevonden dit jaar.";
    } else if (zijdeOntbreekt) {
      tone = "ok";
      subtitle = zijdeOntbreekt === "Prive"
        ? `Privé opnames ${eur(zakSum)}. Privérekening niet geladen: controle op categorie.`
        : `Op de privérekening ${eur(priSum)} ontvangen van zakelijk. Zakelijke rekening niet geladen: controle op categorie.`;
    } else {
      const ok = Math.abs(diffOpen) < 0.01;
      const toegelichtTekst = toegelichtLijst.length > 0 ? ` ${toegelichtLijst.length} boeking${toegelichtLijst.length === 1 ? "" : "en"} (${eur(toegelichtBedrag)}) kom${toegelichtLijst.length === 1 ? "t" : "en"} niet op de privérekening terug, en dat hoeft ook niet: contant opgenomen, rechtstreeks aan een ander betaald of naar een eigen rekening die niet is geladen.` : "";
      tone = ok ? "ok" : "attention";
      subtitle = ok
        ? `Klopt met de privérekening.${buitenTekst}`
        : `Niet teruggevonden op de privérekening: ${eur(Math.abs(diffOpen))}.${buitenTekst}`;
    }
    return { soorten, zakSum, priSum, diff, diffOpen, zijdeOntbreekt, heeftData, tone, subtitle, onverklaard, toegelicht: toegelichtLijst, toegelichtBedrag, buitenPeriode: buitenLijst, buitenBedrag, eenzijdigTekst };
  }, [zakGroupForYear, priGroupForYear, priveRekeningGeladen, zakelijkRekeningGeladen, toegelicht, eigenRekeningenNietGeladen.join("|"), eigenIbansAlle.join("|"), periodeZak, periodePri]);
}
