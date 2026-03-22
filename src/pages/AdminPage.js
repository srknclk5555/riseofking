import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';
import DiscordSettings from '../components/DiscordSettings';
import { Plus, Trash2, AlertCircle, Save, LinkIcon, Check, Shield } from 'lucide-react';

const AdminPage = ({ userData, uid, showNotification, checkRateLimit, refreshFriends, adSettings, updateAdSettings }) => {
  const [activeAdminTab, setActiveAdminTab] = useState("Profile");
  const [activeSubTab, setActiveSubTab] = useState("K\u0130\u015f\u0130SEL");
  const [mainCharacter, setMainCharacter] = useState("");
  const [characterClass, setCharacterClass] = useState("");
  const [level, setLevel] = useState("");
  const [awakening, setAwakening] = useState("0");
  const [friendNick, setFriendNick] = useState("");
  const [linkInputs, setLinkInputs] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  // Carousel Yönetimi için geçici state'ler
  const [newAdImage, setNewAdImage] = useState("");
  const [newAdLink, setNewAdLink] = useState("");

  const addTopAd = () => {
    if (!newAdImage || !newAdLink) {
      showNotification("Lütfen görsel ve link alanlarını doldurun.", "error");
      return;
    }
    const newAds = [...(adSettings.topAds || []), { id: Date.now(), image: newAdImage, link: newAdLink }];
    updateAdSettings({ topAds: newAds });
    setNewAdImage("");
    setNewAdLink("");
    showNotification("Yeni reklam eklendi!");
  };

  const removeTopAd = (id) => {
    const newAds = adSettings.topAds.filter(ad => ad.id !== id);
    updateAdSettings({ topAds: newAds });
    showNotification("Reklam kaldırıldı.");
  };

  const toggleVisibility = (area) => {
    updateAdSettings({
      visibility: {
        ...adSettings.visibility,
        [area]: !adSettings.visibility[area]
      }
    });
  };

  useEffect(() => {
    if (!uid) return;
    const loadProfile = async () => {
      try {
        const p = await userService.getProfile(uid);
        if (typeof p?.mainCharacter === 'string' || p?.profile) {
          setMainCharacter(p?.mainCharacter || '');
          setCharacterClass(p?.profile?.characterClass || '');
          setLevel(p?.profile?.level || '');
          setAwakening(p?.profile?.awakening?.toString() || '0');
          return;
        }
      } catch (e) {
        // Fallback to Firestore state if backend not reachable
      }
      if (userData) {
        setMainCharacter(userData.profile?.mainCharacter || "");
        setCharacterClass(userData.profile?.characterClass || "");
        setLevel(userData.profile?.level || "");
        setAwakening(userData.profile?.awakening?.toString() || "0");
      }
    };
    loadProfile();
  }, [uid, userData]);

  const saveProfile = async () => {
    try {
      // PostgreSQL'e gönder
      await userService.updateProfile(uid, {
        mainCharacter,
        characterClass,
        level: level ? Number(level) : undefined,
        awakening: awakening ? Number(awakening) : undefined
      });

      // Firestore sync removed - using strict PostgreSQL
      /*
      const db = getFirestore();
      const userRef = doc(db, 'artifacts', 'rise_online_tracker_app', 'users', uid);
      await updateDoc(userRef, {
        'profile.mainCharacter': mainCharacter
      });
      */

      showNotification('Profil güncellendi!');
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      showNotification('Profil güncellenemedi: ' + error.message, 'error');
    }
  };

  const addFriend = async () => {
    // Rate limiting kontrolü
    if (!checkRateLimit('add_friend', uid, 5, 60000)) { // 5 arkadaş/dakika
      showNotification("Çok hızlı işlem yapılıyor. Lütfen biraz bekleyin.", "error");
      return;
    }

    if (!friendNick.trim()) return;

    try {
      const nickname = friendNick.trim();
      const key = Date.now().toString();

      // PostgreSQL API kullanımı
      await userService.addFriend(uid, { nickname });

      setFriendNick("");
      showNotification("Arkadaş eklendi!");

      // Arkadaş listesini anında güncelle
      if (refreshFriends) {
        setTimeout(() => {
          refreshFriends();
        }, 500);
      }
    } catch (error) {
      console.error('Arkadaş ekleme hatası:', error);
      showNotification("Hata: " + error.message, 'error');
    }
  };

  const deleteFriend = async (key) => {
    try {
      await userService.deleteFriend(uid, key);

      showNotification("Arkadaş silindi!");

      if (refreshFriends) {
        setTimeout(() => {
          refreshFriends();
        }, 500);
      }
    } catch (error) {
      console.error('Arkadaş silme hatası:', error);
      showNotification("Hata: " + error.message, 'error');
    }
  };

  const linkUser = async (friendKey) => {
    const searchVal = linkInputs[friendKey];
    if (!searchVal) {
      showNotification("Kullanıcı adı girin.", 'error');
      return;
    }

    try {
      // 1. Backend'den gerçek UID'yi bul
      const result = await userService.findUserByUsername(searchVal);
      if (!result || !result.success || !result.user || !result.user.uid) {
        showNotification("Kullanıcı bulunamadı. Lütfen tam kullanıcı adını girin.", 'error');
        return;
      }

      const targetUid = result.user.uid;

      // 2. PostgreSQL üzerinden linkle
      await userService.linkFriend(uid, friendKey, targetUid, result.user.username);

      /* Firestore removed
      const db = getFirestore();
      const userRef = doc(db, 'artifacts', 'rise_online_tracker_app', 'users', uid);
      await updateDoc(userRef, {
        [`otherPlayers.${friendKey}.uid`]: targetUid,
        [`otherPlayers.${friendKey}.realUsername`]: result.user.username, // Kullanıcı adını da ekle
        [`otherPlayers.${friendKey}.linked`]: true,
      });
      */

      setLinkInputs(prev => ({ ...prev, [friendKey]: "" }));
      showNotification("Kullanıcı bağlandı!");

      if (refreshFriends) {
        setTimeout(() => {
          refreshFriends();
        }, 500);
      }
    } catch (error) {
      console.error('Kullanıcı bağlama hatası:', error);
      showNotification("Bağlama hatası: " + (error.message || "Kullanıcı bulunamadı"), 'error');
    }
  };

  const friends = Object.entries(userData.otherPlayers || {}).map(([key, p]) => ({ key, ...p })).filter(p => (p.nickname || '').toLowerCase().includes((searchQuery || '').toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex gap-4 border-b border-gray-700 pb-2">
        <button onClick={() => setActiveAdminTab("Profile")} className={`px-4 py-2 ${activeAdminTab === "Profile" ? "text-yellow-500 border-b-2 border-yellow-500" : "text-gray-400"}`}>Profil & Oyuncular</button>
        <button onClick={() => setActiveAdminTab("Items")} className={`px-4 py-2 ${activeAdminTab === "Items" ? "text-yellow-500 border-b-2 border-yellow-500" : "text-gray-400"}`}>Ayarlar</button>
        {userData?.username === 'astral1' && (
          <button onClick={() => setActiveAdminTab("Advertising")} className={`px-4 py-2 ${activeAdminTab === "Advertising" ? "text-yellow-500 border-b-2 border-yellow-500" : "text-gray-400"}`}>Reklam Yönetimi</button>
        )}
      </div>

      {activeAdminTab === "Profile" && (
        <div className="space-y-6">
          <div className="flex gap-4 border-b border-gray-700 pb-2 ml-4">
            <button onClick={() => setActiveSubTab("Kişisel")} className={`text-sm px-3 py-1 ${activeSubTab === "Kişisel" ? "text-yellow-500 border-b border-yellow-500" : "text-gray-400"}`}>Kişisel</button>
            <button onClick={() => setActiveSubTab("Oyuncular")} className={`text-sm px-3 py-1 ${activeSubTab === "Oyuncular" ? "text-yellow-500 border-b border-yellow-500" : "text-gray-400"}`}>Oyuncu Yönetimi</button>
          </div>

          {activeSubTab === "Kişisel" && (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-md">
              <h3 className="text-white font-bold mb-4">Kişisel Bilgiler</h3>
              <div className="flex flex-col gap-3">
                {!mainCharacter && <p className="text-red-400 text-sm font-semibold">UYARI: Karakter adı boş.</p>}

                {/* Karakter Adı */}
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Oyun Nick (Main)</label>
                  <input className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={mainCharacter} onChange={e => setMainCharacter(e.target.value)} placeholder="Oyun Nick" />
                </div>

                {/* Sınıf */}
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Karakter Sınıfı</label>
                  <select className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={characterClass} onChange={e => setCharacterClass(e.target.value)}>
                    <option value="">Sınıf Seçiniz</option>
                    <option value="Warrior">Warrior</option>
                    <option value="Rogue">Rogue</option>
                    <option value="Mage">Mage</option>
                    <option value="Priest">Priest</option>
                  </select>
                </div>

                {/* Seviye (Level) */}
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Seviye (1-85)</label>
                  <input
                    type="number"
                    min="1"
                    max="85"
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                    value={level}
                    onChange={e => {
                      let val = e.target.value;
                      if (val !== '') {
                        val = Number(val);
                        if (val > 85) val = 85;
                        if (val < 1) val = 1;
                        if (val !== 85) setAwakening("0");
                      }
                      setLevel(val);
                    }}
                    placeholder="Örn: 85"
                  />
                </div>

                {/* Uyanış (Awakening) - Sadece Level 85 için geçerli */}
                {Number(level) === 85 && (
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Awakening</label>
                    <select className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={awakening} onChange={e => setAwakening(e.target.value)}>
                      <option value="0">0</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                )}

                <button onClick={saveProfile} className="bg-green-600 p-2 rounded text-white flex justify-center items-center gap-2 mt-2">
                  <Save size={18} /> Kaydet
                </button>
              </div>
            </div>
          )}

          {activeSubTab === "Oyuncular" && (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 min-h-[500px] flex flex-col">
              <div className="flex gap-2 mb-4">
                <input className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" placeholder="Ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <input className="bg-gray-900 border border-gray-600 rounded p-2 text-white" placeholder="Takma İsim" value={friendNick} onChange={e => setFriendNick(e.target.value)} />
                <button onClick={addFriend} className="bg-blue-600 px-4 rounded text-white"><Plus /></button>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                {friends.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 bg-gray-700/50 rounded-lg">
                    <AlertCircle size={20} className="mx-auto mb-2" />
                    Listenizde oyuncu yok.
                  </div>
                ) : (
                  friends.map(p => (
                    <div key={p.key} className="bg-gray-700 p-3 rounded flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white">{p.nickname}</p>
                          </div>
                          {p.linked ? (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <Check size={10} /> @{p.realUsername}
                            </span>
                          ) : (
                            <div className="flex gap-1 mt-1">
                              <input className="w-24 text-xs bg-gray-900 rounded px-1 text-gray-300" placeholder="user..." value={linkInputs[p.key] || ""} onChange={e => { const val = e.target.value; setLinkInputs(prev => ({ ...prev, [p.key]: val })) }} />
                              <button onClick={() => linkUser(p.key)} className="bg-purple-600 px-1 rounded text-xs text-white"><LinkIcon size={10} /></button>
                            </div>
                          )}
                        </div>
                      </div>
                      <button onClick={() => deleteFriend(p.key)} className="text-red-400"><Trash2 size={16} /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeAdminTab === "Items" && (
        <div className="space-y-6">
          <DiscordSettings uid={uid} showNotification={showNotification} />
        </div>
      )}

      {activeAdminTab === "Advertising" && userData?.username === 'astral1' && (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-8">
          <div className="flex justify-between items-center border-b border-gray-700 pb-4">
            <h3 className="text-white font-bold text-lg">Gelişmiş Reklam Ayarları (SADECE ASTRAL1)</h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={adSettings.visibility.top} onChange={() => toggleVisibility('top')} className="w-4 h-4 accent-yellow-500" />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Üst Carousel</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={adSettings.visibility.left} onChange={() => toggleVisibility('left')} className="w-4 h-4 accent-yellow-500" />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Sol Dikey</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={adSettings.visibility.right} onChange={() => toggleVisibility('right')} className="w-4 h-4 accent-yellow-500" />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Sağ Dikey</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={adSettings.visibility.sidebar} onChange={() => toggleVisibility('sidebar')} className="w-4 h-4 accent-yellow-500" />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Yan Menü</span>
              </label>
            </div>
          </div>

          {/* Carousel Yönetimi */}
          <div className="space-y-4">
            <h4 className="text-yellow-500 font-bold text-sm uppercase tracking-widest">Üst Carousel Yönetimi</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <div className="space-y-3">
                <input className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" placeholder="Görsel URL (Örn: https://.../resim.jpg)" value={newAdImage} onChange={e => setNewAdImage(e.target.value)} />
                <p className="text-[10px] text-gray-500 -mt-2 ml-1">İpucu: Linkin sonu .jpg veya .png ile bitmelidir. (Hızlı Resim'de resme sağ tıklayıp "Resim adresini kopyala" deyin)</p>
                <input className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" placeholder="Tıklandığında gidecek Link" value={newAdLink} onChange={e => setNewAdLink(e.target.value)} />
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-center">
                    <label className="text-xs text-gray-500 block mb-1">Geçiş (Saniye)</label>
                    <input type="number" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" value={adSettings.carouselInterval / 1000} onChange={e => updateAdSettings({ carouselInterval: Number(e.target.value) * 1000 })} min="1" max="60" />
                  </div>
                  <div className="flex-1 text-center">
                    <label className="text-xs text-gray-500 block mb-1">Yükseklik (PX)</label>
                    <input type="number" className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" value={adSettings.topHeight} onChange={e => updateAdSettings({ topHeight: Number(e.target.value) })} min="40" max="600" />
                  </div>
                  <button onClick={addTopAd} className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded font-bold h-10 self-end transition-colors flex items-center gap-2">
                    <Plus size={18} /> Ekle
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[160px] space-y-2 custom-scrollbar pr-2">
                {adSettings.topAds?.map(ad => (
                  <div key={ad.id} className="flex items-center gap-3 bg-gray-800 p-2 rounded border border-gray-700 group">
                    <img src={ad.image} className="w-12 h-8 object-cover rounded" alt="ad" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-400 truncate">{ad.image}</p>
                      <p className="text-[10px] text-yellow-500 truncate">{ad.link}</p>
                    </div>
                    <button onClick={() => removeTopAd(ad.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dikey Reklam Yönetimi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-yellow-500 font-bold text-sm uppercase tracking-widest">Sol Dikey Reklam</h4>
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-3">
                <input className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" placeholder="Görsel URL (.jpg, .png)" value={adSettings.leftAd?.image || ''} onChange={e => updateAdSettings({ leftAd: { ...adSettings.leftAd, image: e.target.value } })} />
                <input className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" placeholder="Link" value={adSettings.leftAd?.link || ''} onChange={e => updateAdSettings({ leftAd: { ...adSettings.leftAd, link: e.target.value } })} />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-yellow-500 font-bold text-sm uppercase tracking-widest">Sağ Dikey Reklam</h4>
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-3">
                <input className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" placeholder="Görsel URL (.jpg, .png)" value={adSettings.rightAd?.image || ''} onChange={e => updateAdSettings({ rightAd: { ...adSettings.rightAd, image: e.target.value } })} />
                <input className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" placeholder="Link" value={adSettings.rightAd?.link || ''} onChange={e => updateAdSettings({ rightAd: { ...adSettings.rightAd, link: e.target.value } })} />
              </div>
            </div>
          </div>

          {/* Yan Menü Reklam Yönetimi */}
          <div className="space-y-3">
            <h4 className="text-yellow-500 font-bold text-sm uppercase tracking-widest">Yan Menü (Sidebar) Reklamı</h4>
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" placeholder="Görsel URL (.jpg, .png)" value={adSettings.sidebarAd?.image || ''} onChange={e => updateAdSettings({ sidebarAd: { ...adSettings.sidebarAd, image: e.target.value } })} />
              <input className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm" placeholder="Link" value={adSettings.sidebarAd?.link || ''} onChange={e => updateAdSettings({ sidebarAd: { ...adSettings.sidebarAd, link: e.target.value } })} />
            </div>
          </div>
          
          <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-500 text-xs flex gap-2 items-start leading-relaxed">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              Tüm ayarlanmalar sunucu veritabanına otomatik kaydedilir ve tüm hesaplarda eşzamanlı güncellenir.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;