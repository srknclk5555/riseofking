import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDate } from '../utils/helpers';

const DashboardPage = ({ userData, selectedDate, farms, user }) => {
  const dailyFarmEarnings = useMemo(() => {
    if (!user) return 0;
    let total = 0;
    farms.forEach(f => {
      if (f.date === selectedDate) {
        if (f.type === "SOLO") {
          f.items?.forEach(i => total += (parseFloat(i.soldPrice) || 0) * parseInt(i.count || 0));
        } else if (f.type === "PARTY") {
          if (Array.isArray(f.participants)) {
            const soldTotal = f.items?.reduce((acc, item) => acc + (parseFloat(item.realPrice || 0) * parseInt(item.soldCount || 0)), 0) || 0;
            total += (soldTotal / f.participants.length);
          } else {
            total += parseFloat((f.shares && f.shares[user.uid]) || 0);
          }
        }
      }
    });
    return total;
  }, [farms, selectedDate, user]);

  const dailyGatheringEarnings = useMemo(() => {
    let total = 0;
    const logs = userData?.logs?.[selectedDate]?.gathering || {};
    Object.keys(logs).forEach(prof => Object.keys(logs[prof]).forEach(item => total += (logs[prof][item].count || 0) * (logs[prof][item].price || 0)));
    return total;
  }, [userData, selectedDate]);

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      data.push({ name: formatDate(d).split('-')[2], Farm: Math.random() * 5000, Gathering: Math.random() * 2000 });
    }
    return data;
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Genel Bakış ({selectedDate})</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm">Toplam Kazanç</p>
          <h3 className="text-2xl font-bold text-green-400">{(dailyFarmEarnings + dailyGatheringEarnings).toLocaleString()} c</h3>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm">Farm</p>
          <h3 className="text-2xl font-bold text-blue-400">{dailyFarmEarnings.toLocaleString()} c</h3>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm">Gathering</p>
          <h3 className="text-2xl font-bold text-yellow-400">{dailyGatheringEarnings.toLocaleString()} c</h3>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <p className="text-gray-400 text-sm">Süre</p>
          <h3 className="text-2xl font-bold text-purple-400">00:00</h3>
        </div>
      </div>
      <div className="h-64 bg-gray-800 p-4 rounded-xl">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip contentStyle={{ backgroundColor: '#1F2937' }} />
            <Legend />
            <Bar dataKey="Farm" fill="#3B82F6" />
            <Bar dataKey="Gathering" fill="#EAB308" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardPage;