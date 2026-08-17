import React, { useState, useEffect } from 'react';
import { X, Link2, Clipboard, RefreshCw, Cpu, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { checkHealth, BackendHealth } from '../../utils/api';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  isBackendConnected: boolean;
  setIsBackendConnected: (connected: boolean) => void;
  backendInfo: BackendHealth | null;
  setBackendInfo: (info: BackendHealth | null) => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  backendUrl,
  setBackendUrl,
  isBackendConnected,
  setIsBackendConnected,
  backendInfo,
  setBackendInfo,
  onShowToast,
}) => {
  const [localUrl, setLocalUrl] = useState(backendUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [hasClipboardSupport, setHasClipboardSupport] = useState(false);

  useEffect(() => {
    setLocalUrl(backendUrl);
  }, [backendUrl]);

  // Check if navigator.clipboard is available
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
      setHasClipboardSupport(true);
    }
  }, []);

  const handleConnect = async (urlToTest: string) => {
    const formattedUrl = urlToTest.trim();
    if (!formattedUrl) {
      onShowToast('URL is empty', 'Please enter a valid backend link', 'error');
      return;
    }
    setIsTesting(true);
    const start = performance.now();
    try {
      const status = await checkHealth(formattedUrl);
      const latency = Math.round(performance.now() - start);
      
      setIsBackendConnected(status.online);
      setBackendInfo(status);
      
      if (status.online) {
        setBackendUrl(formattedUrl);
        onShowToast(
          'Connected to Inference Worker',
          `Latency: ${latency}ms · Device: ${status.device || 'CPU'} · TTS: ${status.ttsLoaded ? 'Ready' : 'Not Loaded'}`,
          'success'
        );
        onClose(); // Automatically close modal on success
      } else {
        onShowToast(
          'Connection failed',
          `Could not connect to FastAPI server at ${formattedUrl}`,
          'error'
        );
      }
    } catch (e) {
      setIsBackendConnected(false);
      setBackendInfo({ online: false });
      onShowToast(
        'Connection failed',
        'Could not reach backend URL. Make sure the FastAPI backend or Google Colab tunnel is active.',
        'error'
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handlePasteAndConnect = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const trimmed = clipboardText.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        setLocalUrl(trimmed);
        onShowToast('Pasted backend link', 'Testing connection to ' + trimmed, 'info');
        handleConnect(trimmed);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
      <div 
        className="w-full max-w-sm bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Backend Link</h3>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Connect to Colab tunnel or local FastAPI</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-4 pb-4 space-y-3.5">
          {/* Quick Paste Button Box */}
          {hasClipboardSupport && (
            <button
              onClick={handlePasteAndConnect}
              type="button"
              className="w-full py-2 px-3 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer group active:scale-98"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Paste from clipboard</span>
            </button>
          )}

          {/* Open Google Colab Notebook Button */}
          <a
            href="https://colab.research.google.com/drive/1jjvIw0eyLTzDOKSz9U7JCvX0N7ug8AfD?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-3 rounded-lg bg-orange-600/10 hover:bg-orange-600 border border-orange-500/20 hover:border-orange-600 text-orange-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
          >
            <Link2 className="w-3.5 h-3.5 text-orange-500 group-hover:text-white" />
            <span>Open Google Colab Notebook</span>
          </a>

          {/* URL Input Form */}
          <div className="space-y-1">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                API Endpoint URL
              </label>
              {!hasClipboardSupport && (
                <span className="text-[9px] text-[var(--text-dim)] font-medium">Ctrl+V to paste</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                placeholder="https://*.trycloudflare.com or http://127.0.0.1:8000"
                className="flex-1 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] font-mono focus:outline-hidden focus:border-purple-500/60"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConnect(localUrl);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleConnect(localUrl)}
                disabled={isTesting}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 h-[30px]"
              >
                {isTesting ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </div>

          {/* Helper reset & options */}
          <div className="flex justify-between items-center text-[10px] px-0.5">
            <span className="text-[var(--text-dim)]">Using local server?</span>
            <button
              type="button"
              onClick={() => {
                const defaultUrl = 'http://127.0.0.1:8000';
                setLocalUrl(defaultUrl);
                handleConnect(defaultUrl);
              }}
              className="text-purple-400 hover:text-purple-300 font-bold transition-colors cursor-pointer"
            >
              Reset to Localhost
            </button>
          </div>

          {/* Connection Details Banner */}
          <div className="p-3 rounded-lg bg-[var(--bg-inner)] border border-[var(--border-main)] space-y-1.5 text-[11px] text-[var(--text-muted)]">
            <div className="flex justify-between items-center pb-1 border-b border-[var(--border-subtle)]">
              <span>Status</span>
              {isBackendConnected ? (
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-400 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse"></span>
                  Offline
                </span>
              )}
            </div>

            {isBackendConnected && backendInfo ? (
              <div className="space-y-1 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span>Device</span>
                  <span className="text-[var(--text-main)] font-semibold">
                    {backendInfo.device || 'CPU'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>TTS Preloaded</span>
                  <span className="text-[var(--text-main)]">
                    {backendInfo.ttsLoaded ? 'Yes (Ready)' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>VC Preloaded</span>
                  <span className="text-[var(--text-main)]">
                    {backendInfo.vcLoaded ? 'Yes (Ready)' : 'No'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-[var(--text-dim)] leading-relaxed">
                Launch the backend notebook or local server to get a tunnel URL, then paste it above to start.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 flex justify-end shrink-0 border-t border-[var(--border-subtle)]">
          <button
            onClick={onClose}
            className="px-3.5 py-1 rounded-md bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-[11px] font-semibold text-[var(--text-main)] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
