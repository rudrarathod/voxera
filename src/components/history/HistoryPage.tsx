import React, { useState } from 'react';
import { GenerationHistoryItem } from '../../types';
import { Search, Play, Pause, Download, Trash2, ArrowRight, Copy, Check, FileAudio, Pencil } from 'lucide-react';
import { AudioEngine } from '../../utils/audioEngine';
import { ConfirmDialog } from '../ConfirmDialog';
import { RenameProjectModal } from '../studio/RenameProjectModal';

interface HistoryPageProps {
  history: GenerationHistoryItem[];
  onLoadHistoryIntoStudio: (item: GenerationHistoryItem) => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  onRenameHistoryItem: (id: string, newTitle: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  history,
  onLoadHistoryIntoStudio,
  onShowToast,
  onDeleteHistoryItem,
  onClearHistory,
  onRenameHistoryItem,
}) => {
  const [search, setSearch] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'All' | 'Today' | 'This week'>('All');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [renamingItem, setRenamingItem] = useState<GenerationHistoryItem | null>(null);

  const filtered = history.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.voiceName.toLowerCase().includes(search.toLowerCase()) ||
      item.scriptSnippet.toLowerCase().includes(search.toLowerCase());

    if (filterPeriod === 'Today') {
      return matchesSearch && (item.createdAt.includes('Just now') || item.createdAt.includes('hours') || item.createdAt.includes('minute'));
    }
    return matchesSearch;
  });

  const handleTogglePlay = (item: GenerationHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingId === item.id) {
      AudioEngine.stop();
      setPlayingId(null);
    } else {
      setPlayingId(item.id);
      if (item.audioBlob) {
        AudioEngine.playAudioFile(item.audioBlob, () => setPlayingId(null));
      } else {
        AudioEngine.playSpeechPreview(item.scriptSnippet, 1.0, () => setPlayingId(null));
      }
    }
  };

  const handleDownload = (item: GenerationHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.audioBlob) {
      const url = URL.createObjectURL(item.audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.title.replace(/\s+/g, '_')}_${item.voiceName}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast('Downloaded WAV file', item.title, 'success');
    } else {
      onShowToast('Download simulated', 'No audio blob found for this mock item.', 'info');
    }
  };

  const handleCopyText = (item: GenerationHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.scriptSnippet);
    setCopiedId(item.id);
    onShowToast('Copied to clipboard', 'Script text copied successfully', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [deletingItem, setDeletingItem] = useState<GenerationHistoryItem | null>(null);

  const handleDelete = (item: GenerationHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingItem(item);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Row */}
      <div className="pb-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">Generation History</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Review, listen to, download, and re-open past timeline compositions
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={() => setIsConfirmClearOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
            title="Clear all generation history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Clear History</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        {/* Period Pills */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg">
          {(['All', 'Today', 'This week'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setFilterPeriod(period)}
              className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider text-[10px] transition-colors cursor-pointer ${
                filterPeriod === period
                  ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[var(--text-dim)] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search script, voice, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg text-xs text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-hidden focus:border-purple-500/60"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-panel)] border border-[var(--border-main)] border-dashed rounded-2xl text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-purple-600/10 flex items-center justify-center text-purple-400">
            <FileAudio className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">No History Records</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              No matching generations were found for "{search}". Try another filter or create a new audio clip in the studio.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isPlaying = playingId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => onLoadHistoryIntoStudio(item)}
                className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[var(--bg-panel)] hover:bg-[var(--bg-card)] border border-[var(--border-main)] hover:border-purple-500/30 rounded-xl transition-all cursor-pointer hover:shadow-xs duration-200"
              >
                {/* Left Side: Playback Trigger & Text details */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => handleTogglePlay(item, e)}
                    className={`p-2.5 rounded-full transition-all shrink-0 cursor-pointer shadow-sm active:scale-95 ${
                      isPlaying
                        ? 'bg-purple-600 text-white shadow-purple-500/30'
                        : 'bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-[var(--text-main)]'
                    }`}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>

                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[var(--text-main)]">{item.title}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingItem(item);
                        }}
                        className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                        title="Rename project"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[var(--bg-inner)] text-[var(--text-dim)] border border-[var(--border-subtle)]">
                        {item.durationSec > 0 ? `${item.durationSec}s` : item.duration}
                      </span>
                      {item.segmentsCount > 1 && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {item.segmentsCount} segments
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--text-dim)] font-mono ml-auto md:ml-0">
                        {item.createdAt}
                      </span>
                    </div>

                    {/* Script Snippet Block */}
                    <div className="relative group/snippet max-w-2xl bg-[var(--bg-inner)] border border-[var(--border-subtle)] rounded-lg py-1.5 pl-3 pr-8">
                      <p className="text-[11px] text-[var(--text-muted)] italic leading-relaxed truncate">
                        "{item.scriptSnippet}"
                      </p>
                      <button
                        type="button"
                        onClick={(e) => handleCopyText(item, e)}
                        className="absolute right-2 top-1.5 p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--text-main)] opacity-0 group-hover/snippet:opacity-100 transition-opacity duration-150 cursor-pointer"
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

                {/* Right Side: Meta Tag (Voice) & Action Triggers */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t border-[var(--border-subtle)] md:border-t-0 pt-3 md:pt-0">
                  {/* Voice tag */}
                  <div className="text-[11px] font-medium text-left md:text-right shrink-0">
                    <span className="text-purple-400 font-bold">{item.voiceName}</span>
                    <p className="text-[10px] text-[var(--text-dim)] mt-0.5">{item.language}</p>
                  </div>

                  {/* Actions buttons */}
                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onLoadHistoryIntoStudio(item)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/20 hover:border-purple-600 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <span>Open Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDownload(item, e)}
                      className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer transition-colors"
                      title="Download WAV file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(item, e)}
                      className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-red-500/10 border border-[var(--border-main)] hover:border-red-500/30 text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Record Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingItem !== null}
        title="Delete Record"
        description={`Are you sure you want to delete the audio generation record "${deletingItem?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        cancelLabel="Keep Record"
        isDanger={true}
        onConfirm={() => {
          if (deletingItem) {
            onDeleteHistoryItem(deletingItem.id);
            onShowToast('Record deleted', deletingItem.title, 'info');
          }
          setDeletingItem(null);
        }}
        onCancel={() => setDeletingItem(null)}
      />

      {/* Clear All History Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmClearOpen}
        title="Clear Generation History"
        description="Are you sure you want to delete all generation records? This will permanently remove all audio clips and compositions from your history database. This action cannot be undone."
        confirmLabel="Clear All Permanently"
        cancelLabel="Keep History"
        isDanger={true}
        onConfirm={() => {
          onClearHistory();
          setIsConfirmClearOpen(false);
        }}
        onCancel={() => setIsConfirmClearOpen(false)}
      />

      {/* Rename Project Modal */}
      <RenameProjectModal
        isOpen={renamingItem !== null}
        currentName={renamingItem?.title || ''}
        onSave={(newName) => {
          if (renamingItem) {
            onRenameHistoryItem(renamingItem.id, newName);
          }
          setRenamingItem(null);
        }}
        onClose={() => setRenamingItem(null)}
      />
    </div>
  );
};
