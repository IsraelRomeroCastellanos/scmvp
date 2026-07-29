'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  getApiErrorMessage,
  isApiRequestCanceled,
  obtenerOperacionesVulnerables,
} from '@/lib/api';
import type {
  ActividadVulnerableGeneral,
  OperacionVulnerable,
} from '@/types/actividades-vulnerables';

type Props = {
  actividades: ActividadVulnerableGeneral[];
  actividadClave: string;
  operacionClave: string;
  disabled?: boolean;
  touched?: boolean;
  error?: string | null;
  onActividadChange: (clave: string) => void;
  onOperacionChange: (clave: string) => void;
  onTouched?: () => void;
  onOperacionOptionsChange?: (operaciones: OperacionVulnerable[]) => void;
};

export default function PldSelectionFields({
  actividades,
  actividadClave,
  operacionClave,
  disabled = false,
  touched = false,
  error: selectionError = null,
  onActividadChange,
  onOperacionChange,
  onTouched,
  onOperacionOptionsChange,
}: Props) {
  const instanceId = useId().replace(/:/g, '');
  const titleId = `pld-title-${instanceId}`;
  const helpId = `pld-help-${instanceId}`;
  const errorId = `pld-error-${instanceId}`;
  const activityId = `actividad-vulnerable-${instanceId}`;
  const activityLabelId = `actividad-vulnerable-label-${instanceId}`;
  const operationId = `operacion-vulnerable-${instanceId}`;
  const [operaciones, setOperaciones] = useState<OperacionVulnerable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const optionsCallbackRef = useRef(onOperacionOptionsChange);

  useEffect(() => {
    optionsCallbackRef.current = onOperacionOptionsChange;
  }, [onOperacionOptionsChange]);

  useEffect(() => {
    setOperaciones([]);
    optionsCallbackRef.current?.([]);
    setError('');
    setLoading(false);
    if (!actividadClave) return;

    const controller = new AbortController();
    setLoading(true);
    obtenerOperacionesVulnerables(actividadClave, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setOperaciones(items);
          optionsCallbackRef.current?.(items);
        }
      })
      .catch((requestError) => {
        if (!controller.signal.aborted && !isApiRequestCanceled(requestError)) {
          setError(getApiErrorMessage(requestError, 'No se pudieron cargar las operaciones'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [actividadClave]);

  const pendienteEmpresa = actividades.length === 0;
  const actividadUnica = actividades.length === 1;

  return (
    <section className="space-y-4 rounded-md border border-gray-200 bg-white p-4" aria-labelledby={titleId}>
      <div>
        <h2 id={titleId} className="text-lg font-semibold text-gray-900">Configuración PLD</h2>
        <p id={helpId} className="mt-1 text-xs text-gray-500">
          La operación debe corresponder a una actividad habilitada para la empresa.
        </p>
      </div>

      {pendienteEmpresa ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          La empresa tiene pendiente configurar sus actividades vulnerables.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            {actividadUnica ? (
              <div
                role="group"
                aria-labelledby={activityLabelId}
                aria-describedby={`${helpId}${selectionError ? ` ${errorId}` : ''}`}
              >
                <p id={activityLabelId} className="text-sm font-medium">
                  Actividad vulnerable general
                </p>
                <div className="mt-1 rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
                  {actividades[0].nombre}
                </div>
              </div>
            ) : (
              <>
                <label htmlFor={activityId} className="text-sm font-medium">
                  Actividad vulnerable general
                </label>
                <select
                  id={activityId}
                  aria-describedby={`${helpId}${selectionError ? ` ${errorId}` : ''}`}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                  value={actividadClave}
                  disabled={disabled}
                  onChange={(event) => {
                    onTouched?.();
                    onActividadChange(event.target.value);
                    onOperacionChange('');
                  }}
                >
                  <option value="">Selecciona una actividad</option>
                  {actividades.map((actividad) => (
                    <option key={actividad.clave} value={actividad.clave}>
                      {actividad.nombre}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor={operationId} className="text-sm font-medium">
              Operación específica
            </label>
            <select
              id={operationId}
              aria-describedby={`${helpId}${selectionError ? ` ${errorId}` : ''}`}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
              value={operacionClave}
              disabled={disabled || !actividadClave || loading || !!error}
              onChange={(event) => {
                onTouched?.();
                onOperacionChange(event.target.value);
              }}
            >
              <option value="">
                {loading ? 'Cargando operaciones…' : 'Selecciona una operación'}
              </option>
              {operaciones.map((operacion) => (
                <option key={operacion.clave} value={operacion.clave}>
                  {operacion.nombre}
                </option>
              ))}
            </select>
            {!loading && actividadClave && operaciones.length === 0 && !error ? (
              <p className="text-xs text-amber-700">La actividad no tiene operaciones activas disponibles.</p>
            ) : null}
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
          </div>
        </div>
      )}

      {disabled && !pendienteEmpresa ? (
        <p className="text-xs text-gray-600">Tu rol permite consultar esta configuración, pero no modificarla.</p>
      ) : null}
      {touched ? (
        <p className="text-xs text-amber-700">
          El cambio creará una nueva vigencia y conservará el historial anterior.
        </p>
      ) : null}
      {selectionError ? (
        <p id={errorId} className="text-sm text-red-700" role="alert">
          {selectionError}
        </p>
      ) : null}
    </section>
  );
}
