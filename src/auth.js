import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const CONFIG_PATH = path.join(os.homedir(), '.adplat-session.json');
const BASE_URL = process.env.ADPLAT_BASE_URL || 'https://adplat.space';

export class AuthManager {
  static normalizePhone(phone) {
    if (!phone) return '';
    let p = String(phone).trim();
    // Convert Persian / Arabic digits to English
    p = p.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
         .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    p = p.replace(/\s+/g, '').replace(/-/g, '');
    if (p.startsWith('09')) {
      p = '+98' + p.slice(1);
    } else if (p.startsWith('98') && !p.startsWith('+98')) {
      p = '+' + p;
    } else if (p.startsWith('9') && p.length === 10) {
      p = '+98' + p;
    }
    return p;
  }

  static getToken() {
    // 1. Environment variable
    if (process.env.ADPLAT_SESSION_TOKEN) {
      return process.env.ADPLAT_SESSION_TOKEN.trim();
    }

    // 2. User session config file (~/.adplat-session.json)
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        if (data.sessionToken) {
          return data.sessionToken.trim();
        }
      } catch (e) {
        // Ignore read errors
      }
    }

    return null;
  }

  static setToken(token, user = null) {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token provided');
    }
    const cleanToken = token.trim();
    const data = {
      sessionToken: cleanToken,
      user,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
    process.env.ADPLAT_SESSION_TOKEN = cleanToken;
    return true;
  }

  static getCookieHeader() {
    const token = this.getToken();
    if (!token) return '';
    return `__Secure-better-auth.session_token=${token}`;
  }

  // --- Interactive Headless OTP (Better-Auth) ---
  static async sendOtp(phoneNumber) {
    const phone = this.normalizePhone(phoneNumber);
    if (!phone) {
      throw new Error('شماره موبایل وارد شده نامعتبر است.');
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/phone-number/send-otp`,
        { phoneNumber: phone },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0)'
          }
        }
      );
      return {
        success: true,
        phoneNumber: phone,
        message: 'کد تأیید با پیامک ارسال شد.',
        data: response.data
      };
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || error.message;
      throw new Error(`خطا در ارسال کد تأیید: ${msg}`);
    }
  }

  static async verifyOtp(phoneNumber, code) {
    const phone = this.normalizePhone(phoneNumber);
    const cleanCode = String(code).trim().replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/phone-number/verify`,
        { phoneNumber: phone, code: cleanCode },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0)'
          }
        }
      );

      // Extract session cookie from Set-Cookie header
      let token = null;
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        for (const cookieStr of setCookie) {
          const match = cookieStr.match(/__Secure-better-auth\.session_token=([^;]+)/);
          if (match) {
            token = match[1];
            break;
          }
        }
      }

      // Or from response data if returned
      if (!token && response.data?.token) {
        token = response.data.token;
      }

      if (!token) {
        throw new Error('توکن نشست از پاسخ سرور دریافت نشد.');
      }

      this.setToken(token, response.data?.user || null);

      return {
        success: true,
        message: 'ورود موفقیت‌آمیز بود و نشست فعال شد!',
        token: token.slice(0, 8) + '...' + token.slice(-6),
        user: response.data?.user
      };
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || error.message;
      throw new Error(`خطا در تأیید کد: ${msg}`);
    }
  }

  static async loginPassword(phoneNumber, password) {
    const phone = this.normalizePhone(phoneNumber);
    try {
      const response = await axios.post(
        `${BASE_URL}/api/auth/sign-in/phone-number`,
        { phoneNumber: phone, password },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0)'
          }
        }
      );

      let token = null;
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        for (const cookieStr of setCookie) {
          const match = cookieStr.match(/__Secure-better-auth\.session_token=([^;]+)/);
          if (match) {
            token = match[1];
            break;
          }
        }
      }

      if (!token && response.data?.token) {
        token = response.data.token;
      }

      if (!token) {
        throw new Error('توکن نشست از پاسخ سرور دریافت نشد.');
      }

      this.setToken(token, response.data?.user || null);

      return {
        success: true,
        message: 'ورود با رمز عبور با موفقیت انجام شد!',
        user: response.data?.user
      };
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || error.message;
      throw new Error(`ورود ناموفق بود: ${msg}`);
    }
  }
}
