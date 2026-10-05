// v304 (V26) — algemeen keuzevenster met meerdere acties, voor beslissingen die meer vragen dan
// OK/Annuleren: "Dossier laden" (huidig dossier vervangen?) en "Nieuw dossier" (eerst opslaan?).
// Net als ConfirmBanner bewust een eigen venster i.p.v. window.confirm() — die werkt onbetrouwbaar
// in de app-op-beginscherm-modus op iOS.
//
// dialog = { title, message (tekst of JSX), actions: [{ label, onClick, variant: "primary" | "danger" | undefined }] }
// "Annuleren" wordt altijd als laatste knop toegevoegd; een klik op een actie sluit het venster eerst.
const VARIANT = {
  primary: "bg-teal-700 text-white hover:bg-teal-800",
  danger: "border border-red-300 text-red-700 hover:bg-red-50",
  default: "border border-slate-300 text-slate-700 hover:bg-slate-50",
};

export default function ConfirmDialog({ dialog, onClose }) {
  if (!dialog) return null;
  const { title, message, actions = [] } = dialog;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-2" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-w-md w-full rounded-xl border-2 border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-1">{title}</h2>
        <div className="text-sm text-slate-500 mb-5 space-y-1.5">{message}</div>
        <div className="space-y-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                onClose();
                a.onClick();
              }}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${VARIANT[a.variant] || VARIANT.default}`}
            >
              {a.label}
            </button>
          ))}
          <button
            onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
          >
            Annuleren
          </button>
        </div>
      </section>
    </div>
  );
}
