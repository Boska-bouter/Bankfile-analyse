# Bankoverzicht-tool — Technische audit & migratieplan naar Vite/React

*Gebaseerd op de JSX-bron `bankoverzicht-tool.jsx` (~2500 regels), zoals gebruikt in de chat "Financieel overzicht zakelijk en privé".*

## 1. Huidige staat

**Eén bestand, twee builds.** De JSX-bron wordt met esbuild gecompileerd tot:
- Het Claude-artifact (React.createElement, geen echte browser-load)
- De standalone `index.html` op GitHub Pages, met een preamble die `window.storage` polyfilled bovenop `localStorage`

**Structuur van de bron:**
- ~500 regels losse functies: CSV/Excel/MT940-parsing, kolomherkenning, classificatie, BTW-berekening, leningaflossing, IB-schatting
- Eén component `BankOverzichtTool` van ~2000 regels — bevat alle state (60+ `useState`-hooks), alle upload/opslag-logica, en de hele pagina-render
- Zes kleinere subcomponenten onderaan (PanelBadge, SearchInput, GroupView, EditRow, IncomeReviewStep, PersonReviewStep, etc.) — deze zijn al redelijk op zichzelf staand

**Wat goed zit en behouden moet blijven:**
- De domeinkennis in de comments (bijv. de bewuste volgorde van BTW-naheffingscategorieën, de WUO-berekening die onttrekkingen uitsluit, de factuurperiode-detectie)
- Categorieregels (`DEFAULT_RULES`), BTW-tarieven per categorie, de migratie-mappings voor hernoemde categorieën (`LEGACY_CATEGORY_RENAMES`)
- De opslagstructuur via `window.storage` (personal/shared-scoped key-value, al los van `localStorage`)

## 2. Bevindingen — risico's en verbeterpunten

| Onderdeel | Bevinding |
|---|---|
| Bankherkenning | Generieke kolomherkenning via `HEADER_ALIASES` (aliassen + substring-match). Geen bankspecifieke profielen — werkt "toevallig" voor veel banken, maar geeft geen garanties en kan bij edge cases (bijv. een kolomnaam die toevallig op twee aliassen matcht) fout gaan. |
| Bestandsformaten | CSV, Excel, MT940. **Geen CAMT.053/CAMT.054** — een steeds vaker gebruikt, rijker bankexportformaat. |
| Classificatie | Zuiver keyword-matching (`autoClassify`), geen confidence score. Werkt goed door de zorgvuldige regelvolgorde, maar elke nieuwe regel kan in theorie een eerdere regel "verschaduwen" — dat is nu alleen in comments gedocumenteerd, niet getest. |
| Component-omvang | `BankOverzichtTool` doet te veel: state, business logic én render in één functie. Dit maakt het risicovol om iets te wijzigen — een fout in een klein stukje (bijv. de leningaflossing-berekening) kan onopgemerkt de rest raken omdat alles in dezelfde scope leeft. |
| Testdekking | Geen geautomatiseerde tests zichtbaar. Correctheid leunt op handmatige verificatie (zoals de saldo-consistentie-check in de tool zelf, en de esbuild-compileercheck in de vorige sessie). |
| Duplicatie tussen builds | Twee build-paden (artifact vs. standalone) delen dezelfde bron maar met net andere preambles — foutgevoelig bij toekomstige wijzigingen aan de opslaglaag. |

Geen van deze punten is acuut kapot — de tool werkt aantoonbaar (esbuild-compilatie is eerder al geverifieerd). Het zijn onderhoudbaarheids- en uitbreidbaarheidsrisico's, niet correctheidsbugs.

## 3. Doelstructuur

```
bankoverzicht/
├── index.html
├── package.json
├── vite.config.js
├── .github/workflows/deploy.yml
│
├── src/
│   ├── main.jsx
│   ├── App.jsx                      # dunne wrapper, orkestreert de stappen hieronder
│   │
│   ├── components/
│   │   ├── upload/FileUpload.jsx
│   │   ├── review/IncomeReviewStep.jsx
│   │   ├── review/PersonReviewStep.jsx
│   │   ├── review/OverigReviewStep.jsx
│   │   ├── review/PeriodeReviewStep.jsx
│   │   ├── overview/YearSummaryPanel.jsx
│   │   ├── overview/GroupView.jsx
│   │   ├── overview/MultiYearOverview.jsx
│   │   ├── btw/BtwQuarterlyPanel.jsx
│   │   ├── btw/BtwRatesPanel.jsx
│   │   ├── loans/LoanDetailsModal.jsx
│   │   └── shared/ (PanelBadge, SearchInput, EditRow, ...)
│   │
│   ├── importers/
│   │   ├── csv.js
│   │   ├── excel.js
│   │   ├── mt940.js
│   │   ├── camt053.js               # nieuw
│   │   ├── bankProfiles.js          # nieuw — per-bank kolomdefinities
│   │   └── detector.js              # kiest importer + bankprofiel
│   │
│   ├── classification/
│   │   ├── categories.js            # DEFAULT_RULES, CATEGORY_ORDER, CATEGORY_COLOR
│   │   ├── classify.js              # autoClassify, resolveClassification
│   │   └── confidence.js            # nieuw — scoring i.p.v. eerste-match-wint
│   │
│   ├── tax/
│   │   ├── btw.js                   # computeBtw, quarterlyBtw
│   │   ├── incomeTax.js             # estimateIncomeTax, IB_TARIEVEN_BY_YEAR
│   │   └── loanAmortization.js
│   │
│   ├── storage/
│   │   └── projectStorage.js        # window.storage-wrapper, project save/load
│   │
│   └── utils/
│       ├── dates.js
│       ├── amounts.js (parseEuroNumber)
│       └── normalization.js (normKey, counterpartyKey)
│
└── README.md
```

De hoofdcomponent (`App.jsx`) wordt hiermee een orkestrator die state doorgeeft aan gespecialiseerde componenten, in plaats van alles zelf te bevatten.

## 4. Migratieplan — stapsgewijs

Bewust incrementeel: eerst het skelet neerzetten en verifiëren dat de gemigreerde tool identiek werkt aan de huidige, dán pas nieuwe features (CAMT.053, confidence scoring, bankprofielen) toevoegen.

**Stap 1 — Project-skelet**
`npm create vite@latest` met React-template, Tailwind instellen (huidige tool gebruikt utility-classes uit een subset — die moeten behouden blijven of via echte Tailwind lopen), dependencies installeren (papaparse, xlsx, lucide-react).

**Stap 2 — Pure functies eruit trekken**
De ~500 regels bovenin de bron (parsing, classificatie, BTW, leningen) verhuizen 1-op-1 naar `importers/`, `classification/`, `tax/`, `utils/` — dit is copy-paste met imports, geen gedragswijziging. Laagste risico, hoogste winst voor leesbaarheid.

**Stap 3 — Subcomponenten eruit trekken**
De zes al-onafhankelijke componenten (PanelBadge, SearchInput, GroupView, EditRow, de Review-steps, LoanDetailsModal) krijgen elk hun eigen bestand. Ook hier: functioneel ongewijzigd, alleen verplaatst.

**Stap 4 — Hoofdcomponent opsplitsen**
Het moeilijkste deel. `BankOverzichtTool` wordt geknipt in samenhangende brokken (uploadflow, review-flow, jaaroverzicht, BTW-kwartaaloverzicht, instellingen-hub) die ieder hun eigen state beheren waar mogelijk, met gedeelde state (transacties, overrides, instellingen) via props of een lichte context omhoog.

**Stap 5 — Verificatie**
Test met echte, eerder gebruikte bankbestanden dat het gemigreerde resultaat (categorieën, BTW-berekeningen, jaaroverzichten) exact overeenkomt met de huidige tool, vóórdat er iets nieuws wordt toegevoegd.

**Stap 6 — GitHub Actions**
Workflow die bij elke push naar `main` `npm run build` draait en het resultaat naar `gh-pages` publiceert — zie sectie 5.

**Stap 7 — Nieuwe features (v2)**
Pas ná stap 5, op de nu overzichtelijke basis:
- CAMT.053/CAMT.054-parser in `importers/camt053.js`
- Bankprofielen in `importers/bankProfiles.js` (ABN AMRO, ING, Rabobank, SNS/ASN, Bunq, Knab, Triodos als eerste set — de huidige generieke aliasherkenning blijft als fallback voor onbekende banken)
- Confidence scoring in `classification/confidence.js` — begin met een eenvoudige score (exacte tegenpartij-match = hoog, keyword-match = middel, fallback = laag) en toon dat in de UI bij "Overig"/twijfelgevallen, zonder de bestaande, bewezen classificatielogica te vervangen

## 5. GitHub Actions — deploy workflow

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Na deze eenmalige setup: gewoon committen naar `main`, de build en publicatie gaan vanzelf — geen andere workflow-verandering ten opzichte van nu.

## 6. Wat dit niet oplost (bewust buiten scope)

- Geen geautomatiseerde testsuite is hier meegenomen — waardevol als vervolgstap na de migratie, maar geen vereiste ervoor.
- De opslagstructuur (`window.storage`, projectbestand-formaat) blijft ongewijzigd — geen reden om dat nu ook nog aan te passen.
