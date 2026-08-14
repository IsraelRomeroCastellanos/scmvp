'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Input, LoadingState, PageHeader } from '@/components/ui';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import {
  crearBorradorMatrizEmpresa,
  getApiErrorMessage,
  guardarComposicionMatrizEmpresa,
  isApiRequestCanceled,
  obtenerBorradorMatrizEmpresa,
  obtenerCatalogoCriteriosMatriz,
  obtenerEmpresaAdmin,
  type AmbitoMatriz,
  type BorradorMatrizEmpresa,
  type CriterioBorradorMatriz,
  type CriterioCatalogoMatriz,
} from '@/lib/api';

type EmpresaResumen = { id: number; nombre_legal: string };

type CriterioEditable = {
  versionId: number;
  codigo: string;
  texto: string;
};

function toEditable(items: CriterioBorradorMatriz[]): CriterioEditable[] {
  return items.map((item) => ({
    versionId: item.catalogo_criterio_version_id,
    codigo: item.codigo,
    texto: item.texto,
  }));
}

function MatrixSection({
  ambito,
  catalogo,
  selected,
  disabled,
  onChange,
}: {
  ambito: AmbitoMatriz;
  catalogo: CriterioCatalogoMatriz[];
  selected: CriterioEditable[];
  disabled: boolean;
  onChange: (items: CriterioEditable[]) => void;
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        setNotFoundDraft(false);
      } catch (requestError: unknown) {
        const status = (requestError as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setDraft(null);
          setCriteriosPt([]);
          setCriteriosGr([]);
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
      setSuccess('Composición guardada correctamente.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No fue posible guardar la composición'));
    } finally {
      setSaving(false);
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
            disabled={saving}
            onChange={setCriteriosPt}
          />
          <MatrixSection
            ambito="GR"
            catalogo={catalogoGr}
            selected={criteriosGr}
            disabled={saving}
            onChange={setCriteriosGr}
          />

          {invalidLabels ? (
            <Alert variant="danger">Todas las etiquetas visibles deben contener texto.</Alert>
          ) : null}

          <div className="flex justify-end">
            <Button disabled={saving || invalidLabels} onClick={save}>
              {saving ? 'Guardando…' : 'Guardar composición'}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
