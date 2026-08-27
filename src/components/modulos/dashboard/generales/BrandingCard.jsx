import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import logoMedra from '../../../../assets/logo_medra_login/android-chrome-192x192.png';

const BrandingCard = () => {
  return (
    <div className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent border border-blue-100/60 dark:border-blue-900/30 rounded-lg p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
        <img
          src={logoMedra}
          alt="Medra Cloud Logo"
          className="w-7 h-7 object-contain"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="w-full h-full items-center justify-center text-[#2383C2] hidden">
          <ImageIcon size={18} />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Desarrollado por:</span>
        <h3 className="text-[13px] font-extrabold text-gray-800 dark:text-gray-100 tracking-wide">
          MEDRA CLOUD
        </h3>
      </div>
    </div>
  );
};

export default BrandingCard;