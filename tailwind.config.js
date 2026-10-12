/** @type {import('tailwindcss').Config} */
// release18V0 — fundament voor een vast ontwerpsysteem. De waarden hieronder zijn bewust gelijk aan wat de app
// al gebruikte, zodat het uiterlijk niet verandert; schermen worden in volgende releases stap voor stap
// op deze namen overgezet in plaats van losse waarden als rounded-[20px] of text-[11.5px].
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Cijfers/IBAN's in hetzelfde lettertype als de rest (met cijfers van gelijke breedte, zie index.css)
        // i.p.v. een typemachinelettertype.
        mono: ['"IBM Plex Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        micro: "11px",
        basis: "13px",
        klein: "11.5px",
        label: "12.5px",
      },
      borderRadius: {
        kaart: "1rem",
        paneel: "1.25rem", // 20px, de hoek van alle dashboardkaarten
        veld: "0.5rem",
      },
      colors: {
        merk: { DEFAULT: "#0f766e", donker: "#115e59", licht: "#ccfbf1" },
        status: { goed: "#047857", let_op: "#b45309", fout: "#be123c" },
      },
      boxShadow: {
        kaart: "0 1px 2px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};
