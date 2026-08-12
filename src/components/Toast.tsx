import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success' || !toast.type;
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-main)] text-[var(--text-main)] shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200"
          >
            {isSuccess && <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />}
            {isError && <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
            {!isSuccess && !isError && <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--text-main)] leading-snug">{toast.title}</p>
              {toast.description && (
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{toast.description}</p>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
