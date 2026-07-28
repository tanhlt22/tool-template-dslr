import React, { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';

interface SaveFrameModalProps {
  isOpen: boolean;
  defaultName: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (name: string, password?: string) => void;
}

export const SaveFrameModal: React.FC<SaveFrameModalProps> = ({
  isOpen,
  defaultName,
  isSaving,
  onClose,
  onSave
}) => {
  const [name, setName] = useState(defaultName || '');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(defaultName || '');
      setPassword('');
    }
  }, [defaultName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(name.trim(), password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-black text-slate-950">Luu mau frame</h2>
            <p className="text-xs font-medium text-slate-500">Nhap ten mau de luu vao thu vien frame.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Dong"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label htmlFor="save-frame-name" className="mb-1 block text-xs font-bold text-slate-700">
              Ten mau frame
            </label>
            <input
              id="save-frame-name"
              type="text"
              value={name}
              autoFocus
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-100"
            />
          </div>
          <div>
            <label htmlFor="save-frame-password" className="mb-1 block text-xs font-bold text-slate-700">
              Mat khau xac nhan
            </label>
            <input
              id="save-frame-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhap mat khau de luu..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-100"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            Huy
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-md bg-rose-800 px-4 py-2 text-sm font-bold text-white hover:bg-rose-900 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isSaving ? 'Dang luu...' : 'Luu mau'}
          </button>
        </div>
      </form>
    </div>
  );
};
