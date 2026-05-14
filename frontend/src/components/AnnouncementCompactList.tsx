import { Link } from 'react-router-dom';
import { Eye, MessageSquare, Pin } from 'lucide-react';

interface CompactAnnouncement {
  id: number;
  title: string;
  category: string;
  level: string;
  visibility: string;
  author_name: string;
  is_pinned: boolean;
  view_count: number;
  comment_count: number;
  created_at: string;
  is_read: boolean;
}

interface Props {
  items: CompactAnnouncement[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  showCheckbox?: boolean;
  userRole?: string;
}

const levelColors: Record<string, string> = {
  urgent: '#D93025',
  important: '#E37300',
  normal: '#1A73E8',
};

const levelBgColors: Record<string, string> = {
  urgent: 'bg-red-50 dark:bg-red-950/20',
  important: 'bg-amber-50 dark:bg-amber-950/20',
  normal: 'bg-blue-50 dark:bg-blue-950/20',
};

export function AnnouncementCompactList({
  items,
  selectedIds,
  onToggleSelect,
  showCheckbox = false,
  userRole,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-text-tertiary text-sm">
        暂无公告
      </div>
    );
  }

  return (
    <div className="border border-border rounded-card overflow-hidden bg-bg-primary">
      {items.map((a, idx) => {
        const color = levelColors[a.level] || '#1A73E8';
        const isSelected = selectedIds.has(a.id);
        return (
          <div
            key={a.id}
            className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-secondary group ${
              idx !== items.length - 1 ? 'border-b border-border' : ''
            } ${!a.is_read ? levelBgColors[a.level] || '' : ''}`}
          >
            {/* Checkbox */}
            {showCheckbox && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(a.id)}
                className="w-4 h-4 accent-accent shrink-0"
              />
            )}

            {/* Unread dot */}
            {!a.is_read && (
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            )}
            {a.is_read && !showCheckbox && <div className="w-2 shrink-0" />}

            {/* Pin icon */}
            {a.is_pinned && (
              <Pin size={14} className="text-accent shrink-0" />
            )}

            {/* Level bar */}
            <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <Link
                to={`/announcements/${a.id}`}
                className={`block truncate transition-colors ${
                  a.is_read ? 'text-text-secondary' : 'text-text-primary font-medium'
                } hover:text-accent`}
                title={a.title}
              >
                {a.title}
              </Link>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 shrink-0 text-xs text-text-tertiary">
              <span className="px-1.5 py-0.5 rounded-tag text-[10px] font-medium border"
                style={{ color, borderColor: color + '30' }}>
                {a.category}
              </span>
              {(userRole === 'admin' || userRole === 'manager') && a.visibility === 'manager_only' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-tag bg-purple-600 text-white">
                  仅主理人
                </span>
              )}
              {(userRole === 'admin' || userRole === 'manager') && a.visibility === 'specified' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-tag bg-amber-600 text-white">
                  指定人员
                </span>
              )}
              <span className="hidden sm:inline">{a.author_name}</span>
              <span>{new Date(a.created_at).toLocaleDateString('zh-CN')}</span>
              <span className="flex items-center gap-0.5">
                <Eye size={12} />{a.view_count}
              </span>
              <span className="flex items-center gap-0.5">
                <MessageSquare size={12} />{a.comment_count}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
