// Test API call for available users
const fetch = require('node-fetch');

async function testApi() {
  try {
    // Assuming the user is authenticated and we have a valid token
    // We'll use a mock token since we can't generate a real Firebase/JWT token here
    const response = await fetch('http://localhost:5000/api/clans/users/available-for-clan', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer fake-token-for-testing', // This will likely fail auth
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('Response:', data);
    console.log('Status:', response.status);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testApi();