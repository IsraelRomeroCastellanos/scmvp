// scmvp/frontend/src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // ✅ URL DEL BACKEND SIEMPRE DESDE VARIABLES DE ENTORNO
      // Usamos NEXT_PUBLIC_API_URL que es el nombre que configuraste en Vercel
      const backendUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!backendUrl) {
        throw new Error('La URL del backend no está configurada. Contacte al administrador.');
      }

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

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Error desconocido al iniciar sesión');
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      // Guardar token y datos de usuario (ejemplo simple, se recomienda usar un contexto o librería)
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/dashboard'); // Redirigir al dashboard
    } catch (err: any) {
      console.error('Error de conexión o configuración:', err);
      if (err.message.includes('URL del backend no está configurada')) {
        setError(err.message);
      } else if (err.message.includes('Failed to fetch')) {
        setError('No se puede conectar con el servidor. Verifica tu conexión a internet y que el backend esté funcionando.');
      } else {
        setError('Error de configuración del servidor. El backend está respondiendo con HTML en lugar de JSON.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Iniciar Sesión</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Correo Electrónico
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Contraseña
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              id="password"
              type="password"
              placeholder="********"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              type="submit"
              disabled={loading}
            >
              {loading ? 'Cargando...' : 'Ingresar'}
            </button>
            <Link href="/forgot-password" className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
              ¿Olvidaste tu Contraseña?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
