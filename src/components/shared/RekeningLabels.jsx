// beide-V11R2 — van welke eigen rekening(en) komen de boekingen van een tegenpartij (zie rekeningLabelVan in
// classification/reviewSummaries.js). Bij meer dan één rekening staat het aantal boekingen erbij.
export default function RekeningLabels({ rekeningen }) {
  const lijst = Object.entries(rekeningen || {});
  if (!lijst.length) return null;
  return (
    <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
      {lijst.map(([label, n]) => (
        <span key={label} className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${label.startsWith("Zakelijk") ? "bg-sky-100 text-sky-800" : label.startsWith("Privé") ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-700"}`}>
          {label}{lijst.length > 1 ? ` (${n}x)` : ""}
        </span>
      ))}
    </span>
  );
}
