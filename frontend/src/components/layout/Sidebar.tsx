import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Megaphone, Users, Settings, Shield, Plus, ClipboardList, BookOpen, Music } from 'lucide-react';
import api from '../../lib/api';
import type { User } from '../../hooks/useAuth';

const allNavItems = [
  { path: '/', label: '看板', icon: LayoutDashboard, permission: 'dashboard.view' as const },
  { path: '/announcements', label: '公告中心', icon: Megaphone, permission: 'announcements.view' as const },
  { path: '/tasks', label: '我的任务', icon: ClipboardList, permission: 'tasks.view' as const },
  { path: '/reading-list', label: '我的待阅', icon: BookOpen, permission: 'announcements.view' as const },
  { path: '/team', label: '团队', icon: Users, permission: 'team.view' as const },
  { path: '/settings', label: '设置', icon: Settings, permission: 'settings.view' as const },
  { path: '/admin', label: '管理后台', icon: Shield, adminOnly: true },
];

export function Sidebar({ user, mobile, onClose }: { user: User | null; mobile?: boolean; onClose?: () => void }) {
  const [appName, setAppName] = useState('TeamHub');
  const [appSubtitle, setAppSubtitle] = useState('Studio');

  useEffect(() => {
    api.get('/api/settings').then((r: any) => {
      if (r.data.app_name) setAppName(r.data.app_name);
      if (r.data.app_subtitle) setAppSubtitle(r.data.app_subtitle);
    }).catch(() => {});
  }, []);

  return (
    <aside
      className={`w-[260px] bg-bg-primary border-r border-border flex flex-col shadow-artistic ${mobile ? 'h-full' : 'h-screen sticky top-0'}`}
      style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
    >
      {/* Logo */}
      <div className="px-6 pt-7 pb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--champagne) 0%, var(--champagne-light) 100%)' }}
          >
            <Music className="w-5 h-5" strokeWidth={2} style={{ color: 'var(--text-inverse)' }} />
          </div>
          <div>
            <span className="font-display font-semibold text-lg tracking-tight text-text-primary">{appName}</span>
            <p className="text-[10px] uppercase tracking-[0.15em] text-text-tertiary">{appSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Publish button */}
      {(user?.allowed_modules?.announcements?.includes('publish')) && (
        <div className="px-3 mb-4">
          <NavLink
            to="/announcements/new"
            onClick={onClose}
            className="flex items-center justify-center gap-2 h-11 rounded-xl text-[14px] font-semibold tracking-wide transition-all duration-300 hover:brightness-110 hover:-translate-y-px"
            style={{
              background: 'linear-gradient(135deg, var(--champagne) 0%, var(--champagne-light) 100%)',
              color: 'var(--text-inverse)',
            }}
          >
            <Plus size={16} strokeWidth={2} />
            发布公告
          </NavLink>
        </div>
      )}

      {/* Nav */}
      <div className="flex-1 px-3 overflow-y-auto">
        <p className="px-4 text-[10px] uppercase tracking-[0.2em] mb-3 font-medium text-text-tertiary">Menu</p>
        <nav className="space-y-0.5">
          {allNavItems
            .filter(item => {
              if (item.adminOnly) return user?.role === 'admin' || user?.role === 'manager';
              if (!item.permission) return true;
              const [module, action] = item.permission.split('.');
              return user?.allowed_modules?.[module]?.includes(action);
            })
            .map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 h-11 px-4 rounded-lg text-[13px] transition-all duration-300 relative group ${
                    isActive ? 'font-medium' : ''
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  backgroundColor: isActive ? 'var(--badge-bg)' : 'transparent',
                })}
                onMouseEnter={(e) => {
                  const a = e.currentTarget.getAttribute('aria-current');
                  if (a === 'page') return;
                  e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                  e.currentTarget.style.color = '';
                }}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full"
                        style={{ background: 'linear-gradient(to bottom, var(--champagne), var(--champagne-light))' }}
                      />
                    )}
                    <item.icon
                      className="w-[18px] h-[18px] transition-transform duration-200"
                      style={{
                        color: isActive ? 'var(--champagne)' : undefined,
                        strokeWidth: isActive ? 2 : 1.5,
                      }}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
        </nav>
      </div>

      {/* User profile */}
      <div className="p-3">
        <div className="p-3 rounded-xl border border-border flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shadow-lg"
            style={{
              background: 'linear-gradient(135deg, var(--champagne) 0%, var(--champagne-light) 100%)',
              color: 'var(--text-inverse)',
            }}
          >
            {user?.name?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-text-primary truncate">{user?.name || 'Guest'}</p>
            <p className="text-[11px] text-text-tertiary truncate">{user?.department || ({admin:'管理员',manager:'主理人',member:'商务',guest:'访客'}[user?.role ?? ''] || user?.role) || ''}</p>
          </div>
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--trend-positive-text)' }} />
        </div>
      </div>
    </aside>
  );
}
