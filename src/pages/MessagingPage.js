import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MessageCircle, Search, Send, CheckCheck, UserX } from 'lucide-react';
import { messageService } from '../services/api';
import socketService from '../services/socketService';

const MessagingPage = ({ userData, uid, messages, checkRateLimit, showNotification, refreshMessages }) => {
  const [activeContactId, setActiveContactId] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isTyping, setIsTyping] = useState(false); // Karşı taraf yazıyor mu?
  const [blockedUsers, setBlockedUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  // Kişileri filtrele
  const contacts = useMemo(() => {
    if (!userData.otherPlayers) return [];
    return Object.values(userData.otherPlayers)
      .filter(p => p.linked && p.uid !== uid)
      .filter(p =>
        p.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.realUsername?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [userData.otherPlayers, searchTerm, uid]);

  // Aktif sohbet mesajları
  const activeChatMessages = useMemo(() => {
    if (!activeContactId) return [];
    return messages.filter(m =>
      (m.senderId === uid && m.receiverId === activeContactId) ||
      (m.senderId === activeContactId && m.receiverId === uid)
    );
  }, [messages, activeContactId, uid]);

  // Engellenen kullanıcıları yükle
  useEffect(() => {
    const fetchBlockedUsers = async () => {
      try {
        const response = await messageService.getBlockedUsers(uid);
        setBlockedUsers(response.blockedUsers.map(user => user.blocked_id));
      } catch (error) {
        console.error('Engellenen kullanıcılar alınırken hata oluştu:', error);
      }
    };
    
    if (uid) {
      fetchBlockedUsers();
    }
  }, [uid]);

  // Mesaj okundu olarak işaretleme (otomatik)
  useEffect(() => {
    if (activeContactId && activeChatMessages.length > 0) {
      const unreadMessages = activeChatMessages.filter(m => m.senderId === activeContactId && !m.read);
      if (unreadMessages.length > 0) {
        // En son okunmamış mesajı bul ve oku (backend hepsini okundu yapar mı? controller logic'e göre ID bazlı)
        // Controller'da loop içinde çağırmak yerine, okundu bilgisini tek tek atabiliriz veya API'yi toplu okuma için güncelleyebiliriz.
        // Şimdilik tek tek atalım ama user deneyimi için sessizce.
        unreadMessages.forEach(async (m) => {
          try {
            await messageService.markAsRead(m.id, uid);
            // State güncellemesi App.js'deki socket listener ile gelecek ('message_read_update')
            // ama anlık UI tepkisi için burada da lokal bir flag gerekebilir, fakat messages prop'u App.js'den geliyor.
            // Socket event'i gelince App.js privateMessages'i güncelleyecek ve bu sayfaya yeni props gelecek.
          } catch (error) {
            console.error('Mesaj okundu hatası:', error);
          }
        });
      }
    }
  }, [activeContactId, activeChatMessages, uid]);

  // Typing Listener
  useEffect(() => {
    if (!activeContactId) return;

    const handleTyping = ({ senderId }) => {
      if (senderId === activeContactId) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = ({ senderId }) => {
      if (senderId === activeContactId) {
        setIsTyping(false);
      }
    };

    socketService.on('typing', handleTyping);
    socketService.on('stop_typing', handleStopTyping);

    return () => {
      socketService.off('typing');
      socketService.off('stop_typing');
      setIsTyping(false);
    };
  }, [activeContactId]);

  // Typing Local State (Redundant emisyon önleyici - useRef ile senkron kontrol)
  const isLocalTypingRef = useRef(false);

  // Typing Emitter
  const handleInputChange = (e) => {
    setMessageText(e.target.value);

    if (activeContactId) {
      // Sadece ilk harfte/yazmaya başladığında gönder
      if (!isLocalTypingRef.current) {
        isLocalTypingRef.current = true;
        socketService.emit('typing', { receiverId: activeContactId });
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socketService.emit('stop_typing', { receiverId: activeContactId });
        isLocalTypingRef.current = false;
      }, 2000);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeContactId) return;

    // Rate limiting kontrolü
    if (!checkRateLimit('send_message', uid, 20, 60000)) {
      showNotification("Çok hızlı mesaj gönderiyorsunuz. Spam koruması devrede.", "error");
      return;
    }

    if (messageText.length > 1000) {
      showNotification("Mesaj çok uzun (Max 1000 karakter).", "error");
      return;
    }

    try {
      // API çağrısı (Backend socket emit yapacak)
      await messageService.createMessage(uid, {
        receiverId: activeContactId,
        text: messageText.trim()
      });

      setMessageText("");
      socketService.emit('stop_typing', { receiverId: activeContactId });
      // showNotification("Mesaj gönderildi", "success"); // Gerek yok, chat'te görünecek

    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      if (error.res?.status === 403) {
        showNotification("Bu kullanıcıya mesaj gönderemezsiniz (Engellenmiş olabilirsiniz).", "error");
      } else {
        showNotification("Mesaj gönderilemedi.", "error");
      }
    }
  };

  const blockUser = async () => {
    const confirm = window.confirm("Bu kullanıcıyı engellemek istediğinize emin misiniz?");
    if (confirm && activeContactId) {
      try {
        await messageService.blockUser(uid, activeContactId);
        showNotification("Kullanıcı engellendi", "success");
        // Engellenen kullanıcı listesini güncelle
        setBlockedUsers(prev => [...prev, activeContactId]);
        setActiveContactId(null);
      } catch (e) {
        console.error(e);
        showNotification("Engelleme başarısız", "error");
      }
    }
  };

  const unblockUser = async () => {
    const confirm = window.confirm("Bu kullanıcının engelini kaldırmak istediğinize emin misiniz?");
    if (confirm && activeContactId) {
      try {
        await messageService.unblockUser(uid, activeContactId);
        showNotification("Kullanıcının engeli kaldırıldı", "success");
        // Engellenen kullanıcı listesini güncelle
        setBlockedUsers(prev => prev.filter(id => id !== activeContactId));
      } catch (e) {
        console.error(e);
        showNotification("Engel kaldırma başarısız", "error");
      }
    }
  };

  const getUnreadCount = (contactUid) => messages.filter(m => m.senderId === contactUid && m.receiverId === uid && !m.read).length;

  return (
    <div className="flex h-[calc(100vh-140px)] bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
      <div className="w-1/3 border-r border-gray-700 flex flex-col bg-gray-800">
        <div className="p-4 border-b border-gray-700 bg-gray-900/50">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2"><MessageCircle size={20} /> Sohbetler</h3>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <input className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-9 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors" placeholder="Kişi ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {contacts.length === 0 ? <div className="p-8 text-center text-gray-500 text-sm">Kişi listeniz boş veya arama sonucu yok.</div> : contacts.map(contact => {
            const unread = getUnreadCount(contact.uid); return (
              <div key={contact.uid} onClick={() => setActiveContactId(contact.uid)} className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-700 transition-colors border-b border-gray-700/50 ${activeContactId === contact.uid ? 'bg-gray-700' : ''}`}>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-800 flex items-center justify-center text-white font-bold text-lg shadow-lg">{contact.nickname.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="text-white font-medium truncate">{contact.nickname}</h4>
                    {unread > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">{unread}</span>}
                  </div>
                  <p className="text-gray-500 text-xs truncate">@{contact.realUsername}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex-1 flex flex-col bg-[#0b141a]">
        {activeContactId ? (
          <>
            <div className="p-3 border-b border-gray-700 bg-gray-800 flex items-center justify-between shadow-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-700 flex items-center justify-center text-white text-sm font-bold">{contacts.find(c => c.uid === activeContactId)?.nickname.charAt(0)}</div>
                <div>
                  <h3 className="text-white font-bold text-sm">{contacts.find(c => c.uid === activeContactId)?.nickname}</h3>
                  {isTyping && <span className="text-green-400 text-xs animate-pulse">yazıyor...</span>}
                </div>
              </div>
              <button 
                onClick={() => {
                  if (blockedUsers.includes(activeContactId)) {
                    unblockUser();
                  } else {
                    blockUser();
                  }
                }} 
                className={`text-gray-400 transition-colors ${blockedUsers.includes(activeContactId) ? 'text-green-500 hover:text-green-400' : 'hover:text-red-500'}`}
                title={blockedUsers.includes(activeContactId) ? "Engeli kaldır" : "Kullanıcıyı engelle"}
              >
                <UserX size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-opacity-50" style={{ backgroundImage: 'radial-gradient(circle at center, #111827 0%, #0b141a 100%)' }}>
              <div className="text-center text-xs text-gray-600 my-4 flex items-center justify-center gap-2"><span className="w-16 h-[1px] bg-gray-700"></span>🔒 Mesajlar uçtan uca şifrelidir<span className="w-16 h-[1px] bg-gray-700"></span></div>
              {activeChatMessages.map(msg => {
                const isMe = msg.senderId === uid;
                
                // Karşı tarafın adını al (kendi realsename değil, bizim otherPlayers'ta kayıtlı takma adı)
                let senderDisplayName = isMe ? 'Ben' : 'Bilinmeyen';
                if (!isMe && userData?.otherPlayers) {
                  const senderInFriends = Object.values(userData.otherPlayers).find(
                    friend => friend.uid === msg.senderId
                  );
                  if (senderInFriends && senderInFriends.nickname) {
                    senderDisplayName = senderInFriends.nickname;
                  } else {
                    // Eğer UID ile eşleşmezse, gerçek kullanıcı adını kullan
                    senderDisplayName = msg.senderUsername || 'Bilinmeyen';
                  }
                }
                
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[70%] px-4 py-2 rounded-xl text-sm shadow-md relative group ${isMe ? 'bg-gradient-to-r from-green-700 to-green-600 text-white rounded-br-none' : 'bg-gray-700 text-white rounded-bl-none'}`}>
                      {!isMe && (
                        <p className="text-xs font-bold text-gray-300 mb-1">{senderDisplayName}</p>
                      )}
                      <p className="mr-6 break-words leading-relaxed">{msg.text}</p>
                      <div className="flex justify-end items-center gap-1 mt-1 opacity-70 absolute bottom-1 right-2">
                        <span className="text-[10px]">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && <CheckCheck size={14} className={msg.read ? "text-blue-300" : "text-gray-400"} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div id="messagesOnBottom"></div>
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-gray-800 flex gap-2 items-center border-t border-gray-700">
              <input
                className="flex-1 bg-gray-700 border border-gray-600 rounded-full px-4 py-3 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all shadow-inner"
                placeholder="Mesaj yaz..."
                value={messageText}
                onChange={handleInputChange}
              />
              <button type="submit" className="bg-green-600 hover:bg-green-500 p-3 rounded-full text-white shadow-lg transform active:scale-95 transition-all w-12 h-12 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed" disabled={!messageText.trim()}>
                <Send size={20} className={messageText.trim() ? "ml-0.5" : ""} />
              </button>
            </form>
          </>
        ) : <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4 opacity-50">
          <MessageCircle size={64} />
          <p>Konuşma başlatmak için bir kişi seçin.</p>
        </div>}
      </div>
    </div>
  );
};

export default MessagingPage;