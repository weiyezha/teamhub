import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Image,
  Eye,
  EyeOff,
  Upload,
  Paperclip,
  FileSpreadsheet,
  FileText,
  X,
} from 'lucide-react';
import { type Editor } from '@tiptap/react';
import DOMPurify from 'dompurify';
import api from '../lib/api';
import { showToast } from '../hooks/useToast';
import { TipTapEditor } from '../components/TipTapEditor';
import { useAuth } from '../hooks/useAuth';

const categories = ['打款', '推广', '合同', '发行', '维权', '审批', '产品'];

interface Attachment {
  url: string;
  filename: string;
  type: string;
}

export function AnnouncementEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [level, setLevel] = useState('normal');
  const [visibility, setVisibility] = useState('public');
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    api.get(`/api/announcements/${id}`)
      .then((res) => {
        const a = res.data;
        setTitle(a.title || '');
        setContent(a.content || '');
        setCategory(a.category || categories[0]);
        setIsPinned(a.is_pinned || false);
        setLevel(a.level || 'normal');
        setVisibility(a.visibility || 'public');
        setExpiresAt(a.expires_at ? a.expires_at.slice(0, 10) : '');
        setImages(Array.isArray(a.images) ? a.images.filter((x: any) => typeof x === 'string') : []);
        setAttachments(Array.isArray(a.attachments) ? a.attachments.filter((x: any) => x && typeof x === 'object') : []);
      })
      .catch(() => showToast('加载公告失败', 'error'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/upload', formData);
      const url = res.data.url;
      if (editorRef.current) {
        editorRef.current.chain().focus().setImage({ src: url }).run();
      }
      setImages((prev) => [...prev, url]);
    } catch (err: any) {
      let msg = err.response?.data?.detail || '图片上传失败';
      if (Array.isArray(msg)) msg = msg.map((d: any) => d.msg || String(d)).join('; ');
      else if (typeof msg !== 'string') msg = String(msg);
      showToast(msg, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAttachmentClick = () => {
    attachInputRef.current?.click();
  };

  const handleAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttaching(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/upload', formData);
      const url = res.data.url;
      setAttachments((prev) => [
        ...prev,
        { url, filename: file.name, type: file.type },
      ]);
    } catch (err: any) {
      let msg = err.response?.data?.detail || '文件上传失败';
      if (Array.isArray(msg)) msg = msg.map((d: any) => d.msg || String(d)).join('; ');
      else if (typeof msg !== 'string') msg = String(msg);
      showToast(msg, 'error');
    } finally {
      setAttaching(false);
      if (attachInputRef.current) attachInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (filename: string) => {
    const ext = (filename || '').split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return <FileSpreadsheet size={16} className="text-emerald-500" />;
    if (ext === 'pdf') return <FileText size={16} className="text-rose-500" />;
    if (ext === 'doc' || ext === 'docx') return <FileText size={16} className="text-blue-500" />;
    return <Paperclip size={16} className="text-text-secondary" />;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/api/announcements/${id}`, {
          title, content, category, level, visibility,
          is_pinned: isPinned, images, attachments,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        });
        navigate(`/announcements/${id}`);
      } else {
        const res = await api.post('/api/announcements', {
          title, content, category, level, visibility,
          is_pinned: isPinned, images, attachments,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        });
        navigate(`/announcements/${res.data.id}`);
      }
    } catch (err: any) {
      let msg = err.response?.data?.detail || err.message || '发布失败，请重试';
      if (Array.isArray(msg)) msg = msg.map((d: any) => d.msg || String(d)).join('; ');
      else if (typeof msg !== 'string') msg = String(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <h1 className="text-xl font-bold text-text-primary mb-6">{isEdit ? '编辑公告' : '发布公告'}</h1>
      {loading && <div className="text-center py-4 text-text-secondary">加载中...</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div className="card p-6">
          <label htmlFor="title" className="block text-sm font-medium text-text-secondary mb-1.5">
            标题
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入公告标题..."
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent"
            required
          />
        </div>

        {/* Category */}
        <div className="card p-6">
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            类别
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-tag text-sm transition-colors ${
                  category === cat
                    ? 'bg-accent text-white'
                    : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary border border-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Level & Pin */}
        <div className="card p-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">级别</label>
              <div className="flex gap-2">
                {[
                  { v: 'urgent', l: '紧急', c: '#D93025' },
                  { v: 'important', l: '重要', c: '#E37300' },
                  { v: 'normal', l: '普通', c: '#1A73E8' },
                ].map((opt) => (
                  <button key={opt.v} type="button" onClick={() => setLevel(opt.v)}
                    className={`px-3 py-1.5 rounded-tag text-sm border-2 transition-colors ${
                      level === opt.v ? 'text-white border-transparent' : 'bg-bg-secondary text-text-secondary border-border hover:bg-bg-tertiary'
                    }`}
                    style={level === opt.v ? { backgroundColor: opt.c } : {}}
                  >{opt.l}</button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)}
                className="w-4 h-4 accent-accent" />
              <span className="text-sm text-text-secondary">置顶公告 <span className="text-xs text-text-tertiary">(最多3条)</span></span>
            </label>
          </div>
        </div>

        {/* Visibility */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <div className="card p-6">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">可见范围</label>
            <div className="flex gap-2">
              {[
                { v: 'public', l: '所有人可见' },
                { v: 'manager_only', l: '仅主理人可见' },
              ].map((opt) => (
                <button key={opt.v} type="button" onClick={() => setVisibility(opt.v)}
                  className={`px-3 py-1.5 rounded-tag text-sm border-2 transition-colors ${
                    visibility === opt.v
                      ? 'bg-accent text-white border-transparent'
                      : 'bg-bg-secondary text-text-secondary border-border hover:bg-bg-tertiary'
                  }`}
                >{opt.l}</button>
              ))}
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="card p-0 overflow-hidden">
          {/* Custom toolbar for upload + preview */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-bg-secondary/50 flex-wrap">
            <button
              type="button"
              onClick={handleImageClick}
              disabled={uploading}
              title="上传图片"
              className="p-1.5 rounded-btn transition-colors text-text-secondary hover:text-text-primary hover:bg-bg-tertiary disabled:opacity-40"
            >
              {uploading ? <Upload size={16} className="animate-spin" /> : <Image size={16} />}
            </button>
            <button
              type="button"
              onClick={handleAttachmentClick}
              disabled={attaching}
              title="上传附件 (Excel/PDF/Word)"
              className="p-1.5 rounded-btn transition-colors text-text-secondary hover:text-text-primary hover:bg-bg-tertiary disabled:opacity-40"
            >
              {attaching ? <Upload size={16} className="animate-spin" /> : <Paperclip size={16} />}
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              title={showPreview ? '关闭预览' : '实时预览'}
              className={`p-1.5 rounded-btn transition-colors ${
                showPreview
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className={`grid ${showPreview ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="border-r border-border">
              <TipTapEditor
                content={content}
                onChange={setContent}
                placeholder="输入公告内容..."
                minHeight="320px"
                onEditorReady={(editor) => { editorRef.current = editor; }}
                onImageUpload={handleImageClick}
              />
            </div>
            {showPreview && (
              <div className="px-4 py-3 overflow-auto bg-bg-secondary/30">
                <p className="text-xs text-text-tertiary mb-2">实时预览</p>
                <div
                  className="prose prose-sm max-w-none text-text-primary"
                  style={{
                    ['--tw-prose-body' as string]: 'var(--text-primary)',
                    ['--tw-prose-headings' as string]: 'var(--text-primary)',
                    ['--tw-prose-links' as string]: 'var(--accent)',
                  }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content || '<p class="text-text-tertiary">暂无内容...</p>') }}
                />
              </div>
            )}
          </div>

          {/* Cover images */}
          {images.length > 0 && (
            <div className="px-4 pb-3">
              <p className="text-xs text-text-tertiary mb-2">封面图片</p>
              <div className="grid grid-cols-2 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group rounded-btn overflow-hidden border border-border bg-bg-secondary">
                    <img
                      src={img}
                      alt=""
                      className="w-full aspect-video object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="px-4 pb-3">
              <p className="text-xs text-text-tertiary mb-2">附件</p>
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary rounded-tag text-sm border border-border"
                  >
                    {getFileIcon(att.filename)}
                    <span className="text-text-primary truncate max-w-[160px]">{att.filename}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="p-0.5 text-text-tertiary hover:text-danger transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="card p-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pinned"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-border"
              />
              <label htmlFor="pinned" className="text-sm text-text-secondary">
                置顶公告
              </label>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="expires" className="text-sm text-text-secondary">
                有效期至
              </label>
              <input
                type="date"
                id="expires"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="px-2 py-1 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {submitting ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
      </form>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={attachInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.txt,.zip,.rar"
        onChange={handleAttachmentChange}
        className="hidden"
      />
    </div>
  );
}
