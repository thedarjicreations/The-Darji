import React, { createContext, useContext, useState, useCallback } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX, FiAlertTriangle } from 'react-icons/fi';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto remove after 4 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
};

const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
            ))}
        </div>
    );
};

const ToastItem = ({ toast, onRemove }) => {
    const icons = {
        success: <FiCheckCircle className="w-5 h-5 text-green-500" />,
        error: <FiAlertCircle className="w-5 h-5 text-red-500" />,
        warning: <FiAlertTriangle className="w-5 h-5 text-yellow-500" />,
        info: <FiInfo className="w-5 h-5 text-blue-500" />
    };

    const backgrounds = {
        success: 'bg-green-50/90 border-green-200',
        error: 'bg-red-50/90 border-red-200',
        warning: 'bg-yellow-50/90 border-yellow-200',
        info: 'bg-blue-50/90 border-blue-200'
    };

    return (
        <div className={`
            pointer-events-auto
            flex items-center gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md
            animate-in slide-in-from-right-full fade-in duration-300
            ${backgrounds[toast.type] || backgrounds.info}
            min-w-[300px]
        `}>
            <div className="flex-shrink-0">
                {icons[toast.type] || icons.info}
            </div>
            <div className="flex-1">
                <p className={`text-sm font-bold text-gray-800`}>
                    {toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}
                </p>
                <p className="text-sm font-medium text-gray-600 leading-snug">
                    {toast.message}
                </p>
            </div>
            <button
                onClick={onRemove}
                className="p-1 rounded-full hover:bg-black/5 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <FiX size={16} />
            </button>
        </div>
    );
};
