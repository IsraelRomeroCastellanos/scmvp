import { EvaluationConfig } from "../types";

export type SelectionMap = Record<string, string | null>;

export type BreakdownRow = {
  criterionId: string;
  criterionLabel: string;
  optionId: string | null;
  optionLabel: string;
  score: number;
};

export type CalcResult = {
  total: number;
  bandLabel: string;
  colorName: "Verde" | "Amarillo" | "Rojo";
  breakdown: BreakdownRow[];
  isComplete: boolean;
};

export function calcEvaluation(config: EvaluationConfig, selections: SelectionMap): CalcResult {
  const breakdown: BreakdownRow[] = [];
  let total = 0;
  let isComplete = true;

  for (const c of config.criteria) {
    const selectedOptionId = selections[c.id] ?? null;
    const opt = selectedOptionId ? c.options.find(o => o.id === selectedOptionId) : undefined;

    if (!opt) isComplete = false;

    const score = opt?.score ?? 0;
    total += score;

    breakdown.push({
      criterionId: c.id,
      criterionLabel: c.label,
      optionId: selectedOptionId,
      optionLabel: opt?.label ?? "—",
      score,
    });
  }

  const band =
    config.bands.find(b => total >= b.min && total <= b.max) ??
    ({ label: "Sin clasificación", colorName: "Amarillo" } as const);

  return {
    total,
    bandLabel: band.label,
    colorName: band.colorName,
    breakdown,
    isComplete,
  };
}
