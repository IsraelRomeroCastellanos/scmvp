'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadCatalogo, type CatalogItem } from '@/lib/catalogos';

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function isBlank(v: any) {
  return v === null || v === undefined || String(v).trim() === '';
}

/** Dropdown con búsqueda (sin librerías) */
function SearchSelect({
  label,
  placeholder,
  items,
  value,
  onChange,
  required,
  hint
}: {
  label: string;
  placeholder?: string;
  items: CatalogItem[];
  value: CatalogItem | null;
  onChange: (v: CatalogItem | null) => void;
  required?: boolean;
  hint?: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items.slice(0, 50);
    const f = items.filter((it) => {
      const t = `${it.clave ?? ''} ${it.descripcion ?? ''}`.toLowerCase();
      return t.includes(s);
    });
    return f.slice(0, 50);
  }, [q, items]);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </label>
        {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
      </div>

      <div className="relative">
        <input
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder={value ? `${value.descripcion}` : placeholder ?? 'Buscar...'}
          value={open ? q : value?.descripcion ?? ''}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQ('');
          }}
        />

        {open && (
          <div className="absolute z-10 mt-1 w-full rounded border bg-white shadow max-h-64 overflow-auto">
            <div className="p-2 border-b">
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Escribe para filtrar…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
              />
            </div>

            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">Sin resultados.</div>
            ) : (
              filtered.map((it) => (
                <button
                  type="button"
                  key={`${it.clave}-${it.descripcion}`}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => {
                    onChange(it);
                    setOpen(false);
                    setQ('');
                  }}
                >
                  <div className="font-medium">{it.descripcion}</div>
                  {it.clave ? <div className="text-xs text-gray-500">Clave: {it.clave}</div> : null}
                </button>
              ))
            )}

            <div className="p-2 border-t flex justify-end">
              <button
                type="button"
                className="text-sm px-3 py-1 rounded border"
                onClick={() => {
                  setOpen(false);
                  setQ('');
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>

      {value ? (
        <div className="text-xs text-gray-500">
          Seleccionado: {value.descripcion} {value.clave ? `(clave ${value.clave})` : ''}
          <button
            type="button"
            className="ml-2 text-blue-600 hover:underline"
            onClick={() => onChange(null)}
          >
            limpiar
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function RegistrarClientePage() {
  const router = useRouter();
  const apiBase = useMemo(() => getApiBase(), []);

  // catálogos
  const [loadingCats, setLoadingCats] = useState(true);
  const [paises, setPaises] = useState<CatalogItem[]>([]);
  const [actividades, setActividades] = useState<CatalogItem[]>([]);
  const [giros, setGiros] = useState<CatalogItem[]>([]);

  // formulario base
  const [empresaId, setEmpresaId] = useState<number>(1);
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('persona_fisica');
  const [nombreEntidad, setNombreEntidad] = useState('');
  const [telefono, setTelefono] = useState('');

  // selects
  const [paisSel, setPaisSel] = useState<CatalogItem | null>(null);
  const [actividadSel, setActividadSel] = useState<CatalogItem | null>(null);
  const [giroSel, setGiroSel] = useState<CatalogItem | null>(null);

  // PF
  const [pfNombres, setPfNombres] = useState('');
  const [pfApPaterno, setPfApPaterno] = useState('');
  const [pfApMaterno, setPfApMaterno] = useState('');

  // PM
  const [pmRfc, setPmRfc] = useState('');
  const [pmFechaConst, setPmFechaConst] = useState(''); // yyyy-mm-dd
  const [repNombres, setRepNombres] = useState('');
  const [repApPaterno, setRepApPaterno] = useState('');
  const [repApMaterno, setRepApMaterno] = useState('');
  const [repRfc, setRepRfc] = useState('');
  const [repCurp, setRepCurp] = useState('');

  // Fideicomiso (v2 mínimo)
  const [fidNombre, setFidNombre] = useState('');
  const [fidFecha, setFidFecha] = useState('');

  // estado UI
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // cargar catálogos
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    (async () => {
      try {
        setLoadingCats(true);

        // Ajusta rutas si tu loader usa index.json; aquí pedimos directo por nombre lógico
        const [p, a, g] = await Promise.all([
          loadCatalogo('sat/c_pais'),
          loadCatalogo('sat/c_actividad_economica'),
          loadCatalogo('internos/giro_mercantil')
        ]);

        setPaises(p);
        setActividades(a);
        setGiros(g);

        // defaults “sensatos”
        const mexico = p.find((x) => (x.descripcion || '').toLowerCase().includes('méxico') || (x.descripcion || '').toLowerCase().includes('mexico'));
        setPaisSel(mexico ?? null);
      } catch (e) {
        console.error(e);
        setErrorMsg('No se pudieron cargar los catálogos.');
      } finally {
        setLoadingCats(false);
      }
    })();
  }, [router]);

  // Cuando cambia tipo, limpia campos específicos (para no mandar basura)
  useEffect(() => {
    setErrorMsg('');
    if (tipoCliente === 'persona_fisica') {
      setPmRfc('');
      setPmFechaConst('');
      setRepNombres('');
      setRepApPaterno('');
      setRepApMaterno('');
      setRepRfc('');
      setRepCurp('');
      setGiroSel(null);
      setFidNombre('');
      setFidFecha('');
    } else if (tipoCliente === 'persona_moral') {
      setPfNombres('');
      setPfApPaterno('');
      setPfApMaterno('');
      setActividadSel(null);
      setFidNombre('');
      setFidFecha('');
    } else {
      // fideicomiso
      setPfNombres('');
      setPfApPaterno('');
      setPfApMaterno('');
      setActividadSel(null);
      setPmRfc('');
      setPmFechaConst('');
      setRepNombres('');
      setRepApPaterno('');
      setRepApMaterno('');
      setRepRfc('');
      setRepCurp('');
      setGiroSel(null);
    }
  }, [tipoCliente]);

  function validate(): string[] {
    const errs: string[] = [];

    if (!empresaId || empresaId <= 0) errs.push('empresa_id es obligatorio.');
    if (isBlank(nombreEntidad)) errs.push('Nombre / Entidad es obligatorio.');
    if (!paisSel) errs.push('País es obligatorio.');
    if (isBlank(telefono)) errs.push('Teléfono es obligatorio.');

    if (tipoCliente === 'persona_fisica') {
      if (isBlank(pfNombres)) errs.push('Nombres (PF) es obligatorio.');
      if (isBlank(pfApPaterno)) errs.push('Apellido paterno (PF) es obligatorio.');
      if (!actividadSel) errs.push('Actividad económica (PF) es obligatoria.');
    }

    if (tipoCliente === 'persona_moral') {
      if (isBlank(pmRfc)) errs.push('RFC (Empresa) es obligatorio.');
      if (isBlank(pmFechaConst)) errs.push('Fecha de constitución es obligatoria.');
      // giro: recomendado que sea catálogo (tu caso ya funciona), lo hacemos obligatorio
      if (!giroSel) errs.push('Giro mercantil es obligatorio.');

      if (isBlank(repNombres)) errs.push('Nombres (Representante) es obligatorio.');
      if (isBlank(repApPaterno)) errs.push('Apellido paterno (Representante) es obligatorio.');
      if (isBlank(repRfc)) errs.push('RFC (Representante) es obligatorio.');
      if (isBlank(repCurp)) errs.push('CURP (Representante) es obligatoria.');
    }

    if (tipoCliente === 'fideicomiso') {
      if (isBlank(fidNombre)) errs.push('Nombre del fideicomiso es obligatorio.');
      if (isBlank(fidFecha)) errs.push('Fecha del fideicomiso es obligatoria.');
      // en v2 mínimo no metemos roles aún
    }

    return errs;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const errs = validate();
    if (errs.length) {
      setErrorMsg(errs.join(' '));
      return;
    }

    // Construye datos_completos por tipo
    const datos_completos: any = {
      contacto: {
        pais: paisSel?.descripcion,
        pais_clave: paisSel?.clave,
        telefono: telefono.trim()
      }
    };

    if (tipoCliente === 'persona_fisica') {
      datos_completos.persona = {
        tipo: 'persona_fisica',
        nombres: pfNombres.trim(),
        apellido_paterno: pfApPaterno.trim(),
        apellido_materno: pfApMaterno.trim() || undefined,
        actividad_economica: actividadSel
          ? { clave: actividadSel.clave, descripcion: actividadSel.descripcion }
          : undefined
      };
    }

    if (tipoCliente === 'persona_moral') {
      datos_completos.empresa = {
        tipo: 'persona_moral',
        rfc: pmRfc.trim(),
        fecha_constitucion: pmFechaConst,
        // Importante: hoy tu payload usa "giro" (string), lo mantenemos y además guardamos clave si existe
        giro: giroSel?.descripcion,
        giro_clave: giroSel?.clave
      };

      datos_completos.representante = {
        nombres: repNombres.trim(),
        apellido_paterno: repApPaterno.trim(),
        apellido_materno: repApMaterno.trim() || undefined,
        rfc: repRfc.trim(),
        curp: repCurp.trim()
      };
    }

    if (tipoCliente === 'fideicomiso') {
      datos_completos.fideicomiso = {
        tipo: 'fideicomiso',
        nombre: fidNombre.trim(),
        fecha_constitucion: fidFecha
      };
    }

    // Nacionalidad: por ahora la amarramos al país seleccionado (como en tus ejemplos)
    const payload = {
      empresa_id: empresaId,
      tipo_cliente: tipoCliente,
      nombre_entidad: nombreEntidad.trim(),
      nacionalidad: paisSel?.descripcion ?? 'México',
      datos_completos
    };

    try {
      setSubmitting(true);

      const res = await fetch(`${apiBase}/api/cliente/registrar-cliente`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Mensaje claro para 409
        if (res.status === 409) {
          setErrorMsg(data?.error || 'Cliente duplicado para esa empresa.');
          return;
        }
        if (res.status === 401) {
          setErrorMsg(data?.error || 'Sesión inválida. Vuelve a iniciar sesión.');
          router.replace('/login');
          return;
        }
        setErrorMsg(data?.error || `Error HTTP ${res.status}`);
        return;
      }

      const id = data?.cliente?.id;
      if (id) {
        router.push(`/cliente/clientes/${id}`);
      } else {
        router.push('/cliente/clientes');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error de red');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Registrar Cliente</h1>
            <p className="text-sm text-gray-500">
              Selecciona el tipo de cliente y captura los datos mínimos requeridos.
            </p>
          </div>

          <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
            Volver
          </button>
        </div>

        {loadingCats ? (
          <div className="text-sm">Cargando catálogos…</div>
        ) : null}

        {errorMsg ? (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Sección base */}
          <div className="rounded border p-4 space-y-4">
            <h2 className="text-lg font-medium">Información base</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Empresa ID <span className="text-red-600">*</span>
                </label>
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  type="number"
                  value={empresaId}
                  onChange={(e) => setEmpresaId(Number(e.target.value))}
                  min={1}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Tipo de cliente <span className="text-red-600">*</span>
                </label>
                <select
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={tipoCliente}
                  onChange={(e) => setTipoCliente(e.target.value as TipoCliente)}
                >
                  <option value="persona_fisica">Persona Física</option>
                  <option value="persona_moral">Persona Moral</option>
                  <option value="fideicomiso">Fideicomiso</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Nombre / Entidad <span className="text-red-600">*</span>
                </label>
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={nombreEntidad}
                  onChange={(e) => setNombreEntidad(e.target.value)}
                  placeholder="Ej. Juan Pérez / Empresa SA de CV"
                />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="rounded border p-4 space-y-4">
            <h2 className="text-lg font-medium">Contacto</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SearchSelect
                label="País"
                required
                items={paises}
                value={paisSel}
                onChange={setPaisSel}
                placeholder="Selecciona un país…"
              />

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Teléfono <span className="text-red-600">*</span>
                </label>
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="5512345678"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Nacionalidad</label>
                <input
                  className="w-full rounded border px-3 py-2 text-sm bg-gray-50"
                  value={paisSel?.descripcion ?? 'México'}
                  readOnly
                  title="Por ahora, nacionalidad se toma del país seleccionado"
                />
              </div>
            </div>
          </div>

          {/* PF */}
          {tipoCliente === 'persona_fisica' && (
            <div className="rounded border p-4 space-y-4">
              <h2 className="text-lg font-medium">Persona Física</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Nombres <span className="text-red-600">*</span>
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={pfNombres}
                    onChange={(e) => setPfNombres(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Apellido paterno <span className="text-red-600">*</span>
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={pfApPaterno}
                    onChange={(e) => setPfApPaterno(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Apellido materno</label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={pfApMaterno}
                    onChange={(e) => setPfApMaterno(e.target.value)}
                  />
                </div>
              </div>

              <SearchSelect
                label="Actividad económica"
                required
                items={actividades}
                value={actividadSel}
                onChange={setActividadSel}
                placeholder="Busca y selecciona…"
                hint="(catálogo)"
              />
            </div>
          )}

          {/* PM */}
          {tipoCliente === 'persona_moral' && (
            <div className="rounded border p-4 space-y-5">
              <h2 className="text-lg font-medium">Persona Moral</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    RFC (Empresa) <span className="text-red-600">*</span>
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={pmRfc}
                    onChange={(e) => setPmRfc(e.target.value)}
                    placeholder="CAAF012150N12"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Fecha de constitución <span className="text-red-600">*</span>
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    type="date"
                    value={pmFechaConst}
                    onChange={(e) => setPmFechaConst(e.target.value)}
                  />
                </div>
              </div>

              <SearchSelect
                label="Giro mercantil"
                required
                items={giros}
                value={giroSel}
                onChange={setGiroSel}
                placeholder="Busca y selecciona…"
                hint="(catálogo interno)"
              />

              <div className="rounded border p-3 space-y-4">
                <h3 className="font-medium">Representante</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Nombres <span className="text-red-600">*</span>
                    </label>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={repNombres}
                      onChange={(e) => setRepNombres(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Apellido paterno <span className="text-red-600">*</span>
                    </label>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={repApPaterno}
                      onChange={(e) => setRepApPaterno(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Apellido materno</label>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={repApMaterno}
                      onChange={(e) => setRepApMaterno(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      RFC <span className="text-red-600">*</span>
                    </label>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={repRfc}
                      onChange={(e) => setRepRfc(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      CURP <span className="text-red-600">*</span>
                    </label>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={repCurp}
                      onChange={(e) => setRepCurp(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FIDEICOMISO */}
          {tipoCliente === 'fideicomiso' && (
            <div className="rounded border p-4 space-y-4">
              <h2 className="text-lg font-medium">Fideicomiso</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium">
                    Nombre del fideicomiso <span className="text-red-600">*</span>
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={fidNombre}
                    onChange={(e) => setFidNombre(e.target.value)}
                    placeholder="Fideicomiso ..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Fecha de constitución <span className="text-red-600">*</span>
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    type="date"
                    value={fidFecha}
                    onChange={(e) => setFidFecha(e.target.value)}
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Nota: en la siguiente iteración agregamos roles (fideicomitente/fiduciario/fideicomisario).
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded border px-4 py-2 text-sm"
              onClick={() => router.push('/cliente/clientes')}
              disabled={submitting}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="rounded bg-black text-white px-5 py-2 text-sm disabled:opacity-60"
              disabled={submitting || loadingCats}
            >
              {submitting ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
