import React, { useState } from 'react';
import { Camera, ShieldCheck, KeyRound, Smartphone, Loader2, ArrowRight, UserCheck, Lock, LogIn, UserPlus } from 'lucide-react';

interface LoginModalProps {
  onSuccess: (username: string) => void;
}

export function LoginModal({ onSuccess }: LoginModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<1 | 2>(1);
  
  // Form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auth response states
  const [signature, setSignature] = useState('');
  const [expire, setExpire] = useState(0);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Vui lòng nhập Tên tài khoản');
      return;
    }
    if (!password.trim()) {
      setError('Vui lòng nhập Mật khẩu');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(),
          password: password.trim(),
          type: mode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Thao tác xác thực thất bại');
      }

      if (data.directLogin) {
        // Active accounts log in immediately without OTP!
        localStorage.setItem('lumibooth_auth_token', data.token);
        localStorage.setItem('lumibooth_username', data.username);
        localStorage.setItem('lumibooth_role', data.role || 'user');
        onSuccess(data.username);
      } else {
        // New signups require OTP code activation
        setSignature(data.signature);
        setExpire(data.expire);
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('Vui lòng nhập đầy đủ mã OTP kích hoạt gồm 6 chữ số');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          otp: otp.trim(),
          signature,
          expire,
          type: 'register'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Mã kích hoạt không chính xác');
      }

      // Save token to localStorage
      localStorage.setItem('lumibooth_auth_token', data.token);
      localStorage.setItem('lumibooth_username', data.username);
      localStorage.setItem('lumibooth_role', data.role || 'user');
      
      // Trigger callback
      onSuccess(data.username);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />

      {/* Main glassmorphic card */}
      <div className="relative w-full max-w-md bg-white/70 backdrop-blur-2xl border border-slate-200/40 rounded-3xl shadow-2xl p-8 md:p-10 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/logo/Black Minimal Photography Logo (512 x 512 px).png"
            alt="Pica Design"
            className="w-16 h-16 rounded-2xl object-contain bg-white border border-slate-200/80 p-1 shadow-lg shadow-blue-500/10 mb-3 active:scale-95 transition-transform duration-200"
          />
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight font-sans">
            Pica Design Workspace
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5 font-sans">
            Hệ thống quản lý tài khoản thiết kế
          </p>
        </div>

        {/* Tab Selection (Only shown when not entering OTP) */}
        {step === 1 && (
          <div className="flex bg-[#f0f3ff] border border-slate-200/50 rounded-2xl p-1 mb-6 shadow-sm">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-500 hover:text-blue-600'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
            <button
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                  : 'text-slate-500 hover:text-blue-600'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Đăng ký mới</span>
            </button>
          </div>
        )}

        {/* Step 1: Input Credentials */}
        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div className="space-y-4">
              {/* Username field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 font-sans">
                  Tên tài khoản
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Nhập tài khoản (vd: email hoặc số đt)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/60 border border-slate-200/60 rounded-2xl text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/80 transition-all duration-200 text-sm font-sans"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 font-sans">
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/60 border border-slate-200/60 rounded-2xl text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/80 transition-all duration-200 text-sm font-sans"
                  />
                </div>
              </div>

              {mode === 'register' ? (
                <p className="text-[11px] font-bold text-[#0058be] leading-relaxed font-sans">
                  * Kích hoạt qua Telegram: Sau khi điền thông tin đăng ký, yêu cầu kích hoạt kèm mã OTP sẽ được gửi riêng tới Telegram của Admin để xét duyệt tài khoản của bạn.
                </p>
              ) : (
                <p className="text-[11px] font-bold text-slate-400/85 leading-relaxed font-sans">
                  * Nhập tài khoản và mật khẩu của bạn để đăng nhập trực tiếp (nếu tài khoản đã được kích hoạt trước đó).
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50/50 border border-red-200/50 text-red-600 text-xs font-bold py-3 px-4 rounded-xl flex items-center gap-2 font-sans animate-shake">
                <ShieldCheck className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 text-sm font-sans"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Đăng nhập Ngay' : 'Đăng ký & Kích hoạt'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: Input OTP */
          <form onSubmit={handleVerifyOTP} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wide text-slate-500 font-sans">
                Nhập mã KÍCH HOẠT từ Admin (6 số)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="xxxxxx"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-12 pr-4 py-4 bg-white/60 border border-slate-200/60 rounded-2xl text-center text-2xl font-extrabold tracking-widest text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/80 transition-all duration-200 font-sans"
                />
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 mt-2 font-sans">
                <span>Tài khoản: <strong className="text-slate-600">{username}</strong></span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-blue-600 hover:underline"
                >
                  Quay lại
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50/50 border border-red-200/50 text-red-600 text-xs font-bold py-3 px-4 rounded-xl flex items-center gap-2 font-sans animate-shake">
                <ShieldCheck className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 text-sm font-sans"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <UserCheck className="w-5 h-5" />
                  <span>Xác nhận & Hoàn tất kích hoạt</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
