import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Zap } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  undoAction?: () => void;
  duration?: number;
}

interface ToastNotificationProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastNotification({ toast, onDismiss }: ToastNotificationProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    loading: <Zap className="w-5 h-5 animate-pulse" />,
  };

  const colors = {
    success: 'bg-green-500/20 border-green-500/50 text-green-400',
    error: 'bg-red-500/20 border-red-500/50 text-red-400',
    warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    loading: 'bg-[#FFD700]/20 border-[#FFD700]/50 text-[#FFD700]',
  };

  useEffect(() => {
    if (toast.type === 'loading' || !toast.duration) return;

    const duration = toast.duration || 5000;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 100));
        if (newProgress <= 0) {
          handleDismiss();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [toast.duration, toast.type]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <div
      className={`
        relative overflow-hidden
        bg-[#0D0D0D]/95 backdrop-blur-xl
        border-2 ${colors[toast.type].split(' ')[1]}
        rounded-lg shadow-2xl
        p-4 min-w-[350px] max-w-md
        transform transition-all duration-300
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      {/* Progress bar */}
      {toast.type !== 'loading' && toast.duration && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#3B2F2F]/30">
          <div
            className={`h-full transition-all duration-100 ${colors[toast.type].split(' ')[0]}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${colors[toast.type].split(' ')[2]}`}>
          {icons[toast.type]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[#F5F5DC] mb-1">{toast.title}</div>
          {toast.description && (
            <div className="text-sm text-[#F5F5DC]/70">{toast.description}</div>
          )}

          {/* Actions */}
          {(toast.action || toast.undoAction) && (
            <div className="flex gap-2 mt-3">
              {toast.undoAction && (
                <button
                  onClick={() => {
                    toast.undoAction!();
                    handleDismiss();
                  }}
                  className="px-3 py-1 text-sm bg-[#FFD700] text-[#0D0D0D] rounded hover:bg-[#E6C200] transition-colors font-semibold"
                >
                  Undo
                </button>
              )}
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick();
                    handleDismiss();
                  }}
                  className="px-3 py-1 text-sm border border-[#FFD700]/30 text-[#FFD700] rounded hover:bg-[#FFD700]/10 transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-[#F5F5DC]/50 hover:text-[#FFD700] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Toast Container
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // Listen for custom toast events
    const handleToast = (event: CustomEvent<Toast>) => {
      setToasts((prev) => [...prev, event.detail]);
    };

    window.addEventListener('show-toast' as any, handleToast);
    return () => window.removeEventListener('show-toast' as any, handleToast);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastNotification key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

// Toast utility functions
export const toast = {
  success: (title: string, description?: string, action?: Toast['action'], undoAction?: Toast['undoAction']) => {
    const event = new CustomEvent('show-toast', {
      detail: {
        id: Math.random().toString(36).substr(2, 9),
        type: 'success' as ToastType,
        title,
        description,
        action,
        undoAction,
        duration: 5000,
      },
    });
    window.dispatchEvent(event);
  },

  error: (title: string, description?: string, action?: Toast['action']) => {
    const event = new CustomEvent('show-toast', {
      detail: {
        id: Math.random().toString(36).substr(2, 9),
        type: 'error' as ToastType,
        title,
        description,
        action,
        duration: 7000,
      },
    });
    window.dispatchEvent(event);
  },

  warning: (title: string, description?: string) => {
    const event = new CustomEvent('show-toast', {
      detail: {
        id: Math.random().toString(36).substr(2, 9),
        type: 'warning' as ToastType,
        title,
        description,
        duration: 6000,
      },
    });
    window.dispatchEvent(event);
  },

  info: (title: string, description?: string) => {
    const event = new CustomEvent('show-toast', {
      detail: {
        id: Math.random().toString(36).substr(2, 9),
        type: 'info' as ToastType,
        title,
        description,
        duration: 5000,
      },
    });
    window.dispatchEvent(event);
  },

  loading: (title: string, description?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const event = new CustomEvent('show-toast', {
      detail: {
        id,
        type: 'loading' as ToastType,
        title,
        description,
      },
    });
    window.dispatchEvent(event);
    return id;
  },

  dismiss: (id: string) => {
    const event = new CustomEvent('dismiss-toast', { detail: { id } });
    window.dispatchEvent(event);
  },

  promise: async <T,>(
    promise: Promise<T>,
    {
      loading: loadingMsg,
      success: successMsg,
      error: errorMsg,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    const toastId = toast.loading(loadingMsg);

    try {
      const data = await promise;
      toast.dismiss(toastId);
      const msg = typeof successMsg === 'function' ? successMsg(data) : successMsg;
      toast.success(msg);
      return data;
    } catch (error) {
      toast.dismiss(toastId);
      const msg = typeof errorMsg === 'function' ? errorMsg(error) : errorMsg;
      toast.error(msg);
      throw error;
    }
  },
};
