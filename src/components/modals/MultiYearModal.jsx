import ModalShell from "./ModalShell.jsx";
import MultiYearOverview from "../overview/MultiYearOverview.jsx";
import MultiYearOverviewBV from "../overview/MultiYearOverviewBV.jsx";

// Meerjarenoverzicht als pop-up (zzp/eenmanszaak of BV). Puur weergave: alle gegevens en acties komen
// als props uit App.jsx.
export default function MultiYearModal({
  onClose, rechtsvorm, years, yearlySummaries, yearlyOpenOB, korRegeling, activeYear, setActiveYear,
  kostenTotaalByYear, costBreakdownByYear, volledigeJaren, businessAdvies, dgaSalarisByYear, rcVerloop, evVerloop,
  yearlyProgress, vpbStatus, setVpbGedaan, ibStatus, setIbGedaan, zvwStatus, setZvwGedaan, onOpenHelp,
}) {
  return (
    <ModalShell title="Meerjarenoverzicht" onClose={onClose} maxWidth="max-w-5xl">
      {rechtsvorm === "bv" ? (
        <MultiYearOverviewBV
          years={years}
          yearlySummaries={yearlySummaries}
          kostenTotaalByYear={kostenTotaalByYear}
          dgaSalarisByYear={dgaSalarisByYear}
          rcVerloop={rcVerloop}
          evVerloop={evVerloop}
          onYearClick={setActiveYear}
          onOpenHelp={onOpenHelp}
          yearlyProgress={yearlyProgress}
          vpbStatus={vpbStatus}
          setVpbGedaan={setVpbGedaan}
        />
      ) : (
        <MultiYearOverview
          years={years}
          yearlySummaries={yearlySummaries}
          yearlyOpenOB={yearlyOpenOB}
          korRegeling={korRegeling}
          onYearClick={setActiveYear}
          ibStatus={ibStatus}
          setIbGedaan={setIbGedaan}
          zvwStatus={zvwStatus}
          setZvwGedaan={setZvwGedaan}
          costBreakdownByYear={costBreakdownByYear}
          kostenTotaalByYear={kostenTotaalByYear}
          volledigeJaren={volledigeJaren}
          businessAdvies={businessAdvies}
          activeYear={activeYear}
          onOpenHelp={onOpenHelp}
          yearlyProgress={yearlyProgress}
        />
      )}
    </ModalShell>
  );
}
