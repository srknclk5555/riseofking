import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

const TopCarouselBanner = ({ ads, interval = 4000, isActive, height = 80 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isActive || !ads || ads.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, interval);

    return () => clearInterval(timer);
  }, [isActive, ads, interval]);

  if (!isActive || !ads || ads.length === 0) return null;

  const currentAd = ads[currentIndex];

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % ads.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);

  return (
    <div 
      className="w-full bg-gray-950 border-b border-gray-800 relative group overflow-hidden"
      style={{ height: `${height}px` }}
    >
      <div className="h-full flex items-center justify-center">
        <a 
          href={currentAd.link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="h-full w-full flex items-center justify-center overflow-hidden"
        >
          <img 
            src={currentAd.image} 
            alt="Ad" 
            className="h-full w-full object-contain transition-opacity duration-700 ease-in-out"
          />
        </a>
      </div>

      {/* Navigation Buttons - Only show if more than 1 ad and hovered */}
      {ads.length > 1 && (
        <>
          <button 
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight size={20} />
          </button>
          
          {/* Indicators */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {ads.map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? 'bg-yellow-500 w-3' : 'bg-gray-600'}`}
              />
            ))}
          </div>
        </>
      )}

      <div className="absolute top-1 right-3 text-[9px] text-gray-400 font-bold uppercase tracking-tighter pointer-events-none opacity-50">
        Sponsorlu <ExternalLink size={8} className="inline ml-1" />
      </div>
    </div>
  );
};

export default TopCarouselBanner;
