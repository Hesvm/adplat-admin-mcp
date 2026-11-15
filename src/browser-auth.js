import http from 'http';
import { exec } from 'child_process';
import { AuthManager } from './auth.js';
import { AdplatClient } from './api-client.js';

export function startBrowserAuth(initialPort = 43210) {
  return new Promise((resolve, reject) => {
    let port = initialPort;

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);

      // Handle Callback via query param: /callback?token=... or /callback?key=...
      if (url.pathname === '/callback') {
        const token = url.searchParams.get('token');
        const apiKey = url.searchParams.get('key');
        if (token) {
          AuthManager.setToken(token);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(getSuccessHtml('توکن سشن با موفقیت ثبت شد!'));
          cleanup();
          return resolve({ success: true, method: 'callback-token', token });
        }
        if (apiKey) {
          AuthManager.setApiKey(apiKey);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(getSuccessHtml('کلید API Key با موفقیت ثبت شد!'));
          cleanup();
          return resolve({ success: true, method: 'callback-key', apiKey });
        }
      }

      // API Endpoints for interactive web UI
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');

            if (url.pathname === '/api/login-password') {
              const { phoneNumber, password } = data;
              if (!phoneNumber || !password) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'شماره موبایل و رمز عبور الزامی است.' }));
              }
              const result = await AuthManager.loginPassword(phoneNumber, password);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: result.message }));
              cleanup();
              return resolve({ success: true, method: 'password', phoneNumber });
            }

            if (url.pathname === '/api/send-otp') {
              const { phoneNumber } = data;
              if (!phoneNumber) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'شماره موبایل الزامی است.' }));
              }
              const result = await AuthManager.sendOtp(phoneNumber);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify(result));
            }

            if (url.pathname === '/api/verify-otp') {
              const { phoneNumber, code } = data;
              if (!phoneNumber || !code) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'شماره موبایل و کد ۵ رقمی الزامی است.' }));
              }
              const result = await AuthManager.verifyOtp(phoneNumber, code);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: result.message }));
              cleanup();
              return resolve({ success: true, method: 'otp', phoneNumber });
            }

            if (url.pathname === '/api/save-token') {
              const { token, apiKey } = data;
              if (token) {
                AuthManager.setToken(token);
              }
              if (apiKey) {
                AuthManager.setApiKey(apiKey);
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'اطلاعات نشست ذخیره شد!' }));
              cleanup();
              return resolve({ success: true, method: 'manual-token' });
            }

            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Endpoint not found' }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // Serve Main Login Page
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getMainHtml());
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        port++;
        server.listen(port, '127.0.0.1');
      } else {
        reject(err);
      }
    });

    server.listen(port, '127.0.0.1', () => {
      const localUrl = `http://localhost:${port}`;
      console.log(`\n🌐 سرور لاگین مرورگر فعال شد: ${localUrl}`);
      console.log('در حال باز کردن مرورگر پیش‌فرض سیستم...');

      openBrowser(localUrl);
    });

    function cleanup() {
      setTimeout(() => {
        server.close();
      }, 1500);
    }
  });
}

function openBrowser(url) {
  const platform = process.platform;
  let cmd = `open "${url}"`;
  if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else if (platform === 'linux') {
    cmd = `xdg-open "${url}"`;
  }
  exec(cmd, (err) => {
    if (err) {
      console.log(`لطفاً آدرس زیر را به صورت دستی در مرورگر باز کنید:\n${url}`);
    }
  });
}

function getMainHtml() {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ورود به پنل ادمین ادپلت | Adplat Admin MCP</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/aminabedi68/Estedad@master/fonts/webfonts/css/fontiran.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0d1117;
      color: #c9d1d9;
      font-family: 'Estedad', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
      direction: rtl;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 14px;
      width: 100%;
      max-width: 480px;
      padding: 32px 28px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo-badge {
      display: inline-block;
      background: linear-gradient(135deg, #1f6feb, #238636);
      color: white;
      font-weight: bold;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    h1 {
      font-size: 22px;
      color: #f0f6fc;
      margin-bottom: 8px;
    }
    p.desc {
      font-size: 14px;
      color: #8b949e;
      line-height: 1.6;
    }
    .tabs {
      display: flex;
      border-bottom: 1px solid #30363d;
      margin-bottom: 22px;
      gap: 8px;
    }
    .tab-btn {
      flex: 1;
      background: none;
      border: none;
      padding: 10px 4px;
      color: #8b949e;
      font-family: inherit;
      font-size: 14px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }
    .tab-btn.active {
      color: #58a6ff;
      border-bottom: 2px solid #58a6ff;
      font-weight: bold;
    }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .form-group {
      margin-bottom: 18px;
      text-align: right;
    }
    label {
      display: block;
      font-size: 13px;
      margin-bottom: 6px;
      color: #e6edf3;
    }
    input {
      width: 100%;
      padding: 11px 14px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 8px;
      color: #f0f6fc;
      font-family: inherit;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus {
      border-color: #58a6ff;
      box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
    }
    .btn {
      width: 100%;
      padding: 12px;
      background: #238636;
      color: white;
      border: none;
      border-radius: 8px;
      font-family: inherit;
      font-size: 15px;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.2s;
      margin-top: 6px;
    }
    .btn:hover { background: #2ea043; }
    .btn.secondary {
      background: #21262d;
      color: #c9d1d9;
      border: 1px solid #30363d;
      margin-top: 10px;
    }
    .btn.secondary:hover { background: #30363d; }
    .status-box {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      display: none;
      line-height: 1.6;
    }
    .status-box.error { background: rgba(248, 81, 73, 0.15); border: 1px solid #f85149; color: #ff7b72; display: block; }
    .status-box.success { background: rgba(46, 160, 67, 0.15); border: 1px solid #2ea043; color: #56d364; display: block; }
    .footer {
      margin-top: 24px;
      text-align: center;
      font-size: 12px;
      color: #484f58;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="logo-badge">ADPLAT ADMIN MCP</span>
      <h1>ورود به پنل مدیریت</h1>
      <p class="desc">روش ورود مورد نظر خود را انتخاب کنید تا نشست شما فعال و پایدار شود.</p>
    </div>

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('otpTab', this)">کد پیامک (SMS OTP)</button>
      <button class="tab-btn" onclick="switchTab('tokenTab', this)">کلید API Key یا توکن</button>
      <button class="tab-btn" onclick="switchTab('quickTab', this)">اتصال ۱ کلیک مرورگر</button>
    </div>

    <!-- OTP Tab (Default & Most Popular) -->
    <div id="otpTab" class="tab-content active">
      <div class="form-group">
        <label>شماره موبایل مدیر (بدون نیاز به پسورد):</label>
        <input type="text" id="otpPhone" placeholder="09014182301" dir="ltr">
      </div>
      <button class="btn" id="btnSendOtp" onclick="sendOtp()">ارسال پیامک کد تأیید</button>

      <div id="otpVerifySection" style="display:none; margin-top:16px;">
        <div class="form-group">
          <label>کد ۵ رقمی ارسال‌شده:</label>
          <input type="text" id="otpCode" placeholder="12345" dir="ltr" maxlength="6">
        </div>
        <button class="btn" onclick="verifyOtp()">تأیید کد و اتصال دائم</button>
      </div>
    </div>

    <!-- Token / API Key Tab -->
    <div id="tokenTab" class="tab-content">
      <div class="form-group">
        <label>کلید دائمی API Key یا توکن سشن:</label>
        <input type="text" id="manualToken" placeholder="adp_live_... یا توکن نشست" dir="ltr">
      </div>
      <button class="btn" onclick="saveManualToken()">ذخیره و اتصال دائم</button>
    </div>

    <!-- Quick Browser 1-Click Tab -->
    <div id="quickTab" class="tab-content">
      <p style="font-size:13px; color:#8b949e; line-height:1.7; margin-bottom:14px;">
        اگر در حال حاضر در مرورگر خود داخل پنل ادپلت لاگین هستید، با باز کردن پنل و کپی کلید/توکن یا استفاده از callback محلی فوراً متصل شوید:
      </p>
      <a href="https://adplat.space/admin/dashboard" target="_blank" style="text-decoration:none;">
        <button class="btn secondary" type="button">باز کردن داشبورد ادپلت در تب جدید ↗</button>
      </a>
    </div>
        <input type="text" id="manualToken" placeholder="مقدار توکن را اینجا بچسبانید..." dir="ltr">
      </div>
      <button class="btn" onclick="saveManualToken()">ذخیره نشست</button>
    </div>

    <div id="statusBox" class="status-box"></div>

    <div class="footer">
      اتصال ایمن به localhost • اطلاعات نشست در فایل محلی با مجوز امنیتی 0600 ذخیره می‌شود.
    </div>
  </div>

  <script>
    function switchTab(tabId, btn) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      btn.classList.add('active');
      hideStatus();
    }

    function showStatus(text, type) {
      const box = document.getElementById('statusBox');
      box.textContent = text;
      box.className = 'status-box ' + type;
    }

    function hideStatus() {
      const box = document.getElementById('statusBox');
      box.style.display = 'none';
    }

    async function submitPassword() {
      const phoneNumber = document.getElementById('passPhone').value.trim();
      const password = document.getElementById('passPassword').value.trim();
      if (!phoneNumber || !password) return showStatus('لطفاً شماره موبایل و رمز عبور را وارد کنید.', 'error');
      
      showStatus('در حال اعتبارسنجی و ورود به پنل ادپلت...', 'success');
      try {
        const res = await fetch('/api/login-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'خطا در ورود');
        showSuccessPage('ورود با موفقیت انجام شد! نشست شما ذخیره شد.');
      } catch (err) {
        showStatus(err.message, 'error');
      }
    }

    async function sendOtp() {
      const phoneNumber = document.getElementById('otpPhone').value.trim();
      if (!phoneNumber) return showStatus('لطفاً شماره موبایل را وارد کنید.', 'error');

      showStatus('در حال ارسال کد به شماره شما...', 'success');
      try {
        const res = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'خطا در ارسال پیامک');
        showStatus('✅ کد پیامک شد! لطفاً کد دریافتی را وارد کنید.', 'success');
        document.getElementById('otpVerifySection').style.display = 'block';
        document.getElementById('btnSendOtp').style.display = 'none';
      } catch (err) {
        showStatus(err.message, 'error');
      }
    }

    async function verifyOtp() {
      const phoneNumber = document.getElementById('otpPhone').value.trim();
      const code = document.getElementById('otpCode').value.trim();
      if (!code) return showStatus('لطفاً کد دریافتی را وارد کنید.', 'error');

      showStatus('در حال بررسی کد...', 'success');
      try {
        const res = await fetch('/api/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber, code })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'کد نامعتبر است');
        showSuccessPage('تأیید شد! نشست شما فعال و متصل گردید.');
      } catch (err) {
        showStatus(err.message, 'error');
      }
    }

    async function saveManualToken() {
      const val = document.getElementById('manualToken').value.trim();
      if (!val) return showStatus('لطفاً مقدار توکن را وارد کنید.', 'error');
      
      const isApiKey = val.startsWith('adp_') || val.startsWith('sk_');
      const payload = isApiKey ? { apiKey: val } : { token: val };

      try {
        const res = await fetch('/api/save-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'خطا در ذخیره');
        showSuccessPage('توکن با موفقیت در محیط ذخیره شد.');
      } catch (err) {
        showStatus(err.message, 'error');
      }
    }

    function showSuccessPage(msg) {
      document.querySelector('.card').innerHTML = \`
        <div style="text-align:center; padding: 20px 0;">
          <div style="font-size: 54px; margin-bottom: 16px;">🎉</div>
          <h2 style="color:#56d364; margin-bottom: 12px; font-size:22px;">\${msg}</h2>
          <p style="color:#8b949e; line-height: 1.8; font-size:15px;">
            ارتباط هوش مصنوعی با پنل مدیریت ادپلت برقرار شد.<br>
            اکنون می‌توانید این پنجره را ببندید و در چت ایجنت دستورات خود را صادر کنید!
          </p>
        </div>
      \`;
    }
  </script>
</body>
</html>`;
}

function getSuccessHtml(msg) {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>ورود موفقیت‌آمیز</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/aminabedi68/Estedad@master/fonts/webfonts/css/fontiran.css">
  <style>
    body { background: #0d1117; color: #f0f6fc; font-family: 'Estedad', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; direction: rtl; }
    .box { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 40px; text-align: center; max-width: 440px; }
    h2 { color: #56d364; margin-bottom: 12px; }
    p { color: #8b949e; font-size: 15px; line-height: 1.7; }
  </style>
</head>
<body>
  <div class="box">
    <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
    <h2>${msg}</h2>
    <p>نشست ادپلت با موفقیت ذخیره شد. اکنون می‌توانید این برگه را ببندید و به محیط کار خود برگردید.</p>
  </div>
</body>
</html>`;
}
