import React from 'react';
import { Sparkles, Wifi, WifiOff, DownloadCloud, LogOut, Menu, Settings } from 'lucide-react';

interface HeaderProps {
  isOnline: boolean;
  isInstalled: boolean;
  isInstallable: boolean;
  onTriggerInstall: () => void;
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
  frameName,
  onFrameNameChange,
  onLogout,
  onToggleSidebar,
  onToggleInspector
}) => {
  return (
    <header className="min-h-16 py-2 sm:py-0 shrink-0 bg-white/95 backdrop-blur-md border-[#dee8ff] border-b flex flex-row items-center justify-between px-3 sm:px-6 gap-2 z-10 overflow-x-auto custom-scrollbar shadow-sm">
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 bg-[#f0f3ff] hover:bg-[#dee8ff]/60 border border-[#dee8ff]/50 rounded-xl text-[#0058be] shrink-0"
            title="Mở thanh công cụ"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        {onToggleInspector && (
          <button
            onClick={onToggleInspector}
            className="md:hidden p-2 bg-[#f0f3ff] hover:bg-[#dee8ff]/60 border border-[#dee8ff]/50 rounded-xl text-emerald-600 shrink-0"
            title="Mở thuộc tính"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        <img
          src="/logo/Black Minimal Photography Logo (512 x 512 px).png"
          alt="Pica Design"
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-contain bg-white border border-[#dee8ff] p-0.5 shadow-sm shrink-0"
        />
        <div className="leading-tight">
          <h1 className="font-black text-xs sm:text-base text-[#111c2d]">
            Pica <span className="text-[#0058be]">Design</span>
          </h1>
          <p className="text-[8px] text-slate-400 font-semibold hidden md:block">Studio thiết kế mẫu photobooth</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-l border-[#dee8ff] pl-4 ml-2 max-w-[160px] sm:max-w-[320px] hidden sm:flex shrink">
        <input
          type="text"
          value={frameName}
          onChange={(e) => onFrameNameChange(e.target.value)}
          placeholder="Tên mẫu thiết kế..."
          className="bg-[#f0f3ff] hover:bg-[#dee8ff]/40 focus:bg-white border border-[#dee8ff]/50 focus:border-[#0058be]/50 rounded-xl px-3 py-1.5 text-xs font-bold text-[#111c2d] w-full focus:outline-none transition-all truncate"
          title="Tên mẫu thiết kế"
        />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] sm:text-xs font-bold ${isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'bg-rose-50 text-rose-700 border border-rose-200/50'}`}>
          {isOnline ? <Wifi className="w-3 h-3 text-emerald-600" /> : <WifiOff className="w-3 h-3 text-rose-600" />}
          <span className="hidden sm:inline font-sans">{isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}</span>
        </div>

        {isInstallable && !isInstalled && (
          <button
            onClick={onTriggerInstall}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] sm:text-xs font-bold bg-[#0058be] hover:bg-[#004395] text-white shadow-md shadow-[#0058be]/10 transition-all active:scale-95 animate-pulse font-sans"
          >
            <DownloadCloud className="w-3 h-3" />
            <span className="hidden xs:inline">Cài đặt</span>
          </button>
        )}

        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] sm:text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/50 shadow-sm transition-all active:scale-95 font-sans"
            title="Đăng xuất"
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
