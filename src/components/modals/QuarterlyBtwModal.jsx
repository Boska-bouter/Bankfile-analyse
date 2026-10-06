import ModalShell from "./ModalShell.jsx";
import HelpHint from "../shared/HelpHint.jsx";
import PeriodeSignaal from "../btw/PeriodeSignaal.jsx";
import QuarterlyBtwPanel from "../btw/QuarterlyBtwPanel.jsx";

// BTW-aangifte per kwartaal als pop-up. Puur weergave: gegevens en acties komen als props uit App.jsx.
export default function QuarterlyBtwModal({
  onClose, activeYear, korRegeling, periodeSignalenActiefJaar, confirmPeriodeAsIs, movePeriodeToQuarter,
  quarterlyBtwData, kwartaalStatus, setKwartaalStatusField, costBreakdownByQuarter, onOpenHelp, obIbSectionRef,
}) {
  return (
    <ModalShell title={`BTW-aangifte per kwartaal ${activeYear}`} onClose={onClose}>
      {!korRegeling ? (
        <>
          <PeriodeSignaal items={periodeSignalenActiefJaar} onConfirm={confirmPeriodeAsIs} onMove={movePeriodeToQuarter} />
          <QuarterlyBtwPanel
            quarters={quarterlyBtwData}
            kwartaalStatus={kwartaalStatus}
            setKwartaalStatusField={setKwartaalStatusField}
            activeYear={activeYear}
            costBreakdownByQuarter={costBreakdownByQuarter}
            onOpenHelp={onOpenHelp}
            obIbSectionRef={obIbSectionRef}
          />
        </>
      ) : (
        // Bij KOR wordt het kwartaalpaneel niet getoond (geen OB-aangifte), maar de uitleg blijft
        // relevant voor de IB-vakken (CategorySummaryCard) — dus die blijft hier los staan.
        <div ref={obIbSectionRef} className="flex items-center justify-end">
          <HelpHint chapter="ob-ib-vakken" onOpen={onOpenHelp} label="Waar vind ik dit op het aangifteformulier?" />
        </div>
      )}
    </ModalShell>
  );
}
