import { Upload, Download, Trash2, HelpCircle, Shield, LayoutGrid, CheckCircle2, Settings, Loader2, Check, AlertCircle, FileSpreadsheet, ClipboardList } from "lucide-react";

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

function TabItem({ tabKey, active, badge, onClick }) {
  const Icon = TAB_ICONS[tabKey];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left ${
        active ? "bg-amber-400/10 border-l-[3px] border-amber-400" : "border-l-[3px] border-transparent hover:bg-white/5"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" style={{ color: active ? "#E8B44C" : "#8992B4" }} />
      <span className={`text-[13px] flex-grow ${active ? "font-bold text-white" : "font-medium text-slate-400"}`}>{TAB_LABELS[tabKey]}</span>
      {!!badge && (
        <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-rose-600 text-white shrink-0">{badge}</span>
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
  onToggleHelp,
  saveState,
  lastSavedAt,
  showActies,
  onEditBasisvragen,
  onOpenAangifteberekening,
}) {
  return (
    // `sticky top-0 h-screen overflow-y-auto` (i.p.v. min-h-screen) zodat de zijbalk zelf de
    // schermhoogte houdt en blijft staan tijdens scrollen door de (vaak veel langere) hoofdinhoud —
    // met min-h-screen zou de zijbalk als flex-sibling meestrekken met de hoogte van de hoofdinhoud,
    // waardoor "Beheer" en de footer ver onder de vouw terechtkomen.
    <div className="w-[216px] shrink-0 bg-[#16203A] flex flex-col px-3.5 py-5 sticky top-0 h-screen overflow-y-auto">
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
        <div className="flex flex-col min-w-0">
          <span className="text-[14.5px] font-bold text-white whitespace-nowrap">Bankoverzicht</span>
          <span className="text-[10px] text-slate-400 whitespace-nowrap truncate">{orgName}</span>
        </div>
      </div>

      {/* Rekeninghouder */}
      <div className="px-1.5 pb-4 pt-2 mb-4 border-b border-white/10 text-[11px]">
        {rekeninghouderNaam ? (
          <>
            <span className="text-slate-400">Rekeninghouder: </span>
            <span className="text-slate-200 font-semibold">{rekeninghouderNaam}</span>{" "}
            <button onClick={onEditRekeninghouder} className="text-indigo-300 underline decoration-dotted">
              wijzigen
            </button>
          </>
        ) : (
          <button onClick={onEditRekeninghouder} className="text-slate-400 underline decoration-dotted">
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

      {/* v267 — Acties: verplaatst vanuit de oude "Jaar:.../Excel/Print/Basisvragen"-rij boven het
          (nu verwijderde) Aangifte-statusblok — zelfde handlers als voorheen. */}
      {showActies && (
        <div className="flex flex-col gap-2 pt-3.5 mt-3.5 border-t border-white/10">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-0.5 pb-0.5">Acties</span>

          {onEditBasisvragen && (
            <button onClick={onEditBasisvragen} className="flex items-center gap-2 bg-[#1E2A4A] border border-[#2C3A61] hover:bg-[#25335A] rounded-xl px-3 py-2 text-left">
              <ClipboardList className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              <span className="text-xs font-semibold text-slate-200">Basisvragen bewerken</span>
            </button>
          )}

          {onOpenAangifteberekening && (
            <button onClick={onOpenAangifteberekening} className="flex items-center gap-2 bg-[#1E2A4A] border border-[#2C3A61] hover:bg-[#25335A] rounded-xl px-3 py-2 text-left">
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              <span className="text-xs font-semibold text-slate-200">Indicatieve aangifteberekening</span>
            </button>
          )}
        </div>
      )}

      <div className="flex-grow" />

      {/* Beheer: bestandsacties — zelfde handlers als voorheen in de header-balk */}
      <div className="flex flex-col gap-2 pt-3.5 border-t border-white/10">
        <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-0.5 pb-0.5">Beheer</span>

        <button onClick={onLoadFile} className="flex items-center gap-2 bg-teal-700 hover:bg-teal-600 rounded-xl px-3 py-2 text-left">
          <Upload className="h-3.5 w-3.5 text-white shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-bold text-white">Bestand laden</span>
            <span className="text-[9.5px] text-teal-100">CSV/XLS, MT940, CAMT.053</span>
          </div>
        </button>

        {canSaveProject && (
          <button onClick={onSaveProject} className="flex items-center gap-2 bg-[#1E2A4A] border border-[#2C3A61] hover:bg-[#25335A] rounded-xl px-3 py-2">
            <Download className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            <span className="text-xs font-semibold text-slate-200">Project opslaan</span>
          </button>
        )}

        <button onClick={onLoadProject} className="flex items-center gap-2 bg-[#1E2A4A] border border-[#2C3A61] hover:bg-[#25335A] rounded-xl px-3 py-2">
          <Upload className="h-3.5 w-3.5 text-slate-300 shrink-0" />
          <span className="text-xs font-semibold text-slate-200">Project laden</span>
        </button>

        {canClearAll && (
          <button onClick={onClearAll} className="flex items-center gap-2 border border-rose-900 hover:bg-rose-950/40 rounded-xl px-3 py-2">
            <Trash2 className="h-3.5 w-3.5 text-rose-300 shrink-0" />
            <span className="text-xs font-semibold text-rose-300">Wis alles</span>
          </button>
        )}
      </div>

      {/* Autosave-status, Help, Privacy */}
      <div className="flex flex-col gap-2.5 mt-3.5 pt-3 border-t border-white/10">
        {saveState && (
          <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500" title="Automatisch opgeslagen in déze browser — geen bestand.">
            {saveState === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Opslaan in browser…
              </>
            )}
            {saveState === "saved" && (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                Opgeslagen{lastSavedAt ? ` ${lastSavedAt.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}` : ""}
              </>
            )}
            {saveState === "error" && (
              <>
                <AlertCircle className="h-3 w-3 text-rose-400" /> Opslaan mislukt
              </>
            )}
          </div>
        )}
        <button onClick={onToggleHelp} className="flex items-center gap-2 text-left">
          <HelpCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-[11.5px] text-slate-400">Help en uitleg</span>
        </button>
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="text-[11.5px] text-slate-500">Privacy &amp; beveiliging</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-[7px] h-[7px] rounded-full bg-emerald-400 shrink-0" />
          <span className="text-[11px] text-slate-500">Uw gegevens blijven lokaal</span>
        </div>
      </div>
    </div>
  );
}
