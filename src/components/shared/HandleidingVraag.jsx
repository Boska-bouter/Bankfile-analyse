import { BookOpen } from "lucide-react";

// beide-V7R6 — vóór het eerste dossier (wens Boska 26-10): eerst de vraag of de handleiding gelezen moet worden, in
// plaats van meteen de wizard. Eén keer per gebruiker per apparaat (App.jsx, sleutel bankoverzicht.handleidingGevraagd).
// Eenvoudig: "Ja" opent de uitleg van Eenvoudig; Uitgebreid: de Help. De wizard start zodra die weer dicht is.
export default function HandleidingVraag({ modus, onJa, onNee }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3" role="dialog" aria-modal="true" aria-labelledby="handleiding-titel">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700"><BookOpen className="h-5 w-5" /></div>
        <h2 id="handleiding-titel" className="text-xl font-bold text-slate-900">Eerst de handleiding lezen?</h2>
        <p className="mt-2 text-sm text-slate-600">
          Voordat het dossier wordt aangemaakt: de handleiding legt in een paar minuten uit hoe {modus === "eenvoudig" ? "Eenvoudig" : "de uitgebreide weergave"} werkt
          en wat er nodig is. Daarna start het dossier vanzelf. De handleiding is later ook altijd te openen via {modus === "eenvoudig" ? "de knop Uitleg" : "het vraagteken onderin de zijbalk"}.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button type="button" onClick={onJa} autoFocus className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Ja, eerst de handleiding</button>
          <button type="button" onClick={onNee} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Nee, meteen beginnen</button>
        </div>
      </div>
    </div>
  );
}
