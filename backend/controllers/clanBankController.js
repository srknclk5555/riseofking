const pool = require('../config/database');

// Clan bankasını ve bakiyesini getir
const getClanBank = async (req, res) => {
    try {
        const { clanId } = req.params;
        const userId = req.user?.uid;

        if (!clanId) return res.status(400).json({ error: 'Klan ID gerekli' });

        // Yetki kontrolü (klan üyesi mi?)
        const memberCheck = await pool.query(
            'SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clanId, userId]
        );
        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Bu bilgileri görme yetkiniz yok' });
        }

        // Bakiye getir
        const balanceResult = await pool.query(
            'SELECT balance FROM clan_balances WHERE clan_id = $1',
            [clanId]
        );

        // Eğer bakiye kaydı yoksa 0 olarak dön
        const balance = balanceResult.rows.length > 0 ? balanceResult.rows[0].balance : 0;

        // Mevcut itemleri getir (available)
        const itemsResult = await pool.query(
            'SELECT * FROM clan_bank_items WHERE clan_id = $1 AND status = \'available\' ORDER BY timestamp DESC',
            [clanId]
        );

        res.status(200).json({
            balance,
            items: itemsResult.rows,
            role: memberCheck.rows[0].role
        });
    } catch (error) {
        console.error('❌ Clan bankası getirme hatası:', error);
        res.status(500).json({ error: 'Banka bilgileri yüklenemedi' });
    }
};

// İtem Satışı (Sadece Klan Sahibi/Lideri)
const sellItem = async (req, res) => {
    const client = await pool.connect();
    try {
        const { clanId, itemId, quantity, saleAmount, saleDate } = req.body;
        const userId = req.user?.uid;

        if (!clanId || !itemId || !quantity || !saleAmount) {
            return res.status(400).json({ error: 'Eksik bilgi' });
        }

        // Yetki kontrolü (Sadece leader)
        const memberCheck = await pool.query(
            'SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clanId, userId]
        );
        if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'leader') {
            return res.status(403).json({ error: 'Sadece klan lideri satış yapabilir' });
        }

        await client.query('BEGIN');

        // 1. İtemi kontrol et ve miktarı doğrula
        const itemResult = await client.query(
            'SELECT * FROM clan_bank_items WHERE id = $1 AND clan_id = $2 AND status = \'available\'',
            [itemId, clanId]
        );

        if (itemResult.rows.length === 0) {
            throw new Error('İtem bulunamadı veya daha önce satılmış');
        }

        const item = itemResult.rows[0];
        if (item.quantity < quantity) {
            throw new Error('Yetersiz item miktarı');
        }

        // 2. clan_bank_items'dan düş veya sil
        if (item.quantity === quantity) {
            await client.query('DELETE FROM clan_bank_items WHERE id = $1', [itemId]);
        } else {
            await client.query(
                'UPDATE clan_bank_items SET quantity = quantity - $1 WHERE id = $2',
                [quantity, itemId]
            );
        }

        // 3. clan_bank_sold tablosuna ekle
        await client.query(
            `INSERT INTO clan_bank_sold (run_id, clan_id, item_name, sold_quantity, sale_amount, sold_by, original_user_id, sold_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [item.run_id, clanId, item.item_name, quantity, saleAmount, userId, item.user_id, saleDate || new Date()]
        );

        // 4. clan_balances güncelle (veya oluştur)
        await client.query(
            `INSERT INTO clan_balances (clan_id, balance, updated_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT (clan_id) DO UPDATE 
             SET balance = clan_balances.balance + $2, updated_at = CURRENT_TIMESTAMP`,
            [clanId, saleAmount]
        );

        // 5. İşlem logu ekle
        const formattedSaleAmount = new Intl.NumberFormat('tr-TR').format(saleAmount);
        const saleDescription = `${item.item_name} (${quantity} adet) satıldı. ${formattedSaleAmount} coin klan kasasına eklendi.`;

        await client.query(
            `INSERT INTO clan_bank_transactions (clan_id, user_id, amount, transaction_type, description, related_run_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [clanId, userId, saleAmount, 'item_sold', saleDescription, item.run_id]
        );

        await client.query('COMMIT');
        res.status(200).json({ message: 'Satış başarıyla tamamlandı' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ İtem satış hatası:', error);
        res.status(500).json({ error: error.message || 'Satış işlemi başarısız' });
    } finally {
        client.release();
    }
};

// Katılımcıya Ödeme Yap (Sadece Klan Sahibi/Lideri)
const payParticipant = async (req, res) => {
    const client = await pool.connect();
    try {
        const { clanId, runId, participantUserId, amount, description } = req.body;
        const userId = req.user?.uid;

        if (!clanId || !runId || !participantUserId || !amount) {
            return res.status(400).json({ error: 'Eksik bilgi' });
        }

        // Yetki kontrolü (Sadece leader)
        const memberCheck = await pool.query(
            'SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clanId, userId]
        );
        if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'leader') {
            return res.status(403).json({ error: 'Sadece klan lideri ödeme yapabilir' });
        }

        await client.query('BEGIN');

        // 1. Bakiye kontrolü
        const balanceResult = await client.query('SELECT balance FROM clan_balances WHERE clan_id = $1', [clanId]);
        const currentBalance = balanceResult.rows.length > 0 ? balanceResult.rows[0].balance : 0;

        if (currentBalance < amount) {
            throw new Error('Klan bakiyesi yetersiz');
        }

        // 2. clan_balances'dan düş
        await client.query(
            'UPDATE clan_balances SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE clan_id = $2',
            [amount, clanId]
        );

        // 3. clan_payments kaydı oluştur
        await client.query(
            `INSERT INTO clan_payments (clan_id, run_id, user_id, amount, paid_by, status)
             VALUES ($1, $2, $3, $4, $5, 'paid')`,
            [clanId, runId, participantUserId, amount, userId]
        );

        // 4. Katılımcı bilgilerini ve run bilgilerini getirerek açıklama oluştur
        const infoResult = await client.query(
            `SELECT 
                u.username, u.main_character,
                (SELECT x.nickname FROM users u2, jsonb_to_recordset(CASE WHEN jsonb_typeof(u2.other_players) = 'array' THEN u2.other_players ELSE '[]'::jsonb END) as x(uid text, nickname text) 
                 WHERE u2.uid = $1 AND x.uid = $2) as receiver_nickname,
                r.boss_name,
                (SELECT string_agg(item_name, ', ') FROM clan_bank_sold WHERE run_id = $3) as items
             FROM users u
             LEFT JOIN clan_boss_runs r ON r.id = $3
             WHERE u.uid = $2`,
            [userId, participantUserId, runId]
        );

        const info = infoResult.rows[0];
        const receiverName = info?.receiver_nickname || info?.main_character || info?.username || 'Bilinmeyen Oyuncu';
        const itemsList = info?.items || 'Eşya detayları yok';

        // Miktarı formatla (1000000 -> 1.000.000)
        const formattedAmount = new Intl.NumberFormat('tr-TR').format(amount);

        const finalDescription = `${receiverName}, ${itemsList} item satışından ${formattedAmount} coin ödeme aldı.${description ? ' Not: ' + description : ''}`;

        // 5. İşlem logu ekle
        await client.query(
            `INSERT INTO clan_bank_transactions (clan_id, user_id, amount, transaction_type, description, related_run_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [clanId, userId, -amount, 'payment_made', finalDescription, runId]
        );

        // 5. (Opsiyonel) clan_boss_participants tablosundaki is_paid durumunu güncelle
        await client.query(
            'UPDATE clan_boss_participants SET is_paid = true WHERE run_id = $1 AND user_id = $2',
            [runId, participantUserId]
        );

        await client.query('COMMIT');
        res.status(200).json({ message: 'Ödeme başarıyla yapıldı' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Ödeme hatası:', error);
        res.status(500).json({ error: error.message || 'Ödeme işlemi başarısız' });
    } finally {
        client.release();
    }
};

// Manuel İtem Ekleme (Klan bankasına direkt item ekleme)
const addManualItem = async (req, res) => {
    try {
        const { clanId, itemName, quantity } = req.body;
        const userId = req.user?.uid;

        if (!clanId || !itemName || !quantity) return res.status(400).json({ error: 'Eksik bilgi' });

        const memberCheck = await pool.query(
            'SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clanId, userId]
        );
        if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'leader') {
            return res.status(403).json({ error: 'Sadece klan lideri manuel item ekleyebilir' });
        }

        await pool.query(
            `INSERT INTO clan_bank_items (run_id, item_name, quantity, clan_id, user_id, status)
             VALUES ($1, $2, $3, $4, $5, 'available')`,
            [null, itemName, quantity, clanId, userId]
        );

        res.status(201).json({ message: 'İtem başarıyla eklendi' });
    } catch (error) {
        console.error('❌ Manuel item ekleme hatası:', error);
        res.status(500).json({ error: 'İşlem başarısız' });
    }
};

// İşlem geçmişini getir (Son 50 işlem)
const getTransactions = async (req, res) => {
    try {
        const { clanId } = req.params;
        const userId = req.user?.uid;

        const memberCheck = await pool.query(
            'SELECT 1 FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clanId, userId]
        );
        if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Yetki yok' });

        const result = await pool.query(
            `SELECT t.*, 
                COALESCE(
                    (SELECT x.nickname FROM users u2, jsonb_to_recordset(CASE WHEN jsonb_typeof(u2.other_players) = 'array' THEN u2.other_players ELSE '[]'::jsonb END) as x(uid text, nickname text) 
                     WHERE u2.uid = $2 AND x.uid = t.user_id),
                    u.main_character,
                    u.username
                ) as performer_name
             FROM clan_bank_transactions t
             LEFT JOIN users u ON t.user_id = u.uid
             WHERE t.clan_id = $1
             ORDER BY t.created_at DESC
             LIMIT 50`,
            [clanId, userId]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('❌ İşlem geçmişi hatası:', error);
        res.status(500).json({ error: 'Yüklenemedi' });
    }
};

// Satılan itemleri getir
const getSoldItems = async (req, res) => {
    try {
        const { clanId } = req.params;
        const userId = req.user?.uid;

        if (!clanId) return res.status(400).json({ error: 'Klan ID gerekli' });

        // Yetki kontrolü (klan üyesi mi?)
        const memberCheck = await pool.query(
            'SELECT 1 FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clanId, userId]
        );
        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Bu bilgileri görme yetkiniz yok' });
        }

        const result = await pool.query(
            `SELECT * FROM clan_bank_sold 
             WHERE clan_id = $1 
             ORDER BY sold_at DESC`,
            [clanId]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('❌ Satılan itemleri getirme hatası:', error);
        res.status(500).json({ error: 'Satılan itemler yüklenemedi' });
    }
};

module.exports = {
    getClanBank,
    sellItem,
    payParticipant,
    addManualItem,
    getTransactions,
    getSoldItems
};
