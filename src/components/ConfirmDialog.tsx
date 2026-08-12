import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isDanger ? 'bg-red-500/10 text-red-400' : 'bg-purple-600/10 text-purple-400'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            {description}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-[var(--bg-inner)] border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
          {cancelLabel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-xs font-semibold text-[var(--text-main)] transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-500' 
                : 'bg-purple-600 hover:bg-purple-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
