// src/lib/types.ts

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    nombre_completo: string;
    email: string;
    rol: string;
    empresa_id?: number | null;
    activo: boolean;
  };
}

export interface UsuariosResponse {
  usuarios: Array<{
    id: number;
    nombre_completo: string;
    email: string;
    rol: string;
    empresa_id?: number | null;
    activo: boolean;
  }>;
}

export interface Usuario {
  id: number;
  nombre_completo: string;
  email: string;
  rol: string;
  empresa_id?: number | null;
  activo: boolean;
}

export interface CargaMasivaResponse {
  success: boolean;
  count?: number;
  message?: string;
}

export interface Cliente {
  id: number;
  nombre_entidad: string;
  tipo_cliente: string;
  actividad_economica: string;
  estado_bien: string;
  alias?: string;
}

export interface ClientesResponse {
  clientes: Cliente[];
}

export interface Empresa {
  id: number;
  nombre_legal: string;
  rfc: string;
  direccion: string;
  activa: boolean;
}

export interface EmpresasResponse {
  empresas: Empresa[];
}