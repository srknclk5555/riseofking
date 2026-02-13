const fetch = require('node-fetch');

async function testApi() {
    const url = 'http://localhost:5000/api/clans/EY3JCT/messages';
    console.log(`Testing GET ${url}...`);
    try {
        const response = await fetch(url);
        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log(`Response Body: ${text.substring(0, 100)}...`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
    }
}

testApi();
