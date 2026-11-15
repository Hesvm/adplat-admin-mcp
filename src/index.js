import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AdplatClient } from "./api-client.js";
import { AuthManager } from "./auth.js";

const server = new McpServer({
  name: "adplat-admin-mcp",
  version: "1.1.0"
});

// Helper to format response text
const jsonResponse = (data) => ({
  content: [
    {
      type: "text",
      text: typeof data === "string" ? data : JSON.stringify(data, null, 2)
    }
  ]
});

// Helper for error response
const errorResponse = (err) => ({
  content: [
    {
      type: "text",
      text: `Error: ${err.message || String(err)}`
    }
  ],
  isError: true
});

// ==========================================
// 1. AUTHENTICATION (3-TIER WATERFALL)
// ==========================================
server.tool(
  "adplat_auth_status",
  "Check current Adplat Admin authentication status and profile information.",
  {},
  async () => {
    try {
      const token = AuthManager.getToken();
      if (!token) {
        return jsonResponse({
          authenticated: false,
          message: "No active session found. You can log in using adplat_auth_send_otp or adplat_auth_login_password."
        });
      }
      const profile = await AdplatClient.getProfile();
      return jsonResponse({
        authenticated: true,
        sessionTokenMasked: token.slice(0, 8) + '...' + token.slice(-6),
        profile: profile.profile || profile
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_auth_send_otp",
  "Send an SMS verification code (OTP) to your phone number for passwordless login without extracting cookies.",
  {
    phoneNumber: z.string().describe("Your mobile number (e.g. 09014182301 or +989014182301)")
  },
  async ({ phoneNumber }) => {
    try {
      const result = await AuthManager.sendOtp(phoneNumber);
      return jsonResponse({
        success: true,
        message: `کد تأیید به شماره ${result.phoneNumber} ارسال شد. لطفاً کد دریافتی را با ابزار adplat_auth_verify_otp ارسال کنید.`,
        data: result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_auth_verify_otp",
  "Verify the SMS OTP code sent to your phone, automatically extract session token, and activate session.",
  {
    phoneNumber: z.string().describe("Mobile number that received the SMS OTP"),
    code: z.string().describe("5 or 6 digit verification code from SMS")
  },
  async ({ phoneNumber, code }) => {
    try {
      const result = await AuthManager.verifyOtp(phoneNumber, code);
      const profile = await AdplatClient.getProfile().catch(() => null);
      return jsonResponse({
        success: true,
        message: "ورود موفقیت‌آمیز بود! نشست ذخیره شد و تمام ابزارهای ادمین ادپلت فعال شدند.",
        sessionToken: result.token,
        profile: profile?.profile || profile || result.user
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_auth_login_password",
  "Log in using phone number and password directly.",
  {
    phoneNumber: z.string().describe("Mobile number"),
    password: z.string().describe("Account password")
  },
  async ({ phoneNumber, password }) => {
    try {
      const result = await AuthManager.loginPassword(phoneNumber, password);
      return jsonResponse(result);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_session",
  "Manually update the Adplat Better-Auth session token (fallback option).",
  {
    token: z.string().describe("The __Secure-better-auth.session_token cookie value")
  },
  async ({ token }) => {
    try {
      AuthManager.setToken(token);
      const profile = await AdplatClient.getProfile();
      return jsonResponse({
        success: true,
        message: "Session token updated successfully!",
        profile: profile.profile || profile
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 2. ANALYTICS & DASHBOARD METRICS
// ==========================================
server.tool(
  "adplat_get_dashboard_analytics",
  "Get overall analytics, total impressions, total clicks, timeSeries data, and breakdowns across date ranges.",
  {
    startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("End date (YYYY-MM-DD)"),
    campaignId: z.string().optional().describe("Filter by specific campaign ID")
  },
  async (args) => {
    try {
      const data = await AdplatClient.getAnalytics(args);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_statistics_summary",
  "Get summary statistics: count of unanswered tickets and payments pending approval.",
  {},
  async () => {
    try {
      const [tickets, payments] = await Promise.all([
        AdplatClient.getUnansweredTicketsSummary().catch(e => ({ error: e.message })),
        AdplatClient.getPendingPaymentsSummary().catch(e => ({ error: e.message }))
      ]);
      return jsonResponse({
        unansweredTickets: tickets,
        pendingApprovalPayments: payments
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 3. SUPPORT TICKETS
// ==========================================
server.tool(
  "adplat_list_tickets",
  "List support tickets with optional filtering by status (answered, waiting, in_progress, closed), search keyword, or userId.",
  {
    userId: z.string().optional().describe("Filter tickets by specific user ID"),
    search: z.string().optional().describe("Search term in ticket number, customer name, mobile, email, or company")
  },
  async (args) => {
    try {
      const data = await AdplatClient.listTickets(args);
      let tickets = data.tickets || [];
      if (args.search) {
        const q = args.search.toLowerCase();
        tickets = tickets.filter(t => 
          (t.userName && t.userName.toLowerCase().includes(q)) ||
          (t.userPhoneNumber && t.userPhoneNumber.includes(q)) ||
          (t.userCompanyName && t.userCompanyName.toLowerCase().includes(q)) ||
          (String(t.ticketNumber).includes(q))
        );
      }
      return jsonResponse({
        total: tickets.length,
        tickets
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_ticket_details",
  "Retrieve complete details of a support ticket including all historical messages between user and support.",
  {
    ticketId: z.string().describe("UUID of the support ticket")
  },
  async ({ ticketId }) => {
    try {
      const data = await AdplatClient.getTicket(ticketId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_reply_ticket",
  "Send an official admin response message to a support ticket.",
  {
    ticketId: z.string().describe("UUID of the support ticket"),
    message: z.string().describe("Text of the reply message to the customer"),
    attachments: z.array(z.string()).optional().describe("Array of image/attachment URLs to include with the message")
  },
  async ({ ticketId, message, attachments = [] }) => {
    try {
      await AdplatClient.replyTicket(ticketId, message, attachments);
      return jsonResponse({
        success: true,
        message: `Reply sent successfully to ticket ${ticketId}`
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 4. CAMPAIGNS MANAGEMENT
// ==========================================
server.tool(
  "adplat_list_campaigns",
  "List all campaigns with their IDs, names, status, budget, type (advanced/search), and dates.",
  {
    status: z.enum(["all", "active", "draft", "paused", "approved", "completed", "rejected"]).optional().describe("Filter by campaign status")
  },
  async ({ status }) => {
    try {
      const data = await AdplatClient.listCampaigns();
      let campaigns = data.campaigns || [];
      if (status && status !== "all") {
        campaigns = campaigns.filter(c => c.status === status);
      }
      return jsonResponse({
        total: campaigns.length,
        campaigns
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_campaign_details",
  "Get full details of a specific campaign including its targeting, bookings, and creative assets.",
  {
    campaignId: z.string().describe("UUID of the campaign")
  },
  async ({ campaignId }) => {
    try {
      const [campaign, bookings, creatives] = await Promise.all([
        AdplatClient.getCampaign(campaignId).catch(e => ({ error: e.message })),
        AdplatClient.getCampaignBookings(campaignId).catch(e => ({ error: e.message })),
        AdplatClient.getCampaignCreatives(campaignId).catch(e => ({ error: e.message }))
      ]);
      return jsonResponse({
        campaign,
        bookings,
        creatives
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_campaign_status",
  "Change the status of a campaign (e.g., active, paused, draft, rejected).",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    status: z.enum(["active", "paused", "draft", "rejected"]).describe("New status for the campaign")
  },
  async ({ campaignId, status }) => {
    try {
      const data = await AdplatClient.updateCampaignStatus(campaignId, status);
      return jsonResponse({
        success: true,
        message: `Campaign ${campaignId} status changed to ${status}`,
        result: data
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_add_campaign_budget",
  "Add additional budget to a campaign directly.",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    addAmount: z.number().positive().describe("Amount in Tomans to add to the campaign budget")
  },
  async ({ campaignId, addAmount }) => {
    try {
      const data = await AdplatClient.addCampaignBudget(campaignId, addAmount);
      return jsonResponse({
        success: true,
        message: `Added ${addAmount.toLocaleString()} Tomans to campaign ${campaignId}`,
        result: data
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_fund_campaign",
  "Fund and activate budget for a campaign from user's account.",
  {
    campaignId: z.string().describe("UUID of the campaign")
  },
  async ({ campaignId }) => {
    try {
      const data = await AdplatClient.fundCampaign(campaignId);
      return jsonResponse({
        success: true,
        message: `Campaign ${campaignId} funded successfully`,
        result: data
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_transfer_campaign_owner",
  "Transfer ownership of a campaign to another user ID.",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    targetUserId: z.string().describe("User ID of the new owner")
  },
  async ({ campaignId, targetUserId }) => {
    try {
      const data = await AdplatClient.transferCampaignOwner(campaignId, targetUserId);
      return jsonResponse({
        success: true,
        message: `Campaign ${campaignId} ownership transferred to user ${targetUserId}`,
        result: data
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_campaign_creative",
  "Update visual and text creative items for a campaign (title, logo, background, video, colors, copyright, etc.).",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    items: z.array(z.object({
      contentFieldId: z.string().describe("Field ID or slug (e.g., destination_url, title, logo, bg_image)"),
      value: z.string().describe("New text, URL, or image CDN path value")
    })).describe("Array of creative field updates")
  },
  async ({ campaignId, items }) => {
    try {
      const data = await AdplatClient.updateCampaignCreatives(campaignId, items);
      return jsonResponse({
        success: true,
        message: `Creatives updated for campaign ${campaignId}`,
        result: data
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_cancel_campaign_bookings",
  "Cancel specific booking dates for a campaign with a recorded reason.",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    bookingIds: z.array(z.string()).describe("List of booking UUIDs to cancel"),
    reason: z.string().optional().describe("Reason for cancellation")
  },
  async ({ campaignId, bookingIds, reason = "" }) => {
    try {
      const data = await AdplatClient.cancelCampaignBookings(campaignId, bookingIds, reason);
      return jsonResponse({
        success: true,
        message: `Cancelled ${bookingIds.length} bookings for campaign ${campaignId}`,
        result: data
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_campaign_timeline",
  "Get the historical lifecycle and event timeline of a campaign.",
  {
    campaignId: z.string().describe("UUID of the campaign")
  },
  async ({ campaignId }) => {
    try {
      const data = await AdplatClient.getCampaignTimeline(campaignId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_list_creative_revisions",
  "List creative revision requests and draft changes submitted for a campaign.",
  {
    campaignId: z.string().describe("UUID of the campaign")
  },
  async ({ campaignId }) => {
    try {
      const data = await AdplatClient.listCreativeRevisions(campaignId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_apply_creative_revision",
  "Approve and apply a pending creative revision to the live campaign.",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    revisionId: z.string().describe("UUID of the revision to apply")
  },
  async ({ campaignId, revisionId }) => {
    try {
      const data = await AdplatClient.applyCreativeRevision(campaignId, revisionId);
      return jsonResponse({
        success: true,
        message: `Creative revision ${revisionId} applied to campaign ${campaignId}`,
        result: data
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 5. AD PLACES, INVENTORY & TARGETING
// ==========================================
server.tool(
  "adplat_list_ad_places",
  "List all 13 ad placement slots in Dastyar (Extension sleeve, mobile, calendar event, quick icon, etc.) with price and 30-day performance stats.",
  {
    campaignType: z.enum(["advanced", "search"]).optional().default("advanced").describe("Campaign type")
  },
  async ({ campaignType }) => {
    try {
      const data = await AdplatClient.listAdPlaces(campaignType);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_ad_place_availability",
  "Check live day-by-day slot availability and booked vs vacant capacity for any ad place in a date range.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    from: z.string().describe("Start date (YYYY-MM-DD)"),
    to: z.string().describe("End date (YYYY-MM-DD)")
  },
  async ({ adPlaceId, from, to }) => {
    try {
      const data = await AdplatClient.getAdPlaceAvailability(adPlaceId, from, to);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_targeting_options",
  "Get all targeting options: categories, topics, cities, and careers for audience targeting.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getTargetingOptions();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_search_inventory",
  "Get inventory capacity and cluster availability for search campaigns.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getSearchInventory();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 6. SEARCH CLUSTERS (SERP)
// ==========================================
server.tool(
  "adplat_list_search_clusters",
  "List all SERP search clusters, their keywords count, bound placements, and volume.",
  {},
  async () => {
    try {
      const data = await AdplatClient.listSearchClusters();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_list_placement_variants",
  "List all available placement templates and variants (e.g. Google SERP, Hooshang Banner, etc.).",
  {},
  async () => {
    try {
      const data = await AdplatClient.getPlacementVariants();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_create_search_cluster",
  "Create a new SERP Search Cluster with a name, keyword list, industry bindings, and volume.",
  {
    name: z.string().describe("Cluster display name (e.g. 'تورهای گردشگری نوروز')"),
    keywords: z.array(z.string()).min(1).describe("List of search keywords for this cluster"),
    industryIds: z.array(z.string()).optional().describe("Array of industry UUIDs"),
    allowedContentVariantIds: z.array(z.string()).optional().describe("Array of placement variant IDs allowed"),
    volume: z.number().optional().default(1000).describe("Estimated monthly search volume"),
    source: z.string().optional().default("custom").describe("Source identifier (e.g. custom, dastyar)")
  },
  async (args) => {
    try {
      const data = await AdplatClient.createSearchCluster(args);
      return jsonResponse({
        success: true,
        message: `Search cluster '${args.name}' created successfully with ${args.keywords.length} keywords!`,
        result: data
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_search_cluster",
  "Update an existing Search Cluster's keywords, name, industries, or allowed placement variants.",
  {
    clusterId: z.string().describe("UUID of the search cluster"),
    name: z.string().optional().describe("New cluster name"),
    keywords: z.array(z.string()).optional().describe("Updated array of keywords"),
    industryIds: z.array(z.string()).optional().describe("Updated array of industry IDs"),
    allowedContentVariantIds: z.array(z.string()).optional().describe("Updated array of allowed variant IDs"),
    volume: z.number().optional().describe("Updated volume estimate")
  },
  async ({ clusterId, ...data }) => {
    try {
      const result = await AdplatClient.updateSearchCluster(clusterId, data);
      return jsonResponse({
        success: true,
        message: `Search cluster ${clusterId} updated successfully`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_delete_search_cluster",
  "Delete a Search Cluster by ID.",
  {
    clusterId: z.string().describe("UUID of the search cluster to delete")
  },
  async ({ clusterId }) => {
    try {
      const result = await AdplatClient.deleteSearchCluster(clusterId);
      return jsonResponse({
        success: true,
        message: `Search cluster ${clusterId} deleted`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_refresh_search_cluster",
  "Sync and refresh a Search Cluster from its external source.",
  {
    clusterId: z.string().describe("UUID of the search cluster to refresh")
  },
  async ({ clusterId }) => {
    try {
      const result = await AdplatClient.refreshSearchCluster(clusterId);
      return jsonResponse({
        success: true,
        message: `Search cluster ${clusterId} synced with source`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_external_search_clusters",
  "Discover and query external search clusters sorted by volume.",
  {
    source: z.string().optional().default("all").describe("Source filter (all, dastyar, google)"),
    sort: z.string().optional().default("volume").describe("Sort order (volume, name)")
  },
  async ({ source, sort }) => {
    try {
      const data = await AdplatClient.getExternalSearchClusters({ source, sort });
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 7. USERS & WALLETS
// ==========================================
server.tool(
  "adplat_list_users",
  "List users registered on Adplat with their balance, role, contact info, and company name.",
  {
    search: z.string().optional().describe("Search by name, phone, email, or company"),
    role: z.enum(["all", "user", "admin"]).optional().describe("Filter by user role")
  },
  async (args) => {
    try {
      const data = await AdplatClient.listUsers();
      let users = data.users || [];
      if (args.role && args.role !== "all") {
        users = users.filter(u => u.role === args.role);
      }
      if (args.search) {
        const q = args.search.toLowerCase();
        users = users.filter(u =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.phoneNumber && u.phoneNumber.includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.companyName && u.companyName.toLowerCase().includes(q))
        );
      }
      return jsonResponse({
        total: users.length,
        users
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_user_details",
  "Get full profile details for a specific user, including balance, verified phone, and campaigns list.",
  {
    userId: z.string().describe("User ID")
  },
  async ({ userId }) => {
    try {
      const data = await AdplatClient.getUser(userId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 8. PAYMENTS & TRANSACTIONS
// ==========================================
server.tool(
  "adplat_list_payments",
  "List payment transactions and receipts.",
  {
    status: z.enum(["all", "pending", "approved", "rejected"]).optional().describe("Filter payments by approval status")
  },
  async ({ status }) => {
    try {
      const data = await AdplatClient.listPayments();
      let payments = data.payments || [];
      if (status && status !== "all") {
        payments = payments.filter(p => p.status === status);
      }
      return jsonResponse({
        total: payments.length,
        payments
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_review_payment",
  "Approve or reject a user payment / bank receipt.",
  {
    paymentId: z.string().describe("UUID of the payment transaction"),
    action: z.enum(["approved", "rejected"]).describe("Approve or reject the payment"),
    rejectReason: z.string().optional().describe("Reason if rejected")
  },
  async ({ paymentId, action, rejectReason }) => {
    try {
      const result = await AdplatClient.reviewPayment(paymentId, action, rejectReason);
      return jsonResponse({
        success: true,
        message: `Payment ${paymentId} marked as ${action}`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 9. INDUSTRIES
// ==========================================
server.tool(
  "adplat_list_industries",
  "List all business industries / categories configured on Adplat.",
  {},
  async () => {
    try {
      const data = await AdplatClient.listIndustries();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 10. NOTIFICATIONS
// ==========================================
server.tool(
  "adplat_list_notifications",
  "List recent admin notifications and unread alert count.",
  {
    limit: z.number().optional().default(10).describe("Max notifications to retrieve")
  },
  async ({ limit }) => {
    try {
      const data = await AdplatClient.listNotifications(limit);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_mark_notification_read",
  "Mark a notification as read.",
  {
    notificationId: z.string().describe("UUID of the notification")
  },
  async ({ notificationId }) => {
    try {
      const data = await AdplatClient.markNotificationRead(notificationId);
      return jsonResponse({
        success: true,
        result: data
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 11. MEDIA & ASSET UPLOADER
// ==========================================
server.tool(
  "adplat_upload_image",
  "Upload a local image file (logo, banner, background) to Adplat CDN.",
  {
    filePath: z.string().describe("Absolute local path to the image file"),
    folder: z.string().optional().default("campaigns/creatives").describe("Target folder on CDN (e.g. campaigns/creatives, tickets/attachments)")
  },
  async ({ filePath, folder }) => {
    try {
      const result = await AdplatClient.uploadImage(filePath, folder);
      return jsonResponse({
        success: true,
        file: result.file || result,
        url: result.url || result.fileUrl || result.path
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// START SERVER
// ==========================================
export async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Adplat Admin MCP Server is running on stdio");
}
