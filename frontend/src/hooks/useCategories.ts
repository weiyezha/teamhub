import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

// Default color palette for dynamic categories
const COLOR_PALETTE = [
  'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  'bg-blue-500/10 text-blue-600 border-blue-200',
  'bg-violet-500/10 text-violet-600 border-violet-200',
  'bg-amber-500/10 text-amber-600 border-amber-200',
  'bg-rose-500/10 text-rose-600 border-rose-200',
  'bg-orange-500/10 text-orange-600 border-orange-200',
  'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  'bg-pink-500/10 text-pink-600 border-pink-200',
  'bg-teal-500/10 text-teal-600 border-teal-200',
  'bg-indigo-500/10 text-indigo-600 border-indigo-200',
];

const ICON_PALETTE = ['💰', '📢', '📄', '🎵', '🛡️', '✅', '💡', '📊', '📌', '🔖'];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getCategoryColor(category: string): string {
  return COLOR_PALETTE[hashString(category) % COLOR_PALETTE.length];
}

export function getCategoryIcon(category: string): string {
  return ICON_PALETTE[hashString(category) % ICON_PALETTE.length];
}

export function useCategories() {
  const [categories, setCategories] = useState<string[]>(['打款', '推广', '合同', '发行', '维权', '审批', '产品']);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(() => {
    api.get('/api/categories')
      .then((res: any) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCategories(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, refresh: fetchCategories };
}
