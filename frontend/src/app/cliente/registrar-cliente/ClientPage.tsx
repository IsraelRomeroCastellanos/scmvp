//frontend/src/app/cliente/registrar-cliente/page.tsx
"use client";

export const dynamic = "force-dynamic";

import {useEffect, useMemo, useState, useRef} from "react";
import { useRouter } from "next/navigation";
import { loadCatalogo, type CatalogItem } from "@/lib/catalogos";

import { createRegistrarClienteValidator } from "./validate";

type TipoCliente = "persona_fisica" | "persona_moral" | "fideicomiso";

type Errors = Record<string, string>;

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

function InnerRegistrarClientePage() {

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);

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
  const [contactoPais, setContactoPais] = useState(""); // clave catálogo

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
  const [domPais, setDomPais] = useState(""); // manual (no catálogo)

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

  // PF terceros / dueño beneficiario
  const [pfManifiestaTerceros, setPfManifiestaTerceros] = useState(false);
  const [pfTerceroActividadGiro, setPfTerceroActividadGiro] = useState("");
  const [pfTerceroRelacion, setPfTerceroRelacion] = useState("");
  const [pfNoDocumentacionTercero, setPfNoDocumentacionTercero] =
    useState(false);

  // PM
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

  // PM Identificación representante (iteración 1)
  const [pmRepIdTipo, setPmRepIdTipo] = useState("");
  const [pmRepIdAutoridad, setPmRepIdAutoridad] = useState("");
  const [pmRepIdNumero, setPmRepIdNumero] = useState("");
  const [pmRepIdExpedicion, setPmRepIdExpedicion] = useState("");
  const [pmRepIdExpiracion, setPmRepIdExpiracion] = useState("");

  // FIDE (sin cambios)
  const [fidIdentificador, setFidIdentificador] = useState("");
  const [fidDenominacion, setFidDenominacion] = useState("");
  const [fidRfcFiduciario, setFidRfcFiduciario] = useState("");

  const [repNombres, setRepNombres] = useState("");
  const [repApPat, setRepApPat] = useState("");
  const [repApMat, setRepApMat] = useState("");
  const [repFechaNac, setRepFechaNac] = useState(""); // acepta YYYY-MM-DD o AAAAMMDD
  const [repRfc, setRepRfc] = useState("");
  const [repCurp, setRepCurp] = useState("");

  const [errors, setErrors] = useState<Errors>({});




  
  // Validator (extraído a ./validate.ts)
  const validator = createRegistrarClienteValidator({
    tipoCliente: tipo,
    values: {
      // TODO: agrega aquí tus estados/valores usados por validate.ts
      // Ejemplos (ajusta a tus nombres reales):
      // empresaId,
      // nombreEntidad,
      // nacionalidad,
      // contactoPais,
      // contactoEmail,
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

function buildContacto() {
    return {
      pais: valueToCatalogKey(contactoPais),

      email: email.trim(),

      telefono: buildTelefonoE164Like(telCodigoPais, telNumero, telExt),

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
    const tipoFromRef = (tipoRef.current?.value as TipoCliente | undefined);
    const tipoCliente: TipoCliente = (tipoFromRef === "persona_fisica" || tipoFromRef === "persona_moral" || tipoFromRef === "fideicomiso")
      ? tipoFromRef
      : ((tipo === "persona_fisica" || tipo === "persona_moral" || tipo === "fideicomiso") ? tipo : "persona_fisica");

  const contacto = buildContacto();

    const empresa_id = Number(empresaId);

    const telefono = buildTelefonoE164Like(telCodigoPais, telNumero, telExt);

    


    function buildPayload() {

        // NORMALIZACIÓN: evita que PF termine enviando fideicomiso por valores inesperados
if (tipoCliente === "persona_fisica") {
      const act = actividades.find((x) => x.clave === pfActividad);
      const normFecha = normalizeToYYYYMMDD(pfFechaNac) ?? pfFechaNac.trim();

      const idExp =
        normalizeToYYYYMMDD(pfIdExpedicion) ?? pfIdExpedicion.trim();
      const idExpi =
        normalizeToYYYYMMDD(pfIdExpiracion) ?? pfIdExpiracion.trim();
  return {
        empresa_id: parseInt(empresaId, 10),
        tipo_cliente: "persona_fisica",
        nombre_entidad: nombreEntidad.trim(),
        nacionalidad: valueToCatalogKey(nacionalidad),
        contacto,

        datos_completos: {
          contacto,

          persona: {
            tipo: "persona_fisica",
            rfc: pfRfc.trim().toUpperCase(),
            curp: pfCurp.trim().toUpperCase(),
            fecha_nacimiento: normFecha,
            nombres: pfNombres.trim(),
            apellido_paterno: pfApPat.trim(),
            apellido_materno: pfApMat.trim(),
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
          terceros: {
            manifiesta: pfManifiestaTerceros,
            actividad_giro: pfManifiestaTerceros
              ? pfTerceroActividadGiro.trim()
              : null,
            relacion: pfManifiestaTerceros ? pfTerceroRelacion.trim() : null,
            sin_documentacion: pfManifiestaTerceros
              ? pfNoDocumentacionTercero
              : null,
          },
        },
        beneficiario_controlador: {
          nombres: pmBcNombres.trim(),
          apellido_paterno: pmBcApPat.trim(),
          apellido_materno: pmBcApMat.trim(),
        },
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
      };
    }
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
      tipo_cliente: "persona_moral",
      nombre_entidad: nombreEntidad.trim(),
      nacionalidad: valueToCatalogKey(nacionalidad),
      contacto,

      datos_completos: {
        contacto,

        empresa: {
          tipo: "persona_moral",
          rfc: pmRfc.trim().toUpperCase(),
          regimen_capital: pmRegimenCapital.trim(),
          fecha_constitucion: pmFechaNorm,
          giro_mercantil: giro
            ? { clave: giro.clave, descripcion: giro.descripcion }
            : pmGiro,
        },
        representante: {
          nombre_completo: (
            pmRepNombreCompleto.trim() ||
            [pmRepNombres, pmRepApPat, pmRepApMat]
              .map((x) => x.trim())
              .filter(Boolean)
              .join(" ")
          ).trim(),
          nombres: pmRepNombres.trim(),
          apellido_paterno: pmRepApPat.trim(),
          apellido_materno: pmRepApMat.trim(),
          fecha_nacimiento:
            normalizeToYYYYMMDD(pmRepFechaNac) ?? pmRepFechaNac.trim(),
          nacionalidad: valueToCatalogKey(pmRepNacionalidad),
          regimen_estancia_mexico: pmRepRegimenEstancia.trim() || null,
          curp: pmRepCurp.trim().toUpperCase(),
          rfc: pmRepRfc.trim().toUpperCase(),
          telefono_casa: pmRepTelCasa.trim(),
          celular: pmRepCelular.trim(),
          domicilio_mexico: {
            calle: pmRepDomCalle.trim(),
            numero: pmRepDomNumero.trim(),
            interior: pmRepDomInterior.trim() || null,
            colonia: pmRepDomColonia.trim(),
            municipio: pmRepDomMunicipio.trim(),
            ciudad_delegacion: pmRepDomCiudadDelegacion.trim(),
            codigo_postal: pmRepDomCP.trim(),
            estado: pmRepDomEstado.trim(),
            pais: pmRepDomPais.trim(),
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
    };
  }

  // fideicomiso (sin cambios)
  const nombreCompleto = [repNombres, repApPat, repApMat]
    .map((x) => x.trim())
    .filter(Boolean)
    .join(" ");

  const repFechaNorm = normalizeToYYYYMMDD(repFechaNac) ?? repFechaNac.trim();
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
        denominacion_fiduciario: fidDenominacion.trim(),
        rfc_fiduciario: fidRfcFiduciario.trim().toUpperCase(),
      },
      representante: {
        nombre_completo: nombreCompleto,
        rfc: repRfc.trim().toUpperCase(),
        curp: repCurp.trim().toUpperCase(),
        fecha_nacimiento: repFechaNorm,
      },
    },
  };


  }


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFatal(null);

    if (!validator.validateAll()) {
      setFatal("Corrige los campos marcados en rojo.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    console.log("TIPO_ANTES_DE_ENVIAR", tipo);
    const payload = buildPayload();

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
  if (!mounted) return null;

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
              ref={tipoRef} value={tipo}
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
            <label className="text-sm font-medium">
              Nombre entidad <span className="text-red-600">*</span>
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
              onBlur={() => validator.validateField("contacto.telefono.codigo_pais")}
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
                onBlur={() => validator.validateField("contacto.domicilio.calle")}
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
                onBlur={() => validator.validateField("contacto.domicilio.numero")}
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
                onBlur={() => validator.validateField("contacto.domicilio.colonia")}
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
                onBlur={() => validator.validateField("contacto.domicilio.municipio")}
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
                  validator.validateField("contacto.domicilio.ciudad_delegacion")
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
                onBlur={() => validator.validateField("contacto.domicilio.codigo_postal")}
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
                onBlur={() => validator.validateField("contacto.domicilio.estado")}
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
                onBlur={() => validator.validateField("contacto.domicilio.pais")}
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
                  onBlur={() => validator.validateField("persona.fecha_nacimiento")}
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
                  onBlur={() => validator.validateField("persona.apellido_paterno")}
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
                  onBlur={() => validator.validateField("persona.apellido_materno")}
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
                onBlur={() => validator.validateField("persona.actividad_economica")}
              />
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
                  onBlur={() => validator.validateField("persona.identificacion.tipo")}
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
                  onBlur={() => validator.validateField("persona.identificacion.numero")}
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
                    onBlur={() => validator.validateField("persona.estado_civil")}
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
                    onBlur={() => validator.validateField("persona.regimen_matrimonial")}
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
                    onBlur={() => validator.validateField("persona.bienes_mancomunados")}
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
                      validator.validateField("persona.direccion_privada.numero")
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
                      validator.validateField("persona.direccion_privada.colonia")
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
                      validator.validateField("persona.direccion_privada.municipio")
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
                      validator.validateField("persona.direccion_privada.codigo_postal")
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
                      validator.validateField("persona.direccion_privada.estado")
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
                    onBlur={() => validator.validateField("persona.cargo_publico.actual")}
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
                    onBlur={() => validator.validateField("persona.cargo_publico.previo")}
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
                    checked={pfManifiestaTerceros}
                    onChange={(e) => setPfManifiestaTerceros(e.target.checked)}
                  />
                  <span>
                    Manifiesto que tengo conocimiento de la existencia del dueño
                    beneficiario y/o parte o totalidad de los recursos provienen
                    de terceros.
                  </span>
                </label>

                {pfManifiestaTerceros ? (
                  <div className="rounded border border-gray-200 p-3 space-y-3">
                    <p className="text-xs text-gray-600">
                      En caso de responder que sí, llena la información
                      adicional para identificar al dueño beneficiario y/o
                      tercero.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Actividad o giro del negocio del tercero *
                        </label>
                        <input
                          className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.terceros.actividad_giro"] ? "border-red-500" : "border-gray-300"}`}
                          value={pfTerceroActividadGiro}
                          onChange={(e) =>
                            setPfTerceroActividadGiro(e.target.value)
                          }
                          onBlur={() =>
                            validator.validateField("persona.terceros.actividad_giro")
                          }
                        />
                        {errors["persona.terceros.actividad_giro"] ? (
                          <p className="text-xs text-red-600">
                            {errors["persona.terceros.actividad_giro"]}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">
                          Relación con el tercero *
                        </label>
                        <input
                          className={`w-full rounded border px-3 py-2 text-sm ${errors["persona.terceros.relacion"] ? "border-red-500" : "border-gray-300"}`}
                          value={pfTerceroRelacion}
                          onChange={(e) => setPfTerceroRelacion(e.target.value)}
                          onBlur={() =>
                            validator.validateField("persona.terceros.relacion")
                          }
                        />
                        {errors["persona.terceros.relacion"] ? (
                          <p className="text-xs text-red-600">
                            {errors["persona.terceros.relacion"]}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={pfNoDocumentacionTercero}
                        onChange={(e) =>
                          setPfNoDocumentacionTercero(e.target.checked)
                        }
                      />
                      <span>
                        Manifiesto que no cuento con la documentación requerida
                        del dueño beneficiario.
                      </span>
                    </label>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Persona Moral */}
        {tipo === "persona_moral" && (
          <div className="rounded border border-gray-200 p-4 space-y-4">
            <h2 className="font-medium">Persona Moral</h2>

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
                  onBlur={() => validator.validateField("empresa.regimen_capital")}
                  placeholder="Variable / Fijo / ..."
                />
                {errors["empresa.regimen_capital"] ? (
                  <p className="text-xs text-red-600">
                    {errors["empresa.regimen_capital"]}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Fecha constitución (AAAAMMDD) *
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["empresa.fecha_constitucion"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={pmFechaConst}
                  onChange={(e) => setPmFechaConst(e.target.value)}
                  onBlur={() => validator.validateField("empresa.fecha_constitucion")}
                  placeholder="20010131 (o 2001-01-31)"
                />
                {errors["empresa.fecha_constitucion"] ? (
                  <p className="text-xs text-red-600">
                    {errors["empresa.fecha_constitucion"]}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Acepta AAAAMMDD o YYYY-MM-DD (se convierte a AAAAMMDD).
                  </p>
                )}
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
                  onBlur={() => validator.validateField("representante.nombres.pm")}
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
                  Fecha nacimiento (AAAAMMDD) *
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.fecha_nacimiento.pm"] ? "border-red-500" : "border-gray-300"}`}
                  value={pmRepFechaNac}
                  onChange={(e) => setPmRepFechaNac(e.target.value)}
                  onBlur={() =>
                    validator.validateField("representante.fecha_nacimiento.pm")
                  }
                  placeholder="19900101 (o 1990-01-01)"
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
                onBlur={() => validator.validateField("representante.nacionalidad.pm")}
              />

              <div className="space-y-1 md:col-span-3">
                <label className="text-sm font-medium">
                  Régimen jurídico de legal estancia en México (si aplica)
                </label>
                <input
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  value={pmRepRegimenEstancia}
                  onChange={(e) => setPmRepRegimenEstancia(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">CURP *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.curp.pm"] ? "border-red-500" : "border-gray-300"}`}
                  value={pmRepCurp}
                  onChange={(e) => setPmRepCurp(e.target.value)}
                  onBlur={() => validator.validateField("representante.curp.pm")}
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
                  onBlur={() => validator.validateField("representante.telefono_casa.pm")}
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
                  onBlur={() => validator.validateField("representante.celular.pm")}
                  placeholder="+52 5512345678"
                />
                {errors["representante.celular.pm"] ? (
                  <p className="text-xs text-red-600">
                    {errors["representante.celular.pm"]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1 md:col-span-3">
                <label className="text-sm font-medium">
                  Nombre completo (compatibilidad API) *
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.nombre_completo.pm"] ? "border-red-500" : "border-gray-300"}`}
                  value={pmRepNombreCompleto}
                  onChange={(e) => setPmRepNombreCompleto(e.target.value)}
                  onBlur={() =>
                    validator.validateField("representante.nombre_completo.pm")
                  }
                  placeholder="Se puede dejar vacío si llenas nombres y apellidos"
                />
                {errors["representante.nombre_completo.pm"] ? (
                  <p className="text-xs text-red-600">
                    {errors["representante.nombre_completo.pm"]}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    El backend actual valida nombre_completo; lo enviamos
                    generado si lo dejas vacío.
                  </p>
                )}
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
                      validator.validateField("representante.domicilio.calle.pm")
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
                      validator.validateField("representante.domicilio.numero.pm")
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
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.domicilio.colonia.pm"] ? "border-red-500" : "border-gray-300"}`}
                    value={pmRepDomColonia}
                    onChange={(e) => setPmRepDomColonia(e.target.value)}
                    onBlur={() =>
                      validator.validateField("representante.domicilio.colonia.pm")
                    }
                  />
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
                    onBlur={() =>
                      validator.validateField("representante.domicilio.municipio.pm")
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
                    onChange={(e) => setPmRepDomCP(e.target.value)}
                    onBlur={() =>
                      validator.validateField("representante.domicilio.codigo_postal.pm")
                    }
                    placeholder="44100"
                  />
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
                    onBlur={() =>
                      validator.validateField("representante.domicilio.estado.pm")
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
                    value={pmRepDomPais}
                    onChange={(e) => setPmRepDomPais(e.target.value)}
                    onBlur={() =>
                      validator.validateField("representante.domicilio.pais.pm")
                    }
                    placeholder="México"
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nombres *</label>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["beneficiario_controlador.nombres"] ? "border-red-500" : "border-gray-300"}`}
                    value={pmBcNombres}
                    onChange={(e) => setPmBcNombres(e.target.value)}
                    onBlur={() =>
                      validator.validateField("beneficiario_controlador.nombres")
                    }
                  />
                  {errors["beneficiario_controlador.nombres"] ? (
                    <p className="text-xs text-red-600">
                      {errors["beneficiario_controlador.nombres"]}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Apellido paterno *
                  </label>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["beneficiario_controlador.apellido_paterno"] ? "border-red-500" : "border-gray-300"}`}
                    value={pmBcApPat}
                    onChange={(e) => setPmBcApPat(e.target.value)}
                    onBlur={() =>
                      validator.validateField("beneficiario_controlador.apellido_paterno")
                    }
                  />
                  {errors["beneficiario_controlador.apellido_paterno"] ? (
                    <p className="text-xs text-red-600">
                      {errors["beneficiario_controlador.apellido_paterno"]}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Apellido materno *
                  </label>
                  <input
                    className={`w-full rounded border px-3 py-2 text-sm ${errors["beneficiario_controlador.apellido_materno"] ? "border-red-500" : "border-gray-300"}`}
                    value={pmBcApMat}
                    onChange={(e) => setPmBcApMat(e.target.value)}
                    onBlur={() =>
                      validator.validateField("beneficiario_controlador.apellido_materno")
                    }
                  />
                  {errors["beneficiario_controlador.apellido_materno"] ? (
                    <p className="text-xs text-red-600">
                      {errors["beneficiario_controlador.apellido_materno"]}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded border border-gray-200 p-3 space-y-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={pmRepEsAccionista}
                  onChange={(e) => setPmRepEsAccionista(e.target.checked)}
                />
                <span>El Representante Legal es Accionista</span>
              </label>

              {!pmRepEsAccionista ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nombres *</label>
                    <input
                      className={`w-full rounded border px-3 py-2 text-sm ${errors["accionista.nombres"] ? "border-red-500" : "border-gray-300"}`}
                      value={pmAccNombres}
                      onChange={(e) => setPmAccNombres(e.target.value)}
                      onBlur={() => validator.validateField("accionista.nombres")}
                    />
                    {errors["accionista.nombres"] ? (
                      <p className="text-xs text-red-600">
                        {errors["accionista.nombres"]}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Apellido paterno *
                    </label>
                    <input
                      className={`w-full rounded border px-3 py-2 text-sm ${errors["accionista.apellido_paterno"] ? "border-red-500" : "border-gray-300"}`}
                      value={pmAccApPat}
                      onChange={(e) => setPmAccApPat(e.target.value)}
                      onBlur={() =>
                        validator.validateField("accionista.apellido_paterno")
                      }
                    />
                    {errors["accionista.apellido_paterno"] ? (
                      <p className="text-xs text-red-600">
                        {errors["accionista.apellido_paterno"]}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Apellido materno *
                    </label>
                    <input
                      className={`w-full rounded border px-3 py-2 text-sm ${errors["accionista.apellido_materno"] ? "border-red-500" : "border-gray-300"}`}
                      value={pmAccApMat}
                      onChange={(e) => setPmAccApMat(e.target.value)}
                      onBlur={() =>
                        validator.validateField("accionista.apellido_materno")
                      }
                    />
                    {errors["accionista.apellido_materno"] ? (
                      <p className="text-xs text-red-600">
                        {errors["accionista.apellido_materno"]}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Fecha de nacimiento (AAAAMMDD) *
                    </label>
                    <input
                      className={`w-full rounded border px-3 py-2 text-sm ${errors["accionista.fecha_nacimiento"] ? "border-red-500" : "border-gray-300"}`}
                      value={pmAccFechaNac}
                      onChange={(e) => setPmAccFechaNac(e.target.value)}
                      onBlur={() =>
                        validator.validateField("accionista.fecha_nacimiento")
                      }
                      placeholder="19900101"
                    />
                    {errors["accionista.fecha_nacimiento"] ? (
                      <p className="text-xs text-red-600">
                        {errors["accionista.fecha_nacimiento"]}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      % Accionario *
                    </label>
                    <input
                      className={`w-full rounded border px-3 py-2 text-sm ${errors["accionista.porcentaje"] ? "border-red-500" : "border-gray-300"}`}
                      value={pmAccPct}
                      onChange={(e) => setPmAccPct(e.target.value)}
                      onBlur={() => validator.validateField("accionista.porcentaje")}
                      placeholder="25"
                    />
                    {errors["accionista.porcentaje"] ? (
                      <p className="text-xs text-red-600">
                        {errors["accionista.porcentaje"]}
                      </p>
                    ) : null}
                  </div>

                  <SearchableSelect
                    label="Nacionalidad (accionista)"
                    required
                    value={pmAccNacionalidad}
                    items={paises}
                    error={errors["accionista.nacionalidad"]}
                    onChange={(v) => setPmAccNacionalidad(v)}
                    onBlur={() => validator.validateField("accionista.nacionalidad")}
                  />

                  <SearchableSelect
                    label="Actividad / giro del negocio del tercero"
                    required
                    value={pmAccActividadGiro}
                    items={giros}
                    error={errors["accionista.actividad_giro"]}
                    onChange={(v) => setPmAccActividadGiro(v)}
                    onBlur={() => validator.validateField("accionista.actividad_giro")}
                  />

                  <div className="space-y-1 md:col-span-3">
                    <label className="text-sm font-medium">
                      Relación con el tercero *
                    </label>
                    <input
                      className={`w-full rounded border px-3 py-2 text-sm ${errors["accionista.relacion"] ? "border-red-500" : "border-gray-300"}`}
                      value={pmAccRelacion}
                      onChange={(e) => setPmAccRelacion(e.target.value)}
                      onBlur={() => validator.validateField("accionista.relacion")}
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
                    validator.validateField("representante.identificacion.tipo.pm")
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
                    validator.validateField("representante.identificacion.autoridad.pm")
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
                    validator.validateField("representante.identificacion.numero.pm")
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
                  Fecha de expedición (AAAAMMDD) *
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["representante.identificacion.expedicion.pm"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={pmRepIdExpedicion}
                  onChange={(e) => setPmRepIdExpedicion(e.target.value)}
                  onBlur={() =>
                    validator.validateField("representante.identificacion.expedicion.pm")
                  }
                  placeholder="20240131 (o 2024-01-31)"
                />
                {errors["representante.identificacion.expedicion.pm"] ? (
                  <p className="text-xs text-red-600">
                    {errors["representante.identificacion.expedicion.pm"]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Fecha de expiración (AAAAMMDD) *
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["representante.identificacion.expiracion.pm"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={pmRepIdExpiracion}
                  onChange={(e) => setPmRepIdExpiracion(e.target.value)}
                  onBlur={() =>
                    validator.validateField("representante.identificacion.expiracion.pm")
                  }
                  placeholder="20290131 (o 2029-01-31)"
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

        {/* Fideicomiso (sin cambios) */}
        {tipo === "fideicomiso" && (
          <div className="rounded border border-gray-200 p-4 space-y-4">
            <h2 className="font-medium">Fideicomiso</h2>

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
                  value={fidDenominacion}
                  onChange={(e) => setFidDenominacion(e.target.value)}
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
                  onChange={(e) => setFidRfcFiduciario(e.target.value)}
                  onBlur={() => validator.validateField("fideicomiso.rfc_fiduciario")}
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
                  onBlur={() => validator.validateField("fideicomiso.identificador")}
                />
                {errors["fideicomiso.identificador"] ? (
                  <p className="text-xs text-red-600">
                    {errors["fideicomiso.identificador"]}
                  </p>
                ) : null}
              </div>
            </div>

            <hr className="my-2" />

            <h3 className="font-medium">Representante / Apoderado legal</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre(s) *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["representante.nombres"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={repNombres}
                  onChange={(e) => setRepNombres(e.target.value)}
                  onBlur={() => validator.validateField("representante.nombres")}
                />
                {errors["representante.nombres"] ? (
                  <p className="text-xs text-red-600">
                    {errors["representante.nombres"]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido paterno *
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["representante.apellido_paterno"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={repApPat}
                  onChange={(e) => setRepApPat(e.target.value)}
                  onBlur={() => validator.validateField("representante.apellido_paterno")}
                />
                {errors["representante.apellido_paterno"] ? (
                  <p className="text-xs text-red-600">
                    {errors["representante.apellido_paterno"]}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Apellido materno *
                </label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors["representante.apellido_materno"]
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  value={repApMat}
                  onChange={(e) => setRepApMat(e.target.value)}
                  onBlur={() => validator.validateField("representante.apellido_materno")}
                />
                {errors["representante.apellido_materno"] ? (
                  <p className="text-xs text-red-600">
                    {errors["representante.apellido_materno"]}
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
                  value={repFechaNac}
                  onChange={(e) => setRepFechaNac(e.target.value)}
                  onBlur={() => validator.validateField("representante.fecha_nacimiento")}
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

              <div className="space-y-1">
                <label className="text-sm font-medium">RFC *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.rfc"] ? "border-red-500" : "border-gray-300"}`}
                  value={repRfc}
                  onChange={(e) => setRepRfc(e.target.value)}
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
                  className={`w-full rounded border px-3 py-2 text-sm ${errors["representante.curp"] ? "border-red-500" : "border-gray-300"}`}
                  value={repCurp}
                  onChange={(e) => setRepCurp(e.target.value)}
                  onBlur={() => validator.validateField("representante.curp")}
                  placeholder="PEPJ900101HDFRRN09"
                />
                {errors["representante.curp"] ? (
                  <p className="text-xs text-red-600">
                    {errors["representante.curp"]}
                  </p>
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



export default function ClientPageWrapper() {
  // Ejecuta la página real
  const out: any = (typeof InnerRegistrarClientePage === "function")
    ? InnerRegistrarClientePage()
    : null;

  // Si por accidente regresa un objeto (payload/cliente), lo hacemos renderizable
  if (out && typeof out === "object" && !out.$$typeof) {
    return (
      <pre className="whitespace-pre-wrap text-xs">
        {JSON.stringify(out, null, 2)}
      </pre>
    );
  }

  // JSX normal o null
  return out ?? null;
}
