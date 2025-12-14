'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CrearEmpresaPage() {
  const router = useRouter();

  const [nombreLegal, setNombreLegal] = useState('');
  const [rfc, setRfc] = useState('');
  const [tipoEntidad, setTipoEntidad] = useState('persona_moral');
  const [pais, setPais] = useState('México');

  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [interior, setInterior] = useState('');
  const [entidad, setEntidad] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !nombreLegal ||
      !calle ||
      !numero ||
      !entidad ||
      !municipio ||
      !codigoPostal
    ) {
      setError('Por favor completa todos los campos obligatorios.');
      return;
    }

    const domicilio = `Calle ${calle} #${numero}${
      interior ? ` Int ${interior}` : ''
    }, ${municipio}, ${entidad}, CP ${codigoPostal}`;

    try {
      setLoading(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/admin/empresas`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre_legal: nombreLegal,
            rfc: rfc || null,
            tipo_entidad: tipoEntidad,
            pais,
            domicilio,
          }),
        }
      );

      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || 'Error al crear la empresa');
      }

      router.push('/admin/empresas');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al crear la empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Crear Empresa</h1>

      {error && (
        <div className="mb-4 text-red-600 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

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

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Crear empresa'}
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
