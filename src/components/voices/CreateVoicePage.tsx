import React, { useState, useRef } from 'react';
import { Voice } from '../../types';
import { Mic, Upload, CheckCircle2, Play, Pause, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { AudioEngine } from '../../utils/audioEngine';
import { denoiseAudio } from '../../utils/api';

interface CreateVoicePageProps {
  onAddVoice: (newVoice: Voice) => void;
  onBackToLibrary: () => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
  backendUrl: string;
  isBackendConnected: boolean;
  onOpenConnectionModal: () => void;
}

export const CreateVoicePage: React.FC<CreateVoicePageProps> = ({
  onAddVoice,
  onBackToLibrary,
  onShowToast,
  backendUrl,
  isBackendConnected,
  onOpenConnectionModal,
}) => {
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    duration: string;
  } | null>(null);

  const [voiceName, setVoiceName] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isPlayingUploaded, setIsPlayingUploaded] = useState(false);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [shouldDenoise, setShouldDenoise] = useState(false);
  const [cloningStage, setCloningStage] = useState(0);
  const [cloningProgress, setCloningProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const audioUrl = URL.createObjectURL(file);
    const audio = new Audio(audioUrl);

    audio.onloadedmetadata = () => {
      const minutes = Math.floor(audio.duration / 60);
      const seconds = Math.floor(audio.duration % 60);
      const durationStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      setUploadedFile({
        name: file.name,
        size: formatBytes(file.size),
        duration: durationStr,
      });
      setVoiceFile(file);
      setIsUploading(false);
      onShowToast('Audio uploaded', 'Quality checks passed: clear speech detected', 'success');

      // Auto-populate voice name from file name if empty
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const cleanName = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      setVoiceName((prev) => prev.trim() ? prev : cleanName);

      URL.revokeObjectURL(audioUrl);
    };

    audio.onerror = () => {
      setIsUploading(false);
      onShowToast('Upload failed', 'Failed to load and parse audio reference file', 'error');
      URL.revokeObjectURL(audioUrl);
    };
  };

  const handleTogglePlayUploaded = () => {
    if (isPlayingUploaded) {
      AudioEngine.stop();
      setIsPlayingUploaded(false);
    } else {
      if (voiceFile) {
        setIsPlayingUploaded(true);
        AudioEngine.playAudioFile(voiceFile, () => setIsPlayingUploaded(false));
      }
    }
  };

  const handleCreateVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceName.trim() || !uploadedFile || !voiceFile) return;

    setIsCreating(true);
    setCloningStage(0);
    setCloningProgress(10);
    let finalVoiceFile = voiceFile;
    let finalUploadedFile = uploadedFile;

    try {
      if (shouldDenoise) {
        setCloningStage(0); // "Running background noise suppression..."
        setCloningProgress(25);
        const denoisedBlob = await denoiseAudio(backendUrl, voiceFile);
        
        const cleanName = voiceFile.name.startsWith('denoised_')
          ? voiceFile.name
          : `denoised_${voiceFile.name}`;

        finalVoiceFile = new File([denoisedBlob], cleanName, { type: 'audio/wav' });
        finalUploadedFile = {
          name: cleanName,
          size: formatBytes(denoisedBlob.size),
          duration: uploadedFile.duration,
        };
      }

      setCloningStage(shouldDenoise ? 1 : 0); // "Extracting acoustic embeddings..."
      setCloningProgress(50);
      await new Promise((resolve) => setTimeout(resolve, 800));

      setCloningStage(shouldDenoise ? 2 : 1); // "Matching vocal pitch & timbre..."
      setCloningProgress(75);
      await new Promise((resolve) => setTimeout(resolve, 800));

      setCloningStage(shouldDenoise ? 3 : 2); // "Finalizing voice clone..."
      setCloningProgress(95);
      await new Promise((resolve) => setTimeout(resolve, 600));

      const colors = [
        'from-purple-600 to-indigo-700',
        'from-pink-600 to-purple-700',
        'from-blue-600 to-cyan-700',
        'from-emerald-600 to-teal-700',
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newVoice: Voice = {
        id: `voice-${Date.now()}`,
        name: voiceName,
        category: 'Custom',
        language: 'English (US)',
        gender: 'Male',
        sampleRate: '24kHz',
        avatarColor: randomColor,
        initials: voiceName.charAt(0).toUpperCase(),
        description: description || 'Custom zero-shot cloned voice.',
        referenceFile: finalUploadedFile,
        referenceFileObject: finalVoiceFile,
        tags: ['Custom', 'Cloned'],
      };

      setCloningProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 200));

      onAddVoice(newVoice);
      onShowToast('Voice created!', `Added '${voiceName}' to your library`, 'success');
      onBackToLibrary();
    } catch (err: any) {
      console.error('Failed to create cloned voice:', err);
      onShowToast('Cloning failed', err.message || 'Error occurred during denoising or creation', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Top Header Row */}
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-subtle)]">
        <button
          onClick={onBackToLibrary}
          className="p-1.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-base font-semibold text-[var(--text-main)]">Create voice</h2>
          <p className="text-xs text-[var(--text-muted)]">
            Create a reusable voice from a reference recording.
          </p>
        </div>
      </div>

      <form onSubmit={handleCreateVoice} className="space-y-5">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*"
          className="hidden"
        />
        {/* Dropzone area */}
        {!uploadedFile ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[var(--border-main)] hover:border-purple-500/60 bg-[var(--bg-panel)] hover:bg-[var(--bg-card)] rounded-xl p-8 text-center space-y-3 cursor-pointer transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--text-main)]">
                Drop reference audio here or click to browse
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                WAV · MP3 · M4A (10s – 60s recommended for best fidelity)
              </p>
            </div>
          </div>
        ) : (
          /* Uploaded Audio Preview */
          <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-main)]">Reference Audio Clip</span>
              <button
                type="button"
                onClick={() => setUploadedFile(null)}
                className="text-[11px] text-purple-500 hover:underline cursor-pointer"
              >
                Change file
              </button>
            </div>

            <div className="flex items-center gap-3 bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={handleTogglePlayUploaded}
                className="p-2 rounded-full bg-purple-600 text-white hover:bg-purple-500 shadow-xs shrink-0 cursor-pointer"
              >
                {isPlayingUploaded ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-medium text-[var(--text-main)] truncate">
                    {uploadedFile.name}
                  </span>
                  <span className="text-[var(--text-dim)] text-[11px]">
                    {uploadedFile.duration} · {uploadedFile.size}
                  </span>
                </div>

                {/* Mock Waveform */}
                <div className="flex items-center gap-1 h-4 mt-2">
                  {[30, 60, 90, 40, 80, 100, 70, 50, 90, 60, 40, 80, 70, 30, 90, 60, 40].map(
                    (h, i) => (
                      <span
                        key={i}
                        className="flex-1 bg-purple-500/70 rounded-full"
                        style={{ height: `${h}%` }}
                      />
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Quality Indicators */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 text-xs text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Clear speech detected</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Good recording quality (high SNR)</span>
              </div>
            </div>

            {/* Denoise Toggler */}
            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  Denoise Audio (DeepFilterNet)
                </span>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  Eliminates ambient background noise & room echo from reference clip
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={shouldDenoise}
                  onChange={(e) => {
                    if (e.target.checked && !isBackendConnected) {
                      onShowToast('Backend not connected', 'Please connect a backend API URL to enable DeepFilterNet denoising.', 'error');
                      onOpenConnectionModal();
                      return;
                    }
                    setShouldDenoise(e.target.checked);
                  }}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-[var(--text-muted)] peer-checked:after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:after:translate-x-3.5" />
              </label>
            </div>
          </div>
        )}

        {/* Voice Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-main)]">Voice name</label>
          <input
            type="text"
            required
            placeholder="e.g. Arjun, Sarah, Corporate Narrator"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            className="w-full bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-hidden focus:border-purple-500/60"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--text-main)]">
            Description <span className="text-[var(--text-dim)] font-normal">(Optional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Describe voice tone, pacing, or target use-case..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg p-3 text-xs text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-hidden focus:border-purple-500/60 resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!uploadedFile || !voiceName.trim() || isCreating}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-all ${
            !uploadedFile || !voiceName.trim() || isCreating
              ? 'bg-purple-600/20 text-purple-400/50 border border-purple-500/20 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/30 cursor-pointer active:scale-98'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Create voice</span>
        </button>
      </form>

      {/* Voice Cloning Progress Modal Overlay */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-2xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Glowing ambient background spots */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

            {/* Glowing active wave animation */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-purple-500/10 animate-ping opacity-75 duration-1000" />
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-purple-500/30 animate-spin [animation-duration:8s]" />
              <div className="absolute inset-1.5 rounded-full border border-purple-500/50 border-t-transparent animate-spin [animation-duration:1.5s]" />

              <div className="w-14 h-14 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-lg relative">
                {voiceName ? voiceName.charAt(0).toUpperCase() : 'V'}
                <Sparkles className="w-4 h-4 text-purple-200 absolute -top-1 -right-1 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[var(--text-main)] tracking-wide uppercase">
                Creating Voice Clone
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-mono min-h-5 flex items-center justify-center gap-1.5 transition-all">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>
                  {shouldDenoise
                    ? [
                        'Running background noise suppression...',
                        'Extracting acoustic embeddings...',
                        'Matching vocal pitch & timbre...',
                        'Finalizing voice clone...',
                      ][cloningStage]
                    : [
                        'Extracting acoustic embeddings...',
                        'Matching vocal pitch & timbre...',
                        'Finalizing voice clone...',
                      ][cloningStage]}
                </span>
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-[var(--bg-inner)] border border-[var(--border-subtle)] rounded-full h-2 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${cloningProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[var(--text-dim)]">
                <span>STAGE {cloningStage + 1} OF {shouldDenoise ? 4 : 3}</span>
                <span>{cloningProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
