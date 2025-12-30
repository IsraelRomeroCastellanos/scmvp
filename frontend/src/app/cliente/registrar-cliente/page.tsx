// frontend/src/app/cliente/registrar-cliente/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadCatalogo, type CatalogItem } from '@/lib/catalogos';

type TipoCliente = 'persona_fisica' | 'persona_moral' | 'fideicomiso';

function SearchSelect({
  label,
  required,
  placeholder,
  items,
  value,
  onChange,
  disabled
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  items: CatalogItem[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = useMemo(
    () => items.find((x) => String(x.clave) === String(value)) ?? null,
    [items, value]
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((x) =>
      `${x.clave} ${x.descripcion}`.toLowerCase().includes(qq)
    );
  }, [items, q]);

  // Cierra al hacer click fuera
  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    };

    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  return (
    <div
      className="space-y-1"
      ref={(n) => {
        wrapRef.current = n;
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">
          {label} {required ? <span className="text-red-600">*</span> : null}
        </label>

        {value ? (
          <button
            type="button"
            className="text-xs text-gray-600 underline"
            onClick={() => {
              onChange('');
              setQ('');
            }}
            disabled={disabled}
          >
            Limpiar
          </button>
        ) : null}
      </div>

      <div className="relative">
        <input
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder={placeholder ?? 'Buscar...'}
          disabled={disabled}
          value={open ? q : selected?.descripcion ?? ''}
          onFocus={() => {
            setOpen(true);
            setQ('');
          }}
          onChange={(e) => {
            setOpen(true);
            setQ(e.target.value);
          }}
        />

        {open ? (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded border bg-white shadow">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
            ) : (
              filtered.slice(0, 200).map((x) => {
                const isSelected = String(x.clave) === String(value);
                return (
                  <button
                    key={String(x.clave)}
                    type="button"
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                      isSelected ? 'bg-gray-50 font-medium' : ''
                    }`}
                    onClick={() => {
                      onChange(String(x.clave));
                      setOpen(false);
                      setQ('');
                    }}
                  >
                    {x.descripcion}
                    {x.clave && x.clave !== x.descripcion ? (
                      <span className="ml-2 text-xs text-gray-500">({x.clave})</span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function RegistrarClientePage() {
  const router = useRouter();

  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('persona_fisica');

  // Catálogos
  const [paises, setPaises] = useState<CatalogItem[]>([]);
  const [actividades, setActividades] = useState<CatalogItem[]>([]);
  const [giros, setGiros] = useState<CatalogItem[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  // Campos base
  const [empresaId, setEmpresaId] = useState<number>(1);
  const [nombreEntidad, setNombreEntidad] = useState('');
  const [nacionalidad, setNacionalidad] = useState('');
  const [paisContacto, setPaisContacto] = useState('');
  const [telefono, setTelefono] = useState('');

  // PF
  const [pfNombres, setPfNombres] = useState('');
  const [pfApellidoP, setPfApellidoP] = useState('');
  const [pfApellidoM, setPfApellidoM] = useState('');
  const [pfActividadClave, setPfActividadClave] = useState('');

  // PM
  const [pmRfc, setPmRfc] = useState('');
  const [pmFechaConstitucion, setPmFechaConstitucion] = useState('');
  const [pmGiroClave, setPmGiroClave] = useState('');

  const [repNombres, setRepNombres] = useState('');
  const [repApellidoP, setRepApellidoP] = useState('');
  const [repApellidoM, setRepApellidoM] = useState('');
  const [repRfc, setRepRfc] = useState('');
  const [repCurp, setRepCurp] = useState('');

  // Fideicomiso (iteración 1)
  const [fidIdentificador, setFidIdentificador] = useState('');
  const [fidDenominacion, setFidDenominacion] = useState('');
  const [fidRfcFiduciario, setFidRfcFiduciario] = useState('');

  const [fidRepNombreCompleto, setFidRepNombreCompleto] = useState('');
  const [fidRepFechaNacimiento, setFidRepFechaNacimiento] = useState('');
  const [fidRepRfc, setFidRepRfc] = useState('');
  const [fidRepCurp, setFidRepCurp] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoadingCatalogos(true);
      try {
        const [p, a, g] = await Promise.all([
          loadCatalogo('sat/c_pais'),
          loadCatalogo('sat/c_actividad_economica'),
          loadCatalogo('internos/giro_mercantil')
        ]);
        if (!mounted) return;
        setPaises(p);
        setActividades(a);
        setGiros(g);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? 'No se pudieron cargar catálogos');
      } finally {
        if (mounted) setLoadingCatalogos(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const actividadSeleccionada = useMemo(
    () => actividades.find((x) => x.clave === pfActividadClave) ?? null,
    [actividades, pfActividadClave]
  );
  const giroSeleccionado = useMemo(
    () => giros.find((x) => x.clave === pmGiroClave) ?? null,
    [giros, pmGiroClave]
  );

  function buildPayload() {
    const contacto = {
      pais: paisContacto,
      telefono
    };

    if (tipoCliente === 'persona_fisica') {
      return {
        empresa_id: empresaId,
        tipo_cliente: tipoCliente,
        nombre_entidad: nombreEntidad,
        nacionalidad,
        datos_completos: {
          contacto,
          persona: {
            tipo: 'persona_fisica',
            nombres: pfNombres,
            apellido_paterno: pfApellidoP,
            apellido_materno: pfApellidoM,
            actividad_economica: pfActividadClave
              ? {
                  clave: pfActividadClave,
                  descripcion: actividadSeleccionada?.descripcion ?? ''
                }
              : undefined
          }
        }
      };
    }

    if (tipoCliente === 'persona_moral') {
      return {
        empresa_id: empresaId,
        tipo_cliente: tipoCliente,
        nombre_entidad: nombreEntidad,
        nacionalidad,
        datos_completos: {
          contacto,
          empresa: {
            tipo: 'persona_moral',
            rfc: pmRfc,
            fecha_constitucion: pmFechaConstitucion || null,
            giro: pmGiroClave
              ? giroSeleccionado?.descripcion ?? pmGiroClave
              : undefined
          },
          representante: {
            nombres: repNombres,
            apellido_paterno: repApellidoP,
            apellido_materno: repApellidoM,
            rfc: repRfc,
            curp: repCurp
          }
        }
      };
    }

    // fideicomiso
    return {
      empresa_id: empresaId,
      tipo_cliente: 'fideicomiso',
      nombre_entidad: nombreEntidad,
      nacionalidad,
      datos_completos: {
        contacto,
        fideicomiso: {
          identificador: fidIdentificador,
          denominacion_fiduciario: fidDenominacion,
          rfc_fiduciario: fidRfcFiduciario
        },
        representante: {
          nombre_completo: fidRepNombreCompleto,
          fecha_nacimiento: fidRepFechaNacimiento,
          rfc: fidRepRfc,
          curp: fidRepCurp
        }
      }
    };
  }

  function validate(): string | null {
    if (!empresaId) return 'empresa_id es obligatorio';
    if (!nombreEntidad.trim()) return 'Nombre/razón social es obligatorio';
    if (!nacionalidad) return 'Nacionalidad es obligatoria';
    if (!paisContacto) return 'País (contacto) es obligatorio';
    if (!telefono.trim()) return 'Teléfono es obligatorio';

    if (tipoCliente === 'persona_fisica') {
      if (!pfNombres.trim()) return 'Nombres (PF) es obligatorio';
      if (!pfApellidoP.trim()) return 'Apellido paterno (PF) es obligatorio';
      return null;
    }

    if (tipoCliente === 'persona_moral') {
      if (!pmRfc.trim()) return 'RFC (PM) es obligatorio';
      if (!repNombres.trim()) return 'Nombres (Representante) es obligatorio';
      if (!repApellidoP.trim())
        return 'Apellido paterno (Representante) es obligatorio';
      if (!repRfc.trim()) return 'RFC (Representante) es obligatorio';
      if (!repCurp.trim()) return 'CURP (Representante) es obligatorio';
      return null;
    }

    // fideicomiso
    if (!fidIdentificador.trim()) return 'Identificador del fideicomiso es obligatorio';
    if (!fidDenominacion.trim()) return 'Denominación del fiduciario es obligatoria';
    if (!fidRfcFiduciario.trim()) return 'RFC del fiduciario es obligatorio';
    if (!fidRepNombreCompleto.trim()) return 'Nombre completo del representante es obligatorio';
    if (!fidRepFechaNacimiento.trim()) return 'Fecha de nacimiento del representante es obligatoria';
    if (!fidRepRfc.trim()) return 'RFC del representante es obligatorio';
    if (!fidRepCurp.trim()) return 'CURP del representante es obligatoria';
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    if (!apiBase) {
      setError('NEXT_PUBLIC_API_BASE_URL no está definido');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('No hay token en localStorage. Inicia sesión nuevamente.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();

      const res = await fetch(`${apiBase}/api/cliente/registrar-cliente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? `Error HTTP ${res.status}`);
      }

      const newId = data?.cliente?.id;
      if (!newId) {
        throw new Error('No se recibió cliente.id en la respuesta del backend');
      }

      router.push(`/cliente/clientes/${newId}`);
    } catch (e: any) {
      setError(e?.message ?? 'Error al registrar cliente');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Registrar Cliente</h1>

      {error ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loadingCatalogos ? (
        <div className="mb-4 text-sm text-gray-600">Cargando catálogos...</div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="rounded border p-4">
          <h2 className="mb-3 font-medium">Datos base</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Empresa ID <span className="text-red-600">*</span>
              </label>
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                type="number"
                value={empresaId}
                onChange={(e) => setEmpresaId(Number(e.target.value))}
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

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">
                Nombre / Razón Social <span className="text-red-600">*</span>
              </label>
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                value={nombreEntidad}
                onChange={(e) => setNombreEntidad(e.target.value)}
              />
            </div>

            <SearchSelect
              label="Nacionalidad"
              required
              items={paises}
              value={nacionalidad}
              onChange={setNacionalidad}
              disabled={loadingCatalogos}
              placeholder="Escribe para buscar..."
            />

            <SearchSelect
              label="País (contacto)"
              required
              items={paises}
              value={paisContacto}
              onChange={setPaisContacto}
              disabled={loadingCatalogos}
              placeholder="Escribe para buscar..."
            />

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Teléfono <span className="text-red-600">*</span>
              </label>
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
          </div>
        </div>

        {tipoCliente === 'persona_fisica' ? (
          <div className="rounded border p-4">
            <h2 className="mb-3 font-medium">Persona Física</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  value={pfApellidoP}
                  onChange={(e) => setPfApellidoP(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Apellido materno</label>
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={pfApellidoM}
                  onChange={(e) => setPfApellidoM(e.target.value)}
                />
              </div>

              <SearchSelect
                label="Actividad económica"
                items={actividades}
                value={pfActividadClave}
                onChange={setPfActividadClave}
                disabled={loadingCatalogos}
                placeholder="Escribe para buscar..."
              />
            </div>
          </div>
        ) : null}

        {tipoCliente === 'persona_moral' ? (
          <div className="rounded border p-4">
            <h2 className="mb-3 font-medium">Persona Moral</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  RFC <span className="text-red-600">*</span>
                </label>
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={pmRfc}
                  onChange={(e) => setPmRfc(e.target.value)}
                  placeholder="XAXX010101000"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Fecha constitución</label>
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={pmFechaConstitucion}
                  onChange={(e) => setPmFechaConstitucion(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>

              <SearchSelect
                label="Giro mercantil"
                items={giros}
                value={pmGiroClave}
                onChange={setPmGiroClave}
                disabled={loadingCatalogos}
                placeholder="Escribe para buscar..."
              />

              <div className="md:col-span-2">
                <h3 className="mb-2 text-sm font-semibold">Representante</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                      value={repApellidoP}
                      onChange={(e) => setRepApellidoP(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Apellido materno</label>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={repApellidoM}
                      onChange={(e) => setRepApellidoM(e.target.value)}
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
                      placeholder="XAXX010101000"
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
          </div>
        ) : null}

        {tipoCliente === 'fideicomiso' ? (
          <div className="rounded border p-4">
            <h2 className="mb-3 font-medium">Fideicomiso (iteración 1)</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Identificador <span className="text-red-600">*</span>
                </label>
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={fidIdentificador}
                  onChange={(e) => setFidIdentificador(e.target.value)}
                  placeholder="FID-0001"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Denominación del fiduciario <span className="text-red-600">*</span>
                </label>
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={fidDenominacion}
                  onChange={(e) => setFidDenominacion(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  RFC del fiduciario <span className="text-red-600">*</span>
                </label>
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={fidRfcFiduciario}
                  onChange={(e) => setFidRfcFiduciario(e.target.value)}
                  placeholder="XAXX010101000"
                />
              </div>

              <div className="md:col-span-2">
                <h3 className="mb-2 text-sm font-semibold">Representante / Apoderado</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-medium">
                      Nombre completo <span className="text-red-600">*</span>
                    </label>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={fidRepNombreCompleto}
                      onChange={(e) => setFidRepNombreCompleto(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      Fecha de nacimiento <span className="text-red-600">*</span>
                    </label>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={fidRepFechaNacimiento}
                      onChange={(e) => setFidRepFechaNacimiento(e.target.value)}
                      placeholder="AAAAMMDD"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      RFC <span className="text-red-600">*</span>
                    </label>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={fidRepRfc}
                      onChange={(e) => setFidRepRfc(e.target.value)}
                      placeholder="XAXX010101000"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      CURP <span className="text-red-600">*</span>
                    </label>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={fidRepCurp}
                      onChange={(e) => setFidRepCurp(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Registrar'}
          </button>

          <button
            type="button"
            className="rounded border px-4 py-2 text-sm"
            onClick={() => router.push('/cliente/clientes')}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
