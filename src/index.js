import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AdplatClient } from "./api-client.js";
import { AuthManager } from "./auth.js";

const server = new McpServer({
  name: "adplat-admin-mcp",
  version: "1.4.0"
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
// 1. AUTHENTICATION & PROFILE (7 TOOLS)
// ==========================================
server.tool(
  "adplat_auth_status",
  "Check current Adplat Admin authentication status, active session identity, and auto-renewal capability.",
  {},
  async () => {
    try {
      const token = AuthManager.getToken();
      const apiKey = AuthManager.getApiKey();
      const hasCreds = AuthManager.hasCredentials();

      if (!token && !apiKey && !hasCreds) {
        return jsonResponse({
          authenticated: false,
          autoRenewActive: false,
          message: "No active session, API key, or credentials found. Use adplat_auth_send_otp / adplat_auth_login_password or browser login."
        });
      }

      const profile = await AdplatClient.getProfile();
      return jsonResponse({
        authenticated: true,
        authMethod: apiKey ? "api_key" : (token ? "session_token" : "credentials"),
        sessionTokenMasked: token ? (token.slice(0, 8) + '...' + token.slice(-6)) : null,
        apiKeyActive: Boolean(apiKey),
        autoRenewActive: hasCreds,
        profile: profile.profile || profile
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_auth_send_otp",
  "Send an SMS verification code (OTP) to an admin phone number for passwordless authentication.",
  {
    phoneNumber: z.string().describe("Admin mobile number (e.g. 09014182301 or +989014182301)")
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
  "Verify SMS OTP code sent to phone number, automatically extract session token, and persist session.",
  {
    phoneNumber: z.string().describe("Mobile number that received the SMS OTP"),
    code: z.string().describe("Verification code from SMS")
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
    phoneNumber: z.string().describe("Admin mobile number"),
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
  "Manually update or replace the Better-Auth session token.",
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

server.tool(
  "adplat_auth_set_api_key",
  "Configure a permanent Adplat Admin API Key (service token) for perpetual authentication without expiration.",
  {
    apiKey: z.string().describe("Permanent API key (e.g. adp_live_...)")
  },
  async ({ apiKey }) => {
    try {
      AuthManager.setApiKey(apiKey);
      const profile = await AdplatClient.getProfile().catch(() => null);
      return jsonResponse({
        success: true,
        message: "Permanent API Key saved successfully to ~/.adplat-session.json!",
        profile: profile?.profile || profile || { role: "admin" }
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_profile",
  "Retrieve full identity and permissions profile of the currently logged-in administrator.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getProfile();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 2. EXECUTIVE ANALYTICS & DEEP STATS (22 TOOLS)
// ==========================================
server.tool(
  "adplat_get_dashboard_analytics",
  "Get overall analytics, total impressions, total clicks, CTR, and timeSeries data across date ranges.",
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
  "Get summary counters: count of unanswered tickets and payments pending approval.",
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

server.tool(
  "adplat_get_users_overview_stats",
  "Get user growth metrics, total users, new registrations in current month vs previous month.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getUsersOverviewStats();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_customer_insights",
  "Get high-level customer insights: payment mix, registration trends, concentration, top spenders, and at-risk customers.",
  {
    period: z.string().optional().describe("Period filter (e.g. 30d, 90d, 1y)")
  },
  async (args) => {
    try {
      const data = await AdplatClient.getCustomerInsights(args);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_unspent_funds_overview",
  "Get total circulating unspent advertiser funds held across user wallets and active campaigns.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getUnspentFundsOverview();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_unspent_funds_details",
  "Get detailed itemized list of unspent funds broken down by wallets or campaigns.",
  {
    type: z.enum(["wallets", "campaigns"]).optional().default("wallets").describe("Target balance breakdown type")
  },
  async ({ type }) => {
    try {
      const data = await AdplatClient.getUnspentFundsDetails(type);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_sales_overview_stats",
  "Get gross platform sales metrics, order counts, average order value, and percentage change.",
  {
    period: z.string().optional().describe("Period range (e.g. 30d, 90d)")
  },
  async (args) => {
    try {
      const data = await AdplatClient.getSalesOverviewStats(args);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_sales_capacity_stats",
  "Get total available vs reserved placement slots, total slot capacity value, and utilization percentage.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getSalesCapacityStats();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_sales_details_stats",
  "Get detailed itemized orders and transactions report for sales analytics.",
  {
    page: z.number().optional().default(1),
    pageSize: z.number().optional().default(20)
  },
  async (args) => {
    try {
      const data = await AdplatClient.getSalesDetailsStats(args);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_sales_trend_stats",
  "Get historical sales revenue trend datapoints over time.",
  {
    period: z.string().optional().describe("Trend period (e.g. 30d, 90d)")
  },
  async (args) => {
    try {
      const data = await AdplatClient.getSalesTrendStats(args);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_sales_by_placement_stats",
  "Get total sales revenue and booking volumes broken down by ad placement and hosting platform.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getSalesByPlacementStats();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_campaigns_overview_stats",
  "Get high-level count of campaigns grouped by status (active, completed, pendingPayment, pendingReview).",
  {},
  async () => {
    try {
      const data = await AdplatClient.getCampaignsOverviewStats();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_campaign_status_details_stats",
  "Get list of campaigns for a specific operational status group.",
  {
    group: z.enum(["active", "completed", "pendingPayment", "pendingReview"]).describe("Status group")
  },
  async ({ group }) => {
    try {
      const data = await AdplatClient.getCampaignStatusDetailsStats(group);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_pending_review_campaigns_stats",
  "Get all campaigns currently awaiting creative review and admin approval before launch.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getPendingReviewCampaignsStats();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_pending_funding_campaigns_stats",
  "Get all campaigns awaiting payment or wallet funding to begin serving.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getPendingFundingCampaignsStats();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_ending_soon_campaigns_stats",
  "Get campaigns whose schedule ends within the next 48 hours for upsell or extension.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getEndingSoonCampaignsStats();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_placement_performance_stats",
  "Get comprehensive rankings, click-through rates (CTR), impressions, and performance changes across all ad placements.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getPlacementPerformanceStats();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_placement_change_alerts_stats",
  "Get automated anomaly detection alerts for sudden spikes or drops in placement impressions or clicks.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getPlacementChangeAlertsStats();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_placement_trend_stats",
  "Get time-series performance trend and rolling averages for a specific ad placement.",
  {
    placementId: z.string().describe("UUID of the ad place"),
    days: z.number().optional().default(30).describe("Days of history (e.g. 7, 30, 90)")
  },
  async ({ placementId, days }) => {
    try {
      const data = await AdplatClient.getPlacementTrendStats(placementId, days);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_capacity_fulfillment_stats",
  "Get month-by-month Shamsi capacity fulfillment and slot saturation rates.",
  {
    year: z.number().optional().describe("Shamsi year (e.g. 1403)"),
    month: z.number().optional().describe("Shamsi month (1-12)")
  },
  async ({ year, month }) => {
    try {
      const data = await AdplatClient.getCapacityFulfillmentStats(year, month);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_placements_overview",
  "Get a full hierarchy overview of all hosting platforms and their nested placements with active slot counts.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getPlacementsOverview();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_placements_stats",
  "Get aggregate 30-day clicks, impressions, and engagement rates indexed by placement UUID.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getPlacementsStats();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 3. AD PLACES & PLATFORMS MANAGEMENT (16 TOOLS)
// ==========================================
server.tool(
  "adplat_list_ad_places",
  "List all ad placements across all digital platforms (Dastyar, Hooshang, Davat) with dimensions, specs, base prices, and 30-day stats.",
  {
    campaignType: z.enum(["all", "smart", "advanced", "search"]).optional().default("advanced").describe("Filter by supported campaign type")
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
  "adplat_get_ad_place_details",
  "Retrieve complete specification, pricing, serving rules, and platform metadata for a single ad placement.",
  {
    adPlaceId: z.string().describe("UUID of the ad place")
  },
  async ({ adPlaceId }) => {
    try {
      const data = await AdplatClient.getAdPlace(adPlaceId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_create_ad_place",
  "Create a brand-new ad placement under an existing digital platform.",
  {
    platformId: z.string().describe("UUID of the parent platform"),
    placementKey: z.string().describe("Unique alphanumeric slug (e.g. ext-header-banner)"),
    name: z.string().describe("Display title in Persian (e.g. بنر بالای افزونه)"),
    description: z.string().describe("Full description and copy constraints"),
    previewImageUrl: z.string().optional().describe("CDN URL of placement preview mockup"),
    allowedCampaignTypes: z.array(z.string()).describe("Allowed types: ['smart', 'advanced']"),
    totalCapacitySlots: z.number().describe("Total simultaneous advertiser slots available"),
    pricePerSlotPerDay: z.number().describe("Base price per slot per day in Tomans"),
    searchCampaignBasePrice: z.number().optional().default(0).describe("Base price for search campaigns"),
    servingType: z.enum(["rotational", "list"]).describe("rotational (single ad per view) or list (multiple ads)"),
    placementGoal: z.enum(["awareness", "performance", "search"]).describe("Primary marketing goal"),
    isTimeframeBased: z.boolean().default(true).describe("Whether slots are reserved by calendar date range")
  },
  async (args) => {
    try {
      const result = await AdplatClient.createAdPlace(args);
      return jsonResponse({
        success: true,
        message: "جایگاه تبلیغاتی با موفقیت ایجاد شد.",
        adPlace: result.adPlace || result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_ad_place",
  "Update complete settings, capacity, goal, serving type, and info of an ad placement.",
  {
    adPlaceId: z.string().describe("UUID of the ad place to update"),
    name: z.string().optional().describe("Placement title"),
    description: z.string().optional().describe("Placement description"),
    previewImageUrl: z.string().optional().describe("CDN URL of preview image"),
    totalCapacitySlots: z.number().optional().describe("Total simultaneous slots"),
    pricePerSlotPerDay: z.number().optional().describe("Daily slot price in Tomans"),
    searchCampaignBasePrice: z.number().optional().describe("Search campaign base price"),
    servingType: z.enum(["rotational", "list"]).optional().describe("rotational or list"),
    placementGoal: z.enum(["awareness", "performance", "search"]).optional().describe("Placement goal"),
    allowedCampaignTypes: z.array(z.string()).optional().describe("Allowed campaign types")
  },
  async ({ adPlaceId, ...updateData }) => {
    try {
      const result = await AdplatClient.updateAdPlace(adPlaceId, updateData);
      return jsonResponse({
        success: true,
        message: "اطلاعات جایگاه با موفقیت به‌روزرسانی شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_ad_place_base_price",
  "Update the base daily slot price for an ad placement directly (in Tomans).",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    pricePerSlotPerDay: z.number().describe("New daily price per slot in Tomans (e.g. 3500000)")
  },
  async ({ adPlaceId, pricePerSlotPerDay }) => {
    try {
      const result = await AdplatClient.updateAdPlaceBasePrice(adPlaceId, pricePerSlotPerDay);
      return jsonResponse({
        success: true,
        message: `قیمت پایه جایگاه با موفقیت به ${pricePerSlotPerDay.toLocaleString('fa-IR')} تومان تغییر یافت.`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_toggle_ad_place_status",
  "Activate or deactivate an ad placement so advertisers can or cannot book it.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    isActive: z.boolean().describe("true to activate, false to deactivate")
  },
  async ({ adPlaceId, isActive }) => {
    try {
      const result = await AdplatClient.toggleAdPlaceStatus(adPlaceId, isActive);
      return jsonResponse({
        success: true,
        message: isActive ? "جایگاه فعال شد." : "جایگاه غیرفعال شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_delete_ad_place",
  "Delete an ad placement from the platform (caution: irreversible).",
  {
    adPlaceId: z.string().describe("UUID of the ad place to delete")
  },
  async ({ adPlaceId }) => {
    try {
      const result = await AdplatClient.deleteAdPlace(adPlaceId);
      return jsonResponse({
        success: true,
        message: "جایگاه با موفقیت حذف شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_ad_place_occupancy",
  "Get calendar occupancy details for an ad placement showing booked slots vs available capacity per day.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    year: z.number().describe("Calendar year (Shamsi or Gregorian according to month)"),
    month: z.number().describe("Calendar month (1-12)")
  },
  async ({ adPlaceId, year, month }) => {
    try {
      const data = await AdplatClient.getAdPlaceOccupancy(adPlaceId, year, month);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_ad_place_pricing_calendar",
  "Get daily pricing calendar overrides for a date range (shows special high-demand or holiday pricing).",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    from: z.string().describe("Start date (YYYY-MM-DD)"),
    to: z.string().describe("End date (YYYY-MM-DD)")
  },
  async ({ adPlaceId, from, to }) => {
    try {
      const data = await AdplatClient.getAdPlacePricingCalendar(adPlaceId, from, to);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_set_ad_place_daily_pricing",
  "Set special custom daily prices (overrides) for specific dates (e.g. Black Friday, holidays, campaign season).",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    overrides: z.record(z.number()).describe("Map of date string (YYYY-MM-DD) to price in Tomans (e.g. {'2026-11-28': 5000000})")
  },
  async ({ adPlaceId, overrides }) => {
    try {
      const result = await AdplatClient.setAdPlaceDailyPricing(adPlaceId, overrides);
      return jsonResponse({
        success: true,
        message: "قیمت‌گذاری روزانه با موفقیت ذخیره شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_delete_ad_place_daily_pricing",
  "Remove daily price overrides for given dates, resetting them back to base placement price.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    dates: z.array(z.string()).describe("Array of date strings (YYYY-MM-DD) to reset")
  },
  async ({ adPlaceId, dates }) => {
    try {
      const result = await AdplatClient.deleteAdPlaceDailyPricing(adPlaceId, dates);
      return jsonResponse({
        success: true,
        message: "قیمت‌های سفارشی حذف شدند و به قیمت پایه بازگشتند.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_set_ad_place_booking_blocks",
  "Lock or unlock specific calendar dates to prevent or allow advertiser bookings.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    dates: z.array(z.string()).describe("Array of date strings (YYYY-MM-DD)"),
    blocked: z.boolean().default(true).describe("true to block dates, false to unblock")
  },
  async ({ adPlaceId, dates, blocked }) => {
    try {
      const result = await AdplatClient.setAdPlaceBookingBlocks(adPlaceId, dates, blocked);
      return jsonResponse({
        success: true,
        message: blocked ? "روزهای انتخابی قفل شدند." : "قفل روزهای انتخابی باز شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_list_platforms",
  "List all digital platforms hosting ad places (Dastyar Extension, Mobile App, Davat, Hooshang).",
  {},
  async () => {
    try {
      const data = await AdplatClient.listPlatforms();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_create_platform",
  "Register a new host platform for ad distribution.",
  {
    name: z.string().describe("Platform title (e.g. اپلیکیشن اندروید هوشنگ)"),
    description: z.string().optional().default("").describe("Platform summary"),
    link: z.string().optional().describe("Product or landing page URL"),
    logoUrl: z.string().optional().describe("Logo CDN image URL")
  },
  async (args) => {
    try {
      const result = await AdplatClient.createPlatform(args);
      return jsonResponse({
        success: true,
        message: "پلتفرم جدید با موفقیت ایجاد شد.",
        platform: result.platform || result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_platform",
  "Update platform details, landing page, or branding logo.",
  {
    platformId: z.string().describe("UUID of the platform"),
    name: z.string().optional().describe("Platform title"),
    description: z.string().optional().describe("Description"),
    link: z.string().optional().describe("Website link"),
    logoUrl: z.string().optional().describe("Logo URL")
  },
  async ({ platformId, ...data }) => {
    try {
      const result = await AdplatClient.updatePlatform(platformId, data);
      return jsonResponse({
        success: true,
        message: "اطلاعات پلتفرم به‌روزرسانی شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_delete_platform",
  "Delete a host platform (caution: requires all nested placements to be deleted or reassigned).",
  {
    platformId: z.string().describe("UUID of the platform to delete")
  },
  async ({ platformId }) => {
    try {
      const result = await AdplatClient.deletePlatform(platformId);
      return jsonResponse({
        success: true,
        message: "پلتفرم با موفقیت حذف شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 4. PLACEMENT CONTENT ARCHITECTURE (15 TOOLS)
// ==========================================
server.tool(
  "adplat_get_placement_content_fields",
  "Get creative field definitions (image dimensions, title char limits, CTA requirements) for an ad place.",
  {
    adPlaceId: z.string().describe("UUID of the ad place")
  },
  async ({ adPlaceId }) => {
    try {
      const data = await AdplatClient.getPlacementContentFields(adPlaceId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_create_placement_content_field",
  "Add a new required or optional creative content field to an ad placement.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    name: z.string().describe("Field key name (e.g. banner, title, cta_text)"),
    label: z.string().describe("Display label in Persian (e.g. تصویر بنر)"),
    type: z.enum(["text", "image", "url", "textarea", "number", "select"]).describe("Field input type"),
    isRequired: z.boolean().default(true).describe("Whether field is mandatory"),
    description: z.string().optional().describe("Guidance instructions for advertiser"),
    validationRules: z.record(z.any()).optional().describe("Validation specs (e.g. minLength, maxLength, width, height)")
  },
  async ({ adPlaceId, ...data }) => {
    try {
      const result = await AdplatClient.createPlacementContentField(adPlaceId, data);
      return jsonResponse({
        success: true,
        message: "فیلد محتوا با موفقیت اضافه شد.",
        field: result.field || result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_placement_content_field",
  "Update validations, labels, or rules for an existing creative content field.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    fieldId: z.string().describe("UUID of the content field"),
    label: z.string().optional().describe("Label in Persian"),
    description: z.string().optional().describe("Description"),
    isRequired: z.boolean().optional().describe("Mandatory flag"),
    validationRules: z.record(z.any()).optional().describe("Validation specs")
  },
  async ({ adPlaceId, fieldId, ...data }) => {
    try {
      const result = await AdplatClient.updatePlacementContentField(adPlaceId, fieldId, data);
      return jsonResponse({
        success: true,
        message: "فیلد محتوا به‌روزرسانی شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_delete_placement_content_field",
  "Remove a content field definition from an ad place.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    fieldId: z.string().describe("UUID of the content field")
  },
  async ({ adPlaceId, fieldId }) => {
    try {
      const result = await AdplatClient.deletePlacementContentField(adPlaceId, fieldId);
      return jsonResponse({
        success: true,
        message: "فیلد محتوا با موفقیت حذف شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_placement_content_variants",
  "List creative variants (e.g. standard, compact, rich) configured for an ad place.",
  {
    adPlaceId: z.string().describe("UUID of the ad place")
  },
  async ({ adPlaceId }) => {
    try {
      const data = await AdplatClient.getPlacementContentVariants(adPlaceId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_create_placement_content_variant",
  "Create a creative layout variant for an ad placement.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    name: z.string().describe("Variant title in Persian"),
    key: z.string().describe("Variant unique key (e.g. variant_dark, compact)"),
    description: z.string().optional().describe("Description")
  },
  async ({ adPlaceId, ...data }) => {
    try {
      const result = await AdplatClient.createPlacementContentVariant(adPlaceId, data);
      return jsonResponse({
        success: true,
        message: "واریانت محتوا با موفقیت ایجاد شد.",
        variant: result.variant || result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_placement_content_variant",
  "Update variant metadata or status for an ad place.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    variantId: z.string().describe("UUID of the variant"),
    name: z.string().optional().describe("Title"),
    description: z.string().optional().describe("Description")
  },
  async ({ adPlaceId, variantId, ...data }) => {
    try {
      const result = await AdplatClient.updatePlacementContentVariant(adPlaceId, variantId, data);
      return jsonResponse({
        success: true,
        message: "واریانت محتوا به‌روزرسانی شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_delete_placement_content_variant",
  "Delete a creative variant from an ad place.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    variantId: z.string().describe("UUID of the variant")
  },
  async ({ adPlaceId, variantId }) => {
    try {
      const result = await AdplatClient.deletePlacementContentVariant(adPlaceId, variantId);
      return jsonResponse({
        success: true,
        message: "واریانت محتوا حذف شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_placement_content_template",
  "Retrieve HTML/JSON rendering template for a specific placement variant.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    variantId: z.string().describe("UUID of the variant")
  },
  async ({ adPlaceId, variantId }) => {
    try {
      const data = await AdplatClient.getPlacementContentTemplate(adPlaceId, variantId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_placement_content_template",
  "Save updated HTML/JSON rendering template for a placement variant.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    variantId: z.string().describe("UUID of the variant"),
    contentTemplate: z.string().describe("Template string or JSON structure")
  },
  async ({ adPlaceId, variantId, contentTemplate }) => {
    try {
      const result = await AdplatClient.updatePlacementContentTemplate(adPlaceId, variantId, contentTemplate);
      return jsonResponse({
        success: true,
        message: "قالب نمایش با موفقیت ذخیره شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_placement_content_items",
  "List active default content items and house ads configured for an ad place.",
  {
    adPlaceId: z.string().describe("UUID of the ad place")
  },
  async ({ adPlaceId }) => {
    try {
      const data = await AdplatClient.getPlacementContentItems(adPlaceId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_create_placement_content_item",
  "Add a new default content item or fallback house ad to an ad place.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    itemData: z.record(z.any()).describe("Content payload (title, image, link, etc.)")
  },
  async ({ adPlaceId, itemData }) => {
    try {
      const result = await AdplatClient.createPlacementContentItem(adPlaceId, itemData);
      return jsonResponse({
        success: true,
        message: "آیتم محتوا با موفقیت اضافه شد.",
        item: result.item || result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_placement_content_item",
  "Update a fallback or default content item in an ad place.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    itemId: z.string().describe("UUID of the content item"),
    itemData: z.record(z.any()).describe("Updated payload")
  },
  async ({ adPlaceId, itemId, itemData }) => {
    try {
      const result = await AdplatClient.updatePlacementContentItem(adPlaceId, itemId, itemData);
      return jsonResponse({
        success: true,
        message: "آیتم محتوا به‌روزرسانی شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_duplicate_placement_content_item",
  "Clone an existing content item to quickly create a variation.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    itemId: z.string().describe("UUID of the content item to clone")
  },
  async ({ adPlaceId, itemId }) => {
    try {
      const result = await AdplatClient.duplicatePlacementContentItem(adPlaceId, itemId);
      return jsonResponse({
        success: true,
        message: "آیتم محتوا تکثیر شد.",
        item: result.item || result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_delete_placement_content_item",
  "Delete a default content item from an ad place.",
  {
    adPlaceId: z.string().describe("UUID of the ad place"),
    itemId: z.string().describe("UUID of the content item")
  },
  async ({ adPlaceId, itemId }) => {
    try {
      const result = await AdplatClient.deletePlacementContentItem(adPlaceId, itemId);
      return jsonResponse({
        success: true,
        message: "آیتم محتوا با موفقیت حذف شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 5. CAMPAIGN DEEP OPERATIONS (22 TOOLS)
// ==========================================
server.tool(
  "adplat_list_campaigns",
  "List campaigns with status filtering, dates, budget, impression stats, and click counts.",
  {
    status: z.enum(["all", "active", "draft", "paused", "approved", "completed", "rejected"]).optional().describe("Status filter")
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
  "Retrieve complete campaign details including targeting rules, assigned placements, creatives, and budget.",
  {
    campaignId: z.string().describe("UUID of the campaign")
  },
  async ({ campaignId }) => {
    try {
      const data = await AdplatClient.getCampaign(campaignId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_edit_campaign_details",
  "Edit core campaign parameters (title, dates, target categories, notes).",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    campaignData: z.record(z.any()).describe("Updated campaign fields (name, startDate, endDate, targeting, etc.)")
  },
  async ({ campaignId, campaignData }) => {
    try {
      const result = await AdplatClient.editCampaign(campaignId, campaignData);
      return jsonResponse({
        success: true,
        message: "اطلاعات کمپین با موفقیت ویرایش شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_campaign_status",
  "Change campaign lifecycle state (active, paused, approved, rejected, draft).",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    status: z.enum(["draft", "pending_review", "approved", "active", "paused", "completed", "rejected"]).describe("Target status")
  },
  async ({ campaignId, status }) => {
    try {
      const result = await AdplatClient.updateCampaignStatus(campaignId, status);
      return jsonResponse({
        success: true,
        message: `Campaign ${campaignId} status updated to ${status}`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_set_campaign_manual_status",
  "Force a manual status override with an admin audit note.",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    status: z.string().describe("Manual status code"),
    note: z.string().optional().default("").describe("Admin reason or explanation")
  },
  async ({ campaignId, status, note }) => {
    try {
      const result = await AdplatClient.setCampaignManualStatus(campaignId, status, note);
      return jsonResponse({
        success: true,
        message: "وضعیت دستی کمپین ثبت شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_add_campaign_budget",
  "Inject additional budget into an existing campaign (in Tomans).",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    addAmount: z.number().describe("Additional amount in Tomans (e.g. 5000000)")
  },
  async ({ campaignId, addAmount }) => {
    try {
      const result = await AdplatClient.addCampaignBudget(campaignId, addAmount);
      return jsonResponse({
        success: true,
        message: `Successfully added ${addAmount.toLocaleString('fa-IR')} Tomans to campaign ${campaignId}`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_fund_campaign",
  "Fund and activate an approved campaign using available advertiser wallet balance.",
  {
    campaignId: z.string().describe("UUID of the campaign")
  },
  async ({ campaignId }) => {
    try {
      const result = await AdplatClient.fundCampaign(campaignId);
      return jsonResponse({
        success: true,
        message: `Campaign ${campaignId} funded successfully from user wallet.`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_transfer_campaign_owner",
  "Transfer ownership of a campaign to another registered user account.",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    targetUserId: z.string().describe("UUID of the new owner user")
  },
  async ({ campaignId, targetUserId }) => {
    try {
      const result = await AdplatClient.transferCampaignOwner(campaignId, targetUserId);
      return jsonResponse({
        success: true,
        message: `Campaign ${campaignId} transferred to user ${targetUserId}`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_delete_campaign",
  "Permanently delete a draft or cancelled campaign.",
  {
    campaignId: z.string().describe("UUID of the campaign")
  },
  async ({ campaignId }) => {
    try {
      const result = await AdplatClient.deleteCampaign(campaignId);
      return jsonResponse({
        success: true,
        message: `Campaign ${campaignId} deleted successfully`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_finalize_campaign_draft",
  "Finalize a newly created admin draft campaign so it can be approved and funded.",
  {
    campaignId: z.string().describe("UUID of the campaign draft")
  },
  async ({ campaignId }) => {
    try {
      const result = await AdplatClient.finalizeCampaignDraft(campaignId);
      return jsonResponse({
        success: true,
        message: "پیش‌نویس کمپین با موفقیت نهایی شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_campaign_timeline",
  "Get complete audit trail and event history of all lifecycle changes for a campaign.",
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
  "adplat_get_campaign_creative_fields",
  "Get the creative fields schema and required formats for placements bound to a campaign.",
  {
    campaignId: z.string().describe("UUID of the campaign")
  },
  async ({ campaignId }) => {
    try {
      const data = await AdplatClient.getCampaignCreativeFields(campaignId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_campaign_search_delivery",
  "Get search keyword delivery configuration, pacing, and line items for search campaigns.",
  {
    campaignId: z.string().describe("UUID of the campaign")
  },
  async ({ campaignId }) => {
    try {
      const data = await AdplatClient.getCampaignSearchDelivery(campaignId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_list_campaign_bookings",
  "List reserved calendar dates, slot indexes, and placement IDs booked for a campaign.",
  {
    campaignId: z.string().describe("UUID of the campaign")
  },
  async ({ campaignId }) => {
    try {
      const data = await AdplatClient.getCampaignBookings(campaignId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_bulk_update_bookings",
  "Bulk modify or re-assign dates and slots for campaign bookings.",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    bookings: z.array(z.record(z.any())).describe("Array of booking items ({ adPlaceId, date, slotIndex })")
  },
  async ({ campaignId, bookings }) => {
    try {
      const result = await AdplatClient.bulkUpdateBookings(campaignId, bookings);
      return jsonResponse({
        success: true,
        message: "رزروهای کمپین به‌صورت یکجا به‌روزرسانی شدند.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_bulk_assign_creative_bookings",
  "Map specific creative assets and banners to designated booking dates/slots.",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    assignments: z.array(z.record(z.any())).describe("Array of creative-booking assignments")
  },
  async ({ campaignId, assignments }) => {
    try {
      const result = await AdplatClient.bulkAssignCreatives(campaignId, assignments);
      return jsonResponse({
        success: true,
        message: "انتساب محتوا به رزروها انجام شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_cancel_campaign_bookings",
  "Cancel specific booking slots of a campaign with an explanation note.",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    bookingIds: z.array(z.string()).describe("Array of booking UUIDs to cancel"),
    reason: z.string().optional().default("").describe("Reason for cancellation")
  },
  async ({ campaignId, bookingIds, reason }) => {
    try {
      const result = await AdplatClient.cancelCampaignBookings(campaignId, bookingIds, reason);
      return jsonResponse({
        success: true,
        message: `Cancelled ${bookingIds.length} bookings for campaign ${campaignId}`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_campaign_creatives",
  "Get all creative assets (banners, copy, target links, UTM params) uploaded to a campaign.",
  {
    campaignId: z.string().describe("UUID of the campaign")
  },
  async ({ campaignId }) => {
    try {
      const data = await AdplatClient.getCampaignCreatives(campaignId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_campaign_creative",
  "Update creative banner assets, copy, headlines, or click destination URLs for a campaign.",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    creativeItems: z.array(z.record(z.any())).describe("Array of creative objects with placementId, bannerUrl, targetUrl, etc.")
  },
  async ({ campaignId, creativeItems }) => {
    try {
      const result = await AdplatClient.updateCampaignCreatives(campaignId, creativeItems);
      return jsonResponse({
        success: true,
        message: `Creatives updated for campaign ${campaignId}`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_list_creative_revisions",
  "Get historical revision versions of campaign creative content.",
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
  "Rollback or re-apply an earlier creative revision version to a campaign.",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    revisionId: z.string().describe("UUID of the revision to apply")
  },
  async ({ campaignId, revisionId }) => {
    try {
      const result = await AdplatClient.applyCreativeRevision(campaignId, revisionId);
      return jsonResponse({
        success: true,
        message: "نسخه محتوا با موفقیت بازیابی و اعمال شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_retry_creative_short_links",
  "Retry UTM tracking short-link generation for campaign creative URLs.",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    fieldKey: z.string().optional().describe("Optional specific field key (e.g. targetUrl)")
  },
  async ({ campaignId, fieldKey }) => {
    try {
      const result = await AdplatClient.retryCreativeShortLinks(campaignId, fieldKey);
      return jsonResponse({
        success: true,
        message: "لینک‌های کوتاه مجدداً بازتولید شدند.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 6. SEARCH CLUSTERS & INTENT TARGETING (9 TOOLS)
// ==========================================
server.tool(
  "adplat_list_search_clusters",
  "List search keyword clusters used for high-intent search ads with volumes and match types.",
  {
    search: z.string().optional().describe("Search keyword filter"),
    page: z.number().optional().default(1),
    pageSize: z.number().optional().default(20)
  },
  async (args) => {
    try {
      const data = await AdplatClient.listSearchClusters(args);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_placement_variants",
  "List placement variants and ad positions eligible for search ad delivery.",
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
  "Create a new search cluster with keyword match rules and base pricing.",
  {
    title: z.string().describe("Cluster display name in Persian (e.g. مهاجرت کاری)"),
    keywords: z.array(z.string()).describe("Array of trigger search phrases"),
    basePrice: z.number().describe("Base price per click/impression"),
    adPlaceId: z.string().optional().describe("Associated search ad placement UUID"),
    priority: z.number().optional().default(10).describe("Priority rank")
  },
  async (args) => {
    try {
      const result = await AdplatClient.createSearchCluster(args);
      return jsonResponse({
        success: true,
        message: `Search cluster '${args.title}' created successfully`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_search_cluster",
  "Update keywords, base price, or priority of an existing search cluster.",
  {
    clusterId: z.string().describe("UUID of the search cluster"),
    title: z.string().optional().describe("New title"),
    keywords: z.array(z.string()).optional().describe("Updated keyword phrases"),
    basePrice: z.number().optional().describe("New base price"),
    priority: z.number().optional().describe("New priority")
  },
  async ({ clusterId, ...data }) => {
    try {
      const result = await AdplatClient.updateSearchCluster(clusterId, data);
      return jsonResponse({
        success: true,
        message: `Search cluster ${clusterId} updated`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_delete_search_cluster",
  "Delete a search cluster.",
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
  "Trigger keyword re-indexing and cache invalidation for a search cluster.",
  {
    clusterId: z.string().describe("UUID of the search cluster to refresh")
  },
  async ({ clusterId }) => {
    try {
      const result = await AdplatClient.refreshSearchCluster(clusterId);
      return jsonResponse({
        success: true,
        message: `Search cluster ${clusterId} refreshed and re-indexed`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_list_search_clusters_external",
  "List external search clusters synced from external search providers (Dastyar, AI assistants).",
  {
    source: z.string().optional().default("all"),
    sort: z.string().optional().default("volume")
  },
  async (args) => {
    try {
      const data = await AdplatClient.getExternalSearchClusters(args);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_search_inventory",
  "Get real-time search campaign inventory availability and capacity.",
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

server.tool(
  "adplat_get_targeting_options",
  "Get platform targeting options: geographic provinces, user interest segments, and business sectors.",
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

// ==========================================
// 7. AUTOMATIONS ENGINE (6 TOOLS)
// ==========================================
server.tool(
  "adplat_get_automations",
  "Get full automation engine status including definitions, SMS triggers, templates, and delivery modes.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getAutomations();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_automation_settings",
  "Get automation delivery policies, default throttling rules, and marketing SMS keys.",
  {},
  async () => {
    try {
      const data = await AdplatClient.getAutomationSettings();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_automation_settings",
  "Update automation delivery rules, throttling policy, or SMS delivery modes.",
  {
    settings: z.record(z.any()).describe("Automation settings payload")
  },
  async ({ settings }) => {
    try {
      const result = await AdplatClient.updateAutomationSettings(settings);
      return jsonResponse({
        success: true,
        message: "تنظیمات اتوماسیون با موفقیت به‌روزرسانی شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_list_automation_jobs",
  "List scheduled and executed background automation jobs with execution logs and status.",
  {
    status: z.string().optional().describe("Job status (e.g. pending, completed, failed)"),
    page: z.number().optional().default(1),
    pageSize: z.number().optional().default(20)
  },
  async (args) => {
    try {
      const data = await AdplatClient.listAutomationJobs(args);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_trigger_automation_job",
  "Manually trigger execution of an automation job or scenario.",
  {
    jobId: z.string().describe("UUID or identifier of the automation job to run")
  },
  async ({ jobId }) => {
    try {
      const result = await AdplatClient.triggerAutomationJob(jobId);
      return jsonResponse({
        success: true,
        message: `اجرای تسک اتوماسیون ${jobId} آغاز شد.`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_send_test_sms",
  "Send a test SMS to verify template rendering and SMS gateway delivery.",
  {
    phone: z.string().describe("Recipient mobile phone number (e.g. 09014182301)"),
    templateKey: z.string().describe("Automation template key (e.g. first_campaign_day_3, post_campaign_survey)"),
    data: z.record(z.any()).optional().default({}).describe("Template variables (name, campaignName, etc.)")
  },
  async ({ phone, templateKey, data }) => {
    try {
      const result = await AdplatClient.sendTestSms(phone, templateKey, data);
      return jsonResponse({
        success: true,
        message: `پیامک تستی به ${phone} ارسال شد.`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 8. INTEGRATION API KEYS (3 TOOLS)
// ==========================================
server.tool(
  "adplat_list_integration_api_keys",
  "List active API keys powering connected apps (Hooshang, Dastyar, Davat).",
  {},
  async () => {
    try {
      const data = await AdplatClient.listIntegrationApiKeys();
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_create_integration_api_key",
  "Generate a new permanent integration API key for a connected product or microservice.",
  {
    name: z.string().describe("Integration client name (e.g. hooshang-ads-app, dastyar-ads-new)")
  },
  async ({ name }) => {
    try {
      const result = await AdplatClient.createIntegrationApiKey(name);
      return jsonResponse({
        success: true,
        message: `کلید یکپارچه‌سازی '${name}' با موفقیت تولید شد.`,
        key: result.key || result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_revoke_integration_api_key",
  "Revoke and delete an active integration API key.",
  {
    keyId: z.string().describe("UUID of the integration API key to revoke")
  },
  async ({ keyId }) => {
    try {
      const result = await AdplatClient.revokeIntegrationApiKey(keyId);
      return jsonResponse({
        success: true,
        message: "کلید یکپارچه‌سازی با موفقیت ابطال شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 9. USERS & WALLET ADMINISTRATION (5 TOOLS)
// ==========================================
server.tool(
  "adplat_list_users",
  "List users with phone numbers, company names, wallet balances, roles, and registration dates.",
  {
    search: z.string().optional().describe("Search term in name, phone, or company"),
    page: z.number().optional().default(1),
    limit: z.number().optional().default(20)
  },
  async (args) => {
    try {
      const data = await AdplatClient.listUsers(args);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_user_details",
  "Retrieve complete user profile, wallet credit, created campaigns, and billing info.",
  {
    userId: z.string().describe("UUID of the user")
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

server.tool(
  "adplat_topup_user_wallet",
  "Credit / top-up an advertiser's wallet balance directly with an admin description note.",
  {
    userId: z.string().describe("UUID of the user"),
    amount: z.number().describe("Amount in Tomans to add to wallet (e.g. 10000000)"),
    description: z.string().optional().default("شارژ دستی ادمین").describe("Reason for top-up")
  },
  async ({ userId, amount, description }) => {
    try {
      const result = await AdplatClient.topupUserWallet(userId, amount, description);
      return jsonResponse({
        success: true,
        message: `مبلغ ${amount.toLocaleString('fa-IR')} تومان به کیف پول کاربر اضافه شد.`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_deduct_user_wallet",
  "Deduct credit from an advertiser's wallet balance with an explanation note.",
  {
    userId: z.string().describe("UUID of the user"),
    amount: z.number().describe("Amount in Tomans to deduct from wallet"),
    description: z.string().optional().default("کسر دستی ادمین").describe("Reason for deduction")
  },
  async ({ userId, amount, description }) => {
    try {
      const result = await AdplatClient.deductUserWallet(userId, amount, description);
      return jsonResponse({
        success: true,
        message: `مبلغ ${amount.toLocaleString('fa-IR')} تومان از کیف پول کاربر کسر شد.`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_user_invoice_info",
  "Edit legal invoicing and billing details for a user account.",
  {
    userId: z.string().describe("UUID of the user"),
    invoiceData: z.record(z.any()).describe("Invoicing details (nationalCode, companyName, economicCode, address, postalCode)")
  },
  async ({ userId, invoiceData }) => {
    try {
      const result = await AdplatClient.updateUserInvoiceInfo(userId, invoiceData);
      return jsonResponse({
        success: true,
        message: "اطلاعات فاکتور کاربر به‌روزرسانی شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 10. BILLING & PAYMENTS REVIEW (3 TOOLS)
// ==========================================
server.tool(
  "adplat_list_payments",
  "List payment slips, bank transactions, and manual wire receipts with filter options.",
  {
    status: z.enum(["all", "pending", "approved", "rejected"]).optional().describe("Filter by payment status"),
    search: z.string().optional().describe("Search term"),
    page: z.number().optional().default(1),
    pageSize: z.number().optional().default(20)
  },
  async (args) => {
    try {
      const data = await AdplatClient.listPayments(args);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_payment_details",
  "Retrieve complete payment details, receipt image URL, and customer information.",
  {
    paymentId: z.string().describe("UUID of the payment transaction")
  },
  async ({ paymentId }) => {
    try {
      const data = await AdplatClient.getPaymentDetails(paymentId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_review_payment",
  "Review and approve or reject a manual bank transfer payment slip.",
  {
    paymentId: z.string().describe("UUID of the payment"),
    action: z.enum(["approved", "rejected"]).describe("Approve or reject"),
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
// 11. SUPPORT TICKETS LIFECYCLE (3 TOOLS)
// ==========================================
server.tool(
  "adplat_list_tickets",
  "List customer support tickets with filter options by status, search keyword, or userId.",
  {
    userId: z.string().optional().describe("Filter tickets by user ID"),
    search: z.string().optional().describe("Search query")
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
  "Retrieve complete details of a support ticket including all customer conversation messages.",
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
    attachments: z.array(z.string()).optional().describe("Array of image/attachment URLs")
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
// 12. INDUSTRIES TAXONOMY (4 TOOLS)
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

server.tool(
  "adplat_create_industry",
  "Create a new business industry category with optional relevance weight.",
  {
    title: z.string().describe("Industry title in Persian"),
    weight: z.number().optional().default(1).describe("Sorting weight")
  },
  async ({ title, weight }) => {
    try {
      const result = await AdplatClient.createIndustry(title, weight);
      return jsonResponse({
        success: true,
        message: "صنعت جدید با موفقیت ایجاد شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_industry",
  "Update industry category title or weight.",
  {
    industryId: z.string().describe("UUID of the industry"),
    title: z.string().optional().describe("Title"),
    weight: z.number().optional().describe("Weight")
  },
  async ({ industryId, ...data }) => {
    try {
      const result = await AdplatClient.updateIndustry(industryId, data);
      return jsonResponse({
        success: true,
        message: "صنعت به‌روزرسانی شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_delete_industry",
  "Delete a business industry category.",
  {
    industryId: z.string().describe("UUID of the industry")
  },
  async ({ industryId }) => {
    try {
      const result = await AdplatClient.deleteIndustry(industryId);
      return jsonResponse({
        success: true,
        message: "صنعت با موفقیت حذف شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 13. SYSTEM NOTIFICATIONS (2 TOOLS)
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
// 14. MEDIA CDN & S3 UPLOADS (3 TOOLS)
// ==========================================
server.tool(
  "adplat_get_presigned_upload_url",
  "Get an S3 presigned URL for direct, secure file upload.",
  {
    filename: z.string().describe("Original filename"),
    fileType: z.string().describe("MIME type (e.g. image/png, image/jpeg)"),
    folder: z.string().optional().default("campaigns/creatives").describe("S3 target folder")
  },
  async ({ filename, fileType, folder }) => {
    try {
      const data = await AdplatClient.getPresignedUploadUrl(filename, fileType, folder);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_upload_image",
  "Upload a local image file directly to Adplat CDN.",
  {
    filePath: z.string().describe("Absolute local path to the image file"),
    folder: z.string().optional().default("campaigns/creatives").describe("Target folder on CDN")
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

server.tool(
  "adplat_upload_placement_image",
  "Upload an ad placement mockup / preview image to the placement assets bucket.",
  {
    filePath: z.string().describe("Absolute local path to the placement preview image")
  },
  async ({ filePath }) => {
    try {
      const result = await AdplatClient.uploadPlacementImage(filePath);
      return jsonResponse({
        success: true,
        url: result.url || result.fileUrl || result.path || result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 15. SEARCH CAPACITY & DAY BREAKDOWNS (4 TOOLS)
// ==========================================
server.tool(
  "adplat_get_search_capacity_stats",
  "Get search keyword slot capacity saturation, total value, and available capacity for a Shamsi month.",
  {
    year: z.number().describe("Shamsi year (e.g. 1403)"),
    month: z.number().describe("Shamsi month (1-12)")
  },
  async ({ year, month }) => {
    try {
      const data = await AdplatClient.getSearchCapacityStats(year, month);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_search_capacity_rentals",
  "List active keyword cluster rentals booked across search capacity for a Shamsi month.",
  {
    year: z.number().describe("Shamsi year (e.g. 1403)"),
    month: z.number().describe("Shamsi month (1-12)")
  },
  async ({ year, month }) => {
    try {
      const data = await AdplatClient.getSearchCapacityRentals(year, month);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_search_capacity_day_details",
  "Get detailed search rental bookings running on a specific placement on a given date.",
  {
    adPlaceId: z.string().describe("UUID of the search ad placement"),
    date: z.string().describe("Date in Shamsi or Gregorian format (e.g. 1403-08-15)")
  },
  async ({ adPlaceId, date }) => {
    try {
      const data = await AdplatClient.getSearchCapacityDayDetails(adPlaceId, date);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_capacity_fulfillment_day_details",
  "Get itemized campaign orders running on a specific placement on a given calendar date.",
  {
    adPlaceId: z.string().describe("UUID of the ad placement"),
    date: z.string().describe("Date (e.g. 1403-08-15)")
  },
  async ({ adPlaceId, date }) => {
    try {
      const data = await AdplatClient.getCapacityFulfillmentDayDetails(adPlaceId, date);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 16. CAMPAIGN TELEMETRY & BOOKING OPERATIONS (3 TOOLS)
// ==========================================
server.tool(
  "adplat_get_campaign_analytics",
  "Get granular telemetry, impression counts, CTR, timeSeries data, and breakdowns for a specific campaign.",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("End date (YYYY-MM-DD)")
  },
  async ({ campaignId, ...params }) => {
    try {
      const data = await AdplatClient.getCampaignAnalytics(campaignId, params);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_save_search_bookings",
  "Reserve or update search cluster keyword booking periods for a campaign.",
  {
    campaignId: z.string().describe("UUID of the search campaign"),
    clusters: z.array(z.record(z.any())).describe("Array of cluster booking specifications ({ clusterId, startDate, durationDays })")
  },
  async ({ campaignId, clusters }) => {
    try {
      const result = await AdplatClient.saveSearchBookings(campaignId, clusters);
      return jsonResponse({
        success: true,
        message: "رزرو کلاسترهای جستجو با موفقیت ثبت شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_delete_campaign_bookings_bulk",
  "Delete multiple booking slot reservations for a campaign simultaneously.",
  {
    campaignId: z.string().describe("UUID of the campaign"),
    bookingIds: z.array(z.string()).describe("Array of booking UUIDs to delete")
  },
  async ({ campaignId, bookingIds }) => {
    try {
      const result = await AdplatClient.deleteCampaignBookingsBulk(campaignId, bookingIds);
      return jsonResponse({
        success: true,
        message: `تعداد ${bookingIds.length} رزرو با موفقیت حذف شدند.`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_ad_place_content_requirements",
  "Get serving type, layout template, required creative fields, and variants for an ad place.",
  {
    adPlaceId: z.string().describe("UUID of the ad place")
  },
  async ({ adPlaceId }) => {
    try {
      const data = await AdplatClient.getAdPlaceContentRequirements(adPlaceId);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

// ==========================================
// 17. STOCK IMAGES & ASSET LIBRARY (7 TOOLS)
// ==========================================
server.tool(
  "adplat_list_stock_images",
  "Browse and search the central stock images library with category and keyword filters.",
  {
    search: z.string().optional().describe("Search keyword"),
    category: z.string().optional().describe("Category tag"),
    limit: z.number().optional().default(20).describe("Max items to fetch"),
    offset: z.number().optional().default(0).describe("Pagination offset")
  },
  async (params) => {
    try {
      const data = await AdplatClient.listStockImages(params);
      return jsonResponse(data);
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_create_stock_image",
  "Add a new stock image asset to the central library with title and tags.",
  {
    title: z.string().describe("Image title"),
    url: z.string().describe("CDN or S3 image URL"),
    category: z.string().optional().describe("Category tag"),
    tags: z.array(z.string()).optional().default([]).describe("Search tags")
  },
  async (args) => {
    try {
      const result = await AdplatClient.createStockImage(args);
      return jsonResponse({
        success: true,
        message: "تصویر با موفقیت به کتابخانه اضافه شد.",
        image: result.image || result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_update_stock_image",
  "Update metadata, title, category, or tags of a stock image.",
  {
    imageId: z.string().describe("UUID of the stock image"),
    title: z.string().optional().describe("Title"),
    category: z.string().optional().describe("Category"),
    tags: z.array(z.string()).optional().describe("Tags")
  },
  async ({ imageId, ...data }) => {
    try {
      const result = await AdplatClient.updateStockImage(imageId, data);
      return jsonResponse({
        success: true,
        message: "مشخصات تصویر به‌روزرسانی شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_delete_stock_image",
  "Delete a stock image asset from the central library.",
  {
    imageId: z.string().describe("UUID of the stock image to delete")
  },
  async ({ imageId }) => {
    try {
      const result = await AdplatClient.deleteStockImage(imageId);
      return jsonResponse({
        success: true,
        message: "تصویر با موفقیت از کتابخانه حذف شد.",
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_bulk_create_stock_images",
  "Batch import multiple stock image assets into the library at once.",
  {
    images: z.array(z.object({
      title: z.string(),
      url: z.string(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional()
    })).describe("Array of image objects to import")
  },
  async ({ images }) => {
    try {
      const result = await AdplatClient.bulkCreateStockImages(images);
      return jsonResponse({
        success: true,
        message: `تعداد ${images.length} تصویر با موفقیت اضافه شدند.`,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_describe_stock_image",
  "Generate AI captions and visual descriptions for a stock image asset.",
  {
    imageId: z.string().describe("UUID of the stock image")
  },
  async ({ imageId }) => {
    try {
      const result = await AdplatClient.describeStockImage(imageId);
      return jsonResponse({
        success: true,
        result
      });
    } catch (err) {
      return errorResponse(err);
    }
  }
);

server.tool(
  "adplat_get_stock_image_suggestions",
  "Get AI-recommended stock images tailored to specific creative fields or campaign copy.",
  {
    contentFieldIds: z.array(z.string()).describe("Array of creative field UUIDs"),
    campaignId: z.string().optional().describe("Associated campaign UUID"),
    clusterId: z.string().optional().describe("Associated search cluster UUID"),
    texts: z.array(z.string()).optional().describe("Sample ad copy texts to match against")
  },
  async (payload) => {
    try {
      const result = await AdplatClient.getStockImageSuggestions(payload);
      return jsonResponse(result);
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

if (process.argv[1] && (process.argv[1].endsWith('src/index.js') || process.argv[1].endsWith('index.js'))) {
  runServer().catch((error) => {
    console.error("Fatal error starting Adplat Admin MCP server:", error);
    process.exit(1);
  });
}
