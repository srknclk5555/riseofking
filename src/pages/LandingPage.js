import React, { useState, useEffect } from 'react';
import {
  Shield, Sword, Pickaxe, Users, BarChart3, PieChart as PieIcon, Clock, ChevronRight, CheckCircle2, ArrowRight,
  TrendingUp, Zap, Lock, Globe, LayoutDashboard, Timer, Bell, Search, Plus, DollarSign, Filter, LogOut,
  MessageCircle, Crown, Settings, Package, Calendar, ChevronLeft, X, Mail, AlertCircle, Scroll, History,
  Play, Pause, RefreshCw, BellRing, MapPin, Coins, Wallet, Eye, BarChart2, Trash2, UserPlus, Edit3,
  ChevronDown, ChevronUp, Link as LinkIcon, Check, MessageSquare, Database, UserCheck, Tag, Download, Flame, TrendingDown
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  BarChart as ReBarChart, Bar as ReBar, PieChart as RePieChart, Pie as RePie, Cell
} from 'recharts';

// --- MOCK DATA ---
const MOCK_STATS = [
  { name: 'Pzt', farm: 12.5, gathering: 4.2 }, { name: 'Sal', farm: 8.2, gathering: 6.8 },
  { name: 'Çar', farm: 15.0, gathering: 3.5 }, { name: 'Per', farm: 9.7, gathering: 5.4 },
  { name: 'Cum', farm: 11.2, gathering: 2.1 }, { name: 'Cmt', farm: 18.5, gathering: 9.8 },
  { name: 'Paz', farm: 22.0, gathering: 12.4 },
];

const MOCK_NOTIFICATIONS = [
  { id: 1, title: '🆕 Yeni Farm Başladı', text: 'Death Valley - Death Lord slotunda yeni farm kaydı açıldı.', read: false },
  { id: 2, title: '💰 Ödeme Alındı', text: 'Haddar farmı için 2.400.000 c ödemeniz yapıldı.', read: true },
];

const MOCK_CLAN_MEMBERS = [
  { name: 'google', class: 'Warrior', level: 85, awakening: 1, acp: 72, debt: 0, role: 'leader' },
  { name: 'lootmetric1', class: 'Mage', level: 85, awakening: 0, acp: 24, debt: 0, role: 'member' },
  { name: 'lootmetric2', class: 'Rogue', level: 82, awakening: 0, acp: 36, debt: 0, role: 'member' },
];

const MOCK_BOSS_RUNS = [
  { id: 'CBR_1774771175580', boss: 'Shallow Fever', date: '2026-03-28', status: 'open', item: '-', price: '0' },
  { id: 'CBR_1774771210022', boss: 'Shallow Fever', date: '2026-03-27', status: 'open', item: '-', price: '0' },
  { id: 'CBR_1774771231353', boss: 'Shallow Fever', date: '2026-03-26', status: 'open', item: '-', price: '0' },
];

const MOCK_BANK_ITEMS = [
  { name: 'Blue Dragon Pendant (+0)', count: 1, icon: <Package className="text-purple-500" /> },
  { name: 'Divine Earring (+0)', count: 1, icon: <Package className="text-purple-500" /> },
];

const MOCK_BANK_SOLD = [
  { name: 'Amulet of Chaos (+0)', price: '150.000.000', date: '2026-03-28' },
  { name: 'Golden Bar', price: '100.000.000', date: '2026-03-29' },
  { name: 'Silver Bar', price: '10.000.000', date: '2026-03-29' },
];

// --- HELPER COMPONENTS ---
const NavButton = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${active ? 'bg-yellow-600/20 text-yellow-500 border-r-4 border-yellow-500' : 'text-gray-400 hover:bg-gray-700'}`}>
    <div className={`${active ? 'text-yellow-500' : ''}`}>{icon}</div>
    <span className="font-medium hidden lg:block text-sm">{label}</span>
  </button>
);

const LockedSection = ({ title, onRegister }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-gray-800/10 rounded-[3rem] border border-gray-800/50 border-dashed animate-in fade-in zoom-in duration-500">
    <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center border border-gray-700 mb-6 shadow-2xl relative">
      <Lock className="text-yellow-500/50" size={32} />
      <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter shadow-lg">Premium</div>
    </div>
    <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-3">{title}</h3>
    <p className="text-gray-400 max-w-sm mb-8 text-sm leading-relaxed font-medium">Daha fazlası için ücretsiz üye olun.</p>
    <button onClick={onRegister} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-3 rounded-2xl shadow-lg shadow-blue-900/40 uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95">Kayıt Ol</button>
  </div>
);

const DemoDashboard = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[
        { label: 'Bugünkü Kazanç', val: '42.850.000 c', icon: <DollarSign size={16} className="text-emerald-500" />, trend: '▲ %12.5' },
        { label: 'Farm Süresi', val: '06:45 Saat', icon: <Clock size={16} className="text-blue-500" /> },
        { label: 'Eşya Dropları', val: '14 Adet', icon: <Package size={16} className="text-amber-500" /> },
        { label: 'Aktif Klan', val: 'LEGACY', icon: <Crown size={16} className="text-purple-500" /> }
      ].map((c, i) => (
        <div key={i} className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <div className="flex justify-between items-start mb-2"><p className="text-gray-400 text-xs font-bold uppercase">{c.label}</p>{c.icon}</div>
          <p className="text-2xl font-black text-white">{c.val}</p>
          {c.trend && <p className="text-[10px] text-emerald-400 mt-2 flex items-center gap-1">{c.trend} <span className="text-gray-500">düne göre</span></p>}
        </div>
      ))}
    </div>
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg h-72">
      <p className="text-sm font-bold text-gray-400 mb-6 flex items-center gap-2 uppercase italic tracking-widest"><BarChart2 size={16} className="text-yellow-500" /> HAFTALIK VERİMLİLİK ANALİZİ</p>
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart data={MOCK_STATS}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
          <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis hide />
          <RechartsTooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }} />
          <ReBar dataKey="farm" fill="#EAB308" radius={[4, 4, 0, 0]} />
          <ReBar dataKey="gathering" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const DemoFarm = () => {
  const [filter, setFilter] = useState('all');
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2 items-center flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input type="text" placeholder="Konum, mob veya oyuncu ara..." className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-yellow-500" readOnly />
            </div>
          </div>
          <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-yellow-900/40 flex items-center gap-2">
            <Plus size={16} /> Yeni Farm Kaydı
          </button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700/50">
          {['Tümü', 'İtem Ara', 'Konum Ara', 'Oyuncu Ara', 'Farm Kodu'].map((l, i) => (
            <div key={i} className="bg-gray-900 border border-gray-700 px-3 py-1 rounded text-xs text-gray-400 flex items-center gap-2 cursor-pointer hover:border-gray-500">
              <Filter size={10} /> {l}
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-gray-500">Tarih Aralığı:</span>
            <select className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-300 outline-none"><option>Tümü</option></select>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {[
          { id: 'F-8842', loc: 'Death Valley', mob: 'Bael', party: 8, time: '2.5s', status: 'ACTIVE', total: '18.400.000', items: 12 },
          { id: 'F-8839', loc: 'Haddar', mob: 'Black Mummy', party: 1, time: '1.2s', status: 'PAID', total: '4.200.000', items: 3 }
        ].map(f => (
          <div key={f.id} className={`bg-gray-800 border p-4 rounded-xl border-gray-700 flex justify-between items-center ${f.status === 'ACTIVE' ? 'border-l-4 border-l-yellow-500 bg-yellow-500/5' : ''}`}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center border border-gray-700 text-yellow-500 font-bold text-[10px]">#{f.id.split('-')[1]}</div>
              <div>
                <h3 className="text-white font-bold flex items-center gap-2">{f.loc} <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-400">{f.mob.toUpperCase()}</span></h3>
                <p className="text-xs text-gray-500 flex items-center gap-3 mt-1"><span>{f.party} Katılımcı</span> • <span>{f.time}</span> • <span>{f.items} Eşya</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-white">{f.total} c</p>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${f.status === 'ACTIVE' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'}`}>{f.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DemoClan = () => {
  const [subTab, setSubTab] = useState('members');
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex border-b border-gray-700 mb-4 overflow-x-auto no-scrollbar">
        {[
          { id: 'members', label: 'Üyeler', icon: <Users size={16} /> },
          { id: 'boss', label: 'Boss Run', icon: <Sword size={16} /> },
          { id: 'bank', label: 'Banka', icon: <Database size={16} /> },
          { id: 'messages', label: 'Mesajlar', icon: <MessageSquare size={16} /> }
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${subTab === t.id ? 'border-yellow-500 text-white bg-yellow-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {subTab === 'members' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900/50 text-gray-500 text-[10px] uppercase font-black">
              <tr><th className="px-6 py-3">Üye</th><th className="px-6 py-3">Sınıf</th><th className="px-6 py-3 text-right">ACP</th><th className="px-6 py-3 text-right">Alacak</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {MOCK_CLAN_MEMBERS.map(m => (
                <tr key={m.name} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-white flex items-center gap-2">{m.name} {m.name === 'KingOfRise' && <Crown size={12} className="text-yellow-500" />}</td>
                  <td className="px-6 py-4 text-gray-400">{m.class} ({m.level}/{m.awakening})</td>
                  <td className="px-6 py-4 text-right text-purple-400 font-bold">{m.acp}</td>
                  <td className="px-6 py-4 text-right text-red-500 font-bold">{m.debt > 0 ? `${m.debt}M` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {subTab === 'boss' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-gray-800">
            <div className="flex gap-2">
              {['Açık', 'Kapalı', 'Tümü'].map(f => <button key={f} className={`px-4 py-1.5 rounded-lg text-xs font-bold ${f === 'Açık' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>{f}</button>)}
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold">+ Yeni Boss Run</button>
          </div>
          {MOCK_BOSS_RUNS.map(r => (
            <div key={r.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center group hover:border-yellow-500/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-red-500 font-black italic border border-gray-700"><Flame size={20} /></div>
                <div><h4 className="text-white font-bold">{r.boss}</h4><p className="text-[10px] text-gray-500 uppercase tracking-widest">{r.date} • {r.item}</p></div>
              </div>
              <div className="text-right"><p className="text-white font-bold">{r.price}</p><span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${r.status === 'open' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>{r.status}</span></div>
            </div>
          ))}
        </div>
      )}
      {subTab === 'bank' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center text-yellow-500"><Coins size={20} /></div>
              <div><div className="text-[10px] text-gray-400 uppercase font-black">Klan Bakiyesi</div><div className="text-lg font-black text-white font-mono">460.000.000 <span className="text-yellow-500 text-[10px]">c</span></div></div>
            </div>
            <div className="bg-gray-800 rounded-xl border border-red-900/30 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center text-red-500"><TrendingUp size={20} /></div>
              <div><div className="text-[10px] text-gray-400 uppercase font-black">Klan Borcu</div><div className="text-lg font-black text-red-500 font-mono">0 <span className="text-[10px]">c</span></div></div>
            </div>
            <div className="bg-gray-800 rounded-xl border border-blue-900/30 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-500"><Wallet size={20} /></div>
              <div><div className="text-[10px] text-gray-400 uppercase font-black">Hazine (Tax)</div><div className="text-lg font-black text-blue-500 font-mono">20.000.000 <span className="text-[10px]">c</span></div></div>
            </div>
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center text-indigo-500"><Database size={20} /></div>
              <div><div className="text-[10px] text-gray-400 uppercase font-black">İtemler</div><div className="text-lg font-black text-white font-mono">2</div></div>
            </div>
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center text-green-500"><UserCheck size={20} /></div>
              <div><div className="text-[10px] text-gray-400 uppercase font-black">Bekleyen</div><div className="text-lg font-black text-white font-mono">0</div></div>
            </div>
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center text-purple-500"><MessageSquare size={20} /></div>
              <div><div className="text-[10px] text-gray-400 uppercase font-black">İşlemler</div><div className="text-lg font-black text-white font-mono">7</div></div>
            </div>
          </div>

          <div className="flex justify-between items-center bg-gray-800/50 p-4 rounded-xl border border-gray-700">
            <div className="flex gap-2">
              <button className="bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-600">Banka Görünümü</button>
              <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-blue-900/20">+ Manuel Ekle</button>
            </div>
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
              <input type="text" placeholder="İtem ara..." className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-white outline-none" readOnly />
            </div>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 bg-gray-900/50 p-4 rounded-2xl border border-gray-800 shadow-inner">
            {Array.from({ length: 32 }).map((_, i) => {
              const item = MOCK_BANK_ITEMS[i];
              return (
                <div key={i} className={`aspect-square rounded border flex items-center justify-center relative group transition-all ${item ? 'bg-gray-800 border-yellow-500/30 shadow-lg cursor-help' : 'bg-gray-950/50 border-gray-800'}`}>
                  {item ? (
                    <>
                      <div className="p-2 opacity-80 group-hover:opacity-100 transition-opacity">{item.icon}</div>
                      <div className="absolute top-1 right-1 bg-black/60 px-1 rounded text-[8px] font-black text-yellow-500">{item.count}</div>
                      <div className="absolute inset-0 bg-yellow-500/0 group-hover:bg-yellow-500/5 transition-colors"></div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
            <div className="p-3 border-b border-gray-700 bg-gray-900/30 flex items-center justify-between">
              <span className="text-[10px] font-black text-white uppercase italic">Son Satılan Eşyalar (Geçmiş)</span>
              <button className="text-[9px] text-blue-400 font-bold hover:underline">Tümünü Gör</button>
            </div>
            <table className="w-full text-left text-[11px]">
              <tbody className="divide-y divide-gray-700/50">
                {MOCK_BANK_SOLD.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-200">{s.name}</td>
                    <td className="px-4 py-3 text-emerald-400 font-black text-right">{s.price} c</td>
                    <td className="px-4 py-3 text-gray-500 text-right">{s.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {subTab === 'messages' && (
        <div className="h-[400px]">
          <LockedSection title="Klan Mesajlaşma" onRegister={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        </div>
      )}
    </div>
  );
};

const DemoUI = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [timerInSeconds, setTimerInSeconds] = useState(6172);
  const [timerRunning, setTimerRunning] = useState(true);

  useEffect(() => {
    let interval; if (timerRunning) interval = setInterval(() => setTimerInSeconds(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto h-[750px] bg-gray-900 rounded-3xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col relative scale-[0.9] origin-top md:scale-100 mb-12 animate-in fade-in duration-700">
      <div className="bg-yellow-600/10 h-10 flex items-center justify-center border-b border-gray-800 px-4"><p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] flex items-center gap-2 animate-pulse"><AlertCircle size={14} /> GERÇEK UYGULAMA DENEYİMİ (DEMO MODU VERİLERİ) - TÜM SAYFALAR AKTİFTİR</p></div>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-20 lg:w-64 bg-gray-800 border-r border-gray-700 flex flex-col h-full shadow-2xl z-10">
          <div className="p-5 border-b border-gray-700 flex items-center gap-3"><div className="bg-yellow-600 p-2 rounded-lg"><Sword size={24} className="text-white" /></div><div className="hidden lg:block font-bold text-yellow-500 text-lg leading-none uppercase italic tracking-tighter">RO WORLD<br /><span className="text-[10px] text-gray-400 font-normal">Tracker App</span></div></div>
          <nav className="flex-1 py-4 space-y-1 px-2 no-scrollbar overflow-y-auto">
            <NavButton icon={<LayoutDashboard />} label="Özet Rapor" active={activeTab === "Dashboard"} onClick={() => setActiveTab("Dashboard")} />
            <NavButton icon={<Pickaxe />} label="Toplama (Gathering)" active={activeTab === "Gathering"} onClick={() => setActiveTab("Gathering")} />
            <NavButton icon={<Scroll />} label="Etkinlikler" active={activeTab === "Events"} onClick={() => setActiveTab("Events")} />
            <NavButton icon={<Users />} label="Farm (Solo/Party)" active={activeTab === "Farm"} onClick={() => setActiveTab("Farm")} />
            <NavButton icon={<MessageCircle />} label="Mesajlaşma" active={activeTab === "Messaging"} onClick={() => setActiveTab("Messaging")} />
            <NavButton icon={<Crown />} label="Clan" active={activeTab === "Clan"} onClick={() => setActiveTab("Clan")} />
            <NavButton icon={<Settings />} label="Ayarlar" active={activeTab === "Admin"} onClick={() => setActiveTab("Admin")} />
          </nav>
          <div className="p-4 bg-gray-950 border-t border-gray-700 flex flex-col items-center">
            <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">KRONOMETRE</span>
            <div className="text-2xl font-mono text-white mb-3 shadow-inner bg-gray-900 px-3 py-1 rounded-lg border border-gray-800">{formatTime(timerInSeconds)}</div>
            <div className="flex gap-2"><button onClick={() => setTimerRunning(!timerRunning)} className={`p-1.5 rounded-full ${timerRunning ? 'bg-red-600' : 'bg-green-600'} shadow-lg`}>{timerRunning ? <Pause size={12} /> : <Play size={12} />}</button><button onClick={() => { setTimerInSeconds(0); setTimerRunning(false); }} className="p-1.5 bg-gray-700 rounded-full shadow-lg"><RefreshCw size={12} /></button></div>
          </div>
        </aside>
        <div className="flex-1 flex flex-col bg-gray-950/20 relative">
          <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 shadow-xl shrink-0 z-20">
            <div className="flex items-center gap-4"><div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700"><History size={16} className="text-gray-400" /><span className="text-white text-xs font-mono">{new Date().toISOString().split('T')[0]}</span></div><div className="hidden md:flex items-center text-xs text-gray-500">Klan: <span className="text-yellow-500 font-black italic uppercase ml-1 mr-4">LootMetric</span> Karakter: <span className="text-yellow-500 font-black italic uppercase ml-2">google</span></div></div>
            <div className="flex items-center gap-4 relative">
              <button className="relative p-2 text-gray-400" onClick={() => setIsNotifPanelOpen(!isNotifPanelOpen)}><Bell size={20} /><span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-gray-800"></span></button>
              {isNotifPanelOpen && (
                <div className="absolute top-12 right-0 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 flex flex-col max-h-96 shadow-yellow-500/5 animate-in slide-in-from-top-2 duration-300">
                  <div className="p-3 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center px-4"><span className="text-white font-black text-xs uppercase italic flex items-center gap-2"><BellRing size={16} /> Bildirimler</span><span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black">2 Yeni</span></div>
                  <div className="p-1">{MOCK_NOTIFICATIONS.map(n => (<div key={n.id} className={`p-3 rounded mb-1 border-gray-700/50 transition-colors ${n.read ? 'bg-gray-800' : 'bg-gray-700/70 border-l-4 border-l-yellow-600'}`}><p className="text-xs text-white font-bold">{n.title}</p><p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{n.text}</p></div>))}</div>
                </div>
              )}
              <div className="w-px h-6 bg-gray-700 mx-2"></div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center font-black text-white border border-yellow-400 shadow-xl italic tracking-tighter">KO</div>
              <button className="text-red-500/70 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            {activeTab === 'Dashboard' && <DemoDashboard />}
            {activeTab === 'Farm' && <DemoFarm />}
            {activeTab === 'Clan' && <DemoClan />}
            {activeTab === 'Gathering' && <LockedSection title="Toplama (Gathering)" onRegister={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />}
            {activeTab === 'Events' && <LockedSection title="Etkinlik Takvimi" onRegister={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />}
            {activeTab === 'Messaging' && <LockedSection title="Mesajlaşma Sistemi" onRegister={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />}
            {activeTab === 'Admin' && <LockedSection title="Uygulama Ayarları" onRegister={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />}
            {activeTab !== 'Dashboard' && activeTab !== 'Farm' && activeTab !== 'Clan' && activeTab !== 'Gathering' && activeTab !== 'Events' && activeTab !== 'Messaging' && activeTab !== 'Admin' && (
              <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-gray-800/10 rounded-[3rem] border border-gray-800/50 border-dashed">
                <Settings className="text-gray-700 mb-6 animate-spin-slow" size={64} />
                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-3">SİSTEM MOCK MODUNDA</h3>
                <p className="text-gray-500 max-w-sm mb-8 text-sm leading-relaxed">Şu an <b>{activeTab}</b> sayfası demo içeriği ile hazırlanmaktadır. Orijinal deneyimin tamamına erişmek için hemen kayıt olun.</p>
                <div className="flex gap-4">
                  <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden self-center"><div className="w-[85%] h-full bg-yellow-600 animate-pulse"></div></div>
                  <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">GELİSİYOR %85</span>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

const LandingPage = ({ onLogin, onRegister, onViewPrivacy }) => (
  <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30">
    <nav className="fixed top-0 w-full z-[60] bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800 h-16 flex items-center">
      <div className="max-w-7xl mx-auto px-4 w-full flex justify-between items-center">
        <div className="flex items-center gap-2"><div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-blue-500/20"><TrendingUp className="text-white" size={24} /></div><span className="text-xl font-black text-white tracking-tighter italic uppercase">LOOTMETRIC</span></div>
        <div className="hidden md:flex gap-8"><a href="#demo" className="hover:text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] transition-colors">Deneyim</a><a href="#features" className="hover:text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] transition-colors">Özellikler</a></div>
        <div className="flex gap-4 items-center"><button onClick={onLogin} className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Giriş</button><button onClick={onRegister} className="bg-blue-600 text-white text-xs font-black px-5 py-2.5 rounded-xl uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">BAŞLA</button></div>
      </div>
    </nav>
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden px-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none"><div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" /></div>
      <div className="max-w-7xl mx-auto relative text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-400 text-[10px] font-black mb-6 uppercase tracking-[0.3em] lg:animate-bounce"><Zap size={14} /> Rise Online World v3.0 Powered By LootMetric</div>
        <h1 className="text-5xl md:text-5xl font-black text-white mb-6 tracking-tighter leading-[0.9] italic uppercase">Clan Bankası, Farm Organizasyonu, Toplama, Etkinlik <br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Hepsi Bir Arada Takip Çözümü.</span></h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-10 font-medium leading-relaxed">Party farm katılımcıları sisteme girilen dropları anında kendi ekranlarında görür. Clan bankası işlem geçmişini şeffafça takip edin, Clan Boss ve Etkinliklerden elde edilen gelirleri detaylı raporlarla analiz edin.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4"><button onClick={onRegister} className="w-full sm:w-auto bg-blue-600 text-white font-black px-10 py-5 rounded-2xl shadow-blue-500/30 shadow-2xl flex items-center gap-2 uppercase tracking-tighter italic text-xl transition-all hover:scale-105 group">Kayıt Ol ve Başla <ArrowRight className="group-hover:translate-x-2 transition-transform" /></button><button onClick={() => document.getElementById('demo').scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto bg-slate-800 text-white font-black px-10 py-5 rounded-2xl border border-slate-700 uppercase tracking-widest text-sm hover:bg-slate-700 transition-colors">DEMO İNCELE</button></div>
      </div>
    </section>
    <section id="demo" className="py-20 relative px-4 bg-[#080c14]/50 border-y border-slate-800/50 overflow-hidden">
      <div className="max-w-7xl mx-auto text-center mb-16"><h2 className="text-4xl font-black text-white mb-4 italic tracking-tighter uppercase">Uygulama Deneyimi</h2><p className="text-slate-500 max-w-2xl mx-auto font-medium">Kayıt Sonrası Sayfa Örnekleri</p></div>
      <DemoUI />
    </section>
    <section id="features" className="py-24 px-4 overflow-hidden relative">
      <div className="max-w-7xl mx-auto relative"><div className="text-center mb-20"><span className="text-blue-500 font-black text-[10px] tracking-[0.5em] uppercase mb-4 block animate-pulse">Kapsamlı Sürüm Notları</span><h2 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">PLATFORM ÖZELLİKLERİ</h2></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { icon: <Lock />, title: 'Auth & Güvenlik', color: 'blue', items: ['Giriş/Kayıt: Hızlı erişim', 'Oturum: httpOnly Cookie + JWT', 'Hız: 5ms doğrulama süresi'] },
          { icon: <LayoutDashboard />, title: 'Özet Rapor', color: 'yellow', items: ['Dashboard: Günlük kazanç', 'Analiz: Farm + Gathering', 'Grafik: 7 günlük bar serisi'] },
          { icon: <LayoutDashboard />, title: 'Mesajlaşma', color: 'purple', items: ['WhatsApp benzeri özel sohbet.', 'Okundu bilgisi'] },
          { icon: <Pickaxe />, title: 'Gathering', color: 'emerald', items: ['Meslekler: Woodcutting, Mining, Quarring, Archeology, Harvesting, Skinning, Herbalism, Fishing.', 'Hedef Kazanç , Detaylı Raporlama', 'Meslekler arası kıyaslama', 'Süre Bazlı Raporlar'] },
          { icon: <Scroll />, title: 'Etkinlikler', color: 'red', items: ['Eventler: Inferno, Crystal Fortress, Deathmatch, Mount Race, Blood Valley, Sevenfold, Random Rewards, DV Görev, Lucky Draw', 'Rapor : Detaylı veri raporu', 'Kazanma oranı trendi — günlük bazlı grafik', 'Etkinlik bazlı kâr dağılımı pasta grafiği', 'Hedef kazanç girişi ve ilerleme çubuğu', 'Tarih, etkinlik, kâr, süre, verimlilik tablosu'] },
          { icon: <Sword />, title: 'Farm (Solo/Party)', color: 'amber', items: ['Party katılımcı Ekleme', 'Party: Otomatik hakediş', 'Katılımcı anlık kayıt takibi', 'Kayıt düzenleme bildirim sistemi', 'Drop satışı ve hakediş takibi', 'Katılımcı ödeme takibi'] },
          { icon: <Crown />, title: 'Clan Yönetimi', color: 'purple', items: ['Clan Bank:Tüm Clan Üyeleri görebilir', 'Clan Boss: Her katılım için üye dahil etme', 'Run detayına tıklayınca ekran görüntüsü + ganimet listesi', 'Toplu ve kısmi pay ödeme', 'Excel aktar ile dışarıda analiz et', 'Otomatik genel pay takibi', 'ACP: Bağış puanlama', 'Clan Borcu takip ve ödemeleri', 'Hazine sandığı, vergi kesintisi', 'Clan üyeleri kendi ekranlarından kontrol ve canlı takip sistemi', 'Clan içi Mesajlaşma Sistemi', 'Banka işlem geçmişi', 'Discord Entegrasyonu', 'Clan içi Detaylı Rapor'] }
        ].map((f, i) => (
          <div key={i} className={`p-8 bg-gray-900/40 rounded-[2.5rem] border border-gray-800 hover:border-${f.color}-500/40 transition-all group overflow-hidden relative`}><div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-${f.color}-500 opacity-[0.03] group-hover:opacity-10 transition-all rounded-full`}></div><div className="flex items-center gap-4 mb-6"><div className={`w-12 h-12 bg-${f.color}-600/10 rounded-2xl flex items-center justify-center text-${f.color}-500 group-hover:bg-${f.color}-600 group-hover:text-white transition-all shadow-lg`}>{f.icon}</div><h3 className="font-black text-white italic uppercase tracking-tighter text-xl leading-none">{f.title}</h3></div><ul className="space-y-3 text-xs text-slate-500 font-bold">{f.items.map((item, j) => (<li key={j} className="flex gap-2 items-center"><CheckCircle2 className={`text-${f.color}-500`} size={12} /> {item}</li>))}</ul></div>
        ))}
      </div></div>
    </section>
    <footer className="bg-slate-950 pt-24 pb-12 border-t border-slate-900 px-4">
      <div className="max-w-7xl mx-auto text-center md:text-left"><div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20 text-center md:text-left"><div className="col-span-1 md:col-span-2"><div className="flex items-center justify-center md:justify-start gap-3 mb-8"><div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-blue-500/20"><TrendingUp className="text-white" size={24} /></div><span className="text-2xl font-black text-white tracking-tighter italic uppercase">LootMetric</span></div><p className="text-slate-600 text-[10px] leading-relaxed max-w-sm mx-auto md:mx-0 font-black uppercase tracking-widest">Rise Online maceranızda hakedişlerinizi, clan bankanızı ve tüm oyun verilerinizi takip eden rakipsiz platform. Oyunun resmi yapımcılarıyla herhangi bir bağı yoktur.</p></div><div><h4 className="text-white font-black text-xs uppercase tracking-[0.5em] mb-8">Menü</h4><ul className="space-y-4 text-[10px] font-black text-slate-500 uppercase tracking-widest"><li><button onClick={() => document.getElementById('demo').scrollIntoView({ behavior: 'smooth' })} className="hover:text-blue-500 transition-colors">Deneyim</button></li><li><a href="#features" className="hover:text-blue-500">Özellikler</a></li><li><button onClick={onViewPrivacy} className="hover:text-blue-500">Gizlilik</button></li></ul></div><div><h4 className="text-white font-black text-xs uppercase tracking-[0.5em] mb-8">Sürüm</h4><ul className="space-y-4 text-[10px] font-black text-slate-500 uppercase tracking-widest"><li>v3.0.4 - Build 2026/03</li><li>admin@lootmetric.com</li></ul></div></div><div className="pt-10 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6"><p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.2em]">© 2026 LootMetric. Tüm hakları saklıdır.</p><button onClick={onViewPrivacy} className="text-[9px] text-slate-700 hover:text-white transition-all uppercase font-black underline decoration-slate-900 underline-offset-8">GİZLİLİK POLİTİKASI</button></div></div>
    </footer>
  </div>
);

export default LandingPage;
