#!/usr/bin/env node

import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { AuthManager } from '../src/auth.js';
import { AdplatClient } from '../src/api-client.js';
import { runServer } from '../src/index.js';

const command = process.argv[2];

if (command === 'login') {
  interactiveLogin();
} else if (command === 'status') {
  checkStatus();
} else {
  runServer().catch((error) => {
    console.error('Fatal error starting Adplat Admin MCP server:', error);
    process.exit(1);
  });
}

async function interactiveLogin() {
  const rl = readline.createInterface({ input, output });
  console.log('=== ورود به پنل ادمین ادپلت (Adplat Admin Login) ===\n');

  try {
    const rawPhone = await rl.question('شماره موبایل خود را وارد کنید (مثال: 09014182301): ');
    const phone = AuthManager.normalizePhone(rawPhone);

    console.log(`\nدر حال ارسال کد تأیید به ${phone}...`);
    await AuthManager.sendOtp(phone);
    console.log('✅ کد تأیید با موفقیت پیامک شد!\n');

    const code = await rl.question('کد ۵ رقمی دریافتی را وارد کنید: ');
    console.log('در حال اعتبارسنجی کد...');
    const result = await AuthManager.verifyOtp(phone, code);

    console.log('\n🎉', result.message);
    const profile = await AdplatClient.getProfile().catch(() => null);
    if (profile) {
      const p = profile.profile || profile;
      console.log(`خوش آمدید، ${p.name || ''} (${p.companyName || ''})`);
      console.log('نقش کاربری:', p.role || 'admin');
    }
    console.log('\n✅ نشست ذخیره شد و اکنون تمام ایجنت‌های هوش مصنوعی متصل هستند.');
  } catch (err) {
    console.error('\n❌ خطا در ورود:', err.message);
  } finally {
    rl.close();
  }
}

async function checkStatus() {
  console.log('Checking Adplat Admin authentication status...\n');
  const token = AuthManager.getToken();
  if (!token) {
    console.log('❌ لاگین نیستید. برای ورود، دستور زیر را اجرا کنید:');
    console.log('   npm run login   یا   node bin/cli.js login');
    process.exit(1);
  }

  try {
    const profile = await AdplatClient.getProfile();
    const p = profile.profile || profile;
    console.log('✅ وضعیت: متصل به پنل ادمین ادپلت');
    console.log('نام:', p.name);
    console.log('موبایل:', p.phoneNumber);
    console.log('شرکت:', p.companyName);
    console.log('توکن:', token.slice(0, 8) + '...' + token.slice(-6));
  } catch (err) {
    console.error('❌ خطا در ارتباط با سرور:', err.message);
    process.exit(1);
  }
}
