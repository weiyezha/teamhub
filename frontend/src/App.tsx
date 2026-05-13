import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { TopBar } from './components/layout/TopBar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Announcements } from './pages/Announcements';
import { AnnouncementDetail } from './pages/AnnouncementDetail';
import { AnnouncementEditor } from './pages/AnnouncementEditor';
import { Team } from './pages/Team';
import { Admin } from './pages/Admin';
import { Settings } from './pages/Settings';
import { Tasks } from './pages/Tasks';
import { ReadingList } from './pages/ReadingList';
import { Documents } from './pages/Documents';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Forbidden } from './pages/Forbidden';
import { WelcomeModal } from './components/WelcomeModal';
import { AmbientGlowCSS } from './components/decor/AmbientGlowCSS';
import { ToastContainer } from './components/ToastContainer';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, var(--champagne) 0%, var(--champagne-light) 100%)' }}>
          <div className="w-5 h-5 border-2 rounded-full animate-spin"
            style={{ borderColor: 'rgba(12,12,16,0.3)', borderTopColor: '#fff' }} />
        </div>
        <p className="text-[13px] text-text-tertiary">Loading Studio...</p>
      </div>
    </div>
  );
}

function Watermark({ name, opacity = 0.08 }: { name: string; opacity?: number }) {
  if (!name) return null;
  const items = Array.from({ length: 60 }, (_, i) => i);
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden" aria-hidden="true">
      {items.map((i) => (
        <span
          key={i}
          className="absolute text-sm font-bold select-none whitespace-nowrap"
          style={{
            left: `${(i % 10) * 12 + 2}%`,
            top: `${Math.floor(i / 10) * 18 + 5}%`,
            color: `rgba(128, 128, 128, ${opacity})`,
            transform: `rotate(-25deg)`,
            textShadow: `0 0 1px rgba(128,128,128,${opacity * 0.5})`,
          }}
        >
          {name}
        </span>
      ))}
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.08);

  useEffect(() => {
    import('./api').then(({ api }) => {
      api.get('/api/settings').then((res: any) => {
        if (res.data && typeof res.data.watermark_opacity === 'number') {
          setWatermarkOpacity(res.data.watermark_opacity);
        }
      }).catch(() => {});
    });
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex relative">
      <AmbientGlowCSS />
      <div className="noise-overlay absolute inset-0 pointer-events-none z-[2]" />
      <WelcomeModal />
      <Watermark name={user?.name || ''} opacity={watermarkOpacity} />
      <div className="hidden md:block relative z-10">
        <Sidebar user={user} />
      </div>
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-60 h-full bg-bg-primary border-r border-border" onClick={(e) => e.stopPropagation()}>
            <Sidebar user={user} mobile onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} theme={theme} onToggleTheme={toggle} onLogout={logout} onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav user={user} />
    </div>
  );
}

function AuthGuard({ children, roles, module, action }: {
  children: React.ReactNode;
  roles?: string[];
  module?: string;
  action?: string;
}) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/forbidden" replace />;
  if (module && action) {
    const allowed = user.allowed_modules?.[module];
    if (!allowed || !allowed.includes(action)) return <Navigate to="/forbidden" replace />;
  }
  return <Layout>{children}</Layout>;
}

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={user ? (
        <Navigate to={(user.allowed_modules?.dashboard?.includes('view') ? '/' : '/announcements')} replace />
      ) : <Login />} />
      <Route path="/" element={<AuthGuard module="dashboard" action="view"><Dashboard /></AuthGuard>} />
      <Route path="/announcements" element={<AuthGuard module="announcements" action="view"><Announcements /></AuthGuard>} />
      <Route path="/announcements/:id" element={<AuthGuard module="announcements" action="view"><AnnouncementDetail /></AuthGuard>} />
      <Route path="/announcements/new" element={<AuthGuard module="announcements" action="publish"><AnnouncementEditor /></AuthGuard>} />
      <Route path="/announcements/:id/edit" element={<AuthGuard module="announcements" action="publish"><AnnouncementEditor /></AuthGuard>} />
      <Route path="/team" element={<AuthGuard module="team" action="view"><Team /></AuthGuard>} />
      <Route path="/tasks" element={<AuthGuard module="tasks" action="view"><Tasks /></AuthGuard>} />
      <Route path="/reading-list" element={<AuthGuard module="announcements" action="view"><ReadingList /></AuthGuard>} />
      <Route path="/documents" element={<AuthGuard module="documents" action="view"><Documents /></AuthGuard>} />
      <Route path="/admin" element={<AuthGuard roles={['admin','manager']}><ErrorBoundary><Admin /></ErrorBoundary></AuthGuard>} />
      <Route path="/settings" element={<AuthGuard module="settings" action="view"><Settings /></AuthGuard>} />
      <Route path="/forbidden" element={<Forbidden />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
      <ToastContainer />
    </BrowserRouter>
  );
}
