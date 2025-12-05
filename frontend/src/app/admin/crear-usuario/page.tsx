'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import Navbar from '@/components/Navbar';

export default function CrearUsuario() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    rol: 'consultor',
    empresa_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const router = useRouter();
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      const user = JSON.parse(storedUser);
      if (user.rol === 'admin') {
        setToken(storedToken);
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
      // Validar campos según rol
      if (formData.rol === 'cliente' && !formData.empresa_id) {
        throw new Error('Los clientes deben estar vinculados a una empresa');
      }
      
      if ((formData.rol === 'admin' || formData.rol === 'consultor') && formData.empresa_id) {
        throw new Error('Los administradores y consultores no pueden tener empresa asignada');
      }

      const response = await api.post('/api/admin/usuarios', formData, token);
      
      if (response.success) {
        setMensaje('✅ Usuario creado exitosamente');
        toast.success('Usuario creado exitosamente');
        
        // Limpiar formulario
        setFormData({
          email: '',
          password: '',
          nombre_completo: '',
          rol: 'consultor',
          empresa_id: ''
        });
        
        // Redirigir a la lista de usuarios después de 2 segundos
        setTimeout(() => router.push('/admin/usuarios'), 2000);
      } else {
        throw new Error(response.message || 'Falló la creación del usuario');
      }
    } catch (err: any) {
      console.error('Error al crear usuario:', err);
      const errorMessage = err.message || 'Error al crear usuario. Por favor intenta nuevamente.';
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
            <h1 className="text-2xl font-bold text-gray-900">Crear Nuevo Usuario</h1>
            <p className="mt-1 text-sm text-gray-500">
              Completa el formulario para crear un nuevo usuario en el sistema
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
                  <label htmlFor="rol" className="block text-sm font-medium text-gray-700">
                    Rol
                  </label>
                  <select
                    id="rol"
                    name="rol"
                    value={formData.rol}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="admin">Administrador</option>
                    <option value="consultor">Consultor</option>
                    <option value="cliente">Cliente</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.rol === 'cliente' 
                      ? 'Los clientes deben estar vinculados a una empresa' 
                      : 'Administradores y consultores no tienen empresa asignada'}
                  </p>
                </div>

                {formData.rol === 'cliente' && (
                  <div>
                    <label htmlFor="empresa_id" className="block text-sm font-medium text-gray-700">
                      ID de la Empresa
                    </label>
                    <input
                      id="empresa_id"
                      name="empresa_id"
                      type="number"
                      required
                      value={formData.empresa_id}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      ID de la empresa a la que pertenece el cliente
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/admin/usuarios')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creando usuario...
                    </span>
                  ) : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}