import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { AuthManager } from './auth.js';

const BASE_URL = process.env.ADPLAT_BASE_URL || 'https://adplat.space';

export class AdplatClient {
  static getAxios(customTimeout = 45000) {
    const cookie = AuthManager.getCookieHeader();
    return axios.create({
      baseURL: BASE_URL,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:160.0) Gecko/20100101 Firefox/160.0',
        'Cookie': cookie,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: customTimeout
    });
  }

  static async request(method, path, data = null, params = null, timeout = 45000) {
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
        if (status === 401) {
          throw new Error(`Authentication Error (401): Session token is missing or expired. Use adplat_auth_send_otp or adplat_update_session. Details: ${msg}`);
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

  // --- Ad Places & Availability & Inventory ---
  static async listAdPlaces(campaignType = 'advanced') {
    return this.request('GET', '/api/ad-places', null, { campaignType });
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
}
