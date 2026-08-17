//frontend/src/app/cliente/registrar-cliente/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  normalizeRole,
  type NormalizedRole,
} from "@/lib/auth";
import { loadCatalogo, type CatalogItem } from "@/lib/catalogos";
import api, {
  getApiErrorMessage,
  isApiRequestCanceled,
  obtenerEmpresasAdmin,
  obtenerMiEmpresa,
  registrarCliente,
} from "@/lib/api";
import PldSelectionFields from "@/components/PldSelectionFields";
import { EmpresaConfirmationModal } from "@/components/EmpresaDomicilioConfirmacion";
import type {
  ActividadVulnerableGeneral,
  MiEmpresaPld,
  OperacionVulnerable,
  PldSelectionWritePayload,
} from "@/types/actividades-vulnerables";

import {
  buildBeneficiariosControladoresContract,
  createRegistrarClienteValidator,
  validateBeneficiariosControladores,
} from "./validate";

export default function ClientPage() {
  type TipoCliente = "persona_fisica" | "persona_moral" | "fideicomiso";

  type Errors = Record<string, string>;
  type EmpresaOption = {
    id: number;
    nombre_legal: string;
    actividades_vulnerables: ActividadVulnerableGeneral[];
    configuracion_pld_pendiente: boolean;
    tiene_matriz_publicada_activa: boolean | null;
  };

  type RecursoTerceroItem = {
    tipo_tercero: string;
    nombre_razon_social: string;
    relacion_con_cliente: string;
    actividad_giro: string;
    nacionalidad: string;
    sin_documentacion: boolean;
    rfc: string;
    curp: string;
    fecha_nacimiento: string;
    observaciones: string;
  };

  type DuenoBeneficiarioItem = {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    fecha_nacimiento: string;
    nacionalidad: string;
    relacion_con_cliente: string;
    rfc: string;
    curp: string;
    porcentaje_participacion: string;
    sin_documentacion: boolean;
    observaciones: string;
  };

  type RelatedTipoEntidad = "persona_fisica" | "persona_moral" | "fideicomiso";

  type RelatedPFData = {
    contacto: Record<string, any>;
    persona: Record<string, any>;
    cargo_publico?: Record<string, any>;
  };

  type RelatedPMData = {
    contacto: Record<string, any>;
    empresa: Record<string, any>;
    representante: Record<string, any>;
  };

  type RelatedFIDData = {
    contacto: Record<string, any>;
    fideicomiso: Record<string, any>;
    representante: Record<string, any>;
  };

  type RelatedRecursoRow = {
    tipo_entidad: RelatedTipoEntidad;
    nombre_entidad: string;
    nacionalidad: string;
    relacion_con_cliente: string;
    sin_documentacion: boolean;
    observaciones: string;
    datos_completos: RelatedPFData | RelatedPMData | RelatedFIDData;
  };

  type BeneficiarioControladorRow = {
    nombre_entidad: string;
    nacionalidad: string;
    relacion_con_cliente: string;
    porcentaje_participacion: string;
    sin_documentacion: boolean;
    observaciones: string;
    datos_completos: RelatedPFData;
  };

  function isNonEmpty(v: any) {
    return typeof v === "string" && v.trim().length > 0;
  }

  function isRFC(v: any) {
    if (!isNonEmpty(v)) return false;
    const s = v.trim().toUpperCase();
    return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(s);
  }

  function isCURP(v: any) {
    if (!isNonEmpty(v)) return false;
    const s = v.trim().toUpperCase();
    return /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(s);
  }

  function isYYYYMMDD(v: any) {
    if (!isNonEmpty(v)) return false;
    const s = v.trim();
    if (!/^\d{8}$/.test(s)) return false;
    const y = Number(s.slice(0, 4));
    const m = Number(s.slice(4, 6));
    const d = Number(s.slice(6, 8));
    if (y < 1900 || y > 2100) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return (
      dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === m - 1 &&
      dt.getUTCDate() === d
    );
  }

  /**
   * Acepta:
   * - "YYYYMMDD" -> regresa igual
   * - "YYYY-MM-DD" -> regresa "YYYYMMDD"
   * - otros -> regresa null
   */
  function normalizeToYYYYMMDD(input: string): string | null {
    const s = (input ?? "").trim();
    if (!s) return null;
    if (/^\d{8}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.replaceAll("-", "");
    return null;
  }

  function toDateInputValue(input: any): string {
    const value = String(input ?? "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (/^\d{8}$/.test(value)) {
      return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
    }
    return value;
  }

  function isEmail(v: any) {
    if (!isNonEmpty(v)) return false;
    const s = v.trim();
    // Simple y suficiente para gate FE
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  }

  function isPhoneCountryCode(v: any) {
    if (!isNonEmpty(v)) return false;
    const s = v.trim();
    // +52, +1, +502, etc.
    return /^\+\d{1,4}$/.test(s);
  }

  function isPhoneNumber(v: any) {
    if (!isNonEmpty(v)) return false;
    const s = v.trim();
    // dígitos 7 a 15 (E.164 sin el +)
    return /^\d{7,15}$/.test(s);
  }

  function isExt(v: any) {
    if (!isNonEmpty(v)) return true; // opcional
    const s = v.trim();
    return /^\d{1,6}$/.test(s);
  }

  function fmtItem(i: CatalogItem) {
    return `${i.descripcion} (${i.clave})`;
  }


const MEXICO_CATALOGO_KEY = 'MX';
const MEXICO_CATALOGO_KEY_LEGACY = 'mexico-mx';

type TipoNacionalidad = '' | 'nacional' | 'extranjero';

function isMexicoKey(value: string) {
  const v = (value ?? '').trim().toLowerCase();
  return (
    v === MEXICO_CATALOGO_KEY.toLowerCase() ||
    v === MEXICO_CATALOGO_KEY_LEGACY ||
    v === 'mex'
  );
}

function normalizeCodigoPostalMx(value: string) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 5);
}

function inferNacionalExtranjero(value: string): TipoNacionalidad {
  const v = (value ?? '').trim();
  if (!v) return '';
  return isMexicoKey(v) ? 'nacional' : 'extranjero';
}

function valueToCatalogKey(v: string) {
    return isMexicoKey(v) ? MEXICO_CATALOGO_KEY : v;
  }

  function SearchableSelect({
    label,
    required,
    value,
    items,
    placeholder,
    error,
    onChange,
    onBlur,
  }: {
    label: string;
    required?: boolean;
    value: string;
    items: CatalogItem[];
    placeholder?: string;
    error?: string;
    onChange: (v: string) => void;
    onBlur?: () => void;
  }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");

    const filtered = useMemo(() => {
      const s = q.trim().toLowerCase();
      if (!s) return items.slice(0, 50);
      return items
        .filter((it) => {
          const a = it.descripcion.toLowerCase();
          const b = it.clave.toLowerCase();
          return a.includes(s) || b.includes(s);
        })
        .slice(0, 50);
    }, [q, items]);

    const selectedLabel = useMemo(() => {
      const found = items.find((x) => x.clave === value);
      return found ? fmtItem(found) : "";
    }, [items, value]);

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium">
            {label} {required ? <span className="text-red-600">*</span> : null}
          </label>
        </div>

        <div className="relative">
          <input
            className={`w-full rounded border px-3 py-2 text-sm ${error ? "border-red-500" : "border-gray-300"}`}
            placeholder={placeholder ?? "Buscar..."}
            value={open ? q : selectedLabel}
            onFocus={() => {
              setOpen(true);
              setQ("");
            }}
            onChange={(e) => {
              setOpen(true);
              setQ(e.target.value);
            }}
            onBlur={() => {
              // da chance a click en opción
              setTimeout(() => setOpen(false), 120);
              onBlur?.();
            }}
          />

          {open && (
            <div className="absolute z-20 mt-1 w-full rounded border border-gray-200 bg-white shadow">
              <div className="max-h-64 overflow-auto">
                {filtered.map((it) => (
                  <button
                    key={it.clave}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(it.clave);
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    {fmtItem(it)}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    Sin resultados
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  const AVISO_LEGAL =
    "DE CONFORMIDAD CON LO DISPUESTO EN LA LEY FEDERAL PARA LA PREVENCIÓN E IDENTIFICACIÓN DE OPERACIONES CON RECURSOS DE PROCEDENCIA ILÍCITA; SOLICITAMOS QUE PROPORCIONE LA SIGUIENTE INFORMACIÓN:";

  function buildTelefonoE164Like(cc: string, num: string, ext?: string) {
    const a = (cc ?? "").trim();
    const b = (num ?? "").trim();
    const e = (ext ?? "").trim();
    if (!a || !b) return "";
    return e ? `${a} ${b} ext ${e}` : `${a} ${b}`;
  }
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [pfConfirmationOpen, setPfConfirmationOpen] = useState(false);
  const [successClient, setSuccessClient] = useState<{
    id: number;
    tipo: "persona_fisica" | "persona_moral";
  } | null>(null);
  const registrationLockRef = useRef(false);

  const [tipo, setTipo] = useState<TipoCliente>("persona_fisica");

  const tipoRef = useRef<HTMLSelectElement | null>(null);
  // catálogos
  const [paises, setPaises] = useState<CatalogItem[]>([]);
  const [actividades, setActividades] = useState<CatalogItem[]>([]);
  const [giros, setGiros] = useState<CatalogItem[]>([]);

  // form base
  const [empresaId, setEmpresaId] = useState("");
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [empresaLoading, setEmpresaLoading] = useState(true);
  const [empresaError, setEmpresaError] = useState("");
  const [sessionRole, setSessionRole] = useState<NormalizedRole | null>(null);
  const [empresaActividades, setEmpresaActividades] = useState<ActividadVulnerableGeneral[]>([]);
  const [tieneMatrizPublicadaActiva, setTieneMatrizPublicadaActiva] = useState<boolean | null>(null);
  const [actividadVulnerableClave, setActividadVulnerableClave] = useState("");
  const [operacionVulnerableClave, setOperacionVulnerableClave] = useState("");
  const [operacionesVulnerables, setOperacionesVulnerables] = useState<OperacionVulnerable[]>([]);
  const [pldSelectionError, setPldSelectionError] = useState("");
  const [nombreEntidad, setNombreEntidad] = useState("");
  const [pmRazonSocial, setPmRazonSocial] = useState("");
  const [nacionalidad, setNacionalidad] = useState(""); // clave catálogo
  const [contactoPais, setContactoPais] = useState(""); // clave catálogo

  const [tipoNacionalidad, setTipoNacionalidad] = useState<TipoNacionalidad>("");
  const [a2Errors, setA2Errors] = useState<Record<string, string>>({});

  const contactoPaisLabel =
    tipo === "persona_fisica" ? "País de nacimiento" : "País de constitución";

  function handleTipoNacionalidadChange(next: TipoNacionalidad) {
    setTipoNacionalidad(next);
    setA2Errors({});

    if (next === "nacional") {
      setNacionalidad(MEXICO_CATALOGO_KEY);
      setTelCodigoPais("+52");
    } else {
      setNacionalidad("");
      setTelCodigoPais("");
    }
  }

  function validateA2Nacionalidad() {
    const next: Record<string, string> = {};

    if (!tipoNacionalidad) {
      next.tipoNacionalidad = "Tipo de nacionalidad es obligatorio";
    }

    if (tipoNacionalidad === "nacional") {
      if (!isMexicoKey(nacionalidad)) {
        next.nacionalidad = "Para nacional, la nacionalidad debe ser México";
      }
    }

    if (tipoNacionalidad === "extranjero") {
      if (!nacionalidad.trim()) {
        next.nacionalidad = "Nacionalidad es obligatoria";
      } else if (isMexicoKey(nacionalidad)) {
        next.nacionalidad = "Para extranjero, la nacionalidad no puede ser México";
      }
    }

    if (!contactoPais.trim()) {
      next["contacto.pais"] = `${contactoPaisLabel} es obligatorio`;
    }

    setA2Errors(next);
    return Object.keys(next).length === 0;
  }

  // contacto (iteración 1)
  const [email, setEmail] = useState("");
  const [telCodigoPais, setTelCodigoPais] = useState("");
  const [telNumero, setTelNumero] = useState("");
  const [telExt, setTelExt] = useState("");

  // domicilio (contacto) - México (captura manual por ahora)
  const [domCalle, setDomCalle] = useState("");
  const [domNumero, setDomNumero] = useState("");
  const [domInterior, setDomInterior] = useState("");
  const [domColonia, setDomColonia] = useState("");
  const [domMunicipio, setDomMunicipio] = useState("");
  const [domCiudadDelegacion, setDomCiudadDelegacion] = useState("");
  const [domCP, setDomCP] = useState("");
  const [domEstado, setDomEstado] = useState("");
  const [domPais, setDomPais] = useState("");

  const [domColoniasOpciones, setDomColoniasOpciones] = useState<string[]>([]);
  const [domCpAviso, setDomCpAviso] = useState("");
  const [domCpLoading, setDomCpLoading] = useState(false);
  const [domCatalogoTerritorial, setDomCatalogoTerritorial] = useState({
    municipio: false,
    ciudad_delegacion: false,
    estado: false,
  });
  const [b1Errors, setB1Errors] = useState<Record<string, string>>({});
  const domCpRequestRef = useRef<AbortController | null>(null);
  const beneficiarioCpRequestsRef = useRef<Record<number, AbortController>>({});
  const [beneficiarioCpLoading, setBeneficiarioCpLoading] = useState<Record<number, boolean>>({});
  const [beneficiarioCatalogoTerritorial, setBeneficiarioCatalogoTerritorial] =
    useState<
      Record<
        number,
        { municipio: boolean; ciudad_delegacion: boolean; estado: boolean }
      >
    >({});

  const aplicaCpMexico = isMexicoKey(domPais);

  useEffect(() => {
    domCpRequestRef.current?.abort();
    setDomCatalogoTerritorial({
      municipio: false,
      ciudad_delegacion: false,
      estado: false,
    });
    setB1Errors({});

    if (!aplicaCpMexico) {
      setDomColoniasOpciones([]);
      setDomCpAviso("");
      setDomCpLoading(false);
      return;
    }

    const cp = normalizeCodigoPostalMx(domCP);

    if (!cp) {
      setDomColoniasOpciones([]);
      setDomCpAviso("");
      return;
    }

    if (cp.length !== 5) {
      setDomColoniasOpciones([]);
      setDomCpAviso("Para México, el código postal debe tener 5 dígitos.");
      return;
    }

    const controller = new AbortController();
    domCpRequestRef.current = controller;
    setDomCpLoading(true);
    setDomCpAviso("Consultando código postal…");

    api
      .get("/api/catalogos/codigos-postales", {
        params: { cp },
        signal: controller.signal,
      })
      .then((response) => {
        const resultados = Array.isArray(response.data?.resultados)
          ? response.data.resultados
          : [];
        if (resultados.length === 0) {
          setDomColoniasOpciones([]);
          setDomCpAviso("Código postal no encontrado; captura manual habilitada.");
          return;
        }
        const first = resultados[0];
        const estado = String(first.estado ?? "").trim();
        const municipio = String(first.municipio ?? "").trim();
        const ciudadDelegacion = String(
          first.ciudad ?? first.ciudad_delegacion ?? "",
        ).trim();
        setDomEstado(estado);
        setDomMunicipio(municipio);
        setDomCiudadDelegacion(ciudadDelegacion);
        setDomCatalogoTerritorial({
          municipio: Boolean(municipio),
          ciudad_delegacion: Boolean(ciudadDelegacion),
          estado: Boolean(estado),
        });
        const colonias = Array.from(
          new Set(resultados.map((item: any) => String(item.colonia ?? "").trim()).filter(Boolean)),
        ) as string[];
        setDomColoniasOpciones(colonias);
        setDomColonia((previous) =>
          colonias.length === 1 ? colonias[0] : colonias.includes(previous) ? previous : "",
        );
        setDomCpAviso("");
      })
      .catch((error) => {
        if (error?.code === "ERR_CANCELED") return;
        const status = error?.response?.status;
        const messages: Record<number, string> = {
          400: "El código postal debe tener exactamente 5 dígitos.",
          401: "La sesión expiró; inicia sesión para consultar el código postal.",
          404: "Código postal no encontrado; captura manual habilitada.",
          500: "El catálogo de códigos postales no está disponible.",
        };
        setDomColoniasOpciones([]);
        setDomCpAviso(
          error?.response?.data?.error ||
          messages[status] ||
          "No se pudo consultar el código postal.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setDomCpLoading(false);
      });

    return () => controller.abort();
  }, [domCP, aplicaCpMexico]);

  function handleDomCPChange(value: string) {
    const next = aplicaCpMexico ? normalizeCodigoPostalMx(value) : value;
    setDomCP(next);
  }

  function handleDomPaisChange(value: string) {
    setDomPais(value);
    setDomCP("");
    setDomColoniasOpciones([]);
    setDomCpAviso("");

    if (tipo !== "persona_fisica") return;

    domCpRequestRef.current?.abort();
    setDomCpLoading(false);
    setDomCatalogoTerritorial({
      municipio: false,
      ciudad_delegacion: false,
      estado: false,
    });
    setDomColonia("");
    setDomMunicipio("");
    setDomCiudadDelegacion("");
    setDomEstado("");
    setB1Errors({});
  }

  function validateB1Domicilio() {
    const next: Record<string, string> = {};

    if (aplicaCpMexico) {
      const cp = normalizeCodigoPostalMx(domCP);

      if (cp.length !== 5) {
        next["contacto.domicilio.codigo_postal"] = "Para México, el código postal debe tener 5 dígitos";
      }

      if (domColoniasOpciones.length > 1 && !domColonia.trim()) {
        next["contacto.domicilio.colonia"] = "Selecciona una colonia";
      }
    }

    setB1Errors(next);
    return Object.keys(next).length === 0;
  }


  // PF
  const [pfNombres, setPfNombres] = useState("");
  const [pfApPat, setPfApPat] = useState("");
  const [pfApMat, setPfApMat] = useState("");
  const [pfActividad, setPfActividad] = useState(""); // clave
  const [pfRfc, setPfRfc] = useState("");
  const [pfCurp, setPfCurp] = useState("");
  const [pfFechaNac, setPfFechaNac] = useState(""); // acepta YYYY-MM-DD o AAAAMMDD

  // PF Identificación (iteración 1)
  const [pfIdTipo, setPfIdTipo] = useState("");
  const [pfIdAutoridad, setPfIdAutoridad] = useState("");
  const [pfIdNumero, setPfIdNumero] = useState("");
  const [pfIdExpedicion, setPfIdExpedicion] = useState(""); // YYYY-MM-DD o AAAAMMDD
  const [pfIdExpiracion, setPfIdExpiracion] = useState(""); // YYYY-MM-DD o AAAAMMDD
  const [pfIdSinVigencia, setPfIdSinVigencia] = useState(false);

  // PF PEP / cargo público
  const [pfCargoPublicoActual, setPfCargoPublicoActual] = useState(""); // 'si' | 'no'
  const [pfCargoPublicoPrevio, setPfCargoPublicoPrevio] = useState(""); // 'si' | 'no'
  const [pfCargoPublicoFamiliar, setPfCargoPublicoFamiliar] = useState(""); // 'si' | 'no'
  const [pfPaisNacimiento, setPfPaisNacimiento] = useState("");
  const [pfResidencia, setPfResidencia] = useState(""); // Temporal | Permanente (key/string)
  const [pfNacionalExtranjero, setPfNacionalExtranjero] = useState(""); // Nacional | Extranjero (key/string)

  // PM
  const [recursosTercerosAplica, setRecursosTercerosAplica] = useState(false);
  const [recursosTerceros, setRecursosTerceros] = useState<RecursoTerceroItem[]>([]);
  const [pmRfc, setPmRfc] = useState("");
  const [pmRegimenCapital, setPmRegimenCapital] = useState("");
  const [pmFechaConst, setPmFechaConst] = useState(""); // YYYY-MM-DD o AAAAMMDD
  const [pmGiro, setPmGiro] = useState(""); // clave
  const [pmRepNombreCompleto, setPmRepNombreCompleto] = useState("");
  const [pmRepNombres, setPmRepNombres] = useState("");
  const [pmRepApPat, setPmRepApPat] = useState("");
  const [pmRepApMat, setPmRepApMat] = useState("");
  const [pmRepFechaNac, setPmRepFechaNac] = useState(""); // YYYY-MM-DD o AAAAMMDD
  const [pmRepNacionalidad, setPmRepNacionalidad] = useState(""); // clave catálogo
  const [pmRepRegimenEstancia, setPmRepRegimenEstancia] = useState(""); // opcional
  const [pmRepCurp, setPmRepCurp] = useState("");
  const [pmRepRfc, setPmRepRfc] = useState("");
  const [pmSubtipoPm, setPmSubtipoPm] = useState(""); // key
  const [pmRsiSubtipo, setPmRsiSubtipo] = useState(""); // key
  const [pmBeneficiarioControlador, setPmBeneficiarioControlador] = useState("si"); // "si" fijo en PM
  const [pmRepTelCasa, setPmRepTelCasa] = useState("");
  const [pmRepCelular, setPmRepCelular] = useState("");

  // PM Domicilio representante (México)
  const [pmRepDomCalle, setPmRepDomCalle] = useState("");
  const [pmRepDomNumero, setPmRepDomNumero] = useState("");
  const [pmRepDomInterior, setPmRepDomInterior] = useState("");
  const [pmRepDomColonia, setPmRepDomColonia] = useState("");
  const [pmRepDomMunicipio, setPmRepDomMunicipio] = useState("");
  const [pmRepDomCiudadDelegacion, setPmRepDomCiudadDelegacion] = useState("");
  const [pmRepDomCP, setPmRepDomCP] = useState("");
  const [pmRepDomEstado, setPmRepDomEstado] = useState("");
  const [pmRepDomPais] = useState("MEX");
  const [pmRepDomColoniasOpciones, setPmRepDomColoniasOpciones] = useState<string[]>([]);
  const [pmRepDomCpAviso, setPmRepDomCpAviso] = useState("");
  const [pmRepDomCpLoading, setPmRepDomCpLoading] = useState(false);
  const [pmRepDomCatalogoTerritorial, setPmRepDomCatalogoTerritorial] = useState({
    municipio: false,
    ciudad_delegacion: false,
    estado: false,
  });
  const pmRepDomCpRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    pmRepDomCpRequestRef.current?.abort();
    setPmRepDomCatalogoTerritorial({
      municipio: false,
      ciudad_delegacion: false,
      estado: false,
    });

    const cp = normalizeCodigoPostalMx(pmRepDomCP);

    if (cp.length !== 5) {
      setPmRepDomColoniasOpciones([]);
      setPmRepDomCpAviso("");
      setPmRepDomCpLoading(false);
      return;
    }

    const controller = new AbortController();
    pmRepDomCpRequestRef.current = controller;
    setPmRepDomCpLoading(true);
    setPmRepDomCpAviso("Consultando código postal…");

    api
      .get("/api/catalogos/codigos-postales", {
        params: { cp },
        signal: controller.signal,
      })
      .then((response) => {
        const resultados = Array.isArray(response.data?.resultados)
          ? response.data.resultados
          : [];
        if (resultados.length === 0) {
          setPmRepDomColonia("");
          setPmRepDomMunicipio("");
          setPmRepDomCiudadDelegacion("");
          setPmRepDomEstado("");
          setPmRepDomColoniasOpciones([]);
          setPmRepDomCpAviso("Código postal no encontrado; captura manual habilitada.");
          return;
        }

        const first = resultados[0];
        const estado = String(first.estado ?? "").trim();
        const municipio = String(first.municipio ?? "").trim();
        const ciudadDelegacion = String(
          first.ciudad ?? first.ciudad_delegacion ?? "",
        ).trim();
        setPmRepDomEstado(estado);
        setPmRepDomMunicipio(municipio);
        setPmRepDomCiudadDelegacion(ciudadDelegacion);
        setPmRepDomCatalogoTerritorial({
          municipio: Boolean(municipio),
          ciudad_delegacion: Boolean(ciudadDelegacion),
          estado: Boolean(estado),
        });
        const colonias = Array.from(
          new Set(
            resultados
              .map((item: any) => String(item.colonia ?? "").trim())
              .filter(Boolean),
          ),
        ) as string[];
        setPmRepDomColoniasOpciones(colonias);
        setPmRepDomColonia((previous) =>
          colonias.length === 1
            ? colonias[0]
            : colonias.includes(previous)
              ? previous
              : "",
        );
        setPmRepDomCpAviso("");
      })
      .catch((error) => {
        if (error?.code === "ERR_CANCELED") return;
        const status = error?.response?.status;
        const messages: Record<number, string> = {
          400: "El código postal debe tener exactamente 5 dígitos.",
          401: "La sesión expiró; inicia sesión para consultar el código postal.",
          404: "Código postal no encontrado; captura manual habilitada.",
          500: "El catálogo de códigos postales no está disponible.",
        };
        setPmRepDomColonia("");
        setPmRepDomMunicipio("");
        setPmRepDomCiudadDelegacion("");
        setPmRepDomEstado("");
        setPmRepDomColoniasOpciones([]);
        setPmRepDomCpAviso(
          error?.response?.data?.error ||
            messages[status] ||
            "No se pudo consultar el código postal.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPmRepDomCpLoading(false);
      });

    return () => controller.abort();
  }, [pmRepDomCP]);

  // PM Beneficiario Controlador (CFF 32-B Ter)
  const [pmBcNombres, setPmBcNombres] = useState("");
  const [pmBcApPat, setPmBcApPat] = useState("");
  const [pmBcApMat, setPmBcApMat] = useState("");

  const [duenosBeneficiariosAplica, setDuenosBeneficiariosAplica] = useState(false);
  const [duenosBeneficiarios, setDuenosBeneficiarios] = useState<DuenoBeneficiarioItem[]>([]);

  const [relatedRecursosAplica, setRelatedRecursosAplica] = useState(false);
  const [relatedRecursos, setRelatedRecursos] = useState<RelatedRecursoRow[]>([]);
  const [beneficiariosControladoresAplica, setBeneficiariosControladoresAplica] = useState(false);
  const [beneficiariosControladores, setBeneficiariosControladores] = useState<BeneficiarioControladorRow[]>([]);

  function clearBeneficiariosControladoresErrors() {
    setErrors((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(
          ([key]) => !key.startsWith("beneficiarios_controladores"),
        ),
      ),
    );
  }

  function handleTipoClienteChange(nextTipo: TipoCliente) {
    setTipo(nextTipo);
    setErrors({});
    setFatal(null);

    if (nextTipo === "persona_fisica") {
      setBeneficiariosControladoresAplica(false);
      setBeneficiariosControladores([]);
      return;
    }

    setBeneficiariosControladoresAplica(true);
    setBeneficiariosControladores([createEmptyBeneficiarioControlador()]);
  }

  function validateBeneficiariosControladoresBeforeSubmit(): boolean {
    const aplica =
      tipo === "persona_fisica" ? beneficiariosControladoresAplica : true;
    const result = validateBeneficiariosControladores({
      tipoCliente: tipo,
      aplica,
      beneficiarios: aplica ? buildBeneficiariosControladoresPayload() : [],
      clientePfRfc: pfRfc,
      clientePfCurp: pfCurp,
    });

    clearBeneficiariosControladoresErrors();

    if (result.ok) return true;

    setErrors((prev) => ({ ...prev, ...result.errors }));
    setFatal("Completa la sección de Beneficiario Controlador para continuar.");
    return false;
  }

  // PM: representante legal accionista
  const [pmRepEsAccionista, setPmRepEsAccionista] = useState(false);
  const [pmAccPct, setPmAccPct] = useState("");
  const [pmAccRelacion, setPmAccRelacion] = useState("");

  function setPmAccionistaError(key: string, message?: string) {
    setErrors((prev) => {
      const next = { ...prev };

      if (message) {
        next[key] = message;
      } else {
        delete next[key];
      }

      return next;
    });
  }

  function validatePmAccionistaPorcentaje(): boolean {
    if (!pmRepEsAccionista) {
      setPmAccionistaError("accionista.porcentaje");
      return true;
    }

    const raw = pmAccPct.trim();

    if (!raw) {
      setPmAccionistaError(
        "accionista.porcentaje",
        "El porcentaje accionario del representante es obligatorio",
      );
      return false;
    }

    const porcentaje = Number(raw.replace(",", "."));

    if (!Number.isFinite(porcentaje)) {
      setPmAccionistaError(
        "accionista.porcentaje",
        "El porcentaje accionario debe ser un número válido",
      );
      return false;
    }

    if (porcentaje <= 0) {
      setPmAccionistaError(
        "accionista.porcentaje",
        "El porcentaje accionario debe ser mayor que 0",
      );
      return false;
    }

    if (porcentaje > 100) {
      setPmAccionistaError(
        "accionista.porcentaje",
        "El porcentaje accionario debe ser menor o igual a 100",
      );
      return false;
    }

    setPmAccionistaError("accionista.porcentaje");
    return true;
  }

  function validatePmAccionistaRelacion(): boolean {
    if (!pmRepEsAccionista) {
      setPmAccionistaError("accionista.relacion");
      return true;
    }

    if (!pmAccRelacion.trim()) {
      setPmAccionistaError(
        "accionista.relacion",
        "La relación del representante con la sociedad es obligatoria",
      );
      return false;
    }

    setPmAccionistaError("accionista.relacion");
    return true;
  }

  function validatePmAccionistaFields(): boolean {
    if (tipo !== "persona_moral" || !pmRepEsAccionista) {
      setPmAccionistaError("accionista.porcentaje");
      setPmAccionistaError("accionista.relacion");
      return true;
    }

    const porcentajeOk = validatePmAccionistaPorcentaje();
    const relacionOk = validatePmAccionistaRelacion();

    return porcentajeOk && relacionOk;
  }
  const [fidIdentificador, setFidIdentificador] = useState("");
  const [fidDenominacionFiduciario, setFidDenominacionFiduciario] = useState("");
  const [fidRfcFiduciario, setFidRfcFiduciario] = useState("");
  const [fidNombre, setFidNombre] = useState("");
  const [fidRepNombreCompleto, setFidRepNombreCompleto] = useState("");
  const [fidRepRfc, setFidRepRfc] = useState("");
  const [fidRepCurp, setFidRepCurp] = useState("");
  const [fidRepFechaNac, setFidRepFechaNac] = useState("");
  const [fidRepIdTipo, setFidRepIdTipo] = useState("");
  const [fidRepIdAutoridad, setFidRepIdAutoridad] = useState("");
  const [fidRepIdNumero, setFidRepIdNumero] = useState("");
  const [fidRepIdExpedicion, setFidRepIdExpedicion] = useState("");
  const [fidRepIdExpiracion, setFidRepIdExpiracion] = useState("");


  // PM Identificación representante (iteración 1)
  const [pmRepIdTipo, setPmRepIdTipo] = useState("");
  const [pmRepIdAutoridad, setPmRepIdAutoridad] = useState("");
  const [pmRepIdNumero, setPmRepIdNumero] = useState("");
  const [pmRepIdExpedicion, setPmRepIdExpedicion] = useState("");
  const [pmRepIdExpiracion, setPmRepIdExpiracion] = useState("");

  const validator = createRegistrarClienteValidator({
    tipoCliente: tipo,
    values: {
      tipoCliente: tipo,
      nombreEntidad,
      nacionalidad,
      contactoPais,
      contactoEmail: email,
      tipoNacionalidad,
      empresa_id: empresaId,
      "contacto.pais": contactoPais,
      "contacto.email": email,
      "contacto.telefono.codigo_pais": telCodigoPais,
      "contacto.telefono.numero": telNumero,
      "contacto.telefono.ext": telExt,
      "contacto.domicilio.calle": domCalle,
      "contacto.domicilio.numero": domNumero,
      "contacto.domicilio.colonia": domColonia,
      "contacto.domicilio.municipio": domMunicipio,
      "contacto.domicilio.ciudad_delegacion": domCiudadDelegacion,
      "contacto.domicilio.codigo_postal": domCP,
      "contacto.domicilio.estado": domEstado,
      "contacto.domicilio.pais": domPais,
      "persona.rfc": pfRfc,
      "persona.curp": pfCurp,
      "persona.fecha_nacimiento": pfFechaNac,
      "persona.nombres": pfNombres,
      "persona.apellido_paterno": pfApPat,
      "persona.apellido_materno": pfApMat,
      "persona.actividad_economica": pfActividad,
      "persona.residencia": pfResidencia,
      "persona.identificacion.tipo": pfIdTipo,
      "persona.identificacion.autoridad": pfIdAutoridad,
      "persona.identificacion.numero": pfIdNumero,
      "persona.identificacion.expedicion": pfIdExpedicion,
      "persona.identificacion.expiracion": pfIdExpiracion,
      pfIdSinVigencia,
      "persona.cargo_publico.actual": pfCargoPublicoActual,
      "persona.cargo_publico.previo": pfCargoPublicoPrevio,
      "persona.cargo_publico.familiar": pfCargoPublicoFamiliar,
    },
    setErrors,
    isEmailValid: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    helpers: {
      // TODO opcional: pasa helpers que validate.ts use (rfc/curp/fecha/etc.)
    },
  });
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const controller = new AbortController();
    let active = true;

    (async () => {
      let empresaResolved = false;

      try {
        setFatal(null);
        setEmpresaError("");
        setEmpresaId("");
        setEmpresaNombre("");
        setTieneMatrizPublicadaActiva(null);
        setEmpresas([]);
        setEmpresaLoading(true);

        const storedUser = getCurrentUser();
        const role = normalizeRole(storedUser?.rol ?? storedUser?.role);

        if (!role) {
          throw new Error("La sesión no contiene un rol válido");
        }

        setSessionRole(role);

        if (role === "cliente") {
          const sessionEmpresaId = Number(storedUser?.empresa_id);
          if (!Number.isInteger(sessionEmpresaId) || sessionEmpresaId < 1) {
            throw new Error("Usuario sin empresa asignada");
          }

          const empresa = await obtenerMiEmpresa<MiEmpresaPld>(
            controller.signal,
          );
          if (!active) return;
          const id = Number(empresa?.id);
          const nombreLegal = String(empresa?.nombre_legal ?? "").trim();

          if (!Number.isInteger(id) || id < 1 || !nombreLegal) {
            throw new Error("La respuesta de la empresa no es válida");
          }

          setEmpresaId(String(id));
          setEmpresaNombre(nombreLegal);
          const actividadesEmpresa = Array.isArray(empresa?.actividades_vulnerables)
            ? empresa.actividades_vulnerables
            : [];
          const indicadorMatriz = empresa?.tiene_matriz_publicada_activa === true
            ? true
            : empresa?.tiene_matriz_publicada_activa === false
              ? false
              : null;
          setEmpresaActividades(actividadesEmpresa);
          setTieneMatrizPublicadaActiva(indicadorMatriz);
          if (indicadorMatriz === false) {
            setFatal("No es posible registrar clientes para esta empresa porque aún no cuenta con una matriz PT/GR publicada y activa.");
          }
          setActividadVulnerableClave(
            actividadesEmpresa.length === 1 ? actividadesEmpresa[0].clave : "",
          );
          setOperacionVulnerableClave("");
        } else {
          const empresasData = await obtenerEmpresasAdmin<EmpresaOption>(
            controller.signal,
          );
          if (!active) return;
          const empresasApi: EmpresaOption[] = empresasData
            .map((empresa) => ({
              id: Number(empresa?.id),
              nombre_legal: String(empresa?.nombre_legal ?? "").trim(),
              actividades_vulnerables: Array.isArray(empresa?.actividades_vulnerables)
                ? empresa.actividades_vulnerables
                : [],
              configuracion_pld_pendiente:
                empresa?.configuracion_pld_pendiente === true,
              tiene_matriz_publicada_activa:
                empresa?.tiene_matriz_publicada_activa === true
                  ? true
                  : empresa?.tiene_matriz_publicada_activa === false
                    ? false
                    : null,
            }))
            .filter(
              (empresa: EmpresaOption) =>
                Number.isInteger(empresa.id) &&
                empresa.id > 0 &&
                Boolean(empresa.nombre_legal),
            );

          setEmpresas(empresasApi);
        }
        empresaResolved = true;

        const paisesData = (
          await api.get<{ paises: Array<{ id?: string | number; clave?: unknown; descripcion?: unknown }> }>(
            "/api/catalogos/paises",
            { signal: controller.signal },
          )
        ).data;
        if (!Array.isArray(paisesData?.paises)) {
          throw new Error("La respuesta del catálogo de países no es válida");
        }

        const paisesApi: CatalogItem[] = paisesData.paises
          .map((item) => ({
            id: item?.id,
            clave: String(item?.clave ?? "").trim(),
            descripcion: String(item?.descripcion ?? "").trim(),
          }))
          .filter((item: CatalogItem) => item.clave && item.descripcion);

        const actividadesData = (
          await api.get<{
            actividades_economicas: Array<{
              id?: string | number;
              clave?: unknown;
              descripcion?: unknown;
            }>;
          }>("/api/catalogos/actividades-economicas", {
            signal: controller.signal,
          })
        ).data;
        if (!Array.isArray(actividadesData?.actividades_economicas)) {
          throw new Error(
            "La respuesta del catálogo de actividades económicas no es válida",
          );
        }

        const actividadesApi: CatalogItem[] = actividadesData.actividades_economicas
          .map((item) => ({
            id: item?.id,
            clave: String(item?.clave ?? "").trim(),
            descripcion: String(item?.descripcion ?? "").trim(),
          }))
          .filter((item: CatalogItem) => item.clave && item.descripcion);

        const [p, a, g] = await Promise.all([
          Promise.resolve(paisesApi),
          Promise.resolve(actividadesApi),
          loadCatalogo("internos/giro_mercantil"),
        ]);
        if (!active) return;
        setPaises(p);
        setActividades(a);
        setGiros(g);
      } catch (requestError) {
        if (!active || isApiRequestCanceled(requestError)) return;
        const message = getApiErrorMessage(
          requestError,
          "No se pudieron cargar los datos del formulario",
        );
        if (!empresaResolved) {
          setEmpresaId("");
          setEmpresaNombre("");
          setEmpresaError(message);
        }
        setFatal(message);
      } finally {
        if (active) setEmpresaLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [router]);

  function setErr(path: string, msg?: string) {
    setErrors((prev) => {
      const next = { ...prev };
      if (!msg) delete next[path];
      else next[path] = msg;
      return next;
    });
  }


  function createEmptyRelatedPFData(): RelatedPFData {
    return {
      contacto: {
        pais: "MEX",
        email: "",
        telefono: "",
        telefono_detalle: {
          codigo_pais: "",
          numero: "",
          ext: "",
        },
        domicilio: {
          calle: "",
          numero: "",
          interior: "",
          colonia: "",
          municipio: "",
          ciudad_delegacion: "",
          codigo_postal: "",
          estado: "",
          pais: "MEX",
        },
      },
      persona: {
        tipo_nacionalidad: "",
        nacional_extranjero: "",
        nacionalidad: "",
        pais_nacimiento: "",
        nombres: "",
        apellido_paterno: "",
        apellido_materno: "",
        fecha_nacimiento: "",
        rfc: "",
        curp: "",
        actividad_economica: "",
        residencia: "",
        identificacion: {
          tipo: "",
          autoridad: "",
          numero: "",
          fecha_expedicion: "",
          fecha_expiracion: "",
          sin_vigencia: false,
        },
      },
      cargo_publico: {
        actual: "",
        previo: "",
        familiar: "",
      },
    };
  }

  function createEmptyRelatedPMData(): RelatedPMData {
    return {
      contacto: {
        pais: "MEX",
        email: "",
        telefono: "",
        domicilio: {
          calle: "",
          numero: "",
          colonia: "",
          municipio: "",
          ciudad_delegacion: "",
          codigo_postal: "",
          estado: "",
          pais: "MEX",
        },
      },
      empresa: {
        rfc: "",
        fecha_constitucion: "",
        giro_mercantil: "",
      },
      representante: {
        nombres: "",
        apellido_paterno: "",
        apellido_materno: "",
        fecha_nacimiento: "",
        rfc: "",
        curp: "",
      },
    };
  }

  function createEmptyRelatedFIDData(): RelatedFIDData {
    return {
      contacto: {
        pais: "MEX",
        email: "",
        telefono: "",
        domicilio: {
          calle: "",
          numero: "",
          colonia: "",
          municipio: "",
          ciudad_delegacion: "",
          codigo_postal: "",
          estado: "",
          pais: "MEX",
        },
      },
      fideicomiso: {},
      representante: {
        nombres: "",
        apellido_paterno: "",
        apellido_materno: "",
        fecha_nacimiento: "",
        rfc: "",
        curp: "",
      },
    };
  }

  function deriveRelatedNombreEntidad(
    tipo_entidad: RelatedTipoEntidad,
    datos_completos: RelatedPFData | RelatedPMData | RelatedFIDData,
  ): string {
    if (tipo_entidad === "persona_fisica") {
      const pf = datos_completos as RelatedPFData;
      return [
        pf.persona?.nombres,
        pf.persona?.apellido_paterno,
        pf.persona?.apellido_materno,
      ]
        .map((v) => safeInput(v).trim())
        .filter(Boolean)
        .join(" ");
    }

    if (tipo_entidad === "persona_moral") {
      const pm = datos_completos as RelatedPMData;
      return safeInput(pm.empresa?.razon_social || pm.empresa?.nombre_entidad || "").trim();
    }

    const fid = datos_completos as RelatedFIDData;
    return safeInput(
      fid.fideicomiso?.nombre_entidad ||
      fid.fideicomiso?.denominacion ||
      fid.fideicomiso?.nombre_fideicomiso ||
      "",
    ).trim();
  }

  function createEmptyRelatedRecurso(tipo_entidad: RelatedTipoEntidad = "persona_fisica"): RelatedRecursoRow {
    const datos_completos =
      tipo_entidad === "persona_fisica"
        ? createEmptyRelatedPFData()
        : tipo_entidad === "persona_moral"
          ? createEmptyRelatedPMData()
          : createEmptyRelatedFIDData();

    return {
      tipo_entidad,
      nombre_entidad: deriveRelatedNombreEntidad(tipo_entidad, datos_completos),
      nacionalidad: "MEX",
      relacion_con_cliente: "",
      sin_documentacion: false,
      observaciones: "",
      datos_completos,
    };
  }

  function createEmptyBeneficiarioControlador(): BeneficiarioControladorRow {
    const datos_completos = createEmptyRelatedPFData();
    datos_completos.contacto.pais = "";
    datos_completos.contacto.domicilio.pais = "";
    return {
      nombre_entidad: deriveRelatedNombreEntidad("persona_fisica", datos_completos),
      nacionalidad: "",
      relacion_con_cliente: "",
      porcentaje_participacion: "",
      sin_documentacion: false,
      observaciones: "",
      datos_completos,
    };
  }

  function changeRelatedRecursoSubtype(
    current: RelatedRecursoRow,
    nextTipo: RelatedTipoEntidad,
  ): RelatedRecursoRow {
    const nextDatos =
      nextTipo === "persona_fisica"
        ? createEmptyRelatedPFData()
        : nextTipo === "persona_moral"
          ? createEmptyRelatedPMData()
          : createEmptyRelatedFIDData();

    return {
      ...current,
      tipo_entidad: nextTipo,
      nombre_entidad: deriveRelatedNombreEntidad(nextTipo, nextDatos),
      datos_completos: nextDatos,
    };
  }

  function isPlainObject(value: any): value is Record<string, any> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function buildCanonicalPFPayloadData(data: RelatedPFData): RelatedPFData {
    const contacto = isPlainObject(data?.contacto) ? data.contacto : {};
    const persona = isPlainObject(data?.persona) ? data.persona : {};
    const identificacion = isPlainObject(persona?.identificacion) ? persona.identificacion : {};
    const telefonoDetalle = isPlainObject(contacto?.telefono_detalle) ? contacto.telefono_detalle : {};
    const actividad = persona?.actividad_economica;

    return {
      ...data,
      contacto: {
        ...contacto,
        telefono: buildTelefonoE164Like(
          safeInput(telefonoDetalle.codigo_pais),
          safeInput(telefonoDetalle.numero),
          safeInput(telefonoDetalle.ext),
        ) || safeInput(contacto.telefono).trim(),
        telefono_detalle: {
          ...telefonoDetalle,
          codigo_pais: safeInput(telefonoDetalle.codigo_pais).trim(),
          numero: safeInput(telefonoDetalle.numero).trim(),
          ext: safeInput(telefonoDetalle.ext).trim() || null,
        },
      },
      persona: {
        ...persona,
        nombres: safeInput(persona?.nombres).trim(),
        apellido_paterno: safeInput(persona?.apellido_paterno).trim(),
        apellido_materno: safeInput(persona?.apellido_materno).trim(),
        fecha_nacimiento:
          normalizeToYYYYMMDD(persona?.fecha_nacimiento) ??
          safeInput(persona?.fecha_nacimiento).trim(),
        rfc: safeInput(persona?.rfc).trim().toUpperCase(),
        curp: safeInput(persona?.curp).trim().toUpperCase(),
        actividad_economica: isPlainObject(actividad)
          ? {
              ...actividad,
              clave: safeInput(actividad.clave).trim(),
              descripcion: safeInput(actividad.descripcion).trim(),
            }
          : safeInput(actividad).trim(),
        identificacion: {
          ...identificacion,
          fecha_expedicion:
            normalizeToYYYYMMDD(safeInput(identificacion.fecha_expedicion)) ??
            safeInput(identificacion.fecha_expedicion).trim(),
          fecha_expiracion:
            identificacion.sin_vigencia === true
              ? null
              : normalizeToYYYYMMDD(safeInput(identificacion.fecha_expiracion)) ??
                safeInput(identificacion.fecha_expiracion).trim(),
        },
      },
    };
  }

  function buildCanonicalPMPayloadData(data: RelatedPMData): RelatedPMData {
    const contacto = isPlainObject(data?.contacto) ? data.contacto : {};
    const empresa = isPlainObject(data?.empresa) ? data.empresa : {};
    const representante = isPlainObject(data?.representante) ? data.representante : {};

    return {
      contacto,
      empresa: {
        ...empresa,
        rfc: safeInput(empresa?.rfc).trim().toUpperCase(),
        fecha_constitucion:
          normalizeToYYYYMMDD(empresa?.fecha_constitucion) ??
          safeInput(empresa?.fecha_constitucion).trim(),
        giro_mercantil: safeInput(empresa?.giro_mercantil).trim(),
        nombre_entidad: safeInput(empresa?.nombre_entidad).trim(),
        razon_social: safeInput(empresa?.razon_social).trim(),
      },
      representante: {
        ...representante,
        nombres: safeInput(representante?.nombres).trim(),
        apellido_paterno: safeInput(representante?.apellido_paterno).trim(),
        apellido_materno: safeInput(representante?.apellido_materno).trim(),
        fecha_nacimiento:
          normalizeToYYYYMMDD(representante?.fecha_nacimiento) ??
          safeInput(representante?.fecha_nacimiento).trim(),
        rfc: safeInput(representante?.rfc).trim().toUpperCase(),
        curp: safeInput(representante?.curp).trim().toUpperCase(),
      },
    };
  }

  function buildCanonicalFIDPayloadData(data: RelatedFIDData): RelatedFIDData {
    const contacto = isPlainObject(data?.contacto) ? data.contacto : {};
    const fideicomiso = isPlainObject(data?.fideicomiso) ? data.fideicomiso : {};
    const representante = isPlainObject(data?.representante) ? data.representante : {};

    return {
      contacto,
      fideicomiso: {
        ...fideicomiso,
        nombre_entidad: safeInput(fideicomiso?.nombre_entidad).trim(),
        denominacion: safeInput(fideicomiso?.denominacion).trim(),
        nombre_fideicomiso: safeInput(fideicomiso?.nombre_fideicomiso).trim(),
      },
      representante: {
        ...representante,
        nombres: safeInput(representante?.nombres).trim(),
        apellido_paterno: safeInput(representante?.apellido_paterno).trim(),
        apellido_materno: safeInput(representante?.apellido_materno).trim(),
        fecha_nacimiento:
          normalizeToYYYYMMDD(representante?.fecha_nacimiento) ??
          safeInput(representante?.fecha_nacimiento).trim(),
        rfc: safeInput(representante?.rfc).trim().toUpperCase(),
        curp: safeInput(representante?.curp).trim().toUpperCase(),
      },
    };
  }

  function buildCanonicalRecursoRowFromRelated(row: RelatedRecursoRow) {
    const datos_completos =
      row.tipo_entidad === "persona_fisica"
        ? buildCanonicalPFPayloadData(row.datos_completos as RelatedPFData)
        : row.tipo_entidad === "persona_moral"
          ? buildCanonicalPMPayloadData(row.datos_completos as RelatedPMData)
          : buildCanonicalFIDPayloadData(row.datos_completos as RelatedFIDData);

    const nombreEntidad =
      deriveRelatedNombreEntidad(row.tipo_entidad, datos_completos) ||
      safeInput(row.nombre_entidad).trim();

    const base = {
      tipo_entidad: row.tipo_entidad,
      nombre_entidad: nombreEntidad,
      nacionalidad: valueToCatalogKey(row.nacionalidad) || safeInput(row.nacionalidad).trim(),
      relacion_con_cliente: safeInput(row.relacion_con_cliente).trim(),
      sin_documentacion: !!row.sin_documentacion,
      observaciones: safeInput(row.observaciones).trim(),
      datos_completos,
    };

    if (row.tipo_entidad === "fideicomiso") {
      return base;
    }

    const personaRelated =
      row.tipo_entidad === "persona_fisica"
        ? (datos_completos as RelatedPFData).persona
        : null;
    const empresaRelated =
      row.tipo_entidad === "persona_moral"
        ? (datos_completos as RelatedPMData).empresa
        : null;

    const actividadGiro =
      row.tipo_entidad === "persona_fisica"
        ? safeInput(personaRelated?.actividad_economica).trim()
        : safeInput(empresaRelated?.giro_mercantil).trim();

    const documentacionPlano =
      row.tipo_entidad === "persona_fisica"
        ? {
            rfc: safeInput(personaRelated?.rfc).trim().toUpperCase(),
            curp: safeInput(personaRelated?.curp).trim().toUpperCase(),
            fecha_nacimiento:
              normalizeToYYYYMMDD(personaRelated?.fecha_nacimiento) ??
              safeInput(personaRelated?.fecha_nacimiento).trim(),
          }
        : {
            rfc: safeInput(empresaRelated?.rfc).trim().toUpperCase(),
          };

    return {
      ...base,
      tipo_tercero: row.tipo_entidad,
      nombre_razon_social: nombreEntidad,
      actividad_giro: actividadGiro,
      ...documentacionPlano,
    };
  }

  function buildCanonicalRecursoRowFromLegacy(row: RecursoTerceroItem) {
    const tipo_entidad = (safeInput(row.tipo_tercero).trim() || "persona_fisica") as RelatedTipoEntidad;

    if (tipo_entidad === "persona_moral") {
      const datos_completos = buildCanonicalPMPayloadData({
        contacto: { pais: row.nacionalidad || "MEX", email: "", telefono: "", domicilio: {} },
        empresa: {
          nombre_entidad: row.nombre_razon_social,
          razon_social: row.nombre_razon_social,
          rfc: row.rfc,
          fecha_constitucion: "",
          giro_mercantil: row.actividad_giro,
        },
        representante: {},
      });

      return {
        tipo_entidad,
        nombre_entidad:
          deriveRelatedNombreEntidad(tipo_entidad, datos_completos) ||
          safeInput(row.nombre_razon_social).trim(),
        nacionalidad: valueToCatalogKey(row.nacionalidad) || safeInput(row.nacionalidad).trim() || "MEX",
        relacion_con_cliente: safeInput(row.relacion_con_cliente).trim(),
        sin_documentacion: !!row.sin_documentacion,
        observaciones: safeInput(row.observaciones).trim(),
        datos_completos,
      };
    }

    if (tipo_entidad === "fideicomiso") {
      const datos_completos = buildCanonicalFIDPayloadData({
        contacto: { pais: row.nacionalidad || "MEX", email: "", telefono: "", domicilio: {} },
        fideicomiso: {
          nombre_entidad: row.nombre_razon_social,
          denominacion: row.nombre_razon_social,
          nombre_fideicomiso: row.nombre_razon_social,
        },
        representante: {},
      });

      return {
        tipo_entidad,
        nombre_entidad:
          deriveRelatedNombreEntidad(tipo_entidad, datos_completos) ||
          safeInput(row.nombre_razon_social).trim(),
        nacionalidad: valueToCatalogKey(row.nacionalidad) || safeInput(row.nacionalidad).trim() || "MEX",
        relacion_con_cliente: safeInput(row.relacion_con_cliente).trim(),
        sin_documentacion: !!row.sin_documentacion,
        observaciones: safeInput(row.observaciones).trim(),
        datos_completos,
      };
    }

    const datos_completos = buildCanonicalPFPayloadData({
      contacto: { pais: row.nacionalidad || "MEX", email: "", telefono: "", domicilio: {} },
      persona: {
        nombres: row.nombre_razon_social,
        apellido_paterno: "",
        apellido_materno: "",
        fecha_nacimiento: row.fecha_nacimiento,
        rfc: row.rfc,
        curp: row.curp,
        actividad_economica: row.actividad_giro,
      },
    });

    return {
      tipo_entidad: "persona_fisica" as const,
      nombre_entidad:
        deriveRelatedNombreEntidad("persona_fisica", datos_completos) ||
        safeInput(row.nombre_razon_social).trim(),
      nacionalidad: valueToCatalogKey(row.nacionalidad) || safeInput(row.nacionalidad).trim(),
      relacion_con_cliente: safeInput(row.relacion_con_cliente).trim(),
      sin_documentacion: !!row.sin_documentacion,
      observaciones: safeInput(row.observaciones).trim(),
      datos_completos,
    };
  }

  function buildBeneficiarioControladorPayloadRow(row: BeneficiarioControladorRow) {
    const datos_completos = buildCanonicalPFPayloadData(row.datos_completos);
    const persona = datos_completos.persona || {};

    return {
      nombre_entidad:
        deriveRelatedNombreEntidad("persona_fisica", datos_completos) ||
        safeInput(row.nombre_entidad).trim(),
      nombres: safeInput(persona.nombres).trim(),
      apellido_paterno: safeInput(persona.apellido_paterno).trim(),
      apellido_materno: safeInput(persona.apellido_materno).trim(),
      fecha_nacimiento:
        normalizeToYYYYMMDD(persona.fecha_nacimiento) ??
        safeInput(persona.fecha_nacimiento).trim(),
      rfc: safeInput(persona.rfc).replace(/\s+/g, "").toUpperCase(),
      curp: safeInput(persona.curp).replace(/\s+/g, "").toUpperCase(),
      nacionalidad: valueToCatalogKey(row.nacionalidad) || safeInput(row.nacionalidad).trim(),
      relacion_con_cliente: safeInput(row.relacion_con_cliente).trim(),
      porcentaje_participacion: safeInput(row.porcentaje_participacion).trim(),
      sin_documentacion: !!row.sin_documentacion,
      observaciones: safeInput(row.observaciones).trim(),
      datos_completos,
    };
  }

  function buildCanonicalDuenoRowFromLegacy(row: DuenoBeneficiarioItem) {
    const datos_completos = hydrateRelatedPFData(buildCanonicalPFPayloadData({
      contacto: { pais: row.nacionalidad || "MEX", email: "", telefono: "", domicilio: {} },
      persona: {
        nombres: row.nombres,
        apellido_paterno: row.apellido_paterno,
        apellido_materno: row.apellido_materno,
        fecha_nacimiento: row.fecha_nacimiento,
        rfc: row.rfc,
        curp: row.curp,
        actividad_economica: "",
      },
    }));
    const legacyTipoNacionalidad = inferNacionalExtranjero(row.nacionalidad);
    datos_completos.persona.tipo_nacionalidad = legacyTipoNacionalidad;
    datos_completos.persona.nacional_extranjero = legacyTipoNacionalidad;
    datos_completos.persona.nacionalidad = valueToCatalogKey(row.nacionalidad);

    return {
      tipo_entidad: "persona_fisica" as const,
      nombre_entidad:
        deriveRelatedNombreEntidad("persona_fisica", datos_completos) ||
        [row.nombres, row.apellido_paterno, row.apellido_materno]
          .map((v) => safeInput(v).trim())
          .filter(Boolean)
          .join(" "),
      nacionalidad: valueToCatalogKey(row.nacionalidad) || safeInput(row.nacionalidad).trim() || "MEX",
      relacion_con_cliente: safeInput(row.relacion_con_cliente).trim(),
      porcentaje_participacion: safeInput(row.porcentaje_participacion).trim(),
      sin_documentacion: !!row.sin_documentacion,
      observaciones: safeInput(row.observaciones).trim(),
      datos_completos,
    };
  }

  function buildCanonicalRecursosPayload() {
    if (relatedRecursos.length > 0) {
      return relatedRecursos.map(buildCanonicalRecursoRowFromRelated);
    }

    if (recursosTerceros.length > 0) {
      return recursosTerceros.map(buildCanonicalRecursoRowFromLegacy);
    }

    return [];
  }

  function buildBeneficiariosControladoresPayload() {
    return beneficiariosControladores.map(buildBeneficiarioControladorPayloadRow);
  }

  function addRelatedRecursoRow(tipo_entidad: RelatedTipoEntidad = "persona_fisica") {
    setRelatedRecursos((prev) => [...prev, createEmptyRelatedRecurso(tipo_entidad)]);
  }

  function removeRelatedRecursoRow(index: number) {
    setRelatedRecursos((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRelatedRecursoRow(
    index: number,
    updater: (row: RelatedRecursoRow) => RelatedRecursoRow,
  ) {
    setRelatedRecursos((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = updater(row);
        return {
          ...next,
          nombre_entidad:
            deriveRelatedNombreEntidad(next.tipo_entidad, next.datos_completos) ||
            safeInput(next.nombre_entidad).trim(),
        };
      }),
    );
  }

  function updateRelatedRecursoCommonField(
    index: number,
    key: "nacionalidad" | "relacion_con_cliente" | "sin_documentacion" | "observaciones",
    value: string | boolean,
  ) {
    updateRelatedRecursoRow(index, (row) => ({
      ...row,
      [key]: value,
    }));
  }

  function updateRelatedRecursoSubtype(index: number, nextTipo: RelatedTipoEntidad) {
    updateRelatedRecursoRow(index, (row) => changeRelatedRecursoSubtype(row, nextTipo));
  }

  function updateRelatedRecursoDataField(
    index: number,
    section: "persona" | "empresa" | "representante" | "fideicomiso" | "contacto",
    key: string,
    value: string,
  ) {
    updateRelatedRecursoRow(index, (row) => ({
      ...row,
      datos_completos: {
        ...(row.datos_completos as Record<string, any>),
        [section]: {
          ...(((row.datos_completos as Record<string, any>)[section] || {}) as Record<string, any>),
          [key]: value,
        },
      } as unknown as RelatedPFData | RelatedPMData | RelatedFIDData,
    }));
  }

  function updateRelatedRecursoDomicilioField(index: number, key: string, value: string) {
    updateRelatedRecursoRow(index, (row) => {
      const contacto = (((row.datos_completos as Record<string, any>).contacto || {}) as Record<string, any>);
      const domicilio = ((contacto.domicilio || {}) as Record<string, any>);

      return {
        ...row,
        datos_completos: {
          ...(row.datos_completos as Record<string, any>),
          contacto: {
            ...contacto,
            domicilio: {
              ...domicilio,
              [key]: value,
            },
          },
        } as unknown as RelatedPFData | RelatedPMData | RelatedFIDData,
      };
    });
  }

  function renderRelatedRecursoContactoFields(row: RelatedRecursoRow, index: number) {
    const contacto = (((row.datos_completos as Record<string, any>).contacto || {}) as Record<string, any>);
    const domicilio = ((contacto.domicilio || {}) as Record<string, any>);
    const telefono = ((contacto.telefono_detalle || {}) as Record<string, any>);
    const fieldError = (field: string) =>
      errors[`beneficiarios_controladores.${index}.${field}`];

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">País</label>
            <input
              value={safeInput(contacto.pais)}
              onChange={(e) => updateRelatedRecursoDataField(index, "contacto", "pais", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              value={safeInput(contacto.email)}
              onChange={(e) => updateRelatedRecursoDataField(index, "contacto", "email", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Teléfono</label>
            <input
              value={safeInput(contacto.telefono)}
              onChange={(e) => updateRelatedRecursoDataField(index, "contacto", "telefono", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Calle</label>
            <input
              value={safeInput(domicilio.calle)}
              onChange={(e) => updateRelatedRecursoDomicilioField(index, "calle", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Número</label>
            <input
              value={safeInput(domicilio.numero)}
              onChange={(e) => updateRelatedRecursoDomicilioField(index, "numero", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Colonia</label>
            <input
              value={safeInput(domicilio.colonia)}
              onChange={(e) => updateRelatedRecursoDomicilioField(index, "colonia", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Municipio</label>
            <input
              value={safeInput(domicilio.municipio)}
              onChange={(e) => updateRelatedRecursoDomicilioField(index, "municipio", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Ciudad / delegación</label>
            <input
              value={safeInput(domicilio.ciudad_delegacion)}
              onChange={(e) => updateRelatedRecursoDomicilioField(index, "ciudad_delegacion", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Código postal</label>
            <input
              value={safeInput(domicilio.codigo_postal)}
              onChange={(e) => updateRelatedRecursoDomicilioField(index, "codigo_postal", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Estado</label>
            <input
              value={safeInput(domicilio.estado)}
              onChange={(e) => updateRelatedRecursoDomicilioField(index, "estado", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">País domicilio</label>
            <input
              value={safeInput(domicilio.pais)}
              onChange={(e) => updateRelatedRecursoDomicilioField(index, "pais", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>
    );
  }

  function renderRelatedRecursoSubtypeFields(row: RelatedRecursoRow, index: number) {
    if (row.tipo_entidad === "persona_fisica") {
      const persona = ((((row.datos_completos as Record<string, any>).persona) || {}) as Record<string, any>);

      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nombres</label>
              <input
                value={safeInput(persona.nombres)}
                onChange={(e) => updateRelatedRecursoDataField(index, "persona", "nombres", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Apellido paterno</label>
              <input
                value={safeInput(persona.apellido_paterno)}
                onChange={(e) => updateRelatedRecursoDataField(index, "persona", "apellido_paterno", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Apellido materno</label>
              <input
                value={safeInput(persona.apellido_materno)}
                onChange={(e) => updateRelatedRecursoDataField(index, "persona", "apellido_materno", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Fecha nac. (AAAAMMDD)</label>
              <input
                value={safeInput(persona.fecha_nacimiento)}
                onChange={(e) => updateRelatedRecursoDataField(index, "persona", "fecha_nacimiento", onlyDigits(e.target.value).slice(0, 8))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">RFC</label>
              <input
                value={safeInput(persona.rfc)}
                onChange={(e) => updateRelatedRecursoDataField(index, "persona", "rfc", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">CURP</label>
              <input
                value={safeInput(persona.curp)}
                onChange={(e) => updateRelatedRecursoDataField(index, "persona", "curp", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <SearchableSelect
                label="Actividad económica"
                required
                value={safeInput(persona.actividad_economica)}
                items={actividades}
                onChange={(v) =>
                  updateRelatedRecursoDataField(index, "persona", "actividad_economica", v)
                }
              />
            </div>
          </div>

          {renderRelatedRecursoContactoFields(row, index)}
        </div>
      );
    }

    if (row.tipo_entidad === "persona_moral") {
      const empresa = ((((row.datos_completos as Record<string, any>).empresa) || {}) as Record<string, any>);
      const representante = ((((row.datos_completos as Record<string, any>).representante) || {}) as Record<string, any>);

      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-3">
              <label className="text-sm font-medium">Razón social</label>
              <input
                value={safeInput(empresa.razon_social || empresa.nombre_entidad)}
                onChange={(e) => {
                  updateRelatedRecursoDataField(index, "empresa", "razon_social", e.target.value);
                  updateRelatedRecursoDataField(index, "empresa", "nombre_entidad", e.target.value);
                }}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">RFC</label>
              <input
                value={safeInput(empresa.rfc)}
                onChange={(e) => updateRelatedRecursoDataField(index, "empresa", "rfc", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Fecha constitución</label>
              <input
                value={safeInput(empresa.fecha_constitucion)}
                onChange={(e) => updateRelatedRecursoDataField(index, "empresa", "fecha_constitucion", onlyDigits(e.target.value).slice(0, 8))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <SearchableSelect
              label="Giro mercantil"
              required
              value={safeInput(empresa.giro_mercantil)}
              items={giros}
              onChange={(v) =>
                updateRelatedRecursoDataField(index, "empresa", "giro_mercantil", v)
              }
            />
          </div>

          {renderRelatedRecursoContactoFields(row, index)}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Rep. nombres</label>
              <input
                value={safeInput(representante.nombres)}
                onChange={(e) => updateRelatedRecursoDataField(index, "representante", "nombres", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Rep. apellido paterno</label>
              <input
                value={safeInput(representante.apellido_paterno)}
                onChange={(e) => updateRelatedRecursoDataField(index, "representante", "apellido_paterno", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Rep. apellido materno</label>
              <input
                value={safeInput(representante.apellido_materno)}
                onChange={(e) => updateRelatedRecursoDataField(index, "representante", "apellido_materno", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Rep. fecha nac.</label>
              <input
                value={safeInput(representante.fecha_nacimiento)}
                onChange={(e) => updateRelatedRecursoDataField(index, "representante", "fecha_nacimiento", onlyDigits(e.target.value).slice(0, 8))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Rep. RFC</label>
              <input
                value={safeInput(representante.rfc)}
                onChange={(e) => updateRelatedRecursoDataField(index, "representante", "rfc", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Rep. CURP</label>
              <input
                value={safeInput(representante.curp)}
                onChange={(e) => updateRelatedRecursoDataField(index, "representante", "curp", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      );
    }

    const fideicomiso = ((((row.datos_completos as Record<string, any>).fideicomiso) || {}) as Record<string, any>);
    const representante = ((((row.datos_completos as Record<string, any>).representante) || {}) as Record<string, any>);

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-medium">Nombre fideicomiso</label>
            <input
              value={safeInput(fideicomiso.nombre_fideicomiso || fideicomiso.denominacion || fideicomiso.nombre_entidad)}
              onChange={(e) => {
                updateRelatedRecursoDataField(index, "fideicomiso", "nombre_fideicomiso", e.target.value);
                updateRelatedRecursoDataField(index, "fideicomiso", "denominacion", e.target.value);
                updateRelatedRecursoDataField(index, "fideicomiso", "nombre_entidad", e.target.value);
              }}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {renderRelatedRecursoContactoFields(row, index)}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Rep. nombres</label>
            <input
              value={safeInput(representante.nombres)}
              onChange={(e) => updateRelatedRecursoDataField(index, "representante", "nombres", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Rep. apellido paterno</label>
            <input
              value={safeInput(representante.apellido_paterno)}
              onChange={(e) => updateRelatedRecursoDataField(index, "representante", "apellido_paterno", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Rep. apellido materno</label>
            <input
              value={safeInput(representante.apellido_materno)}
              onChange={(e) => updateRelatedRecursoDataField(index, "representante", "apellido_materno", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Rep. fecha nac.</label>
            <input
              value={safeInput(representante.fecha_nacimiento)}
              onChange={(e) => updateRelatedRecursoDataField(index, "representante", "fecha_nacimiento", onlyDigits(e.target.value).slice(0, 8))}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Rep. RFC</label>
            <input
              value={safeInput(representante.rfc)}
              onChange={(e) => updateRelatedRecursoDataField(index, "representante", "rfc", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Rep. CURP</label>
            <input
              value={safeInput(representante.curp)}
              onChange={(e) => updateRelatedRecursoDataField(index, "representante", "curp", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>
    );
  }

  function onlyDigits(value: string): string {
    return String(value ?? "").replace(/\D+/g, "");
  }

  function addBeneficiarioControlador() {
    setBeneficiariosControladores((prev) => [...prev, createEmptyBeneficiarioControlador()]);
  }

  function removeBeneficiarioControlador(index: number) {
    setBeneficiariosControladores((prev) => prev.filter((_, i) => i !== index));
  }

  function updateBeneficiarioControlador(
    index: number,
    updater: (row: BeneficiarioControladorRow) => BeneficiarioControladorRow,
  ) {
    setBeneficiariosControladores((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = updater(row);
        return {
          ...next,
          nombre_entidad:
            deriveRelatedNombreEntidad("persona_fisica", next.datos_completos) ||
            safeInput(next.nombre_entidad).trim(),
        };
      }),
    );
  }

  function updateBeneficiarioControladorCommonField(
    index: number,
    key:
      | "nacionalidad"
      | "relacion_con_cliente"
      | "porcentaje_participacion"
      | "sin_documentacion"
      | "observaciones",
    value: string | boolean,
  ) {
    updateBeneficiarioControlador(index, (row) => ({
      ...row,
      [key]: value,
    }));
  }

  function updateBeneficiarioControladorDataField(
    index: number,
    section: "persona" | "contacto" | "cargo_publico",
    key: string,
    value: string,
  ) {
    updateBeneficiarioControlador(index, (row) => ({
      ...row,
      datos_completos: {
        ...(row.datos_completos as Record<string, any>),
        [section]: {
          ...(((row.datos_completos as Record<string, any>)[section] || {}) as Record<string, any>),
          [key]: value,
        },
      } as unknown as RelatedPFData,
    }));
  }

  function updateBeneficiarioControladorDomicilioField(index: number, key: string, value: string) {
    updateBeneficiarioControlador(index, (row) => {
      const contacto = (((row.datos_completos as Record<string, any>).contacto || {}) as Record<string, any>);
      const domicilio = ((contacto.domicilio || {}) as Record<string, any>);

      return {
        ...row,
        datos_completos: {
          ...(row.datos_completos as Record<string, any>),
          contacto: {
            ...contacto,
            domicilio: {
              ...domicilio,
              [key]: value,
            },
          },
        } as unknown as RelatedPFData,
      };
    });
  }

  function updateBeneficiarioControladorNestedField(
    index: number,
    section: "persona" | "contacto" | "cargo_publico",
    nested: string,
    key: string,
    value: string | boolean,
  ) {
    updateBeneficiarioControlador(index, (row) => {
      const root = row.datos_completos as Record<string, any>;
      const sectionValue = (root[section] || {}) as Record<string, any>;
      return {
        ...row,
        datos_completos: {
          ...root,
          [section]: {
            ...sectionValue,
            [nested]: {
              ...((sectionValue[nested] || {}) as Record<string, any>),
              [key]: value,
            },
          },
        } as RelatedPFData,
      };
    });
  }

  function validateBeneficiariosOnBlur() {
    const result = validateBeneficiariosControladores({
      tipoCliente: tipo,
      aplica: tipo === "persona_fisica" ? beneficiariosControladoresAplica : true,
      beneficiarios: buildBeneficiariosControladoresPayload(),
      clientePfRfc: pfRfc,
      clientePfCurp: pfCurp,
    });
    setErrors((previous) => ({
      ...Object.fromEntries(
        Object.entries(previous).filter(([key]) => !key.startsWith("beneficiarios_controladores")),
      ),
      ...result.errors,
    }));
  }

  async function lookupBeneficiarioCodigoPostal(index: number, cpValue: string, paisValue: string) {
    beneficiarioCpRequestsRef.current[index]?.abort();
    setBeneficiarioCatalogoTerritorial((previous) => ({
      ...previous,
      [index]: {
        municipio: false,
        ciudad_delegacion: false,
        estado: false,
      },
    }));
    setErr(`beneficiarios_controladores.${index}.contacto.domicilio.codigo_postal`);
    if (!isMexicoKey(paisValue) || !/^\d{5}$/.test(cpValue)) return;
    const controller = new AbortController();
    beneficiarioCpRequestsRef.current[index] = controller;
    setBeneficiarioCpLoading((previous) => ({ ...previous, [index]: true }));
    try {
      const response = await api.get("/api/catalogos/codigos-postales", {
        params: { cp: cpValue },
        signal: controller.signal,
      });
      const resultados = Array.isArray(response.data?.resultados)
        ? response.data.resultados
        : [];
      if (!resultados.length) {
        setErr(`beneficiarios_controladores.${index}.contacto.domicilio.codigo_postal`, "Código postal no encontrado; captura manual habilitada");
        return;
      }
      if (
        beneficiarioCpRequestsRef.current[index] !== controller ||
        controller.signal.aborted
      ) return;
      const first = resultados[0];
      const municipio = String(first.municipio ?? "").trim();
      const ciudadDelegacion = String(
        first.ciudad ?? first.ciudad_delegacion ?? "",
      ).trim();
      const estado = String(first.estado ?? "").trim();
      setBeneficiarioCatalogoTerritorial((previous) => ({
        ...previous,
        [index]: {
          municipio: Boolean(municipio),
          ciudad_delegacion: Boolean(ciudadDelegacion),
          estado: Boolean(estado),
        },
      }));
      updateBeneficiarioControlador(index, (row) => {
        const root = row.datos_completos as Record<string, any>;
        const contacto = root.contacto || {};
        const domicilio = contacto.domicilio || {};
        if (String(domicilio.codigo_postal) !== cpValue) return row;
        const colonias = Array.from(new Set(resultados.map((item: any) => String(item.colonia ?? "").trim()).filter(Boolean)));
        return {
          ...row,
          datos_completos: {
            ...root,
            contacto: {
              ...contacto,
              domicilio: {
                ...domicilio,
                municipio,
                ciudad_delegacion: ciudadDelegacion,
                estado,
                colonia: colonias.length === 1 ? colonias[0] : "",
                colonias_opciones: colonias,
              },
            },
          } as RelatedPFData,
        };
      });
      setErr(`beneficiarios_controladores.${index}.contacto.domicilio.codigo_postal`);
    } catch (error: any) {
      if (error?.code !== "ERR_CANCELED") {
        setErr(
          `beneficiarios_controladores.${index}.contacto.domicilio.codigo_postal`,
          error?.response?.data?.error || "No se pudo consultar el código postal",
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setBeneficiarioCpLoading((previous) => ({ ...previous, [index]: false }));
      }
    }
  }

  function changeBeneficiarioDomicilioPais(index: number, value: string) {
    beneficiarioCpRequestsRef.current[index]?.abort();
    setBeneficiarioCpLoading((previous) => ({ ...previous, [index]: false }));
    setBeneficiarioCatalogoTerritorial((previous) => ({
      ...previous,
      [index]: {
        municipio: false,
        ciudad_delegacion: false,
        estado: false,
      },
    }));
    setErr(`beneficiarios_controladores.${index}.contacto.domicilio.codigo_postal`);
    updateBeneficiarioControlador(index, (row) => {
      const root = row.datos_completos as Record<string, any>;
      const contacto = root.contacto || {};
      const domicilio = contacto.domicilio || {};
      return {
        ...row,
        datos_completos: {
          ...root,
          contacto: {
            ...contacto,
            domicilio: {
              ...domicilio,
              pais: value,
              codigo_postal: "",
              colonia: "",
              municipio: "",
              ciudad_delegacion: "",
              estado: "",
              colonias_opciones: [],
            },
          },
        } as RelatedPFData,
      };
    });
  }

  function changeBeneficiarioCodigoPostal(index: number, value: string) {
    beneficiarioCpRequestsRef.current[index]?.abort();
    setBeneficiarioCpLoading((previous) => ({ ...previous, [index]: false }));
    setBeneficiarioCatalogoTerritorial((previous) => ({
      ...previous,
      [index]: {
        municipio: false,
        ciudad_delegacion: false,
        estado: false,
      },
    }));
    setErr(`beneficiarios_controladores.${index}.contacto.domicilio.codigo_postal`);
    updateBeneficiarioControlador(index, (row) => {
      const root = row.datos_completos as Record<string, any>;
      const contacto = root.contacto || {};
      const domicilio = contacto.domicilio || {};
      return {
        ...row,
        datos_completos: {
          ...root,
          contacto: {
            ...contacto,
            domicilio: {
              ...domicilio,
              codigo_postal: value,
              colonia: "",
              municipio: "",
              ciudad_delegacion: "",
              estado: "",
              colonias_opciones: [],
            },
          },
        } as RelatedPFData,
      };
    });
  }

  function renderBeneficiarioControladorContactoFields(row: BeneficiarioControladorRow, index: number) {
    const contacto = (((row.datos_completos as Record<string, any>).contacto || {}) as Record<string, any>);
    const domicilio = ((contacto.domicilio || {}) as Record<string, any>);
    const telefono = ((contacto.telefono_detalle || {}) as Record<string, any>);
    const fieldError = (field: string) =>
      errors[`beneficiarios_controladores.${index}.${field}`];

    return (
      <div className="space-y-3">
        <div
          className={`grid grid-cols-1 gap-4 ${
            tipo === "persona_fisica"
              ? "md:grid-cols-2 xl:grid-cols-3"
              : "sm:grid-cols-3"
          }`}
        >
          <SearchableSelect
            label="País de contacto"
            required
            value={safeInput(contacto.pais)}
            items={paises}
            error={fieldError("contacto.pais")}
            onChange={(value) => updateBeneficiarioControladorDataField(index, "contacto", "pais", value)}
            onBlur={validateBeneficiariosOnBlur}
          />

          <div className="space-y-1">
            <label className="text-sm font-medium">Email *</label>
            <input
              type="email"
              className={`w-full rounded border px-3 py-2 text-sm ${fieldError("contacto.email") ? "border-red-500" : "border-gray-300"}`}
              value={safeInput(contacto.email)}
              onChange={(e) => updateBeneficiarioControladorDataField(index, "contacto", "email", e.target.value)}
              onBlur={validateBeneficiariosOnBlur}
            />
            {fieldError("contacto.email") ? <p className="text-xs text-red-600">{fieldError("contacto.email")}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Código telefónico *</label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${fieldError("contacto.telefono_detalle.codigo_pais") ? "border-red-500" : "border-gray-300"}`}
              value={safeInput(telefono.codigo_pais)}
              onChange={(e) => updateBeneficiarioControladorNestedField(index, "contacto", "telefono_detalle", "codigo_pais", e.target.value)}
              onBlur={validateBeneficiariosOnBlur}
            />
            {fieldError("contacto.telefono_detalle.codigo_pais") ? <p className="text-xs text-red-600">{fieldError("contacto.telefono_detalle.codigo_pais")}</p> : null}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Teléfono *</label>
            <input className={`w-full rounded border px-3 py-2 text-sm ${fieldError("contacto.telefono_detalle.numero") ? "border-red-500" : "border-gray-300"}`}
              value={safeInput(telefono.numero)}
              onChange={(e) => updateBeneficiarioControladorNestedField(index, "contacto", "telefono_detalle", "numero", onlyDigits(e.target.value).slice(0, 15))}
              onBlur={validateBeneficiariosOnBlur} />
            {fieldError("contacto.telefono_detalle.numero") ? <p className="text-xs text-red-600">{fieldError("contacto.telefono_detalle.numero")}</p> : null}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Extensión</label>
            <input className={`w-full rounded border px-3 py-2 text-sm ${fieldError("contacto.telefono_detalle.ext") ? "border-red-500" : "border-gray-300"}`}
              value={safeInput(telefono.ext)}
              onChange={(e) => updateBeneficiarioControladorNestedField(index, "contacto", "telefono_detalle", "ext", onlyDigits(e.target.value).slice(0, 6))}
              onBlur={validateBeneficiariosOnBlur} />
            {fieldError("contacto.telefono_detalle.ext") ? <p className="text-xs text-red-600">{fieldError("contacto.telefono_detalle.ext")}</p> : null}
          </div>
        </div>

        <div
          className={`grid grid-cols-1 gap-4 ${
            tipo === "persona_fisica"
              ? "md:grid-cols-2 xl:grid-cols-3"
              : "sm:grid-cols-4"
          }`}
        >
          <div className="order-[7] space-y-1">
            <label className="text-sm font-medium">Calle *</label>
            <input
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={safeInput(domicilio.calle)}
              onChange={(e) => updateBeneficiarioControladorDomicilioField(index, "calle", e.target.value)}
              onBlur={validateBeneficiariosOnBlur}
            />
            {fieldError("contacto.domicilio.calle") ? <p className="text-xs text-red-600">{fieldError("contacto.domicilio.calle")}</p> : null}
          </div>

          <div className="order-[8] space-y-1">
            <label className="text-sm font-medium">Número exterior *</label>
            <input
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={safeInput(domicilio.numero)}
              onChange={(e) => updateBeneficiarioControladorDomicilioField(index, "numero", e.target.value)}
              onBlur={validateBeneficiariosOnBlur}
            />
            {fieldError("contacto.domicilio.numero") ? <p className="text-xs text-red-600">{fieldError("contacto.domicilio.numero")}</p> : null}
          </div>
          <div className="order-[9] space-y-1">
            <label className="text-sm font-medium">Interior</label>
            <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={safeInput(domicilio.interior)}
              onChange={(e) => updateBeneficiarioControladorDomicilioField(index, "interior", e.target.value)}
              onBlur={validateBeneficiariosOnBlur} />
          </div>

          <div className="order-[3] space-y-1">
            <label className="text-sm font-medium">Colonia *</label>
            {Array.isArray(domicilio.colonias_opciones) && domicilio.colonias_opciones.length > 1 ? (
              <select className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={safeInput(domicilio.colonia)}
                onChange={(e) => updateBeneficiarioControladorDomicilioField(index, "colonia", e.target.value)} onBlur={validateBeneficiariosOnBlur}>
                <option value="">Selecciona colonia</option>
                {domicilio.colonias_opciones.map((colonia: string) => <option key={colonia} value={colonia}>{colonia}</option>)}
              </select>
            ) : (
              <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={safeInput(domicilio.colonia)}
                onChange={(e) => updateBeneficiarioControladorDomicilioField(index, "colonia", e.target.value)} onBlur={validateBeneficiariosOnBlur} />
            )}
            {fieldError("contacto.domicilio.colonia") ? <p className="text-xs text-red-600">{fieldError("contacto.domicilio.colonia")}</p> : null}
          </div>

          <div className="order-[4] space-y-1">
            <label className="text-sm font-medium">Municipio *</label>
            <input
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={safeInput(domicilio.municipio)}
              onChange={(e) => updateBeneficiarioControladorDomicilioField(index, "municipio", e.target.value)}
              readOnly={
                tipo === "persona_fisica"
                  ? beneficiarioCatalogoTerritorial[index]?.municipio === true
                  : isMexicoKey(domicilio.pais) &&
                    Array.isArray(domicilio.colonias_opciones) &&
                    domicilio.colonias_opciones.length > 0
              }
              onBlur={validateBeneficiariosOnBlur}
            />
            {fieldError("contacto.domicilio.municipio") ? <p className="text-xs text-red-600">{fieldError("contacto.domicilio.municipio")}</p> : null}
          </div>

          <div className="order-[5] space-y-1">
            <label className="text-sm font-medium">
              Ciudad / delegación
              {tipo === "persona_fisica" ? null : " *"}
            </label>
            <input
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={safeInput(domicilio.ciudad_delegacion)}
              onChange={(e) => updateBeneficiarioControladorDomicilioField(index, "ciudad_delegacion", e.target.value)}
              readOnly={
                tipo === "persona_fisica"
                  ? beneficiarioCatalogoTerritorial[index]?.ciudad_delegacion === true
                  : isMexicoKey(domicilio.pais) &&
                    Array.isArray(domicilio.colonias_opciones) &&
                    domicilio.colonias_opciones.length > 0
              }
              onBlur={validateBeneficiariosOnBlur}
            />
            {fieldError("contacto.domicilio.ciudad_delegacion") ? <p className="text-xs text-red-600">{fieldError("contacto.domicilio.ciudad_delegacion")}</p> : null}
          </div>

          <div className="order-[2] space-y-1">
            <label className="text-sm font-medium">Código postal *</label>
            <input
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={safeInput(domicilio.codigo_postal)}
              disabled={!safeInput(domicilio.pais).trim()}
              onChange={(e) => {
                const next = isMexicoKey(domicilio.pais) ? normalizeCodigoPostalMx(e.target.value) : e.target.value;
                changeBeneficiarioCodigoPostal(index, next);
                void lookupBeneficiarioCodigoPostal(index, next, domicilio.pais);
              }}
              onBlur={validateBeneficiariosOnBlur}
            />
            {beneficiarioCpLoading[index] ? <p className="text-xs text-blue-700" role="status">Consultando código postal…</p> : null}
            {fieldError("contacto.domicilio.codigo_postal") ? <p className="text-xs text-red-600">{fieldError("contacto.domicilio.codigo_postal")}</p> : null}
          </div>

          <div className="order-[6] space-y-1">
            <label className="text-sm font-medium">Estado *</label>
            <input
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={safeInput(domicilio.estado)}
              onChange={(e) => updateBeneficiarioControladorDomicilioField(index, "estado", e.target.value)}
              readOnly={
                tipo === "persona_fisica"
                  ? beneficiarioCatalogoTerritorial[index]?.estado === true
                  : isMexicoKey(domicilio.pais) &&
                    Array.isArray(domicilio.colonias_opciones) &&
                    domicilio.colonias_opciones.length > 0
              }
              onBlur={validateBeneficiariosOnBlur}
            />
            {fieldError("contacto.domicilio.estado") ? <p className="text-xs text-red-600">{fieldError("contacto.domicilio.estado")}</p> : null}
          </div>

          <div className="order-[1]">
            <SearchableSelect label="País domicilio" required value={safeInput(domicilio.pais)}
              items={paises} error={fieldError("contacto.domicilio.pais")}
              onChange={(value) => changeBeneficiarioDomicilioPais(index, value)}
              onBlur={validateBeneficiariosOnBlur} />
          </div>
        </div>
      </div>
    );
  }

  function renderBeneficiarioControladorPFFields(row: BeneficiarioControladorRow, index: number) {
    const persona = ((((row.datos_completos as Record<string, any>).persona) || {}) as Record<string, any>);
    const identificacion = ((persona.identificacion || {}) as Record<string, any>);
    const cargoPublico = ((((row.datos_completos as Record<string, any>).cargo_publico) || {}) as Record<string, any>);
    const beneficiarioNacional = persona.tipo_nacionalidad === "nacional";
    const fieldError = (field: string) =>
      errors[`beneficiarios_controladores.${index}.${field}`];

    return (
      <div className="space-y-3">
        <div
          className={`grid grid-cols-1 gap-4 ${
            tipo === "persona_fisica"
              ? "md:grid-cols-2 xl:grid-cols-3"
              : "sm:grid-cols-3"
          }`}
        >
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Nombres <span className="text-red-600">*</span>
            </label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${fieldError("nombres") ? "border-red-500" : "border-gray-300"}`}
              value={safeInput(persona.nombres)}
              onChange={(e) => updateBeneficiarioControladorDataField(index, "persona", "nombres", e.target.value)}
              onBlur={validateBeneficiariosOnBlur}
            />
            {fieldError("nombres") ? (
              <p className="text-xs text-red-600">{fieldError("nombres")}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Apellido paterno <span className="text-red-600">*</span>
            </label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${fieldError("apellido_paterno") ? "border-red-500" : "border-gray-300"}`}
              value={safeInput(persona.apellido_paterno)}
              onChange={(e) => updateBeneficiarioControladorDataField(index, "persona", "apellido_paterno", e.target.value)}
              onBlur={validateBeneficiariosOnBlur}
            />
            {fieldError("apellido_paterno") ? (
              <p className="text-xs text-red-600">
                {fieldError("apellido_paterno")}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Apellido materno {beneficiarioNacional
                ? <span className="text-red-600">*</span>
                : <span className="text-gray-500">(opcional)</span>}
            </label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${fieldError("apellido_materno") ? "border-red-500" : "border-gray-300"}`}
              value={safeInput(persona.apellido_materno)}
              onChange={(e) => updateBeneficiarioControladorDataField(index, "persona", "apellido_materno", e.target.value)}
              onBlur={validateBeneficiariosOnBlur}
            />
            {fieldError("apellido_materno") ? (
              <p className="text-xs text-red-600">
                {fieldError("apellido_materno")}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Fecha de nacimiento <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              className={`w-full rounded border px-3 py-2 text-sm ${fieldError("fecha_nacimiento") ? "border-red-500" : "border-gray-300"}`}
              value={safeInput(persona.fecha_nacimiento)}
              onChange={(e) => updateBeneficiarioControladorDataField(index, "persona", "fecha_nacimiento", e.target.value)}
              onBlur={validateBeneficiariosOnBlur}
            />
            {fieldError("fecha_nacimiento") ? (
              <p className="text-xs text-red-600">
                {fieldError("fecha_nacimiento")}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              RFC {tipo === "persona_fisica" ? "*" : beneficiarioNacional ? "*" : "(opcional)"}
            </label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${fieldError("rfc") ? "border-red-500" : "border-gray-300"}`}
              value={safeInput(persona.rfc)}
              onChange={(e) => updateBeneficiarioControladorDataField(index, "persona", "rfc", e.target.value)}
              onBlur={validateBeneficiariosOnBlur}
            />
            {fieldError("rfc") ? (
              <p className="text-xs text-red-600">{fieldError("rfc")}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              CURP {tipo === "persona_fisica" ? "*" : beneficiarioNacional ? "*" : "(opcional)"}
            </label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${fieldError("curp") ? "border-red-500" : "border-gray-300"}`}
              value={safeInput(persona.curp)}
              onChange={(e) => updateBeneficiarioControladorDataField(index, "persona", "curp", e.target.value)}
              onBlur={validateBeneficiariosOnBlur}
            />
            {fieldError("curp") ? (
              <p className="text-xs text-red-600">{fieldError("curp")}</p>
            ) : null}
          </div>

          <SearchableSelect label="País de nacimiento" required
            value={safeInput(persona.pais_nacimiento)} items={paises}
            error={fieldError("pais_nacimiento")}
            onChange={(value) => updateBeneficiarioControladorDataField(index, "persona", "pais_nacimiento", value)}
            onBlur={validateBeneficiariosOnBlur} />
          <SearchableSelect label="Actividad económica" required
            value={isPlainObject(persona.actividad_economica) ? safeInput(persona.actividad_economica.clave) : safeInput(persona.actividad_economica)}
            items={actividades} error={fieldError("actividad_economica")}
            onChange={(value) => {
              const item = actividades.find((activity) => activity.clave === value);
              updateBeneficiarioControlador(index, (current) => ({
                ...current,
                datos_completos: {
                  ...(current.datos_completos as any),
                  persona: {
                    ...(current.datos_completos as any).persona,
                    actividad_economica: item ? { clave: item.clave, descripcion: item.descripcion } : value,
                  },
                },
              }));
            }}
            onBlur={validateBeneficiariosOnBlur} />
          <div className="space-y-1">
            <label className="text-sm font-medium">Residencia *</label>
            <select className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={safeInput(persona.residencia)}
              onChange={(e) => updateBeneficiarioControladorDataField(index, "persona", "residencia", e.target.value)}
              onBlur={validateBeneficiariosOnBlur}>
              <option value="">Selecciona</option>
              <option value="temporal">Temporal</option>
              <option value="permanente">Permanente</option>
            </select>
            {fieldError("residencia") ? (
              <p className="text-xs text-red-600">{fieldError("residencia")}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 rounded border border-gray-200 p-3">
          <p className="text-sm font-medium">Identificación</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(["tipo", "autoridad", "numero"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <label className="text-sm font-medium">{key === "tipo" ? "Tipo o nombre del documento" : key === "autoridad" ? "Autoridad" : "Número"} *</label>
                <input className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={safeInput(identificacion[key])}
                  onChange={(e) => updateBeneficiarioControladorNestedField(index, "persona", "identificacion", key, e.target.value)}
                  onBlur={validateBeneficiariosOnBlur} />
                {fieldError(`identificacion.${key}`) ? (
                  <p className="text-xs text-red-600">{fieldError(`identificacion.${key}`)}</p>
                ) : null}
              </div>
            ))}
            {(["fecha_expedicion", "fecha_expiracion"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <label className="text-sm font-medium">{key === "fecha_expedicion" ? "Expedición" : "Expiración"} {key === "fecha_expiracion" && identificacion.sin_vigencia ? "" : "*"}</label>
                <input type="date" disabled={key === "fecha_expiracion" && identificacion.sin_vigencia === true}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={safeInput(identificacion[key])}
                  onChange={(e) => updateBeneficiarioControladorNestedField(index, "persona", "identificacion", key, e.target.value)}
                  onBlur={validateBeneficiariosOnBlur} />
                {fieldError(`identificacion.${key}`) ? (
                  <p className="text-xs text-red-600">{fieldError(`identificacion.${key}`)}</p>
                ) : null}
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox"
            checked={identificacion.sin_vigencia === true}
            onChange={(e) => updateBeneficiarioControladorNestedField(index, "persona", "identificacion", "sin_vigencia", e.target.checked)} />Sin vigencia</label>
        </div>

        <div className="space-y-3 rounded border border-gray-200 p-3">
          <p className="text-sm font-medium">Cargo público</p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {([
              ["actual", "Actualmente desempeño un cargo público"],
              ["previo", "He desempeñado un cargo público"],
              ["familiar", "Un familiar desempeña o desempeñó un cargo público"],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex h-full flex-col space-y-1">
                <label className="flex min-h-12 items-end text-sm font-medium">{label} *</label>
                <select className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={safeInput(cargoPublico[key])}
                  onChange={(e) => updateBeneficiarioControladorDataField(index, "cargo_publico" as any, key, e.target.value)}
                  onBlur={validateBeneficiariosOnBlur}>
                  <option value="">Selecciona</option><option value="si">Sí</option><option value="no">No</option>
                </select>
                {fieldError(`cargo_publico.${key}`) ? (
                  <p className="text-xs text-red-600">{fieldError(`cargo_publico.${key}`)}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {renderBeneficiarioControladorContactoFields(row, index)}
      </div>
    );
  }

  function renderBeneficiariosControladoresList() {
    return (
      <div
        className={
          tipo === "persona_fisica"
            ? "space-y-4 rounded-lg border border-gray-200 bg-white p-4 md:p-5"
            : "space-y-4 rounded border border-gray-200 p-4"
        }
      >
        <div
          className={
            tipo === "persona_fisica"
              ? "flex flex-wrap items-center justify-between gap-3"
              : "flex items-center justify-between"
          }
        >
          <p className="text-sm font-medium">Beneficiario Controlador</p>
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-1 text-sm"
            onClick={() => addBeneficiarioControlador()}
          >
            Agregar
          </button>
        </div>

        {errors["beneficiarios_controladores"] ? (
          <p className="text-xs text-red-600">
            {errors["beneficiarios_controladores"]}
          </p>
        ) : null}

        {beneficiariosControladores.map((row, index) => (
          <div
            key={index}
            className={
              tipo === "persona_fisica"
                ? "space-y-5 rounded-lg border border-gray-200 bg-gray-50/40 p-4"
                : "space-y-4 rounded border border-gray-200 p-4"
            }
          >
            <div
              className={
                tipo === "persona_fisica"
                  ? "flex flex-wrap items-center justify-between gap-3"
                  : "flex items-center justify-between"
              }
            >
              <p className="text-sm font-medium">
                Beneficiario Controlador #{index + 1}
              </p>
              <button
                type="button"
                className="rounded border border-red-300 px-3 py-1 text-sm text-red-700"
                onClick={() => removeBeneficiarioControlador(index)}
              >
                Eliminar
              </button>
            </div>

            <div
              className={`grid grid-cols-1 gap-4 ${
                tipo === "persona_fisica"
                  ? "md:grid-cols-2 xl:grid-cols-3"
                  : "sm:grid-cols-3"
              }`}
            >
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Relación con cliente <span className="text-red-600">*</span>
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${errors[`beneficiarios_controladores.${index}.relacion_con_cliente`] ? "border-red-500" : "border-gray-300"}`}
                  value={row.relacion_con_cliente}
                  onChange={(e) =>
                    updateBeneficiarioControladorCommonField(
                      index,
                      "relacion_con_cliente",
                      e.target.value,
                    )
                  }
                  onBlur={validateBeneficiariosOnBlur}
                />
                {errors[
                  `beneficiarios_controladores.${index}.relacion_con_cliente`
                ] ? (
                  <p className="text-xs text-red-600">
                    {
                      errors[
                        `beneficiarios_controladores.${index}.relacion_con_cliente`
                      ]
                    }
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Tipo de nacionalidad <span className="text-red-600">*</span>
                </label>
                <select
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={safeInput((row.datos_completos as any).persona?.tipo_nacionalidad)}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateBeneficiarioControladorDataField(index, "persona", "tipo_nacionalidad", value);
                    updateBeneficiarioControladorDataField(index, "persona", "nacional_extranjero", value);
                    const nextNacionalidad = value === "nacional" ? MEXICO_CATALOGO_KEY : "";
                    updateBeneficiarioControladorCommonField(index, "nacionalidad", nextNacionalidad);
                    updateBeneficiarioControladorDataField(index, "persona", "nacionalidad", nextNacionalidad);
                    updateBeneficiarioControladorNestedField(index, "contacto", "telefono_detalle", "codigo_pais", value === "nacional" ? "+52" : "");
                  }}
                  onBlur={validateBeneficiariosOnBlur}
                >
                  <option value="">Selecciona</option>
                  <option value="nacional">Nacional</option>
                  <option value="extranjero">Extranjero</option>
                </select>
                {errors[`beneficiarios_controladores.${index}.tipo_nacionalidad`] ? (
                  <p className="text-xs text-red-600">
                    {errors[`beneficiarios_controladores.${index}.tipo_nacionalidad`]}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="text-sm font-medium">
                  Nacionalidad <span className="text-red-600">*</span>
                </label>
                {(row.datos_completos as any).persona?.tipo_nacionalidad === "nacional" ? (
                  <input
                    className="mt-1 w-full rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm"
                    value="México (MX)"
                    readOnly
                    aria-label="Nacionalidad México"
                  />
                ) : (
                  <SearchableSelect label=""
                    value={row.nacionalidad}
                    items={paises.filter((pais) => !isMexicoKey(pais.clave))}
                    error={errors[`beneficiarios_controladores.${index}.nacionalidad`]}
                    onChange={(value) => {
                      updateBeneficiarioControladorCommonField(index, "nacionalidad", value);
                      updateBeneficiarioControladorDataField(index, "persona", "nacionalidad", value);
                    }}
                    onBlur={validateBeneficiariosOnBlur}
                  />
                )}
                {(row.datos_completos as any).persona?.tipo_nacionalidad === "nacional" &&
                errors[`beneficiarios_controladores.${index}.nacionalidad`] ? (
                  <p className="text-xs text-red-600">{errors[`beneficiarios_controladores.${index}.nacionalidad`]}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Porcentaje accionario</label>
                <input
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={row.porcentaje_participacion}
                  onChange={(e) =>
                    updateBeneficiarioControladorCommonField(
                      index,
                      "porcentaje_participacion",
                      e.target.value,
                    )
                  }
                />
              </div>

            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={row.sin_documentacion}
                onChange={(e) =>
                  updateBeneficiarioControladorCommonField(
                    index,
                    "sin_documentacion",
                    e.target.checked,
                  )
                }
              />
              <span>Sin documentación</span>
            </label>

            {renderBeneficiarioControladorPFFields(row, index)}
          </div>
        ))}
      </div>
    );
  }

  function mergeDeepRecord(base: Record<string, any>, incoming: any): Record<string, any> {
    const src = isPlainObject(incoming) ? incoming : {};
    const out: Record<string, any> = { ...base };

    for (const [key, value] of Object.entries(src)) {
      if (isPlainObject(value) && isPlainObject(out[key])) {
        out[key] = mergeDeepRecord(out[key], value);
      } else if (value !== undefined && value !== null) {
        out[key] = value;
      }
    }

    return out;
  }

  function detectRelatedTipoEntidad(row: any): RelatedTipoEntidad {
    const raw = safeInput(row?.tipo_entidad || row?.tipo_tercero).trim();

    if (raw === "persona_fisica" || raw === "persona_moral" || raw === "fideicomiso") {
      return raw;
    }

    const datos = isPlainObject(row?.datos_completos) ? row.datos_completos : {};

    if (isPlainObject(datos?.fideicomiso)) return "fideicomiso";
    if (isPlainObject(datos?.empresa)) return "persona_moral";
    return "persona_fisica";
  }

  function hydrateRelatedPFData(data: any): RelatedPFData {
    const empty = createEmptyRelatedPFData();
    const contacto = mergeDeepRecord(empty.contacto as Record<string, any>, data?.contacto);
    const persona = mergeDeepRecord(empty.persona as Record<string, any>, data?.persona);
    const identificacion = isPlainObject(persona.identificacion)
      ? persona.identificacion
      : {};
    return {
      contacto,
      persona: {
        ...persona,
        fecha_nacimiento: toDateInputValue(persona.fecha_nacimiento),
        identificacion: {
          ...identificacion,
          fecha_expedicion: toDateInputValue(identificacion.fecha_expedicion),
          fecha_expiracion: toDateInputValue(identificacion.fecha_expiracion),
        },
      },
      cargo_publico: mergeDeepRecord(
        empty.cargo_publico || {},
        data?.cargo_publico,
      ),
    };
  }

  function hydrateBeneficiarioControladorPFData(data: any): RelatedPFData {
    const empty = createEmptyRelatedPFData();
    empty.contacto.pais = "";
    empty.contacto.domicilio.pais = "";

    const contacto = mergeDeepRecord(
      empty.contacto as Record<string, any>,
      data?.contacto,
    );
    const persona = mergeDeepRecord(
      empty.persona as Record<string, any>,
      data?.persona,
    );
    const identificacion = isPlainObject(persona.identificacion)
      ? persona.identificacion
      : {};

    return {
      contacto,
      persona: {
        ...persona,
        fecha_nacimiento: toDateInputValue(persona.fecha_nacimiento),
        identificacion: {
          ...identificacion,
          fecha_expedicion: toDateInputValue(identificacion.fecha_expedicion),
          fecha_expiracion: toDateInputValue(identificacion.fecha_expiracion),
        },
      },
      cargo_publico: mergeDeepRecord(
        empty.cargo_publico || {},
        data?.cargo_publico,
      ),
    };
  }

  function hydrateRelatedPMData(data: any): RelatedPMData {
    const empty = createEmptyRelatedPMData();
    return {
      contacto: mergeDeepRecord(empty.contacto as Record<string, any>, data?.contacto),
      empresa: mergeDeepRecord(empty.empresa as Record<string, any>, data?.empresa),
      representante: mergeDeepRecord(empty.representante as Record<string, any>, data?.representante),
    };
  }

  function hydrateRelatedFIDData(data: any): RelatedFIDData {
    const empty = createEmptyRelatedFIDData();
    return {
      contacto: mergeDeepRecord(empty.contacto as Record<string, any>, data?.contacto),
      fideicomiso: mergeDeepRecord(empty.fideicomiso as Record<string, any>, data?.fideicomiso),
      representante: mergeDeepRecord(empty.representante as Record<string, any>, data?.representante),
    };
  }

  function hydrateRelatedRecursoRow(row: any): RelatedRecursoRow {
    if (!isPlainObject(row)) {
      return createEmptyRelatedRecurso();
    }

    if (!isPlainObject(row?.datos_completos) && ("tipo_tercero" in row || "nombre_razon_social" in row)) {
      return buildCanonicalRecursoRowFromLegacy(normalizeRecursoTerceroRow(row));
    }

    const tipo_entidad = detectRelatedTipoEntidad(row);
    const datos_completos =
      tipo_entidad === "persona_fisica"
        ? hydrateRelatedPFData(row?.datos_completos)
        : tipo_entidad === "persona_moral"
          ? hydrateRelatedPMData(row?.datos_completos)
          : hydrateRelatedFIDData(row?.datos_completos);

    return {
      tipo_entidad,
      nombre_entidad:
        deriveRelatedNombreEntidad(tipo_entidad, datos_completos) ||
        safeInput(row?.nombre_entidad).trim(),
      nacionalidad: safeInput(row?.nacionalidad || "MEX").trim() || "MEX",
      relacion_con_cliente: safeInput(row?.relacion_con_cliente).trim(),
      sin_documentacion: !!row?.sin_documentacion,
      observaciones: safeInput(row?.observaciones).trim(),
      datos_completos,
    };
  }

  function hydrateBeneficiarioControladorRow(row: any): BeneficiarioControladorRow {
    if (!isPlainObject(row)) {
      return createEmptyBeneficiarioControlador();
    }

    if (!isPlainObject(row?.datos_completos) && ("nombres" in row || "apellido_paterno" in row || "apellido_materno" in row)) {
      return buildCanonicalDuenoRowFromLegacy(normalizeDuenoBeneficiarioRow(row));
    }

    const datos_completos = hydrateBeneficiarioControladorPFData(
      row?.datos_completos,
    );

    return {
      nombre_entidad:
        deriveRelatedNombreEntidad("persona_fisica", datos_completos) ||
        safeInput(row?.nombre_entidad).trim(),
      nacionalidad: safeInput(
        row?.nacionalidad ?? datos_completos.persona?.nacionalidad ?? "",
      ).trim(),
      relacion_con_cliente: safeInput(
        row?.relacion_con_cliente ??
        datos_completos.persona?.relacion_con_cliente,
      ).trim(),
      porcentaje_participacion: safeInput(row?.porcentaje_participacion).trim(),
      sin_documentacion: !!row?.sin_documentacion,
      observaciones: safeInput(row?.observaciones).trim(),
      datos_completos,
    };
  }

  function hydrateRelatedCollectionsFromDatos(datos: any) {
    const safeDatos = isPlainObject(datos) ? datos : {};

    const recursosRaw = Array.isArray(safeDatos?.recursos_terceros)
      ? safeDatos.recursos_terceros
      : [];
    const duenosRaw = Array.isArray(safeDatos?.beneficiarios_controladores)
      ? safeDatos.beneficiarios_controladores
      : Array.isArray(safeDatos?.duenos_beneficiarios)
        ? safeDatos.duenos_beneficiarios
        : [];

    const relatedRecursos = recursosRaw.map(hydrateRelatedRecursoRow);
    const beneficiariosControladores = duenosRaw.map(hydrateBeneficiarioControladorRow);

    return {
      relatedRecursosAplica:
        !!safeDatos?.recursos_terceros_aplica || relatedRecursos.length > 0,
      relatedRecursos,
      beneficiariosControladoresAplica:
        !!safeDatos?.beneficiarios_controladores_aplica ||
        !!safeDatos?.duenos_beneficiarios_aplica ||
        beneficiariosControladores.length > 0,
      beneficiariosControladores,
    };
  }

  function safeInput(value: any): string {
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function safeBool(value: any): boolean {
    return value === true;
  }

  function createEmptyRecursoTercero(): RecursoTerceroItem {
    return {
      tipo_tercero: "persona_fisica",
      nombre_razon_social: "",
      relacion_con_cliente: "",
      actividad_giro: "",
      nacionalidad: "MEX",
      sin_documentacion: false,
      rfc: "",
      curp: "",
      fecha_nacimiento: "",
      observaciones: "",
    };
  }

  function createEmptyDuenoBeneficiario(): DuenoBeneficiarioItem {
    return {
      nombres: "",
      apellido_paterno: "",
      apellido_materno: "",
      fecha_nacimiento: "",
      nacionalidad: "MEX",
      relacion_con_cliente: "",
      rfc: "",
      curp: "",
      porcentaje_participacion: "",
      sin_documentacion: false,
      observaciones: "",
    };
  }

  function normalizeRecursoTerceroRow(row: any): RecursoTerceroItem {
    return {
      tipo_tercero: safeInput(row?.tipo_tercero || "persona_fisica"),
      nombre_razon_social: safeInput(row?.nombre_razon_social ?? row?.nombre_completo),
      relacion_con_cliente: safeInput(row?.relacion_con_cliente ?? row?.relacion),
      actividad_giro: safeInput(row?.actividad_giro),
      nacionalidad: safeInput(row?.nacionalidad || "MEX"),
      sin_documentacion: safeBool(row?.sin_documentacion),
      rfc: safeInput(row?.rfc),
      curp: safeInput(row?.curp),
      fecha_nacimiento: safeInput(row?.fecha_nacimiento),
      observaciones: safeInput(row?.observaciones),
    };
  }

  function normalizeDuenoBeneficiarioRow(row: any): DuenoBeneficiarioItem {
    return {
      nombres: safeInput(row?.nombres),
      apellido_paterno: safeInput(row?.apellido_paterno),
      apellido_materno: safeInput(row?.apellido_materno),
      fecha_nacimiento: safeInput(row?.fecha_nacimiento),
      nacionalidad: safeInput(row?.nacionalidad || "MEX"),
      relacion_con_cliente: safeInput(row?.relacion_con_cliente ?? row?.relacion),
      rfc: safeInput(row?.rfc),
      curp: safeInput(row?.curp),
      porcentaje_participacion: safeInput(row?.porcentaje_participacion),
      sin_documentacion: safeBool(row?.sin_documentacion),
      observaciones: safeInput(row?.observaciones),
    };
  }

  function addRecursoTerceroRow() {
    setRecursosTerceros((prev) => [...prev, createEmptyRecursoTercero()]);
  }

  function updateRecursoTerceroRow<K extends keyof RecursoTerceroItem>(
    index: number,
    key: K,
    value: RecursoTerceroItem[K],
  ) {
    setRecursosTerceros((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
  }

  function removeRecursoTerceroRow(index: number) {
    setRecursosTerceros((prev) => prev.filter((_, i) => i !== index));
  }

  function addDuenoBeneficiarioRow() {
    setDuenosBeneficiarios((prev) => [...prev, createEmptyDuenoBeneficiario()]);
  }

  function updateDuenoBeneficiarioRow<K extends keyof DuenoBeneficiarioItem>(
    index: number,
    key: K,
    value: DuenoBeneficiarioItem[K],
  ) {
    setDuenosBeneficiarios((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
  }

  function removeDuenoBeneficiarioRow(index: number) {
    setDuenosBeneficiarios((prev) => prev.filter((_, i) => i !== index));
  }
  function buildContacto() {
    const telefonoStr = buildTelefonoE164Like(telCodigoPais, telNumero, telExt);

    return {
      pais: valueToCatalogKey(contactoPais),
      email: email.trim(),
      telefono: telefonoStr,
      telefono_detalle: {
        codigo_pais: telCodigoPais.trim(),
        numero: telNumero.trim(),
        ext: telExt.trim() || null,
      },
      domicilio: {
        calle: domCalle.trim(),

        numero: domNumero.trim(),

        interior: domInterior.trim() || null,

        colonia: domColonia.trim(),

        municipio: domMunicipio.trim(),

        ciudad_delegacion: domCiudadDelegacion.trim(),

        codigo_postal: domCP.trim(),

        estado: domEstado.trim(),

        pais: domPais.trim(),
      },
    };
  }

  function buildPayload() {
    // NORMALIZACIÓN: evita que PF termine enviando fideicomiso por valores inesperados
    const tipoFromRef = tipoRef.current?.value as TipoCliente | undefined;
    const tipoCliente: TipoCliente =
      tipoFromRef === "persona_fisica" ||
      tipoFromRef === "persona_moral" ||
      tipoFromRef === "fideicomiso"
        ? tipoFromRef
        : tipo === "persona_fisica" ||
            tipo === "persona_moral" ||
            tipo === "fideicomiso"
          ? tipo
          : "persona_fisica";

    const contacto = buildContacto();
    const beneficiariosControladoresContract =
      buildBeneficiariosControladoresContract({
        tipoCliente,
        aplica:
          tipoCliente === "persona_fisica"
            ? beneficiariosControladoresAplica
            : true,
        beneficiarios: buildBeneficiariosControladoresPayload(),
      });

    const empresa_id = Number(empresaId);

    const telefonoStr = buildTelefonoE164Like(telCodigoPais, telNumero, telExt);
    const telefono = buildTelefonoE164Like(telCodigoPais, telNumero, telExt);

    // NORMALIZACIÓN: evita que PF termine enviando fideicomiso por valores inesperados
    if (tipoCliente === "persona_fisica") {
      const act = actividades.find((x) => x.clave === pfActividad);
      const normFecha = normalizeToYYYYMMDD(pfFechaNac) ?? pfFechaNac.trim();

      const idExp =
        normalizeToYYYYMMDD(pfIdExpedicion) ?? pfIdExpedicion.trim();
      const idExpi = pfIdSinVigencia
        ? null
        : normalizeToYYYYMMDD(pfIdExpiracion) ?? pfIdExpiracion.trim();
      const payload = {
        empresa_id: parseInt(empresaId, 10),
        tipo_cliente: tipoCliente,
        nombre_entidad: nombreEntidad.trim(),
        nacionalidad: valueToCatalogKey(nacionalidad),
        contacto,

        datos_completos: {
          contacto,
// Placeholder mínimo; se reemplaza por captura recurrente PF completa
persona: {
            tipo: "persona_fisica",
            rfc: pfRfc.trim().toUpperCase(),
            curp: pfCurp.trim().toUpperCase(),
            fecha_nacimiento: normFecha,
            nombres: pfNombres.trim(),
            apellido_paterno: pfApPat.trim(),
            apellido_materno: pfApMat.trim(),
            pais_nacimiento: valueToCatalogKey(contactoPais),
            residencia: pfResidencia.trim(),
            nacional_extranjero: tipoNacionalidad,
            CargoPublico: pfCargoPublicoActual.trim(),
            actividad_economica: act
              ? { clave: act.clave, descripcion: act.descripcion }
              : pfActividad,
            identificacion: {
              tipo: pfIdTipo.trim(),
              autoridad: pfIdAutoridad.trim(),
              numero: pfIdNumero.trim(),
              fecha_expedicion: idExp,
              fecha_expiracion: idExpi,
              sin_vigencia: pfIdSinVigencia,
            },
          },
          cargo_publico: {
            actual: pfCargoPublicoActual.trim(),
            previo: pfCargoPublicoPrevio.trim(),
            familiar: pfCargoPublicoFamiliar.trim(),
          },
          ...beneficiariosControladoresContract,
        },

      };
      return payload;
    }


    if (tipoCliente === "persona_moral") {
      const giro = giros.find((x) => x.clave === pmGiro);
      const repExp =
        normalizeToYYYYMMDD(pmRepIdExpedicion) ?? pmRepIdExpedicion.trim();
      const repExpi =
        normalizeToYYYYMMDD(pmRepIdExpiracion) ?? pmRepIdExpiracion.trim();

      const pmFechaNorm =
        normalizeToYYYYMMDD(pmFechaConst) ?? pmFechaConst.trim();
      return {
        empresa_id: parseInt(empresaId, 10),
        tipo_cliente: tipoCliente,
        nombre_entidad: nombreEntidad.trim(),
        nacionalidad: valueToCatalogKey(nacionalidad),
        contacto,

        datos_completos: {
          contacto,

          ...beneficiariosControladoresContract,
          representante_es_accionista: pmRepEsAccionista,
          accionista_tercero: pmRepEsAccionista
            ? {
                nombres: pmRepNombres.trim(),
                apellido_paterno: pmRepApPat.trim(),
                apellido_materno: pmRepApMat.trim(),
                fecha_nacimiento:
                  normalizeToYYYYMMDD(pmRepFechaNac) ?? pmRepFechaNac.trim(),
                porcentaje_accionario: pmAccPct.trim(),
                nacionalidad: valueToCatalogKey(pmRepNacionalidad),
                rfc: pmRepRfc.trim().toUpperCase(),
                curp: pmRepCurp.trim().toUpperCase(),
                actividad_giro: giro ? giro.clave : pmGiro.trim(),
                relacion: pmAccRelacion.trim(),
              }
            : null,
          empresa: {
            tipo: "persona_moral",
            rfc: pmRfc.trim().toUpperCase(),
            regimen_capital: pmRegimenCapital.trim(),
            fecha_constitucion: pmFechaNorm,
            giro_mercantil: giro
              ? { clave: giro.clave, descripcion: giro.descripcion }
              : pmGiro,
            subtipo_pm: pmSubtipoPm.trim(),
            rsi_aplica: pmSubtipoPm.trim() === "pm_rsi",
            rsi_subtipo: pmSubtipoPm.trim() === "pm_rsi" ? pmRsiSubtipo.trim() : null,

            representante: {
              nombres: pmRepNombres.trim(),
              apellido_paterno: pmRepApPat.trim(),
              apellido_materno: pmRepApMat.trim(),
              fecha_nacimiento:
                normalizeToYYYYMMDD(pmRepFechaNac) ?? pmRepFechaNac.trim(),
              nacionalidad: valueToCatalogKey(pmRepNacionalidad),
              curp: pmRepCurp.trim().toUpperCase(),
              rfc: pmRepRfc.trim().toUpperCase(),
              domicilio: {
                calle: pmRepDomCalle.trim(),
                numero: pmRepDomNumero.trim(),
                interior: pmRepDomInterior.trim() || null,
                colonia: pmRepDomColonia.trim(),
                municipio: pmRepDomMunicipio.trim(),
                ciudad_delegacion: pmRepDomCiudadDelegacion.trim(),
                codigo_postal: pmRepDomCP.trim(),
                estado: pmRepDomEstado.trim(),
                pais: "MEX",
              },
              identificacion: {
                tipo: pmRepIdTipo.trim(),
                autoridad: pmRepIdAutoridad.trim(),
                numero: pmRepIdNumero.trim(),
                fecha_expedicion: repExp,
                fecha_expiracion: repExpi,
              },
            },
          },
        },
      };

    }

    // fideicomiso
    return {
      empresa_id: parseInt(empresaId, 10),
      tipo_cliente: "fideicomiso",
      nombre_entidad: nombreEntidad.trim(),
      nacionalidad: valueToCatalogKey(nacionalidad),
      contacto,

      datos_completos: {
        contacto,
        fideicomiso: {
          identificador: fidIdentificador.trim(),
          denominacion_fiduciario: fidDenominacionFiduciario.trim(),
          rfc_fiduciario: fidRfcFiduciario.trim().toUpperCase(),
          fideicomiso_nombre: fidNombre.trim(),
        },
        representante: {
          nombre_completo: fidRepNombreCompleto.trim(),
          rfc: fidRepRfc.trim().toUpperCase(),
          curp: fidRepCurp.trim().toUpperCase(),
          fecha_nacimiento:
            normalizeToYYYYMMDD(fidRepFechaNac) ?? fidRepFechaNac.trim(),
          identificacion: {
            tipo: fidRepIdTipo.trim(),
            autoridad: fidRepIdAutoridad.trim(),
            numero: fidRepIdNumero.trim(),
            fecha_expedicion:
              normalizeToYYYYMMDD(fidRepIdExpedicion) ??
              fidRepIdExpedicion.trim(),
            fecha_expiracion:
              normalizeToYYYYMMDD(fidRepIdExpiracion) ??
              fidRepIdExpiracion.trim(),
          },
        },
        ...beneficiariosControladoresContract,
      },
    };
  }

  async function executeRegistration() {
    if (registrationLockRef.current || loading) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    registrationLockRef.current = true;
    setFatal(null);
    const payload = buildPayload();

    if (sessionRole === "cliente") {
      delete (payload as Record<string, unknown>).empresa_id;
    }

    if (sessionRole !== "consultor" && operacionVulnerableClave) {
      const pldPayload: PldSelectionWritePayload = {
        operacion_vulnerable_clave: operacionVulnerableClave,
      };
      if (empresaActividades.length > 1 && actividadVulnerableClave) {
        pldPayload.actividad_vulnerable_clave = actividadVulnerableClave;
      }
      Object.assign(payload, pldPayload);
    }

    if (tipo === "persona_fisica") {
      payload.nombre_entidad = [pfNombres, pfApPat, pfApMat]
        .map((v) => safeInput(v).trim())
        .filter(Boolean)
        .join(" ");
    }

    if (tipo === "persona_moral") {
      payload.nombre_entidad = safeInput(pmRazonSocial).trim();
      const datosCompletosPm = (payload.datos_completos || {}) as Record<string, any>;
      datosCompletosPm.empresa = {
        ...(datosCompletosPm.empresa || {}),
        razon_social: safeInput(pmRazonSocial).trim(),
        nombre_entidad: safeInput(pmRazonSocial).trim(),
      };
      (payload as any).datos_completos = datosCompletosPm;
    }

    if (tipo === "fideicomiso") {
      payload.nombre_entidad = safeInput(fidNombre).trim();
      const datosCompletosFid = (payload.datos_completos || {}) as Record<string, any>;
      datosCompletosFid.fideicomiso = {
        ...(datosCompletosFid.fideicomiso || {}),
        nombre_fideicomiso: safeInput(fidNombre).trim(),
        nombre_entidad: safeInput(fidNombre).trim(),
      };
      (payload as any).datos_completos = datosCompletosFid;
    }

    try {
      setLoading(true);
      const data = await registrarCliente<{
        ok: boolean;
        cliente?: { id?: number };
      }>(payload as Record<string, unknown>);

      const id = data?.cliente?.id;
      if (!id) {
        setFatal(
          "Registrado, pero no se recibió id. Revisa respuesta del backend.",
        );
        return;
      }

      if (tipo === "persona_fisica") {
        setPfConfirmationOpen(false);
        setSuccessClient({ id, tipo: "persona_fisica" });
      } else if (tipo === "persona_moral") {
        setSuccessClient({ id, tipo: "persona_moral" });
      } else {
        router.push(`/cliente/clientes/${id}`);
      }
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Error inesperado");
      if (/actividad|operaci[oó]n|configuraci[oó]n pld/i.test(message)) {
        setPldSelectionError(message);
      }
      setFatal(message);
      setPfConfirmationOpen(false);
    } finally {
      registrationLockRef.current = false;
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || pfConfirmationOpen || successClient) return;
    if (tieneMatrizPublicadaActiva === false) {
      setFatal("No es posible registrar clientes para esta empresa porque aún no cuenta con una matriz PT/GR publicada y activa.");
      return;
    }
    if (tieneMatrizPublicadaActiva === null) {
      setFatal("No fue posible confirmar si la empresa cuenta con una matriz PT/GR publicada y activa.");
      return;
    }
    console.log("[DEBUG tipo submit]", {
      tipo,
      tipoRef: tipoRef.current?.value,
    });
    setFatal(null);

    const parsedEmpresaId = Number(empresaId);
    if (
      empresaLoading ||
      empresaError ||
      !sessionRole ||
      !Number.isInteger(parsedEmpresaId) ||
      parsedEmpresaId < 1
    ) {
      setErr("empresa_id", "Empresa es obligatoria");
      setFatal(
        empresaError || "Selecciona una empresa válida antes de registrar",
      );
      return;
    }

    if (
      sessionRole !== "consultor"
      && empresaActividades.length > 1
      && Boolean(actividadVulnerableClave) !== Boolean(operacionVulnerableClave)
    ) {
      const message =
        actividadVulnerableClave
          ? "Selecciona una operación específica o deja pendiente toda la configuración PLD."
          : "Selecciona primero una actividad vulnerable para la operación.";
      setPldSelectionError(message);
      setFatal(message);
      return;
    }
    setPldSelectionError("");

    const focusFirstInvalidField = () => {
      window.setTimeout(() => {
        const firstInvalid = document.querySelector<HTMLElement>(
          "form .border-red-500",
        );
        firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
        firstInvalid?.focus();
      }, 0);
    };

    if (tipo === "persona_fisica") {
      const nacionalidadOk = validateA2Nacionalidad();
      const domicilioOk = validateB1Domicilio();
      const formularioOk = validator.validateAll();
      const beneficiariosOk = validateBeneficiariosControladoresBeforeSubmit();

      if (
        !nacionalidadOk ||
        !domicilioOk ||
        !formularioOk ||
        !beneficiariosOk
      ) {
        setFatal("Corrige los campos marcados en rojo.");
        focusFirstInvalidField();
        return;
      }
    } else {
      if (!validateA2Nacionalidad()) return;
      if (!validateB1Domicilio()) return;
      if (!validator.validateAll()) {
        setFatal("Corrige los campos marcados en rojo.");
        return;
      }
    }

    if (tipo === "fideicomiso") {
      let ok = true;

      const fid = (fidIdentificador || "").trim();
      const den = (fidDenominacionFiduciario || "").trim();
      const rfcF = (fidRfcFiduciario || "").trim().toUpperCase();
      const nom = (fidNombre || "").trim();

      const repNom = (fidRepNombreCompleto || "").trim();
      const repRfc = (fidRepRfc || "").trim().toUpperCase();
      const repCurp = (fidRepCurp || "").trim().toUpperCase();
      const repFecha = (fidRepFechaNac || "").trim();
      const repFechaNorm = normalizeToYYYYMMDD(repFecha) ?? repFecha;

      if (!fid) { setErr("fideicomiso.identificador", "Identificador del fideicomiso es obligatorio"); ok = false; }
      if (!den) { setErr("fideicomiso.denominacion_fiduciario", "Denominacion del fiduciario es obligatoria"); ok = false; }
      if (!rfcF) { setErr("fideicomiso.rfc_fiduciario", "RFC del fiduciario es obligatorio"); ok = false; }
      else if (!isRFC(rfcF)) { setErr("fideicomiso.rfc_fiduciario", "RFC del fiduciario invalido"); ok = false; }

      if (!nom) { setErr("fideicomiso.fideicomiso_nombre", "Nombre del fideicomiso es obligatorio"); ok = false; }

      if (!repNom) { setErr("representante.nombre_completo", "Nombre completo del representante es obligatorio"); ok = false; }
      if (!repRfc) { setErr("representante.rfc", "RFC del representante es obligatorio"); ok = false; }
      else if (!isRFC(repRfc)) { setErr("representante.rfc", "RFC del representante invalido"); ok = false; }

      if (!repCurp) { setErr("representante.curp", "CURP del representante es obligatorio"); ok = false; }
      else if (!isCURP(repCurp)) { setErr("representante.curp", "CURP del representante invalido"); ok = false; }

      if (!repFecha) { setErr("representante.fecha_nacimiento", "Fecha de nacimiento del representante es obligatoria"); ok = false; }
      else if (!isYYYYMMDD(repFechaNorm)) { setErr("representante.fecha_nacimiento", "Fecha de nacimiento del representante invalida (AAAAMMDD)"); ok = false; }

      if (!ok) {
        setFatal("Completa la seccion de Fideicomiso para continuar.");
        return;
      }
    }

    if (!validateBeneficiariosControladoresBeforeSubmit()) {
      return;
    }

    if (!validatePmAccionistaFields()) {
      setFatal("Corrige los datos del representante accionista para continuar.");
      return;
    }

    if (tipo === "persona_fisica") {
      setPfConfirmationOpen(true);
      return;
    }

    await executeRegistration();
  }

    useEffect(() => {
    if (tipo === "persona_fisica") {
      setNombreEntidad(
        [pfNombres, pfApPat, pfApMat]
          .map((v) => safeInput(v).trim())
          .filter(Boolean)
          .join(" ")
      );
    } else if (tipo === "persona_moral") {
      setNombreEntidad(safeInput(pmRazonSocial).trim());
    } else if (tipo === "fideicomiso") {
      setNombreEntidad(safeInput(fidNombre).trim());
    }
  }, [tipo, pfNombres, pfApPat, pfApMat, pmRazonSocial, fidNombre]);


  const showAviso = tipo === "persona_fisica" || tipo === "persona_moral" || tipo === "fideicomiso";
  const selectedActivityName =
    empresaActividades.find(
      (actividad) => actividad.clave === actividadVulnerableClave,
    )?.nombre || "Pendiente";
  const selectedOperationName =
    operacionesVulnerables.find(
      (operacion) => operacion.clave === operacionVulnerableClave,
    )?.nombre || "Pendiente";
  const pfFullName = [pfNombres, pfApPat, pfApMat]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
  const pfDomicilioResumen = [
    domCalle.trim(),
    domNumero.trim(),
    domInterior.trim() ? `Int ${domInterior.trim()}` : "",
    domColonia.trim(),
    domMunicipio.trim(),
    domCiudadDelegacion.trim(),
    domEstado.trim(),
    domCP.trim(),
    domPais.trim(),
  ].filter(Boolean).join(", ");
  const pfIdentificacionResumen = [
    pfIdTipo.trim(),
    pfIdNumero.trim(),
    pfIdAutoridad.trim(),
    pfIdExpedicion.trim(),
    pfIdSinVigencia ? "Sin vigencia" : pfIdExpiracion.trim(),
  ].filter(Boolean).join(" · ");
  const beneficiariosResumen = beneficiariosControladoresAplica
    ? beneficiariosControladores.length > 0
      ? beneficiariosControladores
          .map((row) =>
            deriveRelatedNombreEntidad("persona_fisica", row.datos_completos),
          )
          .filter(Boolean)
          .join(", ")
      : "Pendiente de captura"
    : "No aplica";

  // 🔴 GUARD GLOBAL — evita render en build/prerender
  if (!mounted) return <></>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Registrar Cliente</h1>

      {showAviso ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {AVISO_LEGAL}
        </div>
      ) : null}

      {fatal ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {fatal}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* BASE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo de cliente *</label>
            <select
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              ref={tipoRef}
              value={tipo}
              onChange={(e) =>
                handleTipoClienteChange(e.target.value as TipoCliente)
              }
            >
              <option value="persona_fisica">Persona Física</option>
              <option value="persona_moral">Persona Moral</option>
              <option value="fideicomiso">Fideicomiso</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Empresa <span className="text-red-600">*</span>
            </label>

            {empresaLoading ? (
              <div className="rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                Cargando empresa...
              </div>
            ) : sessionRole === "cliente" && empresaId ? (
              <div className="rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900">
                {empresaNombre} (ID: {empresaId})
              </div>
            ) : sessionRole === "admin" || sessionRole === "consultor" ? (
              <select
                className={`w-full rounded border px-3 py-2 text-sm ${errors["empresa_id"] || empresaError ? "border-red-500" : "border-gray-300"}`}
                value={empresaId}
                onChange={(e) => {
                  const nextEmpresaId = e.target.value;
                  const nextEmpresa = empresas.find(
                    (empresa) => String(empresa.id) === nextEmpresaId,
                  );
                  const nextActividades =
                    nextEmpresa?.actividades_vulnerables ?? [];
                  const nextIndicador = nextEmpresa?.tiene_matriz_publicada_activa ?? null;
                  setEmpresaId(nextEmpresaId);
                  setEmpresaActividades(nextActividades);
                  setTieneMatrizPublicadaActiva(nextIndicador);
                  setFatal((current) => {
                    const isMatrixMessage =
                      current === "No es posible registrar clientes para esta empresa porque aún no cuenta con una matriz PT/GR publicada y activa." ||
                      current === "No fue posible confirmar si la empresa cuenta con una matriz PT/GR publicada y activa.";
                    if (nextIndicador === false) {
                      return "No es posible registrar clientes para esta empresa porque aún no cuenta con una matriz PT/GR publicada y activa.";
                    }
                    return isMatrixMessage ? null : current;
                  });
                  setActividadVulnerableClave(
                    nextActividades.length === 1
                      ? nextActividades[0].clave
                      : "",
                  );
                  setOperacionVulnerableClave("");
                  setPldSelectionError("");
                  setErr("empresa_id");
                }}
                onBlur={() => validator.validateField("empresa_id")}
              >
                <option value="">Selecciona una empresa</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nombre_legal} (ID: {empresa.id})
                  </option>
                ))}
              </select>
            ) : null}

            {empresaError ? (
              <p className="text-xs text-red-600">{empresaError}</p>
            ) : null}
            {errors["empresa_id"] ? (
              <p className="text-xs text-red-600">{errors["empresa_id"]}</p>
            ) : null}
          </div>

          {!empresaLoading && empresaId ? (
            <div className="md:col-span-3">
              <PldSelectionFields
                actividades={empresaActividades}
                actividadClave={actividadVulnerableClave}
                operacionClave={operacionVulnerableClave}
                disabled={sessionRole === "consultor"}
                error={pldSelectionError}
                onActividadChange={(clave) => {
                  setActividadVulnerableClave(clave);
                  setPldSelectionError("");
                }}
                onOperacionChange={(clave) => {
                  setOperacionVulnerableClave(clave);
                  setPldSelectionError("");
                }}
                onOperacionOptionsChange={setOperacionesVulnerables}
              />
            </div>
          ) : null}

          <div
            tabIndex={-1}
            className={`space-y-2 rounded-md border p-3 ${
              a2Errors.tipoNacionalidad
                ? "border-red-500"
                : "border-gray-200"
            }`}
          >
            <label className="text-sm font-medium">
              Tipo de nacionalidad <span className="text-red-600">*</span>
            </label>

            <div className="flex flex-wrap gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="tipoNacionalidad"
                  value="nacional"
                  checked={tipoNacionalidad === "nacional"}
                  onChange={() => handleTipoNacionalidadChange("nacional")}
                />
                Nacional
              </label>

              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="tipoNacionalidad"
                  value="extranjero"
                  checked={tipoNacionalidad === "extranjero"}
                  onChange={() => handleTipoNacionalidadChange("extranjero")}
                />
                Extranjero
              </label>
            </div>

            {a2Errors.tipoNacionalidad ? (
              <p className="text-xs text-red-600">{a2Errors.tipoNacionalidad}</p>
            ) : null}

            <p className="text-xs text-gray-500">
              Nacional fija México solo en Nacionalidad. El país de nacimiento/constitución se selecciona manualmente.
            </p>
          </div>

          <SearchableSelect
            label="Nacionalidad"
            required
            value={nacionalidad}
            items={paises}
            error={a2Errors.nacionalidad || errors["nacionalidad"]}
            onChange={(v) => {
              if (tipoNacionalidad !== "nacional") setNacionalidad(v);
            }}
            onBlur={() => validator.validateField("nacionalidad")}
          />

          <SearchableSelect
            label={contactoPaisLabel}
            required
            value={contactoPais}
            items={paises}
            error={a2Errors["contacto.pais"] || errors["contacto.pais"]}
            onChange={(v) => {
              setContactoPais(v);
            }}
            onBlur={() => validator.validateField("contacto.pais")}
          />

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${errors["contacto.email"] ? "border-red-500" : "border-gray-300"}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => validator.validateField("contacto.email")}
              placeholder="correo@dominio.com"
            />
            {errors["contacto.email"] ? (
              <p className="text-xs text-red-600">{errors["contacto.email"]}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Teléfono (código país) <span className="text-red-600">*</span>
            </label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${
                errors["contacto.telefono.codigo_pais"]
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
              value={telCodigoPais}
              onChange={(e) => setTelCodigoPais(e.target.value)}
              onBlur={() =>
                validator.validateField("contacto.telefono.codigo_pais")
              }
              placeholder="+52"
            />
            {errors["contacto.telefono.codigo_pais"] ? (
              <p className="text-xs text-red-600">
                {errors["contacto.telefono.codigo_pais"]}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Teléfono (número) <span className="text-red-600">*</span>
            </label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${
                errors["contacto.telefono.numero"]
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
              value={telNumero}
              onChange={(e) => setTelNumero(e.target.value)}
              onBlur={() => validator.validateField("contacto.telefono.numero")}
              placeholder="5512345678"
            />
            {errors["contacto.telefono.numero"] ? (
              <p className="text-xs text-red-600">
                {errors["contacto.telefono.numero"]}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Extensión</label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${
                errors["contacto.telefono.ext"]
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
              value={telExt}
              onChange={(e) => setTelExt(e.target.value)}
              onBlur={() => validator.validateField("contacto.telefono.ext")}
              placeholder="123"
            />
            {errors["contacto.telefono.ext"] ? (
              <p className="text-xs text-red-600">
                {errors["contacto.telefono.ext"]}
              </p>
            ) : null}
          </div>
        </div>

        {/* DOMICILIO (CONTACTO) */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Domicilio (contacto)</h2>
          <p className="text-xs text-gray-500">
            Para domicilios en México, el código postal se consulta en el catálogo oficial del sistema.
            Para otros países, la captura permanece manual.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`${tipo === "persona_fisica" ? "order-[7]" : ""} space-y-1`}>
              <label className="text-sm font-medium">
                Calle <span className="text-red-600">*</span>
              </label>
              <input
                className={`w-full rounded border px-3 py-2 text-sm ${errors["contacto.domicilio.calle"] ? "border-red-500" : "border-gray-300"}`}
                value={domCalle}
                onChange={(e) => setDomCalle(e.target.value)}
                onBlur={() =>
                  validator.validateField("contacto.domicilio.calle")
                }
              />
              {errors["contacto.domicilio.calle"] ? (
                <p className="text-xs text-red-600">
                  {errors["contacto.domicilio.calle"]}
                </p>
              ) : null}
            </div>

            <div className={`${tipo === "persona_fisica" ? "order-[8]" : ""} space-y-1`}>
              <label className="text-sm font-medium">
                Número <span className="text-red-600">*</span>
              </label>
              <input
                className={`w-full rounded border px-3 py-2 text-sm ${errors["contacto.domicilio.numero"] ? "border-red-500" : "border-gray-300"}`}
                value={domNumero}
                onChange={(e) => setDomNumero(e.target.value)}
                onBlur={() =>
                  validator.validateField("contacto.domicilio.numero")
                }
              />
              {errors["contacto.domicilio.numero"] ? (
                <p className="text-xs text-red-600">
                  {errors["contacto.domicilio.numero"]}
                </p>
              ) : null}
            </div>

            <div className={`${tipo === "persona_fisica" ? "order-[9]" : ""} space-y-1`}>
              <label className="text-sm font-medium">Interior</label>
              <input
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={domInterior}
                onChange={(e) => setDomInterior(e.target.value)}
              />
            </div>

            {aplicaCpMexico && domColoniasOpciones.length > 1 ? (
              <div className={`${tipo === "persona_fisica" ? "order-[3]" : ""} space-y-1`}>
                <label className="text-sm font-medium">
                  Colonia <span className="text-red-600">*</span>
                </label>
                <select
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    (b1Errors["contacto.domicilio.colonia"] || errors["contacto.domicilio.colonia"]) ? "border-red-500" : "border-gray-300"
                  }`}
                  value={domColonia}
                  onChange={(e) => {
                    setDomColonia(e.target.value);
                    setB1Errors({});
                  }}
                  onBlur={() =>
                    validator.validateField("contacto.domicilio.colonia")
                  }
                >
                  <option value="">Selecciona colonia</option>
                  {domColoniasOpciones.map((colonia) => (
                    <option key={colonia} value={colonia}>
                      {colonia}
                    </option>
                  ))}
                </select>
                {(b1Errors["contacto.domicilio.colonia"] || errors["contacto.domicilio.colonia"]) ? (
                  <p className="text-xs text-red-600">
                    {b1Errors["contacto.domicilio.colonia"] || errors["contacto.domicilio.colonia"]}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className={`${tipo === "persona_fisica" ? "order-[3]" : ""} space-y-1`}>
                <label className="text-sm font-medium">
                  Colonia <span className="text-red-600">*</span>
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    (b1Errors["contacto.domicilio.colonia"] || errors["contacto.domicilio.colonia"]) ? "border-red-500" : "border-gray-300"
                  }`}
                  value={domColonia}
                  onChange={(e) => {
                    setDomColonia(e.target.value);
                    setB1Errors({});
                  }}
                  onBlur={() =>
                    validator.validateField("contacto.domicilio.colonia")
                  }
                />
                {(b1Errors["contacto.domicilio.colonia"] || errors["contacto.domicilio.colonia"]) ? (
                  <p className="text-xs text-red-600">
                    {b1Errors["contacto.domicilio.colonia"] || errors["contacto.domicilio.colonia"]}
                  </p>
                ) : null}
              </div>
            )}

            <div className={`${tipo === "persona_fisica" ? "order-[4]" : ""} space-y-1`}>
              <label className="text-sm font-medium">
                Municipio <span className="text-red-600">*</span>
              </label>
              <input
                className={`w-full rounded border px-3 py-2 text-sm ${errors["contacto.domicilio.municipio"] ? "border-red-500" : "border-gray-300"}`}
                value={domMunicipio}
                onChange={(e) => setDomMunicipio(e.target.value)}
                readOnly={
                  tipo === "persona_fisica"
                    ? domCatalogoTerritorial.municipio
                    : aplicaCpMexico && domColoniasOpciones.length > 0
                }
                onBlur={() =>
                  validator.validateField("contacto.domicilio.municipio")
                }
              />
              {errors["contacto.domicilio.municipio"] ? (
                <p className="text-xs text-red-600">
                  {errors["contacto.domicilio.municipio"]}
                </p>
              ) : null}
            </div>

            <div className={`${tipo === "persona_fisica" ? "order-[5]" : ""} space-y-1`}>
              <label className="text-sm font-medium">
                Ciudad/Delegación{" "}
                {tipo === "persona_fisica" ? null : (
                  <span className="text-red-600">*</span>
                )}
              </label>
              <input
                className={`w-full rounded border px-3 py-2 text-sm ${errors["contacto.domicilio.ciudad_delegacion"] ? "border-red-500" : "border-gray-300"}`}
                value={domCiudadDelegacion}
                onChange={(e) => setDomCiudadDelegacion(e.target.value)}
                readOnly={
                  tipo === "persona_fisica"
                    ? domCatalogoTerritorial.ciudad_delegacion
                    : aplicaCpMexico && domColoniasOpciones.length > 0
                }
                onBlur={() =>
                  validator.validateField(
                    "contacto.domicilio.ciudad_delegacion",
                  )
                }
              />
              {errors["contacto.domicilio.ciudad_delegacion"] ? (
                <p className="text-xs text-red-600">
                  {errors["contacto.domicilio.ciudad_delegacion"]}
                </p>
              ) : null}
            </div>

            <div className={`${tipo === "persona_fisica" ? "order-[2]" : ""} space-y-1`}>
              <label className="text-sm font-medium">
                Código Postal <span className="text-red-600">*</span>
              </label>
              <input
                className={`w-full rounded border px-3 py-2 text-sm ${
                  (b1Errors["contacto.domicilio.codigo_postal"] || errors["contacto.domicilio.codigo_postal"]) ? "border-red-500" : "border-gray-300"
                }`}
                value={domCP}
                onChange={(e) => handleDomCPChange(e.target.value)}
                disabled={tipo === "persona_fisica" && !domPais.trim()}
                onBlur={() =>
                  validator.validateField("contacto.domicilio.codigo_postal")
                }
                placeholder={aplicaCpMexico ? "Ej. 44100" : "Código postal"}
              />
              {(b1Errors["contacto.domicilio.codigo_postal"] || errors["contacto.domicilio.codigo_postal"]) ? (
                <p className="text-xs text-red-600">
                  {b1Errors["contacto.domicilio.codigo_postal"] || errors["contacto.domicilio.codigo_postal"]}
                </p>
              ) : null}
              {domCpLoading ? (
                <p className="text-xs text-blue-700" role="status">Consultando código postal…</p>
              ) : domCpAviso ? (
                <p className="text-xs text-amber-700">{domCpAviso}</p>
              ) : null}
            </div>

            <div className={`${tipo === "persona_fisica" ? "order-[6]" : ""} space-y-1`}>
              <label className="text-sm font-medium">
                Estado <span className="text-red-600">*</span>
              </label>
              <input
                className={`w-full rounded border px-3 py-2 text-sm ${errors["contacto.domicilio.estado"] ? "border-red-500" : "border-gray-300"}`}
                value={domEstado}
                onChange={(e) => setDomEstado(e.target.value)}
                readOnly={
                  tipo === "persona_fisica"
                    ? domCatalogoTerritorial.estado
                    : aplicaCpMexico && domColoniasOpciones.length > 0
                }
                onBlur={() =>
                  validator.validateField("contacto.domicilio.estado")
                }
                placeholder="Ej. Jalisco"
              />
              {errors["contacto.domicilio.estado"] ? (
                <p className="text-xs text-red-600">
                  {errors["contacto.domicilio.estado"]}
                </p>
              ) : null}
            </div>
            <div className={`${tipo === "persona_fisica" ? "order-[1]" : ""}`}>
              <SearchableSelect
                label="País del domicilio"
                required
                value={domPais}
                items={paises}
                error={errors["contacto.domicilio.pais"]}
                placeholder="Selecciona un país"
                onChange={handleDomPaisChange}
                onBlur={() => validator.validateField("contacto.domicilio.pais")}
              />
            </div>


          </div>
        </div>

        {/* Persona Física */}
        {tipo === "persona_fisica" && (
          <>
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 md:p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Persona Física
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  RFC{" "}
                  {tipoNacionalidad === "nacional" ? (
                    <span className="text-red-600">*</span>
                  ) : (
                    <span className="text-gray-500">(opcional)</span>
                  )}
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.rfc"] ? "border-red-500" : "border-gray-300"}`}
                  value={pfRfc}
                  onChange={(e) => setPfRfc(e.target.value)}
                  onBlur={() => validator.validateField("persona.rfc")}
                  placeholder="XAXX010101000"
                />
                {errors["persona.rfc"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.rfc"]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  CURP{" "}
                  {tipoNacionalidad === "nacional" ? (
                    <span className="text-red-600">*</span>
                  ) : (
                    <span className="text-gray-500">(opcional)</span>
                  )}
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.curp"] ? "border-red-500" : "border-gray-300"}`}
                  value={pfCurp}
                  onChange={(e) => setPfCurp(e.target.value)}
                  onBlur={() => validator.validateField("persona.curp")}
                  placeholder="PEPJ900101HDFRRN09"
                />
                {errors["persona.curp"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.curp"]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Fecha de nacimiento <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["persona.fecha_nacimiento"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={pfFechaNac}
                  onChange={(e) => setPfFechaNac(e.target.value)}
                  onBlur={() =>
                    validator.validateField("persona.fecha_nacimiento")
                  }
                />
                {errors["persona.fecha_nacimiento"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.fecha_nacimiento"]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre(s) *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.nombres"] ? "border-red-500" : "border-gray-300"}`}
                  value={pfNombres}
                  onChange={(e) => setPfNombres(e.target.value)}
                  onBlur={() => validator.validateField("persona.nombres")}
                />
                {errors["persona.nombres"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.nombres"]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido paterno *
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["persona.apellido_paterno"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={pfApPat}
                  onChange={(e) => setPfApPat(e.target.value)}
                  onBlur={() =>
                    validator.validateField("persona.apellido_paterno")
                  }
                />
                {errors["persona.apellido_paterno"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.apellido_paterno"]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido materno{" "}
                  {tipoNacionalidad === "nacional" ? (
                    <span className="text-red-600">*</span>
                  ) : (
                    <span className="text-gray-500">(opcional)</span>
                  )}
                </label>
                <input
                  name="persona.apellido_materno"
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["persona.apellido_materno"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={pfApMat}
                  onChange={(e) => {
                    setPfApMat(e.target.value);
                    if (e.target.value.trim()) {
                      setErr("persona.apellido_materno");
                    }
                  }}
                  onBlur={() =>
                    validator.validateField("persona.apellido_materno")
                  }
                />
                {errors["persona.apellido_materno"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.apellido_materno"]}
                  </p>
                ) : null}
              </div>

              <SearchableSelect
                label="Actividad económica"
                required
                value={pfActividad}
                items={actividades}
                error={errors["persona.actividad_economica"]}
                onChange={(v) => setPfActividad(v)}
                onBlur={() =>
                  validator.validateField("persona.actividad_economica")
                }
              />


              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Residencia <span className="text-red-600">*</span>
                </label>
                <select
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["persona.residencia"] ? "border-red-500" : "border-gray-300"
                  }`}
                  value={pfResidencia}
                  onChange={(e) => setPfResidencia(e.target.value)}
                  onBlur={() => validator.validateField("persona.residencia")}
                >
                  <option value="">Selecciona</option>
                  <option value="temporal">Temporal</option>
                  <option value="permanente">Permanente</option>
                </select>
                {errors["persona.residencia"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.residencia"]}
                  </p>
                ) : null}
              </div>

            </div>

          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 md:p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Identificación / Acreditación
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Tipo / nombre del documento *
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["persona.identificacion.tipo"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={pfIdTipo}
                  onChange={(e) => setPfIdTipo(e.target.value)}
                  onBlur={() =>
                    validator.validateField("persona.identificacion.tipo")
                  }
                  placeholder="INE / Pasaporte / ..."
                />
                {errors["persona.identificacion.tipo"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.identificacion.tipo"]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Autoridad que expide *
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["persona.identificacion.autoridad"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={pfIdAutoridad}
                  onChange={(e) => setPfIdAutoridad(e.target.value)}
                  onBlur={() =>
                    validator.validateField("persona.identificacion.autoridad")
                  }
                  placeholder="INE / SRE / ..."
                />
                {errors["persona.identificacion.autoridad"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.identificacion.autoridad"]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Número de identificación *
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["persona.identificacion.numero"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={pfIdNumero}
                  onChange={(e) => setPfIdNumero(e.target.value)}
                  onBlur={() =>
                    validator.validateField("persona.identificacion.numero")
                  }
                />
                {errors["persona.identificacion.numero"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.identificacion.numero"]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Fecha de expedición <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["persona.identificacion.expedicion"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={pfIdExpedicion}
                  onChange={(e) => setPfIdExpedicion(e.target.value)}
                  onBlur={() =>
                    validator.validateField("persona.identificacion.expedicion")
                  }
                />
                {errors["persona.identificacion.expedicion"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.identificacion.expedicion"]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Fecha de expiración{" "}
                  {!pfIdSinVigencia ? (
                    <span className="text-red-600">*</span>
                  ) : null}
                </label>
                <input
                  type="date"
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["persona.identificacion.expiracion"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={pfIdExpiracion}
                  onChange={(e) => setPfIdExpiracion(e.target.value)}
                  disabled={pfIdSinVigencia}
                  onBlur={() =>
                    validator.validateField("persona.identificacion.expiracion")
                  }
                />
                {errors["persona.identificacion.expiracion"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.identificacion.expiracion"]}
                  </p>
                ) : null}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={pfIdSinVigencia}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPfIdSinVigencia(checked);
                      if (checked) {
                        setPfIdExpiracion("");
                        setErr("persona.identificacion.expiracion");
                      }
                    }}
                  />
                  Sin vigencia
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 md:p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Cargo público
            </h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="flex h-full flex-col space-y-1">
                  <label className="flex min-h-12 items-end text-sm font-medium">
                    Actualmente desempeño un cargo público *
                  </label>
                  <select
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.cargo_publico.actual"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfCargoPublicoActual}
                    onChange={(e) => setPfCargoPublicoActual(e.target.value)}
                    onBlur={() =>
                      validator.validateField("persona.cargo_publico.actual")
                    }
                  >
                    <option value="">Selecciona...</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                  {errors["persona.cargo_publico.actual"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.cargo_publico.actual"]}
                    </p>
                  ) : null}
                </div>

                <div className="flex h-full flex-col space-y-1">
                  <label className="flex min-h-12 items-end text-sm font-medium">
                    He desempeñado un cargo público *
                  </label>
                  <select
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.cargo_publico.previo"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfCargoPublicoPrevio}
                    onChange={(e) => setPfCargoPublicoPrevio(e.target.value)}
                    onBlur={() =>
                      validator.validateField("persona.cargo_publico.previo")
                    }
                  >
                    <option value="">Selecciona...</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                  {errors["persona.cargo_publico.previo"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.cargo_publico.previo"]}
                    </p>
                  ) : null}
                </div>

                <div className="flex h-full flex-col space-y-1">
                  <label className="flex min-h-12 items-end text-sm font-medium">
                    Algún familiar desempeña o ha desempeñado *
                  </label>
                  <select
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.cargo_publico.familiar"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfCargoPublicoFamiliar}
                    onChange={(e) => setPfCargoPublicoFamiliar(e.target.value)}
                    onBlur={() =>
                      validator.validateField("persona.cargo_publico.familiar")
                    }
                  >
                    <option value="">Selecciona...</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                  {errors["persona.cargo_publico.familiar"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.cargo_publico.familiar"]}
                    </p>
                  ) : null}
                </div>
              </div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 md:p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Manifestación sobre beneficiario controlador
            </h2>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={beneficiariosControladoresAplica}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setBeneficiariosControladoresAplica(checked);
                      clearBeneficiariosControladoresErrors();
                      setFatal(null);

                      if (!checked) {
                        setBeneficiariosControladores([]);
                      } else if (beneficiariosControladores.length === 0) {
                        setBeneficiariosControladores([
                          createEmptyBeneficiarioControlador(),
                        ]);
                      }
                    }}
                  />
                  <span>
                    Manifiesto que tengo conocimiento de la existencia del dueño
                    beneficiario.
                  </span>
                </label>
          </div>

          {beneficiariosControladoresAplica
            ? renderBeneficiariosControladoresList()
            : null}
          </>
        )}
        {tipo === "persona_moral" && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Persona Moral</h2>

                      <div className="space-y-1 md:col-span-3">
                        <label className="text-sm font-medium">
                          Razón social <span className="text-red-600">*</span>
                        </label>
                        <input
                          className={`w-full rounded border px-3 py-2 text-sm ${
                            errors["nombre_entidad"] ? "border-red-500" : "border-gray-300"
                          }`}
                          value={pmRazonSocial}
                          onChange={(e) => setPmRazonSocial(e.target.value)}
                          onBlur={() => validator.validateField("nombre_entidad")}
                          placeholder="Ej. Servicios SA de CV"
                        />
                        {errors["nombre_entidad"] ? (
                          <p className="text-xs text-red-600">{errors["nombre_entidad"]}</p>
                        ) : null}
                      </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Subtipo PM <span className="text-red-600">*</span>
                        </label>
                        <select
                          className={`w-full rounded border px-3 py-2 text-sm ${
                            errors["empresa.subtipo_pm"] ? "border-red-500" : "border-gray-300"
                          }`}
                          value={pmSubtipoPm}
                          onChange={(e) => setPmSubtipoPm(e.target.value)}
                          onBlur={() => validator.validateField("empresa.subtipo_pm")}
                        >
                          <option value="">Selecciona</option>
                          <option value="pm_derecho_publico_mexicano">Persona Moral Del Derecho Público Mexicano</option>
                          <option value="pm_extranjera">Persona Moral Extranjera</option>
                          <option value="pm_mexicana">Persona Moral Mexicana</option>
                          <option value="pm_embajada_consulado_orgint">Embajada / Consulado / Organismo Internacional</option>
                          <option value="pm_rsi">Morales del Régimen Simplificado de Identificación</option>
                          <option value="pm_otro">Otro</option>
                        </select>
                        {errors["empresa.subtipo_pm"] ? (
                          <p className="text-xs text-red-600">
                            {errors["empresa.subtipo_pm"]}
                          </p>
                        ) : null}
                      </div>

                      {pmSubtipoPm === "pm_rsi" ? (
                        <div className="space-y-1">
                          <label className="text-sm font-medium">
                            RSI Subtipo <span className="text-red-600">*</span>
                          </label>
                          <select
                            className={`w-full rounded border px-3 py-2 text-sm ${
                              errors["empresa.rsi_subtipo"] ? "border-red-500" : "border-gray-300"
                            }`}
                            value={pmRsiSubtipo}
                            onChange={(e) => setPmRsiSubtipo(e.target.value)}
                            onBlur={() => validator.validateField("empresa.rsi_subtipo")}
                          >
                            <option value="">Selecciona</option>
                            <option value="rsi_sistema_financiero_mexicano">Empresas del Sistema Financiero Mexicano</option>
                            <option value="rsi_sistema_financiero_extranjero">Empresas del Sistema Financiero Extranjero</option>
                            <option value="rsi_cotiza_bolsa">Empresas que cotizan en Bolsa</option>
                            <option value="rsi_publicas">Empresas públicas</option>
                            <option value="rsi_dependencias_publicas">Dependencias públicas (Fed/Est/Mun)</option>
                          </select>
                          {errors["empresa.rsi_subtipo"] ? (
                            <p className="text-xs text-red-600">
                              {errors["empresa.rsi_subtipo"]}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">RFC (empresa) *</label>
                        <input
                          className={`w-full rounded border px-3 py-2 text-sm ${errors["empresa.rfc"] ? "border-red-500" : "border-gray-300"}`}
                          value={pmRfc}
                          onChange={(e) => setPmRfc(e.target.value)}
                          onBlur={() => validator.validateField("empresa.rfc")}
                          placeholder="XAXX010101000"
                        />
                        {errors["empresa.rfc"] ? (
                          <p className="text-xs text-red-600">
                            {errors["empresa.rfc"]}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Régimen de capital *
                        </label>
                        <input
                          className={`w-full rounded border px-3 py-2 text-sm ${errors["empresa.regimen_capital"] ? "border-red-500" : "border-gray-300"}`}
                          value={pmRegimenCapital}
                          onChange={(e) => setPmRegimenCapital(e.target.value)}
                          onBlur={() =>
                            validator.validateField("empresa.regimen_capital")
                          }
                        />
                        {errors["empresa.regimen_capital"] ? (
                          <p className="text-xs text-red-600">
                            {errors["empresa.regimen_capital"]}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Fecha constitución *
                        </label>
                        <input
                          type="date"
                          className={`w-full rounded border px-3 py-2 text-sm ${
                            errors["empresa.fecha_constitucion"]
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          value={toDateInputValue(pmFechaConst)}
                          onChange={(e) => setPmFechaConst(e.target.value)}
                          onBlur={() =>
                            validator.validateField("empresa.fecha_constitucion")
                          }
                        />
                        {errors["empresa.fecha_constitucion"] ? (
                          <p className="text-xs text-red-600">
                            {errors["empresa.fecha_constitucion"]}
                          </p>
                        ) : null}
                      </div>

                      <SearchableSelect
                        label="Giro mercantil"
                        required
                        value={pmGiro}
                        items={giros}
                        error={errors["empresa.giro_mercantil"]}
                        onChange={(v) => setPmGiro(v)}
                        onBlur={() => validator.validateField("empresa.giro_mercantil")}
                      />

                      <div className="space-y-1 md:col-span-3">
                        <p className="text-sm font-medium">
                          INFORMACIÓN DEL REPRESENTANTE LEGAL
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">Nombres *</label>
                        <input
                          className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.nombres.pm"] ? "border-red-500" : "border-gray-300"}`}
                          value={pmRepNombres}
                          onChange={(e) => setPmRepNombres(e.target.value)}
                          onBlur={() =>
                            validator.validateField("representante.nombres.pm")
                          }
                        />
                        {errors["representante.nombres.pm"] ? (
                          <p className="text-xs text-red-600">
                            {errors["representante.nombres.pm"]}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Apellido paterno *
                        </label>
                        <input
                          className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.apellido_paterno.pm"] ? "border-red-500" : "border-gray-300"}`}
                          value={pmRepApPat}
                          onChange={(e) => setPmRepApPat(e.target.value)}
                          onBlur={() =>
                            validator.validateField("representante.apellido_paterno.pm")
                          }
                        />
                        {errors["representante.apellido_paterno.pm"] ? (
                          <p className="text-xs text-red-600">
                            {errors["representante.apellido_paterno.pm"]}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Apellido materno *
                        </label>
                        <input
                          className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.apellido_materno.pm"] ? "border-red-500" : "border-gray-300"}`}
                          value={pmRepApMat}
                          onChange={(e) => setPmRepApMat(e.target.value)}
                          onBlur={() =>
                            validator.validateField("representante.apellido_materno.pm")
                          }
                        />
                        {errors["representante.apellido_materno.pm"] ? (
                          <p className="text-xs text-red-600">
                            {errors["representante.apellido_materno.pm"]}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Fecha nacimiento *
                        </label>
                        <input
                          type="date"
                          className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.fecha_nacimiento.pm"] ? "border-red-500" : "border-gray-300"}`}
                          value={toDateInputValue(pmRepFechaNac)}
                          onChange={(e) => setPmRepFechaNac(e.target.value)}
                          onBlur={() =>
                            validator.validateField("representante.fecha_nacimiento.pm")
                          }
                        />
                        {errors["representante.fecha_nacimiento.pm"] ? (
                          <p className="text-xs text-red-600">
                            {errors["representante.fecha_nacimiento.pm"]}
                          </p>
                        ) : null}
                      </div>

                      <SearchableSelect
                        label="Nacionalidad (representante)"
                        required
                        value={pmRepNacionalidad}
                        items={paises}
                        error={errors["representante.nacionalidad.pm"]}
                        onChange={(v) => setPmRepNacionalidad(v)}
                        onBlur={() =>
                          validator.validateField("representante.nacionalidad.pm")
                        }
                      />


                      <div className="space-y-1">
                        <label className="text-sm font-medium">CURP *</label>
                        <input
                          className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.curp.pm"] ? "border-red-500" : "border-gray-300"}`}
                          value={pmRepCurp}
                          onChange={(e) => setPmRepCurp(e.target.value)}
                          onBlur={() =>
                            validator.validateField("representante.curp.pm")
                          }
                        />
                        {errors["representante.curp.pm"] ? (
                          <p className="text-xs text-red-600">
                            {errors["representante.curp.pm"]}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">RFC *</label>
                        <input
                          className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.rfc.pm"] ? "border-red-500" : "border-gray-300"}`}
                          value={pmRepRfc}
                          onChange={(e) => setPmRepRfc(e.target.value)}
                          onBlur={() => validator.validateField("representante.rfc.pm")}
                        />
                        {errors["representante.rfc.pm"] ? (
                          <p className="text-xs text-red-600">
                            {errors["representante.rfc.pm"]}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Teléfono de casa *
                        </label>
                        <input
                          className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.telefono_casa.pm"] ? "border-red-500" : "border-gray-300"}`}
                          value={pmRepTelCasa}
                          onChange={(e) => setPmRepTelCasa(e.target.value)}
                          onBlur={() =>
                            validator.validateField("representante.telefono_casa.pm")
                          }
                          placeholder="+52 3312345678"
                        />
                        {errors["representante.telefono_casa.pm"] ? (
                          <p className="text-xs text-red-600">
                            {errors["representante.telefono_casa.pm"]}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">Celular *</label>
                        <input
                          className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.celular.pm"] ? "border-red-500" : "border-gray-300"}`}
                          value={pmRepCelular}
                          onChange={(e) => setPmRepCelular(e.target.value)}
                          onBlur={() =>
                            validator.validateField("representante.celular.pm")
                          }
                          placeholder="+52 5512345678"
                        />
                        {errors["representante.celular.pm"] ? (
                          <p className="text-xs text-red-600">
                            {errors["representante.celular.pm"]}
                          </p>
                        ) : null}
                      </div>

                    </div>

                    <div className="rounded border border-gray-200 p-3 space-y-3">
                      <p className="text-sm font-medium">
                        Domicilio del Representante Legal (México)
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Calle *</label>
                          <input
                            className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.domicilio.calle.pm"] ? "border-red-500" : "border-gray-300"}`}
                            value={pmRepDomCalle}
                            onChange={(e) => setPmRepDomCalle(e.target.value)}
                            onBlur={() =>
                              validator.validateField(
                                "representante.domicilio.calle.pm",
                              )
                            }
                          />
                          {errors["representante.domicilio.calle.pm"] ? (
                            <p className="text-xs text-red-600">
                              {errors["representante.domicilio.calle.pm"]}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium">Número *</label>
                          <input
                            className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.domicilio.numero.pm"] ? "border-red-500" : "border-gray-300"}`}
                            value={pmRepDomNumero}
                            onChange={(e) => setPmRepDomNumero(e.target.value)}
                            onBlur={() =>
                              validator.validateField(
                                "representante.domicilio.numero.pm",
                              )
                            }
                          />
                          {errors["representante.domicilio.numero.pm"] ? (
                            <p className="text-xs text-red-600">
                              {errors["representante.domicilio.numero.pm"]}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium">Interior</label>
                          <input
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                            value={pmRepDomInterior}
                            onChange={(e) => setPmRepDomInterior(e.target.value)}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium">Colonia *</label>
                          {pmRepDomColoniasOpciones.length > 1 ? (
                            <select
                              className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.domicilio.colonia.pm"] ? "border-red-500" : "border-gray-300"}`}
                              value={pmRepDomColonia}
                              onChange={(e) => setPmRepDomColonia(e.target.value)}
                              onBlur={() =>
                                validator.validateField(
                                  "representante.domicilio.colonia.pm",
                                )
                              }
                            >
                              <option value="">Selecciona colonia</option>
                              {pmRepDomColoniasOpciones.map((colonia) => (
                                <option key={colonia} value={colonia}>
                                  {colonia}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.domicilio.colonia.pm"] ? "border-red-500" : "border-gray-300"}`}
                              value={pmRepDomColonia}
                              onChange={(e) => setPmRepDomColonia(e.target.value)}
                              onBlur={() =>
                                validator.validateField(
                                  "representante.domicilio.colonia.pm",
                                )
                              }
                            />
                          )}
                          {errors["representante.domicilio.colonia.pm"] ? (
                            <p className="text-xs text-red-600">
                              {errors["representante.domicilio.colonia.pm"]}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium">Municipio *</label>
                          <input
                            className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.domicilio.municipio.pm"] ? "border-red-500" : "border-gray-300"}`}
                            value={pmRepDomMunicipio}
                            onChange={(e) => setPmRepDomMunicipio(e.target.value)}
                            readOnly={pmRepDomCatalogoTerritorial.municipio}
                            onBlur={() =>
                              validator.validateField(
                                "representante.domicilio.municipio.pm",
                              )
                            }
                          />
                          {errors["representante.domicilio.municipio.pm"] ? (
                            <p className="text-xs text-red-600">
                              {errors["representante.domicilio.municipio.pm"]}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium">
                            Ciudad/Delegación *
                          </label>
                          <input
                            className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.domicilio.ciudad_delegacion.pm"] ? "border-red-500" : "border-gray-300"}`}
                            value={pmRepDomCiudadDelegacion}
                            onChange={(e) =>
                              setPmRepDomCiudadDelegacion(e.target.value)
                            }
                            readOnly={pmRepDomCatalogoTerritorial.ciudad_delegacion}
                            onBlur={() =>
                              validator.validateField(
                                "representante.domicilio.ciudad_delegacion.pm",
                              )
                            }
                          />
                          {errors["representante.domicilio.ciudad_delegacion.pm"] ? (
                            <p className="text-xs text-red-600">
                              {errors["representante.domicilio.ciudad_delegacion.pm"]}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium">Código postal *</label>
                          <input
                            className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.domicilio.codigo_postal.pm"] ? "border-red-500" : "border-gray-300"}`}
                            value={pmRepDomCP}
                            inputMode="numeric"
                            maxLength={5}
                            onChange={(e) =>
                              setPmRepDomCP(normalizeCodigoPostalMx(e.target.value))
                            }
                            onBlur={() =>
                              validator.validateField(
                                "representante.domicilio.codigo_postal.pm",
                              )
                            }
                            placeholder="44100"
                          />
                          {pmRepDomCpLoading ? (
                            <p className="text-xs text-blue-700" role="status">
                              Consultando código postal…
                            </p>
                          ) : null}
                          {!pmRepDomCpLoading && pmRepDomCpAviso ? (
                            <p className="text-xs text-amber-700">{pmRepDomCpAviso}</p>
                          ) : null}
                          {errors["representante.domicilio.codigo_postal.pm"] ? (
                            <p className="text-xs text-red-600">
                              {errors["representante.domicilio.codigo_postal.pm"]}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium">Estado *</label>
                          <input
                            className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.domicilio.estado.pm"] ? "border-red-500" : "border-gray-300"}`}
                            value={pmRepDomEstado}
                            onChange={(e) => setPmRepDomEstado(e.target.value)}
                            readOnly={pmRepDomCatalogoTerritorial.estado}
                            onBlur={() =>
                              validator.validateField(
                                "representante.domicilio.estado.pm",
                              )
                            }
                          />
                          {errors["representante.domicilio.estado.pm"] ? (
                            <p className="text-xs text-red-600">
                              {errors["representante.domicilio.estado.pm"]}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <label className="text-sm font-medium">País *</label>
                          <input
                            className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.domicilio.pais.pm"] ? "border-red-500" : "border-gray-300"}`}
                            value="México"
                            readOnly
                            onBlur={() =>
                              validator.validateField("representante.domicilio.pais.pm")
                            }
                          />
                          {errors["representante.domicilio.pais.pm"] ? (
                            <p className="text-xs text-red-600">
                              {errors["representante.domicilio.pais.pm"]}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="rounded border border-gray-200 p-3 space-y-3">
                      <p className="text-sm font-medium">
                        Identificar al Beneficiario Controlador (CFF 32-B Ter)
                      </p>

                      {renderBeneficiariosControladoresList()}
                    </div>

                    <div className="rounded border border-gray-200 p-3 space-y-3">
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={pmRepEsAccionista}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setPmRepEsAccionista(checked);

                            if (!checked) {
                              setPmAccPct("");
                              setPmAccRelacion("");
                              setPmAccionistaError("accionista.porcentaje");
                              setPmAccionistaError("accionista.relacion");
                            }
                          }}
                        />
                        <span>El representante legal también es accionista</span>
                      </label>

                      {pmRepEsAccionista ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-sm font-medium">
                              Porcentaje accionario del representante *
                            </label>
                            <input
                              className={`w-full rounded border px-3 py-2 text-sm ${errors["accionista.porcentaje"] ? "border-red-500" : "border-gray-300"}`}
                              value={pmAccPct}
                              onChange={(e) => setPmAccPct(e.target.value)}
                              onBlur={() =>
                                validatePmAccionistaPorcentaje()
                              }
                              placeholder="25"
                            />
                            {errors["accionista.porcentaje"] ? (
                              <p className="text-xs text-red-600">
                                {errors["accionista.porcentaje"]}
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium">
                              Relación del representante con la sociedad *
                            </label>
                            <input
                              className={`w-full rounded border px-3 py-2 text-sm ${errors["accionista.relacion"] ? "border-red-500" : "border-gray-300"}`}
                              value={pmAccRelacion}
                              onChange={(e) => setPmAccRelacion(e.target.value)}
                              onBlur={() =>
                                validatePmAccionistaRelacion()
                              }
                            />
                            {errors["accionista.relacion"] ? (
                              <p className="text-xs text-red-600">
                                {errors["accionista.relacion"]}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <hr className="my-2" />

                    <h3 className="font-medium">
                      Identificación del Representante Legal
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Tipo de documento *
                        </label>
                        <input
                          className={`w-full rounded border px-3 py-2 text-sm ${
                            errors["representante.identificacion.tipo.pm"]
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          value={pmRepIdTipo}
                          onChange={(e) => setPmRepIdTipo(e.target.value)}
                          onBlur={() =>
                            validator.validateField(
                              "representante.identificacion.tipo.pm",
                            )
                          }
                          placeholder="INE / Pasaporte / ..."
                        />
                        {errors["representante.identificacion.tipo.pm"] ? (
                          <p className="text-xs text-red-600">
                            {errors["representante.identificacion.tipo.pm"]}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Autoridad que lo emitió *
                        </label>
                        <input
                          className={`w-full rounded border px-3 py-2 text-sm ${
                            errors["representante.identificacion.autoridad.pm"]
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          value={pmRepIdAutoridad}
                          onChange={(e) => setPmRepIdAutoridad(e.target.value)}
                          onBlur={() =>
                            validator.validateField(
                              "representante.identificacion.autoridad.pm",
                            )
                          }
                        />
                        {errors["representante.identificacion.autoridad.pm"] ? (
                          <p className="text-xs text-red-600">
                            {errors["representante.identificacion.autoridad.pm"]}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Número de identificación *
                        </label>
                        <input
                          className={`w-full rounded border px-3 py-2 text-sm ${
                            errors["representante.identificacion.numero.pm"]
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          value={pmRepIdNumero}
                          onChange={(e) => setPmRepIdNumero(e.target.value)}
                          onBlur={() =>
                            validator.validateField(
                              "representante.identificacion.numero.pm",
                            )
                          }
                        />
                        {errors["representante.identificacion.numero.pm"] ? (
                          <p className="text-xs text-red-600">
                            {errors["representante.identificacion.numero.pm"]}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Fecha de expedición *
                        </label>
                        <input
                          type="date"
                          className={`w-full rounded border px-3 py-2 text-sm ${
                            errors["representante.identificacion.expedicion.pm"]
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          value={toDateInputValue(pmRepIdExpedicion)}
                          onChange={(e) => setPmRepIdExpedicion(e.target.value)}
                          onBlur={() =>
                            validator.validateField(
                              "representante.identificacion.expedicion.pm",
                            )
                          }
                        />
                        {errors["representante.identificacion.expedicion.pm"] ? (
                          <p className="text-xs text-red-600">
                            {errors["representante.identificacion.expedicion.pm"]}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Fecha de expiración *
                        </label>
                        <input
                          type="date"
                          className={`w-full rounded border px-3 py-2 text-sm ${
                            errors["representante.identificacion.expiracion.pm"]
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          value={toDateInputValue(pmRepIdExpiracion)}
                          onChange={(e) => setPmRepIdExpiracion(e.target.value)}
                          onBlur={() =>
                            validator.validateField(
                              "representante.identificacion.expiracion.pm",
                            )
                          }
                        />
                        {errors["representante.identificacion.expiracion.pm"] ? (
                          <p className="text-xs text-red-600">
                            {errors["representante.identificacion.expiracion.pm"]}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                        {/* Fideicomiso */}


                {tipo === "fideicomiso" && (


                  <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">


                    <h2 className="text-lg font-semibold text-gray-900">Fideicomiso</h2>
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">


                      <div className="space-y-1 md:col-span-2">


                        <label className="text-sm font-medium">


                          Denominación o Razón Social del Fiduciario *


                        </label>


                        <input


                          className={`w-full rounded border px-3 py-2 text-sm ${


                            errors["fideicomiso.denominacion_fiduciario"]


                              ? "border-red-500"


                              : "border-gray-300"


                          }`}


                          value={fidDenominacionFiduciario}


                          onChange={(e) => setFidDenominacionFiduciario(e.target.value)}


                          onBlur={() =>


                            validator.validateField("fideicomiso.denominacion_fiduciario")


                          }


                        />


                        {errors["fideicomiso.denominacion_fiduciario"] ? (


                          <p className="text-xs text-red-600">


                            {errors["fideicomiso.denominacion_fiduciario"]}


                          </p>


                        ) : null}


                      </div>



                      <div className="space-y-1">


                        <label className="text-sm font-medium">


                          RFC del Fiduciario *


                        </label>


                        <input


                          className={`w-full rounded border px-3 py-2 text-sm ${


                            errors["fideicomiso.rfc_fiduciario"]


                              ? "border-red-500"


                              : "border-gray-300"


                          }`}


                          value={fidRfcFiduciario}


                          onChange={(e) => setFidRfcFiduciario(e.target.value.toUpperCase())}


                          onBlur={() =>


                            validator.validateField("fideicomiso.rfc_fiduciario")


                          }


                          placeholder="XAXX010101000"


                        />


                        {errors["fideicomiso.rfc_fiduciario"] ? (


                          <p className="text-xs text-red-600">


                            {errors["fideicomiso.rfc_fiduciario"]}


                          </p>


                        ) : null}


                      </div>



                      <div className="space-y-1">


                        <label className="text-sm font-medium">


                          Identificador del fideicomiso *


                        </label>


                        <input


                          className={`w-full rounded border px-3 py-2 text-sm ${


                            errors["fideicomiso.identificador"]


                              ? "border-red-500"


                              : "border-gray-300"


                          }`}


                          value={fidIdentificador}


                          onChange={(e) => setFidIdentificador(e.target.value)}


                          onBlur={() =>


                            validator.validateField("fideicomiso.identificador")


                          }


                        />


                        {errors["fideicomiso.identificador"] ? (


                          <p className="text-xs text-red-600">


                            {errors["fideicomiso.identificador"]}


                          </p>


                        ) : null}


                      </div>



                      <div className="space-y-1 md:col-span-3">


                        <label className="text-sm font-medium">


                          Nombre del fideicomiso *


                        </label>


                        <input


                          className={`w-full rounded border px-3 py-2 text-sm ${


                            errors["fideicomiso.fideicomiso_nombre"]


                              ? "border-red-500"


                              : "border-gray-300"


                          }`}


                          value={fidNombre}


                          onChange={(e) => setFidNombre(e.target.value)}


                          onBlur={() => setErr("fideicomiso.fideicomiso_nombre", undefined)}


                          placeholder="Nombre del fideicomiso"


                        />


                        {errors["fideicomiso.fideicomiso_nombre"] ? (


                          <p className="text-xs text-red-600">


                            {errors["fideicomiso.fideicomiso_nombre"]}


                          </p>


                        ) : null}


                      </div>


                    </div>



                    <hr className="my-2" />



                    <h3 className="font-medium">Representante / Apoderado legal</h3>



                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                      <div className="space-y-1 md:col-span-2">


                        <label className="text-sm font-medium">


                          Nombre completo del representante *


                        </label>


                        <input


                          className={`w-full rounded border px-3 py-2 text-sm ${


                            errors["representante.nombre_completo"]


                              ? "border-red-500"


                              : "border-gray-300"


                          }`}


                          value={fidRepNombreCompleto}


                          onChange={(e) => setFidRepNombreCompleto(e.target.value)}


                          onBlur={() => setErr("representante.nombre_completo", undefined)}


                          placeholder="Nombre completo del representante"


                        />


                        {errors["representante.nombre_completo"] ? (


                          <p className="text-xs text-red-600">


                            {errors["representante.nombre_completo"]}


                          </p>


                        ) : null}


                      </div>



                      <div className="space-y-1">


                        <label className="text-sm font-medium">RFC *</label>


                        <input


                          className={`w-full rounded border px-3 py-2 text-sm ${


                            errors["representante.rfc"] ? "border-red-500" : "border-gray-300"


                          }`}


                          value={fidRepRfc}


                          onChange={(e) => setFidRepRfc(e.target.value.toUpperCase())}


                          onBlur={() => validator.validateField("representante.rfc")}


                          placeholder="XAXX010101000"


                        />


                        {errors["representante.rfc"] ? (


                          <p className="text-xs text-red-600">


                            {errors["representante.rfc"]}


                          </p>


                        ) : null}


                      </div>



                      <div className="space-y-1">


                        <label className="text-sm font-medium">CURP *</label>


                        <input


                          className={`w-full rounded border px-3 py-2 text-sm ${


                            errors["representante.curp"] ? "border-red-500" : "border-gray-300"


                          }`}


                          value={fidRepCurp}


                          onChange={(e) => setFidRepCurp(e.target.value.toUpperCase())}


                          onBlur={() => validator.validateField("representante.curp")}


                          placeholder="PEPJ900101HDFRRN09"


                        />


                        {errors["representante.curp"] ? (


                          <p className="text-xs text-red-600">


                            {errors["representante.curp"]}


                          </p>


                        ) : null}


                      </div>



                      <div className="space-y-1">


                        <label className="text-sm font-medium">


                          Fecha de nacimiento (AAAAMMDD) *


                        </label>


                        <input


                          className={`w-full rounded border px-3 py-2 text-sm ${


                            errors["representante.fecha_nacimiento"]


                              ? "border-red-500"


                              : "border-gray-300"


                          }`}


                          value={fidRepFechaNac}


                          onChange={(e) => setFidRepFechaNac(e.target.value)}


                          onBlur={() =>


                            validator.validateField("representante.fecha_nacimiento")


                          }


                          placeholder="19900101 (o 1990-01-01)"


                        />


                        {errors["representante.fecha_nacimiento"] ? (


                          <p className="text-xs text-red-600">


                            {errors["representante.fecha_nacimiento"]}


                          </p>


                        ) : (


                          <p className="text-xs text-gray-500">


                            Acepta AAAAMMDD o YYYY-MM-DD (se convierte a AAAAMMDD).


                          </p>


                        )}


                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <h3 className="mt-2 text-sm font-semibold text-gray-700">
                          Identificación / Acreditación del representante legal
                        </h3>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">Tipo *</label>
                        <input
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                          value={fidRepIdTipo}
                          onChange={(e) => setFidRepIdTipo(e.target.value)}
                          placeholder="INE, pasaporte, poder notarial, etc."
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">Autoridad emisora *</label>
                        <input
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                          value={fidRepIdAutoridad}
                          onChange={(e) => setFidRepIdAutoridad(e.target.value)}
                          placeholder="INE, SRE, notaría, etc."
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">Número de identificación *</label>
                        <input
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                          value={fidRepIdNumero}
                          onChange={(e) => setFidRepIdNumero(e.target.value)}
                          placeholder="Número / folio"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Fecha de expedición (AAAAMMDD) *
                        </label>
                        <input
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                          value={fidRepIdExpedicion}
                          onChange={(e) =>
                            setFidRepIdExpedicion(onlyDigits(e.target.value).slice(0, 8))
                          }
                          placeholder="20200101"
                          maxLength={8}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Fecha de expiración (AAAAMMDD) *
                        </label>
                        <input
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                          value={fidRepIdExpiracion}
                          onChange={(e) =>
                            setFidRepIdExpiracion(onlyDigits(e.target.value).slice(0, 8))
                          }
                          placeholder="20300101"
                          maxLength={8}
                        />
                      </div>



                      <hr className="my-2" />



                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          Identificar al Beneficiario Controlador
                        </p>
                        {renderBeneficiariosControladoresList()}
                      </div>


                    </div>


                  </div>


                )}



        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={
              loading ||
              pfConfirmationOpen ||
              successClient !== null ||
              empresaLoading ||
              Boolean(empresaError) ||
              !sessionRole ||
              tieneMatrizPublicadaActiva !== true
            }
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Registrar"}
          </button>

          <button
            type="button"
            className="rounded border border-gray-300 px-4 py-2 text-sm"
            onClick={() => router.push("/cliente/clientes")}
          >
            Cancelar
          </button>
        </div>
      </form>
      <EmpresaConfirmationModal
        open={pfConfirmationOpen}
        title="Confirmar alta de Persona Física"
        busy={loading}
        confirmLabel="Confirmar alta"
        busyLabel="Registrando..."
        onCancel={() => setPfConfirmationOpen(false)}
        onConfirm={() => void executeRegistration()}
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="font-medium">Empresa</dt><dd>{empresaNombre || empresaId}</dd></div>
          <div><dt className="font-medium">Actividad vulnerable</dt><dd>{selectedActivityName}</dd></div>
          <div><dt className="font-medium">Operación específica</dt><dd>{selectedOperationName}</dd></div>
          <div><dt className="font-medium">Nombre completo</dt><dd>{pfFullName}</dd></div>
          <div><dt className="font-medium">RFC</dt><dd>{pfRfc.trim().toUpperCase() || "No capturado"}</dd></div>
          <div><dt className="font-medium">CURP</dt><dd>{pfCurp.trim().toUpperCase() || "No capturada"}</dd></div>
          <div><dt className="font-medium">Correo</dt><dd>{email.trim()}</dd></div>
          <div>
            <dt className="font-medium">Teléfono</dt>
            <dd>{buildTelefonoE164Like(telCodigoPais, telNumero, telExt)}</dd>
          </div>
          <div className="sm:col-span-2"><dt className="font-medium">Domicilio</dt><dd>{pfDomicilioResumen}</dd></div>
          <div className="sm:col-span-2"><dt className="font-medium">Identificación</dt><dd>{pfIdentificacionResumen}</dd></div>
          <div className="sm:col-span-2"><dt className="font-medium">Beneficiario controlador</dt><dd>{beneficiariosResumen}</dd></div>
        </dl>
      </EmpresaConfirmationModal>
      <EmpresaConfirmationModal
        open={successClient !== null}
        title={
          successClient?.tipo === "persona_moral"
            ? "Persona Moral registrada correctamente"
            : "Persona Física registrada correctamente"
        }
        busy={false}
        cancelLabel="Dejarlo pendiente"
        confirmLabel="Generar Perfil Transaccional"
        busyLabel="Generar Perfil Transaccional"
        onCancel={() => {
          if (successClient) {
            router.push("/cliente/clientes");
          }
        }}
        onConfirm={() => {
          if (successClient) {
            router.push(
              `/cliente/clientes/${successClient.id}/perfil-transaccional`,
            );
          }
        }}
      >
        <p className="text-sm text-gray-700">
          El expediente de la{" "}
          {successClient?.tipo === "persona_moral"
            ? "Persona Moral"
            : "Persona Física"}{" "}
          fue creado correctamente. Puedes continuar con el Perfil
          Transaccional o dejarlo pendiente para completarlo después.
        </p>
      </EmpresaConfirmationModal>
    </div>
  );
}
