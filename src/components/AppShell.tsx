import React, { useState, useEffect } from 'react';
import { AppTab, Voice, AudioSegment, GenerationHistoryItem, ToastMessage } from '../types';
import { INITIAL_VOICES, INITIAL_SEGMENTS, INITIAL_HISTORY } from '../data/mockData';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { StudioPage } from './studio/StudioPage';
import { VoiceLibrary } from './voices/VoiceLibrary';
import { CreateVoicePage } from './voices/CreateVoicePage';
import { HistoryPage } from './history/HistoryPage';
import { SettingsPage } from './settings/SettingsPage';
import { ConnectionModal } from './settings/ConnectionModal';
import { ToastContainer } from './Toast';
import { checkHealth, BackendHealth } from '../utils/api';
import { VoxeraDB } from '../utils/db';

export const AppShell: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('studio');
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);

  // Global State
  const [voices, setVoices] = useState<Voice[]>(INITIAL_VOICES);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(INITIAL_VOICES[0]);
  const [segments, setSegments] = useState<AudioSegment[]>(INITIAL_SEGMENTS);
  const [history, setHistory] = useState<GenerationHistoryItem[]>(INITIAL_HISTORY);
  const [projectName, setProjectName] = useState('Untitled Composition');
  const [currentProjectId, setCurrentProjectId] = useState<string>(() => `proj-${Date.now()}`);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  // Backend Connection State
  const [backendUrl, setBackendUrl] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('chatterbox_backend_url') || 'http://127.0.0.1:8000';
    }
    return 'http://127.0.0.1:8000';
  });
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [backendInfo, setBackendInfo] = useState<BackendHealth | null>(null);
  const [isOpenConnectionModal, setIsOpenConnectionModal] = useState(false);

  // Load initial data from IndexedDB on startup
  useEffect(() => {
    const loadIndexedDBData = async () => {
      try {
        const savedVoices = await VoxeraDB.getAllVoices();
        if (savedVoices.length > 0) {
          setVoices([...INITIAL_VOICES, ...savedVoices]);
        }

        const savedSegments = await VoxeraDB.getAllSegments();
        if (savedSegments.length > 0) {
          const reconstructed = savedSegments.map((seg) => {
            if (seg.audioBlob) {
              return {
                ...seg,
                audioUrl: URL.createObjectURL(seg.audioBlob),
              };
            }
            return seg;
          });
          setSegments(reconstructed);
        }

        const savedHistory = await VoxeraDB.getAllHistory();
        setHistory(savedHistory);
      } catch (err) {
        console.error('Failed to load data from IndexedDB:', err);
      } finally {
        setIsInitialLoadDone(true);
      }
    };
    loadIndexedDBData();
  }, []);

  // Auto-save segments to IndexedDB when they change
  useEffect(() => {
    if (isInitialLoadDone) {
      VoxeraDB.saveSegments(segments);
    }
  }, [segments, isInitialLoadDone]);

  // Save backendUrl to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('chatterbox_backend_url', backendUrl);
    }
  }, [backendUrl]);

  // Detect backend health status on initialization
  useEffect(() => {
    const initHealthCheck = async () => {
      const status = await checkHealth(backendUrl);
      setIsBackendConnected(status.online);
      setBackendInfo(status);
      if (status.online) {
        handleShowToast(
          'Connected to Chatterbox API',
          `Running on GPU device: ${status.device || 'CPU'}`,
          'success'
        );
      } else {
        handleShowToast(
          'Chatterbox Backend Offline',
          'Inference is offline. Please launch the FastAPI server.',
          'error'
        );
      }
    };
    initHealthCheck();
  }, []);

  // Toast Helper
  const handleShowToast = (
    title: string,
    description?: string,
    type: 'success' | 'info' | 'error' = 'success'
  ) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      description,
      type,
    };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 3500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddVoice = async (newVoice: Voice) => {
    setVoices((prev) => [newVoice, ...prev]);
    setSelectedVoice(newVoice);
    await VoxeraDB.saveVoice(newVoice);
  };

  const handleDeleteVoice = async (id: string) => {
    setVoices((prev) => prev.filter((v) => v.id !== id));
    if (selectedVoice.id === id) {
      setSelectedVoice(INITIAL_VOICES[0]);
    }
    await VoxeraDB.deleteVoice(id);
    handleShowToast('Voice deleted', 'Permanently removed from database', 'info');
  };

  const handleDeleteHistoryItem = async (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    await VoxeraDB.deleteHistoryItem(id);
    handleShowToast('Generation deleted', 'Permanently removed from database', 'info');
  };

  const handleClearHistory = async () => {
    setHistory([]);
    await VoxeraDB.clearHistory();
    handleShowToast('History cleared', 'Permanently removed all audio logs', 'info');
  };

  const handleNewProject = () => {
    setCurrentProjectId(`proj-${Date.now()}`);
  };

  const handleRenameHistoryItem = async (id: string, newTitle: string) => {
    // Find the item from our history state
    const itemToUpdate = history.find((item) => item.id === id);
    if (!itemToUpdate) return;

    const projectId = itemToUpdate.projectId;
    const updatedAtIso = new Date().toISOString();

    // Rename all versions of this project in UI state
    setHistory((prev) =>
      prev.map((item) =>
        item.projectId === projectId
          ? { ...item, title: newTitle, updatedAt: updatedAtIso }
          : item
      )
    );

    // Save all updated project versions to IndexedDB
    const allMatchingItems = history.filter((item) => item.projectId === projectId);
    for (const item of allMatchingItems) {
      await VoxeraDB.saveHistoryItem({
        ...item,
        title: newTitle,
        updatedAt: updatedAtIso,
      });
    }

    // Sync active project title if currently loaded in Studio
    if (projectId === currentProjectId) {
      setProjectName(newTitle);
    }

    handleShowToast('Project renamed', `New name: ${newTitle}`, 'success');
  };

  const handleLoadHistoryIntoStudio = (item: GenerationHistoryItem) => {
    setProjectName(item.title);
    if (item.projectId) {
      setCurrentProjectId(item.projectId);
    } else {
      setCurrentProjectId(`proj-legacy-${item.id}`);
    }

    if (item.segments && item.segments.length > 0) {
      // Reconstruct object URLs from segment audio blobs
      const reconstructedSegments = item.segments.map((seg) => {
        if (seg.audioBlob) {
          return {
            ...seg,
            audioUrl: URL.createObjectURL(seg.audioBlob),
          };
        }
        return seg;
      });

      // Update active voice to match the first segment's voice
      const firstSeg = reconstructedSegments[0];
      const voiceMatch = voices.find((v) => v.id === firstSeg.voiceId || v.name === firstSeg.voiceName) || voices[0];
      setSelectedVoice(voiceMatch);

      setSegments(reconstructedSegments);
    } else {
      // Legacy history item fallback: restore as a single segment
      const voiceMatch = voices.find((v) => v.id === item.voiceId) || voices[0];
      setSelectedVoice(voiceMatch);

      const newSeg: AudioSegment = {
        id: `seg-hist-${Date.now()}`,
        segmentNumber: 1,
        text: item.scriptSnippet,
        voiceId: voiceMatch.id,
        voiceName: voiceMatch.name,
        language: item.language,
        durationSec: item.durationSec,
        createdAt: new Date().toISOString(),
        waveformPeaks: [0.4, 0.8, 0.6, 0.9, 0.5, 0.7, 0.3, 0.8, 0.6, 0.4, 0.9, 0.7, 0.5, 0.8, 0.6],
      };

      if (item.audioBlob) {
        newSeg.audioBlob = item.audioBlob;
        newSeg.audioUrl = URL.createObjectURL(item.audioBlob);
      }

      setSegments([newSeg]);
    }

    setActiveTab('studio');
    handleShowToast(`Loaded "${item.title}" into Studio`, undefined, 'info');
  };

  const handleAddHistoryItem = async (item: GenerationHistoryItem) => {
    // Fill version if not provided
    const itemCopy = { ...item };
    if (itemCopy.version === undefined) {
      const existingVersions = history.filter((h) => h.projectId === itemCopy.projectId);
      itemCopy.version = existingVersions.length + 1;
    }
    if (!itemCopy.updatedAt) {
      itemCopy.updatedAt = itemCopy.createdAt;
    }

    setHistory((prev) => [itemCopy, ...prev]);
    await VoxeraDB.saveHistoryItem(itemCopy);
  };

  return (
    <div className="h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex flex-col font-sans selection:bg-purple-500/30 overflow-hidden">
      {/* Fixed Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpenMobile={isOpenMobileSidebar}
        onCloseMobile={() => setIsOpenMobileSidebar(false)}
      />

      {/* Main Content Workspace Offset by Sidebar Width on Desktop */}
      <div className="md:pl-[230px] flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopBar
          activeTab={activeTab}
          onOpenSettings={() => setActiveTab('settings')}
          onOpenMobileSidebar={() => setIsOpenMobileSidebar(true)}
          isBackendConnected={isBackendConnected}
          onOpenConnectionModal={() => setIsOpenConnectionModal(true)}
        />

        <main className={`flex-1 flex flex-col min-h-0 ${activeTab === 'studio' ? 'overflow-hidden pb-0' : 'overflow-y-auto pb-16'}`}>
          {activeTab === 'studio' && (
            <StudioPage
              voices={voices}
              selectedVoice={selectedVoice}
              onSelectVoice={setSelectedVoice}
              onCreateVoiceClick={() => setActiveTab('create-voice')}
              segments={segments}
              setSegments={setSegments}
              onShowToast={handleShowToast}
              backendUrl={backendUrl}
              onAddHistoryItem={handleAddHistoryItem}
              isBackendConnected={isBackendConnected}
              onOpenConnectionModal={() => setIsOpenConnectionModal(true)}
              projectName={projectName}
              onRenameProject={setProjectName}
              currentProjectId={currentProjectId}
              onNewProject={handleNewProject}
            />
          )}

          {activeTab === 'voices' && (
            <VoiceLibrary
              voices={voices}
              onSelectVoiceForStudio={(v) => {
                setSelectedVoice(v);
                setActiveTab('studio');
              }}
              onCreateVoiceClick={() => setActiveTab('create-voice')}
              onShowToast={handleShowToast}
              onDeleteVoice={handleDeleteVoice}
            />
          )}

          {activeTab === 'create-voice' && (
            <CreateVoicePage
              onAddVoice={handleAddVoice}
              onBackToLibrary={() => setActiveTab('voices')}
              onShowToast={handleShowToast}
              backendUrl={backendUrl}
              isBackendConnected={isBackendConnected}
              onOpenConnectionModal={() => setIsOpenConnectionModal(true)}
            />
          )}

          {activeTab === 'history' && (
            <HistoryPage
              history={history}
              onLoadHistoryIntoStudio={handleLoadHistoryIntoStudio}
              onShowToast={handleShowToast}
              onDeleteHistoryItem={handleDeleteHistoryItem}
              onClearHistory={handleClearHistory}
              onRenameHistoryItem={handleRenameHistoryItem}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              onShowToast={handleShowToast}
              backendUrl={backendUrl}
              setBackendUrl={setBackendUrl}
              isBackendConnected={isBackendConnected}
              setIsBackendConnected={setIsBackendConnected}
              backendInfo={backendInfo}
              setBackendInfo={setBackendInfo}
            />
          )}
        </main>
      </div>

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={isOpenConnectionModal}
        onClose={() => setIsOpenConnectionModal(false)}
        backendUrl={backendUrl}
        setBackendUrl={setBackendUrl}
        isBackendConnected={isBackendConnected}
        setIsBackendConnected={setIsBackendConnected}
        backendInfo={backendInfo}
        setBackendInfo={setBackendInfo}
        onShowToast={handleShowToast}
      />

      {/* Toast Notifications Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
};
