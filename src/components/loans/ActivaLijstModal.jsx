import { useMemo, useState } from "react";
import ModalShell from "../modals/ModalShell.jsx";
import { KNOP_PRIMAIR, KNOP_SECUNDAIR_KLEIN } from "../ui/stijl.js";
import { leesActivaTabel, splitsTabel, bepaalActies, naAntwoorden, activaNaarRijen, KOLOMMEN, SJABLOON_VOORBEELD } from "../../tax/activaLijst.js";
import { leesExcelBladen, schrijfExcel } from "../../importers/excel.js";
import { eur } from "../../utils/amounts.js";

// nieuw-V4R0 — activa als lijst inlezen (wens Boska 12-11): Excel, CSV of een geplakte tabel. Eerst controleren, dan pas toevoegen.
const nlDatum = (iso) => (iso ? iso.split("-").reverse().join("-") : "");
const ACTIE = {
  nieuw: ["Nieuw", "bg-teal-50 text-teal-800"],
  koppel: ["Bij bankbetaling", "bg-sky-50 text-sky-800"],
  vraag: ["Dubbel?", "bg-amber-100 text-amber-800"],
  overslaan: ["Overgeslagen", "bg-slate-100 text-slate-500"],
  fout: ["Fout", "bg-rose-50 text-rose-700"],
};

export async function downloadSjabloon() {
  await schrijfExcel([KOLOMMEN.map((k) => k.kop), ...SJABLOON_VOORBEELD], "Activa", "Activa sjabloon.xlsx");
}
export async function exporteerActiva(activaSummary, activaDetails, naam = "") {
  await schrijfExcel(activaNaarRijen(activaSummary, activaDetails), "Activa", `Activa${naam ? ` ${naam}` : ""}.xlsx`);
}

export default function ActivaLijstModal({ activaSummary, activaDetails, onToevoegen, onClose }) {
  const [plak, setPlak] = useState("");
  const [bron, setBron] = useState(null); // { naam, rijen }
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);
  const [antwoorden, setAntwoorden] = useState({}); // nieuw-V4R2 — per rij: true = toch toevoegen, false = overslaan

  const uitkomst = useMemo(() => (bron ? leesActivaTabel(bron.rijen) : null), [bron]);
  const voorstel = useMemo(() => (uitkomst?.regels?.length ? bepaalActies(uitkomst.regels, activaSummary, activaDetails) : []), [uitkomst, activaSummary, activaDetails]);
  const acties = useMemo(() => naAntwoorden(voorstel, antwoorden), [voorstel, antwoorden]);
  const antwoord = (regel, ja) => setAntwoorden((a) => ({ ...a, [regel]: ja }));
  const tel = (a) => acties.filter((r) => r.actie === a).length;
  const toe = tel("nieuw") + tel("koppel");
  const open = tel("vraag");

  const kiesBestand = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBezig(true); setFout("");
    try {
      if (/\.(xlsx|xls|ods|numbers)$/i.test(f.name)) {
        const bladen = await leesExcelBladen(f);
        const blad = bladen.find((b) => leesActivaTabel(b.rijen).kolommen) || bladen[0];
        setAntwoorden({}); setBron({ naam: f.name + (bladen.length > 1 ? ` (blad ${blad.naam})` : ""), rijen: blad?.rijen || [] });
      } else {
        setAntwoorden({}); setBron({ naam: f.name, rijen: splitsTabel(await f.text()) });
      }
    } catch (err) { setFout(err.message || "Het bestand kon niet worden gelezen."); } finally { setBezig(false); }
  };
  const leesPlak = () => { setFout(""); setAntwoorden({}); setBron({ naam: "geplakte tabel", rijen: splitsTabel(plak) }); };

  return (
    <ModalShell title="Activa als lijst inlezen" onClose={onClose} maxWidth="max-w-3xl">
      {!bron ? (
        <div className="space-y-4 text-sm">
          <p className="text-slate-600">Lees een lijst met bedrijfsmiddelen in uit Excel of CSV, of plak een tabel. De eerste rij moet koppen hebben, zoals Omschrijving, Aanschafdatum, Aanschafwaarde (excl. btw) en Afschrijvingstermijn. Restwaarde, Nieuw of gebruikt, Einddatum en KIA (ja/nee) mogen erbij.</p>
          <div className="flex flex-wrap gap-2">
            <label className={`${KNOP_PRIMAIR} cursor-pointer`}>
              {bezig ? "Bezig…" : "Bestand kiezen (Excel of CSV)"}
              <input type="file" accept=".xlsx,.xls,.ods,.csv,.txt,text/csv" className="hidden" onChange={kiesBestand} />
            </label>
            <button type="button" className={KNOP_SECUNDAIR_KLEIN} onClick={() => downloadSjabloon().catch((e) => setFout(e.message))}>Sjabloon downloaden</button>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">Of plak hier een tabel (bijvoorbeeld gekopieerd uit Excel of Numbers)</p>
            <textarea value={plak} onChange={(e) => setPlak(e.target.value)} rows={6} placeholder={"Omschrijving\tAanschafdatum\tAanschafwaarde\tAfschrijvingstermijn\nKoelvitrine\t15-03-2024\t2450\t5"}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-2 font-mono text-xs" aria-label="Geplakte tabel" />
            <button type="button" disabled={!plak.trim()} onClick={leesPlak} className={`${KNOP_PRIMAIR} mt-2 disabled:opacity-40`}>Tabel lezen</button>
          </div>
          {fout && <p className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{fout}</p>}
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">Uit <b>{bron.naam}</b>: {acties.length} regel{acties.length === 1 ? "" : "s"}{uitkomst?.leeg?.length ? ` (${uitkomst.leeg.length} lege regel${uitkomst.leeg.length === 1 ? "" : "s"} overgeslagen)` : ""}. Controleer de lijst; er verandert pas iets na "Toevoegen".</p>
          {uitkomst?.fout && <p className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{uitkomst.fout}</p>}
          {acties.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                {["nieuw", "koppel", "vraag", "overslaan", "fout"].filter((a) => tel(a)).map((a) => <span key={a} className={`rounded-full px-2 py-0.5 font-medium ${ACTIE[a][1]}`}>{ACTIE[a][0]}: {tel(a)}</span>)}
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr><th className="px-2 py-1.5">Rij</th><th className="px-2 py-1.5">Omschrijving</th><th className="px-2 py-1.5">Aanschaf</th><th className="px-2 py-1.5 text-right">Waarde</th><th className="px-2 py-1.5 text-right">Jaren</th><th className="px-2 py-1.5 text-right">Rest</th><th className="px-2 py-1.5">Wat gebeurt er</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {acties.map((r) => (
                      <tr key={r.regel} className={r.actie === "fout" ? "bg-rose-50/50" : r.actie === "overslaan" ? "text-slate-400" : r.actie === "vraag" ? "bg-amber-50/60" : ""}>
                        <td className="px-2 py-1.5 text-slate-400">{r.regel}</td>
                        <td className="px-2 py-1.5 font-medium">{r.naam || "–"}{r.details.staat && <span className="block font-normal text-slate-500">{r.details.staat}</span>}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{nlDatum(r.details.aanschafdatum)}</td>
                        <td className="px-2 py-1.5 text-right whitespace-nowrap">{r.details.aanschafwaarde != null ? eur(r.details.aanschafwaarde) : ""}</td>
                        <td className="px-2 py-1.5 text-right">{r.details.afschrijvingstermijnJaren ?? ""}</td>
                        <td className="px-2 py-1.5 text-right whitespace-nowrap">{r.details.restwaarde != null ? eur(r.details.restwaarde) : ""}</td>
                        <td className="px-2 py-1.5">
                          <span className={`rounded-full px-2 py-0.5 font-medium ${ACTIE[r.actie][1]}`}>{ACTIE[r.actie][0]}</span>
                          {r.actie === "fout" && <span className="block mt-0.5 text-rose-700">{r.fouten.join("; ")}</span>}
                          {(r.actie === "vraag" || r.actie === "overslaan" || r.gevraagd) && <span className="block mt-0.5">{r.reden}</span>}
                          {r.actie === "vraag" || r.actie === "overslaan" || r.gevraagd ? (
                            <span className="mt-1 flex flex-wrap items-center gap-1">
                              {r.actie === "vraag" && <span className="w-full text-amber-800">Klopt het dat er meerdere zijn?</span>}
                              <button type="button" onClick={() => antwoord(r.regel, true)}
                                className={`rounded-md border px-2 py-0.5 ${antwoorden[r.regel] === true ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 bg-white text-slate-700"}`}>Ja, toevoegen</button>
                              <button type="button" onClick={() => antwoord(r.regel, false)}
                                className={`rounded-md border px-2 py-0.5 ${antwoorden[r.regel] === false ? "border-slate-600 bg-slate-600 text-white" : "border-slate-300 bg-white text-slate-700"}`}>Nee, overslaan</button>
                            </span>
                          ) : null}
                          {r.actie === "koppel" && <span className="block mt-0.5 text-sky-800">{r.bank.naam}, {eur(r.bank.bedrag)} op {nlDatum(r.bank.datum)}</span>}
                          {r.actie === "nieuw" && !r.details.afschrijvingstermijnJaren && <span className="block mt-0.5 text-amber-700">termijn nog invullen</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" disabled={!toe || open > 0} className={`${KNOP_PRIMAIR} disabled:opacity-40`}
              onClick={() => { onToevoegen(acties.filter((r) => r.actie === "nieuw" || r.actie === "koppel")); onClose(); }}>
              {open ? `Eerst ${open} vra${open === 1 ? "ag" : "gen"} beantwoorden` : toe ? `${toe} toevoegen` : "Niets toe te voegen"}
            </button>
            <button type="button" className={KNOP_SECUNDAIR_KLEIN} onClick={() => setBron(null)}>Ander bestand of tabel</button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
