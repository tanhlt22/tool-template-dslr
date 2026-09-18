import React, { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { CoupleTab } from './dslrbooth/CoupleTab';
import { OperatorTab } from './dslrbooth/OperatorTab';
import { AdminTab } from './dslrbooth/AdminTab';
import { DSLRboothStudioProps } from './dslrbooth/types';

export const DSLRboothStudio: React.FC<DSLRboothStudioProps> = ({ onBackToStudio, onLoadTemplateToStudioAI }) => {
  const [activeTab, setActiveTab] = useState<'couple' | 'operator' | 'admin'>('couple');
  const [userRole, setUserRole] = React.useState<string>('user');

  React.useEffect(() => {
    const role = localStorage.getItem('lumibooth_role') || 'user';
    setUserRole(role);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#f8faff] overflow-y-auto md:overflow-hidden h-full">
      
      {/* 🚀 Top Navigation Dashboard (Giao diện kính mờ cao cấp, responsive di động) */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-[#dee8ff]/60 py-4 px-4 sm:px-8 flex flex-col lg:flex-row justify-between lg:items-center gap-4 shrink-0 shadow-[0_2px_20px_rgba(0,88,190,0.02)] z-10">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="bg-[#0058be]/10 text-[#0058be] text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest flex items-center gap-1 shadow-sm border border-[#0058be]/10">
              <Sparkles className="w-3 h-3 text-[#0058be] animate-pulse" />
              PWA Mobile-Ready
            </span>
            <h2 className="text-base sm:text-lg font-black text-[#111c2d] uppercase tracking-wider flex items-center gap-1.5">
              Tạo Frame DSLRbooth Di Động
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 font-semibold mt-1 hidden sm:block">
            Thiết kế tự động trên điện thoại, xuất file đục lỗ ZIP nạp 1-Click khớp 100% vào DSLRbooth / LumaBooth.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex bg-[#f0f3ff] border border-[#dee8ff]/80 rounded-full p-1 shadow-inner justify-center">
            <button
              onClick={() => setActiveTab('couple')}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'couple' 
                  ? 'bg-gradient-to-r from-[#0058be] to-[#2170e4] text-white shadow-md shadow-[#0058be]/15 transform scale-[1.02]' 
                  : 'text-slate-500 hover:text-[#0058be] hover:bg-white/40'
              }`}
            >
              👰 Dâu Rể Điền
            </button>
            <button
              onClick={() => setActiveTab('operator')}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === 'operator' 
                  ? 'bg-gradient-to-r from-[#0058be] to-[#2170e4] text-white shadow-md shadow-[#0058be]/15 transform scale-[1.02]' 
                  : 'text-slate-500 hover:text-[#0058be] hover:bg-white/40'
              }`}
            >
              🛠️ Kỹ Thuật (Auto)
            </button>
            {userRole === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 sm:px-4 py-2 rounded-full text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === 'admin' 
                    ? 'bg-gradient-to-r from-[#0058be] to-[#2170e4] text-white shadow-md shadow-[#0058be]/15 transform scale-[1.02]' 
                    : 'text-slate-500 hover:text-[#0058be] hover:bg-white/40'
                }`}
              >
                ⚙️ Quản Trị Mẫu
              </button>
            )}
          </div>

          <button
            onClick={onBackToStudio}
            className="px-5 py-2 border border-[#dee8ff] hover:border-[#0058be] bg-white text-slate-600 hover:text-[#0058be] rounded-2xl text-xs font-black transition-all hover:scale-[1.03] active:scale-95 shadow-sm flex items-center justify-center gap-1.5"
          >
            Quay Lại Studio AI
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden h-full">
        {activeTab === 'couple' ? (
          <CoupleTab />
        ) : activeTab === 'operator' ? (
          <OperatorTab />
        ) : (
          <AdminTab onLoadTemplateToStudioAI={onLoadTemplateToStudioAI} />
        )}
      </div>
    </div>
  );
};

export default DSLRboothStudio;
