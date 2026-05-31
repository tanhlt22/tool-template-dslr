import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const AUTH_SECRET = process.env.AUTH_SECRET || 'lumibooth-ai-secret-key-2026';

export async function POST(req: Request) {
  try {
    const { username, password, otp, signature, expire, type = 'register' } = await req.json();
    const trimmedUser = (username || '').trim();
    const trimmedPass = (password || '').trim();

    if (!trimmedUser || !otp || !signature || !expire) {
      return NextResponse.json({ error: 'Thiếu dữ liệu xác thực' }, { status: 400 });
    }

    // 1. Check expiration
    if (Date.now() > Number(expire)) {
      return NextResponse.json({ error: 'Mã xác nhận/Kích hoạt đã hết hạn' }, { status: 400 });
    }

    // 2. Re-create signed hash based on the type
    let dataToVerify = '';
    if (type === 'register') {
      dataToVerify = `${trimmedUser}-${trimmedPass}-${otp}-${expire}`;
    } else {
      dataToVerify = `${trimmedUser}-${otp}-${expire}`;
    }

    const calculatedSignature = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(dataToVerify)
      .digest('hex');

    if (calculatedSignature !== signature) {
      return NextResponse.json({ error: 'Mã xác nhận/Kích hoạt không chính xác' }, { status: 400 });
    }

    // 3. If this is a successful registration verification, insert the user into Supabase table!
    if (type === 'register' && SUPABASE_URL && SUPABASE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        // Insert record
        const { error } = await supabase
          .from('users')
          .insert([{ 
            username: trimmedUser, 
            password: trimmedPass,
            role: 'user'
          }]);

        if (error) {
          // Check if user already exists
          if (error.code === '23505') {
            return NextResponse.json({ error: 'Tài khoản đã tồn tại trên hệ thống' }, { status: 400 });
          }
          throw error;
        }
      } catch (err: any) {
        console.error('[auth/verify-otp] Supabase database registration error:', err.message);
        return NextResponse.json({ error: 'Không thể lưu tài khoản vào cơ sở dữ liệu' }, { status: 500 });
      }
    }

    // 4. Generate secure session token
    const sessionToken = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(`${trimmedUser}-${Date.now()}`)
      .digest('hex');

    return NextResponse.json({
      success: true,
      token: sessionToken,
      username: trimmedUser,
      role: 'user',
      message: type === 'register' ? 'Đăng ký & Kích hoạt tài khoản thành công!' : 'Đăng nhập thành công!'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
