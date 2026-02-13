import React from 'react';
import { AlertCircle } from 'lucide-react';

const ConfirmModal = ({ isOpen, message, onConfirm, onCancel, confirmText = "Onayla" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
      <div className="bg-gray-800 p-6 rounded-xl border border-red-500 max-w-sm w-full shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <AlertCircle size={24} className="text-red-400" />
          <h4 className="text-lg font-bold text-white">Onay Gerekiyor</h4>
        </div>
        <p className="text-gray-300">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel} 
            className="px-4 py-2 text-sm rounded bg-gray-600 hover:bg-gray-500 text-white"
          >
            İptal
          </button>
          <button 
            onClick={onConfirm} 
            className="px-4 py-2 text-sm rounded bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;