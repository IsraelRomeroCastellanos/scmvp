'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || '';
}
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export default function ClienteDetallePage() {
  const apiBase = useMemo(() => getApiBase(), []);
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cliente, setCliente] = useState<any>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const id = params?.id;
    if (!id) return;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${apiBase}/api/cliente/clientes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(data?.error || `Error HTTP ${res.status}`);
          setCliente(null);
          return;
        }

        setCliente(data?.cliente);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message || 'Error de red');
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBase, params, router]);

  if (loading) return <div className="p-6 text-sm">Cargando cliente...</div>;
  if (err) {
    return (
      <div className="p-6 space-y-3">
        <div className="rounded border p-3 text-sm">{err}</div>
        <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Detalle de Cliente</h1>
        <button className="rounded border px-4 py-2 text-sm" onClick={() => router.push('/cliente/clientes')}>
          Volver
        </button>
      </div>

      <div className="rounded border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div><span className="opacity-70">ID:</span> {cliente?.id}</div>
          <div><span className="opacity-70">Empresa ID:</span> {cliente?.empresa_id}</div>
          <div><span className="opacity-70">Estado:</span> {cliente?.estado}</div>
          <div className="md:col-span-2"><span className="opacity-70">Nombre entidad:</span> {cliente?.nombre_entidad}</div>
          <div><span className="opacity-70">Tipo:</span> {cliente?.tipo_cliente}</div>
          <div><span className="opacity-70">Nacionalidad:</span> {cliente?.nacionalidad ?? '-'}</div>
          <div><span className="opacity-70">Creado:</span> {cliente?.creado_en ?? '-'}</div>
          <div><span className="opacity-70">Actualizado:</span> {cliente?.actualizado_en ?? '-'}</div>
        </div>
      </div>

      <div className="rounded border p-4">
        <h2 className="text-lg font-medium mb-3">Expediente (datos_completos)</h2>
        <pre className="text-xs overflow-auto whitespace-pre-wrap">
          {JSON.stringify(cliente?.datos_completos ?? {}, null, 2)}
        </pre>
      </div>
    </div>
  );
}
