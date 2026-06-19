import React from 'react';
import { useDropzone } from 'react-dropzone';
import { X, FileText } from 'lucide-react';

const ModalImportar = ({ isOpen, onClose, onDrop }) => {
  const handleDrop = async (files) => {
    const success = await onDrop(files);
    if (success) onClose();
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.csv'] },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-gray-700">Importar Excel</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer">
          <input {...getInputProps()} />
          <FileText size={40} className="mx-auto text-gray-400 mb-4" />
          <p className="text-[13px] text-gray-500">Arrastra tu archivo aquí o haz clic</p>
        </div>
      </div>
    </div>
  );
};

export default ModalImportar;