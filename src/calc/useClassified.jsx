// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import { detectOwnAccountTransfer, resolveClassification } from "../classification/classify.js";
import { koppelDoorsluisOverboekingen } from "../classification/doorsluis.js";
import { scoreClassification } from "../classification/confidence.js";

export function useClassified(p) {
  const {
    ZAKELIJKE_SPIEGEL_CATEGORIEEN, accountTypeByFile, businessExpenseKeywords, businessKeywords, categoryRules,
    eigenNamenKeywords, overridesByCounterparty, overridesByRow, ownAccountsElsewhereByFile, parsedFiles,
    transactions, zakelijkeSpaarKeywords,
  } = p;

  return useMemo(() => {
    const base0 = transactions.map((tx) => {
      const resolved = resolveClassification(
        tx, categoryRules, businessKeywords, businessExpenseKeywords, accountTypeByFile[tx.source],
        overridesByCounterparty, overridesByRow, ownAccountsElsewhereByFile[tx.source] || [], eigenNamenKeywords, zakelijkeSpaarKeywords
      );
      const confidence = scoreClassification(tx, categoryRules, overridesByCounterparty, overridesByRow, resolved.category, ownAccountsElsewhereByFile[tx.source] || [], businessKeywords, businessExpenseKeywords);
      const transferLocked = !!detectOwnAccountTransfer(tx, accountTypeByFile[tx.source], ownAccountsElsewhereByFile[tx.source] || []);
      // accountType = het type van de REKENING waar de boeking op staat (weergave in detailvensters). `type`
      // blijft zoals het was: een override (bijv. een bevestigde zakelijke klant) kan daar "Zakelijk" op zetten
      // zodat de boeking in de zakelijke overzichten meetelt, ook als hij op een privérekening staat.
      return { ...tx, ...resolved, confidence, transferLocked, accountType: accountTypeByFile[tx.source] === "Zakelijk" ? "Zakelijk" : "Prive" };
    });
    const base = koppelDoorsluisOverboekingen(base0, Object.values(accountTypeByFile).includes("Zakelijk"));
    // "Prive opnames"/"Terugboeking van prive" (zakelijke kant) zijn geld dat tussen zakelijk en
    // privé beweegt. Staat zo'n boeking aan de zakelijke kant, dan voegen we er een
    // spiegelboeking van hetzelfde bedrag met omgekeerd teken aan toe — zodat de balans tussen
    // zakelijk en privé in beide richtingen klopt, zonder de oorspronkelijke boeking te veranderen.
    // Alleen als de bijbehorende privérekening niet zelf ook geladen is: staat die er wél bij, dan
    // heeft die eigen transactie via de eigen-rekening-herkenning hierboven al zijn eigen kant van
    // dezelfde overboeking gekregen — een spiegel zou die dan dubbel tellen.
    // `isLoadedFile` (zie ownAccountsElsewhereByFile hierboven) is hier bewust vereist: een via de
    // wizard opgegeven, maar nog niet geladen rekening levert nog GEEN eigen transactie op de andere
    // kant op — zonder deze voorwaarde werd de spiegel voor zo'n rekening ten onrechte óók
    // onderdrukt, waardoor het bedrag nergens meer zichtbaar was (geen spiegel én geen echte
    // transactie) totdat die rekening alsnog werd geladen.
    // v220: naast de specifieke IBAN-koppeling hieronder ook een generieke vangnet-check — is er
    // ÜBERHAUPT een privérekening-bestand in dit dossier geladen, dan is een spiegelboeking zo goed
    // als altijd overbodig (dit project volgt precies één ondernemer met hooguit een handvol eigen
    // rekeningen). Zonder dit vangnet bleef de spiegel ten onrechte bestaan zodra de IBAN-koppeling
    // om wat voor reden dan ook niet rond kwam (bijv. het bankbestand van de privérekening vermeldt
    // zijn eigen rekeningnummer niet op een manier die computeOwnAccountByFile herkent) — met een
    // reëel geladen privérekening-bestand ernaast leverde dat dan EXACT dezelfde overboeking dubbel
    // op: één keer als de echte, correct geclassificeerde privé-transactie, en één keer als
    // spiegelboeking die (per ongeluk) nog de zakelijke categorienaam ("Prive opnames"/"Terugboeking
    // van prive") droeg. Dit vangnet kiest bewust voor "geen spiegel" boven "misschien dubbel".
    const anyPriveFileLoaded = parsedFiles.some((pf) => accountTypeByFile[pf.fileName] === "Prive");
    const mirrors = [];
    for (const tx of base) {
      const otherSideAlsoLoaded =
        anyPriveFileLoaded || (ownAccountsElsewhereByFile[tx.source] || []).some((o) => o.accountType === "Prive" && o.isLoadedFile);
      if (
        (tx.category === "Prive opnames" || tx.category === "Terugboeking van prive") &&
        tx.type === "Zakelijk" && !otherSideAlsoLoaded
      ) {
        // viewType expliciet "Prive": de spiegel hoort in het PRIVÉ-overzicht. Zonder dit erfde hij viewType "Zakelijk" van het origineel
        // (via de spread) en viel hij in het zakelijke overzicht tegen de opname weg (netto € 0,00).
        mirrors.push({ ...tx, id: `${tx.id}-prive-spiegel`, amount: -tx.amount, type: "Prive", viewType: "Prive", isMirror: true });
      }
    }
    const result = mirrors.length ? [...base, ...mirrors] : base;
    // V46 — dossier met ALLEEN privérekening(en): elke transactie met categorie "Zakelijke
    // inkomsten"/"Zakelijke inkoop/uitgaven" is een zakelijke boeking via de privérekening. Het
    // `type` blijft de rekening (Prive); alleen de zakelijke OVERZICHTEN (viewType) tonen ze, zodat
    // de zakelijke kant exact de spiegel is van die categorieën op de privékant.
    const heeftZakelijkeRekening = Object.values(accountTypeByFile).includes("Zakelijk");
    if (heeftZakelijkeRekening) return result;
    return result.map((tx) =>
      !tx.isMirror && tx.viewType !== "Zakelijk" && ZAKELIJKE_SPIEGEL_CATEGORIEEN.includes(tx.category) ? { ...tx, viewType: "Zakelijk" } : tx
    );
  }, [transactions, categoryRules, businessKeywords, businessExpenseKeywords, accountTypeByFile, overridesByCounterparty, overridesByRow, ownAccountsElsewhereByFile, eigenNamenKeywords, zakelijkeSpaarKeywords, parsedFiles]);
}
