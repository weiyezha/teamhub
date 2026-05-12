import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Music, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import api from '../lib/api';

export function Login() {
  const { login } = useAuth();
  const [appName, setAppName] = useState('TeamHub');
  const [appSubtitle, setAppSubtitle] = useState('Studio Edition');
  const [isRegister, setIsRegister] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.get('/api/settings').then((r: any) => {
      if (r.data.app_name) setAppName(r.data.app_name);
      if (r.data.app_subtitle) setAppSubtitle(r.data.app_subtitle);
    }).catch(() => {});
  }, []);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (isForgotPassword) {
        // Step 1: verify identity and get reset token
        const fpRes = await api.post('/api/auth/forgot-password', {
          username: username.trim(),
          phone: phone.trim(),
        });
        const token = fpRes.data.token;
        // Step 2: reset password with token
        await api.post('/api/auth/reset-password', {
          token,
          new_password: password,
        });
        setSuccess('密码重置成功，请使用新密码登录');
        setIsForgotPassword(false);
        setUsername(''); setPhone(''); setPassword('');
      } else if (isRegister) {
        const res = await api.post('/api/auth/register', { name, password, phone: phone.trim() });
        setSuccess(res.data.message || '注册成功，等待管理员审批');
        setName(''); setPhone(''); setPassword('');
      } else {
        await login(username, password);
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg || JSON.stringify(e)).join('; '));
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('操作失败，请检查网络连接');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.setProperty('--rotateY', `${x * 5}deg`);
    cardRef.current.style.setProperty('--rotateX', `${-y * 5}deg`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--rotateY', '0deg');
    cardRef.current.style.setProperty('--rotateX', '0deg');
  }, []);

  const inputClass = (field: string) => {
    const base = 'w-full h-[52px] px-5 rounded-xl text-[15px] outline-none border transition-all duration-300 placeholder:text-text-tertiary';
    const focus = focusedField === field
      ? 'border-[var(--border-focus)]'
      : 'border-[var(--border-subtle)]';
    return `${base} ${focus}`;
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <div className="noise-overlay absolute inset-0 pointer-events-none" />

      {/* Vertical accent line */}
      <div className="absolute left-1/2 top-0 w-px h-[30vh] opacity-20"
        style={{ background: 'linear-gradient(to bottom, transparent, var(--champagne), transparent)' }} />

      <div ref={cardRef} className="relative z-10 w-full max-w-[440px]" style={{ perspective: 1000 }}
        onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <div
          className="glass-artistic rounded-[24px] p-10 sm:p-12 glow-champagne glow-champagne-hover transition-all duration-500"
          style={{ transform: 'perspective(1000px) rotateX(var(--rotateX, 0deg)) rotateY(var(--rotateY, 0deg))' }}
        >
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--champagne) 0%, var(--champagne-light) 100%)' }}>
                <Music className="w-7 h-7" style={{ color: 'var(--text-inverse)' }} strokeWidth={2} />
              </div>
            </div>
            <h1 className="font-display text-[32px] font-semibold tracking-tight mb-2 text-gradient-champagne">{appName}</h1>
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-8 opacity-20" style={{ background: 'var(--champagne)' }} />
              <p className="text-[13px] tracking-widest uppercase font-medium text-text-tertiary">{appSubtitle}</p>
              <span className="h-px w-8 opacity-20" style={{ background: 'var(--champagne)' }} />
            </div>
          </div>

          {success && (
            <div className="mb-5 p-4 rounded-xl text-sm text-center"
              style={{ backgroundColor: 'var(--trend-positive-bg)', color: 'var(--trend-positive-text)' }}>
              {success}
            </div>
          )}

          {error && (
            <div className="mb-5 p-4 rounded-xl text-sm text-center"
              style={{ backgroundColor: 'var(--trend-negative-bg)', color: 'var(--trend-negative-text)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name field: shown for register and forgot password */}
            {(isRegister || isForgotPassword) && (
              <div>
                <label className="block text-[12px] font-medium uppercase tracking-wider mb-2 text-text-tertiary">
                  {isForgotPassword ? '用户名' : '姓名'}
                </label>
                <input type="text" value={isRegister ? name : username}
                  onChange={e => isRegister ? setName(e.target.value) : setUsername(e.target.value)}
                  onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                  placeholder={isRegister ? '输入姓名（将作为账号）' : '输入用户名'}
                  className={inputClass('name')}
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', boxShadow: focusedField === 'name' ? '0 0 0 4px var(--champagne-muted)' : 'none' }}
                  required />
                {isRegister && (
                  <p className="text-[11px] text-text-tertiary mt-1.5">名字随意，将作为登录账号和显示名</p>
                )}
              </div>
            )}

            {/* Phone field: shown for register and forgot password */}
            {(isRegister || isForgotPassword) && (
              <div>
                <label className="block text-[12px] font-medium uppercase tracking-wider mb-2 text-text-tertiary">手机号</label>
                <input type="tel" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)}
                  placeholder="输入手机号（用于找回密码）" className={inputClass('phone')}
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', boxShadow: focusedField === 'phone' ? '0 0 0 4px var(--champagne-muted)' : 'none' }}
                  required />
                {isRegister && (
                  <p className="text-[11px] text-text-tertiary mt-1.5">手机号用于找回密码，请牢记</p>
                )}
              </div>
            )}

            {/* Username field: only for login */}
            {!isRegister && !isForgotPassword && (
              <div>
                <label className="block text-[12px] font-medium uppercase tracking-wider mb-2 text-text-tertiary">用户名</label>
                <input type="text" value={username}
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                  placeholder="输入用户名" className={inputClass('name')}
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', boxShadow: focusedField === 'name' ? '0 0 0 4px var(--champagne-muted)' : 'none' }}
                  required />
              </div>
            )}

            <div>
              <label className="block text-[12px] font-medium uppercase tracking-wider mb-2 text-text-tertiary">
                {isForgotPassword ? '新密码' : '密码'}
              </label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                  placeholder={isForgotPassword ? '设置新密码（8位+大小写+数字）' : '输入密码'}
                  className={inputClass('password')}
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', boxShadow: focusedField === 'password' ? '0 0 0 4px var(--champagne-muted)' : 'none' }}
                  required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-200 text-text-tertiary">
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-[52px] rounded-xl font-semibold text-[15px] tracking-wide transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 hover:brightness-110 hover:-translate-y-px active:translate-y-0 active:scale-[0.985]"
              style={{ background: 'linear-gradient(135deg, var(--champagne) 0%, var(--champagne-light) 100%)', color: 'var(--text-inverse)' }}>
              {loading ? (
                <div className="w-5 h-5 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'rgba(12,12,16,0.3)', borderTopColor: '#fff' }} />
              ) : (
                isForgotPassword ? '重置密码' : isRegister ? '创建账号' : '登录'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 text-center border-t border-border space-y-2">
            {!isForgotPassword ? (
              <>
                <button onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess(''); setPhone(''); }}
                  className="text-[13px] font-medium transition-colors duration-200 block mx-auto" style={{ color: 'var(--champagne)' }}>
                  {isRegister ? '已有账号？登录' : '没有账号？注册'}
                </button>
                {!isRegister && (
                  <button onClick={() => { setIsForgotPassword(true); setError(''); setSuccess(''); }}
                    className="text-[12px] text-text-tertiary hover:text-text-secondary transition-colors duration-200">
                    忘记密码？
                  </button>
                )}
              </>
            ) : (
              <button onClick={() => { setIsForgotPassword(false); setError(''); setSuccess(''); setUsername(''); setPhone(''); setPassword(''); }}
                className="text-[13px] font-medium transition-colors duration-200 flex items-center justify-center gap-1 mx-auto" style={{ color: 'var(--champagne)' }}>
                <ArrowLeft className="w-4 h-4" /> 返回登录
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
