'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiDatabase,
  FiFileText,
  FiUsers,
} from 'react-icons/fi';
import Link from 'next/link';
import { Alert, Card, LoadingState, PageHeader } from '@/components/ui';

export default function Dashboard() {
  const [stats, setStats] = useState({
    usuarios: 0,
    empresas: 0,
    clientes: 0,
    alertas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const router = useRouter();
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      const user = JSON.parse(storedUser);
      setToken(storedToken);

      // Redirigir según rol si no está autorizado para el dashboard
      if (user.rol === 'cliente') {
        router.push('/cliente/clientes');
      } else if (user.rol === 'consultor') {
        router.push('/cliente/clientes');
      }

      fetchStats(storedToken);
    } else {
      router.push('/login');
    }
  }, [router]);

  const fetchStats = async (authToken: string) => {
    try {
      setLoading(true);

      // Simular datos para el dashboard
      const mockData = {
        usuarios: 24,
        empresas: 8,
        clientes: 156,
        alertas: 3,
      };

      setStats(mockData);
    } catch (err: any) {
      console.error('Error al cargar estadísticas:', err);
      setError('Error al cargar estadísticas del dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState label="Cargando dashboard…" />;
  }

  const statCards = [
    {
      label: 'Usuarios',
      description: 'Total de usuarios activos',
      value: stats.usuarios,
      icon: FiUsers,
    },
    {
      label: 'Empresas',
      description: 'Empresas registradas',
      value: stats.empresas,
      icon: FiDatabase,
    },
    {
      label: 'Clientes',
      description: 'Clientes registrados',
      value: stats.clientes,
      icon: FiFileText,
    },
    {
      label: 'Alertas',
      description: 'Alertas pendientes',
      value: stats.alertas,
      icon: FiAlertCircle,
      warning: true,
    },
  ];

  const services = ['Base de Datos', 'API Backend', 'Autenticación', 'Carga Masiva'];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Panel de control y estadísticas generales de Shield by Vission."
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <section aria-label="Indicadores principales" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-card bg-brand-black text-brand-silver">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div
                  className={
                    item.warning
                      ? 'text-3xl font-semibold tracking-tight text-semantic-warning'
                      : 'text-3xl font-semibold tracking-tight text-text-primary'
                  }
                >
                  {item.value}
                </div>
              </div>
              <h2 className="mt-5 text-base font-semibold text-text-primary">{item.label}</h2>
              <p className="mt-1 text-sm text-text-secondary">{item.description}</p>
            </Card>
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-text-primary">Actividad reciente</h2>
            <Link
              href="#"
              className="inline-flex min-h-10 items-center rounded-control px-3 py-2 text-sm font-semibold text-brand-graphite hover:bg-surface-muted hover:text-text-primary focus-visible:ring-2 focus-visible:ring-brand-silver"
            >
              Ver todo
            </Link>
          </div>

          <div className="divide-y divide-border-light">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-muted text-brand-graphite">
                  <FiCheckCircle className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-text-primary">Nuevo cliente registrado</div>
                  <div className="mt-1 text-sm text-text-secondary">
                    {item === 1
                      ? 'Joyeros de México - persona_moral'
                      : item === 2
                        ? 'Juan Pérez - persona_fisica'
                        : item === 3
                          ? 'María López - persona_fisica'
                          : 'Carlos Rodríguez - persona_moral'}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-neutral-500">
                  {item === 1
                    ? 'Hace 2 horas'
                    : item === 2
                      ? 'Hace 5 horas'
                      : item === 3
                        ? 'Ayer'
                        : 'Hace 2 días'}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-text-primary">Estado del sistema</h2>
          <div className="mt-6 space-y-5">
            {services.map((service) => (
              <div key={service}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-text-primary">{service}</span>
                  <span className="text-sm font-semibold text-semantic-success">100%</span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
                  role="progressbar"
                  aria-label={`${service} al 100 por ciento`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={100}
                >
                  <div className="h-full w-full rounded-full bg-semantic-success" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-border-light pt-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span className="h-3 w-3 rounded-full bg-semantic-success" aria-hidden="true" />
              <span>Todos los servicios están operando normalmente</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
