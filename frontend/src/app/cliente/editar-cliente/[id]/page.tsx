'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Cliente {
  id: number;
  nombre_entidad: string;
  tipo_cliente: string;
  nacionalidad: string | null;
  porcentaje_cumplimiento: number;
  estado: 'activo' | 'inactivo';
}

export default function EditarClientePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCliente = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/cliente/mis-clientes`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!res.ok) {
          throw new Error('Error al cargar cliente');
        }

        const data = await res.json();
        const encontrado = data.clientes.find(
          (c: Cliente) => c.id === Number(id)
        );

        if (!encontrado) {
          throw new Error('Cliente no encontrado');
        }

        setCliente(encontrado);
      } catch (err) {
        console.error(err);
        setError('Error al cargar cliente');
      } finally {
        setLoading(false);
      }
    };

    fetchCliente();
  }, [id, router]);

  const handleChange = (field: keyof Cliente, value: any) => {
    if (!cliente) return;
    setCliente({ ...cliente, [field]: value });
  };

  const handleSave = async () => {
    if (!cliente) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/cliente/${cliente.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(cliente)
        }
      );

      if (!res.ok) {
        throw new Error('Error al guardar cambios');
      }

      router.push('/cliente/clientes');
    } catch (err) {
      console.error(err);
      alert('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6">Cargando cliente…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!cliente) return null;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded shadow max-w-xl">
        <h1 className="text-2xl font-semibold mb-4">
          Editar Cliente #{cliente.id}
        </h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nombre</label>
            <input
              value={cliente.nombre_entidad}
              onChange={(e) =>
                handleChange('nombre_entidad', e.target.value)
              }
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Tipo</label>
            <select
              value={cliente.tipo_cliente}
              onChange={(e) =>
                handleChange('tipo_cliente', e.target.value)
              }
              className="w-full border p-2 rounded"
            >
              <option value="persona_fisica">Persona Física</option>
              <option value="persona_moral">Persona Moral</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Nacionalidad</label>
            <input
              value={cliente.nacionalidad ?? ''}
              onChange={(e) =>
                handleChange('nacionalidad', e.target.value)
              }
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Estado</label>
            <select
              value={cliente.estado}
              onChange={(e) =>
                handleChange('estado', e.target.value)
              }
              className="w-full border p-2 rounded"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Guardar cambios
          </button>

          <button
            onClick={() => router.push('/cliente/clientes')}
            className="bg-gray-200 px-4 py-2 rounded"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
