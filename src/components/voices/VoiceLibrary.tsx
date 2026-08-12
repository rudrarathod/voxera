import React, { useState } from 'react';
import { Voice } from '../../types';
import { Plus, Search, Play, Pause, Edit2, Trash2, Mic, ArrowRight } from 'lucide-react';
import { AudioEngine } from '../../utils/audioEngine';
import { ConfirmDialog } from '../ConfirmDialog';

interface VoiceLibraryProps {
  voices: Voice[];
  onSelectVoiceForStudio: (voice: Voice) => void;
  onCreateVoiceClick: () => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
  onDeleteVoice?: (id: string) => void;
}

export const VoiceLibrary: React.FC<VoiceLibraryProps> = ({
  voices,
  onSelectVoiceForStudio,
  onCreateVoiceClick,
  onShowToast,
  onDeleteVoice,
}) => {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'All' | 'Custom' | 'System'>('All');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [deletingVoice, setDeletingVoice] = useState<Voice | null>(null);

  const filtered = voices.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.language.toLowerCase().includes(search.toLowerCase()) ||
      (v.tags && v.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())));
    const matchesCategory = filterCategory === 'All' || v.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handlePreviewVoice = (v: Voice) => {
    if (playingVoiceId === v.id) {
      AudioEngine.stop();
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(v.id);
      const onEnd = () => setPlayingVoiceId(null);

      if (v.referenceFileObject) {
        AudioEngine.playAudioFile(v.referenceFileObject, onEnd);
      } else if (v.category === 'System' && v.systemAudioUrl) {
        fetch(v.systemAudioUrl)
          .then((r) => r.blob())
          .then((blob) => {
            AudioEngine.playAudioFile(blob, onEnd);
          })
          .catch((err) => {
            console.warn('Failed to load system voice WAV sample, falling back:', err);
            AudioEngine.playSpeechPreview(
              `Hello, this is a live synthetic preview of the ${v.name} voice clone.`,
              1.0,
              onEnd
            );
          });
      } else {
        AudioEngine.playSpeechPreview(
          `Hello, this is a live synthetic preview of the ${v.name} voice clone.`,
          1.0,
          onEnd
        );
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">Voice Profiles</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Manage custom voice clones and system synthesis models
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateVoiceClick}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Clone Voice</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        {/* Category Pills */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg">
          {(['All', 'Custom', 'System'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider text-[10px] transition-colors cursor-pointer ${
                filterCategory === cat
                  ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[var(--text-dim)] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search name, language, tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg text-xs text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-hidden focus:border-purple-500/60"
          />
        </div>
      </div>

      {/* Premium Cards Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v) => {
          const isPlaying = playingVoiceId === v.id;

          return (
            <div
              key={v.id}
              className="group relative flex flex-col justify-between p-4 bg-[var(--bg-panel)] border border-[var(--border-main)] hover:border-purple-500/40 rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 duration-200"
            >
              <div className="space-y-3">
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${v.avatarColor} flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm`}
                    >
                      {v.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs font-bold text-[var(--text-main)]">{v.name}</h3>
                        <span
                          className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                            v.category === 'Custom'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-[var(--bg-inner)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                          }`}
                        >
                          {v.category === 'Custom' ? 'Custom' : 'System'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {v.language} · {v.gender}
                      </p>
                    </div>
                  </div>

                  {/* Top-Right Quick Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      type="button"
                      onClick={() =>
                        onShowToast(`Editing voice '${v.name}'`, 'Voice configuration loaded', 'info')
                      }
                      className="p-1 rounded hover:bg-[var(--bg-inner)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                      title="Edit voice"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {v.category === 'Custom' && onDeleteVoice && (
                      <button
                        type="button"
                        onClick={() => setDeletingVoice(v)}
                        className="p-1 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                        title="Delete voice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                {v.description && (
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed line-clamp-2">
                    {v.description}
                  </p>
                )}

                {/* Tags Row */}
                {v.tags && v.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {v.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--bg-inner)] text-[var(--text-dim)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Footer Actions */}
              <div className="flex items-center justify-between gap-3 pt-3.5 mt-4 border-t border-[var(--border-subtle)] shrink-0">
                <button
                  type="button"
                  onClick={() => handlePreviewVoice(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    isPlaying
                      ? 'bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/30'
                      : 'bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-main)] hover:bg-[var(--bg-inner)]'
                  }`}
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>Sample Play</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelectVoiceForStudio(v);
                    onShowToast(`Active Voice: ${v.name}`, 'Selected for timeline synthesis', 'success');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/20 hover:border-purple-600 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <span>Select Voice</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-[var(--bg-panel)] border border-[var(--border-main)] border-dashed rounded-2xl text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-purple-600/10 flex items-center justify-center text-purple-400">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">No Voice Profiles Found</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              No matching profiles were found for "{search}". Try searching for other languages or categories.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setSearch(''); setFilterCategory('All'); }}
            className="px-3.5 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-xs font-semibold text-[var(--text-main)] transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}
      {/* Delete Custom Voice Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletingVoice !== null}
        title="Delete Voice Profile"
        description={`Are you sure you want to delete the voice profile "${deletingVoice?.name}"? This will permanently remove its reference recording and metadata.`}
        confirmLabel="Delete Permanently"
        cancelLabel="Keep Profile"
        isDanger={true}
        onConfirm={() => {
          if (deletingVoice && onDeleteVoice) {
            onDeleteVoice(deletingVoice.id);
          }
          setDeletingVoice(null);
        }}
        onCancel={() => setDeletingVoice(null)}
      />
    </div>
  );
};
