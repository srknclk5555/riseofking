import React from 'react';
import { ExternalLink } from 'lucide-react';

const VerticalBanner = ({ adConfig, position = 'left' }) => {
  if (!adConfig || !adConfig.isActive) return null;

  return (
    <div className={`hidden xl:block fixed top-24 bottom-4 w-28 lg:w-32 z-40 transition-all duration-300 ${position === 'left' ? 'left-4' : 'right-4'}`}>
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
