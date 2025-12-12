// frontend/src/components/AuthGuard.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuth, NormalizedRole } from '@/lib/auth';

export default function AuthGuard({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: NormalizedRole;
}) {
  const router = useRouter();

  useEffect(() => {
    const authResult = checkAuth(requiredRole);

    if (!authResult.authenticated) {
      router.push(authResult.redirect || '/login');
    }
  }, [router, requiredRole]);

  // Mientras verifica, renderizamos directamente.
  // Si quisieras, aquí podrías meter un spinner.
  return <>{children}</>;
}
