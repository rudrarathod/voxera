import React from 'react';
import { GenerationHistoryItem } from '../../types';
import { Play, Pause, Download, Trash2, ArrowRight, Copy, Check, FileEdit } from 'lucide-react';
import { formatRelativeTime } from '../../utils/timeFormat';

interface ProjectVersionRowProps {
  item: GenerationHistoryItem;
  isPlaying: boolean;
  copiedId: string | null;
  onTogglePlay: (item: GenerationHistoryItem, e: React.MouseEvent) => void;
  onDownload: (item: GenerationHistoryItem, e: React.MouseEvent) => void;
  onCopyText: (item: GenerationHistoryItem, e: React.MouseEvent) => void;
  onLoadIntoStudio: (item: GenerationHistoryItem) => void;
  onDelete: (item: GenerationHistoryItem, e: React.MouseEvent) => void;
}

export const ProjectVersionRow: React.FC<ProjectVersionRowProps> = ({
  item,
  isPlaying,
  copiedId,
  onTogglePlay,
  onDownload,
  onCopyText,
  onLoadIntoStudio,
  onDelete,
}) => {
  const isDraft = item.id.startsWith('draft-');

  const getGenerationTypeBadge = () => {
    if (isDraft) {
      return (
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
          Workspace Draft
        </span>
      );
    }

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
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[var(--bg-inner)] border border-[var(--border-subtle)] hover:border-purple-500/20 rounded-xl transition-all text-xs group/row shadow-xs">
      <div className="flex items-start md:items-center gap-4 min-w-0 flex-1">
        {/* Play/Draft Indicator Button */}
        {isDraft ? (
          <div className="p-2.5 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20 shrink-0">
            <FileEdit className="w-4 h-4" />
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => onTogglePlay(item, e)}
            className={`p-2.5 rounded-xl transition-all shrink-0 cursor-pointer shadow-xs active:scale-95 ${
              isPlaying
                ? 'bg-purple-600 text-white shadow-purple-500/20'
                : 'bg-[var(--bg-card)] hover:bg-[var(--bg-panel)] border border-[var(--border-main)] text-[var(--text-main)]'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>
        )}

        {/* Details */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-sm text-[var(--text-main)] font-mono">
              {isDraft ? 'DRAFT' : `V${item.version || 1}`}
            </span>
            {getGenerationTypeBadge()}
            <span className="text-xs font-semibold text-[var(--text-muted)] font-mono">
              {isDraft ? `${item.segmentsCount || 0} segment${(item.segmentsCount || 0) === 1 ? '' : 's'}` : (item.durationSec > 0 ? `${item.durationSec.toFixed(1)}s` : item.duration)}
            </span>
            <span className="text-[11px] text-[var(--text-dim)]">
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>

          {/* Snippet */}
          <div className="relative group/snippet max-w-2xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 flex items-center justify-between gap-3 shadow-xs">
            <p className="text-[11px] text-[var(--text-muted)] italic truncate flex-1 leading-normal">
              "{item.scriptSnippet || 'No script text entered yet.'}"
            </p>
            <button
              type="button"
              onClick={(e) => onCopyText(item, e)}
              className="p-1 rounded hover:bg-[var(--bg-inner)] text-[var(--text-dim)] hover:text-[var(--text-main)] opacity-0 group-hover/snippet:opacity-100 transition-opacity duration-150 cursor-pointer"
              title="Copy script text"
            >
              {copiedId === item.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Meta Voice & Actions */}
      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t border-[var(--border-subtle)] md:border-t-0 pt-3 md:pt-0">
        <div className="text-right shrink-0">
          <span className="text-purple-400 font-bold text-xs">{item.voiceName}</span>
          <p className="text-[10px] text-[var(--text-dim)] font-medium">{item.language}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onLoadIntoStudio(item)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/20 hover:border-purple-600 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="Load this version into studio"
          >
            <span>Restore</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {!isDraft && (
            <button
              type="button"
              onClick={(e) => onDownload(item, e)}
              className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer transition-colors"
              title="Download WAV file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => onDelete(item, e)}
            className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-red-500/10 border border-[var(--border-main)] hover:border-red-500/30 text-[var(--text-muted)] hover:text-red-500 cursor-pointer transition-colors"
            title={isDraft ? "Delete draft workspace" : "Delete this version"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
