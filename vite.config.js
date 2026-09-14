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

// base: "/Bankfile-analyse/" moet overeenkomen met de repo-naam voor GitHub Pages
// (https://<user>.github.io/<repo>/) — pas dit aan als de repo ooit hernoemd wordt.
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
  base: "/Bankfile-analyse/",
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
});
