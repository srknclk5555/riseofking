const pool = require('../config/database');

// Database'deki gerçek sütun listesi (PostgreSQL şemasına göre)
const ALLOWED_COLUMNS = [
  'itemtype', 'name', 'rarity', 'class', 'level', 'gearscore',
  'physicaldefensebonus', 'strengthbonus', 'dexteritybonus', 'intelligencebonus',
  'magicbonus', 'healthbonus', 'hpbonus', 'mpbonus',
  'fireresistance', 'iceresistance', 'lightningresistance', 'poisonresistance',
  'holyresistance', 'darkresistance',
  'daggerdefense', 'sworddefense', 'macedefense', 'axedefense', 'speardefense', 'bowdefense',
  'expbonuspercent', 'coinbonuspercent', 'allmonsterattackbonuspercent',
  'firedamage', 'icedamage', 'lightningdamage', 'bpperkillbonus'
];

// İngilizce/Türkçe alan adlarını database sütunlarına çevir
function normalizeItemBody(body) {
  const out = { ...body };
  
  // Name - item_adi veya name
  if (out.item_adi !== undefined && out.name === undefined) out.name = out.item_adi;
  
  // Rarity - item_turu veya rarity
  if (out.item_turu !== undefined && out.rarity === undefined) out.rarity = out.item_turu;
  
  // Level - seviye veya level
  if (out.seviye !== undefined && out.level === undefined) out.level = out.seviye;
  
  // Class - sinif veya class
  if (out.sinif !== undefined && out.class === undefined) out.class = out.sinif;
  
  // Item Type - item_cesidi veya itemtype
  if (out.item_cesidi !== undefined && out.itemtype === undefined) out.itemtype = out.item_cesidi;
  
  // Gearscore - gear_score
  if (out.gear_score !== undefined && out.gearscore === undefined) out.gearscore = out.gear_score;
  
  // Defense Bonuses
  if (out.fiziksel_savunma_bonusu !== undefined && out.physicaldefensebonus === undefined) out.physicaldefensebonus = out.fiziksel_savunma_bonusu;
  if (out.strength_bonus !== undefined && out.strengthbonus === undefined) out.strengthbonus = out.strength_bonus;
  if (out.dexterity_bonus !== undefined && out.dexteritybonus === undefined) out.dexteritybonus = out.dexterity_bonus;
  if (out.intelligence_bonus !== undefined && out.intelligencebonus === undefined) out.intelligencebonus = out.intelligence_bonus;
  if (out.magic_bonus !== undefined && out.magicbonus === undefined) out.magicbonus = out.magic_bonus;
  if (out.health_bonus !== undefined && out.healthbonus === undefined) out.healthbonus = out.health_bonus;
  if (out.hp_bonusu !== undefined && out.hpbonus === undefined) out.hpbonus = out.hp_bonusu;
  if (out.mp_bonusu !== undefined && out.mpbonus === undefined) out.mpbonus = out.mp_bonusu;
  
  // Resistances
  if (out.ates_hasari_direnci !== undefined && out.fireresistance === undefined) out.fireresistance = out.ates_hasari_direnci;
  if (out.buz_hasari_direnci !== undefined && out.iceresistance === undefined) out.iceresistance = out.buz_hasari_direnci;
  if (out.yildirim_hasari_direnci !== undefined && out.lightningresistance === undefined) out.lightningresistance = out.yildirim_hasari_direnci;
  if (out.zehir_hasari_direnci !== undefined && out.poisonresistance === undefined) out.poisonresistance = out.zehir_hasari_direnci;
  if (out.kutsal_hasari_direnci !== undefined && out.holyresistance === undefined) out.holyresistance = out.kutsal_hasari_direnci;
  if (out.lanet_hasari_direnci !== undefined && out.darkresistance === undefined) out.darkresistance = out.lanet_hasari_direnci;
  
  // Defenses
  if (out.hancer_savunmasi !== undefined && out.daggerdefense === undefined) out.daggerdefense = out.hancer_savunmasi;
  if (out.kilic_savunmasi !== undefined && out.sworddefense === undefined) out.sworddefense = out.kilic_savunmasi;
  if (out.topuz_savunmasi !== undefined && out.macedefense === undefined) out.macedefense = out.topuz_savunmasi;
  if (out.balta_savunmasi !== undefined && out.axedefense === undefined) out.axedefense = out.balta_savunmasi;
  if (out.mizrak_savunmasi !== undefined && out.speardefense === undefined) out.speardefense = out.mizrak_savunmasi;
  if (out.yay_savunmasi !== undefined && out.bowdefense === undefined) out.bowdefense = out.yay_savunmasi;
  
  // Bonuses
  if (out.exp_bonusu !== undefined && out.expbonuspercent === undefined) out.expbonuspercent = out.exp_bonusu;
  if (out.coin_bonusu !== undefined && out.coinbonuspercent === undefined) out.coinbonuspercent = out.coin_bonusu;
  if (out.tum_yaratiklara_karsi_saldiri_bonusu !== undefined && out.allmonsterattackbonuspercent === undefined) out.allmonsterattackbonuspercent = out.tum_yaratiklara_karsi_saldiri_bonusu;
  
  // Damages
  if (out.ates_hasari !== undefined && out.firedamage === undefined) out.firedamage = out.ates_hasari;
  if (out.buz_hasari !== undefined && out.icedamage === undefined) out.icedamage = out.buz_hasari;
  if (out.yildirim_hasari !== undefined && out.lightningdamage === undefined) out.lightningdamage = out.yildirim_hasari;
  if (out.oldurme_basina_bp_bonusu !== undefined && out.bpperkillbonus === undefined) out.bpperkillbonus = out.oldurme_basina_bp_bonusu;
  
  return out;
}

// Tüm item'ları getir (name sütununa göre sırala)
const getAllItems = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items ORDER BY name ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Item getirme hatası:', error);
    res.status(500).json({ error: 'Itemlar getirilemedi' });
  }
};

// Belirli bir item'ı ID ile getir
const getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM items WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item bulunamadı' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Item getirme hatası:', error);
    res.status(500).json({ error: 'Item getirilemedi' });
  }
};

// Yeni item ekle (Excel/frontend Türkçe sütunları + eski name/rarity/level uyumluluğu)
const createItem = async (req, res) => {
  try {
    const body = normalizeItemBody(req.body);
    if (!body.name) {
      return res.status(400).json({ error: 'Item adı (name) gerekli' });
    }

    const cols = [];
    const vals = [];
    let idx = 1;
    for (const col of ALLOWED_COLUMNS) {
      if (body[col] !== undefined && body[col] !== null && body[col] !== '') {
        cols.push(col);
        vals.push(body[col]);
        idx++;
      }
    }
    if (cols.length === 0) {
      return res.status(400).json({ error: 'En az bir alan gerekli' });
    }

    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO items (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(sql, vals);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Item ekleme hatası:', error);
    res.status(500).json({ error: 'Item eklenemedi', detail: error.message });
  }
};

// Item güncelle (aynı whitelist ile)
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const body = normalizeItemBody(req.body);

    const sets = [];
    const vals = [];
    let idx = 1;
    for (const col of ALLOWED_COLUMNS) {
      if (body[col] !== undefined && body[col] !== null && body[col] !== '') {
        sets.push(`${col}=$${idx}`);
        vals.push(body[col]);
        idx++;
      }
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: 'Güncellenecek alan gerekli' });
    }
    vals.push(id);
    const sql = `UPDATE items SET ${sets.join(', ')} WHERE id=$${idx} RETURNING *`;
    const result = await pool.query(sql, vals);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item bulunamadı' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Item güncelleme hatası:', error);
    res.status(500).json({ error: 'Item güncellenemedi', detail: error.message });
  }
};

// Item sil
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item bulunamadı' });
    }
    res.status(200).json({ message: 'Item başarıyla silindi' });
  } catch (error) {
    console.error('Item silme hatası:', error);
    res.status(500).json({ error: 'Item silinemedi' });
  }
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
};
