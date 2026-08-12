
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './components/Layout';
import Auth from './pages/Auth';
import OAuthCallback from './pages/OAuthCallback';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Scheduling from './pages/Scheduling';
import Expenses from './pages/Expenses';
import AIAssistant from './pages/AIAssistant';
import Reports from './pages/Reports';
import Billing from './pages/Billing';
import Team from './pages/Team';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/oauth-callback" element={<OAuthCallback />} />

              {/* Secure App layout scope routes */}
              <Route
                path="/"
                element={
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                }
              />
              <Route
                path="/inventory"
                element={
                  <AppLayout>
                    <Inventory />
                  </AppLayout>
                }
              />
              <Route
                path="/scheduling"
                element={
                  <AppLayout>
                    <Scheduling />
                  </AppLayout>
                }
              />
              <Route
                path="/expenses"
                element={
                  <AppLayout>
                    <Expenses />
                  </AppLayout>
                }
              />
              <Route
                path="/ai-assistant"
                element={
                  <AppLayout>
                    <AIAssistant />
                  </AppLayout>
                }
              />
              <Route
                path="/reports"
                element={
                  <AppLayout>
                    <Reports />
                  </AppLayout>
                }
              />

              <Route
                path="/team"
                element={
                  <AppLayout>
                    <Team />
                  </AppLayout>
                }
              />
              <Route
                path="/billing"
                element={
                  <AppLayout>
                    <Billing />
                  </AppLayout>
                }
              />

              {/* Redirect any other address match to main dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
