'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface PromptOptions {
  title?: string;
  message: string;
  placeholder?: string;
  type?: 'text' | 'password';
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
}

interface UIContextType {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (options: ConfirmOptions | string) => Promise<boolean>;
  showPrompt: (options: PromptOptions | string) => Promise<string | null>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    options: PromptOptions;
    value: string;
    resolve: (value: string | null) => void;
  } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      setConfirmState({
        isOpen: true,
        options: {
          title: opts.title || 'Xác nhận',
          message: opts.message,
          confirmText: opts.confirmText || 'Đồng ý',
          cancelText: opts.cancelText || 'Hủy',
        },
        resolve,
      });
    });
  }, []);

  const handleConfirmAction = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  const showPrompt = useCallback((options: PromptOptions | string) => {
    return new Promise<string | null>((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      setPromptState({
        isOpen: true,
        options: {
          title: opts.title || 'Nhập thông tin',
          message: opts.message,
          placeholder: opts.placeholder || '',
          type: opts.type || 'text',
          confirmText: opts.confirmText || 'Xác nhận',
          cancelText: opts.cancelText || 'Hủy',
        },
        value: opts.defaultValue || '',
        resolve,
      });
    });
  }, []);

  const handlePromptAction = (result: boolean) => {
    if (promptState) {
      promptState.resolve(result ? promptState.value : null);
      setPromptState(null);
    }
  };

  return (
    <UIContext.Provider value={{ showToast, showConfirm, showPrompt }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg border animate-slide-up bg-white`}
            style={{ minWidth: '300px' }}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500 shrink-0" />}
            
            <p className="text-sm font-semibold text-slate-700 flex-1">{toast.message}</p>
            
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirmState && confirmState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 w-full max-w-sm overflow-hidden animate-zoom-in">
            <div className="p-6">
              <h3 className="text-lg font-black text-slate-800 mb-2">{confirmState.options.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">{confirmState.options.message}</p>
            </div>
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
              <button
                onClick={() => handleConfirmAction(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
              >
                {confirmState.options.cancelText}
              </button>
              <button
                onClick={() => handleConfirmAction(true)}
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
              >
                {confirmState.options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Dialog */}
      {promptState && promptState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 w-full max-w-sm overflow-hidden animate-zoom-in">
            <div className="p-6">
              <h3 className="text-lg font-black text-slate-800 mb-2">{promptState.options.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium mb-4">{promptState.options.message}</p>
              <input
                type={promptState.options.type}
                value={promptState.value}
                onChange={(e) => setPromptState({ ...promptState, value: e.target.value })}
                placeholder={promptState.options.placeholder}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePromptAction(true);
                  if (e.key === 'Escape') handlePromptAction(false);
                }}
              />
            </div>
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2">
              <button
                onClick={() => handlePromptAction(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
              >
                {promptState.options.cancelText}
              </button>
              <button
                onClick={() => handlePromptAction(true)}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                {promptState.options.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
