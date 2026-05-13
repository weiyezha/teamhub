import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Megaphone, Pin, Eye, MessageSquare, Search,
  ThumbsUp, CheckCircle,
  PinOff, Archive, Trash2, FolderOpen, X,
  Flame,
} from 'lucide-react';
import api from '../lib/api';
import { showToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../hooks/useAuth';
import { useCategories, getCategoryColor } from '../hooks/useCategories';




const statusTabs = [
  { key: 'active', label: '进行中' },
  { key: 'archived', label: '已归档' },
];

const levelConfig: Record<string, { bar: string; badge: string; label: string; icon: string }> = {
  urgent:   { bar: 'bg-red-500',   badge: 'bg-red-500 text-white',   label: '紧急', icon: '🔥' },
  important:{ bar: 'bg-amber-500', badge: 'bg-amber-500 text-white', label: '重要', icon: '⚡' },
  normal:   { bar: 'bg-blue-500',  badge: 'bg-blue-500 text-white',  label: '普通', icon: '' },
};

export function Announcements() {
  const { requestConfirm: confirm, cancel, state: confirmState } = useConfirm();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { categories: apiCategories } = useCategories();
  const categories = ['全部', ...apiCategories];

  const activeCategory = searchParams.get('category') || '全部';
  const activeStatus = searchParams.get('status') || 'active';
  const activeSort = searchParams.get('sort') || '';
  const unreadOnly = searchParams.get('unread') === '1';

  useEffect(() => {
    fetchAnnouncements();
  }, [activeCategory, activeStatus, activeSort, unreadOnly, page]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchAnnouncements();
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategory !== '全部') params.set('category', activeCategory);
    if (activeStatus !== 'active') params.set('status', activeStatus);
    if (search) params.set('search', search);
    if (activeSort) params.set('sort', activeSort);
    if (unreadOnly) params.set('unread_only', '1');
    params.set('page', String(page));
    params.set('limit', '20');
    try {
      const res = await api.get(`/api/announcements?${params}`);
      setItems(res.data.items);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (cat: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (cat === '全部') {
      newParams.delete('category');
    } else {
      newParams.set('category', cat);
    }
    setSearchParams(newParams);
    setPage(1);
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((a) => a.id)));
    }
  };

  const executeBatch = async (action: string, payload?: object) => {
    if (selectedIds.size === 0) return;
    const msgMap: Record<string, string> = {
      pin: '确定要置顶选中的公告吗？',
      unpin: '确定要取消置顶选中的公告吗？',
      archive: '确定要归档选中的公告吗？',
      delete: '确定要删除选中的公告吗？此操作不可撤销。',
    };
    if (msgMap[action]) {
      const ok = await confirm('批量操作', msgMap[action], 'warning');
      if (!ok) return;
    }
    try {
      const res = await api.post('/api/announcements/bulk', {
        ids: Array.from(selectedIds),
        action,
        payload,
      });
      showToast(`操作成功: ${res.data.success_count} 条, 跳过: ${res.data.skip_count} 条`, 'success');
      setSelectedIds(new Set());
      setBatchAction(null);
      fetchAnnouncements();
    } catch {
      showToast('批量操作失败', 'error');
    }
  };

  const handleStatusClick = (statusKey: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (statusKey === 'active') {
      newParams.delete('status');
    } else {
      newParams.set('status', statusKey);
    }
    setSearchParams(newParams);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">公告中心</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            共 {total} 条公告
          </p>
        </div>
        {user?.allowed_modules?.announcements?.includes('publish') && (
          <Link
            to="/announcements/new"
            className="px-4 py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            + 发布公告
          </Link>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleStatusClick(tab.key)}
            className={`px-3 py-1.5 rounded-tag text-sm transition-colors ${
              activeStatus === tab.key
                ? 'bg-accent text-white'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-sm px-3 py-2 bg-bg-secondary border border-border rounded-btn">
          <Search size={16} className="text-text-tertiary" />
          <input
            type="text"
            placeholder="搜索标题、内容..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={activeSort}
            onChange={(e) => {
              const newParams = new URLSearchParams(searchParams);
              if (e.target.value) {
                newParams.set('sort', e.target.value);
              } else {
                newParams.delete('sort');
              }
              setSearchParams(newParams);
              setPage(1);
            }}
            className="px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary outline-none cursor-pointer"
          >
            <option value="">最新发布</option>
            <option value="smart">智能排序</option>
            <option value="views">最多阅读</option>
          </select>
          <button
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              if (unreadOnly) {
                newParams.delete('unread');
              } else {
                newParams.set('unread', '1');
              }
              setSearchParams(newParams);
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-btn text-sm transition-colors border ${
              unreadOnly
                ? 'bg-accent text-white border-accent'
                : 'bg-bg-secondary text-text-secondary border-border hover:bg-bg-tertiary hover:text-text-primary'
            }`}
          >
            <Flame size={14} />
            仅未读
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryClick(cat)}
            className={`px-3 py-1.5 rounded-tag text-sm transition-colors ${
              activeCategory === cat
                ? 'bg-accent text-white'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border border-border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Announcement Grid */}
      {loading ? (
        <div className="text-center py-12 text-text-secondary">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <Megaphone size={48} className="text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary">暂无公告</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((a) => {
            const lvl = levelConfig[a.level] || levelConfig.normal;
            const hasCover = a.images?.length > 0;
            return (
              <div
                key={a.id}
                className={`group relative rounded-card overflow-hidden bg-card border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                  a.level === 'urgent' ? 'border-red-200 shadow-sm shadow-red-100' :
                  a.level === 'important' ? 'border-amber-200 shadow-sm shadow-amber-100' :
                  'border-border-subtle'
                }`}
              >
                {/* Level color bar */}
                <div className={`h-1 w-full ${lvl.bar}`} />

                {/* Cover area - always present for consistent card height */}
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-bg-secondary to-bg-tertiary">
                  {hasCover ? (
                    <>
                      <div className="absolute inset-0">
                        <img
                          src={a.images[0]}
                          alt=""
                          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    </>
                  ) : (
                    /* AI Summary cover for announcements without images */
                    <div className="absolute inset-0 pt-8 pb-3 px-4 flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-tag font-medium bg-accent/10 text-accent border border-accent/20">
                          AI 摘要
                        </span>
                        {a.keywords && a.keywords.length > 0 && (
                          <span className="text-[9px] text-text-tertiary truncate">
                            {a.keywords.slice(0, 2).join(' · ')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-3 flex-1">
                        {a.summary || a.content?.replace(/<[^>]*>/g, '').slice(0, 120) || '暂无内容摘要'}
                      </p>
                      <div className={`mt-1.5 h-0.5 w-12 rounded-full ${lvl.bar} opacity-60`} />
                    </div>
                  )}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(a.id)}
                    onChange={() => toggleSelection(a.id)}
                    className="absolute top-2 left-2 rounded border-border w-3.5 h-3.5 shrink-0 bg-white/80 backdrop-blur"
                  />
                  <span className={`absolute top-2 left-7 text-[10px] px-1.5 py-0.5 rounded-tag font-medium ${getCategoryColor(a.category)}`}>
                    {a.category}
                  </span>
                  {a.is_pinned && (
                    <Pin size={12} className="absolute top-2 right-2 text-white drop-shadow" />
                  )}
                </div>

                <div className="p-4 flex flex-col gap-2.5">
                  {/* Header row */}
                  <div className="flex items-center gap-2">
                    {a.level !== 'normal' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-tag font-medium flex items-center gap-0.5 ${lvl.badge}`}>
                        {lvl.icon && <span>{lvl.icon}</span>}
                        {lvl.label}
                      </span>
                    )}
                    {a.status === 'archived' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-tag font-medium bg-gray-600 text-white">
                        已归档
                      </span>
                    )}
                    {a.visibility === 'manager_only' && (user?.role === 'admin' || user?.role === 'manager') && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-tag font-medium bg-purple-600 text-white">
                        仅主理人
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <Link to={`/announcements/${a.id}`} className="block">
                    <h3 className="text-sm font-semibold text-text-primary line-clamp-2 group-hover:text-accent transition-colors leading-snug">
                      {a.title}
                    </h3>
                  </Link>

                  {/* Summary */}
                  <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                    {a.summary || a.content?.replace(/<[^>]*>/g, '').slice(0, 100)}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-[11px] text-text-tertiary mt-auto pt-2 border-t border-border-subtle">
                    <div className="flex items-center gap-2.5">
                      <span className="truncate max-w-[80px]">{a.author_name}</span>
                      <span className="flex items-center gap-0.5">
                        <Eye size={11} />
                        {a.view_count}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageSquare size={11} />
                        {a.comment_count}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {a.reactions?.received > 0 && (
                        <span className="flex items-center gap-0.5 text-emerald-500">
                          <ThumbsUp size={10} /> {a.reactions.received}
                        </span>
                      )}
                      {a.reactions?.done > 0 && (
                        <span className="flex items-center gap-0.5 text-blue-500">
                          <CheckCircle size={10} /> {a.reactions.done}
                        </span>
                      )}
                      <span>{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {Array.from({ length: Math.ceil(total / 20) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-btn text-sm ${
                page === p
                  ? 'bg-accent text-white'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-bg-primary border border-border rounded-btn shadow-lg"
        >
          <span className="text-sm text-text-secondary mr-1">已选 {selectedIds.size} 条</span>
          <button
            onClick={toggleSelectAll}
            className="px-2 py-1 text-xs text-accent hover:underline"
          >
            {selectedIds.size === items.length ? '取消全选' : '全选'}
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <BatchButton icon={<Pin size={14} />} label="置顶" onClick={() => executeBatch('pin')} />
          <BatchButton icon={<PinOff size={14} />} label="取消置顶" onClick={() => executeBatch('unpin')} />
          <BatchButton icon={<FolderOpen size={14} />} label="修改分类" onClick={() => setBatchAction('category')} />
          <BatchButton icon={<Archive size={14} />} label="归档" onClick={() => executeBatch('archive')} />
          {user?.role === 'admin' && (
            <BatchButton icon={<Trash2 size={14} />} label="删除" onClick={() => executeBatch('delete')} danger />
          )}
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={() => { setSelectedIds(new Set()); setBatchAction(null); }}
            className="p-1 text-text-tertiary hover:text-text-primary"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Category picker modal */}
      {batchAction === 'category' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setBatchAction(null)}
        >
          <div className="bg-bg-primary border border-border rounded-card p-5 w-72 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-text-primary mb-3">选择分类</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.filter((c) => c !== '全部').map((cat) => (
                <button
                  key={cat}
                  onClick={() => { executeBatch('set_category', { category: cat }); }}
                  className="px-3 py-1.5 rounded-tag text-sm bg-bg-secondary text-text-secondary hover:bg-accent hover:text-white transition-colors border border-border"
                >
                  {cat}
                </button>
              ))}
            </div>
            <button
              onClick={() => setBatchAction(null)}
              className="w-full px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={cancel}
      />
    </div>
  );
}

function BatchButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-btn text-xs transition-colors ${
        danger
          ? 'text-danger hover:bg-danger/10'
          : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}


