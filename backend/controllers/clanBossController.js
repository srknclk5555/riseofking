const pool = require('../config/database');
const NotificationService = require('../services/notificationService');

// Clan boss run oluşturma
const createClanBossRun = async (req, res) => {
    try {
        const userId = req.user?.uid;
        const { clanId, runDate, participants, drops } = req.body;

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
                `INSERT INTO clan_boss_runs (id, clan_id, boss_name, run_date, created_by) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING id, boss_name, run_date, created_at`,
                [runId, clanId, 'Shallow Fever', runDate, userId]
            );

            // 1. Oluşturan kullanıcıyı otomatik katılımcı olarak ekle
            const creatorResult = await client.query(
                'SELECT "mainCharacter" FROM users WHERE uid = $1',
                [userId]
            );
            const creatorMainChar = creatorResult.rows[0]?.mainCharacter || 'Bilinmeyen';

            await client.query(
                `INSERT INTO clan_boss_participants (run_id, user_id, main_character, is_paid) 
                 VALUES ($1, $2, $3, false)`,
                [runId, userId, creatorMainChar]
            );

            // 2. Diğer katılımcıları ekle (Sadece klan üyesi olanlar)
            if (participants && Array.isArray(participants)) {
                for (const pUid of participants) {
                    if (pUid !== userId) { // Kendini zaten ekledik
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

                            // SKORLAMA: +10 Puan (Katılım) + 2 Puan (Drop varsa)
                            // Not: Silver/Gold bar drop sayılmaz
                            const hasRealDrops = drops && drops.some(d => {
                                const dName = d.itemName ? d.itemName.toLowerCase() : '';
                                return dName && !dName.includes('silver bar') && !dName.includes('gold bar') && !dName.includes('golden bar');
                            });

                            const pointsEarned = hasRealDrops ? 12 : 10;

                            await client.query(
                                `UPDATE clan_members 
                                 SET participation_score = participation_score + $1 
                                 WHERE clan_id = $2 AND user_id = $3`,
                                [pointsEarned, clanId, pUid]
                            );
                        }
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

            // Try multiple name variations (Gold Bar, Golden Bar, etc.)
            const silverBarResult = await client.query(`
                SELECT id, name FROM items 
                WHERE LOWER(TRIM(name)) IN ('silver bar', 'silverbar', 'silver_bar')
                LIMIT 1
            `);

            const goldBarResult = await client.query(`
                SELECT id, name FROM items 
                WHERE LOWER(TRIM(name)) IN ('gold bar', 'golden bar', 'goldbar', 'goldenbar', 'gold_bar', 'golden_bar')
                LIMIT 1
            `);

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
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [clanId, userId, barData.amount, 'item_sold', `${barData.item.name} otomatik nakite çevrildi (+${formattedAmount})`, runId]
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
            `SELECT p.*, u.username, u."mainCharacter" as main_character
             FROM clan_boss_participants p
             JOIN users u ON p.user_id = u.uid
             WHERE p.run_id = $1 AND p.left_at IS NULL
             ORDER BY p.joined_at`,
            [id]
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

        const runsResult = await pool.query(
            `SELECT r.id, r.clan_id, r.boss_name, r.run_date, r.created_at, r.created_by,
                    u.username as creator_username, u."mainCharacter" as creator_main_character,
                    (SELECT COUNT(*) FROM clan_boss_participants p WHERE p.run_id::text = r.id::text AND p.left_at IS NULL) as participant_count,
                    (SELECT COUNT(*) FROM clan_boss_drops d WHERE d.run_id::text = r.id::text) as drop_count,
                    (SELECT COUNT(*) FROM clan_boss_participants p WHERE p.run_id::text = r.id::text AND p.is_paid = true AND p.left_at IS NULL) as paid_count,
                    (SELECT COALESCE(SUM(sale_amount), 0) FROM clan_bank_sold s WHERE s.run_id::text = r.id::text) as total_sold_amount,
                    (SELECT COALESCE(SUM(amount), 0) FROM clan_payments cp WHERE cp.run_id::text = r.id::text) as total_paid_amount,
                    (
                        SELECT json_agg(json_build_object('item_name', i.name, 'quantity', dr.quantity))
                        FROM clan_boss_drops dr
                        JOIN items i ON dr.item_id = i.id
                        WHERE dr.run_id::text = r.id::text
                    ) as drops
             FROM clan_boss_runs r
             JOIN users u ON r.created_by = u.uid
             WHERE r.clan_id = $1
             ORDER BY r.run_date DESC, r.created_at DESC`,
            [clanId]
        );

        // Katılımcıları her run için ayrı ayrı ekleyelim (Karmaşık SQL hatasını önlemek için)
        const runs = [];
        for (const run of runsResult.rows) {
            const participantsRes = await pool.query(`
                SELECT p.user_id, u.username, p.main_character,
                       (SELECT COALESCE(SUM(amount), 0) FROM clan_payments cp WHERE cp.run_id::text = $1 AND cp.user_id = p.user_id) as paid_amount
                FROM clan_boss_participants p
                JOIN users u ON p.user_id = u.uid
                WHERE p.run_id::text = $1 AND p.left_at IS NULL
                ORDER BY u.username ASC
            `, [run.id]);

            runs.push({
                ...run,
                participants: participantsRes.rows
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

        // Katılımcı durumunu güncelle
        await client.query(
            'UPDATE clan_boss_participants SET is_paid = $1 WHERE run_id = $2 AND user_id = $3',
            [isPaid, runId, participantUserId]
        );

        await client.query('COMMIT');

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
    try {
        const userId = req.user?.uid;
        const { runId } = req.params;

        await pool.query(
            'DELETE FROM clan_boss_participants WHERE run_id = $1 AND user_id = $2',
            [runId, userId]
        );

        res.status(200).json({ message: 'Kayıttan ayrıldınız' });
    } catch (error) {
        console.error('❌ Kayıttan ayrılma hatası:', error);
        res.status(500).json({ error: 'Ayrılma işlemi başarısız' });
    }
};

// Kayıttan başka bir kullanıcıyı çıkar (sadece lider veya oluşturucu)
const removeParticipantFromRun = async (req, res) => {
    try {
        const userId = req.user?.uid;
        const { runId, participantUserId } = req.params;

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
            return res.status(403).json({ error: 'Sadece lider veya kaydı açan kişi başka bir kullanıcıyı kayıttan çıkarabilir' });
        }

        await pool.query(
            'DELETE FROM clan_boss_participants WHERE run_id = $1 AND user_id = $2',
            [runId, participantUserId]
        );

        res.status(200).json({ message: 'Katılımcı kayıttan çıkarıldı' });
    } catch (error) {
        console.error('❌ Katılımcı kayıttan çıkarma hatası:', error);
        res.status(500).json({ error: 'Çıkarma işlemi başarısız' });
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

            // Bakiyeden düş
            await client.query(
                'UPDATE clan_balances SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE clan_id = $2',
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
                 SET participation_score = participation_score - $1 
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

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Kayıt silme hatası:', error);
        res.status(500).json({ error: 'Silme işlemi başarısız', details: error.message });
    } finally {
        client.release();
    }
};

module.exports = {
    createClanBossRun,
    getClanBossRuns,
    getClanBossRunDetails,
    updateParticipantPayStatus,
    removeSelfFromRun,
    removeParticipantFromRun,
    deleteClanBossRun,
    getClanMembersWithNicknames
};
