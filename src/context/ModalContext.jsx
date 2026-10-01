import React, { createContext, useState, useContext, useRef } from 'react';
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
  // onCancel (opcional) se llama al cerrar sin confirmar.
  const confirmadoRef = useRef(false);

  const confirmAction = (title, message, onConfirm, options = {}) => {
    // Acepta options como objeto o cadenas simples para no romper llamadas anteriores
    const confirmText = typeof options === 'string' ? options : (options.confirmText || 'Confirmar');
    const type = options.type || 'primary';
    const cancelText = options.cancelText || 'Cancelar';
    const onCancel = options.onCancel || null;

    confirmadoRef.current = false;
    setModal({ 
      isOpen: true, 
      title, 
      message, 
      onConfirm, 
      onCancel,
      confirmText, 
      cancelText,
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
        onConfirm={() => { confirmadoRef.current = true; modal.onConfirm?.(); }}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        type={modal.type}
        onClose={() => {
          if (!confirmadoRef.current) modal.onCancel?.();
          confirmadoRef.current = false;
          setModal({ ...modal, isOpen: false });
        }}
      />
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);