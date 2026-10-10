import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

// Veeg links/rechts om van jaar te wisselen (zelfde gedrag als in "Details en overzichten"): de inhoud volgt je vinger,
// schuift bij een duidelijke veeg weg en het andere jaar komt van de andere kant binnen; anders veert hij terug.
// Een veeg die begint in een invoerveld of in iets dat zelf zijdelings scrolt (brede tabel) telt niet mee;
// omhoog/omlaag scrollen blijft ongemoeid.
export default function JaarSwipe({ years = [], year, onSelectYear, children, style }) {
  const panelRef = useRef(null);
  const contentRef = useRef(null);
  const drag = useRef(null);
  const kanVegen = years.length > 1 && typeof onSelectYear === "function";
  const zijdelingsScrollbaar = (el) => {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      if (n.scrollWidth > n.clientWidth + 2) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === "auto" || ox === "scroll") return true;
      }
    }
    return false;
  };
  const doelJaar = (dx) => { const i = years.indexOf(year); return i < 0 ? undefined : (dx < 0 ? years[i + 1] : years[i - 1]); };
  const zet = (el, transform, opacity, transition) => { el.style.transition = transition; el.style.transform = transform; el.style.opacity = opacity; };
  const terugveren = () => { const el = contentRef.current; if (el) { zet(el, "none", "1", "transform .18s ease-out, opacity .18s ease-out"); } };
  const onTouchStart = (e) => {
    drag.current = null;
    if (!kanVegen || e.touches.length !== 1) return;
    const t = e.target;
    if (t.closest && t.closest("input, select, textarea, [contenteditable=true]")) return;
    if (zijdelingsScrollbaar(t)) return;
    drag.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, mode: null, dx: 0 };
    const el = contentRef.current; if (el) zet(el, "none", "1", "none");
  };
  const onTouchMove = (e) => {
    const d = drag.current; const el = contentRef.current;
    if (!d || !el || !e.touches.length) return;
    const dx = e.touches[0].clientX - d.x, dy = e.touches[0].clientY - d.y;
    if (d.mode === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      d.mode = Math.abs(dx) > Math.abs(dy) * 1.4 ? "h" : "v";
      if (d.mode === "h") el.style.willChange = "transform";
    }
    if (d.mode !== "h") return;
    if (e.cancelable) e.preventDefault();
    d.dx = dx;
    const heeftDoel = doelJaar(dx) != null;
    el.style.transform = `translateX(${dx * (heeftDoel ? 0.8 : 0.2)}px)`;
    el.style.opacity = String(heeftDoel ? Math.max(0.4, 1 - Math.abs(dx) / 450) : 1);
  };
  const klaar = () => { const el = contentRef.current; if (el) el.style.willChange = ""; };
  const onTouchCancel = () => { drag.current = null; terugveren(); klaar(); };
  const onTouchEnd = () => {
    const d = drag.current; drag.current = null;
    const el = contentRef.current;
    if (!d || !el) return;
    if (d.mode !== "h") { terugveren(); return; }
    const naar = doelJaar(d.dx);
    if (Math.abs(d.dx) < 80 || naar == null) { terugveren(); setTimeout(klaar, 200); return; }
    const uit = d.dx < 0 ? -70 : 70;
    zet(el, `translateX(${uit}px)`, "0", "transform .13s ease-in, opacity .13s ease-in");
    setTimeout(() => {
      flushSync(() => onSelectYear(naar));
      zet(el, `translateX(${-uit}px)`, "0", "none");
      requestAnimationFrame(() => requestAnimationFrame(() => {
        zet(el, "none", "1", "transform .24s ease-out, opacity .24s ease-out");
        setTimeout(klaar, 280);
      }));
    }, 130);
  };
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return undefined;
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchCancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
    };
  });
  useEffect(() => {
    if (!kanVegen) return undefined;
    const vorig = document.documentElement.style.overscrollBehaviorX;
    document.documentElement.style.overscrollBehaviorX = "none";
    return () => { document.documentElement.style.overscrollBehaviorX = vorig; };
  }, [kanVegen]);
  return (
    <div ref={panelRef} style={{ overflowX: "clip", ...style }} data-testid="jaar-swipe">
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
