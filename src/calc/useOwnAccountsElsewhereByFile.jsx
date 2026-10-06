// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import { ibansMatch } from "../utils/normalization.js";

export function useOwnAccountsElsewhereByFile(p) {
  const {
    accountTypeByFile, eigenRekeningenExtra, ownAccountByFile, parsedFiles,
  } = p;

  return useMemo(() => {
    const entries = Object.entries(ownAccountByFile)
      .filter(([fileName]) => accountTypeByFile[fileName])
      .map(([fileName, iban]) => ({ fileName, iban, accountType: accountTypeByFile[fileName], isLoadedFile: true }));
    // Handmatig opgegeven eigen rekeningen die je (nog) niet hebt geladen (zie de wizard-vraag) —
    // tellen voor élk geladen bestand mee, niet gekoppeld aan een specifiek fileName. Er kunnen er
    // meerdere zijn (bijv. een extra zakelijke rekening én twee privérekeningen). Is zo'n rekening
    // inmiddels ALSNOG als eigen bestand geladen (de wizard-invoer is dan achterhaald, maar wordt
    // nergens automatisch opgeruimd), dan die dubbele/verouderde entry hier negeren — anders staat
    // dezelfde rekening tweemaal in de lijst. Op zich onschadelijk zolang het rekeningtype gelijk
    // blijft (find/some hieronder gebruiken toch maar de eerste match), maar wél verwarrend, en een
    // reëel risico zodra iemand het rekeningtype van het echte bestand nog aanpast zonder aan deze
    // oude wizard-invoer te denken.
    // `isLoadedFile: false` — dit is bewust ANDERS dan de "entries" hierboven: een via de wizard
    // opgegeven rekening is nog GEEN geladen bestand, dus de daadwerkelijke tegenboeking staat nog
    // nergens in de data. De spiegelboeking hieronder (zie "classified") moet dit onderscheid kennen
    // — anders verdwijnt het geld van zo'n nog-niet-geladen rekening stilzwijgend uit het overzicht
    // (geen spiegel én geen echte transactie), in plaats van gewoon zichtbaar te blijven totdat die
    // rekening ook echt geladen wordt.
    const extra = (eigenRekeningenExtra || [])
      .filter((r) => r.iban && !entries.some((e) => ibansMatch(e.iban, r.iban)))
      .map((r) => ({ iban: r.iban, accountType: r.accountType, isLoadedFile: false }));
    const result = {};
    for (const pf of parsedFiles) {
      result[pf.fileName] = [
        ...entries.filter((e) => e.fileName !== pf.fileName).map((e) => ({ iban: e.iban, accountType: e.accountType, isLoadedFile: true })),
        ...extra,
      ];
    }
    return result;
  }, [ownAccountByFile, accountTypeByFile, parsedFiles, eigenRekeningenExtra]);
}
