'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Empresa = {
  id: number;
  nombre_legal: string;
};

type Cliente = {
  id: number;
  empresa_id: number;
  nombre_entidad: string;
  tipo_cliente: string;
  nacionalidad?: string | null;
  estado?: string | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') ||
  'https://scmvp-1jhq.onrender.com';

function getToken(): string {
  try {
    return localStorage.getItem('token') || '';
  } catch {
    return '';
  }
}

async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.error || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return (await res.json()) as T;
}

export default function ClientesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaSel, setEmpresaSel] = useState<string>('all'); // ✅ default = Todas
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const token = useMemo(() => getToken(), []);

  // 1) Cargar empresas (para el selector)
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        if (!token) throw new Error('No hay token. Inicia sesión.');

        const data = await apiGet<{ empresas: Empresa[] }>('/api/admin/empresas', token);

        if (!alive) return;
        const list = Array.isArray(data?.empresas) ? data.empresas : [];
        setEmpresas(list);

        // Si no hay empresas, igual dejamos “all”
        setEmpresaSel('all');
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Error al cargar empresas');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  // 2) Cargar clientes (según selector)
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingClientes(true);
      setError(null);

      try {
        if (!token) throw new Error('No hay token. Inicia sesión.');

        // Caso A: “Todas” => pedimos por cada empresa y unimos
        if (empresaSel === 'all') {
          if (!empresas.length) {
            // si no hay empresas, no hay nada que consultar
            if (!alive) return;
            setClientes([]);
            return;
          }

          const requests = empresas.map((e) =>
            apiGet<{ clientes: Cliente[] }>(
              `/api/cliente/clientes?empresa_id=${encodeURIComponent(String(e.id))}`,
              token
            ).then((r) => (Array.isArray(r?.clientes) ? r.clientes : []))
          );

          const allLists = await Promise.all(requests);
          const flat = allLists.flat();

          // Dedup por id
          const map = new Map<number, Cliente>();
          for (const c of flat) {
            if (c?.id != null) map.set(Number(c.id), c);
          }

          const merged = Array.from(map.values()).sort((a, b) => Number(b.id) - Number(a.id));

          if (!alive) return;
          setClientes(merged);
          return;
        }

        // Caso B: empresa específica
        const empresaId = Number(empresaSel);
        if (!Number.isFinite(empresaId) || empresaId <= 0) {
          throw new Error('Selecciona una empresa válida');
        }

        const data = await apiGet<{ clientes: Cliente[] }>(
          `/api/cliente/clientes?empresa_id=${encodeURIComponent(String(empresaId))}`,
          token
        );

        if (!alive) return;
        setClientes(Array.isArray(data?.clientes) ? data.clientes : []);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || 'Error al cargar clientes');
        setClientes([]);
      } finally {
        if (!alive) return;
        setLoadingClientes(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, empresaSel, empresas]);

  if (loading) {
    return <p className="p-6">Cargando...</p>;
  }

  if (error) {
    return <p className="p-6 text-red-600">{error}</p>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded shadow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Gestión de Clientes</h1>
            <p className="text-sm text-gray-500">
              Listado general de clientes del sistema
            </p>
          </div>

          <button
            className="rounded border px-4 py-2 text-sm"
            onClick={() => router.push('/cliente/registrar-cliente')}
          >
            + Registrar cliente
          </button>
        </div>

        {/* ✅ Selector con default “Todas” */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Empresa:</label>
          <select
            className="border rounded px-3 py-2 text-sm bg-white"
            value={empresaSel}
            onChange={(e) => setEmpresaSel(e.target.value)}
          >
            <option value="all">Todas</option>
            {empresas.map((e) => (
              <option key={e.id} value={String(e.id)}>
                {e.nombre_legal} (ID {e.id})
              </option>
            ))}
          </select>

          {loadingClientes ? (
            <span className="text-sm text-gray-500">Cargando clientes…</span>
          ) : (
            <span className="text-sm text-gray-500">
              {clientes.length} cliente{clientes.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="mt-4">
          {clientes.length === 0 ? (
            <p>No hay clientes registrados.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2 border">ID</th>
                  <th className="p-2 border">Empresa</th>
                  <th className="p-2 border">Nombre</th>
                  <th className="p-2 border">Tipo</th>
                  <th className="p-2 border">Nacionalidad</th>
                  <th className="p-2 border">Estado</th>
                  <th className="p-2 border">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="p-2 border">{c.id}</td>
                    <td className="p-2 border">{c.empresa_id}</td>
                    <td className="p-2 border">{c.nombre_entidad}</td>
                    <td className="p-2 border">{c.tipo_cliente}</td>
                    <td className="p-2 border">{c.nacionalidad || '-'}</td>
                    <td className="p-2 border">{c.estado || '-'}</td>
                    <td className="p-2 border">
                      <div className="flex gap-2">
                        <button
                          className="text-blue-600 hover:underline text-sm"
                          onClick={() => router.push(`/cliente/clientes/${c.id}`)}
                        >
                          Ver
                        </button>
                        <button
                          className="text-blue-600 hover:underline text-sm"
                          onClick={() => router.push(`/cliente/editar-cliente/${c.id}`)}
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-400">
          API: {API_BASE}
        </p>
      </div>
    </div>
  );
}
