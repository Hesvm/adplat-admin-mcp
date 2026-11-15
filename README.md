<div align="center">

<img src="./assets/banner.png" alt="Adplat Admin MCP Header Banner" width="100%" style="border-radius: 16px; margin-bottom: 24px;" />

# Adplat Admin MCP
### Autonomous AI Bridge for Adplat.space & Dastyar Advertising Ecosystem

[![MIT License](https://img.shields.io/badge/License-MIT-10b981.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-3b82f6.svg)](https://nodejs.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Standard%202024--11--05-8b5cf6.svg)](https://modelcontextprotocol.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-emerald.svg)](https://github.com/Hesvm/adplat-admin-mcp/pulls)
[![Live Audit](https://img.shields.io/badge/Live%20Audit-16%2F16%20Passed%20(100%25)-success.svg)](https://github.com/Hesvm/adplat-admin-mcp)

[Overview](#-overview) •
[Core Capabilities](#-core-capabilities) •
[Production Dashboard](#-production-dashboard) •
[Quickstart](#-quickstart-in-30-seconds) •
[Available Tools](#-available-mcp-tools-41-tools) •
[Configurations](#-client-configurations) •
[Security Architecture](#-security--privacy-first) •
[FAQ](#-frequently-asked-questions) •
[راهنمای فارسی](#-راهنمای-فارسی-و-نحوه-اتصال)

</div>

---

## 💡 Overview

**Adplat Admin MCP** is an enterprise-grade, open-source bridge connecting AI agents—such as Claude Desktop, Cursor, Google Antigravity, and Windsurf—directly to **Adplat.space**, the core advertising and search marketing infrastructure behind Iran's **Dastyar** browser platform.

Built on the open [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) standard, it equips LLMs with **41 production-ready tools** for end-to-end administration:

- **Campaign & Creative Management:** Adjust live budgets, reallocate user wallet funds, swap creative assets, approve revisions, and update targeting rules across 300+ campaigns.
- **SERP Search Clusters:** Control 50+ search clusters, manage keyword expansions, discover external search trends, and audit SERP placement variants (Google SERP, Hooshang AI).
- **Ad Inventory & Forecasting:** Real-time day-by-day vacancy audits across all 13 Dastyar ad spaces (Extension Sleeve, Rotating Bookmark, Calendar Event, Search Suggestion Icon, etc.).
- **Support & Billing Operations:** Rapid ticketing response dispatch, attachment uploads, bank deposit receipt approvals, and account management for 330+ enterprise clients.
- **Analytics & Big Data:** Direct telemetry queries aggregating 40M+ impressions, CTR trends, and daily conversion funnels.

---

## ⚡ Core Capabilities

### 1. Campaign & Creative Orchestration

<img src="./assets/feature-campaigns.png" alt="Campaign & Creative Orchestration" width="100%" style="border-radius: 14px; margin: 12px 0 20px 0;" />

Empower your AI assistant to manage marketing campaigns with surgical precision. Dispatch live budget adjustments, approve creative copy revisions, and toggle campaign statuses on the fly.

- `adplat_list_campaigns`: Query 300+ campaigns with status, search, and date filters.
- `adplat_get_campaign_details`: Deep inspection into targeting matrices, creatives, and booked dates.
- `adplat_add_campaign_budget`: Inject direct budget (in Tomans) to any active campaign.
- `adplat_fund_campaign`: Allocate customer wallet credit directly into campaign funding.
- `adplat_update_campaign_creative`: Update banners, titles, logos, video assets, and destination links.
- `adplat_cancel_campaign_bookings`: Cancel specific booked dates with custom cancellation reasons.

---

### 2. SERP Search Clusters & Keyword Intelligence

<img src="./assets/feature-serp.png" alt="SERP Search Clusters & Keyword Intelligence" width="100%" style="border-radius: 14px; margin: 12px 0 20px 0;" />

Harness search intent at scale. Build, cluster, and optimize keyword groups that trigger contextual advertising across Dastyar's new tab search engine.

- `adplat_list_search_clusters`: View 50+ active keyword clusters with query volumes.
- `adplat_create_search_cluster`: Form new clusters with hundreds of keywords and industry categories.
- `adplat_update_search_cluster`: Append high-intent search keywords and update templates.
- `adplat_list_placement_variants`: Audit search layout templates (Google SERP, Hooshang AI).
- `adplat_get_external_search_clusters`: Discover trending search queries and external search volumes.

---

### 3. 13 Ad Places & Real-Time Inventory Forecasting

Full transparency into placement availability. Adplat Admin MCP tracks every single day across all 13 advertising slots in Dastyar:

| Placement | Base Daily Price | Description |
|---|---|---|
| **Extension Sleeve** (آستین افزونه) | 16,000,000 T | Prime full-width sidebar branding. |
| **Rotating Bookmark** (بوکمارک چرخشی) | 14,500,000 T | High-frequency top bookmark tile. |
| **Search Suggestion Icon** (آیکون سجسشن) | 11,000,000 T | Prominent icon in instant search recommendations. |
| **Calendar Event** (رویداد تقویم) | 10,500,000 T | Direct link inside the native Dastyar calendar. |
| **Search Suggestion Word** (کلمه سجسشن) | 10,000,000 T | Text keyword highlight in search dropdown. |
| **Sticky Bookmark** (بوکمارک ثابت) | 10,000,000 T | Permanent pinned bookmark slot. |
| **Dynamic / Secondary Slots** | 1,000,000 - 9,000,000 T | Weather, prayer times, utility widgets, and badges. |

- `adplat_list_ad_places`: Retrieve all 13 advertising placements with daily base pricing.
- `adplat_get_ad_place_availability`: Day-by-day vacancy matrix and booking percentage for any date range.
- `adplat_get_search_inventory`: Check available impressions and capacity for search campaigns.

---

### 4. Support Ticketing, Billing Clearance & 330+ Users

Manage customer relationships and payments autonomously without leaving your AI workspace:

- `adplat_list_tickets` & `adplat_reply_ticket`: Review open tickets and send official support responses with attachments.
- `adplat_get_statistics_summary`: Real-time count of unanswered support tickets and pending payment slips.
- `adplat_list_payments` & `adplat_review_payment`: Review direct bank transfers and approve wallet recharges.
- `adplat_list_users` & `adplat_get_user_details`: Access dossiers for 330+ corporate accounts and balances.

---

## 🖥️ Production Dashboard

<img src="./assets/adplat-ui.png" alt="Adplat Production Management Interface" width="100%" style="border-radius: 14px; border: 1px solid #30363d; margin: 16px 0;" />

Adplat Admin MCP mirrors 100% of the native web dashboard capabilities, allowing agents to execute complex administrative workflows entirely via natural language.

---

## 🛠️ Available MCP Tools (41 Tools)

| Tool | Type | Description |
|---|---|---|
| `adplat_auth_status` | `Read` | Validates active session, auto-renewal capability, and admin profile brief. |
| `adplat_auth_send_otp` | `Write` | Dispatches SMS OTP code to mobile phone for passwordless login. |
| `adplat_auth_verify_otp` | `Write` | Verifies SMS code, extracts Better-Auth session token, and activates connection. |
| `adplat_auth_login_password` | `Write` | Direct login with phone number and password. |
| `adplat_auth_set_api_key` | `Write` | Sets permanent API Key (service token) for non-expiring authorization. |
| `adplat_update_session` | `Write` | Dynamically updates session token cookie in runtime without restart. |
| `adplat_get_dashboard_analytics` | `Read` | Aggregated telemetry: impressions (40M+), clicks, and CTR metrics. |
| `adplat_get_statistics_summary` | `Read` | Instant counter of unanswered tickets and pending payment approvals. |
| `adplat_list_tickets` | `Read` | Lists support tickets with user, category, and text filters. |
| `adplat_get_ticket_details` | `Read` | Fetches complete ticket conversation history and attachment files. |
| `adplat_reply_ticket` | `Write` | Dispatches official support reply with optional file attachments. |
| `adplat_list_campaigns` | `Read` | Lists 300+ campaigns across all statuses (active, paused, draft). |
| `adplat_get_campaign_details` | `Read` | Retrieves full campaign brief, targeting parameters, and booked dates. |
| `adplat_update_campaign_status` | `Write` | Activates, pauses, or rejects marketing campaigns. |
| `adplat_add_campaign_budget` | `Write` | Injects direct budget (in Tomans) to an existing campaign. |
| `adplat_fund_campaign` | `Write` | Allocates funds from customer wallet balance to campaign. |
| `adplat_transfer_campaign_owner` | `Write` | Reassigns campaign ownership to another registered user. |
| `adplat_update_campaign_creative` | `Write` | Updates banners, titles, logos, video assets, and destination links. |
| `adplat_cancel_campaign_bookings` | `Write` | Cancels specific booked dates with custom cancellation reasons. |
| `adplat_get_campaign_timeline` | `Read` | Audit log of all campaign actions and state transitions. |
| `adplat_list_creative_revisions` | `Read` | Inspects pending creative content revisions submitted by users. |
| `adplat_apply_creative_revision` | `Write` | Approves and applies creative revision directly to campaign. |
| `adplat_list_ad_places` | `Read` | Retrieves all 13 advertising placements with daily base pricing. |
| `adplat_get_ad_place_availability` | `Read` | Day-by-day slot availability and vacancy forecasts. |
| `adplat_get_targeting_options` | `Read` | Geographic, job category, and audience targeting matrices. |
| `adplat_get_search_inventory` | `Read` | Available capacity and booking slots for search campaigns. |
| `adplat_list_search_clusters` | `Read` | Queries active SERP search clusters, category topics, and keyword counts. |
| `adplat_list_placement_variants` | `Read` | Views search layout templates (Google SERP, Hooshang AI). |
| `adplat_create_search_cluster` | `Write` | Creates new search cluster with keywords, placement templates, and tags. |
| `adplat_update_search_cluster` | `Write` | Edits cluster metadata or appends keywords. |
| `adplat_delete_search_cluster` | `Write` | Removes obsolete search clusters. |
| `adplat_refresh_search_cluster` | `Write` | Forces re-synchronization with external keyword data sources. |
| `adplat_get_external_search_clusters` | `Read` | Discovers high-volume trending search queries and keyword clusters. |
| `adplat_list_users` | `Read` | Queries 330+ users with wallet balances, company names, and phones. |
| `adplat_get_user_details` | `Read` | Complete user dossier including company, balance, and campaign history. |
| `adplat_list_payments` | `Read` | Inspects bank receipt transfers, payment methods, and verification status. |
| `adplat_review_payment` | `Write` | Approves wallet credit or rejects bank deposit receipts with reasons. |
| `adplat_list_industries` | `Read` | Categorized industry taxonomy used across Adplat. |
| `adplat_list_notifications` | `Read` | Administrative alerts and user ticket notifications. |
| `adplat_mark_notification_read` | `Write` | Acknowledges and dismisses notifications. |
| `adplat_upload_image` | `Write` | Uploads local images/banners directly to Adplat CDN storage. |

---

## 🚀 Quickstart in 30 Seconds

### 1. Clone & Install
```bash
git clone https://github.com/Hesvm/adplat-admin-mcp.git
cd adplat-admin-mcp
npm install
```

### 2. Connect Your Account (Passwordless Auth Waterfall)

Adplat Admin MCP features an autonomous multi-tier authentication system requiring **zero passwords and zero manual cookie extraction**:

```mermaid
flowchart TD
    subgraph Authentication_Methods
        A["⭐️ Method 1: Browser 1-Click Loopback<br/>(Standard Vercel/GitHub CLI)"]
        B["⭐️ Method 2: In-Chat SMS OTP<br/>(Passwordless phone code)"]
        C["⭐️ Method 3: Permanent API Key<br/>(Permanent service token)"]
    end

    A --> S["~/.adplat-session.json<br/>POSIX 0600 Permissions"]
    B --> S
    C --> S

    S --> M["⚡ 41 Production Tools Connected & Active"]
```

#### 🌐 Method 1: Browser 1-Click Loopback (Recommended)
Run:
```bash
npm run login
# or directly: npm run login:browser
```
A local web server starts on `http://localhost:43210` and your browser opens automatically. If you are already logged in to Adplat in your browser, the page **auto-detects your session, populates the token, confirms connectivity in 1 second, and closes automatically**. Zero typing required!

#### 📱 Method 2: In-Chat SMS OTP
Simply ask your AI agent in chat:
> *"Send a verification code for Adplat to 09014182301"*

The agent calls `adplat_auth_send_otp`. Reply with the 5-digit code; the agent runs `adplat_auth_verify_otp` and permanently activates your session!

#### 🔑 Method 3: Permanent API Key
If you have a dedicated service token, pass `ADPLAT_API_KEY` in your environment or set it directly via:
```bash
adplat_auth_set_api_key(apiKey: "adp_live_xxxxxxxxxxxxxxxx")
```

### 3. Verify Connection
```bash
npm run status
# Run full live audit across all 16 endpoint categories:
npm run audit
```

---

## 🤖 Client Configurations

<details open>
<summary><b>Google Antigravity</b></summary>

Add to your `~/.gemini/config/mcp_config.json`:
```json
{
  "mcpServers": {
    "adplat-admin": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/adplat-admin-mcp/src/index.js"]
    }
  }
}
```
</details>

<details>
<summary><b>Claude Desktop</b></summary>

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "adplat-admin": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/adplat-admin-mcp/src/index.js"]
    }
  }
}
```
</details>

<details>
<summary><b>Cursor</b></summary>

Add to `.cursor/mcp.json` in your workspace:
```json
{
  "mcpServers": {
    "adplat-admin": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/adplat-admin-mcp/src/index.js"]
    }
  }
}
```
</details>

<details>
<summary><b>Windsurf</b></summary>

Add to `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcpServers": {
    "adplat-admin": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/adplat-admin-mcp/src/index.js"]
    }
  }
}
```
</details>

---

## 🔒 Security & Privacy First

Administrative advertising operations demand strict security standards:

1. **Zero Password Storage:** Passwords are never requested, stored, or exposed. Authentication relies purely on ephemeral session tokens or dedicated API keys.
2. **100% Localhost Execution:** The server runs exclusively on your local machine via stdio. No third-party servers, intermediate proxies, or external telemetry collect your data.
3. **Restricted File Permissions:** Session tokens are saved to `~/.adplat-session.json` with strict POSIX `0o600` permissions (readable only by the local user account).
4. **Clean Git Hygiene:** Environment variables, session tokens, and local cache dumps are strictly blacklisted in `.gitignore`.

---

## ❓ Frequently Asked Questions

### Which AI assistants can use this server?
Any assistant supporting the Model Context Protocol (MCP) specification, including Claude Desktop, Cursor, Google Antigravity, Windsurf, Cline, and custom Python/TypeScript LLM applications built on `@modelcontextprotocol/sdk`.

### How does the 1-Click browser login work?
Running `npm run login:browser` launches a temporary loopback web server on `http://localhost:43210`. The web interface queries your local environment, validates active sessions against the Adplat API, and confirms authorization without requiring you to copy or paste tokens.

### Can an admin accidentally create user draft campaigns?
No. Adplat's backend strictly enforces role separation (`403 Forbidden on POST /api/campaigns`). Admins review, manage, fund, and adjust budgets on campaigns submitted by advertisers rather than creating drafts on behalf of users.

### Does it support custom date ranges for analytics?
Yes. `adplat_get_dashboard_analytics` accepts `startDate` and `endDate` parameters (ISO format: `YYYY-MM-DD`). If omitted, it automatically queries the past 30 days to optimize database performance and prevent timeout.

---

## 📄 Machine-Readable Context for AI Models
For automated agents, web scrapers, and AI models indexing this repository, machine-readable documentation is maintained at [`/llms.txt`](./llms.txt).

---

<div dir="rtl">

## 🇮🇷 راهنمای فارسی و نحوه اتصال

این پروژه یک پل ارتباطی استاندارد بر پایه پروتکل رسمی **MCP** برای اتصال ایجنت‌های هوش مصنوعی (Antigravity، Claude، Cursor) به پنل مدیریت پلتفرم تبلیغاتی **ادپلت (Adplat)** است.

### مراحل اتصال فوق‌العاده سریع:
۱. **نصب و راه‌اندازی:**
```bash
git clone https://github.com/Hesvm/adplat-admin-mcp.git
cd adplat-admin-mcp
npm install
```

۲. **ورود با ۱ کلیک در مرورگر (بدون پسورد):**
```bash
npm run login
```
صفحه لاگین باز می‌شود، سشن شما را به صورت خودکار شناسایی کرده و در کسری از ثانیه متصل می‌شود.

۳. **آزمایش اتصال:**
```bash
npm run status
```

</div>

---

<div align="center">
Crafted with ❤️ by <b>Hesam Mousavi (<a href="https://github.com/Hesvm">Hesvm</a>)</b> for autonomous advertising & agentic workflows.
</div>
