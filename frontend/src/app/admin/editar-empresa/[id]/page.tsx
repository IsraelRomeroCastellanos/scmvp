// frontend/src/app/admin/editar-empresa/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Empresa = {
  id: number;
  nombre_legal: string;
  rfc: string | null;
  tipo_entidad: 'persona_moral' | 'persona_fisica';
  pais: string | null;
  domicilio: string | null;
  estado: 'activo' | 'inactivo' | 'suspendido';
};

function getToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

/**
 * Parseo tolerante de domicilio guardado como texto.
 * Soporta formatos tipo:
 * - "Calle X #12 Int 3, Municipio, Entidad, CP 12345"
 * - "Calle X #12, Municipio, Entidad, CP 12345"
 * - Otros (mejor esfuerzo)
 */
function parseDomicilio(domicilio?: string | null) {
  const out = {
    calle: '',
    numero: '',
    interior: '',
    municipio: '',
    entidad: '',
    codigoPostal: '',
  };

  if (!domicilio) return out;

  const text = domicilio.trim();

  // CP
  const cpMatch = text.match(/CP\s*([0-9]{4,6})/i);
  if (cpMatch?.[1]) out.codigoPostal = cpMatch[1];

  // Intentar separar por comas: [calle+num(+int)], municipio, entidad, ...
  const parts = text.split(',').map(p => p.trim()).filter(Boolean);
  if (parts[1]) out.municipio = parts[1];
  if (parts[2]) out.entidad = parts[2];

  // Parte 0: "Calle ..." con #numero e Int interior
  const p0 = parts[0] ?? text;

  // Interior: "Int X"
  const intMatch = p0.match(/\bInt\s*([A-Za-z0-9-]+)\b/i);
  if (intMatch?.[1]) out.interior = intMatch[1];

  // Número: "#12"
  const numMatch = p0.match(/#\s*([A-Za-z0-9-]+)/);
  if (numMatch?.[1]) out.numero = numMatch[1];

  // Calle: quitar prefijos y lo que sea #num / Int
  let calle = p0.replace(/^Calle\s+/i, '');
  calle = calle.replace(/#\s*[A-Za-z0-9-]+/g, '').trim();
  calle = calle.replace(/\bInt\s*[A-Za-z0-9-]+\b/gi, '').trim();
  out.calle = calle;

  return out;
}

export default function EditarEmpresaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  // Campos controlados (lo que el usuario edita)
  const [nombreLegal, setNombreLegal] = useState('');
  const [rfc, setRfc] = useState('');
  const [tipoEntidad, setTipoEntidad] = useState<'persona_moral' | 'persona_fisica'>('persona_moral');
  const [pais, setPais] = useState('México');
  const [estado, setEstado] = useState<'activo' | 'inactivo' | 'suspendido'>('activo');

  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [interior, setInterior] = useState('');
  const [entidad, setEntidad] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    const run = async () => {
      setError('');
      setLoading(true);

      try {
        const token = getToken();

        const res = await fetch(`${apiBase}/api/admin/empresas/${id}`, {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: 'no-store',
        });

        const text = await res.text();
        if (!res.ok) throw new Error(text || 'Error al cargar la empresa');

        const data = JSON.parse(text);
        const e: Empresa = data.empresa;

        setEmpresa(e);

        // Precargar campos
        setNombreLegal(e.nombre_legal ?? '');
        setRfc(e.rfc ?? '');
        setTipoEntidad(e.tipo_entidad ?? 'persona_moral');
        setPais(e.pais ?? 'México');
        setEstado(e.estado ?? 'activo');

        const parsed = parseDomicilio(e.domicilio);
        setCalle(parsed.calle);
        setNumero(parsed.numero);
        setInterior(parsed.interior);
        setEntidad(parsed.entidad);
        setMunicipio(parsed.municipio);
        setCodigoPostal(parsed.codigoPostal);
      } catch (err: any) {
        console.error(err);
        setError('Error al cargar la empresa.');
      } finally {
        setLoading(false);
      }
    };

    if (id) run();
  }, [apiBase, id]);

  // Construimos domicilio SIEMPRE desde los estados actuales (esto evita el bug)
  const domicilioConstruido = useMemo(() => {
    const base = `Calle ${calle.trim()} #${numero.trim()}`;
    const intPart = interior.trim() ? ` Int ${interior.trim()}` : '';
    const muni = municipio.trim();
    const ent = entidad.trim();
    const cp = codigoPostal.trim();
    // Mantener formato consistente para parseos futuros
    return `${base}${intPart}, ${muni}, ${ent}, CP ${cp}`;
  }, [calle, numero, interior, municipio, entidad, codigoPostal]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validación mínima (alineada a lo que quieres)
    if (!nombreLegal.trim()) return setError('Nombre legal es obligatorio.');
    if (!rfc.trim()) return setError('RFC es obligatorio.');
    if (!calle.trim() || !numero.trim() || !entidad.trim() || !municipio.trim() || !codigoPostal.trim()) {
      return setError('Completa Calle, Número, Entidad, Municipio y Código Postal.');
    }

    try {
      setSaving(true);
      const token = getToken();

      const res = await fetch(`${apiBase}/api/admin/empresas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          nombre_legal: nombreLegal.trim(),
          rfc: rfc.trim(),
          tipo_entidad: tipoEntidad,
          pais: pais.trim() || 'México',
          estado,
          domicilio: domicilioConstruido, // ✅ aquí va lo actualizado
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || 'Error al guardar la empresa');

      router.push('/admin/empresas');
    } catch (err: any) {
      console.error(err);
      setError('Error al guardar cambios.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Cargando empresa...</div>;

  if (!empresa) {
    return (
      <div className="p-6">
        <div className="text-red-600">{error || 'No se encontró la empresa.'}</div>
        <button
          onClick={() => router.push('/admin/empresas')}
          className="mt-4 bg-gray-200 px-4 py-2 rounded"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4">
        Editar Empresa <span className="text-gray-500">#{empresa.id}</span>
      </h1>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Nombre legal *</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={nombreLegal}
            onChange={(e) => setNombreLegal(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">RFC *</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={rfc}
            onChange={(e) => setRfc(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Tipo de entidad *</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={tipoEntidad}
            onChange={(e) => setTipoEntidad(e.target.value as any)}
          >
            <option value="persona_moral">Persona moral</option>
            <option value="persona_fisica">Persona física</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Estado *</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={estado}
            onChange={(e) => setEstado(e.target.value as any)}
          >
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="suspendido">Suspendido</option>
          </select>
        </div>

        <div className="border-t pt-4">
          <h2 className="font-semibold mb-2">Domicilio</h2>

          <div>
            <label className="block font-medium mb-1">Calle *</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={calle}
              onChange={(e) => setCalle(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Número *</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Interior</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={interior}
              onChange={(e) => setInterior(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Entidad *</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={entidad}
              onChange={(e) => setEntidad(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Municipio *</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Código Postal *</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={codigoPostal}
              onChange={(e) => setCodigoPostal(e.target.value)}
            />
          </div>

          {/* Solo para depurar: asegura que se construye lo nuevo */}
          <div className="text-xs text-gray-500 mt-2">
            <span className="font-medium">Domicilio a guardar:</span> {domicilioConstruido}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/admin/empresas')}
            className="bg-gray-200 px-4 py-2 rounded"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
