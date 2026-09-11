import { X } from "lucide-react";

export default function SearchInput({ value, onChange, placeholder, className = "" }) {
  return (
    <div className={`flex items-center rounded-md border border-slate-300 bg-white ${className}`}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 rounded-md border-0 px-3 py-1.5 text-sm focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="shrink-0 pr-2.5 pl-1 text-slate-400 hover:text-slate-700"
          aria-label="Zoekveld leegmaken"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
