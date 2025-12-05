'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function RegistrarCliente() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    nombre_empresa: '',
    rfc: '',
    tipo_entidad: 'persona_moral',
    nombre_cliente: '',
    tipo_cliente: 'persona_fisica',
    actividad_economica: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      const userData = JSON.parse(user);
      if (userData.rol === 'admin' || userData.rol === 'cliente') {
        // Permitir registro a administradores y clientes
      } else {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMensaje('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
      }

      const response = await api.post('/api/cliente', formData, token);
      
      if (response.success) {
        setMensaje('✅ Cliente registrado exitosamente');
        toast.success('Cliente registrado exitosamente');
        
        // Limpiar formulario
        setFormData({
          email: '',
          password: '',
          nombre_completo: '',
          nombre_empresa: '',
          rfc: '',
          tipo_entidad: 'persona_moral',
          nombre_cliente: '',
          tipo_cliente: 'persona_fisica',
          actividad_economica: ''
        });
        
        // Redirigir según el rol del usuario
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.rol === 'admin') {
          setTimeout(() => router.push('/admin/usuarios'), 2000);
        } else {
          setTimeout(() => router.push('/cliente/clientes'), 2000);
        }
      } else {
        throw new Error(response.message || 'Falló el registro');
      }
    } catch (err: any) {
      console.error('Error al registrar cliente:', err);
      const errorMessage = err.message || 'Error al registrar cliente. Por favor intenta nuevamente.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Registrar Nuevo Cliente</h1>
            <p className="mt-1 text-sm text-gray-500">
              Completa el formulario para crear una nueva cuenta
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            {mensaje && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">
                {mensaje}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Mínimo 8 caracteres
                  </p>
                </div>

                <div>
                  <label htmlFor="nombre_completo" className="block text-sm font-medium text-gray-700">
                    Nombre Completo
                  </label>
                  <input
                    id="nombre_completo"
                    name="nombre_completo"
                    type="text"
                    required
                    value={formData.nombre_completo}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="nombre_empresa" className="block text-sm font-medium text-gray-700">
                    Nombre de la Empresa
                  </label>
                  <input
                    id="nombre_empresa"
                    name="nombre_empresa"
                    type="text"
                    required
                    value={formData.nombre_empresa}
                    onChange={handleChange}
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
                    onChange={handleChange}
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
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="persona_moral">Persona Moral</option>
                    <option value="persona_fisica">Persona Física</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="nombre_cliente" className="block text-sm font-medium text-gray-700">
                    Nombre del Cliente
                  </label>
                  <input
                    id="nombre_cliente"
                    name="nombre_cliente"
                    type="text"
                    required
                    value={formData.nombre_cliente}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="tipo_cliente" className="block text-sm font-medium text-gray-700">
                    Tipo de Cliente
                  </label>
                  <select
                    id="tipo_cliente"
                    name="tipo_cliente"
                    value={formData.tipo_cliente}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="persona_fisica">Persona Física</option>
                    <option value="persona_moral">Persona Moral</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="actividad_economica" className="block text-sm font-medium text-gray-700">
                    Actividad Económica
                  </label>
                  <input
                    id="actividad_economica"
                    name="actividad_economica"
                    type="text"
                    required
                    value={formData.actividad_economica}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Ejemplo: venta_de_inmuebles, servicios_profesionales, comercio_al_por_mayor
                  </p>
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
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Registrando...
                    </span>
                  ) : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}