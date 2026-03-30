import React, { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

const ManualBanner = ({ adConfig, onClose, isAllowed = true }) => {
  useEffect(() => {
    if (isAllowed && adConfig && adConfig.isActive && adConfig.type === 'adsense') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("AdSense error (Manual):", e);
      }
    }
  }, [adConfig, isAllowed]);

  if (!adConfig || !adConfig.isActive) return null;

  return (
    <div className="mt-4 px-2">
      <div className="relative group bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden transition-all duration-300 hover:border-yellow-500/50 hover:shadow-[0_0_20px_rgba(234,179,8,0.1)]">
        {adConfig.type === 'adsense' ? (
          <div className="w-full min-h-[100px] flex items-center justify-center bg-gray-900/30">
            {adConfig.html ? (
              <div 
                className="w-full"
                dangerouslySetInnerHTML={{ __html: adConfig.html }}
              />
            ) : (
              <ins className="adsbygoogle"
                   style={{ display: 'block' }}
                   data-ad-client={adConfig.client || "ca-pub-4814303511298138"}
                   data-ad-slot={adConfig.slot}
                   data-ad-format="rectangle"
                   data-full-width-responsive="true"></ins>
            )}
          </div>
        ) : (
          /* Banner Link */
          <a 
            href={adConfig.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
          >
            <div className="relative aspect-video lg:aspect-square w-full">
              <img 
                src={adConfig.image} 
                alt="Advertisement" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                <span className="text-white text-xs font-bold flex items-center gap-1">
                  Sponsorlu <ExternalLink size={12} />
                </span>
              </div>
            </div>
          </a>
        )}

        {/* Close Button (Optional - hides for current session if you implement state) */}
        {onClose && (
          <button 
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white/70 hover:text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <p className="text-[10px] text-gray-500 mt-1 text-center italic">Reklam</p>
    </div>
  );
};

export default ManualBanner;
