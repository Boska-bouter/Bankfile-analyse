// beide-V1R9 — fase 8: gebruiksvoorwaarden voor privédossiers, met een eigen versienummer naast de zakelijke
// voorwaarden. Artikel 4 t/m 8 (gegevens, toegang, aansprakelijkheid, auteursrecht, wijzigingen) zijn gelijk.
// Bij een inhoudelijke wijziging: VOORWAARDEN_PRIVE_VERSIE ophogen, dan moet iedereen met privé opnieuw akkoord gaan.
import { VOORWAARDEN_ALGEMEEN } from "./voorwaarden.jsx";

export const VOORWAARDEN_PRIVE_VERSIE = "4"; // beide-V7R3 — artikel 4.8 en 5 (gedeeld met zakelijk): peilvraag, gratis abonnement 30 dagen (V7R1: telefoon)
export const VOORWAARDEN_PRIVE_SLEUTEL = "bankoverzicht-voorwaarden-prive";

const Punt = ({ nr, children }) => (
  <li className="flex gap-2"><span className="shrink-0 text-slate-400 tabular-nums">{nr}</span><span>{children}</span></li>
);

// Artikel 1 t/m 3 (eigen voor privé); los te tonen naast de zakelijke voorwaarden, die artikel 4 t/m 8 al bevatten.
export const VOORWAARDEN_PRIVE_EIGEN = (
  <>
    <section>
      <h3 className="font-semibold text-slate-800">1. Waarvoor is deze app bedoeld (privé)</h3>
      <p>
        In een privédossier helpt Bankoverzicht om uit je bankgegevens een overzicht te maken van je inkomsten,
        uitgaven, vaste lasten en sparen, en een <strong>indicatie</strong> te geven van je inkomstenbelasting (box 1 en
        box 3), ook samen met een fiscale partner. Het is een hulpmiddel voor je eigen huishouden, bijvoorbeeld om je
        budget te bekijken of je aangifte voor te bereiden.
      </p>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">2. Wat de app niet is</h3>
      <ol className="space-y-1.5 mt-1">
        <Punt nr="2.1">De app doet geen aangifte en geeft geen fiscaal, juridisch of financieel advies. Ze vervangt geen belastingadviseur, budgetcoach of de Belastingdienst.</Punt>
        <Punt nr="2.2">Alle bedragen, aannames en uitkomsten zijn indicatief. Ze kunnen onvolledig of onjuist zijn, bijvoorbeeld door ontbrekende bankgegevens, een verkeerde indeling, een geschatte loonheffing, een ontbrekende WOZ-waarde of jaaropgave, of een wijziging in de regels.</Punt>
        <Punt nr="2.3">Toeslagen (zorg-, huur-, kinderopvangtoeslag en kindgebonden budget) worden herkend maar niet berekend. De app zegt dus niets over recht op of terugbetaling van toeslagen.</Punt>
        <Punt nr="2.4">De aangifte inkomstenbelasting doe je zelf bij de Belastingdienst. De uitkomst daar kan afwijken van de indicatie in de app.</Punt>
      </ol>
    </section>
    <section>
      <h3 className="font-semibold text-slate-800">3. Jouw verantwoordelijkheid</h3>
      <ol className="space-y-1.5 mt-1">
        <Punt nr="3.1">Jij controleert de uitkomsten voordat je ze gebruikt.</Punt>
        <Punt nr="3.2">Jij bent verantwoordelijk voor wat je ermee doet: de gegevens die je laadt (ook die van je partner, met diens toestemming), de keuzes die je maakt, en elke aangifte of beslissing die je op basis van de app neemt.</Punt>
        <Punt nr="3.3">Raadpleeg bij twijfel een belastingadviseur, de BelastingTelefoon of een budgetcoach.</Punt>
      </ol>
    </section>
  </>
);

export const VOORWAARDEN_PRIVE_INHOUD = (
  <div className="space-y-3">
    {VOORWAARDEN_PRIVE_EIGEN}
    {VOORWAARDEN_ALGEMEEN}
  </div>
);
