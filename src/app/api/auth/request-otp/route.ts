import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const AUTH_SECRET = process.env.AUTH_SECRET || 'lumibooth-ai-secret-key-2026';

export async function POST(req: Request) {
  try {
    const { username, password, type = 'login' } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Tài khoản và mật khẩu không được để trống' }, { status: 400 });
    }

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    // 1. If it is LOGIN: Check if account is active in database, and log in directly!
    if (type === 'login') {
      let isMatch = false;
      let userRole = 'user';

      // Check database
      if (SUPABASE_URL && SUPABASE_KEY) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
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
          console.error('[auth/request-otp] Login Supabase query error:', err.message);
        }
      }

      if (isMatch) {
        // Direct Login: generate token immediately, no OTP needed for already active/registered accounts!
        const sessionToken = crypto
          .createHmac('sha256', AUTH_SECRET)
          .update(`${trimmedUser}-${Date.now()}`)
          .digest('hex');

        return NextResponse.json({
          success: true,
          directLogin: true,
          token: sessionToken,
          username: trimmedUser,
          role: userRole,
          message: 'Đăng nhập thành công!'
        });
      } else {
        return NextResponse.json({ error: 'Tài khoản hoặc mật khẩu không chính xác' }, { status: 401 });
      }
    }

    // 2. If it is REGISTER: Check if username already exists, then send OTP to Admin for activation!
    if (type === 'register') {
      let exists = false;

      if (SUPABASE_URL && SUPABASE_KEY) {
        try {
          const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
          const { data, error } = await supabase
            .from('users')
            .select('username')
            .eq('username', trimmedUser)
            .maybeSingle();

          if (!error && data) {
            exists = true;
          }
        } catch (err: any) {
          console.error('[auth/request-otp] Register check error:', err.message);
        }
      }

      // Protect against registering the fallback admin username
      if (trimmedUser === 'admin') {
        exists = true;
      }

      if (exists) {
        return NextResponse.json({ error: 'Tài khoản đã tồn tại trên hệ thống' }, { status: 400 });
      }

      // Generate a 6-digit OTP code for Admin approval
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expire = Date.now() + 5 * 60 * 1000; // 5 mins

      // Sign the registration intent: username, password, otp, expire
      const dataToSign = `${trimmedUser}-${trimmedPass}-${otp}-${expire}`;
      const signature = crypto
        .createHmac('sha256', AUTH_SECRET)
        .update(dataToSign)
        .digest('hex');

      // Send activation request to Admin via Telegram
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        const message = `🔔 *Yêu cầu Đăng ký & Kích hoạt Tài khoản Mới*\n\n👤 *Tài khoản đăng ký:* \`${trimmedUser}\`\n🔑 *Mã kích hoạt (OTP):* \`${otp}\`\n⏱️ *Thời gian hiệu lực:* 5 phút\n\n_Hãy gửi mã này cho người dùng để kích hoạt tài khoản của họ._`;

        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const res = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
          })
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('[auth/request-otp] Telegram send failed:', errorText);
        }
      } else {
        console.warn('[auth/request-otp] Telegram is not configured. Falling back (OTP in logs):', otp);
      }

      return NextResponse.json({
        success: true,
        directLogin: false,
        signature,
        expire,
        message: 'Yêu cầu đăng ký đã gửi! Vui lòng nhập mã kích hoạt nhận được từ Admin.'
      });
    }

    return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
