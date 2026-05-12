import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, CheckCheck, Clock, AlertCircle,
  ArrowRight, Eye,
} from 'lucide-react';
import api from '../lib/api';
import { showToast } from '../hooks/useToast';

interface ReadingItem {
  id: number;
  title: string;
  category: string;
  is_pinned: boolean;
  view_count: number;
  comment_count: number;
  created_at: string;
  expires_at: string | null;
  read: boolean;
}

const categoryColors: Record<string, string> = {
  '打款': 'bg-emerald-600 text-white',
  '推广': 'bg-blue-600 text-white',
  '合同': 'bg-violet-600 text-white',
  '发行': 'bg-amber-600 text-white',
  '维权': 'bg-rose-600 text-white',
  '审批': 'bg-orange-600 text-white',
  '产品': 'bg-cyan-600 text-white',
};

export function ReadingList() {
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReadingList();
  }, []);

  const fetchReadingList = async () => {
    setLoading(true);
    try {
      // Use announcements API with unread_only and recent read items
      const [unreadRes, recentRes] = await Promise.all([
        api.get('/api/announcements?unread_only=1&limit=100'),
        api.get('/api/announcements?limit=20'),
      ]);
      const unread = unreadRes.data.items.map((a: any) => ({ ...a, read: false }));
      const recent = recentRes.data.items.map((a: any) => ({ ...a, read: true }));
      // Merge: unread first, then recent read (last 7 days)
      const merged = [...unread];
      const unreadIds = new Set(unread.map((u: any) => u.id));
      const now = new Date();
      recent.forEach((r: any) => {
        if (!unreadIds.has(r.id)) {
          const daysAgo = (now.getTime() - new Date(r.created_at).getTime()) / 86400000;
          if (daysAgo <= 7) {
            merged.push(r);
          }
        }
      });
      setItems(merged);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = items.filter((i) => !i.read).map((i) => i.id);
    if (unreadIds.length === 0) return;
    try {
      await Promise.all(
        unreadIds.map((id) => api.get(`/api/announcements/${id}`))
      );
      setItems(items.map((i) => ({ ...i, read: true })));
    } catch {
      showToast('标记失败', 'error');
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">我的待阅</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            未读 {items.filter((i) => !i.read).length} 条
          </p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-1.5 px-3 py-2 bg-bg-secondary text-text-secondary rounded-btn text-sm hover:bg-bg-tertiary hover:text-text-primary transition-colors border border-border"
        >
          <CheckCheck size={14} /> 全部标为已读
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-secondary">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen size={48} className="text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary">暂无待阅内容</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/announcements/${item.id}`}
              className="group relative rounded-card overflow-hidden bg-card border border-border-subtle transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 block"
            >
              <div className="p-4 flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {item.read ? (
                    <Eye size={18} className="text-text-tertiary" />
                  ) : (
                    <AlertCircle size={18} className="text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-tag font-medium ${categoryColors[item.category] || 'bg-gray-600 text-white'}`}>
                      {item.category}
                    </span>
                    {!item.read && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-tag bg-accent text-white font-medium">
                        未读
                      </span>
                    )}
                    {isExpired(item.expires_at) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-tag bg-rose-500 text-white font-medium">
                        已过期
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-text-tertiary mt-1">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={10} />
                      {item.view_count}
                    </span>
                  </div>
                </div>
                <ArrowRight size={16} className="text-text-tertiary shrink-0 mt-1 group-hover:text-accent transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
