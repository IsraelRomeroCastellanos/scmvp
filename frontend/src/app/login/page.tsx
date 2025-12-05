// frontend/src/app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      const userData = JSON.parse(user);
      if (userData.rol === 'admin') {
        router.push('/dashboard');
      } else if (userData.rol === 'cliente' || userData.rol === 'consultor') {
        router.push('/cliente/clientes');
      } else {
        router.push('/dashboard');
      }
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value.trim() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    try {
      if (!formData.email || !formData.password) {
        throw new Error('Por favor ingresa email y contraseña');
      }
  
      // ✅ URL DEL BACKEND SIEMPRE DESDE VARIABLES DE ENTORNO
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://plataforma-cumplimiento-mvp.onrender.com';
      
      console.log('🔍 Intentando login en:', `${backendUrl}/api/login`);
      
      const response = await fetch(`${backendUrl}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });
  
      // ✅ VERIFICAR SI LA RESPUESTA ES JSON ANTES DE PARSEAR
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        
        // ✅ DETECTAR SI ES UNA PÁGINA HTML (error 404)
        if (textResponse.includes('<!DOCTYPE html>') || textResponse.includes('<html')) {
          throw new Error('Error de configuración del servidor. El backend está respondiendo con HTML en lugar de JSON.');
        }
        
        throw new Error(`Respuesta inesperada del servidor: ${textResponse.substring(0, 100)}...`);
      }
  
      const data = await response.json();
      console.log('📡 Respuesta del backend:', data);
  
      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
      }
  
      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        toast.success('¡Inicio de sesión exitoso!');
        
        switch (data.user.rol) {
          case 'admin':
            router.push('/dashboard');
            break;
          case 'cliente':
          case 'consultor':
            router.push('/cliente/clientes');
            break;
          default:
            router.push('/dashboard');
        }
      } else {
        throw new Error('Respuesta inválida del servidor - faltan datos de autenticación');
      }
  
    } catch (err: any) {
      console.error('🚨 Error en login:', err);
      
      // ✅ MANEJO ESPECÍFICO DE ERRORES CORS
      let errorMessage = err.message || 'Error al iniciar sesión. Por favor verifica tus credenciales.';
      
      if (err.message && (err.message.includes('CORS') || err.message.includes('cors'))) {
        errorMessage = 'Error de conexión entre servicios. Configuración CORS incorrecta en el servidor.';
      } else if (err.message && err.message.includes('HTML en lugar de JSON')) {
        errorMessage = 'Error de configuración del servidor. El backend está respondiendo con HTML en lugar de JSON.';
      } else if (err.message && err.message.includes('Failed to fetch')) {
        errorMessage = 'No se puede conectar con el servidor. Verifica tu conexión a internet y que el backend esté funcionando.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      
      // ✅ DIAGNÓSTICO DETALLADO EN DESARROLLO
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 Diagnóstico detallado (solo desarrollo):');
        console.log('- URL del backend:', process.env.NEXT_PUBLIC_BACKEND_URL || 'https://plataforma-cumplimiento-mvp.onrender.com');
        console.log('- Estado de conexión:', navigator.onLine ? 'En línea' : 'Sin conexión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Ingresa tus credenciales para acceder al sistema
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Iniciando sesión...
                  </span>
                ) : 'Iniciar Sesión'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  ¿No tienes cuenta?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <a
                href="/registrar-cliente"
                className="w-full flex justify-center py-2 px-4 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Registrar Nuevo Cliente
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center text-sm text-gray-500">
              <p>Credenciales de prueba:</p>
              <p className="font-medium text-blue-600">Email: admin@pruebas.com</p>
              <p className="font-medium text-blue-600">Contraseña: Admin123!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}