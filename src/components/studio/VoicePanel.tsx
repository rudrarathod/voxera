import React, { useState } from 'react';
import { Voice, AdvancedVoiceSettings } from '../../types';
import { ChevronDown, Play, Pause, MoreVertical, Sliders } from 'lucide-react';
import { AudioEngine } from '../../utils/audioEngine';

interface VoicePanelProps {
  selectedVoice: Voice;
  onOpenVoicePicker: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  speed: string;
  setSpeed: (sp: string) => void;
  exaggeration: string;
  setExaggeration: (ex: string) => void;
  advancedSettings: AdvancedVoiceSettings;
  setAdvancedSettings: React.Dispatch<React.SetStateAction<AdvancedVoiceSettings>>;
  selectedSegmentNumber?: number | null;
}

export const VoicePanel: React.FC<VoicePanelProps> = ({
  selectedVoice,
  onOpenVoicePicker,
  language,
  setLanguage,
  speed,
  setSpeed,
  exaggeration,
  setExaggeration,
  advancedSettings,
  setAdvancedSettings,
  selectedSegmentNumber,
}) => {
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleToggleReference = () => {
    if (isPlayingReference) {
      AudioEngine.stop();
      setIsPlayingReference(false);
    } else {
      setIsPlayingReference(true);
      const onEnd = () => setIsPlayingReference(false);

      if (selectedVoice.referenceFileObject) {
        AudioEngine.playAudioFile(selectedVoice.referenceFileObject, onEnd);
      } else if (selectedVoice.category === 'System' && selectedVoice.systemAudioUrl) {
        fetch(selectedVoice.systemAudioUrl)
          .then((r) => r.blob())
          .then((blob) => {
            AudioEngine.playAudioFile(blob, onEnd);
          })
          .catch((err) => {
            console.warn('Failed to load system voice WAV sample, falling back:', err);
            AudioEngine.playSpeechPreview(
              `This is the reference voice recording for ${selectedVoice.name}.`,
              1.0,
              onEnd
            );
          });
      } else {
        AudioEngine.playSpeechPreview(
          `This is the reference voice recording for ${selectedVoice.name}.`,
          1.0,
          onEnd
        );
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)] p-5 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)] shrink-0">
        <div>
          <h3 className="text-xs font-semibold text-[var(--text-main)] uppercase tracking-wider">Voice</h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Select and configure target audio profile</p>
        </div>
      </div>

      {/* Scrollable Settings Content Wrapper */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 mt-2.5 space-y-3">
        {/* Voice Selector Card */}
        <button
        type="button"
        onClick={onOpenVoicePicker}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] transition-all text-left group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-md bg-gradient-to-br ${selectedVoice.avatarColor} flex items-center justify-center font-bold text-xs text-white shadow-xs`}
          >
            {selectedVoice.initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--text-main)]">{selectedVoice.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--accent-purple-bg)] text-[var(--accent-purple-text)] border border-[var(--accent-purple-border)] font-medium">
                {selectedVoice.category}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {selectedVoice.language} · {selectedVoice.gender}
            </p>
          </div>
        </div>

        <ChevronDown className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
      </button>

      {/* Reference Audio Section */}
      {selectedVoice.referenceFile && (
        <div className="bg-[var(--bg-inner)] border border-[var(--border-subtle)] rounded-lg p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Reference audio
            </span>
            <MoreVertical className="w-3.5 h-3.5 text-[var(--text-dim)] hover:text-[var(--text-muted)] cursor-pointer" />
          </div>

          <div className="flex items-center gap-2.5 bg-[var(--bg-card)] p-2 rounded-md border border-[var(--border-main)]">
            <button
              type="button"
              onClick={handleToggleReference}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isPlayingReference
                  ? 'bg-purple-600 text-white'
                  : 'bg-[var(--bg-inner)] text-[var(--text-main)] hover:bg-purple-600/20'
              }`}
            >
              {isPlayingReference ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-[var(--text-main)] truncate">
                  {selectedVoice.referenceFile.name}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-dim)]">
                  {selectedVoice.referenceFile.duration}
                </span>
              </div>

              {/* Small Waveform graphic preview */}
              <div className="flex items-center gap-0.5 h-3 mt-1 opacity-80">
                {[40, 70, 30, 90, 60, 80, 50, 100, 70, 40, 80, 60, 30, 70, 90, 50, 30, 80].map(
                  (h, i) => (
                    <span
                      key={i}
                      className="flex-1 bg-purple-500/60 rounded-full"
                      style={{ height: `${h}%` }}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Controls Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Language */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-[var(--text-muted)]">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-main)] focus:outline-hidden focus:border-purple-500/60 cursor-pointer"
          >
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="German">German</option>
            <option value="Japanese">Japanese</option>
          </select>
        </div>

        {/* Speed */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-[var(--text-muted)]">Speed</label>
          <select
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-main)] focus:outline-hidden focus:border-purple-500/60 cursor-pointer"
          >
            <option value="0.75x">0.75x</option>
            <option value="1.0x">1.0x</option>
            <option value="1.25x">1.25x</option>
            <option value="1.5x">1.5x</option>
          </select>
        </div>

        {/* Exaggeration */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-[var(--text-muted)]">Exaggeration</label>
          <select
            value={exaggeration}
            onChange={(e) => setExaggeration(e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-main)] focus:outline-hidden focus:border-purple-500/60 cursor-pointer"
          >
            <option value="0.2">0.2 (Subtle)</option>
            <option value="0.5">0.5 (Balanced)</option>
            <option value="0.8">0.8 (Expressive)</option>
            <option value="1.0">1.0 (Dynamic)</option>
          </select>
        </div>
      </div>

      {/* Advanced Settings Accordion */}
      <div className="pt-2 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] py-1 cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-purple-500" />
            <span>Advanced settings</span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              showAdvanced ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showAdvanced && (
          <div className="mt-2.5 p-3 rounded-lg bg-[var(--bg-inner)] border border-[var(--border-subtle)] grid grid-cols-2 gap-3 text-xs animate-in fade-in duration-150">
            <div>
              <label className="text-[10px] text-[var(--text-dim)] font-medium">Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="1.5"
                value={advancedSettings.temperature}
                onChange={(e) =>
                  setAdvancedSettings({
                    ...advancedSettings,
                    temperature: parseFloat(e.target.value) || 0.7,
                  })
                }
                className="w-full mt-1 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-md px-2 py-1 text-xs text-[var(--text-main)] focus:outline-hidden focus:border-purple-500/60"
              />
            </div>

            <div>
              <label className="text-[10px] text-[var(--text-dim)] font-medium">CFG Scale</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={advancedSettings.cfgScale}
                onChange={(e) =>
                  setAdvancedSettings({
                    ...advancedSettings,
                    cfgScale: parseFloat(e.target.value) || 1.5,
                  })
                }
                className="w-full mt-1 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-md px-2 py-1 text-xs text-[var(--text-main)] focus:outline-hidden focus:border-purple-500/60"
              />
            </div>

            <div>
              <label className="text-[10px] text-[var(--text-dim)] font-medium">Seed</label>
              <input
                type="number"
                value={advancedSettings.seed}
                onChange={(e) =>
                  setAdvancedSettings({
                    ...advancedSettings,
                    seed: parseInt(e.target.value) || 429103,
                  })
                }
                className="w-full mt-1 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-md px-2 py-1 text-xs text-[var(--text-main)] focus:outline-hidden focus:border-purple-500/60 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] text-[var(--text-dim)] font-medium">Model</label>
              <select
                value={advancedSettings.model}
                onChange={(e) =>
                  setAdvancedSettings({
                    ...advancedSettings,
                    model: e.target.value,
                  })
                }
                className="w-full mt-1 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-md px-2 py-1 text-[11px] text-[var(--text-main)] focus:outline-hidden focus:border-purple-500/60"
              >
                <option value="chatterbox-turbo">Chatterbox Turbo</option>
                <option value="chatterbox-multilingual-v3">Chatterbox Multilingual V3</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div> {/* End of Scrollable Settings Content Wrapper */}
  </div>
  );
};
