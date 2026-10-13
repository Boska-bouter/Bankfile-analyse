import { ClipboardList, Upload } from "lucide-react";

// release21V4 — lege staat van Controleren en Instellingen zolang er nog geen bankbestand is: toont
// wat er via de wizard al vastligt, zodat je die antwoorden kunt nalopen vóór de import. Alleen
// lezen; wijzigen gaat via "Basisvragen bewerken" (de wizard). Per jaar ingestelde zaken (uren,
// startersaftrek, werkruimte, kwartalen) bestaan pas als er jaren zijn en staan hier dus niet.
const namen = (lijst) => (lijst || []).map((x) => x.naam).filter(Boolean).join(", ");
const jaNee = (v, ja = "Ja", nee = "Nee") => (v === true ? ja : v === false ? nee : null);

export default function VastgelegdeBasisgegevens({
  modus, // "controleren" | "instellingen"
  eigenNamen, rechtsvorm, heeftHolding, korRegeling, btwVerlegd,
  autoWizardStatus, verwachteLease, verwachteLeaseOverig, verwachteLening, verwachteAOV, heeftVoorraad,
  eigenRekeningenExtra, zakelijkeSpaarRekening, opdrachtgeversGevraagd,
  onBewerken, onBankbestand,
}) {
  const isBV = rechtsvorm === "bv";
  const autoTekst = (() => {
    const s = autoWizardStatus?.status;
    if (s == null) return null;
    if (s === "geen") return "Geen auto";
    if (s === "prive") return "Privéauto zakelijk gebruikt (kilometervergoeding)";
    const soort = { koop: "gekocht", operational: "operationele lease", financial: "financiële lease" }[autoWizardStatus.soort];
    return `Auto op de zaak${soort ? ` (${soort})` : ""}`;
  })();
  const lijstTekst = (l, geen) => (l == null ? null : l.length === 0 ? geen : namen(l));
  const spaarTekst = (() => {
    const z = zakelijkeSpaarRekening;
    if (!z) return null;
    const d = [];
    if (z.status) d.push(`zakelijk: ${z.status === "ja" ? `ja${z.naam ? ` (${z.naam})` : ""}` : "nee"}`);
    if (z.priveStatus) d.push(`privé: ${z.priveStatus === "ja" ? `ja${z.priveNaam ? ` (${z.priveNaam})` : ""}` : "nee"}`);
    return d.length ? d.join(" · ") : null;
  })();
  const rekeningenTekst = eigenRekeningenExtra == null
    ? null
    : eigenRekeningenExtra.length === 0
      ? "Geen"
      : eigenRekeningenExtra.map((r) => `${r.iban || "zonder nummer"} (${r.accountType === "Zakelijk" ? "zakelijk" : "privé"}${r.soort === "spaar" ? ", spaar" : ""})`).join(", ");

  const groepen = [
    {
      titel: "Onderneming",
      rijen: [
        ["Rekeninghouder", eigenNamen === null ? null : [eigenNamen?.ondernemer, eigenNamen?.partner && `partner: ${eigenNamen.partner}`].filter(Boolean).join(" · ") || "Niet ingevuld"],
        ["Rechtsvorm", rechtsvorm == null ? null : isBV ? "BV" : "Eenmanszaak/zzp"],
        ...(isBV ? [["Holding", jaNee(heeftHolding, "Ja, holding + werkmaatschappij", "Nee")]] : []),
        ...(!isBV ? [["KOR", jaNee(korRegeling)], ["BTW verlegd", jaNee(btwVerlegd)]] : []),
        ["Opdrachtgevers", opdrachtgeversGevraagd ? "Opgegeven (herkenning omzet)" : null],
      ],
    },
    {
      titel: "Rekeningen",
      rijen: [
        ["Andere eigen rekeningen", rekeningenTekst],
        ["Gekoppelde spaarrekening", spaarTekst],
      ],
    },
    {
      titel: "Auto, lease en lening",
      rijen: [
        ["Auto", autoTekst],
        ["Leaseauto (financieel)", lijstTekst(verwachteLease, "Nee")],
        ["Overige lease", lijstTekst(verwachteLeaseOverig, "Nee")],
        ["Leningen", lijstTekst(verwachteLening, "Nee")],
        ["Voorraad", jaNee(heeftVoorraad)],
        ["AOV", verwachteAOV == null ? null : verwachteAOV.status === "ja" ? `Ja${verwachteAOV.naam ? ` (${verwachteAOV.naam})` : ""}` : "Nee"],
      ],
    },
  ];
  const ietsBekend = groepen.some((g) => g.rijen.some(([, w]) => w != null));

  return (
    <section className="rounded-paneel border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Wat al vastligt</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {modus === "controleren"
            ? "Er is nog geen bankbestand, dus er valt nog niets te controleren. Dit zijn je antwoorden uit de wizard; na de import controleert de app de transacties hiertegen (bijv. of de opgegeven lease en leningen ook echt in de bank staan)."
            : "Er is nog geen bankbestand. Dit zijn je antwoorden uit de wizard. Instellingen per jaar (urencriterium, startersaftrek, werkruimte, BTW-kwartalen) komen na de import."}
        </p>
      </div>

      {ietsBekend ? (
        <div className="grid gap-4 md:grid-cols-3">
          {groepen.map((g) => (
            <div key={g.titel}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{g.titel}</p>
              <dl className="space-y-1.5">
                {g.rijen.map(([label, waarde]) => (
                  <div key={label} className="text-sm">
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className={waarde == null ? "text-amber-700 italic" : "text-slate-800"}>{waarde ?? "Nog niet beantwoord"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-slate-400">Nog niets vastgelegd. Start met de basisvragen of voeg een bankbestand toe.</p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={onBankbestand} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
          <Upload className="h-4 w-4" /> Bankbestand toevoegen
        </button>
        <button type="button" onClick={onBewerken} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <ClipboardList className="h-4 w-4" /> Basisvragen bewerken
        </button>
      </div>
    </section>
  );
}
