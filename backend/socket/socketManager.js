const socketIo = require('socket.io');
const jwt = require('jsonwebtoken'); // Auth için
require('dotenv').config();

let io;
const connectedUsers = new Map(); // userId -> socketId

const initialize = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*", // Geliştirme ortamı için geniş izin (Production'da kısıtlanmalı)
            methods: ["GET", "POST"]
        }
    });

    // Authentication Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("Authentication error"));

        // Firebase Auth token verify işi biraz karmaşık olabilir çünkü backend'de 'jsonwebtoken' ile verify edemeyiz
        // (Firebase public key lazım). Basitlik için şimdilik token varlığına bakıyoruz.
        // İdeal çözüm için firebase-admin.auth().verifyIdToken(token) kullanılmalı.
        // Şimdilik client uid'yi gönderiyor varsayalım (Güvensiz ama başlangıç için)
        // TODO: Firebase Admin SDK ile verifyIdToken ekle

        const userId = socket.handshake.auth.userId;
        if (!userId) return next(new Error("User ID missing"));

        socket.userId = userId;
        next();
    });

    io.on('connection', (socket) => {
        console.log(`[SocketManager] User connected: ${socket.userId} (SocketID: ${socket.id})`);

        // Kullanıcıyı kaydet
        connectedUsers.set(socket.userId, socket.id);

        // Kullanıcının kendi odasına katılmasını sağla
        socket.join(socket.userId);
        console.log(`[SocketManager] User "${socket.userId}" joined room "${socket.userId}". Total rooms: ${io.sockets.adapter.rooms.size}`);

        socket.on('disconnect', () => {
            console.log(`[SocketManager] User disconnected: ${socket.userId} (${socket.id})`);
            connectedUsers.delete(socket.userId);
        });

        // Typing event
        socket.on('typing', ({ receiverId }) => {
            console.log(`[SocketManager] Typing: From ${socket.userId} To ${receiverId}`);
            io.to(receiverId).emit('typing', { senderId: socket.userId });
        });

        socket.on('stop_typing', ({ receiverId }) => {
            console.log(`[SocketManager] Stop Typing: From ${socket.userId} To ${receiverId}`);
            io.to(receiverId).emit('stop_typing', { senderId: socket.userId });
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

// Belirli bir kullanıcıya event gönder
const sendToUser = (userId, event, data) => {
    if (!io) {
        console.error('[SocketManager] IO not initialized, cannot send event:', event);
        return;
    }

    const room = io.sockets.adapter.rooms.get(userId);
    const roomSize = room ? room.size : 0;
    const socketIds = room ? Array.from(room) : [];

    console.log(`[SocketManager] ATTEMPTING SEND: "${event}" to Room: "${userId}" | Size: ${roomSize} | Sockets: ${socketIds.join(', ')}`);

    if (roomSize === 0) {
        console.warn(`[SocketManager] TARGET UNREACHABLE: User "${userId}" is not connected to their room.`);
        // Aktif tüm odaları ve içindeki socketleri logla (Sadece debug için)
        const allRooms = {};
        for (const [rId, rSet] of io.sockets.adapter.rooms) {
            if (!rId.startsWith('/#')) allRooms[rId] = rSet.size;
        }
        console.log('[SocketManager] CURRENT ACTIVE USER ROOMS:', allRooms);
    }

    io.to(userId).emit(event, data);
};

module.exports = {
    initialize,
    getIO,
    sendToUser
};
