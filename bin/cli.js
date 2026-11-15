#!/usr/bin/env node

import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { AuthManager } from '../src/auth.js';
import { AdplatClient } from '../src/api-client.js';
import { startBrowserAuth } from '../src/browser-auth.js';
import { runServer } from '../src/index.js';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'login') {
  const flag = args[1];
  if (flag === '--browser' || flag === '-b') {
    startBrowserAuth().then(handleLoginSuccess).catch(handleLoginError);
  } else if (flag === '--otp') {
    otpLogin();
  } else if (flag === '--password' || flag === '-p') {
    passwordLogin();
  } else {
    interactiveLoginMenu();
  }
} else if (command === 'status') {
  checkStatus();
} else {
  runServer().catch((error) => {
    console.error('Fatal error starting Adplat Admin MCP server:', error);
    process.exit(1);
  });
}

async function interactiveLoginMenu() {
  const rl = readline.createInterface({ input, output });
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       سامانه ورود Adplat Admin MCP Server           ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  console.log('روش مورد نظر خود را برای ورود انتخاب کنید:\n');
  console.log('  1) 🌐 ورود تعاملی با مرورگر (Browser One-Click - پیشنهادی)');
  console.log('  2) 📱 پیامک کد تأیید (Passwordless SMS OTP)');
  console.log('  3) 🔑 ورود با نام‌کاربری و رمز عبور (Phone & Password)');
  console.log('  4) 📋 وارد کردن دستی توکن یا API Key');
  console.log('  5) ❌ انصراف\n');

  try {
    const choice = (await rl.question('گزینه مورد نظر (1-5) [پیش‌فرض: 1]: ')).trim() || '1';
    rl.close();

    switch (choice) {
      case '1':
        await startBrowserAuth().then(handleLoginSuccess).catch(handleLoginError);
        break;
      case '2':
        await otpLogin();
        break;
      case '3':
        await passwordLogin();
        break;
      case '4':
        await manualTokenLogin();
        break;
      case '5':
        console.log('عملیات لغو شد.');
        process.exit(0);
        break;
      default:
        console.log('گزینه نامعتبر است.');
        process.exit(1);
    }
  } catch (err) {
    rl.close();
    handleLoginError(err);
  }
}

async function otpLogin() {
  const rl = readline.createInterface({ input, output });
  console.log('\n=== ورود با پیامک کد تأیید (SMS OTP) ===\n');

  try {
    const rawPhone = await rl.question('شماره موبایل مدیر (مثال: 09014182301): ');
    const phone = AuthManager.normalizePhone(rawPhone);

    console.log(`\nدر حال ارسال کد به ${phone}...`);
    await AuthManager.sendOtp(phone);
    console.log('✅ کد تأیید ۵ رقمی با موفقیت پیامک شد!\n');

    const code = await rl.question('کد تأیید دریافتی را وارد کنید: ');
    console.log('در حال اعتبارسنجی...');
    const result = await AuthManager.verifyOtp(phone, code);

    rl.close();
    await handleLoginSuccess(result);
  } catch (err) {
    rl.close();
    handleLoginError(err);
  }
}

async function passwordLogin() {
  const rl = readline.createInterface({ input, output });
  console.log('\n=== ورود با شماره موبایل و رمز عبور ===\n');

  try {
    const rawPhone = await rl.question('شماره موبایل مدیر: ');
    const phone = AuthManager.normalizePhone(rawPhone);
    const password = await rl.question('رمز عبور: ');

    console.log('\nدر حال ورود به پنل ادپلت...');
    const result = await AuthManager.loginPassword(phone, password);

    rl.close();
    await handleLoginSuccess(result);
  } catch (err) {
    rl.close();
    handleLoginError(err);
  }
}

async function manualTokenLogin() {
  const rl = readline.createInterface({ input, output });
  console.log('\n=== ثبت دستی توکن یا API Key ===\n');

  try {
    const token = await rl.question('توکن سشن (__Secure-better-auth...) یا API Key: ');
    if (!token.trim()) {
      console.log('❌ مقداری وارد نشد.');
      process.exit(1);
    }

    if (token.trim().startsWith('adp_') || token.trim().startsWith('sk_')) {
      AuthManager.setApiKey(token.trim());
      console.log('✅ کلید API Key با موفقیت ذخیره شد.');
    } else {
      AuthManager.setToken(token.trim());
      console.log('✅ توکن سشن با موفقیت ذخیره شد.');
    }

    rl.close();
    await handleLoginSuccess({ success: true });
  } catch (err) {
    rl.close();
    handleLoginError(err);
  }
}

async function handleLoginSuccess(result) {
  console.log('\n🎉 تبریک! ورود با موفقیت انجام شد و نشست ذخیره گردید.');
  try {
    const profile = await AdplatClient.getProfile();
    const p = profile.profile || profile;
    console.log(`👤 کاربر: ${p.name || 'مدیر ادپلت'} (${p.companyName || 'Adplat'})`);
    console.log(`📱 موبایل: ${p.phoneNumber || '-'}`);
    console.log(`🛡️ نقش: ${p.role || 'admin'}`);
  } catch (e) {
    // profile lookup is bonus
  }
  console.log('\n✅ اکنون تمام ایجنت‌های هوش مصنوعی (Claude Desktop, Cursor, Antigravity, Windsurf) متصل هستند.');
  process.exit(0);
}

function handleLoginError(err) {
  console.error('\n❌ خطا در فرآیند ورود:', err.message);
  process.exit(1);
}

async function checkStatus() {
  console.log('بررسی وضعیت احراز هویت در پنل ادمین ادپلت...\n');
  const token = AuthManager.getToken();
  const apiKey = AuthManager.getApiKey();
  const hasCreds = AuthManager.hasCredentials();

  console.log(`• وضعیت سشن محلی: ${token ? '✅ فعال (' + token.slice(0, 8) + '...' + token.slice(-6) + ')' : '❌ غیرفعال'}`);
  console.log(`• وضعیت کلید API Key: ${apiKey ? '✅ تنظیم شده' : '⚪ تنظیم نشده'}`);
  console.log(`• ورود خودکار (ADPLAT_PHONE/PASSWORD): ${hasCreds ? '✅ فعال (تمدید خودکار)' : '⚪ تنظیم نشده'}\n`);

  if (!token && !apiKey && !hasCreds) {
    console.log('❌ دسترسی فعال نیست. برای ورود، یکی از دستورات زیر را اجرا کنید:');
    console.log('   npm run login');
    console.log('   npm run login:browser');
    process.exit(1);
  }

  try {
    const profile = await AdplatClient.getProfile();
    const p = profile.profile || profile;
    console.log('✅ اتصال فعال و پاسخگو به سرور:');
    console.log('  نام:', p.name);
    console.log('  موبایل:', p.phoneNumber);
    console.log('  شرکت:', p.companyName);
    console.log('  نقش:', p.role);
  } catch (err) {
    console.error('❌ خطا در تایید اعتبار نشست:', err.message);
    process.exit(1);
  }
}
