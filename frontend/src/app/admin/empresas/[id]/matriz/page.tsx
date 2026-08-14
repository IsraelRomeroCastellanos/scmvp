'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Input, LoadingState, PageHeader } from '@/components/ui';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import {
  activarMatrizEmpresa,
  crearBorradorMatrizEmpresa,
  getApiErrorMessage,
  guardarComposicionMatrizEmpresa,
  guardarOpcionesCriterioMatriz,
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
} from '@/lib/api';

type EmpresaResumen = { id: number; nombre_legal: string };

type CriterioEditable = {
  versionId: number;
  matrizCriterioId?: number;
  codigo: string;
  texto: string;
  tipoResolucion: string;
  opciones: string[];
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
  return items.map((item) => ({
    versionId: item.catalogo_criterio_version_id,
    matrizCriterioId: item.matriz_criterio_id,
    codigo: item.codigo,
    texto: item.texto,
    tipoResolucion: item.tipo_resolucion,
    opciones: [0, 1, 2].map((index) => item.opciones[index]?.etiqueta ?? ''),
  }));
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
}: {
  ambito: AmbitoMatriz;
  catalogo: CriterioCatalogoMatriz[];
  selected: CriterioEditable[];
  disabled: boolean;
  savingParameterId: number | null;
  onChange: (items: CriterioEditable[]) => void;
  onParameterChange: (items: CriterioEditable[]) => void;
  onSaveOptions: (item: CriterioEditable) => void;
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
              <p className="mt-4 border-t border-border-light pt-4 text-sm text-text-secondary">
                Se calcula automáticamente con datos del cliente y/o perfil transaccional.
              </p>
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
  const [transitioning, setTransitioning] = useState(false);
  const [compositionDirty, setCompositionDirty] = useState(false);
  const [ptBandsDirty, setPtBandsDirty] = useState(false);
  const [grBandsDirty, setGrBandsDirty] = useState(false);
  const [creating, setCreating] = useState(false);
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
  const hasPendingChanges = compositionDirty || ptBandsDirty || grBandsDirty;

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
      const savedGrByVersion = new Map(
        saved.criterios_gr.map((criterion) => [
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
      setCriteriosGr((current) => refreshParameters(current, savedGrByVersion));
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
      setSuccess(
        action === 'VALIDAR' ? 'Matriz validada correctamente.'
          : action === 'PUBLICAR' ? 'Matriz publicada. Ya puede activarse.'
            : action === 'REABRIR' ? 'Matriz reabierta para edición.'
              : 'Matriz activada correctamente.',
      );
    } catch (requestError) {
      setError(getApiErrorMessage(
        requestError,
        action === 'ACTIVAR'
          ? 'No fue posible activar; verifica que no exista otra matriz activa.'
          : 'La matriz está incompleta o cambió; revisa la configuración.',
      ));
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
          <p className="mt-2 text-sm text-text-secondary">
            Crear el borrador no publica ni activa la matriz.
          </p>
          <Button className="mt-5" disabled={creating} onClick={createDraft}>
            {creating ? 'Creando…' : 'Crear borrador'}
          </Button>
        </Card>
      ) : null}

      {!loading && draft ? (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
            <Badge variant="warning">{draft.estado_editorial}</Badge>
            <span>Versión {draft.numero_version}</span>
            <span>Revisión {draft.revision}</span>
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
            }}
            onParameterChange={setCriteriosPt}
            onSaveOptions={saveOptions}
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
            disabled={draft.estado_editorial !== 'BORRADOR' || savingBands !== null || transitioning}
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
            disabled={draft.estado_editorial !== 'BORRADOR' || savingBands !== null || transitioning}
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
          <div className="flex flex-wrap justify-end gap-3">
            {draft.estado_editorial === 'BORRADOR' ? (
              <Button
                disabled={transitioning || saving || savingBands !== null || hasPendingChanges}
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
        </>
      ) : null}
    </div>
  );
}
