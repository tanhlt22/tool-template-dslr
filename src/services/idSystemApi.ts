const API_BASE_STORAGE_KEY = 'id_system_api_base_url';
const USER_TOKEN_STORAGE_KEY = 'id_system_user_token';
const CLIENT_ID_STORAGE_KEY = 'id_system_client_id';
const USER_NAME_STORAGE_KEY = 'id_system_user_name';
const USER_ROLE_STORAGE_KEY = 'id_system_user_role';
const DEVICE_ID_STORAGE_KEY = 'id_system_device_id';

const DEFAULT_CLIENT_ID = import.meta.env.VITE_ID_SYSTEM_CLIENT_ID || 'tool-template-dslr';
const DEFAULT_API_BASE_URL = import.meta.env.VITE_ID_SYSTEM_API_BASE_URL || 'http://localhost:8081';

export interface IdSystemSettings {
  apiBaseUrl: string;
  userToken: string;
  clientId: string;
}

export interface AuthSession {
  code?: string;
  token?: string;
  user_name?: string;
  client_id?: string;
  state?: string;
}

export interface AuthExchangeSession {
  access_token: string;
  username?: string;
  email?: string;
  avatar?: string;
  role?: string;
  status?: string;
  client_id?: string;
}

export interface CheckoutResponse {
  invoice_id: string;
  invoice_code: string;
  amount: number;
  credits?: number;
  status: string;
  payment_note?: string;
  checkout_url?: string;
  qr_code?: string;
  message?: string;
}

export interface PaymentSyncResponse {
  invoice_id: string;
  invoice_code: string;
  status: string;
  credit_balance?: number;
  credits_added?: number;
}

export interface CreditBalance {
  user_id: string;
  credit_balance: number;
  wallet_balance?: number;
}

export interface AdminInvoice {
  id: string;
  code: string;
  user_id: string;
  client_id: string;
  plan_id: string;
  amount: number;
  status: string;
  payment_method?: string;
  provider_order_code?: string;
  checkout_url?: string;
  payment_note?: string;
  paid_at?: string;
  created_at?: string;
}

export interface CloudinaryAccount {
  id: string;
  code?: string;
  cloud_name: string;
  upload_preset?: string;
  folder_prefix?: string;
  storage_limit_mb: number;
  storage_used_mb: number;
  priority: number;
  status: string;
  last_used_at?: string;
}

export interface CloudinaryUploadConfig {
  cloudinary_account_id: string;
  cloud_name: string;
  upload_preset: string;
  folder_prefix?: string;
  storage_limit_mb: number;
  storage_used_mb: number;
}

export interface ImageAsset {
  id: string;
  cloudinary_account_id?: string;
  public_id?: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  source_type?: string;
}

export interface AiGenerationSetting {
  id?: string;
  type: string;
  name: string;
  cost_credits: number;
  provider?: string;
  model?: string;
  has_api_key?: boolean;
  api_key_masked?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface AiGenerationResult {
  id: string;
  type: string;
  prompt: string;
  status: string;
  client_id: string;
  negative_prompt?: string;
  cost_credits: number;
  output_asset_id?: string;
  output_image_url?: string;
  frame_id?: string;
  error_message?: string;
  created_at?: string;
  completed_at?: string;
}

export interface CentralFrame {
  id: string;
  name: string;
  client_id: string;
  preview_asset_id?: string;
  source_generation_id?: string;
  width: number;
  height: number;
  config_json?: string;
  status: string;
  created_at?: string;
}

interface BaseResponse<T> {
  status: number;
  message: string;
  data: T;
}

interface PageResponse<T> {
  current_page: number;
  data: T[];
  last_page: number;
  total: number;
}

export function getIdSystemSettings(): IdSystemSettings {
  return {
    apiBaseUrl: localStorage.getItem(API_BASE_STORAGE_KEY) || DEFAULT_API_BASE_URL,
    userToken: localStorage.getItem(USER_TOKEN_STORAGE_KEY) || '',
    clientId: localStorage.getItem(CLIENT_ID_STORAGE_KEY) || DEFAULT_CLIENT_ID
  };
}

export function saveIdSystemSettings(settings: IdSystemSettings) {
  localStorage.setItem(API_BASE_STORAGE_KEY, settings.apiBaseUrl.replace(/\/+$/, ''));
  localStorage.setItem(USER_TOKEN_STORAGE_KEY, settings.userToken.trim());
  localStorage.setItem(CLIENT_ID_STORAGE_KEY, settings.clientId.trim() || DEFAULT_CLIENT_ID);
}

export function getStoredCustomerName() {
  return localStorage.getItem(USER_NAME_STORAGE_KEY) || '';
}

export function getStoredUserRole() {
  return localStorage.getItem(USER_ROLE_STORAGE_KEY) || '';
}

export function isStoredAdmin() {
  return getStoredUserRole().toLowerCase() === 'admin';
}

function saveAuthSession(session: AuthSession) {
  const settings = getIdSystemSettings();
  if (session.token) {
    localStorage.setItem(USER_TOKEN_STORAGE_KEY, session.token);
  }
  localStorage.setItem(CLIENT_ID_STORAGE_KEY, session.client_id || settings.clientId || DEFAULT_CLIENT_ID);
  if (session.user_name) {
    localStorage.setItem(USER_NAME_STORAGE_KEY, session.user_name);
  }
}

function saveExchangeSession(session: AuthExchangeSession) {
  const settings = getIdSystemSettings();
  localStorage.setItem(USER_TOKEN_STORAGE_KEY, session.access_token);
  localStorage.setItem(CLIENT_ID_STORAGE_KEY, session.client_id || settings.clientId || DEFAULT_CLIENT_ID);
  if (session.username) {
    localStorage.setItem(USER_NAME_STORAGE_KEY, session.username);
  }
  if (session.role) {
    localStorage.setItem(USER_ROLE_STORAGE_KEY, session.role);
  }
}

export function clearAuthSession() {
  localStorage.removeItem(USER_TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_NAME_STORAGE_KEY);
  localStorage.removeItem(USER_ROLE_STORAGE_KEY);
}

export function isIdSystemConfigured() {
  const settings = getIdSystemSettings();
  return Boolean(settings.apiBaseUrl && settings.userToken);
}

function buildUrl(path: string) {
  const baseUrl = getIdSystemSettings().apiBaseUrl.replace(/\/+$/, '');
  return `${baseUrl}${path}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const settings = getIdSystemSettings();
  const token = settings.userToken;
  if (!token) {
    throw new Error('Chưa đăng nhập');
  }

  const res = await fetch(buildUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {})
    }
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok || payload?.status === 0) {
    if (res.status === 401 || payload?.message === 'User khong ton tai' || payload?.message === 'User không tồn tại') {
      clearAuthSession();
      throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
    }
    throw new Error(payload?.message || `ID System API lỗi ${res.status}`);
  }
  return payload?.data as T;
}

async function publicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(buildUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok || payload?.status === 0) {
    throw new Error(payload?.message || `ID System API lỗi ${res.status}`);
  }
  return payload?.data as T;
}

function newAuthState() {
  return `tool-template-dslr-${Date.now()}`;
}

function getOrCreateDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
  return id;
}

async function exchangeAuthCode(code?: string, clientId?: string) {
  if (!code) {
    throw new Error('Backend không trả authorization code');
  }
  const settings = getIdSystemSettings();
  const session = await publicRequest<AuthExchangeSession>('/api/v1/auth/exchange', {
    method: 'POST',
    body: JSON.stringify({
      code,
      client_id: clientId || settings.clientId,
      device_id: getOrCreateDeviceId()
    })
  });
  saveExchangeSession(session);
  return session;
}

export const idSystemApi = {
  settings: {
    get: getIdSystemSettings,
    save: saveIdSystemSettings,
    isConfigured: isIdSystemConfigured,
    customerName: getStoredCustomerName,
    userRole: getStoredUserRole,
    isAdmin: isStoredAdmin,
    logout: clearAuthSession
  },

  auth: {
    login: async (username: string, password: string) => {
      const settings = getIdSystemSettings();
      const loginCode = await publicRequest<AuthSession>('/api/v1/auth/password/login', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          client_id: settings.clientId,
          state: newAuthState()
        })
      });
      saveAuthSession(loginCode);
      return exchangeAuthCode(loginCode.code, loginCode.client_id);
    },
    register: async (payload: { username: string; password: string; name: string; phone?: string; email?: string }) => {
      const settings = getIdSystemSettings();
      const loginCode = await publicRequest<AuthSession>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          phone: payload.phone || undefined,
          email: payload.email || undefined,
          client_id: settings.clientId,
          state: newAuthState()
        })
      });
      saveAuthSession(loginCode);
      return exchangeAuthCode(loginCode.code, loginCode.client_id);
    },
    google: async (credential: string) => {
      const settings = getIdSystemSettings();
      const loginCode = await publicRequest<AuthSession>('/api/v1/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          token: credential,
          client_id: settings.clientId,
          state: newAuthState()
        })
      });
      saveAuthSession(loginCode);
      return exchangeAuthCode(loginCode.code, loginCode.client_id);
    }
  },

  billing: {
    checkout: (amount: number, paymentMethod = 'payos') => {
      const settings = getIdSystemSettings();
      return request<CheckoutResponse>('/api/v1/public/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          client_id: settings.clientId,
          amount,
          payment_method: paymentMethod
        })
      });
    },
    syncPayos: (invoiceCode: string) =>
      request<PaymentSyncResponse>(`/api/v1/public/billing/invoices/${encodeURIComponent(invoiceCode)}/sync-payos`, {
        method: 'POST'
      }),
    balance: () => request<CreditBalance>('/api/v1/public/credits/balance')
  },

  frames: {
    list: async () => {
      const settings = getIdSystemSettings();
      const page = await request<PageResponse<CentralFrame>>(
        `/api/v1/public/frames?clientId=${encodeURIComponent(settings.clientId)}&page=0&size=100`
      );
      return page.data;
    },
    get: (id: string) => request<CentralFrame>(`/api/v1/public/frames/${encodeURIComponent(id)}`),
    create: (payload: { name: string; width: number; height: number; config_json?: string }) => {
      const settings = getIdSystemSettings();
      return request<CentralFrame>('/api/v1/public/frames', {
        method: 'POST',
        body: JSON.stringify({
          client_id: settings.clientId,
          name: payload.name,
          width: payload.width,
          height: payload.height,
          config_json: payload.config_json
        })
      });
    },
    update: (id: string, payload: { name: string; width: number; height: number; config_json?: string }) =>
      request<CentralFrame>(`/api/v1/public/frames/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: payload.name,
          width: payload.width,
          height: payload.height,
          config_json: payload.config_json
        })
      }),
    delete: (id: string) =>
      request<CentralFrame>(`/api/v1/public/frames/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      })
  },

  ai: {
    settings: (type = 'frame_background') =>
      publicRequest<AiGenerationSetting | AiGenerationSetting[]>(
        `/api/v1/public/ai/settings${type ? `?type=${encodeURIComponent(type)}` : ''}`
      ),
    createGeneration: (prompt: string, width?: number, height?: number) => {
      const settings = getIdSystemSettings();
      return request<AiGenerationResult>('/api/v1/public/ai/generations', {
        method: 'POST',
        body: JSON.stringify({
          client_id: settings.clientId,
          type: 'frame_background',
          prompt,
          width,
          height
        })
      });
    }
  },

  admin: {
    invoices: (status?: string) => {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      return request<PageResponse<AdminInvoice>>(`/api/v1/private/invoices${query}`);
    },
    confirmInvoice: (invoiceId: string, note?: string) =>
      request(`/api/v1/private/invoices/${encodeURIComponent(invoiceId)}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ note })
      }),
    rejectInvoice: (invoiceId: string, note?: string) =>
      request(`/api/v1/private/invoices/${encodeURIComponent(invoiceId)}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note })
      }),
    cloudinaryAccounts: () => request<CloudinaryAccount[]>('/api/v1/private/cloudinary-accounts'),
    createCloudinaryAccount: (payload: {
      cloud_name: string;
      upload_preset?: string;
      folder_prefix?: string;
      storage_limit_mb: number;
      priority?: number;
      status?: string;
    }) => request<CloudinaryAccount>('/api/v1/private/cloudinary-accounts', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    aiSettings: () => request<AiGenerationSetting[]>('/api/v1/private/ai/settings'),
    saveAiSetting: (payload: {
      type: string;
      name: string;
      cost_credits: number;
      provider?: string;
      model?: string;
      api_key?: string;
      status?: string;
    }) => request<AiGenerationSetting>('/api/v1/private/ai/settings', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    deleteAiSetting: (type: string) => request<AiGenerationSetting>(`/api/v1/private/ai/settings/${encodeURIComponent(type)}`, {
      method: 'DELETE'
    })
  },

  storage: {
    uploadConfig: () => request<CloudinaryUploadConfig>('/api/v1/public/storage/cloudinary/upload-config'),
    reportUpload: (payload: {
      cloudinary_account_id: string;
      public_id?: string;
      url: string;
      width?: number;
      height?: number;
      format?: string;
      bytes?: number;
      source_type?: string;
    }) => request<CloudinaryUploadConfig>('/api/v1/public/storage/cloudinary/upload-complete', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    uploadImage: (payload: { data_url: string; source_type?: string }) =>
      request<ImageAsset>('/api/v1/public/storage/images', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
  }
};
