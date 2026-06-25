'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUsers } from 'react-icons/fi';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
  Select,
  TableContainer,
} from '@/components/ui';

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

type AuthUser = {
  rol?: string | null;
  role?: string | null;
  empresa_id?: number | string | null;
};

type AppRole = 'admin' | 'consultor' | 'cliente';

function normalizeRole(raw: any): AppRole | null {
  if (!raw) return null;
  const r = String(raw).toLowerCase().trim();

  if (
    r === 'admin' ||
    r === 'administrator' ||
    r === 'administrador' ||
    r === 'administrador del sistema'
  ) {
    return 'admin';
  }

  if (r === 'consultor' || r === 'consultant') return 'consultor';
  if (r === 'cliente' || r === 'client' || r === 'user' || r === 'usuario') return 'cliente';

  return null;
}

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function parsePositiveId(v: any): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

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
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
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

function estadoVariant(estado?: string | null): 'success' | 'danger' | 'warning' | 'neutral' {
  const value = String(estado || '').toLowerCase();
  if (value === 'activo' || value === 'activa') return 'success';
  if (value === 'inactivo' || value === 'inactiva') return 'danger';
  if (value === 'pendiente') return 'warning';
  return 'neutral';
}

export default function ClientesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaSel, setEmpresaSel] = useState<string>('all');
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const token = useMemo(() => getToken(), []);
  const user = useMemo(() => getStoredUser(), []);
  const role = useMemo(() => normalizeRole(user?.rol ?? user?.role), [user]);
  const userEmpresaId = useMemo(() => parsePositiveId(user?.empresa_id), [user]);

  // 1) Cargar empresas (para el selector de admin/consultor).
  // Para rol cliente no se llama /api/admin/empresas; se usa empresa_id del token.
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        if (!token) throw new Error('No hay token. Inicia sesión.');
        if (!role) throw new Error('No hay rol válido en la sesión.');

        if (role === 'cliente') {
          if (!userEmpresaId) {
            throw new Error('No hay empresa_id válido en la sesión del cliente.');
          }

          if (!alive) return;
          setEmpresas([]);
          setEmpresaSel(String(userEmpresaId));
          return;
        }

        const data = await apiGet<{ empresas: Empresa[] }>('/api/admin/empresas', token);

        if (!alive) return;
        const list = Array.isArray(data?.empresas) ? data.empresas : [];
        setEmpresas(list);
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
  }, [token, role, userEmpresaId]);

  // 2) Cargar clientes.
  // Cliente: solo su empresa_id. Admin: conserva selector/Todas. Consultor: sin cambio de contrato en F1A.
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingClientes(true);
      setError(null);

      try {
        if (!token) throw new Error('No hay token. Inicia sesión.');

        if (role === 'cliente') {
          if (!userEmpresaId) {
            throw new Error('No hay empresa_id válido en la sesión del cliente.');
          }

          const data = await apiGet<{ clientes: Cliente[] }>(
            `/api/cliente/clientes?empresa_id=${encodeURIComponent(String(userEmpresaId))}`,
            token
          );

          if (!alive) return;
          setClientes(Array.isArray(data?.clientes) ? data.clientes : []);
          return;
        }

        if (empresaSel === 'all') {
          if (!empresas.length) {
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

          const map = new Map<number, Cliente>();
          for (const c of flat) {
            if (c?.id != null) map.set(Number(c.id), c);
          }

          const merged = Array.from(map.values()).sort((a, b) => Number(b.id) - Number(a.id));

          if (!alive) return;
          setClientes(merged);
          return;
        }

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
  }, [token, role, userEmpresaId, empresaSel, empresas]);

  if (loading) {
    return <LoadingState label="Cargando clientes…" />;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={role === 'cliente' ? 'Mis Clientes' : 'Gestión de Clientes'}
        description={
          role === 'cliente'
            ? 'Listado de clientes asociados a tu empresa.'
            : 'Consulta y administra los clientes disponibles en el portal.'
        }
        actions={
          role === 'admin' || role === 'cliente' ? (
            <Button onClick={() => router.push('/cliente/registrar-cliente')}>
              + Registrar cliente
            </Button>
          ) : undefined
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-border-light px-4 py-4 sm:px-6">
          {role !== 'cliente' ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full max-w-md">
                <label htmlFor="empresa" className="mb-2 block text-sm font-medium text-text-primary">
                  Empresa
                </label>
                <Select
                  id="empresa"
                  className="w-full"
                  value={empresaSel}
                  onChange={(e) => setEmpresaSel(e.target.value)}
                >
                  <option value="all">Todas</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={String(e.id)}>
                      {e.nombre_legal} (ID {e.id})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="text-sm text-text-secondary" aria-live="polite">
                {loadingClientes
                  ? 'Cargando clientes…'
                  : `${clientes.length} cliente${clientes.length === 1 ? '' : 's'}`}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-text-secondary">
                Empresa asignada: ID {userEmpresaId ?? '—'}
              </span>
              <span className="text-sm text-text-secondary" aria-live="polite">
                {loadingClientes
                  ? 'Cargando clientes…'
                  : `${clientes.length} cliente${clientes.length === 1 ? '' : 's'}`}
              </span>
            </div>
          )}
        </div>

        {loadingClientes ? (
          <LoadingState label="Actualizando listado…" />
        ) : clientes.length === 0 ? (
          <EmptyState
            icon={<FiUsers className="h-5 w-5" aria-hidden="true" />}
            title="No hay clientes registrados"
            description="Cuando se registren clientes aparecerán en este listado."
          />
        ) : (
          <TableContainer className="rounded-none border-0 shadow-none">
            <table className="sbv-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Nacionalidad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.id}</td>
                    <td>{c.empresa_id}</td>
                    <td className="min-w-56 font-medium">{c.nombre_entidad}</td>
                    <td>
                      <Badge>{c.tipo_cliente}</Badge>
                    </td>
                    <td>{c.nacionalidad || '—'}</td>
                    <td>
                      <Badge variant={estadoVariant(c.estado)}>{c.estado || 'Sin estado'}</Badge>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/cliente/clientes/${c.id}`)}
                        >
                          Ver
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/cliente/editar-cliente/${c.id}`)}
                        >
                          Editar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        )}
      </Card>
    </div>
  );
}
