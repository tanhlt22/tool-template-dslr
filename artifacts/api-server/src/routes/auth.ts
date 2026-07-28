import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const AUTH_SECRET = process.env.AUTH_SECRET || 'lumibooth-ai-secret-key-2026';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

// POST /api/auth/request-otp — login or initiate register
router.post('/auth/request-otp', async (req, res) => {
  try {
    const { username, password, type = 'login' } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Tài khoản và mật khẩu không được để trống' });
    }
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (type === 'login') {
      let isMatch = false;
      let userRole = 'user';
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', trimmedUser)
            .eq('password', trimmedPass)
            .maybeSingle();
          if (!error && data) {
            isMatch = true;
            userRole = data.role || 'user';
          }
        } catch (err: any) {
          req.log.error({ err }, 'Login Supabase query error');
        }
      }

      if (isMatch) {
        const sessionToken = crypto
          .createHmac('sha256', AUTH_SECRET)
          .update(`${trimmedUser}-${Date.now()}`)
          .digest('hex');
        return res.json({
          success: true,
          directLogin: true,
          token: sessionToken,
          username: trimmedUser,
          role: userRole,
          message: 'Đăng nhập thành công!',
        });
      } else {
        return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' });
      }
    }

    if (type === 'register') {
      let exists = false;
      if (trimmedUser === 'admin') exists = true;

      const supabase = getSupabase();
      if (!exists && supabase) {
        try {
          const { data } = await supabase
            .from('users')
            .select('username')
            .eq('username', trimmedUser)
            .maybeSingle();
          if (data) exists = true;
        } catch (err: any) {
          req.log.error({ err }, 'Register check error');
        }
      }

      if (exists) {
        return res.status(400).json({ error: 'Tài khoản đã tồn tại trên hệ thống' });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expire = Date.now() + 5 * 60 * 1000;
      const dataToSign = `${trimmedUser}-${trimmedPass}-${otp}-${expire}`;
      const signature = crypto.createHmac('sha256', AUTH_SECRET).update(dataToSign).digest('hex');

      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        const message = `🔔 *Yêu cầu Đăng ký & Kích hoạt Tài khoản Mới*\n\n👤 *Tài khoản đăng ký:* \`${trimmedUser}\`\n🔑 *Mã kích hoạt (OTP):* \`${otp}\`\n⏱️ *Thời gian hiệu lực:* 5 phút\n\n_Hãy gửi mã này cho người dùng để kích hoạt tài khoản của họ._`;
        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' }),
          });
        } catch (err) {
          req.log.warn('Telegram send failed');
        }
      } else {
        req.log.warn({ otp }, 'Telegram not configured, OTP logged');
      }

      return res.json({
        success: true,
        directLogin: false,
        signature,
        expire,
        message: 'Yêu cầu đăng ký đã gửi! Vui lòng nhập mã kích hoạt nhận được từ Admin.',
      });
    }

    return res.status(400).json({ error: 'Yêu cầu không hợp lệ' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Lỗi hệ thống' });
  }
});

// POST /api/auth/verify-otp — verify OTP and optionally register
router.post('/auth/verify-otp', async (req, res) => {
  try {
    const { username, password, otp, signature, expire, type = 'register' } = req.body;
    const trimmedUser = (username || '').trim();
    const trimmedPass = (password || '').trim();

    if (!trimmedUser || !otp || !signature || !expire) {
      return res.status(400).json({ error: 'Thiếu dữ liệu xác thực' });
    }
    if (Date.now() > Number(expire)) {
      return res.status(400).json({ error: 'Mã xác nhận/Kích hoạt đã hết hạn' });
    }

    const dataToVerify =
      type === 'register'
        ? `${trimmedUser}-${trimmedPass}-${otp}-${expire}`
        : `${trimmedUser}-${otp}-${expire}`;
    const calculatedSignature = crypto.createHmac('sha256', AUTH_SECRET).update(dataToVerify).digest('hex');

    if (calculatedSignature !== signature) {
      return res.status(400).json({ error: 'Mã xác nhận/Kích hoạt không chính xác' });
    }

    if (type === 'register') {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { error } = await supabase.from('users').insert([{
            username: trimmedUser,
            password: trimmedPass,
            role: 'user',
          }]);
          if (error) {
            if (error.code === '23505') {
              return res.status(400).json({ error: 'Tài khoản đã tồn tại trên hệ thống' });
            }
            throw error;
          }
        } catch (err: any) {
          req.log.error({ err }, 'Supabase registration error');
          return res.status(500).json({ error: 'Không thể lưu tài khoản vào cơ sở dữ liệu' });
        }
      }
    }

    const sessionToken = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(`${trimmedUser}-${Date.now()}`)
      .digest('hex');

    return res.json({
      success: true,
      token: sessionToken,
      username: trimmedUser,
      role: 'user',
      message: type === 'register' ? 'Đăng ký & Kích hoạt tài khoản thành công!' : 'Đăng nhập thành công!',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Lỗi hệ thống' });
  }
});

export default router;
