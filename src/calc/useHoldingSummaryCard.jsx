// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";
import CardIcon from "../components/shared/CardIcon.jsx";
import { eur } from "../utils/amounts.js";

export function useHoldingSummaryCard(p) {
  const {
    activeYear, evVerloop, heeftHolding, holdingBoekingen, holdingBoekingenSectionRef,
    jumpToSection, rechtsvorm, setShowHoldingBoekingen,
  } = p;

  return useMemo(() => {
    if (rechtsvorm !== "bv" || heeftHolding !== true || !activeYear) return null;
    const b = holdingBoekingen?.[activeYear] || {};
    const ev = evVerloop?.[activeYear] || { kapitaalstorting: 0, dividend: 0 };
    const kapitaalstortingHolding = b.kapitaalstorting ?? null;
    const dividendOntvangenHolding = b.dividendOntvangen ?? null;
    const ingevuld = kapitaalstortingHolding != null || dividendOntvangenHolding != null;
    const kapitaalVerschil = (kapitaalstortingHolding || 0) - ev.kapitaalstorting;
    const dividendVerschil = (dividendOntvangenHolding || 0) - ev.dividend;
    const heeftVerschil = ingevuld && (Math.abs(kapitaalVerschil) >= 1 || Math.abs(dividendVerschil) >= 1);
    return {
      key: "holdingBoekingen",
      title: `Holding-boekingen ${activeYear}`,
      icon: <CardIcon name="building" />,
      lines: [
        { label: "Kapitaalstorting (holding)", value: kapitaalstortingHolding != null ? eur(kapitaalstortingHolding) : "— nog niet ingevuld" },
        { label: "Dividend ontvangen (holding)", value: dividendOntvangenHolding != null ? eur(dividendOntvangenHolding) : "— nog niet ingevuld" },
      ],
      subtitle: !ingevuld
        ? "Nog niet ingevuld"
        : heeftVerschil
        ? `Verschil met werkmaatschappij: kapitaal ${eur(kapitaalVerschil)}, dividend ${eur(dividendVerschil)}`
        : "Sluit aan met de werkmaatschappij",
      tone: !ingevuld ? "neutral" : heeftVerschil ? "attention" : "ok",
      hint: "Naar de holding-boekingen",
      onClick: () => {
        setShowHoldingBoekingen(true);
        jumpToSection(holdingBoekingenSectionRef);
      },
      actionLabel: "Bewerken",
    };
  }, [rechtsvorm, heeftHolding, activeYear, holdingBoekingen, evVerloop]);
}
