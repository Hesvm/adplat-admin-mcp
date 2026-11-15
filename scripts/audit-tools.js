import { AdplatClient } from '../src/api-client.js';
import { AuthManager } from '../src/auth.js';

async function runAudit() {
  console.log('====================================================');
  console.log('🚀 ADPLAT ADMIN MCP ZERO-MOCK LIVE AUDIT SUITE');
  console.log('====================================================\n');

  const token = AuthManager.getToken();
  if (!token) {
    console.error('❌ FAILED: No active session token found.');
    process.exit(1);
  }

  const tests = [
    { name: 'Profile & Session', fn: () => AdplatClient.getProfile() },
    { name: 'Analytics Totals', fn: () => AdplatClient.getAnalytics() },
    { name: 'Unanswered Tickets Stats', fn: () => AdplatClient.getUnansweredTicketsSummary() },
    { name: 'Pending Payments Stats', fn: () => AdplatClient.getPendingPaymentsSummary() },
    { name: 'Users Overview Stats', fn: () => AdplatClient.getUsersOverviewStats() },
    { name: 'Customer Insights', fn: () => AdplatClient.getCustomerInsights() },
    { name: 'Unspent Funds Overview', fn: () => AdplatClient.getUnspentFundsOverview() },
    { name: 'Sales Capacity Stats', fn: () => AdplatClient.getSalesCapacityStats() },
    { name: 'Sales Trend Stats', fn: () => AdplatClient.getSalesTrendStats() },
    { name: 'Sales by Placement Stats', fn: () => AdplatClient.getSalesByPlacementStats() },
    { name: 'Campaigns Overview Stats', fn: () => AdplatClient.getCampaignsOverviewStats() },
    { name: 'Pending Review Stats', fn: () => AdplatClient.getPendingReviewCampaignsStats() },
    { name: 'Pending Funding Stats', fn: () => AdplatClient.getPendingFundingCampaignsStats() },
    { name: 'Ending Soon Stats', fn: () => AdplatClient.getEndingSoonCampaignsStats() },
    { name: 'Placement Performance Stats', fn: () => AdplatClient.getPlacementPerformanceStats() },
    { name: 'Placement Change Alerts', fn: () => AdplatClient.getPlacementChangeAlertsStats() },
    { name: 'Placements Overview', fn: () => AdplatClient.getPlacementsOverview() },
    { name: 'Placements 30d Stats', fn: () => AdplatClient.getPlacementsStats() },
    { name: 'Support Tickets List', fn: () => AdplatClient.listTickets() },
    { name: 'Campaigns List', fn: () => AdplatClient.listCampaigns() },
    { name: 'Ad Places List', fn: () => AdplatClient.listAdPlaces() },
    { name: 'Platforms List', fn: () => AdplatClient.listPlatforms() },
    { name: 'Targeting Options', fn: () => AdplatClient.getTargetingOptions() },
    { name: 'Search Inventory', fn: () => AdplatClient.getSearchInventory() },
    { name: 'Notifications List', fn: () => AdplatClient.listNotifications(5) },
    { name: 'Search Clusters List', fn: () => AdplatClient.listSearchClusters() },
    { name: 'Placement Variants', fn: () => AdplatClient.getPlacementVariants() },
    { name: 'External Search Clusters', fn: () => AdplatClient.getExternalSearchClusters() },
    { name: 'Users List', fn: () => AdplatClient.listUsers() },
    { name: 'Payments List', fn: () => AdplatClient.listPayments() },
    { name: 'Industries List', fn: () => AdplatClient.listIndustries() },
    { name: 'Automations State', fn: () => AdplatClient.getAutomations() },
    { name: 'Automation Settings', fn: () => AdplatClient.getAutomationSettings() },
    { name: 'Integration API Keys', fn: () => AdplatClient.listIntegrationApiKeys() }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const start = Date.now();
    try {
      const res = await test.fn();
      const latency = Date.now() - start;
      const count = Array.isArray(res) 
        ? res.length 
        : typeof res === 'object' && res !== null 
          ? Object.keys(res).length 
          : 1;
      console.log(`✅ [PASS] ${test.name.padEnd(28)} | ${latency.toString().padStart(4)}ms | Items/Keys: ${count}`);
      passed++;
    } catch (err) {
      const latency = Date.now() - start;
      console.log(`❌ [FAIL] ${test.name.padEnd(28)} | ${latency.toString().padStart(4)}ms | Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n====================================================');
  console.log(`📊 AUDIT SUMMARY: ${passed}/${tests.length} PASSED (${Math.round((passed / tests.length) * 100)}%)`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit();
