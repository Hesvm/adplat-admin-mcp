# 🚀 Adplat Admin MCP Server

<div dir="rtl">

سرور استاندارد **Model Context Protocol (MCP)** برای مدیریت کامل پنل ادمین **Adplat.space** (پلتفرم تبلیغات دستیار).

این سرور به دستیارهای هوش مصنوعی مانند **Antigravity**، **Claude Desktop**، **Cursor** و **Windsurf** این امکان را می‌دهد تا به صورت هوشمند و بدون نیاز به ورود به مرورگر، تمام امور مدیریتی ادپلت اعم از تیکت‌ها، کمپین‌ها، کلاسترهای سرچ دستیار (SERP)، تراکنش‌ها، کاربران و گزارش‌های عملکردی را تحلیل و اجرا کنند.

</div>

---

## ✨ قابلیت‌های کلیدی (Key Features)

- 🎫 **سیستم تیکتینگ و پشتیبانی:** خواندن پیام‌ها، پاسخ‌دهی به تیکت‌های کاربران، فیلتر تیکت‌های بدون پاسخ.
- 🎯 **مدیریت کمپین‌ها:** تایید، رد، توقف، شارژ بودجه، بررسی رزرو جایگاه‌ها و ویرایش متون و بنرها.
- 🔍 **کلاسترهای جستجو (SERP Clusters):** ایجاد کلاستر کلمات کلیدی، ویرایش کلمات، اتصال به قالب‌های نتایج جستجو و رفرش از سورس خارجی.
- 👥 **کاربران و کیف پول:** بررسی ۳۰۰+ کاربر، مانده کیف پول، سوابق کمپین‌ها و انتقال مالکیت.
- 💳 **مالی و تراکنش‌ها:** بررسی و تایید فیش‌های واریزی در صف انتظار ادمین.
- 📊 **آمار و تحلیل:** دریافت داده‌های سری زمانی، تفکیک ایمپرشن‌ها و کلیک‌ها بر اساس تاریخ.
- 🖼️ **آپلودر مستقیم مدیا:** آپلود تصاویر، لوگو و بک‌گراند به CDN پلتفرم.

---

## 🛠️ فهرست ابزارهای MCP (Available Tools)

| نام ابزار (Tool Name) | نوع عملیات | توضیحات |
| :--- | :---: | :--- |
| `adplat_auth_status` | خواندن | بررسی وضعیت اتصال و پروفایل ادمین |
| `adplat_update_session` | تغییر | به‌روزرسانی توکن سشن کوکی مستقیماً از چت |
| `adplat_get_dashboard_analytics` | خواندن | آمار کلیک، ایمپرشن، نمودارهای روزانه و فیلتر تاریخ |
| `adplat_get_statistics_summary` | خواندن | خلاصه تیکت‌های بی‌پاسخ و پرداخت‌های در صف تایید |
| `adplat_list_tickets` | خواندن | لیست تیکت‌ها با امکان فیلتر بر اساس کاربر و جستجو |
| `adplat_get_ticket_details` | خواندن | تاریخچه کامل پیام‌ها و جزییات تیکت |
| `adplat_reply_ticket` | **نوشتن** | ارسال پاسخ رسمی پشتیبانی به تیکت کاربر |
| `adplat_list_campaigns` | خواندن | لیست کمپین‌ها با فیلتر وضعیت (active, draft, paused, ...) |
| `adplat_get_campaign_details` | خواندن | جزییات کامل کمپین شامل رزروها و محتواها |
| `adplat_update_campaign_status` | **نوشتن** | تغییر وضعیت کمپین (فعال، متوقف، رد شده) |
| `adplat_add_campaign_budget` | **نوشتن** | شارژ و اضافه کردن بودجه به کمپین به تومان |
| `adplat_fund_campaign` | **نوشتن** | تأمین اعتبار مالی کمپین از موجودی کاربر |
| `adplat_transfer_campaign_owner` | **نوشتن** | انتقال مالکیت کمپین به کاربری دیگر |
| `adplat_update_campaign_creative` | **نوشتن** | ویرایش فیلدهای خلاقانه (تایتل، لوگو، رنگ، بک‌گراند، ویدیو) |
| `adplat_cancel_campaign_bookings` | **نوشتن** | لغو رزروهای انتخابی همراه با درج دلیل |
| `adplat_list_search_clusters` | خواندن | لیست کلاسترهای سرچ و حجم کلمات کلیدی |
| `adplat_list_placement_variants` | خواندن | لیست قالب‌های نمایشی (گوگل SERP، هوشنگ و...) |
| `adplat_create_search_cluster` | **نوشتن** | ساخت کلاستر جدید SERP با کلمات کلیدی و حوزه‌ها |
| `adplat_update_search_cluster` | **نوشتن** | ویرایش کلمات کلیدی یا تنظیمات کلاستر |
| `adplat_delete_search_cluster` | **نوشتن** | حذف یک کلاستر جستجو |
| `adplat_refresh_search_cluster` | **نوشتن** | همگام‌سازی و رفرش کلاستر با منبع خارجی |
| `adplat_list_users` | خواندن | لیست کاربران، شماره تماس، شرکت و مانده حساب |
| `adplat_get_user_details` | خواندن | اطلاعات کامل پروفایل و کمپین‌های کاربر |
| `adplat_list_payments` | خواندن | لیست پرداخت‌ها و تراکنش‌های بانکی |
| `adplat_review_payment` | **نوشتن** | تایید یا رد فیش پرداختی کاربر |
| `adplat_list_industries` | خواندن | لیست صنایع و حوزه‌های تجاری |
| `adplat_upload_image` | **نوشتن** | آپلود فایل عکس محلی به سرور و دریافت لینک CDN |

---

## 🔑 نحوه استخراج توکن (Getting Session Token)

1. وارد پنل ادمین در `https://adplat.space/admin/dashboard` شوید.
2. کلید `F12` را زده و به تب **Application** (در کروم) یا **Storage** (در فایرفاکس) بروید.
3. در بخش **Cookies > https://adplat.space** مقدار کوکی زیر را کپی کنید:
   ```
   __Secure-better-auth.session_token
   ```
4. این مقدار را در متغیر محیطی `ADPLAT_SESSION_TOKEN` قرار دهید یا با ابزار `adplat_update_session` داخل چت بفرستید.

---

## ⚙️ راهنمای اتصال به کلاینت‌های هوش مصنوعی (Client Setup)

### ۱. تنظیم در Antigravity (`~/.gemini/config/mcp_config.json`)
```json
{
  "mcpServers": {
    "adplat-admin": {
      "command": "node",
      "args": [
        "/PATH/TO/adplat-admin-mcp/bin/cli.js"
      ],
      "env": {
        "ADPLAT_SESSION_TOKEN": "your_token_here"
      }
    }
  }
}
```

### ۲. تنظیم در Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "adplat-admin": {
      "command": "node",
      "args": [
        "/PATH/TO/adplat-admin-mcp/bin/cli.js"
      ],
      "env": {
        "ADPLAT_SESSION_TOKEN": "your_token_here"
      }
    }
  }
}
```

### ۳. تنظیم در Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "adplat-admin": {
      "command": "node",
      "args": [
        "/PATH/TO/adplat-admin-mcp/bin/cli.js"
      ],
      "env": {
        "ADPLAT_SESSION_TOKEN": "your_token_here"
      }
    }
  }
}
```

---

## 🧪 تست و اجرا به صورت مستقل

```bash
# نصب پکیج‌ها
npm install

# اجرای تست اتصال
npm test

# اجرای مستقیم سرور روی stdio
npm start
```

---

## 👤 Author
Developed by **Hesam Mousavi (Hesvm)**  
License: MIT
