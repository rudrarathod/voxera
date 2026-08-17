import React, { useState } from 'react';
import { GenerationHistoryItem } from '../../types';
import { ChevronDown, ChevronUp, Folder, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { ProjectVersionRow } from './ProjectVersionRow';
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
  const [isExpanded, setIsExpanded] = useState(false);

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
    <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] hover:border-purple-500/30 rounded-xl overflow-hidden transition-all duration-200 shadow-xs hover:shadow-sm">
      {/* Card Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 cursor-pointer hover:bg-[var(--bg-card)] transition-colors select-none"
      >
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-purple-600/10 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
            <Folder className="w-5.5 h-5.5" />
          </div>

          {/* Title and stats info */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] truncate max-w-[250px] md:max-w-md">
                {projectName}
              </h3>
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRenameProject(latestItem);
                }}
                className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                title="Rename Project"
              >
                <Pencil className="w-3 h-3" />
              </button>

              {/* Status Badge */}
              {hasExport ? (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Exported
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Draft
                </span>
              )}

              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[var(--bg-inner)] text-[var(--text-dim)] border border-[var(--border-subtle)] font-mono">
                {versionsCount} {versionsCount === 1 ? 'version' : 'versions'}
              </span>

              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[var(--bg-inner)] text-[var(--text-dim)] border border-[var(--border-subtle)] font-mono">
                {latestSegments} {latestSegments === 1 ? 'track' : 'tracks'}
              </span>

              <span className="text-[10px] text-[var(--text-dim)] font-mono ml-auto md:ml-0">
                Updated {formatRelativeTime(lastModifiedStr)}
              </span>
            </div>

            {/* Subtitle details */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
              {voicesText && (
                <div>
                  Voices: <span className="text-purple-400 font-medium">{voicesText}</span>
                </div>
              )}
              {latestDuration > 0 && (
                <div>
                  Duration: <span className="text-[var(--text-main)] font-mono font-semibold">{latestDuration.toFixed(1)}s</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div
          className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t border-[var(--border-subtle)] md:border-t-0 pt-3 md:pt-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onLoadIntoStudio(latestItem)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/20 hover:border-purple-600 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 animate-in fade-in"
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
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors p-1 rounded hover:bg-[var(--bg-card)] cursor-pointer">
            {isExpanded ? <ChevronUp className="w-4.5 h-4.5" /> : <ChevronDown className="w-4.5 h-4.5" />}
          </div>
        </div>
      </div>

      {/* Expanded Versions List */}
      {isExpanded && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-2.5">
          <div className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-1">
            Generation History Versions
          </div>
          {sortedVersions.map((versionItem) => (
            <ProjectVersionRow
              key={versionItem.id}
              item={versionItem}
              isPlaying={playingId === versionItem.id}
              copiedId={copiedId}
              onTogglePlay={onTogglePlay}
              onDownload={onDownload}
              onCopyText={onCopyText}
              onLoadIntoStudio={onLoadIntoStudio}
              onDelete={onDeleteVersion}
            />
          ))}
        </div>
      )}
    </div>
  );
};
