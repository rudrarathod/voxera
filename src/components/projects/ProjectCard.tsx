import React from 'react';
import { GenerationHistoryItem } from '../../types';
import { Folder, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { formatRelativeTime } from '../../utils/timeFormat';

interface ProjectCardProps {
  projectId: string;
  projectName: string;
  versions: GenerationHistoryItem[];
  playingId: string | null;
  copiedId: string | null;
  onTogglePlay: (item: GenerationHistoryItem, e: React.MouseEvent) => void;
  onDownload: (item: GenerationHistoryItem, e: React.MouseEvent) => void;
  onCopyText: (item: GenerationHistoryItem, e: React.MouseEvent) => void;
  onLoadIntoStudio: (item: GenerationHistoryItem) => void;
  onDeleteVersion: (item: GenerationHistoryItem, e: React.MouseEvent) => void;
  onDeleteProject: (projectId: string, title: string) => void;
  onRenameProject: (item: GenerationHistoryItem) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  projectId,
  projectName,
  versions,
  playingId,
  copiedId,
  onTogglePlay,
  onDownload,
  onCopyText,
  onLoadIntoStudio,
  onDeleteVersion,
  onDeleteProject,
  onRenameProject,
}) => {
  // Sort versions: drafts first, then descending version numbers
  const sortedVersions = [...versions].sort((a, b) => {
    if (a.id.startsWith('draft-')) return -1;
    if (b.id.startsWith('draft-')) return 1;
    return (b.version || 0) - (a.version || 0);
  });
  const latestItem = sortedVersions[0];

  // Derive stats (versions count excludes active draft workspace)
  const versionsCount = versions.filter(v => !v.id.startsWith('draft-')).length;
  const hasExport = versions.some((v) => v.generationType === 'master-export');
  
  // Total duration of latest item
  const latestDuration = latestItem?.durationSec || 0;
  const latestSegments = latestItem?.segmentsCount || 0;

  // Voices used
  const uniqueVoices = Array.from(
    new Set(
      versions.flatMap((v) => {
        if (v.voicesSummary) {
          return v.voicesSummary.split(', ');
        }
        return [v.voiceName];
      })
    )
  ).filter(Boolean);

  const voicesText = uniqueVoices.join(', ');

  // Get most recent timestamp
  const timestamps = versions.map((v) => new Date(v.updatedAt || v.createdAt).getTime());
  const maxTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
  const lastModifiedStr = new Date(maxTimestamp).toISOString();

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] hover:border-purple-500/25 rounded-xl overflow-hidden transition-all duration-200 shadow-xs hover:shadow-md hover:bg-[var(--bg-panel)]/80">
      {/* Card Header (Row Layout) - Clicking loads latest version into studio */}
      <div
        onClick={() => onLoadIntoStudio(latestItem)}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 cursor-pointer select-none hover:bg-[var(--bg-card)]/50 transition-colors"
      >
        {/* Left Side: Title and Status */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl bg-purple-600/10 flex items-center justify-center text-purple-400 shrink-0 shadow-inner">
            <Folder className="w-5.5 h-5.5" />
          </div>
          
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-sm md:text-base font-semibold text-[var(--text-main)] truncate max-w-[200px] md:max-w-xs lg:max-w-md leading-tight">
                {projectName}
              </h3>
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRenameProject(latestItem);
                }}
                className="p-1 rounded hover:bg-[var(--bg-inner)] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                title="Rename Project"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              {hasExport ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Exported
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Draft
                </span>
              )}
            </div>
            
            <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <span>Updated {formatRelativeTime(lastModifiedStr)}</span>
            </div>
          </div>
        </div>

        {/* Middle Side: Metadata Stats (Clean columns) */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-6 gap-y-2 text-xs text-[var(--text-muted)] shrink-0 lg:px-6">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[var(--text-main)]">{versionsCount}</span>
            <span className="text-[var(--text-dim)]">{versionsCount === 1 ? 'version' : 'versions'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[var(--text-main)]">{latestSegments}</span>
            <span className="text-[var(--text-dim)]">{latestSegments === 1 ? 'track' : 'tracks'}</span>
          </div>

          {latestDuration > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-semibold text-[var(--text-main)]">{latestDuration.toFixed(1)}s</span>
              <span className="text-[var(--text-dim)]">duration</span>
            </div>
          )}

          {voicesText && (
            <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1 max-w-[200px] truncate">
              <span className="text-[var(--text-dim)]">Voices:</span>
              <span className="text-purple-400 font-medium truncate">{voicesText}</span>
            </div>
          )}
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 border-t border-[var(--border-subtle)] lg:border-t-0 pt-3 lg:pt-0" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onLoadIntoStudio(latestItem)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer hover:shadow-sm"
              title="Open the latest version in the Studio tab"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onDeleteProject(projectId, projectName)}
              className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-red-500/10 border border-[var(--border-main)] hover:border-red-500/30 text-[var(--text-muted)] hover:text-red-500 cursor-pointer transition-colors"
              title="Delete whole project history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
