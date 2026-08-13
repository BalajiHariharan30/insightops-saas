import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme, Spin } from 'antd';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/Layout';

// ── Route-level code splitting (React.lazy) ───────────────────────────────
const Auth         = lazy(() => import('./pages/Auth'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Inventory    = lazy(() => import('./pages/Inventory'));
const Scheduling   = lazy(() => import('./pages/Scheduling'));
const Expenses     = lazy(() => import('./pages/Expenses'));
const AIAssistant  = lazy(() => import('./pages/AIAssistant'));
const Reports      = lazy(() => import('./pages/Reports'));
const Billing      = lazy(() => import('./pages/Billing'));
const Team         = lazy(() => import('./pages/Team'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ── Full-page spinner shown during initial auth check ─────────────────────
const AuthCheckSpinner: React.FC = () => (
  <div
    style={{
      display: 'flex',
      height: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#05070d',
    }}
  >
    <Spin size="large" tip="Loading InsightOps..." />
  </div>
);

// ── Protected route: blocks render until auth check resolves ─────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthChecked, isAuthenticated } = useAuth();

  // 1. Auth check still in-flight → show full-page spinner (no flash)
  if (!isAuthChecked) return <AuthCheckSpinner />;

  // 2. Auth resolved but no valid session → redirect to login
  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  // 3. Authenticated → render protected content
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            // ── Brand ─────────────────────────
            colorPrimary:        '#00ff88',  // Neon cyber green
            colorLink:           '#00ff88',
            colorLinkHover:      '#06b6d4',

            // ── Backgrounds ───────────────────
            colorBgContainer:    '#090e17',  // Card / input surface
            colorBgElevated:     '#0d1422',  // Dropdowns, popovers
            colorBgLayout:       '#05070d',  // Page canvas
            colorBgSpotlight:    '#111827',

            // ── Text ──────────────────────────
            colorText:           '#f0fdf4',
            colorTextSecondary:  '#94a3b8',
            colorTextTertiary:   '#475569',
            colorTextPlaceholder:'#334155',

            // ── Borders ───────────────────────
            colorBorder:         'rgba(0, 255, 136, 0.12)',
            colorBorderSecondary:'rgba(255, 255, 255, 0.05)',

            // ── Success / Error ───────────────
            colorSuccess:        '#00ff88',
            colorWarning:        '#f59e0b',
            colorError:          '#ff4444',
            colorInfo:           '#06b6d4',

            // ── Typography ────────────────────
            fontFamily:          "'Inter', system-ui, sans-serif",
            fontFamilyCode:      "'JetBrains Mono', monospace",
            fontSize:            14,
            fontSizeLG:          15,

            // ── Shape ─────────────────────────
            borderRadius:        8,
            borderRadiusLG:      12,
            borderRadiusSM:      6,

            // ── Shadows ───────────────────────
            boxShadow:           '0 0 20px rgba(0, 255, 136, 0.08)',
            boxShadowSecondary:  '0 0 40px rgba(0, 255, 136, 0.05)',

            // ── Motion ────────────────────────
            motionDurationMid:   '0.2s',
            motionEaseInOut:     'cubic-bezier(0.16, 1, 0.3, 1)',
          },
        }}
      >
        <AuthProvider>
          <SocketProvider>
            <BrowserRouter>
              {/* Suspense fallback shown while lazy page bundles load */}
              <Suspense fallback={<AuthCheckSpinner />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/auth"           element={<Auth />} />
                  <Route path="/oauth-callback" element={<OAuthCallback />} />

                  {/* Protected routes — all wrapped in ProtectedRoute */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <AppLayout><Dashboard /></AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/inventory"
                    element={
                      <ProtectedRoute>
                        <AppLayout><Inventory /></AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/scheduling"
                    element={
                      <ProtectedRoute>
                        <AppLayout><Scheduling /></AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/expenses"
                    element={
                      <ProtectedRoute>
                        <AppLayout><Expenses /></AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/ai-assistant"
                    element={
                      <ProtectedRoute>
                        <AppLayout><AIAssistant /></AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <ProtectedRoute>
                        <AppLayout><Reports /></AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/team"
                    element={
                      <ProtectedRoute>
                        <AppLayout><Team /></AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/billing"
                    element={
                      <ProtectedRoute>
                        <AppLayout><Billing /></AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </SocketProvider>
        </AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
