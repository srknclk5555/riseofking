// Test clan service directly
const { clanService } = require('./src/services/clanService');

async function testClanService() {
  try {
    console.log('Testing clan service...');
    
    // Test clan ID - backend testinde gördüğümüz gibi EY3JCT vardı
    const testClanId = 'EY3JCT';
    
    console.log('Fetching clan members for clan:', testClanId);
    const members = await clanService.getClanMembers(testClanId);
    
    console.log('Members received:', members);
    console.log('Members count:', members.length);
    
    if (members.length > 0) {
      console.log('First member:', members[0]);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testClanService();