import { useEffect, useRef } from "react";

// Laat een inklapbaar paneel vanzelf opengaan als de app er gericht naartoe springt ("Ga naar deze
// stap", een kaart-link): jumpToSection (App.jsx) stuurt dan een "bankoverzicht-open"-event naar het
// <section>-element. Zonder dit moest je na de sprong nog eens op het paneel zelf klikken.
export function useOpenOnJump(setOpen) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const open = () => setOpen(true);
    el.addEventListener("bankoverzicht-open", open);
    return () => el.removeEventListener("bankoverzicht-open", open);
  });
  return ref;
}
