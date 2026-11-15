import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { AuthManager } from './auth.js';

const BASE_URL = process.env.ADPLAT_BASE_URL || 'https://adplat.space';

export class AdplatClient {
  static getAxios(customTimeout = 45000) {
    const cookie = AuthManager.getCookieHeader();
    const apiKey = AuthManager.getApiKey();

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (cookie) {
      headers['Cookie'] = cookie;
    }
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['x-api-key'] = apiKey;
    }

    return axios.create({
      baseURL: BASE_URL,
      headers,
      timeout: customTimeout
    });
  }

  static async request(method, path, data = null, params = null, timeout = 45000, retryCount = 0) {
    await AuthManager.ensureAuthenticated();
    const client = this.getAxios(timeout);
    try {
      const response = await client({
        method,
        url: path,
        data,
        params
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const errData = error.response.data;
        const msg = errData?.error || errData?.message || JSON.stringify(errData) || error.message;

        // Auto-heal / Auto-renewal on 401 using ADPLAT_PHONE & ADPLAT_PASSWORD
        if (status === 401 && AuthManager.hasCredentials() && retryCount < 1) {
          try {
            console.error('[AdplatClient] Session expired (401). Auto-renewing session using ADPLAT_PHONE & ADPLAT_PASSWORD credentials...');
            await AuthManager.autoLogin();
            return await this.request(method, path, data, params, timeout, retryCount + 1);
          } catch (autoErr) {
            throw new Error(`Authentication Error (401): Session expired and auto-login failed: ${autoErr.message}`);
          }
        }

        if (status === 401) {
          throw new Error(`Authentication Error (401): Session token is missing or expired. You can configure ADPLAT_PHONE and ADPLAT_PASSWORD for auto-renewal, or use adplat_auth_send_otp / adplat_update_session. Details: ${msg}`);
        }
        if (status === 403) {
          throw new Error(`Permission Denied (403): ${msg}`);
        }
        throw new Error(`Adplat API Error (${status}): ${msg}`);
      }
      throw new Error(`Network/Request Error: ${error.message}`);
    }
  }

  // --- Profile & Stats ---
  static async getProfile() {
    return this.request('GET', '/api/profile');
  }

  static async getAnalytics(params = {}) {
    // Default to last 30 days if no date filter provided to avoid DB aggregate timeout
    const query = { ...params };
    if (!query.startDate) {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      query.startDate = d.toISOString().split('T')[0];
    }
    return this.request('GET', '/api/admin/analytics', null, query, 60000);
  }

  static async getUnansweredTicketsSummary() {
    return this.request('GET', '/api/admin/statistics/unanswered-tickets');
  }

  static async getPendingPaymentsSummary() {
    return this.request('GET', '/api/admin/statistics/pending-approval-payments');
  }

  // --- Deep Statistics & Executive Reporting ---
  static async getUsersOverviewStats() {
    return this.request('GET', '/api/admin/statistics/users-overview');
  }

  static async getCustomerInsights(params = {}) {
    return this.request('GET', '/api/admin/statistics/customer-insights', null, params);
  }

  static async getUnspentFundsOverview() {
    return this.request('GET', '/api/admin/statistics/unspent-funds-overview');
  }

  static async getUnspentFundsDetails(type = 'wallets') {
    return this.request('GET', '/api/admin/statistics/unspent-funds-details', null, { type });
  }

  static async getSalesOverviewStats(params = {}) {
    return this.request('GET', '/api/admin/statistics/sales-overview', null, params);
  }

  static async getSalesCapacityStats() {
    return this.request('GET', '/api/admin/statistics/sales-capacity');
  }

  static async getSalesDetailsStats(params = {}) {
    return this.request('GET', '/api/admin/statistics/sales-details', null, params);
  }

  static async getSalesTrendStats(params = {}) {
    return this.request('GET', '/api/admin/statistics/sales-trend', null, params);
  }

  static async getSalesByPlacementStats() {
    return this.request('GET', '/api/admin/statistics/sales-by-placement');
  }

  static async getCampaignsOverviewStats() {
    return this.request('GET', '/api/admin/statistics/campaign-overview');
  }

  static async getCampaignStatusDetailsStats(group = 'active') {
    return this.request('GET', '/api/admin/statistics/campaign-status-details', null, { group });
  }

  static async getPendingReviewCampaignsStats() {
    return this.request('GET', '/api/admin/statistics/pending-review-campaigns');
  }

  static async getPendingFundingCampaignsStats() {
    return this.request('GET', '/api/admin/statistics/pending-funding-campaigns');
  }

  static async getEndingSoonCampaignsStats() {
    return this.request('GET', '/api/admin/statistics/ending-soon-campaigns');
  }

  static async getPlacementPerformanceStats() {
    return this.request('GET', '/api/admin/statistics/placement-performance');
  }

  static async getPlacementChangeAlertsStats() {
    return this.request('GET', '/api/admin/statistics/placement-change-alerts');
  }

  static async getPlacementTrendStats(placementId, days = 30) {
    return this.request('GET', '/api/admin/statistics/placement-trend', null, { placementId, days });
  }

  static async getCapacityFulfillmentStats(year, month) {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    return this.request('GET', '/api/admin/statistics/capacity-fulfillment', null, params);
  }

  static async getPlacementsOverview() {
    return this.request('GET', '/api/admin/placements/overview');
  }

  static async getPlacementsStats() {
    return this.request('GET', '/api/admin/placements/stats');
  }

  // --- Support Tickets ---
  static async listTickets(params = {}) {
    return this.request('GET', '/api/admin/tickets', null, params);
  }

  static async getTicket(ticketId) {
    return this.request('GET', `/api/admin/tickets/${ticketId}`);
  }

  static async replyTicket(ticketId, message, attachments = []) {
    return this.request('POST', `/api/admin/tickets/${ticketId}/messages`, {
      message: message.trim(),
      attachments
    });
  }

  // --- Campaigns ---
  static async listCampaigns() {
    return this.request('GET', '/api/admin/campaigns');
  }

  static async getCampaign(campaignId) {
    return this.request('GET', `/api/v2/campaigns/${campaignId}`);
  }

  static async getCampaignBookings(campaignId) {
    return this.request('GET', `/api/admin/campaigns/${campaignId}/bookings`);
  }

  static async getCampaignCreatives(campaignId) {
    return this.request('GET', `/api/admin/campaigns/${campaignId}/creative`);
  }

  static async updateCampaignStatus(campaignId, status) {
    return this.request('PATCH', `/api/admin/campaigns/${campaignId}/manual-status`, { status });
  }

  static async addCampaignBudget(campaignId, addAmount) {
    return this.request('POST', `/api/admin/campaigns/${campaignId}/add-budget`, { addAmount });
  }

  static async fundCampaign(campaignId) {
    return this.request('POST', `/api/admin/campaigns/${campaignId}/fund`);
  }

  static async transferCampaignOwner(campaignId, targetUserId) {
    return this.request('POST', `/api/admin/campaigns/${campaignId}/transfer-owner`, { targetUserId });
  }

  static async editCampaign(campaignId, campaignData) {
    return this.request('PATCH', `/api/admin/campaigns/${campaignId}/edit`, { campaign: campaignData });
  }

  static async cancelCampaignBookings(campaignId, bookingIds, reason = '') {
    return this.request('POST', `/api/admin/campaigns/${campaignId}/bookings/cancel`, {
      bookingIds,
      reason
    });
  }

  static async updateCampaignCreatives(campaignId, creativeItems) {
    return this.request('PUT', `/api/admin/campaigns/${campaignId}/creative`, { items: creativeItems });
  }

  static async deleteCampaign(campaignId) {
    return this.request('DELETE', `/api/admin/campaigns/${campaignId}`);
  }

  static async getCampaignTimeline(campaignId) {
    return this.request('GET', `/api/admin/campaigns/${campaignId}/timeline`);
  }

  static async listCreativeRevisions(campaignId) {
    return this.request('GET', `/api/admin/campaigns/${campaignId}/creative-revisions`);
  }

  static async applyCreativeRevision(campaignId, revisionId) {
    return this.request('POST', `/api/admin/campaigns/${campaignId}/creative-revisions/${revisionId}/apply`);
  }

  static async retryCreativeShortLinks(campaignId, fieldKey) {
    return this.request('POST', `/api/campaigns/${campaignId}/creative/short-links/retry`, { fieldKey });
  }

  static async getCampaignCreativeFields(campaignId) {
    return this.request('GET', `/api/admin/campaigns/${campaignId}/creative-fields`);
  }

  static async getCampaignSearchDelivery(campaignId) {
    return this.request('GET', `/api/admin/campaigns/${campaignId}/search-delivery`);
  }

  static async setCampaignManualStatus(campaignId, status, note = '') {
    return this.request('POST', `/api/admin/campaigns/${campaignId}/manual-status`, { status, note });
  }

  static async bulkUpdateBookings(campaignId, bookings) {
    return this.request('POST', `/api/admin/campaigns/${campaignId}/bookings/bulk`, { bookings });
  }

  static async bulkAssignCreatives(campaignId, assignments) {
    return this.request('POST', `/api/admin/campaigns/${campaignId}/bookings/creative/bulk`, { assignments });
  }

  static async finalizeCampaignDraft(campaignId) {
    return this.request('POST', `/api/admin/campaigns/${campaignId}/finalize-draft`);
  }

  // --- Ad Places & Availability & Inventory ---
  static async listAdPlaces(campaignType = 'advanced') {
    return this.request('GET', '/api/ad-places', null, { campaignType });
  }

  static async getAdPlace(adPlaceId) {
    const list = await this.listAdPlaces('advanced');
    const item = (list.adPlaces || []).find(p => p.id === adPlaceId);
    if (item) return { adPlace: item };
    return this.request('GET', `/api/admin/ad-places/${adPlaceId}`);
  }

  static async createAdPlace(data) {
    return this.request('POST', '/api/admin/ad-places', data);
  }

  static async updateAdPlace(adPlaceId, data) {
    return this.request('PATCH', `/api/admin/ad-places/${adPlaceId}`, data);
  }

  static async updateAdPlaceBasePrice(adPlaceId, pricePerSlotPerDay) {
    return this.request('PATCH', `/api/admin/ad-places/${adPlaceId}/base-price`, { pricePerSlotPerDay });
  }

  static async toggleAdPlaceStatus(adPlaceId, isActive) {
    return this.request('PATCH', `/api/admin/ad-places/${adPlaceId}`, { isActive });
  }

  static async deleteAdPlace(adPlaceId) {
    return this.request('DELETE', `/api/admin/ad-places/${adPlaceId}`);
  }

  static async getAdPlaceOccupancy(adPlaceId, year, month) {
    return this.request('GET', `/api/admin/ad-places/${adPlaceId}/occupancy`, null, { year, month });
  }

  static async getAdPlacePricingCalendar(adPlaceId, from, to) {
    return this.request('GET', `/api/admin/ad-places/${adPlaceId}/pricing-calendar`, null, { from, to });
  }

  static async setAdPlaceDailyPricing(adPlaceId, overrides) {
    return this.request('PATCH', `/api/admin/ad-places/${adPlaceId}/daily-pricing-overrides`, overrides);
  }

  static async deleteAdPlaceDailyPricing(adPlaceId, dates) {
    return this.request('DELETE', `/api/admin/ad-places/${adPlaceId}/daily-pricing-overrides`, { dates });
  }

  static async setAdPlaceBookingBlocks(adPlaceId, dates, blocked = true) {
    return this.request('PUT', `/api/admin/ad-places/${adPlaceId}/booking-blocks`, { dates, blocked });
  }

  // --- Platforms Management ---
  static async listPlatforms() {
    return this.request('GET', '/api/admin/platforms');
  }

  static async createPlatform(data) {
    return this.request('POST', '/api/admin/platforms', data);
  }

  static async updatePlatform(platformId, data) {
    return this.request('PATCH', `/api/admin/platforms/${platformId}`, data);
  }

  static async deletePlatform(platformId) {
    return this.request('DELETE', `/api/admin/platforms/${platformId}`);
  }

  // --- Placement Content Architecture (Fields, Variants, Items) ---
  static async getPlacementContentFields(adPlaceId) {
    return this.request('GET', `/api/admin/ad-places/${adPlaceId}/content-fields`);
  }

  static async createPlacementContentField(adPlaceId, data) {
    return this.request('POST', `/api/admin/ad-places/${adPlaceId}/content-fields`, data);
  }

  static async updatePlacementContentField(adPlaceId, fieldId, data) {
    return this.request('PATCH', `/api/admin/ad-places/${adPlaceId}/content-fields/${fieldId}`, data);
  }

  static async deletePlacementContentField(adPlaceId, fieldId) {
    return this.request('DELETE', `/api/admin/ad-places/${adPlaceId}/content-fields/${fieldId}`);
  }

  static async getPlacementContentVariants(adPlaceId) {
    return this.request('GET', `/api/admin/ad-places/${adPlaceId}/content-variants`);
  }

  static async createPlacementContentVariant(adPlaceId, data) {
    return this.request('POST', `/api/admin/ad-places/${adPlaceId}/content-variants`, data);
  }

  static async updatePlacementContentVariant(adPlaceId, variantId, data) {
    return this.request('PATCH', `/api/admin/ad-places/${adPlaceId}/content-variants/${variantId}`, data);
  }

  static async deletePlacementContentVariant(adPlaceId, variantId) {
    return this.request('DELETE', `/api/admin/ad-places/${adPlaceId}/content-variants/${variantId}`);
  }

  static async getPlacementContentTemplate(adPlaceId, variantId) {
    return this.request('GET', `/api/admin/ad-places/${adPlaceId}/content-variants/${variantId}/template`);
  }

  static async updatePlacementContentTemplate(adPlaceId, variantId, contentTemplate) {
    return this.request('PUT', `/api/admin/ad-places/${adPlaceId}/content-variants/${variantId}/template`, { contentTemplate });
  }

  static async getPlacementContentItems(adPlaceId) {
    return this.request('GET', `/api/admin/ad-places/${adPlaceId}/content-items`);
  }

  static async createPlacementContentItem(adPlaceId, data) {
    return this.request('POST', `/api/admin/ad-places/${adPlaceId}/content-items`, data);
  }

  static async updatePlacementContentItem(adPlaceId, itemId, data) {
    return this.request('PATCH', `/api/admin/ad-places/${adPlaceId}/content-items/${itemId}`, data);
  }

  static async duplicatePlacementContentItem(adPlaceId, itemId) {
    return this.request('POST', `/api/admin/ad-places/${adPlaceId}/content-items/${itemId}/duplicate`);
  }

  static async deletePlacementContentItem(adPlaceId, itemId) {
    return this.request('DELETE', `/api/admin/ad-places/${adPlaceId}/content-items/${itemId}`);
  }

  // --- Automations Engine ---
  static async getAutomations() {
    return this.request('GET', '/api/admin/automations');
  }

  static async getAutomationSettings() {
    return this.request('GET', '/api/admin/automations/settings');
  }

  static async updateAutomationSettings(settings) {
    return this.request('PUT', '/api/admin/automations/settings', settings);
  }

  static async listAutomationJobs(params = {}) {
    return this.request('GET', '/api/admin/automations/jobs', null, params);
  }

  static async triggerAutomationJob(jobId) {
    return this.request('POST', `/api/admin/automations/jobs/${jobId}`);
  }

  static async sendTestSms(phone, templateKey, data = {}) {
    return this.request('POST', '/api/admin/automations/test-sms', { phone, templateKey, data });
  }

  // --- Integration API Keys ---
  static async listIntegrationApiKeys() {
    return this.request('GET', '/api/admin/integration-api-keys');
  }

  static async createIntegrationApiKey(name) {
    return this.request('POST', '/api/admin/integration-api-keys', { name });
  }

  static async revokeIntegrationApiKey(keyId) {
    return this.request('DELETE', `/api/admin/integration-api-keys/${keyId}`);
  }

  // --- User Administration & Wallet ---
  static async topupUserWallet(userId, amount, description = '') {
    return this.request('POST', `/api/admin/users/${userId}/wallet-topup`, { amount, description });
  }

  static async deductUserWallet(userId, amount, description = '') {
    return this.request('POST', `/api/admin/users/${userId}/wallet-deduction`, { amount, description });
  }

  static async updateUserInvoiceInfo(userId, invoiceData) {
    return this.request('PATCH', `/api/admin/users/${userId}/invoice-info`, invoiceData);
  }

  static async getAdPlaceAvailability(adPlaceId, from, to) {
    return this.request('GET', `/api/ad-places/${adPlaceId}/availability`, null, { from, to });
  }

  static async getTargetingOptions() {
    return this.request('GET', '/api/targeting/options');
  }

  static async getSearchInventory() {
    return this.request('GET', '/api/search-campaign/inventory');
  }

  // --- Notifications ---
  static async listNotifications(limit = 10) {
    return this.request('GET', '/api/notifications', null, { limit });
  }

  static async markNotificationRead(notificationId) {
    return this.request('POST', '/api/notifications/mark-read', { notificationId });
  }

  // --- Search Clusters (SERP) ---
  static async listSearchClusters(params = {}) {
    return this.request('GET', '/api/admin/search-clusters', null, params);
  }

  static async getPlacementVariants() {
    return this.request('GET', '/api/admin/search-clusters', null, { resource: 'placement-variants' });
  }

  static async createSearchCluster(clusterData) {
    return this.request('POST', '/api/admin/search-clusters', clusterData);
  }

  static async updateSearchCluster(clusterId, clusterData) {
    return this.request('PATCH', `/api/admin/search-clusters/${clusterId}`, clusterData);
  }

  static async deleteSearchCluster(clusterId) {
    return this.request('DELETE', `/api/admin/search-clusters/${clusterId}`);
  }

  static async refreshSearchCluster(clusterId) {
    return this.request('POST', `/api/admin/search-clusters/${clusterId}/refresh`);
  }

  static async getExternalSearchClusters(params = { source: 'all', sort: 'volume' }) {
    return this.request('GET', '/api/admin/search-clusters/external', null, params);
  }

  // --- Users ---
  static async listUsers(params = {}) {
    return this.request('GET', '/api/admin/users', null, params);
  }

  static async getUser(userId) {
    return this.request('GET', `/api/admin/users/${userId}`);
  }

  // --- Payments ---
  static async listPayments(params = {}) {
    return this.request('GET', '/api/admin/payments', null, params);
  }

  static async getPaymentDetails(paymentId) {
    return this.request('GET', `/api/admin/payments/${paymentId}`);
  }

  static async reviewPayment(paymentId, status, rejectReason = null) {
    return this.request('POST', `/api/admin/payments/${paymentId}/review`, {
      status, // 'approved' or 'rejected'
      rejectReason
    });
  }

  // --- Industries ---
  static async listIndustries() {
    return this.request('GET', '/api/admin/industries');
  }

  static async createIndustry(title, weight = 1) {
    return this.request('POST', '/api/admin/industries', { title, weight });
  }

  static async updateIndustry(industryId, data) {
    return this.request('PATCH', `/api/admin/industries/${industryId}`, data);
  }

  static async deleteIndustry(industryId) {
    return this.request('DELETE', `/api/admin/industries/${industryId}`);
  }

  // --- Uploads ---
  static async getPresignedUploadUrl(filename, fileType, folder = 'campaigns/creatives') {
    return this.request('POST', '/api/uploads/presign', { filename, fileType, folder });
  }

  static async uploadImage(filePath, folder = 'campaigns/creatives') {
    const cookie = AuthManager.getCookieHeader();
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('folder', folder);

    const response = await axios.post(`${BASE_URL}/api/v2/uploads/image`, form, {
      headers: {
        ...form.getHeaders(),
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0)'
      }
    });
    return response.data;
  }

  static async uploadPlacementImage(filePath) {
    const cookie = AuthManager.getCookieHeader();
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const response = await axios.post(`${BASE_URL}/api/uploads/image`, form, {
      headers: {
        ...form.getHeaders(),
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0)'
      }
    });
    return response.data;
  }
}
