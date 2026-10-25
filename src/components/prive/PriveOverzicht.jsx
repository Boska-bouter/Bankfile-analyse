// beide-V1R8 (fase 6) — het Overzicht van een privédossier (uitgebreide weergave): vervangt de zakelijke
// detailpanelen (aangifte, winst, BTW, aannames) door budget, vaste lasten, sparen en belastingindicatie.
import { useState } from "react";
import { InkomstenUitgavenKaart, UitgavenPerCategorieKaart, VasteLastenKaart, SparenKaart, BelastingKaart } from "./PriveKaarten.jsx";
import PriveMeerjarenKaart from "./PriveMeerjarenKaart.jsx";
import PriveMaandModal from "./PriveMaandModal.jsx";
import DownloadKnop from "../shared/DownloadKnop.jsx";

const ACTIE = "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50";

export default function PriveOverzicht({ overzicht, jaar, jaren, onSelectYear, onVasteLasten, onBerekening, onVragen, onActie, onSamenvatting, ibGedaan, onIbGedaan }) {
  const [maand, setMaand] = useState(false);
  const d = overzicht?.perJaar?.[jaar];
  if (!d) return null;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <InkomstenUitgavenKaart jaar={jaar} budget={d.budget} onPerMaand={() => setMaand(true)} />
        <BelastingKaart jaar={jaar} belasting={d.belasting} aannames={d.aannames} onBerekening={onBerekening} onVragen={onVragen} gedaan={ibGedaan} onGedaan={onIbGedaan} />
        <UitgavenPerCategorieKaart jaar={jaar} budget={d.budget} />
        <div className="space-y-4">
          <VasteLastenKaart jaar={jaar} budget={d.budget} onInstellen={onVasteLasten} />
          <SparenKaart jaar={jaar} budget={d.budget} belasting={d.belasting} />
        </div>
      </div>
      <PriveMeerjarenKaart jaren={jaren} perJaar={overzicht.perJaar} />
      <div className="flex flex-wrap gap-2">
        {onBerekening && <button type="button" onClick={onBerekening} className={ACTIE}>Berekening inkomstenbelasting</button>}
        {onSamenvatting && <button type="button" onClick={onSamenvatting} className={ACTIE}>Samenvatting</button>}
        {/* beide-V4R1 — was "Excel exporteren": nu één Downloaden met keuze PDF, Excel of HTML */}
        {onActie && <DownloadKnop onKies={(soort) => onActie(soort)} rechts={false} label="Budgetoverzicht downloaden" knopClassName={`${ACTIE} inline-flex items-center gap-1.5`} />}
        {onActie && <button type="button" onClick={() => onActie("print")} className={ACTIE}>Print budgetoverzicht</button>}
      </div>
      {maand && <PriveMaandModal jaar={jaar} jaren={jaren} budget={d.budget} onSelectYear={onSelectYear} onClose={() => setMaand(false)} />}
    </div>
  );
}
