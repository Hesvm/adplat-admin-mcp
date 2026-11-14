import { AdplatClient } from './api-client.js';
import { AuthManager } from './auth.js';

async function test() {
  console.log('Testing Adplat Admin MCP connection...');
  const token = AuthManager.getToken();
  console.log('Token detected:', token ? `${token.slice(0, 15)}... (length: ${token.length})` : 'None');

  if (!token) {
    console.error('❌ No token found! Set ADPLAT_SESSION_TOKEN in environment or .env');
    process.exit(1);
  }

  try {
    const profile = await AdplatClient.getProfile();
    console.log('✅ Authentication SUCCESS! Profile:');
    console.log(JSON.stringify(profile.profile || profile, null, 2));

    const stats = await AdplatClient.getUnansweredTicketsSummary();
    console.log('✅ Unanswered tickets test SUCCESS:', stats.total, 'tickets pending');

    const campaigns = await AdplatClient.listCampaigns();
    console.log('✅ Campaigns list SUCCESS:', campaigns.campaigns?.length, 'campaigns loaded');

    const clusters = await AdplatClient.listSearchClusters();
    console.log('✅ Search clusters SUCCESS:', clusters.clusters?.length, 'clusters loaded');

    console.log('\n🎉 ALL CORE API TESTS PASSED! Adplat Admin MCP Server is fully functional.');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

test();
