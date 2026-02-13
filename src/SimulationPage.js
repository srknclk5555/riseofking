import React, { useState } from 'react';

const SimulationPage = ({ userData, uid }) => {
  // Karakter sınıfı seçimi
  const [selectedClass, setSelectedClass] = useState('warrior');
  const [characterName, setCharacterName] = useState('');
  const [level, setLevel] = useState(1);
  
  // Karakter sınıfları
  const characterClasses = [
    { id: 'warrior', name: 'Warrior', icon: '⚔️' },
    { id: 'rogue', name: 'Rogue', icon: '🗡️' },
    { id: 'mage', name: 'Mage', icon: '🔮' },
    { id: 'priest', name: 'Priest', icon: '☥' }
  ];

  // Karakter sınıfına göre tema rengi
  const getClassTheme = (classId) => {
    switch(classId) {
      case 'warrior': return 'from-red-700 to-red-900 border-red-500';
      case 'rogue': return 'from-green-700 to-green-900 border-green-500';
      case 'mage': return 'from-blue-700 to-blue-900 border-blue-500';
      case 'priest': return 'from-purple-700 to-purple-900 border-purple-500';
      default: return 'from-gray-700 to-gray-900 border-gray-500';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-white mb-6">Karakter Simülasyonu</h1>
      
      <div className="flex gap-6">
        {/* Sol Panel - Karakter Bilgileri ve Kontroller */}
        <div className="w-1/3 bg-gray-800 rounded-lg p-4">
          {/* Karakter Seçimi */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-yellow-500 mb-3">Karakter Oluşturma</h2>
            
            {/* Sınıf Seçimi */}
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Karakter Sınıfı</label>
              <div className="grid grid-cols-2 gap-2">
                {characterClasses.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClass(cls.id)}
                    className={`p-3 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${
                      selectedClass === cls.id 
                        ? `bg-gradient-to-b ${getClassTheme(cls.id)} text-white shadow-lg` 
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="text-xl mb-1">{cls.icon}</div>
                    <div className="text-sm font-medium">{cls.name}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Karakter Adı */}
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Karakter Adı</label>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Karakter adı girin"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              />
            </div>
            
            {/* Level Seçimi */}
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Level: {level}</label>
              <input
                type="range"
                min="1"
                max="100"
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1</span>
                <span>100</span>
              </div>
            </div>
          </div>
          
          {/* Karakter Bilgileri */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-3">Karakter Bilgileri</h3>
            
            {/* Ana Statler */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Strength (STR)</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-sm">10</span>
                  <div className="w-20 h-2 bg-gray-700 rounded-full">
                    <div className="h-full bg-red-500 rounded-full animate-pulse" style={{width: '20%'}}></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Dexterity (DEX)</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-sm">10</span>
                  <div className="w-20 h-2 bg-gray-700 rounded-full">
                    <div className="h-full bg-green-500 rounded-full animate-pulse" style={{width: '20%'}}></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Intelligence (INT)</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-sm">10</span>
                  <div className="w-20 h-2 bg-gray-700 rounded-full">
                    <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{width: '20%'}}></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Health (HP)</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-sm">100</span>
                  <div className="w-20 h-2 bg-gray-700 rounded-full">
                    <div className="h-full bg-red-600 rounded-full animate-pulse" style={{width: '50%'}}></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Magic (MP)</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-sm">50</span>
                  <div className="w-20 h-2 bg-gray-700 rounded-full">
                    <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{width: '30%'}}></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Combat Stats */}
            <div className="border-t border-gray-700 pt-3">
              <h4 className="text-sm font-bold text-yellow-500 mb-2">Combat Stats</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">Physical Attack</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono text-sm">0</span>
                    <div className="w-16 h-2 bg-gray-700 rounded-full">
                      <div className="h-full bg-orange-500 rounded-full animate-pulse" style={{width: '0%'}}></div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">Physical Defense</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono text-sm">0</span>
                    <div className="w-16 h-2 bg-gray-700 rounded-full">
                      <div className="h-full bg-gray-400 rounded-full animate-pulse" style={{width: '0%'}}></div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">Magic Resistance</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono text-sm">0</span>
                    <div className="w-16 h-2 bg-gray-700 rounded-full">
                      <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{width: '0%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sınıf Bilgisi */}
            <div className="border-t border-gray-700 pt-3 mt-3">
              <h4 className="text-sm font-bold text-yellow-500 mb-2">Sınıf</h4>
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 bg-gradient-to-b ${getClassTheme(selectedClass)} rounded-lg flex items-center justify-center border-2 ${getClassTheme(selectedClass).split(' ')[2]} shadow-md`}>
                  <span className="text-white font-bold text-lg">{selectedClass.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-white font-medium">{characterClasses.find(cls => cls.id === selectedClass)?.name || 'Warrior'}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sağ Panel - Ekipman ve Envanter */}
        <div className="flex-1 bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-bold text-yellow-500 mb-4">Ekipman & Envanter</h2>
          
          {/* Giyilen Ekipmanlar */}
          <div className="mb-6">
            <h3 className="text-md font-bold text-white mb-3">Giyilen Ekipmanlar</h3>
            
            <div className="flex gap-6">
              {/* Zırh Slotları - Dikey Düzen */}
              <div className="flex flex-col gap-3 mb-4 w-40">
                {/* Helmet */}
                <div className="relative bg-gradient-to-b from-gray-700 to-gray-900 border-2 border-gray-600 rounded-lg h-20 flex flex-col items-center justify-center p-2 hover:border-yellow-500 transition-all duration-200 cursor-pointer shadow-lg">
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-gray-800 text-white text-xs font-bold z-10">1</div>
                  <div className="w-10 h-10 bg-gradient-to-b from-gray-600 to-gray-800 border border-gray-500 rounded flex items-center justify-center mb-1 shadow-inner">
                    <span className="text-gray-300 text-lg font-bold">⚔</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-yellow-400 text-xs font-bold text-center mb-0.5">HEAD</span>
                    <span className="text-gray-300 text-[9px] text-center uppercase tracking-wider">Helmet</span>
                  </div>
                </div>
                
                {/* Chestplate */}
                <div className="relative bg-gradient-to-b from-gray-700 to-gray-900 border-2 border-gray-600 rounded-lg h-20 flex flex-col items-center justify-center p-2 hover:border-yellow-500 transition-all duration-200 cursor-pointer shadow-lg">
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-gray-800 text-white text-xs font-bold z-10">2</div>
                  <div className="w-10 h-10 bg-gradient-to-b from-gray-600 to-gray-800 border border-gray-500 rounded flex items-center justify-center mb-1 shadow-inner">
                    <span className="text-gray-300 text-lg font-bold">⛨</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-yellow-400 text-xs font-bold text-center mb-0.5">CHEST</span>
                    <span className="text-gray-300 text-[9px] text-center uppercase tracking-wider">Chest</span>
                  </div>
                </div>
                
                {/* Gauntlets */}
                <div className="relative bg-gradient-to-b from-gray-700 to-gray-900 border-2 border-gray-600 rounded-lg h-20 flex flex-col items-center justify-center p-2 hover:border-yellow-500 transition-all duration-200 cursor-pointer shadow-lg">
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-gray-800 text-white text-xs font-bold z-10">3</div>
                  <div className="w-10 h-10 bg-gradient-to-b from-gray-600 to-gray-800 border border-gray-500 rounded flex items-center justify-center mb-1 shadow-inner">
                    <span className="text-gray-300 text-lg font-bold">✋</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-yellow-400 text-xs font-bold text-center mb-0.5">HAND</span>
                    <span className="text-gray-300 text-[9px] text-center uppercase tracking-wider">Gloves</span>
                  </div>
                </div>
                
                {/* Tasset */}
                <div className="relative bg-gradient-to-b from-gray-700 to-gray-900 border-2 border-gray-600 rounded-lg h-20 flex flex-col items-center justify-center p-2 hover:border-yellow-500 transition-all duration-200 cursor-pointer shadow-lg">
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-gray-800 text-white text-xs font-bold z-10">4</div>
                  <div className="w-10 h-10 bg-gradient-to-b from-gray-600 to-gray-800 border border-gray-500 rounded flex items-center justify-center mb-1 shadow-inner">
                    <span className="text-gray-300 text-lg font-bold">🦵</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-yellow-400 text-xs font-bold text-center mb-0.5">LEGS</span>
                    <span className="text-gray-300 text-[9px] text-center uppercase tracking-wider">Legs</span>
                  </div>
                </div>
                
                {/* Boots */}
                <div className="relative bg-gradient-to-b from-gray-700 to-gray-900 border-2 border-gray-600 rounded-lg h-20 flex flex-col items-center justify-center p-2 hover:border-yellow-500 transition-all duration-200 cursor-pointer shadow-lg">
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-gray-800 text-white text-xs font-bold z-10">5</div>
                  <div className="w-10 h-10 bg-gradient-to-b from-gray-600 to-gray-800 border border-gray-500 rounded flex items-center justify-center mb-1 shadow-inner">
                    <span className="text-gray-300 text-lg font-bold">👢</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-yellow-400 text-xs font-bold text-center mb-0.5">FEET</span>
                    <span className="text-gray-300 text-[9px] text-center uppercase tracking-wider">Boots</span>
                  </div>
                </div>
              </div>
              
              {/* Takı Slotları - Yeni Düzen */}
              <div className="flex flex-col gap-3 mb-4 w-40">
                <div className="grid grid-cols-2 gap-3">
                  {/* Üst sıradaki 2 küpe slotu */}
                  <div className="relative bg-gradient-to-b from-yellow-800 to-yellow-900 border-2 border-yellow-700 rounded-lg h-14 flex flex-col items-center justify-center p-1 hover:border-yellow-400 transition-all duration-200 cursor-pointer shadow-md">
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border border-gray-800 text-white text-[8px] font-bold z-10">6</div>
                    <div className="w-7 h-7 bg-gradient-to-b from-yellow-600 to-yellow-800 border border-yellow-600 rounded-full flex items-center justify-center mb-1 shadow-inner">
                      <span className="text-yellow-300 text-sm font-bold">♪</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-yellow-200 text-[8px] font-bold text-center uppercase tracking-wider">EAR</span>
                      <span className="text-yellow-100 text-[7px] text-center">Earring</span>
                    </div>
                  </div>
                  
                  <div className="relative bg-gradient-to-b from-yellow-800 to-yellow-900 border-2 border-yellow-700 rounded-lg h-14 flex flex-col items-center justify-center p-1 hover:border-yellow-400 transition-all duration-200 cursor-pointer shadow-md">
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border border-gray-800 text-white text-[8px] font-bold z-10">7</div>
                    <div className="w-7 h-7 bg-gradient-to-b from-yellow-600 to-yellow-800 border border-yellow-600 rounded-full flex items-center justify-center mb-1 shadow-inner">
                      <span className="text-yellow-300 text-sm font-bold">♪</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-yellow-200 text-[8px] font-bold text-center uppercase tracking-wider">EAR</span>
                      <span className="text-yellow-100 text-[7px] text-center">Earring</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Sağdaki küpe slotunun (7 numaralı) altında relic slotu */}
                  <div className="relative bg-gradient-to-b from-yellow-800 to-yellow-900 border-2 border-yellow-700 rounded-lg h-14 flex flex-col items-center justify-center p-1 hover:border-yellow-400 transition-all duration-200 cursor-pointer shadow-md">
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border border-gray-800 text-white text-[8px] font-bold z-10">12</div>
                    <div className="w-7 h-7 bg-gradient-to-b from-purple-600 to-purple-800 border border-purple-600 rounded-full flex items-center justify-center mb-1 shadow-inner">
                      <span className="text-purple-300 text-sm font-bold">✧</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-purple-200 text-[8px] font-bold text-center uppercase tracking-wider">RELIC</span>
                      <span className="text-purple-100 text-[7px] text-center">Relic</span>
                    </div>
                  </div>
                  
                  {/* Soldaki küpe slotunun (6 numaralı) altında kolye slotu */}
                  <div className="relative bg-gradient-to-b from-yellow-800 to-yellow-900 border-2 border-yellow-700 rounded-lg h-14 flex flex-col items-center justify-center p-1 hover:border-yellow-400 transition-all duration-200 cursor-pointer shadow-md">
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border border-gray-800 text-white text-[8px] font-bold z-10">8</div>
                    <div className="w-7 h-7 bg-gradient-to-b from-yellow-600 to-yellow-800 border border-yellow-600 rounded-full flex items-center justify-center mb-1 shadow-inner">
                      <span className="text-yellow-300 text-sm font-bold">◈</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-yellow-200 text-[8px] font-bold text-center uppercase tracking-wider">NECK</span>
                      <span className="text-yellow-100 text-[7px] text-center">Necklace</span>
                    </div>
                  </div>
                </div>
                
                {/* Kolye slotunun altında belt slotu */}
                <div className="relative bg-gradient-to-b from-yellow-800 to-yellow-900 border-2 border-yellow-700 rounded-lg h-14 flex flex-col items-center justify-center p-1 hover:border-yellow-400 transition-all duration-200 cursor-pointer shadow-md">
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border border-gray-800 text-white text-[8px] font-bold z-10">9</div>
                  <div className="w-7 h-7 bg-gradient-to-b from-yellow-600 to-yellow-800 border border-yellow-600 rounded-full flex items-center justify-center mb-1 shadow-inner">
                    <span className="text-yellow-300 text-sm font-bold">●</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-yellow-200 text-[8px] font-bold text-center uppercase tracking-wider">BELT</span>
                    <span className="text-yellow-100 text-[7px] text-center">Belt</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Belt slotunun altında 2 tane yüzük slotu */}
                  <div className="relative bg-gradient-to-b from-yellow-800 to-yellow-900 border-2 border-yellow-700 rounded-lg h-14 flex flex-col items-center justify-center p-1 hover:border-yellow-400 transition-all duration-200 cursor-pointer shadow-md">
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border border-gray-800 text-white text-[8px] font-bold z-10">10</div>
                    <div className="w-7 h-7 bg-gradient-to-b from-yellow-600 to-yellow-800 border border-yellow-600 rounded-full flex items-center justify-center mb-1 shadow-inner">
                      <span className="text-yellow-300 text-sm font-bold">○</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-yellow-200 text-[8px] font-bold text-center uppercase tracking-wider">RING</span>
                      <span className="text-yellow-100 text-[7px] text-center">Ring</span>
                    </div>
                  </div>
                  
                  <div className="relative bg-gradient-to-b from-yellow-800 to-yellow-900 border-2 border-yellow-700 rounded-lg h-14 flex flex-col items-center justify-center p-1 hover:border-yellow-400 transition-all duration-200 cursor-pointer shadow-md">
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border border-gray-800 text-white text-[8px] font-bold z-10">11</div>
                    <div className="w-7 h-7 bg-gradient-to-b from-yellow-600 to-yellow-800 border border-yellow-600 rounded-full flex items-center justify-center mb-1 shadow-inner">
                      <span className="text-yellow-300 text-sm font-bold">○</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-yellow-200 text-[8px] font-bold text-center uppercase tracking-wider">RING</span>
                      <span className="text-yellow-100 text-[7px] text-center">Ring</span>
                    </div>
                  </div>
                </div>
                
                {/* Sağdaki yüzük slotunun altında 1 tane anklet slotu */}
                <div className="relative bg-gradient-to-b from-purple-800 to-purple-900 border-2 border-purple-700 rounded-lg h-14 flex flex-col items-center justify-center p-1 hover:border-purple-400 transition-all duration-200 cursor-pointer shadow-md">
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border border-gray-800 text-white text-[8px] font-bold z-10">13</div>
                  <div className="w-7 h-7 bg-gradient-to-b from-purple-600 to-purple-800 border border-purple-600 rounded-full flex items-center justify-center mb-1 shadow-inner">
                    <span className="text-purple-300 text-sm font-bold">✿</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-purple-200 text-[8px] font-bold text-center uppercase tracking-wider">ANKLE</span>
                    <span className="text-purple-100 text-[7px] text-center">Anklet</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
            
            {/* Silah Slotları */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative bg-gradient-to-b from-red-800 to-red-900 border-2 border-red-700 rounded-lg h-24 flex flex-col items-center justify-center p-2 hover:border-red-400 transition-all duration-200 cursor-pointer shadow-lg">
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-gray-800 text-white text-xs font-bold z-10">14</div>
                <div className="w-12 h-12 bg-gradient-to-b from-red-700 to-red-900 border border-red-600 rounded flex items-center justify-center mb-2 shadow-inner">
                  <span className="text-red-300 text-xl font-bold">⚔</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-red-200 text-xs font-bold text-center mb-0.5">MAIN HAND</span>
                  <span className="text-red-100 text-[9px] text-center uppercase tracking-wider">Weapon</span>
                </div>
              </div>
              
              <div className="relative bg-gradient-to-b from-blue-800 to-blue-900 border-2 border-blue-700 rounded-lg h-24 flex flex-col items-center justify-center p-2 hover:border-blue-400 transition-all duration-200 cursor-pointer shadow-lg">
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-gray-800 text-white text-xs font-bold z-10">15</div>
                <div className="w-12 h-12 bg-gradient-to-b from-blue-700 to-blue-900 border border-blue-600 rounded flex items-center justify-center mb-2 shadow-inner">
                  <span className="text-blue-300 text-xl font-bold">🛡</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-blue-200 text-xs font-bold text-center mb-0.5">OFF HAND</span>
                  <span className="text-blue-100 text-[9px] text-center uppercase tracking-wider">Shield</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Envanter */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-md font-bold text-white">Envanter (4x8)</h3>
              <div className="flex gap-2">
                <button className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded border border-gray-600 transition-colors">
                  Sırala
                </button>
                <button className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded border border-gray-600 transition-colors">
                  Filtrele
                </button>
              </div>
            </div>
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-4 border-2 border-gray-700 shadow-inner">
              <div className="grid grid-cols-8 gap-2 mb-3">
                {Array.from({ length: 32 }).map((_, index) => (
                  <div 
                    key={index}
                    className="relative bg-gradient-to-b from-gray-700 to-gray-800 border-2 border-gray-600 rounded h-14 flex flex-col items-center justify-center hover:border-yellow-500 transition-all duration-200 cursor-pointer shadow-md group"
                  >
                    {/* Rare item glow effect (hidden by default, shown on hover for rare items) */}
                    <div className="absolute inset-0 rounded bg-gradient-to-b from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    
                    {/* Item icon placeholder with quality indicator */}
                    <div className="relative z-10 flex items-center justify-center w-8 h-8 mb-1">
                      <div className="w-8 h-8 bg-gradient-to-b from-gray-600 to-gray-700 border border-gray-500 rounded flex items-center justify-center shadow-inner">
                        <span className="text-gray-400 text-lg font-bold">?</span>
                      </div>
                      {/* Quality indicator dot */}
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-500 rounded-full border border-gray-800"></div>
                    </div>
                    
                    {/* Item name placeholder */}
                    <span className="text-[9px] text-gray-400 font-medium text-center px-1 truncate w-full">Boş Slot</span>
                    
                    {/* Slot number */}
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] text-gray-500">{index + 1}</span>
                  </div>
                ))}
              </div>
              
              {/* Envanter bilgileri */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gradient-to-b from-green-500 to-green-700 rounded-sm border border-green-400"></div>
                    <span className="text-xs text-gray-300">0/32</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gradient-to-b from-blue-500 to-blue-700 rounded-sm border border-blue-400"></div>
                    <span className="text-xs text-gray-300">0/100</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded border border-gray-600 transition-colors">
                    Depo
                  </button>
                  <button className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded border border-gray-600 transition-colors">
                    Sat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default SimulationPage;