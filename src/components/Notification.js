import React from 'react';
import { XCircle, CheckCircle } from 'lucide-react';

const Notification = ({ message, type, onClose }) => {
  if (!message) return null;
  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${type === 'error' ? 'bg-red-900/90 text-white border border-red-500' : 'bg-green-900/90 text-white border border-green-500'}`}>
      {type === 'error' ? <XCircle size={20} className="text-red-400" /> : <CheckCircle size={20} className="text-green-400" />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <XCircle size={16} />
      </button>
    </div>
  );
};

export default Notification;