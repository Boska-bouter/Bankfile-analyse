export default function HelpHint({ chapter, onOpen, label = "uitleg" }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(chapter)}
      className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 underline decoration-dotted"
    >
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-slate-300 text-[10px] leading-none">?</span>
      {label}
    </button>
  );
}
