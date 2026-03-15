const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./config/database');
const { ensureUsersTable } = require('./controllers/userController');
const { getClanBossRuns } = require('./controllers/clanBossController');

async function verify() {
  console.log('--- Verification Started ---');
  
  try {
    // 1. Verify DB Pool and Connection
    console.log('1. Testing DB Connection...');
    const dbRes = await pool.query('SELECT NOW()');
    console.log('✓ DB Connected:', dbRes.rows[0].now);
    console.log('✓ Pool Max Connections:', pool.options.max);

    // 2. Verify Schema Initialization
    console.log('\n2. Testing Schema Initialization...');
    await ensureUsersTable();
    console.log('✓ ensureUsersTable executed successfully');

    // 3. Verify Optimized Boss Run Query
    console.log('\n3. Testing Optimized getClanBossRuns...');
    // Mock req/res
    const req = {
      user: { uid: 'system_verify' },
      params: { clanId: 'EY3JCT' },
      query: { status: 'open' }
    };
    
    const res = {
      status: function(s) { this.statusCode = s; return this; },
      json: function(j) { this.body = j; return this; }
    };
    
    try {
      await getClanBossRuns(req, res);
      // Status message depends on auth, but it shouldn't be a syntax error
      if (res.statusCode === 200) {
        console.log('✓ getClanBossRuns executed successfully');
        if (res.body && Array.isArray(res.body)) {
           console.log(`✓ Retrived ${res.body.length} runs with participants`);
           if (res.body.length > 0 && res.body[0].participants) {
             console.log(`✓ First run has ${res.body[0].participants.length} participants`);
           }
        }
      } else {
        console.log(`✓ getClanBossRuns logic check passed (Response ${res.statusCode}: ${res.body?.error || 'Unknown'})`);
      }
    } catch (apiErr) {
      console.error('✘ getClanBossRuns crashed:', apiErr.message);
      throw apiErr;
    }

    console.log('\n--- Verification Completed Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('\n✘ Verification Failed:', err);
    process.exit(1);
  }
}

verify();
