import React, { useState, useEffect } from 'react';
import { Crown, Users, Plus, X, Search, Sword, Database, MessageSquare, AlertCircle, ArrowRight, UserPlus, Calendar, Coins, UserCheck, UserX, Tag, TrendingUp, BarChart2, PieChart as PieIcon, Wallet, UserMinus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { clanService } from '../services/clanService';
import { itemService } from '../services/api';
import clanBossService from '../services/clanBossService';
import clanBankService from '../services/clanBankService';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const ClanPage = ({ userData, uid, showNotification, showTooltip, hideTooltip }) => {
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
  const [bossFilters, setBossFilters] = useState({ itemName: '', playerName: '', date: '' });
  const [selectedRun, setSelectedRun] = useState(null);
  const [showCreateRunModal, setShowCreateRunModal] = useState(false);
  const [showRunDetailModal, setShowRunDetailModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [runDate, setRunDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [drops, setDrops] = useState([]);
  const [newDropItem, setNewDropItem] = useState('');
  const [newDropQuantity, setNewDropQuantity] = useState(1);
  const [items, setItems] = useState([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  // Clan Bank States
  const [bankData, setBankData] = useState({ balance: 0, items: [], role: 'member' });
  const [bankView, setBankView] = useState('grid'); // 'list' or 'grid'
  const [bankPage, setBankPage] = useState(1);
  const [bankSearch, setBankSearch] = useState('');
  const [showItemActionModal, setShowItemActionModal] = useState(false); // 'sell' or 'detail'
  const [itemToSell, setItemToSell] = useState(null);
  const [saleAmount, setSaleAmount] = useState('');
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [saleDate, setSaleDate] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showManualItemModal, setShowManualItemModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [soldItems, setSoldItems] = useState([]);
  const [showSoldItemsModal, setShowSoldItemsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [runToDelete, setRunToDelete] = useState(null);
  const [soldItemsView, setSoldItemsView] = useState('grid'); // 'list' or 'grid'

  // Helper: İtem ismine göre ikon yolunu oluşturur
  const getItemIcon = (itemName) => {
    if (!itemName) return null;
    try {
      // Enhancement seviyesini kaldır: "Divine Earring (+1)" -> "Divine Earring"
      const baseName = itemName.split(' (+')[0].split(' +')[0].trim();

      // Özel durumlar: Golden Bar ve Silver Bar (JPG uzantılı ve farklı isimlendirme)
      if (baseName === "Golden Bar") return '/ui_icons/Gold_Bar.JPG';
      if (baseName === "Silver Bar") return '/ui_icons/Silver_Bar.JPG';

      // Boşlukları alt tire ile değiştir
      const snakeName = baseName.replace(/ /g, '_');
      // İkon yolunu oluştur
      return `/ui_icons/Icon_Item_${snakeName}.png`;
    } catch (err) {
      console.error("Icon path error:", err);
      return null;
    }
  };

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

  // Tab değiştiğinde clan bankasını yükle
  useEffect(() => {
    if (activeTab === 'bank' && selectedClan) {
      fetchClanBank();
      fetchTransactions();
      fetchSoldItems();
    }
  }, [activeTab, selectedClan]);

  // Tab değiştiğinde rapor verilerini yükle
  useEffect(() => {
    if (activeTab === 'reports' && selectedClan) {
      fetchClanBossRuns();
      fetchSoldItems();
    }
  }, [activeTab, selectedClan]);

  const fetchSoldItems = async () => {
    try {
      if (!selectedClan) return;
      const data = await clanBankService.getSoldItems(selectedClan.id);
      setSoldItems(data);
    } catch (error) {
      console.error('Error fetching sold items:', error);
    }
  };

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

  // ACP State
  const [showACPModal, setShowACPModal] = useState(false);
  const [acpDonations, setAcpDonations] = useState([]); // [{ userId, amount }]
  const [dailyACPStats, setDailyACPStats] = useState({}); // { userId: amount }
  const [acpDate, setAcpDate] = useState(new Date().toISOString().split('T')[0]);
  const [acpHistory, setAcpHistory] = useState([]);
  const [acpView, setAcpView] = useState('add'); // 'add' or 'history'
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

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
      const members = await clanService.getClanMembers(clan.id);

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
      const updatedMembers = await clanService.getClanMembers(selectedClan.id);
      setClanMembers(updatedMembers);

      setSelectedUsers([]);
      setShowAddMemberModal(false);
      showNotification('Kullanıcılar clana başarıyla eklendi!', 'success');
    } catch (error) {
      console.error('Error adding members:', error);
      showNotification('Kullanıcılar eklenirken hata oluştu.', 'error');
    }
  };

  // ACP Functions
  const handleOpenACPModal = () => {
    // Initialize donation inputs for all members
    const initialDonations = clanMembers.map(m => ({
      userId: m.user_id,
      nickname: m.nickname || m.char_name || m.username,
      amount: ''
    }));
    setAcpDonations(initialDonations);
    setAcpDate(new Date().toISOString().split('T')[0]);
    setAcpView('add');
    setShowACPModal(true);
  };

  const fetchACPHistory = async () => {
    try {
      setIsHistoryLoading(true);
      const history = await clanService.getClanACPHistory(selectedClan.id);
      setAcpHistory(history);
    } catch (error) {
      console.error('ACP history error:', error);
      showNotification('Bağış geçmişi yüklenemedi.', 'error');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleDeleteACP = async (acpId) => {
    if (!window.confirm('Bu bağışı silmek istediğinizden emin misiniz?')) return;
    try {
      await clanService.deleteClanACP(selectedClan.id, acpId);
      showNotification('Bağış silindi.', 'success');
      fetchACPHistory();
      // Refresh members
      const updatedMembers = await clanService.getClanMembers(selectedClan.id);
      setClanMembers(updatedMembers);
    } catch (error) {
      showNotification('Bağış silinemedi.', 'error');
    }
  };

  const handleACPChange = (userId, value) => {
    setAcpDonations(prev => prev.map(d =>
      d.userId === userId ? { ...d, amount: value } : d
    ));
  };

  const submitACPDonations = async () => {
    const validDonations = acpDonations
      .filter(d => d.amount && !isNaN(d.amount) && parseInt(d.amount) > 0)
      .map(d => ({ userId: d.userId, amount: parseInt(d.amount) }));

    if (validDonations.length === 0) {
      showNotification('En az bir geçerli bağış girmelisiniz.', 'error');
      return;
    }

    try {
      await clanService.addClanACP(selectedClan.id, {
        donations: validDonations,
        date: acpDate
      });

      showNotification('ACP bağışları kaydedildi.', 'success');
      setShowACPModal(false);

      // Refresh members to show updated totals
      const updatedMembers = await clanService.getClanMembers(selectedClan.id);
      setClanMembers(updatedMembers);
    } catch (error) {
      console.error('ACP error:', error);
      showNotification('Bağışlar kaydedilirken hata oluştu.', 'error');
    }
  };

  // Fetch daily ACP when date changes in Run Modal
  useEffect(() => {
    if (showCreateRunModal && runDate && selectedClan) {
      const fetchDailyStats = async () => {
        try {
          const stats = await clanService.getDailyACP(selectedClan.id, runDate);
          setDailyACPStats(stats);
        } catch (error) {
          console.error('Daily ACP error:', error);
        }
      };
      fetchDailyStats();
    }
  }, [showCreateRunModal, runDate, selectedClan]);

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
      return itemNames; // Return the items so we can use them immediately
    } catch (error) {
      console.error('Itemlar yüklenemedi:', error);
      // Hata durumunda mock data kullan
      const mockItems = [
        { id: 1, name: 'Rare Sword' },
        { id: 2, name: 'Magic Shield' },
        { id: 3, name: 'Golden Ring' },
        { id: 4, name: 'Dragon Scale' },
        { id: 5, name: 'Ancient Tome' },
        { id: 2733, name: 'Golden Bar' },
        { id: 2734, name: 'Silver Bar' }
      ];
      setItems(mockItems);
      return mockItems;
    }
  };

  const handleCreateRun = async () => {
    if (!runDate) {
      showNotification('Lütfen tarih seçin.', 'error');
      return;
    }

    try {
      const processedDrops = drops.map(d => {
        let itemId = d.item_id;
        // Eğer ID yoksa (manuel ekleme durumu), listeden bulmaya çalış
        if (!itemId && items) {
          const matchedItem = items.find(i => i.name.toLowerCase() === d.item_name.toLowerCase());
          if (matchedItem) itemId = matchedItem.id;
        }
        return { itemId, quantity: d.quantity };
      }).filter(d => d.itemId); // ID'siz drop gönderme

      const runData = {
        date: runDate,
        participants: selectedParticipants.map(p => p.user_id),
        drops: processedDrops
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
    setRunDate(new Date().toISOString().split('T')[0]);
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

      // Banka bilgisini tazele ki "Sat" butonu veya ödemeler güncel kalsın
      if (selectedClan) {
        fetchClanBank();
        fetchTransactions();
      }

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

      // Banka bilgisini tazele (İptal durumunda iade yansımalı)
      fetchClanBank();
      fetchTransactions();

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
      setDeleteError(null); // Clear previous errors
      const result = await clanService.deleteClanBossRun(runId);

      // Show success message with balance info if available
      let successMessage = 'Boss run silindi.';
      if (result.balance_reversed && result.balance_reversed > 0) {
        successMessage += ` Bakiyeden ${result.formatted_balance} G geri alındı.`;
      }

      showNotification(successMessage, 'success');
      setShowDeleteConfirmModal(false);
      setShowRunDetailModal(false);
      setRunToDelete(null);
      fetchClanBossRuns();
    } catch (error) {
      console.error('Boss run silinemedi:', error);

      // Set error to be displayed in modal
      setDeleteError({
        message: error.message || 'Boss run silinirken hata oluştu.',
        details: error.details,
        payment_count: error.payment_count,
        total_paid: error.total_paid
      });
    }
  };

  const openDeleteConfirmation = (run) => {
    setRunToDelete(run);
    setDeleteError(null);
    setShowDeleteConfirmModal(true);
    setShowRunDetailModal(false); // Detay modalını kapat
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

  // --- BANKA ---
  const fetchClanBank = async () => {
    if (!selectedClan) return;
    try {
      const data = await clanBankService.getClanBank(selectedClan.id);
      setBankData(data);
    } catch (error) {
      console.error('Banka yüklenemedi:', error);
      showNotification('Banka bilgileri yüklenirken hata oluştu.', 'error');
    }
  };

  const fetchTransactions = async () => {
    if (!selectedClan) return;
    try {
      const data = await clanBankService.getTransactions(selectedClan.id);
      setTransactions(data);
    } catch (error) {
      console.error('İşlemler yüklenemedi:', error);
    }
  };

  const handleSellItem = async () => {
    if (!itemToSell || !saleAmount || saleQuantity < 1) {
      showNotification('Lütfen tüm alanları doldurun.', 'error');
      return;
    }
    try {
      const saleData = {
        clanId: selectedClan.id,
        itemId: itemToSell.id,
        quantity: saleQuantity,
        saleAmount: parseFloat(saleAmount),
        saleDate: saleDate || new Date()
      };
      await clanBankService.sellItem(saleData);
      showNotification('Satış başarıyla gerçekleştirildi.', 'success');
      setShowItemActionModal(false);
      setItemToSell(null);
      setSaleAmount('');
      setSaleQuantity(1);
      fetchClanBank();
      fetchTransactions();
      fetchSoldItems(); // Satılan itemleri de güncelle
      // Eğer bir run detayı açıksa onu da yenile
      if (selectedRun) {
        const updatedRun = await clanService.getClanBossRunDetails(selectedRun.id);
        setSelectedRun(updatedRun);
      }
    } catch (error) {
      console.error('Satış hatası:', error);
      showNotification(error.message, 'error');
    }
  };

  const handlePayParticipant = async () => {
    if (!paymentTarget || !paymentAmount) {
      showNotification('Lütfen tutar girin.', 'error');
      return;
    }
    try {
      const paymentData = {
        clanId: selectedClan.id,
        runId: selectedRun.id,
        participantUserId: paymentTarget.user_id,
        amount: parseFloat(paymentAmount),
        description: paymentDescription
      };
      await clanBankService.payParticipant(paymentData);
      showNotification('Ödeme yapıldı.', 'success');
      setShowPaymentModal(false);
      setPaymentTarget(null);
      setPaymentAmount('');
      setPaymentDescription('');
      fetchClanBank();
      fetchTransactions();
      // Run detaylarını yenile
      const updatedRun = await clanService.getClanBossRunDetails(selectedRun.id);
      setSelectedRun(updatedRun);
    } catch (error) {
      console.error('Ödeme hatası:', error);
      showNotification(error.message, 'error');
    }
  };

  const handleAddManualBankItem = async (itemName, quantity) => {
    try {
      await clanBankService.addManualItem({
        clanId: selectedClan.id,
        itemName,
        quantity
      });
      showNotification('İtem bankaya eklendi.', 'success');
      fetchClanBank();
    } catch (error) {
      showNotification('İtem eklenemedi.', 'error');
    }
  }

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

  const filteredBossRuns = clanBossRuns.filter(run => {
    const matchesItem = !bossFilters.itemName || (run.drops || []).some(d => (d.item_name || '').toLowerCase().includes(bossFilters.itemName.toLowerCase()));
    const matchesPlayer = !bossFilters.playerName || (run.participants || []).some(p =>
      (p.username || '').toLowerCase().includes(bossFilters.playerName.toLowerCase()) ||
      (p.main_character || '').toLowerCase().includes(bossFilters.playerName.toLowerCase()) ||
      (p.nickname || '').toLowerCase().includes(bossFilters.playerName.toLowerCase())
    );
    const matchesDate = !bossFilters.date || (run.run_date && new Date(run.run_date).toISOString().split('T')[0] === bossFilters.date);

    return matchesItem && matchesPlayer && matchesDate;
  });

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
  const renderReportsTab = () => {
    // 1. Data Calculation
    const totalRevenue = (clanBossRuns || []).reduce((sum, run) => sum + parseFloat(run.total_sold_amount || 0), 0);
    const totalPaid = (clanBossRuns || []).reduce((sum, run) => sum + parseFloat(run.total_paid_amount || 0), 0);

    const memberStats = {};
    (clanBossRuns || []).forEach(run => {
      const participants = run.participants || [];
      const runRevenue = parseFloat(run.total_sold_amount || 0);
      const sharePerPerson = participants.length > 0 ? Math.floor(runRevenue / participants.length) : 0;

      participants.forEach(p => {
        if (!memberStats[p.user_id]) {
          memberStats[p.user_id] = { id: p.user_id, name: p.nickname || p.main_character || p.username, runs: 0, earnings: 0, expected: 0 };
        }
        memberStats[p.user_id].runs += 1;
        memberStats[p.user_id].earnings += parseFloat(p.paid_amount || 0);
        memberStats[p.user_id].expected += sharePerPerson;
      });
    });

    const totalPending = Object.values(memberStats).reduce((sum, s) => sum + Math.max(0, s.expected - s.earnings), 0);
    const topParticipants = Object.values(memberStats).sort((a, b) => b.runs - a.runs).slice(0, 5);
    const topEarners = Object.values(memberStats).sort((a, b) => b.earnings - a.earnings).slice(0, 5);
    const avgContribution = clanMembers.length > 0 ? totalRevenue / clanMembers.length : 0;

    // Drop Stats
    const itemStats = {};
    let runsWithRealDrops = 0;

    (clanBossRuns || []).forEach(run => {
      const realDrops = (run.drops || []).filter(d => {
        const name = (d.item_name || '').toLowerCase();
        return !name.includes('silver bar') && !name.includes('golden bar') && !name.includes('bar');
      });
      if (realDrops.length > 0) runsWithRealDrops++;

      realDrops.forEach(d => {
        if (!itemStats[d.item_name]) itemStats[d.item_name] = 0;
        itemStats[d.item_name] += (parseInt(d.quantity) || 1);
      });
    });

    const dropChance = (clanBossRuns || []).length > 0 ? ((runsWithRealDrops / (clanBossRuns || []).length) * 100).toFixed(1) : "0.0";
    const totalDropsCount = Object.values(itemStats).reduce((a, b) => a + b, 0);
    const dropData = Object.entries(itemStats).map(([name, count]) => ({
      name,
      value: count,
      percentage: totalDropsCount > 0 ? ((count / totalDropsCount) * 100).toFixed(1) : 0
    })).sort((a, b) => b.value - a.value);

    // Time Analytics
    const sortedRuns = [...clanBossRuns].sort((a, b) => new Date(a.run_date) - new Date(b.run_date));
    let peakDropsDate = null;
    let maxDropsDay = 0;
    const dayStats = {};

    let longestDrySpell = 0;
    let drySpellRange = { start: null, end: null };
    let lastDropDate = null;

    sortedRuns.forEach(run => {
      const d = new Date(run.run_date).toLocaleDateString('tr-TR');
      const dropCount = (run.drops || []).length;
      dayStats[d] = (dayStats[d] || 0) + dropCount;
      if (dayStats[d] > maxDropsDay) {
        maxDropsDay = dayStats[d];
        peakDropsDate = d;
      }

      if (dropCount > 0) {
        if (lastDropDate) {
          const diff = (new Date(run.run_date) - lastDropDate) / (1000 * 60 * 60 * 24);
          if (diff > longestDrySpell) {
            longestDrySpell = diff;
            drySpellRange = { start: lastDropDate.toLocaleDateString('tr-TR'), end: d };
          }
        }
        lastDropDate = new Date(run.run_date);
      }
    });

    // Economy Growth (Cumulative)
    let cumulative = 0;
    const growthData = sortedRuns.map(run => {
      cumulative += parseFloat(run.total_sold_amount || 0);
      return {
        date: new Date(run.run_date).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
        total: cumulative
      };
    });

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Economy Growth Chart */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 flex flex-col h-[400px] shadow-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-500" />
              Klan Ekonomisi Büyüme Oranı
            </h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                  <ChartTooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Drop Distribution Chart */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 flex flex-col h-[400px] shadow-xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <PieIcon size={20} className="text-blue-500" />
              Drop Dağılım Yüzdeleri
            </h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dropData.slice(0, 6)}
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {dropData.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-xl group hover:border-emerald-500/30 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-emerald-600/20 rounded-lg flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <Wallet size={18} />
              </div>
              <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Toplam Gelir</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">{totalRevenue.toLocaleString('tr-TR')} <span className="text-emerald-500 text-xs">G</span></div>
          </div>

          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-xl group hover:border-blue-500/30 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <TrendingUp size={18} />
              </div>
              <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Drop Şansı</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">%{dropChance}</div>
          </div>

          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-xl group hover:border-indigo-500/30 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                <UserCheck size={18} />
              </div>
              <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Toplam Payout</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">{totalPaid.toLocaleString('tr-TR')} <span className="text-indigo-500 text-xs">G</span></div>
          </div>

          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-xl group hover:border-red-500/30 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-red-600/20 rounded-lg flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                <AlertCircle size={18} />
              </div>
              <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Kalan Borç</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">{totalPending.toLocaleString('tr-TR')} <span className="text-red-500 text-xs">G</span></div>
          </div>
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Top Earners */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2 uppercase italic tracking-tighter">
              <Crown size={20} className="text-yellow-500" />
              En Çok Kazananlar
            </h3>
            <div className="space-y-3">
              {topEarners.length > 0 ? topEarners.map((e, idx) => (
                <div key={e.id} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-xl border border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-black text-gray-400">
                      {idx + 1}
                    </div>
                    <span className="text-white font-bold">{e.name}</span>
                  </div>
                  <span className="text-yellow-500 font-mono font-black">{e.earnings.toLocaleString('tr-TR')} G</span>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-600 italic text-sm">Veri bulunmuyor.</div>
              )}
            </div>
          </div>

          {/* Most Active */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl">
            <h3 className="text-white font-bold mb-6 flex items-center gap-2 uppercase italic tracking-tighter">
              <Users size={20} className="text-indigo-500" />
              En Aktif Oyuncular
            </h3>
            <div className="space-y-3">
              {topParticipants.length > 0 ? topParticipants.map((p, idx) => (
                <div key={p.id} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-xl border border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-black text-gray-400">
                      {idx + 1}
                    </div>
                    <span className="text-white font-bold">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500 text-xs font-bold uppercase">Ort. Katkı: <span className="text-white">{(p.earnings / (p.runs || 1)).toFixed(0)}</span></span>
                    <span className="bg-indigo-600/20 text-indigo-400 px-2 py-0.5 rounded text-[10px] font-black uppercase">{p.runs} RUN</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-600 italic text-sm">Veri bulunmuyor.</div>
              )}
            </div>
          </div>
        </div>

        {/* Highlights & Time Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl">
            <h3 className="text-white font-bold mb-6 uppercase italic tracking-tighter flex items-center gap-2">
              <Calendar size={18} className="text-gray-500" />
              Zaman Analizleri
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-900/40 rounded-xl border border-gray-700/30">
                <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">En Yoğun Drop Dönemi</span>
                <span className="text-sm text-white font-black">{peakDropsDate || '-'}</span>
              </div>
              <div className="flex flex-col gap-2 p-4 bg-gray-900/40 rounded-xl border border-gray-700/30">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">En Uzun Dry Spell</span>
                  <span className="text-sm text-red-400 font-black">{longestDrySpell > 0 ? `${longestDrySpell.toFixed(0)} Gün` : '-'}</span>
                </div>
                {drySpellRange.start && (
                  <div className="text-[10px] text-gray-600 text-right uppercase font-bold">({drySpellRange.start} - {drySpellRange.end})</div>
                )}
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-900/40 rounded-xl border border-gray-700/30">
                <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">Genel Drop Şansı</span>
                <span className="text-sm text-blue-400 font-black">%{dropChance}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-900/40 rounded-xl border border-gray-700/30">
                <span className="text-sm text-gray-400 font-bold uppercase tracking-wider">Oyuncu Başı Ort. Katkı</span>
                <span className="text-sm text-emerald-400 font-black">{avgContribution.toLocaleString('tr-TR')} G</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl h-[260px] flex flex-col">
            <h3 className="text-white font-bold mb-6 uppercase italic tracking-tighter flex items-center gap-2">
              <Tag size={18} className="text-yellow-500" />
              Değerli Drop İstatistikleri
            </h3>
            <div className="flex-1 space-y-3 overflow-y-auto pr-2 no-scrollbar">
              {dropData.length > 0 ? dropData.slice(0, 10).map((d, i) => (
                <div key={i} className="flex justify-between items-center text-sm p-2 hover:bg-gray-700/20 rounded transition-colors border-b border-gray-700/30 last:border-0">
                  <span className="text-gray-400 flex items-center gap-2 font-bold">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    {d.name}
                  </span>
                  <div className="flex gap-4 items-center">
                    <span className="text-gray-600 font-black text-[10px]">%{d.percentage}</span>
                    <span className="text-white font-black">{d.value} ADET</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-600 italic text-sm">Drop verisi bulunmuyor.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

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
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'reports'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
          >
            <BarChart2 size={18} />
            Rapor
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
                        <th className="px-6 py-4 border-b border-gray-700/50 text-center">Puan</th>
                        <th className="px-6 py-4 border-b border-gray-700/50 text-center">Top. ACP</th>
                        <th className="px-6 py-4 border-b border-gray-700/50 text-right">İşlemler</th>
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
                            <div className="font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                              {member.nickname || member.display_name || member.username}
                              {member.user_id === uid && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">SİZ</span>}
                              {member.role === 'leader' && <Crown size={14} className="text-yellow-500" />}
                            </div>
                            <div className="text-xs text-gray-500">@{member.username}</div>
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
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex items-center justify-center px-2 py-1 bg-blue-900/20 text-blue-400 rounded-lg text-xs font-bold border border-blue-500/10 shadow-sm">
                              {member.participation_score || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex items-center justify-center px-2 py-1 bg-purple-900/20 text-purple-400 rounded-lg text-xs font-bold border border-purple-500/10 shadow-sm">
                              {(member.total_acp || 0).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {selectedClan.owner_id === uid && member.user_id !== uid && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startRemoveMember(selectedClan.id, member.user_id, member.username);
                                }}
                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition"
                                title="Klandan Çıkar"
                              >
                                <UserMinus size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {clanMembers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Henüz üye bulunmuyor.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {selectedClan.owner_id === uid && (
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={handleOpenACPModal}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition shadow-lg shadow-purple-900/20"
                  >
                    <Plus size={18} />
                    <span>ACP Bağış Ekle</span>
                  </button>
                  <button
                    onClick={() => {
                      fetchAvailableUsers();
                      setShowAddMemberModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition shadow-lg shadow-yellow-900/20"
                  >
                    <UserPlus size={18} />
                    <span>Üye Ekle</span>
                  </button>
                </div>
              )}
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
                  {clanBossRuns.reduce((sum, run) => sum + parseInt(run.participant_count || 0), 0)}
                </div>
                <div className="text-sm text-gray-400">Toplam Katılımcı</div>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {clanBossRuns.reduce((sum, run) => sum + parseInt(run.drop_count || 0), 0)}
                </div>
                <div className="text-sm text-gray-400">Toplam Drop</div>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {clanBossRuns.reduce((sum, run) => {
                    // Sadece katılımcı sayısı paylaşılan (is_paid=true olanların sayısı)
                    return sum + parseInt(run.paid_count || 0);
                  }, 0)}
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
                onClick={async () => {
                  const fetchedItems = await fetchItems();
                  // Otomatik olarak oluşturanı seç
                  const creator = clanMembers.find(m => m.user_id === uid);
                  if (creator) {
                    setSelectedParticipants([{
                      user_id: creator.user_id,
                      username: creator.nickname || creator.username,
                      main_character: creator.main_character || 'Bilinmeyen'
                    }]);
                  }

                  // Barları başlangıçta ekle (Görsel olarak)
                  const barItems = [
                    { name: 'Silver Bar', search: 'silver bar' },
                    { name: 'Golden Bar', search: 'golden bar' }
                  ];

                  const initialDrops = [];
                  barItems.forEach(bar => {
                    const matchedItem = (fetchedItems || items).find(i => (i.name || '').toLowerCase().includes(bar.search));
                    initialDrops.push({
                      item_id: matchedItem ? matchedItem.id : null,
                      item_name: matchedItem ? matchedItem.name : bar.name,
                      quantity: 1,
                      isGuaranteed: true
                    });
                  });
                  setDrops(initialDrops);

                  setRunDate(new Date().toISOString().split('T')[0]);
                  setShowCreateRunModal(true);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all shadow-lg"
              >
                <Plus size={16} />
                Yeni Run Ekle
              </button>
            </div>

            {/* Boss Filters Bar */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-end shadow-inner">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">İtem Ara</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                  <input
                    type="text"
                    placeholder="İtem adı..."
                    value={bossFilters.itemName}
                    onChange={(e) => setBossFilters(prev => ({ ...prev, itemName: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg py-1.5 pl-9 pr-4 text-sm text-white focus:border-red-500/50 outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">Oyuncu Ara</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                  <input
                    type="text"
                    placeholder="Oyuncu adı..."
                    value={bossFilters.playerName}
                    onChange={(e) => setBossFilters(prev => ({ ...prev, playerName: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg py-1.5 pl-9 pr-4 text-sm text-white focus:border-red-500/50 outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="w-full md:w-auto">
                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-widest">Tarih</label>
                <input
                  type="date"
                  value={bossFilters.date}
                  onChange={(e) => setBossFilters(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg py-1.5 px-4 text-sm text-white focus:border-red-500/50 outline-none transition-colors"
                />
              </div>
              {(bossFilters.itemName || bossFilters.playerName || bossFilters.date) && (
                <button
                  onClick={() => setBossFilters({ itemName: '', playerName: '', date: '' })}
                  className="text-gray-500 hover:text-white text-xs pb-2 underline transition-colors font-bold uppercase tracking-tighter"
                >
                  Sıfırla
                </button>
              )}
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
                filteredBossRuns.map(run => (
                  <div
                    key={run.id}
                    className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-red-500/50 transition-all cursor-pointer group"
                    onClick={() => handleViewRunDetails(run)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-white group-hover:text-red-400 transition-colors uppercase italic">{run.boss_name}</h3>
                        <div className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                          <Calendar size={14} />
                          {new Date(run.run_date).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-500 uppercase font-black">Katılımcı</div>
                        <div className="font-bold text-blue-500">{run.participant_count || 0}</div>
                      </div>
                    </div>

                    <div className="flex justify-between text-sm mb-3">
                      <div className="flex items-center gap-1 text-gray-400">
                        <Coins size={14} className="text-yellow-600" />
                        Drop: <span className="text-white font-mono ml-1">{run.drop_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <UserCheck size={14} className="text-green-600" />
                        Ödenen: <span className="text-white font-mono ml-1">{run.paid_count || 0}</span>
                      </div>
                    </div>

                    {/* Items Found Display */}
                    {run.drops && run.drops.length > 0 && (
                      <div className="mb-3 pt-2 border-t border-gray-700/50">
                        <div className="flex flex-wrap gap-1">
                          {run.drops.map((drop, idx) => (
                            <span key={idx} className="bg-yellow-900/20 text-yellow-500 border border-yellow-800/30 px-2 py-0.5 rounded text-[10px] font-bold">
                              {drop.item_name} {drop.quantity > 1 ? `x${drop.quantity}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-gray-500 border-t border-gray-700/30 pt-2 flex justify-between uppercase">
                      <span>Kurucu: <span className="text-gray-400">{run.creator_main_character || run.creator_nickname || 'Bilinmeyen'}</span></span>
                      {run.created_at && <span>{new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'bank' && (
          <div className="space-y-6">
            {/* Bank Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center text-yellow-500">
                  <Coins size={24} />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Klan Bakiyesi</div>
                  <div className="text-xl font-black text-white font-mono">
                    {Number(bankData.balance).toLocaleString('tr-TR')} <span className="text-yellow-500 text-sm">G</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-500">
                  <Database size={24} />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Bankadaki İtemler</div>
                  <div className="text-xl font-black text-white font-mono">{bankData.items?.length || 0}</div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center text-green-500">
                  <UserCheck size={24} />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Bekleyen Ödemeler</div>
                  <div className="text-xl font-black text-white font-mono">
                    {clanBossRuns.reduce((sum, run) => {
                      // Henüz tam ödeme almamış (is_paid = false) katılımcı sayısını hesapla
                      return sum + (parseInt(run.participant_count || 0) - parseInt(run.paid_count || 0));
                    }, 0)}
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center text-purple-500">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <div className="text-sm text-gray-400">Son İşlemler</div>
                  <div className="text-xl font-black text-white font-mono">{transactions.length}</div>
                </div>
              </div>
            </div>

            {/* View Toggle and Search */}
            <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <div className="flex items-center gap-4 w-full xl:w-auto">
                <div className="flex bg-gray-900 p-1 rounded-lg">
                  <button
                    onClick={() => setBankView('list')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${bankView === 'list' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Liste Görünümü
                  </button>
                  <button
                    onClick={() => setBankView('grid')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${bankView === 'grid' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Banka Görünümü
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSoldItemsModal(true)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 border border-gray-600 transition-all text-xs font-bold shadow"
                  >
                    <Tag className="text-yellow-400" size={14} />
                    Satılan İtemler
                  </button>
                  {(userData?.clanRole === 'leader' || userData?.role === 'owner') && (
                    <button
                      onClick={() => setShowManualItemModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 border border-blue-400 transition-all text-xs font-bold shadow"
                    >
                      <Plus size={14} />
                      Manuel İtem Ekle
                    </button>
                  )}
                </div>
              </div>

              <div className="relative w-full xl:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                <input
                  type="text"
                  placeholder="Banka içinde ara..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:border-yellow-500/50 outline-none transition"
                />
              </div>
            </div>

            {/* Bank Content */}
            {bankView === 'list' ? (
              <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-900/30 text-left text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                        <th className="px-6 py-4 border-b border-gray-700/50">İtem Adı</th>
                        <th className="px-6 py-4 border-b border-gray-700/50">Miktar</th>
                        <th className="px-6 py-4 border-b border-gray-700/50">Kazanılma Tarihi</th>
                        <th className="px-6 py-4 border-b border-gray-700/50">Asıl Sahibi</th>
                        <th className="px-6 py-4 border-b border-gray-700/50 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {(bankData.items || [])
                        .filter(item => item.item_name.toLowerCase().includes(bankSearch.toLowerCase()))
                        .map(item => (
                          <tr key={item.id} className="hover:bg-gray-700/30 transition group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-gray-900 border border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  <img
                                    src={getItemIcon(item.item_name)}
                                    alt=""
                                    className="w-full h-full object-contain"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                                  />
                                  <Database size={16} className="text-gray-700 hidden" />
                                </div>
                                <div>
                                  <div
                                    className="font-bold text-white group-hover:text-yellow-400 transition-colors cursor-help inline-block"
                                    onMouseEnter={(e) => { if (showTooltip) showTooltip(item, e); }}
                                    onMouseMove={(e) => { if (showTooltip) showTooltip(item, e); }}
                                    onMouseLeave={() => { if (hideTooltip) hideTooltip(); }}
                                  >
                                    {item.item_name}
                                  </div>
                                  {item.run_id && <div className="text-[10px] text-gray-500">RUN: {item.run_id}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-yellow-500 font-bold">x{item.quantity}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {new Date(item.timestamp).toLocaleDateString('tr-TR')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                              {item.user_id ? `@${item.user_id.substring(0, 8)}...` : '-'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {item.run_id ? (
                                <button
                                  onClick={() => handleViewRunDetails({ id: item.run_id })}
                                  className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs font-bold transition"
                                >
                                  Detay
                                </button>
                              ) : (
                                <span className="text-gray-600 text-[10px] uppercase font-bold">Manuel Ekleme</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      {bankData.items?.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-20 text-center text-gray-500 italic">Banka şu an boş.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Grid View */}
                <div className="flex justify-center">
                  <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-2xl">
                    <div className="grid grid-cols-8 gap-1">
                      {Array.from({ length: 32 }).map((_, index) => {
                        const globalIndex = (bankPage - 1) * 32 + index;
                        const filteredItems = (bankData.items || []).filter(i => i.item_name.toLowerCase().includes(bankSearch.toLowerCase()));
                        const item = filteredItems[globalIndex];

                        return (
                          <div
                            key={index}
                            className={`w-16 h-16 rounded border border-gray-600/50 flex items-center justify-center relative transition-all shadow-inner overflow-hidden ${item ? 'bg-gray-900 border-yellow-500/30 hover:bg-gray-800 cursor-pointer hover:border-yellow-500 hover:scale-[1.1] hover:shadow-[0_0_15px_rgba(234,179,8,0.4)] z-10' : 'bg-gray-900/40'
                              }`}
                            onClick={() => {
                              if (item) {
                                if (item.run_id) {
                                  handleViewRunDetails({ id: item.run_id });
                                } else {
                                  showNotification(`${item.item_name} - Adet: ${item.quantity}`, 'info');
                                }
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (item && showTooltip) showTooltip(item, e);
                            }}
                            onMouseMove={(e) => {
                              if (item && showTooltip) showTooltip(item, e);
                            }}
                            onMouseLeave={() => {
                              if (hideTooltip) hideTooltip();
                            }}
                          >
                            {item ? (
                              <>
                                <div className="w-full h-full flex items-center justify-center p-1.5">
                                  <img
                                    src={getItemIcon(item.item_name)}
                                    alt={item.item_name}
                                    className="w-full h-full object-contain drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                                  />
                                  <Database size={32} className="text-yellow-500/50 hidden" />
                                </div>
                                <div className="absolute top-1 right-1 text-[11px] font-black text-yellow-500 leading-none drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] px-1 py-0.5 rounded-sm bg-black/40">
                                  {item.quantity}
                                </div>
                              </>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Grid Pagination */}
                <div className="flex justify-center items-center gap-4">
                  <button
                    disabled={bankPage === 1}
                    onClick={() => setBankPage(p => p - 1)}
                    className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-20 transition"
                  >
                    <ArrowRight className="rotate-180" size={16} />
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setBankPage(i + 1)}
                        className={`w-8 h-8 rounded text-xs font-black transition ${bankPage === i + 1 ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={bankPage === 10}
                    onClick={() => setBankPage(p => p + 1)}
                    className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white disabled:opacity-20 transition"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Transactions Log Section */}
            <div className="mt-8">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Calendar size={16} />
                Banka İşlem Geçmişi
              </h3>
              <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
                <div className="max-h-60 overflow-y-auto no-scrollbar">
                  {transactions.length === 0 ? (
                    <div className="p-10 text-center text-gray-600 text-sm">Henüz bir işlem kaydı bulunmuyor.</div>
                  ) : (
                    <div className="divide-y divide-gray-700/30">
                      {transactions.map(t => (
                        <div key={t.id} className="p-4 flex justify-between items-center hover:bg-gray-800/30 transition">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${t.amount < 0 ? 'bg-red-500' : 'bg-green-500'}`} />
                            <div>
                              <div className="text-xs font-bold text-white uppercase">{t.description}</div>
                              <div className="text-[10px] text-gray-500">{new Date(t.created_at).toLocaleString('tr-TR')} - Yapan: {t.performer_name || 'Bilinmeyen'}</div>
                            </div>
                          </div>
                          <div className={`font-mono font-black ${t.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {t.amount > 0 ? '+' : ''}{t.amount} G
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
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
        {activeTab === 'reports' && renderReportsTab()}

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

                {/* Guaranteed Drops Section (Silver & Golden Bars) */}
                <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-500/30 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-black text-blue-400 uppercase tracking-widest">Garantili Droplar (%100)</label>
                    <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded font-bold uppercase">Otomatik Nakite Çevrilir</span>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 flex items-center gap-3 bg-gray-900/60 p-2 rounded-lg border border-gray-700/50">
                      <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center overflow-hidden">
                        <img src={getItemIcon('Silver Bar')} alt="" className="w-6 h-6 object-contain" onError={(e) => e.target.style.display = 'none'} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Silver Bar</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase">10.000.000 G</div>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center gap-3 bg-gray-900/60 p-2 rounded-lg border border-gray-700/50">
                      <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center overflow-hidden">
                        <img src={getItemIcon('Golden Bar')} alt="" className="w-6 h-6 object-contain" onError={(e) => e.target.style.display = 'none'} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Golden Bar</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase">100.000.000 G</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Participants Section */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-6">
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

                  {selectedParticipants.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {selectedParticipants.map((participant, index) => {
                        const dailyAmount = dailyACPStats[participant.user_id] || 0;
                        return (
                          <div key={participant.user_id} className="flex justify-between items-center bg-gray-800 p-2 rounded-lg border border-gray-700">
                            <div>
                              <div className="font-medium text-white text-sm">{participant.nickname || participant.username}</div>
                              <div className="text-xs text-purple-400 font-bold">ACP: {dailyAmount.toLocaleString()}</div>
                            </div>
                            {participant.user_id !== uid && (
                              <button
                                onClick={() => setSelectedParticipants(selectedParticipants.filter((_, i) => i !== index))}
                                className="text-red-500 hover:text-red-400 p-1"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm italic">
                      Henüz katılımcı eklenmedi
                    </div>
                  )}
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
                      <div key={index} className={`flex justify-between items-center bg-gray-800 p-3 rounded-lg border-l-4 ${drop.isGuaranteed ? 'border-blue-500 bg-blue-900/10' : 'border-green-500'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-gray-900 flex items-center justify-center">
                            <img src={getItemIcon(drop.item_name)} alt="" className="w-5 h-5 object-contain" onError={(e) => e.target.style.display = 'none'} />
                          </div>
                          <div>
                            <div className="font-medium text-white flex items-center gap-2">
                              {drop.item_name}
                              {drop.isGuaranteed && <span className="text-[8px] bg-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Garantili</span>}
                            </div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Adet: <span className="text-gray-300">{drop.quantity}</span></div>
                          </div>
                        </div>
                        {!drop.isGuaranteed && (
                          <button
                            onClick={() => removeDrop(index)}
                            className="text-gray-600 hover:text-red-500 transition-colors p-2"
                          >
                            <X size={16} />
                          </button>
                        )}
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
                    <h4 className="font-bold text-white uppercase tracking-tighter italic">Katılımcılar ({selectedRun.participants?.length || 0})</h4>
                    <div className="flex gap-2">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">
                        Ödeme Bekleyen: {selectedRun.participants?.filter((p, index) => {
                          const total = selectedRun.total_sold_amount || 0;
                          const count = selectedRun.participants?.length || 1;
                          const baseShare = Math.floor(total / count);
                          const remainder = total % count;
                          const share = index < remainder ? baseShare + 1 : baseShare;

                          const remaining = share - parseFloat(p.paid_amount || 0);
                          return remaining > 0;
                        }).length || 0}
                      </div>
                      <div className="text-[10px] font-black text-yellow-500 ml-2 border-l border-gray-700 pl-2 uppercase">
                        Toplam Satış: {(selectedRun.total_sold_amount || 0).toLocaleString('tr-TR')} G
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedRun.participants?.map((participant, index) => {
                      const total = selectedRun.total_sold_amount || 0;
                      const count = selectedRun.participants?.length || 1;
                      const baseShare = Math.floor(total / count);
                      const remainder = total % count;
                      const share = index < remainder ? baseShare + 1 : baseShare;

                      const paidAmount = parseFloat(participant.paid_amount || 0);
                      const remaining = Math.max(0, share - paidAmount);

                      let statusText = 'Ödeme Bekliyor';
                      let statusColor = 'bg-yellow-900/30 text-yellow-400';

                      if (share > 0) {
                        if (remaining <= 0) {
                          if (selectedRun.has_unsold_items) {
                            statusText = 'Satış Bekliyor';
                            statusColor = 'bg-indigo-900/40 text-indigo-400';
                          } else {
                            statusText = 'Tamamlandı';
                            statusColor = 'bg-green-900/40 text-green-400';
                          }
                        } else if (paidAmount > 0) {
                          statusText = 'Kısmi Ödendi';
                          statusColor = 'bg-blue-900/40 text-blue-400';
                        }
                      } else if (selectedRun.has_unsold_items) {
                        statusText = 'Satış Bekleniyor';
                        statusColor = 'bg-indigo-900/20 text-indigo-300';
                      }

                      return (
                        <div key={participant.user_id} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg border border-gray-700/50">
                          <div className="flex-1">
                            <div className="font-bold text-lg text-white">
                              {participant.user_id === uid
                                ? (userData.profile?.mainCharacter || participant.nickname || participant.main_character || participant.username)
                                : (participant.nickname || participant.main_character || participant.username)}
                              {participant.daily_acp > 0 && (
                                <span className="ml-2 text-xs bg-purple-900/40 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20 font-bold">
                                  {participant.daily_acp} ACP
                                </span>
                              )}
                            </div>
                            {selectedRun.total_sold_amount > 0 && (
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                  Hak Edilen
                                  <div className="text-xs text-green-500 font-black">{share.toLocaleString('tr-TR')}</div>
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                  Ödenen
                                  <div className="text-xs text-blue-500 font-black">{paidAmount.toLocaleString('tr-TR')}</div>
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                  Kalan
                                  <div className="text-xs text-yellow-500 font-black">{remaining.toLocaleString('tr-TR')}</div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {(selectedRun.created_by === uid || clanMembers.find(m => m.user_id === uid)?.role === 'leader') && (
                              <>
                                {remaining > 0 ? (
                                  <button
                                    onClick={() => {
                                      setPaymentTarget(participant);
                                      setPaymentAmount(remaining);
                                      setPaymentDescription(`Run katılım ödemesi: ${selectedRun.boss_name}`);
                                      setShowPaymentModal(true);
                                    }}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-bold shadow-lg transition-transform active:scale-95"
                                  >
                                    Ödeme Yap
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (window.confirm('Son ödemeyi iptal etmek istediğinize emin misiniz?')) {
                                        handleUpdatePaymentStatus(participant.user_id, false);
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-green-900/30 text-green-400 hover:bg-green-900/50 rounded text-sm font-bold border border-green-500/20"
                                  >
                                    {statusText} (İptal)
                                  </button>
                                )}
                              </>
                            )}
                            {!(selectedRun.created_by === uid || clanMembers.find(m => m.user_id === uid)?.role === 'leader') && (
                              <span className={`px-3 py-1 rounded text-sm font-bold ${statusColor}`}>
                                {statusText}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                    {selectedRun.drops?.map((drop, index) => {
                      const isSold = drop.status === 'sold';
                      const isPartiallySold = drop.status === 'partially_sold';
                      const isAvailable = drop.status === 'available';

                      // Find bank item for leader/owner to be able to sell
                      const bankItem = isAvailable && (bankData.items || []).find(bi =>
                        String(bi.run_id) === String(selectedRun.id) &&
                        bi.item_name === drop.item_name
                      );

                      return (
                        <div key={index} className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-gray-900 border border-gray-700 flex items-center justify-center overflow-hidden">
                              <img
                                src={getItemIcon(drop.item_name)}
                                alt=""
                                className="w-8 h-8 object-contain"
                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                              />
                              <Database size={20} className="text-gray-700 hidden" />
                            </div>
                            <div>
                              <div
                                className="font-medium text-white group-hover:text-yellow-400 transition-colors cursor-help"
                                onMouseEnter={(e) => { if (showTooltip) showTooltip(drop, e); }}
                                onMouseMove={(e) => { if (showTooltip) showTooltip(drop, e); }}
                                onMouseLeave={() => { if (hideTooltip) hideTooltip(); }}
                              >
                                {drop.item_name}
                              </div>
                              <div className="text-sm text-gray-400">Adet: {drop.quantity}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${isSold ? 'bg-gray-700 text-gray-400' :
                              isPartiallySold ? 'bg-blue-900/30 text-blue-400' :
                                'bg-green-900/30 text-green-400'
                              }`}>
                              {isSold ? 'SATILDI' : isPartiallySold ? 'KISMİ SATILDI' : 'BANKADA'}
                            </span>

                            {/* Role and Bank Item Check for Sell Button */}
                            {/* Don't show sell button for auto-sold bars */}
                            {(() => {
                              const isAutoSoldBar = drop.item_name === 'Silver Bar' || drop.item_name === 'Golden Bar' || drop.item_name === 'Gold Bar';
                              const canSell = ((selectedClan?.owner_id === uid) ||
                                (bankData?.role === 'leader' || bankData?.role === 'owner') ||
                                (clanMembers.find(m => m.user_id === uid)?.role === 'leader')) && bankItem && !isAutoSoldBar;

                              return canSell ? (
                                <button
                                  onClick={() => {
                                    setItemToSell({ id: bankItem.id, name: drop.item_name, quantity: drop.quantity });
                                    setSaleQuantity(drop.quantity);
                                    setShowItemActionModal(true);
                                  }}
                                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-xs font-bold transition shadow-lg"
                                >
                                  Sat
                                </button>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      );
                    })}
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
                      onClick={() => openDeleteConfirmation(selectedRun)}
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

        {/* Item Action (Sell) Modal */}
        {showItemActionModal && itemToSell && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[150] p-4 backdrop-blur-sm">
            <div className="bg-gray-800 w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl overflow-hidden animate-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">İtem Satışı</h3>
                <button onClick={() => setShowItemActionModal(false)} className="text-gray-400 hover:text-white transition">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 text-center">
                  <div className="text-sm text-gray-500 mb-1 uppercase font-bold tracking-widest">Satılacak İtem</div>
                  <div className="text-2xl font-black text-yellow-500 uppercase italic">{itemToSell.name}</div>
                  <div className="text-sm text-gray-400 mt-1">Mevcut: {itemToSell.quantity} Adet</div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Satılacak Miktar</label>
                    <input
                      type="number"
                      value={saleQuantity}
                      onChange={(e) => setSaleQuantity(Math.min(itemToSell.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Toplam Satış Tutarı (G)</label>
                    <input
                      type="number"
                      placeholder="Örn: 1000"
                      value={saleAmount}
                      onChange={(e) => setSaleAmount(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Satış Tarihi (Opsiyonel)</label>
                    <input
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500 transition text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-900/50 border-t border-gray-700 flex gap-4">
                <button onClick={() => setShowItemActionModal(false)} className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition">İptal</button>
                <button
                  onClick={handleSellItem}
                  disabled={!saleAmount}
                  className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white rounded-xl font-black transition shadow-xl"
                >
                  SATIŞI ONAYLA
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && paymentTarget && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[150] p-4 backdrop-blur-sm">
            <div className="bg-gray-800 w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl overflow-hidden animate-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">Ödeme Yap</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white transition">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 text-center">
                  <div className="text-sm text-gray-500 mb-1 uppercase font-bold tracking-widest">Alıcı</div>
                  <div className="text-2xl font-black text-blue-500 uppercase italic">{paymentTarget.nickname || paymentTarget.main_character || paymentTarget.username}</div>
                  <div className="text-xs text-gray-400 mt-2">Klan Bakiyesi: <span className="text-yellow-500 font-bold">{bankData.balance} G</span></div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Ödeme Tutarı (G)</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition"
                    />
                    <p className="text-[10px] text-gray-500 mt-1 italic">* Otomatik hesaplanan kişi başı pay: {(Number(bankData.balance) / (selectedRun.participants?.length || 1)).toFixed(0)} G</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Açıklama</label>
                    <textarea
                      value={paymentDescription}
                      onChange={(e) => setPaymentDescription(e.target.value)}
                      placeholder="Örn: Shallow Fever katılım payı"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition resize-none text-sm"
                      rows="3"
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-900/50 border-t border-gray-700 flex gap-4">
                <button onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition">İptal</button>
                <button
                  onClick={handlePayParticipant}
                  disabled={!paymentAmount || parseFloat(paymentAmount) > Number(bankData.balance)}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-black transition shadow-xl"
                >
                  ÖDEMEYİ YAP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACP Donation Modal */}
        {showACPModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[130] p-4 backdrop-blur-sm">
            <div className="bg-gray-800 w-full max-w-2xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-gray-700 bg-gray-800/80 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Coins className="text-purple-500" size={24} />
                    ACP Bağışı
                  </h3>
                  {(selectedClan.owner_id === uid || clanMembers.find(m => m.user_id === uid)?.role === 'leader') && (
                    <div className="flex bg-gray-900 p-1 rounded-lg ml-4">
                      <button
                        onClick={() => setAcpView('add')}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${acpView === 'add' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        Ekle
                      </button>
                      <button
                        onClick={() => {
                          setAcpView('history');
                          fetchACPHistory();
                        }}
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${acpView === 'history' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        Geçmiş / Yönet
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowACPModal(false)}
                  className="text-gray-400 hover:text-white transition"
                >
                  <X size={24} />
                </button>
              </div>

              {acpView === 'add' ? (
                <>
                  <div className="p-6 overflow-y-auto">
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4">
                        <h4 className="font-bold text-purple-300 mb-1 text-sm">Bilgilendirme</h4>
                        <p className="text-xs text-gray-300">
                          Sadece 0'dan büyük değer girilen üyeler için bağış kaydı oluşturulacaktır.
                        </p>
                      </div>
                      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 flex flex-col justify-center">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Bağış Tarihi</label>
                        <input
                          type="date"
                          value={acpDate}
                          onChange={(e) => setAcpDate(e.target.value)}
                          className="bg-gray-800 text-white px-3 py-1.5 rounded border border-gray-600 focus:border-purple-500 focus:outline-none text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {acpDonations.map((donation) => (
                        <div key={donation.userId} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                          <div className="font-medium text-white">{donation.nickname}</div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="Miktar"
                              value={donation.amount}
                              onChange={(e) => handleACPChange(donation.userId, e.target.value)}
                              className="w-32 bg-gray-800 text-white px-3 py-1.5 rounded border border-gray-600 focus:border-purple-500 focus:outline-none text-right"
                              min="0"
                            />
                            <span className="text-xs text-gray-500 font-bold w-8 text-center">ACP</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-3">
                    <button
                      onClick={() => setShowACPModal(false)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-medium"
                    >
                      İptal
                    </button>
                    <button
                      onClick={submitACPDonations}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-bold shadow-lg shadow-purple-900/30"
                    >
                      Bağışları Kaydet
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="p-6 overflow-y-auto flex-1">
                    {isHistoryLoading ? (
                      <div className="text-center py-10 text-gray-400">Yükleniyor...</div>
                    ) : acpHistory.length === 0 ? (
                      <div className="text-center py-10 text-gray-500 italic">Henüz bağış kaydı bulunmuyor.</div>
                    ) : (
                      <div className="space-y-3">
                        {acpHistory.map((item) => (
                          <div key={item.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex justify-between items-center group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-purple-900/30 rounded-full flex items-center justify-center text-purple-400 font-black">
                                {item.amount}
                              </div>
                              <div>
                                <div className="text-white font-bold">{item.main_character || item.username}</div>
                                <div className="text-[10px] text-gray-500 flex items-center gap-2 uppercase tracking-tight">
                                  <span>{new Date(item.donation_date).toLocaleDateString('tr-TR')}</span>
                                  <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                                  <span>Ekleyen: {item.creator_name}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteACP(item.id)}
                              className="p-2 bg-red-900/20 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                              title="Sil"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-6 bg-gray-900/50 border-t border-gray-700 flex justify-end">
                    <button
                      onClick={() => setShowACPModal(false)}
                      className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-bold"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              )}
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
      {/* Satılan İtemler Modalı */}
      {
        showSoldItemsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[130] p-4">
            <div className="bg-gray-800 border border-yellow-500/50 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <Tag className="text-yellow-400" size={24} />
                  <h2 className="text-2xl font-bold text-white tracking-tight uppercase italic">Satılan İtemler</h2>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex bg-gray-900 p-1 rounded-lg">
                    <button
                      onClick={() => setSoldItemsView('list')}
                      className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${soldItemsView === 'list' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Liste
                    </button>
                    <button
                      onClick={() => setSoldItemsView('grid')}
                      className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${soldItemsView === 'grid' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Kart
                    </button>
                  </div>
                  <button
                    onClick={() => setShowSoldItemsModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-900/20">
                {soldItems.length === 0 ? (
                  <div className="text-center py-20 bg-gray-900/50 rounded-xl border border-dashed border-gray-700">
                    <Tag className="mx-auto mb-4 text-gray-600" size={48} />
                    <p className="text-gray-500 font-bold uppercase tracking-widest">Henüz satılan item bulunamadı</p>
                  </div>
                ) : soldItemsView === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {soldItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={async () => {
                          if (item.run_id) {
                            try {
                              const runDetails = await clanBossService.getClanBossRunDetails(item.run_id);
                              setSelectedRun(runDetails);
                              setShowRunDetailModal(true);
                              setShowSoldItemsModal(false);
                            } catch (error) {
                              showNotification('Run detayları yüklenemedi.', 'error');
                            }
                          }
                        }}
                        className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 hover:border-yellow-500/50 transition-all group cursor-pointer hover:bg-gray-800"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-bold text-yellow-400 group-hover:scale-105 transition-transform origin-left">
                            {item.item_name}
                          </div>
                          <div className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400 border border-gray-700">
                            {new Date(item.sold_at).toLocaleDateString('tr-TR')}
                          </div>
                        </div>

                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Miktar</span>
                          <span className="text-sm text-white font-mono">{item.sold_quantity} Adet</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Satış Tutarı</span>
                          <span className="text-sm font-bold text-green-400">
                            {new Intl.NumberFormat('tr-TR').format(item.sale_amount)} <span className="text-[10px]">COIN</span>
                          </span>
                        </div>

                        {item.run_id && (
                          <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center group-hover:border-yellow-500/30">
                            <span className="text-[10px] text-gray-600 uppercase font-bold">Boss Run Bağlantılı</span>
                            <span className="text-[10px] text-blue-400 font-bold group-hover:underline flex items-center gap-1">
                              DETAYI GÖR <Sword size={10} />
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-900/50 text-left text-[10px] text-gray-500 uppercase tracking-widest font-black">
                          <th className="px-6 py-4 border-b border-gray-700">İtem Adı</th>
                          <th className="px-6 py-4 border-b border-gray-700">Miktar</th>
                          <th className="px-6 py-4 border-b border-gray-700">Tutar</th>
                          <th className="px-6 py-4 border-b border-gray-700">Satış Tarihi</th>
                          <th className="px-6 py-4 border-b border-gray-700 text-right">Eylem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {soldItems.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-gray-700/30 transition group cursor-pointer"
                            onClick={async () => {
                              if (item.run_id) {
                                try {
                                  const runDetails = await clanBossService.getClanBossRunDetails(item.run_id);
                                  setSelectedRun(runDetails);
                                  setShowRunDetailModal(true);
                                  setShowSoldItemsModal(false);
                                } catch (error) {
                                  showNotification('Run detayları yüklenemedi.', 'error');
                                }
                              }
                            }}
                          >
                            <td className="px-6 py-4">
                              <div className="font-bold text-white group-hover:text-yellow-400 transition-colors">{item.item_name}</div>
                              {item.run_id && <div className="text-[10px] text-gray-500 font-bold uppercase">{item.run_id}</div>}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-white font-mono">{item.sold_quantity}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-green-500 font-black">{new Intl.NumberFormat('tr-TR').format(item.sale_amount)} G</span>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-400">
                              {new Date(item.sold_at).toLocaleDateString('tr-TR')}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {item.run_id && (
                                <button className="text-blue-500 hover:text-blue-400 font-black text-[10px] uppercase flex items-center gap-1 justify-end ml-auto">
                                  DETAY <Sword size={12} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-900 border-t border-gray-700 flex justify-between items-center px-8">
                <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">
                  Toplam Satış Adedi: <span className="text-white">{soldItems.length}</span>
                </span>
                <p className="text-xs text-gray-400 uppercase font-black tracking-widest">
                  Toplam Kazanç: <span className="text-green-500 text-lg ml-2 font-mono">
                    {new Intl.NumberFormat('tr-TR').format(soldItems.reduce((acc, curr) => acc + parseFloat(curr.sale_amount), 0))} <span className="text-[10px]">COIN</span>
                  </span>
                </p>
              </div>
            </div>
          </div>
        )
      }

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && runToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl animate-fade-in relative overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-700 bg-red-900/10">
              <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                <AlertCircle size={24} />
                Run Silme Onayı
              </h3>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {deleteError ? (
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
                  <h4 className="font-bold text-red-400 mb-2 flex items-center gap-2">
                    <X size={16} />
                    {deleteError.message}
                  </h4>
                  {deleteError.details && (
                    <p className="text-sm text-gray-300 ml-6 whitespace-pre-line">
                      {deleteError.details}
                    </p>
                  )}
                  {deleteError.payment_count > 0 && (
                    <div className="mt-3 p-3 bg-red-950/30 rounded border border-red-800/30">
                      <p className="text-xs text-red-300 font-bold">ÖNERİLEN ÇÖZÜM:</p>
                      <p className="text-xs text-gray-400 mt-1">
                        1. Bu pencereyi kapatın<br />
                        2. Katılımcılar listesinden yapılan ödemeleri "Ödendi" durumundan çıkarın<br />
                        3. Tekrar silmeyi deneyin
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-gray-300">
                    <span className="font-bold text-white">{runToDelete.boss_name}</span> kaydını silmek istediğinizden emin misiniz?
                  </p>
                  <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-3 text-sm text-yellow-500">
                    <p className="font-bold flex items-center gap-2 mb-1">
                      <AlertCircle size={14} /> DİKKAT
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-1 opacity-90">
                      <li>Bu işlem geri alınamaz.</li>
                      <li>Otomatik satılan barların tutarı clan bakiyesinden düşülecektir.</li>
                      <li>Tüm drop ve katılımcı kayıtları silinecektir.</li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition"
              >
                {deleteError ? 'Kapat' : 'İptal'}
              </button>

              {!deleteError && (
                <button
                  onClick={() => handleDeleteRun(runToDelete.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition flex items-center gap-2"
                >
                  <X size={16} />
                  Evet, Sil
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default ClanPage; 
