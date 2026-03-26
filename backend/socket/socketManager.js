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

const initialize = (server) => {
    io = socketIo(server, {
        cors: {
            origin: ['https://riseofking.srknclk78.workers.dev', 'http://localhost:3000'],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    // Authentication Middleware - Cookie support
    io.use((socket, next) => {
        try {
            let token = socket.handshake.auth.token;
            if (!token && socket.handshake.headers.cookie) {
                const cookies = cookie.parse(socket.handshake.headers.cookie);
                token = cookies.token;
            }
            const userId = socket.handshake.auth.userId;

            if (!token || !userId) {
                console.warn('[Socket Auth] Missing token or userId');
                return next(new Error('Token veya UserId eksik'));
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
            // clanIdentifier ya numeric ID ya da short_code olabilir
            const parsedId = parseInt(clanIdentifier);
            
            try {
                let clanId;
                
                if (isNaN(parsedId)) {
                    // short_code olarak ara (örn: BRIEK9)
                    const clanResult = await pool.query(
                        'SELECT id FROM clans WHERE short_code = $1',
                        [clanIdentifier]
                    );
                    
                    if (clanResult.rows.length === 0) {
                        socket.emit('error', 'Klan bulunamadı');
                        console.warn(`[SocketManager] Clan not found: ${clanIdentifier}`);
                        return;
                    }
                    
                    clanId = clanResult.rows[0].id;
                    console.log(`[SocketManager] Resolved short_code "${clanIdentifier}" to ID ${clanId}`);
                } else {
                    // Numeric ID
                    clanId = parsedId;
                }

                // Kullanıcının bu klana üye olduğunu doğrula
                const memberCheck = await pool.query(
                    'SELECT 1 FROM clan_members WHERE clan_id = $1 AND user_id = $2 AND status = \'active\'',
                    [clanId, socket.userId]
                );

                if (memberCheck.rows.length === 0) {
                    socket.emit('error', 'Bu klanın üyesi değilsiniz');
                    console.warn(`[SocketManager] User ${socket.userId} tried to join non-member clan ${clanId}`);
                    return;
                }

                const roomName = `clan:${clanId}`;
                socket.join(roomName);
                console.log(`[SocketManager] User "${socket.userId}" joined clan room "${roomName}"`);
            } catch (err) {
                console.error('[SocketManager] Clan membership check error:', err.message);
                socket.emit('error', 'Klan üyelik kontrolü başarısız');
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
        let clanId;
        const parsedId = parseInt(clanIdentifier);
        
        if (isNaN(parsedId)) {
            // short_code olarak ara
            const clanResult = await pool.query(
                'SELECT id FROM clans WHERE short_code = $1',
                [clanIdentifier]
            );
            
            if (clanResult.rows.length === 0) {
                console.warn(`[SocketManager] Clan not found for short_code: ${clanIdentifier}`);
                return;
            }
            
            clanId = clanResult.rows[0].id;
        } else {
            clanId = parsedId;
        }
        
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
    sendToClan
};
