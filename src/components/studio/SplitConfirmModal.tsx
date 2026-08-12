import React from 'react';
import { AlertTriangle, Sparkles, X } from 'lucide-react';

interface SplitConfirmModalProps {
  textLength: number;
  chunksCount: number;
  onConfirm: (autoGenerate: boolean) => void;
  onClose: () => void;
}

export const SplitConfirmModal: React.FC<SplitConfirmModalProps> = ({
  textLength,
  chunksCount,
  onConfirm,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-2xl shadow-2xl overflow-hidden p-6 z-10 transform scale-100 transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-main)] leading-tight">
              Recommended: Split Script
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Script limit exceeded ({textLength} / 400 chars)
            </p>
          </div>
        </div>

        {/* Message Body */}
        <div className="space-y-3 mb-6 text-xs text-[var(--text-main)] leading-relaxed">
          <p>
            Generating texts longer than 400 characters can cause voice clone drift, GPU timeouts, or unstable speech outputs.
          </p>
          <p className="font-semibold text-purple-400">
            We will automatically slice your script into {chunksCount} smaller, natural sentences.
          </p>
        </div>

        {/* Actions Button Bar */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onConfirm(true)}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 border border-purple-500/30 text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Split & Generate All</span>
          </button>
          
          <button
            type="button"
            onClick={() => onConfirm(false)}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 text-purple-400 text-xs font-bold transition-all active:scale-98 cursor-pointer"
          >
            <span>Split & Generate Manually</span>
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            Keep Editing
          </button>
        </div>

      </div>
    </div>
  );
};
