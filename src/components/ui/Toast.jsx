import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'; 

const Toast = ({ message, type = 'success', onClose }) => {
  const styles = {
    success: {
      border: 'border-l-green-500',
      text: 'text-gray-800',
      bar: 'bg-green-500',
      icon: <CheckCircle2 className="w-5 h-5 text-green-500 mr-3" />
    },
    error: {
      border: 'border-l-red-500',
      text: 'text-gray-800',
      bar: 'bg-red-500',
      icon: <X className="w-5 h-5 text-red-500 mr-3" />
    },
    info: {
      border: 'border-l-blue-500',
      text: 'text-gray-800',
      bar: 'bg-blue-500',
      icon: <Info className="w-5 h-5 text-blue-500 mr-3" />
    }
  };

  const current = styles[type] || styles.info;

  return (
    <div className={`w-80 bg-white rounded-lg shadow-lg border border-gray-200 border-l-4 ${current.border} overflow-hidden transition-all duration-300`}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center flex-1">
          {current.icon}
          <span className={`font-medium text-[13px] ${current.text}`}>{message}</span>
        </div>

        <button
          onClick={onClose}
          className="text-gray-300 hover:text-gray-500 transition ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="h-0.5 w-full bg-gray-100">
        <div className={`h-full ${current.bar} animate-progress-bar`}></div>
      </div>
    </div>
  );
};

export default Toast;