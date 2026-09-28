export default function HelpHint({ chapter, onOpen, label = "uitleg" }) {
  return (
    <button
      type="button"
      // v253 — stopPropagation: HelpHint staat vaak naast een uitklapbare sectiekop die zelf ook een
      // klik-handler heeft (nu een <div role="button">, zie o.a. ClassificationConfidencePanel.jsx) —
      // zonder dit klapte een klik op "uitleg" per ongeluk ook die sectie in/uit.
      onClick={(e) => { e.stopPropagation(); onOpen(chapter); }}
      className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 underline decoration-dotted"
    >
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-slate-300 text-[10px] leading-none">?</span>
      {label}
    </button>
  );
}
