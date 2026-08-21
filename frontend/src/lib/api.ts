// frontend/src/lib/api.ts
import axios from "axios";
import type {
  ActividadVulnerableGeneral,
  OperacionVulnerable,
  PerfilTransaccionalPayload,
} from "@/types/actividades-vulnerables";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "",
});

// Adjunta el token a cada petición, si existe
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Export default (import api from '@/lib/api')
export default api;

// Export nombrado (import { api } from '@/lib/api')
export { api };

export function getApiErrorMessage(
  error: unknown,
  fallback = "No se pudo completar la solicitud",
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object") {
      const message = (data as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
      const detail = (data as { error?: unknown }).error;
      if (typeof detail === "string" && detail.trim()) return detail;
      if (detail && typeof detail === "object") {
        const nestedMessage = (detail as { mensaje?: unknown }).mensaje;
        if (typeof nestedMessage === "string" && nestedMessage.trim()) {
          return nestedMessage;
        }
      }
    }
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

export function isApiRequestCanceled(error: unknown): boolean {
  return axios.isCancel(error)
    || (axios.isAxiosError(error) && error.code === "ERR_CANCELED");
}

export async function obtenerEmpresasAdmin<T>(signal?: AbortSignal): Promise<T[]> {
  const response = await api.get<{ empresas: T[] }>("/api/admin/empresas", { signal });
  if (!Array.isArray(response.data?.empresas)) {
    throw new Error("La respuesta del listado de empresas no es válida");
  }
  return response.data.empresas;
}

export async function obtenerEmpresaAdmin<T>(
  empresaId: string | number,
  signal?: AbortSignal,
): Promise<T> {
  const response = await api.get<{ empresa: T }>(
    `/api/admin/empresas/${empresaId}`,
    { signal },
  );
  if (!response.data?.empresa) {
    throw new Error("La respuesta de la empresa no es válida");
  }
  return response.data.empresa;
}

export async function crearEmpresa<T>(
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await api.post<T>("/api/admin/empresas", payload);
  return response.data;
}

export async function actualizarEmpresa<T>(
  empresaId: string | number,
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await api.put<T>(`/api/admin/empresas/${empresaId}`, payload);
  return response.data;
}

export type AmbitoMatriz = "PT" | "GR";

export interface CriterioCatalogoMatriz {
  id: number;
  codigo: string;
  nombre_visible_global: string;
  ambito: AmbitoMatriz;
  version_vigente_id: number;
  version_contrato: number;
  tipo_resolucion: string;
  parametrizacion: string;
  unidad_canonica: string | null;
}

export interface CriterioBorradorMatriz {
  matriz_criterio_id: number;
  catalogo_criterio_version_id: number;
  codigo: string;
  texto: string;
  orden: number;
  tipo_resolucion: string;
  parametrizacion: string;
  unidad_canonica: string | null;
  opciones: Array<{
    id: number;
    codigo: string;
    etiqueta: string;
    orden: number;
    puntaje: 1 | 2 | 3;
  }>;
  rangos: Array<{
    id: number;
    minimo: number | null;
    maximo: number | null;
    incluye_minimo: boolean;
    incluye_maximo: boolean;
    unidad: string;
    orden: number;
    puntaje: 1 | 2 | 3;
  }>;
  reglas?: ReglaMatrizGr[];
  cobertura?: CoberturaCriterioGr;
}

export interface ReglaMatrizGr {
  id: number;
  codigo: string;
  marca_canonica: string | null;
  condicion_controlada: string | null;
  puntaje: number;
  prioridad: number;
  alto_automatico: boolean;
  causa_codigo: string | null;
}

export interface CoberturaCriterioGr {
  esperada: string[];
  actual: string[];
  faltantes: string[];
  extras: string[];
  duplicadas: string[];
  reglas_invalidas: string[];
  estado: "COMPLETA" | "INCOMPLETA";
}

export interface CoberturaGr {
  estado: "COMPLETA" | "INCOMPLETA";
  criterios_esperados: string[];
  criterios_actuales: string[];
  criterios_faltantes: string[];
  criterios_duplicados: string[];
  dependencia_destino_recursos_pt: "COMPLETA" | "INCOMPLETA";
  criterios: Record<string, CoberturaCriterioGr>;
  bandas_gr: { estado: "COMPLETA" | "INCOMPLETA"; detalles: string[] };
  detalles: string[];
}

export interface BorradorMatrizEmpresa {
  id: number;
  empresa_id: number;
  numero_version: number;
  estado_editorial: "BORRADOR" | "VALIDADA" | "PUBLICADA" | "DESCARTADA";
  activa: boolean;
  revision: number;
  procedencia: "CREADA_EN_SISTEMA" | "IMPORTADA_XLSX" | null;
  version_origen_id?: number | null;
  criterios_pt: CriterioBorradorMatriz[];
  criterios_gr: CriterioBorradorMatriz[];
  resultados_pt: ResultadoMatrizEmpresa[];
  resultados_gr: ResultadoMatrizEmpresa[];
  cobertura_gr: CoberturaGr;
}

export interface MatrizCreadaEmpresa {
  id: number;
  empresa_id: number;
  numero_version: number;
  estado_editorial: "BORRADOR";
  activa: false;
  revision: number;
  version_origen_id: number | null;
  creada_en: string;
}

export interface MatrizPublicadaFuente {
  id: number;
  numero_version: number;
  revision: number;
  activa: boolean;
}

export interface ResultadoMatrizEmpresa {
  id: number;
  codigo: string;
  nombre: string;
  minimo: number;
  maximo: number;
  orden: number;
}

export type ReglaMatrizGrInput = {
  clave: string;
  puntaje: 1 | 2 | 3;
};

export async function obtenerCatalogoCriteriosMatriz(
  ambito: AmbitoMatriz,
  signal?: AbortSignal,
): Promise<CriterioCatalogoMatriz[]> {
  const response = await api.get<{ criterios: CriterioCatalogoMatriz[] }>(
    "/api/admin/catalogos-criterios-matriz",
    { params: { ambito }, signal },
  );
  if (!Array.isArray(response.data?.criterios)) {
    throw new Error("La respuesta del catálogo de criterios no es válida");
  }
  return response.data.criterios;
}

export async function obtenerBorradorMatrizEmpresa(
  empresaId: string | number,
  signal?: AbortSignal,
): Promise<BorradorMatrizEmpresa> {
  const response = await api.get<{ data: BorradorMatrizEmpresa }>(
    `/api/admin/empresas/${empresaId}/matrices/borrador`,
    { signal },
  );
  if (!response.data?.data) {
    throw new Error("La respuesta del borrador de matriz no es válida");
  }
  return response.data.data;
}

export async function crearBorradorMatrizEmpresa(
  empresaId: string | number,
): Promise<MatrizCreadaEmpresa> {
  const idempotencyKey = `matriz-${crypto.randomUUID()}`;
  const response = await api.post<{ data: MatrizCreadaEmpresa }>(
    `/api/admin/empresas/${empresaId}/matrices`,
    {},
    { headers: { "Idempotency-Key": idempotencyKey } },
  );
  if (!response.data?.data) {
    throw new Error("La respuesta de creación del borrador no es válida");
  }
  return response.data.data;
}

export async function crearVersionMatrizDesdeHistorica(
  empresaId: string | number,
  fuente: MatrizPublicadaFuente,
  motivo: string,
): Promise<MatrizCreadaEmpresa> {
  const idempotencyKey = `matriz-historica-${crypto.randomUUID()}`;
  const response = await api.post<{ data: MatrizCreadaEmpresa }>(
    `/api/admin/empresas/${empresaId}/matrices/${fuente.id}/nueva-version`,
    { motivo },
    {
      headers: {
        "If-Match": `"mve-${fuente.id}-r${fuente.revision}"`,
        "Idempotency-Key": idempotencyKey,
      },
    },
  );
  if (!response.data?.data) {
    throw new Error("La respuesta de la nueva versión no es válida");
  }
  return response.data.data;
}

export async function guardarComposicionMatrizEmpresa(
  empresaId: string | number,
  matrizId: number,
  payload: {
    revision: number;
    criterios_pt: Array<{ catalogo_criterio_version_id: number }>;
    criterios_gr: Array<{ catalogo_criterio_version_id: number; texto: string }>;
  },
): Promise<BorradorMatrizEmpresa> {
  const response = await api.put<{ data: BorradorMatrizEmpresa }>(
    `/api/admin/empresas/${empresaId}/matrices/${matrizId}/criterios`,
    payload,
  );
  if (!response.data?.data) {
    throw new Error("La respuesta del guardado de composición no es válida");
  }
  return response.data.data;
}

export async function guardarOpcionesCriterioMatriz(
  empresaId: string | number,
  matrizId: number,
  criterioId: number,
  revision: number,
  etiquetas: string[],
): Promise<BorradorMatrizEmpresa> {
  const response = await api.put<{ data: BorradorMatrizEmpresa }>(
    `/api/admin/empresas/${empresaId}/matrices/${matrizId}/criterios/${criterioId}/parametrizacion`,
    {
      revision,
      opciones: etiquetas.map((etiqueta) => ({ etiqueta })),
    },
  );
  if (!response.data?.data) {
    throw new Error("La respuesta de parametrización no es válida");
  }
  return response.data.data;
}

export async function guardarReglasMatrizGr(
  empresaId: string | number,
  matrizId: number,
  criterioId: number,
  reglas: ReglaMatrizGrInput[],
): Promise<BorradorMatrizEmpresa> {
  const response = await api.put<{ data: BorradorMatrizEmpresa }>(
    `/api/admin/empresas/${empresaId}/matrices/${matrizId}/criterios/${criterioId}/reglas`,
    { reglas },
  );
  if (!response.data?.data) {
    throw new Error("La respuesta del guardado de reglas GR no es válida");
  }
  return response.data.data;
}

export async function guardarResultadosMatrizEmpresa(
  empresaId: string | number,
  matrizId: number,
  ambito: AmbitoMatriz,
  revision: number,
  resultados: Array<{ nombre: string; minimo: number; maximo: number }>,
): Promise<BorradorMatrizEmpresa> {
  const response = await api.put<{ data: BorradorMatrizEmpresa }>(
    `/api/admin/empresas/${empresaId}/matrices/${matrizId}/resultados/${ambito}`,
    { revision, resultados },
  );
  return response.data.data;
}

async function cambiarEstadoMatrizEmpresa(
  empresaId: string | number,
  matrizId: number,
  accion: "validar" | "publicar" | "reabrir" | "activar",
  revision: number,
): Promise<BorradorMatrizEmpresa> {
  const response = await api.post<{ data: BorradorMatrizEmpresa }>(
    `/api/admin/empresas/${empresaId}/matrices/${matrizId}/${accion}`,
    { revision },
  );
  return response.data.data;
}

export const validarMatrizEmpresa = (
  empresaId: string | number, matrizId: number, revision: number,
) => cambiarEstadoMatrizEmpresa(empresaId, matrizId, "validar", revision);

export const publicarMatrizEmpresa = (
  empresaId: string | number, matrizId: number, revision: number,
) => cambiarEstadoMatrizEmpresa(empresaId, matrizId, "publicar", revision);

export const reabrirMatrizEmpresa = (
  empresaId: string | number, matrizId: number, revision: number,
) => cambiarEstadoMatrizEmpresa(empresaId, matrizId, "reabrir", revision);

export async function descartarBorradorMatrizEmpresa(
  empresaId: string | number,
  matrizId: number,
  revision: number,
  motivo: string,
): Promise<BorradorMatrizEmpresa> {
  const response = await api.post<{ data: BorradorMatrizEmpresa }>(
    `/api/admin/empresas/${empresaId}/matrices/${matrizId}/descartar`,
    { revision, motivo: motivo.trim() },
  );
  return response.data.data;
}

export const activarMatrizEmpresa = (
  empresaId: string | number, matrizId: number, revision: number,
) => cambiarEstadoMatrizEmpresa(empresaId, matrizId, "activar", revision);

export async function obtenerMiEmpresa<T>(signal?: AbortSignal): Promise<T> {
  const response = await api.get<{ empresa: T }>("/api/cliente/mi-empresa", { signal });
  if (!response.data?.empresa) {
    throw new Error("La respuesta de la empresa no es válida");
  }
  return response.data.empresa;
}

export async function obtenerDetalleCliente<T>(
  clienteId: string | number,
  signal?: AbortSignal,
): Promise<T> {
  const response = await api.get<T>(`/api/cliente/clientes/${clienteId}`, { signal });
  return response.data;
}

export async function registrarCliente<T>(
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await api.post<T>("/api/cliente/registrar-cliente", payload);
  return response.data;
}

export async function actualizarCliente<T>(
  clienteId: string | number,
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await api.put<T>(`/api/cliente/clientes/${clienteId}`, payload);
  return response.data;
}

export async function obtenerActividadesVulnerables(
  signal?: AbortSignal,
): Promise<ActividadVulnerableGeneral[]> {
  const response = await api.get<{
    actividades_vulnerables: ActividadVulnerableGeneral[];
  }>("/api/catalogos/actividades-vulnerables", { signal });
  if (!Array.isArray(response.data?.actividades_vulnerables)) {
    throw new Error("La respuesta del catálogo de actividades vulnerables no es válida");
  }
  return response.data.actividades_vulnerables;
}

export async function obtenerOperacionesVulnerables(
  actividadClave: string,
  signal?: AbortSignal,
): Promise<OperacionVulnerable[]> {
  const response = await api.get<{
    actividad_clave: string;
    operaciones: OperacionVulnerable[];
  }>("/api/catalogos/operaciones-vulnerables", {
    params: { actividad_clave: actividadClave },
    signal,
  });
  if (
    response.data?.actividad_clave !== actividadClave
    || !Array.isArray(response.data?.operaciones)
  ) {
    throw new Error("La respuesta del catálogo de operaciones vulnerables no es válida");
  }
  return response.data.operaciones;
}

export async function crearPerfilTransaccional(
  clienteId: number,
  payload: PerfilTransaccionalPayload,
) {
  const response = await api.post(
    `/api/cliente/clientes/${clienteId}/perfil-transaccional`,
    payload,
  );
  return response.data;
}

export interface PerfilTransaccionalV1Opcion {
  id: number;
  etiqueta: string;
  orden: number;
}

export interface PerfilTransaccionalV1Criterio {
  id: number;
  codigo: string;
  texto: string;
  orden: number;
  opciones: PerfilTransaccionalV1Opcion[];
}

export interface PerfilTransaccionalV1UltimaEvaluacion {
  id: number;
  numero_version: number;
  puntaje_total: number;
  resultado: {
    id: number;
    nombre: string;
  };
  creada_en: string;
}

export interface PerfilTransaccionalV1Context {
  cliente: {
    id: number;
    empresa_id: number;
    nombre: string;
  };
  matriz: {
    id: number;
    numero_version: number;
    revision: number;
  };
  criterios: PerfilTransaccionalV1Criterio[];
  resultados: Array<{
    id: number;
    nombre: string;
    minimo: number;
    maximo: number;
    orden: number;
  }>;
  ultima_evaluacion: PerfilTransaccionalV1UltimaEvaluacion | null;
}

export interface PerfilTransaccionalV1RespuestaInput {
  criterio_id: number;
  opcion_id: number;
}

export interface PerfilTransaccionalV1Evaluacion {
  id: number;
  cliente_id: number;
  empresa_id: number;
  numero_version: number;
  puntaje_total: number;
  matriz: {
    id: number;
    numero_version: number;
  };
  resultado: {
    id: number;
    nombre: string;
    minimo: number;
    maximo: number;
  };
  respuestas: Array<{
    criterio_id: number;
    criterio_codigo: string;
    criterio_texto: string;
    orden: number;
    opcion_id: number;
    opcion_etiqueta: string;
    puntaje: number;
  }>;
  creada_en: string;
}

export async function obtenerPerfilTransaccionalV1(
  clienteId: number,
  signal?: AbortSignal,
): Promise<PerfilTransaccionalV1Context> {
  const response = await api.get<{ data: PerfilTransaccionalV1Context }>(
    `/api/cliente/clientes/${clienteId}/perfil-transaccional-v1`,
    { signal },
  );
  return response.data.data;
}

export async function crearPerfilTransaccionalV1(
  clienteId: number,
  payload: { respuestas: PerfilTransaccionalV1RespuestaInput[] },
): Promise<PerfilTransaccionalV1Evaluacion> {
  const response = await api.post<{ data: { evaluacion: PerfilTransaccionalV1Evaluacion } }>(
    `/api/cliente/clientes/${clienteId}/perfil-transaccional-v1`,
    payload,
  );
  return response.data.data.evaluacion;
}
