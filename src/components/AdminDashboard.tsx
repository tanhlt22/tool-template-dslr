import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Brain,
  CheckCircle2,
  Cloud,
  Home,
  LayoutDashboard,
  ReceiptText,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  XCircle
} from 'lucide-react';
import {
  AdminInvoice,
  AiGenerationSetting,
  CloudinaryAccount,
  getIdSystemSettings,
  idSystemApi,
  IdSystemSettings,
  saveIdSystemSettings
} from '../services/idSystemApi';

interface AdminDashboardProps {
  onOpenEditor: () => void;
}

type AdminTab = 'overview' | 'invoices' | 'ai' | 'storage' | 'settings';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

const navItems: Array<{ id: AdminTab; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'invoices', label: 'Thanh toán', icon: ReceiptText },
  { id: 'ai', label: 'AI', icon: Brain },
  { id: 'storage', label: 'Lưu trữ đám mây', icon: Cloud },
  { id: 'settings', label: 'Cấu hình', icon: Settings }
];

const defaultAiForm = {
  type: 'frame_background',
  name: 'AI Frame Background',
  cost_credits: 10000,
  provider: 'gemini',
  model: 'imagen-3.0-generate-002',
  api_key: '',
  status: 'active'
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenEditor }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [settings, setSettings] = useState<IdSystemSettings>(() => getIdSystemSettings());
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [cloudinaryAccounts, setCloudinaryAccounts] = useState<CloudinaryAccount[]>([]);
  const [aiSettings, setAiSettings] = useState<AiGenerationSetting[]>([]);
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiForm, setAiForm] = useState(defaultAiForm);
  const [editingAiType, setEditingAiType] = useState<string | null>(null);
  const [cloudinaryForm, setCloudinaryForm] = useState({
    cloud_name: '',
    upload_preset: 'photobooth-template',
    folder_prefix: 'frames',
    storage_limit_mb: 10240,
    priority: 100,
    status: 'active'
  });

  const canUseAdminApi = Boolean(settings.apiBaseUrl && settings.userToken && idSystemApi.settings.isAdmin());
  const pendingInvoices = useMemo(() => invoices.filter((invoice) => invoice.status === 'pending'), [invoices]);
  const activeCloudinary = useMemo(() => cloudinaryAccounts.filter((account) => account.status === 'active'), [cloudinaryAccounts]);
  const activeAiSetting = useMemo(
    () => aiSettings.find((item) => item.type === 'frame_background') || aiSettings[0],
    [aiSettings]
  );
  const storageUsed = useMemo(
    () => cloudinaryAccounts.reduce((sum, account) => sum + (account.storage_used_mb || 0), 0),
    [cloudinaryAccounts]
  );
  const storageLimit = useMemo(
    () => cloudinaryAccounts.reduce((sum, account) => sum + (account.storage_limit_mb || 0), 0),
    [cloudinaryAccounts]
  );

  const loadPrivateData = useCallback(async () => {
    if (!idSystemApi.settings.isAdmin()) {
      setMessage('Tài khoản hiện tại không có quyền admin.');
      return;
    }
    const [invoicePage, accountData, aiData] = await Promise.all([
      idSystemApi.admin.invoices(invoiceStatus || undefined),
      idSystemApi.admin.cloudinaryAccounts(),
      idSystemApi.admin.aiSettings()
    ]);
    setInvoices(invoicePage.data);
    setCloudinaryAccounts(accountData);
    setAiSettings(aiData);
    const frameSetting = aiData.find((item) => item.type === 'frame_background') || aiData[0];
    if (frameSetting) {
      setAiForm({
        type: frameSetting.type,
        name: frameSetting.name,
        cost_credits: frameSetting.cost_credits,
        provider: frameSetting.provider || 'gemini',
        model: frameSetting.model || '',
        api_key: '',
        status: frameSetting.status || 'active'
      });
      setEditingAiType(frameSetting.type);
    }
  }, [invoiceStatus]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setMessage('');
    try {
      await loadPrivateData();
      setMessage('Đã tải dữ liệu admin.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }, [loadPrivateData]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSaveSettings = () => {
    saveIdSystemSettings(settings);
    setMessage('Đã lưu cấu hình admin.');
    void refresh();
  };

  const handleInvoiceAction = async (invoiceId: string, action: 'confirm' | 'reject') => {
    setIsLoading(true);
    setMessage('');
    try {
      if (action === 'confirm') {
        await idSystemApi.admin.confirmInvoice(invoiceId, 'Xác nhận từ tool admin');
      } else {
        await idSystemApi.admin.rejectInvoice(invoiceId, 'Từ chối từ tool admin');
      }
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAiSetting = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      await idSystemApi.admin.saveAiSetting({
        ...aiForm,
        cost_credits: Math.max(1, Number(aiForm.cost_credits || 1)),
        model: aiForm.model || undefined,
        api_key: aiForm.api_key.trim() || undefined
      });
      await refresh();
      setEditingAiType(aiForm.type);
      setMessage('Đã lưu cấu hình AI.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAiSetting = (item: AiGenerationSetting) => {
    setAiForm({
      type: item.type,
      name: item.name,
      cost_credits: item.cost_credits,
      provider: item.provider || 'gemini',
      model: item.model || '',
      api_key: '',
      status: item.status || 'active'
    });
    setEditingAiType(item.type);
    setMessage(`Đang sửa cấu hình ${item.type}.`);
  };

  const handleNewAiSetting = () => {
    setAiForm(defaultAiForm);
    setEditingAiType(null);
    setMessage('Đang tạo cấu hình AI mới.');
  };

  const handleDeleteAiSetting = async (type: string) => {
    if (!window.confirm(`Xóa cấu hình AI "${type}"?`)) return;
    setIsLoading(true);
    setMessage('');
    try {
      await idSystemApi.admin.deleteAiSetting(type);
      if (editingAiType === type) {
        setAiForm(defaultAiForm);
        setEditingAiType(null);
      }
      await refresh();
      setMessage('Đã xóa cấu hình AI.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCloudinary = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      await idSystemApi.admin.createCloudinaryAccount(cloudinaryForm);
      setCloudinaryForm({
        cloud_name: '',
        upload_preset: 'photobooth-template',
        folder_prefix: 'frames',
        storage_limit_mb: 10240,
        priority: 100,
        status: 'active'
      });
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const renderOverview = () => (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase text-slate-500">Invoice chờ xử lý</p>
        <p className="mt-2 text-3xl font-black text-slate-950">{pendingInvoices.length}</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase text-slate-500">Giá sinh ảnh AI</p>
        <p className="mt-2 text-3xl font-black text-slate-950">{currency.format(activeAiSetting?.cost_credits || 10000)}</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase text-slate-500">Hệ thống lưu trữ</p>
        <p className="mt-2 text-2xl font-black text-emerald-600">Cloud Storage</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase text-slate-500">Trạng thái Cloud</p>
        <p className="mt-2 text-2xl font-black text-slate-950">Hoạt động tốt</p>
      </div>
    </section>
  );

  const renderInvoices = () => (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">Quản lý thanh toán</h2>
        <select
          value={invoiceStatus}
          onChange={(event) => setInvoiceStatus(event.target.value)}
          className="h-9 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-900"
        >
          <option value="">Tất cả</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-3">Mã</th>
              <th className="py-2 pr-3">Số tiền</th>
              <th className="py-2 pr-3">Method</th>
              <th className="py-2 pr-3">Trạng thái</th>
              <th className="py-2 pr-3">Ngày tạo</th>
              <th className="py-2 pr-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-b border-slate-100">
                <td className="py-2 pr-3 font-bold text-slate-900">{invoice.code}</td>
                <td className="py-2 pr-3">{currency.format(invoice.amount)}</td>
                <td className="py-2 pr-3">{invoice.payment_method || '--'}</td>
                <td className="py-2 pr-3">{invoice.status}</td>
                <td className="py-2 pr-3">{invoice.created_at || '--'}</td>
                <td className="flex gap-2 py-2 pr-3">
                  <button
                    type="button"
                    disabled={invoice.status !== 'pending'}
                    onClick={() => handleInvoiceAction(invoice.id, 'confirm')}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-emerald-200 px-2 text-xs font-bold text-emerald-700 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirm
                  </button>
                  <button
                    type="button"
                    disabled={invoice.status !== 'pending'}
                    onClick={() => handleInvoiceAction(invoice.id, 'reject')}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-rose-200 px-2 text-xs font-bold text-rose-700 disabled:opacity-40"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderAiSettings = () => (
    <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">
              {editingAiType ? 'Sửa cấu hình AI' : 'Thêm cấu hình AI'}
            </h2>
            {editingAiType && <p className="mt-1 text-xs font-semibold text-slate-500">Type: {editingAiType}</p>}
          </div>
          <button
            type="button"
            onClick={handleNewAiSetting}
            className="inline-flex h-8 items-center rounded-md border border-slate-300 px-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Tạo mới
          </button>
        </div>
        <div className="grid gap-3">
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            Loại AI
            <input
              value={aiForm.type}
              onChange={(event) => setAiForm((prev) => ({ ...prev, type: event.target.value }))}
              className="h-9 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-900"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            Tên hiển thị
            <input
              value={aiForm.name}
              onChange={(event) => setAiForm((prev) => ({ ...prev, name: event.target.value }))}
              className="h-9 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-900"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            Giá mỗi lần generate
            <input
              type="number"
              min={1}
              value={aiForm.cost_credits}
              onChange={(event) => setAiForm((prev) => ({ ...prev, cost_credits: Number(event.target.value) }))}
              className="h-9 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-900"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Provider
              <input
                value={aiForm.provider}
                onChange={(event) => setAiForm((prev) => ({ ...prev, provider: event.target.value }))}
                className="h-9 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-900"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-600">
              Model
              <input
                value={aiForm.model}
                onChange={(event) => setAiForm((prev) => ({ ...prev, model: event.target.value }))}
                className="h-9 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-900"
                placeholder="imagen-3.0-generate-002"
              />
            </label>
          </div>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            AI API key
            <input
              type="password"
              value={aiForm.api_key}
              onChange={(event) => setAiForm((prev) => ({ ...prev, api_key: event.target.value }))}
              className="h-9 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-900"
              placeholder={activeAiSetting?.api_key_masked || 'Nhập key mới'}
              autoComplete="off"
            />
            <span className="text-[11px] font-semibold text-slate-500">
              {activeAiSetting?.has_api_key ? `Đang lưu: ${activeAiSetting.api_key_masked}` : 'Chưa cấu hình API key'}
            </span>
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            Trạng thái
            <select
              value={aiForm.status}
              onChange={(event) => setAiForm((prev) => ({ ...prev, status: event.target.value }))}
              className="h-9 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-900"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <button
            type="button"
            disabled={!canUseAdminApi || isLoading}
            onClick={handleSaveAiSetting}
            className="inline-flex h-9 w-fit items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Save className="h-4 w-4" />
            {editingAiType ? 'Lưu chỉnh sửa' : 'Thêm cấu hình'}
          </button>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-800">Cấu hình hiện tại</h2>
        <div className="grid gap-2">
          {aiSettings.map((item) => (
            <div
              key={item.type}
              className={`rounded-md border p-3 text-sm ${editingAiType === item.type ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="font-black text-slate-900">{item.name}</div>
              <div className="text-slate-600">{item.type} - {currency.format(item.cost_credits)}/lần - {item.status}</div>
              <div className="text-slate-500">{item.provider || '--'} {item.model ? `- ${item.model}` : ''}</div>
              <div className="text-slate-500">{item.has_api_key ? `API key: ${item.api_key_masked}` : 'Chưa có API key'}</div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAiSetting(item)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  Sửa
                </button>
                <button
                  type="button"
                  disabled={!canUseAdminApi || isLoading}
                  onClick={() => handleDeleteAiSetting(item.type)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-rose-200 px-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa
                </button>
              </div>
            </div>
          ))}
          {aiSettings.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-300 p-3 text-sm font-semibold text-slate-500">
              Chưa có cấu hình trong DB. Bấm lưu để tạo cấu hình mặc định.
            </div>
          )}
        </div>
      </div>
    </section>
  );

  const renderStorage = () => (
    <section className="grid gap-4">
      <div className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">Hệ thống lưu trữ đám mây (Cloud Storage)</h2>
            <p className="text-xs text-slate-500 mt-0.5">Lưu trữ ảnh mẫu, tài nguyên và cấu hình tự động qua hạ tầng Edge Cloud</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Đang hoạt động (Online)
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Endpoint Lưu Trữ Cloud</span>
            <p className="mt-1 font-mono text-xs font-semibold text-slate-800 break-all">
              https://frame-storage-proxy.toashop2002.workers.dev
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chất lượng hiển thị</span>
            <p className="mt-1 text-xs font-bold text-slate-800">
              100% Độ phân giải gốc không nén
            </p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tốc độ & CDN</span>
            <p className="mt-1 text-xs font-bold text-slate-800">
              Edge Cache toàn cầu (Tối ưu tải tức thì)
            </p>
          </div>
        </div>
      </div>

      {cloudinaryAccounts.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-800">Tài khoản lưu trữ mở rộng</h2>
          <div className="grid gap-2">
            {cloudinaryAccounts.map((account) => (
              <div key={account.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <div className="font-black text-slate-900">{account.cloud_name}</div>
                <div className="text-slate-600">{account.storage_used_mb}/{account.storage_limit_mb} MB - {account.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );

  const renderSettings = () => (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-800">Cấu hình backend</h2>
      <div className="grid max-w-2xl gap-3">
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          ID System URL
          <input
            value={settings.apiBaseUrl}
            onChange={(event) => setSettings((prev) => ({ ...prev, apiBaseUrl: event.target.value }))}
            className="h-9 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-900"
            placeholder="http://localhost:8081"
          />
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          Client ID
          <input
            value={settings.clientId}
            onChange={(event) => setSettings((prev) => ({ ...prev, clientId: event.target.value }))}
            className="h-9 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-900"
            placeholder="tool-template-dslr"
          />
        </label>
        <button
          type="button"
          onClick={handleSaveSettings}
          className="inline-flex h-9 w-fit items-center gap-2 rounded-md bg-rose-800 px-3 text-sm font-bold text-white hover:bg-rose-700"
        >
          <Save className="h-4 w-4" />
          Lưu cấu hình
        </button>
      </div>
    </section>
  );

  return (
    <main className="flex min-h-0 flex-1 bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200 p-4">
          <img
            src="/logo/Black Minimal Photography Logo (512 x 512 px).png"
            alt="Pica Design"
            className="h-8 w-8 rounded-lg object-contain bg-white border border-slate-200 p-0.5 shadow-sm"
          />
          <div>
            <p className="text-sm font-black text-slate-950">Pica Admin</p>
            <p className="text-[10px] font-semibold text-slate-500">Quản trị vận hành</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-bold ${active ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={onOpenEditor}
            className="inline-flex h-10 w-full items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <Home className="h-4 w-4" />
            Về editor
          </button>
        </div>
      </aside>

      <section className="min-w-0 flex-1 overflow-auto">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-950">{navItems.find((item) => item.id === activeTab)?.label}</h1>
            <p className="text-sm font-medium text-slate-500">Thanh toán, giá AI, hệ thống lưu trữ Cloud và cấu hình kết nối backend.</p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Tải lại
          </button>
        </header>

        <div className="grid gap-4 p-5">
          {message && <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">{message}</div>}
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'invoices' && renderInvoices()}
          {activeTab === 'ai' && renderAiSettings()}
          {activeTab === 'storage' && renderStorage()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </section>
    </main>
  );
};
