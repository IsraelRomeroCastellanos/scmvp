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
  opciones: string[];
  reglas: ReglaEditable[];
  cobertura?: CoberturaCriterioGr;
};

type ReglaEditable = {
  clave: string;
  puntaje: '' | 1 | 2 | 3;
  prioridad: string;
  altoAutomatico: boolean;
  causaCodigo: string;
};

type BandaEditable = { nombre: string; minimo: string; maximo: string };

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
      opciones: [0, 1, 2].map((index) => item.opciones[index]?.etiqueta ?? ''),
      cobertura: item.cobertura,
      reglas: (item.cobertura?.esperada ?? []).map((clave) => {
        const rule = persisted.get(clave);
        return {
          clave,
          puntaje: rule && [1, 2, 3].includes(rule.puntaje)
            ? rule.puntaje as 1 | 2 | 3
            : '',
          prioridad: String(rule?.prioridad ?? 0),
          altoAutomatico: rule?.alto_automatico ?? false,
          causaCodigo: rule?.causa_codigo ?? '',
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
  conditionLabels,
  savingRuleId,
  rulesDisabled,
  onSaveRules,
  onRulesChange,
}: {
  ambito: AmbitoMatriz;
  catalogo: CriterioCatalogoMatriz[];
  selected: CriterioEditable[];
  disabled: boolean;
  savingParameterId: number | null;
  onChange: (items: CriterioEditable[]) => void;
  onParameterChange: (items: CriterioEditable[]) => void;
  onSaveOptions: (item: CriterioEditable) => void;
  conditionLabels: Record<string, string>;
  savingRuleId: number | null;
  rulesDisabled: boolean;
  onSaveRules: (item: CriterioEditable) => void;
  onRulesChange: (items: CriterioEditable[], criterioId?: number) => void;
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
        opciones: ['', '', ''],
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
            Aún no hay criterios seleccionados. Un borrador puede permanecer vacío.
          </p>
        ) : null}
        {selected.map((item, index) => (
          <div key={item.versionId} className="rounded-card border border-border-light p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
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
                <h3 className="text-sm font-semibold text-text-primary">Configurar respuestas</h3>
                <p className="mt-1 text-xs text-text-secondary">
                  Los puntajes 1, 2 y 3 son fijos y no son editables.
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {['riesgo bajo', 'riesgo medio', 'riesgo alto'].map((label, optionIndex) => (
                    <div key={label}>
                      <label className="block text-xs font-medium text-text-secondary">
                        Opción de {label} · Puntaje {optionIndex + 1}
                      </label>
                      <Input
                        className="mt-1"
                        value={item.opciones[optionIndex] ?? ''}
                        disabled={disabled}
                        onChange={(event) => {
                          const next = [...selected];
                          const options = [...item.opciones];
                          options[optionIndex] = event.target.value;
                          next[index] = { ...item, opciones: options };
                          onParameterChange(next);
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
                    Guarda primero la composición para parametrizar este criterio.
                  </p>
                )}
              </div>
            ) : null}
            {item.tipoResolucion === 'CAPTURA_RANGO_NUMERICO' || item.tipoResolucion === 'KYC_RANGO' ? (
              <p className="mt-4 border-t border-border-light pt-4 text-sm text-text-secondary">
                Este criterio usa tres rangos numéricos. La API valida su unidad canónica;
                la captura visual de rangos se incorporará cuando exista un criterio activo de este tipo.
              </p>
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
                    {item.reglas.map((rule, ruleIndex) => {
                      const controlledPriority = item.codigo === 'DESTINO_RECURSOS_GR' ||
                        item.codigo === 'PERFIL_TRANSACCIONAL';
                      return (
                        <div
                          key={rule.clave}
                          className="grid gap-3 rounded-card border border-border-light p-3 lg:grid-cols-[minmax(12rem,2fr)_8rem_8rem_10rem_minmax(12rem,2fr)]"
                        >
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {RULE_LABELS[rule.clave] ?? conditionLabels[rule.clave] ?? rule.clave}
                            </p>
                            <p className="mt-1 break-all text-xs text-text-secondary">{rule.clave}</p>
                          </div>
                          <label className="text-xs font-medium text-text-secondary">
                            Puntaje
                            <select
                              className="mt-1 h-10 w-full rounded-control border border-border-light bg-white px-3 text-sm text-text-primary disabled:bg-neutral-100"
                              aria-label={`Puntaje para ${rule.clave}`}
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
                              <option value="">Seleccionar puntaje</option>
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                            </select>
                          </label>
                          <label className="text-xs font-medium text-text-secondary">
                            Prioridad
                            <Input
                              className="mt-1"
                              inputMode="numeric"
                              value={controlledPriority ? '0' : rule.prioridad}
                              disabled={rulesDisabled || controlledPriority}
                              onChange={(event) => {
                                const next = [...selected];
                                const rules = [...item.reglas];
                                rules[ruleIndex] = { ...rule, prioridad: event.target.value };
                                next[index] = { ...item, reglas: rules };
                                onRulesChange(next, item.matrizCriterioId);
                              }}
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium text-text-primary lg:pt-6">
                            <input
                              type="checkbox"
                              checked={rule.altoAutomatico}
                              disabled={rulesDisabled}
                              onChange={(event) => {
                                const next = [...selected];
                                const rules = [...item.reglas];
                                rules[ruleIndex] = {
                                  ...rule,
                                  altoAutomatico: event.target.checked,
                                  causaCodigo: event.target.checked ? rule.causaCodigo : '',
                                };
                                next[index] = { ...item, reglas: rules };
                                onRulesChange(next, item.matrizCriterioId);
                              }}
                            />
                            Alto automático
                          </label>
                          <label className="text-xs font-medium text-text-secondary">
                            Causa
                            <Input
                              className="mt-1"
                              maxLength={100}
                              value={rule.causaCodigo}
                              placeholder={rule.altoAutomatico ? 'Causa obligatoria' : 'No aplica'}
                              disabled={rulesDisabled || !rule.altoAutomatico}
                              onChange={(event) => {
                                const next = [...selected];
                                const rules = [...item.reglas];
                                rules[ruleIndex] = { ...rule, causaCodigo: event.target.value };
                                next[index] = { ...item, reglas: rules };
                                onRulesChange(next, item.matrizCriterioId);
                              }}
                            />
                          </label>
                        </div>
                      );
                    })}
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
                disabled={disabled}
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
  const [transitioning, setTransitioning] = useState(false);
  const [compositionDirty, setCompositionDirty] = useState(false);
  const [ptBandsDirty, setPtBandsDirty] = useState(false);
  const [grBandsDirty, setGrBandsDirty] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cloneReason, setCloneReason] = useState('');
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [discardReason, setDiscardReason] = useState('');
  const [notFoundDraft, setNotFoundDraft] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        setPtBandsDirty(false);
        setGrBandsDirty(false);
        setDirtyRuleIds(new Set());
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
          setPtBandsDirty(false);
          setGrBandsDirty(false);
          setDirtyRuleIds(new Set());
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
    () => [...criteriosPt, ...criteriosGr].some((item) => !item.texto.trim()),
    [criteriosPt, criteriosGr],
  );
  const hasPendingChanges = compositionDirty || ptBandsDirty || grBandsDirty || dirtyRuleIds.size > 0;
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
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await guardarComposicionMatrizEmpresa(empresaId, draft.id, {
        revision: draft.revision,
        criterios_pt: criteriosPt.map((item) => ({
          catalogo_criterio_version_id: item.versionId,
          texto: item.texto.trim(),
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
      setDirtyRuleIds(new Set());
      setSuccess('Composición guardada correctamente.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No fue posible guardar la composición'));
    } finally {
      setSaving(false);
    }
  };

  const saveOptions = async (item: CriterioEditable) => {
    if (!draft || !item.matrizCriterioId) return;
    setSavingParameterId(item.matrizCriterioId);
    setError('');
    setSuccess('');
    try {
      const saved = await guardarOpcionesCriterioMatriz(
        empresaId,
        draft.id,
        item.matrizCriterioId,
        draft.revision,
        item.opciones.map((option) => option.trim()),
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
      setSuccess('Respuestas del criterio guardadas correctamente.');
    } catch (requestError) {
      setError(getApiErrorMessage(
        requestError,
        'No fue posible guardar las respuestas. Si la matriz cambió, recarga la página.',
      ));
    } finally {
      setSavingParameterId(null);
    }
  };

  const saveRules = async (item: CriterioEditable) => {
    if (!draft || !item.matrizCriterioId || item.reglas.length === 0) return;
    const controlledPriority = item.codigo === 'DESTINO_RECURSOS_GR' ||
      item.codigo === 'PERFIL_TRANSACCIONAL';
    const payload: ReglaMatrizGrInput[] = [];
    for (const rule of item.reglas) {
      const priority = controlledPriority ? 0 : Number(rule.prioridad);
      if (
        ![1, 2, 3].includes(Number(rule.puntaje)) ||
        !Number.isSafeInteger(priority) || priority < 0 || priority > 2147483647 ||
        (rule.altoAutomatico && (!rule.causaCodigo.trim() || rule.causaCodigo.trim().length > 100))
      ) {
        setError('Completa todos los puntajes, prioridades y causas antes de guardar las reglas.');
        setSuccess('');
        return;
      }
      payload.push({
        clave: rule.clave,
        puntaje: Number(rule.puntaje) as 1 | 2 | 3,
        prioridad: priority,
        alto_automatico: rule.altoAutomatico,
        causa_codigo: rule.altoAutomatico ? rule.causaCodigo.trim() : null,
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
        bands.map((band) => ({
          nombre: band.nombre.trim(),
          minimo: Number(band.minimo),
          maximo: Number(band.maximo),
        })),
      );
      setDraft(saved);
      setCriteriosGr((current) => mergeSavedGrCriteria(saved.criterios_gr, current));
      if (ambito === 'PT') {
        setBandasPt(toBands(saved.resultados_pt));
        setPtBandsDirty(false);
      } else {
        setBandasGr(toBands(saved.resultados_gr));
        setGrBandsDirty(false);
      }
      setSuccess(`Bandas ${ambito} guardadas correctamente.`);
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
      setPtBandsDirty(false);
      setGrBandsDirty(false);
      setDirtyRuleIds(new Set());
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
      setPtBandsDirty(false);
      setGrBandsDirty(false);
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
      {!loading && success ? <Alert variant="success">{success}</Alert> : null}

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
            <Badge variant={draft.cobertura_gr.estado === 'COMPLETA' ? 'success' : 'warning'}>
              Reglas GR: {draft.cobertura_gr.estado === 'COMPLETA' ? 'completa' : 'incompleta'}
            </Badge>
          </div>

          {draft.cobertura_gr.estado === 'INCOMPLETA' ? (
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

          <MatrixSection
            ambito="PT"
            catalogo={catalogoPt}
            selected={criteriosPt}
            disabled={draft.estado_editorial !== 'BORRADOR' || saving || savingParameterId !== null}
            savingParameterId={savingParameterId}
            onChange={(items) => {
              setCriteriosPt(items);
              setCompositionDirty(true);
            }}
            onParameterChange={setCriteriosPt}
            onSaveOptions={saveOptions}
            conditionLabels={ruleConditionLabels}
            savingRuleId={savingRuleId}
            rulesDisabled
            onSaveRules={saveRules}
            onRulesChange={setCriteriosPt}
          />
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

          {invalidLabels ? (
            <Alert variant="danger">Todas las etiquetas visibles deben contener texto.</Alert>
          ) : null}

          <Card className="p-5">
            <h2 className="text-lg font-semibold text-text-primary">Clasificación final</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Configura tres bandas inclusivas para cada ámbito.
            </p>
          </Card>
          <ResultBandsSection
            ambito="PT"
            criterionCount={criteriosPt.length}
            bands={bandasPt}
            disabled={
              draft.estado_editorial !== 'BORRADOR' || savingBands !== null ||
              savingRuleId !== null || transitioning
            }
            saving={savingBands === 'PT'}
            onChange={(bands) => {
              setBandasPt(bands);
              setPtBandsDirty(true);
            }}
            onSave={() => void saveBands('PT')}
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
              disabled={draft.estado_editorial !== 'BORRADOR' || saving || savingParameterId !== null || invalidLabels}
              onClick={save}
            >
              {saving ? 'Guardando…' : 'Guardar composición'}
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
