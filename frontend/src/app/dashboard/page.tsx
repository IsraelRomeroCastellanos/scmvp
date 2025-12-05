'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { FiUsers, FiDatabase, FiFileText, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import Link from 'next/link'; // ¡Importación faltante!

export default function Dashboard() {
  const [stats, setStats] = useState({
    usuarios: 0,
    empresas: 0,
    clientes: 0,
    alertas: 0
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
        alertas: 3
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
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-600 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Cargando dashboard...</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-lg text-gray-600">Panel de control y estadísticas del sistema</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiUsers className="text-blue-600" size={24} />
              </div>
              <span className="text-2xl font-bold text-blue-600">{stats.usuarios}</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Usuarios</h3>
            <p className="text-sm text-gray-500 mt-1">Total de usuarios activos</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FiDatabase className="text-green-600" size={24} />
              </div>
              <span className="text-2xl font-bold text-green-600">{stats.empresas}</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Empresas</h3>
            <p className="text-sm text-gray-500 mt-1">Empresas registradas</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FiFileText className="text-purple-600" size={24} />
              </div>
              <span className="text-2xl font-bold text-purple-600">{stats.clientes}</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Clientes</h3>
            <p className="text-sm text-gray-500 mt-1">Clientes registrados</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <FiAlertCircle className="text-red-600" size={24} />
              </div>
              <span className="text-2xl font-bold text-red-600">{stats.alertas}</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Alertas</h3>
            <p className="text-sm text-gray-500 mt-1">Alertas pendientes</p>
          </div>
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Actividad Reciente</h2>
              <Link href="#" className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                Ver todo
              </Link>
            </div>
            
            <div className="space-y-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-start space-x-4 py-3 border-b border-gray-100 last:border-b-0">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FiCheckCircle className="text-blue-600" size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">Nuevo cliente registrado</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {item === 1 ? 'Joyeros de México - persona_moral' : 
                       item === 2 ? 'Juan Pérez - persona_fisica' : 
                       item === 3 ? 'María López - persona_fisica' : 
                       'Carlos Rodríguez - persona_moral'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {item === 1 ? 'Hace 2 horas' : 
                     item === 2 ? 'Hace 5 horas' : 
                     item === 3 ? 'Ayer' : 'Hace 2 días'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Estado del Sistema</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Base de Datos</span>
                  <span className="text-sm font-medium text-green-600">100%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">API Backend</span>
                  <span className="text-sm font-medium text-green-600">100%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Autenticación</span>
                  <span className="text-sm font-medium text-green-600">100%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Carga Masiva</span>
                  <span className="text-sm font-medium text-green-600">100%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Todos los servicios están operando normalmente</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}