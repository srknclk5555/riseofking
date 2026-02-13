const pool = require('./config/database');

async function migrateClanBossStructure() {
    try {
        console.log('=== CLAN BOSS TABLO YAPISI GÜNCELLENİYOR ===\n');
        
        // 1. Yeni tabloları oluştur
        console.log('1. Yeni tablolar oluşturuluyor...');
        
        // Clan boss participants tablosu
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clan_boss_participants (
                id SERIAL PRIMARY KEY,
                run_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                main_character TEXT NOT NULL,
                is_paid BOOLEAN DEFAULT false,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                left_at TIMESTAMP NULL,
                FOREIGN KEY (run_id) REFERENCES clan_boss_runs(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
                UNIQUE(run_id, user_id)
            )
        `);
        console.log('✓ clan_boss_participants tablosu oluşturuldu');
        
        // Clan boss drops tablosu  
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clan_boss_drops (
                id SERIAL PRIMARY KEY,
                run_id TEXT NOT NULL,
                item_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                added_by TEXT NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (run_id) REFERENCES clan_boss_runs(id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
                FOREIGN KEY (added_by) REFERENCES users(uid) ON DELETE CASCADE
            )
        `);
        console.log('✓ clan_boss_drops tablosu oluşturuldu');
        
        // 2. Kolon isimlerini güncelle
        console.log('\n2. Kolon isimleri güncelleniyor...');
        
        const columnRenames = [
            { old: 'clanid', new: 'clan_id' },
            { old: 'bossname', new: 'boss_name' },
            { old: 'date', new: 'run_date' },
            { old: 'createdbyid', new: 'created_by' },
            { old: 'createdat', new: 'created_at' },
            { old: 'updatedat', new: 'updated_at' }
        ];
        
        for (const rename of columnRenames) {
            try {
                await pool.query(`ALTER TABLE clan_boss_runs RENAME COLUMN ${rename.old} TO ${rename.new}`);
                console.log(`✓ ${rename.old} -> ${rename.new}`);
            } catch (error) {
                if (error.message.includes('already exists') || error.message.includes('does not exist')) {
                    console.log(`  ${rename.new} zaten mevcut veya ${rename.old} bulunamadı`);
                } else {
                    throw error;
                }
            }
        }
        
        // 3. Yeni kolonları ekle
        console.log('\n3. Yeni kolonlar ekleniyor...');
        
        try {
            await pool.query(`ALTER TABLE clan_boss_runs ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false`);
            console.log('✓ is_completed kolonu eklendi');
        } catch (error) {
            console.log('  is_completed zaten mevcut');
        }
        
        // 4. Eski jsonb kolonlarını kaldır (önce verileri yeni tablolara taşıyıp sonra)
        console.log('\n4. JSONB kolonları kontrol ediliyor...');
        
        const columns = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'clan_boss_runs' AND column_name IN ('participants', 'drops', 'totalrevenue')
        `);
        
        if (columns.rows.length > 0) {
            console.log('Eski kolonlar bulundu. Veri taşıma işlemi gerekebilir.');
            columns.rows.forEach(col => {
                console.log(`- ${col.column_name}`);
            });
        } else {
            console.log('✓ Eski kolonlar zaten temizlenmiş');
        }
        
        // 5. Tablo yapısını doğrula
        console.log('\n5. Son yapı kontrol ediliyor...');
        const finalStructure = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'clan_boss_runs'
            ORDER BY ordinal_position
        `);
        
        console.log('\nSON DURUM:');
        finalStructure.rows.forEach(col => {
            console.log(`- ${col.column_name}: ${col.data_type}`);
        });
        
        console.log('\n✓ Clan boss tablo yapısı başarıyla güncellendi!');
        
    } catch (error) {
        console.error('❌ Hata oluştu:', error.message);
    } finally {
        await pool.end();
    }
}

migrateClanBossStructure();