import React, { createContext, useState, useContext } from 'react';
import ModalConfirm from '../components/ui/ModalConfirm';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const confirmAction = (title, message, onConfirm) => {
    setModal({ isOpen: true, title, message, onConfirm });
  };

  return (
    <ModalContext.Provider value={{ confirmAction }}>
      {children}
      <ModalConfirm
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onClose={() => setModal({ ...modal, isOpen: false })}
      />
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);