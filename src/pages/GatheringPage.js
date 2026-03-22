import React, { useState, useEffect, useMemo } from 'react';
import { PROFESSIONS } from '../constants';
import { gatheringService } from '../services/api';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from 'recharts';

const GatheringPage = ({ userData, selectedDate, prices, uid }) => {
  const [activeTab, setActiveTab] = useState("Genel");
  const [currentInputs, setCurrentInputs] = useState({});
  const [durations, setDurations] = useState({}); // Her meslek için süre takibi
  const [gatheringLogs, setGatheringLogs] = useState([]);

  // Rapor State'leri
  const [reportPreset, setReportPreset] = useState('monthly'); // daily | weekly | monthly | range
  const [reportFrom, setReportFrom] = useState(selectedDate);
  const [reportTo, setReportTo] = useState(selectedDate);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [profitSeries, setProfitSeries] = useState([]);
  const [dailyBreakdown, setDailyBreakdown] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [targetProfit, setTargetProfit] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [reportCacheKey, setReportCacheKey] = useState(null);
  const [reportProfessionFilter, setReportProfessionFilter] = useState('ALL');

  const PIE_COLORS = ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'];

  const toISODate = (d) => {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const addDays = (iso, days) => {
    const dt = new Date(iso);
    dt.setDate(dt.getDate() + days);
    return toISODate(dt);
  };

  const startOfWeek = (iso) => {
    const dt = new Date(iso);
    const day = dt.getDay(); // 0 Sun - 6 Sat
    const diff = (day + 6) % 7; // Monday start
    dt.setDate(dt.getDate() - diff);
    return toISODate(dt);
  };

  const endOfWeek = (iso) => addDays(startOfWeek(iso), 6);

  const startOfMonth = (iso) => {
    const dt = new Date(iso);
    dt.setDate(1);
    return toISODate(dt);
  };

  const endOfMonth = (iso) => {
    const dt = new Date(iso);
    dt.setMonth(dt.getMonth() + 1);
    dt.setDate(0);
    return toISODate(dt);
  };

  // Rapor aralığını preset'e göre ayarla
  useEffect(() => {
    if (!selectedDate) return;
    if (reportPreset === 'daily') {
      setReportFrom(selectedDate);
      setReportTo(selectedDate);
    } else if (reportPreset === 'weekly') {
      setReportFrom(startOfWeek(selectedDate));
      setReportTo(endOfWeek(selectedDate));
    } else if (reportPreset === 'monthly') {
      setReportFrom(startOfMonth(selectedDate));
      setReportTo(endOfMonth(selectedDate));
    }
  }, [selectedDate, reportPreset]);

  // Hedef (localStorage)
  useEffect(() => {
    if (!uid || !reportFrom || !reportTo) return;
    const key = `gathering.report.targetProfit.${uid}.${reportFrom}.${reportTo}.${reportProfessionFilter}`;
    const stored = localStorage.getItem(key);
    setTargetProfit(stored ?? '');
  }, [uid, reportFrom, reportTo, reportProfessionFilter]);

  const persistTargetProfit = (value) => {
    if (!uid || !reportFrom || !reportTo) return;
    const key = `gathering.report.targetProfit.${uid}.${reportFrom}.${reportTo}.${reportProfessionFilter}`;
    localStorage.setItem(key, value);
  };

  // Rapor verilerini çek
  const loadReport = async (useCache = true) => {
    if (activeTab !== 'Raporlar') return;
    if (!uid || !reportFrom || !reportTo) return;

    const cacheKey = `gathering.report.cache.${uid}.${reportFrom}.${reportTo}.${reportProfessionFilter}`;
    setReportCacheKey(cacheKey);

    if (useCache) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setReportData(parsed.summary || null);
          setProfitSeries(parsed.series || []);
          setDailyBreakdown(parsed.breakdown || []);
          return;
        } catch { }
      }
    }

    try {
      setReportLoading(true);
      setReportError(null);

      const params = { from: reportFrom, to: reportTo };
      if (reportProfessionFilter !== 'ALL') params.profession = reportProfessionFilter;

      const [summary, series, breakdown] = await Promise.all([
        gatheringService.getReportSummary(uid, params),
        gatheringService.getProfitTimeSeries(uid, {
          from: addDays(reportTo, -59),
          to: reportTo,
          ...(reportProfessionFilter !== 'ALL' ? { profession: reportProfessionFilter } : {})
        }),
        gatheringService.getDailyBreakdown(uid, params)
      ]);

      setReportData(summary);
      setProfitSeries(series || []);
      setDailyBreakdown(breakdown || []);

      localStorage.setItem(cacheKey, JSON.stringify({ summary, series, breakdown }));
    } catch (error) {
      console.error('Gathering reports load error:', error);
      setReportError('Raporlar yüklenemedi.');
    } finally {
      setReportLoading(false);
    }
  };

  // Basit tahminleme
  useEffect(() => {
    if (!profitSeries || profitSeries.length < 7) {
      setForecast(null);
      return;
    }
    const points = profitSeries.map((p, idx) => ({ x: idx, y: Number(p.total_profit || 0) })).filter(p => Number.isFinite(p.y));
    if (points.length < 7) { setForecast(null); return; }
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sumXX - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;
    const next30 = Array.from({ length: 30 }, (_, i) => Math.max(0, slope * (n + i) + intercept));
    setForecast({ predictedNextMonthProfit: Math.round(next30.reduce((s, v) => s + v, 0) * 100) / 100 });
  }, [profitSeries]);

  const filteredBreakdownTable = useMemo(() => {
    const q = (reportSearch || '').trim().toLowerCase();
    const rows = dailyBreakdown || [];
    if (!q) return rows;
    return rows.filter((r) => r.profession.toLowerCase().includes(q) || String(r.date).includes(q));
  }, [dailyBreakdown, reportSearch]);

  const TabButton = ({ name, active, onClick }) => (
    <button 
      onClick={onClick} 
      className={`px-4 py-1.5 whitespace-nowrap rounded-lg transition-all duration-200 text-sm font-medium ${active ? 'bg-yellow-600/20 text-yellow-500 border border-yellow-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300 border border-transparent'}`}
    >
      {name}
    </button>
  );

  // PostgreSQL'den toplama loglarını yükle
  useEffect(() => {
    const fetchGatheringLogs = async () => {
      try {
        const logs = await gatheringService.getLogsByDate(uid, selectedDate);
        setGatheringLogs(logs);
        
        // Mevcut item verilerini yükle
        const inputs = {};
        
        // Only load inputs if activeTab is not 'Genel' and profession exists
        if(activeTab !== "Genel" && activeTab !== "Raporlar" && PROFESSIONS[activeTab]) {
          const professionItems = PROFESSIONS[activeTab];
          if(Array.isArray(professionItems)) {
            professionItems.forEach(item => {
              const log = logs.find(l => l.profession === activeTab && l.item_name === item);
              inputs[item] = { 
                count: log?.count || 0, 
                price: log?.price || prices[item] || 0 
              };
            });
          }
        }
        setCurrentInputs(inputs);
      } catch (error) {
        console.error('Gathering logs yüklenirken hata:', error);
      }
    };

    if (uid && selectedDate) {
      fetchGatheringLogs();
    }
  }, [uid, selectedDate, activeTab, prices]);

  // Süre verilerini yükle
  useEffect(() => {
    const fetchDuration = async () => {
      if (activeTab !== "Genel" && activeTab !== "Raporlar" && uid && selectedDate) {
        try {
          const durationData = await gatheringService.getDuration(uid, selectedDate, activeTab);
          setDurations(prev => ({ ...prev, [activeTab]: durationData.duration || 0 }));
        } catch (error) {
          console.error('Duration yüklenirken hata:', error);
        }
      }
    };

    fetchDuration();
  }, [uid, selectedDate, activeTab]);

  const handleSaveAll = async () => {
    if(activeTab === "Genel" || activeTab === "Raporlar") return;
    
    try {
      const professionItems = PROFESSIONS[activeTab];
      if(professionItems && Array.isArray(professionItems)) {
        for (const item of professionItems) {
          const count = parseInt(currentInputs[item]?.count) || 0;
          const price = parseInt(currentInputs[item]?.price) || 0;
          if (count > 0 || price > 0) {
            await gatheringService.createLog(uid, {
              date: selectedDate,
              profession: activeTab,
              itemName: item,
              count: count,
              price: price
            });
          }
        }
      }
      const logs = await gatheringService.getLogsByDate(uid, selectedDate);
      setGatheringLogs(logs);
    } catch (error) {
      console.error('Gathering log kaydetme hatası:', error);
    }
  };

  const handleSaveDuration = async () => {
    try {
      await gatheringService.updateDuration(uid, selectedDate, activeTab, parseInt(durations[activeTab] || 0));
    } catch (error) {
      console.error('Duration kaydetme hatası:', error);
    }
  };

  const handleDurationChange = (value) => {
    const durationValue = value === '' ? '' : parseInt(value) || 0;
    setDurations(prev => ({ ...prev, [activeTab]: durationValue }));
  };

  const calculateAmount = (item) => {
    const count = parseInt(currentInputs[item]?.count) || 0;
    const price = parseInt(currentInputs[item]?.price) || 0;
    return count * price;
  };

  const savedData = useMemo(() => {
    if(activeTab === "Genel" || activeTab === "Raporlar") {
      const allData = [];
      Object.keys(PROFESSIONS || {}).forEach(profession => {
        const professionLogs = gatheringLogs.filter(log => log.profession === profession);
        const professionItems = PROFESSIONS[profession] || [];
        if(Array.isArray(professionItems)) {
          professionItems.forEach(item => {
            const log = professionLogs.find(l => l.item_name === item);
            if (log && (log.count > 0 || log.price > 0)) {
              const count = parseInt(log.count) || 0;
              const price = parseInt(log.price) || 0;
              allData.push({ profession, itemName: item, count, price, amount: count * price });
            }
          });
        }
      });
      return allData;
    } else {
      const professionLogs = gatheringLogs.filter(log => log.profession === activeTab);
      const data = [];
      const professionItems = PROFESSIONS[activeTab];
      if(professionItems && Array.isArray(professionItems)) {
        professionItems.forEach(item => {
          const log = professionLogs.find(l => l.item_name === item);
          if (log && (log.count > 0 || log.price > 0)) {
            const count = parseInt(log.count) || 0;
            const price = parseInt(log.price) || 0;
            data.push({ itemName: item, count, price, amount: count * price });
          }
        });
      }
      return data;
    }
  }, [gatheringLogs, selectedDate, activeTab]);

  const totalAmount = useMemo(() => savedData.reduce((sum, item) => sum + item.amount, 0), [savedData]);

  const getItemIcon = (profession, itemName) => {
    if (!profession || !itemName) return null;
    if (itemName.startsWith("Soulstone of")) return encodeURI(`/ui_icons/Icon_Item_${itemName.replace(/\s+/g, '_')}.PNG`);
    let folder = profession === "Woodcutting" ? "woodcutting" : profession === "Mining" ? "mining" : profession;
    let fileName = profession === "Woodcutting" ? itemName.replace(/\s+/g, '').toLowerCase() : `Icon_Item_${itemName.replace(/\s+/g, '_')}`;
    if (profession === "Archaeology" && itemName === "Crude Amethsis") fileName = "Icon_Item_Crude_Amethyst";
    if (profession === "Harvesting") {
      if (itemName === "Cotton") fileName = "Icon_Item_Cotton_Fiber";
      if (itemName === "Zucchine") fileName = "Icon_Item_Zucchini";
    }
    return encodeURI(`/ui_icons/materials/${folder}/${fileName.trim()}.png`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-gray-700 pb-4">
        <TabButton name="Genel" active={activeTab === "Genel"} onClick={() => setActiveTab("Genel")} />
        <TabButton name="Raporlar" active={activeTab === "Raporlar"} onClick={() => setActiveTab("Raporlar")} />
        {Object.keys(PROFESSIONS).map(p => (
          <TabButton key={p} name={p} active={activeTab === p} onClick={() => setActiveTab(p)} />
        ))}
      </div>

      {activeTab === 'Raporlar' ? (
        <div className="space-y-6">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-3">Toplama Raporları</h3>
            <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setReportPreset('daily')} className={`px-4 py-1.5 whitespace-nowrap rounded-lg transition-all duration-200 text-sm font-medium ${reportPreset === 'daily' ? 'bg-yellow-600/20 text-yellow-500 border border-yellow-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300 border border-transparent'}`}>Günlük</button>
                <button onClick={() => setReportPreset('weekly')} className={`px-4 py-1.5 whitespace-nowrap rounded-lg transition-all duration-200 text-sm font-medium ${reportPreset === 'weekly' ? 'bg-yellow-600/20 text-yellow-500 border border-yellow-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300 border border-transparent'}`}>Haftalık</button>
                <button onClick={() => setReportPreset('monthly')} className={`px-4 py-1.5 whitespace-nowrap rounded-lg transition-all duration-200 text-sm font-medium ${reportPreset === 'monthly' ? 'bg-yellow-600/20 text-yellow-500 border border-yellow-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300 border border-transparent'}`}>Aylık</button>
                <button onClick={() => setReportPreset('range')} className={`px-4 py-1.5 whitespace-nowrap rounded-lg transition-all duration-200 text-sm font-medium ${reportPreset === 'range' ? 'bg-yellow-600/20 text-yellow-500 border border-yellow-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300 border border-transparent'}`}>Tarih Aralığı</button>
              </div>
              <div className="flex gap-2">
                <input type="date" className="bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm" value={reportFrom || ''} disabled={reportPreset !== 'range'} onChange={(e) => setReportFrom(e.target.value)} />
                <input type="date" className="bg-gray-700 border border-gray-600 rounded p-2 text-white text-sm" value={reportTo || ''} disabled={reportPreset !== 'range'} onChange={(e) => setReportTo(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-gray-300 text-xs block mb-1">Meslek Filtresi</label>
                <select className="bg-gray-700 border border-gray-600 rounded p-2 text-white w-full" value={reportProfessionFilter} onChange={(e) => setReportProfessionFilter(e.target.value)}>
                  <option value="ALL">Tümü</option>
                  {Object.keys(PROFESSIONS).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-gray-300 text-xs block mb-1">Hedef Kazanç</label>
                <input type="number" className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" value={targetProfit} onChange={(e) => { setTargetProfit(e.target.value); persistTargetProfit(e.target.value); }} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => loadReport(true)} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded font-medium">Raporları Getir</button>
              <button onClick={() => loadReport(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm">Sunucudan Yenile</button>
            </div>
          </div>

          {reportLoading ? <div className="text-gray-400">Yükleniyor...</div> : reportData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="text-gray-300 text-xs">Toplam Kazanç</div>
                  <div className="text-green-400 text-2xl font-bold">{Number(reportData.totals.total_profit || 0).toLocaleString()}c</div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="text-gray-300 text-xs">Toplam Süre</div>
                  <div className="text-white text-2xl font-bold">{reportData.totals.total_duration_minutes} dk</div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="text-gray-300 text-xs">Genel Verimlilik</div>
                  <div className="text-yellow-500 text-2xl font-bold">{reportData.totals.gold_per_hour?.toLocaleString() || 0} c/saat</div>
                </div>
              </div>

              {/* Grafik: Kâr Zaman Serisi */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 className="text-white font-bold mb-3">Kâr Çizelgesi (Son 60 Gün)</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={profitSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                      <YAxis stroke="#9ca3af" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#10b981' }} />
                      <Line type="monotone" dataKey="total_profit" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Meslek Bazlı Dağılım */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <h4 className="text-white font-bold mb-3">Meslek Bazlı Kazanç Dağılımı</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={reportData.byProfession.map(p => ({ name: p.profession, value: Number(p.total_profit) })).filter(d => d.value > 0)} dataKey="value" nameKey="name" outerRadius={80} label>
                          {reportData.byProfession.map((_, idx) => <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <h4 className="text-white font-bold mb-3">Meslek Verimliliği (Gold/Saat)</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.byProfession}>
                        <XAxis dataKey="profession" stroke="#9ca3af" fontSize={10} />
                        <YAxis stroke="#9ca3af" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} />
                        <Bar dataKey="gold_per_hour" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detaylı Tablo */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-white font-bold">Günlük Detaylar</h4>
                  <input type="text" placeholder="Ara..." className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm text-white" value={reportSearch} onChange={e => setReportSearch(e.target.value)} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="p-2">Tarih</th>
                        <th className="p-2">Meslek</th>
                        <th className="p-2 text-right">Kâr (c)</th>
                        <th className="p-2 text-right">Süre (dk)</th>
                        <th className="p-2 text-right">Verimlilik (c/sa)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBreakdownTable.map((row, i) => (
                        <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                          <td className="p-2 text-gray-300">{row.date.split('T')[0]}</td>
                          <td className="p-2 text-white font-medium">{row.profession}</td>
                          <td className="p-2 text-right text-green-400">{Number(row.total_profit).toLocaleString()}</td>
                          <td className="p-2 text-right text-gray-300">{row.total_duration_minutes}</td>
                          <td className="p-2 text-right text-yellow-500">{Number(row.gold_per_hour || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Süre Giriş Alanı */}
          {activeTab !== "Genel" && (
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <label className="text-gray-300 text-sm mb-1 block">{activeTab} için Toplama Süresi (Dakika)</label>
                  <input type="number" placeholder="Dakika cinsinden süre" className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white" value={durations[activeTab] || ''} onChange={e => handleDurationChange(e.target.value)} />
                </div>
                <button onClick={handleSaveDuration} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded font-medium self-end md:self-auto">Süreyi Kaydet</button>
              </div>
            </div>
          )}

          {activeTab !== "Genel" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(PROFESSIONS[activeTab] || []).map(item => (
                <div key={item} className="bg-gray-700 p-4 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <img src={getItemIcon(activeTab, item)} alt={item} className="w-8 h-8 object-contain rounded bg-gray-900 p-1" onError={(e) => { e.target.style.display = 'none'; }} />
                    <span className="text-white font-medium">{item}</span>
                  </div>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Adet" className="w-full bg-gray-900 rounded p-1 text-white" value={currentInputs[item]?.count || 0} onChange={e => setCurrentInputs({ ...currentInputs, [item]: { ...currentInputs[item], count: e.target.value } })} />
                    <input type="number" placeholder="Fiyat" className="w-full bg-gray-900 rounded p-1 text-white" value={currentInputs[item]?.price || 0} onChange={e => setCurrentInputs({ ...currentInputs, [item]: { ...currentInputs[item], price: e.target.value } })} />
                  </div>
                  <div className="text-sm text-gray-300">Tutar: <span className="font-medium text-green-400">{calculateAmount(item).toLocaleString()}c</span></div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={handleSaveAll} className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded font-medium">Tümünü Kaydet</button>
          </div>

          {savedData.length > 0 && (
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mt-6">
              <h3 className="text-lg font-bold text-white mb-4">{selectedDate} Tarihli Kayıtlar</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-700">
                    <tr>
                      {activeTab === "Genel" && <th className="pb-2 text-gray-300 font-medium">Meslek</th>}
                      <th className="pb-2 text-gray-300 font-medium">İtem Adı</th>
                      <th className="pb-2 text-gray-300 font-medium text-right">Adet</th>
                      <th className="pb-2 text-gray-300 font-medium text-right">Fiyat</th>
                      <th className="pb-2 text-gray-300 font-medium text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedData.map((item, index) => (
                      <tr key={index} className="border-b border-gray-700 last:border-0">
                        {activeTab === "Genel" && <td className="py-2 text-white">{item.profession}</td>}
                        <td className="py-2 text-white">
                          <div className="flex items-center gap-2">
                            <img src={getItemIcon(item.profession || activeTab, item.itemName)} alt={item.itemName} className="w-6 h-6 object-contain rounded bg-gray-900 p-0.5" onError={(e) => { e.target.style.display = 'none'; }} />
                            {item.itemName}
                          </div>
                        </td>
                        <td className="py-2 text-right text-gray-300">{item.count}</td>
                        <td className="py-2 text-right text-gray-300">{item.price}</td>
                        <td className="py-2 text-right text-green-400 font-medium">{item.amount.toLocaleString()}c</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-600">
                      <td colSpan={activeTab === "Genel" ? "4" : "3"} className="pt-2 text-right text-gray-300 font-medium">Toplam:</td>
                      <td className="pt-2 text-right text-green-400 font-bold text-base">{totalAmount.toLocaleString()}c</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GatheringPage;