import React, { useState, useEffect } from 'react';
import { 
  Edit3, Trash2
} from 'lucide-react';
import { 
  itemService, locationService, mobService
} from './services/api';
import * as XLSX from 'xlsx';

// Konum verilerini dışa aktar
let exportedLocations = [];
let exportedItems = [];
let exportedMobs = [];

// Statik veriler için cache
const CACHE_KEY_PREFIX = 'system_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 saat

const getFromCache = (key) => {
  try {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_DURATION) {
        return parsed.data;
      }
    }
  } catch (error) {
    console.warn('Cache okuma hatası:', error);
  }
  return null;
};

const setToCache = (key, data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Cache yazma hatası:', error);
  }
};

const clearCache = (key) => {
  try {
    localStorage.removeItem(CACHE_KEY_PREFIX + key);
  } catch (error) {
    console.warn('Cache temizleme hatası:', error);
  }
};

// Excel şablonu ve import için tek kaynak: sütun sırası, başlık adı, DB alanı, tip
const ITEM_EXCEL_SCHEMA = [
  { header: 'İtem Çeşidi', dbKey: 'item_cesidi', type: 'string' },
  { header: 'İtem Adı', dbKey: 'item_adi', type: 'string' },
  { header: 'İtem Türü (Rarity)', dbKey: 'item_turu', type: 'string' },
  { header: 'Sınıf (Class)', dbKey: 'sinif', type: 'string' },
  { header: 'Seviye', dbKey: 'seviye', type: 'int' },
  { header: 'Gear Score', dbKey: 'gear_score', type: 'int' },
  { header: 'Fiziksel Savunma Bonusu', dbKey: 'fiziksel_savunma_bonusu', type: 'int' },
  { header: 'Strength Bonus (Kuvvet Bonusu)', dbKey: 'strength_bonus', type: 'int' },
  { header: 'Dexterity Bonus (Çeviklik Bonusu)', dbKey: 'dexterity_bonus', type: 'int' },
  { header: 'Intelligence Bonus', dbKey: 'intelligence_bonus', type: 'int' },
  { header: 'Magic Bonus', dbKey: 'magic_bonus', type: 'int' },
  { header: 'Health Bonus (Sağlık Bonusu)', dbKey: 'health_bonus', type: 'int' },
  { header: 'HP Bonusu', dbKey: 'hp_bonusu', type: 'int' },
  { header: 'MP Bonusu', dbKey: 'mp_bonusu', type: 'int' },
  { header: 'Ateş Hasarı Direnci', dbKey: 'ates_hasari_direnci', type: 'int' },
  { header: 'Buz Hasarı Direnci', dbKey: 'buz_hasari_direnci', type: 'int' },
  { header: 'Yıldırım Hasarı Direnci', dbKey: 'yildirim_hasari_direnci', type: 'int' },
  { header: 'Zehir Hasarı Direnci', dbKey: 'zehir_hasari_direnci', type: 'int' },
  { header: 'Kutsal Hasarı Direnci', dbKey: 'kutsal_hasari_direnci', type: 'int' },
  { header: 'Lanet Hasarı Direnci', dbKey: 'lanet_hasari_direnci', type: 'int' },
  { header: 'Hançer Savunması', dbKey: 'hancer_savunmasi', type: 'int' },
  { header: 'Kılıç Savunması', dbKey: 'kilic_savunmasi', type: 'int' },
  { header: 'Topuz Savunması', dbKey: 'topuz_savunmasi', type: 'int' },
  { header: 'Balta Savunması', dbKey: 'balta_savunmasi', type: 'int' },
  { header: 'Mızrak Savunması', dbKey: 'mizrak_savunmasi', type: 'int' },
  { header: 'Yay Savunması', dbKey: 'yay_savunmasi', type: 'int' },
  { header: 'EXP Bonusu (%)', dbKey: 'exp_bonusu', type: 'float' },
  { header: 'Coin Bonusu (%)', dbKey: 'coin_bonusu', type: 'float' },
  { header: 'Tüm Yaratıklara Karşı Saldırı Bonusu (%)', dbKey: 'tum_yaratiklara_karsi_saldiri_bonusu', type: 'float' },
  { header: 'Ateş Hasarı', dbKey: 'ates_hasari', type: 'int' },
  { header: 'Buz Hasarı', dbKey: 'buz_hasari', type: 'int' },
  { header: 'Yıldırım Hasarı', dbKey: 'yildirim_hasari', type: 'int' },
  { header: 'Öldürme Başına BP Bonusu', dbKey: 'oldurme_basina_bp_bonusu', type: 'int' }
];

const parseExcelValue = (val, type) => {
  if (val === undefined || val === null || val === '') return null;
  const s = String(val).trim();
  if (s === '') return null;
  if (type === 'string') return s;
  if (type === 'int') {
    const n = parseInt(s, 10);
    return isNaN(n) ? null : n;
  }
  if (type === 'float') {
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }
  return s;
};

const SystemPage = ({ userData, uid, showNotification, checkRateLimit }) => {
  // Admin kontrolü artık Firestore Security Rules ile sağlanmaktadır
  
  const [activeTab, setActiveTab] = useState("Locations");
  
  // Konum state'leri
  const [locationName, setLocationName] = useState("");
  const [locationDescription, setLocationDescription] = useState("");
  const [locations, setLocations] = useState([]);
  const [editingLocationId, setEditingLocationId] = useState(null);
  
  // İtem state'leri
  const [itemName, setItemName] = useState("");
  const [items, setItems] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);
  
  // Filtreleme state'leri
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterRarity, setFilterRarity] = useState("");
  const [filterItemType, setFilterItemType] = useState("");
  
  // Yeni item özellikleri
  const [itemType, setItemType] = useState(""); // İtem Çeşidi
  const [itemRarity, setItemRarity] = useState(""); // İtem Türü (Rarity)
  const [itemClass, setItemClass] = useState(""); // Sınıf (Class)
  const [itemLevel, setItemLevel] = useState(""); // Seviye
  const [gearScore, setGearScore] = useState(""); // Gear Score
  const [physicalDefenseBonus, setPhysicalDefenseBonus] = useState(""); // Fiziksel Savunma Bonusu
  const [strengthBonus, setStrengthBonus] = useState(""); // Strength Bonus (Kuvvet Bonusu)
  const [dexterityBonus, setDexterityBonus] = useState(""); // Dexterity Bonus (Çeviklik Bonusu)
  const [intelligenceBonus, setIntelligenceBonus] = useState(""); // Intelligence Bonus
  const [magicBonus, setMagicBonus] = useState(""); // Magic Bonus
  const [healthBonus, setHealthBonus] = useState(""); // Health Bonus (Sağlık Bonusu)
  const [hpBonus, setHpBonus] = useState(""); // HP Bonusu
  const [mpBonus, setMpBonus] = useState(""); // MP Bonusu
  const [fireResistance, setFireResistance] = useState(""); // Ateş Hasarı Direnci
  const [iceResistance, setIceResistance] = useState(""); // Buz Hasarı Direnci
  const [lightningResistance, setLightningResistance] = useState(""); // Yıldırım Hasarı Direnci
  const [poisonResistance, setPoisonResistance] = useState(""); // Zehir Hasarı Direnci
  const [holyResistance, setHolyResistance] = useState(""); // Kutsal Hasarı Direnci
  const [curseResistance, setCurseResistance] = useState(""); // Lanet Hasarı Direnci
  const [daggerDefense, setDaggerDefense] = useState(""); // Hançer Savunması
  const [swordDefense, setSwordDefense] = useState(""); // Kılıç Savunması
  const [maceDefense, setMaceDefense] = useState(""); // Topuz Savunması
  const [axeDefense, setAxeDefense] = useState(""); // Balta Savunması
  const [spearDefense, setSpearDefense] = useState(""); // Mızrak Savunması
  const [bowDefense, setBowDefense] = useState(""); // Yay Savunması
  const [expBonus, setExpBonus] = useState(""); // EXP Bonusu (%)
  const [coinBonus, setCoinBonus] = useState(""); // Coin Bonusu (%)
  const [attackBonusAllMobs, setAttackBonusAllMobs] = useState(""); // Tüm Yaratıklara Karşı Saldırı Bonusu (%)
  const [fireDamage, setFireDamage] = useState(""); // Ateş Hasarı
  const [iceDamage, setIceDamage] = useState(""); // Buz Hasarı
  const [lightningDamage, setLightningDamage] = useState(""); // Yıldırım Hasarı
  const [bpBonusPerKill, setBpBonusPerKill] = useState(""); // Öldürme Başına BP Bonusu
  
  // Toplu içe aktarma için state
  const [csvData, setCsvData] = useState([]);
  
  // Mob state'leri
  const [mobName, setMobName] = useState("");
  const [mobDescription, setMobDescription] = useState("");
  const [mobs, setMobs] = useState([]);
  const [editingMobId, setEditingMobId] = useState(null);
  
  // Verileri sadece gerekli olduğunda yükle
  useEffect(() => {
    if (activeTab === "Locations") {
      fetchLocations();
    } else if (activeTab === "Items") {
      fetchItems();
    } else if (activeTab === "Mobs") {
      fetchMobs();
    }
  }, [activeTab]);

  // Konumları PostgreSQL'den çek
  const fetchLocations = async (bypassCache = false) => {
    try {
      // Cache'ten dene (bypassCache false ise)
      if (!bypassCache) {
        const cachedLocations = getFromCache('locations');
        if (cachedLocations) {
          setLocations(cachedLocations);
          exportedLocations = cachedLocations;
          return;
        }
      }
      
      const locationsData = await locationService.getAllLocations();
      // PostgreSQL yapısına uygun olarak veriyi dönüştür
      const formattedLocations = locationsData.map(location => ({
        id: location.id,
        name: location.name,
        description: location.special_conditions || '',
        createdBy: 'system',
        createdAt: location.created_at
      }));
      setLocations(formattedLocations);
      // Konum verilerini dışa aktar
      exportedLocations = formattedLocations;
      // Cache'e kaydet
      setToCache('locations', formattedLocations);
    } catch (error) {
      console.error("Konumlar çekilirken hata oluştu:", error);
    }
  };
  
  // İtemleri PostgreSQL'den çek
  const fetchItems = async (bypassCache = true) => {
    try {
      // Cache devre dışı - her zaman veritabanından çek
      console.log('Fetching items from database...');
      
      const itemsData = await itemService.getAllItems();
      // Backend veri yapısına uygun olarak veriyi dönüştür
      const formattedItems = itemsData.map(item => ({
        id: item.id,
        itemType: item.item_cesidi || item.itemtype || '',
        name: item.item_adi || item.name || '',
        rarity: item.item_turu || item.rarity || '',
        class: item.sinif || item.class || '',
        level: item.seviye || item.level || null,
        gearScore: item.gear_score || item.gearscore || null,
        physicalDefenseBonus: item.fiziksel_savunma_bonusu || item.physicaldefensebonus || null,
        strengthBonus: item.strength_bonus || item.strengthbonus || null,
        dexterityBonus: item.dexterity_bonus || item.dexteritybonus || null,
        intelligenceBonus: item.intelligence_bonus || item.intelligencebonus || null,
        magicBonus: item.magic_bonus || item.magicbonus || null,
        healthBonus: item.health_bonus || item.healthbonus || null,
        hpBonus: item.hp_bonusu || item.hpbonus || null,
        mpBonus: item.mp_bonusu || item.mpbonus || null,
        fireResistance: item.ates_hasari_direnci || item.fireresistance || null,
        iceResistance: item.buz_hasari_direnci || item.iceresistance || null,
        lightningResistance: item.yildirim_hasari_direnci || item.lightningresistance || null,
        poisonResistance: item.zehir_hasari_direnci || item.poisonresistance || null,
        holyResistance: item.kutsal_hasari_direnci || item.holyresistance || null,
        curseResistance: item.lanet_hasari_direnci || item.darkresistance || null,
        daggerDefense: item.hancer_savunmasi || item.daggerdefense || null,
        swordDefense: item.kilic_savunmasi || item.sworddefense || null,
        maceDefense: item.topuz_savunmasi || item.macedefense || null,
        axeDefense: item.balta_savunmasi || item.axedefense || null,
        spearDefense: item.mizrak_savunmasi || item.speardefense || null,
        bowDefense: item.yay_savunmasi || item.bowdefense || null,
        expBonus: item.exp_bonusu || item.expbonuspercent || null,
        coinBonus: item.coin_bonusu || item.coinbonuspercent || null,
        attackBonusAllMobs: item.tum_yaratiklara_karsi_saldiri_bonusu || item.allmonsterattackbonuspercent || null,
        fireDamage: item.ates_hasari || item.firedamage || null,
        iceDamage: item.buz_hasari || item.icedamage || null,
        lightningDamage: item.yildirim_hasari || item.lightningdamage || null,
        bpBonusPerKill: item.oldurme_basina_bp_bonusu || item.bpperkillbonus || null,
        createdBy: 'system',
        createdAt: item.created_at
      }));
      console.log('Fetched items:', formattedItems.length, formattedItems.slice(0, 3));
      setItems(formattedItems);
      // İtem verilerini dışa aktar
      exportedItems = formattedItems;
      // Cache'e kaydet
      setToCache('items', formattedItems);
    } catch (error) {
      console.error("İtemler çekilirken hata oluştu:", error);
    }
  };
  
  // Mobları PostgreSQL'den çek
  const fetchMobs = async (bypassCache = false) => {
    try {
      // Cache'ten dene (bypassCache false ise)
      if (!bypassCache) {
        const cachedMobs = getFromCache('mobs');
        if (cachedMobs) {
          setMobs(cachedMobs);
          exportedMobs = cachedMobs;
          return;
        }
      }
      
      const mobsData = await mobService.getAllMobs();
      // PostgreSQL yapısına uygun olarak veriyi dönüştür
      const formattedMobs = mobsData.map(mob => ({
        id: mob.id,
        name: mob.name,
        description: mob.ai_behavior || '',
        createdBy: 'system',
        createdAt: mob.created_at
      }));
      setMobs(formattedMobs);
      // Mob verilerini dışa aktar
      exportedMobs = formattedMobs;
      // Cache'e kaydet
      setToCache('mobs', formattedMobs);
    } catch (error) {
      console.error("Moblar çekilirken hata oluştu:", error);
    }
  };

  const handleSaveLocation = async () => {
    // Admin kontrolü backend tarafında yapılır
    
    if (!locationName.trim()) {
      showNotification("Konum adı boş olamaz!", "error");
      return;
    }
    
    // Rate limit kontrolü
    if (!checkRateLimit) {
      showNotification("Rate limit kontrolü yapılamadı!", "error");
      return;
    }
    
    if (!checkRateLimit('saveLocation')) {
      showNotification("Çok fazla istek gönderiyorsunuz. Lütfen biraz bekleyin.", "error");
      return;
    }

    try {
      if (editingLocationId) {
        // Güncelleme
        await locationService.updateLocation(editingLocationId, {
          name: locationName.trim(),
          special_conditions: locationDescription.trim()
        });
        showNotification("Konum güncellendi!");
      } else {
        // Yeni ekleme
        await locationService.createLocation({
          name: locationName.trim(),
          special_conditions: locationDescription.trim()
        });
        showNotification("Konum eklendi!");
      }
      
      // Cache'i temizle
      clearCache('locations');
      
      // Formu temizle
      setLocationName("");
      setLocationDescription("");
      setEditingLocationId(null);
      
      // Listeyi yenile (cache bypass ile)
      fetchLocations(true);
    } catch (error) {
      console.error("Konum kaydedilirken hata oluştu:", error);
      showNotification("Hata oluştu: " + error.message, "error");
    }
  };

  const handleEditLocation = (location) => {
    setLocationName(location.name);
    setLocationDescription(location.description || "");
    setEditingLocationId(location.id);
  };

  const handleDeleteLocation = async (locationId) => {
    // Admin kontrolü backend tarafında yapılır
    
    // Rate limit kontrolü
    if (!checkRateLimit) {
      showNotification("Rate limit kontrolü yapılamadı!", "error");
      return;
    }
    
    if (!checkRateLimit('deleteLocation')) {
      showNotification("Çok fazla istek gönderiyorsunuz. Lütfen biraz bekleyin.", "error");
      return;
    }
    
    try {
      await locationService.deleteLocation(locationId);
      showNotification("Konum silindi!");
      
      // Cache'i temizle
      clearCache('locations');
      
      // Listeyi yenile (cache bypass ile)
      fetchLocations(true);
    } catch (error) {
      console.error("Konum silinirken hata oluştu:", error);
      showNotification("Hata oluştu: " + error.message, "error");
    }
  };

  const handleCancelEdit = () => {
    setLocationName("");
    setLocationDescription("");
    setEditingLocationId(null);
  };
  
  // İtem işlemleri
  const handleSaveItem = async () => {
    // Admin kontrolü backend tarafında yapılır
    
    if (!itemName.trim()) {
      showNotification("İtem adı boş olamaz!", "error");
      return;
    }
    
    // Rate limit kontrolü
    if (!checkRateLimit) {
      showNotification("Rate limit kontrolü yapılamadı!", "error");
      return;
    }
    
    if (!checkRateLimit('saveItem')) {
      showNotification("Çok fazla istek gönderiyorsunuz. Lütfen biraz bekleyin.", "error");
      return;
    }

    try {
      // Item özelliklerini PostgreSQL yapısına dönüştür
      const itemProperties = {
        item_cesidi: itemType.trim() || null,
        item_adi: itemName.trim(),
        item_turu: itemRarity.trim() || null,
        sinif: itemClass.trim() || null,
        seviye: itemLevel ? parseInt(itemLevel) : null,
        gear_score: gearScore ? parseInt(gearScore) : null,
        fiziksel_savunma_bonusu: physicalDefenseBonus ? parseInt(physicalDefenseBonus) : null,
        strength_bonus: strengthBonus ? parseInt(strengthBonus) : null,
        dexterity_bonus: dexterityBonus ? parseInt(dexterityBonus) : null,
        intelligence_bonus: intelligenceBonus ? parseInt(intelligenceBonus) : null,
        magic_bonus: magicBonus ? parseInt(magicBonus) : null,
        health_bonus: healthBonus ? parseInt(healthBonus) : null,
        hp_bonusu: hpBonus ? parseInt(hpBonus) : null,
        mp_bonusu: mpBonus ? parseInt(mpBonus) : null,
        ates_hasari_direnci: fireResistance ? parseInt(fireResistance) : null,
        buz_hasari_direnci: iceResistance ? parseInt(iceResistance) : null,
        yildirim_hasari_direnci: lightningResistance ? parseInt(lightningResistance) : null,
        zehir_hasari_direnci: poisonResistance ? parseInt(poisonResistance) : null,
        kutsal_hasari_direnci: holyResistance ? parseInt(holyResistance) : null,
        lanet_hasari_direnci: curseResistance ? parseInt(curseResistance) : null,
        hancer_savunmasi: daggerDefense ? parseInt(daggerDefense) : null,
        kilic_savunmasi: swordDefense ? parseInt(swordDefense) : null,
        topuz_savunmasi: maceDefense ? parseInt(maceDefense) : null,
        balta_savunmasi: axeDefense ? parseInt(axeDefense) : null,
        mizrak_savunmasi: spearDefense ? parseInt(spearDefense) : null,
        yay_savunmasi: bowDefense ? parseInt(bowDefense) : null,
        exp_bonusu: expBonus ? parseFloat(expBonus) : null,
        coin_bonusu: coinBonus ? parseFloat(coinBonus) : null,
        tum_yaratiklara_karsi_saldiri_bonusu: attackBonusAllMobs ? parseFloat(attackBonusAllMobs) : null,
        ates_hasari: fireDamage ? parseInt(fireDamage) : null,
        buz_hasari: iceDamage ? parseInt(iceDamage) : null,
        yildirim_hasari: lightningDamage ? parseInt(lightningDamage) : null,
        oldurme_basina_bp_bonusu: bpBonusPerKill ? parseInt(bpBonusPerKill) : null
      };

      // Null değerleri temizle
      const cleanedProperties = {};
      Object.keys(itemProperties).forEach(key => {
        if (itemProperties[key] !== null && itemProperties[key] !== '') {
          cleanedProperties[key] = itemProperties[key];
        }
      });

      if (editingItemId) {
        // Güncelleme
        await itemService.updateItem(editingItemId, cleanedProperties);
        showNotification("İtem güncellendi!");
      } else {
        // Yeni ekleme
        await itemService.createItem(cleanedProperties);
        showNotification("İtem eklendi!");
      }
      
      // Formu temizle
      setItemType("");
      setItemName("");
      setItemRarity("");
      setItemClass("");
      setItemLevel("");
      setGearScore("");
      setPhysicalDefenseBonus("");
      setStrengthBonus("");
      setDexterityBonus("");
      setIntelligenceBonus("");
      setMagicBonus("");
      setHealthBonus("");
      setHpBonus("");
      setMpBonus("");
      setFireResistance("");
      setIceResistance("");
      setLightningResistance("");
      setPoisonResistance("");
      setHolyResistance("");
      setCurseResistance("");
      setDaggerDefense("");
      setSwordDefense("");
      setMaceDefense("");
      setAxeDefense("");
      setSpearDefense("");
      setBowDefense("");
      setExpBonus("");
      setCoinBonus("");
      setAttackBonusAllMobs("");
      setFireDamage("");
      setIceDamage("");
      setLightningDamage("");
      setBpBonusPerKill("");
      setEditingItemId(null);
      
      // Cache'i temizle
      clearCache('items');
      
      // Listeyi yenile (cache bypass ile)
      fetchItems(true);
    } catch (error) {
      console.error("İtem kaydedilirken hata oluştu:", error);
      showNotification("Hata oluştu: " + error.message, "error");
    }
  };

  // Dosyayı işleme (CSV ve Excel için)
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Excel dosyası için özel işlem
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = XLSX.read(e.target.result, { type: 'binary' });
        const firstSheetName = data.SheetNames[0];
        const worksheet = data.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // İlk satır başlıklar
        const headers = jsonData[0];
        
        // Diğer satırlar veriler
        const dataRows = jsonData.slice(1).map(row => {
          const rowData = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index] ? row[index].toString().trim().replace(/^"|"$/g, '') : '';
          });
          return rowData;
        });
        
        setCsvData(dataRows);
        showNotification(`${dataRows.length} item dosyadan okundu.`);
      };
      
      reader.readAsBinaryString(file);
    } else if (fileName.endsWith('.csv')) {
      // CSV dosyası için işlem
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n');
        
        // İlk satır başlıklar
        const headers = lines[0].split(',').map(header => {
          // Tırnak işaretlerini kaldır
          return header.trim().replace(/^"|"$/g, '');
        });
        
        // Diğer satırlar veriler
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === '') continue;
          
          // Virgülle ayrılmış değerleri doğru şekilde ayır (tırnak içindeki virgülleri göz ardı et)
          const values = parseCSVLine(lines[i]);
          const row = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim().replace(/^"|"$/g, '') : '';
          });
          
          data.push(row);
        }
        
        setCsvData(data);
        showNotification(`${data.length} item dosyadan okundu.`);
      };
      
      reader.readAsText(file, 'UTF-8');
    } else {
      showNotification("Desteklenmeyen dosya formatı. Lütfen CSV, XLSX veya XLS dosyası yükleyin.", "error");
    }
  };

  // CSV satırını doğru şekilde ayrıştırmak için yardımcı fonksiyon
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Çift tırnak - değeri olduğu gibi ekle
          current += '"';
          i++; // Sonraki tırnağı atla
        } else {
          // Tırnak işaretinin durumunu değiştir
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Virgül ve tırnak içinde değilsek, değeri ekle ve sıfırla
        result.push(current);
        current = '';
      } else {
        // Normal karakter - değere ekle
        current += char;
      }
    }
    
    // Son değeri ekle
    result.push(current);
    return result;
  };

  // Toplu içe aktarma
  const handleBulkImport = async () => {
    // Admin kontrolü backend tarafında yapılır
      
    if (csvData.length === 0) {
      showNotification("İçe aktarılacak veri bulunamadı!", "error");
      return;
    }
  
    try {
      let successCount = 0;
      let errorCount = 0;
        
      // Her bir satır için ITEM_EXCEL_SCHEMA ile eşle ve ekle
      for (const row of csvData) {
        try {
          const postgresItem = {};
          for (const { header, dbKey, type } of ITEM_EXCEL_SCHEMA) {
            const raw = row[header];
            const parsed = parseExcelValue(raw, type);
            if (parsed !== null && parsed !== '') postgresItem[dbKey] = parsed;
          }
          // İtem Adı (Derece) alternatif başlık desteği
          if ((postgresItem.item_adi === undefined || postgresItem.item_adi === '') && (row['İtem Adı (Derece)'] || row['İtem Adı'])) {
            postgresItem.item_adi = String(row['İtem Adı (Derece)'] || row['İtem Adı'] || '').trim();
          }
          if (!postgresItem.item_adi) {
            errorCount++;
            continue;
          }
          await itemService.createItem(postgresItem);
          successCount++;
        } catch (err) {
          console.error('Item içe aktarılırken hata oluştu:', row, err);
          errorCount++;
        }
      }
        
      showNotification(`${successCount} item başarıyla içe aktarıldı. ${errorCount} item hatalı.`, "success");
      setCsvData([]); // İşlem tamamlandı, veriyi temizle
      
      // Listeyi yenile
      fetchItems();
    } catch (error) {
      console.error("Toplu içe aktarma hatası:", error);
      showNotification("Toplu içe aktarma sırasında hata oluştu: " + error.message, "error");
    }
  };

  // Örnek CSV şablonunu indir (ITEM_EXCEL_SCHEMA sırasıyla)
  const downloadSampleCSV = () => {
    const headers = ITEM_EXCEL_SCHEMA.map(s => s.header);
    const sampleRows = [
      ['Yüzük', 'Ring Of Felankor (+1)', 'Unique', 'Warrior', '60', '600', '50', '20', '20', '20', '', '', '', '', '', '20', '', '10', '15', '12', '14', '8', '6', '5', '10', '15', '25', '20', '18', '2', '', '', '', ''],
      ['Yüzük', 'Ring Of Role (+0)', 'Unique', 'Tüm Sınıflar', '30', '258', '5', '12', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
    ];
    let csvContent = headers.join(',') + '\n';
    sampleRows.forEach(row => {
      csvContent += (row.length >= headers.length ? row.slice(0, headers.length) : [...row, ...Array(headers.length - row.length).fill('')]).join(',') + '\n';
    });
    const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'item_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Örnek Excel şablonunu indir
  const downloadSampleExcel = () => {
    const headers = ITEM_EXCEL_SCHEMA.map(s => s.header);
    const emptyRow = headers.reduce((acc, h) => ({ ...acc, [h]: '' }), {});
    const sampleData = [
      { ...emptyRow, 'İtem Çeşidi': 'Kolye', 'İtem Adı': 'Ancient Assassin Pendant', 'İtem Türü (Rarity)': 'Ancient', 'Seviye': '30', 'HP Bonusu': '20', 'Dexterity Bonus (Çeviklik Bonusu)': '14' },
      { ...emptyRow, 'İtem Çeşidi': 'Kolye', 'İtem Adı': 'Ancient Brawler\'s Pendant', 'İtem Türü (Rarity)': 'Ancient', 'Seviye': '30', 'Fiziksel Savunma Bonusu': '12', 'Strength Bonus (Kuvvet Bonusu)': '10', 'HP Bonusu': '30' },
      { ...emptyRow, 'İtem Çeşidi': 'Kolye', 'İtem Adı': 'Ancient Cleric\'s Pendant', 'İtem Türü (Rarity)': 'Ancient', 'Seviye': '30', 'Magic Bonus': '14', 'HP Bonusu': '60', 'MP Bonusu': '30' }
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    XLSX.utils.book_append_sheet(wb, ws, 'Items');
    XLSX.writeFile(wb, 'item_template.xlsx');
  };

  const handleEditItem = (item) => {
    setItemType(item.itemType || "");
    setItemName(item.name || "");
    setItemRarity(item.rarity || "");
    setItemClass(item.class || "");
    setItemLevel(item.level || "");
    setGearScore(item.gearScore || "");
    setPhysicalDefenseBonus(item.physicalDefenseBonus || "");
    setStrengthBonus(item.strengthBonus || "");
    setDexterityBonus(item.dexterityBonus || "");
    setIntelligenceBonus(item.intelligenceBonus || "");
    setMagicBonus(item.magicBonus || "");
    setHealthBonus(item.healthBonus || "");
    setHpBonus(item.hpBonus || "");
    setMpBonus(item.mpBonus || "");
    setFireResistance(item.fireResistance || "");
    setIceResistance(item.iceResistance || "");
    setLightningResistance(item.lightningResistance || "");
    setPoisonResistance(item.poisonResistance || "");
    setHolyResistance(item.holyResistance || "");
    setCurseResistance(item.curseResistance || "");
    setDaggerDefense(item.daggerDefense || "");
    setSwordDefense(item.swordDefense || "");
    setMaceDefense(item.maceDefense || "");
    setAxeDefense(item.axeDefense || "");
    setSpearDefense(item.spearDefense || "");
    setBowDefense(item.bowDefense || "");
    setExpBonus(item.expBonus || "");
    setCoinBonus(item.coinBonus || "");
    setAttackBonusAllMobs(item.attackBonusAllMobs || "");
    setFireDamage(item.fireDamage || "");
    setIceDamage(item.iceDamage || "");
    setLightningDamage(item.lightningDamage || "");
    setBpBonusPerKill(item.bpBonusPerKill || "");
    setEditingItemId(item.id);
  };

  const handleDeleteItem = async (itemId) => {
    // Admin kontrolü backend tarafında yapılır
    
    // Rate limit kontrolü
    if (!checkRateLimit) {
      showNotification("Rate limit kontrolü yapılamadı!", "error");
      return;
    }
    
    if (!checkRateLimit('deleteItem')) {
      showNotification("Çok fazla istek gönderiyorsunuz. Lütfen biraz bekleyin.", "error");
      return;
    }
    
    try {
      await itemService.deleteItem(itemId);
      showNotification("İtem silindi!");
      
      // Cache'i temizle
      clearCache('items');
      
      // Listeyi yenile (cache bypass ile)
      fetchItems(true);
    } catch (error) {
      console.error("İtem silinirken hata oluştu:", error);
      showNotification("Hata oluştu: " + error.message, "error");
    }
  };

  const handleCancelItemEdit = () => {
    setItemType("");
    setItemName("");
    setItemRarity("");
    setItemClass("");
    setItemLevel("");
    setGearScore("");
    setPhysicalDefenseBonus("");
    setStrengthBonus("");
    setDexterityBonus("");
    setIntelligenceBonus("");
    setMagicBonus("");
    setHealthBonus("");
    setHpBonus("");
    setMpBonus("");
    setFireResistance("");
    setIceResistance("");
    setLightningResistance("");
    setPoisonResistance("");
    setHolyResistance("");
    setCurseResistance("");
    setDaggerDefense("");
    setSwordDefense("");
    setMaceDefense("");
    setAxeDefense("");
    setSpearDefense("");
    setBowDefense("");
    setExpBonus("");
    setCoinBonus("");
    setAttackBonusAllMobs("");
    setFireDamage("");
    setIceDamage("");
    setLightningDamage("");
    setBpBonusPerKill("");
    setEditingItemId(null);
  };
  
  // Mob işlemleri
  const handleSaveMob = async () => {
    // Admin kontrolü backend tarafında yapılır
    
    if (!mobName.trim()) {
      showNotification("Mob adı boş olamaz!", "error");
      return;
    }
    
    // Rate limit kontrolü
    if (!checkRateLimit) {
      showNotification("Rate limit kontrolü yapılamadı!", "error");
      return;
    }
    
    if (!checkRateLimit('saveMob')) {
      showNotification("Çok fazla istek gönderiyorsunuz. Lütfen biraz bekleyin.", "error");
      return;
    }

    try {
      if (editingMobId) {
        // Güncelleme
        await mobService.updateMob(editingMobId, {
          name: mobName.trim(),
          ai_behavior: mobDescription.trim()
        });
        showNotification("Mob güncellendi!");
      } else {
        // Yeni ekleme
        await mobService.createMob({
          name: mobName.trim(),
          ai_behavior: mobDescription.trim()
        });
        showNotification("Mob eklendi!");
      }
      
      // Cache'i temizle
      clearCache('mobs');
      
      // Formu temizle
      setMobName("");
      setMobDescription("");
      setEditingMobId(null);
      
      // Listeyi yenile (cache bypass ile)
      fetchMobs(true);
    } catch (error) {
      console.error("Mob kaydedilirken hata oluştu:", error);
      showNotification("Hata oluştu: " + error.message, "error");
    }
  };

  const handleEditMob = (mob) => {
    setMobName(mob.name);
    setMobDescription(mob.description || "");
    setEditingMobId(mob.id);
  };

  const handleDeleteMob = async (mobId) => {
    // Admin kontrolü backend tarafında yapılır
    
    // Rate limit kontrolü
    if (!checkRateLimit) {
      showNotification("Rate limit kontrolü yapılamadı!", "error");
      return;
    }
    
    if (!checkRateLimit('deleteMob')) {
      showNotification("Çok fazla istek gönderiyorsunuz. Lütfen biraz bekleyin.", "error");
      return;
    }
    
    try {
      await mobService.deleteMob(mobId);
      showNotification("Mob silindi!");
      
      // Cache'i temizle
      clearCache('mobs');
      
      // Listeyi yenile (cache bypass ile)
      fetchMobs(true);
    } catch (error) {
      console.error("Mob silinirken hata oluştu:", error);
      showNotification("Hata oluştu: " + error.message, "error");
    }
  };

  const handleCancelMobEdit = () => {
    setMobName("");
    setMobDescription("");
    setEditingMobId(null);
  };
  
  // Tooltip state
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipContent, setTooltipContent] = useState({});
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Tooltip gösterme fonksiyonu
  const showTooltip = (item, e) => {
    console.log('Tooltip item:', item);
    setTooltipContent(item);
    setTooltipVisible(true);
    
    // Tooltip'in gerçek boyutlarını hesaplamak için gecikmeli işlem
    setTimeout(() => {
      const tooltipElement = document.getElementById('item-tooltip');
      if (tooltipElement) {
        const tooltipRect = tooltipElement.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width;
        const tooltipHeight = tooltipRect.height;
        
        let x = e.clientX + 10;
        let y = e.clientY + 10;
        
        // Ekranın sağına taşma kontrolü
        if (x + tooltipWidth > window.innerWidth) {
          x = e.clientX - tooltipWidth - 10;
        }
        
        // Ekranın altına taşma kontrolü
        if (y + tooltipHeight > window.innerHeight) {
          y = e.clientY - tooltipHeight - 10;
        }
        
        // Ekranın soluna taşma kontrolü
        if (x < 10) {
          x = 10;
        }
        
        // Ekranın üstüne taşma kontrolü
        if (y < 10) {
          y = 10;
        }
        
        setTooltipPosition({ x, y });
      }
    }, 0);
  };

  // Tooltip gizleme fonksiyonu
  const hideTooltip = () => {
    setTooltipVisible(false);
  };

  // Rarity stil sınıfları (CSS yerine inline stiller kullanıyoruz)
  const getRarityStyles = (rarity) => {
    switch (rarity) {
      case 'Unique':
        return {
          color: '#fbbf24',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, rgba(0,0,0,0) 70%)'
        };
      case 'Epic':
        return {
          color: '#a855f7',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(0,0,0,0) 70%)'
        };
      case 'Rare':
        return {
          color: '#3b82f6',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)'
        };
      case 'Ancient':
        return {
          color: '#22d3ee',
          border: '1px solid rgba(34, 211, 238, 0.3)',
          background: 'radial-gradient(circle, rgba(34,211,238,0.15) 0%, rgba(0,0,0,0) 70%)'
        };
      default:
        return {};
    }
  };

  // Dışa aktarma fonksiyonları

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Sistem</h2>
      
      <div className="flex gap-4 border-b border-gray-700 pb-2">
        <button 
          onClick={() => setActiveTab("Locations")} 
          className={`px-4 py-2 ${activeTab === "Locations" ? "text-yellow-500 border-b-2 border-yellow-500" : "text-gray-400"}`}
        >
          Harita (Konum) Ekle
        </button>
        <button 
          onClick={() => setActiveTab("Items")} 
          className={`px-4 py-2 ${activeTab === "Items" ? "text-yellow-500 border-b-2 border-yellow-500" : "text-gray-400"}`}
        >
          İtem Ekle
        </button>
        <button 
          onClick={() => setActiveTab("Mobs")} 
          className={`px-4 py-2 ${activeTab === "Mobs" ? "text-yellow-500 border-b-2 border-yellow-500" : "text-gray-400"}`}
        >
          Yaratık (Mob) Ekle
        </button>
      </div>

      {activeTab === "Locations" && (
        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-white font-bold mb-4">
              {editingLocationId ? "Konum Düzenle" : "Yeni Konum Ekle"}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Konum Adı *</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                  placeholder="Örn: Yeşil Orman, Karanlık Zindan vs."
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Açıklama</label>
                <textarea 
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                  placeholder="Konum hakkında kısa açıklama..."
                  rows="3"
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                ></textarea>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleSaveLocation}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-medium"
                >
                  {editingLocationId ? "Güncelle" : "Kaydet"}
                </button>
                
                {editingLocationId && (
                  <button 
                    onClick={handleCancelEdit}
                    className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white font-medium"
                  >
                    İptal
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-white font-bold mb-4">Kayıtlı Konumlar</h3>
            
            {locations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Henüz hiç konum eklenmemiş.
              </div>
            ) : (
              <div className="space-y-3">
                {locations.map((location) => (
                  <div key={location.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-bold">{location.name}</h4>
                      {location.description && (
                        <p className="text-gray-300 text-sm mt-1">{location.description}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-2">
                        Oluşturan: {location.createdBy === uid ? "Siz" : "Başka kullanıcı"}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditLocation(location)}
                        className="text-blue-400 hover:text-blue-300 p-1"
                        title="Düzenle"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteLocation(location.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === "Items" && (
        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-white font-bold mb-4">
              {editingItemId ? "İtem Düzenle" : "Yeni İtem Ekle"}
            </h3>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Temel Bilgiler */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">İtem Çeşidi *</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                    placeholder="Örn: Yüzük, Kılıç, Zırh vs."
                    value={itemType || ''}
                    onChange={(e) => setItemType(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">İtem Adı *</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                    placeholder="Örn: Ring Of Felankor (+1)"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">İtem Türü (Rarity) *</label>
                  <select 
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                    value={itemRarity || ''}
                    onChange={(e) => setItemRarity(e.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    <option value="Normal">Normal</option>
                    <option value="Magic">Magic</option>
                    <option value="Rare">Rare</option>
                    <option value="Unique">Unique</option>
                    <option value="Legendary">Legendary</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Sınıf (Class)</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                    placeholder="Örn: Warrior, Tüm Sınıflar vs."
                    value={itemClass || ''}
                    onChange={(e) => setItemClass(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Seviye</label>
                  <input 
                    type="number" 
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                    placeholder="Örn: 60"
                    value={itemLevel || ''}
                    onChange={(e) => setItemLevel(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Gear Score</label>
                  <input 
                    type="number" 
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                    placeholder="Örn: 600"
                    value={gearScore || ''}
                    onChange={(e) => setGearScore(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Savunma Özellikleri */}
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-white font-bold mb-3">Savunma Özellikleri</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Fiziksel Savunma Bonusu</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 50"
                      value={physicalDefenseBonus || ''}
                      onChange={(e) => setPhysicalDefenseBonus(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Hançer Savunması</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 10"
                      value={daggerDefense || ''}
                      onChange={(e) => setDaggerDefense(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Kılıç Savunması</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 15"
                      value={swordDefense || ''}
                      onChange={(e) => setSwordDefense(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Topuz Savunması</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 12"
                      value={maceDefense || ''}
                      onChange={(e) => setMaceDefense(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Balta Savunması</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 14"
                      value={axeDefense || ''}
                      onChange={(e) => setAxeDefense(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Mızrak Savunması</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 8"
                      value={spearDefense || ''}
                      onChange={(e) => setSpearDefense(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Yay Savunması</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 6"
                      value={bowDefense || ''}
                      onChange={(e) => setBowDefense(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              {/* İstatistik Bonusları */}
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-white font-bold mb-3">İstatistik Bonusları</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Strength Bonus (Kuvvet Bonusu)</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 20"
                      value={strengthBonus || ''}
                      onChange={(e) => setStrengthBonus(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Dexterity Bonus (Çeviklik Bonusu)</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 20"
                      value={dexterityBonus || ''}
                      onChange={(e) => setDexterityBonus(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Intelligence Bonus</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 20"
                      value={intelligenceBonus || ''}
                      onChange={(e) => setIntelligenceBonus(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Magic Bonus</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 15"
                      value={magicBonus || ''}
                      onChange={(e) => setMagicBonus(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Health Bonus (Sağlık Bonusu)</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 100"
                      value={healthBonus || ''}
                      onChange={(e) => setHealthBonus(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">HP Bonusu</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 50"
                      value={hpBonus || ''}
                      onChange={(e) => setHpBonus(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">MP Bonusu</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 30"
                      value={mpBonus || ''}
                      onChange={(e) => setMpBonus(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              {/* Hasar Dirençleri */}
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-white font-bold mb-3">Hasar Dirençleri</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Ateş Hasarı Direnci</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 15"
                      value={fireResistance || ''}
                      onChange={(e) => setFireResistance(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Buz Hasarı Direnci</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 12"
                      value={iceResistance || ''}
                      onChange={(e) => setIceResistance(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Yıldırım Hasarı Direnci</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 10"
                      value={lightningResistance || ''}
                      onChange={(e) => setLightningResistance(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Zehir Hasarı Direnci</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 8"
                      value={poisonResistance || ''}
                      onChange={(e) => setPoisonResistance(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Kutsal Hasarı Direnci</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 20"
                      value={holyResistance || ''}
                      onChange={(e) => setHolyResistance(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Lanet Hasarı Direnci</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 5"
                      value={curseResistance || ''}
                      onChange={(e) => setCurseResistance(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              {/* Diğer Özellikler */}
              <div className="bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-white font-bold mb-3">Diğer Özellikler</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">EXP Bonusu (%)</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 5"
                      value={expBonus || ''}
                      onChange={(e) => setExpBonus(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Coin Bonusu (%)</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 10"
                      value={coinBonus || ''}
                      onChange={(e) => setCoinBonus(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Tüm Yaratıklara Karşı Saldırı Bonusu (%)</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 15"
                      value={attackBonusAllMobs || ''}
                      onChange={(e) => setAttackBonusAllMobs(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Ateş Hasarı</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 25"
                      value={fireDamage || ''}
                      onChange={(e) => setFireDamage(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Buz Hasarı</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 20"
                      value={iceDamage || ''}
                      onChange={(e) => setIceDamage(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Yıldırım Hasarı</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 18"
                      value={lightningDamage || ''}
                      onChange={(e) => setLightningDamage(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Öldürme Başına BP Bonusu</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                      placeholder="Örn: 2"
                      value={bpBonusPerKill || ''}
                      onChange={(e) => setBpBonusPerKill(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleSaveItem}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-medium"
                >
                  {editingItemId ? "Güncelle" : "Kaydet"}
                </button>
                
                {editingItemId && (
                  <button 
                    onClick={handleCancelItemEdit}
                    className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white font-medium"
                  >
                    İptal
                  </button>
                )}
              </div>
              
              {/* Toplu İçe Aktarma */}
              <div className="mt-6 pt-6 border-t border-gray-600">
                <h4 className="text-white font-bold mb-3">Toplu İçe Aktarma (CSV)</h4>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      accept=".csv,.xlsx,.xls" 
                      onChange={handleFileUpload}
                      className="text-white text-sm"
                      id="bulkImport"
                    />
                    <label htmlFor="bulkImport" className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white text-sm cursor-pointer">
                      Dosya Seç
                    </label>
                    <span className="text-gray-400 text-xs">Desteklenen formatlar: CSV, XLSX, XLS</span>
                  </div>
                  <button 
                    onClick={handleBulkImport}
                    className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-white font-medium text-sm"
                    disabled={!csvData.length}
                  >
                    Toplu İçe Aktar ({csvData.length} item)
                  </button>
                  {csvData.length > 0 && (
                    <p className="text-gray-400 text-sm">
                      Seçilen dosyada {csvData.length} item bulundu. İçe aktarmak için yukarıdaki butona tıklayın.
                    </p>
                  )}
                  <div className="mt-3 flex gap-4">
                    <button 
                      onClick={downloadSampleCSV}
                      className="text-blue-400 hover:text-blue-300 text-sm underline"
                    >
                      Örnek CSV şablonunu indir
                    </button>
                    <button 
                      onClick={downloadSampleExcel}
                      className="text-green-400 hover:text-green-300 text-sm underline"
                    >
                      Örnek Excel şablonunu indir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-white font-bold mb-4">Kayıtlı İtemler</h3>
            
            {/* Filtreleme Alanı */}
            <div className="mb-4 p-4 bg-gray-700 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-gray-300 text-xs mb-1">İtem Adı</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                    placeholder="İtem adı ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-xs mb-1">Seviye</label>
                  <select 
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                  >
                    <option value="">Tümü</option>
                    <option value="1">+1</option>
                    <option value="2">+2</option>
                    <option value="3">+3</option>
                    <option value="4">+4</option>
                    <option value="5">+5</option>
                    <option value="6">+6</option>
                    <option value="7">+7</option>
                    <option value="8">+8</option>
                    <option value="9">+9</option>
                    <option value="10">+10</option>
                    <option value="11">+11</option>
                    <option value="12">+12</option>
                    <option value="13">+13</option>
                    <option value="14">+14</option>
                    <option value="15">+15</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-xs mb-1">Rarity</label>
                  <select 
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                    value={filterRarity}
                    onChange={(e) => setFilterRarity(e.target.value)}
                  >
                    <option value="">Tümü</option>
                    <option value="Normal">Normal</option>
                    <option value="Magic">Magic</option>
                    <option value="Rare">Rare</option>
                    <option value="Unique">Unique</option>
                    <option value="Epic">Epic</option>
                    <option value="Legendary">Legendary</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-xs mb-1">İtem Çeşidi</label>
                  <select 
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                    value={filterItemType}
                    onChange={(e) => setFilterItemType(e.target.value)}
                  >
                    <option value="">Tümü</option>
                    <option value="Yüzük">Yüzük</option>
                    <option value="Kolye">Kolye</option>
                    <option value="Kuşak">Kuşak</option>
                    <option value="Kılıç">Kılıç</option>
                    <option value="Balta">Balta</option>
                    <option value="Topuz">Topuz</option>
                    <option value="Mızrak">Mızrak</option>
                    <option value="Yay">Yay</option>
                    <option value="Kask">Kask</option>
                    <option value="Zırh">Zırh</option>
                    <option value="Pantolon">Pantolon</option>
                    <option value="Bot">Bot</option>
                    <option value="Eldiven">Eldiven</option>
                  </select>
                </div>
                
                <div className="flex items-end">
                  <button 
                    onClick={() => {
                      console.log('Filtreler temizleniyor...');
                      setSearchTerm('');
                      setFilterLevel('');
                      setFilterRarity('');
                      setFilterItemType('');
                      // State'i yeniden ayarlayarak force update
                      setItems([...items]);
                      console.log('Filtreler temizlendi');
                    }}
                    className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2 px-3 rounded text-sm"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              </div>
            </div>
            
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Henüz hiç item eklenmemiş.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-700 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-800 text-gray-300 text-sm">
                      <th className="py-3 px-4 text-left">İtem Çeşidi</th>
                      <th className="py-3 px-4 text-left">İtem Adı</th>
                      <th className="py-3 px-4 text-left">Rarity</th>
                      <th className="py-3 px-4 text-left">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items
                      .filter(item => {
                        // İtem adı arama filtresi (içeren)
                        const nameMatch = searchTerm === "" || 
                          (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase()));
                        
                        // Seviye filtresi (isimde \"(+x)\" içeren)
                        const levelMatch = filterLevel === "" || 
                          (item.name && item.name.includes(`(+${filterLevel})`));
                        
                        // Rarity filtresi
                        const rarityMatch = filterRarity === "" || 
                          (item.rarity && item.rarity === filterRarity);
                        
                        // İtem çeşidi filtresi
                        const itemTypeMatch = filterItemType === "" || 
                          (item.itemType && item.itemType === filterItemType);
                        
                        return nameMatch && levelMatch && rarityMatch && itemTypeMatch;
                      })
                      .map((item) => (
                        <tr key={item.id} className="border-b border-gray-600 hover:bg-gray-600">
                          <td className="py-3 px-4 text-gray-300">{item.itemType || "-"}</td>
                          <td className="py-3 px-4">
                            <span 
                              className={`${
                                item.rarity === 'Unique' ? 'text-yellow-400 font-bold' :
                                item.rarity === 'Epic' ? 'text-purple-400 font-bold' :
                                item.rarity === 'Rare' ? 'text-blue-400' :
                                'text-white'
                              } cursor-pointer`}
                              onMouseEnter={(e) => showTooltip(item, e)}
                              onMouseLeave={hideTooltip}
                            >
                              {item.name || "-"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.rarity === 'Unique' ? 'bg-yellow-900 text-yellow-200' :
                              item.rarity === 'Epic' ? 'bg-purple-900 text-purple-200' :
                              item.rarity === 'Rare' ? 'bg-blue-900 text-blue-200' :
                              item.rarity === 'Magic' ? 'bg-green-900 text-green-200' :
                              'bg-gray-900 text-gray-200'
                            }`}>
                              {item.rarity || "-"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleEditItem(item)}
                                className="text-blue-400 hover:text-blue-300 p-1"
                                title="Düzenle"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-red-400 hover:text-red-300 p-1"
                                title="Sil"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === "Mobs" && (
        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-white font-bold mb-4">
              {editingMobId ? "Yaratık (Mob) Düzenle" : "Yeni Yaratık (Mob) Ekle"}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Yaratık (Mob) Adı *</label>
                <input 
                  type="text" 
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                  placeholder="Örn: Goblin, Ejderha, Vampir vs."
                  value={mobName}
                  onChange={(e) => setMobName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm mb-2">Açıklama</label>
                <textarea 
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                  placeholder="Yaratık hakkında kısa açıklama..."
                  rows="3"
                  value={mobDescription}
                  onChange={(e) => setMobDescription(e.target.value)}
                ></textarea>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleSaveMob}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-medium"
                >
                  {editingMobId ? "Güncelle" : "Kaydet"}
                </button>
                
                {editingMobId && (
                  <button 
                    onClick={handleCancelMobEdit}
                    className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white font-medium"
                  >
                    İptal
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-white font-bold mb-4">Kayıtlı Yaratıklar (Moblar)</h3>
            
            {mobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Henüz hiç yaratık eklenmemiş.
              </div>
            ) : (
              <div className="space-y-3">
                {mobs.map((mob) => (
                  <div key={mob.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-bold">{mob.name}</h4>
                      {mob.description && (
                        <p className="text-gray-300 text-sm mt-1">{mob.description}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-2">
                        Oluşturan: {mob.createdBy === uid ? "Siz" : "Başka kullanıcı"}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditMob(mob)}
                        className="text-blue-400 hover:text-blue-300 p-1"
                        title="Düzenle"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteMob(mob.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Tooltip */}
      {tooltipVisible && (
        <div 
          id="item-tooltip"
          className="fixed w-[350px] bg-gray-900 border border-gray-600 text-lg shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-md rounded-sm p-5 pointer-events-none transition-opacity duration-100 z-50"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            opacity: tooltipVisible ? 1 : 0
          }}
        >
          <div className="border-b border-white/10 pb-3 mb-3 text-center">
            <div className="font-extrabold text-2xl leading-tight mb-1 px-2 py-2 rounded" style={getRarityStyles(tooltipContent.rarity)}>
              {tooltipContent.name || "Item Name"}
            </div>
            <div className="flex justify-center gap-3 text-base uppercase font-extrabold tracking-wider">
              <span style={tooltipContent.rarity ? getRarityStyles(tooltipContent.rarity) : {}}>
                {tooltipContent.rarity || "Common"}
              </span>
              <span className="text-gray-500 font-extrabold">
                {tooltipContent.itemType || "Type"}
              </span>
            </div>
          </div>
          
          <div className="space-y-2 text-sm font-bold">
            {tooltipContent.itemType && (
              <div style={{color: '#ffffff'}}>İtem Çeşidi: <span style={{color: '#ffffff'}}>{tooltipContent.itemType}</span></div>
            )}
            {tooltipContent.level && (
              <div style={{color: '#ffffff'}}>Seviye: <span style={{color: '#ffffff'}}>{tooltipContent.level}</span></div>
            )}
            {tooltipContent.gearScore && (
              <div style={{color: '#e5c370'}}>Gear Score: <span style={{color: '#e5c370'}}>{tooltipContent.gearScore}</span></div>
            )}
            {tooltipContent.class && (
              <div style={{color: '#ffffff'}}>Sınıf (Class): <span style={{color: '#ffffff'}}>{tooltipContent.class}</span></div>
            )}
            {tooltipContent.physicalDefenseBonus && (
              <div style={{color: '#ffffff', display: 'flex'}}><span style={{color: '#ffffff', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.physicalDefenseBonus}</span><span style={{color: '#ffffff'}}>Fiziksel Savunma Bonusu</span></div>
            )}
            {tooltipContent.strengthBonus && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.strengthBonus}</span><span style={{color: '#159745'}}>Strength Bonus (Kuvvet Bonusu)</span></div>
            )}
            {tooltipContent.dexterityBonus && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.dexterityBonus}</span><span style={{color: '#159745'}}>Dexterity Bonus (Çeviklik Bonusu)</span></div>
            )}
            {tooltipContent.intelligenceBonus && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.intelligenceBonus}</span><span style={{color: '#159745'}}>Intelligence Bonus</span></div>
            )}
            {tooltipContent.magicBonus && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.magicBonus}</span><span style={{color: '#159745'}}>Magic Bonus</span></div>
            )}
            {tooltipContent.healthBonus && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.healthBonus}</span><span style={{color: '#159745'}}>Health Bonus (Sağlık Bonusu)</span></div>
            )}
            {tooltipContent.hpBonus && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.hpBonus}</span><span style={{color: '#159745'}}>HP Bonusu</span></div>
            )}
            {tooltipContent.mpBonus && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.mpBonus}</span><span style={{color: '#159745'}}>MP Bonusu</span></div>
            )}
            {tooltipContent.fireResistance && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.fireResistance}</span><span style={{color: '#159745'}}>Ateş Hasarı Direnci</span></div>
            )}
            {tooltipContent.iceResistance && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.iceResistance}</span><span style={{color: '#159745'}}>Buz Hasarı Direnci</span></div>
            )}
            {tooltipContent.lightningResistance && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.lightningResistance}</span><span style={{color: '#159745'}}>Yıldırım Hasarı Direnci</span></div>
            )}
            {tooltipContent.poisonResistance && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.poisonResistance}</span><span style={{color: '#159745'}}>Zehir Hasarı Direnci</span></div>
            )}
            {tooltipContent.holyResistance && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.holyResistance}</span><span style={{color: '#159745'}}>Kutsal Hasarı Direnci</span></div>
            )}
            {tooltipContent.curseResistance && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.curseResistance}</span><span style={{color: '#159745'}}>Lanet Hasarı Direnci</span></div>
            )}
            {tooltipContent.daggerDefense && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.daggerDefense}</span><span style={{color: '#159745'}}>Hançer Savunması</span></div>
            )}
            {tooltipContent.swordDefense && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.swordDefense}</span><span style={{color: '#159745'}}>Kılıç Savunması</span></div>
            )}
            {tooltipContent.maceDefense && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.maceDefense}</span><span style={{color: '#159745'}}>Topuz Savunması</span></div>
            )}
            {tooltipContent.axeDefense && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.axeDefense}</span><span style={{color: '#159745'}}>Balta Savunması</span></div>
            )}
            {tooltipContent.spearDefense && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.spearDefense}</span><span style={{color: '#159745'}}>Mızrak Savunması</span></div>
            )}
            {tooltipContent.bowDefense && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.bowDefense}</span><span style={{color: '#159745'}}>Yay Savunması</span></div>
            )}
            {tooltipContent.expBonus && tooltipContent.expBonus !== 0 && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.expBonus}%</span><span style={{color: '#159745'}}>EXP Bonusu (%)</span></div>
            )}
            {tooltipContent.coinBonus && tooltipContent.coinBonus !== 0 && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.coinBonus}%</span><span style={{color: '#159745'}}>Coin Bonusu (%)</span></div>
            )}
            {tooltipContent.attackBonusAllMobs && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.attackBonusAllMobs}%</span><span style={{color: '#159745'}}>Tüm Yaratıklara Karşı Saldırı Bonusu (%)</span></div>
            )}
            {tooltipContent.fireDamage && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.fireDamage}</span><span style={{color: '#159745'}}>Ateş Hasarı</span></div>
            )}
            {tooltipContent.iceDamage && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.iceDamage}</span><span style={{color: '#159745'}}>Buz Hasarı</span></div>
            )}
            {tooltipContent.lightningDamage && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.lightningDamage}</span><span style={{color: '#159745'}}>Yıldırım Hasarı</span></div>
            )}
            {tooltipContent.bpBonusPerKill && (
              <div style={{color: '#159745', display: 'flex'}}><span style={{color: '#159745', minWidth: '30px', textAlign: 'right', marginRight: '8px'}}>+{tooltipContent.bpBonusPerKill}</span><span style={{color: '#159745'}}>Öldürme Başına BP Bonusu</span></div>
            )}
          </div>
          
          <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-gray-500 italic text-center">
            Sağ tık ile kuşan / çıkar
          </div>
        </div>
      )}
    </div>
  );
};

// Dışa aktarma fonksiyonları
export const getExportedLocations = () => exportedLocations;
export const getExportedItems = () => exportedItems;
export const getExportedMobs = () => exportedMobs;

export default SystemPage;