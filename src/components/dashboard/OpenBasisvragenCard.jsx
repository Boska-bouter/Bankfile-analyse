import { ClipboardList } from "lucide-react";

// release21V1 — vangnet voor basisvragen uit de wizard die (nog) niet beantwoord zijn, bijvoorbeeld
// omdat de wizard zonder bankbestand is doorlopen (dan worden de vragen per jaar overgeslagen) of
// tussentijds is gesloten. "Nu beantwoorden" opent de wizard op precies deze vragen; wat al
// beantwoord is komt niet terug.
export default function OpenBasisvragenCard({ vragen, onBeantwoorden }) {
  if (!vragen || vragen.length === 0) return null;
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-start gap-3">
        <ClipboardList className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
        <div className="flex-1 min-w-[14rem]">
          <p className="text-sm font-semibold text-amber-900">
            Nog niet beantwoord ({vragen.length})
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            Deze basisvragen bepalen mee hoe de app rekent (aftrekposten, auto, lease, BTW). Zolang ze openstaan kan de uitkomst afwijken.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {vragen.map((v) => (
              <li key={v.key} className="rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs text-amber-900">
                {v.label}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={onBeantwoorden}
          className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          Nu beantwoorden
        </button>
      </div>
    </section>
  );
}
