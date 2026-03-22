const pool = require('../config/database');
const NotificationService = require('../services/notificationService');
const socketManager = require('../socket/socketManager');

// Clan boss run oluşturma
const createClanBossRun = async (req, res) => {
    try {
        const userId = req.user?.uid;
        const { clanId, runDate, participants, drops, screenshotUrl } = req.body;

        if (!userId || !clanId || !runDate) {
            return res.status(400).json({
                error: 'Eksik bilgi: klan ve tarih bilgisi gerekli'
            });
        }

        // Önce klan üyeliği ve yetki kontrolü (sadece klan üyeleri oluşturabilir)
        const memberCheck = await pool.query(
            'SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clanId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({
                error: 'Sadece klan üyeleri boss kaydı oluşturabilir'
            });
        }

        // Transaction başlat
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Boss run oluştur (boss_name "Shallow Fever" sabit!)
            const runId = 'CBR_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const runResult = await client.query(
                `INSERT INTO clan_boss_runs (id, clan_id, boss_name, run_date, created_by, screenshot_url) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING id, boss_name, run_date, created_at`,
                [runId, clanId, 'Shallow Fever', runDate, userId, screenshotUrl || null]
            );

            // NOT: Oluşturan kullanıcı artık otomatik olarak eklenmez.
            // Katılımcı listesinde varsa aşağıdaki döngüde eklenir.

            // Bar item ID'leri skorlama için gerekli; droplar işlenmeden önce çek
            const silverBarResult = await client.query(`
                SELECT id, name FROM items 
                WHERE LOWER(TRIM(name)) IN ('silver bar', 'silverbar', 'silver_bar')
                LIMIT 1
            `);
            const goldBarResult = await client.query(`
                SELECT id, name FROM items 
                WHERE LOWER(TRIM(name)) IN ('gold bar', 'golden bar', 'goldbar', 'goldenbar', 'gold_bar', 'golden_bar', 'gold bar (+0)', 'golden bar (+0)')
                LIMIT 1
            `);

            // SKORALAMA HAZIRLIĞI: Puan miktarını belirle
            // Basitçe drop listesi boş değilse puanı 12 yapıyoruz (ya da bar dışı kontrolü ekliyoruz)
            const hasRealDrops = drops && drops.some(d => {
                const silverId = silverBarResult.rows[0]?.id;
                const goldId = goldBarResult.rows[0]?.id;
                return d.itemId && d.itemId !== silverId && d.itemId !== goldId;
            });
            const pointsEarned = hasRealDrops ? 12 : 10;

            // Oluşturucuya puan ver
            await client.query(
                `UPDATE clan_members 
                 SET participation_score = GREATEST(0, participation_score + $1) 
                 WHERE clan_id = $2 AND user_id = $3`,
                [pointsEarned, clanId, userId]
            );

            // 2. Katılımcıları ekle (Sadece klan üyesi olanlar, oluşturan dahil)
            if (participants && Array.isArray(participants)) {
                for (const pUid of participants) {
                    // Klan üyesi mi kontrol et
                    const isMember = await client.query(
                        'SELECT 1 FROM clan_members WHERE clan_id = $1 AND user_id = $2',
                        [clanId, pUid]
                    );

                    if (isMember.rows.length > 0) {
                        const userResult = await client.query(
                            'SELECT "mainCharacter" FROM users WHERE uid = $1',
                            [pUid]
                        );
                        const pMainChar = userResult.rows[0]?.mainCharacter || 'Bilinmeyen';

                        await client.query(
                            `INSERT INTO clan_boss_participants (run_id, user_id, main_character, is_paid) 
                             VALUES ($1, $2, $3, false)
                             ON CONFLICT (run_id, user_id) DO NOTHING`,
                            [runId, pUid, pMainChar]
                        );

                        await client.query(
                            `UPDATE clan_members 
                             SET participation_score = GREATEST(0, participation_score + $1) 
                             WHERE clan_id = $2 AND user_id = $3`,
                            [pointsEarned, clanId, pUid]
                        );
                    }
                }
            }

            // 3. ÖNCE NORMAL DROPLARI EKLE (Barlar hariç)
            console.log('🔵 [BOSS RUN] Processing drops...');

            if (drops && Array.isArray(drops)) {
                for (const drop of drops) {
                    if (drop.itemId && drop.quantity) {
                        // Get item name for bank record
                        const itemResult = await client.query('SELECT name FROM items WHERE id = $1', [drop.itemId]);
                        const itemName = itemResult.rows[0]?.name || 'Bilinmeyen İtem';
                        const itemNameLower = itemName.toLowerCase().trim();

                        // Skip bars - bunlar otomatik eklenecek (both 'gold bar' and 'golden bar')
                        if (itemNameLower === 'silver bar' || itemNameLower === 'golden bar' || itemNameLower === 'gold bar') {
                            console.log(`⏭️  [BOSS RUN] Skipping ${itemName} - will be auto-added`);
                            continue;
                        }

                        // Add drop to database
                        await client.query(
                            `INSERT INTO clan_boss_drops (run_id, item_id, quantity, added_by) 
                             VALUES ($1, $2, $3, $4)`,
                            [runId, drop.itemId, drop.quantity, userId]
                        );

                        // Normal itemleri bankaya ekle
                        await client.query(
                            `INSERT INTO clan_bank_items (run_id, item_name, quantity, clan_id, user_id, status)
                             VALUES ($1, $2, $3, $4, $5, 'available')
                             ON CONFLICT DO NOTHING`,
                            [runId, itemName, drop.quantity, clanId, userId]
                        );

                        console.log(`✅ [BOSS RUN] Added to bank: ${itemName} x${drop.quantity}`);
                    }
                }
            }

            // 4. BARLAR - %100 OTOMATİK EKLEME VE SATMA (GARANTILI)
            console.log('💰 [BOSS RUN] Auto-adding and selling bars...');

            // silverBarResult / goldBarResult yukarıda skorlama için zaten çekildi
            const autoBars = [
                { name: 'Silver Bar', item: silverBarResult.rows[0], amount: 10000000, quantity: 1 },
                { name: 'Gold Bar', item: goldBarResult.rows[0], amount: 100000000, quantity: 1 }
            ];

            for (const barData of autoBars) {
                if (!barData.item) {
                    console.log(`❌ [BOSS RUN] ${barData.name} not found in items table!`);
                    console.log(`   Check database - expected variations: 'Silver Bar', 'Gold Bar', 'Golden Bar'`);
                    continue;
                }

                console.log(`🔄 [BOSS RUN] Processing ${barData.name} (DB: "${barData.item.name}")...`);

                // 1. Kayıt droplarına ekle
                await client.query(
                    `INSERT INTO clan_boss_drops (run_id, item_id, quantity, added_by) 
                     VALUES ($1, $2, $3, $4)`,
                    [runId, barData.item.id, barData.quantity, userId]
                );
                console.log(`  ✓ Added to boss drops`);

                // SKORLAMA (Her bar, run başına 1 kez sayılmayacağı için burayı pas geçiyoruz. 
                // Skorlama ana döngüde değil, participant ekleme aşamasında yapılır)

                // 2. Doğrudan SATILMIŞ olarak ekle (clan_bank_items'a DEĞİL, clan_bank_sold'a)
                await client.query(
                    `INSERT INTO clan_bank_sold (run_id, clan_id, item_name, sold_quantity, sale_amount, sold_by, original_user_id, sold_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
                    [runId, clanId, barData.item.name, barData.quantity, barData.amount, userId, userId]
                );
                console.log(`  ✓ Added to sold items`);

                // 3. Klan bakiyesini güncelle
                await client.query(
                    `INSERT INTO clan_balances (clan_id, balance, updated_at)
                     VALUES ($1, $2, CURRENT_TIMESTAMP)
                     ON CONFLICT (clan_id) DO UPDATE 
                     SET balance = clan_balances.balance + $2, updated_at = CURRENT_TIMESTAMP`,
                    [clanId, barData.amount]
                );
                console.log(`  ✓ Added ${barData.amount.toLocaleString()} to clan balance`);

                // 4. İşlem logu ekle
                const formattedAmount = new Intl.NumberFormat('tr-TR').format(barData.amount);
                await client.query(
                    `INSERT INTO clan_bank_transactions (clan_id, user_id, amount, transaction_type, description, related_run_id)
                     VALUES ($1, $2, $3, 'item_sold', $4, $5)`,
                    [clanId, userId, barData.amount, `${barData.item.name} otomatik nakite çevrildi (+${formattedAmount})`, runId]
                );
                console.log(`  ✓ Transaction logged`);
                console.log(`💚 [BOSS RUN] ${barData.name} auto-sold successfully!`);
            }

            console.log('✅ [BOSS RUN] All bars processed and sold!');

            await client.query('COMMIT');

            // BİLDİRİM: Katılımcılara bildirim gönder (Oluşturan hariç)
            if (participants && Array.isArray(participants)) {
                const notifications = participants
                    .filter(pUid => pUid !== userId)
                    .map(pUid => ({
                        receiver_id: pUid,
                        title: 'Yeni Clan Boss Run',
                        text: `Klanınız Shallow Fever boss etkinliği gerçekleştirdi. Run detaylarını klan sayfasından inceleyebilirsiniz.`,
                        related_id: runId,
                        type: 'boss_run_created'
                    }));

                if (notifications.length > 0) {
                    // Not: Burada NotificationService içindeki createMultiple'ı beklemek performansı etkilemesin diye asenkron bırakabiliriz 
                    // ya da basitçe await ederiz.
                    await NotificationService.createMultiple(notifications);
                }
            }

            res.status(201).json({
                message: 'Boss kaydı başarıyla oluşturuldu',
                id: runId
            });

            // SOCKET.IO: Klandaki herkese yeni kayıt ve banka güncellemesi sinyali gönder
            socketManager.sendToClan(clanId, 'CLAN_BOSS_RUN_UPDATED', { runId, action: 'create' });
            socketManager.sendToClan(clanId, 'CLAN_BANK_UPDATED', { action: 'bars_auto_sold' });

            // Katılımcılara bildirimlerin geldiğini haber ver (React Query invalidation için)
            if (participants && Array.isArray(participants)) {
                participants.forEach(pUid => {
                    if (pUid !== userId) {
                        socketManager.sendToUser(pUid, 'NOTIFICATIONS_UPDATED');
                    }
                });
            }

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Clan boss run oluşturma hatası:', error);
        res.status(500).json({ error: 'Kayıt oluşturulamadı', details: error.message });
    }
};

// Clan üyelerini nickname ile birlikte getir (Cascaded Resolution)
const getClanMembersWithNicknames = async (req, res) => {
    try {
        const viewerId = req.user?.uid || req.user?.id;
        const { clanId } = req.params;

        if (!clanId) return res.status(400).json({ error: 'Klan ID gerekli' });

        // 1. Klan liderini (owner) bul
        const clanResult = await pool.query('SELECT owner_id FROM clans WHERE id = $1', [clanId]);
        if (clanResult.rows.length === 0) {
            return res.status(404).json({ error: 'Klan bulunamadı' });
        }
        const leaderId = clanResult.rows[0].owner_id;

        // 🔒 AÇIK #6 DÜZELTİLDİ: Klan dışı erişimi engelle
        if (leaderId !== viewerId) {
            const memberCheck = await pool.query(
                `SELECT 1 FROM clan_members WHERE clan_id = $1 AND user_id = $2 AND status = 'active'`,
                [clanId, viewerId]
            );
            if (memberCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Bu klanın üye listesini görmeye yetkiniz yok' });
            }
        }

        // 2. Üyeleri ve onların temel bilgilerini getir
        const membersResult = await pool.query(`
            SELECT 
                u.uid as user_id,
                cm.role,
                cm.joined_at,
                u."mainCharacter" as char_name,
                u.username
            FROM clan_members cm
            LEFT JOIN users u ON cm.user_id = u.uid
            WHERE cm.clan_id = $1
            ORDER BY cm.joined_at ASC
        `, [clanId]);

        const members = membersResult.rows;

        // 3. Viewer ve Leader'ın arkadaş listelerini çek
        let viewerFriends = {};
        let leaderFriends = {};

        if (viewerId) {
            const viewerRes = await pool.query('SELECT other_players FROM users WHERE uid = $1', [viewerId]);
            viewerFriends = viewerRes.rows[0]?.other_players || {};
        }

        if (leaderId && leaderId !== viewerId) {
            const leaderRes = await pool.query('SELECT other_players FROM users WHERE uid = $1', [leaderId]);
            leaderFriends = leaderRes.rows[0]?.other_players || {};
        } else if (leaderId === viewerId) {
            leaderFriends = viewerFriends;
        }

        // Nickname haritaları oluştur
        const viewerNicknames = {};
        Object.values(viewerFriends).forEach(f => {
            if (f && f.uid && f.nickname) viewerNicknames[f.uid] = f.nickname;
        });

        const leaderNicknames = {};
        Object.values(leaderFriends).forEach(f => {
            if (f && f.uid && f.nickname) leaderNicknames[f.uid] = f.nickname;
        });

        // 4. Her üye için isim çözümleme yap
        const resolvedMembers = members.map(member => {
            let resolvedNickname = '';

            // Kural 1: Kendisi mi? -> char_name
            if (member.user_id === viewerId) {
                resolvedNickname = member.char_name || member.username;
            }
            // Kural 2: Viewer'ın arkadaş listesinde var mı?
            else if (viewerNicknames[member.user_id]) {
                resolvedNickname = viewerNicknames[member.user_id];
            }
            // Kural 3: Liderin arkadaş listesinde var mı?
            else if (leaderNicknames[member.user_id]) {
                resolvedNickname = leaderNicknames[member.user_id];
            }
            // Kural 4: Kendi mainCharacter'ı / Username
            else {
                resolvedNickname = member.char_name || member.username;
            }

            return {
                ...member,
                display_name: member.char_name || member.username,
                nickname: resolvedNickname
            };
        });

        res.status(200).json(resolvedMembers);
    } catch (error) {
        console.error('❌ Clan üyeleri getirme hatası:', error);
        res.status(500).json({ error: 'Clan üyeleri getirilemedi' });
    }
};

// Clan boss run detaylarını getir
const getClanBossRunDetails = async (req, res) => {
    try {
        const userId = req.user?.uid;
        const { id } = req.params;

        if (!userId) return res.status(401).json({ error: 'Yetki gerekli' });

        const runResult = await pool.query(
            `SELECT r.*, c.name as clan_name, u.username as creator_username, u."mainCharacter" as creator_main_character
             FROM clan_boss_runs r
             JOIN clans c ON r.clan_id = c.id
             JOIN users u ON r.created_by = u.uid
             WHERE r.id = $1`,
            [id]
        );

        if (runResult.rows.length === 0) {
            return res.status(404).json({ error: 'Kayıt bulunamadı' });
        }

        const run = runResult.rows[0];

        // Toplam satış miktarını hesapla
        const salesResult = await pool.query(
            'SELECT SUM(sale_amount) as total_sold_amount FROM clan_bank_sold WHERE run_id = $1',
            [id]
        );
        const totalSoldAmount = parseFloat(salesResult.rows[0]?.total_sold_amount || 0);

        // Hazine işlemlerini (Tax/Borç) hesapla
        const treasuryResult = await pool.query(
            "SELECT SUM(ABS(amount)) as total_treasury FROM clan_bank_transactions WHERE related_run_id = $1 AND transaction_type IN ('debt_payment', 'tax_transfer')",
            [id]
        );
        const totalTreasuryAmount = parseFloat(treasuryResult.rows[0]?.total_treasury || 0);

        // Güvenlik kontrolü: Kullanıcı klan üyesi mi?
        const memberCheck = await pool.query(
            'SELECT 1 FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [run.clan_id, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Bu kaydı görme yetkiniz yok' });
        }

        // Katılımcıları getir
        const participantsResult = await pool.query(
            `SELECT p.*, u.username, u."mainCharacter" as main_character, cm.status as member_status
             FROM clan_boss_participants p
             JOIN users u ON p.user_id = u.uid
             LEFT JOIN clan_members cm ON p.user_id = cm.user_id AND cm.clan_id = $2
             WHERE p.run_id = $1 AND p.left_at IS NULL
             ORDER BY p.joined_at`,
            [id, run.clan_id]
        );

        // Get viewer's nickname data to map participant nicknames
        const viewerResult = await pool.query(
            'SELECT other_players FROM users WHERE uid = $1',
            [userId]
        );

        const viewerOtherPlayers = viewerResult.rows[0]?.other_players || {};
        const participantNicknames = {};

        // Extract nickname information
        for (const [key, friendData] of Object.entries(viewerOtherPlayers)) {
            if (friendData && friendData.uid && friendData.nickname) {
                participantNicknames[friendData.uid] = friendData.nickname;
            }
        }

        // Katılımcılara ödeme bilgisini ekle (Her katılımcı için toplam ödenen)
        const paymentsResult = await pool.query(
            'SELECT user_id, SUM(amount) as paid_amount FROM clan_payments WHERE run_id = $1 GROUP BY user_id',
            [id]
        );
        const paymentsMap = {};
        paymentsResult.rows.forEach(p => {
            paymentsMap[p.user_id] = parseFloat(p.paid_amount || 0);
        });

        // GÜNLÜK ACP BAĞIŞLARINI GETİR (Run tarihindeki)
        const acpResult = await pool.query(
            'SELECT user_id, amount FROM clan_acp_donations WHERE clan_id = $1 AND donation_date = $2',
            [run.clan_id, run.run_date]
        );
        const acpMap = {};
        acpResult.rows.forEach(a => {
            acpMap[a.user_id] = (acpMap[a.user_id] || 0) + parseInt(a.amount);
        });

        // Add nickname information and ACP to participants
        const participantsWithNicknames = participantsResult.rows.map(participant => ({
            ...participant,
            nickname: participantNicknames[participant.user_id] || participant.username,
            paid_amount: paymentsMap[participant.user_id] || 0,
            daily_acp: acpMap[participant.user_id] || 0
        }));

        // Dropları getir ve durumlarını kontrol et
        const dropsResult = await pool.query(
            `SELECT d.*, i.name as item_name,
             d.is_treasury_processed,
             d.treasury_action_type,
             EXISTS (
                 SELECT 1 FROM clan_bank_items bi 
                 WHERE bi.run_id = d.run_id 
                 AND bi.item_name = i.name 
                 AND bi.status = 'available'
             ) as is_available,
             (
                 SELECT COALESCE(SUM(sold_quantity), 0)
                 FROM clan_bank_sold bs
                 WHERE bs.run_id = d.run_id
                 AND bs.item_name = i.name
             ) as sold_quantity
             FROM clan_boss_drops d
             JOIN items i ON d.item_id = i.id
             WHERE d.run_id = $1
             ORDER BY d.added_at DESC`,
            [id]
        );

        const drops = dropsResult.rows.map(drop => ({
            ...drop,
            status: drop.is_available ? 'available' : (drop.sold_quantity >= drop.quantity ? 'sold' : 'partially_sold')
        }));

        const hasUnsoldItems = drops.some(d => d.status === 'available' || d.status === 'partially_sold');

        // Get viewer's nickname data
        const userResult = await pool.query(
            'SELECT other_players FROM users WHERE uid = $1',
            [userId]
        );

        const otherPlayers = userResult.rows[0]?.other_players || {};
        const creatorNicknames = {};

        // Extract nickname information
        for (const [key, friendData] of Object.entries(otherPlayers)) {
            if (friendData && friendData.uid && friendData.nickname) {
                creatorNicknames[friendData.uid] = friendData.nickname;
            }
        }

        // Add nickname information to run
        const runWithNickname = {
            ...run,
            creator_nickname: creatorNicknames[run.created_by] || run.creator_username
        };

        res.status(200).json({
            ...runWithNickname,
            participants: participantsWithNicknames,
            drops: drops,
            total_sold_amount: totalSoldAmount,
            total_treasury_amount: totalTreasuryAmount,
            has_unsold_items: hasUnsoldItems
        });
    } catch (error) {
        console.error('❌ Detay getirme hatası:', error);
        res.status(500).json({ error: 'Kayıt detayları yüklenemedi' });
    }
};

// Clan'ın tüm boss run'larını getir
const getClanBossRuns = async (req, res) => {
    try {
        const userId = req.user?.uid;
        const { clanId } = req.params;

        if (!userId || !clanId) return res.status(400).json({ error: 'Eksik bilgi' });

        // Kullanıcı klan üyesi mi?
        const memberCheck = await pool.query(
            'SELECT 1 FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clanId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Sadece klan üyeleri klan kayıtlarını görebilir' });
        }

        const { status, startDate, endDate } = req.query;

        let query = `SELECT r.id, r.clan_id, r.boss_name, r.run_date, r.created_at, r.created_by, r.status,
                    u.username as creator_username, u."mainCharacter" as creator_main_character,
                    (SELECT COUNT(*) FROM clan_boss_participants p WHERE p.run_id::text = r.id::text AND p.left_at IS NULL) as participant_count,
                    (SELECT COUNT(*) FROM clan_boss_participants p WHERE p.run_id::text = r.id::text AND p.is_paid = true AND p.left_at IS NULL) as paid_count,
                    (SELECT COUNT(*) FROM clan_boss_participants p WHERE p.run_id::text = r.id::text AND p.left_at IS NULL AND p.user_id = $2) as am_i_participant,
                    (SELECT COUNT(*) FROM clan_boss_drops d WHERE d.run_id::text = r.id::text) as drop_count,
                    (SELECT COALESCE(SUM(sale_amount), 0) FROM clan_bank_sold s WHERE s.run_id::text = r.id::text) as total_sold_amount,
                    (SELECT COALESCE(SUM(amount), 0) FROM clan_payments cp WHERE cp.run_id::text = r.id::text) as total_paid_amount,
                    (SELECT COALESCE(SUM(ABS(amount)), 0) FROM clan_bank_transactions t WHERE t.related_run_id::text = r.id::text AND t.transaction_type IN ('debt_payment', 'tax_transfer')) as total_treasury_amount,

                    (
                        SELECT json_agg(json_build_object(
                            'user_id', p_inner.user_id,
                            'paid_amount', (SELECT COALESCE(SUM(amount), 0) FROM clan_payments cp WHERE cp.run_id::text = p_inner.run_id::text AND cp.user_id = p_inner.user_id),
                            'username', u_p.username,
                            'nickname', COALESCE(
                                (SELECT x.nickname FROM users u2, jsonb_to_recordset(CASE WHEN jsonb_typeof(u2.other_players) = 'array' THEN u2.other_players ELSE '[]'::jsonb END) as x(uid text, nickname text) 
                                 WHERE u2.uid = $2 AND x.uid = p_inner.user_id),
                                u_p."mainCharacter",
                                u_p.username
                            )
                        ))
                        FROM clan_boss_participants p_inner
                        JOIN users u_p ON p_inner.user_id = u_p.uid
                        WHERE p_inner.run_id::text = r.id::text AND p_inner.left_at IS NULL
                    ) as participants,

                    (
                        SELECT json_agg(json_build_object(
                            'id', dr.id,
                            'item_name', i.name, 
                            'quantity', dr.quantity,
                            'is_treasury_processed', dr.is_treasury_processed,
                            'treasury_action_type', dr.treasury_action_type
                        ))
                        FROM clan_boss_drops dr
                        JOIN items i ON dr.item_id = i.id
                        WHERE dr.run_id::text = r.id::text
                    ) as drops
             FROM clan_boss_runs r
             JOIN users u ON r.created_by = u.uid
             WHERE r.clan_id = $1`;

        const queryParams = [clanId, userId];
        let paramIndex = 3;

        // Statü filtresi
        if (status === 'open' || status === 'closed') {
            query += ` AND r.status = $${paramIndex++}`;
            queryParams.push(status);
        } else if (!status) {
            // Varsayılan (boş gelirse) 'open'
            query += ` AND r.status = 'open'`;
        }

        // Tarih Aralığı filtresi
        if (startDate) {
            query += ` AND r.run_date >= $${paramIndex++}`;
            queryParams.push(startDate);
        }
        if (endDate) {
            query += ` AND r.run_date <= $${paramIndex++}`;
            queryParams.push(endDate);
        }

        query += ` ORDER BY r.run_date DESC, r.created_at DESC`;

        // Limit Mantığı:
        // Tarih filtresi varsa -> Limit yok
        // Tarih filtresi yoksa:
        //   - open -> Limit yok
        //   - closed veya all -> LIMIT 10
        if (!startDate && !endDate && (status === 'closed' || status === 'all')) {
            query += ` LIMIT 10`;
        }

        const runsResult = await pool.query(query, queryParams);
        const runs = runsResult.rows;

        if (runs.length > 0) {
            // Katılımcıları toplu olarak getirelim (N+1 problemini çözmek için)
            const runIds = runs.map(r => r.id);
            const participantsRes = await pool.query(`
                SELECT p.run_id, p.user_id, u.username, p.main_character,
                       COALESCE(SUM(cp.amount), 0) as paid_amount
                FROM clan_boss_participants p
                JOIN users u ON p.user_id = u.uid
                LEFT JOIN clan_payments cp ON cp.run_id::text = p.run_id::text AND cp.user_id = p.user_id
                WHERE p.run_id = ANY($1) AND p.left_at IS NULL
                GROUP BY p.run_id, p.user_id, u.username, p.main_character
                ORDER BY u.username ASC
            `, [runIds]);

            // Katılımcıları run_id'ye göre gruplayalım
            const participantsByRun = {};
            participantsRes.rows.forEach(p => {
                if (!participantsByRun[p.run_id]) participantsByRun[p.run_id] = [];
                participantsByRun[p.run_id].push(p);
            });

            // Her bir run'a kendi katılımcılarını ekleyelim
            runs.forEach(run => {
                run.participants = participantsByRun[run.id] || [];
            });
        }

        // Get viewer's nickname data
        const userResult = await pool.query(
            'SELECT other_players FROM users WHERE uid = $1',
            [userId]
        );

        const otherPlayers = userResult.rows[0]?.other_players || {};
        const creatorNicknames = {};

        // Extract nickname information
        for (const [key, friendData] of Object.entries(otherPlayers)) {
            if (friendData && friendData.uid && friendData.nickname) {
                creatorNicknames[friendData.uid] = friendData.nickname;
            }
        }

        // Add nickname information to each run
        const runsWithNicknames = runs.map(run => ({
            ...run,
            creator_nickname: creatorNicknames[run.created_by] || run.creator_username
        }));

        res.status(200).json(runsWithNicknames);
    } catch (error) {
        console.error('❌ Kayıt listeleme hatası:', error);
        res.status(500).json({ error: 'Kayıtlar yüklenemedi' });
    }
};

// Tüm katılımcıların ödeme durumunu toplu olarak güncelle (Herkese Öde / Hepsini İptal Et)
const bulkUpdateAllPaymentStatus = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user?.uid;
        const { runId } = req.params;
        const { isPaid } = req.body;

        // Yetki kontrolü: Kaydı oluşturan kişi veya klan lideri mi?
        const runInfo = await client.query(
            'SELECT clan_id, created_by, boss_name FROM clan_boss_runs WHERE id = $1',
            [runId]
        );

        if (runInfo.rows.length === 0) return res.status(404).json({ error: 'Kayıt bulunamadı' });

        const { clan_id, created_by, boss_name } = runInfo.rows[0];
        const userRole = await client.query(
            'SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clan_id, userId]
        );

        const isLeader = userRole.rows[0]?.role === 'leader';
        const isCreator = created_by === userId;

        if (!isLeader && !isCreator) {
            return res.status(403).json({ error: 'Ödeme durumunu sadece lider veya kaydı açan güncelleyebilir' });
        }

        await client.query('BEGIN');

        if (isPaid === false) {
            // ÖDEMELERİ İPTAL ET
            // 1. İptal edilecek tüm ödemeleri bul
            const paymentsCheck = await client.query(
                `SELECT cp.user_id, cp.amount, u.username, u."mainCharacter"
                 FROM clan_payments cp
                 JOIN users u ON cp.user_id = u.uid
                 WHERE cp.run_id = $1`,
                [runId]
            );

            if (paymentsCheck.rows.length > 0) {
                const totalRefundAmount = paymentsCheck.rows.reduce((sum, p) => sum + parseFloat(p.amount), 0);

                // 2. Bakiyeyi geri ekle
                await client.query(
                    'UPDATE clan_balances SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE clan_id = $2',
                    [totalRefundAmount, clan_id]
                );

                // 3. İşlem logu ekle (Toplu iade logu)
                const formattedAmount = new Intl.NumberFormat('tr-TR').format(totalRefundAmount);
                const participantCount = paymentsCheck.rows.length;
                const reversalDescription = `Toplu Ödeme İptali: ${participantCount} oyuncuya yapılan toplam ${formattedAmount} coin tutarındaki (${boss_name || 'Boss Run'}) ödemesi geri alındı.`;

                await client.query(
                    `INSERT INTO clan_bank_transactions (clan_id, user_id, amount, transaction_type, description, related_run_id)
                     VALUES ($1, $2, $3, 'payment_reversed', $4, $5)`,
                    [clan_id, userId, totalRefundAmount, reversalDescription, runId]
                );

                // 4. Tüm ödeme kayıtlarını sil
                await client.query('DELETE FROM clan_payments WHERE run_id = $1', [runId]);

                // 5. Katılımcı durumlarını güncelle
                await client.query('UPDATE clan_boss_participants SET is_paid = false WHERE run_id = $1', [runId]);
            }
        } else {
            // TÜMÜNE ÖDEME YAP
            // 1. Toplam satışı ve hazineyi hesaplayalım
            const salesResult = await client.query(
                'SELECT SUM(sale_amount) as total_sold FROM clan_bank_sold WHERE run_id = $1',
                [runId]
            );
            const totalSold = parseFloat(salesResult.rows[0]?.total_sold || 0);

            const treasuryResult = await client.query(
                "SELECT SUM(ABS(amount)) as total_treasury FROM clan_bank_transactions WHERE related_run_id = $1 AND transaction_type IN ('debt_payment', 'tax_transfer')",
                [runId]
            );
            const totalTreasury = parseFloat(treasuryResult.rows[0]?.total_treasury || 0);

            const totalDistributable = Math.max(0, totalSold - totalTreasury);

            // 2. Katılımcıları al ve alfabetik sıraya koy (paydaş dağıtımı için)
            const participantsResult = await client.query(
                `SELECT p.user_id, u.username, u."mainCharacter"
                 FROM clan_boss_participants p
                 JOIN users u ON p.user_id = u.uid
                 WHERE p.run_id = $1 AND p.left_at IS NULL
                 ORDER BY p.joined_at`,
                [runId]
            );

            const participants = participantsResult.rows;
            const count = participants.length;
            if (count > 0 && totalDistributable > 0) {
                // 3. Daha önceden ödenenleri al
                const paymentsResult = await client.query(
                    'SELECT user_id, SUM(amount) as paid_amount FROM clan_payments WHERE run_id = $1 GROUP BY user_id',
                    [runId]
                );
                const paymentsMap = {};
                paymentsResult.rows.forEach(p => {
                    paymentsMap[p.user_id] = parseFloat(p.paid_amount || 0);
                });

                const baseShare = Math.floor(totalDistributable / count);
                const remainder = totalDistributable % count;

                let totalPaymentThisTime = 0;
                let paidParticipantsCount = 0;

                // 4. Her bir katılımcı için ödenmesi gereken tutarı bul
                for (let i = 0; i < count; i++) {
                    const participant = participants[i];
                    const share = i < remainder ? baseShare + 1 : baseShare;
                    const paidAmount = paymentsMap[participant.user_id] || 0;
                    const remaining = Math.max(0, share - paidAmount);

                    if (remaining > 0) {
                        // Yeni ödeme kaydı oluştur
                        await client.query(
                            'INSERT INTO clan_payments (clan_id, run_id, user_id, paid_by, amount) VALUES ($1, $2, $3, $4, $5)',
                            [clan_id, runId, participant.user_id, userId, remaining]
                        );

                        totalPaymentThisTime += remaining;
                        paidParticipantsCount++;

                        // Bildirim gönder
                        await NotificationService.create({
                            receiver_id: participant.user_id,
                            title: 'Ödemeniz Onaylandı (Toplu)',
                            text: `Boss run etkinliği için payınız (${boss_name}) lider tarafından onaylandı.`,
                            related_id: runId,
                            type: 'boss_payout'
                        });
                    }
                }

                if (totalPaymentThisTime > 0) {
                    // 5. Bakiyeden toplu ödemeyi düş (Negatif kontrolü ile)
                    const balCheck = await client.query('SELECT balance FROM clan_balances WHERE clan_id = $1', [clan_id]);
                    const currentBalance = parseFloat(balCheck.rows[0]?.balance || 0);

                    if (currentBalance < totalPaymentThisTime) {
                        throw new Error(`Klan kasasında yeterli bakiye yok! (Gerekli: ${totalPaymentThisTime}, Mevcut: ${currentBalance})`);
                    }

                    await client.query(
                        'UPDATE clan_balances SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE clan_id = $2',
                        [totalPaymentThisTime, clan_id]
                    );

                    // 6. Banka işlem kaydı oluştur (Toplu ödeme)
                    const formattedAmount = new Intl.NumberFormat('tr-TR').format(totalPaymentThisTime);
                    const paymentDescription = `Toplu Ödeme: ${paidParticipantsCount} oyuncuya ${boss_name || 'Boss Run'} katılım payları ödendi. Toplam: ${formattedAmount} G.`;

                    await client.query(
                        `INSERT INTO clan_bank_transactions (clan_id, user_id, amount, transaction_type, description, related_run_id)
                         VALUES ($1, $2, $3, 'payment', $4, $5)`,
                        [clan_id, userId, -totalPaymentThisTime, paymentDescription, runId]
                    );
                }
            } else if (count > 0 && totalDistributable <= 0) {
                // Satış geliri yoksa sadece statusleri true yap
                await client.query('UPDATE clan_boss_participants SET is_paid = true WHERE run_id = $1', [runId]);
            }
        }

        await client.query('COMMIT');

        // Durumu kontrol et (async)
        checkAndCloseRun(runId);

        res.status(200).json({ message: 'Toplu ödeme durumu başarıyla güncellendi' });

        // SOCKET.IO: Toplu güncelleme bildir
        socketManager.sendToClan(clan_id, 'CLAN_BOSS_RUN_UPDATED', { runId, action: 'bulk_payment' });
        socketManager.sendToClan(clan_id, 'CLAN_BANK_UPDATED', { action: 'bulk_payment' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Toplu ödeme hatası:', error);
        res.status(500).json({ error: error.message || 'Toplu ödeme yapılamadı' });
    } finally {
        client.release();
    }
};

// Katılımcı ödeme durumunu güncelle
const updateParticipantPayStatus = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user?.uid;
        const { runId, participantUserId } = req.params;
        const { isPaid } = req.body;

        // Yetki kontrolü: Kaydı oluşturan kişi veya klan lideri mi?
        const runInfo = await pool.query(
            'SELECT clan_id, created_by FROM clan_boss_runs WHERE id = $1',
            [runId]
        );

        if (runInfo.rows.length === 0) return res.status(404).json({ error: 'Kayıt bulunamadı' });

        const { clan_id, created_by } = runInfo.rows[0];
        const userRole = await pool.query(
            'SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clan_id, userId]
        );

        const isLeader = userRole.rows[0]?.role === 'leader';
        const isCreator = created_by === userId;

        if (!isLeader && !isCreator) {
            return res.status(403).json({ error: 'Ödeme durumunu sadece lider veya kaydı açan güncelleyebilir' });
        }

        await client.query('BEGIN');

        // ÖDEME İPTALİ (Paid -> Unpaid)
        if (isPaid === false) {
            // Artık is_paid manuel olarak atanmıyor. CheckAndCloseRun çalıştırılınca
            // dinamik olarak kalan tutara ve satılmamış item durumuna göre is_paid güncellenecektir.
            // 1. Ödeme kaydını bul
            const paymentCheck = await client.query(
                'SELECT amount FROM clan_payments WHERE run_id = $1 AND user_id = $2 LIMIT 1',
                [runId, participantUserId]
            );

            if (paymentCheck.rows.length > 0) {
                const refundAmount = parseFloat(paymentCheck.rows[0].amount);

                // 2. Bakiyeyi geri ekle
                await client.query(
                    'UPDATE clan_balances SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE clan_id = $2',
                    [refundAmount, clan_id]
                );

                // 3. Katılımcı bilgilerini ve run bilgilerini getirerek açıklama oluştur
                const infoResult = await client.query(
                    `SELECT
                        u.username, u.main_character,
                        (SELECT x.nickname FROM users u2, jsonb_to_recordset(CASE WHEN jsonb_typeof(u2.other_players) = 'array' THEN u2.other_players ELSE '[]'::jsonb END) as x(uid text, nickname text)
                         WHERE u2.uid = $1 AND x.uid = $2) as receiver_nickname,
                        r.boss_name
                     FROM users u
                     LEFT JOIN clan_boss_runs r ON r.id = $3
                     WHERE u.uid = $2`,
                    [userId, participantUserId, runId]
                );

                const info = infoResult.rows[0];
                const receiverName = info?.receiver_nickname || info?.main_character || info?.username || 'Bilinmeyen Oyuncu';

                // Miktarı formatla
                const formattedAmount = new Intl.NumberFormat('tr-TR').format(refundAmount);

                const reversalDescription = `Ödeme İptali: ${receiverName} adlı oyuncuya yapılan ${formattedAmount} coin tutarındaki (${info?.boss_name || 'Boss Run'}) ödemesi geri alındı.`;

                // 4. İşlem logu ekle
                await client.query(
                    `INSERT INTO clan_bank_transactions (clan_id, user_id, amount, transaction_type, description, related_run_id)
                     VALUES ($1, $2, $3, 'payment_reversed', $4, $5)`,
                    [clan_id, userId, refundAmount, reversalDescription, runId]
                );

                // 4. Ödeme kaydını sil
                await client.query(
                    'DELETE FROM clan_payments WHERE run_id = $1 AND user_id = $2',
                    [runId, participantUserId]
                );
            }
        }
        // Katılımcı durumunu güncelle - ARTIK checkAndCloseRun İÇİNDE DİNAMİK OLARAK YAPILACAK
        // await client.query(
        //     'UPDATE clan_boss_participants SET is_paid = $1 WHERE run_id = $2 AND user_id = $3',
        //     [isPaid, runId, participantUserId]
        // );

        await client.query('COMMIT');

        // Durumu kontrol et (async)
        checkAndCloseRun(runId);

        // BİLDİRİM: Eğer ödeme onaylandıysa alıcıya bildir
        if (isPaid) {
            await NotificationService.create({
                receiver_id: participantUserId,
                title: 'Ödemeniz Onaylandı',
                text: `Boss run etkinliği için payınız (${runId}) lider tarafından onaylandı.`,
                related_id: runId,
                type: 'boss_payout'
            });
        }

        res.status(200).json({ message: 'Ödeme durumu güncellendi ve bakiye senkronize edildi' });

        // SOCKET.IO: Ödeme güncelleme bildir
        socketManager.sendToClan(clan_id, 'CLAN_BOSS_RUN_UPDATED', { runId, action: 'payment_update' });
        socketManager.sendToClan(clan_id, 'CLAN_BANK_UPDATED', { action: 'payment_update' });
        // Alıcıyı uyar (React Query invalidation için)
        socketManager.sendToUser(participantUserId, 'USER_DATA_UPDATED');
        if (isPaid) {
            socketManager.sendToUser(participantUserId, 'NOTIFICATIONS_UPDATED');
        }
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Ödeme güncelleme hatası:', error);
        res.status(500).json({ error: 'İşlem başarısız' });
    } finally {
        client.release();
    }
};

// Kayıttan kendini çıkar
const removeSelfFromRun = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user?.uid;
        const { runId } = req.params;

        await client.query('BEGIN');

        // 1. Run bilgilerini al (puan reversal için)
        const runRes = await client.query('SELECT clan_id FROM clan_boss_runs WHERE id = $1', [runId]);
        if (runRes.rows.length === 0) {
            return res.status(404).json({ error: 'Kayıt bulunamadı' });
        }
        const clanId = runRes.rows[0].clan_id;

        // 2. Drop kontrolü yap (gerçek drop var mı?)
        const dropsResult = await client.query(
            `SELECT i.name
             FROM clan_boss_drops d
             JOIN items i ON d.item_id = i.id
             WHERE d.run_id = $1`,
            [runId]
        );

        const hasRealDrops = dropsResult.rows.some(d => {
            const dName = d.name ? d.name.toLowerCase() : '';
            return dName && !dName.includes('silver bar') && !dName.includes('gold bar') && !dName.includes('golden bar');
        });

        const pointsToReverse = hasRealDrops ? 12 : 10;

        // 3. Puanı geri al
        await client.query(
            `UPDATE clan_members
             SET participation_score = GREATEST(0, participation_score - $1)
             WHERE clan_id = $2 AND user_id = $3`,
            [pointsToReverse, clanId, userId]
        );

        // 4. Katılımcıyı sil
        await client.query(
            'DELETE FROM clan_boss_participants WHERE run_id = $1 AND user_id = $2',
            [runId, userId]
        );

        await client.query('COMMIT');

        // Durumu kontrol et (async)
        checkAndCloseRun(runId);

        res.status(200).json({ message: 'Kayıttan ayrıldınız ve puanınız güncellendi' });

        // SOCKET.IO: Katılımcı değişikliği bildir
        socketManager.sendToClan(runInfo.rows[0].clan_id, 'CLAN_BOSS_RUN_UPDATED', { runId, action: 'participant_left' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Kayıttan ayrılma hatası:', error);
        res.status(500).json({ error: 'Ayrılma işlemi başarısız' });
    } finally {
        client.release();
    }
};

// Kayıttan başka bir kullanıcıyı çıkar (sadece lider veya oluşturucu)
const removeParticipantFromRun = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user?.uid;
        const { runId, participantUserId } = req.params;

        // Yetki kontrolü: Kaydı oluşturan kişi veya klan lideri mi?
        const runInfo = await client.query(
            'SELECT clan_id, created_by FROM clan_boss_runs WHERE id = $1',
            [runId]
        );

        if (runInfo.rows.length === 0) return res.status(404).json({ error: 'Kayıt bulunamadı' });

        const { clan_id, created_by } = runInfo.rows[0];
        const userRole = await client.query(
            'SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clan_id, userId]
        );

        const isLeader = userRole.rows[0]?.role === 'leader';
        const isCreator = created_by === userId;

        if (!isLeader && !isCreator) {
            return res.status(403).json({ error: 'Sadece lider veya kaydı açan kişi başka bir kullanıcıyı kayıttan çıkarabilir' });
        }

        await client.query('BEGIN');

        // 1. Drop kontrolü yap (gerçek drop var mı?)
        const dropsResult = await client.query(
            `SELECT i.name
             FROM clan_boss_drops d
             JOIN items i ON d.item_id = i.id
             WHERE d.run_id = $1`,
            [runId]
        );

        const hasRealDrops = dropsResult.rows.some(d => {
            const dName = d.name ? d.name.toLowerCase() : '';
            return dName && !dName.includes('silver bar') && !dName.includes('gold bar') && !dName.includes('golden bar');
        });

        const pointsToReverse = hasRealDrops ? 12 : 10;

        // 2. Puanı geri al
        await client.query(
            `UPDATE clan_members
             SET participation_score = participation_score - $1
             WHERE clan_id = $2 AND user_id = $3`,
            [pointsToReverse, clan_id, participantUserId]
        );

        // 3. Katılımcıyı sil
        await client.query(
            'DELETE FROM clan_boss_participants WHERE run_id = $1 AND user_id = $2',
            [runId, participantUserId]
        );

        await client.query('COMMIT');

        // Durumu kontrol et (async)
        checkAndCloseRun(runId);

        res.status(200).json({ message: 'Katılımcı kayıttan çıkarıldı ve klan puanı güncellendi' });

        // SOCKET.IO: Katılımcı değişikliği bildir
        socketManager.sendToClan(clan_id, 'CLAN_BOSS_RUN_UPDATED', { runId, action: 'participant_removed' });
        // Çıkarılan kullanıcıyı uyar (Bildirim/Puan değişti)
        socketManager.sendToUser(participantUserId, 'USER_DATA_UPDATED');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Katılımcı kayıttan çıkarma hatası:', error);
        res.status(500).json({ error: 'Çıkarma işlemi başarısız' });
    } finally {
        client.release();
    }
};

const deleteClanBossRun = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user?.uid;
        const { id } = req.params;

        // 1. Yetki kontrolü - Run bilgilerini ve clan_id'yi al
        const runCheck = await pool.query(
            'SELECT clan_id, created_by FROM clan_boss_runs WHERE id = $1',
            [id]
        );

        if (runCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Kayıt bulunamadı' });
        }

        const { clan_id, created_by } = runCheck.rows[0];

        if (created_by !== userId) {
            return res.status(403).json({
                error: 'Sadece kaydı oluşturan kişi bu kaydı silebilir'
            });
        }

        await client.query('BEGIN');

        // 0. FK KISITI TEMİZLİĞİ: Silinecek run'a bağlı işlemleri NULL'a çek (500 hatasını önlemek için)
        await client.query(
            'UPDATE clan_bank_transactions SET related_run_id = NULL WHERE related_run_id = $1',
            [id]
        );

        // 2. ÖDEME KONTROLÜ - Eğer ödeme varsa silmeyi engelle
        const paymentsCheck = await client.query(
            'SELECT COUNT(*) as payment_count, SUM(amount) as total_paid FROM clan_payments WHERE run_id = $1',
            [id]
        );

        const paymentCount = parseInt(paymentsCheck.rows[0]?.payment_count || 0);
        const totalPaid = parseFloat(paymentsCheck.rows[0]?.total_paid || 0);

        if (paymentCount > 0) {
            await client.query('ROLLBACK');
            const formattedPaid = new Intl.NumberFormat('tr-TR').format(totalPaid);
            return res.status(400).json({
                error: 'Bu kaydı silmeden önce tüm ödemeleri iptal etmelisiniz',
                details: `${paymentCount} ödeme mevcut (Toplam: ${formattedPaid} G)`,
                payment_count: paymentCount,
                total_paid: totalPaid
            });
        }

        // 3. SATILAN İTEMLERİN TUTARINI HESAPLA (Barlar + Diğer Droplar)
        const soldItemsResult = await client.query(
            'SELECT SUM(sale_amount) as total_sold FROM clan_bank_sold WHERE run_id = $1',
            [id]
        );

        const totalSoldAmount = parseFloat(soldItemsResult.rows[0]?.total_sold || 0);

        // 4. BAKİYEDEN SATILAN TUTARLARI DÜŞ
        if (totalSoldAmount > 0) {
            console.log(`💸 [RUN DELETE] Reversing sold items balance: -${totalSoldAmount.toLocaleString()}`);

            // Bakiyeden düş (Negatif bakiye kontrolü ile)
            await client.query(
                'UPDATE clan_balances SET balance = GREATEST(0, balance - $1), updated_at = CURRENT_TIMESTAMP WHERE clan_id = $2',
                [totalSoldAmount, clan_id]
            );

            // İşlem logu ekle
            const formattedAmount = new Intl.NumberFormat('tr-TR').format(totalSoldAmount);
            await client.query(
                `INSERT INTO clan_bank_transactions (clan_id, user_id, amount, transaction_type, description, related_run_id)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [clan_id, userId, -totalSoldAmount, 'run_deleted', `Run silindi - satış tutarı geri alındı (-${formattedAmount})`, id]
            );

            console.log(`  ✓ Balance reversed: -${totalSoldAmount.toLocaleString()}`);
            console.log(`  ✓ Transaction logged`);
        }

        // 5. SATILAN İTEMLERİ SİL (clan_bank_sold)
        await client.query('DELETE FROM clan_bank_sold WHERE run_id = $1', [id]);
        console.log(`  ✓ Deleted sold items records`);

        // 6. DİĞER KAYITLARI SİL
        // Önce puanları geri al
        const participantsResult = await client.query(
            'SELECT user_id FROM clan_boss_participants WHERE run_id = $1',
            [id]
        );

        // Skor hesaplaması için dropları kontrol et
        const dropsResult = await client.query(
            `SELECT i.name as item_name
             FROM clan_boss_drops d
             JOIN items i ON d.item_id = i.id
             WHERE d.run_id = $1`,
            [id]
        );

        const hasRealDrops = dropsResult.rows.some(d => {
            const dName = d.item_name ? d.item_name.toLowerCase() : '';
            return dName && !dName.includes('silver bar') && !dName.includes('gold bar') && !dName.includes('golden bar');
        });

        const pointsToReverse = hasRealDrops ? 12 : 10;

        for (const p of participantsResult.rows) {
            await client.query(
                `UPDATE clan_members
                 SET participation_score = GREATEST(0, participation_score - $1)
                 WHERE clan_id = $2 AND user_id = $3`,
                [pointsToReverse, clan_id, p.user_id]
            );
        }
        console.log(`  ✓ Reversed ${pointsToReverse} points from ${participantsResult.rows.length} participants`);

        await client.query('DELETE FROM clan_boss_participants WHERE run_id = $1', [id]);
        console.log(`  ✓ Deleted participants`);

        await client.query('DELETE FROM clan_boss_drops WHERE run_id = $1', [id]);
        console.log(`  ✓ Deleted drops`);

        await client.query('DELETE FROM clan_bank_items WHERE run_id = $1', [id]);
        console.log(`  ✓ Deleted bank items`);

        // 7. RUN'I SİL
        await client.query('DELETE FROM clan_boss_runs WHERE id = $1', [id]);
        console.log(`  ✓ Deleted run record`);

        await client.query('COMMIT');

        console.log(`✅ [RUN DELETE] Run deleted successfully. Total balance reversed: -${totalSoldAmount.toLocaleString()}`);

        res.status(200).json({
            message: 'Boss kaydı başarıyla silindi',
            balance_reversed: totalSoldAmount,
            formatted_balance: new Intl.NumberFormat('tr-TR').format(totalSoldAmount)
        });

        // SOCKET.IO: Silme bildir
        socketManager.sendToClan(clan_id, 'CLAN_BOSS_RUN_UPDATED', { runId: id, action: 'delete' });
        socketManager.sendToClan(clan_id, 'CLAN_BANK_UPDATED', { action: 'run_deleted' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Kayıt silme hatası:', error);
        res.status(500).json({ error: 'Silme işlemi başarısız', details: error.message });
    } finally {
        client.release();
    }
};

// Run'ın kapanma durumunu kontrol et ve güncelle
const checkAndCloseRun = async (runId, client = pool) => {
    try {
        console.log(`🔍 [ARCHIVE] Checking status for Run: ${runId}`);

        // 1. Satılmamış drop var mı kontrolü (clan_bank_items)
        const unsoldResult = await client.query(
            'SELECT COUNT(*) FROM clan_bank_items WHERE run_id = $1 AND status = \'available\'',
            [runId]
        );
        const unsoldCount = parseInt(unsoldResult.rows[0].count);

        if (unsoldCount > 0) {
            // Eğer hala satılmamış item varsa KESİNLİKLE kapanamaz
            await client.query('UPDATE clan_boss_runs SET status = $1 WHERE id = $2', ['open', runId]);
            console.log(`✅ [ARCHIVE] Run ${runId} is kept OPEN (Unsold: ${unsoldCount})`);
            return false;
        }

        // 2. Herkes tam olarak ödemesini aldı mı? (Dinamik Hesaplama)
        const revenueResult = await client.query(`
            SELECT
                (SELECT COALESCE(SUM(sale_amount), 0) FROM clan_bank_sold WHERE run_id = $1) as total_sold,
                (SELECT COALESCE(SUM(ABS(amount)), 0) FROM clan_bank_transactions WHERE related_run_id = $1 AND transaction_type IN ('debt_payment', 'tax_transfer')) as total_treasury
        `, [runId]);

        const totalSold = parseFloat(revenueResult.rows[0].total_sold);
        const totalTreasury = parseFloat(revenueResult.rows[0].total_treasury);
        const netRevenue = Math.max(0, totalSold - totalTreasury);

        const participantsResult = await client.query(`
            SELECT user_id, is_paid,
                (SELECT COALESCE(SUM(amount), 0) FROM clan_payments WHERE run_id = $1 AND user_id = clan_boss_participants.user_id) as paid_amount
            FROM clan_boss_participants
            WHERE run_id = $1 AND left_at IS NULL
        `, [runId]);

        const participantCount = participantsResult.rows.length || 1;
        const liquidShare = Math.floor(netRevenue / participantCount);

        let hasUnpaid = false;

        for (const p of participantsResult.rows) {
            const paidAmount = parseFloat(p.paid_amount);
            const remaining = Math.max(0, liquidShare - paidAmount);

            const isFullyPaid = (remaining <= 0) && (unsoldCount === 0);

            if (p.is_paid !== isFullyPaid) {
                await client.query(
                    'UPDATE clan_boss_participants SET is_paid = $1 WHERE run_id = $2 AND user_id = $3',
                    [isFullyPaid, runId, p.user_id]
                );
            }

            if (remaining > 0) {
                hasUnpaid = true;
            }
        }

        const isClosed = (unsoldCount === 0 && !hasUnpaid);
        const newStatus = isClosed ? 'closed' : 'open';

        await client.query(
            'UPDATE clan_boss_runs SET status = $1 WHERE id = $2',
            [newStatus, runId]
        );

        console.log(`✅ [ARCHIVE] Run ${runId} is now ${newStatus.toUpperCase()}`);
        return isClosed;
    } catch (error) {
        console.error(`❌ [ARCHIVE] Error checking run status:`, error);
        return false;
    }
};

module.exports = {
    createClanBossRun,
    getClanBossRuns,
    getClanBossRunDetails,
    bulkUpdateAllPaymentStatus,
    updateParticipantPayStatus,
    removeSelfFromRun,
    removeParticipantFromRun,
    deleteClanBossRun,
    getClanMembersWithNicknames,
    checkAndCloseRun
};
