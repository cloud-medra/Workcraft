import React, { createContext, useState, useContext } from 'react';
import ModalConfirm from '../components/ui/ModalConfirm';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    onConfirm: null,
    confirmText: 'Confirmar',
    type: 'primary'
  });

  const confirmAction = (title, message, onConfirm, options = {}) => {
    // Acepta options como objeto o cadenas simples para no romper llamadas anteriores
    const confirmText = typeof options === 'string' ? options : (options.confirmText || 'Confirmar');
    const type = options.type || 'primary';

    setModal({ 
      isOpen: true, 
      title, 
      message, 
      onConfirm, 
      confirmText, 
      type 
    });
  };

  return (
    <ModalContext.Provider value={{ confirmAction }}>
      {children}
      <ModalConfirm
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        confirmText={modal.confirmText}
        type={modal.type}
        onClose={() => setModal({ ...modal, isOpen: false })}
      />
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);