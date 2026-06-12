import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { useData } from './context/DataContext';
import { supabase } from './lib/supabaseClient';
import { DataProvider } from './context/DataContext';
import { useTheme } from './context/ThemeContext';
import { AuthPage } from './pages/AuthPage';
import { ContactsPage } from './pages/ContactsPage';
import { DashboardPage } from './pages/DashboardPage';
import { DealsPage } from './pages/DealsPage';
import { HomePage } from './pages/HomePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TasksPage } from './pages/TasksPage';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<boolean | null>(null);
  const location = useLocation();
  const { isReady } = useData();

  useEffect(() => {
    supabase.auth.getSession().then((result: any) => {
      setSession(Boolean(result.data.session));
    });
  }, []);

  if (session === null) {
    return <div className="min-h-screen bg-canvas p-10">Chargement...</div>;
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isReady) {
    return <div className="min-h-screen bg-canvas p-10">Chargement...</div>;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, isReady } = useData();
  if (!isReady) {
    return <div className="min-h-screen bg-canvas p-10">Chargement...</div>;
  }
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/home" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { isDark } = useTheme();
  const location = useLocation();

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/home')) return '';
    if (location.pathname.startsWith('/dashboard')) return 'Dashboard';
    if (location.pathname.startsWith('/notifications')) return 'Notifications';
    if (location.pathname.startsWith('/contacts')) return 'Contacts';
    if (location.pathname.startsWith('/deals')) return 'Affaires';
    if (location.pathname.startsWith('/projects')) return 'Projets';
    if (location.pathname.startsWith('/tasks')) return 'Tâches';
    if (location.pathname.startsWith('/settings')) return 'Réglages';
    return 'Tableau de bord';
  }, [location.pathname]);

  return (
    <DataProvider>
      <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-white' : 'bg-white text-surface'}`}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/*"
            element={
              <ProtectedLayout>
                <div className="flex min-h-screen flex-col md:h-screen md:flex-row">
                  <Sidebar />
                  <main className={`flex-1 overflow-auto ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
                    <div className={`p-4 pb-24 md:p-8 md:pb-8 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
                      <Topbar title={pageTitle} />
                      <div className="mt-6 md:mt-8">
                        <Routes>
                          <Route path="home" element={<HomePage />} />
                          <Route path="dashboard" element={<DashboardPage />} />
                          <Route path="notifications" element={<NotificationsPage />} />
                          <Route path="contacts" element={<ContactsPage />} />
                          <Route path="deals" element={<DealsPage />} />
                          <Route path="projects" element={<ProjectsPage />} />
                          <Route path="projects/:projectId" element={<ProjectsPage />} />
                          <Route path="tasks" element={<TasksPage />} />
                          <Route path="settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
                          <Route path="*" element={<Navigate to="home" replace />} />
                        </Routes>
                      </div>
                    </div>
                  </main>
                </div>
              </ProtectedLayout>
            }
          />
        </Routes>
      </div>
    </DataProvider>
  );
}
