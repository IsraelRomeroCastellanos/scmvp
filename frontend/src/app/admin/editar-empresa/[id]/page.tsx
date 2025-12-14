// frontend/src/app/admin/editar-empresa/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EditarEmpresaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Campos
  const [nombreLegal, setNombreLegal] = useState('');
  const [rfc, setRfc] = useState('');
  const [tipoEntidad, setTipoEntidad] = useState('persona_moral');
  const [pais, setPais] = useState('México');
  const [estado, setEstado] = useState('activo');

  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [interior, setInterior] = useState('');
  const [entidad, setEntidad] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');

  // ===============================
  // Cargar empresa
  // ===============================
  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/empresas/${id}`,
          { cache: 'no-store' }
        );

        const text = await res.text();

        if (!res.ok) {
          throw new Error(text || 'Error al cargar la empresa');
        }

        const data = JSON.parse(text);
        const empresa = data.empresa;

        setNombreLegal(empresa.nombre_legal);
        setRfc(empresa.rfc || '');
        setTipoEntidad(empresa.tipo_entidad);
        setPais(empresa.pais || 'México');
        setEstado(empresa.estado);

        // Parseo simple del domicilio
        if (empresa.domicilio) {
          const dom = empresa.domicilio;
          const cpMatch = dom.match(/CP\s*(\d+)/i);
          if (cpMatch) setCodigoPostal(cpMatch[1]);

          const parts = dom.split(',');
          if (parts[0]) {
            const calleNum = parts[0].replace('Calle', '').trim();
            const numMatch = calleNum.match(/#(\d+)/);
            if (numMatch) {
              setNumero(numMatch[1]);
              setCalle(calleNum.replace(`#${numMatch[1]}`, '').trim());
            } else {
              setCalle(calleNum);
            }
          }
          if (parts[1]) setMunicipio(parts[1].trim());
          if (parts[2]) setEntidad(parts[2].trim());
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Error al cargar la empresa');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchEmpresa();
  }, [id]);

  // ===============================
  // Guardar cambios
  // ===============================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombreLegal || !calle || !numero || !entidad || !municipio || !codigoPostal) {
      setError('Por favor completa todos los campos obligatorios.');
      return;
    }

    const domicilio = `Calle ${calle} #${numero}${
      interior ? ` Int ${interior}` : ''
    }, ${municipio}, ${entidad}, CP ${codigoPostal}`;

    try {
      setSaving(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/empresas/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre_legal: nombreLegal,
            rfc: rfc || null,
            tipo_entidad: tipoEntidad,
            pais,
            estado,
            domicilio,
          }),
        }
      );

      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || 'Error al guardar la empresa');
      }

      router.push('/admin/empresas');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al guardar la empresa');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-6">Cargando empresa...</p>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        <p>Error:</p>
        <pre className="mt-2 whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">
        Editar Empresa <span className="text-gray-500">#{id}</span>
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Nombre legal *</label>
          <input
            value={nombreLegal}
            onChange={(e) => setNombreLegal(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">RFC</label>
          <input
            value={rfc}
            onChange={(e) => setRfc(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Tipo de entidad *</label>
          <select
            value={tipoEntidad}
            onChange={(e) => setTipoEntidad(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="persona_moral">Persona moral</option>
            <option value="persona_fisica">Persona física</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Estado *</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full border px-3 py-2 rounded"
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
              value={calle}
              onChange={(e) => setCalle(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Número *</label>
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Interior</label>
            <input
              value={interior}
              onChange={(e) => setInterior(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Entidad *</label>
            <input
              value={entidad}
              onChange={(e) => setEntidad(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Municipio *</label>
            <input
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Código Postal *</label>
            <input
              value={codigoPostal}
              onChange={(e) => setCodigoPostal(e.target.value)}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/admin/empresas')}
            className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
