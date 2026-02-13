import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Pickaxe, Plus, Clock, Sword, Users, Check, X, Trash2, Search, Eye, Calendar, MapPin, Coins } from 'lucide-react';
import { farmService, mobService, locationService, itemService } from '../services/api';

const FarmPage = ({ farms, userData, selectedDate, uid, showNotification, targetFarmId, setTargetFarmId, checkRateLimit, onFarmsUpdated }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [dateFilter, setDateFilter] = useState("all"); // all, 1d, 1w, 1m, 1y
  const [itemSearch, setItemSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [farmCodeSearch, setFarmCodeSearch] = useState("");

  // YENİ: targetFarmId değiştiğinde (bildirimden gelindiğinde) ilgili farmı aç
  useEffect(() => {
    if (targetFarmId) {
      const farmToOpen = farms.find(f => f.id === targetFarmId);
      if (farmToOpen) {
        setSelectedFarm(farmToOpen);
        setShowModal(true);
        // İşlem bitti, resetle
        setTargetFarmId(null);
      }
    }
  }, [targetFarmId, farms, setTargetFarmId]);

  const handleEditFarm = (farm) => { 
    // Farm sahibi veya farm'da olan diğer kullanıcılar görebilir
    const isOwner = farm.ownerId === uid;
    const isParticipant = Array.isArray(farm.participants) ? 
      farm.participants.some(p => p.uid === uid) : 
      (farm.participants ? Object.values(farm.participants).some(p => p.uid === uid) : false);
    
    if (!isOwner && !isParticipant) {
      showNotification("Bu farmı görme yetkiniz yok.", "error");
      return;
    }
    
    setSelectedFarm(farm); 
    setShowModal(true); 
  };
  const handleCreateNew = () => {
    // Rate limiting kontrolü
    if (!checkRateLimit('create_farm', uid, 1, 120000)) { // 1 farm/120 saniye
      showNotification("Çok hızlı işlem yapılıyor. Lütfen biraz bekleyin.", "error");
      return;
    }
    setSelectedFarm(null); setShowModal(true);
  };

  const handleDeleteFarm = async (farmId, e) => {
    e.stopPropagation();

    // Güvenlik kontrolü
    const farmToDelete = farms.find(f => f.id === farmId);
    if (!farmToDelete) {
      showNotification("Farm bulunamadı.", "error");
      return;
    }

    // Sadece farm sahibi silebilir
    if (farmToDelete.ownerId !== uid) {
      showNotification("Bu farmı silme yetkiniz yok.", "error");
      return;
    }

    if (window.confirm("Bu kaydı silmek istediğinize emin misiniz?")) {
      try {
        await farmService.deleteFarm(farmId);
        showNotification("Kayıt silindi.", "success");
      } catch (error) {
        console.error('Farm silme hatası:', error);
        showNotification("Kayıt silinirken hata oluştu.", "error");
      }
    }
  };

  // Farm'ın tamamlanıp tamamlanmadığını kontrol eden fonksiyon
  const isFarmCompleted = (farm) => {
    // Tüm itemler satılmış mı?
    const allItemsSold = farm.items?.every(item =>
      parseInt(item.soldCount || 0) >= parseInt(item.count || 0)
    ) ?? true;

    // Tüm üyeler ödeme yapmış mı?
    const allMembersPaid = Array.isArray(farm.participants) ?
      farm.participants.every(participant => participant.isPaid) :
      (farm.participants ? Object.values(farm.participants).every(participant => participant.isPaid) : true);

    return allItemsSold && allMembersPaid;
  };

  // Tarih filtresi için yardımcı fonksiyon
  const isWithinDateRange = (farmDate, range) => {
    if (range === "all") return true;

    const farmDateObj = new Date(farmDate);
    const now = new Date();

    switch (range) {
      case "1d":
        return farmDateObj >= new Date(now.setDate(now.getDate() - 1));
      case "1w":
        return farmDateObj >= new Date(now.setDate(now.getDate() - 7));
      case "1m":
        return farmDateObj >= new Date(now.setMonth(now.getMonth() - 1));
      case "1y":
        return farmDateObj >= new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return true;
    }
  };

  // Filtrelenmiş ve sıralanmış farm listesi
  const filteredAndSortedFarms = useMemo(() => {
    return farms
      .filter(farm => {
        // Tarih filtresi
        if (!isWithinDateRange(farm.date, dateFilter)) return false;

        // Tamamlanmış/Tamamlanmamış filtresi
        const completed = isFarmCompleted(farm);
        if (!showCompleted && completed) return false;

        // Arama terimleri
        if (searchTerm && !(
          farm.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          farm.mob?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          farm.farmNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (Array.isArray(farm.participants) ?
            farm.participants.some(p => p.nickname?.toLowerCase().includes(searchTerm.toLowerCase())) :
            (farm.participants ? Object.values(farm.participants).some(p => p.nickname?.toLowerCase().includes(searchTerm.toLowerCase())) : false))
        )) return false;

        // Item arama
        if (itemSearch && !(farm.items?.some(item =>
          item.name?.toLowerCase().includes(itemSearch.toLowerCase())
        ))) return false;

        // Konum arama
        if (locationSearch && !farm.location?.toLowerCase().includes(locationSearch.toLowerCase())) return false;

        // Oyuncu arama
        if (playerSearch && !(Array.isArray(farm.participants) ?
          farm.participants.some(p => p.nickname?.toLowerCase().includes(playerSearch.toLowerCase())) :
          (farm.participants ? Object.values(farm.participants).some(p => p.nickname?.toLowerCase().includes(playerSearch.toLowerCase())) : false))) return false;

        // Farm kodu arama
        if (farmCodeSearch && !farm.farmNumber?.toLowerCase().includes(farmCodeSearch.toLowerCase())) return false;

        return true;
      })
      .sort((a, b) => {
        // Önce tamamlanmamış olanlar, sonra tarihe göre sırala
        const aCompleted = isFarmCompleted(a);
        const bCompleted = isFarmCompleted(b);

        if (aCompleted !== bCompleted) {
          return aCompleted ? 1 : -1; // Tamamlanmamışlar önce
        }

        // Tarihe göre sırala (en yeni önce)
        return new Date(b.date) - new Date(a.date);
      });
  }, [farms, searchTerm, showCompleted, dateFilter, itemSearch, locationSearch, playerSearch, farmCodeSearch]);

  // Sadece aktif (tamamlanmamış) farm'ları al
  const activeFarms = useMemo(() => {
    return filteredAndSortedFarms
      .filter(farm => !isFarmCompleted(farm))
      .slice(0, 15); // Sadece ilk 15
  }, [filteredAndSortedFarms]);

  // Tüm farm'ları al (filtrelere göre)
  const displayFarms = showCompleted ? filteredAndSortedFarms : activeFarms;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Pickaxe /> Farm Listesi</h2>
        <button onClick={handleCreateNew} className="bg-yellow-600 px-4 py-2 rounded text-white font-bold flex gap-2 hover:bg-yellow-700 transition"><Plus /> Yeni Farm</button>
      </div>

      {/* Filtreleme Alanı */}
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Genel Arama</label>
            <input
              type="text"
              placeholder="Konum, mob, oyuncu..."
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Item Adı</label>
            <input
              type="text"
              placeholder="Item adı..."
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Konum</label>
            <input
              type="text"
              placeholder="Konum adı..."
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Oyuncu</label>
            <input
              type="text"
              placeholder="Oyuncu adı..."
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Farm Kodu</label>
            <input
              type="text"
              placeholder="Farm kodu..."
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm"
              value={farmCodeSearch}
              onChange={(e) => setFarmCodeSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Tarih Aralığı</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">Tüm Kayıtlar</option>
              <option value="1d">Son 1 Gün</option>
              <option value="1w">Son 1 Hafta</option>
              <option value="1m">Son 1 Ay</option>
              <option value="1y">Son 1 Yıl</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`px-4 py-2 rounded text-sm font-medium ${showCompleted ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {showCompleted ? 'Tüm Kayıtlar' : 'Tamamlanmışları Göster'}
            </button>
          </div>
        </div>
      </div>

      <FarmCreateModal isOpen={showModal} onClose={() => setShowModal(false)} userData={userData} uid={uid} editData={selectedFarm} showNotification={showNotification} isAdmin={selectedFarm ? selectedFarm.ownerId === uid : true} />

      <div className="grid grid-cols-1 gap-4">
        {displayFarms.length === 0 ?
          <div className="text-center p-8 bg-gray-800 rounded-xl border border-gray-700 text-gray-500">
            {showCompleted ? 'Hiç tamamlanmış farm kaydı yok.' : 'Henüz bir farm kaydı yok.'}
          </div> :
          displayFarms.map(farm => {
            const isOwner = farm.ownerId === uid;
            const participantsList = Array.isArray(farm.participants) ? farm.participants : (farm.participants ? Object.values(farm.participants) : []);
            const totalItemCount = farm.items?.reduce((acc, i) => acc + (parseInt(i.count) || 0), 0) || 0;
            const totalSoldCount = farm.items?.reduce((acc, i) => acc + (parseInt(i.soldCount) || 0), 0) || 0;
            const remainingCount = totalItemCount - totalSoldCount;
            const estEarnings = farm.items?.reduce((acc, i) => acc + (parseFloat(i.estPrice || 0) * parseInt(i.count || 0)), 0) || 0;
            const isCompleted = isFarmCompleted(farm);

            return (
              <div
                key={farm.id}
                onClick={() => handleEditFarm(farm)}
                className={`bg-gray-800 p-4 rounded-xl border-l-4 hover:bg-gray-750 transition shadow-lg relative group cursor-pointer ${isCompleted ? 'border-green-500' : 'border-yellow-500'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-gray-900 text-gray-400 px-1.5 py-0.5 rounded">{farm.farmNumber || '#Unknown'}</span>
                      <span className="font-bold text-white text-lg">{farm.location || "Bilinmeyen Konum"}</span>
                      {isCompleted && (
                        <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">Tamamlandı</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 flex gap-3">
                      <span className="flex items-center gap-1"><Clock size={10} /> {farm.duration} Saat</span>
                      <span className="flex items-center gap-1"><Sword size={10} /> {farm.mob}</span>
                      <span className="flex items-center gap-1"><Users size={10} /> {participantsList.length} Kişi</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Toplam Pay</p>
                    <p className="text-xl font-bold text-green-400">{(farm.totalRevenue || 0).toLocaleString()} c</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-400 mb-3 bg-gray-900/40 p-2 rounded">
                  <div className="flex flex-col">
                    <span>Top. İtem</span>
                    <span className="text-white font-bold">{totalItemCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Satılan</span>
                    <span className="text-green-400 font-bold">{totalSoldCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Kalan</span>
                    <span className="text-red-400 font-bold">{remainingCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Tahmini (Tümü)</span>
                    <span className="text-yellow-400 font-bold">{estEarnings.toLocaleString()} c</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {participantsList.map((p, idx) => (
                    <div
                      key={idx}
                      className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${p.isPaid ? 'bg-green-900/30 border-green-800 text-green-300' : 'bg-red-900/30 border-red-800 text-red-300'}`}
                    >
                      {p.nickname || p.name || "Üye"}
                      {p.isPaid ? <Check size={10} /> : <X size={10} />}
                    </div>
                  ))}
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
                  {isOwner ? (
                    <button
                      onClick={(e) => handleDeleteFarm(farm.id, e)}
                      className="p-2 bg-red-600 text-white rounded shadow hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <div className="p-2 text-gray-500 opacity-50">
                      <Eye size={16} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        }
      </div>

      {/* Bilgi Mesajı */}
      {!showCompleted && (
        <div className="text-center text-sm text-gray-500 mt-2">
          Sadece son 15 aktif (tamamlanmamış) kayıt gösteriliyor.
          <button
            onClick={() => setShowCompleted(true)}
            className="text-yellow-500 hover:text-yellow-400 underline"
          >
            Tüm kayıtları görmek için tıklayın
          </button>
        </div>
      )}
    </div>
  );
};

const FarmCreateModal = ({ isOpen, onClose, userData, uid, editData, showNotification, isAdmin = false }) => {
  const [date, setDate] = useState(editData?.date || new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState(editData?.duration || '');
  const [location, setLocation] = useState(editData?.location || '');
  const [mob, setMob] = useState(editData?.mob || '');
  const [participants, setParticipants] = useState(editData?.participants || []);
  const [items, setItems] = useState(editData?.items || []);
  const [totalRevenue, setTotalRevenue] = useState(editData?.totalRevenue || 0);
  const [sharePerPerson, setSharePerPerson] = useState(editData?.sharePerPerson || 0);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [mobOptions, setMobOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  
  // Item autocomplete için state'ler
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [availableItems, setAvailableItems] = useState([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const itemDropdownRef = useRef(null);
  
  // Filtrelenmiş item listesi
  const filteredItems = useMemo(() => {
    if (!itemSearchTerm) return availableItems.slice(0, 10); // İlk 10 item
    return availableItems
      .filter(item => item.toLowerCase().includes(itemSearchTerm.toLowerCase()))
      .slice(0, 10); // İlk 10 eşleşen item
  }, [itemSearchTerm, availableItems]);
  
  const handleItemSearchChange = (e) => {
    const value = e.target.value;
    setItemSearchTerm(value);
    setNewItemName(value);
    if (value.length > 0) {
      setShowItemDropdown(true);
    } else {
      setShowItemDropdown(false);
    }
  };
  
  const handleItemSelect = (itemName) => {
    setNewItemName(itemName);
    setItemSearchTerm(itemName);
    setShowItemDropdown(false);
  };
  
  useEffect(() => {
    if (editData) {
      setDate(editData.date || new Date().toISOString().split('T')[0]);
      setDuration(editData.duration || '');
      setLocation(editData.location || '');
      setMob(editData.mob || '');
      setParticipants(editData.participants || []);
      setItems(editData.items || []);
      setTotalRevenue(editData.totalRevenue || 0);
      setSharePerPerson(editData.sharePerPerson || 0);
    } else {
      // Yeni farm oluştururken kullanıcıyı otomatik olarak ekle
      if (userData) {
        const userPlayer = {
          nickname: userData.profile?.mainCharacter || userData.name || userData.displayName || 'Kullanıcı',
          isPaid: false,
          isMain: true,
          uid: uid
        };
        setParticipants([userPlayer]);
      }
    }
  }, [editData, userData, uid]);
  
  useEffect(() => {
    // Mob ve konum listelerini veritabanından çek
    const fetchData = async () => {
      try {
        const [mobs, locations, items] = await Promise.all([
          mobService.getAllMobs(),
          locationService.getAllLocations(),
          itemService.getAllItems()
        ]);
        
        setMobOptions(mobs.map(mob => mob.name));
        setLocationOptions(locations.map(loc => loc.name));
        
        // PostgreSQL yapısına uygun olarak item verisini dönüştür
        const formattedItems = items.map(item => (item.name || item.item_adi || ''));
        setAvailableItems(formattedItems.filter(name => name)); // Boş isimleri filtrele
      } catch (error) {
        console.error('Veri alınırken hata oluştu:', error);
        showNotification('Veri alınamadı.', 'error');
      }
    };
    
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);
  
  // Item dropdown için click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) {
        setShowItemDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  useEffect(() => {
    // Kullanıcının arkadaş listesini veritabanından çek
    const fetchAvailablePlayers = async () => {
      try {
        // Burada kullanıcıya ait diğer oyuncuları çekeriz
        // Ancak bu bilgi userData üzerinden gelmeli
        if (userData && userData.otherPlayers) {
          const players = Object.entries(userData.otherPlayers || {}).map(([key, p]) => ({
            key,
            ...p
          }));
          setAvailablePlayers(players);
        }
      } catch (error) {
        console.error('Kullanıcı listesi alınırken hata oluştu:', error);
      }
    };
    
    if (isOpen) {
      fetchAvailablePlayers();
    }
  }, [isOpen, userData]);
  
  useEffect(() => {
    // Hakediş hesapla
    if (participants.length > 0) {
      const share = totalRevenue / participants.length;
      setSharePerPerson(share);
    }
  }, [totalRevenue, participants.length]);
  
  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    if (participants.some(p => p.nickname === newPlayerName.trim())) {
      showNotification('Bu oyuncu zaten listede.', 'error');
      return;
    }
    
    const newPlayer = {
      nickname: newPlayerName.trim(),
      isPaid: false
    };
    
    setParticipants([...participants, newPlayer]);
    setNewPlayerName('');
  };
  
  const handleAddSelectedPlayer = (player) => {
    if (participants.some(p => p.nickname === player.nickname || p.nickname === player.name)) {
      showNotification('Bu oyuncu zaten listede.', 'error');
      return;
    }
    
    const newPlayer = {
      nickname: player.nickname || player.name,
      isPaid: false,
      uid: player.uid,
      linked: player.linked
    };
    
    setParticipants([...participants, newPlayer]);
  };
  
  const handleSelectPlayer = (player) => {
    const isSelected = selectedPlayers.some(p => p.key === player.key);
    if (isSelected) {
      setSelectedPlayers(selectedPlayers.filter(p => p.key !== player.key));
    } else {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };
  
  const handleAddSelectedPlayers = () => {
    const newPlayers = selectedPlayers.filter(player => 
      !participants.some(p => p.nickname === player.nickname || p.nickname === player.name)
    ).map(player => ({
      nickname: player.nickname || player.name,
      isPaid: false,
      uid: player.uid,
      linked: player.linked
    }));
    
    if (newPlayers.length > 0) {
      setParticipants([...participants, ...newPlayers]);
      setSelectedPlayers([]);
      setShowPlayerSelector(false);
      showNotification(`${newPlayers.length} oyuncu eklendi.`, 'success');
    } else {
      showNotification('Seçili oyuncular zaten listede.', 'error');
    }
  };
  
  const handleRemoveMainPlayer = () => {
    if (participants.length > 0 && participants[0].isMain) {
      const newParticipants = [...participants];
      newParticipants.shift(); // İlk elemanı (main oyuncuyu) kaldır
      setParticipants(newParticipants);
    }
  };
  
  const handleRemovePlayer = (index) => {
    const newPlayers = [...participants];
    newPlayers.splice(index, 1);
    setParticipants(newPlayers);
  };
  
  const handleTogglePlayerPaid = (index) => {
    const newPlayers = [...participants];
    newPlayers[index].isPaid = !newPlayers[index].isPaid;
    setParticipants(newPlayers);
  };
  
  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemQuantity || !newItemPrice) {
      showNotification('Lütfen tüm alanları doldurun.', 'error');
      return;
    }
    
    const newItem = {
      name: newItemName.trim(),
      count: parseInt(newItemQuantity) || 0,
      estimatedPricePerItem: parseFloat(newItemPrice) || 0, // Tahmini fiyat (item başına)
      soldPricePerItem: parseFloat(newItemPrice) || 0, // Gerçek satış fiyatı (item başına)
      soldCount: 0
    };
    
    setItems([...items, newItem]);
    setNewItemName('');
    setItemSearchTerm('');
    setNewItemQuantity('');
    setNewItemPrice('');
    setShowItemDropdown(false);
    
    // Tahmini toplam geliri güncelle (tüm itemler için)
    const newTotal = items.reduce((sum, item) => sum + (item.estimatedPricePerItem * item.count), 0) + (newItem.estimatedPricePerItem * newItem.count);
    setTotalRevenue(newTotal);
    setSharePerPerson(participants.length > 0 ? newTotal / participants.length : 0);
    
    showNotification('Item eklendi.', 'success');
  };
  
  const handleRemoveItem = (index) => {
    const itemToRemove = items[index];
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    
    // Toplam geliri güncelle
    const total = newItems.reduce((sum, item) => sum + (item.realPrice * item.count), 0);
    setTotalRevenue(total);
  };
  
  const handleItemSoldChange = (index, value) => {
    const newItems = [...items];
    const count = parseInt(newItems[index].count) || 0;
    const soldCount = Math.min(Math.max(0, parseInt(value) || 0), count);
    newItems[index].soldCount = soldCount;
    
    // Toplam geliri güncelle (sadece SATILAN itemlerin gerçek fiyatlarıyla)
    // Formula: (item1_satılan_adet * item1_gerçek_fiyat) + (item2_satılan_adet * item2_gerçek_fiyat) + ...
    const total = newItems.reduce((sum, item) => sum + ((item.soldPricePerItem || 0) * (item.soldCount || 0)), 0);
    setTotalRevenue(total);
    setSharePerPerson(participants.length > 0 ? total / participants.length : 0);
    
    setItems(newItems);
  };
  
  // Yeni: Gerçek satış fiyatını güncelleme (item başına fiyat)
  const handleItemSoldPriceChange = (index, value) => {
    const newItems = [...items];
    newItems[index].soldPricePerItem = parseFloat(value) || 0;
    
    // Toplam geliri güncelle (sadece SATILAN itemlerin gerçek fiyatlarıyla)
    // Formula: (item1_satılan_adet * item1_gerçek_fiyat) + (item2_satılan_adet * item2_gerçek_fiyat) + ...
    const total = newItems.reduce((sum, item) => sum + ((item.soldPricePerItem || 0) * (item.soldCount || 0)), 0);
    setTotalRevenue(total);
    setSharePerPerson(participants.length > 0 ? total / participants.length : 0);
    
    setItems(newItems);
  };
  
  const handleSaveFarm = async () => {
    // Eğer kullanıcı admin değilse kaydetme işlemine izin verme
    if (!isAdmin) {
      showNotification('Bu kaydı sadece oluşturucu düzenleyebilir.', 'error');
      return;
    }
    
    if (!date || !duration || !location || !mob) {
      showNotification('Lütfen tüm alanları doldurun.', 'error');
      return;
    }
    
    if (participants.length === 0) {
      showNotification('En az 1 party üyesi ekleyin.', 'error');
      return;
    }
    
    if (items.length === 0) {
      showNotification('En az 1 ganimet ekleyin.', 'error');
      return;
    }
    
    try {
      const farmData = {
        date,
        duration: parseFloat(duration),
        location,
        mob,
        participants,
        items,
        totalRevenue,
        sharePerPerson,
        ownerId: uid,
        farmNumber: `FARM-${Date.now()}`,
        // Kullanıcının main karakter bilgisini ekle
        mainCharacterName: userData?.profile?.mainCharacter || userData?.name || userData?.displayName || 'Bilinmeyen'
      };
      
      if (editData) {
        // Update existing farm
        await farmService.updateFarm(editData.id, farmData);
        showNotification('Farm güncellendi!', 'success');
        
        // Yeni katılımcılara bildirim gönder
        const oldParticipants = editData.participants || [];
        const newParticipants = participants.filter(p => 
          !oldParticipants.some(op => op.uid === p.uid)
        );
        
        for (const participant of newParticipants) {
          if (participant.uid !== uid) {
            // TODO: Bildirim servisi eklenecek
            console.log('Bildirim gönder:', participant.uid, 'FarmID:', editData.id);
          }
        }
      } else {
        // Create new farm
        const result = await farmService.createFarm(farmData);
        showNotification('Yeni farm oluşturuldu!', 'success');
        
        // Katılımcılara bildirim gönder
        for (const participant of participants) {
          if (participant.uid !== uid) {
            // TODO: Bildirim servisi eklenecek
            console.log('Bildirim gönder:', participant.uid, 'FarmID:', result.id);
          }
        }
        
        // Farm oluşturulduktan sonra verileri yeniden çek
        window.location.reload();
      }
      
      onClose();
    } catch (error) {
      console.error('Farm kaydetme hatası:', error);
      showNotification('Farm kaydedilirken hata oluştu.', 'error');
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 w-full max-w-6xl rounded-xl border border-gray-700 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 rounded-t-xl">
          <h2 className="text-xl font-bold text-white">{editData ? (isAdmin ? 'Farm Düzenle' : 'Farm Detayı') : 'Yeni Farm Oluştur'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar size={12} /> Tarih
              </label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => isAdmin && setDate(e.target.value)} 
                className={`w-full bg-gray-700 border border-gray-600 rounded p-2 text-white ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                readOnly={!isAdmin}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={12} /> Süre (Saat)
              </label>
              <input 
                type="number" 
                step="0.5" 
                placeholder="Örn: 2.5" 
                value={duration} 
                onChange={(e) => isAdmin && setDuration(e.target.value)} 
                className={`w-full bg-gray-700 border border-gray-600 rounded p-2 text-white ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                readOnly={!isAdmin}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <MapPin size={12} /> Konum
              </label>
              <select 
                value={location} 
                onChange={(e) => isAdmin && setLocation(e.target.value)} 
                className={`w-full bg-gray-700 border border-gray-600 rounded p-2 text-white ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                disabled={!isAdmin}
              >
                <option value="">Seçiniz</option>
                {locationOptions.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Sword size={12} /> Mob
              </label>
              <select 
                value={mob} 
                onChange={(e) => isAdmin && setMob(e.target.value)} 
                className={`w-full bg-gray-700 border border-gray-600 rounded p-2 text-white ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                disabled={!isAdmin}
              >
                <option value="">Seçiniz</option>
                {mobOptions.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-700 flex flex-col">
              <h3 className="text-yellow-500 font-bold mb-3 flex items-center gap-2 border-b border-gray-700 pb-2">
                <Users size={18} /> Party Üyeleri ({participants.length})
              </h3>
              
              {/* Yeni üye ekleme */}
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  placeholder="Oyuncu adı..." 
                  value={newPlayerName} 
                  onChange={(e) => isAdmin && setNewPlayerName(e.target.value)}
                  className={`flex-1 bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                  readOnly={!isAdmin}
                />
                <button 
                  onClick={handleAddPlayer}
                  className={`px-3 rounded text-white text-sm ${isAdmin ? 'bg-green-600' : 'bg-gray-600 cursor-not-allowed'}`}
                  disabled={!isAdmin}
                >
                  <Plus size={16} />
                </button>
                <button 
                  onClick={() => isAdmin && setShowPlayerSelector(true)}
                  className={`px-3 rounded text-white text-sm ${isAdmin ? 'bg-blue-600' : 'bg-gray-600 cursor-not-allowed'}`}
                  disabled={!isAdmin}
                >
                  Listeden Seç
                </button>
              </div>
              
              {/* Oyuncu Seçici Modal */}
              {showPlayerSelector && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-gray-800 w-full max-w-2xl rounded-xl border border-gray-700 flex flex-col max-h-[70vh]">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 rounded-t-xl">
                      <h2 className="text-lg font-bold text-white">Oyuncu Seç</h2>
                      <button onClick={() => setShowPlayerSelector(false)} className="text-gray-400 hover:text-white">
                        <X size={20} />
                      </button>
                    </div>
                    
                    {/* Arama Alanı */}
                    <div className="p-4 border-b border-gray-700">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="İsim veya kullanıcı adı ara..."
                          className="w-full bg-gray-700 border border-gray-600 rounded p-2 pl-10 text-white"
                          value={playerSearchTerm}
                          onChange={(e) => setPlayerSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                      {availablePlayers.length === 0 ? (
                        <div className="text-center text-gray-500 p-4">
                          <Users size={24} className="mx-auto mb-2" />
                          <p>Oyuncu bulunamadı.</p>
                        </div>
                      ) : (
                        availablePlayers
                          .filter(player => 
                            (player.nickname || player.name)?.toLowerCase().includes(playerSearchTerm.toLowerCase()) ||
                            (player.realUsername || '')?.toLowerCase().includes(playerSearchTerm.toLowerCase())
                          )
                          .map((player, idx) => {
                            const isSelected = selectedPlayers.some(p => p.key === player.key);
                            return (
                              <div 
                                key={player.key || idx} 
                                className={`flex items-center justify-between bg-gray-700 p-3 rounded border ${isSelected ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 hover:bg-gray-600'} cursor-pointer`}
                                onClick={() => handleSelectPlayer(player)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-500' : 'border-gray-500'}`}>
                                    {isSelected && <Check size={12} className="text-white" />}
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center font-bold text-white">
                                    {(player.nickname || player.name)?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-white">{player.nickname || player.name}</p>
                                    <p className="text-xs text-gray-400">
                                      {player.realUsername && (
                                        <span>@{player.realUsername} • </span>
                                      )}
                                      {player.linked ? (
                                        <span className="text-green-400 flex items-center gap-1">
                                          <Check size={10} /> Bağlı
                                        </span>
                                      ) : (
                                        <span className="text-red-400">Bağlantı Yok</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddSelectedPlayer(player);
                                    }}
                                    className="bg-green-600 px-2 py-1 rounded text-xs"
                                  >
                                    Ekle
                                  </button>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                    
                    {/* Seçili oyuncuları ekle butonu */}
                    {selectedPlayers.length > 0 && (
                      <div className="p-4 border-t border-gray-700 bg-gray-900/50">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-300">
                            {selectedPlayers.length} oyuncu seçildi
                          </span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSelectedPlayers([])}
                              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                            >
                              İptal
                            </button>
                            <button 
                              onClick={handleAddSelectedPlayers}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                            >
                              Seçilenleri Ekle ({selectedPlayers.length})
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="p-4 bg-gray-900 border-t border-gray-700 rounded-b-xl">
                      <button 
                        onClick={() => setShowPlayerSelector(false)} 
                        className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium"
                      >
                        Kapat
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 custom-scrollbar pr-1">
                {participants.length === 0 ? (
                  <div className="text-center text-gray-500 p-4">
                    <Users size={24} className="mx-auto mb-2" />
                    <p>Henüz party üyesi eklenmemiş</p>
                  </div>
                ) : (
                  participants.map((member, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-700 p-2 rounded border border-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center font-bold text-white">
                          {member.nickname?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white flex items-center gap-2">
                            {member.nickname}
                            {member.isMain && (
                              <span className="text-xs bg-yellow-900 text-yellow-300 px-1.5 py-0.5 rounded">Main</span>
                            )}
                            {/* Eğer kullanıcı karakter adı farklıysa ve mainse, kullanıcı karakter adını da göster */}
                            {member.isMain && editData?.mainCharacterName && member.nickname !== editData.mainCharacterName && (
                              <span className="text-xs bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">{editData.mainCharacterName}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block uppercase">Hakediş</span>
                          <span className="text-blue-400 font-bold">{sharePerPerson.toLocaleString(undefined, { maximumFractionDigits: 0 })} c</span>
                          <div className="text-[9px] text-gray-500">(Satıştan)</div>
                        </div>
                        <button 
                          onClick={() => isAdmin && handleTogglePlayerPaid(idx)}
                          className={`px-2 py-1 rounded text-xs font-bold transition-colors ${isAdmin ? (member.isPaid ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-900/50 text-red-400 border border-red-800 hover:bg-red-700') : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
                          disabled={!isAdmin}
                        >
                          {member.isPaid ? 'ÖDENDİ' : 'ÖDENMEDİ'}
                        </button>
                        {!(member.isMain && participants.length === 1) && (
                          <button 
                            onClick={() => isAdmin && handleRemovePlayer(idx)}
                            className={`${isAdmin ? 'text-red-400 hover:text-red-300' : 'text-gray-500 cursor-not-allowed'}`}
                            disabled={!isAdmin}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-700 flex flex-col">
              <h3 className="text-green-400 font-bold mb-3 flex items-center gap-2 border-b border-gray-700 pb-2">
                <Coins size={18} /> Ganimet & Gelir
              </h3>
              
              {/* Yeni item ekleme */}
              <div className="grid grid-cols-12 gap-1 mb-3">
                <div className="col-span-5 relative" ref={itemDropdownRef}>
                  <input 
                    type="text" 
                    placeholder="İtem adı" 
                    value={itemSearchTerm} 
                    onChange={(e) => isAdmin && handleItemSearchChange(e)}
                    onFocus={(e) => isAdmin && itemSearchTerm && setShowItemDropdown(true)}
                    className={`w-full bg-gray-700 border border-gray-600 rounded p-1 text-white text-xs ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                    readOnly={!isAdmin}
                  />
                  {showItemDropdown && isAdmin && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg max-h-40 overflow-y-auto">
                      {filteredItems.map((item, idx) => (
                        <div 
                          key={idx}
                          className="p-2 hover:bg-gray-700 cursor-pointer text-xs text-white border-b border-gray-700 last:border-b-0"
                          onClick={() => isAdmin && handleItemSelect(item)}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input 
                  type="number" 
                  placeholder="Adet" 
                  value={newItemQuantity} 
                  onChange={(e) => isAdmin && setNewItemQuantity(e.target.value)}
                  className={`col-span-2 bg-gray-700 border border-gray-600 rounded p-1 text-white text-xs text-center ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                  readOnly={!isAdmin}
                />
                <input 
                  type="number" 
                  placeholder="Fiyat" 
                  value={newItemPrice} 
                  onChange={(e) => isAdmin && setNewItemPrice(e.target.value)}
                  className={`col-span-3 bg-gray-700 border border-gray-600 rounded p-1 text-white text-xs text-center ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                  readOnly={!isAdmin}
                />
                <button 
                  onClick={handleAddItem}
                  className={`col-span-2 px-2 rounded text-white text-xs ${isAdmin ? 'bg-green-600' : 'bg-gray-600 cursor-not-allowed'}`}
                  disabled={!isAdmin}
                >
                  <Plus size={14} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 custom-scrollbar pr-1">
                <div className="grid grid-cols-12 gap-1 text-[10px] text-gray-400 px-2 mb-1 font-bold">
                  <span className="col-span-3">İtem</span>
                  <span className="col-span-1 text-center">Adet</span>
                  <span className="col-span-1 text-center">Satılan</span>
                  <span className="col-span-2 text-center">Tahmini Fiyat</span>
                  <span className="col-span-2 text-center">Gerçek Fiyat</span>
                  <span className="col-span-2 text-right">Gelir</span>
                  <span className="col-span-1"></span>
                </div>
                
                {items.length === 0 ? (
                  <div className="text-center text-gray-500 p-4">
                    <Coins size={24} className="mx-auto mb-2" />
                    <p>Henüz ganimet eklenmemiş</p>
                  </div>
                ) : (
                  items.map((item, idx) => {
                    // Tahmini gelir: toplam adet * item başına tahmini fiyat
                    const estimatedIncome = (parseFloat(item.estimatedPricePerItem || 0) * (parseInt(item.count) || 0));
                    // Gerçek gelir: satılan adet * item başına gerçek fiyat
                    const soldIncome = (parseFloat(item.soldPricePerItem || 0) * (parseInt(item.soldCount) || 0));
                    const remainingCount = (parseInt(item.count) || 0) - (parseInt(item.soldCount) || 0);
                    const sharePerPersonForItem = participants.length > 0 ? (soldIncome / participants.length) : 0;
                    return (
                      <div key={idx} className="grid grid-cols-12 gap-1 items-center bg-gray-700 p-2 rounded border border-gray-600 text-xs">
                        <div className="col-span-3 truncate text-white font-bold" title={item.name}>{item.name}</div>
                        <div className="col-span-1 text-center text-gray-300">{item.count}</div>
                        <div className="col-span-1">
                          <input
                            type="number"
                            min="0"
                            max={item.count}
                            value={item.soldCount || 0}
                            onChange={(e) => isAdmin && handleItemSoldChange(idx, e.target.value)}
                            className={`w-full bg-gray-600 border border-gray-500 rounded px-1 py-0.5 text-center text-yellow-500 font-bold text-xs ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                            readOnly={!isAdmin}
                          />
                        </div>
                        <div className="col-span-2 text-center text-blue-400 font-bold">{item.estimatedPricePerItem || 0}</div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={item.soldPricePerItem || 0}
                            onChange={(e) => isAdmin && handleItemSoldPriceChange(idx, e.target.value)}
                            className={`w-full bg-gray-600 border border-gray-500 rounded px-1 py-0.5 text-center text-green-400 font-bold text-xs ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                            readOnly={!isAdmin}
                          />
                        </div>
                        <div className="col-span-2 text-right">
                          <div className="text-green-400 font-bold">{soldIncome.toLocaleString()}</div>
                          <div className="text-gray-500 text-[10px]">({remainingCount} kaldı)</div>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button 
                            onClick={() => isAdmin && handleRemoveItem(idx)}
                            className={`${isAdmin ? 'text-red-400 hover:text-red-300' : 'text-gray-500 cursor-not-allowed'}`}
                            disabled={!isAdmin}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
                
                {/* Tahmini vs Gerçek gelir karşılaştırması */}
                {items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                    <div className="grid grid-cols-12 gap-1 items-center bg-gray-900 p-2 rounded border border-gray-700 text-sm">
                      <div className="col-span-3 text-white font-bold">Tahmini Toplam</div>
                      <div className="col-span-7"></div>
                      <div className="col-span-2 text-right text-blue-400 font-bold">
                        {items.reduce((sum, item) => sum + (item.estimatedPricePerItem * item.count), 0).toLocaleString()} c
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-1 items-center bg-gray-900 p-2 rounded border border-gray-700 text-sm">
                      <div className="col-span-3 text-white font-bold">Gerçek Toplam</div>
                      <div className="col-span-7"></div>
                      <div className="col-span-2 text-right text-green-400 font-bold">
                        {totalRevenue.toLocaleString()} c
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-1 items-center bg-gray-900 p-2 rounded border border-gray-700 text-sm">
                      <div className="col-span-3 text-white font-bold">Fark</div>
                      <div className="col-span-7"></div>
                      <div className="col-span-2 text-right font-bold">
                        {(() => {
                          const estimated = items.reduce((sum, item) => sum + (item.estimatedPricePerItem * item.count), 0);
                          const difference = totalRevenue - estimated;
                          return (
                            <span className={difference >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {difference >= 0 ? '+' : ''}{difference.toLocaleString()} c
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-900 border-t border-gray-700 rounded-b-xl">
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={onClose} 
              className="flex-1 md:flex-none px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium"
            >
              İptal
            </button>
            <button 
              onClick={handleSaveFarm}
              className={`flex-1 md:flex-none px-6 py-2 ${isAdmin ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-600 cursor-not-allowed'} text-white rounded font-bold`}
              disabled={!isAdmin}
            >
              {isAdmin ? 'Kaydet' : 'Yalnızca Görüntüleme'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmPage;