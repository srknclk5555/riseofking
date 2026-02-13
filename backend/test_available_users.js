const fetch = require('node-fetch');

async function testAvailableUsers() {
  try {
    console.log('Testing /users/available-for-clan endpoint...');
    
    // Önce bir kullanıcı için token alalım (Firebase simulation)
    const testUserId = 'OolO4E0Ro1aiX30foMQmD4vGsEj1'; // 321 kullanıcısı
    
    const response = await fetch('http://localhost:5000/api/clans/users/available-for-clan', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testUserId}`, // Simplified for testing
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.json();
    console.log('Response data:');
    console.log(JSON.stringify(data, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testAvailableUsers();