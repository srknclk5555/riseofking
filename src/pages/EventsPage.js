import React, { useState, useEffect, useMemo } from 'react';
import { EVENTS } from '../constants';
import { eventService } from '../services/api';

const EventsPage = ({ userData, selectedDate, prices, uid }) => {
  const [activeTab, setActiveTab] = useState("Genel");
  const [currentInputs, setCurrentInputs] = useState({});
  const [durations, setDurations] = useState({}); // Her etkinlik için süre takibi
  const [eventLogs, setEventLogs] = useState([]);

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

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-700 overflow-x-auto pb-2">
<button onClick={() => setActiveTab("Genel")} className={`px-4 py-2 whitespace-nowrap ${activeTab === "Genel" ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400'}`}>Genel</button>
        {Object.keys(EVENTS).map(e => <button key={e} onClick={() => setActiveTab(e)} className={`px-4 py-2 whitespace-nowrap ${activeTab === e ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400'}`}>{e}</button>)}
      </div>

      {/* Süre Giriş Alanı - sadece belirli etkinliklerde göster */}
      {activeTab !== "Genel" && (
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

      {activeTab !== "Genel" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {(EVENTS[activeTab] && Array.isArray(EVENTS[activeTab]) ? EVENTS[activeTab] : []).map(item => (
            <div key={item} className="bg-gray-700 p-4 rounded-lg flex flex-col gap-2">
              <span className="text-white font-medium">{item}</span>
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
                    <td className="py-2 text-white">{item.itemName}</td>
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
    </div>
  );
};

export default EventsPage;