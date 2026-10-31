// beide-V12R6 — logo B (afschrift met loep), keuze Boska 31-10. Lichte variant voor donkere achtergrond.
export default function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true" style={{ flex: "none" }}>
      <rect x="1" y="1" width="32" height="32" rx="8" fill="#fff" /><rect x="7" y="6" width="15" height="21" rx="2" fill="#1E2A4A" /><rect x="10" y="10" width="9" height="1.8" rx=".9" fill="#94a3b8" /><rect x="10" y="14" width="6" height="1.8" rx=".9" fill="#94a3b8" /><circle cx="21" cy="21" r="5" fill="#fff" stroke="#0f766e" strokeWidth="2.4" /><path d="M24.6 24.6l3.6 3.6" stroke="#0f766e" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}
