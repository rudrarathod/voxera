import React, { useState } from 'react';
import { Cpu, Volume2, Moon, RefreshCw, CheckCircle2, AlertCircle, Clipboard } from 'lucide-react';
import { checkHealth, BackendHealth } from '../../utils/api';

interface SettingsPageProps {
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  isBackendConnected: boolean;
  setIsBackendConnected: (connected: boolean) => void;
  backendInfo: BackendHealth | null;
  setBackendInfo: (info: BackendHealth | null) => void;
  appearance: 'Light' | 'Dark' | 'System';
  setAppearance: (appearance: 'Light' | 'Dark' | 'System') => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onShowToast,
  backendUrl,
  setBackendUrl,
  isBackendConnected,
  setIsBackendConnected,
  backendInfo,
  setBackendInfo,
  appearance,
  setAppearance,
}) => {
  const [audioFormat, setAudioFormat] = useState('WAV (24kHz 16-bit)');
  const [sampleRate, setSampleRate] = useState('24000');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    const start = performance.now();
    try {
      const status = await checkHealth(backendUrl);
      const latency = Math.round(performance.now() - start);

      setIsBackendConnected(status.online);
      setBackendInfo(status);

      if (status.online) {
        onShowToast(
          'Inference worker connected',
          `Latency: ${latency}ms · Device: ${status.device || 'CPU'} · TTS model: ${status.ttsLoaded ? 'Ready' : 'Not Loaded'}`,
          'success'
        );
      } else {
        onShowToast(
          'Connection failed',
          `Could not connect to FastAPI server at ${backendUrl}`,
          'error'
        );
      }
    } catch (e) {
      setIsBackendConnected(false);
      setBackendInfo({ online: false });
      onShowToast(
        'Connection failed',
        `Could not reach backend URL. Make sure FastAPI is running.`,
        'error'
      );
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        setBackendUrl(trimmed);
        onShowToast('Pasted backend link', 'Testing connection to ' + trimmed, 'info');
        
        setIsTestingConnection(true);
        const start = performance.now();
        try {
          const status = await checkHealth(trimmed);
          const latency = Math.round(performance.now() - start);

          setIsBackendConnected(status.online);
          setBackendInfo(status);

          if (status.online) {
            onShowToast(
              'Inference worker connected',
              `Latency: ${latency}ms · Device: ${status.device || 'CPU'} · TTS model: ${status.ttsLoaded ? 'Ready' : 'Not Loaded'}`,
              'success'
            );
          } else {
            onShowToast(
              'Connection failed',
              `Could not connect to FastAPI server at ${trimmed}`,
              'error'
            );
          }
        } catch {
          setIsBackendConnected(false);
          setBackendInfo({ online: false });
          onShowToast(
            'Connection failed',
            'Could not reach backend URL. Make sure FastAPI is running.',
            'error'
          );
        } finally {
          setIsTestingConnection(false);
        }
      } else {
        onShowToast(
          'Invalid Clipboard Content',
          'Clipboard text does not look like a valid HTTP/HTTPS URL. Please copy a correct link.',
          'error'
        );
      }
    } catch (err) {
      onShowToast(
        'Clipboard access denied',
        'Could not read clipboard. Please paste the URL manually into the input box.',
        'error'
      );
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-[var(--border-subtle)]">
        <h2 className="text-base font-semibold text-[var(--text-main)]">Settings</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Configure application preferences and inference worker status
        </p>
      </div>

      <div className="space-y-6">
        {/* Appearance Section */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-purple-500" />
            <h3 className="text-xs font-semibold text-[var(--text-main)] uppercase tracking-wider">
              Appearance
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {(['Dark', 'Light', 'System'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setAppearance(mode);
                  onShowToast(`Theme updated to ${mode}`, undefined, 'info');
                }}
                className={`p-2.5 rounded-lg border text-xs font-medium transition-all text-center cursor-pointer ${
                  appearance === mode
                    ? 'bg-[var(--accent-purple-bg)] border-[var(--accent-purple-border)] text-[var(--accent-purple-text)] font-semibold'
                    : 'bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-inner)]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Defaults */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-purple-500" />
            <h3 className="text-xs font-semibold text-[var(--text-main)] uppercase tracking-wider">Audio</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-main)]">Default format</label>
              <select
                value={audioFormat}
                onChange={(e) => setAudioFormat(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:outline-hidden focus:border-purple-500/60 cursor-pointer"
              >
                <option value="WAV (24kHz 16-bit)">WAV (24kHz 16-bit)</option>
                <option value="MP3 (320kbps)">MP3 (320kbps)</option>
                <option value="FLAC (Lossless)">FLAC (Lossless)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-main)]">Sample rate</label>
              <select
                value={sampleRate}
                onChange={(e) => setSampleRate(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] focus:outline-hidden focus:border-purple-500/60 cursor-pointer"
              >
                <option value="24000">24,000 Hz (Standard)</option>
                <option value="44100">44,100 Hz (High Fidelity)</option>
                <option value="48000">48,000 Hz (Broadcast)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Inference Worker */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-500" />
              <h3 className="text-xs font-semibold text-[var(--text-main)] uppercase tracking-wider">
                Inference Worker
              </h3>
            </div>

            {isBackendConnected ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[11px] font-medium">
                <CheckCircle2 className="w-3 h-3" />
                <span>Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-500 text-[11px] font-medium">
                <AlertCircle className="w-3 h-3" />
                <span>Offline</span>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-[var(--text-main)]">FastAPI / Chatterbox Endpoint</label>
                {typeof window !== 'undefined' && navigator.clipboard && navigator.clipboard.readText && (
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Clipboard className="w-3 h-3" />
                    Paste & Connect
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  className="flex-1 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-main)] font-mono focus:outline-hidden focus:border-purple-500/60"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-xs font-medium text-[var(--text-main)] transition-colors cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin text-purple-500' : ''}`}
                  />
                  <span>Test</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--bg-inner)] border border-[var(--border-subtle)] space-y-1 text-xs text-[var(--text-muted)]">
              <div className="flex justify-between">
                <span>Computing Device</span>
                <span className="text-[var(--text-main)] font-mono">
                  {isBackendConnected && backendInfo ? (backendInfo.device || 'CPU (Fallback)') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>TTS Model Preloaded</span>
                <span className="text-[var(--text-main)] font-mono">
                  {isBackendConnected && backendInfo ? (backendInfo.ttsLoaded ? 'Yes' : 'No') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>VC Model Preloaded</span>
                <span className="text-[var(--text-main)] font-mono">
                  {isBackendConnected && backendInfo ? (backendInfo.vcLoaded ? 'Yes' : 'No') : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
