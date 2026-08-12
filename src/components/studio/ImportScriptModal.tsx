import React, { useState, useRef, useEffect } from 'react';
import { X, FileText, Split, Sparkles } from 'lucide-react';

interface ImportScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (chunks: string[]) => void;
}

export const ImportScriptModal: React.FC<ImportScriptModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [text, setText] = useState('');
  const [previewChunks, setPreviewChunks] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  // Helper to split text into chunks under 400 characters, keeping sentences intact
  const getChunks = (input: string, maxChars: number = 400): string[] => {
    if (!input.trim()) return [];
    
    // Split text by sentence boundaries (periods, exclamation marks, question marks, semicolons, or newlines)
    // while keeping the boundary characters in the sentence
    const sentences = input.match(/[^.!?;\n]+[.!?;\n]*/g) || [input];
    
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      // If a single sentence exceeds the maximum length, split it at word/space boundaries
      if (trimmedSentence.length > maxChars) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        const words = trimmedSentence.split(/(\s+)/);
        let subChunk = '';
        for (const word of words) {
          if ((subChunk + word).length > maxChars) {
            if (subChunk.trim()) {
              chunks.push(subChunk.trim());
            }
            subChunk = word;
          } else {
            subChunk += word;
          }
        }
        if (subChunk.trim()) {
          currentChunk = subChunk;
        }
      } else {
        // If adding the next sentence exceeds the max limit, flush the current chunk and start a new one
        if ((currentChunk + ' ' + trimmedSentence).trim().length > maxChars) {
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = trimmedSentence;
        } else {
          currentChunk = (currentChunk + ' ' + trimmedSentence).trim();
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  };

  // Recalculate chunks preview when text changes
  useEffect(() => {
    setPreviewChunks(getChunks(text));
  }, [text]);

  // Handle click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleImportSubmit = () => {
    const chunks = getChunks(text);
    if (chunks.length > 0) {
      onImport(chunks);
      setText('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-[var(--bg-panel)]/95 border border-[var(--border-main)] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden backdrop-blur-md transform scale-98 transition-all animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-main)]">Import Long Script</h2>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Paste text to split into segments under 400 characters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-main)] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 flex flex-col sm:flex-row gap-5">
          {/* Input Panel */}
          <div className="flex-1 flex flex-col min-h-[250px] sm:min-h-0">
            <label className="text-[10px] text-[var(--text-dim)] font-medium uppercase tracking-wider mb-2">Paste Script Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your long voiceover script or audio transcript here..."
              className="w-full flex-1 min-h-[180px] p-3 resize-none bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg text-xs text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-hidden focus:border-purple-500/60 leading-relaxed font-sans"
            />
            <div className="flex justify-between items-center mt-2.5">
              <span className="text-[10px] text-[var(--text-dim)] font-medium">
                Total Characters: <span className="font-mono text-purple-400">{text.length}</span>
              </span>
              {previewChunks.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-purple-400 font-medium">
                  <Split className="w-3 h-3" />
                  <span>{previewChunks.length} Segment{previewChunks.length > 1 ? 's' : ''}</span>
                </span>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="w-full sm:w-[240px] flex flex-col border border-[var(--border-main)] bg-[var(--bg-card)] rounded-lg p-4 max-h-[300px] sm:max-h-[none] min-h-0">
            <h4 className="text-[10px] text-[var(--text-dim)] font-medium uppercase tracking-wider mb-3 pb-1 border-b border-[var(--border-subtle)]">
              Split Preview
            </h4>
            {previewChunks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <Split className="w-8 h-8 text-[var(--text-dim)]/30 mb-2" />
                <p className="text-[10px] text-[var(--text-dim)] leading-relaxed">
                  No text to process. Paste your script to preview chunks.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0">
                {previewChunks.map((chunk, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-md text-[11px] text-[var(--text-main)] leading-relaxed relative group hover:border-purple-500/30 transition-colors"
                  >
                    <span className="absolute top-1.5 right-2 text-[9px] text-[var(--text-dim)] font-mono">
                      #{idx + 1}
                    </span>
                    <p className="pr-5 break-words">{chunk}</p>
                    <div className="text-[9px] text-[var(--text-dim)] mt-1.5 font-mono">
                      {chunk.length} chars
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--bg-card)] border-t border-[var(--border-subtle)] flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[var(--border-main)] hover:bg-[var(--bg-panel)] rounded-lg text-xs font-semibold text-[var(--text-main)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleImportSubmit}
            disabled={previewChunks.length === 0}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-all ${
              previewChunks.length === 0
                ? 'bg-purple-600/20 text-purple-400/50 border border-purple-500/20 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/30 active:scale-98 cursor-pointer shadow-purple-950/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Process & Import</span>
          </button>
        </div>
      </div>
    </div>
  );
};
