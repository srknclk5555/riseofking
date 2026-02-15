import { API_BASE } from './apiConfig';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

const clanBankService = {
    getClanBank: async (clanId) => {
        const response = await fetch(`${API_BASE}/clan-bank/${clanId}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Banka bilgileri yüklenemedi');
        }
        return response.json();
    },

    sellItem: async (saleData) => {
        const response = await fetch(`${API_BASE}/clan-bank/sell`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(saleData)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Satış işlemi başarısız');
        }
        return response.json();
    },

    payParticipant: async (paymentData) => {
        const response = await fetch(`${API_BASE}/clan-bank/pay`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(paymentData)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Ödeme işlemi başarısız');
        }
        return response.json();
    },

    addManualItem: async (itemData) => {
        const response = await fetch(`${API_BASE}/clan-bank/manual-item`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(itemData)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'İtem eklenemedi');
        }
        return response.json();
    },

    getTransactions: async (clanId) => {
        const response = await fetch(`${API_BASE}/clan-bank/${clanId}/transactions`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'İşlem geçmişi yüklenemedi');
        }
        return response.json();
    },

    getSoldItems: async (clanId) => {
        const response = await fetch(`${API_BASE}/clan-bank/${clanId}/sold`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Satılan itemler yüklenemedi');
        }
        return response.json();
    }
};

export default clanBankService;
