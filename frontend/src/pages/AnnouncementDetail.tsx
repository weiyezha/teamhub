import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  MessageSquare,
  Pin,
  Send,
  Trash2,
  Edit3,
  ThumbsUp,
  CheckCircle,
  HelpCircle,
  Bell,
  History,
  X,
  Link2,
  Plus,
  ExternalLink,
  ClipboardList,
  Image,
  FileText,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import api from '../lib/api';
import { showToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../hooks/useAuth';
import { ReadStatusModal } from '../components/ReadStatusModal';

interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string;
  author_id: number;
  author_name: string;
  is_pinned: boolean;
  view_count: number;
  read_count: number;
  comment_count: number;
  created_at: string;
  attachments: any[];
  images: any[];
  reactions: {
    received: number;
    done: number;
    question: number;
    remind: number;
    user_reaction: string | null;
  };
  summary: string;
  keywords: string[];
}

interface Comment {
  id: number;
  content: string;
  author_name: string;
  created_at: string;
}

interface Version {
  id: number;
  content: string;
  editor_name: string;
  created_at: string;
}

interface AnnouncementLink {
  id: number;
  target_type: string;
  target_url: string;
  title: string;
}

const categoryColors: Record<string, string> = {
  '打款': 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  '推广': 'bg-blue-500/10 text-blue-600 border-blue-200',
  '合同': 'bg-violet-500/10 text-violet-600 border-violet-200',
  '发行': 'bg-amber-500/10 text-amber-600 border-amber-200',
  '维权': 'bg-rose-500/10 text-rose-600 border-rose-200',
  '审批': 'bg-orange-500/10 text-orange-600 border-orange-200',
  '产品': 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
};

export function AnnouncementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [versions, setVersions] = useState<Version[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [links, setLinks] = useState<AnnouncementLink[]>([]);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const { requestConfirm: confirm, cancel, state: confirmState } = useConfirm();
  const [taskQuote, setTaskQuote] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [readers, setReaders] = useState<{ id: number; name: string; department: string; title: string; role: string }[]>([]);
  const [showReaders, setShowReaders] = useState(false);
  const [showMention, setShowMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionListRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Filter out images already shown inline in content to avoid duplication
  const inlineImages = announcement ? Array.from(
    (announcement.content || '').matchAll(/<img[^>]+src=["']([^"']+)["']/gi)
  ).map((m) => m[1]) : [];
  const galleryImages = announcement?.images?.filter((img: string) => !inlineImages.includes(img)) || [];

  useEffect(() => {
    if (!id) return;
    api.get(`/api/announcements/${id}`)
      .then((res) => setAnnouncement(res.data))
      .catch(() => setAnnouncement({ id: 0, title: '加载失败', content: '无法加载公告内容', category: '', author_id: 0, author_name: '', is_pinned: false, view_count: 0, read_count: 0, comment_count: 0, created_at: '', attachments: [], images: [], reactions: { received: 0, done: 0, question: 0, remind: 0, user_reaction: null }, summary: '', keywords: [] } as Announcement));
    api.get(`/api/comments?target_type=announcement&target_id=${id}`)
      .then((res) => setComments(res.data))
      .catch(() => setComments([]));
    api.get(`/api/announcements/${id}/links`)
      .then((res) => setLinks(res.data))
      .catch(() => setLinks([]));
    api.get(`/api/announcements/${id}/readers?tab=read`)
      .then((res) => setReaders(res.data.items || []))
      .catch(() => setReaders([]));
  }, [id]);

  // Only fetch versions if user is author or admin/manager
  useEffect(() => {
    if (!id || !announcement || !user) return;
    const canViewVersions =
      announcement.author_id === user.id || ['admin', 'manager'].includes(user.role);
    if (!canViewVersions) return;
    api.get(`/api/announcements/${id}/versions`)
      .then((res) => setVersions(res.data))
      .catch(() => setVersions([]));
  }, [id, announcement, user]);

  const handleDelete = async () => {
    const ok = await confirm('删除公告', '确定要删除这条公告吗？', 'danger');
    if (!ok) return;
    try {
      await api.delete(`/api/announcements/${id}`);
      navigate('/announcements');
    } catch {
      showToast('删除失败', 'error');
    }
  };

  const handleReaction = async (type: string) => {
    if (!id) return;
    try {
      await api.post('/api/reactions', {
        target_type: 'announcement',
        target_id: Number(id),
        reaction_type: type,
      });
      // Refresh announcement to get updated reaction counts
      const annRes = await api.get(`/api/announcements/${id}`);
      setAnnouncement(annRes.data);
    } catch {
      showToast('操作失败', 'error');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !id) return;
    try {
      const res = await api.post('/api/comments', {
        content: newComment,
        target_type: 'announcement',
        target_id: Number(id),
      });
      setComments([res.data, ...comments]);
      setNewComment('');
    } catch {
      showToast('评论发布失败', 'error');
    }
  };

  const handleAddLink = async () => {
    if (!newLinkUrl.trim() || !id) return;
    try {
      const res = await api.post(`/api/announcements/${id}/links`, {
        target_type: 'url',
        target_url: newLinkUrl,
        title: newLinkTitle || newLinkUrl,
      });
      setLinks([res.data, ...links]);
      setNewLinkUrl('');
      setNewLinkTitle('');
      setShowAddLink(false);
    } catch {
      showToast('添加关联资源失败', 'error');
    }
  };

  const handleDeleteLink = async (linkId: number) => {
    const ok = await confirm('删除关联资源', '确定删除这个关联资源吗？', 'danger');
    if (!ok) return;
    try {
      await api.delete(`/api/announcements/links/${linkId}`);
      setLinks(links.filter((l) => l.id !== linkId));
    } catch {
      showToast('删除失败', 'error');
    }
  };

  const handleFetchTitle = async () => {
    if (!newLinkUrl.trim()) return;
    try {
      const res = await api.post('/api/fetch-title', { url: newLinkUrl });
      if (res.data.title && res.data.title !== '无法获取标题') {
        setNewLinkTitle(res.data.title);
      }
    } catch {
      // ignore
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !id) return;
    try {
      await api.post('/api/tasks', {
        title: taskTitle,
        description: taskQuote,
        source_announcement_id: Number(id),
        source_quote: taskQuote,
        due_date: taskDueDate || undefined,
        priority: taskPriority,
      });
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskQuote('');
      setTaskDueDate('');
      setTaskPriority('medium');
      showToast('任务已创建', 'success');
    } catch (err: any) {
      if (err.response?.status === 409) {
        showToast('该段落已转为任务，请勿重复添加', 'info');
      } else {
        showToast('创建任务失败', 'error');
      }
    }
  };

  const openTaskModal = (quote?: string) => {
    setTaskQuote(quote || '');
    setTaskTitle(quote ? quote.slice(0, 100) : '');
    setShowTaskModal(true);
  };

  if (!announcement) return <div className="p-8 text-center">加载中...</div>;

  const canEdit =
    user &&
    (announcement.author_id === user.id || ['admin', 'manager'].includes(user.role));

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <Link
        to="/announcements"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent mb-4"
      >
        <ArrowLeft size={16} /> 返回公告列表
      </Link>

      <div className="card p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-tag border ${
                categoryColors[announcement.category] || ''
              }`}
            >
              {announcement.category}
            </span>
            {announcement.is_pinned && <Pin size={14} className="text-accent" />}
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              {versions.length > 0 && (
                <button
                  onClick={() => setShowDiff(true)}
                  className="p-1.5 text-text-tertiary hover:text-accent transition-colors"
                  title="查看变更"
                >
                  <History size={16} />
                </button>
              )}
              <button
                onClick={() => navigate(`/announcements/${id}/edit`)}
                className="p-1.5 text-text-tertiary hover:text-accent transition-colors"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 text-text-tertiary hover:text-danger transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        <h1 className="text-xl font-bold text-text-primary mb-3">
          {announcement.title}
        </h1>

        <div className="flex items-center gap-4 text-xs text-text-tertiary mb-6">
          <span>{announcement.author_name}</span>
          <span>{new Date(announcement.created_at).toLocaleString()}</span>
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {announcement.view_count}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare size={12} />
            {announcement.comment_count}
          </span>
        </div>

        {/* AI Summary */}
        {announcement.summary && (
          <div className="mt-4 p-3 bg-bg-secondary/50 rounded-btn border border-border">
            <p className="text-xs text-text-tertiary mb-1">AI 摘要</p>
            <p className="text-sm text-text-secondary">{announcement.summary}</p>
            {announcement.keywords.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {announcement.keywords.map((k, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-tag bg-accent-bg text-accent">
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          className="prose prose-sm max-w-none text-text-primary"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(announcement.content) }}
        />

        {/* Images */}
        {galleryImages.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-text-tertiary mb-2 flex items-center gap-1">
              <Image size={14} /> 图片
            </p>
            <div className={`grid gap-3 ${galleryImages.length === 1 ? 'grid-cols-1' : galleryImages.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
              {galleryImages.map((img: string, i: number) => (
                <div
                  key={i}
                  className={`group relative rounded-btn overflow-hidden border border-border bg-bg-secondary cursor-pointer ${i === 0 && galleryImages.length === 1 ? 'col-span-full' : ''}`}
                  onClick={() => setSelectedImage(img)}
                >
                  <img
                    src={img}
                    alt={`图片 ${i + 1}`}
                    className={`w-full object-cover ${galleryImages.length === 1 ? 'aspect-[16/9]' : 'aspect-video'}`}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-xs px-2 py-1 rounded-tag backdrop-blur-sm">
                    查看大图
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        {announcement.attachments?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-text-tertiary mb-2 flex items-center gap-1">
              <FileText size={14} /> 附件
            </p>
            <div className="flex flex-wrap gap-2">
              {announcement.attachments.map((att: any, i: number) => (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-btn border border-border text-sm text-text-primary hover:border-accent hover:text-accent transition-colors"
                >
                  <FileText size={16} className="text-text-tertiary shrink-0" />
                  <span className="truncate max-w-[200px]">{att.filename}</span>
                  <ExternalLink size={14} className="text-text-tertiary shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Related Links */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-text-secondary flex items-center gap-1">
              <Link2 size={14} /> 关联资源
            </h4>
            {canEdit && (
              <button
                onClick={() => setShowAddLink(true)}
                className="text-xs text-accent hover:underline flex items-center gap-0.5"
              >
                <Plus size={12} /> 添加
              </button>
            )}
          </div>
          {links.length === 0 && !showAddLink ? (
            <p className="text-xs text-text-tertiary">暂无关联资源</p>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div key={link.id} className="flex items-center justify-between gap-2 p-2 bg-bg-secondary rounded-btn">
                  <a
                    href={link.target_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-accent hover:underline flex-1 truncate"
                  >
                    <ExternalLink size={12} />
                    <span className="truncate">{link.title || link.target_url}</span>
                  </a>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="p-1 text-text-tertiary hover:text-danger shrink-0"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {showAddLink && (
            <div className="mt-2 p-3 bg-bg-secondary rounded-btn border border-border space-y-2">
              <input
                type="text"
                placeholder="输入 URL..."
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                onBlur={handleFetchTitle}
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-btn text-sm text-text-primary placeholder:text-text-tertiary outline-none"
              />
              <input
                type="text"
                placeholder="标题（可选）"
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-btn text-sm text-text-primary placeholder:text-text-tertiary outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddLink}
                  className="px-3 py-1.5 bg-accent text-white rounded-btn text-xs hover:bg-accent-hover transition-colors"
                >
                  确认
                </button>
                <button
                  onClick={() => { setShowAddLink(false); setNewLinkUrl(''); setNewLinkTitle(''); }}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Convert to Task */}
        <div className="mt-4 pt-4 border-t border-border">
          <button
            onClick={() => openTaskModal()}
            className="flex items-center gap-2 text-sm text-accent hover:underline"
          >
            <ClipboardList size={14} /> 添加到我的任务
          </button>
        </div>
      </div>

      {/* Reactions */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <ReactionButton
            icon={<ThumbsUp size={16} />}
            label="收到"
            count={announcement.reactions?.received || 0}
            active={announcement.reactions?.user_reaction === 'received'}
            onClick={() => handleReaction('received')}
          />
          <ReactionButton
            icon={<CheckCircle size={16} />}
            label="已完成"
            count={announcement.reactions?.done || 0}
            active={announcement.reactions?.user_reaction === 'done'}
            onClick={() => handleReaction('done')}
          />
          <ReactionButton
            icon={<HelpCircle size={16} />}
            label="有疑问"
            count={announcement.reactions?.question || 0}
            active={announcement.reactions?.user_reaction === 'question'}
            onClick={() => handleReaction('question')}
          />
          <ReactionButton
            icon={<Bell size={16} />}
            label="提醒我"
            count={announcement.reactions?.remind || 0}
            active={announcement.reactions?.user_reaction === 'remind'}
            onClick={() => handleReaction('remind')}
          />
        </div>
      </div>

      {/* Read Receipt */}
      <div className="card p-4 mb-4">
        <button onClick={() => setShowReaders(true)} className="text-xs text-text-secondary hover:text-accent transition-colors text-left">
          {readers.length === 0 ? (
            `已读 ${announcement.read_count} 人`
          ) : readers.length <= 5 ? (
            <>{readers.map(r => r.name).join('、')} 已读</>
          ) : (
            <>{readers.slice(0, 5).map(r => r.name).join('、')} 等 {readers.length} 人已读</>
          )}
        </button>
      </div>
      {showReaders && (
        <ReadStatusModal announcementId={Number(id)} onClose={() => setShowReaders(false)}
          currentUserDepartment={user?.department || ''} />
      )}

      {/* Comments */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          评论 ({comments.length})
        </h3>

        <form onSubmit={handlePostComment} className="flex gap-2 mb-4 relative">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newComment}
              onChange={(e) => {
                const value = e.target.value;
                setNewComment(value);
                const lastAt = value.lastIndexOf('@');
                if (lastAt !== -1) {
                  const after = value.slice(lastAt + 1);
                  if (!after.includes(' ')) {
                    setMentionQuery(after);
                    setShowMention(true);
                    setMentionIndex(0);
                    return;
                  }
                }
                setShowMention(false);
              }}
              onKeyDown={(e) => {
                if (!showMention) return;
                const users = readers.filter(r => r.name.includes(mentionQuery));
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setMentionIndex(i => (i + 1) % users.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setMentionIndex(i => (i - 1 + users.length) % users.length);
                } else if ((e.key === 'Enter' || e.key === 'Tab') && users.length > 0) {
                  e.preventDefault();
                  const lastAt = newComment.lastIndexOf('@');
                  setNewComment(newComment.slice(0, lastAt) + '@' + users[mentionIndex].name + ' ');
                  setShowMention(false);
                } else if (e.key === 'Escape') {
                  setShowMention(false);
                }
              }}
              placeholder="写下你的评论，输入 @ 提及同事..."
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent"
            />
            {showMention && readers.filter(r => r.name.includes(mentionQuery)).length > 0 && (
              <div ref={mentionListRef} className="absolute left-0 right-0 bottom-full mb-1 bg-bg-primary border border-border rounded-btn shadow-lg z-20 max-h-40 overflow-y-auto">
                {readers.filter(r => r.name.includes(mentionQuery)).map((r, i) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      const lastAt = newComment.lastIndexOf('@');
                      setNewComment(newComment.slice(0, lastAt) + '@' + r.name + ' ');
                      setShowMention(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-bg-secondary transition-colors ${
                      i === mentionIndex ? 'bg-bg-secondary' : ''
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-medium shrink-0">
                      {r.name.charAt(0)}
                    </span>
                    <span className="text-text-primary">{r.name}</span>
                    <span className="text-text-tertiary text-xs">{r.department}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-accent text-white rounded-btn text-sm hover:bg-accent-hover transition-colors"
          >
            <Send size={16} />
          </button>
        </form>

        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-medium shrink-0">
                {c.author_name?.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-text-primary">
                    {c.author_name}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-text-secondary">
                  {c.content.split(/(@[\w\u4e00-\u9fff]+)/g).map((part, i) =>
                    part.startsWith('@') ? (
                      <span key={i} className="text-accent font-medium">{part}</span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diff Modal */}
      {showDiff && (
        <DiffModal
          versions={versions}
          currentContent={announcement.content}
          onClose={() => {
            setShowDiff(false);
            setSelectedVersion(null);
          }}
          selectedVersion={selectedVersion}
          onSelectVersion={setSelectedVersion}
        />
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-bg-primary rounded-modal w-full max-w-md p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text-primary">添加到我的任务</h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="p-1 text-text-tertiary hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-tertiary mb-1 block">任务标题</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="输入任务标题..."
                  className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent"
                />
              </div>
              {taskQuote && (
                <div>
                  <label className="text-xs text-text-tertiary mb-1 block">引用内容</label>
                  <div className="p-2 bg-bg-secondary rounded-btn text-xs text-text-secondary border border-border line-clamp-3">
                    {taskQuote}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-text-tertiary mb-1 block">截止日期</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-text-tertiary mb-1 block">优先级</label>
                <div className="flex items-center gap-2">
                  {[
                    { key: 'low', label: '低' },
                    { key: 'medium', label: '中' },
                    { key: 'high', label: '高' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setTaskPriority(p.key)}
                      className={`flex-1 px-3 py-1.5 rounded-btn text-sm transition-colors ${
                        taskPriority === p.key
                          ? 'bg-accent text-white'
                          : 'bg-bg-secondary text-text-secondary border border-border hover:bg-bg-tertiary'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleCreateTask}
                  className="flex-1 px-4 py-2 bg-accent text-white rounded-btn text-sm hover:bg-accent-hover transition-colors"
                >
                  确认创建
                </button>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 px-4 py-2 bg-bg-secondary text-text-secondary rounded-btn text-sm hover:bg-bg-tertiary transition-colors border border-border"
                >
                  取消
                </button>
              </div>
            </div>
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

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            onClick={() => setSelectedImage(null)}
          >
            <X size={28} />
          </button>
          <img
            src={selectedImage}
            alt="预览"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function computeDiff(oldText: string, newText: string): { type: 'same' | 'del' | 'ins'; text: string }[] {
  const oldWords = stripHtml(oldText).split(/(\s+)/);
  const newWords = stripHtml(newText).split(/(\s+)/);

  // Simple LCS-based diff
  const m = oldWords.length;
  const n = newWords.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: { type: 'same' | 'del' | 'ins'; text: string }[] = [];
  let i = m,
    j = n;
  const temp: { type: 'same' | 'del' | 'ins'; text: string }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      temp.push({ type: 'same', text: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      temp.push({ type: 'ins', text: newWords[j - 1] });
      j--;
    } else if (i > 0) {
      temp.push({ type: 'del', text: oldWords[i - 1] });
      i--;
    }
  }

  // Reverse and merge consecutive same-type tokens
  let current: { type: 'same' | 'del' | 'ins'; text: string } | null = null;
  for (let k = temp.length - 1; k >= 0; k--) {
    const item = temp[k];
    if (!current) {
      current = { ...item };
    } else if (current.type === item.type) {
      current.text += item.text;
    } else {
      result.push(current);
      current = { ...item };
    }
  }
  if (current) result.push(current);
  return result;
}

function DiffModal({
  versions,
  currentContent,
  onClose,
  selectedVersion,
  onSelectVersion,
}: {
  versions: Version[];
  currentContent: string;
  onClose: () => void;
  selectedVersion: Version | null;
  onSelectVersion: (v: Version) => void;
}) {
  const compareContent = selectedVersion ? selectedVersion.content : '';
  const diffResult = selectedVersion ? computeDiff(compareContent, currentContent) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-bg-primary rounded-modal w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base font-semibold text-text-primary">变更历史</h3>
          <button onClick={onClose} className="p-1 text-text-tertiary hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Version list */}
          <div className="w-64 border-r border-border overflow-y-auto p-2 shrink-0">
            <div className="text-xs text-text-tertiary px-2 py-1 mb-1">当前版本</div>
            <button className="w-full text-left px-3 py-2 rounded-btn text-sm text-text-primary bg-accent/10 mb-2">
              当前内容
            </button>
            <div className="text-xs text-text-tertiary px-2 py-1 mb-1">历史版本 ({versions.length})</div>
            {versions.map((v) => (
              <button
                key={v.id}
                onClick={() => onSelectVersion(v)}
                className={`w-full text-left px-3 py-2 rounded-btn text-sm mb-1 transition-colors ${
                  selectedVersion?.id === v.id
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                <div className="font-medium">{v.editor_name}</div>
                <div className="text-xs text-text-tertiary">
                  {new Date(v.created_at).toLocaleString()}
                </div>
              </button>
            ))}
          </div>

          {/* Diff view */}
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedVersion ? (
              <div className="text-sm text-text-tertiary text-center py-8">
                选择左侧历史版本查看与当前内容的对比
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-4 text-xs">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">新增</span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600">删除</span>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {diffResult.map((part, idx) => {
                    if (part.type === 'same') {
                      return <span key={idx}>{part.text}</span>;
                    }
                    if (part.type === 'ins') {
                      return (
                        <ins
                          key={idx}
                          className="bg-emerald-500/15 text-emerald-700 no-underline rounded px-0.5"
                        >
                          {part.text}
                        </ins>
                      );
                    }
                    return (
                      <del
                        key={idx}
                        className="bg-rose-500/15 text-rose-700 no-underline rounded px-0.5 line-through"
                      >
                        {part.text}
                      </del>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReactionButton({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-tag text-sm transition-colors ${
        active
          ? 'bg-accent text-white'
          : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border border-border'
      }`}
    >
      {icon}
      <span>{label}</span>
      {count > 0 && <span className="text-xs opacity-80">{count}</span>}
    </button>
  );
}
