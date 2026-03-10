import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Sayfa odağı değiştiğinde tekrar çekme
      retry: 1,                    // Hata durumunda sadece 1 kez yedeğe dök
      staleTime: 5 * 60 * 1000,    // Veri 5 dakika boyunca taze kabul edilir (arka planda yenilenmez)
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
