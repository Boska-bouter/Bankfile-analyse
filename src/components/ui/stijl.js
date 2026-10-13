// Gedeelde stijlen voor knoppen en invoervelden (release19V1). Eén plek voor hoe een knop of veld eruitziet, zodat
// schermen niet elk hun eigen variant van dezelfde klassen kopiëren. De waarden komen uit tailwind.config.js
// (rounded-veld = 8 px, rounded-paneel = 20 px). Bestaande knoppen met precies deze stijl gebruiken nu deze constanten;
// de overige schermen kunnen stap voor stap volgen.
export const KNOP_PRIMAIR = "rounded-veld bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800";
export const KNOP_SECUNDAIR = "rounded-veld border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50";
// Lichtgroen "pil"-knopje voor doorklik-acties in kaartkoppen (bijv. Meerjarenoverzicht →).
export const KNOP_PIL = "inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full px-3 py-1.5";
export const VELD = "rounded-veld border border-slate-300 bg-white px-3 py-2 text-sm";
export const VELD_KLEIN = "rounded-veld border border-slate-300 bg-white px-2.5 py-1.5 text-sm";
export const KNOP_PRIMAIR_KLEIN = "rounded-veld bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800";
export const KNOP_PRIMAIR_VET = "rounded-veld bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800";
export const KNOP_PRIMAIR_GROOT = "inline-flex items-center gap-1 rounded-veld bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800";
export const KNOP_SECUNDAIR_XS = "rounded-veld border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50";
export const KNOP_SECUNDAIR_KLEIN = "rounded-veld border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50";
