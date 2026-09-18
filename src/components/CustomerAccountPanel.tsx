import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, LogIn, LogOut, RefreshCw, Wallet, X } from 'lucide-react';
import QRCode from 'qrcode';
import {
  CheckoutResponse,
  CreditBalance,
  getIdSystemSettings,
  idSystemApi
} from '../services/idSystemApi';

interface CustomerAccountPanelProps {
  onAuthChange?: () => void;
  onLoginClick?: () => void;
}

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export const CustomerAccountPanel: React.FC<CustomerAccountPanelProps> = ({ onAuthChange, onLoginClick }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingPayment, setIsSyncingPayment] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [settingsVersion, setSettingsVersion] = useState(0);
  const [topupAmount, setTopupAmount] = useState(50000);
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [checkoutQrUrl, setCheckoutQrUrl] = useState('');

  const settings = getIdSystemSettings();
  const isLoggedIn = Boolean(settings.userToken);
  const customerName = idSystemApi.settings.customerName();

  const refreshAccount = useCallback(async () => {
    if (!getIdSystemSettings().userToken) return;
    setIsLoading(true);
    setMessage('');
    try {
      setBalance(await idSystemApi.billing.balance());
    } catch (error) {
      if (error instanceof Error && error.message.includes('đăng nhập lại')) {
        setBalance(null);
        setCheckout(null);
        setCheckoutQrUrl('');
        setSettingsVersion((value) => value + 1);
        onAuthChange?.();
      }
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAccount();
  }, [refreshAccount, settingsVersion]);

  useEffect(() => {
    const handleBalanceRefresh = () => {
      void refreshAccount();
    };
    window.addEventListener('id-system-balance-refresh', handleBalanceRefresh);
    return () => window.removeEventListener('id-system-balance-refresh', handleBalanceRefresh);
  }, [refreshAccount]);

  useEffect(() => {
    let cancelled = false;
    const qrCode = checkout?.qr_code;
    if (!qrCode) {
      setCheckoutQrUrl('');
      return;
    }
    if (/^https?:\/\//i.test(qrCode) || qrCode.startsWith('data:image/')) {
      setCheckoutQrUrl(qrCode);
      return;
    }
    QRCode.toDataURL(qrCode, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220
    })
      .then((url) => {
        if (!cancelled) {
          setCheckoutQrUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCheckoutQrUrl('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [checkout?.qr_code]);

  const handleCheckout = async () => {
    const amount = Math.trunc(Number(topupAmount || 0));
    if (amount < 1000) {
      setMessage('Số tiền nạp tối thiểu 1.000đ.');
      return;
    }

    setIsLoading(true);
    setMessage('');
    try {
      const result = await idSystemApi.billing.checkout(amount, 'payos');
      setCheckout(result);
      setMessage('Đã tạo đơn nạp tiền.');
      await refreshAccount();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncPayment = useCallback(async () => {
    if (!checkout?.invoice_code || isSyncingPayment) return;
    setIsSyncingPayment(true);
    try {
      const result = await idSystemApi.billing.syncPayos(checkout.invoice_code);
      if (result.status === 'paid') {
        setMessage('Thanh toán thành công, ví đã được cập nhật.');
        await refreshAccount();
      } else if (result.status === 'rejected') {
        setMessage('Đơn thanh toán đã bị hủy.');
      } else {
        setMessage('Chưa nhận được trạng thái thanh toán từ payOS.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSyncingPayment(false);
    }
  }, [checkout?.invoice_code, isSyncingPayment, refreshAccount]);

  useEffect(() => {
    if (!isPaymentOpen || !checkout?.invoice_code) return;
    const intervalId = window.setInterval(() => {
      void handleSyncPayment();
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [checkout?.invoice_code, handleSyncPayment, isPaymentOpen]);

  const openPaymentModal = () => {
    setMessage('');
    setCheckout(null);
    setCheckoutQrUrl('');
    setIsPaymentOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentOpen(false);
  };

  const handleLogout = () => {
    idSystemApi.settings.logout();
    setBalance(null);
    setCheckout(null);
    setCheckoutQrUrl('');
    setSettingsVersion((value) => value + 1);
    onAuthChange?.();
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onLoginClick}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-950 px-3 text-xs font-bold text-white hover:bg-slate-800"
        >
          <LogIn className="h-3.5 w-3.5" />
          Đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-700">
        <Wallet className="h-3.5 w-3.5" />
        {customerName || 'Khách'}: {balance ? currency.format(balance.wallet_balance ?? balance.credit_balance) : '--'}
      </div>
      <button
        type="button"
        disabled={isLoading}
        onClick={openPaymentModal}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-rose-800 px-3 text-xs font-bold text-white disabled:bg-slate-400"
      >
        <CreditCard className="h-3.5 w-3.5" />
        Nạp tiền
      </button>
      <button
        type="button"
        onClick={refreshAccount}
        className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-slate-700 hover:bg-slate-50"
        title="Tải lại số dư"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-slate-700 hover:bg-slate-50"
        title="Đăng xuất"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
      {message && !isPaymentOpen && <span className="basis-full text-right text-[11px] font-semibold text-slate-600">{message}</span>}

      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
            className="w-full max-w-sm rounded-md border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 id="payment-modal-title" className="text-sm font-black uppercase tracking-wide text-slate-900">
                  Nạp tiền
                </h2>
                <p className="text-xs font-semibold text-slate-500">Thanh toán qua QR payOS</p>
              </div>
              <button
                type="button"
                onClick={closePaymentModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
                aria-label="Đóng popup nạp tiền"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="grid gap-4 p-4">
              <label className="grid gap-1 text-xs font-bold text-slate-600">
                Số tiền nạp
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={topupAmount}
                  onChange={(event) => setTopupAmount(Number(event.target.value))}
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm font-bold text-slate-900"
                  aria-label="Số tiền nạp"
                />
              </label>

              <button
                type="button"
                disabled={isLoading || topupAmount < 1000}
                onClick={handleCheckout}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-rose-800 px-3 text-sm font-bold text-white disabled:bg-slate-400"
              >
                <CreditCard className="h-4 w-4" />
                Tạo QR thanh toán
              </button>

              {checkout?.checkout_url && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-center">
                  {checkoutQrUrl && (
                    <img
                      src={checkoutQrUrl}
                      alt={`QR thanh toán ${checkout.invoice_code}`}
                      className="mx-auto h-48 w-48 rounded-md border border-slate-200 bg-white p-2"
                    />
                  )}
                  <div className="mt-3 text-xs font-semibold text-slate-600">
                    Thanh toán {currency.format(checkout.amount)} cho đơn{' '}
                    <span className="font-black text-slate-950">{checkout.invoice_code}</span>.
                  </div>
                  <a
                    href={checkout.checkout_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex h-9 items-center justify-center rounded-md border border-rose-200 px-3 text-xs font-bold text-rose-800 hover:bg-rose-50"
                  >
                    Mở link payOS
                  </a>
                  <button
                    type="button"
                    disabled={isSyncingPayment}
                    onClick={handleSyncPayment}
                    className="ml-2 mt-2 inline-flex h-9 items-center justify-center rounded-md border border-slate-300 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {isSyncingPayment ? 'Đang kiểm tra...' : 'Kiểm tra thanh toán'}
                  </button>
                </div>
              )}

              {message && <div className="rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">{message}</div>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
