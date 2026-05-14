import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '../lib/api';

interface GlobalSettingsContextType {
  settings: Record<string, any>;
  loading: boolean;
  refresh: () => void;
  getSetting: <T>(key: string, defaultValue: T) => T;
}

const GlobalSettingsContext = createContext<GlobalSettingsContextType>({
  settings: {},
  loading: true,
  refresh: () => {},
  getSetting: <T,>(_key: string, defaultValue: T) => defaultValue,
});

export function GlobalSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(() => {
    api.get('/api/settings')
      .then((res: any) => {
        setSettings(res.data || {});
      })
      .catch(() => {
        // 静默失败，使用默认值
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSettings();
    // 每60秒刷新一次配置
    const interval = setInterval(fetchSettings, 60000);
    return () => clearInterval(interval);
  }, [fetchSettings]);

  const getSetting = useCallback(<T,>(key: string, defaultValue: T): T => {
    const value = settings[key];
    if (value === undefined || value === null) return defaultValue;
    // 类型匹配：如果默认值是数组/对象，尝试解析字符串
    if (typeof defaultValue === 'object' && defaultValue !== null && typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return defaultValue;
      }
    }
    return value as T;
  }, [settings]);

  return (
    <GlobalSettingsContext.Provider value={{ settings, loading, refresh: fetchSettings, getSetting }}>
      {children}
    </GlobalSettingsContext.Provider>
  );
}

export function useGlobalSettings() {
  return useContext(GlobalSettingsContext);
}
