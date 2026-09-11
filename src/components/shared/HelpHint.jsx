export default function HelpHint({ chapter, onOpen, label = "meer uitleg" }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(chapter)}
      className="inline-flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-700 underline decoration-dotted"
    >
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-300 text-[9px] leading-none">?</span>
      {label}
    </button>
  );
}
