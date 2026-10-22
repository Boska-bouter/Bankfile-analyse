// beide-V1R6 (fase 3) — zet de categorie-indeling van het profiel klaar: de weergave (hoofdcategorieën, labels,
// keuzelijsten) in categories.js, en de privéregels en -vaste lasten in de dossierinstellingen. In een zakelijk
// dossier is categorieen.weergave null en verandert er niets; eventuele privéregels gaan er dan weer uit.
import { useEffect } from "react";
import { setCategorieProfiel } from "../classification/categories.js";

export function useCategorieProfiel(modus, setCategoryRules, setFixedCategories, categoryRules) {
  const cat = modus.categorieen;
  // Tijdens het renderen zetten (net als setActieveRechtsvorm), zodat ook de eerste render al de juiste
  // indeling toont. Het is een vaste waarde per profiel, dus herhalen is onschuldig.
  setCategorieProfiel(cat.weergave || null);
  useEffect(() => {
    setCategoryRules((prev) => (cat.regelsBijwerken ? cat.regelsBijwerken(prev) : cat.regelsOpruimen ? cat.regelsOpruimen(prev) : prev));
  }, [cat, categoryRules, setCategoryRules]);
  useEffect(() => {
    if (cat.vasteLastenBijwerken) setFixedCategories((prev) => cat.vasteLastenBijwerken(prev));
  }, [cat, setFixedCategories]);
  return cat.herkenning || null;
}
