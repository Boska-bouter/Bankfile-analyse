import { useMemo, useState } from "react";
import { ibansMatch } from "../../utils/normalization.js";

// V57 — eigen rekeningen die wel bestaan maar (nog) niet zijn geladen. Net als in de wizard: met het
// IBAN weet de app dat een boeking naar/van die rekening een overboeking tussen je eigen rekeningen is
// (zakelijk ↔ privé: prive opname/ontvangen van zakelijk; zelfde type: "Interne overboeking") in
// plaats van inkomen of een kostenpost. Werkt direct op alle al geladen transacties.
const normIban = (s) => String(s || "").replace(/\s+/g, "").toUpperCase();
const IBAN_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/;
const eur = (n) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

export default function EigenRekeningenPanel({ loadedAccounts = [], eigenRekeningenExtra, onChange, classified = [] }) {
  const lijst = eigenRekeningenExtra || [];
  const [iban, setIban] = useState("");
  const [type, setType] = useState("Prive");
  const [fout, setFout] = useState("");

  const tellers = useMemo(() => {
    const res = {};
    for (const r of lijst) {
      if (!r.iban) continue;
      let n = 0, som = 0;
      for (const tx of classified) {
        if (tx.isMirror || !tx.counterpartyIban) continue;
        if (ibansMatch(tx.counterpartyIban, r.iban)) { n++; som += tx.amount; }
      }
      res[r.iban] = { n, som };
    }
    return res;
  }, [lijst, classified]);

  const voegToe = () => {
    const v = normIban(iban);
    if (!IBAN_RE.test(v)) return setFout("Dit lijkt geen geldig rekeningnummer (IBAN), bijv. NL05INGB0110205316.");
    if (loadedAccounts.some((a) => ibansMatch(a.iban, v))) return setFout("Deze rekening is al als bankbestand geladen.");
    if (lijst.some((r) => r.iban && ibansMatch(r.iban, v))) return setFout("Deze rekening staat er al bij.");
    setFout("");
    onChange([...lijst, { iban: v, accountType: type }]);
    setIban("");
  };
  const verwijder = (idx) => onChange(lijst.filter((_, i) => i !== idx));
  const wijzigType = (idx, t) => onChange(lijst.map((r, i) => (i === idx ? { ...r, accountType: t } : r)));

  return (
    <section className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <h3 className="text-sm font-semibold">Eigen rekeningen</h3>
      <p className="text-xs text-slate-500">
        Heb je nog een rekening (zakelijk of privé) die niet is geladen? Geef het rekeningnummer hier op. Boekingen van en naar die
        rekening worden dan automatisch herkend als overboeking tussen je eigen rekeningen — geen inkomen of kosten.
      </p>

      {loadedAccounts.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1">Geladen bankbestanden</p>
          <ul className="space-y-1">
            {loadedAccounts.map((a) => (
              <li key={a.iban} className="flex items-center gap-2 text-xs rounded-lg bg-slate-50 px-3 py-1.5">
                <span className="font-mono">{a.iban}</span>
                <span className="text-slate-400">{a.accountType === "Zakelijk" ? "Zakelijk" : "Privé"} · geladen</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-slate-600 mb-1">Opgegeven, niet geladen</p>
        {lijst.length === 0 ? (
          <p className="text-xs text-slate-400">Nog geen opgegeven.</p>
        ) : (
          <ul className="space-y-1.5">
            {lijst.map((r, idx) => {
              const t = r.iban ? tellers[r.iban] : null;
              return (
                <li key={`${r.iban}-${idx}`} className="flex items-center gap-2 flex-wrap text-xs rounded-lg border border-slate-100 px-3 py-1.5">
                  <span className="font-mono">{r.iban || "(zonder rekeningnummer)"}</span>
                  <select value={r.accountType || ""} onChange={(e) => wijzigType(idx, e.target.value)} className="rounded border border-slate-300 px-1.5 py-0.5">
                    <option value="Prive">Privé</option>
                    <option value="Zakelijk">Zakelijk</option>
                  </select>
                  {t && <span className="text-slate-400">{t.n} boeking{t.n === 1 ? "" : "en"} gevonden ({eur(t.som)})</span>}
                  <button onClick={() => verwijder(idx)} className="ml-auto text-slate-400 hover:text-red-600">Verwijderen</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={iban}
          onChange={(e) => { setIban(e.target.value); setFout(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") voegToe(); }}
          placeholder="Rekeningnummer (IBAN)"
          className="w-64 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-mono"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
          <option value="Prive">Privérekening</option>
          <option value="Zakelijk">Zakelijke rekening</option>
        </select>
        <button onClick={voegToe} className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800">Toevoegen</button>
      </div>
      {fout && <p className="text-xs text-red-600">{fout}</p>}
    </section>
  );
}
