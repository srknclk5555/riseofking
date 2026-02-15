import React, { useState, useEffect } from 'react';
import { Sword, Users, Plus, X, Search, Trash2, Check, Shield, AlertCircle } from 'lucide-react';
import clanBossService from '../services/clanBossService';
import { clanService } from '../services/clanService';

const ClanBossPage = ({ userData, uid, clanId }) => {
    const [runs, setRuns] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedRun, setSelectedRun] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        runDate: '',
        participants: [],
        drops: []
    });

    // Debug state
    const [debugInfo, setDebugInfo] = useState({
        lastAction: '',
        apiCalls: [],
        errors: []
    });

    // Filter state
    const [filters, setFilters] = useState({
        itemName: '',
        playerName: '',
        date: ''
    });

    // Modal UI states
    const [showMemberSelector, setShowMemberSelector] = useState(false);
    const [itemSearchTerm, setItemSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showItemResults, setShowItemResults] = useState(false);
    const [dropQuantity, setDropQuantity] = useState(1);

    useEffect(() => {
        if (clanId) {
            loadBossRuns();
            loadClanMembers();
        }
    }, [clanId]);

    const loadBossRuns = async () => {
        try {
            setLoading(true);
            setDebugInfo(prev => ({
                ...prev,
                lastAction: 'Loading boss runs',
                apiCalls: [...prev.apiCalls, { endpoint: '/api/clan-boss/runs/clan/' + clanId, timestamp: new Date() }]
            }));

            const response = await clanBossService.getClanBossRuns(clanId);
            setRuns(response);

        } catch (error) {
            setDebugInfo(prev => ({
                ...prev,
                errors: [...prev.errors, { message: error.message, timestamp: new Date() }]
            }));
        } finally {
            setLoading(false);
        }
    };

    const loadClanMembers = async () => {
        try {
            const response = await clanService.getClanMembers(clanId);
            setMembers(response);
        } catch (error) {
            console.error('Members load error:', error);
        }
    };

    const handleCreateRun = async () => {
        try {
            setDebugInfo(prev => ({
                ...prev,
                lastAction: 'Creating boss run',
                apiCalls: [...prev.apiCalls, { endpoint: '/api/clan-boss/runs', method: 'POST', timestamp: new Date() }]
            }));

            const runData = {
                clanId,
                runDate: formData.runDate,
                participants: formData.participants,
                drops: formData.drops
            };

            const response = await clanBossService.createClanBossRun(runData);

            setRuns(prev => [response.run, ...prev]);
            setShowCreateModal(false);
            resetForm();

        } catch (error) {
            setDebugInfo(prev => ({
                ...prev,
                errors: [...prev.errors, { message: error.message, timestamp: new Date() }]
            }));
        }
    };

    const resetForm = () => {
        setFormData({
            runDate: '',
            participants: [],
            drops: []
        });
    };

    const handleAddParticipant = (member) => {
        if (formData.participants.some(p => p.userId === member.user_id)) return;

        setFormData(prev => ({
            ...prev,
            participants: [...prev.participants, {
                userId: member.user_id,
                username: member.display_name || member.username,
                mainCharacter: member.main_character || 'Bilinmiyor',
                isPaid: false
            }]
        }));
    };

    const handleRemoveParticipant = (userId) => {
        setFormData(prev => ({
            ...prev,
            participants: prev.participants.filter(p => p.userId !== userId)
        }));
    };

    const handleSearchItems = async (val) => {
        setItemSearchTerm(val);
        if (val.length < 2) {
            setSearchResults([]);
            setShowItemResults(false);
            return;
        }

        try {
            const results = await clanBossService.searchItems(val);
            setSearchResults(results);
            setShowItemResults(true);
        } catch (error) {
            console.error('Item search error:', error);
        }
    };

    const handleAddDrop = (item) => {
        setFormData(prev => ({
            ...prev,
            drops: [...prev.drops, {
                itemId: item.id,
                itemName: item.name,
                quantity: dropQuantity
            }]
        }));
        setItemSearchTerm('');
        setShowItemResults(false);
        setDropQuantity(1);
    };

    const handleRemoveDrop = (index) => {
        setFormData(prev => ({
            ...prev,
            drops: prev.drops.filter((_, i) => i !== index)
        }));
    };

    const filteredRuns = runs.filter(run => {
        const matchesItem = !filters.itemName || (run.drops || []).some(d => (d.item_name || '').toLowerCase().includes(filters.itemName.toLowerCase()));
        const matchesPlayer = !filters.playerName || (run.participants || []).some(p =>
            (p.username || '').toLowerCase().includes(filters.playerName.toLowerCase()) ||
            (p.main_character || '').toLowerCase().includes(filters.playerName.toLowerCase())
        );
        const matchesDate = !filters.date || new Date(run.run_date).toISOString().split('T')[0] === filters.date;

        return matchesItem && matchesPlayer && matchesDate;
    });

    // DEBUGGER PANEL COMPONENT
    const DebuggerPanel = () => (
        <div className="fixed bottom-4 right-4 w-96 h-64 bg-black/90 border border-green-500 rounded-lg p-3 text-green-400 font-mono text-xs overflow-auto z-50">
            <div className="flex justify-between items-center mb-2">
                <span className="text-green-300 font-bold">[DEBUGGER]</span>
                <span className="text-red-400">● LIVE</span>
            </div>

            <div className="space-y-2">
                <div>
                    <span className="text-yellow-400">Last Action:</span>
                    <span className="ml-2">{debugInfo.lastAction || 'None'}</span>
                </div>

                <div>
                    <span className="text-yellow-400">API Calls:</span>
                    <div className="ml-2 mt-1">
                        {debugInfo.apiCalls.slice(-3).map((call, index) => (
                            <div key={index} className="text-gray-300">
                                [{call.timestamp.toLocaleTimeString()}] {call.method || 'GET'} {call.endpoint}
                            </div>
                        ))}
                    </div>
                </div>

                {debugInfo.errors.length > 0 && (
                    <div>
                        <span className="text-red-400">Errors:</span>
                        <div className="ml-2 mt-1">
                            {debugInfo.errors.slice(-2).map((error, index) => (
                                <div key={index} className="text-red-300">
                                    [{error.timestamp.toLocaleTimeString()}] {error.message}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="text-gray-500 text-[10px]">
                    UID: {uid?.substring(0, 8)}... | Clan: {clanId?.substring(0, 8)}...
                </div>
            </div>
        </div>
    );

    return (
        <div className="text-white">
            {/* Sub-header for Boss Runs */}
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <div className="flex items-center gap-2">
                    <Sword className="text-red-500" size={24} />
                    <h2 className="text-xl font-bold tracking-tight uppercase italic">Boss Run Kayıtları</h2>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg border border-red-400 font-bold transition-all shadow-lg flex items-center gap-2"
                >
                    <Plus size={18} />
                    Yeni Run Kaydı
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">İtem Ara</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="İtem adı..."
                            value={filters.itemName}
                            onChange={(e) => setFilters(prev => ({ ...prev, itemName: e.target.value }))}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-red-500 transition-colors"
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Oyuncu Ara</label>
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Oyuncu adı..."
                            value={filters.playerName}
                            onChange={(e) => setFilters(prev => ({ ...prev, playerName: e.target.value }))}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-red-500 transition-colors"
                        />
                    </div>
                </div>
                <div className="w-full md:w-auto">
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Tarih</label>
                    <input
                        type="date"
                        value={filters.date}
                        onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-4 text-sm focus:border-red-500 transition-colors"
                    />
                </div>
                {(filters.itemName || filters.playerName || filters.date) && (
                    <button
                        onClick={() => setFilters({ itemName: '', playerName: '', date: '' })}
                        className="text-gray-400 hover:text-white text-sm pb-2 underline transition-colors"
                    >
                        Filtreleri Temizle
                    </button>
                )}
            </div>

            {/* Runs List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRuns.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-gray-800/20 border border-dashed border-gray-700 rounded-xl">
                        <AlertCircle className="mx-auto mb-3 text-gray-500" size={32} />
                        <p className="text-gray-500 font-bold uppercase tracking-widest">Kayıt bulunamadı</p>
                    </div>
                ) : (
                    filteredRuns.map(run => (
                        <div key={run.id} className="bg-gray-800 border border-gray-700 rounded p-4 hover:border-red-500 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-xl font-bold text-red-400">{run.boss_name}</h3>
                                <div className="flex gap-2">
                                    <span className={`text-xs px-2 py-1 rounded ${run.is_completed
                                        ? 'bg-green-900 text-green-400 border border-green-700'
                                        : 'bg-gray-700 text-gray-300'
                                        }`}>
                                        {run.is_completed ? 'COMPLETED' : 'ACTIVE'}
                                    </span>
                                    <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                                        {new Date(run.run_date).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm mb-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Participants:</span>
                                    <span className="text-green-400">{run.participant_count}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Drops:</span>
                                    <span className="text-yellow-400">{run.drop_count}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Paid:</span>
                                    <span className="text-blue-400">{run.paid_count}/{run.participant_count}</span>
                                </div>
                            </div>

                            {/* Items Display */}
                            {run.drops && run.drops.length > 0 && (
                                <div className="mb-4 pt-3 border-t border-gray-700/50">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-1">Items Found:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {run.drops.map((drop, idx) => (
                                            <span key={idx} className="bg-yellow-900/30 text-yellow-500 border border-yellow-800/50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                {drop.item_name} {drop.quantity > 1 ? `x${drop.quantity}` : ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedRun(run)}
                                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm font-mono"
                                >
                                    [VIEW]
                                </button>
                                {(run.created_by === uid || userData?.clanRole === 'leader') && (
                                    <>
                                        <button className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm font-mono">
                                            [EDIT]
                                        </button>
                                        <button className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-mono">
                                            [DEL]
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )))}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-red-500 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-red-500 mb-6">CREATE BOSS RUN</h2>

                            {/* Boss Name - Fixed */}
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2 text-red-400">
                                    [BOSS NAME] (FIXED)
                                </label>
                                <div className="bg-black border border-gray-600 px-3 py-2 font-mono text-green-400">
                                    Shallow Fever
                                </div>
                            </div>

                            {/* Date */}
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2 text-red-400">
                                    [RUN DATE]
                                </label>
                                <input
                                    type="date"
                                    value={formData.runDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, runDate: e.target.value }))}
                                    className="w-full bg-black border border-gray-600 px-3 py-2 font-mono text-green-400"
                                />
                            </div>

                            {/* Participants */}
                            <div className="mb-4">
                                <label className="block text-sm font-bold mb-2 text-red-400">
                                    [PARTICIPANTS]
                                </label>
                                <div className="bg-black border border-gray-600 p-3">
                                    {/* Current participants list */}
                                    <div className="mb-3">
                                        {formData.participants.map((participant, index) => (
                                            <div key={index} className="flex justify-between items-center bg-gray-900 p-2 mb-1 font-mono text-sm">
                                                <span>{participant.username} ({participant.mainCharacter})</span>
                                                <span className={`px-2 py-1 rounded text-xs ${participant.isPaid ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                                                    {participant.isPaid ? 'PAID' : 'UNPAID'}
                                                </span>
                                            </div>
                                        ))}
                                        {/* Creator otomatik dahil */}
                                        <div className="flex justify-between items-center bg-gray-900 p-2 font-mono text-sm">
                                            <span>{userData?.username || 'You'} ({userData?.profile?.mainCharacter || 'Unknown'})</span>
                                            <span className="px-2 py-1 rounded text-xs bg-green-900 text-green-400">
                                                PAID
                                            </span>
                                        </div>
                                    </div>

                                    {/* Add participants button */}
                                    <button className="w-full bg-gray-700 hover:bg-gray-600 py-2 rounded font-mono text-sm">
                                        [ADD PARTICIPANTS]
                                    </button>
                                </div>
                            </div>

                            {/* Drops */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold mb-2 text-red-400">
                                    [DROPS]
                                </label>
                                <div className="bg-black border border-gray-600 p-3">
                                    <div className="mb-3">
                                        {formData.drops.map((drop, index) => (
                                            <div key={index} className="flex justify-between items-center bg-gray-900 p-2 mb-1 font-mono text-sm">
                                                <span>{drop.itemName} x{drop.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="w-full bg-gray-700 hover:bg-gray-600 py-2 rounded font-mono text-sm">
                                        [ADD DROP]
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCreateRun}
                                    className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded font-bold font-mono"
                                >
                                    [CREATE RUN]
                                </button>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded font-mono"
                                >
                                    [CANCEL]
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Debugger Panel */}
            <DebuggerPanel />
        </div>
    );
};

export default ClanBossPage;