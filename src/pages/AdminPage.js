import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';
import DiscordSettings from '../components/DiscordSettings';
import { Plus, Trash2, AlertCircle, Save, LinkIcon, Check, Shield } from 'lucide-react';

const AdminPage = ({ userData, uid, showNotification, checkRateLimit, refreshFriends }) => {
  const [activeAdminTab, setActiveAdminTab] = useState("Profile");
  const [activeSubTab, setActiveSubTab] = useState("K\u0130\u015f\u0130SEL");
  const [mainCharacter, setMainCharacter] = useState("");
  const [friendNick, setFriendNick] = useState("");
  const [linkInputs, setLinkInputs] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!uid) return;
    const loadProfile = async () => {
      try {
        const p = await userService.getProfile(uid);
        if (typeof p?.mainCharacter === 'string') {
          setMainCharacter(p.mainCharacter || '');
          return;
        }
      } catch (e) {
        // Fallback to Firestore state if backend not reachable
      }
      if (userData) setMainCharacter(userData.profile?.mainCharacter || "");
    };
    loadProfile();
  }, [uid, userData]);

  const saveProfile = async () => {
    try {
      // PostgreSQL'e gönder
      await userService.updateProfile(uid, { mainCharacter });

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
              {!mainCharacter && <p className="text-red-400 text-sm mb-3 font-semibold">UYARI: Karakter adı boş.</p>}
              <div className="flex gap-2">
                <input className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={mainCharacter} onChange={e => setMainCharacter(e.target.value)} placeholder="Oyun Nick (Main)" />
                <button onClick={saveProfile} className="bg-green-600 px-3 rounded text-white"><Save size={18} /></button>
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
    </div>
  );
};

export default AdminPage;