import { useState, useEffect } from 'react';
import { X, ChevronRight, Sparkles } from 'lucide-react';
import api from '../lib/api';

interface WelcomeStep {
  icon: string;
  text: string;
}

interface WelcomeContent {
  title: string;
  subtitle: string;
  steps: WelcomeStep[];
}

const DEFAULT_WELCOME: WelcomeContent = {
  title: '欢迎加入 TeamHub',
  subtitle: '你的团队协作平台已就绪',
  steps: [
    { icon: '📝', text: '发布第一条公告，让团队了解最新动态' },
    { icon: '👥', text: '邀请团队成员，一键分享协作链接' },
    { icon: '⚙️', text: '在设置中配置系统参数，打造专属平台' },
  ],
};

export function WelcomeModal() {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState<WelcomeContent>(DEFAULT_WELCOME);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('welcome_dismissed');
    if (dismissed) return;

    // Fetch custom welcome content
    api.get('/api/settings').then((r: any) => {
      let welcome = DEFAULT_WELCOME;
      if (r.data.welcome_message && typeof r.data.welcome_message === 'object') {
        welcome = {
          title: r.data.welcome_message.title || DEFAULT_WELCOME.title,
          subtitle: r.data.welcome_message.subtitle || DEFAULT_WELCOME.subtitle,
          steps: r.data.welcome_message.steps || DEFAULT_WELCOME.steps,
        };
      }
      setContent(welcome);
      setVisible(true);
      // Trigger fade-in after mount
      requestAnimationFrame(() => setFadeIn(true));
    }).catch(() => {
      setVisible(true);
      requestAnimationFrame(() => setFadeIn(true));
    });
  }, []);

  const dismiss = () => {
    setFadeIn(false);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem('welcome_dismissed', 'true');
    }, 300);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        fadeIn ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent'
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        className={`relative w-full max-w-md rounded-2xl p-8 shadow-2xl transition-all duration-300 ${
          fadeIn ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        style={{ background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            style={{ background: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' }}>
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{content.title}</h2>
          <p className="text-sm text-white/60">{content.subtitle}</p>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-8">
          {content.steps.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-xl transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <span className="text-2xl flex-shrink-0">{step.icon}</span>
              <span className="text-sm text-white/80">{step.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={dismiss}
          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', color: '#1a1a2e' }}
        >
          开始使用
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
