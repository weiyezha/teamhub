import { useEffect, useState } from 'react';
import { Building2, Briefcase } from 'lucide-react';
import api from '../lib/api';

interface TeamMember {
  id: number;
  name: string;
  username: string;
  avatar: string;
  role: string;
  department: string;
  title: string;
  last_seen_at: string;
}

const roleLabels: Record<string, string> = {
  admin: '管理员',
  manager: '主理人',
  member: '商务',
  guest: '访客',
};

export function Team() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/team').then((res) => setMembers(res.data.items)).catch(() => setMembers([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-text-secondary">加载中...</div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-text-primary">团队成员</h1>
        <p className="text-sm text-text-secondary mt-0.5">共 {members.length} 位成员</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {members.map((m) => (
          <div key={m.id} className="card p-4 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center text-xl font-medium">
              {m.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">{m.name}</h3>
              <p className="text-xs text-text-tertiary">{m.username}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Building2 size={12} />
              <span>{m.department || '未设置部门'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Briefcase size={12} />
              <span>{m.title || '未设置职位'}</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-tag ${
                m.role === 'admin'
                  ? 'bg-accent-bg text-accent'
                  : m.role === 'manager'
                  ? 'bg-violet-500/10 text-violet-600'
                  : 'bg-bg-secondary text-text-secondary'
              }`}
            >
              {roleLabels[m.role] || m.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
