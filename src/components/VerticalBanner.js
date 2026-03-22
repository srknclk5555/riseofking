import React, { useState } from 'react';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

const VerticalBanner = ({ adConfig, position = 'left' }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!adConfig || !adConfig.isActive) return null;

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const getContainerStyle = () => {
    let style = "hidden xl:block fixed top-24 bottom-4 w-28 lg:w-32 z-40 transition-all duration-500 ease-in-out ";
    if (position === 'left') {
      style += isCollapsed ? "-left-28 lg:-left-32" : "left-4";
    } else {
      style += isCollapsed ? "-right-28 lg:-right-32" : "right-4";
    }
    return style;
  };

  return (
    <div className={getContainerStyle()}>
      <button 
        onClick={toggleCollapse}
        className={`absolute top-1/2 -translate-y-1/2 bg-gray-800 border border-gray-600 text-gray-400 hover:text-white p-1 rounded-full z-50 shadow-lg transition-colors hover:bg-gray-700 ${position === 'left' ? '-right-3 lg:-right-4' : '-left-3 lg:-left-4'}`}
        title={isCollapsed ? "Reklamı Göster" : "Reklamı Gizle"}
      >
        {position === 'left' ? (isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />) : (isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />)}
      </button>

      <div className="h-full bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden group hover:border-yellow-500/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.1)] transition-all">
        <a 
          href={adConfig.link}
          target="_blank" 
          rel="noopener noreferrer"
          className="h-full w-full block relative"
        >
          <img 
            src={adConfig.image} 
            alt={`Ad ${position}`} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <span className="text-[10px] text-white font-bold flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
               {position === 'left' ? 'SPONSOR' : 'AD'} <ExternalLink size={10} />
            </span>
          </div>
        </a>
      </div>
    </div>
  );
};

export default VerticalBanner;
