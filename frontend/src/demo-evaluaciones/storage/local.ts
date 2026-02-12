import { SelectionMap } from "../score/calc";

export type SavedEvaluation = {
  id: string;
  createdAt: string;
  selections: SelectionMap;
  total: number;
  bandLabel: string;
  colorName: "Verde" | "Amarillo" | "Rojo";
};

function keyFor(type: "perfil-transaccional" | "grado-riesgo", clienteId: string) {
  return `scmvp_demo_eval_${type}::${clienteId}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function listEvaluations(
  type: "perfil-transaccional" | "grado-riesgo",
  clienteId: string
): SavedEvaluation[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(keyFor(type, clienteId));
  return safeParse<SavedEvaluation[]>(raw, []).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function saveEvaluation(
  type: "perfil-transaccional" | "grado-riesgo",
  clienteId: string,
  data: Omit<SavedEvaluation, "id" | "createdAt">
): SavedEvaluation {
  if (typeof window === "undefined") {
    return { id: "SSR", createdAt: new Date().toISOString(), ...data };
  }

  const existing = listEvaluations(type, clienteId);
  const record: SavedEvaluation = {
    id: crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    ...data,
  };

  const next = [record, ...existing];
  window.localStorage.setItem(keyFor(type, clienteId), JSON.stringify(next));
  return record;
}

export function deleteEvaluation(
  type: "perfil-transaccional" | "grado-riesgo",
  clienteId: string,
  evalId: string
): void {
  if (typeof window === "undefined") return;
  const existing = listEvaluations(type, clienteId);
  const next = existing.filter(e => e.id !== evalId);
  window.localStorage.setItem(keyFor(type, clienteId), JSON.stringify(next));
}

export function clearAllEvaluations(
  type: "perfil-transaccional" | "grado-riesgo",
  clienteId: string
): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(keyFor(type, clienteId));
}
