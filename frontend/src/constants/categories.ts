export const ANNOUNCEMENT_CATEGORIES = ['打款', '推广', '合同', '发行', '维权', '审批', '产品'] as const;
export type AnnouncementCategory = typeof ANNOUNCEMENT_CATEGORIES[number];

export const CATEGORY_COLORS: Record<string, string> = {
  '打款': 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  '推广': 'bg-blue-500/10 text-blue-600 border-blue-200',
  '合同': 'bg-violet-500/10 text-violet-600 border-violet-200',
  '发行': 'bg-amber-500/10 text-amber-600 border-amber-200',
  '维权': 'bg-rose-500/10 text-rose-600 border-rose-200',
  '审批': 'bg-orange-500/10 text-orange-600 border-orange-200',
  '产品': 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
};

export const CATEGORY_ICONS: Record<string, string> = {
  '打款': '💰', '推广': '📢', '合同': '📄',
  '发行': '🎵', '维权': '🛡️', '审批': '✅', '产品': '💡',
};

export const ROLE_LABELS: Record<string, string> = {
  admin: '管理员', manager: '主理人', member: '商务', guest: '访客',
};
