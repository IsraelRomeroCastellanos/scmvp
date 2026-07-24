'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Badge,
  EmptyState,
  Input,
  LoadingState,
  PageHeader,
  TableContainer,
} from '@/components/ui';
import { getCurrentUser, isAdmin } from '@/lib/auth';

interface Empresa {
  id: number;
  nombre_legal: string;
  rfc: string | null;
  tipo_entidad: string;
  estado: 'activo' | 'suspendido' | 'inactivo' | string;
  entidad: string | null;
  municipio: string | null;
  codigo_postal: string | null;
}

function mostrar(value: string | null | undefined) {
  const normalized = String(value ?? '').trim();
  return normalized || '—';
}

function normalizeSearchValue(value: string | null | undefined) {
  return String(value ?? '').trim().toLocaleLowerCase('es');
}

function tipoEntidadLabel(tipo: string) {
  const normalized = String(tipo ?? '').trim().toLowerCase();
  if (normalized === 'persona_moral') return 'Persona moral';
  if (normalized === 'persona_fisica') return 'Persona física';

  const readable = normalized.replace(/[_-]+/g, ' ').trim();
  return readable ? `${readable.charAt(0).toUpperCase()}${readable.slice(1)}` : '—';
}

function estadoVariant(estado: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const normalized = String(estado ?? '').trim().toLowerCase();
  if (normalized === 'activo') return 'success';
  if (normalized === 'suspendido') return 'warning';
  if (normalized === 'inactivo') return 'danger';
  return 'neutral';
}

function ubicacionPrincipal(empresa: Empresa) {
  return [empresa.municipio, empresa.entidad]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(', ') || '—';
}

function EmpresaDetails({ empresa }: { empresa: Empresa }) {
  return (
    <div className="min-w-0">
      <div className="font-semibold text-text-primary">{mostrar(empresa.nombre_legal)}</div>
      <div className="mt-1 text-xs text-text-secondary">ID: {empresa.id}</div>
      <div className="mt-1 text-xs text-text-secondary">RFC: {mostrar(empresa.rfc)}</div>
    </div>
  );
}

function UbicacionDetails({ empresa }: { empresa: Empresa }) {
  return (
    <div>
      <div className="text-text-primary">{ubicacionPrincipal(empresa)}</div>
      <div className="mt-1 text-xs text-text-secondary">C.P. {mostrar(empresa.codigo_postal)}</div>
    </div>
  );
}

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canManageEmpresas, setCanManageEmpresas] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);

  const fetchEmpresas = async () => {
    try {
      setError('');
      setLoading(true);

      const token = localStorage.getItem('token');
      const base = process.env.NEXT_PUBLIC_API_BASE_URL;

      if (!base) {
        throw new Error('Falta NEXT_PUBLIC_API_BASE_URL');
      }

      const res = await fetch(`${base}/api/admin/empresas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (!res.ok) throw new Error('No se pudo cargar empresas');

      const data = await res.json();
      setEmpresas(Array.isArray(data?.empresas) ? data.empresas : []);
    } catch (_error) {
      setEmpresas([]);
      setError('Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCanManageEmpresas(isAdmin(getCurrentUser()?.rol));
    fetchEmpresas();
  }, []);

  useEffect(() => {
    if (!selectedEmpresa) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedEmpresa(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedEmpresa]);

  const normalizedSearch = normalizeSearchValue(search);
  const filteredEmpresas = useMemo(() => {
    if (!normalizedSearch) return empresas;

    return empresas.filter((empresa) =>
      [empresa.nombre_legal, empresa.rfc, empresa.municipio, empresa.entidad]
        .map(normalizeSearchValue)
        .some((value) => value.includes(normalizedSearch)),
    );
  }, [empresas, normalizedSearch]);

  const resultLabel = normalizedSearch
    ? `${filteredEmpresas.length} coincidencia${filteredEmpresas.length === 1 ? '' : 's'}`
    : `${empresas.length} empresa${empresas.length === 1 ? '' : 's'}`;

  const emptyTitle = normalizedSearch
    ? 'No se encontraron empresas'
    : 'No hay empresas registradas';
  const emptyDescription = normalizedSearch
    ? 'Prueba con otro nombre, RFC, municipio o entidad.'
    : 'Cuando se registren empresas aparecerán en este listado.';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Empresas"
        description="Consulta las empresas registradas en Shield by Vission."
        actions={
          canManageEmpresas ? (
            <Link
              href="/admin/crear-empresa"
              className="inline-flex min-h-11 items-center justify-center rounded-control bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              Crear empresa
            </Link>
          ) : undefined
        }
      />

      {canManageEmpresas && !loading && !error ? (
        <div className="max-w-xl">
          <label htmlFor="buscar-empresa" className="mb-2 block text-sm font-medium text-text-primary">
            Buscar empresas
          </label>
          <Input
            id="buscar-empresa"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre, RFC, municipio o entidad"
          />
        </div>
      ) : null}

      {loading ? <LoadingState label="Cargando empresas…" /> : null}

      {!loading && error ? <Alert variant="danger">{error}</Alert> : null}

      {!loading && !error ? (
        <section className="space-y-3" aria-label="Listado de empresas">
          <div className="text-sm text-text-secondary" aria-live="polite">
            {resultLabel}
          </div>

          {filteredEmpresas.length === 0 ? (
            <EmptyState title={emptyTitle} description={emptyDescription} />
          ) : (
            <>
              <TableContainer className="hidden md:block">
                <table className="sbv-table">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Ubicación</th>
                      <th>Tipo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmpresas.map((empresa) => (
                      <tr key={empresa.id}>
                        <td className="min-w-64">
                          <EmpresaDetails empresa={empresa} />
                        </td>
                        <td className="min-w-52">
                          <UbicacionDetails empresa={empresa} />
                        </td>
                        <td>{tipoEntidadLabel(empresa.tipo_entidad)}</td>
                        <td>
                          <Badge variant={estadoVariant(empresa.estado)}>{mostrar(empresa.estado)}</Badge>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedEmpresa(empresa)}
                              className="inline-flex min-h-10 items-center rounded-control border border-border-light px-3 text-sm font-semibold text-brand-graphite hover:bg-surface-muted hover:text-brand-elevated focus-visible:ring-2 focus-visible:ring-brand-silver"
                            >
                              Ver
                            </button>
                            {canManageEmpresas ? (
                              <Link
                                href={`/admin/editar-empresa/${empresa.id}`}
                                className="inline-flex min-h-10 items-center rounded-control px-3 text-sm font-semibold text-brand-graphite hover:bg-surface-muted hover:text-brand-elevated focus-visible:ring-2 focus-visible:ring-brand-silver"
                              >
                                Editar
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>

              <div className="space-y-3 md:hidden">
                {filteredEmpresas.map((empresa) => (
                  <article
                    key={empresa.id}
                    className="rounded-card border border-border-light bg-white p-4 shadow-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <EmpresaDetails empresa={empresa} />
                      <Badge className="shrink-0" variant={estadoVariant(empresa.estado)}>
                        {mostrar(empresa.estado)}
                      </Badge>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm">
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">Tipo</dt>
                        <dd className="mt-1 text-text-primary">{tipoEntidadLabel(empresa.tipo_entidad)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">Ubicación</dt>
                        <dd className="mt-1">
                          <UbicacionDetails empresa={empresa} />
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border-light pt-3">
                      <button
                        type="button"
                        onClick={() => setSelectedEmpresa(empresa)}
                        className="inline-flex min-h-10 items-center rounded-control border border-border-light px-3 text-sm font-semibold text-brand-graphite hover:bg-surface-muted hover:text-brand-elevated focus-visible:ring-2 focus-visible:ring-brand-silver"
                      >
                        Ver
                      </button>
                      {canManageEmpresas ? (
                        <Link
                          href={`/admin/editar-empresa/${empresa.id}`}
                          className="inline-flex min-h-10 items-center rounded-control px-3 text-sm font-semibold text-brand-graphite hover:bg-surface-muted hover:text-brand-elevated focus-visible:ring-2 focus-visible:ring-brand-silver"
                        >
                          Editar
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      ) : null}

      {selectedEmpresa ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="empresa-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/65"
            aria-label="Cerrar detalle de empresa"
            onClick={() => setSelectedEmpresa(null)}
          />

          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-panel border border-border-light bg-white p-5 shadow-float sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-secondary">Detalle de empresa</p>
                <h2 id="empresa-modal-title" className="mt-1 break-words text-xl font-semibold text-text-primary sm:text-2xl">
                  {mostrar(selectedEmpresa.nombre_legal)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmpresa(null)}
                className="inline-flex min-h-10 shrink-0 items-center rounded-control border border-border-light px-3 text-sm font-semibold text-brand-graphite hover:bg-surface-muted hover:text-brand-elevated focus-visible:ring-2 focus-visible:ring-brand-silver"
              >
                Cerrar
              </button>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-card bg-surface-muted p-3 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">Nombre legal</dt>
                <dd className="mt-1 break-words font-medium text-text-primary">{mostrar(selectedEmpresa.nombre_legal)}</dd>
              </div>
              <div className="rounded-card bg-surface-muted p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">ID</dt>
                <dd className="mt-1 text-text-primary">{selectedEmpresa.id}</dd>
              </div>
              <div className="rounded-card bg-surface-muted p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">RFC</dt>
                <dd className="mt-1 break-words text-text-primary">{mostrar(selectedEmpresa.rfc)}</dd>
              </div>
              <div className="rounded-card bg-surface-muted p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">Tipo</dt>
                <dd className="mt-1 text-text-primary">{tipoEntidadLabel(selectedEmpresa.tipo_entidad)}</dd>
              </div>
              <div className="rounded-card bg-surface-muted p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">Estado</dt>
                <dd className="mt-2">
                  <Badge variant={estadoVariant(selectedEmpresa.estado)}>{mostrar(selectedEmpresa.estado)}</Badge>
                </dd>
              </div>
              <div className="rounded-card bg-surface-muted p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">Entidad</dt>
                <dd className="mt-1 break-words text-text-primary">{mostrar(selectedEmpresa.entidad)}</dd>
              </div>
              <div className="rounded-card bg-surface-muted p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">Municipio</dt>
                <dd className="mt-1 break-words text-text-primary">{mostrar(selectedEmpresa.municipio)}</dd>
              </div>
              <div className="rounded-card bg-surface-muted p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-text-secondary">Código postal</dt>
                <dd className="mt-1 break-words text-text-primary">{mostrar(selectedEmpresa.codigo_postal)}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  );
}
