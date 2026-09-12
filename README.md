# Bankoverzicht — Zakelijk & Privé (Vite/React)

Bankbestandanalyse-tool voor Over Rood schuldhulpverlening: verwerkt CSV/Excel/MT940-bankexports
voor ZZP/eenmanszaak, met automatische classificatie, BTW-berekening, jaaroverzicht en een
aangiftevoorstel. Volledig lokaal in de browser — er wordt niets naar een server gestuurd.

Live: https://boska-bouter.github.io/Bankfile-analyse/

Dit is de Vite/React-opvolger van de oorspronkelijke standalone `index.html`
(https://boska-bouter.github.io/Bankfile-inzicht/). De migratie is voltooid: alle functionaliteit
van de oorspronkelijke tool is overgezet, plus een aantal nieuwe verbeteringen (zie hieronder).

## Functionaliteit

- **Import**: CSV, Excel (.xlsx), MT940. CAMT.053 is nog een placeholder (`src/importers/camt053.js`)
  — nog niet geïmplementeerd, staat als laatste openstaande punt op de planning.
- **Classificatie**: automatische indeling op basis van tegenpartij/omschrijving-zoekwoorden,
  met handmatige correcties die tegenpartij-breed (alle jaren) worden onthouden.
- **Categorieën**: een laag van ~14 hoofdcategorieën voor het overzicht (Huisvesting, Vervoer & auto,
  Personeel, Belastingen & heffingen, Privé, ...), met de fijnmazige subtypes (Brandstof, Parkeren,
  Belastingen: LH, ...) behouden onder de motorkap voor BTW-percentage, vast/variabel-indeling en
  fiscale precisie. Zie `src/classification/categories.js` (`SUBTYPE_TO_MAIN`).
- **BTW**: percentage per subtype, kwartaaloverzicht (netto + BTW-uitsplitsing), KOR- en
  BTW-verlegd-instelling, voorbelasting.
- **Jaaroverzicht**: winst uit onderneming, geschat IB, tekort/over, meerjarenoverzicht met trend,
  vaste/variabele kosten.
- **Reviewstappen**: inkomstenbronnen, overboekingen aan personen, "Overig" opruimen, factuurperiode
  vs. boekingskwartaal.
- **Leningen & lease**: rente/aflossing-splitsing per betaling (leningbedrag + startdatum + rente),
  operationeel vs. financieel.
- **Aangifte**: checklist, uitleg "wat waar invullen bij OB/IB", aangiftevoorstel met voorvertoning
  (download/printen).
- **Overig**: "Werk te doen"-dashboard met voortgang per jaar, ongedaan maken (laatste actie),
  duplicaatdetectie, saldo-per-bestand-controle, terugkerende betalingen, project opslaan/laden,
  automatisch bewaren per browser, Help-systeem met per-onderdeel "?"-uitleg.

## Projectstructuur

```
src/
├── App.jsx              — hoofdcomponent: state, coördinatie tussen alle panelen
├── classification/       — categorieregels, classificatie-engine, hoofdcategorie-mapping
├── importers/             — CSV/Excel/MT940-parsing, kolomherkenning, duplicaatdetectie
├── tax/                   — BTW, IB-schatting, leningen/lease, checklist, jaaroverzicht
├── storage/               — browser-opslag, projectbestand-formaat
├── reports/               — Excel-export, aangiftevoorstel, printen
├── content/               — Help-teksten (gedeeld tussen het Help-paneel en de "?"-pop-ups)
└── components/            — UI, per domein (overview, btw, review, loans, settings, dashboard, shared)
```

`App.jsx` is met opzet nog de centrale coördinator (state + doorgeven aan panelen). Een verdere
opsplitsing in bijv. React Context/hooks staat op de planning zodra dat nodig wordt.

## Lokaal draaien

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

## Privacy

Alle verwerking gebeurt lokaal in de browser. Bankbestanden en projectdata worden alleen in de
browser-opslag van het apparaat bewaard (`window.storage`-polyfill) — er is geen server
betrokken bij de financiële verwerking, en er wordt niets extern verstuurd.

## Bekende openstaande punten

- CAMT.053-import (placeholder, geeft een duidelijke foutmelding i.p.v. stil te falen)
- Een zichtbaar zekerheids-/confidence-systeem in de UI (de module `src/classification/confidence.js`
  bestaat, maar is nog niet aangesloten)
- Tegenpartijregels expliciet beheerbaar maken (nu impliciet via correcties) en IBAN-gebaseerd
  herkennen waar het bankbestand IBAN's bevat
- Importcontrole-scherm (samenvattend "is dit bestand goed ingelezen"-overzicht vóór classificatie)
- `App.jsx` verder opsplitsen naarmate de tool groeit
