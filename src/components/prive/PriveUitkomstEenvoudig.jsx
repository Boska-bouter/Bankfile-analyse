// beide-V1R8 (fase 6) — stap 3 "Uitkomst" van de eenvoudige weergave in een privédossier: wat kwam er binnen,
// waar ging het naartoe en ongeveer hoeveel inkomstenbelasting (terug of bij). Dezelfde cijfers als het Overzicht.
import { useState } from "react";
import { InkomstenUitgavenKaart, UitgavenPerCategorieKaart, BelastingKaart, KAART } from "./PriveKaarten.jsx";
import PriveMaandModal from "./PriveMaandModal.jsx";

export default function PriveUitkomstEenvoudig({ overzicht, jaar, jaren = [], onSelectYear, bruikbaar = true, onNakijken, onVragen, onUitgebreid }) {
  const [maand, setMaand] = useState(false);
  const d = overzicht?.perJaar?.[jaar];
  if (!d) return <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Nog geen gegevens voor {jaar}.</p>;
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <InkomstenUitgavenKaart jaar={jaar} budget={d.budget} onPerMaand={() => setMaand(true)} />
        {bruikbaar
          ? <BelastingKaart jaar={jaar} belasting={d.belasting} aannames={d.aannames} onVragen={onVragen} />
          : (
            <section className={KAART}>
              <h3 className="text-sm font-semibold text-slate-900">Indicatie inkomstenbelasting {jaar}</h3>
              <p className="text-2xl font-extrabold text-slate-400">nog niet bruikbaar</p>
              <p className="text-xs text-slate-500">Er is nog te veel onbekend. Ga terug naar Nakijken.</p>
              {onNakijken && <button type="button" onClick={onNakijken} className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white">Verder met nakijken</button>}
            </section>
          )}
        <UitgavenPerCategorieKaart jaar={jaar} budget={d.budget} />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="mb-2 font-semibold text-slate-800">Meer details?</p>
          <p>{onUitgebreid ? <>Vaste lasten, sparen, vermogen en het meerjarenoverzicht staan in <button type="button" onClick={onUitgebreid} className="font-semibold underline">Uitgebreid</button>. </> : "Vaste lasten, vermogen en meerdere jaren naast elkaar staan in de uitgebreide weergave. "}Twijfel je over iets? Vraag het je adviseur.</p>
        </div>
      </div>
      {maand && <PriveMaandModal jaar={jaar} jaren={jaren} budget={d.budget} onSelectYear={onSelectYear} onClose={() => setMaand(false)} />}
    </>
  );
}
