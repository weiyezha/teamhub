import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import api from '../lib/api';
import { showToast } from '../hooks/useToast';

const MODULES: Record<string, { label: string; actions: string[] }> = {
  announcements: { label: '公告中心', actions: ['view', 'publish', 'delete'] },
  documents: { label: '文档管理', actions: ['view', 'create_edit', 'delete'] },
  dashboard: { label: '数据看板', actions: ['view'] },
  tasks: { label: '我的任务', actions: ['view'] },
  team: { label: '团队', actions: ['view'] },
  settings: { label: '设置', actions: ['view'] },
};

const ROLES = ['admin', 'manager', 'member', 'guest'];
const ROLE_LABELS: Record<string, string> = { admin: '管理员', manager: '主理人', member: '商务', guest: '访客' };

interface UserSearchResult { id: number; name: string; username: string; role: string; department: string; title: string; }

export function PermissionMatrix() {
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [foundUser, setFoundUser] = useState<UserSearchResult | null>(null);
  const [userPerms, setUserPerms] = useState<Record<string, boolean>>({});
  const [savingUser, setSavingUser] = useState(false);
  const [users, setUsers] = useState<UserSearchResult[]>([]);

  useEffect(() => {
    api.get('/api/permissions/matrix').then(r => setMatrix(r.data.matrix || {}));
    api.get('/api/admin/users').then(r => setUsers(r.data.items || []));
  }, []);

  const hasPerm = (role: string, module: string, action: string) => {
    const perms = matrix[role] || [];
    return perms.includes(`${module}.*`) || perms.includes(`${module}.${action}`);
  };

  const togglePerm = (role: string, module: string, action: string) => {
    setMatrix(prev => {
      const next = { ...prev };
      const rolePerms = [...(next[role] || [])];
      const key = `${module}.${action}`;
      const wildcard = `${module}.*`;
      if (rolePerms.includes(wildcard)) {
        // 有通配符时，取消通配符并保留该模块除当前外的其他权限
        const otherPerms = MODULES[module].actions
          .filter(a => a !== action)
          .map(a => `${module}.${a}`);
        next[role] = Array.from(new Set([...rolePerms.filter(p => p !== wildcard), ...otherPerms]));
      } else if (rolePerms.includes(key)) {
        next[role] = rolePerms.filter(p => p !== key);
      } else {
        next[role] = [...rolePerms, key];
      }
      return next;
    });
  };

  const saveMatrix = async () => {
    setSaving(true);
    try {
      await api.put('/api/permissions/matrix', { matrix });
      showToast('权限矩阵已保存', 'success');
    } catch {
      showToast('保存失败，请重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  const loadUserPerms = async (userId: number) => {
    const res = await api.get(`/api/admin/users/${userId}/permissions`);
    const perms: Record<string, boolean> = {};
    const existing = res.data.permissions || {};
    for (const [mkey, mdef] of Object.entries(MODULES)) {
      for (const action of mdef.actions) {
        const key = `${mkey}.${action}`;
        perms[key] = existing[key] !== undefined ? existing[key] : null as unknown as boolean;
      }
    }
    setUserPerms(perms);
  };

  const saveUserPerms = async () => {
    if (!foundUser) return;
    setSavingUser(true);
    const permissions: Record<string, boolean> = {};
    for (const [key, val] of Object.entries(userPerms)) {
      if (val !== null) permissions[key] = val;
    }
    await api.put(`/api/admin/users/${foundUser.id}/permissions`, { permissions });
    setSavingUser(false);
  };

  const selectUser = (u: UserSearchResult) => { setFoundUser(u); setUserSearch(''); loadUserPerms(u.id); };

  return (
    <div className="space-y-6">
      {/* Matrix */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-3">角色权限矩阵</h3>
        <div className="overflow-x-auto">
          <table className="w-full border border-border rounded-card">
            <thead>
              <tr className="bg-bg-secondary">
                <th className="p-3 text-left text-sm text-text-secondary">模块 / 子功能</th>
                {ROLES.map(r => (
                  <th key={r} className="p-3 text-center text-sm text-text-secondary">{ROLE_LABELS[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(MODULES).map(([mkey, mdef]) => (
                mdef.actions.map((action, ai) => (
                  <tr key={`${mkey}-${action}`} className="border-t border-border hover:bg-bg-tertiary">
                    <td className="p-3 text-sm text-text-primary">
                      {ai === 0 ? <span className="font-medium">{mdef.label}</span> : null}
                      <span className={ai === 0 ? 'ml-2' : 'ml-6'}>
                        └ {action === 'view' ? '查看' : action === 'publish' ? '发布公告' : action === 'create_edit' ? '新建/编辑' : action === 'delete' ? '删除' : action}
                      </span>
                    </td>
                    {ROLES.map(role => (
                      <td key={role} className="p-3 text-center">
                        <input type="checkbox" checked={hasPerm(role, mkey, action)}
                          onChange={() => togglePerm(role, mkey, action)}
                          className="w-4 h-4 accent-accent cursor-pointer" />
                      </td>
                    ))}
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={saveMatrix} disabled={saving}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-btn hover:bg-accent-hover disabled:opacity-50 transition-colors text-sm">
          <Save size={14} />{saving ? '保存中...' : '保存权限矩阵'}
        </button>
      </div>

      {/* User Overrides */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-3">用户特殊授权</h3>
        <div className="relative mb-3">
          <input type="text" placeholder="搜索用户姓名..." value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            className="w-full max-w-sm px-3 py-2 bg-bg-primary border border-border rounded-btn text-sm text-text-primary" />
          {userSearch && (
            <div className="absolute z-10 mt-1 w-full max-w-sm bg-bg-primary border border-border rounded-card shadow-xl max-h-48 overflow-y-auto">
              {users.filter(u => u.name.includes(userSearch) || u.username.includes(userSearch)).map(u => (
                <button key={u.id} onClick={() => selectUser(u)}
                  className="w-full text-left px-3 py-2 hover:bg-bg-secondary text-sm text-text-primary border-b border-border last:border-b-0">
                  {u.name} ({u.username}) - {ROLE_LABELS[u.role] || u.role}
                </button>
              ))}
            </div>
          )}
        </div>
        {foundUser && (
          <div className="bg-bg-secondary border border-border rounded-card p-4">
            <h4 className="font-medium text-text-primary mb-2">{foundUser.name} 的特殊授权</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(MODULES).map(([mkey, mdef]) =>
                mdef.actions.map(action => {
                  const key = `${mkey}.${action}`;
                  return (
                    <label key={key} className="flex items-center gap-2 text-sm text-text-secondary">
                      <input type="checkbox"
                        checked={userPerms[key] === true}
                        onChange={() => setUserPerms(p => ({ ...p, [key]: p[key] === true ? null as unknown as boolean : true }))}
                        className="w-3.5 h-3.5 accent-accent" />
                      {MODULES[mkey].label} - {action === 'view' ? '查看' : action === 'publish' ? '发布' : action === 'create_edit' ? '编辑' : action === 'delete' ? '删除' : action}
                    </label>
                  );
                })
              )}
            </div>
            <button onClick={saveUserPerms} disabled={savingUser}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-accent text-white rounded-btn hover:bg-accent-hover disabled:opacity-50 text-sm">
              <Save size={12} />{savingUser ? '保存中...' : '保存用户授权'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
