// beide-V12R2 — logo C3 (monogram R→A), keuze Boska 31-10. Lichte variant voor donkere achtergrond.
export default function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true" style={{ flex: "none" }}>
      <rect x="1" y="1" width="32" height="32" rx="8" fill="#fff" />
      <text x="5" y="23" fontFamily="Arial,Helvetica,sans-serif" fontWeight="700" fontSize="14" fill="#1E2A4A">R</text>
      <path d="M14.5 17h5m-2-2.5l2.5 2.5-2.5 2.5" stroke="#0f766e" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="21" y="23" fontFamily="Arial,Helvetica,sans-serif" fontWeight="700" fontSize="14" fill="#0f766e">A</text>
    </svg>
  );
}
