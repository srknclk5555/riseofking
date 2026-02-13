import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
// Firebase imports removed - using PostgreSQL authentication
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Pickaxe, Sword, Scroll, Users, Settings,
  LayoutDashboard, Timer, Bell, Search, Plus,
  Save, Trash2, UserPlus, Edit3, DollarSign,
  Filter, ChevronDown, ChevronUp, History,
  Play, Pause, RefreshCw, LogOut, Check, Star, Link as LinkIcon,
  Shield, Crown, UserMinus, AlertCircle, MessageCircle, Send, CheckCheck,
  LogIn, LogOut as LogOutIcon, User, XCircle, CheckCircle, X, List, Mail, UserX,
  MapPin, Clock, Calendar, Coins, Wallet, Eye, BarChart2, BellRing,
  Briefcase, FileText, ChevronLeft, ChevronRight, Package
} from 'lucide-react';

import SystemPage, { getExportedLocations, getExportedItems, getExportedMobs } from './SystemPage';
import { PROFESSIONS, EVENTS, MOBS } from './constants';
import Notification from './components/Notification';
import ConfirmModal from './components/ConfirmModal';
import { formatDate, generateId, generateFarmNumber, generateEmail, defaultUserData } from './utils/helpers';
import DashboardPage from './pages/DashboardPage';
import GatheringPage from './pages/GatheringPage';
import EventsPage from './pages/EventsPage';
import FarmPage from './pages/FarmPage';
import MessagingPage from './pages/MessagingPage';
import AdminPage from './pages/AdminPage';
import ClanPage from './pages/ClanPage';

// PostgreSQL API Servisleri
import { itemService, locationService, mobService, farmService, notificationService, gatheringService, eventService, messageService, userService } from './services/api';
import * as authService from './services/authService';
import socketService from './services/socketService';

// --- FIREBASE CONNECTIONS REMOVED ---
// All data now handled through PostgreSQL backend

// --- APP ID ---
const staticAppId = "rise_online_tracker_app";
const appId = staticAppId;

// Firebase helpers removed - using PostgreSQL API

// Güvenlik kontrolleri
export const validateFarmAccess = (farm, userId) => {
  // Farm'a erişim kontrolü - sadece sahibi veya katılımcı erişebilir
  if (!farm || !userId) return false;

  // Farm sahibi mi?
  if (farm.ownerId === userId) return true;

  // Katılımcı mı?
  const participants = Array.isArray(farm.participants) ?
    farm.participants :
    (farm.participants ? Object.values(farm.participants) : []);

  return participants.some(p => p.uid === userId || p.id === userId);
};

export const validateClanAccess = (clan, userId) => {
  // Klan'a erişim kontrolü - sadece üyeleri erişebilir
  if (!clan || !userId) return false;

  // Klan sahibi mi?
  if (clan.ownerId === userId) return true;

  // Üye mi?
  return clan.members?.includes(userId) || false;
};

export const validateMessageAccess = (message, userId) => {
  // Mesaja erişim kontrolü - sadece gönderen veya alıcı erişebilir
  if (!message || !userId) return false;

  return message.senderId === userId || message.receiverId === userId;
};

export const validateClanMessageAccess = (message, clan, userId) => {
  // Klan mesajına erişim kontrolü - sadece klan üyeleri erişebilir
  if (!message || !clan || !userId) return false;

  // Klan ID eşleşiyor mu?
  if (message.clanId !== clan.id) return false;

  // Üye mi?
  return clan.members?.includes(userId) || false;
};
// --- ANA BİLEŞEN ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [loading, setLoading] = useState(true);

  // Veri State'leri
  const [userData, setUserData] = useState(null);
  const [farms, setFarms] = useState([]);
  const [prices, setPrices] = useState({});
  const [privateMessages, setPrivateMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [globalItems, setGlobalItems] = useState([]); // Küresel eşya listesi

  const lastSyncedMainCharacterRef = useRef(null);
  const syncInFlightRef = useRef(false);

  // Tooltip State'leri
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipContent, setTooltipContent] = useState({});

  // Eşyaları PostgreSQL'den çek (Küresel)
  useEffect(() => {
    const fetchGlobalItems = async () => {
      try {
        console.log('[DEBUG] Fetching global items...');
        const items = await itemService.getAllItems();
        console.log('[DEBUG] Items fetched:', items);
        // Backend'den gelen veriler zaten database sütun adlarında - doğrudan kullan
        const formattedItems = items.map(item => ({
          id: item.id,
          name: item.name || '',
          itemType: item.itemtype || '',
          rarity: item.rarity || '',
          class: item.class || '',
          level: item.level || '',
          gearScore: item.gearscore || '',
          // Bonuslar - flatten edilmiş
          physicalDefenseBonus: item.physicaldefensebonus || null,
          strengthBonus: item.strengthbonus || null,
          dexterityBonus: item.dexteritybonus || null,
          intelligenceBonus: item.intelligencebonus || null,
          magicBonus: item.magicbonus || null,
          healthBonus: item.healthbonus || null,
          hpBonus: item.hpbonus || null,
          mpBonus: item.mpbonus || null,
          fireDamage: item.firedamage || null,
          iceDamage: item.icedamage || null,
          lightningDamage: item.lightningdamage || null,
          // Rezistanslar - flatten edilmiş
          fireResistance: item.fireresistance || null,
          iceResistance: item.iceresistance || null,
          lightningResistance: item.lightningresistance || null,
          poisonResistance: item.poisonresistance || null,
          holyResistance: item.holyresistance || null,
          curseResistance: item.darkresistance || null,
          // Silah Savunmaları
          daggerDefense: item.daggerdefense || null,
          swordDefense: item.sworddefense || null,
          maceDefense: item.macedefense || null,
          axeDefense: item.axedefense || null,
          spearDefense: item.speardefense || null,
          bowDefense: item.bowdefense || null,
          // Diğer Bonuslar
          expBonus: item.expbonus || null,
          coinBonus: item.coinbonus || null,
          attackBonusAllMobs: item.attackbonusallmobs || null,
          bpBonusPerKill: item.bpbonusperkill || null,
          createdAt: item.created_at
        }));
        setGlobalItems(formattedItems);
      } catch (error) {
        console.error("İtemler çekilirken hata oluştu:", error);
      }
    };

    fetchGlobalItems();
  }, []);

  const getRarityStyles = (rarity) => {
    switch (rarity) {
      case 'Unique': return { color: '#e5c370', textShadow: '0 0 10px rgba(229,195,112,0.4)' };
      case 'Epic': return { color: '#9d50bb', textShadow: '0 0 10px rgba(157,80,187,0.4)' };
      case 'Rare': return { color: '#4facfe', textShadow: '0 0 10px rgba(79,172,254,0.4)' };
      case 'Magic': return { color: '#00f2fe', textShadow: '0 0 10px rgba(0,242,254,0.3)' };
      default: return { color: '#ffffff' };
    }
  };

  const showTooltip = (item, e) => {
    // Kasa itemi ise global listeden detayları bul
    // İtem ya itemName (kasa) ya da name (globalItems) property'sine sahip
    const itemName = item.name || item.itemName;
    const fullItem = globalItems.find(i => (i.name || '').toLowerCase() === (itemName || '').toLowerCase()) || item;
    setTooltipContent(fullItem);
    setTooltipPosition({ x: e.clientX + 15, y: e.clientY + 15 });
    setTooltipVisible(true);
  };

  const hideTooltip = () => setTooltipVisible(false);

  // Navigasyon için State
  const [targetFarmId, setTargetFarmId] = useState(null);

  const [onlineUsers, setOnlineUsers] = useState({});
  const [notification, setNotification] = useState({ message: null, type: 'success' });
  const [timer, setTimer] = useState({ running: false, seconds: 0, mode: 'stopwatch' });
  const creatingUserRef = useRef(false);

  // Rate limiting için state
  const [lastActionTimes, setLastActionTimes] = useState({});
  const [actionCounts, setActionCounts] = useState({});

  // Rate limiting helper function with daily reset capability
  const checkRateLimit = useCallback((actionType, userId, maxActions = 10, timeWindow = 60000) => {
    const now = Date.now();
    const today = new Date().toDateString(); // Today's date as string for daily reset
    const actionKey = `${userId}_${actionType}`;
    const dailyActionKey = `${actionKey}_${today}`; // Key includes today's date

    // Önceki işlemleri temizle
    const lastTime = lastActionTimes[actionKey] || 0;
    const count = actionCounts[dailyActionKey] || 0;

    // Daily reset: if it's a new day, reset the count
    const lastDate = lastActionTimes[`${actionKey}_date`];
    if (lastDate !== today) {
      // Reset counter for new day
      setActionCounts(prev => ({ ...prev, [dailyActionKey]: 1 }));
      setLastActionTimes(prev => ({
        ...prev,
        [actionKey]: now,
        [`${actionKey}_date`]: today
      }));
      return true;
    }

    // Within the same day - check time window for immediate rate limiting
    if (now - lastTime > timeWindow) {
      setLastActionTimes(prev => ({ ...prev, [actionKey]: now }));
      setActionCounts(prev => ({ ...prev, [dailyActionKey]: 1 }));
      return true;
    }

    // Limit kontrolü
    if (count >= maxActions) {
      return false;
    }

    // Sayacı güncelle
    setLastActionTimes(prev => ({ ...prev, [actionKey]: now }));
    setActionCounts(prev => ({ ...prev, [dailyActionKey]: count + 1 }));
    return true;
  }, [lastActionTimes, actionCounts, setLastActionTimes, setActionCounts]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification({ message: null, type: 'success' }), 4000);
  };

  // --- EFFECT 1: AUTHENTICATION ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(null);
      setUserData(null);
      setFarms([]);
      setNotifications([]);
      if (currentUser) {
        setUser(currentUser);
        // Get and store ID token for API calls
        try {
          const token = await currentUser.getIdToken();
          localStorage.setItem('authToken', token);
          socketService.connect(currentUser.uid, token); // Socket bağlan
          console.log('[DEBUG] User logged in with UID:', currentUser.uid);
          console.log('[DEBUG] Auth token stored in localStorage');
        } catch (error) {
          console.error('[DEBUG] Error getting ID token:', error);
        }
      } else {
        // Clear token on logout
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        socketService.disconnect(); // Socket kopar
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // --- EFFECT 2: TEMEL KULLANICI VERİSİ VE BİLDİRİMLER ---
  useEffect(() => {
    if (!user || !user.uid) return;
    setLoading(true);
    const uid = user.uid;

    console.log('[DEBUG] Setting up user data for UID:', uid);

    const userDocRef = getUserDocRef(uid);
    const unsubUser = onSnapshot(userDocRef, async (docSnapshot) => {
      if (docSnapshot.exists()) {
        const nextUserData = docSnapshot.data();
        setUserData(nextUserData);
        setPrices(nextUserData.prices || {});

        try {
          const mainCharacter = nextUserData?.profile?.mainCharacter;
          const token = localStorage.getItem('authToken');
          const normalized = typeof mainCharacter === 'string' ? mainCharacter.trim() : '';
          if (!token || !normalized) {
            setLoading(false);
            return;
          }

          if (lastSyncedMainCharacterRef.current === normalized) {
            setLoading(false);
            return;
          }

          if (syncInFlightRef.current) {
            setLoading(false);
            return;
          }

          syncInFlightRef.current = true;
          await userService.updateProfile(uid, { mainCharacter: normalized });
          lastSyncedMainCharacterRef.current = normalized;
        } catch (e) {
          console.warn('[SYNC_PROFILE] PostgreSQL profile sync failed:', e?.message || e);
        } finally {
          syncInFlightRef.current = false;
        }
        setLoading(false);
      } else {
        if (!creatingUserRef.current) {
          creatingUserRef.current = true;
          const username = user.email.split('@')[0];
          try { await setDoc(userDocRef, defaultUserData(uid, username), { merge: true }); }
          catch (error) { console.error("Belge hatası:", error); setLoading(false); }
          finally { creatingUserRef.current = false; }
        }
      }
    }, (error) => {
      console.error("User Snapshot Error:", error);
      if (error.code === 'permission-denied') {
        showNotification("Veri erişim yetkisi hatası alındı (User). Lütfen sayfayı yenileyin.", "error");
      }
      setLoading(false);
    });

    // PostgreSQL'den kullanıcı bildirimlerini çek
    const fetchNotifications = async () => {
      try {
        const userNotifications = await notificationService.getUserNotifications(uid, { limit: 50 });
        // PostgreSQL veri yapısını frontend formatına dönüştür
        const formattedNotifications = userNotifications.map(notif => ({
          id: notif.id,
          receiverId: notif.receiver_id,
          title: notif.title,
          text: notif.text,
          relatedId: notif.related_id,
          read: notif.read,
          type: notif.type,
          priority: notif.priority,
          createdAt: notif.created_at,
          updatedAt: notif.updated_at
        }));
        setNotifications(formattedNotifications);
      } catch (error) {
        console.error('Bildirimler çekilirken hata oluştu:', error);
      }
    };

    fetchNotifications();

    // Cleanup function
    return () => {
      unsubUser();
    };
  }, [user]);

  // --- EFFECT 3: FARM VERİSİ (sadece Farm sekmesi aktifse) ---
  useEffect(() => {
    if (activeTab !== 'Farm' || !user || !user.uid) return;
    const uid = user.uid;

    // PostgreSQL'den kullanıcıya ait farm'ları çek
    const fetchFarms = async () => {
      try {
        const userFarms = await farmService.getUserFarms(uid);
        // PostgreSQL veri yapısını frontend formatına dönüştür
        const formattedFarms = userFarms.map(farm => ({
          id: farm.id,
          farmNumber: farm.farm_number,
          ownerId: farm.owner_id,
          date: farm.date,
          duration: farm.duration,
          location: farm.location,
          mob: farm.mob,
          participants: Array.isArray(farm.participants) ? farm.participants : [],
          items: Array.isArray(farm.items) ? farm.items : [],
          totalRevenue: farm.total_revenue,
          sharePerPerson: farm.share_per_person,
          type: farm.type,
          status: farm.status,
          createdAt: farm.created_at,
          updatedAt: farm.updated_at
        }));
        setFarms(formattedFarms.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)));
      } catch (error) {
        console.error('Farm verileri çekilirken hata oluştu:', error);
      }
    };

    fetchFarms();
  }, [user, activeTab]);

  // Mesajları yenileme fonksiyonu
  const refreshMessages = async () => {
    if (!user || !user.uid) return;
    const uid = user.uid;

    try {
      const userMessages = await messageService.getAllMessages(uid);
      // PostgreSQL veri yapısını frontend formatına dönüştür
      const formattedMessages = userMessages.map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        text: msg.text,
        createdAt: new Date(msg.created_at),
        read: msg.read,
        participants: msg.participants
      }));
      setPrivateMessages(formattedMessages.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Mesajlar çekilirken hata oluştu:', error);
    }
  };

  // Arkadaş listesini yenileme fonksiyonu
  const refreshFriends = async () => {
    if (!user || !user.uid) return;
    const uid = user.uid;

    try {
      // Kullanıcı verisini yeniden çek
      const userDocRef = getUserDocRef(uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const freshUserData = userDoc.data();
        setUserData(freshUserData);
      }
    } catch (error) {
      console.error('Arkadaş listesi çekilirken hata oluştu:', error);
    }
  };

  // --- EFFECT 4: MESAJLAR (Socket Events) ---
  useEffect(() => {
    if (!user || !user.uid) return;

    // İlk yükleme
    if (activeTab === 'Messaging') {
      refreshMessages();
    }

    // Event Handler: Yeni Mesaj
    const handleNewMessage = (msg) => {
      console.log('[DEBUG] handleNewMessage triggered:', msg);

      // Mesaj zaten varsa ekleme (duplicate önlemek için)
      setPrivateMessages(prev => {
        if (prev.some(m => m.id === msg.id)) {
          console.log('[DEBUG] Message already exists in state, skipping:', msg.id);
          return prev;
        }

        // Tarih formatını düzelt ve camelCase'e çevir
        const formattedMsg = {
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: msg.receiver_id,
          text: msg.text,
          createdAt: new Date(msg.created_at || msg.createdAt),
          read: msg.read || false,
          participants: msg.participants
        };

        console.log('[DEBUG] Adding new message to state:', formattedMsg);

        // Eğer mesajlaşma sayfasındaysak ve bu kişiyle konuşuyorsak bildirim göstermeyebiliriz
        // Ama şimdilik basit tutalım
        if (msg.sender_id !== user.uid) {
          showNotification(`Yeni mesaj: ${msg.text.substring(0, 20)}${msg.text.length > 20 ? '...' : ''}`);
        }

        return [formattedMsg, ...prev].sort((a, b) => b.createdAt - a.createdAt);
      });
    };

    // Event Handler: Mesaj Gönderildi (Kendi gönderdiğim)
    const handleMessageSent = (msg) => {
      setPrivateMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        const formattedMsg = {
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: msg.receiver_id,
          text: msg.text,
          createdAt: new Date(msg.created_at || msg.createdAt),
          read: msg.read || false,
          participants: msg.participants
        };
        return [formattedMsg, ...prev].sort((a, b) => b.createdAt - a.createdAt);
      });
    };

    // Event Handler: Mesaj Okundu
    const handleMessageRead = ({ messageId, readAt }) => {
      setPrivateMessages(prev => prev.map(m =>
        m.id === parseInt(messageId) ? { ...m, read: true } : m
      ));
    };

    socketService.on('new_message', handleNewMessage);
    socketService.on('message_sent', handleMessageSent);
    socketService.on('message_read_update', handleMessageRead);

    return () => {
      socketService.off('new_message');
      socketService.off('message_sent');
      socketService.off('message_read_update');
    };
  }, [user, activeTab]);





  // --- EFFECT 3: RTDB ONLINE TAKİBİ ---
  useEffect(() => {
    if (!user || !user.uid) return;
    const uid = user.uid;
    const userStatusDatabaseRef = ref(rtdb, 'status/' + uid);
    const isOnlineForDatabase = { state: 'online', last_changed: rtdbServerTimestamp() };
    const isOfflineForDatabase = { state: 'offline', last_changed: rtdbServerTimestamp() };
    const statusRef = ref(rtdb, 'status');

    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      const statuses = snapshot.val();
      const currentOnlineUsers = {};
      for (const userId in statuses) {
        if (statuses[userId] && statuses[userId].state === 'online') currentOnlineUsers[userId] = true;
      }
      setOnlineUsers(currentOnlineUsers);
    });

    const connectedRef = ref(rtdb, '.info/connected');
    const unsubscribeConnected = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase);
        set(userStatusDatabaseRef, isOnlineForDatabase);
      }
    });
    return () => { unsubscribeStatus(); unsubscribeConnected(); };
  }, [user]);

  useEffect(() => {
    let interval;
    if (timer.running) interval = setInterval(() => { setTimer(prev => ({ ...prev, seconds: prev.seconds + 1 })); }, 1000);
    return () => clearInterval(interval);
  }, [timer.running]);



  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Bildirim İşlemleri
  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await notificationService.markAsRead(notif.id);
        // Lokal state'i güncelle
        setNotifications(prev => prev.map(n =>
          n.id === notif.id ? { ...n, read: true } : n
        ));
      } catch (error) {
        console.error('Bildirim okundu olarak işaretlenemedi:', error);
      }
    }
    setIsNotifPanelOpen(false);

    if (notif.relatedId) {
      setActiveTab('Farm');
      setTargetFarmId(notif.relatedId); // FarmPage'e sinyal gönder
    }
  };

  const deleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      // Lokal state'ten kaldır
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Bildirim silinemedi:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return <div className="h-screen bg-gray-900 flex items-center justify-center text-yellow-500 font-bold text-2xl animate-pulse">VERİLER YÜKLENİYOR...</div>;
  if (!user) return <AuthScreen />;
  if (!userData) return <div className="h-screen bg-gray-900 flex items-center justify-center text-white">Profil verisi bekleniyor...</div>;

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden font-sans relative">
      <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: null, type: 'success' })} />

      <aside className="w-20 lg:w-64 bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300">
        <div className="p-4 border-b border-gray-700 flex items-center justify-center lg:justify-start gap-3">
          <div className="bg-yellow-600 p-2 rounded-lg"><Sword size={24} className="text-white" /></div>
          <div className="hidden lg:block"><h1 className="font-bold text-yellow-500 text-lg leading-none">RO WORLD</h1><span className="text-xs text-gray-400">Tracker App</span></div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 space-y-2 px-2">
          <NavButton icon={<LayoutDashboard />} label="Özet Rapor" active={activeTab === "Dashboard"} onClick={() => setActiveTab("Dashboard")} />
          <NavButton icon={<Pickaxe />} label="Toplama (Gathering)" active={activeTab === "Gathering"} onClick={() => setActiveTab("Gathering")} />
          <NavButton icon={<Scroll />} label="Etkinlikler" active={activeTab === "Events"} onClick={() => setActiveTab("Events")} />
          <NavButton icon={<Users />} label="Farm (Solo/Party)" active={activeTab === "Farm"} onClick={() => setActiveTab("Farm")} />
          <NavButton icon={<MessageCircle />} label="Mesajlaşma" active={activeTab === "Messaging"} onClick={() => setActiveTab("Messaging")} />
          <NavButton icon={<Crown />} label="Clan" active={activeTab === "Clan"} onClick={() => setActiveTab("Clan")} />
          <NavButton icon={<Settings />} label="Ayarlar" active={activeTab === "Admin"} onClick={() => setActiveTab("Admin")} />
          <NavButton icon={<MapPin />} label="Sistem" active={activeTab === "System"} onClick={() => setActiveTab("System")} />
        </nav>
        <div className="p-4 bg-gray-900 border-t border-gray-700">
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-xs mb-1 font-bold tracking-wider">KRONOMETRE</span>
            <div className="text-2xl font-mono text-white mb-2">{formatTime(timer.seconds)}</div>
            <div className="flex gap-2">
              <button onClick={() => setTimer(prev => ({ ...prev, running: !prev.running }))} className={`p-2 rounded-full ${timer.running ? 'bg-red-600' : 'bg-green-600'}`}>{timer.running ? <Pause size={16} /> : <Play size={16} />}</button>
              <button onClick={() => setTimer(prev => ({ ...prev, seconds: 0, running: false }))} className="p-2 bg-gray-700 rounded-full"><RefreshCw size={16} /></button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 shadow-md z-10 relative">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-600">
              <History size={16} className="text-gray-400" />
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-white text-sm focus:outline-none" />
            </div>
            <div className="hidden md:flex items-center text-sm text-gray-400">
              <span className="mr-2">Karakter:</span>
              <span className="text-yellow-500 font-bold">{userData.profile?.mainCharacter || "Tanımsız"}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 relative">
            {/* Bildirim İkonu */}
            <button
              className="relative p-2 text-gray-400 hover:text-white transition"
              onClick={() => setIsNotifPanelOpen(!isNotifPanelOpen)}
            >
              <Bell size={20} />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-gray-800"></span>}
            </button>

            {/* Bildirim Paneli */}
            {isNotifPanelOpen && (
              <div className="absolute top-12 right-0 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 flex flex-col max-h-96">
                <div className="p-3 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 rounded-t-xl">
                  <span className="text-white font-bold flex items-center gap-2 text-sm"><BellRing size={16} /> Bildirimler</span>
                  {unreadCount > 0 && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full">{unreadCount} Yeni</span>}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                  {notifications.length === 0 ? (
                    <div className="text-center p-6 text-gray-500 text-sm">Hiç bildirim yok.</div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3 rounded mb-1 cursor-pointer transition relative group ${notif.read ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-700/50 border-l-2 border-yellow-500 hover:bg-gray-700'}`}
                      >
                        <div className="pr-6">
                          <p className={`text-sm ${notif.read ? 'text-gray-300' : 'text-white font-bold'}`}>{notif.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notif.text}</p>
                          <p className="text-[10px] text-gray-500 mt-1 text-right">{notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                        </div>
                        <button
                          onClick={(e) => deleteNotification(e, notif.id)}
                          className="absolute top-2 right-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="w-px h-6 bg-gray-700"></div>
            <button onClick={() => { authService.logout(); socketService.disconnect(); window.location.reload(); }} className="flex items-center gap-2 text-red-400 hover:text-red-300"><LogOut size={18} /><span className="hidden md:inline text-sm">Çıkış</span></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {activeTab === "Dashboard" && <DashboardPage userData={userData} selectedDate={selectedDate} farms={farms} user={user} />}
          {activeTab === "Gathering" && <GatheringPage userData={userData} selectedDate={selectedDate} prices={prices} uid={user.uid} />}
          {activeTab === "Events" && <EventsPage userData={userData} selectedDate={selectedDate} prices={prices} uid={user.uid} />}
          {activeTab === "Farm" && <FarmPage farms={farms} userData={userData} selectedDate={selectedDate} uid={user.uid} showNotification={showNotification} targetFarmId={targetFarmId} setTargetFarmId={setTargetFarmId} checkRateLimit={checkRateLimit} />}
          {activeTab === "Messaging" && <MessagingPage userData={userData} uid={user.uid} messages={privateMessages} checkRateLimit={checkRateLimit} showNotification={showNotification} refreshMessages={refreshMessages} />}
          {activeTab === "Clan" && <ClanPage userData={userData} uid={user.uid} showNotification={showNotification} />}
          {activeTab === "Admin" && <AdminPage userData={userData} uid={user.uid} prices={prices} showNotification={showNotification} setActiveTab={setActiveTab} onlineUsers={onlineUsers} checkRateLimit={checkRateLimit} globalItems={globalItems} showTooltip={showTooltip} hideTooltip={hideTooltip} refreshFriends={refreshFriends} />}
          {activeTab === "System" && <SystemPage userData={userData} uid={user.uid} showNotification={showNotification} checkRateLimit={checkRateLimit} />}
        </div>
      </main>
      {/* Zengin Tooltip */}
      {tooltipVisible && (
        <div
          id="item-tooltip"
          className="fixed w-[320px] bg-gray-900 border border-gray-600 shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-md rounded-lg p-5 pointer-events-none transition-opacity duration-100 z-[1000]"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            opacity: tooltipVisible ? 1 : 0
          }}
        >
          <div className="border-b border-white/10 pb-3 mb-3 text-center">
            <div className="font-extrabold text-xl leading-tight mb-1 px-2 py-2 rounded" style={getRarityStyles(tooltipContent.rarity)}>
              {tooltipContent.name || tooltipContent.itemName || "Bilinmeyen Eşya"}
            </div>
            <div className="flex justify-center gap-3 text-[10px] uppercase font-bold tracking-widest">
              <span style={tooltipContent.rarity ? getRarityStyles(tooltipContent.rarity) : {}}>
                {tooltipContent.rarity || "Normal"}
              </span>
              <span className="text-gray-500">
                {tooltipContent.itemType || "Eşya"}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] font-bold">
            {tooltipContent.level && (
              <div className="text-white flex justify-between"><span>Seviye:</span> <span>+{tooltipContent.level}</span></div>
            )}
            {tooltipContent.gearScore && (
              <div className="text-yellow-500 flex justify-between"><span>Gear Score:</span> <span>{tooltipContent.gearScore}</span></div>
            )}
            {tooltipContent.class && (
              <div className="text-white flex justify-between"><span>Sınıf (Class):</span> <span>{tooltipContent.class}</span></div>
            )}
            {tooltipContent.itemType && (
              <div className="text-white flex justify-between"><span>İtem Çeşidi:</span> <span>{tooltipContent.itemType}</span></div>
            )}

            <div className="pt-1.5 space-y-1">
              {tooltipContent.physicalDefenseBonus && (
                <div className="text-green-400 flex justify-between"><span>Fiziksel Savunma Bonusu:</span> <span>+{tooltipContent.physicalDefenseBonus}</span></div>
              )}
              {tooltipContent.strengthBonus && (
                <div className="text-green-400 flex justify-between"><span>Strength Bonus:</span> <span>+{tooltipContent.strengthBonus}</span></div>
              )}
              {tooltipContent.dexterityBonus && (
                <div className="text-green-400 flex justify-between"><span>Dexterity Bonus:</span> <span>+{tooltipContent.dexterityBonus}</span></div>
              )}
              {tooltipContent.intelligenceBonus && (
                <div className="text-green-400 flex justify-between"><span>Intelligence Bonus:</span> <span>+{tooltipContent.intelligenceBonus}</span></div>
              )}
              {tooltipContent.magicBonus && (
                <div className="text-green-400 flex justify-between"><span>Magic Bonus:</span> <span>+{tooltipContent.magicBonus}</span></div>
              )}
              {tooltipContent.healthBonus && (
                <div className="text-green-400 flex justify-between"><span>Health Bonus:</span> <span>+{tooltipContent.healthBonus}</span></div>
              )}
              {tooltipContent.hpBonus && (
                <div className="text-green-400 flex justify-between"><span>HP Bonusu:</span> <span>+{tooltipContent.hpBonus}</span></div>
              )}
              {tooltipContent.mpBonus && (
                <div className="text-green-400 flex justify-between"><span>MP Bonusu:</span> <span>+{tooltipContent.mpBonus}</span></div>
              )}
              {tooltipContent.fireResistance && (
                <div className="text-orange-400 flex justify-between"><span>Ateş Hasarı Direnci:</span> <span>+{tooltipContent.fireResistance}</span></div>
              )}
              {tooltipContent.iceResistance && (
                <div className="text-blue-300 flex justify-between"><span>Buz Hasarı Direnci:</span> <span>+{tooltipContent.iceResistance}</span></div>
              )}
              {tooltipContent.lightningResistance && (
                <div className="text-yellow-300 flex justify-between"><span>Yıldırım Hasarı Direnci:</span> <span>+{tooltipContent.lightningResistance}</span></div>
              )}
              {tooltipContent.poisonResistance && (
                <div className="text-green-300 flex justify-between"><span>Zehir Hasarı Direnci:</span> <span>+{tooltipContent.poisonResistance}</span></div>
              )}
              {tooltipContent.holyResistance && (
                <div className="text-green-300 flex justify-between"><span>Kutsal Hasarı Direnci:</span> <span>+{tooltipContent.holyResistance}</span></div>
              )}
              {tooltipContent.curseResistance && (
                <div className="text-green-300 flex justify-between"><span>Lanet Hasarı Direnci:</span> <span>+{tooltipContent.curseResistance}</span></div>
              )}
              {tooltipContent.daggerDefense && (
                <div className="text-green-300 flex justify-between"><span>Hançer Savunması:</span> <span>+{tooltipContent.daggerDefense}</span></div>
              )}
              {tooltipContent.swordDefense && (
                <div className="text-green-300 flex justify-between"><span>Kılıç Savunması:</span> <span>+{tooltipContent.swordDefense}</span></div>
              )}
              {tooltipContent.maceDefense && (
                <div className="text-green-300 flex justify-between"><span>Topuz Savunması:</span> <span>+{tooltipContent.maceDefense}</span></div>
              )}
              {tooltipContent.axeDefense && (
                <div className="text-green-300 flex justify-between"><span>Balta Savunması:</span> <span>+{tooltipContent.axeDefense}</span></div>
              )}
              {tooltipContent.spearDefense && (
                <div className="text-green-300 flex justify-between"><span>Mızrak Savunması:</span> <span>+{tooltipContent.spearDefense}</span></div>
              )}
              {tooltipContent.bowDefense && (
                <div className="text-green-300 flex justify-between"><span>Yay Savunması:</span> <span>+{tooltipContent.bowDefense}</span></div>
              )}
              {tooltipContent.fireDamage && (
                <div className="text-green-400 flex justify-between"><span>Ateş Hasarı:</span> <span>+{tooltipContent.fireDamage}</span></div>
              )}
              {tooltipContent.iceDamage && (
                <div className="text-green-400 flex justify-between"><span>Buz Hasarı:</span> <span>+{tooltipContent.iceDamage}</span></div>
              )}
              {tooltipContent.lightningDamage && (
                <div className="text-green-400 flex justify-between"><span>Yıldırım Hasarı:</span> <span>+{tooltipContent.lightningDamage}</span></div>
              )}
              {tooltipContent.expBonus && tooltipContent.expBonus !== 0 && (
                <div className="text-green-400 flex justify-between"><span>EXP Bonusu (%):</span> <span>+{tooltipContent.expBonus}%</span></div>
              )}
              {tooltipContent.coinBonus && tooltipContent.coinBonus !== 0 && (
                <div className="text-green-400 flex justify-between"><span>Coin Bonusu (%):</span> <span>+{tooltipContent.coinBonus}%</span></div>
              )}
              {tooltipContent.attackBonusAllMobs && (
                <div className="text-green-400 flex justify-between"><span>Tüm Yaratıklara Karşı Saldırı (%):</span> <span>+{tooltipContent.attackBonusAllMobs}%</span></div>
              )}
              {tooltipContent.bpBonusPerKill && (
                <div className="text-green-400 flex justify-between"><span>Öldürme Başına BP Bonusu:</span> <span>+{tooltipContent.bpBonusPerKill}</span></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- AuthScreen, NavButton, Dashboard, GatheringPage, EventsPage (Değişmedi) ---
const AuthScreen = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (username.length < 3 || password.length < 6) { setError('Geçersiz bilgiler.'); setLoading(false); return; }
    
    try {
      if (isRegister) {
        // Register user with new auth system
        await authService.register({
          email: generateEmail(username),
          username: username,
          password: password,
          mainCharacter: username
        });
        console.log('[DEBUG] User registered successfully');
      } else {
        // Login user with new auth system
        await authService.login({
          email: generateEmail(username),
          password: password
        });
        console.log('[DEBUG] User logged in successfully');
      }
      
      // Refresh the page to load the authenticated state
      window.location.reload();
      
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-xl w-full max-w-sm border border-gray-700">
        <h1 className="text-3xl font-bold text-yellow-500 mb-6 text-center">KingOfRise</h1>
        <div className="flex mb-6 border-b border-gray-700">
          <button onClick={() => setIsRegister(false)} className={`flex-1 py-2 ${!isRegister ? 'text-white border-b-2 border-yellow-500' : 'text-gray-400'}`}>Giriş</button>
          <button onClick={() => setIsRegister(true)} className={`flex-1 py-2 ${isRegister ? 'text-white border-b-2 border-yellow-500' : 'text-gray-400'}`}>Kayıt</button>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" placeholder="Kullanıcı Adı" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" placeholder="Şifre" required />
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-yellow-600 hover:bg-yellow-700 py-2 rounded font-bold">{loading ? '...' : (isRegister ? 'Kayıt Ol' : 'Giriş Yap')}</button>
        </form>
      </div>
    </div>
  );
};

const NavButton = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${active ? 'bg-yellow-600/20 text-yellow-500 border-r-4 border-yellow-500' : 'text-gray-400 hover:bg-gray-700'}`}>
    <div className={`${active ? 'text-yellow-500' : ''}`}>{icon}</div><span className="font-medium hidden lg:block">{label}</span>
  </button>
);
// --- YENİ FARM MODALI ---
const FarmCreateModal = ({ isOpen, onClose, userData, uid, editData, showNotification }) => {
  const [generalInfo, setGeneralInfo] = useState({ date: formatDate(new Date()), duration: "", location: "", mob: "" });
  const [members, setMembers] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState("");
  const [newItem, setNewItem] = useState({ name: "", count: 1, estPrice: 0, realPrice: 0, soldCount: 0 });

  // Konum seçimi için state'ler
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationDropdownRef = useRef(null);
  const [availableLocations, setAvailableLocations] = useState([]);

  // Mob seçimi için state'ler
  const [availableMobs, setAvailableMobs] = useState([]);

  // Item seçimi için state'ler
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const itemDropdownRef = useRef(null);
  const [availableItems, setAvailableItems] = useState([]);

  useEffect(() => {
    if (isOpen) {
      // Konum, mob ve item verilerini PostgreSQL API'den çek
      const fetchLocations = async () => {
        try {
          const locationsData = await locationService.getAllLocations();
          // PostgreSQL yapısına uygun olarak veriyi dönüştür
          const formattedLocations = locationsData.map(location => ({
            id: location.id,
            name: location.name,
            type: location.type,
            region: location.region,
            difficulty_level: location.difficulty_level,
            createdAt: location.created_at
          }));
          setAvailableLocations(formattedLocations);
        } catch (error) {
          console.error("Konumlar çekilirken hata oluştu:", error);
        }
      };

      const fetchMobs = async () => {
        try {
          const mobData = await mobService.getAllMobs();
          // PostgreSQL yapısına uygun olarak veriyi dönüştür
          const formattedMobs = mobData.map(mob => ({
            id: mob.id,
            name: mob.name,
            type: mob.type,
            level: mob.level,
            hp: mob.hp,
            attack_power: mob.attack_power,
            createdAt: mob.created_at
          }));
          setAvailableMobs(formattedMobs);
        } catch (error) {
          console.error("Moblar çekilirken hata oluştu:", error);
        }
      };

      const fetchItems = async () => {
        try {
          const itemsData = await itemService.getAllItems();
          // PostgreSQL yapısına uygun olarak veriyi dönüştür
          const formattedItems = itemsData.map(item => ({
            id: item.id,
            name: item.item_adi,
            itemType: item.item_cesidi,
            rarity: item.item_turu,
            class: item.sinif,
            level: item.seviye,
            gearScore: item.gear_score,
            createdAt: item.created_at
          }));
          setAvailableItems(formattedItems);
        } catch (error) {
          console.error("İtemler çekilirken hata oluştu:", error);
        }
      };

      fetchLocations();
      fetchMobs();
      fetchItems();

      if (editData) {
        setGeneralInfo({
          date: editData.date || formatDate(new Date()),
          duration: editData.duration || "",
          location: editData.location || "",
          mob: editData.mob || ""
        });
        const safeParticipants = Array.isArray(editData.participants) ? editData.participants : (editData.participants ? Object.values(editData.participants) : []);
        setMembers(safeParticipants);
        setItems(editData.items || []);
      } else {
        setGeneralInfo({ date: formatDate(new Date()), duration: "", location: "", mob: "" });
        setMembers([{ nickname: userData.profile?.mainCharacter || "Ben", uid: uid, isPaid: false, isOwner: true }]);
        setItems([]);
      }
    }
  }, [isOpen, editData, userData, uid]);

  const totalRevenue = useMemo(() => items.reduce((acc, item) => acc + (parseFloat(item.realPrice || 0) * parseInt(item.soldCount || 0)), 0), [items]);
  const sharePerPerson = useMemo(() => members.length > 0 ? totalRevenue / members.length : 0, [totalRevenue, members.length]);
  const isOwner = !editData || editData.ownerId === uid;

  // Filtrelenmiş konum listesi
  const filteredLocations = useMemo(() => {
    if (!locationSearch) return availableLocations;
    return availableLocations.filter(loc =>
      loc.name.toLowerCase().includes(locationSearch.toLowerCase())
    );
  }, [availableLocations, locationSearch]);

  // Filtrelenmiş item listesi
  const filteredItems = useMemo(() => {
    if (!itemSearch || itemSearch.length < 1) return [];
    return availableItems.filter(item =>
      item.name && item.name.toLowerCase().includes(itemSearch.toLowerCase())
    ).slice(0, 10); // En fazla 10 sonuç göster
  }, [availableItems, itemSearch]);

  // Konum dropdown'u için tıklama dışına çıkma
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) {
        setShowItemDropdown(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, locationDropdownRef, itemDropdownRef]);

  if (!isOpen) return null;

  const handleAddMember = () => {
    if (!selectedFriend) return;
    const friendEntry = Object.entries(userData.otherPlayers || {}).find(([key, p]) => p.nickname === selectedFriend);
    if (friendEntry) {
      const [key, player] = friendEntry;
      if (members.some(m => m.nickname === player.nickname)) { showNotification("Bu üye zaten ekli.", "error"); return; }
      setMembers([...members, { nickname: player.nickname, uid: player.linked ? player.uid : null, isPaid: false, isOwner: false }]);
      setSelectedFriend("");
    }
  };

  const handleTogglePaid = (index) => {
    if (!isOwner) return;
    const newMembers = [...members];
    newMembers[index].isPaid = !newMembers[index].isPaid;
    setMembers(newMembers);
  };

  const handleAddItem = () => {
    if (!newItem.name || newItem.count <= 0) return;
    setItems([...items, { ...newItem, soldCount: 0, id: Date.now() }]);
    setNewItem({ name: "", count: 1, estPrice: 0, realPrice: 0, soldCount: 0 });
  };

  const handleRemoveItem = (index) => { if (!isOwner) return; setItems(items.filter((_, i) => i !== index)); };
  const handleUpdateItem = (index, field, value) => {
    if (!isOwner) return;
    const newItems = [...items];
    if (field === 'soldCount') {
      const totalCount = parseInt(newItems[index].count);
      let val = parseInt(value);
      if (val > totalCount) val = totalCount;
      if (val < 0) val = 0;
      newItems[index].soldCount = val;
    } else if (field === 'realPrice') newItems[index].realPrice = value;
    setItems(newItems);
  };

  const handleRemoveMember = (index) => { if (!isOwner) return; setMembers(members.filter((_, i) => i !== index)); }

  // BİLDİRİM GÖNDERME FONKSİYONU
  const sendNotification = async (receiverId, title, text, relatedId) => {
    if (!receiverId || receiverId === uid) return;
    try {
      await notificationService.createNotification({
        receiver_id: receiverId,
        title,
        text,
        related_id: relatedId,
        read: false,
        type: 'general',
        priority: 'normal'
      });
    } catch (error) {
      console.error('Bildirim gönderilemedi:', error);
    }
  };

  const handleSave = async () => {
    try {
      const farmData = {
        ...generalInfo,
        participants: members,
        items: items,
        totalRevenue,
        sharePerPerson,
        updatedAt: serverTimestamp()
      };

      // Veri doğrulama
      console.log('Validating farm data:', farmData);
      console.log('User ID:', uid);
      console.log('Is owner:', isOwner);

      // Boş alan kontrolü
      if (!generalInfo.date || !generalInfo.location || !generalInfo.mob) {
        showNotification("Lütfen tüm alanları doldurun: tarih, konum ve mob.", "error");
        return;
      }

      if (editData) {
        // UPDATE İŞLEMİ
        console.log('Updating farm with data:', farmData);
        console.log('Farm ID:', editData.id);
        console.log('User ID:', uid);
        console.log('Owner ID:', editData.ownerId);

        // Güvenlik kontrolü - sadece sahibi güncelleyebilir
        if (editData.ownerId !== uid) {
          showNotification("Bu farmı düzenleme yetkiniz yok.", "error");
          return;
        }

        await updateDoc(getPublicDocRef('farms', editData.id), farmData);

        // Bildirim Mantığı: Gelir değişti mi?
        const oldRevenue = editData.totalRevenue || 0;
        let notifTitle = "Farm Güncellendi";
        let notifText = `${editData.farmNumber} numaralı farm kaydında güncelleme yapıldı.`;

        if (totalRevenue > oldRevenue) {
          notifTitle = "💰 Satış Yapıldı!";
          notifText = `${editData.farmNumber} numaralı farmda item satıldı. Yeni pay durumu: ${sharePerPerson.toLocaleString()}c. Tıkla ve kontrol et!`;
        }

        // Üyelere Bildirim Gönder
        members.forEach(member => {
          // Eğer yeni eklenen bir üyeyse "Hoşgeldin" mesajı, eskiyse "Güncelleme" mesajı
          const wasMember = editData.participants && (Array.isArray(editData.participants) ? editData.participants.some(p => p.nickname === member.nickname) : Object.values(editData.participants).some(p => p.nickname === member.nickname));

          if (member.uid) {
            if (!wasMember) {
              sendNotification(member.uid, "🆕 Farma Eklendiniz", `${generalInfo.location} (${generalInfo.mob}) farmına eklendiniz.`, editData.id);
            } else {
              sendNotification(member.uid, notifTitle, notifText, editData.id);
            }
          }
        });

        showNotification("Farm güncellendi!");
      } else {
        // CREATE İŞLEMİ
        const newFarmNumber = generateFarmNumber();
        const fullFarmData = {
          ...farmData,
          type: 'PARTY',
          ownerId: uid,
          farmNumber: newFarmNumber,
          createdAt: serverTimestamp()
        };

        console.log('Creating new farm with data:', fullFarmData);
        console.log('User ID:', uid);

        // Farm verisi doğrulama
        if (!fullFarmData.date || !fullFarmData.location || !fullFarmData.mob) {
          showNotification("Lütfen tüm gerekli alanları doldurun.", "error");
          return;
        }

        const docRef = await addDoc(getPublicCollectionRef('farms'), fullFarmData);

        // Üyelere Bildirim Gönder
        members.forEach(member => {
          if (member.uid) {
            sendNotification(member.uid, "🆕 Yeni Farm Başladı", `${generalInfo.location} - ${generalInfo.mob} slotunda yeni farm kaydı açıldı. (${newFarmNumber})`, docRef.id);
          }
        });

        showNotification("Farm oluşturuldu!");
      }
      onClose();
    } catch (error) {
      console.error('Farm save error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);

      // Daha ayrıntılı hata mesajı
      if (error.code === 'permission-denied') {
        showNotification("Yetki hatası: Farm kaydetme izniniz bulunmamaktadır. Lütfen yöneticiyle iletişime geçin.", "error");
      } else if (error.code === 'resource-exhausted') {
        showNotification("Sunucu hatası: Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.", "error");
      } else {
        showNotification("Hata oluştu: " + error.message, "error");
      }
    }
  };

  const availableFriends = Object.values(userData.otherPlayers || {}).map(p => p.nickname);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 w-full max-w-4xl rounded-xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <Pickaxe className="text-yellow-500" size={24} />
            <div>
              <h2 className="text-xl font-bold text-white">{editData ? `Farm Detayı (${editData.farmNumber})` : "Yeni Farm Oluştur"}</h2>
              {!isOwner && <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded border border-blue-700">Salt Okunur Mod</span>}
            </div>
          </div>
          <button onClick={onClose}><X className="text-gray-400 hover:text-white" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1"><label className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={12} /> Tarih</label><input type="date" disabled={!isOwner} value={generalInfo.date} onChange={e => setGeneralInfo({ ...generalInfo, date: e.target.value })} className={`w-full bg-gray-700 border border-gray-600 rounded p-2 text-white disabled:opacity-100 disabled:bg-gray-800 disabled:cursor-default ${!isOwner ? 'border-none' : ''}`} /></div>
            <div className="space-y-1"><label className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} /> Süre (Saat)</label><input type="text" disabled={!isOwner} placeholder="Örn: 2.5" value={generalInfo.duration} onChange={e => setGeneralInfo({ ...generalInfo, duration: e.target.value })} className={`w-full bg-gray-700 border border-gray-600 rounded p-2 text-white disabled:opacity-100 disabled:bg-gray-800 disabled:cursor-default ${!isOwner ? 'border-none' : ''}`} /></div>
            <div className="space-y-1 relative" ref={locationDropdownRef}>
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <MapPin size={12} /> Konum
              </label>
              <input
                type="text"
                disabled={!isOwner}
                placeholder="Slot adı..."
                value={locationSearch || generalInfo.location}
                onChange={(e) => {
                  setLocationSearch(e.target.value);
                  setGeneralInfo({ ...generalInfo, location: e.target.value });
                  setShowLocationDropdown(true);
                }}
                onFocus={() => setShowLocationDropdown(true)}
                className={`w-full bg-gray-700 border border-gray-600 rounded p-2 text-white disabled:opacity-100 disabled:bg-gray-800 disabled:cursor-default ${!isOwner ? 'border-none' : ''}`}
              />
              {showLocationDropdown && filteredLocations.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredLocations.map((loc) => (
                    <div
                      key={loc.id}
                      className="px-4 py-2 text-white hover:bg-gray-600 cursor-pointer"
                      onClick={() => {
                        setGeneralInfo({ ...generalInfo, location: loc.name });
                        setLocationSearch(loc.name);
                        setShowLocationDropdown(false);
                      }}
                    >
                      {loc.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1 relative">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Sword size={12} /> Mob
              </label>
              <select
                disabled={!isOwner}
                value={generalInfo.mob}
                onChange={e => setGeneralInfo({ ...generalInfo, mob: e.target.value })}
                className={`w-full bg-gray-700 border border-gray-600 rounded p-2 text-white disabled:opacity-100 disabled:bg-gray-800 disabled:cursor-default ${!isOwner ? 'border-none appearance-none' : ''}`}
              >
                <option value="">Seçiniz</option>
                {availableMobs.length > 0 ?
                  availableMobs.map(mob => <option key={mob.id} value={mob.name}>{mob.name}</option>) :
                  MOBS.map(m => <option key={m} value={m}>{m}</option>)
                }
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-700 flex flex-col">
              <h3 className="text-yellow-500 font-bold mb-3 flex items-center gap-2 border-b border-gray-700 pb-2"><Users size={18} /> Party Üyeleri ({members.length})</h3>
              {isOwner && (
                <div className="flex gap-2 mb-3">
                  <select value={selectedFriend} onChange={e => setSelectedFriend(e.target.value)} className="flex-1 bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm"><option value="">Oyuncu Seç...</option>{availableFriends.map(f => <option key={f} value={f}>{f}</option>)}</select>
                  <button onClick={handleAddMember} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded"><Plus size={18} /></button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 custom-scrollbar pr-1">
                {members.map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-700 p-2 rounded border border-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center font-bold text-white">{member.nickname.charAt(0).toUpperCase()}</div>
                      <div><p className="text-sm font-bold text-white">{member.nickname}</p>{member.uid && <p className="text-[10px] text-green-400 flex items-center gap-0.5"><LinkIcon size={8} /> Bağlı Hesap</p>}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right"><span className="text-[10px] text-gray-400 block uppercase">Hakediş</span><span className="text-blue-400 font-bold">{sharePerPerson.toLocaleString(undefined, { maximumFractionDigits: 0 })} c</span></div>
                      <button disabled={!isOwner} onClick={() => handleTogglePaid(idx)} className={`px-2 py-1 rounded text-xs font-bold transition-colors ${member.isPaid ? 'bg-green-600 text-white' : 'bg-red-900/50 text-red-400 border border-red-800'} ${!isOwner ? 'opacity-100 cursor-default' : ''}`}>{member.isPaid ? 'ÖDENDİ' : 'ÖDENMEDİ'}</button>
                      {isOwner && !member.isOwner && <button onClick={() => handleRemoveMember(idx)} className="text-gray-500 hover:text-red-400"><X size={16} /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-700 flex flex-col">
              <h3 className="text-green-400 font-bold mb-3 flex items-center gap-2 border-b border-gray-700 pb-2"><Coins size={18} /> Ganimet & Gelir</h3>
              {isOwner && (
                <div className="grid grid-cols-12 gap-2 mb-3 relative" ref={itemDropdownRef}>
                  <input
                    placeholder="İtem Adı"
                    value={itemSearch || newItem.name}
                    onChange={(e) => {
                      // 30 karakter limiti
                      if (e.target.value.length <= 30) {
                        setItemSearch(e.target.value);
                        setNewItem({ ...newItem, name: e.target.value });
                        setShowItemDropdown(true);
                      }
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                    className="col-span-5 bg-gray-700 rounded p-1 text-white text-xs border border-gray-600"
                  />
                  {showItemDropdown && filteredItems.length > 0 && (
                    <div className="absolute z-20 mt-6 col-span-5 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-40 overflow-auto">
                      {filteredItems.map((item) => (
                        <div
                          key={item.id}
                          className="px-3 py-2 text-white hover:bg-gray-600 cursor-pointer text-xs"
                          onClick={() => {
                            setNewItem({ ...newItem, name: item.name });
                            setItemSearch(item.name);
                            setShowItemDropdown(false);
                          }}
                        >
                          {item.name}
                        </div>
                      ))}
                    </div>
                  )}
                  <input type="number" placeholder="Top." value={newItem.count} onChange={e => setNewItem({ ...newItem, count: e.target.value })} className="col-span-2 bg-gray-700 rounded p-1 text-white text-xs border border-gray-600" />
                  <input type="number" placeholder="Tahmini" value={newItem.estPrice} onChange={e => setNewItem({ ...newItem, estPrice: e.target.value })} className="col-span-3 bg-gray-700 rounded p-1 text-white text-xs border border-gray-600" />
                  <button onClick={handleAddItem} className="col-span-2 bg-green-600 text-white rounded flex items-center justify-center text-xs font-bold">EKLE</button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 custom-scrollbar pr-1">
                {items.length === 0 && <p className="text-gray-500 text-xs text-center py-4">Henüz item eklenmedi.</p>}
                <div className="grid grid-cols-12 gap-1 text-[10px] text-gray-400 px-2 mb-1 font-bold"><span className="col-span-3">İtem</span><span className="col-span-1 text-center">Top.</span><span className="col-span-2 text-center">Satılan</span><span className="col-span-3 text-center">Birim Fiyat</span><span className="col-span-2 text-right">Gelir</span><span className="col-span-1"></span></div>
                {items.map((item, idx) => {
                  const realizedIncome = (parseFloat(item.realPrice || 0) * (parseInt(item.soldCount) || 0));
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-1 items-center bg-gray-700 p-2 rounded border border-gray-600 text-xs">
                      <div className="col-span-3 truncate text-white font-bold" title={item.name}>{item.name}</div>
                      <div className="col-span-1 text-center text-gray-300">{item.count}</div>
                      <input type="number" disabled={!isOwner} value={item.soldCount || 0} onChange={(e) => handleUpdateItem(idx, 'soldCount', e.target.value)} className={`col-span-2 bg-gray-900 border border-gray-600 rounded text-center text-yellow-500 font-bold focus:outline-none focus:border-yellow-500 ${!isOwner ? 'bg-transparent border-none appearance-none' : ''}`} />
                      <input type="number" disabled={!isOwner} value={item.realPrice || 0} onChange={(e) => handleUpdateItem(idx, 'realPrice', e.target.value)} className={`col-span-3 bg-gray-900 border border-gray-600 rounded text-center text-green-400 font-bold focus:outline-none focus:border-green-500 ${!isOwner ? 'bg-transparent border-none appearance-none' : ''}`} placeholder="Birim Fiyat" />
                      <div className="col-span-2 text-right text-green-400 font-bold">{realizedIncome.toLocaleString()}</div>
                      <div className="col-span-1 flex justify-end">{isOwner && <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-900 border-t border-gray-700 rounded-b-xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-8">
              <div><p className="text-xs text-gray-400">Toplam Ciro (Satılan)</p><p className="text-xl font-bold text-green-400">{totalRevenue.toLocaleString()} c</p></div>
              <div><p className="text-xs text-gray-400">Kişi Başı Pay</p><p className="text-xl font-bold text-blue-400">{sharePerPerson.toLocaleString(undefined, { maximumFractionDigits: 0 })} c</p></div>
            </div>
            {isOwner ? (
              <div className="flex gap-2 w-full md:w-auto">
                <button onClick={onClose} className="flex-1 md:flex-none px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium">İptal</button>
                <button onClick={handleSave} className="flex-1 md:flex-none px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-bold flex items-center justify-center gap-2"><Save size={18} /> Kaydet</button>
              </div>
            ) : (<div className="flex gap-2 w-full md:w-auto"><button onClick={onClose} className="flex-1 md:flex-none px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold">Kapat</button></div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

const ContextMenu = ({ x, y, options, onClose }) => {
  if (x === null || y === null) return null;
  const screenWidth = window.innerWidth; const screenHeight = window.innerHeight; const menuWidth = 200; const menuHeight = options.length * 40;
  const finalX = (x + menuWidth > screenWidth) ? x - menuWidth : x; const finalY = (y + menuHeight > screenHeight) ? y - menuHeight : y;
  return (<div style={{ top: finalY, left: finalX }} className="fixed z-50 bg-gray-700 border border-gray-600 rounded-lg shadow-2xl py-1 text-sm text-white min-w-[150px]">{options.map((option, index) => (<button key={index} onClick={() => { option.action(); onClose(); }} className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-gray-600 transition">{option.icon}<span>{option.label}</span></button>))}</div>);
};

// --- BOSS KAYIT MODALI ---
const BossRunModal = ({ isOpen, onClose, activeClan, uid, userData, editData, showNotification, checkRateLimit, clanBankItems, isOwner, availableItems, clanBalances }) => {
  const [bossName, setBossName] = useState("");
  const [date, setDate] = useState(formatDate(new Date()));
  const [participants, setParticipants] = useState([]);
  const [drops, setDrops] = useState([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [focusedDropIdx, setFocusedDropIdx] = useState(null);

  useEffect(() => {
    if (isOpen) {

      if (editData) {
        setBossName(editData.bossName || "");
        setDate(editData.date || formatDate(new Date()));
        setParticipants(editData.participants || []);
        setDrops(editData.drops || []);
      } else {
        setBossName("");
        setDate(formatDate(new Date()));
        setParticipants([{ uid, nickname: userData.profile?.mainCharacter || "Ben", isPaid: false }]);
        // Gold Bar ve Silver Bar itemlerini otomatik ekle (ön tanımlı ve satılacak şekilde)
        setDrops([
          { itemName: "Gold Bar", quantity: 1, estPrice: 100000000, isSold: true, soldPrice: 100000000 },
          { itemName: "Silver Bar", quantity: 1, estPrice: 10000000, isSold: true, soldPrice: 10000000 }
        ]);
      }
    }
  }, [isOpen, editData, activeClan, uid, userData]);

  // Update current user's nickname when userData changes (in case user updates their mainCharacter)
  useEffect(() => {
    if (isOpen && userData?.profile?.mainCharacter) {
      setParticipants(prev => 
        prev.map(p => 
          p.uid === uid 
            ? { ...p, nickname: userData.profile.mainCharacter } 
            : p
        )
      );
    }
  }, [userData?.profile?.mainCharacter, isOpen, uid]);

  // Also update participants when userData changes to ensure current user always uses mainCharacter
  useEffect(() => {
    if (isOpen && participants.length > 0) {
      setParticipants(prev => {
        let updated = false;
        const newParticipants = prev.map(p => {
          if (p.uid === uid && userData?.profile?.mainCharacter) {
            updated = true;
            return { ...p, nickname: userData.profile.mainCharacter };
          }
          return p;
        });
        
        return updated ? newParticipants : prev;
      });
    }
  }, [userData?.profile?.mainCharacter, isOpen, uid]);

  const handleAddParticipant = (memberUid, memberNick) => {
    setParticipants(prev => {
      if (prev.some(p => p.uid === memberUid)) {
        // If user is already in the list and it's the current user, update their entry to use mainCharacter
        if (memberUid === uid) {
          return prev.map(p => 
            p.uid === memberUid 
              ? { ...p, nickname: userData?.profile?.mainCharacter || p.nickname } 
              : p
          );
        }
        return prev;
      }
      return [...prev, { uid: memberUid, nickname: memberNick, isPaid: false }];
    });
  };

  const handleRemoveParticipant = (idx) => {
    setParticipants(participants.filter((_, i) => i !== idx));
  };

  const handleAddDrop = () => {
    setDrops([...drops, { itemName: "", quantity: 1, estPrice: 0, isSold: false, soldPrice: 0 }]);
  };

  const handleUpdateDrop = (idx, field, value) => {
    const newDrops = [...drops];
    newDrops[idx][field] = value;
    setDrops(newDrops);
  };

  const handleRemoveDrop = (idx) => {
    setDrops(drops.filter((_, i) => i !== idx));
  };

  const totalRevenue = drops.reduce((acc, d) => acc + (d.isSold ? (parseFloat(d.soldPrice || 0) * parseInt(d.quantity || 1)) : 0), 0);
  const sharePerPerson = participants.length > 0 ? Math.floor(totalRevenue / participants.length) : 0;

  const handleSave = async () => {
    if (!bossName.trim()) { showNotification("Boss adı boş olamaz.", "error"); return; }
    if (participants.length === 0) { showNotification("En az bir katılımcı olmalı.", "error"); return; }
    if (drops.length === 0) { showNotification("En az bir drop eklemelisiniz.", "error"); return; }

    // Rate limiting for clan leaders - max 2 creates per day, max 5 updates per day
    if (!editData) { // Creating new boss run
      if (!checkRateLimit('create_boss_run', uid, 2, 24 * 60 * 60 * 1000)) { // 2 creations per day
        showNotification("Günlük boss kayıt oluşturma limitinize ulaştınız (max 2/gün).", "error");
        return;
      }
    } else { // Updating existing boss run
      if (!checkRateLimit('update_boss_run', uid, 5, 24 * 60 * 60 * 1000)) { // 5 updates per day
        showNotification("Günlük boss kayıt güncelleme limitinize ulaştınız (max 5/gün).", "error");
        return;
      }
    }

    // Date validation - ensure date is not too far in the past (max 7 days)
    const selectedDateObj = new Date(date);
    const today = new Date();
    const maxPastDate = new Date(today);
    maxPastDate.setDate(maxPastDate.getDate() - 7); // Allow up to 7 days in the past

    if (selectedDateObj < maxPastDate) {
      showNotification("Geçmiş tarihli kayıt için çok eski bir tarih seçemezsiniz (max 7 gün geri).", "error");
      return;
    }

    if (selectedDateObj > today) {
      showNotification("Gelecek tarihli kayıt oluşturamazsınız.", "error");
      return;
    }

    try {
      // Whitelist and validate data to prevent injection attacks
      const sanitizedParticipants = participants.map(p => ({
        uid: String(p.uid),
        nickname: String(p.nickname).substring(0, 50), // Limit nickname length
        isPaid: Boolean(p.isPaid),
        shareAmount: Number(p.shareAmount) || 0
      }));

      const sanitizedDrops = drops.map(drop => ({
        itemName: String(drop.itemName).substring(0, 100), // Limit item name length
        quantity: parseInt(drop.quantity) || 1,
        estPrice: Number(drop.estPrice) || 0,
        isSold: Boolean(drop.isSold),
        soldPrice: Number(drop.soldPrice) || 0
      }));

      // Validate boss name length
      const sanitizedBossName = String(bossName).substring(0, 100);

      const runId = editData?.id || generateId();
      const runData = {
        clanId: String(activeClan.id),
        bossName: sanitizedBossName,
        date: String(date),
        participants: sanitizedParticipants,
        drops: sanitizedDrops,
        totalRevenue: Number(totalRevenue) || 0,
        createdBy: String(uid),
        createdAt: editData?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(getPublicDocRef('clan_boss_runs', runId), runData);

      // EĞER KULLANICI LİDER İSE: Bakiyeyi ve kasayı yönet (GÜNCELLENMİŞ MANTIK)
      if (isOwner) {
        for (const drop of drops) {
          const price = parseFloat(drop.soldPrice) || 0;
          const qty = parseInt(drop.quantity) || 1;
          const saleAmount = price * qty;

          // --- DURUM 1: İTEM SATILDI (İŞARETLİ) ---
          if (drop.isSold) {
            let balanceIncreaseNeeded = false;

            // YENİ KAYIT: Henüz bankaya girmedi, direkt satıldı -> Para ekle
            if (!editData) {
              balanceIncreaseNeeded = true;
            }
            // EDİT MODU: Bankada hala var mı diye bak (Tutarsızlık Kontrolü)
            else {
              const bankQuery = query(
                getPublicCollectionRef('clan_bank_items'),
                where('clanId', '==', activeClan.id)
              );
              const bankSnap = await getDocs(bankQuery);

              for (const itemDoc of bankSnap.docs) {
                const d = itemDoc.data();
                const matchByRunId = d.sourceDetails?.bossRunId === runId;
                const matchByName = d.itemName.trim() === drop.itemName.trim() && d.sourceDetails?.bossName === bossName.trim();

                // İtem bankadaysa SİL ve Bakiyeyi Artırmayı onayla
                if (matchByRunId || matchByName) {
                  await deleteDoc(itemDoc.ref);
                  console.log("Bankadan silindi:", d.itemName);
                  balanceIncreaseNeeded = true;
                }
              }
            }

            if (balanceIncreaseNeeded && saleAmount > 0) {
              console.log("Bakiye Güncelleniyor:", saleAmount);
              try {
                // First, try to get the current balance document
                const balanceRef = getPublicDocRef('clan_balance', activeClan.id);
                const balanceDoc = await getDoc(balanceRef);

                if (balanceDoc.exists()) {
                  // Document exists, use update to increment
                  await updateDoc(balanceRef, {
                    balance: increment(saleAmount),
                    updatedAt: serverTimestamp()
                  });
                } else {
                  // Document doesn't exist, create it with initial balance
                  await setDoc(balanceRef, {
                    clanId: activeClan.id,
                    balance: saleAmount,
                    updatedAt: serverTimestamp()
                  });
                }
              } catch (balanceError) {
                console.error("Bakiye güncelleme hatası:", balanceError);
                showNotification("Bakiye güncellenirken hata oluştu: " + balanceError.message, "error");
              }

              try {
                await addDoc(getPublicCollectionRef('clan_bank_transactions'), {
                  clanId: activeClan.id,
                  type: 'item_sold',
                  description: `${bossName} drobu satıldı: ${drop.itemName} (x${qty})`,
                  amount: saleAmount,
                  performedBy: uid,
                  timestamp: serverTimestamp()
                });
              } catch (transactionError) {
                console.error("İşlem geçmişi ekleme hatası:", transactionError);
              }
            }
          }

          // --- DURUM 2: İTEM SATILMADI (KASAYA GİRMELİ) ---
          else {
            let existsInBank = false;
            // Edit modundaysak bankada var mı diye bak
            if (editData) {
              const bankQuery = query(getPublicCollectionRef('clan_bank_items'), where('clanId', '==', activeClan.id));
              const bankSnap = await getDocs(bankQuery);
              existsInBank = bankSnap.docs.some(d => {
                const data = d.data();
                return (data.sourceDetails?.bossRunId === runId && data.itemName.trim() === drop.itemName.trim()) ||
                  (data.itemName.trim() === drop.itemName.trim() && data.sourceDetails?.bossName === bossName.trim());
              });
            }

            // Bankada yoksa ekle (Yeni kayıt veya yanlışlıkla silinmiş)
            if (!existsInBank) {
              // Permission check - only clan leader can add items to the bank
              if (!isOwner) {
                console.error("Sadece klan lideri bankaya item ekleyebilir");
                showNotification("Sadece klan lideri bankaya item ekleyebilir.", "error");
                continue; // Skip this iteration
              }

              const bankItemId = generateId();
              let targetPage = 1; let targetSlot = 0;

              // Calculate slot position considering all existing items in the database
              // to ensure proper slot allocation when multiple items are added
              try {
                const bankQuery = query(
                  getPublicCollectionRef('clan_bank_items'),
                  where('clanId', '==', activeClan.id)
                );
                const bankSnap = await getDocs(bankQuery);
                const allBankItems = bankSnap.docs.map(doc => doc.data());

                if (allBankItems.length > 0) {
                  const sortedItems = allBankItems.sort((a, b) => (a.page - b.page) || (a.slotIndex - b.slotIndex));
                  const lastItem = sortedItems[sortedItems.length - 1];
                  targetPage = lastItem.page || 1;
                  targetSlot = (lastItem.slotIndex || 0) + 1;
                  if (targetSlot >= 40) { targetSlot = 0; targetPage++; }
                }
              } catch (error) {
                // If there's an error getting the bank items, fall back to the original logic
                if (clanBankItems && clanBankItems.length > 0) {
                  const sortedItems = [...clanBankItems].sort((a, b) => (a.page - b.page) || (a.slotIndex - b.slotIndex));
                  const lastItem = sortedItems[sortedItems.length - 1];
                  targetPage = lastItem.page || 1;
                  targetSlot = (lastItem.slotIndex || 0) + 1;
                  if (targetSlot >= 40) { targetSlot = 0; targetPage++; }
                }
              }

              try {
                await setDoc(getPublicDocRef('clan_bank_items', bankItemId), {
                  id: bankItemId,
                  clanId: activeClan.id,
                  itemName: drop.itemName.trim(),
                  quantity: qty,
                  page: targetPage,
                  slotIndex: targetSlot,
                  source: 'boss_drop',
                  sourceDetails: { bossRunId: runId, bossName: bossName.trim(), date },
                  isSold: false,
                  addedBy: uid,
                  addedAt: serverTimestamp()
                });

                await addDoc(getPublicCollectionRef('clan_bank_transactions'), {
                  clanId: activeClan.id,
                  type: 'item_added',
                  description: `${bossName} drobu: ${drop.itemName} (x${qty})`,
                  itemName: drop.itemName,
                  quantity: qty,
                  performedBy: uid,
                  relatedBossRunId: runId,
                  timestamp: serverTimestamp()
                });
              } catch (addItemError) {
                console.error("Bankaya item ekleme hatası:", addItemError);
                showNotification("Bankaya item eklenirken hata oluştu: " + addItemError.message, "error");
              }
            }
          }
        }
      }

      showNotification(editData ? "Boss kaydı güncellendi." : "Boss kaydı oluşturuldu ve droplar kasaya eklendi.");
      onClose();
    } catch (e) {
      console.error(e);
      showNotification("Hata: " + e.message, "error");
    }
  };

  const handleBatchPay = async () => {
    if (!isOwner) return;
    const unpaidCount = participants.filter(p => !p.isPaid).length;
    if (unpaidCount === 0) { showNotification("Tüm paylar zaten ödenmiş.", "error"); return; }

    const totalToPay = unpaidCount * sharePerPerson;
    const currentBalance = clanBalances[activeClan.id] || 0;
    if (currentBalance < totalToPay) {
      showNotification("Yetersiz bakiye (Klan Kasası).", "error");
      return;
    }

    try {
      // Bakiyeyi düşür (Yeni Koleksiyon: clan_balance)
      const balanceRef = getPublicDocRef('clan_balance', activeClan.id);
      const balanceDoc = await getDoc(balanceRef);

      if (balanceDoc.exists()) {
        // Document exists, use update to increment
        await updateDoc(balanceRef, {
          balance: increment(-totalToPay),
          updatedAt: serverTimestamp()
        });
      } else {
        // Document doesn't exist, create it with initial balance
        await setDoc(balanceRef, {
          clanId: activeClan.id,
          balance: -totalToPay,
          updatedAt: serverTimestamp()
        });
      }

      // Herkesi ödendi yap
      const newParticipants = participants.map(p => ({ ...p, isPaid: true }));
      setParticipants(newParticipants);

      // Log ekle
      await addDoc(getPublicCollectionRef('clan_bank_transactions'), {
        clanId: activeClan.id,
        type: 'share_paid',
        description: `${bossName} için toplu ödeme (${unpaidCount} kişi)`,
        amount: totalToPay,
        performedBy: uid,
        timestamp: serverTimestamp()
      });

      showNotification("Toplu ödeme yapıldı.");
    } catch (e) {
      console.error(e);
      showNotification("Hata: " + e.message, "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h3 className="text-xl font-bold text-white flex items-center gap-2"><Sword size={24} className="text-red-500" /> {editData ? 'Kayıt Düzenle' : 'Yeni Boss Kaydı'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-red-600 rounded-lg transition"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
          {/* Üst Bilgiler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Boss Adı</label>
              <input value={bossName} onChange={e => setBossName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition" placeholder="Örn: Death Lord" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Tarih</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition" />
            </div>
          </div>

          {/* Katılımcılar */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Users size={14} /> Katılımcılar ({participants.length})</label>
              <button onClick={() => setIsBulkModalOpen(true)} className="text-[10px] bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded hover:bg-blue-600 hover:text-white transition uppercase font-bold">Üyeleri Toplu Ekle</button>
            </div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-4">
              <div className="flex flex-wrap gap-2">
                {participants.map((p, idx) => {
                  // For the current user (creator), always show mainCharacter from userData; for others, show nickname
                  const displayName = p.uid === uid 
                    ? (userData?.profile?.mainCharacter || p.nickname || p.main_character || "Ben")
                    : (p.nickname || p.main_character || p.username || "Kullanıcı");
                  
                  return (
                  <div key={idx} className="bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-1 py-1 flex items-center gap-2 group">
                    <span className="text-sm font-bold text-white">{displayName}</span>
                    <button
                      onClick={() => handleUpdateDrop(idx, 'isPaid', !p.isPaid)}
                      className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${p.isPaid ? 'bg-green-600 text-white' : 'bg-red-600/20 text-red-400 border border-red-500/30'}`}
                    >
                      {p.isPaid ? 'Ödendi' : 'Ödenmedi'}
                    </button>
                    <button onClick={() => handleRemoveParticipant(idx)} className="p-1 text-gray-500 hover:text-red-400 transition"><Trash2 size={12} /></button>
                  </div>
                )})}
                <div className="relative group">
                  <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1 text-gray-500 focus-within:border-red-500 transition cursor-pointer">
                    <Plus size={14} />
                    <span className="text-xs">Üye Ekle...</span>
                  </div>
                  <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-20 py-1 hidden group-hover:block transition animate-in fade-in slide-in-from-top-2">
                    {activeClan.members?.filter(uid => !participants.some(p => p.uid === uid)).map(memberUid => {
                      const friend = Object.values(userData.otherPlayers || {}).find(p => p.uid === memberUid);
                      const displayName = friend?.nickname || memberUid.substring(0, 8);
                      return <button key={memberUid} onClick={() => handleAddParticipant(memberUid, displayName)} className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white">{displayName}</button>;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Droplar */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Coins size={14} /> Droplar ({drops.length})</label>
              <button onClick={handleAddDrop} className="text-[10px] bg-green-600/20 text-green-400 border border-green-500/30 px-2 py-1 rounded hover:bg-green-600 hover:text-white transition uppercase font-bold">Drop Ekle</button>
            </div>
            <div className="space-y-2">
              {drops.map((drop, idx) => (
                <div key={idx} className="bg-gray-900/50 border border-gray-700 rounded-xl p-3 grid grid-cols-12 gap-3 items-center group">
                  <div className="col-span-4 relative">
                    <input
                      value={drop.itemName}
                      onChange={e => handleUpdateDrop(idx, 'itemName', e.target.value)}
                      onFocus={() => setFocusedDropIdx(idx)}
                      onBlur={() => setTimeout(() => setFocusedDropIdx(null), 200)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition"
                      placeholder="İtem Adı"
                    />
                    {focusedDropIdx === idx && (
                      <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-700 rounded-xl mt-1 shadow-2xl z-30 max-h-40 overflow-y-auto custom-scrollbar">
                        {availableItems.filter(i => i.name.toLowerCase().includes(drop.itemName.toLowerCase())).map(i => (
                          <button key={i.id} onClick={() => handleUpdateDrop(idx, 'itemName', i.name)} className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white flex items-center justify-between">
                            <span>{i.name}</span>
                            <span className="text-[10px] text-gray-500">{i.level || 'Uniq'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <input type="number" value={drop.quantity} onChange={e => handleUpdateDrop(idx, 'quantity', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" placeholder="Adet" />
                  </div>
                  <div className="col-span-5 flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                      <input type="checkbox" checked={drop.isSold} onChange={e => handleUpdateDrop(idx, 'isSold', e.target.checked)} disabled={!isOwner} className="accent-green-500 disabled:opacity-50" />
                      <input
                        type="number"
                        value={drop.isSold ? drop.soldPrice : drop.estPrice}
                        onChange={e => handleUpdateDrop(idx, drop.isSold ? 'soldPrice' : 'estPrice', e.target.value)}
                        disabled={!isOwner && drop.isSold}
                        className="w-full bg-transparent text-white focus:outline-none text-xs placeholder-gray-600 disabled:text-gray-500"
                        placeholder={drop.isSold ? "Satış Fiyatı" : "Tahmini Fiyat"}
                      />
                    </div>
                  </div>
                  <div className="col-span-1 text-right">
                    <button onClick={() => handleRemoveDrop(idx)} className="p-2 text-gray-500 hover:text-red-400 transition"><X size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alt Panel / Özet */}
        <div className="p-6 bg-gray-900 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-8">
            <div className="text-center md:text-left">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Toplam Gelir</p>
              <p className="text-xl font-mono font-bold text-green-400">{totalRevenue.toLocaleString()} <span className="text-xs">COIN</span></p>
            </div>
            <div className="text-center md:text-left">
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Kişi Başı Pay</p>
              <p className="text-xl font-mono font-bold text-blue-400">{sharePerPerson.toLocaleString()} <span className="text-xs">COIN</span></p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            {isOwner && (
              <button
                onClick={handleBatchPay}
                className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2"
                title="Klan bakiyesinden tüm unpaid üyeleri öde"
              >
                <Coins size={18} /> Toplu Öde
              </button>
            )}
            <button onClick={handleSave} className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold transition">KAYDET</button>
          </div>
        </div>
      </div>

      <BulkMemberAddModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        activeClan={activeClan}
        userData={userData}
        onAdd={handleAddParticipant}
        selectedUids={participants.map(p => p.uid)}
      />
    </div>
  );
}

const BulkMemberAddModal = ({ isOpen, onClose, activeClan, userData, onAdd, selectedUids }) => {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (isOpen) setSelected([]);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (uid) => {
    if (selected.includes(uid)) setSelected(selected.filter(u => u !== uid));
    else setSelected([...selected, uid]);
  };

  const handleConfirm = () => {
    selected.forEach(uid => {
      const friend = Object.values(userData.otherPlayers || {}).find(p => p.uid === uid);
      const nick = friend?.nickname || uid.substring(0, 8);
      onAdd(uid, nick);
    });
    onClose();
  };

  const members = activeClan.members?.filter(u => !selectedUids.includes(u)) || [];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h4 className="text-white font-bold flex items-center gap-2"><Users size={18} /> Üyeleri Toplu Seç</h4>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded"><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-4 overflow-y-auto max-h-60 custom-scrollbar space-y-2">
          {members.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">Eklenecek yeni üye yok.</p>
          ) : members.map(uid => {
            const friend = Object.values(userData.otherPlayers || {}).find(p => p.uid === uid);
            const nick = friend?.nickname || uid.substring(0, 8);
            const isSel = selected.includes(uid);
            return (
              <div
                key={uid}
                onClick={() => handleToggle(uid)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${isSel ? 'bg-blue-600/20 border-blue-500' : 'bg-gray-900 border-gray-700 hover:border-gray-500'}`}
              >
                <span className="text-sm text-white font-medium">{nick}</span>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${isSel ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-600'}`}>
                  {isSel && <Check size={14} />}
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4 bg-gray-900 border-t border-gray-700 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-400 font-bold hover:text-white transition">İPTAL</button>
          <button onClick={handleConfirm} disabled={selected.length === 0} className="flex-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white py-2 px-6 rounded-lg text-sm font-bold transition">EKLE ({selected.length})</button>
        </div>
      </div>
    </div>
  );
}

// --- TRANSAKSİYON LOG MODALI ---
const TransactionLogModal = ({ isOpen, onClose, transactions, userData }) => {
  if (!isOpen) return null;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'item_added': return <Plus size={16} className="text-green-400" />;
      case 'item_removed': return <Trash2 size={16} className="text-red-400" />;
      case 'item_sold': return <Coins size={16} className="text-yellow-400" />;
      case 'balance_added': return <Plus size={16} className="text-green-400" />;
      case 'balance_deducted': return <X size={16} className="text-red-400" />;
      case 'share_paid': return <Users size={16} className="text-blue-400" />;
      default: return <History size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-2xl h-[70vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h4 className="text-white font-bold flex items-center gap-2"><History size={18} className="text-yellow-500" /> İşlem Geçmişi</h4>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded"><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2 bg-gray-900/30">
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-10">Henüz bir işlem kaydı yok.</p>
          ) : transactions.map((log, idx) => (
            <div key={idx} className="bg-gray-800/50 border border-gray-700/50 p-3 rounded-xl flex items-center justify-between group hover:border-gray-600 transition">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-900 rounded-lg">{getTypeIcon(log.type)}</div>
                <div>
                  <p className="text-sm text-gray-200 font-medium">{log.description}</p>
                  <p className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Az önce'}
                    <span>•</span>
                    <span className="text-gray-400 font-sans uppercase tracking-tight">Yapan: {log.performedByNick || log.performedBy.substring(0, 8)}</span>
                  </p>
                </div>
              </div>
              {log.amount && (
                <div className={`text-sm font-mono font-bold ${log.type.includes('added') || log.type === 'item_sold' ? 'text-green-400' : 'text-red-400'}`}>
                  {log.type.includes('added') || log.type === 'item_sold' ? '+' : '-'}{log.amount.toLocaleString()} c
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- BANKA İTEM DETAY MODALI ---
const BankItemDetailModal = ({ isOpen, onClose, item, isOwner, onRemove }) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 border-b border-gray-700 relative">
          <div className="w-20 h-20 bg-gray-900 border border-gray-700 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-inner group overflow-hidden">
            <Briefcase size={40} className="text-gray-700 group-hover:scale-110 transition duration-500" />
          </div>
          <h4 className="text-center text-white font-bold text-lg">{item.itemName}</h4>
          <p className="text-center text-yellow-500 text-xs font-bold uppercase tracking-widest">{item.quantity} ADET</p>
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-bold uppercase">Kaynak</span>
              <span className="text-gray-300 font-medium bg-gray-900 px-2 py-0.5 rounded border border-gray-700">{item.source === 'boss_drop' ? 'Boss Drobu' : (item.source === 'manual' ? 'Lider Ekleme' : 'Bağış')}</span>
            </div>
            {item.sourceDetails?.bossName && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-bold uppercase">Boss</span>
                <span className="text-red-400 font-bold underline">{item.sourceDetails.bossName}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-bold uppercase">Tarih</span>
              <span className="text-gray-300">{item.addedAt?.toDate ? item.addedAt.toDate().toLocaleDateString() : 'Bilinmiyor'}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-700 flex gap-2">
            <button onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl text-sm font-bold transition">KAPAT</button>
            {isOwner && (
              <button onClick={() => onRemove(item)} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-4 py-2.5 rounded-xl transition border border-red-500/30">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MANUEL İTEM EKLEME MODALI ---
const ManualItemAddModal = ({ isOpen, onClose, activeClan, uid, clanBankItems, showNotification, availableItems }) => {
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setItemName("");
      setQuantity(1);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!itemName) { showNotification("İtem adı seçiniz.", "error"); return; }
    if (quantity <= 0) { showNotification("Miktar 0'dan büyük olmalı.", "error"); return; }

    try {
      const bankItemId = generateId();

      // Boş slot bul
      let targetPage = 1;
      let targetSlot = 0;

      if (clanBankItems && clanBankItems.length > 0) {
        const sortedItems = [...clanBankItems].sort((a, b) => (a.page - b.page) || (a.slotIndex - b.slotIndex));
        const lastItem = sortedItems[sortedItems.length - 1];

        targetPage = lastItem.page || 1;
        targetSlot = (lastItem.slotIndex || 0) + 1;

        if (targetSlot >= 40) {
          targetSlot = 0;
          targetPage++;
        }
      }

      await setDoc(getPublicDocRef('clan_bank_items', bankItemId), {
        id: bankItemId,
        clanId: activeClan.id,
        itemName,
        quantity: parseInt(quantity),
        page: targetPage,
        slotIndex: targetSlot,
        source: 'manual',
        isSold: false,
        addedBy: uid,
        addedAt: serverTimestamp()
      });

      // Log
      await addDoc(getPublicCollectionRef('clan_bank_transactions'), {
        clanId: activeClan.id,
        type: 'item_added',
        description: `Manuel ekleme: ${itemName} (x${quantity})`,
        itemName,
        quantity: parseInt(quantity),
        performedBy: uid,
        timestamp: serverTimestamp()
      });

      showNotification("İtem kasaya eklendi.");
      onClose();
    } catch (e) {
      console.error(e);
      showNotification("Hata: " + e.message, "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h4 className="text-white font-bold flex items-center gap-2"><Plus size={18} className="text-green-500" /> Manuel İtem Ekle</h4>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded"><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">İtem Seçin</label>
            <div className="relative">
              <input
                value={itemName}
                onChange={e => { setItemName(e.target.value); setIsSearching(true); }}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition"
                placeholder="İtem ara..."
              />
              {isSearching && itemName && (
                <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-700 rounded-xl mt-1 shadow-2xl z-30 max-h-40 overflow-y-auto">
                  {availableItems.filter(i => i.name.toLowerCase().includes(itemName.toLowerCase())).map(i => (
                    <button
                      key={i.id}
                      onClick={() => { setItemName(i.name); setIsSearching(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      {i.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Miktar</label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none"
              placeholder="1"
            />
          </div>

          <div className="pt-4 flex gap-2">
            <button onClick={onClose} className="flex-1 py-3 text-gray-400 font-bold hover:text-white transition">İPTAL</button>
            <button onClick={handleSave} className="flex-2 bg-green-600 hover:bg-green-700 text-white py-3 px-8 rounded-xl font-bold transition">KASAYA EKLE</button>
          </div>
        </div>
      </div>
    </div>
  );
}


