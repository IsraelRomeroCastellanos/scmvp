"use client";

import React, { useEffect, useMemo, useState } from "react";
import { EvaluationConfig } from "../types";
import { calcEvaluation, SelectionMap } from "../score/calc";
import { ColorBadge } from "./badges";
import { clearAllEvaluations, deleteEvaluation, listEvaluations, saveEvaluation, SavedEvaluation } from "../storage/local";

function emptySelections(config: EvaluationConfig): SelectionMap {
  const m: SelectionMap = {};
  for (const c of config.criteria) m[c.id] = null;
  return m;
}

export function EvaluationForm({
  config,
  clienteId,
}: {
  config: EvaluationConfig;
  clienteId: string;
}) {
  const [selections, setSelections] = useState<SelectionMap>(() => emptySelections(config));
  const [saved, setSaved] = useState<SavedEvaluation[]>([]);
  const result = useMemo(() => calcEvaluation(config, selections), [config, selections]);

  useEffect(() => {
    setSaved(listEvaluations(config.id, clienteId));
  }, [config.id, clienteId]);

  function onChange(criterionId: string, optionId: string) {
    setSelections(prev => ({ ...prev, [criterionId]: optionId }));
  }

  function onReset() {
    setSelections(emptySelections(config));
  }

  function onSave() {
    const record = saveEvaluation(config.id, clienteId, {
      selections,
      total: result.total,
      bandLabel: result.bandLabel,
      colorName: result.colorName,
    });
    setSaved(prev => [record, ...prev]);
  }

  function onLoad(item: SavedEvaluation) {
    setSelections(item.selections);
  }

  function onDelete(evalId: string) {
    deleteEvaluation(config.id, clienteId, evalId);
    setSaved(listEvaluations(config.id, clienteId));
  }

  function onClearAll() {
    clearAllEvaluations(config.id, clienteId);
    setSaved([]);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-base font-semibold">Criterios</div>
          <button type="button" onClick={onReset} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
            Limpiar
          </button>
        </div>

        <div className="space-y-4">
          {config.criteria.map(c => (
            <div key={c.id} className="space-y-1">
              <label className="text-sm font-medium">{c.label}</label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={selections[c.id] ?? ""}
                onChange={(e) => onChange(c.id, e.target.value)}
              >
                <option value="" disabled>Selecciona…</option>
                {c.options.map(o => (
                  <option key={o.id} value={o.id}>
                    ({o.score}) {o.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            disabled={!result.isComplete}
            title={!result.isComplete ? "Selecciona todos los criterios para guardar" : "Guardar evaluación"}
          >
            Guardar evaluación
          </button>

          <button
            type="button"
            onClick={onClearAll}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
            disabled={saved.length === 0}
          >
            Borrar historial
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-2 text-base font-semibold">Resultado</div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-3xl font-semibold tabular-nums">{result.total}</div>
            <div className="text-sm">
              <div className="font-medium">{result.bandLabel}</div>
              <div className="text-gray-500">Suma de criterios (1–12)</div>
            </div>
            <div className="ml-auto">
              <ColorBadge colorName={result.colorName} />
            </div>
          </div>

          {!result.isComplete ? (
            <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
              Selecciona todos los criterios para completar la evaluación.
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-3 text-base font-semibold">Desglose</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2">Criterio</th>
                  <th className="py-2">Selección</th>
                  <th className="py-2 text-right">Puntaje</th>
                </tr>
              </thead>
              <tbody>
                {result.breakdown.map(r => (
                  <tr key={r.criterionId} className="border-t">
                    <td className="py-2 font-medium">{r.criterionLabel}</td>
                    <td className="py-2">{r.optionLabel}</td>
                    <td className="py-2 text-right tabular-nums">{r.score}</td>
                  </tr>
                ))}
                <tr className="border-t">
                  <td className="py-2 font-semibold" colSpan={2}>Total</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{result.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-base font-semibold">Historial guardado</div>
            <div className="text-xs text-gray-500">localStorage</div>
          </div>

          {saved.length === 0 ? (
            <div className="text-sm text-gray-500">Sin evaluaciones guardadas.</div>
          ) : (
            <div className="space-y-2">
              {saved.map(item => (
                <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                  <div className="text-lg font-semibold tabular-nums">{item.total}</div>
                  <div className="text-sm">
                    <div className="font-medium">{item.bandLabel}</div>
                    <div className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <ColorBadge colorName={item.colorName} />
                    <button type="button" onClick={() => onLoad(item)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
                      Cargar
                    </button>
                    <button type="button" onClick={() => onDelete(item.id)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
