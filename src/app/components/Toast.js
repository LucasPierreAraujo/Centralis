"use client"
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// Context para gerenciar toasts globalmente
const ToastContext = createContext();

// Provider que envolve a aplicação
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };

    setToasts(prev => [...prev, toast]);

    // Auto-dismiss após duração especificada
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
  const warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast]);
  const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// Hook para usar toast em qualquer componente
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// Container que renderiza os toasts
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-md">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

// Componente individual de Toast
function Toast({ toast, onClose }) {
  const { type, message } = toast;

  // Configurações por tipo
  const config = {
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      textColor: 'text-green-800',
      icon: <CheckCircle size={20} className="text-green-600" />
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      textColor: 'text-red-800',
      icon: <XCircle size={20} className="text-red-600" />
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-800',
      icon: <AlertCircle size={20} className="text-yellow-600" />
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-800',
      icon: <Info size={20} className="text-blue-600" />
    }
  };

  const { bgColor, borderColor, textColor, icon } = config[type] || config.info;

  return (
    <div
      className={`${bgColor} ${borderColor} ${textColor} border-l-4 p-4 rounded-lg shadow-lg flex items-start gap-3 pointer-events-auto animate-slide-in max-w-md`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 text-sm font-medium">
        {message}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 ml-2 hover:opacity-70 transition"
        aria-label="Fechar notificação"
      >
        <X size={18} />
      </button>
    </div>
  );
}

// Adicionar animação no globals.css ou criar estilo inline
// Para agora, vou adicionar estilo inline básico
const styles = `
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slideIn 0.3s ease-out;
}
`;

// Injetar estilo no head (apenas uma vez)
if (typeof document !== 'undefined') {
  const styleId = 'toast-animations';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}
