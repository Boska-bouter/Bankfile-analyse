import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

// Eén vaste build-tijdstempel per build — gebruikt om zowel version.json te vullen als in de
// gebundelde JS te stoppen, zodat een draaiende sessie kan zien of er inmiddels een nieuwere
// build op de server staat (zie src/hooks/useVersionCheck.js). Lost hetzelfde probleem op als de
// cache-control-meta's in index.html, maar dan actief: de gebruiker krijgt een knop "nu
// bijwerken" te zien in plaats van dat ze zelf moeten weten hoe ze hun cache moeten legen.
const buildId = String(Date.now());

// base: "/Bankfile-analyse/" is alleen nodig voor GitHub Pages (https://<user>.github.io/<repo>/)
// — daar draait de tool namelijk onder een submap. Cloudflare draait diezelfde build op de root
// van een eigen domein (bankfile-analyse.<account>.workers.dev/), waar dat submap-pad juist alle
// JS/CSS-bestanden onvindbaar zou maken (leidt tot een lege pagina). GitHub Actions zet altijd
// automatisch de omgevingsvariabele GITHUB_ACTIONS=true — daarmee kan één en dezelfde build-stap
// het juiste pad kiezen, zonder dat er op Cloudflare iets apart ingesteld moet worden.
const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "write-version-file",
      writeBundle(options) {
        const outDir = options.dir || "dist";
        fs.writeFileSync(path.join(outDir, "version.json"), JSON.stringify({ buildId }));
      },
    },
  ],
  base: isGitHubPages ? "/Bankfile-analyse/" : "/",
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
});
