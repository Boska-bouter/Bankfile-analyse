// Uit App.jsx gehaald (opsplitsing). Zelfde berekening, alle invoer komt binnen via `p`.
import { useMemo } from "react";


export function useWorkflowSteps(p) {
  const {
    activeYear, btwVerlegd, checklistData, korRegeling, parsedFiles,
    yearlyProgress,
  } = p;

  return useMemo(() => {
    if (!activeYear) return [];
    const filesDone = parsedFiles.length > 0;
    const txDone = checklistData.categorizedPct === 100;
    let btwState;
    if (korRegeling === null) btwState = "todo";
    else if (korRegeling === true) btwState = "done";
    else if (btwVerlegd === null || checklistData.quartersOpen.length > 0) btwState = "oranje";
    else btwState = "done";
    return [
      { label: "Bankbestanden", state: filesDone ? "done" : "todo" },
      { label: "Transacties", state: txDone ? "done" : "oranje" },
      { label: "BTW", state: btwState },
      { label: "Jaarcontrole", state: yearlyProgress[activeYear]?.status || "oranje" },
      { label: "Indicatieve aangifteberekening", state: "todo" },
    ];
  }, [activeYear, parsedFiles.length, checklistData, korRegeling, btwVerlegd, yearlyProgress]);
}
