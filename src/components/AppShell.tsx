import React, { useState, useEffect } from 'react';
import { AppTab, Voice, AudioSegment, GenerationHistoryItem, ToastMessage, NotificationItem, AdvancedVoiceSettings } from '../types';
import { INITIAL_VOICES, INITIAL_SEGMENTS, INITIAL_HISTORY } from '../data/mockData';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { StudioPage } from './studio/StudioPage';
import { VoiceLibrary } from './voices/VoiceLibrary';
import { CreateVoicePage } from './voices/CreateVoicePage';
import { ProjectsPage } from './projects/ProjectsPage';
import { SettingsPage } from './settings/SettingsPage';
import { ConnectionModal } from './settings/ConnectionModal';
import { ToastContainer } from './Toast';
import { checkHealth, BackendHealth, clearReferenceCache } from '../utils/api';
import { VoxeraDB } from '../utils/db';

export const AppShell: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('projects');
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);

  // Global State
  const [voices, setVoices] = useState<Voice[]>(INITIAL_VOICES);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(INITIAL_VOICES[0]);
  const [segments, setSegments] = useState<AudioSegment[]>(INITIAL_SEGMENTS);
  const [history, setHistory] = useState<GenerationHistoryItem[]>(INITIAL_HISTORY);
  const [projectName, setProjectName] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('voxera_project_name') || 'Untitled Composition';
    }
    return 'Untitled Composition';
  });
  const [currentProjectId, setCurrentProjectId] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('voxera_project_id') || `proj-${Date.now()}`;
    }
    return `proj-${Date.now()}`;
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  // Lifted Project Settings States
  const [language, setLanguage] = useState('English');
  const [speed, setSpeed] = useState('1.0x');
  const [exaggeration, setExaggeration] = useState('0.5');
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedVoiceSettings>({
    temperature: 0.7,
    cfgScale: 1.5,
    seed: 429103,
    model: 'chatterbox-turbo',
  });

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

  // Appearance / Theme State (Default to Light theme)
  const [appearance, setAppearance] = useState<'Light' | 'Dark' | 'System'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return (localStorage.getItem('voxera_appearance') as 'Light' | 'Dark' | 'System') || 'Light';
    }
    return 'Light';
  });

  // Apply appearance theme classes to document element
  useEffect(() => {
    const applyTheme = (theme: 'Light' | 'Dark' | 'System') => {
      const root = document.documentElement;
      if (theme === 'Light') {
        root.classList.add('light');
        root.classList.remove('dark');
      } else if (theme === 'Dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        // System Theme (Sync with OS setting)
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemPrefersDark) {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }
      }
    };

    applyTheme(appearance);

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('voxera_appearance', appearance);
    }

    if (appearance === 'System') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        const root = document.documentElement;
        if (e.matches) {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }
      };
      
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, [appearance]);

  // Load initial data from IndexedDB on startup
  useEffect(() => {
    const loadIndexedDBData = async () => {
      try {
        const savedVoices = await VoxeraDB.getAllVoices();
        if (savedVoices.length > 0) {
          setVoices([...INITIAL_VOICES, ...savedVoices]);
        }

        // Check if this is a continuing session (e.g., page reload inside the same tab)
        const isContinuingSession = typeof window !== 'undefined' && 
                                    window.sessionStorage && 
                                    sessionStorage.getItem('voxera_session_active') === 'true';

        if (isContinuingSession) {
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
        } else {
          // Brand new session: Start with a single blank draft segment in the studio workspace
          const defaultSeg: AudioSegment = {
            id: `seg-${Date.now()}`,
            segmentNumber: 1,
            text: 'Welcome to Voxera. This is a test of the AI voice studio.',
            voiceId: INITIAL_VOICES[0].id,
            voiceName: INITIAL_VOICES[0].name,
            language: 'English',
            durationSec: 0.0,
            createdAt: new Date().toISOString(),
            waveformPeaks: Array.from({ length: 20 }, () => 0.2),
          };
          await VoxeraDB.saveSegments([defaultSeg]);
          setSegments([defaultSeg]);
          setProjectName('Untitled Composition');
          setCurrentProjectId(`proj-${Date.now()}`);
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.setItem('voxera_session_active', 'true');
          }
        }

        const savedHistory = await VoxeraDB.getAllHistory();
        
        // Clean up legacy untouched/empty drafts to remove ghost projects
        const cleanedHistory = [];
        for (const item of savedHistory) {
          const isUntouchedDraft =
            item.id.startsWith('draft-') &&
            item.title === 'Untitled Composition' &&
            (!item.segments || item.segments.length === 1) &&
            (!item.segments || item.segments[0].text === 'Welcome to Voxera. This is a test of the AI voice studio.') &&
            item.durationSec === 0 &&
            !item.audioBlob;

          if (isUntouchedDraft) {
            await VoxeraDB.deleteHistoryItem(item.id);
          } else {
            cleanedHistory.push(item);
          }
        }
        setHistory(cleanedHistory);

        // Restore settings for the active project on load if a draft exists
        if (isContinuingSession) {
          const activeProjectId = localStorage.getItem('voxera_project_id') || currentProjectId;
          const activeDraft = cleanedHistory.find((item) => item.id === `draft-${activeProjectId}`);
          if (activeDraft && activeDraft.projectSettings) {
            setLanguage(activeDraft.projectSettings.language);
            setSpeed(activeDraft.projectSettings.speed);
            setExaggeration(activeDraft.projectSettings.exaggeration);
            setAdvancedSettings(activeDraft.projectSettings.advancedSettings);
          }
        }
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

  // Save active project metadata to localStorage when changed
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('voxera_project_name', projectName);
    }
  }, [projectName]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('voxera_project_id', currentProjectId);
    }
  }, [currentProjectId]);

  // Save active project draft to IndexedDB history store
  useEffect(() => {
    if (!isInitialLoadDone) return;

    const saveDraft = async () => {
      // Check if project is completely untouched to avoid creating ghost projects
      const isUntouched =
        projectName === 'Untitled Composition' &&
        segments.length === 1 &&
        segments[0].text === 'Welcome to Voxera. This is a test of the AI voice studio.' &&
        segments[0].durationSec === 0 &&
        !segments[0].audioBlob &&
        selectedVoice.id === INITIAL_VOICES[0].id &&
        language === 'English' &&
        speed === '1.0x' &&
        exaggeration === '0.5' &&
        advancedSettings.temperature === 0.7 &&
        advancedSettings.cfgScale === 1.5 &&
        advancedSettings.seed === 429103 &&
        advancedSettings.model === 'chatterbox-turbo';

      if (isUntouched) {
        return;
      }

      const draftId = `draft-${currentProjectId}`;
      const scriptSnippet = segments.length > 0 ? segments[0].text : '';
      const fullScript = segments.map((s) => s.text).join('\n');
      const totalDuration = segments.reduce((sum, s) => sum + s.durationSec, 0);

      const draftItem: GenerationHistoryItem = {
        id: draftId,
        projectId: currentProjectId,
        title: projectName,
        status: 'draft',
        voiceId: selectedVoice.id,
        voiceName: selectedVoice.name,
        voicesSummary: Array.from(new Set(segments.map((s) => s.voiceName))).join(', ') || selectedVoice.name,
        language: language,
        duration: `${Math.round(totalDuration)}s`,
        durationSec: totalDuration,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        segmentsCount: segments.length,
        scriptSnippet: scriptSnippet.substring(0, 100),
        fullScript: fullScript,
        segments: segments,
        version: 0,
        projectSettings: {
          language,
          speed,
          exaggeration,
          advancedSettings,
        },
      };

      // Save draft item in IndexedDB history store
      await VoxeraDB.saveHistoryItem(draftItem);

      // Refresh history state to update Projects tab
      const savedHistory = await VoxeraDB.getAllHistory();
      setHistory(savedHistory);
    };

    // Debounce to prevent database thrashing while editing/typing
    const timer = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timer);
  }, [
    isInitialLoadDone,
    currentProjectId,
    projectName,
    segments,
    selectedVoice,
    language,
    speed,
    exaggeration,
    advancedSettings,
  ]);
  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.getAttribute('contenteditable') === 'true'
      );

      // Escape key to close Connection Modal
      if (e.key === 'Escape') {
        setIsOpenConnectionModal(false);
      }

      // Space key to play/pause (only outside inputs)
      if (e.key === ' ' && !isInput) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('voxera-play-toggle'));
      }

      // Ctrl+S / Cmd+S to rename project
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('voxera-rename-trigger'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Session Notification History
  const [notificationHistory, setNotificationHistory] = useState<NotificationItem[]>(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const isContinuing = sessionStorage.getItem('voxera_session_active') === 'true';
      if (!isContinuing) {
        sessionStorage.removeItem('voxera_notification_history');
        return [];
      }
      try {
        const saved = sessionStorage.getItem('voxera_notification_history');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Save notification history to sessionStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem('voxera_notification_history', JSON.stringify(notificationHistory));
    }
  }, [notificationHistory]);

  const handleClearNotificationHistory = () => {
    setNotificationHistory([]);
  };

  // Toast Helper
  const handleShowToast = (
    title: string,
    description?: string,
    type: 'success' | 'info' | 'error' = 'success'
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newToast: ToastMessage = {
      id,
      title,
      description,
      type,
    };
    setToasts((prev) => [...prev, newToast]);

    // Add to session notification history
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newHistoryItem: NotificationItem = {
      id,
      title,
      description,
      type,
      timestamp,
    };
    setNotificationHistory((prev) => [newHistoryItem, ...prev]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
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
    setProjectName('Untitled Composition');
    segments.forEach((seg) => {
      if (seg.audioUrl) {
        URL.revokeObjectURL(seg.audioUrl);
      }
    });

    const defaultSeg: AudioSegment = {
      id: `seg-${Date.now()}`,
      segmentNumber: 1,
      text: 'Welcome to Voxera. This is a test of the AI voice studio.',
      voiceId: selectedVoice?.id || INITIAL_VOICES[0].id,
      voiceName: selectedVoice?.name || INITIAL_VOICES[0].name,
      language: language || 'English',
      durationSec: 0.0,
      createdAt: new Date().toISOString(),
      waveformPeaks: Array.from({ length: 20 }, () => 0.2),
    };

    setSegments([defaultSeg]);
    setLanguage('English');
    setSpeed('1.0x');
    setExaggeration('0.5');
    setAdvancedSettings({
      temperature: 0.7,
      cfgScale: 1.5,
      seed: 429103,
      model: 'chatterbox-turbo',
    });
  };

  const handleCreateNewProjectAndRedirect = () => {
    handleNewProject();
    setActiveTab('studio');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('voxera-rename-trigger'));
    }, 100);
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

    if (item.projectSettings) {
      setLanguage(item.projectSettings.language);
      setSpeed(item.projectSettings.speed);
      setExaggeration(item.projectSettings.exaggeration);
      setAdvancedSettings(item.projectSettings.advancedSettings);
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

  const handleClearAudioCache = async () => {
    // 1. Clear reference ID cache in API
    clearReferenceCache();

    // 2. Revoke active segment audio URLs
    segments.forEach((seg) => {
      if (seg.audioUrl) {
        URL.revokeObjectURL(seg.audioUrl);
      }
    });

    // 3. Clear segments in IndexedDB
    await VoxeraDB.saveSegments([]);
    setSegments([]);

    // 4. Also revoke URLs in history list and delete audio blobs from history (leaving metadata)
    const updatedHistory = history.map((item) => {
      const copy = { ...item };
      delete copy.audioBlob;
      if (copy.segments) {
        copy.segments = copy.segments.map((seg) => {
          const segCopy = { ...seg };
          delete segCopy.audioBlob;
          if (segCopy.audioUrl) {
            URL.revokeObjectURL(segCopy.audioUrl);
          }
          delete segCopy.audioUrl;
          return segCopy;
        });
      }
      return copy;
    });
    setHistory(updatedHistory);
    // Save updated history items to IndexedDB
    for (const item of updatedHistory) {
      await VoxeraDB.saveHistoryItem(item);
    }

    handleShowToast(
      'Audio cache cleared',
      'All temporary segments, voice cache, and history audio files have been deleted.',
      'success'
    );
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
          appearance={appearance}
          setAppearance={setAppearance}
          notificationHistory={notificationHistory}
          onClearNotificationHistory={handleClearNotificationHistory}
        />

        <main className={`flex-1 flex flex-col min-h-0 ${activeTab === 'studio' ? 'overflow-hidden pb-0' : 'overflow-y-auto pb-16'}`}>
          {activeTab === 'studio' && (
            <StudioPage
              voices={voices}
              setVoices={setVoices}
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
              language={language}
              setLanguage={setLanguage}
              speed={speed}
              setSpeed={setSpeed}
              exaggeration={exaggeration}
              setExaggeration={setExaggeration}
              advancedSettings={advancedSettings}
              setAdvancedSettings={setAdvancedSettings}
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

          {activeTab === 'projects' && (
            <ProjectsPage
              history={history}
              onLoadHistoryIntoStudio={handleLoadHistoryIntoStudio}
              onShowToast={handleShowToast}
              onDeleteHistoryItem={handleDeleteHistoryItem}
              onClearHistory={handleClearHistory}
              onRenameHistoryItem={handleRenameHistoryItem}
              onCreateNewProject={handleCreateNewProjectAndRedirect}
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
              appearance={appearance}
              setAppearance={setAppearance}
              onClearAudioCache={handleClearAudioCache}
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
