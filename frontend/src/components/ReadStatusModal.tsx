import { useEffect, useState } from 'react';
import { X, Bell, Search } from 'lucide-react';
import api from '../lib/api';
import { showToast } from '../hooks/useToast';

interface Reader { id: number; name: string; department: string; title: string; role: string; }

export function ReadStatusModal({ announcementId, onClose, currentUserDepartment }: { announcementId: number; onClose: () => void; currentUserDepartment: string }) {
  const [tab, setTab] = useState<'read' | 'unread'>('read');
  const [readers, setReaders] = useState<Reader[]>([]);
  const [unreadReaders, setUnreadReaders] = useState<Reader[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/announcements/${announcementId}/readers?tab=read`),
      api.get(`/api/announcements/${announcementId}/readers?tab=unread`),
    ]).then(([rRes, uRes]) => {
      setReaders(rRes.data.items || []);
      setUnreadReaders(uRes.data.items || []);
    }).finally(() => setLoading(false));
  }, [announcementId]);

  const filterBySearch = (list: Reader[]) =>
    search ? list.filter(r => r.name.includes(search)) : list;

  const handleRemind = async (_userId: number) => {
    await api.post(`/api/announcements/${announcementId}/remind-unread`);
    showToast('已发送提醒', 'success');
  };

  const list = tab === 'read' ? filterBySearch(readers) : filterBySearch(unreadReaders);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-card p-5 shadow-xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">
            {readers.length}人已读 / 共{readers.length + unreadReaders.length}人
          </h3>
          <button onClick={onClose} className="p-1 text-text-tertiary hover:text-text-primary"><X size={18} /></button>
        </div>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setTab('read')} className={`px-3 py-1.5 rounded-btn text-sm ${tab === 'read' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'}`}>
            已读 ({readers.length})
          </button>
          <button onClick={() => setTab('unread')} className={`px-3 py-1.5 rounded-btn text-sm ${tab === 'unread' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'}`}>
            未读 ({unreadReaders.length})
          </button>
        </div>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-2.5 top-2.5 text-text-tertiary" />
          <input type="text" placeholder="搜索姓名..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {loading ? <p className="text-sm text-text-tertiary text-center py-4">加载中...</p> :
            list.length === 0 ? <p className="text-sm text-text-tertiary text-center py-4">暂无数据</p> :
            list.map(r => (
              <div key={r.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-bg-secondary rounded-btn text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-accent text-white text-xs flex items-center justify-center font-medium">{r.name.charAt(0)}</span>
                  <div>
                    <span className="text-text-primary">{r.name}</span>
                    {r.department === currentUserDepartment && <span className="text-xs text-accent ml-1">同事</span>}
                    {r.title && <span className="text-xs text-text-tertiary ml-2">{r.title}</span>}
                  </div>
                </div>
                {tab === 'unread' && (
                  <button onClick={() => handleRemind(r.id)} className="p-1 text-text-tertiary hover:text-accent" title="提醒">
                    <Bell size={14} />
                  </button>
                )}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
