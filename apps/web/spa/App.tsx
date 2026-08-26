'use client';

import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/spa/AuthProvider';
import { GuestRoute, ProtectedRoute } from '@/spa/RouteGuards';
import { LandingPage } from '@/spa/pages/LandingPage';
import { LoginPage } from '@/spa/pages/LoginPage';
import { RegisterPage } from '@/spa/pages/RegisterPage';
import { ForgotPasswordPage } from '@/spa/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/spa/pages/ResetPasswordPage';
import { DashboardPage } from '@/spa/pages/DashboardPage';
import { ReportsPage } from '@/spa/pages/ReportsPage';
import { ManageFinancesPage } from '@/spa/pages/ManageFinancesPage';
import { SettingsPage } from '@/spa/pages/SettingsPage';
import { GoalsPage } from '@/spa/pages/GoalsPage';
import { AssistantPage } from '@/spa/pages/AssistantPage';
import { ToastProvider } from '@/components/Toast';
import { Providers } from '@/components/Providers';

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export function SpaApp() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return <Splash />;

  return (
    <Providers>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route element={<LandingPage />} path="/" />
              <Route
                element={
                  <GuestRoute>
                    <LoginPage />
                  </GuestRoute>
                }
                path="/login"
              />
              <Route
                element={
                  <GuestRoute>
                    <RegisterPage />
                  </GuestRoute>
                }
                path="/register"
              />
              <Route
                element={
                  <GuestRoute>
                    <ForgotPasswordPage />
                  </GuestRoute>
                }
                path="/forgot-password"
              />
              <Route element={<ResetPasswordPage />} path="/reset-password" />
              <Route
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
                path="/dashboard"
              />
              <Route
                element={
                  <ProtectedRoute>
                    <ReportsPage />
                  </ProtectedRoute>
                }
                path="/reports"
              />
              <Route
                element={
                  <ProtectedRoute>
                    <ManageFinancesPage />
                  </ProtectedRoute>
                }
                path="/manage"
              />
              <Route
                element={
                  <ProtectedRoute>
                    <GoalsPage />
                  </ProtectedRoute>
                }
                path="/goals"
              />
              <Route
                element={
                  <ProtectedRoute>
                    <AssistantPage />
                  </ProtectedRoute>
                }
                path="/assistant"
              />
              <Route
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
                path="/settings"
              />
              <Route element={<Navigate replace to="/" />} path="*" />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </Providers>
  );
}
