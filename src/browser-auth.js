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

      // API: Auto-discovery of existing session on the machine
      if (url.pathname === '/api/session-info') {
        const token = AuthManager.getToken();
        const apiKey = AuthManager.getApiKey();
        let profile = null;
        if (token || apiKey) {
          try {
            profile = await AdplatClient.getProfile();
          } catch (e) {
            // ignore
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
          hasSession: Boolean(token || apiKey),
          token: token || '',
          apiKey: apiKey || '',
          profile: profile?.profile || profile || null
        }));
      }

      // API Endpoints for interactive web UI
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');

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
      border-radius: 16px;
      width: 100%;
      max-width: 500px;
      padding: 32px 28px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.6);
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #1f6feb, #2ea043, #58a6ff);
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
      gap: 6px;
    }
    .tab-btn {
      flex: 1;
      background: none;
      border: none;
      padding: 10px 4px;
      color: #8b949e;
      font-family: inherit;
      font-size: 13.5px;
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
      margin-bottom: 16px;
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
      padding: 12px 14px;
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
      transition: background 0.2s, transform 0.1s;
      margin-top: 6px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }
    .btn:hover { background: #2ea043; }
    .btn:active { transform: scale(0.99); }
    .btn.secondary {
      background: #21262d;
      color: #c9d1d9;
      border: 1px solid #30363d;
      margin-top: 10px;
    }
    .btn.secondary:hover { background: #30363d; color: #f0f6fc; }
    .btn.accent {
      background: #1f6feb;
    }
    .btn.accent:hover { background: #388bfd; }
    .status-box {
      margin-top: 16px;
      padding: 14px;
      border-radius: 8px;
      font-size: 13.5px;
      display: none;
      line-height: 1.7;
      white-space: pre-line;
      text-align: right;
    }
    .status-box.error { background: rgba(248, 81, 73, 0.15); border: 1px solid #f85149; color: #ff7b72; display: block; }
    .status-box.success { background: rgba(46, 160, 67, 0.15); border: 1px solid #2ea043; color: #56d364; display: block; }
    .pulse-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #56d364;
      border-radius: 50%;
      margin-left: 6px;
      box-shadow: 0 0 8px #56d364;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.3); }
      100% { opacity: 1; transform: scale(1); }
    }
    .auto-badge {
      background: rgba(31, 111, 235, 0.15);
      border: 1px solid #1f6feb;
      color: #58a6ff;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .footer {
      margin-top: 24px;
      text-align: center;
      font-size: 12px;
      color: #6e7681;
      border-top: 1px solid #21262d;
      padding-top: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="logo-badge">ADPLAT ADMIN MCP</span>
      <h1>ورود به پنل مدیریت</h1>
      <p class="desc">اتصال خودکار و پایدار هوش مصنوعی به پنل ادمین ادپلت</p>
    </div>

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('quickTab', this)">⚡ اتصال ۱ کلیک مرورگر</button>
      <button class="tab-btn" onclick="switchTab('otpTab', this)">📱 پیامک کد تأیید (OTP)</button>
      <button class="tab-btn" onclick="switchTab('tokenTab', this)">🔑 کلید API Key یا توکن</button>
    </div>

    <!-- Tab 1: Quick Browser 1-Click (DEFAULT) -->
    <div id="quickTab" class="tab-content active">
      <div id="autoDetectBox" class="auto-badge" style="display:none;">
        <span class="pulse-dot"></span>
        <span id="autoDetectText">در حال جستجوی سشن فعال...</span>
      </div>

      <div class="form-group">
        <label>توکن نشست (Better-Auth Session Token یا API Key):</label>
        <input type="text" id="manualToken" placeholder="در حال بررسی خودکار سیستم..." dir="ltr">
      </div>

      <button class="btn" id="btnConnect" onclick="saveManualToken()">
        <span>ذخیره نشست و اتصال دائم</span>
      </button>

      <button class="btn secondary" type="button" onclick="readFromClipboard()">
        <span>📋 خواندن خودکار از کلیپ‌بورد</span>
      </button>

      <div style="margin-top: 14px; text-align: center;">
        <a href="https://adplat.space/admin/dashboard" target="_blank" style="color: #58a6ff; font-size: 13px; text-decoration: none;">
          باز کردن داشبورد ادپلت در تب جدید ↗
        </a>
      </div>
    </div>

    <!-- Tab 2: OTP Tab -->
    <div id="otpTab" class="tab-content">
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

    <!-- Tab 3: Permanent API Key Tab -->
    <div id="tokenTab" class="tab-content">
      <div class="form-group">
        <label>کلید دائمی API Key (بدون انقضا):</label>
        <input type="text" id="dedicatedApiKey" placeholder="adp_live_xxxxxxxxxxxxxxxx" dir="ltr">
      </div>
      <button class="btn" onclick="saveDedicatedKey()">ذخیره کلید دائمی</button>
    </div>

    <div id="statusBox" class="status-box"></div>

    <div class="footer">
      اتصال امن لوکال • مجوز دسترسی با سطح امنیتی 0600 در سیستم شما ثبت می‌شود.
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

    // --- AUTO-DISCOVERY ON PAGE LOAD ---
    window.addEventListener('DOMContentLoaded', async () => {
      try {
        const res = await fetch('/api/session-info');
        const info = await res.json();

        if (info.hasSession && (info.token || info.apiKey)) {
          const val = info.token || info.apiKey;
          const input = document.getElementById('manualToken');
          input.value = val;

          const badge = document.getElementById('autoDetectBox');
          const badgeText = document.getElementById('autoDetectText');
          const userName = info.profile?.name || 'مدیر ادپلت';
          const userCompany = info.profile?.companyName ? ' (' + info.profile.companyName + ')' : '';

          badge.style.display = 'flex';
          badgeText.innerHTML = '✅ نشست فعال شناسایی شد: <strong>' + userName + userCompany + '</strong>';

          showStatus('🎉 نشست معتبر شما شناسایی و خودکار پر شد!\nدر حال اتصال خودکار...', 'success');

          // Auto-trigger connect after 1 second so user doesn't even have to click!
          setTimeout(() => {
            saveManualToken(val);
          }, 1200);
        } else {
          document.getElementById('manualToken').placeholder = 'مقدار توکن نشست را اینجا بچسبانید یا دکمه کلیپ‌بورد را بزنید...';
        }
      } catch (e) {
        console.error('Session info error:', e);
      }
    });

    async function readFromClipboard() {
      try {
        const text = await navigator.clipboard.readText();
        if (!text || !text.trim()) {
          return showStatus('کلیپ‌بورد خالی است. لطفاً توکن را از تب ادپلت کپی کنید.', 'error');
        }
        document.getElementById('manualToken').value = text.trim();
        showStatus('✅ توکن از کلیپ‌بورد خوانده شد. در حال ذخیره...', 'success');
        saveManualToken(text.trim());
      } catch (err) {
        showStatus('اجازه دسترسی به کلیپ‌بورد صادر نشد. لطفاً دستی در کادر Paste کنید.', 'error');
      }
    }

    async function saveManualToken(providedVal = null) {
      const val = (providedVal || document.getElementById('manualToken').value || '').trim();
      if (!val) return showStatus('لطفاً مقدار توکن یا API Key را وارد کنید.', 'error');

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
        showSuccessPage('ورود با موفقیت انجام شد! نشست شما فعال شد.');
      } catch (err) {
        showStatus(err.message, 'error');
      }
    }

    async function saveDedicatedKey() {
      const key = document.getElementById('dedicatedApiKey').value.trim();
      if (!key) return showStatus('لطفاً کلید API Key را وارد کنید.', 'error');
      saveManualToken(key);
    }

    async function sendOtp() {
      const phoneNumber = document.getElementById('otpPhone').value.trim();
      if (!phoneNumber) return showStatus('لطفاً شماره موبایل را وارد کنید.', 'error');

      showStatus('در حال ارسال پیامک به شماره شما...', 'success');
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

    function showSuccessPage(msg) {
      document.querySelector('.card').innerHTML = \`
        <div style="text-align:center; padding: 24px 0;">
          <div style="font-size: 56px; margin-bottom: 16px;">🎉</div>
          <h2 style="color:#56d364; margin-bottom: 12px; font-size:22px;">\${msg}</h2>
          <p style="color:#8b949e; line-height: 1.8; font-size:15px; margin-bottom: 20px;">
            ارتباط هوش مصنوعی با پنل مدیریت ادپلت با موفقیت برقرار شد.<br>
            اکنون می‌توانید این پنجره را ببندید!
          </p>
          <div style="font-size: 13px; color:#58a6ff;">
            پنجره تا چند ثانیه دیگر به صورت خودکار بسته می‌شود...
          </div>
        </div>
      \`;
      setTimeout(() => {
        window.close();
      }, 2500);
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
