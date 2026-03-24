const pool = require('../config/database');
const NotificationService = require('../services/notificationService');
const socketManager = require('../socket/socketManager');
// Dinamik durum güncellemesi için checkAndCloseRun fonksiyonunu içe aktar
const { checkAndCloseRun } = require('./clanBossController');

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

        // Bakiye, Borç ve Kasa bilgilerini getir
        const balanceResult = await pool.query(
            'SELECT balance, clan_debt, clan_tax, debt_explanation FROM clan_balances WHERE clan_id = $1',
            [clanId]
        );

        // Tüm zamanların Tax ve Borç ödemelerinin toplamını hesapla (Pagination kayıplarını önlemek için)
        const statsResult = await pool.query(
            `SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'tax_transfer' THEN ABS(amount) ELSE 0 END), 0) as total_tax_transferred,
                COALESCE(SUM(CASE WHEN transaction_type = 'debt_payment' THEN ABS(amount) ELSE 0 END), 0) as total_debt_paid
             FROM clan_bank_transactions 
             WHERE clan_id = $1`, 
            [clanId]
        );

        // Eğer bakiye kaydı yoksa varsayılan değerleri kullan
        const balanceInfo = balanceResult.rows.length > 0 ? balanceResult.rows[0] : { balance: 0, clan_debt: 0, clan_tax: 0, debt_explanation: '' };
        const statsInfo = statsResult.rows.length > 0 ? statsResult.rows[0] : { total_tax_transferred: 0, total_debt_paid: 0 };

        // Mevcut itemleri getir (available)
        const itemsResult = await pool.query(
            'SELECT * FROM clan_bank_items WHERE clan_id = $1 AND status = \'available\' ORDER BY timestamp DESC',
            [clanId]
        );

        res.status(200).json({
            balance: balanceInfo.balance,
            clan_debt: balanceInfo.clan_debt,
            clan_tax: balanceInfo.clan_tax,
            debt_explanation: balanceInfo.debt_explanation,
            total_tax_transferred: statsInfo.total_tax_transferred,
            total_debt_paid: statsInfo.total_debt_paid,
            items: itemsResult.rows,
            role: memberCheck.rows[0].role
        });
    } catch (error) {
        console.error('❌ Clan bankası getirme hatası:', error);
        res.status(500).json({ error: 'Banka bilgileri yüklenemedi' });
    }
};

// Clan Borcu Güncelle (Sadece Lider)
const updateClanDebt = async (req, res) => {
    try {
        const { clanId, clanDebt: amount, debtExplanation: explanation } = req.body;
        const userId = req.user?.uid;

        const memberCheck = await pool.query(
            'SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clanId, userId]
        );
        if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'leader') {
            return res.status(403).json({ error: 'Yalnızca klan lideri borç bilgisini düzenleyebilir' });
        }

        await pool.query(
            `INSERT INTO clan_balances (clan_id, clan_debt, debt_explanation) 
             VALUES ($1, $2, $3)
             ON CONFLICT (clan_id) DO UPDATE 
             SET clan_debt = $2, debt_explanation = $3, updated_at = CURRENT_TIMESTAMP`,
            [clanId, amount, explanation]
        );

        res.status(200).json({ message: 'Klan borç bilgisi güncellendi' });
        // SOCKET.IO
        socketManager.sendToClan(clanId, 'CLAN_BANK_UPDATED', { action: 'debt_update' });
    } catch (error) {
        console.error('❌ Borç güncelleme hatası:', error);
        res.status(500).json({ error: 'İşlem başarısız' });
    }
};

// Clan Kasası Güncelle (Sadece Lider)
const updateClanTax = async (req, res) => {
    try {
        const { clanId, clanTax: amount } = req.body;
        const userId = req.user?.uid;

        const memberCheck = await pool.query(
            'SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clanId, userId]
        );
        if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'leader') {
            return res.status(403).json({ error: 'Yalnızca klan lideri klan kasasını düzenleyebilir' });
        }

        await pool.query(
            `INSERT INTO clan_balances (clan_id, clan_tax) 
             VALUES ($1, $2)
             ON CONFLICT (clan_id) DO UPDATE 
             SET clan_tax = $2, updated_at = CURRENT_TIMESTAMP`,
            [clanId, amount]
        );

        res.status(200).json({ message: 'Klan kasası güncellendi' });
        // SOCKET.IO
        socketManager.sendToClan(clanId, 'CLAN_BANK_UPDATED', { action: 'tax_update' });
    } catch (error) {
        console.error('❌ Kasa güncelleme hatası:', error);
        res.status(500).json({ error: 'İşlem başarısız' });
    }
};

// Hazine İşlemi (Bakiyeden Borca veya Kasaya Transfer)
const processTreasuryAction = async (req, res) => {
    const client = await pool.connect();
    try {
        const { clanId, amount, actionType, relatedRunId: runId, description, dropId } = req.body; // actionType: 'pay_debt' or 'send_to_tax'
        const userId = req.user?.uid;

        const memberCheck = await pool.query(
            'SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clanId, userId]
        );
        if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'leader') {
            return res.status(403).json({ error: 'Yalnızca klan lideri bu işlemi yapabilir' });
        }

        await client.query('BEGIN');

        // MÜKERRER İŞLEM KONTROLÜ (Drop bazlı)
        if (dropId) {
            const dropCheck = await client.query(
                'SELECT is_treasury_processed FROM clan_boss_drops WHERE id = $1',
                [dropId]
            );
            if (dropCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'İlgili drop kaydı bulunamadı.' });
            }
            if (dropCheck.rows[0].is_treasury_processed) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Bu item zaten hazineye aktarılmış veya borç ödemesinde kullanılmış.' });
            }
        }

        // Bakiye ve borç durumunu tek sorguda çek
        const balanceRes = await client.query('SELECT balance, clan_debt FROM clan_balances WHERE clan_id = $1', [clanId]);
        const currentBalance = parseFloat(balanceRes.rows[0]?.balance || 0);
        const currentDebt = parseFloat(balanceRes.rows[0]?.clan_debt || 0);

        if (currentBalance < amount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Yetersiz bakiye. Mevcut: ${currentBalance.toLocaleString('tr-TR')} G, Gerekli: ${parseFloat(amount).toLocaleString('tr-TR')} G` });
        }

        if (actionType === 'pay_debt') {
            if (currentDebt <= 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Ödenecek aktif borç bulunmuyor.' });
            }
            if (amount > currentDebt) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `Ödenmek istenen tutar (${parseFloat(amount).toLocaleString('tr-TR')} G) mevcut borçtan (${currentDebt.toLocaleString('tr-TR')} G) fazladır.`,
                    code: 'AMOUNT_EXCEEDS_DEBT',
                    currentDebt
                });
            }

            await client.query(`
                UPDATE clan_balances 
                SET balance = GREATEST(0, balance - $1), clan_debt = GREATEST(0, clan_debt - $1), updated_at = CURRENT_TIMESTAMP
                WHERE clan_id = $2
            `, [amount, clanId]);

            await client.query(`
                INSERT INTO clan_bank_transactions (clan_id, user_id, amount, transaction_type, description, related_run_id)
                VALUES ($1, $2, $3, 'debt_payment', $4, $5)
            `, [clanId, userId, -amount, description || 'Klan borcu ödemesi', runId]);

        } else if (actionType === 'send_to_tax') {
            await client.query(`
                UPDATE clan_balances 
                SET balance = GREATEST(0, balance - $1), clan_tax = clan_tax + $1, updated_at = CURRENT_TIMESTAMP
                WHERE clan_id = $2
            `, [amount, clanId]);

            await client.query(`
                INSERT INTO clan_bank_transactions (clan_id, user_id, amount, transaction_type, description, related_run_id)
                VALUES ($1, $2, $3, 'tax_transfer', $4, $5)
            `, [clanId, userId, -amount, description || 'Klan kasasına aktarım', runId]);
        } else if (actionType === 'treasury_spend') {
            // Sadece lider yapabilir (Zaten yukarıda genel kontrol var ama netlik için burada da kalabilir)
            const currentTax = parseFloat(balanceRes.rows[0]?.clan_tax || 0);

            if (currentTax < amount) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `Yetersiz hazine bakiyesi. Mevcut: ${currentTax.toLocaleString('tr-TR')} G` });
            }

            await client.query(`
                UPDATE clan_balances 
                SET clan_tax = GREATEST(0, clan_tax - $1), updated_at = CURRENT_TIMESTAMP
                WHERE clan_id = $2
            `, [amount, clanId]);

            await client.query(`
                INSERT INTO clan_bank_transactions (clan_id, user_id, amount, transaction_type, description, related_run_id)
                VALUES ($1, $2, $3, 'treasury_spend', $4, $5)
            `, [clanId, userId, -amount, description || 'Hazineden harcama', runId]);
        } else {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Geçersiz işlem tipi.' });
        }

        // Drop üzerinden işlem yapıldıysa işlenmiş olarak işaretle
        if (dropId) {
            const updateRes = await client.query(
                `UPDATE clan_boss_drops 
                 SET is_treasury_processed = true, treasury_action_type = $1 
                 WHERE id = $2`,
                [actionType, dropId]
            );
            if (updateRes.rowCount === 0) {
                console.warn(`⚠️ [TREASURY] Drop ID=${dropId} bulunamadı, durum güncellenemedi.`);
            }
        }

        // Durumu kontrol et (async)
        if (runId) {
            checkAndCloseRun(runId);
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'İşlem başarıyla gerçekleşti' });

        // SOCKET.IO
        socketManager.sendToClan(clanId, 'CLAN_BANK_UPDATED', { action: 'treasury_action' });
        if (runId) socketManager.sendToClan(clanId, 'CLAN_BOSS_RUN_UPDATED', { runId, action: 'treasury_action' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Hazine işlemi beklenmedik hata:', error);
        res.status(500).json({ error: 'Sunucu hatası, lütfen tekrar deneyin.' });
    } finally {
        client.release();
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

        // BİLDİRİM: Run katılımcılarına item satıldığını bildir
        if (item.run_id) {
            try {
                const participantsResult = await pool.query(
                    'SELECT user_id FROM clan_boss_participants WHERE run_id = $1',
                    [item.run_id]
                );

                const notifications = participantsResult.rows.map(p => ({
                    receiver_id: p.user_id,
                    title: 'İtem Satıldı',
                    text: `${item.item_name} sold: ${formattedSaleAmount} coin added to clan bank.`,
                    related_id: item.run_id,
                    type: 'sale_notification'
                }));

                if (notifications.length > 0) {
                    await NotificationService.createMultiple(notifications);
                }
            } catch (notifError) {
                console.error('Sale notification error:', notifError);
            }
        }

        // Durumu kontrol et (async)
        if (item.run_id) {
            checkAndCloseRun(item.run_id);
        }

        res.status(200).json({ message: 'Satış başarıyla tamamlandı' });

        // SOCKET.IO
        socketManager.sendToClan(clanId, 'CLAN_BANK_UPDATED', { action: 'item_sold' });
        if (item.run_id) socketManager.sendToClan(clanId, 'CLAN_BOSS_RUN_UPDATED', { runId: item.run_id, action: 'item_sold' });

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

        // 2. clan_balances'dan düş (Ekstra güvenlik için GREATEST)
        await client.query(
            'UPDATE clan_balances SET balance = GREATEST(0, balance - $1), updated_at = CURRENT_TIMESTAMP WHERE clan_id = $2',
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
        // DİNAMİK OLARAK checkAndCloseRun İÇİNDE HESAPLANIYOR ARTIK. BİR ŞEY YAPMAYA GEREK YOK.


        await client.query('COMMIT');

        // Durumu kontrol et (async)
        checkAndCloseRun(runId);

        // BİLDİRİM: Ödeme yapılan kullanıcıya bildir
        try {
            await NotificationService.create({
                receiver_id: participantUserId,
                title: 'Ödeme Yapıldı',
                text: `${formattedAmount} coin payout for ${info?.boss_name || 'Boss Run'} has been sent to you.`,
                related_id: runId,
                type: 'payout_notification'
            });
        } catch (notifError) {
            console.error('Payment notification error:', notifError);
        }

        res.status(200).json({ message: 'Ödeme başarıyla yapıldı' });

        // SOCKET.IO
        socketManager.sendToClan(clanId, 'CLAN_BANK_UPDATED', { action: 'payment_made' });
        socketManager.sendToClan(clanId, 'CLAN_BOSS_RUN_UPDATED', { runId, action: 'payment_made' });
        socketManager.sendToUser(participantUserId, 'USER_DATA_UPDATED');
        socketManager.sendToUser(participantUserId, 'NOTIFICATIONS_UPDATED');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Ödeme hatası:', error);
        res.status(500).json({ error: error.message || 'Ödeme işlemi başarısız' });
    } finally {
        client.release();
    }
};

// Katılımcıya Toplu/Kısmi Ödeme Yap (Sadece Klan Sahibi/Lideri)
const bulkPayParticipant = async (req, res) => {
    const client = await pool.connect();
    try {
        const { clanId, participantUserId, payments } = req.body;
        // payments = [{ runId, amount }, ...]
        const userId = req.user?.uid;

        if (!clanId || !participantUserId || !Array.isArray(payments) || payments.length === 0) {
            return res.status(400).json({ error: 'Eksik veya hatalı bilgi' });
        }

        // Toplam miktarı hesapla
        const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        if (totalAmount <= 0) return res.status(400).json({ error: 'Sıfırdan büyük bir miktar olmalı' });

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

        if (currentBalance < totalAmount) {
            throw new Error(`Klan bakiyesi yetersiz (Zaman aşımına uğramış olabilir). Mevcut: ${currentBalance}`);
        }

        // 2. clan_balances'dan toplam miktarı düş
        await client.query(
            'UPDATE clan_balances SET balance = GREATEST(0, balance - $1), updated_at = CURRENT_TIMESTAMP WHERE clan_id = $2',
            [totalAmount, clanId]
        );

        // Alıcı bilgisini getir (Transaction logları için)
        const infoResult = await client.query(
            `SELECT 
                u.username, u.main_character,
                (SELECT x.nickname FROM users u2, jsonb_to_recordset(CASE WHEN jsonb_typeof(u2.other_players) = 'array' THEN u2.other_players ELSE '[]'::jsonb END) as x(uid text, nickname text) 
                 WHERE u2.uid = $1 AND x.uid = $2) as receiver_nickname
             FROM users u
             WHERE u.uid = $2`,
            [userId, participantUserId]
        );
        const info = infoResult.rows[0];
        const receiverName = info?.receiver_nickname || info?.main_character || info?.username || 'Bilinmeyen Oyuncu';

        // 3. Her bir run için clan_payments kaydı oluştur
        for (const payment of payments) {
            const { runId, amount } = payment;
            if (parseFloat(amount) > 0) {
                await client.query(
                    `INSERT INTO clan_payments (clan_id, run_id, user_id, amount, paid_by, status)
                     VALUES ($1, $2, $3, $4, $5, 'paid')`,
                    [clanId, runId, participantUserId, amount, userId]
                );
            }
        }

        // 4. İşlem logu ekle (Tek satır log)
        const formattedAmount = new Intl.NumberFormat('tr-TR').format(totalAmount);
        const description = `${receiverName} isimli üyeye ${payments.length} adet farklı kayıt için toplam ${formattedAmount} coin toplu ödeme yapıldı.`;

        await client.query(
            `INSERT INTO clan_bank_transactions (clan_id, user_id, amount, transaction_type, description)
             VALUES ($1, $2, $3, 'payment_made', $4)`,
            [clanId, userId, -totalAmount, description]
        );

        await client.query('COMMIT');

        // Toplu ödemede her bir run için durum kontrolü yap
        if (payments && Array.isArray(payments)) {
            payments.forEach(p => {
                if (p.runId) checkAndCloseRun(p.runId);
            });
        }

        // BİLDİRİM: Ödeme yapılan kullanıcıya bildir
        try {
            await NotificationService.create({
                receiver_id: participantUserId,
                title: 'Toplu Ödeme Yapıldı',
                text: `${payments.length} adet boss run için toplam ${formattedAmount} coin ödemeniz yapıldı ve klan bakiyesinden düşüldü.`,
                related_id: null,
                type: 'payout_notification'
            });
        } catch (notifError) {
            console.error('Payment notification error:', notifError);
        }

        res.status(200).json({ message: 'Toplu ödeme başarıyla yapıldı' });

        // SOCKET.IO
        socketManager.sendToClan(clanId, 'CLAN_BANK_UPDATED', { action: 'bulk_payment' });
        socketManager.sendToUser(participantUserId, 'USER_DATA_UPDATED');
        socketManager.sendToUser(participantUserId, 'NOTIFICATIONS_UPDATED');
        if (payments && Array.isArray(payments)) {
            payments.forEach(p => {
                if (p.runId) socketManager.sendToClan(clanId, 'CLAN_BOSS_RUN_UPDATED', { runId: p.runId, action: 'bulk_payment' });
            });
        }

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Toplu ödeme hatası:', error);
        res.status(500).json({ error: error.message || 'Ödeme işlemi başarısız' });
    } finally {
        client.release();
    }
};

// Üyenin ödenebilir (likit bakiyesi olan) runlarını getir
const getMemberPayableRuns = async (req, res) => {
    try {
        const { clanId, userId } = req.params;
        const requesterId = req.user?.uid;

        // Yetki kontrolü (Klan lideri mi yoksa kendisi mi?)
        const memberCheck = await pool.query(
            'SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clanId, requesterId]
        );
        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Yetki yok' });
        }

        // Sadece klan lideri başkasının kayıtlarını görebilir, üye sadece kendininkini görebilir
        if (memberCheck.rows[0].role !== 'leader' && requesterId !== userId) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }

        // Likit bakiyesi (Bars + Satılan İtemler) olup henüz tamamen ödenmemiş runları getir
        const runsResult = await pool.query(
            `SELECT 
                r.id, 
                r.boss_name, 
                r.run_date,
                (SELECT COALESCE(SUM(sale_amount), 0) FROM clan_bank_sold s WHERE s.run_id::text = r.id::text) as total_sold_amount,
                (SELECT COALESCE(SUM(ABS(amount)), 0) FROM clan_bank_transactions t WHERE t.related_run_id::text = r.id::text AND t.transaction_type IN ('debt_payment', 'tax_transfer')) as total_treasury_amount,
                (SELECT COUNT(*) FROM clan_boss_participants p WHERE p.run_id::text = r.id::text AND p.left_at IS NULL) as participant_count,
                COALESCE(pay.paid_amount, 0) as user_paid_amount
             FROM clan_boss_runs r
             JOIN clan_boss_participants p ON r.id = p.run_id
             LEFT JOIN (
                 SELECT run_id, SUM(amount) as paid_amount 
                 FROM clan_payments 
                 WHERE user_id = $2 
                 GROUP BY run_id
             ) pay ON r.id = pay.run_id
             WHERE r.clan_id = $1 AND p.user_id = $2 AND p.left_at IS NULL
             ORDER BY r.run_date DESC`,
            [clanId, userId]
        );

        // Frontend'in kolayca kullanabileceği şekilde share hesaplaması yapalım
        const payableRuns = runsResult.rows.map(run => {
            const totalRevenue = parseFloat(run.total_sold_amount || 0) - parseFloat(run.total_treasury_amount || 0);
            const participantCount = parseInt(run.participant_count || 1);
            const liquidShare = Math.floor(Math.max(0, totalRevenue) / participantCount);
            const paidAmount = parseFloat(run.user_paid_amount || 0);
            const remaining = Math.max(0, liquidShare - paidAmount);

            return {
                ...run,
                remaining_liquid: remaining,
                liquid_share: liquidShare
            };
        }).filter(run => run.remaining_liquid > 0);

        res.status(200).json(payableRuns);
    } catch (error) {
        console.error('❌ Ödenebilir run getirme hatası:', error);
        res.status(500).json({ error: 'Veriler yüklenemedi' });
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

        // SOCKET.IO
        socketManager.sendToClan(clanId, 'CLAN_BANK_UPDATED', { action: 'manual_item_added' });
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
    bulkPayParticipant,
    getMemberPayableRuns,
    addManualItem,
    getTransactions,
    getSoldItems,
    updateClanDebt,
    updateClanTax,
    processTreasuryAction
};
