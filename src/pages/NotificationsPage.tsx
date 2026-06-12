import { Bell, CheckCheck, MessageSquareMore, TriangleAlert, UserPlus2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '../components/UserAvatar';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import type { AppNotification } from '../types';

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function notificationIcon(type: AppNotification['type']) {
  if (type === 'task_comment') return MessageSquareMore;
  if (type === 'task_overdue') return TriangleAlert;
  return UserPlus2;
}

export function NotificationsPage() {
  const { currentUser, notifications, users, setNotificationReadState } = useData();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'unread' | 'all' | 'read'>('unread');

  const visibleNotifications = useMemo(() => {
    const mine = notifications
      .filter((notification) => notification.userId === currentUser?.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filter === 'unread') return mine.filter((notification) => !notification.read);
    if (filter === 'read') return mine.filter((notification) => notification.read);
    return mine;
  }, [currentUser?.id, filter, notifications]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('unread')} className={`rounded-full px-4 py-2 text-sm font-medium ${filter === 'unread' ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>Non lues</button>
          <button onClick={() => setFilter('all')} className={`rounded-full px-4 py-2 text-sm font-medium ${filter === 'all' ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>Toutes</button>
          <button onClick={() => setFilter('read')} className={`rounded-full px-4 py-2 text-sm font-medium ${filter === 'read' ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>Lues</button>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
          <Bell className="h-4 w-4" />
          {visibleNotifications.length} notification(s)
        </div>
      </div>

      <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
        <div className="space-y-3">
          {visibleNotifications.length === 0 && (
            <div className={`rounded-xl p-4 text-sm ${isDark ? 'bg-slate-700/40 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
              Aucune notification pour ce filtre.
            </div>
          )}

          {visibleNotifications.map((notification) => {
            const Icon = notificationIcon(notification.type);
            const relatedUser = notification.type === 'task_assigned' ? users.find((user) => user.id === notification.userId) : currentUser;
            return (
              <div key={notification.id} className={`rounded-2xl border p-4 ${notification.read ? isDark ? 'border-slate-700 bg-slate-900/40' : 'border-black/10 bg-slate-50' : isDark ? 'border-blue-500/40 bg-blue-500/10' : 'border-blue-200 bg-blue-50/70'}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-3">
                    <div className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full ${isDark ? 'bg-slate-700 text-slate-100' : 'bg-white text-slate-700'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{notification.title}</p>
                        {!notification.read && <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                      </div>
                      <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{notification.body}</p>
                      <div className={`flex flex-wrap items-center gap-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>{formatNotificationDate(notification.createdAt)}</span>
                        {relatedUser && <div className="inline-flex items-center gap-2"><UserAvatar user={relatedUser} size="sm" /><span>{relatedUser.name}</span></div>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {notification.taskId && (
                      <button
                        onClick={() => navigate(`/tasks?taskId=${notification.taskId}`)}
                        className={`rounded-xl px-3 py-2 text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-100' : 'bg-white text-slate-700'}`}
                      >
                        Ouvrir
                      </button>
                    )}
                    <button
                      onClick={() => setNotificationReadState(notification.id, !notification.read)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${notification.read ? isDark ? 'bg-slate-700 text-slate-100' : 'bg-white text-slate-700' : 'bg-blue-600 text-white'}`}
                    >
                      <CheckCheck className="h-4 w-4" />
                      {notification.read ? 'Repasser en non lue' : 'Marquer comme lue'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
