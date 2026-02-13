import io from 'socket.io-client';

// Canlıdaki Render URL'in
const API_URL = 'https://riseofking2.onrender.com'; 

class SocketService {
    constructor() {
        this.socket = null;
        this.userId = null;
        this.pendingListeners = []; // Socket oluşmadan gelen listenerlar için kuyruk
    }

    connect(userId, token) {
        if (this.socket) {
            console.log('[SocketService] Already connected.');
            return;
        }

        console.log('[SocketService] Connecting with userId:', userId);
        this.userId = userId;

        this.socket = io(API_URL, {
            auth: {
                token: token,
                userId: userId
            },
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling'] // Önce websocket dener, olmazsa polling'e düşer
        });

        this.socket.on('connect', () => {
            console.log('[SocketService] Connected! Socket ID:', this.socket.id);
            this._flushPendingListeners();
        });

        this.socket.on('connect_error', (err) => {
            console.error('[SocketService] Connection error:', err.message);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[SocketService] Disconnected:', reason);
            if (reason === 'io server disconnect') {
                this.socket = null;
            }
        });

        // Debug: Tüm gelen eventleri izle
        this.socket.onAny((event, ...args) => {
            console.log(`[SocketService] Incoming event: ${event}`, args);
        });
    }

    _flushPendingListeners() {
        if (!this.socket) return;
        console.log(`[SocketService] Flushing ${this.pendingListeners.length} pending listeners...`);
        this.pendingListeners.forEach(({ event, callback }) => {
            this.socket.off(event); 
            this.socket.on(event, callback);
        });
        this.pendingListeners = [];
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.userId = null;
            this.pendingListeners = [];
            console.log('[SocketService] Disconnected manually.');
        }
    }

    on(event, callback) {
        if (this.socket) {
            this.socket.off(event); 
            this.socket.on(event, callback);
            console.log(`[SocketService] Listener added for: ${event}`);
        } else {
            console.log(`[SocketService] Socket not ready. Queuing listener for: ${event}`);
            this.pendingListeners = this.pendingListeners.filter(l => l.event !== event);
            this.pendingListeners.push({ event, callback });
        }
    }

    off(event) {
        if (this.socket) {
            this.socket.off(event);
            console.log(`[SocketService] Listener removed for: ${event}`);
        }
        this.pendingListeners = this.pendingListeners.filter(l => l.event !== event);
    }

    emit(event, data) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(event, data);
            console.log(`[SocketService] Emitted: ${event}`, data);
        } else {
            console.warn(`[SocketService] Cannot emit "${event}". Socket not connected.`);
        }
    }
}

const socketService = new SocketService();
export default socketService;