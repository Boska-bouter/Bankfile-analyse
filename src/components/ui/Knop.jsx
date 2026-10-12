import { KNOP_PRIMAIR, KNOP_SECUNDAIR, KNOP_PIL } from "./stijl.js";

const VARIANT = { primair: KNOP_PRIMAIR, secundair: KNOP_SECUNDAIR, pil: KNOP_PIL };

// <Knop variant="primair|secundair|pil" onClick=…>tekst</Knop> — gewone knop met de gedeelde stijl.
export default function Knop({ variant = "primair", className = "", type = "button", children, ...rest }) {
  return (
    <button type={type} className={`${VARIANT[variant] || VARIANT.primair}${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </button>
  );
}
