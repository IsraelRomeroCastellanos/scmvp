// frontend/src/app/cliente/editar-cliente/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { loadCatalogo, type CatalogItem } from '@/lib/catalogos';

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';
type Errors = Record<string, string>;

function onlyDigits(s: string) {
  return (s ?? '').replace(/\D+/g, '');
}
function normalizeUpper(s: string) {
  return (s ?? '').trim().toUpperCase();
}
function isYYYYMMDD(s: string) {
  return /^\d{8}$/.test(s ?? '');
}
function isRFC(s: string) {
  const v = normalizeUpper(s);
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(v);
}
function isCURP(s: string) {
  const v = normalizeUpper(s);
  return /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(v);
}
function isEmail(v: any) {
  if (!v) return false;
  const s = String(v).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

/**
 * Remueve:
 * - undefined / null
 * - strings vacíos
 * - objetos vacíos
 * NO toca arrays.
 */
function stripEmpty(obj: any): any {
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'string' && v.trim() === '') continue;

      const cleaned = stripEmpty(v);
      if (cleaned === undefined || cleaned === null) continue;

      if (cleaned && typeof cleaned === 'object' && !Array.isArray(cleaned) && Object.keys(cleaned).length === 0) {
        continue;
      }
      out[k] = cleaned;
    }
    return out;
  }
  return obj;
}

function req(errors: Errors, key: string, label: string, value: any) {
  const v = typeof value === 'string' ? value.trim() : value;
  if (!v) errors[key] = `${label} es obligatorio`;
}
function reqEmail(errors: Errors, key: string, label: string, value: string) {
  if (!value?.trim()) return (errors[key] = `${label} es obligatorio`);
  if (!isEmail(value)) errors[key] = `${label} inválido (formato email)`;
}
function reqPhone(errors: Errors, key: string, label: string, value: string) {
  const d = onlyDigits(value);
  if (!d) return (errors[key] = `${label} es obligatorio`);
  if (d.length < 8 || d.length > 15) errors[key] = `${label} inválido (8–15 dígitos)`;
}
function reqRFC(errors: Errors, key: string, label: string, value: string) {
  if (!value?.trim()) return (errors[key] = `${label} es obligatorio`);
  if (!isRFC(value)) errors[key] = `${label} inválido (formato RFC)`;
}
function reqCURP(errors: Errors, key: string, label: string, value: string) {
  if (!value?.trim()) return (errors[key] = `${label} es obligatorio`);
  if (!isCURP(value)) errors[key] = `${label} inválida (formato CURP)`;
}
function reqYYYYMMDD(errors: Errors, key: string, label: string, value: string) {
  if (!value?.trim()) return (errors[key] = `${label} es obligatorio`);
  if (!isYYYYMMDD(value)) errors[key] = `${label} inválida (AAAAMMDD)`;
}

function errText(msg?: string) {
  if (!msg) return null;
  return <p className="text-sm text-red-600 mt-1">{msg}</p>;
}
function classInput(hasErr: boolean) {
  return `w-full rounded-md border px-3 py-2 text-sm outline-none ${hasErr ? 'border-red-500' : 'border-gray-300'}`;
}

export default function Page() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  // ✅ default prod actual si env no está
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://scmvp-1jhq.onrender.com';

  const token = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || '';
  }, []);

  const [fatal, setFatal] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const [paises, setPaises] = useState<CatalogItem[]>([]);
  const [actividades, setActividades] = useState<CatalogItem[]>([]);
  const [giros, setGiros] = useState<CatalogItem[]>([]);

  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('persona_fisica');

  const [nombreEntidad, setNombreEntidad] = useState('');
  const [nacionalidad, setNacionalidad] = useState('');

  // contacto básico (catálogo + obligatorios)
  const [contactoPais, setContactoPais] = useState(''); // clave catálogo (ej MEX)
  const [email, setEmail] = useState(''); // ✅ obligatorio (según decisión)
  const [telefono, setTelefono] = useState('');

  // ✅ Domicilio de contacto (manual, NO catálogo por ahora)
  const [domPais, setDomPais] = useState(''); // texto libre (ej "Mexico")
  const [domCalle, setDomCalle] = useState('');
  const [domNumero, setDomNumero] = useState('');
  const [domInterior, setDomInterior] = useState('');
  const [domColonia, setDomColonia] = useState('');
  const [domMunicipio, setDomMunicipio] = useState('');
  const [domCiudad, setDomCiudad] = useState('');
  const [domCP, setDomCP] = useState('');
  const [domEstado, setDomEstado] = useState('');

  // PF
  const [pfActividad, setPfActividad] = useState('');
  // PM
  const [pmGiro, setPmGiro] = useState('');
  // Rep (PM/FID)
  const [repNombre, setRepNombre] = useState('');
  const [repAP, setRepAP] = useState('');
  const [repAM, setRepAM] = useState('');
  const [repFechaNac, setRepFechaNac] = useState('');
  const [repRFC, setRepRFC] = useState('');
  const [repCURP, setRepCURP] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [p, a, g] = await Promise.all([
          loadCatalogo('sat/c_pais'),
          loadCatalogo('sat/c_actividad_economica'),
          loadCatalogo('internos/giro_mercantil')
        ]);
        setPaises(p);
        setActividades(a);
        setGiros(g);
      } catch (e: any) {
        setFatal(e?.message || 'No se pudieron cargar catálogos');
      }
    })();
  }, []);

  useEffect(() => {
    if (!id) return;
    if (!token) return;

    (async () => {
      setLoading(true);
      setFatal('');
      try {
        const res = await fetch(`${apiBase}/api/cliente/clientes/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setFatal(data?.error || `Error al cargar (${res.status})`);
          return;
        }

        const c = data?.cliente;
        if (!c) {
          setFatal('Respuesta inválida: falta cliente');
          return;
        }

        setTipoCliente(c.tipo_cliente);
        setNombreEntidad(c.nombre_entidad || '');
        setNacionalidad(c.nacionalidad || '');

        const contacto = c?.datos_completos?.contacto || {};
        setContactoPais(contacto.pais || '');
        setEmail(contacto.email || '');
        setTelefono(contacto.telefono || '');

        // ✅ Precarga domicilio contacto (manual)
        const dom = contacto?.domicilio_mexico || contacto?.domicilio || {};
        setDomPais(dom?.pais || '');
        setDomCalle(dom?.calle || '');
        setDomNumero(dom?.numero || '');
        setDomInterior(dom?.interior || '');
        setDomColonia(dom?.colonia || '');
        setDomMunicipio(dom?.municipio || '');
        setDomCiudad(dom?.ciudad_delegacion || dom?.ciudadDelegacion || dom?.ciudad || '');
        setDomCP(dom?.codigo_postal || dom?.codigoPostal || '');
        setDomEstado(dom?.estado || '');

        if (c.tipo_cliente === 'persona_fisica') {
          const ae = c?.datos_completos?.persona?.actividad_economica;
          if (typeof ae === 'string') setPfActividad(ae);
          else setPfActividad(ae?.clave || '');
        }

        if (c.tipo_cliente === 'persona_moral') {
          const giroTxt = c?.datos_completos?.empresa?.giro || c?.datos_completos?.empresa?.giro_mercantil || '';
          if (typeof giroTxt === 'string' && giroTxt) {
            const match = giros.find((x) => x.descripcion === giroTxt || x.clave === giroTxt);
            setPmGiro(match?.clave || '');
          } else {
            setPmGiro('');
          }

          const r = c?.datos_completos?.representante || {};
          setRepNombre(r.nombres || r.nombre_completo || '');
          setRepAP(r.apellido_paterno || '');
          setRepAM(r.apellido_materno || '');
          setRepFechaNac(r.fecha_nacimiento || '');
          setRepRFC(r.rfc || '');
          setRepCURP(r.curp || '');
        }

        if (c.tipo_cliente === 'fideicomiso') {
          const r = c?.datos_completos?.representante || {};
          const nc = (r.nombre_completo || '').split(' ').filter(Boolean);
          setRepNombre(nc.slice(0, 1).join(' ') || r.nombre_completo || '');
          setRepAP(nc.slice(1, 2).join(' ') || '');
          setRepAM(nc.slice(2).join(' ') || '');
          setRepFechaNac(r.fecha_nacimiento || '');
          setRepRFC(r.rfc || '');
          setRepCURP(r.curp || '');
        }
      } catch (e: any) {
        setFatal(e?.message || 'Error inesperado');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token, apiBase, giros]);

  function validate(): Errors {
    const e: Errors = {};
    req(e, 'nombre_entidad', 'Nombre / Razón social', nombreEntidad);
    req(e, 'nacionalidad', 'Nacionalidad', nacionalidad);

    req(e, 'contacto.pais', 'País (contacto)', contactoPais);
    reqEmail(e, 'contacto.email', 'Email', email);
    reqPhone(e, 'contacto.telefono', 'Teléfono', telefono);

    // ✅ Gate domicilio contacto (alineado a BE)
    req(e, 'contacto.domicilio.pais', 'País (domicilio contacto)', domPais);
    req(e, 'contacto.domicilio.calle', 'Calle (domicilio contacto)', domCalle);
    req(e, 'contacto.domicilio.numero', 'Número (domicilio contacto)', domNumero);
    req(e, 'contacto.domicilio.colonia', 'Colonia (domicilio contacto)', domColonia);
    req(e, 'contacto.domicilio.municipio', 'Municipio (domicilio contacto)', domMunicipio);
    req(e, 'contacto.domicilio.ciudad_delegacion', 'Ciudad/Delegación (domicilio contacto)', domCiudad);
    req(e, 'contacto.domicilio.codigo_postal', 'Código postal (domicilio contacto)', domCP);
    req(e, 'contacto.domicilio.estado', 'Estado (domicilio contacto)', domEstado);

    if (tipoCliente === 'persona_fisica') {
      req(e, 'pf.actividad', 'Actividad económica', pfActividad);
    }
    if (tipoCliente === 'persona_moral') {
      req(e, 'pm.giro', 'Giro mercantil', pmGiro);
      req(e, 'rep.nombres', 'Nombre(s) representante', repNombre);
      req(e, 'rep.apellido_paterno', 'Apellido paterno representante', repAP);
      req(e, 'rep.apellido_materno', 'Apellido materno representante', repAM);
      reqYYYYMMDD(e, 'rep.fecha_nacimiento', 'Fecha nacimiento representante', repFechaNac);
      reqRFC(e, 'rep.rfc', 'RFC representante', repRFC);
      reqCURP(e, 'rep.curp', 'CURP representante', repCURP);
    }
    if (tipoCliente === 'fideicomiso') {
      req(e, 'rep.nombres', 'Nombre(s) representante', repNombre);
      req(e, 'rep.apellido_paterno', 'Apellido paterno representante', repAP);
      req(e, 'rep.apellido_materno', 'Apellido materno representante', repAM);
      reqYYYYMMDD(e, 'rep.fecha_nacimiento', 'Fecha nacimiento representante', repFechaNac);
      reqRFC(e, 'rep.rfc', 'RFC representante', repRFC);
      reqCURP(e, 'rep.curp', 'CURP representante', repCURP);
    }

    return e;
  }

  async function onSave() {
    setFatal('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (!token) {
      setFatal('No hay token en sesión. Vuelve a iniciar sesión.');
      return;
    }

    setSaving(true);
    try {
      const act = actividades.find((x) => x.clave === pfActividad) || null;
      const giro = giros.find((x) => x.clave === pmGiro) || null;

      // ✅ Base: comunes + contacto (incluye email + domicilio contacto)
      const body: any = {
        nombre_entidad: nombreEntidad.trim(),
        nacionalidad,
        datos_completos: {
          contacto: {
            pais: contactoPais,
            email: email.trim(),
            telefono: onlyDigits(telefono),
            domicilio_mexico: {
              pais: domPais.trim(),
              calle: domCalle.trim(),
              numero: domNumero.trim(),
              interior: domInterior.trim() || undefined,
              colonia: domColonia.trim(),
              municipio: domMunicipio.trim(),
              ciudad_delegacion: domCiudad.trim(),
              codigo_postal: domCP.trim(),
              estado: domEstado.trim()
            }
          }
        }
      };

      if (tipoCliente === 'persona_fisica') {
        body.datos_completos.persona = stripEmpty({
          tipo: 'persona_fisica',
          actividad_economica: act ? { clave: act.clave, descripcion: act.descripcion } : pfActividad
        });
      }

      if (tipoCliente === 'persona_moral') {
        body.datos_completos.empresa = stripEmpty({
          giro: giro ? giro.descripcion : undefined
        });

        body.datos_completos.representante = stripEmpty({
          nombres: repNombre.trim(),
          apellido_paterno: repAP.trim(),
          apellido_materno: repAM.trim(),
          fecha_nacimiento: repFechaNac.trim(),
          rfc: normalizeUpper(repRFC),
          curp: normalizeUpper(repCURP)
        });
      }

      if (tipoCliente === 'fideicomiso') {
        body.datos_completos.representante = stripEmpty({
          nombre_completo: `${repNombre.trim()} ${repAP.trim()} ${repAM.trim()}`.trim(),
          fecha_nacimiento: repFechaNac.trim(),
          rfc: normalizeUpper(repRFC),
          curp: normalizeUpper(repCURP)
        });
      }

      // Limpieza final para evitar mandar vacíos u objetos vacíos
      body.datos_completos = stripEmpty(body.datos_completos);

      const res = await fetch(`${apiBase}/api/cliente/clientes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFatal(data?.error || `Error al guardar (${res.status})`);
        return;
      }

      router.push(`/cliente/clientes/${id}`);
    } catch (e: any) {
      setFatal(e?.message || 'Error inesperado');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Editar cliente #{id}</h1>

      {fatal ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{fatal}</div>
      ) : null}

      {loading ? <div className="text-sm text-gray-600">Cargando...</div> : null}

      <div className="space-y-1">
        <label className="text-sm font-medium">
          Nombre / Razón social <span className="text-red-600">*</span>
        </label>
        <input
          value={nombreEntidad}
          onChange={(e) => setNombreEntidad(e.target.value)}
          className={classInput(!!errors.nombre_entidad)}
        />
        {errText(errors.nombre_entidad)}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Nacionalidad <span className="text-red-600">*</span>
          </label>
          <select
            value={nacionalidad}
            onChange={(e) => setNacionalidad(e.target.value)}
            className={classInput(!!errors.nacionalidad)}
          >
            <option value="">Selecciona...</option>
            {paises.map((p) => (
              <option key={p.clave} value={p.clave}>
                {p.descripcion} ({p.clave})
              </option>
            ))}
          </select>
          {errText(errors.nacionalidad)}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            País (contacto) <span className="text-red-600">*</span>
          </label>
          <select
            value={contactoPais}
            onChange={(e) => setContactoPais(e.target.value)}
            className={classInput(!!errors['contacto.pais'])}
          >
            <option value="">Selecciona...</option>
            {paises.map((p) => (
              <option key={p.clave} value={p.clave}>
                {p.descripcion} ({p.clave})
              </option>
            ))}
          </select>
          {errText(errors['contacto.pais'])}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Email <span className="text-red-600">*</span>
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={classInput(!!errors['contacto.email'])}
            placeholder="correo@dominio.com"
          />
          {errText(errors['contacto.email'])}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            Teléfono <span className="text-red-600">*</span>
          </label>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className={classInput(!!errors['contacto.telefono'])}
            placeholder="+52 5512345678"
          />
          {errText(errors['contacto.telefono'])}
        </div>
      </div>

      {/* ✅ Domicilio contacto (manual) */}
      <div className="rounded-md border p-4 space-y-3">
        <h2 className="font-semibold">Domicilio de contacto (México)</h2>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            País (domicilio contacto) <span className="text-red-600">*</span>
          </label>
          <input
            value={domPais}
            onChange={(e) => setDomPais(e.target.value)}
            className={classInput(!!errors['contacto.domicilio.pais'])}
            placeholder="Mexico"
          />
          {errText(errors['contacto.domicilio.pais'])}
          <p className="text-xs text-gray-500">Campo manual por ahora (no catálogo). No depende de “País (contacto)”.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Calle <span className="text-red-600">*</span>
            </label>
            <input
              value={domCalle}
              onChange={(e) => setDomCalle(e.target.value)}
              className={classInput(!!errors['contacto.domicilio.calle'])}
            />
            {errText(errors['contacto.domicilio.calle'])}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Número <span className="text-red-600">*</span>
              </label>
              <input
                value={domNumero}
                onChange={(e) => setDomNumero(e.target.value)}
                className={classInput(!!errors['contacto.domicilio.numero'])}
              />
              {errText(errors['contacto.domicilio.numero'])}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Interior</label>
              <input value={domInterior} onChange={(e) => setDomInterior(e.target.value)} className={classInput(false)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Colonia <span className="text-red-600">*</span>
            </label>
            <input
              value={domColonia}
              onChange={(e) => setDomColonia(e.target.value)}
              className={classInput(!!errors['contacto.domicilio.colonia'])}
            />
            {errText(errors['contacto.domicilio.colonia'])}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Municipio <span className="text-red-600">*</span>
            </label>
            <input
              value={domMunicipio}
              onChange={(e) => setDomMunicipio(e.target.value)}
              className={classInput(!!errors['contacto.domicilio.municipio'])}
            />
            {errText(errors['contacto.domicilio.municipio'])}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Ciudad o Delegación <span className="text-red-600">*</span>
            </label>
            <input
              value={domCiudad}
              onChange={(e) => setDomCiudad(e.target.value)}
              className={classInput(!!errors['contacto.domicilio.ciudad_delegacion'])}
            />
            {errText(errors['contacto.domicilio.ciudad_delegacion'])}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Código Postal <span className="text-red-600">*</span>
            </label>
            <input
              value={domCP}
              onChange={(e) => setDomCP(e.target.value)}
              className={classInput(!!errors['contacto.domicilio.codigo_postal'])}
            />
            {errText(errors['contacto.domicilio.codigo_postal'])}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            Estado <span className="text-red-600">*</span>
          </label>
          <input
            value={domEstado}
            onChange={(e) => setDomEstado(e.target.value)}
            className={classInput(!!errors['contacto.domicilio.estado'])}
          />
          {errText(errors['contacto.domicilio.estado'])}
        </div>
      </div>

      {tipoCliente === 'persona_fisica' ? (
        <div className="rounded-md border p-4 space-y-3">
          <h2 className="font-semibold">Persona física</h2>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Actividad económica <span className="text-red-600">*</span>
            </label>
            <select
              value={pfActividad}
              onChange={(e) => setPfActividad(e.target.value)}
              className={classInput(!!errors['pf.actividad'])}
            >
              <option value="">Selecciona...</option>
              {actividades.map((a) => (
                <option key={a.clave} value={a.clave}>
                  {a.descripcion} ({a.clave})
                </option>
              ))}
            </select>
            {errText(errors['pf.actividad'])}
          </div>
        </div>
      ) : null}

      {tipoCliente === 'persona_moral' ? (
        <div className="rounded-md border p-4 space-y-3">
          <h2 className="font-semibold">Persona moral</h2>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Giro mercantil <span className="text-red-600">*</span>
            </label>
            <select value={pmGiro} onChange={(e) => setPmGiro(e.target.value)} className={classInput(!!errors['pm.giro'])}>
              <option value="">Selecciona...</option>
              {giros.map((g) => (
                <option key={g.clave} value={g.clave}>
                  {g.descripcion} ({g.clave})
                </option>
              ))}
            </select>
            {errText(errors['pm.giro'])}
          </div>

          <div className="border-t pt-3 space-y-3">
            <h3 className="font-semibold">Representante</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre(s) *</label>
                <input
                  value={repNombre}
                  onChange={(e) => setRepNombre(e.target.value)}
                  className={classInput(!!errors['rep.nombres'])}
                />
                {errText(errors['rep.nombres'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido paterno *</label>
                <input value={repAP} onChange={(e) => setRepAP(e.target.value)} className={classInput(!!errors['rep.apellido_paterno'])} />
                {errText(errors['rep.apellido_paterno'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido materno *</label>
                <input value={repAM} onChange={(e) => setRepAM(e.target.value)} className={classInput(!!errors['rep.apellido_materno'])} />
                {errText(errors['rep.apellido_materno'])}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha nac. (AAAAMMDD) *</label>
                <input
                  value={repFechaNac}
                  onChange={(e) => setRepFechaNac(onlyDigits(e.target.value).slice(0, 8))}
                  className={classInput(!!errors['rep.fecha_nacimiento'])}
                />
                {errText(errors['rep.fecha_nacimiento'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">RFC *</label>
                <input value={repRFC} onChange={(e) => setRepRFC(e.target.value)} className={classInput(!!errors['rep.rfc'])} />
                {errText(errors['rep.rfc'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CURP *</label>
                <input value={repCURP} onChange={(e) => setRepCURP(e.target.value)} className={classInput(!!errors['rep.curp'])} />
                {errText(errors['rep.curp'])}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tipoCliente === 'fideicomiso' ? (
        <div className="rounded-md border p-4 space-y-3">
          <h2 className="font-semibold">Fideicomiso</h2>
          <div className="border-t pt-3 space-y-3">
            <h3 className="font-semibold">Representante</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre(s) *</label>
                <input value={repNombre} onChange={(e) => setRepNombre(e.target.value)} className={classInput(!!errors['rep.nombres'])} />
                {errText(errors['rep.nombres'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido paterno *</label>
                <input value={repAP} onChange={(e) => setRepAP(e.target.value)} className={classInput(!!errors['rep.apellido_paterno'])} />
                {errText(errors['rep.apellido_paterno'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido materno *</label>
                <input value={repAM} onChange={(e) => setRepAM(e.target.value)} className={classInput(!!errors['rep.apellido_materno'])} />
                {errText(errors['rep.apellido_materno'])}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha nac. (AAAAMMDD) *</label>
                <input
                  value={repFechaNac}
                  onChange={(e) => setRepFechaNac(onlyDigits(e.target.value).slice(0, 8))}
                  className={classInput(!!errors['rep.fecha_nacimiento'])}
                />
                {errText(errors['rep.fecha_nacimiento'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">RFC *</label>
                <input value={repRFC} onChange={(e) => setRepRFC(e.target.value)} className={classInput(!!errors['rep.rfc'])} />
                {errText(errors['rep.rfc'])}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CURP *</label>
                <input value={repCURP} onChange={(e) => setRepCURP(e.target.value)} className={classInput(!!errors['rep.curp'])} />
                {errText(errors['rep.curp'])}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>

        <button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={() => router.push(`/cliente/clientes/${id}`)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
