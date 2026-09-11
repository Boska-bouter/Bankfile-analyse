import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "/Bankfile-analyse/" moet overeenkomen met de repo-naam voor GitHub Pages
// (https://<user>.github.io/<repo>/) — pas dit aan als de repo ooit hernoemd wordt.
export default defineConfig({
  plugins: [react()],
  base: "/Bankfile-analyse/",
});
