import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AdplatClient } from "./api-client.js";
import { AuthManager } from "./auth.js";

const server = new McpServer({
  name: "adplat-admin-mcp",
  version: "1.0.0"
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
// 1. AUTHENTICATION & PROFILE
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
          message: "No session token found. Please set ADPLAT_SESSION_TOKEN environment variable or use adplat_update_session."
        });
      }
      const profile = await AdplatClient.getProfile();
      return jsonResponse({
        authenticated: true,
        profile: profile.profile || profile
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_session",
  "Update the Adplat Better-Auth session token without editing config files.",
  {
    token: z.string().describe("The __Secure-better-auth.session_token cookie value from Firefox/Chrome")
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

// ==========================================
// 5. SEARCH CLUSTERS (SERP)
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

// ==========================================
// 6. USERS & WALLETS
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
// 7. PAYMENTS & TRANSACTIONS
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
// 8. INDUSTRIES
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
// 9. MEDIA & ASSET UPLOADER
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
