import React, { useState, useEffect, useMemo } from 'react';
import { EVENTS } from '../constants';
import { eventService } from '../services/api';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from 'recharts';

const EventsPage = ({ userData, selectedDate, prices, uid }) => {
  const [activeTab, setActiveTab] = useState("Genel");
  const [currentInputs, setCurrentInputs] = useState({});
  const [durations, setDurations] = useState({}); // Her etkinlik için süre takibi
  const [eventLogs, setEventLogs] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
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
  const [reportEventFilter, setReportEventFilter] = useState('ALL'); // ALL or event_type code

  const EVENT_CODE_MAP = {
    'Inferno Temple': 'INFERNO_TEMPLE',
    'Crystal Fortress War': 'CRYSTAL_FORTRESS_WAR',
    'Deathmatch': 'DEATH_MATCH',
    'Mount Race': 'MOUNT_RACE',
    'DV Görev': 'DV_GOREV'
  };

  const EVENT_NAME_BY_CODE = {
    INFERNO_TEMPLE: 'Inferno Temple',
    CRYSTAL_FORTRESS_WAR: 'Crystal Fortress War',
    DEATH_MATCH: 'Death Match',
    MOUNT_RACE: 'Mount Race',
    DV_GOREV: 'DV Görev'
  };

  const PIE_COLORS = ['#a855f7', '#22c55e', '#eab308', '#ef4444', '#38bdf8', '#f97316'];

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

  // Günlük planlı etkinlik programını yükle (Inferno, Crystal, Death Match, Mount Race)
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!uid || !selectedDate) return;
      try {
        setScheduleLoading(true);
        setScheduleError(null);
        const data = await eventService.getSchedule(uid, selectedDate);
        setSchedule(data || []);
      } catch (error) {
        console.error('Etkinlik takvimi yüklenirken hata:', error);
        setScheduleError('Etkinlik takvimi yüklenemedi.');
      } finally {
        setScheduleLoading(false);
      }
    };

    fetchSchedule();
  }, [uid, selectedDate]);

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

  // Hedef (localStorage) - uid + aralık + etkinlik filtresi bazlı sakla
  useEffect(() => {
    if (!uid || !reportFrom || !reportTo) return;
    const key = `events.report.targetProfit.${uid}.${reportFrom}.${reportTo}.${reportEventFilter}`;
    const stored = localStorage.getItem(key);
    setTargetProfit(stored ?? '');
  }, [uid, reportFrom, reportTo, reportEventFilter]);

  const persistTargetProfit = (value) => {
    if (!uid || !reportFrom || !reportTo) return;
    const key = `events.report.targetProfit.${uid}.${reportFrom}.${reportTo}.${reportEventFilter}`;
    localStorage.setItem(key, value);
  };

  // Rapor verilerini çek
  const loadReport = async (useCache = true) => {
    if (activeTab !== 'Raporlar') return;
    if (!uid || !reportFrom || !reportTo) return;

    const cacheKey = `events.report.cache.${uid}.${reportFrom}.${reportTo}.${reportEventFilter}`;
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
        } catch {
          // bozuk cache, aşağıda yenilenecek
        }
      }
    }

    try {
      setReportLoading(true);
      setReportError(null);

      const baseParams = { from: reportFrom, to: reportTo };
      if (reportEventFilter !== 'ALL') {
        baseParams.eventType = reportEventFilter;
      }

      const [summary, series, breakdown] = await Promise.all([
        eventService.getReportSummary(uid, baseParams),
        eventService.getProfitTimeSeries(uid, {
          from: addDays(reportTo, -59),
          to: reportTo,
          ...(reportEventFilter !== 'ALL' ? { eventType: reportEventFilter } : {})
        }),
        eventService.getDailyBreakdown(uid, baseParams)
      ]);

      setReportData(summary);
      setProfitSeries(series || []);
      setDailyBreakdown(breakdown || []);

      const payload = { summary, series, breakdown };
      localStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch (error) {
      console.error('Raporlar yüklenirken hata:', error);
      setReportError('Raporlar yüklenemedi.');
    } finally {
      setReportLoading(false);
    }
  };

  // Basit istatistiksel tahmin (son 60 gün ortalaması + trend)
  useEffect(() => {
    if (!profitSeries || profitSeries.length < 7) {
      setForecast(null);
      return;
    }

    const points = profitSeries
      .map((p, idx) => ({ x: idx, y: Number(p.total_profit || 0) }))
      .filter(p => Number.isFinite(p.y));

    if (points.length < 7) {
      setForecast(null);
      return;
    }

    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

    const denom = n * sumXX - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;

    const next30 = Array.from({ length: 30 }, (_, i) => {
      const x = n + i;
      return Math.max(0, slope * x + intercept);
    });
    const predictedNextMonthProfit = Math.round(next30.reduce((s, v) => s + v, 0) * 100) / 100;

    setForecast({
      slope: Math.round(slope * 100) / 100,
      predictedNextMonthProfit
    });
  }, [profitSeries]);

  const dailyProfitChartData = useMemo(() => {
    if (!dailyBreakdown || dailyBreakdown.length === 0) return [];
    const map = new Map();
    dailyBreakdown.forEach((row) => {
      const date = row.date;
      const prev = map.get(date) || 0;
      map.set(date, prev + Number(row.total_profit || 0));
    });
    return Array.from(map.entries()).map(([date, total_profit]) => ({ date, total_profit }));
  }, [dailyBreakdown]);

  const dailyWinRateChartData = useMemo(() => {
    if (!dailyBreakdown || dailyBreakdown.length === 0) return [];
    const map = new Map();
    dailyBreakdown.forEach((row) => {
      const date = row.date;
      const acc = map.get(date) || { wins: 0, part: 0 };
      acc.wins += Number(row.wins || 0);
      acc.part += Number(row.participation || 0);
      map.set(date, acc);
    });
    return Array.from(map.entries()).map(([date, acc]) => ({
      date,
      win_rate: acc.part > 0 ? Math.round((100 * acc.wins / acc.part) * 100) / 100 : 0
    }));
  }, [dailyBreakdown]);

  const filteredBreakdownTable = useMemo(() => {
    const q = (reportSearch || '').trim().toLowerCase();
    const rows = dailyBreakdown || [];
    if (!q) return rows;
    return rows.filter((r) => {
      const name = (EVENT_NAME_BY_CODE[r.event_type] || r.event_name || '').toLowerCase();
      return name.includes(q) || String(r.date).includes(q);
    });
  }, [dailyBreakdown, reportSearch]);

  // PostgreSQL'den etkinlik loglarını yükle
  useEffect(() => {
    const fetchEventLogs = async () => {
      try {
        const logs = await eventService.getLogsByDate(uid, selectedDate);
        setEventLogs(logs);
        
        // Mevcut item verilerini yükle
        const inputs = {};
        
        // Only load inputs if activeTab is not 'Genel' and event exists
        if(activeTab !== "Genel" && EVENTS[activeTab]) {
          const eventItems = EVENTS[activeTab];
          if(Array.isArray(eventItems)) {
            eventItems.forEach(item => {
              const log = logs.find(l => l.event_type === activeTab && l.item_name === item);
              inputs[item] = { 
                count: log?.count || 0, 
                price: log?.price || prices[item] || 0 
              };
            });
          }
        }
        setCurrentInputs(inputs);
      } catch (error) {
        console.error('Event logs yüklenirken hata:', error);
      }
    };

    if (uid && selectedDate) {
      fetchEventLogs();
    }
  }, [uid, selectedDate, activeTab, prices]);

  // Süre verilerini yükle
  useEffect(() => {
    const fetchDuration = async () => {
      if (activeTab !== "Genel" && uid && selectedDate) {
        try {
          const durationData = await eventService.getDuration(uid, selectedDate, activeTab);
          setDurations(prev => ({ ...prev, [activeTab]: durationData.duration || 0 }));
        } catch (error) {
          console.error('Duration yüklenirken hata:', error);
        }
      }
    };

    fetchDuration();
  }, [uid, selectedDate, activeTab]);

  const handleSaveAll = async () => {
    if(activeTab === "Genel") return; // Don't save when on Genel tab
    
    try {
      // Sadece verisi olan item'ları kaydet
      const eventItems = EVENTS[activeTab];
      if(eventItems && Array.isArray(eventItems)) {
        for (const item of eventItems) {
          const count = parseInt(currentInputs[item]?.count) || 0;
          const price = parseInt(currentInputs[item]?.price) || 0;

          // En az bir değer varsa kaydet
          if (count > 0 || price > 0) {
            await eventService.createLog(uid, {
              date: selectedDate,
              eventType: activeTab,
              itemName: item,
              count: count,
              price: price
            });
          }
        }
      }
      
      // Verileri yeniden yükle
      const logs = await eventService.getLogsByDate(uid, selectedDate);
      setEventLogs(logs);
    } catch (error) {
      console.error('Event log kaydetme hatası:', error);
    }
  };

  const handleSaveDuration = async () => {
    try {
      await eventService.updateDuration(uid, selectedDate, activeTab, parseInt(durations[activeTab] || 0));
    } catch (error) {
      console.error('Duration kaydetme hatası:', error);
    }
  };

  const handleDurationChange = (value) => {
    const durationValue = value === '' ? '' : parseInt(value) || 0;
    setDurations(prev => ({ ...prev, [activeTab]: durationValue }));
  };

  // Hesaplanan tutarı alma fonksiyonu
  const calculateAmount = (item) => {
    const count = parseInt(currentInputs[item]?.count) || 0;
    const price = parseInt(currentInputs[item]?.price) || 0;
    return count * price;
  };

  // Kaydedilmiş verileri alma
  const savedData = useMemo(() => {
    if(activeTab === "Genel") {
      // Genel sekmesi için tüm etkinlikleri döndür
      const allData = [];
      
      Object.keys(EVENTS || {}).forEach(eventType => {
        const eventTypeLogs = eventLogs.filter(log => log.event_type === eventType);
        const eventItems = EVENTS[eventType] || [];
        
        if(Array.isArray(eventItems)) {
          eventItems.forEach(item => {
            const log = eventTypeLogs.find(l => l.item_name === item);
            if (log && (log.count > 0 || log.price > 0)) {
              const count = parseInt(log.count) || 0;
              const price = parseInt(log.price) || 0;
              const amount = count * price;
              allData.push({
                event: eventType,
                itemName: item,
                count: count,
                price: price,
                amount: amount
              });
            }
          });
        }
      });
      
      return allData;
    } else {
      const eventTypeLogs = eventLogs.filter(log => log.event_type === activeTab);
      const data = [];
      const eventItems = EVENTS[activeTab];
      
      if(eventItems && Array.isArray(eventItems)) {
        eventItems.forEach(item => {
          const log = eventTypeLogs.find(l => l.item_name === item);
          if (log && (log.count > 0 || log.price > 0)) {
            const count = parseInt(log.count) || 0;
            const price = parseInt(log.price) || 0;
            const amount = count * price;
            data.push({
              itemName: item,
              count: count,
              price: price,
              amount: amount
            });
          }
        });
      }

      return data;
    }
  }, [eventLogs, selectedDate, activeTab]);

  // Toplam tutarı hesaplama
  const totalAmount = useMemo(() => {
    return savedData.reduce((sum, item) => sum + item.amount, 0);
  }, [savedData]);

  const activeEventCode = EVENT_CODE_MAP[activeTab] || null;

  const eventResultsSummary = useMemo(() => {
    const summary = {};
    schedule.forEach(row => {
      const eventName = EVENT_NAME_BY_CODE[row.event_type];
      if (!eventName) return;
      if (!summary[eventName]) summary[eventName] = { wins: 0, losses: 0 };
      if (row.result === 'WIN') summary[eventName].wins++;
      if (row.result === 'LOSE') summary[eventName].losses++;
    });
    return summary;
  }, [schedule]);

  const filteredSchedule = useMemo(() => {
    if (!activeEventCode) return [];
    return schedule.filter((row) => row.event_type === activeEventCode);
  }, [schedule, activeEventCode]);

  const handleResultToggle = async (row, target) => {
    if (!uid || !selectedDate) return;

    const currentResult = row.result;
    let nextResult = null;

    if (target === 'WIN') {
      nextResult = currentResult === 'WIN' ? null : 'WIN';
    } else if (target === 'LOSE') {
      nextResult = currentResult === 'LOSE' ? null : 'LOSE';
    }

    try {
      await eventService.upsertResult(uid, {
        eventType: row.event_type,
        date: selectedDate,
        time: (row.time_of_day || '').slice(0, 5),
        result: nextResult
      });

      setSchedule(prev =>
        prev.map(s =>
          s.schedule_id === row.schedule_id ? { ...s, result: nextResult } : s
        )
      );
    } catch (error) {
      console.error('Etkinlik sonucu kaydedilirken hata:', error);
    }
  };

  // İtem ikonu yolunu belirleme fonksiyonu
  const getItemIcon = (itemName) => {
    if (!itemName) return null;
    
    let fileName = itemName;
    let extension = 'png';
    let folder = 'kutular/'; // Varsayılan klasör

    // Soulstone kontrolü
    if (itemName.startsWith("Soulstone of")) {
      folder = "";
      extension = "PNG";
    }
    // Rune kontrolü
    else if (itemName === "Unique Rune") {
      folder = "";
      fileName = "Uniqu_Rune"; // Dosya adındaki typo: "Uniqu_Rune"
      extension = "jfif";
    }
    else if (itemName === "Epic Rune") {
      folder = "";
      extension = "jfif";
    }
    // Bar kontrolü
    else if (itemName === "Silver Bar") {
      folder = "";
      fileName = "Silver_Bar";
      extension = "JPG";
    }
    else if (itemName === "Golden Bar") {
      folder = "";
      fileName = "Gold_Bar";
      extension = "JPG";
    }
    // Kristal ve diğer kutular
    else {
      if (itemName === "Red Crystal") fileName = "Red Crystall";
      if (itemName === "Golden Jade Chest") fileName = "Golden Jade";
    }

    // Dosya adı formatı
    let formattedFileName;
    if (itemName === "Silver Bar" || itemName === "Golden Bar") {
      formattedFileName = fileName; // Bunlarda "Icon_Item_" ön eki yok
    } else {
      formattedFileName = `Icon_Item_${fileName.replace(/\s+/g, '_')}`;
    }

    return encodeURI(`/ui_icons/${folder}${formattedFileName}.${extension}`);
  };

  // Sekme Gruplandırma
  const bottomRowKeys = ["Blood Valley", "Sevenfold", "Random Rewards", "DV Görev", "Lucky Draw"];
  const topRowEvents = Object.keys(EVENTS).filter(e => !bottomRowKeys.includes(e));
  const bottomRowEvents = Object.keys(EVENTS).filter(e => bottomRowKeys.includes(e));

  const TabButton = ({ name, active, onClick }) => (
    <button 
      onClick={onClick} 
      className={`px-4 py-1.5 whitespace-nowrap rounded-lg transition-all duration-200 text-sm font-medium ${active ? 'bg-purple-600/20 text-purple-400 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300 border border-transparent'}`}
    >
      {name}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-gray-700 pb-4">
        {/* Üst Sıra */}
        <div className="flex flex-wrap gap-2">
          <TabButton name="Genel" active={activeTab === "Genel"} onClick={() => setActiveTab("Genel")} />
          <TabButton name="Raporlar" active={activeTab === "Raporlar"} onClick={() => setActiveTab("Raporlar")} />
          {topRowEvents.map(e => (
            <TabButton key={e} name={e} active={activeTab === e} onClick={() => setActiveTab(e)} />
          ))}
        </div>
        
        {/* Alt Sıra */}
        <div className="flex flex-wrap gap-2">
          {bottomRowEvents.map(e => (
            <TabButton key={e} name={e} active={activeTab === e} onClick={() => setActiveTab(e)} />
          ))}
        </div>
      </div>

      {/* RAPORLAR SEKME İÇERİĞİ */}
      {activeTab === 'Raporlar' && (
        <div className="space-y-6">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-3">Raporlar</h3>
            <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setReportPreset('daily')} className={`px-3 py-2 rounded ${reportPreset === 'daily' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-200'}`}>Günlük</button>
                <button onClick={() => setReportPreset('weekly')} className={`px-3 py-2 rounded ${reportPreset === 'weekly' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-200'}`}>Haftalık</button>
                <button onClick={() => setReportPreset('monthly')} className={`px-3 py-2 rounded ${reportPreset === 'monthly' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-200'}`}>Aylık</button>
                <button onClick={() => setReportPreset('range')} className={`px-3 py-2 rounded ${reportPreset === 'range' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-200'}`}>Tarih Aralığı</button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <div>
                  <label className="text-gray-300 text-xs block mb-1">Başlangıç</label>
                  <input
                    type="date"
                    className="bg-gray-700 border border-gray-600 rounded p-2 text-white"
                    value={reportFrom || ''}
                    disabled={reportPreset !== 'range'}
                    onChange={(e) => setReportFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-xs block mb-1">Bitiş</label>
                  <input
                    type="date"
                    className="bg-gray-700 border border-gray-600 rounded p-2 text-white"
                    value={reportTo || ''}
                    disabled={reportPreset !== 'range'}
                    onChange={(e) => setReportTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
              <div className="flex gap-2 flex-wrap">
                <div>
                  <label className="text-gray-300 text-xs block mb-1">Etkinlik Filtresi</label>
                  <select
                    className="bg-gray-700 border border-gray-600 rounded p-2 text-white min-w-[180px]"
                    value={reportEventFilter}
                    onChange={(e) => {
                      setReportEventFilter(e.target.value);
                      setReportData(null);
                      setProfitSeries([]);
                      setDailyBreakdown([]);
                    }}
                  >
                    <option value="ALL">Tümü</option>
                    <option value="INFERNO_TEMPLE">Inferno Temple</option>
                    <option value="CRYSTAL_FORTRESS_WAR">Crystal Fortress War</option>
                    <option value="DEATH_MATCH">Death Match</option>
                    <option value="MOUNT_RACE">Mount Race</option>
                    <option value="DV_GOREV">DV Görev</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <div className="flex-1">
                  <label className="text-gray-300 text-xs block mb-1">Hedef (Toplam Kazanç)</label>
                  <input
                    type="number"
                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                    placeholder="Örn: 1000000"
                    value={targetProfit}
                    onChange={(e) => {
                      setTargetProfit(e.target.value);
                      persistTargetProfit(e.target.value);
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="text-gray-300 text-xs mb-1">Seçili aralık</div>
                  <div className="text-white font-medium">{reportFrom} → {reportTo}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                onClick={() => loadReport(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-medium"
              >
                Raporları Getir
              </button>
              <button
                onClick={() => loadReport(false)}
                className="bg-gray-700 hover:bg-gray-600 text-gray-100 px-4 py-2 rounded text-sm"
              >
                Yeniden Hesapla (Sunucudan)
              </button>
              {reportCacheKey && localStorage.getItem(reportCacheKey) && (
                <span className="text-xs text-gray-400 self-center">
                  Bu aralık için önbellek kullanılıyor (Raporları Getir).
                </span>
              )}
            </div>

          </div>

          {reportLoading && (
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-gray-400">
              Yükleniyor...
            </div>
          )}

          {reportError && (
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-red-400">
              {reportError}
            </div>
          )}

          {!reportLoading && reportData && (
            <>
              {/* Yüzeysel özet */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="text-gray-300 text-xs">
                    {reportEventFilter === 'ALL'
                      ? 'Toplam Katılım'
                      : `${EVENT_NAME_BY_CODE[reportEventFilter]} Katılım`}
                  </div>
                  <div className="text-white text-2xl font-bold">{reportData.totals.total_participation}</div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="text-gray-300 text-xs">
                    {reportEventFilter === 'ALL'
                      ? 'Genel Kazanma Oranı'
                      : `${EVENT_NAME_BY_CODE[reportEventFilter]} Kazanma Oranı`}
                  </div>
                  <div className="text-white text-2xl font-bold">%{reportData.totals.win_rate}</div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="text-gray-300 text-xs">
                    {reportEventFilter === 'ALL'
                      ? 'Toplam Kazanç'
                      : `${EVENT_NAME_BY_CODE[reportEventFilter]} Toplam Kazanç`}
                  </div>
                  <div className="text-green-400 text-2xl font-bold">{Number(reportData.totals.total_profit || 0).toLocaleString()}c</div>
                </div>
              </div>

              {/* Seçili etkinlik özeti (kaç Inferno kazandım / kaybettim vb.) */}
              {reportEventFilter !== 'ALL' && (
                (() => {
                  const row = (reportData.byEvent || []).find(
                    (e) => e.event_type === reportEventFilter
                  );
                  if (!row) return null;
                  return (
                    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                      <h4 className="text-white font-bold mb-2">
                        {EVENT_NAME_BY_CODE[reportEventFilter]} Özeti
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-gray-300 text-xs">Katılım</div>
                          <div className="text-white text-lg font-bold">{row.total_participation}</div>
                        </div>
                        <div>
                          <div className="text-gray-300 text-xs">Kazanılan</div>
                          <div className="text-green-400 text-lg font-bold">{row.wins}</div>
                        </div>
                        <div>
                          <div className="text-gray-300 text-xs">Kaybedilen</div>
                          <div className="text-red-400 text-lg font-bold">{row.losses}</div>
                        </div>
                        <div>
                          <div className="text-gray-300 text-xs">Kazanma Oranı</div>
                          <div className="text-white text-lg font-bold">%{Number(row.win_rate || 0).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-gray-300 text-xs">Toplam Kazanç</div>
                          <div className="text-green-400 text-lg font-bold">{Number(row.total_profit || 0).toLocaleString()}c</div>
                        </div>
                        <div>
                          <div className="text-gray-300 text-xs">Toplam Süre</div>
                          <div className="text-gray-200 text-lg font-bold">{row.total_duration_minutes} dk</div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Hedef takibi */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 className="text-white font-bold mb-2">Hedef Takibi</h4>
                {targetProfit ? (
                  (() => {
                    const target = Number(targetProfit || 0);
                    const current = Number(reportData.totals.total_profit || 0);
                    const remaining = Math.max(0, target - current);
                    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">İlerleme</span>
                          <span className="text-gray-200">%{pct}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded h-3 overflow-hidden">
                          <div className="bg-purple-600 h-3" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-gray-300 text-sm">
                          Kalan: <span className="text-white font-medium">{remaining.toLocaleString()}c</span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-gray-400 text-sm">Hedef girersen burada kalan miktarı takip edebilirsin.</p>
                )}
              </div>

              {/* Etkinlikler arası yüzdelik dilimler (Pasta) */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 className="text-white font-bold mb-3">Etkinlikler Arası Yüzdelik Dilimler (Kazanç Payı)</h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(reportData.byEvent || []).map((e) => ({
                          name: EVENT_NAME_BY_CODE[e.event_type] || e.event_name,
                          value: Number(e.total_profit || 0)
                        })).filter(d => d.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={110}
                        label
                      >
                        {(reportData.byEvent || []).map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Zirvedekiler */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 className="text-white font-bold mb-3">En Çok Kazandıran Etkinlik (Zirvedekiler)</h4>
                <div className="space-y-2">
                  {[...(reportData.byEvent || [])]
                    .sort((a, b) => Number(b.total_profit || 0) - Number(a.total_profit || 0))
                    .slice(0, 5)
                    .map((row, idx) => (
                      <div key={row.event_type} className="flex justify-between bg-gray-700 rounded p-3">
                        <div className="text-white font-medium">{idx + 1}. {EVENT_NAME_BY_CODE[row.event_type] || row.event_name}</div>
                        <div className="text-green-400 font-bold">{Number(row.total_profit || 0).toLocaleString()}c</div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Zaman = Para */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 className="text-white font-bold mb-3">Zaman/Kazanç Verimliliği (Gold Per Hour)</h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[...(reportData.byEvent || [])]
                        .map((e) => ({
                          name: (EVENT_NAME_BY_CODE[e.event_type] || e.event_name),
                          gph: e.gold_per_hour === null ? 0 : Number(e.gold_per_hour || 0),
                          minutes: Number(e.total_duration_minutes || 0)
                        }))}
                      margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fill: '#d1d5db', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#d1d5db', fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="gph" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  Not: Gold/saat hesabı, seçili aralıkta kaydettiğin etkinlik sürelerine (dakika) göre yapılır.
                </p>
              </div>

              {/* ROI */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 className="text-white font-bold mb-3">ROI (Amortisman) / Ortalama Kazanç</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-700">
                      <tr>
                        <th className="pb-2 text-gray-300 font-medium">Etkinlik</th>
                        <th className="pb-2 text-gray-300 font-medium text-right">Katılım</th>
                        <th className="pb-2 text-gray-300 font-medium text-right">Ortalama Kazanç / Run</th>
                        <th className="pb-2 text-gray-300 font-medium text-right">Gold/Saat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.byEvent || []).map((row) => (
                        <tr key={row.event_type} className="border-b border-gray-700 last:border-0">
                          <td className="py-2 text-white">{EVENT_NAME_BY_CODE[row.event_type] || row.event_name}</td>
                          <td className="py-2 text-right text-gray-300">{row.total_participation}</td>
                          <td className="py-2 text-right text-green-400 font-medium">
                            {row.avg_profit_per_run === null ? '-' : Number(row.avg_profit_per_run || 0).toLocaleString()}
                          </td>
                          <td className="py-2 text-right text-gray-200">
                            {row.gold_per_hour === null ? '-' : Number(row.gold_per_hour || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  ROI için “maliyet” verisi olmadığı için burada pratik olarak “run başına ortalama kazanç” ve “gold/saat” metriklerini raporluyoruz.
                </p>
              </div>

              {/* Gelecek ay tahminleme */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 className="text-white font-bold mb-2">Gelecek Ay Tahminleme</h4>
                {forecast ? (
                  <div className="space-y-1">
                    <div className="text-gray-300 text-sm">
                      Tahmini gelecek 30 gün toplam kazanç:
                      <span className="text-white font-bold"> {forecast.predictedNextMonthProfit.toLocaleString()}c</span>
                    </div>
                    <div className="text-gray-400 text-xs">
                      Model: Son ~60 gün günlük kazançlarına basit trend (doğrusal regresyon). Kesin sonuç değildir.
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">
                    Tahminleme için yeterli günlük veri yok (en az ~7 gün).
                  </p>
                )}
              </div>

              {/* Trend grafikleri */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h4 className="text-white font-bold mb-3">Trend Grafikleri</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="h-72">
                    <div className="text-gray-300 text-sm mb-2">Günlük Toplam Kazanç</div>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyProfitChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fill: '#d1d5db', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#d1d5db', fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="total_profit" name="Kazanç" stroke="#22c55e" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-72">
                    <div className="text-gray-300 text-sm mb-2">Günlük Win Rate</div>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyWinRateChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fill: '#d1d5db', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#d1d5db', fontSize: 11 }} domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="win_rate" name="Win Rate %" stroke="#a855f7" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Filtrelenebilir detay tablo */}
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                  <h4 className="text-white font-bold">Detaylı Rapor Listesi (Günlük / Etkinlik)</h4>
                  <input
                    className="bg-gray-700 border border-gray-600 rounded p-2 text-white w-full md:w-80"
                    placeholder="Filtrele (tarih / etkinlik)..."
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-700">
                      <tr>
                        <th className="pb-2 text-gray-300 font-medium">Tarih</th>
                        <th className="pb-2 text-gray-300 font-medium">Etkinlik</th>
                        <th className="pb-2 text-gray-300 font-medium text-right">Katılım</th>
                        <th className="pb-2 text-gray-300 font-medium text-right">W</th>
                        <th className="pb-2 text-gray-300 font-medium text-right">L</th>
                        <th className="pb-2 text-gray-300 font-medium text-right">Win %</th>
                        <th className="pb-2 text-gray-300 font-medium text-right">Kazanç</th>
                        <th className="pb-2 text-gray-300 font-medium text-right">Süre (dk)</th>
                        <th className="pb-2 text-gray-300 font-medium text-right">Gold/Saat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBreakdownTable.map((row, idx) => (
                        <tr key={`${row.date}-${row.event_type}-${idx}`} className="border-b border-gray-700 last:border-0">
                          <td className="py-2 text-gray-200">{row.date}</td>
                          <td className="py-2 text-white">{EVENT_NAME_BY_CODE[row.event_type] || row.event_name}</td>
                          <td className="py-2 text-right text-gray-300">{row.participation}</td>
                          <td className="py-2 text-right text-green-400 font-medium">{row.wins}</td>
                          <td className="py-2 text-right text-red-400 font-medium">{row.losses}</td>
                          <td className="py-2 text-right text-gray-200">%{Number(row.win_rate || 0).toLocaleString()}</td>
                          <td className="py-2 text-right text-green-400 font-bold">{Number(row.total_profit || 0).toLocaleString()}c</td>
                          <td className="py-2 text-right text-gray-300">{row.total_duration_minutes}</td>
                          <td className="py-2 text-right text-gray-200">{row.gold_per_hour === null ? '-' : Number(row.gold_per_hour || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                      {filteredBreakdownTable.length === 0 && (
                        <tr>
                          <td colSpan="9" className="py-3 text-gray-400">Kayıt bulunamadı.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Sekme bazlı planlı etkinlik sonuçları */}
      {activeTab !== "Genel" && activeEventCode && (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-3">
            {selectedDate} - {activeTab} Sonuçları
          </h3>
          {scheduleLoading && (
            <p className="text-gray-400 text-sm">Yükleniyor...</p>
          )}
          {scheduleError && (
            <p className="text-red-400 text-sm">{scheduleError}</p>
          )}
          {!scheduleLoading && !scheduleError && filteredSchedule.length === 0 && (
            <p className="text-gray-400 text-sm">
              Bu etkinlik için planlı saat bulunamadı.
            </p>
          )}
          {!scheduleLoading && filteredSchedule.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-700">
                  <tr>
                    <th className="pb-2 text-gray-300 font-medium">Saat</th>
                    <th className="pb-2 text-gray-300 font-medium text-center">
                      Kazandım
                    </th>
                    <th className="pb-2 text-gray-300 font-medium text-center">
                      Kaybettim
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedule.map((row) => {
                    const isWin = row.result === 'WIN';
                    const isLose = row.result === 'LOSE';
                    return (
                      <tr
                        key={row.schedule_id}
                        className="border-b border-gray-700 last:border-0"
                      >
                        <td className="py-2 text-gray-300">
                          {(row.time_of_day || '').slice(0, 5)}
                        </td>
                        <td className="py-2 text-center">
                          <input
                            type="checkbox"
                            className="w-5 h-5 cursor-pointer accent-green-500"
                            checked={isWin}
                            onChange={() => handleResultToggle(row, 'WIN')}
                          />
                        </td>
                        <td className="py-2 text-center">
                          <input
                            type="checkbox"
                            className="w-5 h-5 cursor-pointer accent-red-500"
                            checked={isLose}
                            onChange={() => handleResultToggle(row, 'LOSE')}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Süre Giriş Alanı - sadece belirli etkinliklerde göster */}
      {activeTab !== "Genel" && activeTab !== "Raporlar" && (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="text-gray-300 text-sm mb-1 block">{activeTab} için Etkinlik Süresi (Dakika)</label>
              <input
                type="number"
                placeholder="Dakika cinsinden süre"
                className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white"
                value={durations[activeTab] || ''}
                onChange={e => handleDurationChange(e.target.value)}
              />
            </div>
            <button
              onClick={handleSaveDuration}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-medium self-end md:self-auto"
            >
              Süreyi Kaydet
            </button>
          </div>
        </div>
      )}

      {activeTab !== "Genel" && activeTab !== "Raporlar" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {(EVENTS[activeTab] && Array.isArray(EVENTS[activeTab]) ? EVENTS[activeTab] : []).map(item => (
            <div key={item} className="bg-gray-700 p-4 rounded-lg flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <img 
                  src={getItemIcon(item)} 
                  alt={item} 
                  className="w-8 h-8 object-contain rounded bg-gray-900 p-1"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span className="text-white font-medium">{item}</span>
              </div>
              <div className="flex gap-2">
                <input type="number" placeholder="Adet" className="w-full bg-gray-900 rounded p-1 text-white" value={currentInputs[item]?.count || 0} onChange={e => setCurrentInputs({ ...currentInputs, [item]: { ...currentInputs[item], count: e.target.value } })} />
                <input type="number" placeholder="Fiyat" className="w-full bg-gray-900 rounded p-1 text-white" value={currentInputs[item]?.price || 0} onChange={e => setCurrentInputs({ ...currentInputs, [item]: { ...currentInputs[item], price: e.target.value } })} />
              </div>
              <div className="text-sm text-gray-300">
                Tutar: <span className="font-medium text-green-400">{calculateAmount(item).toLocaleString()}c</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Tek Kaydet Butonu */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveAll}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded font-medium"
        >
          Tümünü Kaydet
        </button>
      </div>

      {/* Kaydedilmiş Veriler Tablosu */}
      {savedData.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mt-6">
          <h3 className="text-lg font-bold text-white mb-4">{selectedDate} Tarihli Kayıtlar</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-700">
                <tr>
                  {activeTab === "Genel" && <th className="pb-2 text-gray-300 font-medium">Etkinlik / Sonuç</th>}
                  <th className="pb-2 text-gray-300 font-medium">İtem Adı</th>
                  <th className="pb-2 text-gray-300 font-medium text-right">Adet</th>
                  <th className="pb-2 text-gray-300 font-medium text-right">Fiyat</th>
                  <th className="pb-2 text-gray-300 font-medium text-right">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {savedData.map((item, index) => {
                  const result = eventResultsSummary[item.event];
                  return (
                  <tr key={index} className="border-b border-gray-700 last:border-0">
                    {activeTab === "Genel" && (
                      <td className="py-2 text-white">
                        <div className="text-xs font-bold">{item.event}</div>
                        {result && (result.wins > 0 || result.losses > 0) && (
                          <div className="flex gap-1.5 text-[10px] mt-0.5">
                            <span className="text-green-400 font-mono">{result.wins}W</span>
                            <span className="text-red-400 font-mono">{result.losses}L</span>
                          </div>
                        )}
                      </td>
                    )}
                    <td className="py-2 text-white">
                      <div className="flex items-center gap-2">
                        <img 
                          src={getItemIcon(item.itemName)} 
                          alt={item.itemName} 
                          className="w-6 h-6 object-contain rounded bg-gray-900 p-0.5"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        {item.itemName}
                      </div>
                    </td>
                    <td className="py-2 text-right text-gray-300">{item.count}</td>
                    <td className="py-2 text-right text-gray-300">{item.price}</td>
                    <td className="py-2 text-right text-green-400 font-medium">{item.amount.toLocaleString()}c</td>
                  </tr>
                  );
                })}
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
    </div>
  );
};

export default EventsPage;