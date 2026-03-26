import { API_BASE } from './apiConfig';

const clanBossService = {
    getClanBossRuns: async (clanId, params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        const url = `${API_BASE}/clan-boss/runs/clan/${clanId}${queryParams ? `?${queryParams}` : ''}`;
        
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Boss run\'ları yüklenemedi');
        }

        return response.json();
    },

    getClanBossRunDetails: async (id) => {
        const response = await fetch(`${API_BASE}/clan-boss/runs/${id}`, {
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Run detayları yüklenemedi');
        }

        return response.json();
    },

    getClanMembers: async (clanId) => {
        const response = await fetch(`${API_BASE}/clan-boss/members/${clanId}`, {
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Clan üyeleri yüklenemedi');
        }

        return response.json();
    },

    createClanBossRun: async (runData) => {
        const response = await fetch(`${API_BASE}/clan-boss/runs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(runData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Boss run oluşturulamadı');
        }

        return response.json();
    },

    updateClanBossRun: async (id, runData) => {
        const response = await fetch(`${API_BASE}/clan-boss/runs/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(runData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Boss run güncellenemedi');
        }

        return response.json();
    },

    deleteClanBossRun: async (id) => {
        const response = await fetch(`${API_BASE}/clan-boss/runs/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Boss run silinemedi');
        }

        return response.json();
    }
};

export default clanBossService;