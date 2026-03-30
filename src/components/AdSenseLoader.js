import { useEffect } from 'react';

const AdSenseLoader = ({ isAllowed }) => {
  useEffect(() => {
    if (!isAllowed) return;

    // Script zaten varsa tekrar ekleme
    const existingScript = document.querySelector('script[src*="adsbygoogle.js"]');
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4814303511298138";
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);

    return () => {
      // Bileşen unmount olduğunda script'i kaldırmıyoruz çünkü AdSense genellikle bir kez yüklenir
      // Ancak reklamların gösterimini bileşen bazlı (Banner bileşenleri) durduracağız.
    };
  }, [isAllowed]);

  return null;
};

export default AdSenseLoader;
