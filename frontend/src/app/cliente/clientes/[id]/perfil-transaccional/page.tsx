'use client';

import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Alert, Button, Card, PageHeader } from '@/components/ui';
import {
  crearPerfilTransaccionalV1,
  isApiRequestCanceled,
  obtenerPerfilTransaccionalV1,
  type PerfilTransaccionalV1Context,
  type PerfilTransaccionalV1Evaluacion,
} from '@/lib/api';
import { getCurrentUser, normalizeRole, type NormalizedRole } from '@/lib/auth';

const ERROR_MESSAGES: Record<string, string> = {
  PT_MATRIZ_NO_DISPONIBLE: 'La empresa no tiene una matriz publicada y activa.',
  PT_CONFIGURACION_INCONSISTENTE: 'La configuración del Perfil Transaccional requiere revisión.',
  CLIENTE_NO_ENCONTRADO: 'Cliente no encontrado.',
};

function perfilErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.error;
    if (detail && typeof detail === 'object') {
      const code = (detail as { codigo?: unknown }).codigo;
      if (typeof code === 'string' && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
      if (code === 'PT_RESPUESTAS_INVALIDAS') {
        const message = (detail as { mensaje?: unknown }).mensaje;
        if (typeof message === 'string' && message.trim()) return message;
        return 'Revisa que hayas seleccionado una opción válida en cada pregunta.';
      }
    }
  }
  return 'Hubo un problema al procesar el Perfil Transaccional.';
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function PerfilTransaccionalPage() {
  const params = useParams();
  const router = useRouter();
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const clienteId = useMemo(() => {
    const parsed = Number(idParam);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }, [idParam]);

  const [role, setRole] = useState<NormalizedRole | null>(null);
  const [context, setContext] = useState<PerfilTransaccionalV1Context | null>(null);
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [evaluation, setEvaluation] = useState<PerfilTransaccionalV1Evaluacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentRole = normalizeRole(getCurrentUser()?.rol);
    setRole(currentRole);
    if (!clienteId || currentRole === 'consultor' || !currentRole) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    obtenerPerfilTransaccionalV1(clienteId, controller.signal)
      .then((data) => {
        if (active) setContext(data);
      })
      .catch((requestError) => {
        if (active && !isApiRequestCanceled(requestError)) setError(perfilErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [clienteId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clienteId || !context || saving) return;
    const missing = context.criterios.some((criterio) => selections[criterio.id] === undefined);
    if (missing) {
      setError('Selecciona una opción en cada pregunta antes de continuar.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const saved = await crearPerfilTransaccionalV1(clienteId, {
        respuestas: context.criterios.map((criterio) => ({
          criterio_id: criterio.id,
          opcion_id: selections[criterio.id],
        })),
      });
      setEvaluation(saved);
    } catch (requestError) {
      setError(perfilErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-text-secondary">Cargando Perfil Transaccional…</div>;

  if (!clienteId) {
    return <div className="p-6"><Alert variant="danger">Cliente no encontrado.</Alert></div>;
  }

  if (role === 'consultor' || !role) {
    return (
      <div className="space-y-4 p-6">
        <Alert variant="warning">Tu rol sólo permite consultar la información del cliente.</Alert>
        <Button variant="secondary" onClick={() => router.push(`/cliente/clientes/${clienteId}`)}>
          Volver al cliente
        </Button>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="space-y-4 p-6">
        <Alert variant="danger">{error || 'Hubo un problema al procesar el Perfil Transaccional.'}</Alert>
        <Button variant="secondary" onClick={() => router.push(`/cliente/clientes/${clienteId}`)}>
          Volver al cliente
        </Button>
      </div>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <PageHeader
        title="Perfil Transaccional"
        description={<>Cliente: {context.cliente.nombre} · Matriz versión {context.matriz.numero_version}</>}
      />

      {context.ultima_evaluacion && !evaluation ? (
        <Card className="p-5">
          <h2 className="font-semibold">Último Perfil Transaccional</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
            <div><dt className="text-text-secondary">Resultado</dt><dd>{context.ultima_evaluacion.resultado.nombre}</dd></div>
            <div><dt className="text-text-secondary">Puntaje</dt><dd>{context.ultima_evaluacion.puntaje_total}</dd></div>
            <div><dt className="text-text-secondary">Versión</dt><dd>{context.ultima_evaluacion.numero_version}</dd></div>
            <div><dt className="text-text-secondary">Fecha</dt><dd>{formatDate(context.ultima_evaluacion.creada_en)}</dd></div>
          </dl>
        </Card>
      ) : null}

      {evaluation ? (
        <Card className="space-y-5 p-6">
          <div>
            <h2 className="text-xl font-semibold">Perfil Transaccional generado</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-sm text-text-secondary">Resultado</dt><dd className="text-lg font-semibold">{evaluation.resultado.nombre}</dd></div>
              <div><dt className="text-sm text-text-secondary">Puntaje</dt><dd>{evaluation.puntaje_total}</dd></div>
              <div><dt className="text-sm text-text-secondary">Versión PT</dt><dd>{evaluation.numero_version}</dd></div>
              <div><dt className="text-sm text-text-secondary">Matriz aplicada</dt><dd>Versión {evaluation.matriz.numero_version}</dd></div>
            </dl>
          </div>
          <div>
            <h3 className="font-semibold">Respuestas guardadas</h3>
            <ol className="mt-3 space-y-3">
              {[...evaluation.respuestas].sort((a, b) => a.orden - b.orden).map((respuesta, index) => (
                <li key={respuesta.criterio_id} className="rounded-control border border-border-light p-4">
                  <p className="font-medium">{index + 1}. {respuesta.criterio_texto}</p>
                  <p className="mt-1 text-sm text-text-secondary">{respuesta.opcion_etiqueta}</p>
                </li>
              ))}
            </ol>
          </div>
          <Button onClick={() => router.push(`/cliente/clientes/${clienteId}`)}>Volver al cliente</Button>
        </Card>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {[...context.criterios].sort((a, b) => a.orden - b.orden).map((criterio, index) => (
            <fieldset key={criterio.id} className="rounded-panel border border-border-light bg-white p-5 shadow-card">
              <legend className="px-1 font-semibold">{index + 1}. {criterio.texto}</legend>
              <div className="mt-3 space-y-2">
                {[...criterio.opciones].sort((a, b) => a.orden - b.orden).map((opcion) => (
                  <label key={opcion.id} className="flex cursor-pointer items-center gap-3 rounded-control border border-border-light p-3 hover:bg-surface-muted">
                    <input
                      type="radio"
                      name={`criterio-${criterio.id}`}
                      value={opcion.id}
                      checked={selections[criterio.id] === opcion.id}
                      onChange={() => setSelections((current) => ({ ...current, [criterio.id]: opcion.id }))}
                      className="h-4 w-4"
                    />
                    <span>{opcion.etiqueta}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Button type="submit" disabled={saving}>
            {saving ? 'Generando…' : 'Generar Perfil Transaccional'}
          </Button>
        </form>
      )}
    </main>
  );
}
