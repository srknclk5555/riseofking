import React from 'react';
import { XCircle, CheckCircle, AlertCircle, Mail, X } from 'lucide-react';

const Notification = ({ message, type, onClose }) => {
  if (!message) return null;

  const getStyles = () => {
    switch (type) {
      case 'error': return 'bg-red-900/90 text-white border-red-500';
      case 'warning': return 'bg-yellow-900/90 text-white border-yellow-500';
      case 'info': return 'bg-blue-900/90 text-white border-blue-500';
      default: return 'bg-green-900/90 text-white border-green-500';
    }
  };

  const Icon = () => {
    switch (type) {
      case 'error': return <XCircle size={20} className="text-red-400" />;
      case 'warning': return <AlertCircle size={20} className="text-yellow-400" />;
      case 'info': return <Mail size={20} className="text-blue-400" />;
      default: return <CheckCircle size={20} className="text-green-400" />;
    }
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 border ${getStyles()}`}>
      <Icon />
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
        <X size={16} />
      </button>
    </div>
  );
};

export default Notification;