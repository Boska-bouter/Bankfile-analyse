import { useState } from "react";
import { APP_RELEASE } from "../../version.js";
import { FileText, Search, BookOpen, Upload, Download, FolderPlus, HelpCircle, LayoutGrid, CheckCircle2, Settings, Loader2, Check, AlertCircle, FileSpreadsheet, ClipboardList, X, Lock, ChevronsLeft, ChevronsRight } from "lucide-react";

// Fase 1 van de dashboard-restyling (zie het bouwvoorstel-document): vervangt de bovenste
// donkere header-balk (titel + bestandsknoppen) en StickyTopNav.jsx door een vaste linker
// zijbalk, zoals goedgekeurd in het mockup-canvas (Stijl F). Navigatie + bestandsacties
// hergebruiken dezelfde handlers/refs die al in App.jsx bestonden — er verandert geen logica,
// alleen waar de knoppen staan.
const TAB_ICONS = {
  overzicht: LayoutGrid,
  controleren: CheckCircle2,
  instellingen: Settings,
};

const TAB_LABELS = {
  overzicht: "Overzicht",
  controleren: "Controleren",
  instellingen: "Instellingen",
};


// Icoonknop met een duidelijke tekstballon (fixed, dus niet afgekapt door de scrollende zijbalk).
function IcoonKnop({ onClick, label, Icon }) {
  const [tip, setTip] = useState(null);
  const toon = (e) => { const r = e.currentTarget.getBoundingClientRect(); setTip({ x: r.left, y: r.top }); };
  return (
    <>
      <button type="button" onClick={onClick} aria-label={label} onMouseEnter={toon} onMouseLeave={() => setTip(null)} onFocus={toon} onBlur={() => setTip(null)}
        className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/10">
        <Icon className="h-[18px] w-[18px]" />
      </button>
      {tip && (
        <span role="tooltip" className="pointer-events-none fixed z-[100] -translate-y-full whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-[13px] font-semibold text-white shadow-xl ring-1 ring-white/20"
          style={{ left: Math.max(8, tip.x), top: tip.y - 8, maxWidth: "calc(100vw - 16px)" }}>
          {label}
        </span>
      )}
    </>
  );
}

function TabItem({ tabKey, active, badge, onClick }) {
  const Icon = TAB_ICONS[tabKey];
  return (
    <button
      type="button"
      onClick={onClick}
      title={TAB_LABELS[tabKey]}
      className={`sb-btn relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left ${
        active ? "bg-sky-400/10 border-l-[3px] border-sky-400" : "border-l-[3px] border-transparent hover:bg-white/5"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" style={{ color: active ? "#7DD3FC" : "#8992B4" }} />
      <span className={`sb-label text-[13px] flex-grow ${active ? "font-bold text-white" : "font-medium text-slate-400"}`}>{TAB_LABELS[tabKey]}</span>
      {!!badge && (
        <span className="sb-badge text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-rose-600 text-white shrink-0">{badge}</span>
      )}
    </button>
  );
}

export default function AppSidebar({
  orgName = "© Paul Gerits",
  rekeninghouderNaam,
  onEditRekeninghouder,
  activeTab,
  onSelectTab,
  tabsVisible,
  controlerenBadge,
  instellingenBadge,
  onLoadFile,
  onSaveProject,
  canSaveProject,
  onLoadProject,
  onClearAll,
  canClearAll,
  onToggleHelp, onZoek, onBegrippen,
  saveState,
  lastSavedAt,
  projectStatus,
  heeftWachtwoord, onWachtwoord, onOpenLog, logAantal = 0,
  showActies,
  onEditBasisvragen,
  onOpenAangifteberekening, onKlantSamenvatting,
  lastActionSnapshot,
  onUndoLastAction,
  onDismissLastAction,
}) {
  // Inklapbaar (alleen iconen). Keuze wordt onthouden; standaard ingeklapt op smalle schermen.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const v = window.localStorage.getItem("bankoverzicht-sidebar-ingeklapt");
      if (v === "1") return true;
      if (v === "0") return false;
    } catch { /* geen opslag beschikbaar */ }
    return typeof window !== "undefined" && window.innerWidth < 900;
  });
  const toggle = () => setCollapsed((c) => { const n = !c; try { window.localStorage.setItem("bankoverzicht-sidebar-ingeklapt", n ? "1" : "0"); } catch { /* negeren */ } return n; });
  return (
    // `sticky top-0 h-screen overflow-y-auto` (i.p.v. min-h-screen) zodat de zijbalk zelf de
    // schermhoogte houdt en blijft staan tijdens scrollen door de (vaak veel langere) hoofdinhoud —
    // met min-h-screen zou de zijbalk als flex-sibling meestrekken met de hoogte van de hoofdinhoud,
    // waardoor "Beheer" en de footer ver onder de vouw terechtkomen.
    // v277 — top/bottom-padding iets ruimer (en op iPad/tablet nog verder omlaag via
    // env(safe-area-inset-top), voor de klok/statusbalk bovenin) en onderin ruimte voor de
    // taakbalk/dock van een laptop. viewport-fit=cover + apple-mobile-web-app-status-bar-style
    // "black-translucent" staan al in index.html, dus de env(safe-area-inset-*)-waarden werken
    // zodra de app als "toegevoegd aan beginscherm" (standalone) wordt gebruikt; op een gewone
    // laptop/desktop vallen die op 0px terug en blijft de iets grotere vaste basis-padding over.
    <div
      className={`${collapsed ? "sb-collapsed w-[68px] px-2" : "w-[216px] px-3.5"} transition-[width] duration-150 shrink-0 bg-[#16203A] flex flex-col sticky top-0 h-screen overflow-y-auto`}
      style={{
        paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))",
        paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Logo + org */}
      <div className="flex items-center gap-2.5 px-1.5 pb-1.5">
        <div
          className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #E8B44C, #C89530)" }}
        >
          <span className="font-bold text-[15px]" style={{ color: "#211705" }}>
            B
          </span>
        </div>
        <div className="sb-label flex flex-col min-w-0 flex-grow">
          <span className="text-[14.5px] font-bold text-white whitespace-nowrap">Bankoverzicht</span>
          <span className="text-[10px] text-slate-400 whitespace-nowrap truncate">{orgName}</span>
        </div>
      </div>
      <button type="button" onClick={toggle} title={collapsed ? "Zijbalk uitklappen" : "Zijbalk inklappen"} aria-label={collapsed ? "Zijbalk uitklappen" : "Zijbalk inklappen"}
        className="sb-btn flex items-center gap-2 self-end rounded-lg px-2 py-1 mb-2 text-slate-500 hover:text-slate-200 hover:bg-white/5">
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><span className="sb-label text-[10.5px]">Inklappen</span><ChevronsLeft className="h-4 w-4" /></>}
      </button>

      {/* Rekeninghouder — v270: groter gemaakt op verzoek, was nauwelijks leesbaar. */}
      <div className="sb-label px-1.5 pb-4 pt-2 mb-4 border-b border-white/10 text-[13px]">
        {rekeninghouderNaam ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-400 text-[11px]">Rekeninghouder</span>
            <span className="text-white font-bold text-[15px] leading-tight">{rekeninghouderNaam}</span>
            <button onClick={onEditRekeninghouder} className="self-start text-indigo-300 underline decoration-dotted text-[11px]">
              wijzigen
            </button>
          </div>
        ) : (
          <button onClick={onEditRekeninghouder} className="text-slate-300 underline decoration-dotted font-semibold">
            + Rekeninghouder invullen
          </button>
        )}
      </div>

      {/* Tabs */}
      {tabsVisible && (
        <div className="flex flex-col gap-1">
          <TabItem tabKey="overzicht" active={activeTab === "overzicht"} onClick={() => onSelectTab("overzicht")} />
          <TabItem tabKey="controleren" active={activeTab === "controleren"} badge={controlerenBadge} onClick={() => onSelectTab("controleren")} />
          <TabItem tabKey="instellingen" active={activeTab === "instellingen"} badge={instellingenBadge} onClick={() => onSelectTab("instellingen")} />
        </div>
      )}

      {/* v304 (V26) — Dossier: de bestandsacties horen bij het dossier dat openstaat (cliënt + jaar),
          niet onderaan bij "Beheer" — maar staan bewust ónder de navigatie, zodat Overzicht/
          Controleren/Instellingen als meest gebruikte onderdeel bovenaan blijven. "Bestand laden" heet
          nu "Bankbestand toevoegen" (het voegt toe aan het dossier, het vervangt niets) en "Wis alles"
          is "Nieuw dossier" (met keuzevenster, zie clearAllData in App.jsx). */}
      <div className="flex flex-col gap-2 pt-3.5 mt-3.5 border-t border-white/10">
        <span className="sb-label text-[10px] font-bold tracking-wider text-slate-500 uppercase px-0.5 pb-0.5">Dossier</span>

        {canClearAll && (
          <button onClick={onClearAll} title="Nieuw dossier" className={`sb-btn flex items-center gap-2 rounded-xl px-3 py-2 ${canSaveProject ? "border border-slate-600 hover:bg-white/5" : "bg-teal-700 hover:bg-teal-600"}`}>
            <FolderPlus className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            <span className={`sb-label text-xs ${canSaveProject ? "font-semibold text-slate-300" : "font-bold text-white"}`}>Nieuw dossier</span>
          </button>
        )}

        {canSaveProject && (
          <>
            <button onClick={onSaveProject} title="Dossier opslaan" className="sb-btn flex items-center gap-2 bg-[#1E2A4A] border border-[#2C3A61] hover:bg-[#25335A] rounded-xl px-3 py-2">
              <Download className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              <span className="sb-label text-xs font-semibold text-slate-200">Dossier opslaan</span>
            </button>
            {onWachtwoord && (
              <button onClick={onWachtwoord} title={heeftWachtwoord ? "Dossier is beveiligd met wachtwoord — wijzig" : "Wachtwoord op dossierbestand"} className="sb-btn -mt-1 flex items-center gap-2 rounded-lg px-3 py-1 text-left hover:bg-white/5">
                <Lock className={`h-3 w-3 shrink-0 ${heeftWachtwoord ? "text-emerald-400" : "text-slate-500"}`} />
                <span className={`sb-label text-[11px] ${heeftWachtwoord ? "text-emerald-300" : "text-slate-400"}`}>{heeftWachtwoord ? "Beveiligd met wachtwoord — wijzig" : "Wachtwoord op bestand"}</span>
              </button>
            )}
          </>
        )}

        <button onClick={onLoadProject} title="Dossier laden" className="sb-btn flex items-center gap-2 bg-[#1E2A4A] border border-[#2C3A61] hover:bg-[#25335A] rounded-xl px-3 py-2">
          <Upload className="h-3.5 w-3.5 text-slate-300 shrink-0" />
          <span className="sb-label text-xs font-semibold text-slate-200">Dossier laden</span>
        </button>

        {canSaveProject && (
        <button onClick={onLoadFile} title="Extra bankbestand toevoegen" className="sb-btn flex items-center gap-2 bg-teal-700 hover:bg-teal-600 rounded-xl px-3 py-2 text-left">
          <Upload className="h-3.5 w-3.5 text-white shrink-0" />
          <div className="sb-label flex flex-col leading-tight">
            <span className="text-xs font-bold text-white">Extra bankbestand toevoegen</span>
            <span className="text-[9.5px] text-teal-100">CSV/XLS, MT940, CAMT.053</span>
          </div>
        </button>
        )}
      </div>

      {/* v267 — Acties: verplaatst vanuit de oude "Jaar:.../Excel/Print/Basisvragen"-rij boven het
          (nu verwijderde) Aangifte-statusblok — zelfde handlers als voorheen. */}
      {showActies && (
        <div className="flex flex-col gap-2 pt-3.5 mt-3.5 border-t border-white/10">
          <span className="sb-label text-[10px] font-bold tracking-wider text-slate-500 uppercase px-0.5 pb-0.5">Acties</span>

          {onEditBasisvragen && (
            <button onClick={onEditBasisvragen} title="Basisvragen bewerken" className="sb-btn flex items-center gap-2 bg-[#1E2A4A] border border-[#2C3A61] hover:bg-[#25335A] rounded-xl px-3 py-2 text-left">
              <ClipboardList className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              <span className="sb-label text-xs font-semibold text-slate-200">Basisvragen bewerken</span>
            </button>
          )}

          {onOpenAangifteberekening && (
            <button onClick={onOpenAangifteberekening} title="Indicatieve aangifteberekening" className="sb-btn flex items-center gap-2 bg-[#1E2A4A] border border-[#2C3A61] hover:bg-[#25335A] rounded-xl px-3 py-2 text-left">
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              <span className="sb-label text-xs font-semibold text-slate-200">Indicatieve aangifteberekening</span>
            </button>
          )}
          {onKlantSamenvatting && (
            <button onClick={onKlantSamenvatting} title="Samenvatting voor de klant (1 pagina, afdrukbaar)" className="sb-btn flex items-center gap-2 bg-[#1E2A4A] border border-[#2C3A61] hover:bg-[#25335A] rounded-xl px-3 py-2 text-left">
              <FileText className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              <span className="sb-label text-xs font-semibold text-slate-200">Samenvatting voor klant</span>
            </button>
          )}
        </div>
      )}

      {/* v269 — "Laatste actie / Ongedaan maken" stond eerst bovenaan (v268); op verzoek nu hieronder,
          direct onder de Acties-knoppen (los van showActies, want een actie kan ook al ongedaan te
          maken zijn vóórdat er een actief jaar is). Bewust wit/opvallend i.p.v. de donkere
          zijbalkstijl, zodat het duidelijk als tijdelijke melding oogt. */}
      {lastActionSnapshot && (
        <div className="mt-3 rounded-xl border-2 border-amber-300 bg-white shadow-lg p-2.5 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-1">
            <p className="text-[11px] text-slate-600 leading-tight">
              Laatste actie: <strong>{lastActionSnapshot.label}</strong>
            </p>
            <button onClick={onDismissLastAction} className="text-slate-400 hover:text-slate-700 shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <button onClick={onUndoLastAction} className="rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-800">
            Ongedaan maken
          </button>
        </div>
      )}

      <div className="flex-grow" />

      {/* Autosave-status, Help, Privacy */}
      <div className="flex flex-col gap-2.5 mt-3.5 pt-3 border-t border-white/10">
        {/* v305 (V27) — dossierbestand-status, bewust los van de autosave hieronder: de browseropslag is
            géén dossierbestand. Amber zodra er wijzigingen zijn die nog niet zijn geëxporteerd. */}
        {projectStatus?.hasData && (() => {
          const tijd = (d) => d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
          const { changes, lastExportAt, loadedName } = projectStatus;
          const dirty = changes > 0;
          const tekst = dirty
            ? `${changes} wijziging${changes === 1 ? "" : "en"} ${
                lastExportAt ? `sinds export ${tijd(lastExportAt)}` : loadedName ? "sinds het laden van het dossierbestand" : "· nog niet als dossierbestand opgeslagen"
              }`
            : lastExportAt
            ? `Dossierbestand opgeslagen ${tijd(lastExportAt)}`
            : loadedName
            ? "Dossierbestand geladen"
            : "Nog geen dossierbestand opgeslagen";
          return (
            <div
              className={`flex items-start gap-1.5 text-[10.5px] ${dirty ? "text-amber-300" : "text-slate-500"}`}
              title="Dossierbestand = het exportbestand (Dossier opslaan). Dit staat los van de automatische browseropslag hieronder."
            >
              {dirty ? <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /> : <FileSpreadsheet className="h-3 w-3 mt-0.5 shrink-0" />}
              <span className="sb-label">{tekst}</span>
            </div>
          );
        })()}
        {saveState && (
          <div className="sb-label flex items-start gap-1.5 text-[10.5px] text-slate-500" title="Automatisch opgeslagen in déze browser — dat is geen dossierbestand. Gebruik 'Dossier opslaan' voor een bestand.">
            {saveState === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Opslaan in browser…
              </>
            )}
            {saveState === "saved" && (
              <>
                <Check className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
                <span>
                  Automatisch opgeslagen{lastSavedAt ? ` ${lastSavedAt.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}` : ""} · browser
                </span>
              </>
            )}
            {saveState === "error" && (
              <>
                <AlertCircle className="h-3 w-3 text-rose-400" /> Opslaan mislukt
              </>
            )}
          </div>
        )}
        {/* Hulpmiddelen in één compacte icoonrij (was: vier losse regels) */}
        <div className="flex flex-wrap items-center gap-0.5 -mx-1">
          <IcoonKnop onClick={onZoek} label="Zoeken in transacties (Ctrl+K)" Icon={Search} />
          <IcoonKnop onClick={onBegrippen} label="Begrippen (uitleg vakwoorden)" Icon={BookOpen} />
          {projectStatus?.hasData && <IcoonKnop onClick={onOpenLog} label={`Wijzigingslog${logAantal ? ` (${logAantal})` : ""}`} Icon={ClipboardList} />}
          <IcoonKnop onClick={onToggleHelp} label="Help en uitleg" Icon={HelpCircle} />
        </div>
        <div className="flex items-center gap-2 text-[10.5px] text-slate-500" title="Privacy & beveiliging: uw gegevens blijven lokaal in deze browser">
          <span className="w-[7px] h-[7px] rounded-full bg-emerald-400 shrink-0" />
          <span className="sb-label">Gegevens blijven lokaal</span>
        </div>
        <div className="text-[10.5px] text-slate-500 break-all" title={`Versie van de app: ${APP_RELEASE}`}>{collapsed ? APP_RELEASE.replace("release", "r") : `Release ${APP_RELEASE}`}</div>
      </div>
    </div>
  );
}
