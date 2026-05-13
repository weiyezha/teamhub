import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Megaphone,
  MessageSquare,
  Shield,
  Settings,
  Activity,
  FileText,
  Eye,
  Clock,
  Check,
  X,
  Ban,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Tag,
} from 'lucide-react';
import api from '../lib/api';
import { showToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { UserTable } from '../components/UserTable';
import { PermissionMatrix } from '../components/PermissionMatrix';

function CategoryManager() {
  const [categories, setCategories] = useState<string[]>(['打款', '推广', '合同', '发行', '维权', '审批', '产品']);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/categories')
      .then((res: any) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCategories(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveCategories = async (next: string[]) => {
    try {
      await api.put('/api/settings', { announcement_categories: next });
      setCategories(next);
      showToast('分类已保存', 'success');
    } catch {
      showToast('保存失败', 'error');
    }
  };

  const addCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    if (categories.includes(name)) {
      showToast('该分类已存在', 'error');
      return;
    }
    saveCategories([...categories, name]);
    setNewCategory('');
  };

  const removeCategory = (name: string) => {
    const next = categories.filter((c) => c !== name);
    saveCategories(next);
  };

  if (loading) return <p className="text-xs text-text-tertiary">加载中...</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-tag text-xs bg-bg-secondary text-text-primary border border-border"
          >
            <Tag size={10} />
            {cat}
            <button
              onClick={() => removeCategory(cat)}
              className="ml-0.5 text-text-tertiary hover:text-danger transition-colors"
              title="删除"
            >
              <Trash2 size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
          placeholder="输入新分类名称..."
          className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent"
        />
        <button
          onClick={addCategory}
          disabled={!newCategory.trim()}
          className="px-3 py-2 bg-accent text-white rounded-btn text-sm hover:bg-accent/90 transition-colors disabled:opacity-40 flex items-center gap-1"
        >
          <Plus size={14} /> 添加
        </button>
      </div>
      <p className="text-[10px] text-text-tertiary">
        提示：修改分类后，已有公告的分类标签不会自动变更。删除分类后，该分类的公告仍保留原分类标签。
      </p>
    </div>
  );
}

interface AdminStats {
  total_users: number;
  total_announcements: number;
  total_comments: number;
  roles: Record<string, number>;
  pending_users: number;
}

interface AdminUser {
  id: number;
  name: string;
  username: string;
  role: string;
  department: string;
  title: string;
  is_active: boolean;
  last_seen_at: string;
  created_at: string;
}

interface ActivityLog {
  id: number;
  user_name: string;
  action: string;
  target_type: string;
  target_id: number;
  meta_data: Record<string, any>;
  created_at: string;
}

interface SystemSettings {
  open_registration: boolean;
  require_approval: boolean;
  allow_guest_access: boolean;
  app_name: string;
  app_subtitle: string;
  watermark_opacity: number;
}

const actionLabels: Record<string, string> = {
  login: '登录',
  create: '创建',
  view: '查看',
  comment: '评论',
  update: '更新',
  delete: '删除',
};

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors ${
        checked ? 'bg-accent' : 'bg-bg-tertiary'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function Admin() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'activity' | 'announcements' | 'settings' | 'permissions'>('overview');
  const [levelColors, setLevelColors] = useState<Record<string, string>>({urgent:'#D93025',important:'#E37300',normal:'#1A73E8'});
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    open_registration: true, require_approval: false, allow_guest_access: false,
    app_name: 'TeamHub', app_subtitle: 'Studio', watermark_opacity: 0.08,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const { requestConfirm: confirm, cancel, state: confirmState } = useConfirm();

  // Debounce timers for input fields
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debouncedSave = useCallback((key: string, value: any, delay = 500) => {
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    debounceTimers.current[key] = setTimeout(() => {
      api.put('/api/settings', { [key]: value }).catch(() => {});
    }, delay);
  }, []);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  const fetchStats = useCallback(() => {
    api.get('/api/admin/stats').then((res) => setStats(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchUsers = useCallback(() => {
    setLoadingUsers(true);
    api.get('/api/admin/users')
      .then((res) => setUsers(res.data.items))
      .catch(() => showToast('加载用户列表失败', 'error'))
      .finally(() => setLoadingUsers(false));
  }, []);

  const fetchActivity = useCallback(() => {
    setLoadingActivity(true);
    api.get('/api/admin/activity')
      .then((res) => setActivityLogs(res.data))
      .catch(() => showToast('加载操作日志失败', 'error'))
      .finally(() => setLoadingActivity(false));
  }, []);

  const fetchAnnouncements = useCallback(() => {
    setLoadingAnnouncements(true);
    api.get('/api/announcements?limit=100')
      .then((res) => setAnnouncements(res.data.items || []))
      .catch(() => showToast('加载公告列表失败', 'error'))
      .finally(() => setLoadingAnnouncements(false));
  }, []);

  const fetchSettings = useCallback(() => {
    api.get('/api/settings')
      .then((res) => {
        setSettings({
          open_registration: res.data.open_registration ?? true,
          require_approval: res.data.require_approval ?? false,
          allow_guest_access: res.data.allow_guest_access ?? false,
          app_name: res.data.app_name || 'TeamHub',
          app_subtitle: res.data.app_subtitle || 'Studio',
          watermark_opacity: res.data.watermark_opacity ?? 0.08,
        });
        if (res.data.level_colors) {
          const lc = res.data.level_colors;
          setLevelColors(typeof lc === 'string' ? JSON.parse(lc) : lc);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'activity') fetchActivity();
    if (activeTab === 'announcements') fetchAnnouncements();
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab, fetchUsers, fetchActivity, fetchAnnouncements, fetchSettings]);

  const saveUser = async (userId: number, form: Partial<AdminUser>) => {
    try {
      await api.put(`/api/team/${userId}`, form);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...form } : u))
      );
    } catch {
      showToast('保存失败', 'error');
    }
  };

  const toggleUserActive = async (user: AdminUser) => {
    const nextActive = !user.is_active;
    try {
      await api.put(`/api/team/${user.id}`, { is_active: nextActive });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: nextActive } : u))
      );
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.map((e: any) => e.msg || JSON.stringify(e)).join('; ') : (typeof detail === 'string' ? detail : '操作失败');
      showToast(msg, 'error');
    }
  };

  const deleteUser = async (user: AdminUser) => {
    const ok = await confirm('删除用户', `确定要删除用户 "${user.name}" (${user.username}) 吗？此操作不可撤销。`, 'danger');
    if (!ok) return;
    try {
      await api.delete(`/api/admin/users/${user.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      fetchStats();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.map((e: any) => e.msg || JSON.stringify(e)).join('; ') : (typeof detail === 'string' ? detail : '删除失败');
      showToast(msg, 'error');
    }
  };

  const batchUpdateUsers = async (userIds: number[], updates: Partial<AdminUser>) => {
    const actionText = updates.is_active ? '启用' : '禁用';
    const ok = await confirm(`批量${actionText}用户`, `确定要${actionText}选中的 ${userIds.length} 位用户吗？`, updates.is_active ? 'success' : 'warning');
    if (!ok) return;
    try {
      await api.post('/api/admin/users/batch-update', { user_ids: userIds, updates });
      setUsers((prev) =>
        prev.map((u) => (userIds.includes(u.id) ? { ...u, ...updates } : u))
      );
      fetchStats();
      showToast(`已${actionText} ${userIds.length} 位用户`, 'success');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.map((e: any) => e.msg || JSON.stringify(e)).join('; ') : (typeof detail === 'string' ? detail : '批量操作失败');
      showToast(msg, 'error');
    }
  };

  const updateSetting = async (key: keyof SystemSettings, value: boolean) => {
    setSavingSettings(true);
    try {
      const next = { ...settings, [key]: value };
      await api.put('/api/settings', next);
      setSettings(next);
    } catch {
      showToast('保存设置失败', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const exportAnnouncements = async () => {
    try {
      const res = await api.get('/api/admin/export/announcements');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `announcements_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('导出失败', 'error');
    }
  };

  const exportAnnouncementsCSV = () => { window.open('/api/admin/export/announcements?format=csv'); };

  const exportUsers = async () => {
    try {
      const res = await api.get('/api/admin/export/users');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('导出失败', 'error');
    }
  };

  const clearLogs = async () => {
    const ok = await confirm('清空日志', '确定要清空所有系统日志吗？此操作不可撤销。', 'danger');
    if (!ok) return;
    try {
      await api.post('/api/admin/clear-logs');
      showToast('日志已清空', 'success');
      if (activeTab === 'activity') fetchActivity();
    } catch {
      showToast('清空失败', 'error');
    }
  };

  const tabs = [
    { id: 'overview' as const, label: '概览', icon: Shield },
    { id: 'users' as const, label: '用户管理', icon: Users },
    { id: 'activity' as const, label: '操作日志', icon: Activity },
    { id: 'announcements' as const, label: '公告管理', icon: Megaphone },
    { id: 'permissions' as const, label: '权限管理', icon: Shield },
    { id: 'settings' as const, label: '系统设置', icon: Settings },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-text-primary">管理后台</h1>
        <p className="text-sm text-text-secondary mt-0.5">平台管理与配置</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-btn bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{stats.total_users}</p>
                  <p className="text-xs text-text-secondary">总用户</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-btn bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Megaphone size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{stats.total_announcements}</p>
                  <p className="text-xs text-text-secondary">总公告</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-btn bg-violet-500/10 text-violet-600 flex items-center justify-center">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{stats.total_comments}</p>
                  <p className="text-xs text-text-secondary">总评论</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-btn flex items-center justify-center ${
                  stats.pending_users > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-orange-500/10 text-orange-600'
                }`}>
                  <Shield size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">{stats.pending_users}</p>
                  <p className="text-xs text-text-secondary">待审批</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">角色分布</h3>
            <div className="space-y-3">
              {Object.entries(stats.roles).map(([role, count]) => (
                <div key={role} className="flex items-center gap-3">
                  <span className="text-sm text-text-secondary w-16 capitalize">{role}</span>
                  <div className="flex-1 h-2 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{
                        width: `${stats.total_users > 0 ? (count / stats.total_users) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-text-primary w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card overflow-hidden p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">用户列表</h3>
          </div>
          {loadingUsers ? (
            <div className="p-8 text-center text-text-secondary">加载中...</div>
          ) : (
            <UserTable
              users={users}
              onToggleActive={toggleUserActive}
              onDelete={deleteUser}
              onSave={saveUser}
              onBatchUpdate={batchUpdateUsers}
            />
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">操作日志</h3>
            <span className="text-xs text-text-secondary">最近 {activityLogs.length} 条</span>
          </div>
          {loadingActivity ? (
            <div className="p-8 text-center text-text-secondary">加载中...</div>
          ) : activityLogs.length === 0 ? (
            <div className="p-8 text-center text-text-secondary">暂无操作记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg-secondary/50 text-text-secondary">
                    <th className="text-left px-4 py-3 font-medium">时间</th>
                    <th className="text-left px-4 py-3 font-medium">用户</th>
                    <th className="text-left px-4 py-3 font-medium">操作</th>
                    <th className="text-left px-4 py-3 font-medium">对象</th>
                    <th className="text-left px-4 py-3 font-medium">详情</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-primary">{log.user_name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-tag bg-accent-bg text-accent">
                          {actionLabels[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        <div className="flex items-center gap-1">
                          {log.target_type === 'announcement' && <FileText size={12} />}
                          {log.target_type === 'comment' && <MessageSquare size={12} />}
                          {log.target_type === 'user' && <Users size={12} />}
                          <span>{log.target_type}</span>
                          {log.target_id > 0 && <span className="text-text-tertiary">#{log.target_id}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {log.meta_data?.title || log.meta_data?.content || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">公告管理</h3>
            <span className="text-xs text-text-secondary">共 {announcements.length} 条</span>
          </div>
          {loadingAnnouncements ? (
            <div className="p-8 text-center text-text-secondary">加载中...</div>
          ) : announcements.length === 0 ? (
            <div className="p-8 text-center text-text-secondary">暂无公告</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg-secondary/50 text-text-secondary">
                    <th className="text-left px-4 py-3 font-medium">标题</th>
                    <th className="text-left px-4 py-3 font-medium">类别</th>
                    <th className="text-left px-4 py-3 font-medium">作者</th>
                    <th className="text-left px-4 py-3 font-medium">阅读</th>
                    <th className="text-left px-4 py-3 font-medium">状态</th>
                    <th className="text-right px-4 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {announcements.map((a) => (
                    <tr key={a.id} className="hover:bg-bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {a.is_pinned && <span className="text-accent text-xs">📌</span>}
                          <Link
                            to={`/announcements/${a.id}`}
                            className="text-text-primary font-medium hover:text-accent transition-colors"
                          >
                            {a.title}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-tag bg-bg-secondary text-text-secondary">
                          {a.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{a.author_name}</td>
                      <td className="px-4 py-3 text-text-secondary">
                        <div className="flex items-center gap-1">
                          <Eye size={12} />
                          {a.view_count}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-tag ${
                          a.status === 'active' ? 'bg-success/10 text-success' : 'bg-text-tertiary/10 text-text-tertiary'
                        }`}>
                          {a.status === 'active' ? '正常' : '归档'}
                        </span>
                        {a.approval_status === 'pending' && (
                          <span className="ml-1 text-xs px-2 py-0.5 rounded-tag bg-amber-500/10 text-amber-600">
                            待审批
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={async () => {
                              try {
                                await api.put(`/api/announcements/${a.id}`, { is_pinned: !a.is_pinned });
                                setAnnouncements((prev) =>
                                  prev.map((item) => (item.id === a.id ? { ...item, is_pinned: !a.is_pinned } : item))
                                );
                              } catch {
                                showToast('操作失败', 'error');
                              }
                            }}
                            className="p-1 text-text-secondary hover:text-accent hover:bg-accent-bg rounded transition-colors"
                            title={a.is_pinned ? '取消置顶' : '置顶'}
                          >
                            {a.is_pinned ? <X size={14} /> : <Check size={14} />}
                          </button>
                          {a.approval_status === 'pending' && (
                            <>
                              <button onClick={async () => {
                                try {
                                  await api.put(`/api/announcements/${a.id}/approve`, { approval_status: 'approved' });
                                  setAnnouncements(prev => prev.map(item => item.id === a.id ? { ...item, approval_status: 'approved' } : item));
                                } catch { showToast('操作失败', 'error'); }
                              }}
                                className="p-1 text-text-secondary hover:text-success hover:bg-success/10 rounded transition-colors" title="通过">
                                <CheckCircle size={14} />
                              </button>
                              <button onClick={async () => {
                                const ok = await confirm('驳回公告', '确定要驳回这条公告吗？');
                                if (!ok) return;
                                try {
                                  await api.put(`/api/announcements/${a.id}/approve`, { approval_status: 'rejected' });
                                  setAnnouncements(prev => prev.map(item => item.id === a.id ? { ...item, approval_status: 'rejected' } : item));
                                } catch { showToast('操作失败', 'error'); }
                              }}
                                className="p-1 text-text-secondary hover:text-danger hover:bg-danger/10 rounded transition-colors" title="驳回">
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={async () => {
                              const ok = await confirm('删除公告', '确定要删除这条公告吗？', 'danger');
                              if (!ok) return;
                              try {
                                await api.delete(`/api/announcements/${a.id}`);
                                setAnnouncements((prev) => prev.filter((item) => item.id !== a.id));
                              } catch {
                                showToast('删除失败', 'error');
                              }
                            }}
                            className="p-1 text-text-secondary hover:text-danger hover:bg-danger/10 rounded transition-colors"
                            title="删除"
                          >
                            <Ban size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="card p-5">
          <PermissionMatrix />
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4 max-w-xl">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">系统配置</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-text-primary">开放注册</p>
                  <p className="text-xs text-text-secondary">允许新用户自行注册账号</p>
                </div>
                <ToggleSwitch checked={settings.open_registration} onChange={(v) => updateSetting('open_registration', v)} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-text-primary">公告审批</p>
                  <p className="text-xs text-text-secondary">发布公告需要管理员审批</p>
                </div>
                <ToggleSwitch checked={settings.require_approval} onChange={(v) => updateSetting('require_approval', v)} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-text-primary">访客访问</p>
                  <p className="text-xs text-text-secondary">未登录用户可查看公告</p>
                </div>
                <ToggleSwitch checked={settings.allow_guest_access} onChange={(v) => updateSetting('allow_guest_access', v)} />
              </div>
              {savingSettings && (<p className="text-xs text-text-tertiary">保存中...</p>)}
            </div>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">公告级别颜色</h3>
            <div className="space-y-3">
              {Object.entries(levelColors).map(([level, color]) => (
                <div key={level} className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">{level === 'urgent' ? '紧急' : level === 'important' ? '重要' : '普通'}</span>
                  <input type="color" value={color} onChange={e => {
                    const newColors = { ...levelColors, [level]: e.target.value };
                    setLevelColors(newColors);
                    debouncedSave('level_colors', newColors);
                  }} className="w-8 h-8 rounded cursor-pointer border-0" />
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">公告分类管理</h3>
            <CategoryManager />
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">应用信息</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-secondary">应用名称</label>
                <input type="text" value={settings.app_name} onChange={e => {
                  setSettings(s => ({ ...s, app_name: e.target.value }));
                  debouncedSave('app_name', e.target.value);
                }} className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary outline-none focus:border-accent mt-1" />
              </div>
              <div>
                <label className="text-xs text-text-secondary">副标题</label>
                <input type="text" value={settings.app_subtitle} onChange={e => {
                  setSettings(s => ({ ...s, app_subtitle: e.target.value }));
                  debouncedSave('app_subtitle', e.target.value);
                }} className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary outline-none focus:border-accent mt-1" />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">水印设置</h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-text-secondary">水印透明度</label>
                  <span className="text-xs text-text-primary font-mono">{Math.round(settings.watermark_opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.30"
                  step="0.01"
                  value={settings.watermark_opacity}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    setSettings(s => ({ ...s, watermark_opacity: val }));
                    debouncedSave('watermark_opacity', val);
                  }}
                  className="w-full accent-champagne cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-text-tertiary mt-1">
                  <span>很淡</span>
                  <span>适中</span>
                  <span>明显</span>
                </div>
                <div className="mt-3 p-3 bg-bg-secondary rounded-btn">
                  <p className="text-xs text-text-secondary mb-2">预览效果</p>
                  <div className="relative h-16 bg-bg-primary rounded overflow-hidden">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span
                        key={i}
                        className="absolute text-sm font-bold select-none whitespace-nowrap"
                        style={{
                          left: `${(i % 3) * 30 + 5}%`,
                          top: `${Math.floor(i / 3) * 50 + 10}%`,
                          color: `rgba(128, 128, 128, ${settings.watermark_opacity})`,
                          transform: `rotate(-25deg)`,
                        }}
                      >
                        用户名
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">数据管理</h3>
            <div className="space-y-3">
              <button
                onClick={exportAnnouncements}
                className="w-full px-4 py-2.5 text-left text-sm text-text-primary bg-bg-secondary rounded-btn hover:bg-bg-tertiary transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Download size={14} />
                  导出所有公告数据
                </span>
                <span className="text-xs text-text-secondary">JSON</span>
              </button>
              <button onClick={exportAnnouncementsCSV}
                className="w-full px-4 py-2.5 text-left text-sm text-text-primary bg-bg-secondary rounded-btn hover:bg-bg-tertiary transition-colors flex items-center justify-between">
                <span className="flex items-center gap-2"><Download size={14} />公告数据 (CSV)</span>
                <span className="text-xs text-text-secondary">CSV</span>
              </button>
              <button
                onClick={exportUsers}
                className="w-full px-4 py-2.5 text-left text-sm text-text-primary bg-bg-secondary rounded-btn hover:bg-bg-tertiary transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Download size={14} />
                  导出用户数据
                </span>
                <span className="text-xs text-text-secondary">JSON</span>
              </button>
              <button
                onClick={clearLogs}
                className="w-full px-4 py-2.5 text-left text-sm text-danger bg-danger/5 rounded-btn hover:bg-danger/10 transition-colors flex items-center gap-2"
              >
                <AlertTriangle size={14} />
                清空系统日志
              </button>
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
    </div>
  );
}
