import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface NotificationItem { id: number; type: string; title: string; body: string; link: string; is_read: boolean; created_at: string; }

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = () => {
    api.get('/api/notifications?unread_only=false&limit=50').then(r => setNotifications(r.data || [])).catch(() => {});
  };

  const handleMarkRead = async (id: number, link: string) => {
    await api.post(`/api/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    if (link) navigate(link);
    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    await api.post('/api/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const typeLabel = (t: string) => t === 'new_announcement' ? '新公告' : t === 'comment_reply' ? '新评论' : '系统';

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 text-text-secondary hover:text-text-primary transition-colors">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-bg-primary border border-border rounded-card shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h4 className="text-sm font-semibold text-text-primary">通知</h4>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-accent hover:underline">全部已读</button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-text-tertiary text-center py-6">暂无通知</p>
            ) : (
              notifications.slice(0, 20).map(n => (
                <button key={n.id} onClick={() => handleMarkRead(n.id, n.link)}
                  className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-bg-secondary transition-colors ${!n.is_read ? 'bg-bg-tertiary' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded-tag ${n.type === 'new_announcement' ? 'bg-accent-bg text-accent' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {typeLabel(n.type)}
                    </span>
                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                  </div>
                  <p className="text-sm text-text-primary mt-1 font-medium line-clamp-1">{n.title}</p>
                  {n.body && <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">{n.body}</p>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
