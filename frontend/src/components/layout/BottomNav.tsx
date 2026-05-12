import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Megaphone, ClipboardList, BookOpen, Plus, Settings } from 'lucide-react';
import type { User } from '../../hooks/useAuth';

const navItems = [
  { path: '/', label: '看板', icon: LayoutDashboard, permission: 'dashboard.view' as const },
  { path: '/announcements', label: '公告', icon: Megaphone, permission: 'announcements.view' as const },
  { path: '/tasks', label: '任务', icon: ClipboardList, permission: 'tasks.view' as const },
  { path: '/reading-list', label: '待阅', icon: BookOpen, permission: 'announcements.view' as const },
  { path: '/announcements/new', label: '发布', icon: Plus, permission: 'announcements.publish' as const },
  { path: '/settings', label: '设置', icon: Settings, permission: 'settings.view' as const },
];

export function BottomNav({ user }: { user: User | null }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-primary border-t border-border md:hidden z-40">
      <div className="flex items-center justify-around h-14">
        {navItems
          .filter(item => {
            if (!item.permission) return true;
            const [module, action] = item.permission.split('.');
            return user?.allowed_modules?.[module]?.includes(action);
          })
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors ${
                  isActive ? 'text-accent' : 'text-text-tertiary'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
      </div>
    </nav>
  );
}
