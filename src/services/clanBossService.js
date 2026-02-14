import { API_BASE } from './apiConfig';

const clanBossService = {
    getClanBossRuns: async (clanId) => {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/clan-boss/runs/clan/${clanId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Boss run\'ları yüklenemedi');
        }

        return response.json();
    },

    getClanMembers: async (clanId) => {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/clan-boss/members/${clanId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Clan üyeleri yüklenemedi');
        }

        return response.json();
    },

    createClanBossRun: async (runData) => {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/clan-boss/runs`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(runData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Boss run oluşturulamadı');
        }

        return response.json();
    },

    updateClanBossRun: async (id, runData) => {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/clan-boss/runs/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(runData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Boss run güncellenemedi');
        }

        return response.json();
    },

    deleteClanBossRun: async (id) => {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/clan-boss/runs/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Boss run silinemedi');
        }

        return response.json();
    }
};

export default clanBossService;