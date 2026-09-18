import React, { useEffect, useRef, useState } from 'react';
import { Camera, LogIn, UserPlus } from 'lucide-react';
import { idSystemApi } from '../services/idSystemApi';

interface CustomerAuthPageProps {
  onAuthenticated: () => void;
  title?: string;
  description?: string;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void; ux_mode?: 'popup' | 'redirect' }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_SCRIPT_ID = 'google-identity-services';

export const CustomerAuthPage: React.FC<CustomerAuthPageProps> = ({
  onAuthenticated,
  title,
  description
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || isRegisterMode) return;

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return false;
      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        ux_mode: 'popup',
        callback: async (response) => {
          if (!response.credential) {
            setMessage('Google không trả credential.');
            return;
          }
          setIsLoading(true);
          setMessage('');
          try {
            await idSystemApi.auth.google(response.credential);
            onAuthenticated();
          } catch (error) {
            setMessage(error instanceof Error ? error.message : String(error));
          } finally {
            setIsLoading(false);
          }
        }
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left'
      });
      return true;
    };

    if (renderGoogleButton()) return;

    let script = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = GOOGLE_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const interval = window.setInterval(() => {
      if (renderGoogleButton()) {
        window.clearInterval(interval);
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [isRegisterMode, onAuthenticated]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setMessage('Nhập tài khoản và mật khẩu.');
      return;
    }
    if (isRegisterMode && !name.trim()) {
      setMessage('Nhập tên khách hàng.');
      return;
    }

    setIsLoading(true);
    setMessage('');
    try {
      if (isRegisterMode) {
        await idSystemApi.auth.register({
          username: username.trim(),
          password,
          name: name.trim()
        });
      } else {
        await idSystemApi.auth.login(username.trim(), password);
      }
      onAuthenticated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 px-4 py-8">
      <section className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-800 text-white">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-950">{isRegisterMode ? 'Tạo tài khoản' : title || 'Đăng nhập'}</h1>
            <p className="text-xs font-semibold text-slate-500">{description || 'Đăng nhập để xem số dư và nạp tiền.'}</p>
          </div>
        </div>

        {!isRegisterMode && (
          <div className="mb-4">
            {GOOGLE_CLIENT_ID ? (
              <div ref={googleButtonRef} className="min-h-10" />
            ) : (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                Thiếu VITE_GOOGLE_CLIENT_ID để bật đăng nhập Google.
              </div>
            )}
            <div className="mt-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-bold uppercase text-slate-400">hoặc</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-3">
          {isRegisterMode && (
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Tên khách hàng
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-10 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-900"
                placeholder="Nguyễn Văn A"
              />
            </label>
          )}
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            Tài khoản
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-10 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-900"
              placeholder="username"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            Mật khẩu
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="h-10 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-900"
              placeholder="Tối thiểu 8 ký tự khi đăng ký"
            />
          </label>
          {message && <div className="rounded-md bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{message}</div>}
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-bold text-white disabled:bg-slate-400"
          >
            {isRegisterMode ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {isRegisterMode ? 'Đăng ký và vào app' : 'Đăng nhập'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsRegisterMode((value) => !value);
            setMessage('');
          }}
          className="mt-3 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          {isRegisterMode ? 'Tôi đã có tài khoản' : 'Tạo tài khoản mới'}
        </button>
      </section>
    </main>
  );
};
