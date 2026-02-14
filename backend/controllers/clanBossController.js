const pool = require('../config/database');

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
                        }
                    }
                }
            }

            // 3. Dropları ekle
            if (drops && Array.isArray(drops)) {
                for (const drop of drops) {
                    if (drop.itemId && drop.quantity) {
                        await client.query(
                            `INSERT INTO clan_boss_drops (run_id, item_id, quantity, added_by) 
                             VALUES ($1, $2, $3, $4)`,
                            [runId, drop.itemId, drop.quantity, userId]
                        );
                    }
                }
            }

            await client.query('COMMIT');
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

// Clan üyelerini nickname ile birlikte getir
const getClanMembersWithNicknames = async (req, res) => {
    try {
        const userId = req.user?.uid;
        const { clanId } = req.params;

        console.log('[DEBUG] getClanMembersWithNicknames - Requesting user ID:', userId);

        if (!userId || !clanId) return res.status(400).json({ error: 'Eksik bilgi' });

        // Kullanıcı klan üyesi mi?
        const memberCheck = await pool.query(
            'SELECT 1 FROM clan_members WHERE clan_id = $1 AND user_id = $2',
            [clanId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Sadece klan üyeleri klan üyelerini görebilir' });
        }

        // Klan üyelerini getir
        const membersResult = await pool.query(`
            SELECT 
                u.uid as user_id,
                cm.role,
                cm.joined_at,
                u."mainCharacter" as display_name,
                u.username
            FROM clan_members cm
            LEFT JOIN users u ON cm.user_id = u.uid
            WHERE cm.clan_id = $1
            ORDER BY cm.joined_at ASC
        `, [clanId]);

        // Kullanıcının diğer oyuncuları (nickname bilgileri) için
        const userResult = await pool.query(
            'SELECT other_players FROM users WHERE uid = $1',
            [userId]
        );

        const otherPlayers = userResult.rows[0]?.other_players || {};
        console.log('[DEBUG] getClanMembersWithNicknames - User other_players:', JSON.stringify(otherPlayers, null, 2));

        const nicknames = {};

        // Nickname bilgilerini çıkar
        for (const [key, friendData] of Object.entries(otherPlayers)) {
            if (friendData && friendData.uid && friendData.nickname) {
                nicknames[friendData.uid] = friendData.nickname;
            }
        }

        console.log('[DEBUG] getClanMembersWithNicknames - Extracted nicknames:', nicknames);

        // Her klan üyesi için nickname bilgisini ekle
        const membersWithNicknames = membersResult.rows.map(member => ({
            ...member,
            nickname: nicknames[member.user_id] || member.username
        }));

        console.log('[DEBUG] getClanMembersWithNicknames - Final members with nicknames:', membersWithNicknames);

        res.status(200).json(membersWithNicknames);
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

        // Add nickname information to participants
        const participantsWithNicknames = participantsResult.rows.map(participant => ({
            ...participant,
            nickname: participantNicknames[participant.user_id] || participant.username
        }));

        // Dropları getir
        const dropsResult = await pool.query(
            `SELECT d.*, i.name as item_name
             FROM clan_boss_drops d
             JOIN items i ON d.item_id = i.id
             WHERE d.run_id = $1
             ORDER BY d.added_at DESC`,
            [id]
        );

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
            drops: dropsResult.rows
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
                    COUNT(DISTINCT p.id) as participant_count,
                    COUNT(DISTINCT d.id) as drop_count,
                    COUNT(CASE WHEN p.is_paid = true THEN 1 END) as paid_count
             FROM clan_boss_runs r
             JOIN users u ON r.created_by = u.uid
             LEFT JOIN clan_boss_participants p ON r.id = p.run_id AND p.left_at IS NULL
             LEFT JOIN clan_boss_drops d ON r.id = d.run_id
             WHERE r.clan_id = $1
             GROUP BY r.id, u.uid, u.username, u."mainCharacter"
             ORDER BY r.run_date DESC, r.created_at DESC`,
            [clanId]
        );

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
        const runsWithNicknames = runsResult.rows.map(run => ({
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

        await pool.query(
            'UPDATE clan_boss_participants SET is_paid = $1 WHERE run_id = $2 AND user_id = $3',
            [isPaid, runId, participantUserId]
        );

        res.status(200).json({ message: 'Ödeme durumu güncellendi' });
    } catch (error) {
        console.error('❌ Ödeme güncelleme hatası:', error);
        res.status(500).json({ error: 'İşlem başarısız' });
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

// Kaydı tamamen sil (Sadece oluşturan kişi)
const deleteClanBossRun = async (req, res) => {
    try {
        const userId = req.user?.uid;
        const { id } = req.params;

        const runCheck = await pool.query('SELECT created_by FROM clan_boss_runs WHERE id = $1', [id]);
        if (runCheck.rows.length === 0) return res.status(404).json({ error: 'Kayıt bulunamadı' });

        if (runCheck.rows[0].created_by !== userId) {
            return res.status(403).json({ error: 'Sadece kaydı oluşturan kişi bu kaydı silebilir' });
        }

        await pool.query('DELETE FROM clan_boss_runs WHERE id = $1', [id]);
        res.status(200).json({ message: 'Boss kaydı başarıyla silindi' });
    } catch (error) {
        console.error('❌ Kayıt silme hatası:', error);
        res.status(500).json({ error: 'Silme işlemi başarısız' });
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
