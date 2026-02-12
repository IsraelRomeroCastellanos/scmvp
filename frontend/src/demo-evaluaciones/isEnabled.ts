export function isDemoEvaluacionesEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_RIESGO === "1";
}
