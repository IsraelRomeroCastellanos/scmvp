export type ActividadVulnerableGeneral = {
  clave: string;
  nombre: string;
  fraccion: string | null;
  descripcion: string | null;
};

export type OperacionVulnerable = {
  clave: string;
  nombre: string;
  descripcion: string | null;
};

export type ConfiguracionPldCliente = {
  estado: 'completa' | 'pendiente';
  actividad: ActividadVulnerableGeneral | null;
  operacion: OperacionVulnerable | null;
  origen_seleccion: 'automatica' | 'manual' | 'regularizacion' | null;
  vigente_desde: string | null;
};

export type MiEmpresaPld = {
  id: number;
  nombre_legal: string;
  actividades_vulnerables: ActividadVulnerableGeneral[];
  configuracion_pld_pendiente: boolean;
  tiene_matriz_publicada_activa: boolean | null;
};

export type EmpresaConActividadesVulnerables = MiEmpresaPld;

export type ContextoPldPerfil = {
  actividad: {
    clave: string;
    nombre: string;
  };
  operacion: {
    clave: string;
    nombre: string;
  };
  origen_seleccion: 'automatica' | 'manual' | 'regularizacion';
  vigente_desde: string;
};

export type PerfilTransaccionalConContexto = {
  contexto_pld: ContextoPldPerfil | null;
  contexto_pld_pendiente: boolean;
};

export type PerfilTransaccionalPayload = {
  tipo_servicio?: string | null;
  actividad_esperada?: string | null;
  monto_mensual_estimado?: number | null;
  frecuencia_operacion?: string | null;
  origen_recursos?: string | null;
  destino_recursos?: string | null;
  instrumentos_pago?: unknown[] | object | null;
};

export type PldSelectionWritePayload = {
  actividad_vulnerable_clave?: string;
  operacion_vulnerable_clave?: string;
};
