// frontend/src/components/AuthGuard.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuth } from '@/lib/auth';

export default function AuthGuard({ 
  children, 
  requiredRole 
}: { 
  children: React.ReactNode;
  requiredRole?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const authResult = checkAuth(requiredRole);
    
    if (!authResult.authenticated) {
      router.push(authResult.redirect || '/login');
    }
  }, [router, requiredRole]);

  // Mientras verifica, puedes mostrar un loader
  return <>{children}</>;
}