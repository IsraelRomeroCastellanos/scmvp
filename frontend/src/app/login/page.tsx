// frontend/src/app/login/page.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FiLock, FiMail } from 'react-icons/fi';
import { Alert, Button, Card, Input } from '@/components/ui';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://scmvp-1jhq.onrender.com';

const setCookie = (name: string, value: string, days = 7) => {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? '; Secure'
      : '';

  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || 'Error al iniciar sesión');
      }

      const data = JSON.parse(text);

      if (!data.token || !data.user) {
        throw new Error('Respuesta inválida del servidor');
      }

      const userJson = JSON.stringify(data.user);

      localStorage.setItem('token', data.token);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('user', userJson);

      setCookie('token', data.token);
      setCookie('user', userJson);

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(26rem,0.95fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-brand-black px-12 py-12 text-text-dark lg:flex lg:flex-col lg:justify-between" aria-label="Identidad Shield by Vission">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-silver to-transparent opacity-70" />

        <div className="flex flex-1 items-center justify-center">
          <Image
            src="/brand/shield-by-vission-lockup.png"
            alt="Logotipo oficial Shield by Vission"
            width={575}
            height={408}
            className="h-auto w-full max-w-[32rem] object-contain"
            priority
          />
          <span className="sr-only">Shield by Vission</span>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src="/brand/shield-by-vission-lockup.png"
              alt="Logotipo oficial Shield by Vission"
              width={575}
              height={408}
              className="h-auto w-full max-w-[15rem] object-contain"
              priority
            />
            <span className="sr-only">Shield by Vission</span>
          </div>

          <Card className="p-6 sm:p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-semibold tracking-tight text-text-primary">Iniciar sesión</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Ingresa tus credenciales para continuar.
              </p>
            </div>

            {error ? (
              <Alert variant="danger" title="No fue posible iniciar sesión" className="mb-5">
                Verifica tus credenciales e intenta nuevamente.
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-text-primary">
                  Correo electrónico
                </label>
                <div className="relative">
                  <FiMail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nombre@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-text-primary">
                  Contraseña
                </label>
                <div className="relative">
                  <FiLock aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                    Ingresando…
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </Card>

        </div>
      </section>
    </div>
  );
}
