'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-toastify';
import { FiUploadCloud, FiDownload } from 'react-icons/fi';

// Definir el tipo para la respuesta de carga masiva
interface CargaMasivaResponse {
  success: boolean;
  count?: number;
  message?: string;
}

export default function CargaMasiva() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [mensaje, setMensaje] = useState<string>('');
  const router = useRouter();
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      const user = JSON.parse(storedUser);
      // Verificar que el usuario sea cliente o administrador
      if (user.rol === 'cliente' || user.rol === 'administrador') {
        setToken(storedToken);
      } else {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setArchivo(file);
      setError('');
      setMensaje('');
      
      // Validar tipo de archivo
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Por favor selecciona un archivo CSV válido');
        setArchivo(null);
        return;
      }
      
      // Leer y mostrar vista previa
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const lines = content.split('\n').filter(line => line.trim() !== '');
          
          if (lines.length < 2) {
            setError('El archivo está vacío o no tiene datos válidos');
            return;
          }
          
          // Obtener encabezados
          const headers = lines[0].split(',').map(h => h.trim());
          
          // Validar encabezados requeridos
          const requiredHeaders = ['nombre_entidad', 'tipo_cliente', 'actividad_economica'];
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
          
          if (missingHeaders.length > 0) {
            setError(`Faltan las siguientes columnas requeridas: ${missingHeaders.join(', ')}`);
            return;
          }
          
          // Procesar datos para vista previa (máximo 5 filas)
          const previewData = lines.slice(1, 6).map(line => {
            const values = line.split(',').map(v => v.trim());
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            return row;
          });
          
          setPreview(previewData);
        } catch (err) {
          setError('Error al procesar el archivo: formato inválido');
          console.error(err);
        }
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const template = `nombre_entidad,tipo_cliente,actividad_economica,estado_bien,alias
Joyeros de México,persona_moral,venta joyería,activo,joyerosmex
Juan Pérez,persona_fisica,servicios legales,activo,juanp
María López,persona_fisica,consultoría fiscal,activo,marial`;
      
      const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'plantilla_clientes.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Plantilla descargada correctamente');
    } catch (err) {
      console.error('Error al descargar plantilla:', err);
      toast.error('Error al descargar plantilla');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo) {
      setError('Por favor selecciona un archivo CSV');
      return;
    }
    
    if (preview.length === 0) {
      setError('El archivo no contiene datos válidos para procesar');
      return;
    }
    
    setLoading(true);
    setError('');
    setMensaje('');
    
    try {
      // Leer el contenido del archivo
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const csvContent = event.target?.result as string;
          
          // Enviar al backend con tipado explícito
          const response = await api.post<CargaMasivaResponse>('/api/cliente/carga-masiva', {
            csvContent
          });
          
          const data = response.data;

          if (data.success) {
            const count = data.count ?? 0;
            setMensaje(`✅ ${count} clientes procesados exitosamente`);
            toast.success(`¡${count} clientes registrados correctamente!`);
            setArchivo(null);
            setPreview([]);
          } else {
            throw new Error(data.message || 'Error al procesar archivo');
          }
        } catch (err: any) {
          console.error('Error al procesar archivo:', err);
          setError(err.message || 'Error al procesar el archivo');
          toast.error(err.message || 'Error al procesar el archivo');
        } finally {
          setLoading(false);
        }
      };
      
      reader.readAsText(archivo, 'utf-8');
    } catch (err: any) {
      console.error('Error en submit:', err);
      setError(err.message || 'Error al subir el archivo');
      toast.error(err.message || 'Error al subir el archivo');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Carga Masiva de Clientes</h1>
            <p className="mt-1 text-sm text-gray-500">
              Sube un archivo CSV con los clientes que deseas registrar
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Descargar Plantilla</h2>
                <p className="text-sm text-gray-500">
                  Usa esta plantilla para formatear tus datos correctamente
                </p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="mt-4 md:mt-0 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <FiDownload className="mr-2" /> Descargar Plantilla
              </button>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="mb-4">
                <h3 className="text-md font-medium text-gray-900 mb-2">Columnas Requeridas:</h3>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  <li><span className="font-medium">nombre_entidad</span> - Nombre completo del cliente o empresa</li>
                  <li><span className="font-medium">tipo_cliente</span> - persona_fisica o persona_moral</li>
                  <li><span className="font-medium">actividad_economica</span> - Descripción breve de su actividad</li>
                </ul>
              </div>
              <div className="mb-4">
                <h3 className="text-md font-medium text-gray-900 mb-2">Columnas Opcionales:</h3>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  <li><span className="font-medium">estado_bien</span> - activo o inactivo (por defecto: activo)</li>
                  <li><span className="font-medium">alias</span> - Nombre corto para identificar al cliente</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 mb-1">
                  Seleccionar Archivo CSV
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <FiUploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="csvFile"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Subir un archivo</span>
                        <input
                          id="csvFile"
                          name="csvFile"
                          type="file"
                          accept=".csv"
                          className="sr-only"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">o arrastrar y soltar</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      CSV máximo de 10MB
                    </p>
                    {archivo && (
                      <p className="text-sm text-green-600 mt-2">
                        ✅ Archivo seleccionado: {archivo.name}
                      </p>
                    )}
                  </div>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>

              {preview.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Vista Previa</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(preview[0]).map((key) => (
                            <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {preview.map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value, idx) => (
                              <td key={idx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {value != null 
                                  ? (typeof value === 'object' 
                                    ? JSON.stringify(value) 
                                    : value.toString()) 
                                  : 'N/A'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.length >= 5 && (
                    <p className="mt-2 text-sm text-gray-500">
                      Mostrando las primeras 5 filas del archivo...
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !archivo || preview.length === 0}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </span>
                  ) : 'Procesar Archivo'}
                </button>
              </div>
            </form>

            {mensaje && (
              <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md">
                {mensaje}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
