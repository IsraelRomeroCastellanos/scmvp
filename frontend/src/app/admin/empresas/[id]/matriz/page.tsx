'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Input, LoadingState, PageHeader } from '@/components/ui';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import {
  activarMatrizEmpresa,
  crearBorradorMatrizEmpresa,
  crearVersionMatrizDesdeHistorica,
  descartarBorradorMatrizEmpresa,
  getApiErrorMessage,
  guardarComposicionMatrizEmpresa,
  guardarOpcionesCriterioMatriz,
  guardarRangosCriterioMatriz,
  guardarReglasMatrizGr,
  guardarResultadosMatrizEmpresa,
  isApiRequestCanceled,
  obtenerBorradorMatrizEmpresa,
  obtenerCatalogoCriteriosMatriz,
  obtenerEmpresaAdmin,
  publicarMatrizEmpresa,
  reabrirMatrizEmpresa,
  validarMatrizEmpresa,
  type AmbitoMatriz,
  type BorradorMatrizEmpresa,
  type CriterioBorradorMatriz,
  type CriterioCatalogoMatriz,
  type ResultadoMatrizEmpresa,
  type MatrizPublicadaFuente,
  type CoberturaCriterioGr,
  type ReglaMatrizGrInput,
} from '@/lib/api';

type EmpresaResumen = {
  id: number;
  nombre_legal: string;
  matriz_publicada_fuente: MatrizPublicadaFuente | null;
};

type CriterioEditable = {
  versionId: number;
  matrizCriterioId?: number;
  codigo: string;
  texto: string;
  tipoResolucion: string;
  unidadCanonica: string | null;
  unidadEmpresarial: '' | 'UMA' | 'PESOS';
  corte1: string;
  corte2: string;
  opciones: string[];
  rangos: RangoEditable[];
  reglas: ReglaEditable[];
  cobertura?: CoberturaCriterioGr;
};

type RangoEditable = {
  minimo: string;
  maximo: string;
  incluyeMinimo: boolean;
  incluyeMaximo: boolean;
};

type ReglaEditable = {
  clave: string;
  puntaje: '' | 1 | 2 | 3;
};

type BandaEditable = { nombre: string; minimo: string; maximo: string };

function arePtBoundariesValid(bands: BandaEditable[], criterionCount: number): boolean {
  if (criterionCount < 3 || criterionCount > 6 || bands.length !== 3) return false;
  let expectedMinimum = criterionCount;
  for (const band of bands) {
    if (!/^\d+$/.test(band.minimo) || !/^\d+$/.test(band.maximo)) return false;
    const minimum = Number(band.minimo);
    const maximum = Number(band.maximo);
    if (minimum !== expectedMinimum || maximum < minimum) return false;
    expectedMinimum = maximum + 1;
  }
  return expectedMinimum === criterionCount * 3 + 1;
}

function areAmountRangesValid(ranges: RangoEditable[]): boolean {
  if (ranges.length !== 3) return false;
  const normalized = ranges.map((range) => ({
    minimo: range.minimo.trim() === '' ? null : Number(range.minimo),
    maximo: range.maximo.trim() === '' ? null : Number(range.maximo),
    incluyeMinimo: range.incluyeMinimo,
    incluyeMaximo: range.incluyeMaximo,
  }));
  return normalized.every((range, index) =>
    (range.minimo === null ? index === 0 : Number.isFinite(range.minimo)) &&
    (range.maximo === null ? index === 2 : Number.isFinite(range.maximo)) &&
    !(range.minimo === null && range.maximo === null) &&
    (range.minimo === null || range.maximo === null || range.minimo <= range.maximo) &&
    (index === 0 || (
      normalized[index - 1].maximo === range.minimo &&
      normalized[index - 1].incluyeMaximo !== range.incluyeMinimo
    ))
  );
}

function deriveAmountRanges(cut1: string, cut2: string): RangoEditable[] {
  return [
    { minimo: '', maximo: cut1, incluyeMinimo: false, incluyeMaximo: true },
    { minimo: cut1, maximo: cut2, incluyeMinimo: false, incluyeMaximo: true },
    { minimo: cut2, maximo: '', incluyeMinimo: false, incluyeMaximo: false },
  ];
}

function formatAmountRange(range: RangoEditable, unit: string | null): string {
  const suffix = unit ? ` ${unit}` : '';
  if (range.minimo.trim() === '') return `Hasta ${range.maximo}${suffix}`;
  if (range.maximo.trim() === '') return `Más de ${range.minimo}${suffix}`;
  return `Más de ${range.minimo} y hasta ${range.maximo}${suffix}`;
}

function isPtCriterionConfigured(item: CriterioEditable): boolean {
  if (item.matrizCriterioId === undefined) return false;
  if (item.tipoResolucion === 'CAPTURA_OPCIONES') {
    return item.opciones.length === 3 && item.opciones.every((option) => !!option.trim()) &&
      new Set(item.opciones.map((option) => option.trim())).size === 3;
  }
  return item.codigo === 'MONTO' && item.unidadCanonica === 'MONTO' &&
    (item.unidadEmpresarial === 'UMA' || item.unidadEmpresarial === 'PESOS') &&
    Number.isFinite(Number(item.corte1)) && Number.isFinite(Number(item.corte2)) &&
    item.corte1.trim() !== '' && item.corte2.trim() !== '' &&
    Number(item.corte1) < Number(item.corte2) && areAmountRangesValid(item.rangos);
}

function toBands(items: ResultadoMatrizEmpresa[]): BandaEditable[] {
  return [0, 1, 2].map((index) => ({
    nombre: items[index]?.nombre ?? '',
    minimo: items[index] ? String(items[index].minimo) : '',
    maximo: items[index] ? String(items[index].maximo) : '',
  }));
}

function toEditable(items: CriterioBorradorMatriz[]): CriterioEditable[] {
  return items.map((item) => {
    const persisted = new Map(
      (item.reglas ?? []).map((rule) => [
        rule.marca_canonica ?? rule.condicion_controlada ?? '',
        rule,
      ]),
    );
    return {
      versionId: item.catalogo_criterio_version_id,
      matrizCriterioId: item.matriz_criterio_id,
      codigo: item.codigo,
      texto: item.texto,
      tipoResolucion: item.tipo_resolucion,
      unidadCanonica: item.unidad_canonica,
      unidadEmpresarial: item.rangos[0]?.unidad === 'UMA' || item.rangos[0]?.unidad === 'PESOS'
        ? item.rangos[0].unidad : '',
      corte1: item.rangos[0]?.maximo === null || item.rangos[0]?.maximo === undefined
        ? '' : String(item.rangos[0].maximo),
      corte2: item.rangos[1]?.maximo === null || item.rangos[1]?.maximo === undefined
        ? '' : String(item.rangos[1].maximo),
      opciones: [0, 1, 2].map((index) => item.opciones[index]?.etiqueta ?? ''),
      rangos: [0, 1, 2].map((index) => ({
        minimo: item.rangos[index]?.minimo === null || item.rangos[index]?.minimo === undefined
          ? '' : String(item.rangos[index].minimo),
        maximo: item.rangos[index]?.maximo === null || item.rangos[index]?.maximo === undefined
          ? '' : String(item.rangos[index].maximo),
        incluyeMinimo: item.rangos[index]?.incluye_minimo ?? index === 0,
        incluyeMaximo: item.rangos[index]?.incluye_maximo ?? true,
      })),
      cobertura: item.cobertura,
      reglas: (item.cobertura?.esperada ?? []).map((clave) => {
        const rule = persisted.get(clave);
        return {
          clave,
          puntaje: rule && [1, 2, 3].includes(rule.puntaje)
            ? rule.puntaje as 1 | 2 | 3
            : '',
        };
      }),
    };
  });
}

const RULE_LABELS: Record<string, string> = {
  AV: 'Actividad vulnerable',
  HUACHICOL: 'Hidrocarburos / huachicol',
  DOBLE_USO: 'Bienes o actividades de doble uso',
  PEP: 'Persona políticamente expuesta',
  PEP_EXTRANJERO: 'PEP extranjero',
  OSFL: 'Organización sin fines de lucro',
  SIN_MARCA_ACTIVIDAD: 'Sin marca PLD especial',
  GAFI_ALTO_RIESGO: 'Jurisdicción GAFI de alto riesgo',
  GAFI_LISTA_GRIS: 'Jurisdicción bajo monitoreo GAFI',
  REGIMEN_FISCAL_PREFERENTE: 'Régimen fiscal preferente',
  SIN_MARCA_PLD: 'Sin marca geográfica PLD',
};

function getDetailedApiError(error: unknown, fallback: string): string {
  const apiError = (error as {
    response?: { data?: { error?: { mensaje?: unknown; detalles?: unknown } } };
  })?.response?.data?.error;
  const message = typeof apiError?.mensaje === 'string' && apiError.mensaje.trim()
    ? apiError.mensaje.trim()
    : getApiErrorMessage(error, fallback);
  const details = Array.isArray(apiError?.detalles)
    ? apiError.detalles.filter((detail): detail is string => typeof detail === 'string' && !!detail.trim())
    : [];
  return details.length > 0 ? `${message}: ${details.join(' · ')}` : message;
}

function MatrixSection({
  ambito,
  catalogo,
  selected,
  disabled,
  savingParameterId,
  onChange,
  onParameterChange,
  onSaveOptions,
  onSaveRanges,
  conditionLabels,
  savingRuleId,
  rulesDisabled,
  onSaveRules,
  onRulesChange,
  maxSelected,
  parametersDisabled = false,
}: {
  ambito: AmbitoMatriz;
  catalogo: CriterioCatalogoMatriz[];
  selected: CriterioEditable[];
  disabled: boolean;
  savingParameterId: number | null;
  onChange: (items: CriterioEditable[]) => void;
  onParameterChange: (items: CriterioEditable[], criterioId?: number) => void;
  onSaveOptions: (item: CriterioEditable) => void;
  onSaveRanges: (item: CriterioEditable) => void;
  conditionLabels: Record<string, string>;
  savingRuleId: number | null;
  rulesDisabled: boolean;
  onSaveRules: (item: CriterioEditable) => void;
  onRulesChange: (items: CriterioEditable[], criterioId?: number) => void;
  maxSelected?: number;
  parametersDisabled?: boolean;
}) {
  const selectedIds = new Set(selected.map((item) => item.versionId));
  const available = catalogo.filter((item) => !selectedIds.has(item.version_vigente_id));

  const add = (item: CriterioCatalogoMatriz) => {
    onChange([
      ...selected,
      {
        versionId: item.version_vigente_id,
        codigo: item.codigo,
        texto: item.nombre_visible_global,
        tipoResolucion: item.tipo_resolucion,
        unidadCanonica: item.unidad_canonica,
        unidadEmpresarial: '',
        corte1: '',
        corte2: '',
        opciones: ['', '', ''],
        rangos: [0, 1, 2].map((index) => ({
          minimo: '', maximo: '', incluyeMinimo: index === 0, incluyeMaximo: true,
        })),
        reglas: [],
      },
    ]);
  };

  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            {ambito === 'PT' ? 'Perfil Transaccional' : 'Grado de Riesgo'}
          </h2>
          <p className="text-sm text-text-secondary">
            El orden se guarda de arriba hacia abajo.
          </p>
        </div>
        <Badge variant="info">{selected.length} seleccionado{selected.length === 1 ? '' : 's'}</Badge>
      </div>

      <div className="mt-5 space-y-3">
        {selected.length === 0 ? (
          <p className="rounded-card bg-surface-muted p-4 text-sm text-text-secondary">
            {ambito === 'PT'
              ? 'Selecciona entre 3 y 6 criterios.'
              : 'Aún no hay criterios seleccionados.'}
          </p>
        ) : null}
        {selected.map((item, index) => (
          <div key={item.versionId} className="rounded-card border border-border-light p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                {ambito === 'PT' ? (
                  <h3 className="text-base font-semibold text-text-primary">
                    {index + 1}. {item.texto}
                  </h3>
                ) : (
                  <>
                    <label className="block text-xs font-medium uppercase tracking-wide text-text-secondary">
                      {index + 1}. {item.codigo}
                    </label>
                    <Input
                      className="mt-2"
                      value={item.texto}
                      disabled={disabled}
                      aria-label={`Etiqueta visible de ${item.codigo}`}
                      onChange={(event) => {
                        const next = [...selected];
                        next[index] = { ...item, texto: event.target.value };
                        onChange(next);
                      }}
                    />
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                >
                  Subir
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={disabled || index === selected.length - 1}
                  onClick={() => move(index, 1)}
                >
                  Bajar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={disabled}
                  onClick={() => onChange(selected.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Quitar
                </Button>
              </div>
            </div>
            {ambito === 'PT' && item.tipoResolucion === 'CAPTURA_OPCIONES' ? (
              <div className="mt-4 border-t border-border-light pt-4">
                <h3 className="text-sm font-semibold text-text-primary">Descripciones</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {['Bajo', 'Medio', 'Alto'].map((label, optionIndex) => (
                    <div key={label}>
                      <label className="block text-xs font-medium text-text-secondary">
                        {label}
                      </label>
                      <Input
                        className="mt-1"
                        value={item.opciones[optionIndex] ?? ''}
                        disabled={disabled || parametersDisabled || !item.matrizCriterioId}
                        onChange={(event) => {
                          const next = [...selected];
                          const options = [...item.opciones];
                          options[optionIndex] = event.target.value;
                          next[index] = { ...item, opciones: options };
                          onParameterChange(next, item.matrizCriterioId);
                        }}
                      />
                    </div>
                  ))}
                </div>
                {item.matrizCriterioId ? (
                  <Button
                    className="mt-3"
                    size="sm"
                    disabled={
                      disabled ||
                      parametersDisabled ||
                      savingParameterId === item.matrizCriterioId ||
                      item.opciones.some((option) => !option.trim())
                    }
                    onClick={() => onSaveOptions(item)}
                  >
                    {savingParameterId === item.matrizCriterioId
                      ? 'Guardando respuestas…'
                      : 'Guardar respuestas'}
                  </Button>
                ) : (
                  <p className="mt-3 text-xs text-semantic-warning">
                    Guarda primero la selección de criterios.
                  </p>
                )}
              </div>
            ) : null}
            {ambito === 'PT' && item.tipoResolucion === 'CAPTURA_RANGO_NUMERICO' ? (
              <div className="mt-4 border-t border-border-light pt-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-medium text-text-secondary">
                    Unidad
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-border-light bg-surface px-3 text-sm text-text-primary"
                      value={item.unidadEmpresarial}
                      disabled={disabled || parametersDisabled || !item.matrizCriterioId}
                      onChange={(event) => {
                        const next = [...selected];
                        next[index] = {
                          ...item,
                          unidadEmpresarial: event.target.value as '' | 'UMA' | 'PESOS',
                        };
                        onParameterChange(next, item.matrizCriterioId);
                      }}
                    >
                      <option value="">Seleccionar unidad</option>
                      <option value="UMA">UMA</option>
                      <option value="PESOS">PESOS</option>
                    </select>
                  </label>
                  {[
                    { label: 'Límite Bajo / Medio', key: 'corte1' as const },
                    { label: 'Límite Medio / Alto', key: 'corte2' as const },
                  ].map(({ label, key }) => (
                    <label key={key} className="text-xs font-medium text-text-secondary">
                      {label}
                      <Input
                        className="mt-1"
                        inputMode="decimal"
                        value={item[key]}
                        disabled={disabled || parametersDisabled || !item.matrizCriterioId}
                        onChange={(event) => {
                          const next = [...selected];
                          const cuts = { corte1: item.corte1, corte2: item.corte2, [key]: event.target.value };
                          next[index] = {
                            ...item,
                            [key]: event.target.value,
                            rangos: deriveAmountRanges(cuts.corte1, cuts.corte2),
                          };
                          onParameterChange(next, item.matrizCriterioId);
                        }}
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-4 overflow-hidden rounded-card border border-border-light">
                  {['Bajo', 'Medio', 'Alto'].map((label, rangeIndex) => (
                    <div key={label} className="grid grid-cols-[5rem_1fr_4rem] gap-3 border-b border-border-light px-3 py-2 text-sm last:border-b-0">
                      <span className="font-medium text-text-primary">{label}</span>
                      <span className="text-text-secondary">
                        {formatAmountRange(item.rangos[rangeIndex], item.unidadEmpresarial)}
                      </span>
                      <span className="text-right font-semibold text-text-primary">Valor {rangeIndex + 1}</span>
                    </div>
                  ))}
                </div>
                {item.matrizCriterioId ? (
                  <Button
                    className="mt-3"
                    size="sm"
                    disabled={disabled || parametersDisabled || savingParameterId === item.matrizCriterioId}
                    onClick={() => onSaveRanges(item)}
                  >
                    {savingParameterId === item.matrizCriterioId
                      ? 'Guardando rangos…' : 'Guardar rangos de Monto'}
                  </Button>
                ) : (
                  <p className="mt-3 text-xs text-semantic-warning">
                    Guarda primero la selección de criterios.
                  </p>
                )}
              </div>
            ) : null}
            {ambito === 'GR' && ['CATALOGO_GLOBAL', 'DERIVADO', 'ESTRUCTURADO'].includes(item.tipoResolucion) ? (
              <div className="mt-4 border-t border-border-light pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">Reglas de evaluación</h3>
                    <p className="mt-1 text-xs text-text-secondary">
                      Asigna cómo valora la empresa cada condición detectada.
                    </p>
                  </div>
                  <Badge variant={item.cobertura?.estado === 'COMPLETA' ? 'success' : 'warning'}>
                    {item.cobertura?.estado === 'COMPLETA' ? 'Completa' : 'Incompleta'}
                  </Badge>
                </div>
                {item.reglas.length === 0 ? (
                  <p className="mt-3 rounded-card bg-surface-muted p-3 text-sm text-text-secondary">
                    Guarda primero la composición y las dependencias PT para obtener las condiciones esperadas.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {item.reglas.map((rule, ruleIndex) => (
                      <div
                        key={rule.clave}
                        className="grid gap-3 rounded-card border border-border-light p-3 sm:grid-cols-[minmax(12rem,1fr)_14rem] sm:items-end"
                      >
                        <p className="text-sm font-medium text-text-primary sm:pb-3">
                          {RULE_LABELS[rule.clave] ?? conditionLabels[rule.clave] ?? 'Condición'}
                        </p>
                        <label className="text-xs font-medium text-text-secondary">
                          Valoración
                          <select
                            className="mt-1 h-10 w-full rounded-control border border-border-light bg-white px-3 text-sm text-text-primary disabled:bg-neutral-100"
                            aria-label={`Valoración para ${RULE_LABELS[rule.clave] ?? conditionLabels[rule.clave] ?? 'condición'}`}
                            value={rule.puntaje}
                            disabled={rulesDisabled}
                            onChange={(event) => {
                              const next = [...selected];
                              const rules = [...item.reglas];
                              const score = event.target.value === ''
                                ? ''
                                : Number(event.target.value) as 1 | 2 | 3;
                              rules[ruleIndex] = { ...rule, puntaje: score };
                              next[index] = { ...item, reglas: rules };
                              onRulesChange(next, item.matrizCriterioId);
                            }}
                          >
                            <option value="">Seleccionar valoración</option>
                            <option value="1">Bajo</option>
                            <option value="2">Medio</option>
                            <option value="3">Alto</option>
                          </select>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                {item.cobertura && item.cobertura.faltantes.length > 0 ? (
                  <p className="mt-3 text-xs text-semantic-warning">
                    Faltan: {item.cobertura.faltantes.join(', ')}
                  </p>
                ) : null}
                {item.matrizCriterioId && item.reglas.length > 0 && !rulesDisabled ? (
                  <Button
                    className="mt-3"
                    size="sm"
                    disabled={savingRuleId === item.matrizCriterioId}
                    onClick={() => onSaveRules(item)}
                  >
                    {savingRuleId === item.matrizCriterioId ? 'Guardando reglas…' : 'Guardar reglas'}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-border-light pt-4">
        <h3 className="text-sm font-semibold text-text-primary">Criterios disponibles</h3>
        {available.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">No hay más criterios activos disponibles.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {available.map((item) => (
              <Button
                key={item.version_vigente_id}
                size="sm"
                variant="secondary"
                disabled={disabled || (maxSelected !== undefined && selected.length >= maxSelected)}
                onClick={() => add(item)}
              >
                Agregar {item.nombre_visible_global}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function ResultBandsSection({
  ambito,
  criterionCount,
  bands,
  disabled,
  saving,
  onChange,
  onSave,
}: {
  ambito: AmbitoMatriz;
  criterionCount: number;
  bands: BandaEditable[];
  disabled: boolean;
  saving: boolean;
  onChange: (bands: BandaEditable[]) => void;
  onSave: () => void;
}) {
  const domain = criterionCount > 0 ? `${criterionCount}–${criterionCount * 3}` : 'sin dominio';
  const incomplete = bands.some((band) => (
    !band.nombre.trim() || !/^\d+$/.test(band.minimo) || !/^\d+$/.test(band.maximo)
  ));
  return (
    <Card className="p-5">
      <h3 className="font-semibold text-text-primary">
        {ambito === 'PT' ? 'Bandas de Perfil Transaccional' : 'Bandas de Grado de Riesgo'}
      </h3>
      <p className="mt-1 text-sm text-text-secondary">
        Dominio: {domain}. Las tres bandas deben cubrirlo sin huecos ni traslapes.
      </p>
      <div className="mt-4 space-y-3">
        {bands.map((band, index) => (
          <div key={index} className="grid gap-3 rounded-card border border-border-light p-3 md:grid-cols-3">
            <Input
              aria-label={`Nombre de banda ${index + 1} ${ambito}`}
              placeholder={`Nombre de banda ${index + 1}`}
              value={band.nombre}
              disabled={disabled}
              onChange={(event) => {
                const next = [...bands];
                next[index] = { ...band, nombre: event.target.value };
                onChange(next);
              }}
            />
            <Input
              aria-label={`Mínimo de banda ${index + 1} ${ambito}`}
              placeholder="Mínimo"
              inputMode="numeric"
              value={band.minimo}
              disabled={disabled}
              onChange={(event) => {
                const next = [...bands];
                next[index] = { ...band, minimo: event.target.value };
                onChange(next);
              }}
            />
            <Input
              aria-label={`Máximo de banda ${index + 1} ${ambito}`}
              placeholder="Máximo"
              inputMode="numeric"
              value={band.maximo}
              disabled={disabled}
              onChange={(event) => {
                const next = [...bands];
                next[index] = { ...band, maximo: event.target.value };
                onChange(next);
              }}
            />
          </div>
        ))}
      </div>
      <Button className="mt-4" size="sm" disabled={disabled || saving || incomplete || criterionCount < 1} onClick={onSave}>
        {saving ? 'Guardando bandas…' : `Guardar bandas ${ambito}`}
      </Button>
    </Card>
  );
}

function PtBoundariesSection({
  criterionCount,
  bands,
  disabled,
  onChange,
}: {
  criterionCount: number;
  bands: BandaEditable[];
  disabled: boolean;
  onChange: (bands: BandaEditable[]) => void;
}) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold text-text-primary">
        Define los rangos de PT1, PT2 y PT3
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <p className="rounded-card bg-surface-muted p-3 text-sm text-text-primary">
          Puntaje mínimo posible: <strong>{criterionCount}</strong>
        </p>
        <p className="rounded-card bg-surface-muted p-3 text-sm text-text-primary">
          Puntaje máximo posible: <strong>{criterionCount * 3}</strong>
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {bands.map((band, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-card border border-border-light p-3 sm:grid-cols-[5rem_1fr_1fr] sm:items-end"
          >
            <p className="pb-3 font-semibold text-text-primary">PT{index + 1}</p>
            <label className="text-xs font-medium text-text-secondary">
              Desde
              <Input
                className="mt-1"
                aria-label={`PT${index + 1} desde`}
                inputMode="numeric"
                value={band.minimo}
                disabled={disabled}
                onChange={(event) => {
                  const next = [...bands];
                  next[index] = { ...band, nombre: `PT${index + 1}`, minimo: event.target.value };
                  onChange(next);
                }}
              />
            </label>
            <label className="text-xs font-medium text-text-secondary">
              Hasta
              <Input
                className="mt-1"
                aria-label={`PT${index + 1} hasta`}
                inputMode="numeric"
                value={band.maximo}
                disabled={disabled}
                onChange={(event) => {
                  const next = [...bands];
                  next[index] = { ...band, nombre: `PT${index + 1}`, maximo: event.target.value };
                  onChange(next);
                }}
              />
            </label>
          </div>
        ))}
      </div>
      {!arePtBoundariesValid(bands, criterionCount) ? (
        <p className="mt-3 text-sm text-semantic-warning">
          Los rangos deben cubrir todo el puntaje posible, sin huecos ni traslapes.
        </p>
      ) : null}
    </Card>
  );
}

export default function ConfigurarMatrizEmpresaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const empresaId = Number(params.id);
  const [empresa, setEmpresa] = useState<EmpresaResumen | null>(null);
  const [draft, setDraft] = useState<BorradorMatrizEmpresa | null>(null);
  const [catalogoPt, setCatalogoPt] = useState<CriterioCatalogoMatriz[]>([]);
  const [catalogoGr, setCatalogoGr] = useState<CriterioCatalogoMatriz[]>([]);
  const [criteriosPt, setCriteriosPt] = useState<CriterioEditable[]>([]);
  const [criteriosGr, setCriteriosGr] = useState<CriterioEditable[]>([]);
  const [bandasPt, setBandasPt] = useState<BandaEditable[]>(toBands([]));
  const [bandasGr, setBandasGr] = useState<BandaEditable[]>(toBands([]));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingParameterId, setSavingParameterId] = useState<number | null>(null);
  const [savingBands, setSavingBands] = useState<AmbitoMatriz | null>(null);
  const [savingRuleId, setSavingRuleId] = useState<number | null>(null);
  const [dirtyRuleIds, setDirtyRuleIds] = useState<Set<number>>(new Set());
  const [dirtyPtOptionIds, setDirtyPtOptionIds] = useState<Set<number>>(new Set());
  const [transitioning, setTransitioning] = useState(false);
  const [compositionDirty, setCompositionDirty] = useState(false);
  const [ptCompositionDirty, setPtCompositionDirty] = useState(false);
  const [ptBandsDirty, setPtBandsDirty] = useState(false);
  const [ptConfirmationRequired, setPtConfirmationRequired] = useState(true);
  const [grBandsDirty, setGrBandsDirty] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cloneReason, setCloneReason] = useState('');
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [discardReason, setDiscardReason] = useState('');
  const [notFoundDraft, setNotFoundDraft] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [workflowView, setWorkflowView] = useState<'PT' | 'SUMMARY' | 'GR'>('PT');

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!Number.isSafeInteger(empresaId) || empresaId <= 0) {
      setError('Empresa inválida');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [company, pt, gr] = await Promise.all([
        obtenerEmpresaAdmin<EmpresaResumen>(empresaId, signal),
        obtenerCatalogoCriteriosMatriz('PT', signal),
        obtenerCatalogoCriteriosMatriz('GR', signal),
      ]);
      setEmpresa(company);
      setCatalogoPt(pt);
      setCatalogoGr(gr);
      try {
        const currentDraft = await obtenerBorradorMatrizEmpresa(empresaId, signal);
        setDraft(currentDraft);
        setCriteriosPt(toEditable(currentDraft.criterios_pt));
        setCriteriosGr(toEditable(currentDraft.criterios_gr));
        setBandasPt(toBands(currentDraft.resultados_pt));
        setBandasGr(toBands(currentDraft.resultados_gr));
        setCompositionDirty(false);
        setPtCompositionDirty(false);
        setPtBandsDirty(false);
        setPtConfirmationRequired(currentDraft.resultados_pt.length !== 3);
        setWorkflowView(currentDraft.resultados_pt.length === 3 ? 'SUMMARY' : 'PT');
        setGrBandsDirty(false);
        setDirtyRuleIds(new Set());
        setDirtyPtOptionIds(new Set());
        setNotFoundDraft(false);
      } catch (requestError: unknown) {
        const status = (requestError as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setDraft(null);
          setCriteriosPt([]);
          setCriteriosGr([]);
          setBandasPt(toBands([]));
          setBandasGr(toBands([]));
          setCompositionDirty(false);
          setPtCompositionDirty(false);
          setPtBandsDirty(false);
          setPtConfirmationRequired(true);
          setWorkflowView('PT');
          setGrBandsDirty(false);
          setDirtyRuleIds(new Set());
          setDirtyPtOptionIds(new Set());
          setNotFoundDraft(true);
        } else {
          throw requestError;
        }
      }
    } catch (requestError) {
      if (isApiRequestCanceled(requestError)) return;
      setError(getApiErrorMessage(requestError, 'No fue posible cargar la configuración'));
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (!isAdmin(getCurrentUser()?.rol)) {
      router.replace('/dashboard');
      return;
    }
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, router]);

  const invalidLabels = useMemo(
    () => criteriosGr.some((item) => !item.texto.trim()),
    [criteriosGr],
  );
  const ptSelectionValid = criteriosPt.length >= 3 && criteriosPt.length <= 6;
  const ptDescriptionsComplete = criteriosPt.every(isPtCriterionConfigured);
  const ptBoundariesValid = arePtBoundariesValid(bandasPt, criteriosPt.length);
  const ptReadyForBands = ptSelectionValid && ptDescriptionsComplete &&
    !ptCompositionDirty && dirtyPtOptionIds.size === 0;
  const ptReadyForPreview = ptReadyForBands && ptBoundariesValid;
  const ptComplete = ptReadyForPreview && !ptBandsDirty && !ptConfirmationRequired;
  const hasPendingChanges = compositionDirty || ptBandsDirty || grBandsDirty ||
    dirtyRuleIds.size > 0 || dirtyPtOptionIds.size > 0;
  const ruleConditionLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    const destination = draft?.criterios_pt.find(
      (criterion) => criterion.codigo === 'DESTINO_RECURSOS_PT',
    );
    destination?.opciones.forEach((option) => { labels[option.codigo] = option.etiqueta; });
    draft?.resultados_pt.forEach((result) => { labels[result.codigo] = result.nombre; });
    return labels;
  }, [draft]);
  const mergeSavedGrCriteria = (
    savedCriteria: CriterioBorradorMatriz[],
    current: CriterioEditable[],
    justSavedId?: number,
  ) => {
    const currentById = new Map(current.map((criterion) => [criterion.matrizCriterioId, criterion]));
    return toEditable(savedCriteria).map((criterion) => {
      const currentCriterion = currentById.get(criterion.matrizCriterioId);
      return criterion.matrizCriterioId !== justSavedId &&
        criterion.matrizCriterioId !== undefined &&
        dirtyRuleIds.has(criterion.matrizCriterioId) && currentCriterion
        ? { ...criterion, reglas: currentCriterion.reglas }
        : criterion;
    });
  };

  const createDraft = async () => {
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      await crearBorradorMatrizEmpresa(empresaId);
      setSuccess('Borrador creado. Ya puedes seleccionar criterios.');
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No fue posible crear el borrador'));
    } finally {
      setCreating(false);
    }
  };

  const createFromHistory = async () => {
    const source = empresa?.matriz_publicada_fuente;
    const motivo = cloneReason.trim();
    if (!source || !motivo || Array.from(motivo).length > 500) return;
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      await crearVersionMatrizDesdeHistorica(empresaId, source, motivo);
      setCloneReason('');
      setSuccess(`Nueva versión creada desde la versión ${source.numero_version}.`);
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No fue posible crear la nueva versión'));
    } finally {
      setCreating(false);
    }
  };

  const save = async () => {
    if (!draft || invalidLabels) return;
    if (!ptSelectionValid) {
      setError('Selecciona entre 3 y 6 criterios.');
      setSuccess('');
      return;
    }
    const savingPtComposition = ptCompositionDirty || !ptComplete;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await guardarComposicionMatrizEmpresa(empresaId, draft.id, {
        revision: draft.revision,
        criterios_pt: criteriosPt.map((item) => ({
          catalogo_criterio_version_id: item.versionId,
        })),
        criterios_gr: criteriosGr.map((item) => ({
          catalogo_criterio_version_id: item.versionId,
          texto: item.texto.trim(),
        })),
      });
      setDraft(saved);
      setCriteriosPt(toEditable(saved.criterios_pt));
      setCriteriosGr(toEditable(saved.criterios_gr));
      setCompositionDirty(false);
      setPtCompositionDirty(false);
      if (savingPtComposition) setPtConfirmationRequired(true);
      setDirtyRuleIds(new Set());
      setDirtyPtOptionIds(new Set());
      setSuccess(
        savingPtComposition
          ? 'Selección de Perfil Transaccional guardada correctamente.'
          : 'Composición GR guardada correctamente.',
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No fue posible guardar la composición'));
    } finally {
      setSaving(false);
    }
  };

  const saveOptions = async (item: CriterioEditable) => {
    if (!draft || !item.matrizCriterioId) return;
    const descriptions = item.opciones.map((option) => option.trim());
    if (
      descriptions.length !== 3 || descriptions.some((description) => !description) ||
      new Set(descriptions).size !== 3
    ) {
      setError('Completa Bajo, Medio y Alto.');
      setSuccess('');
      return;
    }
    setSavingParameterId(item.matrizCriterioId);
    setError('');
    setSuccess('');
    try {
      const saved = await guardarOpcionesCriterioMatriz(
        empresaId,
        draft.id,
        item.matrizCriterioId,
        draft.revision,
        descriptions,
      );
      setDraft(saved);
      const savedPtByVersion = new Map(
        saved.criterios_pt.map((criterion) => [
          criterion.catalogo_criterio_version_id,
          criterion,
        ]),
      );
      const refreshParameters = (
        criteria: CriterioEditable[],
        savedByVersion: Map<number, CriterioBorradorMatriz>,
      ) => criteria.map((criterion) => {
        const persisted = savedByVersion.get(criterion.versionId);
        return persisted
          ? {
              ...criterion,
              matrizCriterioId: persisted.matriz_criterio_id,
              opciones: [0, 1, 2].map((index) => persisted.opciones[index]?.etiqueta ?? ''),
            }
          : criterion;
      });
      setCriteriosPt((current) => refreshParameters(current, savedPtByVersion));
      setCriteriosGr((current) => mergeSavedGrCriteria(saved.criterios_gr, current));
      const remainingDirty = new Set(dirtyPtOptionIds);
      remainingDirty.delete(item.matrizCriterioId);
      setDirtyPtOptionIds(remainingDirty);
      const allDescriptionsComplete = saved.criterios_pt.length >= 3 &&
        toEditable(saved.criterios_pt).every(isPtCriterionConfigured);
      setSuccess(
        allDescriptionsComplete && remainingDirty.size === 0
            ? 'Criterios y descripciones de Perfil Transaccional completados.'
            : 'Descripción guardada correctamente.',
      );
      setPtConfirmationRequired(true);
    } catch (requestError) {
      setError(getApiErrorMessage(
        requestError,
        'No fue posible guardar las respuestas. Si la matriz cambió, recarga la página.',
      ));
    } finally {
      setSavingParameterId(null);
    }
  };

  const saveRanges = async (item: CriterioEditable) => {
    if (!draft || !item.matrizCriterioId || !isPtCriterionConfigured(item)) {
      setError('Selecciona UMA o PESOS y captura dos límites válidos, de menor a mayor.');
      setSuccess('');
      return;
    }
    setSavingParameterId(item.matrizCriterioId);
    setError('');
    setSuccess('');
    try {
      const saved = await guardarRangosCriterioMatriz(
        empresaId,
        draft.id,
        item.matrizCriterioId,
        draft.revision,
        item.unidadEmpresarial as 'UMA' | 'PESOS',
        Number(item.corte1),
        Number(item.corte2),
      );
      setDraft(saved);
      const savedPt = toEditable(saved.criterios_pt);
      const savedByVersion = new Map(savedPt.map((criterion) => [criterion.versionId, criterion]));
      setCriteriosPt((current) => current.map((criterion) => {
        const persisted = savedByVersion.get(criterion.versionId);
        return persisted ? {
          ...criterion,
          rangos: persisted.rangos,
          unidadEmpresarial: persisted.unidadEmpresarial,
          corte1: persisted.corte1,
          corte2: persisted.corte2,
        } : criterion;
      }));
      setCriteriosGr((current) => mergeSavedGrCriteria(saved.criterios_gr, current));
      setDirtyPtOptionIds((current) => {
        const next = new Set(current);
        next.delete(item.matrizCriterioId!);
        return next;
      });
      setPtConfirmationRequired(true);
      setSuccess('Rangos de Monto guardados correctamente.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No fue posible guardar los rangos de Monto.'));
    } finally {
      setSavingParameterId(null);
    }
  };

  const saveRules = async (item: CriterioEditable) => {
    if (!draft || !item.matrizCriterioId || item.reglas.length === 0) return;
    const payload: ReglaMatrizGrInput[] = [];
    for (const rule of item.reglas) {
      if (![1, 2, 3].includes(Number(rule.puntaje))) {
        setError('Selecciona una valoración para todas las condiciones antes de guardar.');
        setSuccess('');
        return;
      }
      payload.push({
        clave: rule.clave,
        puntaje: Number(rule.puntaje) as 1 | 2 | 3,
      });
    }
    setSavingRuleId(item.matrizCriterioId);
    setError('');
    setSuccess('');
    try {
      const saved = await guardarReglasMatrizGr(
        empresaId,
        draft.id,
        item.matrizCriterioId,
        payload,
      );
      setDraft(saved);
      setCriteriosGr((current) => (
        mergeSavedGrCriteria(saved.criterios_gr, current, item.matrizCriterioId)
      ));
      if (!ptBandsDirty) setBandasPt(toBands(saved.resultados_pt));
      if (!grBandsDirty) setBandasGr(toBands(saved.resultados_gr));
      setDirtyRuleIds((current) => {
        const next = new Set(current);
        next.delete(item.matrizCriterioId!);
        return next;
      });
      setSuccess(`Reglas de ${item.texto} guardadas correctamente.`);
    } catch (requestError) {
      setError(getDetailedApiError(requestError, 'No fue posible guardar las reglas GR.'));
    } finally {
      setSavingRuleId(null);
    }
  };

  const saveBands = async (ambito: AmbitoMatriz) => {
    if (!draft) return;
    const bands = ambito === 'PT' ? bandasPt : bandasGr;
    setSavingBands(ambito);
    setError('');
    setSuccess('');
    try {
      const saved = await guardarResultadosMatrizEmpresa(
        empresaId,
        draft.id,
        ambito,
        draft.revision,
        bands.map((band, index) => ({
          nombre: ambito === 'PT' ? `PT${index + 1}` : band.nombre.trim(),
          minimo: Number(band.minimo),
          maximo: Number(band.maximo),
        })),
      );
      setDraft(saved);
      setCriteriosGr((current) => mergeSavedGrCriteria(saved.criterios_gr, current));
      if (ambito === 'PT') {
        setBandasPt(toBands(saved.resultados_pt));
        setPtBandsDirty(false);
        setPtConfirmationRequired(false);
        setWorkflowView('SUMMARY');
      } else {
        setBandasGr(toBands(saved.resultados_gr));
        setGrBandsDirty(false);
      }
      setSuccess(
        ambito === 'PT'
          ? 'Perfil Transaccional completo y guardado correctamente.'
          : 'Bandas GR guardadas correctamente.',
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Las bandas no cubren correctamente el dominio.'));
    } finally {
      setSavingBands(null);
    }
  };

  const changeState = async (action: 'VALIDAR' | 'PUBLICAR' | 'REABRIR' | 'ACTIVAR') => {
    if (!draft) return;
    setTransitioning(true);
    setError('');
    setSuccess('');
    try {
      const saved = action === 'VALIDAR'
        ? await validarMatrizEmpresa(empresaId, draft.id, draft.revision)
        : action === 'PUBLICAR'
          ? await publicarMatrizEmpresa(empresaId, draft.id, draft.revision)
          : action === 'REABRIR'
            ? await reabrirMatrizEmpresa(empresaId, draft.id, draft.revision)
            : await activarMatrizEmpresa(empresaId, draft.id, draft.revision);
      setDraft(saved);
      setCriteriosPt(toEditable(saved.criterios_pt));
      setCriteriosGr(toEditable(saved.criterios_gr));
      setBandasPt(toBands(saved.resultados_pt));
      setBandasGr(toBands(saved.resultados_gr));
      setCompositionDirty(false);
      setPtCompositionDirty(false);
      setPtBandsDirty(false);
      setPtConfirmationRequired(false);
      setGrBandsDirty(false);
      setDirtyRuleIds(new Set());
      setDirtyPtOptionIds(new Set());
      setSuccess(
        action === 'VALIDAR' ? 'Matriz validada correctamente.'
          : action === 'PUBLICAR' ? 'Matriz publicada. Ya puede activarse.'
            : action === 'REABRIR' ? 'Matriz reabierta para edición.'
              : 'Matriz activada correctamente.',
      );
    } catch (requestError) {
      setError(getDetailedApiError(
        requestError,
        action === 'ACTIVAR'
          ? 'No fue posible activar; verifica que no exista otra matriz activa.'
          : 'La matriz está incompleta o cambió; revisa la configuración.',
      ));
    } finally {
      setTransitioning(false);
    }
  };

  const discardDraft = async () => {
    if (!draft) return;
    const motivo = discardReason.trim();
    if (!motivo || Array.from(motivo).length > 500) return;
    const discardedVersion = draft.numero_version;
    setTransitioning(true);
    setError('');
    setSuccess('');
    try {
      await descartarBorradorMatrizEmpresa(empresaId, draft.id, draft.revision, motivo);
      setDiscardDialogOpen(false);
      setDiscardReason('');
      setDraft(null);
      setCriteriosPt([]);
      setCriteriosGr([]);
      setBandasPt(toBands([]));
      setBandasGr(toBands([]));
      setCompositionDirty(false);
      setPtCompositionDirty(false);
      setPtBandsDirty(false);
      setPtConfirmationRequired(true);
      setGrBandsDirty(false);
      setDirtyPtOptionIds(new Set());
      await load();
      setSuccess(`Borrador V${discardedVersion} descartado.`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No fue posible descartar el borrador.'));
    } finally {
      setTransitioning(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurar matriz"
        description={empresa ? `${empresa.nombre_legal} · Empresa ${empresa.id}` : 'Composición PT/GR por empresa'}
        actions={
          <Link href="/admin/empresas" className="text-sm font-semibold text-blue-700 hover:underline">
            Volver a empresas
          </Link>
        }
      />

      {loading ? <LoadingState label="Cargando configuración de matriz…" /> : null}
      {!loading && error ? <Alert variant="danger">{error}</Alert> : null}
      {!loading && success && workflowView !== 'SUMMARY' ? <Alert variant="success">{success}</Alert> : null}

      {!loading && notFoundDraft ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text-primary">La empresa no tiene un borrador editable</h2>
          {empresa?.matriz_publicada_fuente ? (
            <>
              <p className="mt-2 text-sm text-text-secondary">
                Se copiará la versión {empresa.matriz_publicada_fuente.numero_version}
                {empresa.matriz_publicada_fuente.activa ? ' activa' : ''} como un nuevo borrador.
              </p>
              <Input
                className="mt-4"
                value={cloneReason}
                maxLength={500}
                placeholder="Motivo de la nueva versión"
                aria-label="Motivo de la nueva versión"
                disabled={creating}
                onChange={(event) => setCloneReason(event.target.value)}
              />
              <Button
                className="mt-5"
                disabled={creating || !cloneReason.trim()}
                onClick={createFromHistory}
              >
                {creating ? 'Creando…' : 'Crear nueva versión'}
              </Button>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-text-secondary">
                Crear el borrador no publica ni activa la matriz.
              </p>
              <Button className="mt-5" disabled={creating} onClick={createDraft}>
                {creating ? 'Creando…' : 'Crear borrador'}
              </Button>
            </>
          )}
        </Card>
      ) : null}

      {!loading && draft ? (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
            <Badge variant="warning">{draft.estado_editorial}</Badge>
            <span>Versión {draft.numero_version}</span>
            <span>Revisión {draft.revision}</span>
            {draft.version_origen_id ? (
              <span>Origen histórico #{draft.version_origen_id}</span>
            ) : null}
            {ptComplete && workflowView === 'GR' ? (
              <Badge variant={draft.cobertura_gr.estado === 'COMPLETA' ? 'success' : 'warning'}>
                Reglas GR: {draft.cobertura_gr.estado === 'COMPLETA' ? 'completa' : 'incompleta'}
              </Badge>
            ) : null}
          </div>

          {ptComplete && workflowView === 'GR' && draft.cobertura_gr.estado === 'INCOMPLETA' ? (
            <Alert variant="warning">
              <div>
                <p className="font-semibold">La configuración GR todavía no puede validarse.</p>
                {draft.cobertura_gr.detalles.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {draft.cobertura_gr.detalles.map((detail, index) => (
                      <li key={`${detail}-${index}`}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Alert>
          ) : null}

          {workflowView === 'PT' || !ptComplete ? <>
          <section className="space-y-4" aria-labelledby="configuracion-criterios-pt">
            <div>
              <h2 id="configuracion-criterios-pt" className="text-xl font-semibold text-text-primary">
                1. Configuración de criterios PT
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Selecciona los criterios y captura sus descripciones Bajo, Medio y Alto.
              </p>
            </div>
            <MatrixSection
              ambito="PT"
              catalogo={catalogoPt}
              selected={criteriosPt}
              disabled={draft.estado_editorial !== 'BORRADOR' || saving || savingParameterId !== null}
              savingParameterId={savingParameterId}
              onChange={(items) => {
                setCriteriosPt(items);
                setCompositionDirty(true);
                setPtCompositionDirty(true);
                setPtConfirmationRequired(true);
              }}
              onParameterChange={(items, criterioId) => {
                setCriteriosPt(items);
                if (criterioId !== undefined) {
                  setDirtyPtOptionIds((current) => new Set(current).add(criterioId));
                  setPtConfirmationRequired(true);
                }
              }}
              onSaveOptions={saveOptions}
              onSaveRanges={saveRanges}
              conditionLabels={ruleConditionLabels}
              savingRuleId={savingRuleId}
              rulesDisabled
              onSaveRules={saveRules}
              onRulesChange={setCriteriosPt}
              maxSelected={6}
              parametersDisabled={compositionDirty}
            />
            {!ptComplete ? (
              <div className="flex justify-end">
                <Button
                  disabled={
                    draft.estado_editorial !== 'BORRADOR' || saving ||
                    savingParameterId !== null || !ptSelectionValid
                  }
                  onClick={save}
                >
                  {saving ? 'Guardando selección…' : 'Guardar selección PT'}
                </Button>
              </div>
            ) : null}
          </section>

          <section className="space-y-4 border-t border-border-light pt-6" aria-labelledby="fronteras-pt">
            <div>
              <h2 id="fronteras-pt" className="text-xl font-semibold text-text-primary">
                2. Fronteras del resultado PT
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Define los rangos de PT1, PT2 y PT3.
              </p>
            </div>
            <PtBoundariesSection
              criterionCount={criteriosPt.length}
              bands={bandasPt}
              disabled={
                draft.estado_editorial !== 'BORRADOR' || savingBands !== null ||
                savingRuleId !== null || transitioning || !ptReadyForBands
              }
              onChange={(bands) => {
                setBandasPt(bands);
                setPtBandsDirty(true);
                setPtConfirmationRequired(true);
              }}
            />
          </section>

          <section className="space-y-4 border-t border-border-light pt-6" aria-labelledby="vista-previa-pt">
            <div>
              <h2 id="vista-previa-pt" className="text-xl font-semibold text-text-primary">
                3. Vista previa
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Revisa la matriz antes de confirmar su guardado.
              </p>
            </div>
            {ptReadyForPreview ? (
              <Card className="space-y-5 p-5">
                {criteriosPt.map((criterion) => (
                  <div key={criterion.versionId}>
                    <h3 className="font-semibold text-text-primary">{criterion.texto}</h3>
                    <div className="mt-2 overflow-hidden rounded-card border border-border-light">
                      {['Bajo', 'Medio', 'Alto'].map((label, index) => (
                        <div
                          key={label}
                          className="grid grid-cols-[5rem_1fr_3rem] gap-3 border-b border-border-light px-3 py-2 text-sm last:border-b-0"
                        >
                          <span className="font-medium text-text-primary">{label}</span>
                          <span className="text-text-secondary">
                            {criterion.tipoResolucion === 'CAPTURA_RANGO_NUMERICO'
                              ? formatAmountRange(criterion.rangos[index], criterion.unidadEmpresarial)
                              : criterion.opciones[index]}
                          </span>
                          <span className="text-right font-semibold text-text-primary">{index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <h3 className="font-semibold text-text-primary">Resultado PT</h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    Puntaje posible: {criteriosPt.length}–{criteriosPt.length * 3}
                  </p>
                  <div className="mt-2 overflow-hidden rounded-card border border-border-light">
                    {bandasPt.map((band, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[5rem_1fr] gap-3 border-b border-border-light px-3 py-2 text-sm last:border-b-0"
                      >
                        <span className="font-medium text-text-primary">PT{index + 1}</span>
                        <span className="text-text-secondary">{band.minimo}–{band.maximo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ) : (
              <Alert variant="info">
                Completa los criterios, las descripciones y las fronteras para ver el resumen.
              </Alert>
            )}
          </section>

          <section className="space-y-3 border-t border-border-light pt-6" aria-labelledby="confirmacion-pt">
            <h2 id="confirmacion-pt" className="text-xl font-semibold text-text-primary">
              4. Confirmación
            </h2>
            <Button
              disabled={
                draft.estado_editorial !== 'BORRADOR' || savingBands !== null ||
                transitioning || !ptReadyForPreview
              }
              onClick={() => void saveBands('PT')}
            >
              {savingBands === 'PT' ? 'Guardando matriz PT…' : 'Guardar matriz PT'}
            </Button>
          </section>
          </> : null}

          {workflowView === 'SUMMARY' && ptComplete ? (
            <section className="space-y-5" aria-labelledby="resumen-pt-configurado">
              <Alert variant="success">Perfil Transaccional configurado correctamente.</Alert>
              <div>
                <h2 id="resumen-pt-configurado" className="text-xl font-semibold text-text-primary">
                  Resumen de Perfil Transaccional
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Revisa la configuración guardada antes de continuar.
                </p>
              </div>
              <Card className="space-y-5 p-5">
                {criteriosPt.map((criterion, criterionIndex) => (
                  <div key={criterion.versionId}>
                    <h3 className="font-semibold text-text-primary">
                      {criterionIndex + 1}. {criterion.texto}
                    </h3>
                    {criterion.tipoResolucion === 'CAPTURA_RANGO_NUMERICO' ? (
                      <p className="mt-1 text-sm text-text-secondary">
                        Unidad: {criterion.unidadEmpresarial} · Cortes: {criterion.corte1} y {criterion.corte2}
                      </p>
                    ) : null}
                    <div className="mt-2 overflow-hidden rounded-card border border-border-light">
                      {['Bajo', 'Medio', 'Alto'].map((label, index) => (
                        <div
                          key={label}
                          className="grid grid-cols-[5rem_1fr_4rem] gap-3 border-b border-border-light px-3 py-2 text-sm last:border-b-0"
                        >
                          <span className="font-medium text-text-primary">{label}</span>
                          <span className="text-text-secondary">
                            {criterion.tipoResolucion === 'CAPTURA_RANGO_NUMERICO'
                              ? formatAmountRange(criterion.rangos[index], criterion.unidadEmpresarial)
                              : criterion.opciones[index]}
                          </span>
                          <span className="text-right font-semibold text-text-primary">Valor {index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <h3 className="font-semibold text-text-primary">Resultado PT</h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    Puntaje mínimo: {criteriosPt.length} · Puntaje máximo: {criteriosPt.length * 3}
                  </p>
                  <div className="mt-2 overflow-hidden rounded-card border border-border-light">
                    {bandasPt.map((band, index) => (
                      <div key={index} className="grid grid-cols-[5rem_1fr] gap-3 border-b border-border-light px-3 py-2 text-sm last:border-b-0">
                        <span className="font-medium text-text-primary">PT{index + 1}</span>
                        <span className="text-text-secondary">{band.minimo}–{band.maximo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => { setError(''); setSuccess(''); setWorkflowView('GR'); }}>
                  Configurar Grado de Riesgo
                </Button>
                <Button variant="secondary" onClick={() => router.push('/dashboard')}>
                  Ir al Dashboard
                </Button>
              </div>
            </section>
          ) : null}

          {workflowView === 'PT' && !ptComplete ? (
            <Alert variant="info">Completa y guarda Perfil Transaccional para continuar a GR.</Alert>
          ) : null}
          {workflowView === 'GR' && ptComplete ? <>
            <div className="flex justify-start">
              <Button variant="secondary" onClick={() => { setError(''); setSuccess(''); setWorkflowView('PT'); }}>
                Editar Perfil Transaccional
              </Button>
            </div>
            {invalidLabels ? (
              <Alert variant="danger">Todas las etiquetas visibles deben contener texto.</Alert>
            ) : null}
            <MatrixSection
              ambito="GR"
              catalogo={catalogoGr}
              selected={criteriosGr}
              disabled={draft.estado_editorial !== 'BORRADOR' || saving || savingParameterId !== null}
              savingParameterId={savingParameterId}
              onChange={(items) => {
                setCriteriosGr(items);
                setCompositionDirty(true);
              }}
              onParameterChange={setCriteriosGr}
              onSaveOptions={saveOptions}
              onSaveRanges={saveRanges}
              conditionLabels={ruleConditionLabels}
              savingRuleId={savingRuleId}
              rulesDisabled={
                draft.estado_editorial !== 'BORRADOR' || draft.activa || compositionDirty ||
                saving || savingRuleId !== null
              }
              onSaveRules={saveRules}
              onRulesChange={(items, criterioId) => {
                setCriteriosGr(items);
                if (criterioId !== undefined) {
                  setDirtyRuleIds((current) => new Set(current).add(criterioId));
                }
              }}
            />
          <ResultBandsSection
            ambito="GR"
            criterionCount={criteriosGr.length}
            bands={bandasGr}
            disabled={
              draft.estado_editorial !== 'BORRADOR' || savingBands !== null ||
              savingRuleId !== null || transitioning
            }
            saving={savingBands === 'GR'}
            onChange={(bands) => {
              setBandasGr(bands);
              setGrBandsDirty(true);
            }}
            onSave={() => void saveBands('GR')}
          />

          <div className="flex justify-end">
            <Button
              disabled={
                draft.estado_editorial !== 'BORRADOR' || saving ||
                savingParameterId !== null || invalidLabels || !ptSelectionValid
              }
              onClick={save}
            >
              {saving ? 'Guardando…' : 'Guardar composición GR'}
            </Button>
          </div>
          {hasPendingChanges ? (
            <Alert variant="warning">Guarda los cambios pendientes antes de validar.</Alert>
          ) : null}
          {draft.estado_editorial === 'VALIDADA' ? (
            <Alert variant="info">
              La matriz fue validada. Puedes publicarla o reabrirla para hacer cambios.
            </Alert>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {draft.estado_editorial === 'BORRADOR' ? (
                <Button
                  variant="danger"
                  disabled={transitioning || saving || savingBands !== null || savingParameterId !== null}
                  onClick={() => setDiscardDialogOpen(true)}
                >
                  Descartar borrador
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              {draft.estado_editorial === 'BORRADOR' ? (
              <Button
                disabled={
                  transitioning || saving || savingBands !== null || hasPendingChanges ||
                  draft.cobertura_gr.estado !== 'COMPLETA'
                }
                onClick={() => void changeState('VALIDAR')}
              >
                {transitioning ? 'Validando…' : 'Validar matriz'}
              </Button>
              ) : null}
              {draft.estado_editorial === 'VALIDADA' ? (
              <>
                <Button
                  variant="secondary"
                  disabled={transitioning || hasPendingChanges}
                  onClick={() => void changeState('REABRIR')}
                >
                  {transitioning ? 'Procesando…' : 'Reabrir edición'}
                </Button>
                <Button
                  disabled={transitioning || hasPendingChanges}
                  onClick={() => void changeState('PUBLICAR')}
                >
                  {transitioning ? 'Publicando…' : 'Publicar matriz'}
                </Button>
              </>
              ) : null}
              {draft.estado_editorial === 'PUBLICADA' && !draft.activa ? (
              <Button
                disabled={transitioning || hasPendingChanges}
                onClick={() => void changeState('ACTIVAR')}
              >
                {transitioning ? 'Activando…' : 'Activar matriz'}
              </Button>
              ) : null}
              {draft.activa ? <Badge variant="success">Matriz activa</Badge> : null}
            </div>
          </div>
          </> : null}
        </>
      ) : null}

      {discardDialogOpen && draft ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !transitioning) {
              setDiscardDialogOpen(false);
              setDiscardReason('');
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="discard-matrix-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-panel bg-white p-6 shadow-xl"
          >
            <h2 id="discard-matrix-title" className="text-xl font-semibold text-text-primary">
              Descartar borrador
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
              <p>
                Empresa: <span className="font-semibold text-text-primary">{empresa?.nombre_legal}</span>
                {' · '}Versión {draft.numero_version}
              </p>
              <Alert variant="warning">
                El descarte es irreversible. No borra el contenido ni la auditoría, pero esta versión dejará de ser editable. Después podrás crear una nueva versión.
              </Alert>
              <label className="block font-medium text-text-primary" htmlFor="discard-matrix-reason">
                Motivo del descarte
              </label>
              <textarea
                id="discard-matrix-reason"
                className="min-h-28 w-full rounded-control border border-border-light bg-white px-3 py-2 text-base text-text-primary shadow-inner-soft outline-none placeholder:text-neutral-400 focus:border-brand-graphite focus:ring-2 focus:ring-brand-silver disabled:bg-neutral-100"
                value={discardReason}
                maxLength={500}
                disabled={transitioning}
                placeholder="Explica por qué se descarta este borrador"
                onChange={(event) => setDiscardReason(event.target.value)}
              />
              <p className="text-right text-xs">{Array.from(discardReason).length}/500</p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                disabled={transitioning}
                onClick={() => {
                  setDiscardDialogOpen(false);
                  setDiscardReason('');
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={transitioning || !discardReason.trim() || Array.from(discardReason.trim()).length > 500}
                onClick={() => void discardDraft()}
              >
                {transitioning ? 'Descartando…' : 'Descartar borrador'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
