import { useState } from "react";
import { VOORWAARDEN_INHOUD } from "../../content/voorwaarden.jsx";
import { VOORWAARDEN_PRIVE_INHOUD, VOORWAARDEN_PRIVE_EIGEN } from "../../content/voorwaardenPrive.jsx";
import { APP_RELEASE } from "../../version.js";

// Volledig scherm bij eerste gebruik: lezen en akkoord gaan voordat de app opent. beide-V1R9 — per soort (zakelijk/privé)
// eigen voorwaarden; ontbreken beide, dan staan ze onder elkaar en geldt één akkoord voor allebei.
const TITEL = { zakelijk: "Voorwaarden zakelijk", prive: "Voorwaarden privé" };
export default function VoorwaardenScherm({ soorten = ["zakelijk"], onAkkoord }) {
  const [akkoord, setAkkoord] = useState(false);
  const twee = soorten.length > 1;
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-2xl w-full rounded-paneel border border-slate-200 bg-white shadow-lg flex flex-col" style={{ maxHeight: "92dvh" }}>
        <div className="px-6 pt-6 pb-3">
          <h1 className="text-lg font-semibold">Welkom bij Bankoverzicht</h1>
          <p className="text-sm text-slate-500 mt-1">Lees eerst waarvoor deze app bedoeld is en waarvoor niet.</p>
        </div>
        <div className="px-6 py-3 overflow-y-auto text-xs text-slate-600 leading-relaxed border-y border-slate-100">{soorten.map((s) => (
          <div key={s} className={twee ? "mb-4" : ""}>
            {twee && <h2 className="mb-2 text-sm font-semibold text-slate-900">{TITEL[s]}</h2>}
            {s !== "prive" ? VOORWAARDEN_INHOUD : twee ? <div className="space-y-3">{VOORWAARDEN_PRIVE_EIGEN}<p className="italic">Artikel 4 t/m 8 (gegevens en privacy, toegang, aansprakelijkheid, auteursrecht, wijzigingen) zijn gelijk aan die hierboven.</p></div> : VOORWAARDEN_PRIVE_INHOUD}
          </div>
        ))}</div>
        <div className="px-6 py-4 space-y-3">
          <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={akkoord} onChange={(e) => setAkkoord(e.target.checked)} />
            <span>Ik heb de gebruiksvoorwaarden{twee ? " (zakelijk en privé)" : soorten[0] === "prive" ? " voor privé" : ""} gelezen en ga ermee akkoord.</span>
          </label>
          <button
            onClick={onAkkoord}
            disabled={!akkoord}
            className="w-full rounded-lg bg-teal-700 text-white px-4 py-2.5 text-sm font-medium hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Akkoord en doorgaan
          </button>
          <p className="text-xs text-slate-400 text-center">Dit scherm komt opnieuw als je browsergegevens wist, in een privévenster werkt of als de voorwaarden wijzigen.</p>
          <p className="text-xs text-slate-400 text-center">© {new Date().getFullYear()} Paul Gerits — alle rechten voorbehouden · {APP_RELEASE}</p>
        </div>
      </div>
    </div>
  );
}
