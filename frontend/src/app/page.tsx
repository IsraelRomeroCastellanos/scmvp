// frontend/src/app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-xl mx-auto text-center space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
          Bienvenido al Sistema de Cumplimiento
        </h1>

        <p className="text-slate-600">
          Portal para la gestión de usuarios, empresas y clientes, con herramientas de carga masiva
          y paneles de control para facilitar el cumplimiento normativo.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex justify-center px-5 py-2.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Ir al inicio de sesión
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex justify-center px-5 py-2.5 rounded-md border border-slate-300 text-slate-700 bg-white/70 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          >
            Ir al dashboard (si ya iniciaste sesión)
          </Link>
        </div>
      </div>
    </div>
  );
}
