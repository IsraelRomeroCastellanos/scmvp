// frontend/src/app/admin/crear-usuario/page.tsx
'use client';

import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/auth';

type RolUsuario = 'admin' | 'consultor' | 'cliente';

interface Empresa {
  id: number;
  nombre_legal: string;
  rfc?: string | null;
}

interface FormData {
  email: string;
  password: string;
  nombre_completo: string;
  rol: RolUsuario;
  empresa_id: string;
  activo: boolean;
}

const initialFormData: FormData = {
  email: '',
  password: '',
  nombre_completo: '',
  rol: 'consultor',
  empresa_id: '',
  activo: true,
};

export default function CrearUsuario() {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!storedToken || !storedUser) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      if (!isAdmin(user.rol || user.role)) {
        router.push('/dashboard');
        return;
      }

      setToken(storedToken);
    } catch {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!token) return;

    const fetchEmpresas = async () => {
      setLoadingEmpresas(true);

      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;

        if (!base) {
          throw new Error('Falta NEXT_PUBLIC_API_BASE_URL');
        }

        const res = await fetch(`${base}/api/admin/empresas`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || 'Error al cargar empresas');
        }

        const data = await res.json();
        setEmpresas(data.empresas || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar empresas');
      } finally {
        setLoadingEmpresas(false);
      }
    };

    fetchEmpresas();
  }, [token]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [target.name]: target.checked }));
      return;
    }

    const { name, value } = target;

    setFormData((prev) => {
      if (name === 'rol') {
        return {
          ...prev,
          rol: value as RolUsuario,
          empresa_id: value === 'cliente' ? prev.empresa_id : '',
        };
      }

      return { ...prev, [name]: value };
    });
  };

  const validate = (): string | null => {
    const email = formData.email.trim();
    const nombreCompleto = formData.nombre_completo.trim();

    if (!email) return 'email es obligatorio';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'email invalido';
    if (!formData.password) return 'password es obligatorio';
    if (formData.password.length < 8) {
      return 'password debe tener al menos 8 caracteres';
    }
    if (!nombreCompleto) return 'nombre_completo es obligatorio';
    if (!['admin', 'consultor', 'cliente'].includes(formData.rol)) {
      return 'rol invalido';
    }
    if (formData.rol === 'cliente' && !formData.empresa_id) {
      return 'empresa_id es obligatorio para rol cliente';
    }

    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError('');
    setMensaje('');

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!token) {
      router.push('/login');
      return;
    }

    setSaving(true);

    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;

      if (!base) {
        throw new Error('Falta NEXT_PUBLIC_API_BASE_URL');
      }

      const payload: {
        email: string;
        password: string;
        nombre_completo: string;
        rol: RolUsuario;
        empresa_id?: number;
        activo: boolean;
      } = {
        email: formData.email.trim(),
        password: formData.password,
        nombre_completo: formData.nombre_completo.trim(),
        rol: formData.rol,
        activo: formData.activo,
      };

      if (formData.rol === 'cliente') {
        payload.empresa_id = Number(formData.empresa_id);
      }

      const res = await fetch(`${base}/api/admin/usuarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Error al crear usuario');
      }

      setMensaje('Usuario creado exitosamente. Regresando al listado…');
      setFormData(initialFormData);

      window.setTimeout(() => {
        router.push('/admin/usuarios');
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Crear usuario</h1>
            <p className="text-sm text-gray-600">
              Alta mínima de usuarios del sistema. La contraseña no se almacena en el navegador.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/admin/usuarios')}
            className="w-full sm:w-auto px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Volver a usuarios
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          {error && (
            <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="mb-4 p-3 rounded bg-green-50 text-green-700 text-sm">
              {mensaje}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="off"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña temporal *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Mínimo 8 caracteres. No se guarda en localStorage ni sessionStorage.
                </p>
              </div>

              <div>
                <label htmlFor="nombre_completo" className="block text-sm font-medium text-gray-700">
                  Nombre completo *
                </label>
                <input
                  id="nombre_completo"
                  name="nombre_completo"
                  type="text"
                  value={formData.nombre_completo}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="rol" className="block text-sm font-medium text-gray-700">
                  Rol *
                </label>
                <select
                  id="rol"
                  name="rol"
                  value={formData.rol}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="consultor">Consultor</option>
                  <option value="cliente">Cliente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {formData.rol === 'cliente' && (
                <div>
                  <label htmlFor="empresa_id" className="block text-sm font-medium text-gray-700">
                    Empresa *
                  </label>
                  <select
                    id="empresa_id"
                    name="empresa_id"
                    value={formData.empresa_id}
                    onChange={handleChange}
                    disabled={loadingEmpresas}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">
                      {loadingEmpresas ? 'Cargando empresas…' : 'Selecciona una empresa'}
                    </option>
                    {empresas.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nombre_legal}
                        {empresa.rfc ? ` — ${empresa.rfc}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  id="activo"
                  name="activo"
                  type="checkbox"
                  checked={formData.activo}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="activo" className="text-sm font-medium text-gray-700">
                  Usuario activo
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => router.push('/admin/usuarios')}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
