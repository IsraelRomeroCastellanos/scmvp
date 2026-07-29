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
