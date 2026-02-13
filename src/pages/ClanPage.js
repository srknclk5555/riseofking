import React, { useState, useEffect } from 'react';
import { Crown, Users, Plus, X, Search, Sword, Database, MessageSquare, AlertCircle, ArrowRight, UserPlus, Calendar, Coins, UserCheck, UserX } from 'lucide-react';
import { clanService } from '../services/clanService';
import { itemService } from '../services/api';
import clanBossService from '../services/clanBossService';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const ClanPage = ({ userData, uid, showNotification }) => {
  const [myClans, setMyClans] = useState([]);
  const [clanMembers, setClanMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [joinedClans, setJoinedClans] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedClan, setSelectedClan] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'dashboard'
  const [clanName, setClanName] = useState('');
  const [clanDescription, setClanDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('members'); // 'members', 'boss', 'bank', 'messages'
  const [searchTerm, setSearchTerm] = useState('');
  const [memberToRemove, setMemberToRemove] = useState(null); // Yeni: kaldırılacak üye
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false); // Yeni: onay modalı
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, member: null }); // Yeni: sağ tık/tıklama menüsü
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageFilters, setMessageFilters] = useState({ text: '', sender: '', startDate: '', endDate: '' });
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = React.useRef(null);
  
  // Clan Boss States
  const [clanBossRuns, setClanBossRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [showCreateRunModal, setShowCreateRunModal] = useState(false);
  const [showRunDetailModal, setShowRunDetailModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [runDate, setRunDate] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [drops, setDrops] = useState([]);
  const [newDropItem, setNewDropItem] = useState('');
  const [newDropQuantity, setNewDropQuantity] = useState(1);
  const [items, setItems] = useState([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === 'messages') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  // Mevcut kullanıcıya ait klanları yükle
  useEffect(() => {
    fetchUserClans();
  }, [uid]);

  // Tab değiştiğinde mesajları yükle
  useEffect(() => {
    if (activeTab === 'messages' && selectedClan) {
      fetchClanMessages();
    }
  }, [activeTab, selectedClan]);

  // Tab değiştiğinde clan boss run'larını yükle
  useEffect(() => {
    if (activeTab === 'boss' && selectedClan) {
      fetchClanBossRuns();
    }
  }, [activeTab, selectedClan]);

  const fetchUserClans = async () => {
    try {
      const userClans = await clanService.getUserClans(uid);
      const ownedClans = userClans.filter(clan => clan.owner_id === uid);
      const joinedClansList = userClans.filter(clan => clan.owner_id !== uid);

      setMyClans(ownedClans);
      setJoinedClans(joinedClansList);
    } catch (error) {
      console.error('Error fetching clans:', error);
      showNotification('Clanlar yüklenirken hata oluştu.', 'error');
    }
  };

  const handleCreateClan = async () => {
    if (!clanName.trim()) {
      showNotification('Lütfen klan adı girin.', 'error');
      return;
    }

    try {
      const clanData = {
        name: clanName,
        description: clanDescription,
        owner_id: uid,
        settings: {}
      };

      const newClan = await clanService.createClan(clanData);

      setMyClans([...myClans, newClan]);
      setClanName('');
      setClanDescription('');
      setShowCreateModal(false);

      showNotification('Klan başarıyla oluşturuldu!', 'success');
    } catch (error) {
      console.error('Error creating clan:', error);
      showNotification(error.message || 'Clan oluşturulurken hata oluştu.', 'error');
    }
  };

  const handleViewClanDashboard = async (clan) => {
    try {
      const members = await clanBossService.getClanMembers(clan.id);

      if (Array.isArray(members)) {
        setClanMembers(members);
      } else {
        console.error('[CLAN] Invalid members data:', members);
        setClanMembers([]);
      }

      setSelectedClan(clan);
      setCurrentView('dashboard');
    } catch (error) {
      console.error('[CLAN] Dashboard error:', error);
      showNotification('Clan detayları yüklenirken hata oluştu.', 'error');
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      setIsLoading(true);
      const users = await clanService.getAvailableUsers();
      console.log('[FRONTEND] API Response:', users);
      console.log('[FRONTEND] 543 in response?', users.find(u => u.username === '543'));
      setAvailableUsers(users);
    } catch (error) {
      console.error('[FRONTEND] Error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserSelection = (user) => {
    const isSelected = selectedUsers.some(u => u.id === user.id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleAddMembers = async () => {
    if (!selectedUsers.length) {
      showNotification('Lütfen en az bir kullanıcı seçin.', 'error');
      return;
    }

    try {
      const userIds = selectedUsers.map(user => user.id);
      await clanService.addMembersToClan(selectedClan.id, userIds);

      // Üye listesini güncelle
      const updatedMembers = await clanBossService.getClanMembers(selectedClan.id);
      setClanMembers(updatedMembers);

      setSelectedUsers([]);
      setShowAddMemberModal(false);
      showNotification('Kullanıcılar clana başarıyla eklendi!', 'success');
    } catch (error) {
      console.error('Error adding members:', error);
      showNotification('Kullanıcılar eklenirken hata oluştu.', 'error');
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Kullanıcıyı klandan çıkarma fonksiyonu (onay sonrası)
  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      await clanService.removeMemberFromClan(memberToRemove.clanId, memberToRemove.userId);

      // Üye listesini yenile
      const updatedMembers = await clanBossService.getClanMembers(memberToRemove.clanId);
      setClanMembers(updatedMembers);

      // Modal'ı kapat
      setShowRemoveConfirm(false);
      setMemberToRemove(null);

      showNotification('Üye klandan çıkarıldı', 'success');
    } catch (error) {
      console.error('Üye çıkarma hatası:', error);
      showNotification(error.message, 'error');
    }
  };

  // Periyodik olarak mesajları kontrol et (Polling)
  useEffect(() => {
    let interval;
    if (activeTab === 'messages' && selectedClan) {
      interval = setInterval(() => {
        fetchClanMessages(messageFilters, true);
      }, 5000); // 5 saniyede bir kontrol et
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, selectedClan, messageFilters]);

  // --- MESAJLAR ---
  const fetchClanMessages = async (filters = messageFilters, silent = false) => {
    if (!selectedClan) return;
    try {
      if (!silent) setIsLoading(true);
      const data = await clanService.getClanMessages(selectedClan.id, filters);
      setMessages(data);
    } catch (error) {
      console.error('Mesajlar yüklenemedi:', error);
      if (!silent) showNotification(error.message, 'error');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      await clanService.sendClanMessage(selectedClan.id, newMessage);
      setNewMessage('');
      // Mesaj gönderildikten hemen sonra listeyi yenile (sessizce)
      await fetchClanMessages(messageFilters, true);
    } catch (error) {
      console.error('Mesaj gönderilemedi:', error);
      showNotification(error.message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const getUserColor = (userId) => {
    const colors = [
      'text-blue-400', 'text-green-400', 'text-yellow-400', 'text-purple-400',
      'text-pink-400', 'text-indigo-400', 'text-cyan-400', 'text-orange-400'
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Clan Boss Functions
  const fetchClanBossRuns = async () => {
    try {
      setIsLoading(true);
      const runs = await clanService.getClanBossRuns(selectedClan.id);
      setClanBossRuns(runs);
    } catch (error) {
      console.error('Clan boss runlari yuklenemedi:', error);
      showNotification('Clan boss runlari yuklenirken hata olustu.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const itemsData = await itemService.getAllItems();
      // Sadece name kolonundaki verileri al
      const itemNames = itemsData.map(item => ({
        id: item.id,
        name: item.name
      }));
      setItems(itemNames);
    } catch (error) {
      console.error('Itemlar yüklenemedi:', error);
      // Hata durumunda mock data kullan
      const mockItems = [
        { id: 1, name: 'Rare Sword' },
        { id: 2, name: 'Magic Shield' },
        { id: 3, name: 'Golden Ring' },
        { id: 4, name: 'Dragon Scale' },
        { id: 5, name: 'Ancient Tome' }
      ];
      setItems(mockItems);
    }
  };

  const handleCreateRun = async () => {
    if (!runDate) {
      showNotification('Lütfen tarih seçin.', 'error');
      return;
    }

    try {
      const runData = {
        date: runDate,
        participants: selectedParticipants.map(p => p.user_id),
        drops: drops.map(d => ({ itemId: d.item_id, quantity: d.quantity }))
      };

      await clanService.createClanBossRun(selectedClan.id, runData);
      showNotification('Boss run başarıyla oluşturuldu!', 'success');
      setShowCreateRunModal(false);
      resetRunForm();
      fetchClanBossRuns();
    } catch (error) {
      console.error('Boss run oluşturulamadı:', error);
      showNotification(error.message || 'Boss run oluşturulurken hata oluştu.', 'error');
    }
  };

  const resetRunForm = () => {
    setRunDate('');
    setSelectedParticipants([]);
    setDrops([]);
    setNewDropItem('');
    setNewDropQuantity(1);
    setShowItemDropdown(false);
  };

  const handleViewRunDetails = async (run) => {
    try {
      const runDetails = await clanService.getClanBossRunDetails(run.id);
      setSelectedRun(runDetails);
      setShowRunDetailModal(true);
    } catch (error) {
      console.error('Run detayları yüklenemedi:', error);
      showNotification('Run detayları yüklenirken hata oluştu.', 'error');
    }
  };

  const handleUpdatePaymentStatus = async (participantUserId, isPaid) => {
    try {
      await clanService.updateParticipantPayStatus(selectedRun.id, participantUserId, isPaid);
      showNotification('Ödeme durumu güncellendi.', 'success');
      // Refresh run details
      const updatedRun = await clanService.getClanBossRunDetails(selectedRun.id);
      setSelectedRun(updatedRun);
    } catch (error) {
      console.error('Ödeme durumu güncellenemedi:', error);
      showNotification('Ödeme durumu güncellenirken hata oluştu.', 'error');
    }
  };

  const handleRemoveSelfFromRun = async (runId) => {
    try {
      await clanService.removeSelfFromRun(runId);
      showNotification("Run'dan ayrildiniz.", 'success');
      setShowRunDetailModal(false);
      fetchClanBossRuns();
    } catch (error) {
      console.error("Run'dan ayrilamadi:", error);
      showNotification("Run'dan ayrilirken hata olustu.", 'error');
    }
  };

  const handleRemoveParticipantFromRun = async (runId, participantUserId) => {
    try {
      await clanService.removeParticipantFromRun(runId, participantUserId);
      showNotification("Katılımcı run'dan çıkarıldı.", 'success');
      // Refresh the selected run data to reflect the change
      const updatedRun = await clanService.getClanBossRunById(runId);
      setSelectedRun(updatedRun);
      fetchClanBossRuns(); // Also refresh the list
    } catch (error) {
      console.error("Katılımcı run'dan çıkarılamadı:", error);
      showNotification(`Katılımcı run'dan çıkarılırken hata oluştu: ${error.message}`, 'error');
    }
  };

  const handleDeleteRun = async (runId) => {
    try {
      await clanService.deleteClanBossRun(runId);
      showNotification('Boss run silindi.', 'success');
      setShowRunDetailModal(false);
      fetchClanBossRuns();
    } catch (error) {
      console.error('Boss run silinemedi:', error);
      showNotification('Boss run silinirken hata oluştu.', 'error');
    }
  };

  const addDrop = () => {
    if (newDropItem && newDropQuantity > 0) {
      const item = items.find(i => i.name.toLowerCase() === newDropItem.toLowerCase());
      if (item) {
        setDrops([...drops, { item_id: item.id, item_name: item.name, quantity: newDropQuantity }]);
        setNewDropItem('');
        setNewDropQuantity(1);
        setShowItemDropdown(false);
      }
    }
  };

  const removeDrop = (index) => {
    setDrops(drops.filter((_, i) => i !== index));
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(newDropItem.toLowerCase())
  );

  // Üye çıkarma işlemini başlat (onay modalını aç)
  const startRemoveMember = (clanId, userId, username) => {
    setMemberToRemove({
      clanId,
      userId,
      username
    });
    setContextMenu({ ...contextMenu, visible: false }); // Menüyü kapat
    setShowRemoveConfirm(true);
  };

  // Menü açma/kapama
  const handleMemberClick = (e, member, clanId) => {
    e.preventDefault();
    e.stopPropagation();

    // Leader kullanıcıları koru
    if (member.role === 'leader') {
      showNotification('Lider kullanıcıları clandan çıkaramazsınız', 'error');
      return;
    }

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      member: { ...member, clanId }
    });
  };

  // Menü dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  // Clan dashboard view - klan üyelerini listeleme
  const renderClanDashboard = (clan) => {
    console.log('[CLAN] renderClanDashboard called');
    console.log('[CLAN] clanMembers:', clanMembers);
    console.log('[CLAN] clanMembers length:', clanMembers.length);

    if (clanMembers.length === 0) {
      console.log('[CLAN] No members to display');
      return (
        <div className="text-center py-8">
          <div>Klan üyeleri yükleniyor...</div>
          <div className="text-sm text-gray-500 mt-2">
            Eğer bu mesaj uzun süre kalırsa, klana üye eklemeyi deneyin.
          </div>
        </div>
      );
    }

    console.log('[CLAN] Rendering', clanMembers.length, 'members');

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Klan Üyeleri</h3>
          <button
            onClick={() => setShowAddMemberModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={16} />
            Üye Ekle
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clanMembers.map((member) => (
            <div
              key={member.user_id}
              className="bg-white rounded-lg p-4 shadow border hover:shadow-lg transition-shadow cursor-pointer"
              onClick={(e) => {
                console.log('[CLAN] Card clicked for:', member.display_name || member.username);
                console.log('[CLAN] Member role:', member.role);

                // Leader kullanıcıları koru
                if (member.role === 'leader') {
                  showNotification('Lider kullanıcıları clandan çıkaramazsınız', 'error');
                  return;
                }

                // Sadece kartın boş alanına tıklandığında menü aç
                if (e.target === e.currentTarget || e.target.closest('.member-menu')) return;

                console.log('[CLAN] Starting remove process for:', member.display_name || member.username);
                startRemoveMember(clan.id, member.user_id, member.display_name || member.username);
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{member.display_name || member.username}</div>
                  <div className="text-sm text-gray-500 capitalize">{member.role}</div>
                  <div className="text-xs text-gray-400">Katılma: {new Date(member.joined_at).toLocaleDateString()}</div>
                </div>
                {member.role !== 'leader' && (
                  <div className="member-menu relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('[CLAN] Remove button clicked for:', member.display_name || member.username);
                        startRemoveMember(clan.id, member.user_id, member.display_name || member.username);
                      }}
                      className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-full transition-colors border-2 border-red-300 bg-red-50 font-bold"
                      title="Üyeyi çıkar"
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Liste Görünümü
  if (currentView === 'list') {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Crown className="text-yellow-500" size={36} />
              Clan
            </h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold transition-all shadow-lg"
            >
              <Plus size={20} />
              Yeni Clan Oluştur
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
            {/* Oluşturduğum Clan */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-700 pb-2">
                <Crown size={24} className="text-yellow-500" />
                Oluşturduğum Clan
              </h2>

              {myClans.length === 0 ? (
                <div className="bg-gray-800/50 rounded-xl border border-gray-700 border-dashed p-10 text-center text-gray-500">
                  Henüz bir klan oluşturmadınız.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {myClans.map(clan => (
                    <div
                      key={clan.id}
                      className="bg-gray-800 hover:bg-gray-750 p-6 rounded-xl border border-gray-700 cursor-pointer transition-all hover:border-yellow-500/50 group"
                      onClick={() => handleViewClanDashboard(clan)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold text-white group-hover:text-yellow-400">[{clan.tag}] {clan.name}</h3>
                          <p className="text-gray-400 text-sm mt-2 line-clamp-1">{clan.description || 'Açıklama yok'}</p>
                        </div>
                        <div className="text-right bg-gray-900/50 px-4 py-2 rounded-lg">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Üye Sayısı</div>
                          <div className="text-xl font-black text-yellow-500">{clan.member_count}</div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center text-xs text-gray-500 italic">
                        Kod: {clan.id}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dahil Olduğum Clanlar */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-gray-700 pb-2">
                <Users size={24} className="text-blue-500" />
                Dahil Olduğum Clanlar
              </h2>

              {joinedClans.length === 0 ? (
                <div className="bg-gray-800/50 rounded-xl border border-gray-700 border-dashed p-10 text-center text-gray-500">
                  Herhangi bir klana katılmadınız.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {joinedClans.map(clan => (
                    <div
                      key={clan.id}
                      className="bg-gray-800 hover:bg-gray-750 p-6 rounded-xl border border-gray-700 cursor-pointer transition-all hover:border-blue-500/50"
                      onClick={() => handleViewClanDashboard(clan)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold text-white">[{clan.tag}] {clan.name}</h3>
                          <p className="text-gray-400 text-sm mt-2 line-clamp-1">{clan.description || 'Açıklama yok'}</p>
                        </div>
                        <div className="text-right bg-gray-900/50 px-4 py-2 rounded-lg">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Üye Sayısı</div>
                          <div className="text-xl font-black text-blue-500">{clan.member_count}</div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-700/50 flex justify-between items-center">
                        <span className="text-xs text-gray-500">Rol: {clan.user_role}</span>
                        <span className="text-xs text-gray-500">Kod: {clan.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Create Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-gray-800 w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
                  <h3 className="text-xl font-bold text-white">Yeni Clan Oluştur</h3>
                  <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white transition">
                    <X size={24} />
                  </button>
                </div>
                <div className="p-8 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Klan Adı</label>
                    <input
                      type="text"
                      value={clanName}
                      onChange={(e) => setClanName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none transition"
                      placeholder="Görkemli bir isim seçin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Açıklama</label>
                    <textarea
                      value={clanDescription}
                      onChange={(e) => setClanDescription(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none transition resize-none"
                      placeholder="Klanınızın amacını belirtin"
                      rows="4"
                    ></textarea>
                  </div>
                </div>
                <div className="p-6 bg-gray-900/50 border-t border-gray-700 flex gap-3">
                  <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition">İptal</button>
                  <button onClick={handleCreateClan} className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold transition shadow-lg">Klanı Kur</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Dashboard / Yönetim Görünümü
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('list')}
              className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"
            >
              <ArrowRight className="rotate-180" size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">
                {selectedClan?.name} <span className="text-yellow-500 font-light ml-2">[{selectedClan?.tag}]</span>
              </h1>
              <div className="text-gray-500 text-xs mt-1 font-mono">CLAN KODU: {selectedClan?.id}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedClan?.owner_id === uid && activeTab === 'members' && (
              <button
                onClick={() => {
                  fetchAvailableUsers();
                  setShowAddMemberModal(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold transition-all shadow-lg"
              >
                <UserPlus size={20} />
                Üye Ekle
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-gray-800/50 p-1 rounded-xl mb-8 border border-gray-700 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'members'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
          >
            <Users size={18} />
            Clan Üyeleri
          </button>
          <button
            onClick={() => setActiveTab('boss')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'boss'
              ? 'bg-red-600 text-white shadow-lg'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
          >
            <Sword size={18} />
            Clan Boss
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'bank'
              ? 'bg-yellow-600 text-white shadow-lg'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
          >
            <Database size={18} />
            Clan Bankası
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'messages'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
          >
            <MessageSquare size={18} />
            Clan Mesajları
          </button>
        </div>

        {activeTab === 'members' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Üye Listesi */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-gray-700 bg-gray-800/80 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users size={20} className="text-blue-500" />
                    Clan Üyeleri
                  </h2>
                  <span className="bg-blue-900/50 text-blue-400 text-xs px-3 py-1 rounded-full font-bold">
                    {clanMembers.length} Üye
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-900/30 text-left text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                        <th className="px-6 py-4 border-b border-gray-700/50">Üye Bilgisi</th>
                        <th className="px-6 py-4 border-b border-gray-700/50">Rol</th>
                        <th className="px-6 py-4 border-b border-gray-700/50">Katılma Tarihi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {clanMembers.map(member => (
                        <tr
                          key={member.user_id}
                          className="hover:bg-gray-700/30 transition cursor-pointer select-none group"
                          onClick={(e) => handleMemberClick(e, member, selectedClan.id)}
                        >
                          <td className="px-6 py-4">
                            <div className="font-bold text-white group-hover:text-blue-400 transition-colors">
                              {member.nickname || member.display_name || member.username}
                              {member.user_id === uid && <span className="ml-2 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">SİZ</span>}
                            </div>
                            <div className="text-xs text-gray-500">@{member.nickname || member.username}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${member.role === 'leader' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-gray-900/50 text-gray-400'
                              }`}>
                              {member.role === 'leader' ? 'Lider' : 'Üye'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(member.joined_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Yan Panel */}
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <AlertCircle size={18} className="text-blue-500" />
                  Klan Hakkında
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {selectedClan?.description || 'Bu klan için henüz bir açıklama girilmemiş.'}
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
                <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">İstatistikler</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Kuruluş</span>
                    <span className="text-white font-mono">{new Date(selectedClan?.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Seviye</span>
                    <span className="text-yellow-500 font-bold">LVL 1</span>
                  </div>
                  <div className="pt-2 border-t border-gray-700/50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Klan Bakiyesi</span>
                      <span className="text-green-500 font-bold font-mono">0 Gold</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clan Boss Tab */}
        {activeTab === 'boss' && (
          <div className="space-y-6">
            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
                <div className="text-2xl font-bold text-red-500">{clanBossRuns.length}</div>
                <div className="text-sm text-gray-400">Toplam Run</div>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
                <div className="text-2xl font-bold text-green-500">
                  {clanBossRuns.reduce((sum, run) => sum + (run.participant_count || 0), 0)}
                </div>
                <div className="text-sm text-gray-400">Toplam Katılımcı</div>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {clanBossRuns.reduce((sum, run) => sum + (run.drop_count || 0), 0)}
                </div>
                <div className="text-sm text-gray-400">Toplam Drop</div>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {clanBossRuns.reduce((sum, run) => sum + (run.paid_count || 0), 0)}
                </div>
                <div className="text-sm text-gray-400">Ödenen Katılım</div>
              </div>
            </div>

            {/* Header with Create Button */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sword className="text-red-500" size={24} />
                Klan Boss Run'ları
              </h2>
              <button
                onClick={() => {
                  fetchItems();
                  // Otomatik olarak oluşturanı seç
                  const creator = clanMembers.find(m => m.user_id === uid);
                  if (creator) {
                    setSelectedParticipants([{
                      user_id: creator.user_id,
                      username: creator.nickname || creator.username,
                      main_character: creator.main_character || 'Bilinmeyen'
                    }]);
                  }
                  setShowCreateRunModal(true);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all shadow-lg"
              >
                <Plus size={16} />
                Yeni Run Ekle
              </button>
            </div>

            {/* Runs List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {isLoading ? (
                <div className="col-span-2 text-center py-12 text-gray-500">
                  Yükleniyor...
                </div>
              ) : clanBossRuns.length === 0 ? (
                <div className="col-span-2 bg-gray-800 rounded-2xl border border-gray-700 p-12 text-center">
                  <Sword size={48} className="mx-auto text-gray-600 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Henüz Run Bulunmuyor</h3>
                  <p className="text-gray-500 mb-6">İlk klan boss run'unuzu oluşturmak için "Yeni Run Ekle" butonuna tıklayın.</p>
                  <button
                    onClick={() => {
                      fetchItems();
                      const creator = clanMembers.find(m => m.user_id === uid);
                      if (creator) {
                        setSelectedParticipants([{
                          user_id: creator.user_id,
                          username: creator.nickname || creator.username,
                          main_character: creator.main_character || 'Bilinmeyen'
                        }]);
                      }
                      setShowCreateRunModal(true);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg"
                  >
                    İlk Run'ı Oluştur
                  </button>
                </div>
              ) : (
                clanBossRuns.map(run => (
                  <div
                    key={run.id}
                    className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-red-500/50 transition-all cursor-pointer"
                    onClick={() => handleViewRunDetails(run)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-white">{run.boss_name}</h3>
                        <div className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                          <Calendar size={14} />
                          {new Date(run.run_date).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Katılımcı</div>
                        <div className="font-bold text-blue-500">{run.participant_count || 0}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm mb-3">
                      <div className="flex items-center gap-1 text-gray-400">
                        <Coins size={14} />
                        Drop: {run.drop_count || 0}
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <UserCheck size={14} />
                        Ödenen: {run.paid_count || 0}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 border-t border-gray-700 pt-2">
                      Oluşturan: {run.creator_main_character || run.creator_nickname || 'Bilinmeyen'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-20 text-center shadow-xl">
            <Database size={64} className="mx-auto text-yellow-500 mb-6 opacity-20" />
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">Clan Bankası</h3>
            <p className="text-gray-500 max-w-md mx-auto">Klan ortak kasası, item paylaşımı ve bakiye yönetimi çok yakında aktif edilecek.</p>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
            {/* Filter Sidebar */}
            <div className="lg:col-span-1 bg-gray-800 rounded-2xl border border-gray-700 p-6 flex flex-col gap-6 shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Mesaj Filtrele</h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">İçerik</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                      <input
                        type="text"
                        placeholder="Mesajlarda ara..."
                        value={messageFilters.text}
                        onChange={(e) => setMessageFilters({ ...messageFilters, text: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Gönderen</label>
                    <input
                      type="text"
                      placeholder="Kullanıcı adı..."
                      value={messageFilters.sender}
                      onChange={(e) => setMessageFilters({ ...messageFilters, sender: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Başlangıç</label>
                    <input
                      type="date"
                      value={messageFilters.startDate}
                      onChange={(e) => setMessageFilters({ ...messageFilters, startDate: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Bitiş</label>
                    <input
                      type="date"
                      value={messageFilters.endDate}
                      onChange={(e) => setMessageFilters({ ...messageFilters, endDate: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-auto space-y-2">
                <button
                  onClick={() => fetchClanMessages()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 font-bold transition shadow-lg active:scale-95"
                >
                  Uygula
                </button>
                <button
                  onClick={() => {
                    const reset = { text: '', sender: '', startDate: '', endDate: '' };
                    setMessageFilters(reset);
                    fetchClanMessages(reset);
                  }}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg py-2.5 font-bold transition"
                >
                  Sıfırla
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-3 bg-gray-800 rounded-2xl border border-gray-700 flex flex-col shadow-xl overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-700 bg-gray-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600/20 rounded-full flex items-center justify-center text-indigo-500">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white tracking-tight">Klan Sohbeti</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Son 50 Mesaj</p>
                  </div>
                </div>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-gray-900/40">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                    <MessageSquare size={48} className="mb-4" />
                    <p className="text-sm italic">Henüz mesaj yok veya filtreye uygun sonuç bulunamadı.</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = msg.sender_id === uid;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] ${isMe ? 'bg-indigo-600/90' : 'bg-gray-800'} rounded-2xl px-4 py-2 shadow-lg border ${isMe ? 'border-indigo-500/50' : 'border-gray-700'}`}>
                          <div className={`text-[10px] font-black mb-1 uppercase tracking-tighter flex justify-between gap-4 ${isMe ? 'text-indigo-200' : getUserColor(msg.sender_id)}`}>
                            <span>{isMe ? 'Siz' : (msg.sender_display_name || 'Bilinmeyen')}</span>
                          </div>
                          <div className="text-sm text-white break-words leading-relaxed">
                            {msg.text}
                          </div>
                          <div className={`text-[9px] mt-1 ${isMe ? 'text-indigo-200/70' : 'text-gray-500'} font-medium text-right`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 bg-gray-800/80 border-t border-gray-700 flex gap-3">
                <input
                  type="text"
                  placeholder="Mesajınızı yazın..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isSending}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95"
                >
                  <ArrowRight className="-rotate-180" size={20} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Member Add Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-gray-800 w-full max-w-2xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Yeni Üyeleri Seçin</h3>
                <button onClick={() => setShowAddMemberModal(false)} className="text-gray-400 hover:text-white transition">
                  <X size={24} />
                </button>
              </div>

              <div className="p-4 bg-gray-900/50 border-b border-gray-700">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:ring-2 focus:ring-green-500 transition"
                    placeholder="Username veya nickname ile ara..."
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {!filteredUsers || filteredUsers.length === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                    {searchTerm ? 'Aramanızla eşleşen uygun kullanıcı bulunamadı.' : 'Clana eklenebilecek (username tanımlı) kullanıcı bulunamadı.'}
                  </div>
                ) : (
                  filteredUsers.map(user => {
                    const isSelected = selectedUsers.some(u => u.id === user.id);
                    return (
                      <div
                        key={user.id}
                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${isSelected
                          ? 'bg-green-600/20 border-green-500 ring-1 ring-green-500'
                          : 'bg-gray-900 border-gray-700 hover:border-gray-500 hover:bg-gray-850'
                          }`}
                        onClick={() => toggleUserSelection(user)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isSelected ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
                              }`}>
                              {(user.nickname || user.username || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white">{user.nickname || 'İsimsiz Oyuncu'}</div>
                              <div className="text-xs text-gray-500">@{user.username}</div>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-green-500 border-green-500' : 'border-gray-600'
                            }`}>
                            {isSelected && <X size={14} className="text-white" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-6 bg-gray-900/50 border-t border-gray-700">
                {selectedUsers.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {selectedUsers.map(user => (
                      <div key={user.id} className="bg-green-500 text-white rounded-full px-3 py-1 text-xs flex items-center gap-2 font-bold shadow-md">
                        {user.nickname}
                        <button onClick={(e) => { e.stopPropagation(); toggleUserSelection(user); }} className="hover:text-black">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setShowAddMemberModal(false)} className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition">İptal</button>
                  <button
                    disabled={selectedUsers.length === 0}
                    onClick={handleAddMembers}
                    className={`flex-1 px-4 py-3 rounded-lg font-bold transition shadow-lg ${selectedUsers.length > 0
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    {selectedUsers.length > 0 ? `${selectedUsers.length} Oyuncuyu Ekle` : 'Seçim Yapın'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Context Menu */}
        {contextMenu.visible && (
          <div
            className="fixed z-[100] bg-gray-800 border border-gray-700 rounded-lg shadow-2xl py-2 min-w-[160px] animate-in fade-in zoom-in duration-100"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
              transform: 'translate(-10%, -10%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2 border-b border-gray-700 mb-1">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">İşlemler</div>
              <div className="text-sm font-bold text-white truncate">{contextMenu.member?.display_name || contextMenu.member?.username}</div>
            </div>

            <button
              className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-red-600/20 hover:text-red-400 flex items-center gap-3 transition-colors group"
              onClick={() => startRemoveMember(contextMenu.member.clanId, contextMenu.member.user_id, contextMenu.member.display_name || contextMenu.member.username)}
            >
              <X size={16} className="text-gray-500 group-hover:text-red-400" />
              Clandan Çıkar
            </button>

            <button
              className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-700 hover:text-white cursor-not-allowed flex items-center gap-3 transition-colors"
              disabled
            >
              <Search size={16} />
              Rapor
            </button>

            <button
              className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-700 hover:text-white cursor-not-allowed flex items-center gap-3 transition-colors"
              disabled
            >
              <Users size={16} />
              Mesaj Gönder
            </button>
          </div>
        )}

        {/* Create Clan Boss Run Modal */}
        {showCreateRunModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[120] p-4 backdrop-blur-sm">
            <div className="bg-gray-800 w-full max-w-5xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sword className="text-red-500" size={20} />
                  Yeni Klan Boss Run
                </h3>
                <button 
                  onClick={() => {
                    setShowCreateRunModal(false);
                    resetRunForm();
                  }} 
                  className="text-gray-400 hover:text-white transition"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Compact Boss Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Boss Name - Fixed */}
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Boss Adı</label>
                    <div className="text-white font-bold bg-gray-800 px-2 py-1 rounded border border-gray-600 text-sm">
                      Shallow Fever
                    </div>
                  </div>

                  {/* Date Selection */}
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Tarih</label>
                    <input
                      type="date"
                      value={runDate}
                      onChange={(e) => setRunDate(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:ring-1 focus:ring-red-500 outline-none transition"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                {/* Participants Section */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-400">Katılımcılar ({selectedParticipants.length})</label>
                    <button
                      onClick={() => setShowParticipantModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-bold transition flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Katılımcı Ekle
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedParticipants.map((participant, index) => (
                      <div key={participant.user_id} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                        <div>
                          <div className="font-medium text-white">{participant.nickname || participant.username}</div>
                          <div className="text-sm text-gray-400">{participant.main_character}</div>
                        </div>
                        {participant.user_id !== uid && (
                          <button
                            onClick={() => setSelectedParticipants(selectedParticipants.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-400 p-1"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    {selectedParticipants.length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        Henüz katılımcı eklenmedi
                      </div>
                    )}
                  </div>
                </div>

                {/* Drops Section */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-400">Droplar</label>
                    <button
                      onClick={addDrop}
                      disabled={!newDropItem || newDropQuantity <= 0}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-1 rounded-lg text-sm font-bold transition flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Ekle
                    </button>
                  </div>
                  
                  {/* Add New Drop */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Item</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={14} />
                        <input
                          type="text"
                          value={newDropItem}
                          onChange={(e) => {
                            setNewDropItem(e.target.value);
                            setShowItemDropdown(e.target.value.length > 0);
                          }}
                          onFocus={() => setShowItemDropdown(newDropItem.length > 0)}
                          onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)}
                          placeholder="Item ara..."
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white focus:ring-2 focus:ring-green-500 outline-none transition"
                        />
                        {showItemDropdown && (
                          <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg mt-1 max-h-40 overflow-y-auto z-50 shadow-xl">
                            {filteredItems.slice(0, 15).map(item => (
                              <div
                                key={item.id}
                                className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm flex items-center gap-2"
                                onClick={() => {
                                  setNewDropItem(item.name);
                                  setShowItemDropdown(false);
                                }}
                              >
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                {item.name}
                              </div>
                            ))}
                            {filteredItems.length === 0 && newDropItem && (
                              <div className="px-3 py-2 text-gray-500 text-sm italic">Eşleşen item bulunamadı</div>
                            )}
                            {filteredItems.length > 15 && (
                              <div className="px-3 py-2 text-gray-400 text-xs border-t border-gray-700">
                                İlk 15 sonuç gösteriliyor...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Adet</label>
                      <input
                        type="number"
                        value={newDropQuantity}
                        onChange={(e) => setNewDropQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-green-500 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Drops List */}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {drops.map((drop, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                        <div>
                          <div className="font-medium text-white">{drop.item_name}</div>
                          <div className="text-sm text-gray-400">Adet: {drop.quantity}</div>
                        </div>
                        <button
                          onClick={() => removeDrop(index)}
                          className="text-red-500 hover:text-red-400 p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {drops.length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        Henüz drop eklenmedi
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-900/50 border-t border-gray-700 flex gap-3">
                <button 
                  onClick={() => {
                    setShowCreateRunModal(false);
                    resetRunForm();
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition"
                >
                  İptal
                </button>
                <button 
                  onClick={handleCreateRun}
                  disabled={!runDate}
                  className={`flex-1 px-4 py-3 rounded-lg font-bold transition shadow-lg ${runDate
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  Run Oluştur
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Run Detail Modal */}
        {showRunDetailModal && selectedRun && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[130] p-4 backdrop-blur-sm">
            <div className="bg-gray-800 w-full max-w-4xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sword className="text-red-500" size={20} />
                  {selectedRun.boss_name} - Detaylar
                </h3>
                <button 
                  onClick={() => setShowRunDetailModal(false)} 
                  className="text-gray-400 hover:text-white transition"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Run Info */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                  <h4 className="font-bold text-white mb-3">Run Bilgileri</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-400">Tarih</div>
                      <div className="font-medium text-white">{new Date(selectedRun.run_date).toLocaleDateString('tr-TR')}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Oluşturan</div>
                      <div className="font-medium text-white">{selectedRun.creator_nickname || selectedRun.creator_username || 'Bilinmeyen'}</div>
                    </div>
                  </div>
                </div>

                {/* Participants Section */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-white">Katılımcılar ({selectedRun.participants?.length || 0})</h4>
                    <div className="flex gap-2">
                      <div className="text-sm text-gray-400">
                        Ödenen: {selectedRun.participants?.filter(p => p.is_paid).length || 0}
                      </div>
                      <div className="text-sm text-gray-400">
                        Bekleyen: {selectedRun.participants?.filter(p => !p.is_paid).length || 0}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedRun.participants?.map(participant => (
                      <div key={participant.user_id} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                        <div>
                          <div className="font-bold text-lg text-white">
                            {participant.user_id === uid 
                              ? (userData.profile?.mainCharacter || participant.nickname || participant.main_character || participant.username)
                              : (participant.nickname || participant.main_character || participant.username)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Katılım: {new Date(participant.joined_at).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {participant.user_id === uid && selectedRun.created_by === uid && (
                            <button
                              onClick={() => handleRemoveSelfFromRun(selectedRun.id)}
                              className="text-red-500 hover:text-red-400 text-sm flex items-center gap-1 px-2 py-1 bg-red-900/20 rounded"
                            >
                              <UserX size={14} />
                              Run'dan Ayrıl
                            </button>
                          )}
                          {(selectedRun.created_by === uid || clanMembers.find(m => m.user_id === uid)?.role === 'leader') && (
                            <>
                              <button
                                onClick={() => handleUpdatePaymentStatus(participant.user_id, !participant.is_paid)}
                                className={`px-3 py-1 rounded text-sm font-bold transition ${participant.is_paid
                                  ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                                  : 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50'
                                  }`}
                              >
                                {participant.is_paid ? 'Ödendi' : 'Ödenmedi'}
                              </button>
                              {participant.user_id !== uid && (
                                <button
                                  onClick={() => handleRemoveParticipantFromRun(selectedRun.id, participant.user_id)}
                                  className="text-red-500 hover:text-red-400 text-sm flex items-center gap-1 px-2 py-1 bg-red-900/20 rounded"
                                  title={`${participant.nickname || participant.username} adlı kullanıcıyı listeden çıkar`}
                                >
                                  <UserX size={14} />
                                  Çıkar
                                </button>
                              )}
                            </>
                          )}
                          {!(selectedRun.created_by === uid || clanMembers.find(m => m.user_id === uid)?.role === 'leader') && (
                            <span className={`px-3 py-1 rounded text-sm ${
                              participant.is_paid
                                ? 'bg-green-900/30 text-green-400'
                                : 'bg-yellow-900/30 text-yellow-400'
                              }`}>
                              {participant.is_paid ? 'Ödendi' : 'Ödenmedi'}
                            </span>
                          )}
                          {participant.is_paid ? (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!selectedRun.participants || selectedRun.participants.length === 0) && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        Katılımcı bulunmuyor
                      </div>
                    )}
                  </div>
                </div>

                {/* Drops Section */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                  <h4 className="font-bold text-white mb-3">Droplar ({selectedRun.drops?.length || 0})</h4>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedRun.drops?.map((drop, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                        <div>
                          <div className="font-medium text-white">{drop.item_name}</div>
                          <div className="text-sm text-gray-400">Adet: {drop.quantity}</div>
                          <div className="text-xs text-gray-500">

                          </div>
                        </div>
                        <div className="text-sm text-gray-400">
                          {new Date(drop.added_at).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                    ))}
                    {(!selectedRun.drops || selectedRun.drops.length === 0) && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        Drop bulunmuyor
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-900/50 border-t border-gray-700 flex justify-between gap-3">
                <div>
                  {(selectedRun.created_by === uid) && (
                    <button 
                      onClick={() => {
                        if (window.confirm('Bu run\'u silmek istediğinizden emin misiniz?')) {
                          handleDeleteRun(selectedRun.id);
                        }
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition flex items-center gap-2"
                    >
                      <X size={16} />
                      Run\'u Sil
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => setShowRunDetailModal(false)}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Participant Selection Modal */}
        {showParticipantModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[140] p-4 backdrop-blur-sm">
            <div className="bg-gray-800 w-full max-w-2xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="text-blue-500" size={20} />
                  Katılımcı Seç
                </h3>
                <button 
                  onClick={() => setShowParticipantModal(false)} 
                  className="text-gray-400 hover:text-white transition"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-2">
                  {clanMembers
                    .filter(member => member.user_id !== uid) // Kendi hariç diğer üyeleri göster
                    .map(member => {
                      const isSelected = selectedParticipants.some(p => p.user_id === member.user_id);
                      return (
                        <div 
                          key={member.user_id}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${isSelected
                            ? 'bg-blue-600/20 border-blue-500'
                            : 'bg-gray-900 border-gray-700 hover:border-gray-500'
                            }`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedParticipants(selectedParticipants.filter(p => p.user_id !== member.user_id));
                            } else {
                              setSelectedParticipants([
                                ...selectedParticipants,
                                {
                                  user_id: member.user_id,
                                  username: member.nickname || member.username,
                                  main_character: member.main_character || 'Bilinmeyen'
                                }
                              ]);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-white">{member.nickname || member.username}</div>
                              <div className="text-sm text-gray-400">{member.main_character || 'Bilinmeyen'}</div>
                            </div>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-500'
                              }`}>
                              {isSelected && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  
                  {clanMembers.filter(member => member.user_id !== uid).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Diğer klan üyesi bulunmuyor
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-900/50 border-t border-gray-700 flex justify-between gap-3">
                <div className="text-sm text-gray-400">
                  Seçilen: {selectedParticipants.length} katılımcı
                </div>
                <button 
                  onClick={() => setShowParticipantModal(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
                >
                  Tamam
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Member Confirmation Modal */}
        {showRemoveConfirm && memberToRemove && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[110] p-4 backdrop-blur-md">
            <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-700 shadow-2xl animate-in zoom-in duration-200">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center text-red-500 ring-4 ring-red-900/10">
                  <X size={32} />
                </div>
              </div>

              <h3 className="text-2xl font-black text-white mb-3 text-center uppercase tracking-tighter italic">Üyeyi Çıkar</h3>
              <p className="text-gray-400 mb-8 text-center text-sm leading-relaxed">
                <span className="text-white font-bold underline">[{memberToRemove.username}]</span> isimli üyeyi klandan çıkarmak istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowRemoveConfirm(false);
                    setMemberToRemove(null);
                  }}
                  className="flex-1 px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
                >
                  İPTAL
                </button>
                <button
                  onClick={confirmRemoveMember}
                  className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                >
                  <X size={20} />
                  ÇIKAR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClanPage;