import { Bell, LayoutDashboard, LogOut, Moon, Search, Settings2, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { GlobalSearch } from './GlobalSearch';
import { Modal } from './Modal';
import { UserAvatar } from './UserAvatar';

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  const { isDark, toggleTheme } = useTheme();
  const { currentUser, notifications } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const unreadCount = notifications.filter((notification) => notification.userId === currentUser?.id && !notification.read).length;
  const canAccessSettings = currentUser?.role === 'admin';
  const hasMobileCreateButton =
    location.pathname.startsWith('/contacts') ||
    location.pathname.startsWith('/deals') ||
    location.pathname.startsWith('/projects') ||
    location.pathname.startsWith('/tasks') ||
    location.pathname.startsWith('/settings');

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <>
      <div className="flex items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          {title ? <h1 className={`text-2xl font-semibold md:text-3xl ${isDark ? 'text-white' : 'text-surface'}`}>{title}</h1> : <div className="h-9 md:h-11" />}
        </div>

        <div className="hidden w-full items-center justify-end md:flex md:max-w-sm md:flex-none">
          <GlobalSearch />
        </div>

        <div ref={menuRef} className="relative flex-shrink-0 md:hidden">
          <button
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="relative"
            aria-label="Ouvrir le menu utilisateur"
          >
            <UserAvatar user={currentUser} />
            {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500" />}
          </button>

          {mobileMenuOpen && (
            <div className={`absolute right-0 top-[calc(100%+0.5rem)] z-40 w-64 rounded-2xl border p-2 shadow-2xl ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
              <button onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </button>
              <button onClick={() => { navigate('/notifications'); setMobileMenuOpen(false); }} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                <span className="inline-flex items-center gap-3"><Bell className="h-4 w-4" />Notifications</span>
                {unreadCount > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">{unreadCount}</span>}
              </button>
              {canAccessSettings && (
                <button onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                  <Settings2 className="h-4 w-4" />
                  Réglages
                </button>
              )}
              <button onClick={() => { toggleTheme(); setMobileMenuOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'}`}>
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDark ? 'Mode clair' : 'Mode sombre'}
              </button>
              <button onClick={async () => { await supabase.auth.signOut(); setMobileMenuOpen(false); navigate('/auth'); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${isDark ? 'text-red-300 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}>
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={() => setMobileSearchOpen(true)}
        className={`fixed bottom-24 ${hasMobileCreateButton ? 'right-20' : 'right-4'} z-30 flex h-14 w-14 items-center justify-center rounded-full border shadow-xl md:hidden ${isDark ? 'border-slate-600 bg-slate-800 text-white' : 'border-black/10 bg-white text-slate-700'}`}
        aria-label="Ouvrir la recherche"
      >
        <Search className="h-6 w-6" />
      </button>
      <Modal
        isOpen={mobileSearchOpen}
        onClose={() => setMobileSearchOpen(false)}
        title="Recherche"
        panelClassName="max-h-[calc(100dvh-5.25rem)]"
        contentClassName="min-h-[60vh] max-h-[calc(100dvh-9rem)] md:min-h-[32rem]"
      >
        <GlobalSearch mobile />
      </Modal>
    </>
  );
}
