const { Client } = require('pg');

// PostgreSQL bağlantısı için yapılandırma
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'rise_online_tracker',
  password: 'Seko1234',
  port: 5432
});

async function testUserSearch() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Kullanıcı sayısını kontrol et
    const countResult = await client.query('SELECT COUNT(*) FROM users;');
    console.log('Total users in database:', countResult.rows[0].count);

    // Örnek kullanıcı verisi çek
    const sampleResult = await client.query('SELECT uid, username, "mainCharacter", profile FROM users LIMIT 5;');
    console.log('\nSample user data:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. UID: ${row.uid}, Username: ${row.username}, MainCharacter: ${row.maincharacter}`);
      console.log(`   Profile: ${JSON.stringify(row.profile)}`);
      console.log('---');
    });

    // Username'e göre arama (null olanlar hariç)
    const usernameResult = await client.query('SELECT uid, username FROM users WHERE username IS NOT NULL LIMIT 3;');
    console.log('\nUsers with usernames:');
    usernameResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. UID: ${row.uid}, Username: ${row.username}`);
    });

    // mainCharacter'e göre arama (null olanlar hariç)
    const mainCharResult = await client.query('SELECT uid, "mainCharacter" FROM users WHERE "mainCharacter" IS NOT NULL LIMIT 3;');
    console.log('\nUsers with mainCharacters:');
    mainCharResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. UID: ${row.uid}, MainCharacter: ${row.maincharacter}`);
    });

    // Profile içinde username olan kullanıcıları kontrol et
    const profileUsernameResult = await client.query("SELECT uid, username, \"mainCharacter\", profile FROM users WHERE profile->>'username' IS NOT NULL LIMIT 3;");
    console.log('\nUsers with username in profile JSON:');
    profileUsernameResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. UID: ${row.uid}, Username: ${row.username}, MainChar: ${row.maincharacter}`);
      if (row.profile && row.profile.username) {
        console.log(`   Profile username: ${row.profile.username}`);
      }
    });

    // Profile içinde mainCharacter olan kullanıcıları kontrol et
    const profileMainCharResult = await client.query("SELECT uid, username, \"mainCharacter\", profile FROM users WHERE profile->>'mainCharacter' IS NOT NULL LIMIT 3;");
    console.log('\nUsers with mainCharacter in profile JSON:');
    profileMainCharResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. UID: ${row.uid}, Username: ${row.username}, MainChar: ${row.maincharacter}`);
      if (row.profile && row.profile.mainCharacter) {
        console.log(`   Profile mainCharacter: ${row.profile.mainCharacter}`);
      }
    });

    await client.end();
    console.log('\nDatabase connection closed.');
  } catch (error) {
    console.error('Error connecting to database:', error);
    if (client) {
      await client.end();
    }
  }
}

testUserSearch();