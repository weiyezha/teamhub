import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Megaphone, Clock, TrendingUp, Pin, ChevronRight,
} from 'lucide-react';
import api from '../lib/api';
import { CountUp } from '../components/decor/CountUp';

interface DashboardStats {
  active_users: number;
  total_users: number;
  category_counts: Record<string, number>;
  recent_announcements: any[];
  pending_approvals: number;
  activity_trend: { date: string; count: number }[];
}

const categoryColors: Record<string, string> = {
  '打款': 'bg-emerald-600 text-white',
  '推广': 'bg-blue-600 text-white',
  '合同': 'bg-violet-600 text-white',
  '发行': 'bg-amber-600 text-white',
  '维权': 'bg-rose-600 text-white',
  '审批': 'bg-orange-600 text-white',
  '产品': 'bg-cyan-600 text-white',
};

const levelConfig: Record<string, { bar: string; badge: string; label: string; icon: string }> = {
  urgent:   { bar: 'bg-red-500',   badge: 'bg-red-500 text-white',   label: '紧急', icon: '🔥' },
  important:{ bar: 'bg-amber-500', badge: 'bg-amber-500 text-white', label: '重要', icon: '⚡' },
  normal:   { bar: 'bg-blue-500',  badge: 'bg-blue-500 text-white',  label: '普通', icon: '' },
};

const categoryIcons: Record<string, string> = {
  '打款': '💰',
  '推广': '📢',
  '合同': '📄',
  '发行': '🎵',
  '维权': '🛡️',
  '审批': '✅',
  '产品': '💡',
};

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ticker, setTicker] = useState<any[]>([]);
  const [urgent, setUrgent] = useState<any[]>([]);
  const [latest, setLatest] = useState<any[]>([]);

  useEffect(() => {
    api.get('/api/dashboard/stats')
      .then((res) => setStats(res.data))
      .catch(() => setStats({ active_users: 0, total_users: 0, category_counts: {}, recent_announcements: [], pending_approvals: 0, activity_trend: [] }));
    api.get('/api/dashboard/ticker')
      .then((res) => setTicker(res.data))
      .catch(() => setTicker([]));
    api.get('/api/dashboard/urgent')
      .then((res) => { setUrgent(res.data.urgent); setLatest(res.data.latest); })
      .catch(() => {});
  }, []);

  if (!stats) return (
    <div className="space-y-6 animate-fade-in p-4">
      {/* KPI skeleton */}
      <div className="grid grid-cols-4 gap-5">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-2xl p-6 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <div className="w-11 h-11 rounded-xl bg-bg-secondary animate-pulse mb-5" />
            <div className="h-8 w-16 bg-bg-secondary rounded animate-pulse mb-2" />
            <div className="h-3 w-20 bg-bg-secondary rounded animate-pulse" />
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card p-5">
          <div className="h-4 w-32 bg-bg-secondary rounded animate-pulse mb-4" />
          <div className="h-64 bg-bg-secondary rounded animate-pulse" />
        </div>
        <div className="card p-5">
          <div className="h-4 w-20 bg-bg-secondary rounded animate-pulse mb-4" />
          <div className="space-y-2.5">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-8 bg-bg-secondary rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const hasAnnouncements = ticker.length > 0 || urgent.length > 0 || latest.length > 0 || Object.values(stats.category_counts).reduce((a: number, b: number) => a + b, 0) > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Ticker */}
      {ticker.length > 0 && (
        <div className="card p-3 overflow-hidden">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-accent font-medium shrink-0">最新动态</span>
            <div className="flex-1 overflow-hidden relative h-6">
              <div className="absolute whitespace-nowrap animate-marquee flex gap-8">
                {[...ticker, ...ticker].map((item, i) => (
                  <Link
                    key={`${item.id}-${i}`}
                    to={`/announcements/${item.id}`}
                    className="flex items-center gap-2 text-text-secondary hover:text-accent transition-colors"
                  >
                    <span className="text-xs px-1.5 py-0.5 rounded-tag border">
                      {item.category}
                    </span>
                    <span className="truncate max-w-xs">{item.title}</span>
                    <span className="text-text-tertiary text-xs">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Urgent Announcements */}
      {urgent.length > 0 && (
        <div className="rounded-2xl border border-[var(--coral-warm)] border-opacity-30 p-5" style={{ backgroundColor: 'rgba(196,113,90,0.08)' }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--coral-warm)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--coral-warm)' }} />
            紧急公告
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {urgent.map((a: any) => (
              <Link key={a.id} to={`/announcements/${a.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-bg-tertiary"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}>
                <span className="text-xs px-2 py-0.5 rounded-tag font-medium bg-red-500/10 text-red-500 shrink-0">紧急</span>
                <span className="text-sm text-text-primary truncate">{a.title}</span>
                <span className="text-xs text-text-tertiary ml-auto shrink-0">{new Date(a.created_at).toLocaleDateString()}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Latest Announcements */}
      {latest.length > 0 && (
        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}>
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            最新公告
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {latest.map((a: any) => {
              const lvl = levelConfig[a.level] || levelConfig.normal;
              return (
                <Link key={a.id} to={`/announcements/${a.id}`}
                  className="group relative rounded-card overflow-hidden bg-card border border-border-subtle transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 block">
                  <div className={`h-1 w-full ${lvl.bar}`} />
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {a.level !== 'normal' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-tag font-medium flex items-center gap-0.5 ${lvl.badge}`}>
                          {lvl.icon && <span>{lvl.icon}</span>}
                          {lvl.label}
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-tag font-medium ${categoryColors[a.category] || 'bg-gray-600 text-white'}`}>
                        {a.category}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-text-primary line-clamp-2 group-hover:text-accent transition-colors leading-snug">
                      {a.title}
                    </p>
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      {a.summary || ''}
                    </p>
                    <p className="text-[11px] text-text-tertiary mt-auto pt-2 border-t border-border-subtle">
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        {[
          { icon: Users, iconBg: 'rgba(124,158,199,0.12)', iconColor: '#7c9ec7', gradient: '#7c9ec7', value: stats.active_users, label: '本周活跃用户' },
          { icon: Megaphone, iconBg: 'var(--champagne-muted)', iconColor: 'var(--champagne)', gradient: 'var(--champagne)', value: Object.values(stats.category_counts).reduce((a: number, b: number) => a + b, 0), label: '总公告数' },
          { icon: Clock, iconBg: 'rgba(245,158,11,0.1)', iconColor: '#f59e0b', gradient: stats.pending_approvals > 0 ? '#f59e0b' : '#6bb59e', value: stats.pending_approvals, label: '待审批' },
          { icon: TrendingUp, iconBg: 'rgba(196,113,90,0.1)', iconColor: 'var(--coral-warm)', gradient: 'var(--coral-warm)', value: stats.total_users, label: '团队成员' },
        ].map((card, i) => (
          <div key={card.label} className="relative rounded-2xl p-6 border transition-all duration-500 group overflow-hidden hover:-translate-y-1 hover:shadow-lg"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', boxShadow: 'var(--shadow-md)' }}>
            <div className="absolute top-0 left-6 right-6 h-[2px] opacity-40 group-hover:opacity-70 transition-opacity duration-500"
              style={{ background: `linear-gradient(90deg, transparent, ${card.gradient}, transparent)` }} />
            <div className="flex items-start justify-between mb-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.iconBg }}>
                <card.icon className="w-5 h-5" style={{ color: card.iconColor }} strokeWidth={1.5} />
              </div>
            </div>
            <div className="font-display text-[30px] font-semibold leading-none tracking-tight text-text-primary">
              <CountUp value={card.value} index={i} />
            </div>
            <p className="text-[12px] mt-2 text-text-tertiary">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Empty state: no announcements yet */}
      {!hasAnnouncements && (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">还没有公告</h3>
          <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
            发布第一条公告，让团队了解最新动态。支持富文本编辑、文件附件、定时发布等功能。
          </p>
          <Link
            to="/announcements/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, var(--champagne) 0%, var(--champagne-light) 100%)' }}
          >
            <Megaphone size={16} />
            发布第一条公告
          </Link>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="col-span-2 card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">团队活跃度趋势</h3>
          <div className="h-64">
            {stats.activity_trend.length > 0 ? (
            <svg viewBox="0 0 600 220" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              {(() => {
                const data = stats.activity_trend;
                const maxVal = Math.max(...data.map((d: any) => d.count), 1);
                const pad = { top: 20, right: 20, bottom: 30, left: 40 };
                const cw = 600 - pad.left - pad.right;
                const ch = 220 - pad.top - pad.bottom;
                const pts = data.map((d: any, i: number) => ({
                  x: pad.left + (i / Math.max(data.length - 1, 1)) * cw,
                  y: pad.top + ch - (d.count / maxVal) * ch,
                  date: d.date,
                  count: d.count,
                }));
                const pathD = pts.map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const areaD = `${pathD} L ${pts[pts.length - 1].x} ${pad.top + ch} L ${pts[0].x} ${pad.top + ch} Z`;
                return (
                  <>
                    {[0, Math.round(maxVal / 2), maxVal].map((v, idx) => {
                      const y = pad.top + ch - (v / maxVal) * ch;
                      return (
                        <g key={`grid-${idx}-${v}`}>
                          <line x1={pad.left} y1={y} x2={600 - pad.right} y2={y} stroke="var(--border-subtle)" strokeWidth={1} strokeDasharray="4 4" />
                          <text x={pad.left - 6} y={y + 4} textAnchor="end" fill="var(--text-tertiary)" fontSize={11}>{v}</text>
                        </g>
                      );
                    })}
                    <path d={areaD} fill="url(#areaGrad)" />
                    <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    {pts.map((p: any) => (
                      <circle key={p.date} cx={p.x} cy={p.y} r={4} fill="var(--bg-card)" stroke="var(--accent)" strokeWidth={2} />
                    ))}
                    {pts.map((p: any) => (
                      <text key={'l' + p.date} x={p.x} y={220 - 6} textAnchor="middle" fill="var(--text-tertiary)" fontSize={11}>{p.date}</text>
                    ))}
                  </>
                );
              })()}
            </svg>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-text-tertiary">暂无数据</div>
            )}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">类别分布</h3>
          <div className="space-y-2.5">
            {Object.entries(stats.category_counts).map(([cat, count]) => (
              <Link
                key={cat}
                to={`/announcements?category=${cat}`}
                className="flex items-center justify-between p-2.5 rounded-btn hover:bg-bg-secondary transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{categoryIcons[cat]}</span>
                  <span className="text-sm text-text-secondary group-hover:text-text-primary">
                    {cat}
                  </span>
                </div>
                <span className="text-sm font-medium text-text-primary">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Announcements */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">最新公告</h3>
          <Link
            to="/announcements"
            className="text-xs text-accent hover:underline flex items-center gap-1"
          >
            查看全部 <ChevronRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {stats.recent_announcements.map((a) => (
            <Link
              key={a.id}
              to={`/announcements/${a.id}`}
              className="flex items-center gap-4 py-3 hover:bg-bg-secondary -mx-5 px-5 transition-colors"
            >
              {a.is_pinned && <Pin size={14} className="text-accent shrink-0" />}
              <span
                className={`text-xs px-2 py-0.5 rounded-tag border shrink-0 ${
                  categoryColors[a.category] || 'bg-gray-500/10 text-gray-600 border-gray-200'
                }`}
              >
                {a.category}
              </span>
              <span className="text-sm text-text-primary flex-1 truncate">{a.title}</span>
              <span className="text-xs text-text-tertiary shrink-0">{a.author_name}</span>
              <span className="text-xs text-text-tertiary shrink-0">
                {new Date(a.created_at).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
