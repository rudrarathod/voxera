import React from 'react';
import { GenerationHistoryItem } from '../../types';
import { Play, Pause, Download, Trash2, ArrowRight, Copy, Check } from 'lucide-react';
import { formatRelativeTime } from '../../utils/timeFormat';

interface HistoryVersionRowProps {
  item: GenerationHistoryItem;
  isPlaying: boolean;
  copiedId: string | null;
  onTogglePlay: (item: GenerationHistoryItem, e: React.MouseEvent) => void;
  onDownload: (item: GenerationHistoryItem, e: React.MouseEvent) => void;
  onCopyText: (item: GenerationHistoryItem, e: React.MouseEvent) => void;
  onLoadIntoStudio: (item: GenerationHistoryItem) => void;
  onDelete: (item: GenerationHistoryItem, e: React.MouseEvent) => void;
}

export const HistoryVersionRow: React.FC<HistoryVersionRowProps> = ({
  item,
  isPlaying,
  copiedId,
  onTogglePlay,
  onDownload,
  onCopyText,
  onLoadIntoStudio,
  onDelete,
}) => {
  const getGenerationTypeBadge = () => {
    switch (item.generationType) {
      case 'master-export':
        return (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Master Export
          </span>
        );
      case 'regeneration':
        return (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Regen
          </span>
        );
      case 'segment':
      default:
        return (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Segment
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[var(--bg-inner)] border border-[var(--border-subtle)] hover:border-purple-500/20 rounded-lg transition-all text-xs group/row">
      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
        {/* Play Button */}
        <button
          type="button"
          onClick={(e) => onTogglePlay(item, e)}
          className={`p-1.5 rounded-full transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 ${
            isPlaying
              ? 'bg-purple-600 text-white shadow-purple-500/20'
              : 'bg-[var(--bg-card)] hover:bg-[var(--bg-panel)] border border-[var(--border-main)] text-[var(--text-main)]'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5 ml-0.5" />
          )}
        </button>

        {/* Details */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[var(--text-main)] font-mono">
              V{item.version || 1}
            </span>
            {getGenerationTypeBadge()}
            <span className="text-[10px] font-medium text-[var(--text-muted)] font-mono">
              {item.durationSec > 0 ? `${item.durationSec.toFixed(1)}s` : item.duration}
            </span>
            <span className="text-[10px] text-[var(--text-dim)] font-mono">
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>

          {/* Snippet */}
          <div className="relative group/snippet max-w-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded px-2 py-1 flex items-center justify-between gap-2">
            <p className="text-[10px] text-[var(--text-muted)] italic truncate flex-1">
              "{item.scriptSnippet}"
            </p>
            <button
              type="button"
              onClick={(e) => onCopyText(item, e)}
              className="p-0.5 rounded hover:bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--text-main)] opacity-0 group-hover/snippet:opacity-100 transition-opacity duration-150 cursor-pointer"
              title="Copy script text"
            >
              {copiedId === item.id ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Meta Voice & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t border-[var(--border-subtle)] sm:border-t-0 pt-2 sm:pt-0">
        <div className="text-[10px] text-left sm:text-right shrink-0">
          <span className="text-purple-400 font-bold">{item.voiceName}</span>
          <p className="text-[9px] text-[var(--text-dim)]">{item.language}</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onLoadIntoStudio(item)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/20 hover:border-purple-600 text-[10px] font-semibold transition-all cursor-pointer"
            title="Load this version into studio"
          >
            <span>Restore</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={(e) => onDownload(item, e)}
            className="p-1.5 rounded bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
            title="Download WAV file"
          >
            <Download className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={(e) => onDelete(item, e)}
            className="p-1.5 rounded bg-[var(--bg-card)] hover:bg-red-500/10 border border-[var(--border-main)] hover:border-red-500/30 text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
            title="Delete this version"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
