const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const cookie = require('cookie');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
}

let io;
const connectedUsers = new Map(); // userId -> socketId
const quarantinedUsers = new Set();

const isUserQuarantined = (userId) => {
    return quarantinedUsers.has(userId);
};

const initialize = (server) => {
    io = socketIo(server, {
        cors: {
            origin: ['https://riseofking.srknclk78.workers.dev', 'http://localhost:3000'],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    // Authentication Middleware - Cookie-based + auth.token fallback
    io.use((socket, next) => {
        try {
            const userId = socket.handshake.auth.userId;
            
            // Önce cookie'den token dene
            let token;
            if (socket.handshake.headers.cookie) {
                const cookies = cookie.parse(socket.handshake.headers.cookie);
                token = cookies.token;
                console.log('[Socket Auth] Token found in cookie');
            }
            
            // Cookie yoksa auth.token dene (fallback)
            if (!token && socket.handshake.auth.token) {
                token = socket.handshake.auth.token;
                console.log('[Socket Auth] Token found in auth.token');
            }

            if (!userId) {
                console.warn('[Socket Auth] Missing userId');
                return next(new Error('User ID eksik'));
            }

            if (!token) {
                console.warn('[Socket Auth] Missing token');
                return next(new Error('Token eksik'));
            }

            // JWT Verify
            try {
                const payload = jwt.verify(token, JWT_SECRET);
                const tokenUserId = payload.uid || payload.id || payload.sub;
                
                if (tokenUserId !== userId) {
                    console.warn('[Socket Auth] UserID mismatch');
                    return next(new Error('Yetkisiz erişim - UserID uyuşmuyor'));
                }

                socket.userId = userId;
                socket.user = payload;
                console.log('[Socket Auth] Success. User:', userId);
                next();
                
            } catch (jwtError) {
                console.error('[Socket Auth] JWT verify failed:', jwtError.message);
                return next(new Error('Geçersiz token'));
            }
            
        } catch (err) {
            console.error('[Socket Auth] Middleware error:', err.message);
            return next(new Error('Socket auth hatası'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`[SocketManager] User connected: ${socket.userId} (SocketID: ${socket.id})`);

        // Kullanıcıyı kaydet
        connectedUsers.set(socket.userId, socket.id);

        // Kullanıcının kendi odasına katılmasını sağla
        socket.join(socket.userId);
        console.log(`[SocketManager] User "${socket.userId}" joined room "${socket.userId}". Total rooms: ${io.sockets.adapter.rooms.size}`);

        // Klan odasına katılma
        socket.on('join_clan', async (clanIdentifier) => {
            console.log(`[SocketManager] User "${socket.userId}" attempting to join clan room: ${clanIdentifier}`);
            try {
                const clanId = clanIdentifier;
                // Kullanıcının bu klana üye olduğunu doğrula
                const memberCheck = await pool.query(
                    'SELECT 1 FROM clan_members WHERE clan_id = $1 AND user_id = $2 AND status = \'active\'',
                    [clanId, socket.userId]
                );

                if (memberCheck.rows.length === 0) {
                    socket.emit('error', 'Bu klanın üyesi değilsiniz');
                    console.warn(`[SocketManager] Membership Check Failed: User ${socket.userId} is not an active member of clan ${clanId}`);
                    return;
                }

                const roomName = `clan:${clanId}`;
                socket.join(roomName);
                const rooms = io.sockets.adapter.rooms.get(roomName);
                console.log(`[SocketManager] SUCCESS: User "${socket.userId}" joined room "${roomName}". Room size: ${rooms ? rooms.size : 0}`);
            } catch (err) {
                console.error('[SocketManager] JOIN_CLAN ERROR:', err.message, { clanIdentifier, userId: socket.userId });
                socket.emit('error', 'Klan üyelik kontrolü sırasında hata oluştu');
            }
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

        // Clan Typing events
        socket.on('typing_clan', ({ clanId, username }) => {
            const roomName = `clan:${clanId}`;
            // Mute log to avoid console spam but emit to room (except sender)
            socket.to(roomName).emit('typing_clan', { senderId: socket.userId, username });
        });

        socket.on('stop_typing_clan', ({ clanId }) => {
            const roomName = `clan:${clanId}`;
            socket.to(roomName).emit('stop_typing_clan', { senderId: socket.userId });
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
const sendToClan = async (clanIdentifier, event, data) => {
    if (!io) {
        console.error('[SocketManager] IO not initialized, cannot send clan event:', event);
        return;
    }
    
    try {
        const clanId = clanIdentifier;
        const roomName = `clan:${clanId}`;
        console.log(`[SocketManager] Sending event "${event}" to clan room "${roomName}"`);
        io.to(roomName).emit(event, data);
    } catch (err) {
        console.error('[SocketManager] sendToClan error:', err.message);
    }
};

module.exports = {
    initialize,
    getIO,
    sendToUser,
    sendToClan,
    isUserQuarantined,
    quarantinedUsers
};
