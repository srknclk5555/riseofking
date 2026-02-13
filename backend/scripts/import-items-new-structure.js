const { Pool } = require('pg');
const admin = require('firebase-admin');
require('dotenv').config();

// Firebase servis hesabı
const serviceAccount = require('../craft-71422-firebase-adminsdk-fbsvc-4b80b140da.json');

// Firebase başlat
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://craft-71422.firebaseio.com'
});

const db = admin.firestore();

// PostgreSQL bağlantı
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

async function importItemsWithNewStructure() {
  try {
    console.log('🔄 Firestore items koleksiyonu yeni yapıya göre aktarılıyor...');
    
    // Firestore'dan items koleksiyonunu çek
    const itemsSnapshot = await db.collection('artifacts')
                                 .doc('rise_online_tracker_app')
                                 .collection('public')
                                 .doc('data')
                                 .collection('items')
                                 .get();
    
    console.log(`📊 Toplam ${itemsSnapshot.size} item bulundu`);
    
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Her item için işlem yap
    for (const doc of itemsSnapshot.docs) {
      const item = doc.data();
      
      try {
        // Bonusları ayrıştır
        const bonuses = item.bonuses || {};
        const resistances = item.resistances || {};
        
        // Yeni tablo yapısına göre verileri hazırla
        const itemData = {
          item_cesidi: item.itemType || 'Diğer',
          item_adi: item.name || '',
          item_turu: item.rarity || null,
          sinif: item.class || null,
          seviye: item.level || null,
          gear_score: item.gearScore || null,
          
          // Bonuslar
          fiziksel_savunma_bonusu: bonuses.defense || bonuses.physicalDefenseBonus || null,
          strength_bonus: bonuses.strength || bonuses.strengthBonus || null,
          dexterity_bonus: bonuses.dexterity || bonuses.dexterityBonus || null,
          intelligence_bonus: bonuses.intelligence || bonuses.intelligenceBonus || null,
          magic_bonus: bonuses.magic || bonuses.magicBonus || null,
          health_bonus: bonuses.health || null,
          hp_bonusu: bonuses.hp || bonuses.hpBonus || null,
          mp_bonusu: bonuses.mp || bonuses.mpBonus || null,
          
          // Dirençler
          ates_hasari_direnci: resistances.fire || resistances.fireResistance || null,
          buz_hasari_direnci: resistances.ice || resistances.iceResistance || null,
          yildirim_hasari_direnci: resistances.lightning || resistances.lightningResistance || null,
          zehir_hasari_direnci: resistances.poison || resistances.poisonResistance || null,
          kutsal_hasari_direnci: resistances.holy || null,
          lanet_hasari_direnci: resistances.curse || null,
          
          // Silah savunmaları
          hancer_savunmasi: bonuses.daggerDefense || null,
          kilic_savunmasi: bonuses.swordDefense || null,
          topuz_savunmasi: bonuses.maceDefense || null,
          balta_savunmasi: bonuses.axeDefense || null,
          mizrak_savunmasi: bonuses.spearDefense || null,
          yay_savunmasi: bonuses.bowDefense || null,
          
          // Bonus oranları
          exp_bonusu: bonuses.expBonus ? parseFloat(bonuses.expBonus) : null,
          coin_bonusu: bonuses.coinBonus ? parseFloat(bonuses.coinBonus) : null,
          tum_yaratiklara_karsi_saldiri_bonusu: bonuses.allMonsterDamageBonus ? parseFloat(bonuses.allMonsterDamageBonus) : null,
          
          // Hasar değerleri
          ates_hasari: bonuses.fireDamage || null,
          buz_hasari: bonuses.iceDamage || null,
          yildirim_hasari: bonuses.lightningDamage || null,
          oldurme_basina_bp_bonusu: bonuses.killBpBonus || null
        };
        
        // NULL olmayan değerleri filtrele
        const columns = [];
        const values = [];
        let placeholderIndex = 1;
        
        Object.keys(itemData).forEach(key => {
          if (itemData[key] !== null && itemData[key] !== undefined) {
            columns.push(key);
            values.push(itemData[key]);
          }
        });
        
        if (columns.length === 0) {
          console.log(`⚠️ ${item.name} için veri bulunamadı, atlandı`);
          skippedCount++;
          continue;
        }
        
        // Placeholder'lar için $1, $2, ... oluştur
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        
        const query = `
          INSERT INTO items (${columns.join(', ')}) 
          VALUES (${placeholders}) 
          ON CONFLICT (item_adi) DO NOTHING
          RETURNING id
        `;
        
        const result = await pool.query(query, values);
        
        if (result.rows.length > 0) {
          importedCount++;
          console.log(`✅ ${item.name} aktarıldı (ID: ${result.rows[0].id})`);
        } else {
          skippedCount++;
          console.log(`➡️ ${item.name} zaten mevcut, atlandı`);
        }
        
      } catch (insertError) {
        errorCount++;
        console.error(`❌ ${item.name} aktarılırken hata:`, insertError.message);
      }
    }
    
    console.log(`\n🎉 Aktarım tamamlandı!`);
    console.log(`✅ Başarıyla aktarılan: ${importedCount} item`);
    console.log(`➡️ Atlanan (zaten var): ${skippedCount} item`);
    console.log(`❌ Hatalı: ${errorCount} item`);
    console.log(`📊 Toplam Firestore item: ${itemsSnapshot.size}`);
    
    // Final kontrol
    const finalCount = await pool.query('SELECT COUNT(*) FROM items');
    console.log(`📈 PostgreSQL items sayısı: ${finalCount.rows[0].count}`);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Aktarım sırasında genel hata:', error);
  }
}

// Scripti çalıştır
importItemsWithNewStructure();