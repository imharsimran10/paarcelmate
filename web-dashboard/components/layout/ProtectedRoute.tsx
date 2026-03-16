'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);

  // Wait for Zustand store to rehydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only check authentication after store has hydrated
    if (isHydrated && !isAuthenticated && !accessToken) {
      // Double check localStorage as backup
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

      if (!storedToken) {
        router.push('/login');
      }
    }
  }, [isHydrated, isAuthenticated, accessToken, router]);

  // Show loading spinner while store is hydrating or checking auth
  if (!isHydrated || (isHydrated && !isAuthenticated && !accessToken)) {
    // Check localStorage one more time before showing spinner
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    if (!storedToken && isHydrated) {
      // No token found, redirect will happen in useEffect
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    // Store is still hydrating, show loading
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
