const pool = require('./config/database');
const { getClanBossRuns } = require('./controllers/clanBossController');

async function debug() {
    const req = {
        params: { clanId: 'YZ559G' },
        query: { status: 'open' },
        user: { uid: 'user_1772962863963_w772axxey' } // User ID'yi buraya ekleyin
    };
    
    const res = {
        status: function(code) {
            console.log('Status:', code);
            return this;
        },
        json: function(data) {
            console.log('JSON Response:', JSON.stringify(data, null, 2));
            return this;
        }
    };

    try {
        console.log('Calling getClanBossRuns...');
        await getClanBossRuns(req, res);
    } catch (error) {
        console.error('CRASHED:', error);
    } finally {
        pool.end();
    }
}

debug();
