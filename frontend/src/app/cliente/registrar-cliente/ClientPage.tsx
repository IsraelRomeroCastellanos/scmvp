//frontend/src/app/cliente/registrar-cliente/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { loadCatalogo, type CatalogItem } from "@/lib/catalogos";

import { createRegistrarClienteValidator } from "./validate";

export default function ClientPage() {
  type TipoCliente = "persona_fisica" | "persona_moral" | "fideicomiso";

  type Errors = Record<string, string>;

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
    observaciones: string;
  };

  type RelatedTipoEntidad = "persona_fisica" | "persona_moral" | "fideicomiso";

  type RelatedPFData = {
    contacto: Record<string, any>;
    persona: Record<string, any>;
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

  type RelatedDuenoRow = {
    tipo_entidad: "persona_fisica";
    nombre_entidad: string;
    nacionalidad: string;
    relacion_con_cliente: string;
    porcentaje_participacion: string;
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

  function valueToCatalogKey(v: string) {
    // En este UI guardamos "clave" en el state (ej. "MEX"), así que regresamos tal cual.
    return v;
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

  const [tipo, setTipo] = useState<TipoCliente>("persona_fisica");

  const tipoRef = useRef<HTMLSelectElement | null>(null);
  // catálogos
  const [paises, setPaises] = useState<CatalogItem[]>([]);
  const [actividades, setActividades] = useState<CatalogItem[]>([]);
  const [giros, setGiros] = useState<CatalogItem[]>([]);

  // form base
  const [empresaId, setEmpresaId] = useState("");
  const [nombreEntidad, setNombreEntidad] = useState("");
  const [nacionalidad, setNacionalidad] = useState(""); // clave catálogo
  const [contactoPais, setContactoPais] = useState("MEX"); // clave catálogo

  // contacto (iteración 1)
  const [email, setEmail] = useState("");
  const [telCodigoPais, setTelCodigoPais] = useState("+52");
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
  const [domPais, setDomPais] = useState("MEX"); // manual (no catálogo)

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

  // PF Datos adicionales (iteración 2)
  const [pfCalidadMigratoria, setPfCalidadMigratoria] = useState(""); // opcional
  const [pfEstadoCivil, setPfEstadoCivil] = useState("");
  const [pfRegimenMatrimonial, setPfRegimenMatrimonial] = useState("");
  const [pfBienesMancomunados, setPfBienesMancomunados] = useState(""); // 'si' | 'no'

  // PF Dirección privada
  const [pfPrivCalle, setPfPrivCalle] = useState("");
  const [pfPrivNumero, setPfPrivNumero] = useState("");
  const [pfPrivColonia, setPfPrivColonia] = useState("");
  const [pfPrivMunicipio, setPfPrivMunicipio] = useState("");
  const [pfPrivCiudadDelegacion, setPfPrivCiudadDelegacion] = useState("");
  const [pfPrivCP, setPfPrivCP] = useState("");
  const [pfPrivEstado, setPfPrivEstado] = useState("");
  const [pfPrivPais, setPfPrivPais] = useState("");

  // PF Ocupación / actividad profesional
  const [pfOcupacion, setPfOcupacion] = useState("");
  const [pfActividadProfesional, setPfActividadProfesional] = useState("");

  // PF PEP / cargo público
  const [pfCargoPublicoActual, setPfCargoPublicoActual] = useState(""); // 'si' | 'no'
  const [pfCargoPublicoPrevio, setPfCargoPublicoPrevio] = useState(""); // 'si' | 'no'
  const [pfCargoPublicoFamiliar, setPfCargoPublicoFamiliar] = useState(""); // 'si' | 'no'
  const [pfPaisNacimiento, setPfPaisNacimiento] = useState("");
  const [pfResidencia, setPfResidencia] = useState(""); // Temporal | Permanente (key/string)
  const [pfNacionalExtranjero, setPfNacionalExtranjero] = useState(""); // Nacional | Extranjero (key/string)

  // PF terceros / dueño beneficiario
  const [pfManifiestaTerceros, setPfManifiestaTerceros] = useState(false);
  const [pfTerceroActividadGiro, setPfTerceroActividadGiro] = useState("");
  const [pfTerceroRelacion, setPfTerceroRelacion] = useState("");
  const [pfNoDocumentacionTercero, setPfNoDocumentacionTercero] =
    useState(false);

  // PM
  const [pfTerceroNombreCompleto, setPfTerceroNombreCompleto] = useState("");
  const [pfTerceroRfc, setPfTerceroRfc] = useState("");
  const [pfTerceroCurp, setPfTerceroCurp] = useState("");
  const [pfTerceroFechaNac, setPfTerceroFechaNac] = useState(""); // AAAAMMDD o YYYY-MM-DD
  const [pfTerceroNacionalidad, setPfTerceroNacionalidad] = useState("MEX");

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
  const [pmBeneficiarioControlador, setPmBeneficiarioControlador] = useState(""); // "si" | "no"
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
  const [pmRepDomPais, setPmRepDomPais] = useState("");

  // PM Beneficiario Controlador (CFF 32-B Ter)
  const [pmBcNombres, setPmBcNombres] = useState("");
  const [pmBcApPat, setPmBcApPat] = useState("");
  const [pmBcApMat, setPmBcApMat] = useState("");

  const [duenosBeneficiariosAplica, setDuenosBeneficiariosAplica] = useState(false);
  const [duenosBeneficiarios, setDuenosBeneficiarios] = useState<DuenoBeneficiarioItem[]>([]);

  const [relatedRecursosAplica, setRelatedRecursosAplica] = useState(false);
  const [relatedRecursos, setRelatedRecursos] = useState<RelatedRecursoRow[]>([]);
  const [relatedDuenosAplica, setRelatedDuenosAplica] = useState(false);
  const [relatedDuenos, setRelatedDuenos] = useState<RelatedDuenoRow[]>([]);

  // PM: Si representante NO es accionista
  const [pmRepEsAccionista, setPmRepEsAccionista] = useState(true);
  const [pmAccNombres, setPmAccNombres] = useState("");
  const [pmAccApPat, setPmAccApPat] = useState("");
  const [pmAccApMat, setPmAccApMat] = useState("");
  const [pmAccFechaNac, setPmAccFechaNac] = useState(""); // YYYY-MM-DD o AAAAMMDD
  const [pmAccPct, setPmAccPct] = useState("");
  const [pmAccNacionalidad, setPmAccNacionalidad] = useState(""); // clave catálogo
  const [pmAccActividadGiro, setPmAccActividadGiro] = useState(""); // clave
  const [pmAccRelacion, setPmAccRelacion] = useState("");
  const [fidIdentificador, setFidIdentificador] = useState("");
  const [fidDenominacionFiduciario, setFidDenominacionFiduciario] = useState("");
  const [fidRfcFiduciario, setFidRfcFiduciario] = useState("");
  const [fidNombre, setFidNombre] = useState("");
  const [fidRepNombreCompleto, setFidRepNombreCompleto] = useState("");
  const [fidRepRfc, setFidRepRfc] = useState("");
  const [fidRepCurp, setFidRepCurp] = useState("");
  const [fidRepFechaNac, setFidRepFechaNac] = useState("");


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

    (async () => {
      try {
        setFatal(null);
        const [p, a, g] = await Promise.all([
          loadCatalogo("sat/c_pais"),
          loadCatalogo("sat/c_actividad_economica"),
          loadCatalogo("internos/giro_mercantil"),
        ]);
        setPaises(p);
        setActividades(a);
        setGiros(g);
      } catch (e: any) {
        setFatal(e?.message ?? "No se pudieron cargar catálogos");
      }
    })();
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
      persona: {
        nombres: "",
        apellido_paterno: "",
        apellido_materno: "",
        fecha_nacimiento: "",
        rfc: "",
        curp: "",
        actividad_economica: "",
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

  function createEmptyRelatedDueno(): RelatedDuenoRow {
    const datos_completos = createEmptyRelatedPFData();
    return {
      tipo_entidad: "persona_fisica",
      nombre_entidad: deriveRelatedNombreEntidad("persona_fisica", datos_completos),
      nacionalidad: "MEX",
      relacion_con_cliente: "",
      porcentaje_participacion: "",
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

    return {
      contacto,
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
        actividad_economica: safeInput(persona?.actividad_economica).trim(),
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

    return {
      tipo_entidad: row.tipo_entidad,
      nombre_entidad:
        deriveRelatedNombreEntidad(row.tipo_entidad, datos_completos) ||
        safeInput(row.nombre_entidad).trim(),
      nacionalidad: valueToCatalogKey(row.nacionalidad) || safeInput(row.nacionalidad).trim() || "MEX",
      relacion_con_cliente: safeInput(row.relacion_con_cliente).trim(),
      sin_documentacion: !!row.sin_documentacion,
      observaciones: safeInput(row.observaciones).trim(),
      datos_completos,
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
      nacionalidad: valueToCatalogKey(row.nacionalidad) || safeInput(row.nacionalidad).trim() || "MEX",
      relacion_con_cliente: safeInput(row.relacion_con_cliente).trim(),
      sin_documentacion: !!row.sin_documentacion,
      observaciones: safeInput(row.observaciones).trim(),
      datos_completos,
    };
  }

  function buildCanonicalDuenoRowFromRelated(row: RelatedDuenoRow) {
    const datos_completos = buildCanonicalPFPayloadData(row.datos_completos);

    return {
      tipo_entidad: "persona_fisica" as const,
      nombre_entidad:
        deriveRelatedNombreEntidad("persona_fisica", datos_completos) ||
        safeInput(row.nombre_entidad).trim(),
      nacionalidad: valueToCatalogKey(row.nacionalidad) || safeInput(row.nacionalidad).trim() || "MEX",
      relacion_con_cliente: safeInput(row.relacion_con_cliente).trim(),
      porcentaje_participacion: safeInput(row.porcentaje_participacion).trim(),
      observaciones: safeInput(row.observaciones).trim(),
      datos_completos,
    };
  }

  function buildCanonicalDuenoRowFromLegacy(row: DuenoBeneficiarioItem) {
    const datos_completos = buildCanonicalPFPayloadData({
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
    });

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

    if (pfManifiestaTerceros) {
      return [
        buildCanonicalRecursoRowFromLegacy({
          tipo_tercero: "persona_fisica",
          nombre_razon_social: pfTerceroNombreCompleto.trim(),
          relacion_con_cliente: pfTerceroRelacion.trim(),
          actividad_giro: pfTerceroActividadGiro.trim(),
          nacionalidad: valueToCatalogKey(pfTerceroNacionalidad) || "MEX",
          sin_documentacion: pfNoDocumentacionTercero,
          rfc: pfNoDocumentacionTercero ? "" : pfTerceroRfc.trim().toUpperCase(),
          curp: pfNoDocumentacionTercero ? "" : pfTerceroCurp.trim().toUpperCase(),
          fecha_nacimiento: pfNoDocumentacionTercero
            ? ""
            : (normalizeToYYYYMMDD(pfTerceroFechaNac) ?? pfTerceroFechaNac.trim()),
          observaciones: "",
        }),
      ];
    }

    return [];
  }

  function buildCanonicalDuenosPayload() {
    if (relatedDuenos.length > 0) {
      return relatedDuenos.map(buildCanonicalDuenoRowFromRelated);
    }

    if (duenosBeneficiarios.length > 0) {
      return duenosBeneficiarios.map(buildCanonicalDuenoRowFromLegacy);
    }

    if (pmBeneficiarioControlador === "si") {
      return [
        buildCanonicalDuenoRowFromLegacy({
          nombres: pmBcNombres.trim(),
          apellido_paterno: pmBcApPat.trim(),
          apellido_materno: pmBcApMat.trim(),
          fecha_nacimiento: "",
          nacionalidad: "MEX",
          relacion_con_cliente: "",
          rfc: "",
          curp: "",
          porcentaje_participacion: "",
          observaciones: "",
        }),
      ];
    }

    return [];
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

            <div className="space-y-1 sm:col-span-3">
              <label className="text-sm font-medium">Actividad económica</label>
              <input
                value={safeInput(persona.actividad_economica)}
                onChange={(e) => updateRelatedRecursoDataField(index, "persona", "actividad_economica", e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
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

            <div className="space-y-1">
              <label className="text-sm font-medium">Giro mercantil</label>
              <input
                value={safeInput(empresa.giro_mercantil)}
                onChange={(e) => updateRelatedRecursoDataField(index, "empresa", "giro_mercantil", e.target.value)}
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

    const empresa_id = Number(empresaId);

    const telefonoStr = buildTelefonoE164Like(telCodigoPais, telNumero, telExt);
    const telefono = buildTelefonoE164Like(telCodigoPais, telNumero, telExt);

    // NORMALIZACIÓN: evita que PF termine enviando fideicomiso por valores inesperados
    if (tipoCliente === "persona_fisica") {
      const act = actividades.find((x) => x.clave === pfActividad);
      const normFecha = normalizeToYYYYMMDD(pfFechaNac) ?? pfFechaNac.trim();

      const idExp =
        normalizeToYYYYMMDD(pfIdExpedicion) ?? pfIdExpedicion.trim();
      const idExpi =
        normalizeToYYYYMMDD(pfIdExpiracion) ?? pfIdExpiracion.trim();
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
            pais_nacimiento: pfPaisNacimiento.trim(),
            residencia: pfResidencia.trim(),
            nacional_extranjero: pfNacionalExtranjero.trim(),
            CargoPublico: pfCargoPublicoActual.trim(),
            BeneficiarioTerceros: pfManifiestaTerceros,
            actividad_economica: act
              ? { clave: act.clave, descripcion: act.descripcion }
              : pfActividad,
          },
          calidad_migratoria: pfCalidadMigratoria.trim() || null,
          estado_civil: pfEstadoCivil.trim(),
          regimen_matrimonial: pfRegimenMatrimonial.trim(),
          bienes_mancomunados: pfBienesMancomunados.trim(),
          direccion_privada: {
            calle: pfPrivCalle.trim(),
            numero: pfPrivNumero.trim(),
            colonia: pfPrivColonia.trim(),
            municipio: pfPrivMunicipio.trim(),
            ciudad_delegacion: pfPrivCiudadDelegacion.trim(),
            codigo_postal: pfPrivCP.trim(),
            estado: pfPrivEstado.trim(),
            pais: pfPrivPais.trim(),
          },
          ocupacion: pfOcupacion.trim(),
          actividad_profesional: pfActividadProfesional.trim(),
          cargo_publico: {
            actual: pfCargoPublicoActual.trim(),
            previo: pfCargoPublicoPrevio.trim(),
            familiar: pfCargoPublicoFamiliar.trim(),
          },
            recursos_terceros_aplica:
              relatedRecursosAplica || recursosTercerosAplica || pfManifiestaTerceros,
            recursos_terceros: buildCanonicalRecursosPayload(),
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

          duenos_beneficiarios_aplica:
            relatedDuenosAplica || duenosBeneficiariosAplica || pmBeneficiarioControlador === "si",
          duenos_beneficiarios: buildCanonicalDuenosPayload(),
          representante_es_accionista: pmRepEsAccionista,
          accionista_tercero: pmRepEsAccionista
            ? null
            : {
                nombres: pmAccNombres.trim(),
                apellido_paterno: pmAccApPat.trim(),
                apellido_materno: pmAccApMat.trim(),
                fecha_nacimiento:
                  normalizeToYYYYMMDD(pmAccFechaNac) ?? pmAccFechaNac.trim(),
                porcentaje_accionario: pmAccPct.trim(),
                nacionalidad: valueToCatalogKey(pmAccNacionalidad),
                actividad_giro: pmAccActividadGiro.trim(),
                relacion: pmAccRelacion.trim(),
              },
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
        },
          duenos_beneficiarios_aplica: duenosBeneficiariosAplica,
          duenos_beneficiarios: duenosBeneficiarios.map((row) => ({
            nombres: row.nombres.trim(),
            apellido_paterno: row.apellido_paterno.trim(),
            apellido_materno: row.apellido_materno.trim(),
            fecha_nacimiento:
              normalizeToYYYYMMDD(row.fecha_nacimiento) ??
              row.fecha_nacimiento.trim(),
            nacionalidad: valueToCatalogKey(row.nacionalidad) || "MEX",
            relacion_con_cliente: row.relacion_con_cliente.trim(),
            rfc: row.rfc.trim().toUpperCase(),
            curp: row.curp.trim().toUpperCase(),
            porcentaje_participacion: row.porcentaje_participacion.trim(),
            observaciones: row.observaciones.trim(),
          })),
      },
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("[DEBUG tipo submit]", {
      tipo,
      tipoRef: tipoRef.current?.value,
    });
    setFatal(null);

    if (!validator.validateAll()) {
      setFatal("Corrige los campos marcados en rojo.");
      return;
    }

      // P1-2 (PM BC): si Beneficiario Controlador = SÍ, exigir mínimos
  
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

    if (tipo === "persona_moral" && pmBeneficiarioControlador === "si") {
        let ok = true;
        const n = (pmBcNombres || "").trim();
        const ap = (pmBcApPat || "").trim();
        const am = (pmBcApMat || "").trim();

        if (!n) { setErr("beneficiario_controlador.nombres", "Nombres del beneficiario controlador es obligatorio"); ok = false; }
        if (!ap) { setErr("beneficiario_controlador.apellido_paterno", "Apellido paterno del beneficiario controlador es obligatorio"); ok = false; }
        if (!am) { setErr("beneficiario_controlador.apellido_materno", "Apellido materno del beneficiario controlador es obligatorio"); ok = false; }

        if (!ok) {
          setFatal("Completa la sección de Beneficiario Controlador para continuar.");
          return;
        }
      }
      // P1-1 PF Terceros: si manifiesta terceros, exigir minimos y no enviar placeholders
      if (tipo === "persona_fisica" && pfManifiestaTerceros) {
        let ok = true;

        const n = (pfTerceroNombreCompleto || "").trim();
        const ag = (pfTerceroActividadGiro || "").trim();
        const rel = (pfTerceroRelacion || "").trim();

        if (!n) { setErr("persona.terceros.nombre_completo", "Nombre completo del tercero es obligatorio"); ok = false; }
        if (!ag) { setErr("persona.terceros.actividad_giro", "Actividad o giro del tercero es obligatorio"); ok = false; }
        if (!rel) { setErr("persona.terceros.relacion", "Relacion con el tercero es obligatoria"); ok = false; }

        if (!pfNoDocumentacionTercero) {
          const r = (pfTerceroRfc || "").trim().toUpperCase();
          const c = (pfTerceroCurp || "").trim().toUpperCase();
          const f = (pfTerceroFechaNac || "").trim();

          if (r && !isRFC(r)) { setErr("persona.terceros.rfc", "RFC del tercero invalido"); ok = false; }
          if (c && !isCURP(c)) { setErr("persona.terceros.curp", "CURP del tercero invalido"); ok = false; }

          const fNorm = normalizeToYYYYMMDD(f) ?? f;
          if (f && !isYYYYMMDD(fNorm)) { setErr("persona.terceros.fecha_nacimiento", "Fecha nacimiento del tercero invalida (AAAAMMDD)"); ok = false; }
        }

        if (!ok) {
          setFatal("Completa la seccion de Terceros para continuar.");
          return;
        }
      }


    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    console.log("TIPO_ANTES_DE_ENVIAR", tipo);
    const payload = buildPayload();

      console.log('[P1-1 payload]', payload);


    try {
      setLoading(true);
      const base =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        "https://scmvp-1jhq.onrender.com";

      const res = await fetch(`${base}/api/cliente/registrar-cliente`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.error || `Error HTTP ${res.status}`;
        setFatal(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
        return;
      }

      // API regresa { ok:true, cliente:{id...} }
      const id = data?.cliente?.id;
      if (id)
        router.push(`/cliente/clientes/${id}`); // sin auto-impresión
      else
        setFatal(
          "Registrado, pero no se recibió id. Revisa respuesta del backend.",
        );
    } catch (err: any) {
      setFatal(err?.message ?? "Error inesperado");
    } finally {
      setLoading(false);
    }

}

  const showAviso = tipo === "persona_fisica" || tipo === "persona_moral";

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
              onChange={(e) => {
                setTipo(e.target.value as TipoCliente);
                setErrors({});
                setFatal(null);
              }}
            >
              <option value="persona_fisica">Persona Física</option>
              <option value="persona_moral">Persona Moral</option>
              <option value="fideicomiso">Fideicomiso</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Empresa ID <span className="text-red-600">*</span>
            </label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${errors["empresa_id"] ? "border-red-500" : "border-gray-300"}`}
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              onBlur={() => validator.validateField("empresa_id")}
              placeholder="Ej. 32"
            />
            {errors["empresa_id"] ? (
              <p className="text-xs text-red-600">{errors["empresa_id"]}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Razón social / Nombre <span className="text-red-600">*</span>
            </label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${errors["nombre_entidad"] ? "border-red-500" : "border-gray-300"}`}
              value={nombreEntidad}
              onChange={(e) => setNombreEntidad(e.target.value)}
              onBlur={() => validator.validateField("nombre_entidad")}
              placeholder="Ej. Alicia Pruebas / Servicios SA / Fideicomiso X"
            />
            {errors["nombre_entidad"] ? (
              <p className="text-xs text-red-600">{errors["nombre_entidad"]}</p>
            ) : null}
          </div>

          <SearchableSelect
            label="Nacionalidad"
            required
            value={nacionalidad}
            items={paises}
            error={errors["nacionalidad"]}
            onChange={(v) => setNacionalidad(v)}
            onBlur={() => validator.validateField("nacionalidad")}
          />

          <SearchableSelect
            label="País (contacto)"
            required
            value={contactoPais}
            items={paises}
            error={errors["contacto.pais"]}
            onChange={(v) => setContactoPais(v)}
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
        <div className="rounded border border-gray-200 p-4 space-y-4">
          <h2 className="font-medium">Domicilio (contacto)</h2>
          <p className="text-xs text-gray-500">
            Captura manual por ahora (no catálogo). En iteraciones posteriores
            lo alineamos a catálogos.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
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

            <div className="space-y-1">
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

            <div className="space-y-1">
              <label className="text-sm font-medium">Interior</label>
              <input
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                value={domInterior}
                onChange={(e) => setDomInterior(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Colonia <span className="text-red-600">*</span>
              </label>
              <input
                className={`w-full rounded border px-3 py-2 text-sm ${errors["contacto.domicilio.colonia"] ? "border-red-500" : "border-gray-300"}`}
                value={domColonia}
                onChange={(e) => setDomColonia(e.target.value)}
                onBlur={() =>
                  validator.validateField("contacto.domicilio.colonia")
                }
              />
              {errors["contacto.domicilio.colonia"] ? (
                <p className="text-xs text-red-600">
                  {errors["contacto.domicilio.colonia"]}
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Municipio <span className="text-red-600">*</span>
              </label>
              <input
                className={`w-full rounded border px-3 py-2 text-sm ${errors["contacto.domicilio.municipio"] ? "border-red-500" : "border-gray-300"}`}
                value={domMunicipio}
                onChange={(e) => setDomMunicipio(e.target.value)}
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

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Ciudad/Delegación <span className="text-red-600">*</span>
              </label>
              <input
                className={`w-full rounded border px-3 py-2 text-sm ${errors["contacto.domicilio.ciudad_delegacion"] ? "border-red-500" : "border-gray-300"}`}
                value={domCiudadDelegacion}
                onChange={(e) => setDomCiudadDelegacion(e.target.value)}
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

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Código Postal <span className="text-red-600">*</span>
              </label>
              <input
                className={`w-full rounded border px-3 py-2 text-sm ${errors["contacto.domicilio.codigo_postal"] ? "border-red-500" : "border-gray-300"}`}
                value={domCP}
                onChange={(e) => setDomCP(e.target.value)}
                onBlur={() =>
                  validator.validateField("contacto.domicilio.codigo_postal")
                }
                placeholder="Ej. 44100"
              />
              {errors["contacto.domicilio.codigo_postal"] ? (
                <p className="text-xs text-red-600">
                  {errors["contacto.domicilio.codigo_postal"]}
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Estado <span className="text-red-600">*</span>
              </label>
              <input
                className={`w-full rounded border px-3 py-2 text-sm ${errors["contacto.domicilio.estado"] ? "border-red-500" : "border-gray-300"}`}
                value={domEstado}
                onChange={(e) => setDomEstado(e.target.value)}
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

            <div className="space-y-1">
              <label className="text-sm font-medium">
                País (domicilio) <span className="text-red-600">*</span>
              </label>
              <input
                className={`w-full rounded border px-3 py-2 text-sm ${errors["contacto.domicilio.pais"] ? "border-red-500" : "border-gray-300"}`}
                value={domPais}
                onChange={(e) => setDomPais(e.target.value)}
                onBlur={() =>
                  validator.validateField("contacto.domicilio.pais")
                }
                placeholder="Ej. México"
              />
              {errors["contacto.domicilio.pais"] ? (
                <p className="text-xs text-red-600">
                  {errors["contacto.domicilio.pais"]}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Persona Física */}
        {tipo === "persona_fisica" && (
          <div className="rounded border border-gray-200 p-4 space-y-4">
            <h2 className="font-medium">Persona Física</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">RFC *</label>
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
                <label className="text-sm font-medium">CURP *</label>
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
                  Fecha nacimiento (AAAAMMDD) *
                </label>
                <input
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
                  placeholder="19900101 (o 1990-01-01)"
                />
                {errors["persona.fecha_nacimiento"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.fecha_nacimiento"]}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Acepta AAAAMMDD o YYYY-MM-DD (se convierte a AAAAMMDD).
                  </p>
                )}
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
                  Apellido materno *
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["persona.apellido_materno"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={pfApMat}
                  onChange={(e) => setPfApMat(e.target.value)}
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
                  País de nacimiento <span className="text-red-600">*</span>
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["persona.pais_nacimiento"] ? "border-red-500" : "border-gray-300"
                  }`}
                  value={pfPaisNacimiento}
                  onChange={(e) => setPfPaisNacimiento(e.target.value)}
                  onBlur={() => validator.validateField("persona.pais_nacimiento")}
                  placeholder="mexico-mx"
                />
                {errors["persona.pais_nacimiento"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.pais_nacimiento"]}
                  </p>
                ) : null}
              </div>

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

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Nacional / Extranjero <span className="text-red-600">*</span>
                </label>
                <select
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["persona.nacional_extranjero"] ? "border-red-500" : "border-gray-300"
                  }`}
                  value={pfNacionalExtranjero}
                  onChange={(e) => setPfNacionalExtranjero(e.target.value)}
                  onBlur={() => validator.validateField("persona.nacional_extranjero")}
                >
                  <option value="">Selecciona</option>
                  <option value="nacional">Nacional</option>
                  <option value="extranjero">Extranjero</option>
                </select>
                {errors["persona.nacional_extranjero"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.nacional_extranjero"]}
                  </p>
                ) : null}
              </div>
            </div>

            <hr className="my-2" />

            <h3 className="font-medium">Identificación / Acreditación</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  Fecha de expedición (AAAAMMDD) *
                </label>
                <input
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
                  placeholder="20240131 (o 2024-01-31)"
                />
                {errors["persona.identificacion.expedicion"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.identificacion.expedicion"]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Fecha de expiración (AAAAMMDD) *
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["persona.identificacion.expiracion"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={pfIdExpiracion}
                  onChange={(e) => setPfIdExpiracion(e.target.value)}
                  onBlur={() =>
                    validator.validateField("persona.identificacion.expiracion")
                  }
                  placeholder="20290131 (o 2029-01-31)"
                />
                {errors["persona.identificacion.expiracion"] ? (
                  <p className="text-xs text-red-600">
                    {errors["persona.identificacion.expiracion"]}
                  </p>
                ) : null}
              </div>

              <hr className="my-2" />

              <h3 className="font-medium">
                Estado civil / régimen matrimonial
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Estado civil *</label>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.estado_civil"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfEstadoCivil}
                    onChange={(e) => setPfEstadoCivil(e.target.value)}
                    onBlur={() =>
                      validator.validateField("persona.estado_civil")
                    }
                    placeholder="Soltero(a) / Casado(a) / ..."
                  />
                  {errors["persona.estado_civil"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.estado_civil"]}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Régimen matrimonial *
                  </label>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.regimen_matrimonial"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfRegimenMatrimonial}
                    onChange={(e) => setPfRegimenMatrimonial(e.target.value)}
                    onBlur={() =>
                      validator.validateField("persona.regimen_matrimonial")
                    }
                    placeholder="Sociedad conyugal / Separación de bienes / ..."
                  />
                  {errors["persona.regimen_matrimonial"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.regimen_matrimonial"]}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Bienes mancomunados *
                  </label>
                  <select
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.bienes_mancomunados"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfBienesMancomunados}
                    onChange={(e) => setPfBienesMancomunados(e.target.value)}
                    onBlur={() =>
                      validator.validateField("persona.bienes_mancomunados")
                    }
                  >
                    <option value="">Selecciona...</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                  {errors["persona.bienes_mancomunados"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.bienes_mancomunados"]}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1 md:col-span-3">
                  <label className="text-sm font-medium">
                    Calidad migratoria (opcional)
                  </label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    value={pfCalidadMigratoria}
                    onChange={(e) => setPfCalidadMigratoria(e.target.value)}
                    placeholder="Temporal / Permanente / ..."
                  />
                </div>
              </div>

              <hr className="my-2" />

              <h3 className="font-medium">Dirección privada</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Calle *</label>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.direccion_privada.calle"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfPrivCalle}
                    onChange={(e) => setPfPrivCalle(e.target.value)}
                    onBlur={() =>
                      validator.validateField("persona.direccion_privada.calle")
                    }
                  />
                  {errors["persona.direccion_privada.calle"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.direccion_privada.calle"]}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Número *</label>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.direccion_privada.numero"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfPrivNumero}
                    onChange={(e) => setPfPrivNumero(e.target.value)}
                    onBlur={() =>
                      validator.validateField(
                        "persona.direccion_privada.numero",
                      )
                    }
                  />
                  {errors["persona.direccion_privada.numero"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.direccion_privada.numero"]}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Colonia *</label>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.direccion_privada.colonia"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfPrivColonia}
                    onChange={(e) => setPfPrivColonia(e.target.value)}
                    onBlur={() =>
                      validator.validateField(
                        "persona.direccion_privada.colonia",
                      )
                    }
                  />
                  {errors["persona.direccion_privada.colonia"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.direccion_privada.colonia"]}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Municipio *</label>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.direccion_privada.municipio"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfPrivMunicipio}
                    onChange={(e) => setPfPrivMunicipio(e.target.value)}
                    onBlur={() =>
                      validator.validateField(
                        "persona.direccion_privada.municipio",
                      )
                    }
                  />
                  {errors["persona.direccion_privada.municipio"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.direccion_privada.municipio"]}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Ciudad/Delegación *
                  </label>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.direccion_privada.ciudad_delegacion"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfPrivCiudadDelegacion}
                    onChange={(e) => setPfPrivCiudadDelegacion(e.target.value)}
                    onBlur={() =>
                      validator.validateField(
                        "persona.direccion_privada.ciudad_delegacion",
                      )
                    }
                  />
                  {errors["persona.direccion_privada.ciudad_delegacion"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.direccion_privada.ciudad_delegacion"]}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Código postal *</label>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.direccion_privada.codigo_postal"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfPrivCP}
                    onChange={(e) => setPfPrivCP(e.target.value)}
                    onBlur={() =>
                      validator.validateField(
                        "persona.direccion_privada.codigo_postal",
                      )
                    }
                    placeholder="44100"
                  />
                  {errors["persona.direccion_privada.codigo_postal"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.direccion_privada.codigo_postal"]}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Estado *</label>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.direccion_privada.estado"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfPrivEstado}
                    onChange={(e) => setPfPrivEstado(e.target.value)}
                    onBlur={() =>
                      validator.validateField(
                        "persona.direccion_privada.estado",
                      )
                    }
                    placeholder="Jalisco"
                  />
                  {errors["persona.direccion_privada.estado"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.direccion_privada.estado"]}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">País *</label>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.direccion_privada.pais"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfPrivPais}
                    onChange={(e) => setPfPrivPais(e.target.value)}
                    onBlur={() =>
                      validator.validateField("persona.direccion_privada.pais")
                    }
                    placeholder="México"
                  />
                  {errors["persona.direccion_privada.pais"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.direccion_privada.pais"]}
                    </p>
                  ) : null}
                </div>
              </div>

              <hr className="my-2" />

              <h3 className="font-medium">Ocupación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Ocupación *</label>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.ocupacion"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfOcupacion}
                    onChange={(e) => setPfOcupacion(e.target.value)}
                    onBlur={() => validator.validateField("persona.ocupacion")}
                  />
                  {errors["persona.ocupacion"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.ocupacion"]}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Actividad profesional *
                  </label>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.actividad_profesional"] ? "border-red-500" : "border-gray-300"}`}
                    value={pfActividadProfesional}
                    onChange={(e) => setPfActividadProfesional(e.target.value)}
                    onBlur={() =>
                      validator.validateField("persona.actividad_profesional")
                    }
                  />
                  {errors["persona.actividad_profesional"] ? (
                    <p className="text-xs text-red-600">
                      {errors["persona.actividad_profesional"]}
                    </p>
                  ) : null}
                </div>
              </div>

              <hr className="my-2" />

              <h3 className="font-medium">Cargo público</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">
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

                <div className="space-y-1">
                  <label className="text-sm font-medium">
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

                <div className="space-y-1">
                  <label className="text-sm font-medium">
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

              <hr className="my-2" />

              <h3 className="font-medium">
                Dueño beneficiario / recursos de terceros
              </h3>
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={relatedRecursosAplica}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setRelatedRecursosAplica(v);

                      if (!v) {
                        setRelatedRecursos([]);
                      } else if (relatedRecursos.length === 0) {
                        setRelatedRecursos([createEmptyRelatedRecurso()]);
                      }
                    }}
                  />
                  <span>
                    Manifiesto que tengo conocimiento de la existencia del dueño
                    beneficiario y/o parte o totalidad de los recursos provienen
                    de terceros.
                  </span>
                </label>

                {relatedRecursosAplica ? (
                  <div className="rounded border border-gray-200 p-3 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600">
                        En caso de responder que sí, captura uno o más registros.
                      </p>
                      <button
                        type="button"
                        className="rounded border border-gray-300 px-3 py-1 text-sm"
                        onClick={() => addRelatedRecursoRow()}
                      >
                        Agregar
                      </button>
                    </div>

                    {relatedRecursos.map((row, index) => (
                      <div key={index} className="rounded border border-gray-200 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            Recurso de tercero #{index + 1}
                          </p>
                          <button
                            type="button"
                            className="rounded border border-red-300 px-3 py-1 text-sm text-red-700"
                            onClick={() => removeRelatedRecursoRow(index)}
                          >
                            Eliminar
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Tipo entidad</label>
                            <select
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                              value={row.tipo_entidad}
                              onChange={(e) =>
                                updateRelatedRecursoSubtype(
                                  index,
                                  e.target.value as RelatedTipoEntidad,
                                )
                              }
                            >
                              <option value="persona_fisica">Persona física</option>
                              <option value="persona_moral">Persona moral</option>
                              <option value="fideicomiso">Fideicomiso</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm font-medium">Relación con cliente</label>
                            <input
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                              value={row.relacion_con_cliente}
                              onChange={(e) =>
                                updateRelatedRecursoCommonField(
                                  index,
                                  "relacion_con_cliente",
                                  e.target.value,
                                )
                              }
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm font-medium">Nacionalidad</label>
                            <input
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                              value={row.nacionalidad}
                              onChange={(e) =>
                                updateRelatedRecursoCommonField(
                                  index,
                                  "nacionalidad",
                                  e.target.value,
                                )
                              }
                            />
                          </div>

                          <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium">Nombre entidad (derivado)</label>
                            <input
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                              value={row.nombre_entidad}
                              readOnly
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-sm font-medium">Observaciones</label>
                            <input
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                              value={row.observaciones}
                              onChange={(e) =>
                                updateRelatedRecursoCommonField(
                                  index,
                                  "observaciones",
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
                              updateRelatedRecursoCommonField(
                                index,
                                "sin_documentacion",
                                e.target.checked,
                              )
                            }
                          />
                          <span>Sin documentación</span>
                        </label>

                        {renderRelatedRecursoSubtypeFields(row, index)}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>


              <hr className="my-2" />

              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={duenosBeneficiariosAplica}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setDuenosBeneficiariosAplica(v);

                      if (!v) {
                        setDuenosBeneficiarios([]);
                      } else if (duenosBeneficiarios.length === 0) {
                        setDuenosBeneficiarios([createEmptyDuenoBeneficiario()]);
                      }
                    }}
                  />
                  <span>El fideicomiso cuenta con dueños beneficiarios.</span>
                </label>

                {duenosBeneficiariosAplica ? (
                  <div className="rounded border border-gray-200 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Dueños beneficiarios</p>
                      <button
                        type="button"
                        className="rounded border border-gray-300 px-3 py-1 text-sm"
                        onClick={addDuenoBeneficiarioRow}
                      >
                        Agregar
                      </button>
                    </div>
                    {duenosBeneficiarios.map((row, index) => (
                      <div key={index} className="rounded border border-gray-200 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Dueño beneficiario #{index + 1}</p>
                          <button
                            type="button"
                            className="rounded border border-red-300 px-3 py-1 text-sm text-red-700"
                            onClick={() => removeDuenoBeneficiarioRow(index)}
                          >
                            Eliminar
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Nombres</label>
                            <input
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                              value={row.nombres}
                              onChange={(e) =>
                                updateDuenoBeneficiarioRow(index, "nombres", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Apellido paterno</label>
                            <input
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                              value={row.apellido_paterno}
                              onChange={(e) =>
                                updateDuenoBeneficiarioRow(index, "apellido_paterno", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Apellido materno</label>
                            <input
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                              value={row.apellido_materno}
                              onChange={(e) =>
                                updateDuenoBeneficiarioRow(index, "apellido_materno", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
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
    </div>
  );
}
