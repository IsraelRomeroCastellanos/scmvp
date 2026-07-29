// frontend/src/app/cliente/clientes/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  crearPerfilTransaccional,
  getApiErrorMessage,
  isApiRequestCanceled,
  obtenerDetalleCliente,
} from '@/lib/api';
import {
  getCurrentUser,
  normalizeRole,
  type NormalizedRole,
} from '@/lib/auth';
import type {
  ConfiguracionPldCliente,
  ContextoPldPerfil,
  PerfilTransaccionalConContexto,
  PerfilTransaccionalPayload,
} from '@/types/actividades-vulnerables';

type Cliente = {
  id: number;
  empresa_id: number;
  cliente_id_externo?: string | null;
  nombre_entidad: string;
  alias?: string | null;
  fecha_nacimiento_constitucion?: string | null;
  tipo_cliente: 'persona_fisica' | 'persona_moral' | 'fideicomiso';
  nacionalidad?: string | null;
  domicilio_mexico?: string | null; // legacy
  ocupacion?: string | null;
  actividad_economica?: any;
  datos_completos?: any;
  porcentaje_cumplimiento?: number | null;
  creado_en?: string | null;
  actualizado_en?: string | null;
  estado?: string | null;
};

type PerfilTransaccional = Partial<PerfilTransaccionalConContexto> & {
  tipo_servicio?: string | null;
  actividad_esperada?: string | null;
  monto_mensual_estimado?: number | string | null;
  frecuencia_operacion?: string | null;
  origen_recursos?: string | null;
  destino_recursos?: string | null;
  instrumentos_pago?: unknown;
};

type ClienteDetalleResponse = {
  cliente: Cliente | null;
  configuracion_pld: ConfiguracionPldCliente | null;
  perfil_transaccional: PerfilTransaccional | null;
  matriz_riesgo: MatrizRiesgo | null;
};

type MatrizRiesgo = {
  nivel_riesgo?: string | null;
  puntaje_riesgo?: number | string | null;
  version_matriz?: string | number | null;
  tipo_evaluacion?: string | null;
  generado_en?: string | null;
  observaciones?: string | null;
};

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-gray-500">{children}</div>;
}

function Value({ children }: { children: React.ReactNode }) {
  return <div className="text-sm break-words">{children}</div>;
}

function Row({ label, value }: { label: string; value: any }) {
  const v = formatAny(value);
  return (
    <div>
      <Label>{label}</Label>
      <Value>{v}</Value>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border bg-white p-4">
      <h2 className="text-lg font-medium mb-3">{title}</h2>
      {children}
    </div>
  );
}

function formatAny(v: any) {
  if (v === null || v === undefined) return '—';

  // Catálogo tipo { clave, descripcion }
  if (typeof v === 'object' && (v?.clave || v?.descripcion)) {
    const clave = String(v?.clave ?? '').trim();
    const descripcion = String(v?.descripcion ?? '').trim();
    if (descripcion && clave) return `${descripcion} (${clave})`;
    if (descripcion) return descripcion;
    if (clave) return clave;
  }

  // "MEXICO,MX" => "MEXICO (MX)"
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return '—';
    const parts = s.split(',').map((x) => x.trim()).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]} (${parts[1]})`;
    return s;
  }

  // number/bool
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);

  // fallback
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function fullNameFrom(parts: any) {
  if (!parts) return '';
  const s = String(parts?.nombre_completo ?? '').trim();
  if (s) return s;

  const nombres = String(parts?.nombres ?? '').trim();
  const ap = String(parts?.apellido_paterno ?? '').trim();
  const am = String(parts?.apellido_materno ?? '').trim();
  const join = [nombres, ap, am].filter(Boolean).join(' ');
  return join || '';
}

function formatDomicilio(d: any) {
  if (!d) return '—';

  // Acepta objeto domicilio {calle, numero, interior, colonia, municipio, ciudad_delegacion, codigo_postal, estado, pais}
  const calle = String(d?.calle ?? '').trim();
  const numero = String(d?.numero ?? '').trim();
  const interior = String(d?.interior ?? '').trim();
  const colonia = String(d?.colonia ?? '').trim();
  const municipio = String(d?.municipio ?? '').trim();
  const ciudad =
    String(d?.ciudad_delegacion ?? '').trim() ||
    String(d?.ciudadDelegacion ?? '').trim() ||
    String(d?.ciudad ?? '').trim();
  const cp = String(d?.codigo_postal ?? '').trim() || String(d?.codigoPostal ?? '').trim();
  const estado = String(d?.estado ?? '').trim();
  const pais = String(d?.pais ?? '').trim();

  const linea1 = [calle, numero ? `#${numero}` : '', interior ? `Int ${interior}` : '']
    .filter(Boolean)
    .join(' ')
    .trim();

  const linea2 = [colonia, municipio, ciudad].filter(Boolean).join(', ').trim();

  const linea3 = [cp, estado, pais].filter(Boolean).join(', ').trim();

  const out = [linea1, linea2, linea3].filter(Boolean).join(' · ').trim();
  if (out) return out;

  // fallback si el objeto viene distinto
  try {
    return JSON.stringify(d);
  } catch {
    return String(d);
  }
}

export default function ClienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const idParam = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [perfilTransaccional, setPerfilTransaccional] = useState<PerfilTransaccional | null>(null);
  const [configuracionPld, setConfiguracionPld] = useState<ConfiguracionPldCliente | null>(null);
  const [matrizRiesgo, setMatrizRiesgo] = useState<MatrizRiesgo | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [perfilSaving, setPerfilSaving] = useState(false);
  const [perfilError, setPerfilError] = useState('');
  const [perfilForm, setPerfilForm] = useState({
    tipo_servicio: '',
    actividad_esperada: '',
    monto_mensual_estimado: '',
    frecuencia_operacion: '',
    origen_recursos: '',
    destino_recursos: '',
  });
  const [role, setRole] = useState<NormalizedRole | null>(null);

  useEffect(() => {
    setRole(normalizeRole(getCurrentUser()?.rol));
  }, []);

  const id = useMemo(() => {
    const n = Number(idParam);
    return Number.isFinite(n) ? n : null;
  }, [idParam]);

  useEffect(() => {
    if (!id) {
      setErr('ID inválido');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const data = await obtenerDetalleCliente<ClienteDetalleResponse>(
          id,
          controller.signal,
        );
        if (!active) return;

        setCliente(data?.cliente ?? null);
        setConfiguracionPld(data?.configuracion_pld ?? null);
        setPerfilTransaccional(data?.perfil_transaccional ?? null);
        setMatrizRiesgo(data?.matriz_riesgo ?? null);
      } catch (requestError) {
        if (!active || isApiRequestCanceled(requestError)) return;
        setErr(getApiErrorMessage(requestError, 'Error al cargar cliente'));
        setCliente(null);
        setPerfilTransaccional(null);
        setConfiguracionPld(null);
        setMatrizRiesgo(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, refreshKey, router]);

  const submitPerfilTransaccional = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || perfilSaving || configuracionPld?.estado !== 'completa') return;

    const montoRaw = perfilForm.monto_mensual_estimado.trim();
    const monto = montoRaw === '' ? null : Number(montoRaw);
    if (monto !== null && (!Number.isFinite(monto) || monto < 0)) {
      setPerfilError('El monto mensual estimado debe ser un número mayor o igual a cero.');
      return;
    }

    const payload: PerfilTransaccionalPayload = {
      tipo_servicio: perfilForm.tipo_servicio.trim() || null,
      actividad_esperada: perfilForm.actividad_esperada.trim() || null,
      monto_mensual_estimado: monto,
      frecuencia_operacion: perfilForm.frecuencia_operacion.trim() || null,
      origen_recursos: perfilForm.origen_recursos.trim() || null,
      destino_recursos: perfilForm.destino_recursos.trim() || null,
    };

    try {
      setPerfilSaving(true);
      setPerfilError('');
      await crearPerfilTransaccional(id, payload);
      setPerfilForm({
        tipo_servicio: '',
        actividad_esperada: '',
        monto_mensual_estimado: '',
        frecuencia_operacion: '',
        origen_recursos: '',
        destino_recursos: '',
      });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (!isApiRequestCanceled(error)) {
        setPerfilError(
          getApiErrorMessage(error, 'No se pudo crear el Perfil Transaccional.'),
        );
      }
    } finally {
      setPerfilSaving(false);
    }
  };

  const datos = cliente?.datos_completos ?? {};
  const contacto = datos?.contacto ?? null;

  const persona = datos?.persona ?? null;
  const empresa = datos?.empresa ?? null;
  const representante = datos?.representante ?? null;

  const fidei = datos?.fideicomiso ?? null;

  const repNombreCompleto = useMemo(() => fullNameFrom(representante), [representante]);

  const actividadPF =
    persona?.actividad_economica ??
    persona?.actividadEconomica ??
    cliente?.actividad_economica ??
    null;

  const giroPM =
    empresa?.giro_mercantil ??
    empresa?.giroMercantil ??
    empresa?.giro ??
    null;

  // ✅ Nuevo: domicilio de contacto (objeto)
  const contactoDomicilio =
    contacto?.domicilio_mexico ??
    contacto?.domicilio ??
    null;

  // Legacy: texto en cliente.domicilio_mexico (si existiera)
  const domicilioLegacy = cliente?.domicilio_mexico ?? null;

  if (loading) return <div className="p-6">Cargando…</div>;

  if (err) {
    return (
      <div className="p-6 space-y-3">
        <div className="rounded border bg-red-50 p-3 text-sm text-red-700">{err}</div>
        <button className="rounded border px-3 py-2" onClick={() => router.back()}>
          Volver
        </button>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="p-6 space-y-3">
        <div className="rounded border bg-yellow-50 p-3 text-sm">No se encontró el cliente.</div>
        <button className="rounded border px-3 py-2" onClick={() => router.back()}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{cliente.nombre_entidad}</h1>
          <div className="text-sm text-gray-600">
            ID: {cliente.id} · Empresa: {cliente.empresa_id} · Tipo: {cliente.tipo_cliente}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            onClick={() => router.push(`/cliente/editar-cliente/${cliente.id}`)}
            title="Editar cliente"
          >
            ✏️ Editar
          </button>

          {/* ✅ Generar / Imprimir manual */}
          <button
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            onClick={() => router.push(`/cliente/clientes/${cliente.id}/imprimir`)}
            title="Generar / Imprimir expediente"
          >
            🖨️ Generar / Imprimir
          </button>

          <button className="rounded border px-3 py-2 text-sm" onClick={() => router.back()}>
            Volver
          </button>
        </div>
      </div>

      <Card title="Datos generales">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Row label="Nombre / Razón social" value={cliente.nombre_entidad} />
          <Row label="Alias" value={cliente.alias} />
          <Row label="Cliente ID externo" value={cliente.cliente_id_externo} />
          <Row label="Estado" value={cliente.estado} />

          <Row label="Nacionalidad" value={cliente.nacionalidad} />
          <Row label="% Cumplimiento" value={cliente.porcentaje_cumplimiento} />
          <Row label="Creado" value={cliente.creado_en} />
          <Row label="Actualizado" value={cliente.actualizado_en} />
        </div>
      </Card>

      <Card title="Contacto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Row label="País (contacto)" value={contacto?.pais} />
          <Row label="Email" value={contacto?.email} />
          <Row label="Teléfono" value={contacto?.telefono} />
          <Row label="Domicilio (contacto)" value={formatDomicilio(contactoDomicilio)} />

          {/* Legacy sólo para no “perder” info si existiera */}
          {domicilioLegacy ? (
            <div className="md:col-span-4">
              <Label>Domicilio (legacy)</Label>
              <Value>{formatAny(domicilioLegacy)}</Value>
            </div>
          ) : null}
        </div>
      </Card>

      {cliente.tipo_cliente === 'persona_fisica' && (
        <Card title="Persona Física">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Row label="Nombre(s)" value={persona?.nombres} />
            <Row label="Apellido paterno" value={persona?.apellido_paterno} />
            <Row label="Apellido materno" value={persona?.apellido_materno} />
            <Row label="Fecha nacimiento (AAAAMMDD)" value={persona?.fecha_nacimiento} />

            <Row label="RFC" value={persona?.rfc} />
            <Row label="CURP" value={persona?.curp} />
            <Row label="Ocupación" value={persona?.ocupacion ?? cliente.ocupacion} />
            <Row label="Actividad económica" value={actividadPF} />
          </div>
        </Card>
      )}

      {cliente.tipo_cliente === 'persona_moral' && (
        <Card title="Persona Moral">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Row label="RFC" value={empresa?.rfc} />
            <Row label="Fecha constitución" value={empresa?.fecha_constitucion} />
            <Row label="Giro mercantil" value={giroPM} />
          </div>

          <div className="mt-4 rounded border p-3">
            <h3 className="font-medium mb-3">Representante / Apoderado</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Row label="Nombre completo" value={repNombreCompleto} />
              <Row label="RFC" value={representante?.rfc} />
              <Row label="CURP" value={representante?.curp} />
            </div>
          </div>
        </Card>
      )}

      {cliente.tipo_cliente === 'fideicomiso' && (
        <Card title="Fideicomiso">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Row label="Denominación / Razón social del fiduciario" value={fidei?.denominacion_fiduciario} />
            <Row label="RFC del fiduciario" value={fidei?.rfc_fiduciario} />
            <Row label="Identificador del fideicomiso" value={fidei?.identificador} />
          </div>

          <div className="mt-4 rounded border p-3">
            <h3 className="font-medium mb-3">Representante / Apoderado</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Row label="Nombre completo" value={repNombreCompleto} />
              <Row label="Fecha de nacimiento (AAAAMMDD)" value={representante?.fecha_nacimiento} />
              <Row label="RFC" value={representante?.rfc} />
              <Row label="CURP" value={representante?.curp} />
            </div>
          </div>
        </Card>
      )}

      <Card title="Configuración PLD">
        {configuracionPld?.estado === 'completa' ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Row label="Actividad" value={configuracionPld.actividad?.nombre} />
            <Row label="Operación" value={configuracionPld.operacion?.nombre} />
            <Row
              label="Origen de selección"
              value={
                configuracionPld.origen_seleccion === 'automatica'
                  ? 'Automática'
                  : configuracionPld.origen_seleccion === 'manual'
                    ? 'Manual'
                    : configuracionPld.origen_seleccion === 'regularizacion'
                      ? 'Regularización'
                      : null
              }
            />
            <Row label="Vigente desde" value={configuracionPld.vigente_desde} />
          </div>
        ) : (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Este expediente todavía no tiene una actividad y operación PLD vigentes.
          </div>
        )}
      </Card>

      <div id="perfil-transaccional" className="scroll-mt-6">
      <Card title="Perfil Transaccional">
        {perfilTransaccional ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Row label="Tipo de servicio" value={perfilTransaccional.tipo_servicio} />
              <Row label="Actividad esperada" value={perfilTransaccional.actividad_esperada} />
              <Row label="Monto mensual estimado" value={perfilTransaccional.monto_mensual_estimado} />
              <Row label="Frecuencia de operación" value={perfilTransaccional.frecuencia_operacion} />
              <Row label="Origen de recursos" value={perfilTransaccional.origen_recursos} />
              <Row label="Destino de recursos" value={perfilTransaccional.destino_recursos} />
              <Row label="Instrumentos de pago" value={perfilTransaccional.instrumentos_pago} />
            </div>
            {perfilTransaccional.contexto_pld_pendiente || !perfilTransaccional.contexto_pld ? (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Contexto PLD histórico no determinado.
              </div>
            ) : (
              <div className="rounded border border-gray-200 bg-gray-50 p-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Row label="Actividad del perfil" value={perfilTransaccional.contexto_pld.actividad.nombre} />
                  <Row label="Operación del perfil" value={perfilTransaccional.contexto_pld.operacion.nombre} />
                  <Row label="Origen" value={perfilTransaccional.contexto_pld.origen_seleccion} />
                  <Row label="Vigente desde" value={perfilTransaccional.contexto_pld.vigente_desde} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded border border-dashed bg-gray-50 p-4 text-sm text-gray-600">
            No hay perfil transaccional registrado para este cliente.
          </div>
        )}

        {role && role !== 'consultor' ? (
          configuracionPld?.estado === 'completa' ? (
            <form onSubmit={submitPerfilTransaccional} className="mt-5 space-y-4 border-t pt-4">
              <h3 className="font-medium">Crear nueva versión</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {([
                  ['tipo_servicio', 'Tipo de servicio'],
                  ['actividad_esperada', 'Actividad esperada'],
                  ['frecuencia_operacion', 'Frecuencia de operación'],
                  ['origen_recursos', 'Origen de recursos'],
                  ['destino_recursos', 'Destino de recursos'],
                ] as const).map(([field, label]) => (
                  <div key={field}>
                    <label htmlFor={`perfil-${field}`} className="mb-1 block text-sm font-medium">{label}</label>
                    <input
                      id={`perfil-${field}`}
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={perfilForm[field]}
                      onChange={(event) => setPerfilForm((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))}
                    />
                  </div>
                ))}
                <div>
                  <label htmlFor="perfil-monto" className="mb-1 block text-sm font-medium">Monto mensual estimado</label>
                  <input
                    id="perfil-monto"
                    type="number"
                    min="0"
                    step="any"
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={perfilForm.monto_mensual_estimado}
                    onChange={(event) => setPerfilForm((current) => ({
                      ...current,
                      monto_mensual_estimado: event.target.value,
                    }))}
                  />
                </div>
              </div>
              {perfilError ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{perfilError}</div>
              ) : null}
              <button
                type="submit"
                disabled={perfilSaving}
                className="rounded bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {perfilSaving ? 'Guardando…' : 'Crear Perfil Transaccional'}
              </button>
            </form>
          ) : (
            <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Primero debe configurarse la actividad y operación PLD del expediente.
            </div>
          )
        ) : null}
      </Card>
      </div>

      <Card title="Evaluación de Riesgo">
        {matrizRiesgo ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Row label="Nivel de riesgo" value={matrizRiesgo.nivel_riesgo} />
            <Row label="Puntaje de riesgo" value={matrizRiesgo.puntaje_riesgo} />
            <Row label="Versión de matriz" value={matrizRiesgo.version_matriz} />
            <Row label="Tipo de evaluación" value={matrizRiesgo.tipo_evaluacion} />
            <Row label="Generado en" value={matrizRiesgo.generado_en} />
            <Row label="Observaciones" value={matrizRiesgo.observaciones} />
          </div>
        ) : (
          <div className="rounded border border-dashed bg-gray-50 p-4 text-sm text-gray-600">
            No hay evaluación de riesgo registrada para este cliente.
          </div>
        )}
      </Card>

      <div className="rounded border bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Expediente (datos_completos)</h2>
          <button className="rounded border px-3 py-1 text-sm" onClick={() => setShowRaw((v) => !v)}>
            {showRaw ? 'Ocultar JSON' : 'Ver JSON'}
          </button>
        </div>

        {showRaw && (
          <pre className="mt-3 text-xs overflow-auto whitespace-pre-wrap">
            {JSON.stringify(cliente?.datos_completos ?? {}, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
