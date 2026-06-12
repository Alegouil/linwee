import { useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, ClipboardList, FolderOpen, LayoutDashboard, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Settings2, Sparkles, Sun, Users } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { UserAvatar } from './UserAvatar';

const links = [
  { to: '/home', label: 'Accueil', icon: Sparkles },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/deals', label: 'Affaires', icon: ClipboardList },
  { to: '/projects', label: 'Projets', icon: FolderOpen },
  { to: '/tasks', label: 'Tâches', icon: CalendarDays },
];

export function Sidebar() {
  const { isDark, toggleTheme } = useTheme();
  const { currentUser, notifications } = useData();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const closeMenuTimeoutRef = useRef<number | null>(null);
  const unreadCount = notifications.filter((notification) => notification.userId === currentUser?.id && !notification.read).length;
  const canAccessSettings = currentUser?.role === 'admin';

  const openDesktopMenu = () => {
    if (closeMenuTimeoutRef.current) {
      window.clearTimeout(closeMenuTimeoutRef.current);
      closeMenuTimeoutRef.current = null;
    }
    setDesktopMenuOpen(true);
  };

  const closeDesktopMenu = () => {
    if (closeMenuTimeoutRef.current) {
      window.clearTimeout(closeMenuTimeoutRef.current);
    }
    closeMenuTimeoutRef.current = window.setTimeout(() => {
      setDesktopMenuOpen(false);
    }, 180);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <>
      <aside className={`hidden h-screen border-r md:flex md:flex-col ${collapsed ? 'w-20' : 'w-64'} ${isDark ? 'border-slate-700 bg-slate-900' : 'border-black/10 bg-white'}`}>
        <div className={`flex items-center justify-between border-b p-4 ${isDark ? 'border-slate-700' : 'border-black/10'}`}>
          {!collapsed && <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-surface'}`}>Linwe</p>}
          <button onClick={() => setCollapsed((value) => !value)} className={`rounded-lg p-2 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${isActive ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600' : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className={`space-y-2 border-t p-4 ${isDark ? 'border-slate-700' : 'border-black/10'}`}>
          <NavLink to="/dashboard" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${isActive ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600' : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}>
            <LayoutDashboard className="h-5 w-5" />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>

          <div
            className="relative"
            onMouseEnter={openDesktopMenu}
            onMouseLeave={closeDesktopMenu}
          >
            <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
              <div className="relative">
                <UserAvatar user={currentUser} />
                {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500 dark:border-slate-900" />}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${isDark ? 'text-white' : 'text-surface'}`}>{currentUser?.firstName} {currentUser?.lastName}</p>
                  <p className={`truncate text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{currentUser?.jobTitle || currentUser?.email}</p>
                </div>
              )}
            </button>

            {desktopMenuOpen && (
              <div
                onMouseEnter={openDesktopMenu}
                onMouseLeave={closeDesktopMenu}
                className={`absolute bottom-full left-0 z-50 w-72 rounded-2xl border p-2 shadow-2xl ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}
              >
                <button onClick={() => { setDesktopMenuOpen(false); navigate('/notifications'); }} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <span className="inline-flex items-center gap-3"><Bell className="h-4 w-4" />Notifications</span>
                  {unreadCount > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">{unreadCount}</span>}
                </button>
                {canAccessSettings && (
                  <button onClick={() => { setDesktopMenuOpen(false); navigate('/settings'); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                    <Settings2 className="h-4 w-4" />
                    Réglages
                  </button>
                )}
                <button onClick={() => { setDesktopMenuOpen(false); toggleTheme(); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {isDark ? 'Mode clair' : 'Mode sombre'}
                </button>
                <button onClick={() => { setDesktopMenuOpen(false); void handleLogout(); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${isDark ? 'text-red-300 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}>
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <nav className={`fixed inset-x-0 bottom-0 z-40 border-t px-2 py-2 md:hidden ${isDark ? 'border-slate-700 bg-slate-900/95' : 'border-black/10 bg-white/95'} backdrop-blur`}>
        <div className="grid grid-cols-5 gap-1">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-medium transition ${isActive ? isDark ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600' : isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <Icon className="mb-1 h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
