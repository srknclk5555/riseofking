const pool = require('./config/database');

async function migrateClanBossData() {
    try {
        console.log('=== CLAN BOSS VERİLERİ TAŞINIYOR ===\n');
        
        // 1. Mevcut kayıtları al
        const runs = await pool.query(`
            SELECT id, participants, drops, created_by 
            FROM clan_boss_runs 
            WHERE participants IS NOT NULL OR drops IS NOT NULL
        `);
        
        console.log(`Toplam ${runs.rows.length} run kaydı bulundu.`);
        
        if (runs.rows.length === 0) {
            console.log('Taşınacak veri bulunamadı.');
            return;
        }
        
        let participantsMigrated = 0;
        let dropsMigrated = 0;
        
        // 2. Her run için verileri taşı
        for (const run of runs.rows) {
            console.log(`\nRun ID: ${run.id} işleniyor...`);
            
            // Katılımcıları taşı
            if (run.participants && Array.isArray(run.participants) && run.participants.length > 0) {
                console.log(`  ${run.participants.length} katılımcı taşınıyor...`);
                
                for (const participant of run.participants) {
                    try {
                        // Kullanıcının main karakterini al
                        const userResult = await pool.query(
                            'SELECT "mainCharacter" FROM users WHERE uid = $1',
                            [participant.userId || participant.id]
                        );
                        
                        const mainCharacter = userResult.rows[0]?.mainCharacter || 'Bilinmeyen';
                        const userId = participant.userId || participant.id;
                        const isPaid = participant.isPaid || participant.paid || false;
                        
                        await pool.query(`
                            INSERT INTO clan_boss_participants 
                            (run_id, user_id, main_character, is_paid, joined_at)
                            VALUES ($1, $2, $3, $4, $5)
                            ON CONFLICT (run_id, user_id) DO NOTHING
                        `, [run.id, userId, mainCharacter, isPaid, new Date()]);
                        
                        participantsMigrated++;
                    } catch (error) {
                        console.log(`    Katılımcı hatası (${participant.userId || participant.id}): ${error.message}`);
                    }
                }
            }
            
            // Dropları taşı
            if (run.drops && typeof run.drops === 'object') {
                console.log(`  Drop verileri işleniyor...`);
                
                // Drops objesi key-value şeklinde mi?
                const dropEntries = Array.isArray(run.drops) 
                    ? run.drops 
                    : Object.entries(run.drops).map(([itemId, quantity]) => ({ itemId: parseInt(itemId), quantity }));
                
                for (const drop of dropEntries) {
                    if (drop.itemId && drop.quantity) {
                        try {
                            await pool.query(`
                                INSERT INTO clan_boss_drops 
                                (run_id, item_id, quantity, added_by)
                                VALUES ($1, $2, $3, $4)
                            `, [run.id, drop.itemId, drop.quantity, run.created_by]);
                            
                            dropsMigrated++;
                        } catch (error) {
                            console.log(`    Drop hatası (${drop.itemId}): ${error.message}`);
                        }
                    }
                }
            }
        }
        
        console.log(`\n=== TAŞIMA TAMAMLANDI ===`);
        console.log(`Katılımcılar: ${participantsMigrated} adet`);
        console.log(`Droplar: ${dropsMigrated} adet`);
        
        // 3. JSONB kolonlarını kaldır
        console.log('\n=== ESKI KOLONLAR KALDIRILIYOR ===');
        
        const oldColumns = ['participants', 'drops', 'totalrevenue'];
        for (const column of oldColumns) {
            try {
                await pool.query(`ALTER TABLE clan_boss_runs DROP COLUMN IF EXISTS ${column}`);
                console.log(`✓ ${column} kolonu kaldırıldı`);
            } catch (error) {
                console.log(`  ${column} zaten kaldırılmış veya hata: ${error.message}`);
            }
        }
        
        // 4. Son yapıyı doğrula
        console.log('\n=== SON YAPI ===');
        const finalStructure = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'clan_boss_runs'
            ORDER BY ordinal_position
        `);
        
        console.log('clan_boss_runs kolonları:');
        finalStructure.rows.forEach(col => {
            console.log(`- ${col.column_name}: ${col.data_type}`);
        });
        
        const participantCount = await pool.query('SELECT COUNT(*) as count FROM clan_boss_participants');
        const dropCount = await pool.query('SELECT COUNT(*) as count FROM clan_boss_drops');
        
        console.log(`\nToplam katılımcı kaydı: ${participantCount.rows[0].count}`);
        console.log(`Toplam drop kaydı: ${dropCount.rows[0].count}`);
        
        console.log('\n✓ Veri taşıma işlemi başarıyla tamamlandı!');
        
    } catch (error) {
        console.error('❌ Veri taşıma hatası:', error.message);
    } finally {
        await pool.end();
    }
}

migrateClanBossData();