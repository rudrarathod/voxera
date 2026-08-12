import React, { useState } from 'react';
import { Voice } from '../../types';
import { Search, Play, Pause, Plus, Check, X } from 'lucide-react';
import { AudioEngine } from '../../utils/audioEngine';

interface VoicePickerModalProps {
  voices: Voice[];
  selectedVoice: Voice;
  onSelectVoice: (voice: Voice) => void;
  onClose: () => void;
  onCreateVoiceClick: () => void;
}

export const VoicePickerModal: React.FC<VoicePickerModalProps> = ({
  voices,
  selectedVoice,
  onSelectVoice,
  onClose,
  onCreateVoiceClick,
}) => {
  const [search, setSearch] = useState('');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const filteredVoices = voices.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.language.toLowerCase().includes(search.toLowerCase()) ||
      v.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const yourVoices = filteredVoices.filter((v) => v.category === 'Custom');
  const systemVoices = filteredVoices.filter((v) => v.category === 'System');

  const handlePreviewVoice = (v: Voice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingVoiceId === v.id) {
      AudioEngine.stop();
      setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(v.id);
      
      const onEnd = () => setPlayingVoiceId(null);

      if (v.category === 'System' && v.systemAudioUrl) {
        // Fetch and play the high-fidelity WAV sample for the system voice
        fetch(v.systemAudioUrl)
          .then((r) => r.blob())
          .then((blob) => {
            AudioEngine.playAudioFile(blob, onEnd);
          })
          .catch((err) => {
            console.warn('Failed to load system voice WAV sample, falling back:', err);
            AudioEngine.playSpeechPreview(
              `Hello, I am ${v.name}. This is a preview of my voice.`,
              1.0,
              onEnd
            );
          });
      } else if (v.category === 'Custom' && v.referenceFileObject) {
        // Play the user's uploaded reference file directly
        AudioEngine.playAudioFile(v.referenceFileObject, onEnd);
      } else {
        // Speech synthesis fallback
        AudioEngine.playSpeechPreview(
          `Hello, I am ${v.name}. This is a preview of my synthetic voice.`,
          1.0,
          onEnd
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-main)]">Select Voice</h3>
            <p className="text-xs text-[var(--text-muted)]">Choose an AI voice or custom voice clone</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[var(--border-subtle)]">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-dim)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search voices by name or language..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg text-xs text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-hidden focus:border-purple-500/60"
            />
          </div>
        </div>

        {/* Voices List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Custom / Your Voices */}
          {yourVoices.length > 0 && (
            <div>
              <div className="px-2 mb-1.5">
                <span className="text-[11px] font-medium text-[var(--text-dim)] uppercase tracking-wider">
                  Your voices
                </span>
              </div>
              <div className="space-y-1">
                {yourVoices.map((v) => {
                  const isSelected = selectedVoice.id === v.id;
                  const isPlaying = playingVoiceId === v.id;

                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        onSelectVoice(v);
                        onClose();
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[var(--accent-purple-bg)] border-purple-500/50 text-[var(--text-main)]'
                          : 'bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-main)] hover:bg-[var(--bg-inner)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-md bg-gradient-to-br ${v.avatarColor} flex items-center justify-center font-bold text-xs text-white shadow-xs`}
                        >
                          {v.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--text-main)]">{v.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--accent-purple-bg)] text-[var(--accent-purple-text)] border border-[var(--accent-purple-border)] font-medium">
                              {v.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            {v.language} · {v.gender}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handlePreviewVoice(v, e)}
                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            isPlaying
                              ? 'bg-purple-600 text-white'
                              : 'bg-[var(--bg-inner)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                          title="Preview voice sample"
                        >
                          {isPlaying ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {isSelected && <Check className="w-4 h-4 text-purple-500" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* System Voices */}
          {systemVoices.length > 0 && (
            <div>
              <div className="px-2 mb-1.5">
                <span className="text-[11px] font-medium text-[var(--text-dim)] uppercase tracking-wider">
                  System voices
                </span>
              </div>
              <div className="space-y-1">
                {systemVoices.map((v) => {
                  const isSelected = selectedVoice.id === v.id;
                  const isPlaying = playingVoiceId === v.id;

                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        onSelectVoice(v);
                        onClose();
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[var(--accent-purple-bg)] border-purple-500/50 text-[var(--text-main)]'
                          : 'bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-main)] hover:bg-[var(--bg-inner)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-md bg-gradient-to-br ${v.avatarColor} flex items-center justify-center font-bold text-xs text-white shadow-xs`}
                        >
                          {v.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--text-main)]">{v.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg-inner)] text-[var(--text-muted)] font-medium">
                              System
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            {v.language} · {v.gender}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handlePreviewVoice(v, e)}
                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            isPlaying
                              ? 'bg-purple-600 text-white'
                              : 'bg-[var(--bg-inner)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          {isPlaying ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {isSelected && <Check className="w-4 h-4 text-purple-500" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredVoices.length === 0 && (
            <div className="p-8 text-center text-[var(--text-dim)] text-xs">
              No voices found matching "{search}"
            </div>
          )}
        </div>

        {/* Modal Footer / Create Voice CTA */}
        <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-inner)]">
          <button
            onClick={() => {
              onClose();
              onCreateVoiceClick();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-panel)] border border-[var(--border-main)] text-xs font-medium text-purple-500 hover:text-purple-600 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create voice clone</span>
          </button>
        </div>
      </div>
    </div>
  );
};
