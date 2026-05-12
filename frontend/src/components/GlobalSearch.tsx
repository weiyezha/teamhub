import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface SearchItem { type: string; id: number; title: string; snippet: string; link: string; }

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      api.get(`/api/search?q=${encodeURIComponent(query)}&limit=5`).then(r => {
        setResults(r.data.results || []);
        setOpen(true);
      }).catch(() => {});
    }, 300);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [query]);

  const handleSelect = (item: SearchItem) => {
    setOpen(false); setQuery('');
    navigate(item.link);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { setOpen(false); navigate(`/announcements?search=${encodeURIComponent(query)}`); }
  };

  const typeLabel = (t: string) => t === 'announcement' ? '公告' : t === 'task' ? '任务' : t === 'comment' ? '评论' : t;

  return (
    <div ref={ref} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input type="text" placeholder="搜索公告、任务..." value={query}
          onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown} onFocus={() => results.length > 0 && setOpen(true)}
          className="w-full pl-9 pr-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary focus:outline-none focus:border-accent" />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-bg-primary border border-border rounded-card shadow-xl max-h-80 overflow-y-auto">
          {results.map((item) => (
            <button key={`${item.type}-${item.id}`} onClick={() => handleSelect(item)}
              className="w-full text-left px-3 py-2 hover:bg-bg-secondary border-b border-border last:border-b-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded-tag ${item.type === 'announcement' ? 'bg-accent-bg text-accent' : item.type === 'task' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {typeLabel(item.type)}
                </span>
                <span className="text-sm text-text-primary font-medium truncate">{item.title}</span>
              </div>
              {item.snippet && <p className="text-xs text-text-tertiary mt-0.5 truncate">{item.snippet}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
