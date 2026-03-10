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

        // Klan odasına katılma
        socket.on('join_clan', (clanId) => {
            const roomName = `clan:${clanId}`;
            socket.join(roomName);
            console.log(`[SocketManager] User "${socket.userId}" joined clan room "${roomName}"`);
        });

        // Klan odasından ayrılma
        socket.on('leave_clan', (clanId) => {
            const roomName = `clan:${clanId}`;
            socket.leave(roomName);
            console.log(`[SocketManager] User "${socket.userId}" left clan room "${roomName}"`);
        });

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
    io.to(userId).emit(event, data);
};

// Belirli bir klandaki herkese event gönder
const sendToClan = (clanId, event, data) => {
    if (!io) {
        console.error('[SocketManager] IO not initialized, cannot send clan event:', event);
        return;
    }
    const roomName = `clan:${clanId}`;
    console.log(`[SocketManager] Sending event "${event}" to clan room "${roomName}"`);
    io.to(roomName).emit(event, data);
};

module.exports = {
    initialize,
    getIO,
    sendToUser,
    sendToClan
};
