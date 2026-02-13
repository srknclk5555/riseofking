const { Pool } = require('pg');
require('dotenv').config();

// Production'da DATABASE_URL kullan, local'de ayrı değişkenler
const isProduction = process.env.NODE_ENV === 'production';

let pool;

if (isProduction || process.env.DATABASE_URL) {
  // Production veya DATABASE_URL varsa (Neon için)
  console.log('[DB CONFIG] Using DATABASE_URL (Production/Neon)');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  // Local development
  console.log('[DB CONFIG] Using separate credentials (Local)');
  console.log('[DB CONFIG] Host:', process.env.PG_HOST);
  console.log('[DB CONFIG] Port:', process.env.PG_PORT);
  console.log('[DB CONFIG] User:', process.env.PG_USER);
  console.log('[DB CONFIG] Database:', process.env.PG_DATABASE);
  
  pool = new Pool({
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT),
    user: process.env.PG_USER,
    password: String(process.env.PG_PASSWORD),
    database: process.env.PG_DATABASE,
  });
}

pool.on('connect', () => {
  console.log('✅ PostgreSQL veritabanına başarıyla bağlandı');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL bağlantı hatası:', err);
});

module.exports = pool;