# Bankoverzicht — v2 (Vite/React)

Migratie van de standalone `index.html` (Claude-artifact + gecompileerde GitHub Pages-build)
naar een onderhoudbare Vite/React-projectstructuur. Zie `bankoverzicht-audit-migratieplan.md`
voor het volledige plan.

## Status van deze migratie

**Klaar en syntax-geverifieerd (esbuild):**
- `src/utils/` — bedragen, datums, naam-normalisatie
- `src/importers/` — CSV-, Excel-, MT940-parsing, generieke kolomherkenning, transactie-opbouw,
  saldo-consistentiecheck. CAMT.053 is een placeholder (`camt053.js`) met een duidelijke
  foutmelding i.p.v. stil te falen — nog niet geïmplementeerd.
- `src/classification/` — categorieregels, classificatielogica, en een nieuwe
  confidence-scoring-module (`confidence.js`, nog niet in de UI gebruikt)
- `src/tax/` — BTW-berekening, IB-schatting, leningaflossing, factuurperiode-detectie, checklist
- `src/storage/` — `window.storage`-polyfill, projectbestand-naamgeving
- `src/components/shared/` — PanelBadge, SearchInput

**Nog te doen — de hoofdcomponent zelf:**
`src/App.jsx` is op dit moment een **minimale, functionele schil**: upload → parsen → classificeren
→ categorietotalen, met de volledig gemigreerde logica hierboven. Dit bewijst dat de nieuwe
module-structuur werkt, maar dekt nog niet de volledige UI van de originele tool.

Nog over te zetten (stap 4 van het migratieplan), per stuk op dezelfde manier als hierboven —
overnemen met behoud van exact dezelfde regels, niet herbouwen:
- Review-stappen: inkomstenbronnen, overboekingen aan personen, "Overig" opruimen, factuurperiode
- BTW-kwartaaloverzicht, meerjarenoverzicht, aangiftevoorstel, jaaroverzicht-panelen
- Leningen/lease-invoervensters, instellingen-hub (categorieregels, BTW-tarieven, vaste/variabele
  kosten), project opslaan/laden, "Werk te doen"-dashboard, importcontrole-scherm (nieuw, zie
  migratieplan 6a)

## Lokaal draaien

Deze structuur is gebouwd in een omgeving zonder netwerktoegang, dus `npm install` is hier nog
niet uitgevoerd of getest. Bij jou lokaal:

```bash
npm install
npm run dev       # lokale ontwikkelserver
npm run build     # productie-build naar dist/
```

## Deployen

De workflow in `.github/workflows/deploy.yml` bouwt en publiceert automatisch naar GitHub Pages
bij elke push naar `main`. Eenmalig nodig: onder repo-instellingen → Pages → bron instellen op de
`gh-pages`-branch (die de workflow aanmaakt bij de eerste run). Controleer ook `base` in
`vite.config.js` — die moet overeenkomen met je repo-naam.

## Bekende aandachtspunten bij het overzetten van de rest

- De Tailwind-classes in de originele tool waren een handmatige subset (zie de inline `<style>`
  in de oude `index.html`); met echte Tailwind (nu geconfigureerd) werken alle gebruikte classes,
  maar het is de moeite waard om visueel te vergelijken na de eerste volledige build.
- `lucide-react` icons die in de oude bron gebruikt werden (`ChevronDown`, `ChevronRight`, `X`,
  `Plus`, `Building2`, `Home`, `Loader2`, `Printer`, ...) staan als dependency klaar, maar zijn
  nog niet allemaal geïmporteerd in `App.jsx` — komt vanzelf mee bij het overzetten van elk paneel.
