import React, { useState, useEffect } from 'react';
import { FolderKanban, X } from 'lucide-react';

interface RenameProjectModalProps {
  isOpen: boolean;
  currentName: string;
  onSave: (newName: string) => void;
  onClose: () => void;
}

export const RenameProjectModal: React.FC<RenameProjectModalProps> = ({
  isOpen,
  currentName,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length > 0) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <form 
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-2xl shadow-2xl overflow-hidden p-6 z-10 transform scale-100 transition-all animate-in fade-in zoom-in-95 duration-200 space-y-4"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider leading-tight">
              Rename Project
            </h3>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              Enter a name for your studio audio composition
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Project Name
          </label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled Composition"
            className="w-full px-3 py-2 bg-[var(--bg-inner)] border border-[var(--border-main)] rounded-lg text-xs text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-hidden focus:border-purple-500/60"
          />
        </div>

        {/* Actions Button Bar */}
        <div className="flex gap-2 pt-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 border border-purple-500/30 text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
          >
            Save Name
          </button>
        </div>
      </form>
    </div>
  );
};
