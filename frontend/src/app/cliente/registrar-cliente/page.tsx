'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type ApiUser = {
  id: number;
  email: string;
  nombre_completo?: string;
  rol: 'admin' | 'consultor' | 'cliente';
  empresa_id: number | null;
};

export default function RegistrarClientePage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);

  const [empresaId, setEmpresaId] = useState<string>(''); // requerido si eres admin/consultor
  const [nombreEntidad, setNombreEntidad] = useState('');
  const [tipoCliente, setTipoCliente] = useState<'persona_fisica' | 'persona_moral'>('persona_fisica');
  const [nacionalidad, setNacionalidad] = useState('');
  const [alias, setAlias] = useState('');
  const [domicilioMexico, setDomicilioMexico] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL, []);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      router.push('/login');
      return;
    }
    setToken(t);

    // Si guardas user en localStorage en tu app, intentamos leerlo.
    // Si no existe, no pasa nada: el backend validará por token.
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser));
      } catch {
        // ignore
      }
    }
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!apiBase) {
      setError('NEXT_PUBLIC_API_BASE_URL no está definido en Vercel.');
      return;
    }
    if (!token) {
      setError('No hay token. Inicia sesión nuevamente.');
      router.push('/login');
      return;
    }
    if (!nombreEntidad.trim()) {
      setError('nombre_entidad es obligatorio');
      return;
    }

    // Backend: para admin/consultor pediremos empresa_id en body.
    // Para rol cliente, el backend tomará empresa_id desde el token.
    const body: any = {
      nombre_entidad: nombreEntidad.trim(),
      tipo_cliente: tipoCliente,
      nacionalidad: nacionalidad.trim() ? nacionalidad.trim() : null,
      alias: alias.trim() ? alias.trim() : null,
      domicilio_mexico: domicilioMexico.trim() ? domicilioMexico.trim() : null,
      datos_completos: {} // opcional según tu tabla (NULL permitido); mandamos {} por estabilidad
    };

    // Si el usuario no es cliente (o si no tenemos user), permitimos enviar empresa_id manual.
    // Si eres admin/consultor, llena empresaId.
    if (empresaId.trim()) body.empresa_id = Number(empresaId);

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/cliente/registrar-cliente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.error || `Error HTTP ${res.status}`;
        throw new Error(msg);
      }

      // Si todo OK, mandamos a listado
      router.push('/cliente/clientes');
    } catch (err: any) {
      setError(err?.message || 'Error al registrar cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Registrar cliente</h1>

      <div className="mb-4 text-sm text-gray-600">
        {user?.rol ? (
          <span>
            Rol detectado: <b>{user.rol}</b>
            {user.rol !== 'cliente' ? ' (debes indicar empresa_id)' : ' (empresa_id se toma del token)'}
          </span>
        ) : (
          <span>Nota: si eres admin/consultor, indica <b>empresa_id</b>.</span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">empresa_id (solo admin/consultor)</label>
          <input
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="Ej: 1"
            inputMode="numeric"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">nombre_entidad *</label>
          <input
            value={nombreEntidad}
            onChange={(e) => setNombreEntidad(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="Ej: Juan Pérez / Empresa XYZ"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">tipo_cliente *</label>
          <select
            value={tipoCliente}
            onChange={(e) => setTipoCliente(e.target.value as any)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="persona_fisica">persona_fisica</option>
            <option value="persona_moral">persona_moral</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">nacionalidad</label>
          <input
            value={nacionalidad}
            onChange={(e) => setNacionalidad(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="Ej: Mexicana"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">alias</label>
          <input
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="Opcional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">domicilio_mexico</label>
          <textarea
            value={domicilioMexico}
            onChange={(e) => setDomicilioMexico(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            rows={3}
            placeholder="Opcional"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? 'Guardando...' : 'Registrar'}
        </button>
      </form>
    </div>
  );
}
