'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Cliente {
  id: number;
  nombre_entidad: string;
  tipo_cliente: string;
  nacionalidad: string | null;
  estado: 'activo' | 'inactivo';
}

interface Empresa {
  id: number;
  nombre_legal: string;
  rfc?: string | null;
  estado?: string | null;
}

export default function ClientesPage() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL || '', []);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // 1) Cargar empresas (para poder seleccionar empresa_id)
        //    Si falla, igual intentamos cargar clientes (por si el backend no requiere empresa_id).
        let empresasList: Empresa[] = [];
        try {
          const resEmp = await fetch(`${apiBase}/api/admin/empresas`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store'
          });

          const dataEmp = await resEmp.json().catch(() => ({}));
          if (resEmp.ok) {
            empresasList = Array.isArray(dataEmp?.empresas) ? dataEmp.empresas : [];
            setEmpresas(empresasList);
          }
        } catch {
          // silencioso (no bloquea)
        }

        // 2) Determinar empresa_id activa
        const saved = localStorage.getItem('empresa_id_activa');
        let selected: number | '' = '';

        if (saved && /^\d+$/.test(saved)) {
          selected = Number(saved);
        } else if (empresasList.length > 0) {
          selected = empresasList[0].id;
        }

        setEmpresaId(selected);

        // 3) Cargar clientes (con empresa_id si lo tenemos)
        await fetchClientes(token, selected);
      } catch (e) {
        console.error(e);
        setError('Error al cargar clientes');
      } finally {
        setLoading(false);
      }
    };

    const fetchClientes = async (token: string, empresaIdSelected: number | '') => {
      // Si hay empresa_id, lo mandamos por query param (lo más común)
      const url =
        empresaIdSelected !== ''
          ? `${apiBase}/api/cliente/clientes?empresa_id=${empresaIdSelected}`
          : `${apiBase}/api/cliente/clientes`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Caso típico: backend pide empresa_id => reintento si podemos obtener empresas
        const msg = String(data?.error || '');
        if (res.status === 400 && msg.toLowerCase().includes('empresa_id')) {
          // Intentar cargar empresas y elegir la primera como fallback
          const resEmp = await fetch(`${apiBase}/api/admin/empresas`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store'
          });
          const dataEmp = await resEmp.json().catch(() => ({}));

          const list = Array.isArray(dataEmp?.empresas) ? dataEmp.empresas : [];
          setEmpresas(list);

          if (list.length > 0) {
            const fallbackId = list[0].id;
            setEmpresaId(fallbackId);
            localStorage.setItem('empresa_id_activa', String(fallbackId));

            const res2 = await fetch(`${apiBase}/api/cliente/clientes?empresa_id=${fallbackId}`, {
              headers: { Authorization: `Bearer ${token}` },
              cache: 'no-store'
            });
            const data2 = await res2.json().catch(() => ({}));
            if (!res2.ok) throw new Error(data2?.error || 'Error al cargar clientes');
            setClientes(data2?.clientes ?? []);
            return;
          }
        }

        // Token inválido/expirado => manda a login
        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }

        throw new Error(data?.error || 'Error al cargar clientes');
      }

      setClientes(data?.clientes ?? []);
    };

    init();
  }, [apiBase, router]);

  const onChangeEmpresa = async (val: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const next = val === '' ? '' : Number(val);
    setEmpresaId(next);
    if (next === '') {
      localStorage.removeItem('empresa_id_activa');
    } else {
      localStorage.setItem('empresa_id_activa', String(next));
    }

    try {
      setLoading(true);
      setError('');

      const url =
        next !== '' ? `${apiBase}/api/cliente/clientes?empresa_id=${next}` : `${apiBase}/api/cliente/clientes`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error(data?.error || 'Error al cargar clientes');
      }

      setClientes(data?.clientes ?? []);
    } catch (e) {
      console.error(e);
      setError('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="p-6">Cargando clientes…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white p-6 rounded shadow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Gestión de Clientes</h1>
            <p className="text-sm text-gray-500 mb-4">Listado general de clientes del sistema</p>

            {empresas.length > 0 ? (
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm text-gray-600">Empresa:</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={empresaId === '' ? '' : String(empresaId)}
                  onChange={(e) => onChangeEmpresa(e.target.value)}
                >
                  {empresas.map((e) => (
                    <option key={e.id} value={String(e.id)}>
                      #{e.id} — {e.nombre_legal}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <button
            className="rounded border px-4 py-2 text-sm"
            onClick={() => router.push('/cliente/registrar-cliente')}
          >
            + Registrar cliente
          </button>
        </div>

        {clientes.length === 0 ? (
          <p>No hay clientes registrados.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border">ID</th>
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
                  <td className="p-2 border">{c.nombre_entidad}</td>
                  <td className="p-2 border">{c.tipo_cliente}</td>
                  <td className="p-2 border">{c.nacionalidad ?? '-'}</td>
                  <td className="p-2 border">
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                      {c.estado}
                    </span>
                  </td>

                  <td className="p-2 border">
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => router.push(`/cliente/clientes/${c.id}`)}
                        className="text-blue-600 hover:underline text-sm"
                        title="Ver detalle"
                      >
                        Ver
                      </button>

                      <button
                        onClick={() => router.push(`/cliente/editar-cliente/${c.id}`)}
                        className="text-blue-600 hover:underline text-sm"
                        title="Editar"
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
    </div>
  );
}
