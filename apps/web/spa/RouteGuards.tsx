'use client';

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/spa/AuthProvider';

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Splash />;
  if (!session) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }
  return children;
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return <Splash />;
  if (session) return <Navigate replace to="/dashboard" />;
  return children;
}
