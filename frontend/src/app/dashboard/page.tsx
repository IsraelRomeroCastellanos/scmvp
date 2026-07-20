'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiDatabase, FiFileText, FiUsers } from 'react-icons/fi';
import { Alert, Card, LoadingState, PageHeader } from '@/components/ui';
import api from '@/lib/api';
import { checkAuth } from '@/lib/auth';

type DashboardStats = {
  usuarios_activos?: number;
  empresas?: number;
  clientes?: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const fetchStats = async () => {
      const auth = checkAuth();

      if (!auth.authenticated) {
        router.replace('/login');
        return;
      }

      try {
        setLoading(true);
        setError('');
        setStats(null);

        const response = await api.get<DashboardStats>('/api/dashboard/stats');

        if (!active) return;
        setStats(response.data);
      } catch (err: any) {
        if (!active) return;

        setStats(null);

        if (err?.response?.status === 401) {
          router.replace('/login');
          return;
        }

        if (err?.response?.status === 403) {
          setError(err?.response?.data?.error || 'No tienes acceso a las estadísticas del dashboard.');
          return;
        }

        setError(err?.response?.data?.error || 'Error al cargar estadísticas del dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchStats();

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return <LoadingState label="Cargando dashboard…" />;
  }

  const statCards = [
    ...(typeof stats?.usuarios_activos === 'number'
      ? [
          {
            label: 'Usuarios activos',
            description: 'Usuarios activos registrados',
            value: stats.usuarios_activos,
            icon: FiUsers,
          },
        ]
      : []),
    ...(typeof stats?.empresas === 'number'
      ? [
          {
            label: 'Empresas registradas',
            description: 'Total de empresas registradas',
            value: stats.empresas,
            icon: FiDatabase,
          },
        ]
      : []),
    ...(typeof stats?.clientes === 'number'
      ? [
          {
            label: 'Clientes registrados',
            description: 'Total de clientes registrados',
            value: stats.clientes,
            icon: FiFileText,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Panel de control y estadísticas generales de Shield by Vission."
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {statCards.length > 0 ? (
        <section
          aria-label="Indicadores principales"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {statCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label} className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-card bg-brand-black text-brand-silver">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="text-3xl font-semibold tracking-tight text-text-primary">
                    {item.value}
                  </div>
                </div>
                <h2 className="mt-5 text-base font-semibold text-text-primary">{item.label}</h2>
                <p className="mt-1 text-sm text-text-secondary">{item.description}</p>
              </Card>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
