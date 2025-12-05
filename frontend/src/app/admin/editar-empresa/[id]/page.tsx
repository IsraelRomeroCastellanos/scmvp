// src/app/admin/editar-empresa/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { toast } from 'react-toastify';

export default function EditarEmpresa() {
  const [formData, setFormData] = useState({
    nombre_legal: '',
    rfc: '',
    direccion: '',
    tipo_entidad: 'persona_moral',
    estado: 'activo'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { id } = useParams();
  const [token, setToken] = useState<string>('');

  const fetchEmpresa = useCallback(async (authToken: string, empresaId: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/admin/empresas/${empresaId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      if (response.data && response.data.empresa) {
        const empresa = response.data.empresa;
        setFormData({
          nombre_legal: empresa.nombre_legal,
          rfc: empresa.rfc,
          direccion: empresa.direccion || '',
          tipo_entidad: empresa.tipo_entidad || 'persona_moral',
          estado: empresa.estado || 'activo'
        });
      } else {
        setError('Empresa no encontrada');
      }
    } catch (err: any) {
      console.error('Error al cargar empresa:', err);
      setError(err.response?.data?.error || 'Error al cargar empresa');
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      const user = JSON.parse(storedUser);
      if (user.rol === 'admin') {
        setToken(storedToken);
        if (id) {
          fetchEmpresa(storedToken, id.toString());
        }
      } else {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [id, router, fetchEmpresa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await axios.put(`/api/admin/empresas/${id}`, {
        nombre_legal: formData.nombre_legal,
        rfc: formData.rfc,
        direccion: formData.direccion,
        tipo_entidad: formData.tipo_entidad,
        estado: formData.estado
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      toast.success('Empresa actualizada correctamente');
      router.push('/admin/empresas');
    } catch (err: any) {
      console.error('Error al actualizar empresa:', err);
      setError(err.response?.data?.error || 'Error al actualizar empresa');
      toast.error(err.response?.data?.error || 'Error al actualizar empresa');
    } finally {
      setSaving(false);
    }
  };

  // Función especializada para el textarea (para evitar el error de tipos)
  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Función para inputs y selects
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Cargando empresa...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Editar Empresa</h1>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="nombre_legal" className="block text-sm font-medium text-gray-700">
                    Nombre Legal
                  </label>
                  <input
                    id="nombre_legal"
                    name="nombre_legal"
                    type="text"
                    required
                    value={formData.nombre_legal}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="rfc" className="block text-sm font-medium text-gray-700">
                    RFC
                  </label>
                  <input
                    id="rfc"
                    name="rfc"
                    type="text"
                    required
                    value={formData.rfc}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">
                    Dirección
                  </label>
                  <textarea
                    id="direccion"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleTextAreaChange}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="tipo_entidad" className="block text-sm font-medium text-gray-700">
                    Tipo de Entidad
                  </label>
                  <select
                    id="tipo_entidad"
                    name="tipo_entidad"
                    value={formData.tipo_entidad}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="persona_moral">Persona Moral</option>
                    <option value="persona_fisica">Persona Física</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="estado" className="block text-sm font-medium text-gray-700">
                    Estado
                  </label>
                  <select
                    id="estado"
                    name="estado"
                    value={formData.estado}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="activo">Activo</option>
                    <option value="suspendido">Suspendido</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </span>
                  ) : 'Actualizar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}