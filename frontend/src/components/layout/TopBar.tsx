import { Sun, Moon, LogOut, Menu } from 'lucide-react';
import type { User } from '../../hooks/useAuth';
import { GlobalSearch } from '../GlobalSearch';
import { NotificationBell } from '../NotificationBell';

export function TopBar({
  theme,
  onToggleTheme,
  onLogout,
  onMenuClick,
}: {
  user: User | null;
  theme: string;
  onToggleTheme: () => void;
  onLogout: () => void;
  onMenuClick?: () => void;
}) {
  return (
    <header className="h-14 bg-bg-primary border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2">
        {onMenuClick && (
          <button onClick={onMenuClick}
            className="p-2 rounded-btn text-text-secondary hover:bg-bg-secondary transition-colors md:hidden" title="菜单">
            <Menu size={18} />
          </button>
        )}
        <button onClick={onToggleTheme}
          className="p-2 rounded-btn text-text-secondary hover:bg-bg-secondary transition-colors" title="切换主题">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <NotificationBell />

        <div className="w-px h-5 bg-border mx-1" />

        <button onClick={onLogout}
          className="p-2 rounded-btn text-text-secondary hover:bg-bg-secondary transition-colors" title="退出">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
