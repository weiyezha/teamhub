import { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Palette,
  Shield,
  Moon,
  Sun,
  Monitor,
  Check,
  Save,
  Radio,
  Settings as SettingsIcon,
  Trash2,
  Plus,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAuthCtx } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { usePushNotifications } from '../hooks/usePushNotifications';
import api from '../lib/api';
import { showToast } from '../hooks/useToast';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

// 配置项中文说明，方便非技术人员理解（模块级常量，不会每次渲染重新创建）
const SETTING_LABELS: Record<string, string> = {
  app_name: '应用名称',
  app_subtitle: '应用副标题',
  pin_limit: '置顶数量上限',
  open_registration: '开放注册',
  require_approval: '发布需审核',
  allow_guest_access: '允许访客访问',
  level_colors: '公告等级颜色',
  permission_matrix: '权限矩阵',
  welcome_message: '欢迎弹窗内容',
};

const SETTING_HINTS: Record<string, string> = {
  app_name: '显示在网站标题栏和登录页',
  app_subtitle: '标题下方的副标题文字',
  pin_limit: '最多同时置顶几条公告（1-10）',
  open_registration: '是否允许新用户自行注册（true=允许，false=禁止）',
  require_approval: '发布公告是否需要管理员审核（true=需审核，false=直接发布）',
  allow_guest_access: '是否允许未登录访客查看公告（true=允许，false=必须登录）',
  level_colors: 'urgent=紧急(红) important=重要(橙) normal=普通(蓝)',
  permission_matrix: '各角色的操作权限配置（JSON格式，谨慎修改）',
  welcome_message: '首次登录欢迎弹窗的标题、副标题、引导步骤（JSON格式，可自由编辑）',
};

const getSettingLabel = (key: string) => SETTING_LABELS[key] || key;
const getSettingHint = (key: string) => SETTING_HINTS[key] || '';

export function Settings() {
  const { user } = useAuth();
  const { setUser } = useAuthCtx();
  const { theme, setTheme } = useTheme();
  const { supported: pushSupported, subscribed: pushSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'security' | 'system'>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // System settings state
  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({});
  const [systemLoading, setSystemLoading] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');


  useEffect(() => {
    if (activeTab === 'system' && user?.role === 'admin') {
      setSystemLoading(true);
      api.get('/api/settings')
        .then((res) => setSystemSettings(res.data))
        .catch(() => showToast('加载系统配置失败', 'error'))
        .finally(() => setSystemLoading(false));
    }
  }, [activeTab, user?.role]);

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [title, setTitle] = useState(user?.title || '');

  // Notification state
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: 'announcement', label: '新公告通知', description: '当有新公告发布时通知我', enabled: true },
    { id: 'mention', label: '评论回复', description: '当有人回复我的评论时通知我', enabled: true },
    { id: 'pin', label: '置顶公告', description: '当有公告被置顶时通知我', enabled: false },
    { id: 'system', label: '系统通知', description: '系统更新和维护通知', enabled: true },
  ]);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setDepartment(user.department || '');
      setTitle(user.title || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put('/api/users/me', {
        name,
        department,
        title,
      });
      // Merge updated fields while preserving allowed_modules
      const updated = res.data.user || res.data;
      if (user) {
        setUser({ ...user, name: updated.name, department: updated.department, title: updated.title });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      showToast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = () => {
    localStorage.setItem('notification_settings', JSON.stringify(notifications));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('两次输入的密码不一致', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('密码至少需要8位', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.put('/api/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.map((e: any) => e.msg || JSON.stringify(e)).join('; ') : (typeof detail === 'string' ? detail : '修改密码失败');
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: '个人资料', icon: User },
    { id: 'notifications' as const, label: '通知设置', icon: Bell },
    { id: 'appearance' as const, label: '外观主题', icon: Palette },
    { id: 'security' as const, label: '账号安全', icon: Shield },
    ...(user?.role === 'admin' ? [{ id: 'system' as const, label: '系统配置', icon: SettingsIcon }] : []),
  ];

  const handleTabChange = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    setSaved(false);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">设置</h1>
        <p className="text-sm text-text-secondary mt-0.5">管理你的个人偏好和账号设置</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-btn text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-accent-bg text-accent font-medium'
                  : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card p-6 space-y-5">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center text-2xl font-medium">
                  {user?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{user?.name}</h3>
                  <p className="text-xs text-text-secondary">{user?.username}</p>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-tag bg-accent-bg text-accent">
                    {user?.role === 'admin' ? '管理员' : user?.role === 'manager' ? '主理人' : user?.role === 'member' ? '商务' : '访客'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">姓名</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">账号</label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-tertiary outline-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">部门</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="如: 运营部"
                    className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">职位</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="如: 产品经理"
                    className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-4 py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saved ? <Check size={14} /> : <Save size={14} />}
                  {saved ? '已保存' : saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary mb-4">通知偏好</h3>
              {pushSupported && (
                <div className="flex items-start justify-between py-3 border-b border-border">
                  <div>
                    <p className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                      <Radio size={14} /> 浏览器推送通知
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">新公告发布时接收桌面通知</p>
                  </div>
                  <button
                    onClick={() => {
                      if (pushSubscribed) {
                        unsubscribe();
                      } else {
                        subscribe();
                      }
                    }}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      pushSubscribed ? 'bg-accent' : 'bg-bg-tertiary'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        pushSubscribed ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}
              {notifications.map((n) => (
                <div key={n.id} className="flex items-start justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{n.label}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{n.description}</p>
                  </div>
                  <button
                    onClick={() =>
                      setNotifications((prev) =>
                        prev.map((item) =>
                          item.id === n.id ? { ...item, enabled: !item.enabled } : item
                        )
                      )
                    }
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      n.enabled ? 'bg-accent' : 'bg-bg-tertiary'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        n.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSaveNotifications}
                  className="px-4 py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent-hover transition-colors flex items-center gap-1.5"
                >
                  {saved ? <Check size={14} /> : <Save size={14} />}
                  {saved ? '已保存' : '保存'}
                </button>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="card p-6 space-y-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4">主题设置</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-btn border-2 transition-all text-center ${
                    theme === 'light' ? 'border-accent bg-accent-bg' : 'border-border hover:border-accent/50'
                  }`}
                >
                  <Sun size={24} className="mx-auto mb-2 text-amber-500" />
                  <p className="text-sm font-medium text-text-primary">浅色</p>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-btn border-2 transition-all text-center ${
                    theme === 'dark' ? 'border-accent bg-accent-bg' : 'border-border hover:border-accent/50'
                  }`}
                >
                  <Moon size={24} className="mx-auto mb-2 text-violet-500" />
                  <p className="text-sm font-medium text-text-primary">深色</p>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`p-4 rounded-btn border-2 transition-all text-center ${
                    theme === 'system' ? 'border-accent bg-accent-bg' : 'border-border hover:border-accent/50'
                  }`}
                >
                  <Monitor size={24} className="mx-auto mb-2 text-text-secondary" />
                  <p className="text-sm font-medium text-text-primary">跟随系统</p>
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card p-6 space-y-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4">修改密码</h3>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">当前密码</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">新密码</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">确认新密码</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary outline-none focus:border-accent"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {saved ? '已修改' : saving ? '修改中...' : '修改密码'}
                </button>
              </form>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && user?.role === 'admin' && (
            <div className="card p-6 space-y-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4">系统配置</h3>
              {systemLoading ? (
                <div className="text-center py-4 text-text-secondary">加载中...</div>
              ) : (
                <>
                  {/* Add new config */}
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-text-secondary mb-1">配置项名称</label>
                      <input
                        type="text"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="如: custom_banner"
                        className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent"
                      />
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-xs text-text-secondary mb-1">配置值</label>
                      <input
                        type="text"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder="如: 欢迎使用 TeamHub"
                        className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-btn text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!newKey.trim()) return;
                        try {
                          await api.post('/api/settings/keys', { key: newKey.trim(), value: newValue });
                          setSystemSettings((prev) => ({ ...prev, [newKey.trim()]: newValue }));
                          setNewKey('');
                          setNewValue('');
                          showToast('配置已添加', 'success');
                        } catch {
                          showToast('添加失败', 'error');
                        }
                      }}
                      className="px-3 py-2 bg-accent text-white rounded-btn text-sm font-medium hover:bg-accent-hover transition-colors flex items-center gap-1"
                    >
                      <Plus size={14} />
                      添加
                    </button>
                  </div>

                  {/* Config list */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto overflow-x-hidden">
                    {Object.entries(systemSettings).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-btn border border-border min-w-0">
                        <div className="w-32 sm:w-40 shrink-0 min-w-0">
                          <span className="text-sm text-text-primary block truncate">{getSettingLabel(key)}</span>
                          {getSettingHint(key) && (
                            <span className="text-xs text-text-tertiary block truncate">{getSettingHint(key)}</span>
                          )}
                        </div>
                        {editingKey === key ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 min-w-0 px-2 py-1 bg-bg-primary border border-border rounded text-sm text-text-primary outline-none focus:border-accent"
                            autoFocus
                          />
                        ) : (
                          <span className="flex-1 min-w-0 text-sm text-text-primary truncate">
                            {typeof value === 'boolean'
                              ? (value ? '是' : '否')
                              : typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value)}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          {editingKey === key ? (
                            <button
                              onClick={async () => {
                                try {
                                  let parsedValue: any = editValue;
                                  try { parsedValue = JSON.parse(editValue); } catch { /* keep as string */ }
                                  await api.post('/api/settings/keys', { key, value: parsedValue });
                                  setSystemSettings((prev) => ({ ...prev, [key]: parsedValue }));
                                  setEditingKey(null);
                                  showToast('配置已更新', 'success');
                                } catch {
                                  showToast('更新失败', 'error');
                                }
                              }}
                              className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
                            >
                              <Check size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingKey(key);
                                setEditValue(typeof value === 'object' ? JSON.stringify(value) : String(value));
                              }}
                              className="p-1 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded"
                            >
                              <Save size={14} />
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (!confirm(`确定删除配置项 "${key}" 吗？`)) return;
                              try {
                                await api.delete(`/api/settings/keys/${encodeURIComponent(key)}`);
                                setSystemSettings((prev) => {
                                  const next = { ...prev };
                                  delete next[key];
                                  return next;
                                });
                                showToast('配置已删除', 'success');
                              } catch {
                                showToast('删除失败', 'error');
                              }
                            }}
                            className="p-1 text-danger hover:bg-danger/10 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
