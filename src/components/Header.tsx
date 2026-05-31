import React from 'react';
import { Sparkles, Wifi, WifiOff, DownloadCloud, LogOut, Menu, Settings } from 'lucide-react';

interface HeaderProps {
  isOnline: boolean;
  isInstalled: boolean;
  isInstallable: boolean;
  onTriggerInstall: () => void;
  activeStudio: 'ai' | 'dslrbooth';
  onChangeStudio: (studio: 'ai' | 'dslrbooth') => void;
  frameName: string;
  onFrameNameChange: (val: string) => void;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
  onToggleInspector?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isOnline,
  isInstalled,
  isInstallable,
  onTriggerInstall,
  activeStudio,
  onChangeStudio,
  frameName,
  onFrameNameChange,
  onLogout,
  onToggleSidebar,
  onToggleInspector
}) => {
  return (
    <header className="min-h-16 py-2 sm:py-0 shrink-0 glass-panel border-[#dee8ff] border-b flex flex-row items-center justify-between px-3 sm:px-6 gap-2 z-10 overflow-x-auto custom-scrollbar">
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {activeStudio === 'ai' && onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 bg-[#f0f3ff] hover:bg-[#dee8ff]/60 border border-[#dee8ff]/50 rounded-xl text-[#0058be] shrink-0"
            title="Menu Cấu Hình"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        {activeStudio === 'ai' && onToggleInspector && (
          <button
            onClick={onToggleInspector}
            className="md:hidden p-2 bg-[#f0f3ff] hover:bg-[#dee8ff]/60 border border-[#dee8ff]/50 rounded-xl text-emerald-650 shrink-0"
            title="Thuộc tính & Thư viện"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
        <div className="bg-[#0058be] p-1.5 sm:p-2 rounded-xl text-white shadow-md shadow-[#0058be]/15 shrink-0">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
        </div>
        <div className="leading-tight">
          <h1 className="font-black text-xs sm:text-base text-[#111c2d]">
            LumiBooth <span className="text-[#0058be]">AI</span>
          </h1>
          <p className="text-[8px] text-slate-400 font-semibold hidden md:block">Thiết kế Khung Ảnh PWA 100%</p>
        </div>
      </div>

      {/* ✏️ Design Name Input (Premium Canva-style top title) */}
      {activeStudio === 'ai' && (
        <div className="flex items-center gap-2 border-l border-[#dee8ff] pl-4 ml-2 max-w-[160px] sm:max-w-[280px] hidden sm:flex shrink">
          <input
            type="text"
            value={frameName}
            onChange={(e) => onFrameNameChange(e.target.value)}
            placeholder="Tên thiết kế..."
            className="bg-[#f0f3ff] hover:bg-[#dee8ff]/40 focus:bg-white border border-[#dee8ff]/50 focus:border-[#0058be]/50 rounded-xl px-3 py-1.5 text-xs font-bold text-[#111c2d] w-full focus:outline-none transition-all truncate"
            title="Tên Frame Thiết Kế"
          />
        </div>
      )}

      {/* 🚀 Segmented Control for Studio Modes */}
      <div className="flex bg-[#f0f3ff] border border-[#dee8ff] rounded-full p-0.5 sm:p-1 shadow-sm shrink-0">
        <button
          onClick={() => onChangeStudio('ai')}
          className={`flex items-center gap-1 px-2.5 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black transition-all ${activeStudio === 'ai'
              ? 'bg-[#0058be] text-white shadow-md shadow-[#0058be]/10'
              : 'text-slate-500 hover:text-[#0058be]'
            }`}
        >
          <span>Studio AI</span>
        </button>
        <button
          onClick={() => onChangeStudio('dslrbooth')}
          className={`flex items-center gap-1 px-2.5 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black transition-all ${activeStudio === 'dslrbooth'
              ? 'bg-[#0058be] text-white shadow-md shadow-[#0058be]/10'
              : 'text-slate-500 hover:text-[#0058be]'
            }`}
        >
          <span>DSLRbooth</span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Connection status */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] sm:text-xs font-bold ${isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'bg-rose-50 text-rose-700 border border-rose-200/50'
          }`}>
          {isOnline ? <Wifi className="w-3 h-3 text-emerald-650" /> : <WifiOff className="w-3 h-3 text-rose-650" />}
          <span className="hidden sm:inline">{isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
        </div>

        {/* PWA custom download */}
        {isInstallable && !isInstalled && (
          <button
            onClick={onTriggerInstall}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] sm:text-xs font-bold bg-[#0058be] hover:bg-[#004395] text-white shadow-md shadow-[#0058be]/10 transition-all active:scale-95 animate-pulse"
          >
            <DownloadCloud className="w-3 h-3" />
            <span className="hidden xs:inline">Cài đặt App</span>
          </button>
        )}

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] sm:text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/50 shadow-sm transition-all active:scale-95"
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        )}
      </div>
    </header>
  );
};
export default Header;
