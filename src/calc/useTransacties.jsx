import { useEffect, useMemo } from "react";
import { buildTransactions, computeImportDiagnostics, computeFileContinuity, computeOwnAccountByFile, aansluitingControleSleutel } from "../importers/transactions.js";
import { computeDuplicateInfo } from "../importers/duplicates.js";
import { overlapBestandKoppeling } from "../importers/overlapKoppeling.js";
import { normKey } from "../utils/normalization.js";
import { useOwnAccountsElsewhereByFile } from "./useOwnAccountsElsewhereByFile.jsx";

// beide-V11R8 — uit App.jsx gehaald (opsplitsing): van geladen bestanden naar de boekingen die meetellen (eigen rekeningen, importcontrole, overlap met de bankkoppeling, duplicaten).
export function useTransacties(p) {
  const {
    parsedFiles, accountTypeByFile, overridesByRow, setOverridesByRow, excludedDuplicateFingerprints, excludedManualFingerprints, openingBalanceCorrections, eigenRekeningenExtra, bevestigdeControles,
  } = p;

  const allTransactions = useMemo(() => buildTransactions(parsedFiles), [parsedFiles]);
  const ownAccountByFile = useMemo(() => computeOwnAccountByFile(allTransactions), [allTransactions]);
  // Voor elk bestand: de eigen rekeningnummers van al je ándere geladen bestanden (met hun
  // rekeningtype) — gebruikt om overboekingen tussen je eigen rekeningen te herkennen, ongeacht
  // bankformaat. Alleen bestanden waarvan het rekeningtype al bekend is tellen mee (anders is niet
  // te bepalen of het bijv. "Terugboeking van privé" of "Uitbetaling aan prive" zou moeten zijn).
  const ownAccountsElsewhereByFile = useOwnAccountsElsewhereByFile({
    accountTypeByFile, eigenRekeningenExtra, ownAccountByFile, parsedFiles,
  });
  const eigenRekeningenGeladen = useMemo(() => {
    const seen = new Set();
    const res = [];
    for (const [fileName, iban] of Object.entries(ownAccountByFile)) {
      if (!iban || !accountTypeByFile[fileName] || seen.has(normKey(iban))) continue;
      seen.add(normKey(iban));
      res.push({ iban, accountType: accountTypeByFile[fileName] });
    }
    return res;
  }, [ownAccountByFile, accountTypeByFile]);
  const importDiagnostics = useMemo(
    () => computeImportDiagnostics(parsedFiles, allTransactions, openingBalanceCorrections),
    [parsedFiles, allTransactions, openingBalanceCorrections]
  );
  const fileContinuityRuw = useMemo(() => computeFileContinuity(importDiagnostics, accountTypeByFile), [importDiagnostics, accountTypeByFile]);
  // Een door jou als akkoord aangemerkt verschil tussen twee bestanden telt overal (controles, voortgang, rapport)
  // als aansluitend. Verandert het verschil later, dan hoort de sleutel er niet meer bij en komt het punt terug.
  const fileContinuity = useMemo(
    () => fileContinuityRuw.map((c) => {
      const sleutel = aansluitingControleSleutel(c);
      return !c.ok && bevestigdeControles?.[sleutel] ? { ...c, ok: true, bevestigd: true, sleutel } : { ...c, sleutel };
    }),
    [fileContinuityRuw, bevestigdeControles]
  );

  // beide-V6R5 — zelfde rekening via een bestand én de bankkoppeling: in de periode van de koppeling telt de
  // koppeling. Importcontrole en saldocontrole blijven op de volledige bestanden (allTransactions) werken.
  const overlapKoppeling = useMemo(
    () => overlapBestandKoppeling(allTransactions, parsedFiles, ownAccountByFile),
    [allTransactions, parsedFiles, ownAccountByFile]
  );
  // Eigen keuze bij een boeking uit het bestand gaat mee naar dezelfde boeking uit de koppeling (als die er nog geen heeft).
  useEffect(() => {
    if (!overlapKoppeling.paren.size) return;
    const erbij = {};
    for (const [van, naar] of overlapKoppeling.paren) if (overridesByRow[van] && !overridesByRow[naar]) erbij[naar] = overridesByRow[van];
    if (Object.keys(erbij).length) setOverridesByRow((prev) => ({ ...prev, ...erbij }));
  }, [overlapKoppeling, overridesByRow]);
  const txZonderOverlap = useMemo(
    () => (overlapKoppeling.weg.size ? allTransactions.filter((tx) => !overlapKoppeling.weg.has(tx.id)) : allTransactions),
    [allTransactions, overlapKoppeling]
  );
  const { fingerprintByTxId, duplicateGroups, duplicateFingerprints, confirmedSeparateGroups } = useMemo(
    () => computeDuplicateInfo(txZonderOverlap),
    [txZonderOverlap]
  );
  const transactions = useMemo(() => {
    if (excludedDuplicateFingerprints.length === 0 && excludedManualFingerprints.length === 0) return txZonderOverlap;
    const excludedSet = new Set([...excludedDuplicateFingerprints, ...excludedManualFingerprints]);
    return txZonderOverlap.filter((tx) => !excludedSet.has(fingerprintByTxId[tx.id]));
  }, [txZonderOverlap, excludedDuplicateFingerprints, excludedManualFingerprints, fingerprintByTxId]);

  return { fingerprintByTxId, duplicateFingerprints, duplicateGroups, allTransactions, ownAccountsElsewhereByFile, transactions, ownAccountByFile, eigenRekeningenGeladen, importDiagnostics, fileContinuity, overlapKoppeling, confirmedSeparateGroups };
}
