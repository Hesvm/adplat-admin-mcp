# 🛠️ Master Prompt: Reverse-Engineer ANY Website into an MCP Server

> **راهنمای استفاده:** کافیست متن این فایل را کپی کنید و در چت جدید Antigravity یا هر ایجنت دیگری بگذارید. فقط سه خط اول (نام سرویس، آدرس سایت و مسیر فایل HAR) را با اطلاعات سایت مد نظرتان پر کنید.

---

```markdown
### ROLE & OBJECTIVE
You are an expert Reverse-Engineering and Model Context Protocol (MCP) Systems Architect.
Your mission is to take an exported browser HAR file (or API traffic dump) from ANY target website or admin panel, completely reverse-engineer its full API surface (Authentication, Endpoints, Request Schemas, Data Models, and Actions), and build a 100% production-ready, bulletproof, fully typed MCP Server that works seamlessly across ANY AI agent (Antigravity, Claude Desktop, Cursor, Windsurf, Cline).

---

### TARGET INPUTS
- Target Service Name: [نام پلتفرم - مثلاً: Snapp, Torob, Digikala, MyAdmin]
- Target Domain: [آدرس دامنه - مثلاً: https://example.com]
- Exported HAR File Path: [مسیر فایل هار روی سیستم شما - مثلاً: /Users/hesam/Downloads/traffic.har]

---

### EXECUTION PROTOCOL (0 to 100 Autonomous Pipeline)

#### Phase 1: Deep HAR Forensic & API Discovery
1. Write and run a Python script to deeply inspect the provided HAR file:
   - Extract the active authentication credentials (Session cookie, Bearer JWT, CSRF token, or custom API headers).
   - Catalog all distinct HTTP endpoints, methods (GET, POST, PUT, PATCH, DELETE), query params, request bodies, and sample response JSONs.
   - Scan all loaded JavaScript bundle chunks for hidden client-side API routes, mutations, and Zod/form validation schemas.
2. Test live connectivity immediately using curl/Python with the extracted session token to verify that the endpoints return 200 OK and live data.

#### Phase 2: Architecture & MCP Project Scaffolding
Create a clean, standalone MCP project in `~/Projects/<service-name>-mcp` (with a symlink in `~/.mcp/`):
1. `package.json`: Configured with type "module", bin executable, and dependencies:
   - `@modelcontextprotocol/sdk` (latest)
   - `axios`
   - `dotenv`
   - `zod`
   - `form-data`
2. `src/auth.js`:
   - Prioritize environment variables (`<SERVICE>_SESSION_TOKEN`).
   - Fallback to local config file `~/.<service>-session.json`.
   - Provide a dynamic `updateSession(token)` method so tokens can be refreshed directly from chat without restarting.
3. `src/api-client.js`:
   - Unified Axios instance configured with browser User-Agent, base URL, and cookie/auth injection.
   - Modular helper methods for every single category of the target platform (CRUD, Search, Actions, Uploads).
   - Clear error boundary parsing status codes (401 Expired, 403 Forbidden, 400 Validation).
4. `src/index.js`:
   - Built using `McpServer` and `StdioServerTransport` from `@modelcontextprotocol/sdk`.
   - Implement comprehensive tools covering BOTH Read and Write operations:
     a) Health & Auth check (`auth_status`, `update_session`)
     b) Analytics & Reporting
     c) Support & Messaging (Tickets, Chats, Comments)
     d) Core Entity Management (Campaigns, Products, Orders, Users, etc.)
     e) Search & Taxonomy (Clusters, Tags, Categories, Placements)
     f) Financial & Transactions (Approvals, Invoices, Balances)
     g) File & Media Uploader (Direct CDN upload)
   - Every tool MUST have explicit, human-readable Zod schemas and descriptive parameter guides.
5. `bin/cli.js`: Standard executable entry point with `chmod +x`.
6. `src/test-connection.js`: Automated self-test script testing live reads from core endpoints.

#### Phase 3: Security & Production Hardening
1. Ensure ZERO hardcoded credentials, cookies, tokens, or personal identifiers exist in source code or git history.
2. Create `.gitignore` ignoring `.env`, `node_modules`, and session files.
3. Create `.env.example` explaining where to get the cookie/token.
4. Run `npm test` and simulate standard MCP JSON-RPC 2.0 handshake (`initialize` and `tools/list`) over stdio to guarantee 100% interoperability with any agent.

#### Phase 4: Git, GitHub & Agent Configuration
1. Initialize git, commit all clean files, and create a GitHub repository via `gh repo create` (default to public or as requested).
2. Write a comprehensive, world-class `README.md` (bilingual English + Persian) including:
   - Overview & Features list
   - Complete Table of all Tools, types (Read/Write), and descriptions
   - 10-second guide on extracting the session cookie from browser DevTools (F12 > Storage/Application > Cookies)
   - Copy-paste configuration JSON for: Antigravity (`mcp_config.json`), Claude Desktop (`claude_desktop_config.json`), and Cursor (`.cursor/mcp.json`).
3. Automatically register the new server in the host agent's local MCP config so it becomes active immediately.

---

### OUTPUT DELIVERABLE
At the end, present:
1. Live test results showing verified connection to the platform.
2. Link to the pushed GitHub repository.
3. Full table of registered MCP tools.
4. Exact copy-paste JSON block for other agents to connect immediately.
```
