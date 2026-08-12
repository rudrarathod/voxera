import React, { useRef } from 'react';
import { Sparkles, Trash2, Loader2, Maximize2, Minimize2 } from 'lucide-react';

interface ScriptEditorProps {
  scriptText: string;
  setScriptText: (text: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  maxChars?: number;
  selectedSegmentNumber?: number | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  generatingProgress?: { current: number; total: number } | null;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  scriptText,
  setScriptText,
  onGenerate,
  isGenerating,
  maxChars = 400,
  selectedSegmentNumber,
  isExpanded = false,
  onToggleExpand,
  generatingProgress = null,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleClear = () => {
    setScriptText('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const isOverLimit = scriptText.length > maxChars;
  const isDisableGenerate = scriptText.trim().length === 0 || isGenerating;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)] p-5 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)] shrink-0">
        <div>
          <h3 className="text-xs font-semibold text-[var(--text-main)] uppercase tracking-wider">Script</h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Write or paste your script</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedSegmentNumber ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--accent-purple-bg)] border border-[var(--accent-purple-border)] text-[var(--accent-purple-text)] text-[11px] font-medium animate-in fade-in duration-150" title="Click Generate to update metadata & audio for this segment">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span>Segment 0{selectedSegmentNumber}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-[11px] font-medium">
              <span>New Segment</span>
            </div>
          )}

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-[11px] font-medium border border-[var(--border-main)] transition-colors cursor-pointer"
              title={isExpanded ? 'Collapse script editor view' : 'Expand script editor view'}
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-purple-500" />
                  <span className="hidden sm:inline">Collapse</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Expand</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 my-2.5 relative min-h-0 flex flex-col">
        <textarea
          ref={textareaRef}
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          placeholder="Start typing or paste your script here…"
          className="w-full flex-1 resize-none bg-transparent text-sm text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-hidden font-normal leading-relaxed selection:bg-purple-500/30 overflow-y-auto"
          spellCheck={false}
        />
      </div>

      {/* Bottom Toolbar INSIDE the script panel */}
      <div className="pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        {/* Left Action Buttons */}
        <div className="flex items-center gap-2">

          {scriptText.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Right Info & Compact Generate Button */}
        <div className="flex items-center gap-3 ml-auto">
          <span
            className={`text-xs font-mono font-medium ${
              isOverLimit ? 'text-amber-500 font-bold animate-pulse' : 'text-[var(--text-dim)]'
            }`}
            title={isOverLimit ? 'Script exceeds 400 characters. It will be split into segments automatically.' : ''}
          >
            {scriptText.length} / {maxChars}
          </span>

          {/* Compact Purple Generate Button */}
          <button
            type="button"
            onClick={onGenerate}
            disabled={isDisableGenerate}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-all ${
              isDisableGenerate
                ? 'bg-purple-600/20 text-purple-400/50 border border-purple-500/20 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/30 active:scale-98 cursor-pointer shadow-purple-950/20'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-200" />
                <span>
                  {generatingProgress 
                    ? `Generating (${generatingProgress.current}/${generatingProgress.total})...` 
                    : 'Generating...'}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
