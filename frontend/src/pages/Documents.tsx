import { useEffect, useState } from 'react';
import { FileText, Plus, Trash2, Edit3, X, Save } from 'lucide-react';
import api from '../lib/api';
import { showToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface Doc { id: number; title: string; content: string; category: string; status: string; author_name: string; created_at: string; updated_at: string; }

export function Documents() {
  const { requestConfirm: confirm, cancel, state: confirmState } = useConfirm();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Doc | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('通用');
  const [saving, setSaving] = useState(false);

  const cats = ['通用', '技术', '产品', '运营', '人事', '财务'];

const categoryColors: Record<string, string> = {
  '通用': 'bg-gray-600 text-white',
  '技术': 'bg-blue-600 text-white',
  '产品': 'bg-cyan-600 text-white',
  '运营': 'bg-amber-600 text-white',
  '人事': 'bg-violet-600 text-white',
  '财务': 'bg-emerald-600 text-white',
};

  const fetchDocs = () => {
    api.get('/api/documents').then(r => setDocs(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(fetchDocs, []);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/documents/${editing.id}`, { title, content, category });
      } else {
        await api.post('/api/documents', { title, content, category });
      }
      setShowNew(false); setEditing(null); setTitle(''); setContent('');
      fetchDocs();
    } catch { showToast('保存失败', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm('删除文档', '确定删除此文档吗？', 'danger');
    if (!ok) return;
    await api.delete(`/api/documents/${id}`);
    fetchDocs();
  };

  const startEdit = (d: Doc) => { setEditing(d); setTitle(d.title); setContent(d.content); setCategory(d.category); setShowNew(true); };
  const cancelEdit = () => { setEditing(null); setShowNew(false); setTitle(''); setContent(''); };

  if (loading) return <div className="p-8 text-center text-text-secondary">加载中...</div>;

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">文档管理</h1>
          <p className="text-sm text-text-secondary mt-0.5">共 {docs.length} 篇文档</p>
        </div>
        {!showNew && (
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent-hover transition-colors">
            <Plus size={16} /> 新建文档
          </button>
        )}
      </div>

      {showNew && (
        <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="文档标题"
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm outline-none focus:border-accent" />
          <div className="flex gap-2">
            {cats.map(c => (
              <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1 rounded-tag text-xs ${category === c ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary border border-border'}`}>{c}</button>
            ))}
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="文档内容（支持 Markdown）" rows={8}
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm outline-none focus:border-accent resize-y" />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-btn text-sm hover:bg-accent-hover disabled:opacity-50">
              <Save size={14} />{saving ? '保存中...' : editing ? '更新' : '创建'}
            </button>
            <button onClick={cancelEdit} className="flex items-center gap-1.5 px-4 py-2 bg-bg-secondary text-text-secondary rounded-btn text-sm border border-border hover:bg-bg-tertiary">
              <X size={14} /> 取消
            </button>
          </div>
        </div>
      )}

      {docs.length === 0 && !showNew ? (
        <div className="text-center py-16">
          <FileText size={48} className="text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary">暂无文档</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {docs.map(d => (
            <div key={d.id} className="group relative rounded-card overflow-hidden bg-card border border-border-subtle transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-tag font-medium ${categoryColors[d.category] || 'bg-gray-600 text-white'}`}>
                      {d.category}
                    </span>
                    <span className="text-sm font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
                      {d.title}
                    </span>
                  </div>
                  <p className="text-xs text-text-tertiary">{d.author_name} · {new Date(d.updated_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => startEdit(d)} className="p-1.5 text-text-secondary hover:text-accent rounded transition-colors" title="编辑"><Edit3 size={14} /></button>
                  <button onClick={() => handleDelete(d.id)} className="p-1.5 text-text-secondary hover:text-danger rounded transition-colors" title="删除"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
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
