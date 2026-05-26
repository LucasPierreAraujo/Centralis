"use client"
import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// Context para gerenciar o dialog de confirmação
const ConfirmDialogContext = createContext();

// Provider que envolve a aplicação
export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback(({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'danger' }) => {
    return new Promise((resolve) => {
      setDialog({
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: () => {
          setDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setDialog(null);
          resolve(false);
        }
      });
    });
  }, []);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {dialog && <ConfirmDialog dialog={dialog} />}
    </ConfirmDialogContext.Provider>
  );
}

// Hook para usar o dialog de confirmação
export function useConfirm() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmDialogProvider');
  }
  return context;
}

// Componente do Dialog
function ConfirmDialog({ dialog }) {
  const { title, message, confirmText, cancelText, type, onConfirm, onCancel } = dialog;

  // Configurações por tipo
  const typeConfig = {
    danger: {
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonBg: 'bg-red-600 hover:bg-red-700',
      borderColor: 'border-red-500'
    },
    warning: {
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
      borderColor: 'border-yellow-500'
    },
    info: {
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      borderColor: 'border-blue-500'
    }
  };

  const config = typeConfig[type] || typeConfig.danger;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-scale-in">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b-2 ${config.borderColor}`}>
          <div className="flex items-center gap-3">
            <div className={`${config.iconBg} p-2 rounded-full`}>
              <AlertTriangle size={24} className={config.iconColor} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700 text-base leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 bg-gray-50 rounded-b-lg">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 ${config.buttonBg} text-white font-semibold rounded-lg transition`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Adicionar animação
const styles = `
@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-scale-in {
  animation: scaleIn 0.2s ease-out;
}
`;

// Injetar estilo no head (apenas uma vez)
if (typeof document !== 'undefined') {
  const styleId = 'confirm-dialog-animations';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}
