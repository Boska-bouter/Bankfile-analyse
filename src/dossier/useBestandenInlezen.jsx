import { useRef } from "react";
import { parseFile } from "../importers/detector.js";

// beide-V11R8 — uit App.jsx gehaald (opsplitsing): bankbestanden en bankkoppeling inlezen.
export function useBestandenInlezen(p) {
  const {
    setParsedFiles, setAccountTypeByFile, setExpandedCardKeys, setShowSetupWizard, setImportBezig, setImportHerladen, setError, setBankKoppeling,
  } = p;

  // V55 — rekeningtype dat al bij "Extra bankbestand toevoegen" is gekozen (zakelijk/privé); geldt voor
  // de eerstvolgende gekozen bestanden zodat de wizard er niet nog eens naar hoeft te vragen.
  const pendingAccountTypeRef = useRef(null);
  const handleFiles = async (fileList) => {
    setError(null);
    const presetType = pendingAccountTypeRef.current;
    pendingAccountTypeRef.current = null;
    const gekozen = Array.from(fileList || []);
    const files = gekozen.filter((f) => /\.(csv|xlsx|xls|940|sta|mt940|swi|txt|xml)$/i.test(f.name));
    const results = [];
    const failed = [];
    // release30V7 — niet-ondersteunde bestanden werden stil overgeslagen ("er gebeurt niets").
    for (const f of gekozen) if (!files.includes(f)) failed.push(`${f.name}: dit bestandstype wordt niet ondersteund (wel: CSV, XLS/XLSX, MT940, CAMT.053).`);
    setImportBezig(files.length > 0);
    try {
      for (const f of files) {
        try {
          const { headers, rows, mapping } = await parseFile(f);
          results.push({ headers, rows, mapping, sourceLabel: f.name, fileName: f.name });
        } catch (e) {
          failed.push(`${f.name}: ${e.message || e}`);
          if (e?.herladen) setImportHerladen(true);
        }
      }
    } finally {
      setImportBezig(false);
    }
    if (failed.length > 0) setError(failed.join("\n"));
    if (results.length > 0) {
      setParsedFiles((prev) => [...prev.filter((p) => !results.some((r) => r.fileName === p.fileName)), ...results]);
      if (presetType) setAccountTypeByFile((prev) => { const next = { ...prev }; for (const r of results) next[r.fileName] = presetType; return next; });
      setShowSetupWizard(true);
      // v286 — op verzoek: alle uitklapbare kaarten (Controleren/Instellingen) moeten bij het laden
      // van (nieuwe/extra) bestanden altijd weer ingeklapt beginnen, in plaats van een kaart die van
      // eerder in de sessie nog openstond gewoon open te laten staan.
      setExpandedCardKeys({});
    }
  };

  // nieuw-V3R8 — opgehaalde transacties uit de bankkoppeling: als "bestand" toevoegen of het eerdere vervangen.
  // beide-V4R8 — de wizard pas openen als het koppelvenster dicht gaat; anders kwam hij na de eerste rekening al voor
  // het venster en kon je de andere rekeningen niet meer ophalen.
  const bankImportGedaanRef = useRef(false);
  const handleBankImport = (pf, rekeningType) => {
    setError(null);
    setParsedFiles((prev) => [...prev.filter((p) => p.fileName !== pf.fileName), pf]);
    setAccountTypeByFile((prev) => (prev[pf.fileName] ? prev : { ...prev, [pf.fileName]: rekeningType }));
    bankImportGedaanRef.current = true;
    setExpandedCardKeys({});
  };
  const sluitBankKoppeling = () => {
    setBankKoppeling(null);
    if (bankImportGedaanRef.current) { bankImportGedaanRef.current = false; setShowSetupWizard(true); }
  };


  return { pendingAccountTypeRef, handleFiles, handleBankImport, sluitBankKoppeling };
}
