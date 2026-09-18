import React from 'react';
import { Camera, LayoutDashboard, Palette, ShieldCheck, LogOut, Lock } from 'lucide-react';

interface AppNavProps {
  currentView?: 'editor' | 'library' | 'preview';
  isAdminAuthenticated?: boolean;
  onOpenAdminLogin?: () => void;
  onLogoutAdmin?: () => void;
  onNavigateView?: (view: 'editor' | 'library') => void;
}

export const AppNav: React.FC<AppNavProps> = ({
  currentView = 'editor',
  isAdminAuthenticated = false,
  onOpenAdminLogin,
  onLogoutAdmin,
  onNavigateView
}) => {
  return (
    <header className="flex min-h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-800 text-white shadow-sm">
          <Camera className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-tight text-slate-900">Photobooth Design</p>
          <p className="truncate text-[10px] font-semibold text-slate-500">Thiết kế khung hình photobooth</p>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-inner">
          <button
            type="button"
            onClick={() => onNavigateView?.('editor')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              currentView === 'editor'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palette className="h-3.5 w-3.5 text-rose-600" />
            <span>Thiết kế</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isAdminAuthenticated) {
                onOpenAdminLogin?.();
              } else {
                onNavigateView?.('library');
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              currentView === 'library'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5 text-indigo-600" />
            <span>Quản trị Thư viện</span>
            {!isAdminAuthenticated && (
              <Lock className="h-3 w-3 text-slate-400 ml-0.5" />
            )}
          </button>
        </div>

        {/* Admin status & actions */}
        {isAdminAuthenticated ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </span>
            <button
              type="button"
              onClick={onLogoutAdmin}
              title="Đăng xuất quyền Quản trị viên"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Thoát Admin</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAdminLogin}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm ml-2"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
            <span>Quản trị viên</span>
          </button>
        )}
      </div>
    </header>
  );
};

