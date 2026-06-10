// frontend/src/app/admin/editar-usuario/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type RolUsuario = 'admin' | 'consultor' | 'cliente';

interface Usuario {
  id: number;
  email: string;
  nombre_completo: string;
  rol: RolUsuario;
  empresa_id: number | null;
  activo: boolean;
}

interface Empresa {
  id: number;
  nombre_legal: string;
  rfc?: string | null;
}

export default function EditarUsuario() {
  const router = useRouter();
  const params = useParams();
  const userId = useMemo(() => String(params?.id || ''), [params]);

  const [email, setEmail] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [rol, setRol] = useState<RolUsuario>('consultor');
  const [empresaId, setEmpresaId] = useState('');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('token');
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;

        if (!token) {
          router.push('/login');
          return;
        }

        if (!base) {
          throw new Error('Falta NEXT_PUBLIC_API_BASE_URL');
        }

        const usuariosRes = await fetch(`${base}/api/admin/usuarios`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const usuariosData = await usuariosRes.json().catch(() => null);

        if (!usuariosRes.ok) {
          throw new Error(usuariosData?.error || 'Error al cargar usuarios');
        }

        const usuarios: Usuario[] = usuariosData?.usuarios || [];
        const usuario = usuarios.find((u) => Number(u.id) === Number(userId));

        if (!usuario) {
          throw new Error('Usuario no encontrado');
        }

        setEmail(usuario.email || '');
        setNombreCompleto(usuario.nombre_completo || '');
        setRol(usuario.rol);
        setEmpresaId(usuario.empresa_id ? String(usuario.empresa_id) : '');

        setLoadingEmpresas(true);

        const empresasRes = await fetch(`${base}/api/admin/empresas`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const empresasData = await empresasRes.json().catch(() => null);

        if (!empresasRes.ok) {
          throw new Error(empresasData?.error || 'Error al cargar empresas');
        }

        setEmpresas(empresasData?.empresas || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar usuario');
      } finally {
        setLoading(false);
        setLoadingEmpresas(false);
      }
    };

    if (userId) {
      cargarDatos();
    }
  }, [router, userId]);

  const handleRolChange = (nuevoRol: RolUsuario) => {
    setRol(nuevoRol);

    if (nuevoRol !== 'cliente') {
      setEmpresaId('');
    }
  };

  const validar = () => {
    if (!nombreCompleto.trim()) {
      return 'nombre_completo es obligatorio';
    }

    if (!['admin', 'consultor', 'cliente'].includes(rol)) {
      return 'rol invalido';
    }

    if (rol === 'cliente' && !empresaId) {
      return 'empresa_id es obligatorio para rol cliente';
    }

    return '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validar();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;

      if (!token) {
        router.push('/login');
        return;
      }

      if (!base) {
        throw new Error('Falta NEXT_PUBLIC_API_BASE_URL');
      }

      const payload = {
        nombre_completo: nombreCompleto.trim(),
        rol,
        empresa_id: rol === 'cliente' ? Number(empresaId) : null,
      };

      const res = await fetch(`${base}/api/admin/usuarios/${userId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Error al actualizar usuario');
      }

      setSuccess('Usuario actualizado correctamente');
      router.push('/admin/usuarios');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar usuario');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <p>Cargando usuario…</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto bg-white rounded shadow p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-1">Editar usuario</h1>
          <p className="text-sm text-gray-600">
            Edición mínima de datos no sensibles del usuario.
          </p>
        </div>

        {error && <p className="mb-4 text-red-600">{error}</p>}
        {success && <p className="mb-4 text-green-700">{success}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              readOnly
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-700"
            />
            <p className="mt-1 text-xs text-gray-500">
              El email es solo referencia y no se modifica en este flujo.
            </p>
          </div>

          <div>
            <label htmlFor="nombre_completo" className="block text-sm font-medium text-gray-700">
              Nombre completo
            </label>
            <input
              id="nombre_completo"
              name="nombre_completo"
              type="text"
              required
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
            />
          </div>

          <div>
            <label htmlFor="rol" className="block text-sm font-medium text-gray-700">
              Rol
            </label>
            <select
              id="rol"
              name="rol"
              value={rol}
              onChange={(e) => handleRolChange(e.target.value as RolUsuario)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
              required
            >
              <option value="admin">Administrador</option>
              <option value="consultor">Consultor</option>
              <option value="cliente">Cliente</option>
            </select>
          </div>

          {rol === 'cliente' && (
            <div>
              <label htmlFor="empresa_id" className="block text-sm font-medium text-gray-700">
                Empresa
              </label>
              <select
                id="empresa_id"
                name="empresa_id"
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"
                required
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

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.push('/admin/usuarios')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
