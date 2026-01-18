//frontend/src/app/cliente/registrar-cliente/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadCatalogo, type CatalogItem } from '@/lib/catalogos';

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

type Errors = Record<string, string>;

function isNonEmpty(v: any) {
  return typeof v === 'string' && v.trim().length > 0;
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
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Acepta:
 * - "YYYYMMDD" -> regresa igual
 * - "YYYY-MM-DD" -> regresa "YYYYMMDD"
 * - otros -> regresa null
 */
function normalizeToYYYYMMDD(input: string): string | null {
  const s = (input ?? '').trim();
  if (!s) return null;
  if (/^\d{8}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.replaceAll('-', '');
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
  onBlur
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
  const [q, setQ] = useState('');

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
    return found ? fmtItem(found) : '';
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
          className={`w-full rounded border px-3 py-2 text-sm ${error ? 'border-red-500' : 'border-gray-300'}`}
          placeholder={placeholder ?? 'Buscar...'}
          value={open ? q : selectedLabel}
          onFocus={() => {
            setOpen(true);
            setQ('');
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
                    setQ('');
                  }}
                >
                  {fmtItem(it)}
                </button>
              ))}
              {filtered.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>}
            </div>
          </div>
        )}
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

const AVISO_LEGAL =
  'DE CONFORMIDAD CON LO DISPUESTO EN LA LEY FEDERAL PARA LA PREVENCIÓN E IDENTIFICACIÓN DE OPERACIONES CON RECURSOS DE PROCEDENCIA ILÍCITA; SOLICITAMOS QUE PROPORCIONE LA SIGUIENTE INFORMACIÓN:';

function buildTelefonoE164Like(cc: string, num: string, ext?: string) {
  const a = (cc ?? '').trim();
  const b = (num ?? '').trim();
  const e = (ext ?? '').trim();
  if (!a || !b) return '';
  return e ? `${a} ${b} ext ${e}` : `${a} ${b}`;
}

export default function RegistrarClientePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);

  const [tipo, setTipo] = useState<TipoCliente>('persona_fisica');

  // catálogos
  const [paises, setPaises] = useState<CatalogItem[]>([]);
  const [actividades, setActividades] = useState<CatalogItem[]>([]);
  const [giros, setGiros] = useState<CatalogItem[]>([]);

  // form base
  const [empresaId, setEmpresaId] = useState('');
  const [nombreEntidad, setNombreEntidad] = useState('');
  const [nacionalidad, setNacionalidad] = useState(''); // clave catálogo
  const [contactoPais, setContactoPais] = useState(''); // clave catálogo

  // contacto (iteración 1)
  const [email, setEmail] = useState('');
  const [telCodigoPais, setTelCodigoPais] = useState('+52');
  const [telNumero, setTelNumero] = useState('');
  const [telExt, setTelExt] = useState('');

  // PF
  const [pfNombres, setPfNombres] = useState('');
  const [pfApPat, setPfApPat] = useState('');
  const [pfApMat, setPfApMat] = useState('');
  const [pfActividad, setPfActividad] = useState(''); // clave
  const [pfRfc, setPfRfc] = useState('');
  const [pfCurp, setPfCurp] = useState('');
  const [pfFechaNac, setPfFechaNac] = useState(''); // acepta YYYY-MM-DD o AAAAMMDD

  // PF Identificación (iteración 1)
  const [pfIdTipo, setPfIdTipo] = useState('');
  const [pfIdAutoridad, setPfIdAutoridad] = useState('');
  const [pfIdNumero, setPfIdNumero] = useState('');
  const [pfIdExpedicion, setPfIdExpedicion] = useState(''); // YYYY-MM-DD o AAAAMMDD
  const [pfIdExpiracion, setPfIdExpiracion] = useState(''); // YYYY-MM-DD o AAAAMMDD

  // PM
  const [pmRfc, setPmRfc] = useState('');
  const [pmFechaConst, setPmFechaConst] = useState(''); // YYYY-MM-DD o AAAAMMDD
  const [pmGiro, setPmGiro] = useState(''); // clave
  const [pmRepNombreCompleto, setPmRepNombreCompleto] = useState('');

  // PM Identificación representante (iteración 1)
  const [pmRepIdTipo, setPmRepIdTipo] = useState('');
  const [pmRepIdAutoridad, setPmRepIdAutoridad] = useState('');
  const [pmRepIdNumero, setPmRepIdNumero] = useState('');
  const [pmRepIdExpedicion, setPmRepIdExpedicion] = useState('');
  const [pmRepIdExpiracion, setPmRepIdExpiracion] = useState('');

  // FIDE (sin cambios)
  const [fidIdentificador, setFidIdentificador] = useState('');
  const [fidDenominacion, setFidDenominacion] = useState('');
  const [fidRfcFiduciario, setFidRfcFiduciario] = useState('');

  const [repNombres, setRepNombres] = useState('');
  const [repApPat, setRepApPat] = useState('');
  const [repApMat, setRepApMat] = useState('');
  const [repFechaNac, setRepFechaNac] = useState(''); // acepta YYYY-MM-DD o AAAAMMDD
  const [repRfc, setRepRfc] = useState('');
  const [repCurp, setRepCurp] = useState('');

  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    (async () => {
      try {
        setFatal(null);
        const [p, a, g] = await Promise.all([
          loadCatalogo('sat/c_pais'),
          loadCatalogo('sat/c_actividad_economica'),
          loadCatalogo('internos/giro_mercantil')
        ]);
        setPaises(p);
        setActividades(a);
        setGiros(g);
      } catch (e: any) {
        setFatal(e?.message ?? 'No se pudieron cargar catálogos');
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

  function validateField(path: string): boolean {
    setErr(path, undefined);

    // base
    if (path === 'empresa_id') {
      if (!/^\d+$/.test(empresaId.trim())) return (setErr(path, 'empresa_id inválido'), false);
      return true;
    }
    if (path === 'nombre_entidad') {
      if (!isNonEmpty(nombreEntidad)) return (setErr(path, 'nombre_entidad es obligatorio'), false);
      return true;
    }
    if (path === 'nacionalidad') {
      if (!isNonEmpty(nacionalidad)) return (setErr(path, 'nacionalidad es obligatoria'), false);
      return true;
    }
    if (path === 'contacto.pais') {
      if (!isNonEmpty(contactoPais)) return (setErr(path, 'contacto.pais es obligatorio'), false);
      return true;
    }

    // contacto (iteración 1)
    if (path === 'contacto.email') {
      if (!isNonEmpty(email)) return (setErr(path, 'contacto.email es obligatorio'), false);
      if (!isEmail(email)) return (setErr(path, 'contacto.email inválido'), false);
      return true;
    }
    if (path === 'contacto.telefono.codigo_pais') {
      if (!isNonEmpty(telCodigoPais)) return (setErr(path, 'contacto.telefono.codigo_pais es obligatorio'), false);
      if (!isPhoneCountryCode(telCodigoPais)) return (setErr(path, 'contacto.telefono.codigo_pais inválido'), false);
      return true;
    }
    if (path === 'contacto.telefono.numero') {
      if (!isNonEmpty(telNumero)) return (setErr(path, 'contacto.telefono.numero es obligatorio'), false);
      if (!isPhoneNumber(telNumero)) return (setErr(path, 'contacto.telefono.numero inválido'), false);
      return true;
    }
    if (path === 'contacto.telefono.ext') {
      if (!isExt(telExt)) return (setErr(path, 'contacto.telefono.ext inválida'), false);
      return true;
    }
    if (path === 'contacto.telefono') {
      // compat: BE espera string no vacía
      const tel = buildTelefonoE164Like(telCodigoPais, telNumero, telExt);
      if (!isNonEmpty(tel)) return (setErr(path, 'contacto.telefono es obligatorio'), false);
      return true;
    }

    // PF
    if (path === 'persona.rfc') {
      if (tipo !== 'persona_fisica') return true;
      if (!isNonEmpty(pfRfc)) return (setErr(path, 'persona.rfc es obligatorio'), false);
      if (!isRFC(pfRfc)) return (setErr(path, 'persona.rfc inválido'), false);
      return true;
    }
    if (path === 'persona.curp') {
      if (tipo !== 'persona_fisica') return true;
      if (!isNonEmpty(pfCurp)) return (setErr(path, 'persona.curp es obligatorio'), false);
      if (!isCURP(pfCurp)) return (setErr(path, 'persona.curp inválido'), false);
      return true;
    }
    if (path === 'persona.fecha_nacimiento') {
      if (tipo !== 'persona_fisica') return true;
      if (!isNonEmpty(pfFechaNac)) return (setErr(path, 'persona.fecha_nacimiento es obligatoria'), false);

      const norm = normalizeToYYYYMMDD(pfFechaNac);
      if (!norm) return (setErr(path, 'persona.fecha_nacimiento inválida (AAAAMMDD)'), false);
      if (!isYYYYMMDD(norm)) return (setErr(path, 'persona.fecha_nacimiento inválida (AAAAMMDD)'), false);

      if (pfFechaNac.trim() !== norm) setPfFechaNac(norm);
      return true;
    }
    if (path === 'persona.nombres') {
      if (tipo !== 'persona_fisica') return true;
      if (!isNonEmpty(pfNombres)) return (setErr(path, 'persona.nombres es obligatorio'), false);
      return true;
    }
    if (path === 'persona.apellido_paterno') {
      if (tipo !== 'persona_fisica') return true;
      if (!isNonEmpty(pfApPat)) return (setErr(path, 'persona.apellido_paterno es obligatorio'), false);
      return true;
    }
    if (path === 'persona.apellido_materno') {
      if (tipo !== 'persona_fisica') return true;
      if (!isNonEmpty(pfApMat)) return (setErr(path, 'persona.apellido_materno es obligatorio'), false);
      return true;
    }
    if (path === 'persona.actividad_economica') {
      if (tipo !== 'persona_fisica') return true;
      if (!isNonEmpty(pfActividad)) return (setErr(path, 'persona.actividad_economica es obligatoria'), false);
      return true;
    }

    // PF identificación (iteración 1)
    if (path === 'persona.identificacion.tipo') {
      if (tipo !== 'persona_fisica') return true;
      if (!isNonEmpty(pfIdTipo)) return (setErr(path, 'persona.identificacion.tipo es obligatorio'), false);
      return true;
    }
    if (path === 'persona.identificacion.autoridad') {
      if (tipo !== 'persona_fisica') return true;
      if (!isNonEmpty(pfIdAutoridad)) return (setErr(path, 'persona.identificacion.autoridad es obligatoria'), false);
      return true;
    }
    if (path === 'persona.identificacion.numero') {
      if (tipo !== 'persona_fisica') return true;
      if (!isNonEmpty(pfIdNumero)) return (setErr(path, 'persona.identificacion.numero es obligatorio'), false);
      return true;
    }
    if (path === 'persona.identificacion.expedicion') {
      if (tipo !== 'persona_fisica') return true;
      if (!isNonEmpty(pfIdExpedicion)) return (setErr(path, 'persona.identificacion.fecha_expedicion es obligatoria'), false);
      const norm = normalizeToYYYYMMDD(pfIdExpedicion);
      if (!norm || !isYYYYMMDD(norm))
        return (setErr(path, 'persona.identificacion.fecha_expedicion inválida (AAAAMMDD)'), false);
      if (pfIdExpedicion.trim() !== norm) setPfIdExpedicion(norm);
      return true;
    }
    if (path === 'persona.identificacion.expiracion') {
      if (tipo !== 'persona_fisica') return true;
      if (!isNonEmpty(pfIdExpiracion)) return (setErr(path, 'persona.identificacion.fecha_expiracion es obligatoria'), false);
      const norm = normalizeToYYYYMMDD(pfIdExpiracion);
      if (!norm || !isYYYYMMDD(norm))
        return (setErr(path, 'persona.identificacion.fecha_expiracion inválida (AAAAMMDD)'), false);
      if (pfIdExpiracion.trim() !== norm) setPfIdExpiracion(norm);
      return true;
    }

    // PM
    if (path === 'empresa.rfc') {
      if (tipo !== 'persona_moral') return true;
      if (!isNonEmpty(pmRfc)) return (setErr(path, 'empresa.rfc es obligatorio'), false);
      if (!isRFC(pmRfc)) return (setErr(path, 'empresa.rfc inválido'), false);
      return true;
    }
    if (path === 'empresa.fecha_constitucion') {
      if (tipo !== 'persona_moral') return true;
      if (!isNonEmpty(pmFechaConst)) return (setErr(path, 'empresa.fecha_constitucion es obligatoria'), false);

      const norm = normalizeToYYYYMMDD(pmFechaConst);
      if (!norm || !isYYYYMMDD(norm)) return (setErr(path, 'empresa.fecha_constitucion inválida (AAAAMMDD)'), false);

      if (pmFechaConst.trim() !== norm) setPmFechaConst(norm);
      return true;
    }
    if (path === 'empresa.giro_mercantil') {
      if (tipo !== 'persona_moral') return true;
      if (!isNonEmpty(pmGiro)) return (setErr(path, 'empresa.giro_mercantil es obligatorio'), false);
      return true;
    }
    if (path === 'representante.nombre_completo.pm') {
      if (tipo !== 'persona_moral') return true;
      if (!isNonEmpty(pmRepNombreCompleto)) return (setErr(path, 'representante.nombre_completo es obligatorio'), false);
      return true;
    }

    // PM identificación representante (iteración 1)
    if (path === 'representante.identificacion.tipo.pm') {
      if (tipo !== 'persona_moral') return true;
      if (!isNonEmpty(pmRepIdTipo)) return (setErr(path, 'representante.identificacion.tipo es obligatorio'), false);
      return true;
    }
    if (path === 'representante.identificacion.autoridad.pm') {
      if (tipo !== 'persona_moral') return true;
      if (!isNonEmpty(pmRepIdAutoridad)) return (setErr(path, 'representante.identificacion.autoridad es obligatoria'), false);
      return true;
    }
    if (path === 'representante.identificacion.numero.pm') {
      if (tipo !== 'persona_moral') return true;
      if (!isNonEmpty(pmRepIdNumero)) return (setErr(path, 'representante.identificacion.numero es obligatorio'), false);
      return true;
    }
    if (path === 'representante.identificacion.expedicion.pm') {
      if (tipo !== 'persona_moral') return true;
      if (!isNonEmpty(pmRepIdExpedicion))
        return (setErr(path, 'representante.identificacion.fecha_expedicion es obligatoria'), false);
      const norm = normalizeToYYYYMMDD(pmRepIdExpedicion);
      if (!norm || !isYYYYMMDD(norm))
        return (setErr(path, 'representante.identificacion.fecha_expedicion inválida (AAAAMMDD)'), false);
      if (pmRepIdExpedicion.trim() !== norm) setPmRepIdExpedicion(norm);
      return true;
    }
    if (path === 'representante.identificacion.expiracion.pm') {
      if (tipo !== 'persona_moral') return true;
      if (!isNonEmpty(pmRepIdExpiracion))
        return (setErr(path, 'representante.identificacion.fecha_expiracion es obligatoria'), false);
      const norm = normalizeToYYYYMMDD(pmRepIdExpiracion);
      if (!norm || !isYYYYMMDD(norm))
        return (setErr(path, 'representante.identificacion.fecha_expiracion inválida (AAAAMMDD)'), false);
      if (pmRepIdExpiracion.trim() !== norm) setPmRepIdExpiracion(norm);
      return true;
    }

    // FIDE (sin cambios)
    if (path === 'fideicomiso.identificador') {
      if (tipo !== 'fideicomiso') return true;
      if (!isNonEmpty(fidIdentificador)) return (setErr(path, 'fideicomiso.identificador es obligatorio'), false);
      return true;
    }
    if (path === 'fideicomiso.denominacion_fiduciario') {
      if (tipo !== 'fideicomiso') return true;
      if (!isNonEmpty(fidDenominacion))
        return (setErr(path, 'fideicomiso.denominacion_fiduciario es obligatorio'), false);
      return true;
    }
    if (path === 'fideicomiso.rfc_fiduciario') {
      if (tipo !== 'fideicomiso') return true;
      if (!isNonEmpty(fidRfcFiduciario)) return (setErr(path, 'fideicomiso.rfc_fiduciario es obligatorio'), false);
      if (!isRFC(fidRfcFiduciario)) return (setErr(path, 'fideicomiso.rfc_fiduciario inválido'), false);
      return true;
    }
    if (path === 'representante.nombres') {
      if (tipo !== 'fideicomiso') return true;
      if (!isNonEmpty(repNombres)) return (setErr(path, 'representante.nombres es obligatorio'), false);
      return true;
    }
    if (path === 'representante.apellido_paterno') {
      if (tipo !== 'fideicomiso') return true;
      if (!isNonEmpty(repApPat)) return (setErr(path, 'representante.apellido_paterno es obligatorio'), false);
      return true;
    }
    if (path === 'representante.apellido_materno') {
      if (tipo !== 'fideicomiso') return true;
      if (!isNonEmpty(repApMat)) return (setErr(path, 'representante.apellido_materno es obligatorio'), false);
      return true;
    }
    if (path === 'representante.fecha_nacimiento') {
      if (tipo !== 'fideicomiso') return true;
      if (!isNonEmpty(repFechaNac)) return (setErr(path, 'representante.fecha_nacimiento es obligatoria'), false);

      const norm = normalizeToYYYYMMDD(repFechaNac);
      if (!norm || !isYYYYMMDD(norm)) return (setErr(path, 'representante.fecha_nacimiento inválida (AAAAMMDD)'), false);

      if (repFechaNac.trim() !== norm) setRepFechaNac(norm);
      return true;
    }
    if (path === 'representante.rfc') {
      if (tipo !== 'fideicomiso') return true;
      if (!isNonEmpty(repRfc)) return (setErr(path, 'representante.rfc es obligatorio'), false);
      if (!isRFC(repRfc)) return (setErr(path, 'representante.rfc inválido'), false);
      return true;
    }
    if (path === 'representante.curp') {
      if (tipo !== 'fideicomiso') return true;
      if (!isNonEmpty(repCurp)) return (setErr(path, 'representante.curp es obligatorio'), false);
      if (!isCURP(repCurp)) return (setErr(path, 'representante.curp inválido'), false);
      return true;
    }

    return true;
  }

  function validateAll(): boolean {
    const fields = [
      'empresa_id',
      'nombre_entidad',
      'nacionalidad',
      'contacto.pais',
      'contacto.email',
      'contacto.telefono.codigo_pais',
      'contacto.telefono.numero',
      'contacto.telefono.ext',
      'contacto.telefono'
    ];

    if (tipo === 'persona_fisica') {
      fields.push(
        'persona.rfc',
        'persona.curp',
        'persona.fecha_nacimiento',
        'persona.nombres',
        'persona.apellido_paterno',
        'persona.apellido_materno',
        'persona.actividad_economica',
        'persona.identificacion.tipo',
        'persona.identificacion.autoridad',
        'persona.identificacion.numero',
        'persona.identificacion.expedicion',
        'persona.identificacion.expiracion'
      );
    }
    if (tipo === 'persona_moral') {
      fields.push(
        'empresa.rfc',
        'empresa.fecha_constitucion',
        'empresa.giro_mercantil',
        'representante.nombre_completo.pm',
        'representante.identificacion.tipo.pm',
        'representante.identificacion.autoridad.pm',
        'representante.identificacion.numero.pm',
        'representante.identificacion.expedicion.pm',
        'representante.identificacion.expiracion.pm'
      );
    }
    if (tipo === 'fideicomiso') {
      fields.push(
        'fideicomiso.identificador',
        'fideicomiso.denominacion_fiduciario',
        'fideicomiso.rfc_fiduciario',
        'representante.nombres',
        'representante.apellido_paterno',
        'representante.apellido_materno',
        'representante.fecha_nacimiento',
        'representante.rfc',
        'representante.curp'
      );
    }

    let ok = true;
    for (const f of fields) {
      if (!validateField(f)) ok = false;
    }
    return ok;
  }

  function buildPayload() {
    const empresa_id = Number(empresaId);

    const telefono = buildTelefonoE164Like(telCodigoPais, telNumero, telExt);

    const contacto = {
      pais: valueToCatalogKey(contactoPais),
      email: email.trim(),
      telefono,
      telefono_detalle: {
        codigo_pais: telCodigoPais.trim(),
        numero: telNumero.trim(),
        ext: telExt.trim() || null
      }
    };

    if (tipo === 'persona_fisica') {
      const act = actividades.find((x) => x.clave === pfActividad);
      const normFecha = normalizeToYYYYMMDD(pfFechaNac) ?? pfFechaNac.trim();

      const idExp = normalizeToYYYYMMDD(pfIdExpedicion) ?? pfIdExpedicion.trim();
      const idExpi = normalizeToYYYYMMDD(pfIdExpiracion) ?? pfIdExpiracion.trim();

      return {
        empresa_id,
        tipo_cliente: 'persona_fisica',
        nombre_entidad: nombreEntidad.trim(),
        nacionalidad: valueToCatalogKey(nacionalidad),
        datos_completos: {
          contacto,
          persona: {
            tipo: 'persona_fisica',
            rfc: pfRfc.trim().toUpperCase(),
            curp: pfCurp.trim().toUpperCase(),
            fecha_nacimiento: normFecha,
            nombres: pfNombres.trim(),
            apellido_paterno: pfApPat.trim(),
            apellido_materno: pfApMat.trim(),
            actividad_economica: act ? { clave: act.clave, descripcion: act.descripcion } : pfActividad,
            identificacion: {
              tipo: pfIdTipo.trim(),
              autoridad: pfIdAutoridad.trim(),
              numero: pfIdNumero.trim(),
              fecha_expedicion: idExp,
              fecha_expiracion: idExpi
            }
          }
        }
      };
    }

    if (tipo === 'persona_moral') {
      const giro = giros.find((x) => x.clave === pmGiro);
      const repExp = normalizeToYYYYMMDD(pmRepIdExpedicion) ?? pmRepIdExpedicion.trim();
      const repExpi = normalizeToYYYYMMDD(pmRepIdExpiracion) ?? pmRepIdExpiracion.trim();

      const pmFechaNorm = normalizeToYYYYMMDD(pmFechaConst) ?? pmFechaConst.trim();

      return {
        empresa_id,
        tipo_cliente: 'persona_moral',
        nombre_entidad: nombreEntidad.trim(),
        nacionalidad: valueToCatalogKey(nacionalidad),
        datos_completos: {
          contacto,
          empresa: {
            tipo: 'persona_moral',
            rfc: pmRfc.trim().toUpperCase(),
            fecha_constitucion: pmFechaNorm,
            giro_mercantil: giro ? { clave: giro.clave, descripcion: giro.descripcion } : pmGiro
          },
          representante: {
            nombre_completo: pmRepNombreCompleto.trim(),
            identificacion: {
              tipo: pmRepIdTipo.trim(),
              autoridad: pmRepIdAutoridad.trim(),
              numero: pmRepIdNumero.trim(),
              fecha_expedicion: repExp,
              fecha_expiracion: repExpi
            }
          }
        }
      };
    }

    // fideicomiso (sin cambios)
    const nombreCompleto = [repNombres, repApPat, repApMat]
      .map((x) => x.trim())
      .filter(Boolean)
      .join(' ');

    const repFechaNorm = normalizeToYYYYMMDD(repFechaNac) ?? repFechaNac.trim();

    return {
      empresa_id,
      tipo_cliente: 'fideicomiso',
      nombre_entidad: nombreEntidad.trim(),
      nacionalidad: valueToCatalogKey(nacionalidad),
      datos_completos: {
        contacto,
        fideicomiso: {
          identificador: fidIdentificador.trim(),
          denominacion_fiduciario: fidDenominacion.trim(),
          rfc_fiduciario: fidRfcFiduciario.trim().toUpperCase()
        },
        representante: {
          nombre_completo: nombreCompleto,
          rfc: repRfc.trim().toUpperCase(),
          curp: repCurp.trim().toUpperCase(),
          fecha_nacimiento: repFechaNorm
        }
      }
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFatal(null);

    if (!validateAll()) {
      setFatal('Corrige los campos marcados en rojo.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const payload = buildPayload();

    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://scmvp-1jhq.onrender.com';

      const res = await fetch(`${base}/api/cliente/registrar-cliente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.error || `Error HTTP ${res.status}`;
        setFatal(msg);
        return;
      }

      // API regresa { ok:true, cliente:{id...} }
      const id = data?.cliente?.id;
      if (id) router.push(`/cliente/clientes/${id}`); // sin auto-impresión
      else setFatal('Registrado, pero no se recibió id. Revisa respuesta del backend.');
    } catch (err: any) {
      setFatal(err?.message ?? 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  const showAviso = tipo === 'persona_fisica' || tipo === 'persona_moral';

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Registrar Cliente</h1>

      {showAviso ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{AVISO_LEGAL}</div>
      ) : null}

      {fatal ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{fatal}</div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* BASE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo de cliente *</label>
            <select
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
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
              className={`w-full rounded border px-3 py-2 text-sm ${errors['empresa_id'] ? 'border-red-500' : 'border-gray-300'}`}
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              onBlur={() => validateField('empresa_id')}
              placeholder="Ej. 32"
            />
            {errors['empresa_id'] ? <p className="text-xs text-red-600">{errors['empresa_id']}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Nombre entidad <span className="text-red-600">*</span>
            </label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${errors['nombre_entidad'] ? 'border-red-500' : 'border-gray-300'}`}
              value={nombreEntidad}
              onChange={(e) => setNombreEntidad(e.target.value)}
              onBlur={() => validateField('nombre_entidad')}
              placeholder="Ej. Alicia Pruebas / Servicios SA / Fideicomiso X"
            />
            {errors['nombre_entidad'] ? <p className="text-xs text-red-600">{errors['nombre_entidad']}</p> : null}
          </div>

          <SearchableSelect
            label="Nacionalidad"
            required
            value={nacionalidad}
            items={paises}
            error={errors['nacionalidad']}
            onChange={(v) => setNacionalidad(v)}
            onBlur={() => validateField('nacionalidad')}
          />

          <SearchableSelect
            label="País (contacto)"
            required
            value={contactoPais}
            items={paises}
            error={errors['contacto.pais']}
            onChange={(v) => setContactoPais(v)}
            onBlur={() => validateField('contacto.pais')}
          />

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${errors['contacto.email'] ? 'border-red-500' : 'border-gray-300'}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => validateField('contacto.email')}
              placeholder="correo@dominio.com"
            />
            {errors['contacto.email'] ? <p className="text-xs text-red-600">{errors['contacto.email']}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Teléfono (código país) <span className="text-red-600">*</span>
            </label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${
                errors['contacto.telefono.codigo_pais'] ? 'border-red-500' : 'border-gray-300'
              }`}
              value={telCodigoPais}
              onChange={(e) => setTelCodigoPais(e.target.value)}
              onBlur={() => validateField('contacto.telefono.codigo_pais')}
              placeholder="+52"
            />
            {errors['contacto.telefono.codigo_pais'] ? (
              <p className="text-xs text-red-600">{errors['contacto.telefono.codigo_pais']}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Teléfono (número) <span className="text-red-600">*</span>
            </label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${
                errors['contacto.telefono.numero'] ? 'border-red-500' : 'border-gray-300'
              }`}
              value={telNumero}
              onChange={(e) => setTelNumero(e.target.value)}
              onBlur={() => validateField('contacto.telefono.numero')}
              placeholder="5512345678"
            />
            {errors['contacto.telefono.numero'] ? (
              <p className="text-xs text-red-600">{errors['contacto.telefono.numero']}</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Extensión</label>
            <input
              className={`w-full rounded border px-3 py-2 text-sm ${
                errors['contacto.telefono.ext'] ? 'border-red-500' : 'border-gray-300'
              }`}
              value={telExt}
              onChange={(e) => setTelExt(e.target.value)}
              onBlur={() => validateField('contacto.telefono.ext')}
              placeholder="123"
            />
            {errors['contacto.telefono.ext'] ? <p className="text-xs text-red-600">{errors['contacto.telefono.ext']}</p> : null}
          </div>
        </div>

        {/* Persona Física */}
        {tipo === 'persona_fisica' && (
          <div className="rounded border border-gray-200 p-4 space-y-4">
            <h2 className="font-medium">Persona Física</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">RFC *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${errors['persona.rfc'] ? 'border-red-500' : 'border-gray-300'}`}
                  value={pfRfc}
                  onChange={(e) => setPfRfc(e.target.value)}
                  onBlur={() => validateField('persona.rfc')}
                  placeholder="XAXX010101000"
                />
                {errors['persona.rfc'] ? <p className="text-xs text-red-600">{errors['persona.rfc']}</p> : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">CURP *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${errors['persona.curp'] ? 'border-red-500' : 'border-gray-300'}`}
                  value={pfCurp}
                  onChange={(e) => setPfCurp(e.target.value)}
                  onBlur={() => validateField('persona.curp')}
                  placeholder="PEPJ900101HDFRRN09"
                />
                {errors['persona.curp'] ? <p className="text-xs text-red-600">{errors['persona.curp']}</p> : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha nacimiento (AAAAMMDD) *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['persona.fecha_nacimiento'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pfFechaNac}
                  onChange={(e) => setPfFechaNac(e.target.value)}
                  onBlur={() => validateField('persona.fecha_nacimiento')}
                  placeholder="19900101 (o 1990-01-01)"
                />
                {errors['persona.fecha_nacimiento'] ? (
                  <p className="text-xs text-red-600">{errors['persona.fecha_nacimiento']}</p>
                ) : (
                  <p className="text-xs text-gray-500">Acepta AAAAMMDD o YYYY-MM-DD (se convierte a AAAAMMDD).</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre(s) *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${errors['persona.nombres'] ? 'border-red-500' : 'border-gray-300'}`}
                  value={pfNombres}
                  onChange={(e) => setPfNombres(e.target.value)}
                  onBlur={() => validateField('persona.nombres')}
                />
                {errors['persona.nombres'] ? <p className="text-xs text-red-600">{errors['persona.nombres']}</p> : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido paterno *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['persona.apellido_paterno'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pfApPat}
                  onChange={(e) => setPfApPat(e.target.value)}
                  onBlur={() => validateField('persona.apellido_paterno')}
                />
                {errors['persona.apellido_paterno'] ? (
                  <p className="text-xs text-red-600">{errors['persona.apellido_paterno']}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido materno *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['persona.apellido_materno'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pfApMat}
                  onChange={(e) => setPfApMat(e.target.value)}
                  onBlur={() => validateField('persona.apellido_materno')}
                />
                {errors['persona.apellido_materno'] ? (
                  <p className="text-xs text-red-600">{errors['persona.apellido_materno']}</p>
                ) : null}
              </div>

              <SearchableSelect
                label="Actividad económica"
                required
                value={pfActividad}
                items={actividades}
                error={errors['persona.actividad_economica']}
                onChange={(v) => setPfActividad(v)}
                onBlur={() => validateField('persona.actividad_economica')}
              />
            </div>

            <hr className="my-2" />

            <h3 className="font-medium">Identificación / Acreditación</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo / nombre del documento *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['persona.identificacion.tipo'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pfIdTipo}
                  onChange={(e) => setPfIdTipo(e.target.value)}
                  onBlur={() => validateField('persona.identificacion.tipo')}
                  placeholder="INE / Pasaporte / ..."
                />
                {errors['persona.identificacion.tipo'] ? (
                  <p className="text-xs text-red-600">{errors['persona.identificacion.tipo']}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Autoridad que expide *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['persona.identificacion.autoridad'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pfIdAutoridad}
                  onChange={(e) => setPfIdAutoridad(e.target.value)}
                  onBlur={() => validateField('persona.identificacion.autoridad')}
                  placeholder="INE / SRE / ..."
                />
                {errors['persona.identificacion.autoridad'] ? (
                  <p className="text-xs text-red-600">{errors['persona.identificacion.autoridad']}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Número de identificación *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['persona.identificacion.numero'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pfIdNumero}
                  onChange={(e) => setPfIdNumero(e.target.value)}
                  onBlur={() => validateField('persona.identificacion.numero')}
                />
                {errors['persona.identificacion.numero'] ? (
                  <p className="text-xs text-red-600">{errors['persona.identificacion.numero']}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha de expedición (AAAAMMDD) *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['persona.identificacion.expedicion'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pfIdExpedicion}
                  onChange={(e) => setPfIdExpedicion(e.target.value)}
                  onBlur={() => validateField('persona.identificacion.expedicion')}
                  placeholder="20240131 (o 2024-01-31)"
                />
                {errors['persona.identificacion.expedicion'] ? (
                  <p className="text-xs text-red-600">{errors['persona.identificacion.expedicion']}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha de expiración (AAAAMMDD) *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['persona.identificacion.expiracion'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pfIdExpiracion}
                  onChange={(e) => setPfIdExpiracion(e.target.value)}
                  onBlur={() => validateField('persona.identificacion.expiracion')}
                  placeholder="20290131 (o 2029-01-31)"
                />
                {errors['persona.identificacion.expiracion'] ? (
                  <p className="text-xs text-red-600">{errors['persona.identificacion.expiracion']}</p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Persona Moral */}
        {tipo === 'persona_moral' && (
          <div className="rounded border border-gray-200 p-4 space-y-4">
            <h2 className="font-medium">Persona Moral</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">RFC (empresa) *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${errors['empresa.rfc'] ? 'border-red-500' : 'border-gray-300'}`}
                  value={pmRfc}
                  onChange={(e) => setPmRfc(e.target.value)}
                  onBlur={() => validateField('empresa.rfc')}
                  placeholder="XAXX010101000"
                />
                {errors['empresa.rfc'] ? <p className="text-xs text-red-600">{errors['empresa.rfc']}</p> : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha constitución (AAAAMMDD) *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['empresa.fecha_constitucion'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pmFechaConst}
                  onChange={(e) => setPmFechaConst(e.target.value)}
                  onBlur={() => validateField('empresa.fecha_constitucion')}
                  placeholder="20010131 (o 2001-01-31)"
                />
                {errors['empresa.fecha_constitucion'] ? (
                  <p className="text-xs text-red-600">{errors['empresa.fecha_constitucion']}</p>
                ) : (
                  <p className="text-xs text-gray-500">Acepta AAAAMMDD o YYYY-MM-DD (se convierte a AAAAMMDD).</p>
                )}
              </div>

              <SearchableSelect
                label="Giro mercantil"
                required
                value={pmGiro}
                items={giros}
                error={errors['empresa.giro_mercantil']}
                onChange={(v) => setPmGiro(v)}
                onBlur={() => validateField('empresa.giro_mercantil')}
              />

              <div className="space-y-1 md:col-span-3">
                <label className="text-sm font-medium">Representante (nombre completo) *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['representante.nombre_completo.pm'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pmRepNombreCompleto}
                  onChange={(e) => setPmRepNombreCompleto(e.target.value)}
                  onBlur={() => validateField('representante.nombre_completo.pm')}
                />
                {errors['representante.nombre_completo.pm'] ? (
                  <p className="text-xs text-red-600">{errors['representante.nombre_completo.pm']}</p>
                ) : null}
              </div>
            </div>

            <hr className="my-2" />

            <h3 className="font-medium">Identificación del Representante Legal</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo de documento *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['representante.identificacion.tipo.pm'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pmRepIdTipo}
                  onChange={(e) => setPmRepIdTipo(e.target.value)}
                  onBlur={() => validateField('representante.identificacion.tipo.pm')}
                  placeholder="INE / Pasaporte / ..."
                />
                {errors['representante.identificacion.tipo.pm'] ? (
                  <p className="text-xs text-red-600">{errors['representante.identificacion.tipo.pm']}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Autoridad que lo emitió *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['representante.identificacion.autoridad.pm'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pmRepIdAutoridad}
                  onChange={(e) => setPmRepIdAutoridad(e.target.value)}
                  onBlur={() => validateField('representante.identificacion.autoridad.pm')}
                />
                {errors['representante.identificacion.autoridad.pm'] ? (
                  <p className="text-xs text-red-600">{errors['representante.identificacion.autoridad.pm']}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Número de identificación *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['representante.identificacion.numero.pm'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pmRepIdNumero}
                  onChange={(e) => setPmRepIdNumero(e.target.value)}
                  onBlur={() => validateField('representante.identificacion.numero.pm')}
                />
                {errors['representante.identificacion.numero.pm'] ? (
                  <p className="text-xs text-red-600">{errors['representante.identificacion.numero.pm']}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha de expedición (AAAAMMDD) *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['representante.identificacion.expedicion.pm'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pmRepIdExpedicion}
                  onChange={(e) => setPmRepIdExpedicion(e.target.value)}
                  onBlur={() => validateField('representante.identificacion.expedicion.pm')}
                  placeholder="20240131 (o 2024-01-31)"
                />
                {errors['representante.identificacion.expedicion.pm'] ? (
                  <p className="text-xs text-red-600">{errors['representante.identificacion.expedicion.pm']}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha de expiración (AAAAMMDD) *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['representante.identificacion.expiracion.pm'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={pmRepIdExpiracion}
                  onChange={(e) => setPmRepIdExpiracion(e.target.value)}
                  onBlur={() => validateField('representante.identificacion.expiracion.pm')}
                  placeholder="20290131 (o 2029-01-31)"
                />
                {errors['representante.identificacion.expiracion.pm'] ? (
                  <p className="text-xs text-red-600">{errors['representante.identificacion.expiracion.pm']}</p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Fideicomiso (sin cambios) */}
        {tipo === 'fideicomiso' && (
          <div className="rounded border border-gray-200 p-4 space-y-4">
            <h2 className="font-medium">Fideicomiso</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">Denominación o Razón Social del Fiduciario *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['fideicomiso.denominacion_fiduciario'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={fidDenominacion}
                  onChange={(e) => setFidDenominacion(e.target.value)}
                  onBlur={() => validateField('fideicomiso.denominacion_fiduciario')}
                />
                {errors['fideicomiso.denominacion_fiduciario'] ? (
                  <p className="text-xs text-red-600">{errors['fideicomiso.denominacion_fiduciario']}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">RFC del Fiduciario *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['fideicomiso.rfc_fiduciario'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={fidRfcFiduciario}
                  onChange={(e) => setFidRfcFiduciario(e.target.value)}
                  onBlur={() => validateField('fideicomiso.rfc_fiduciario')}
                  placeholder="XAXX010101000"
                />
                {errors['fideicomiso.rfc_fiduciario'] ? (
                  <p className="text-xs text-red-600">{errors['fideicomiso.rfc_fiduciario']}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Identificador del fideicomiso *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['fideicomiso.identificador'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={fidIdentificador}
                  onChange={(e) => setFidIdentificador(e.target.value)}
                  onBlur={() => validateField('fideicomiso.identificador')}
                />
                {errors['fideicomiso.identificador'] ? (
                  <p className="text-xs text-red-600">{errors['fideicomiso.identificador']}</p>
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
                    errors['representante.nombres'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={repNombres}
                  onChange={(e) => setRepNombres(e.target.value)}
                  onBlur={() => validateField('representante.nombres')}
                />
                {errors['representante.nombres'] ? (
                  <p className="text-xs text-red-600">{errors['representante.nombres']}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido paterno *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['representante.apellido_paterno'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={repApPat}
                  onChange={(e) => setRepApPat(e.target.value)}
                  onBlur={() => validateField('representante.apellido_paterno')}
                />
                {errors['representante.apellido_paterno'] ? (
                  <p className="text-xs text-red-600">{errors['representante.apellido_paterno']}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido materno *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['representante.apellido_materno'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={repApMat}
                  onChange={(e) => setRepApMat(e.target.value)}
                  onBlur={() => validateField('representante.apellido_materno')}
                />
                {errors['representante.apellido_materno'] ? (
                  <p className="text-xs text-red-600">{errors['representante.apellido_materno']}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha de nacimiento (AAAAMMDD) *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${
                    errors['representante.fecha_nacimiento'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={repFechaNac}
                  onChange={(e) => setRepFechaNac(e.target.value)}
                  onBlur={() => validateField('representante.fecha_nacimiento')}
                  placeholder="19900101 (o 1990-01-01)"
                />
                {errors['representante.fecha_nacimiento'] ? (
                  <p className="text-xs text-red-600">{errors['representante.fecha_nacimiento']}</p>
                ) : (
                  <p className="text-xs text-gray-500">Acepta AAAAMMDD o YYYY-MM-DD (se convierte a AAAAMMDD).</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">RFC *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${errors['representante.rfc'] ? 'border-red-500' : 'border-gray-300'}`}
                  value={repRfc}
                  onChange={(e) => setRepRfc(e.target.value)}
                  onBlur={() => validateField('representante.rfc')}
                  placeholder="XAXX010101000"
                />
                {errors['representante.rfc'] ? <p className="text-xs text-red-600">{errors['representante.rfc']}</p> : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">CURP *</label>
                <input
                  className={`w-full rounded border px-3 py-2 text-sm ${errors['representante.curp'] ? 'border-red-500' : 'border-gray-300'}`}
                  value={repCurp}
                  onChange={(e) => setRepCurp(e.target.value)}
                  onBlur={() => validateField('representante.curp')}
                  placeholder="PEPJ900101HDFRRN09"
                />
                {errors['representante.curp'] ? <p className="text-xs text-red-600">{errors['representante.curp']}</p> : null}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading} className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50">
            {loading ? 'Guardando...' : 'Registrar'}
          </button>

          <button
            type="button"
            className="rounded border border-gray-300 px-4 py-2 text-sm"
            onClick={() => router.push('/cliente/clientes')}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
