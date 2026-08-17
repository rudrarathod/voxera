export type AppTab = 'studio' | 'voices' | 'create-voice' | 'projects' | 'settings';

export interface Voice {
  id: string;
  name: string;
  category: 'Custom' | 'System';
  language: string;
  gender: 'Male' | 'Female' | 'Non-binary';
  sampleRate: string;
  avatarColor: string;
  initials: string;
  description?: string;
  referenceFile?: {
    name: string;
    duration: string;
    size: string;
  };
  referenceFileObject?: File;
  tags: string[];
  systemAudioUrl?: string;
}

export interface AudioSegment {
  id: string;
  segmentNumber: number;
  text: string;
  voiceId: string;
  voiceName: string;
  language: string;
  durationSec: number;
  createdAt: string;
  waveformPeaks: number[];
  isGenerating?: boolean;
  audioUrl?: string;
  audioBlob?: Blob;
}

export interface ProjectSettings {
  language: string;
  speed: string;
  exaggeration: string;
  advancedSettings: AdvancedVoiceSettings;
}

export interface GenerationHistoryItem {
  id: string;
  projectId?: string;                    // Grouping ID
  title: string;
  status?: 'draft' | 'exported' | 'archived'; // Lifecycle status
  voiceId: string;
  voiceName: string;
  voicesSummary?: string;               // Summary of voices used
  language: string;
  duration: string;
  durationSec: number;
  createdAt: string;                    // ISO 8601 string (or relative string for legacy)
  updatedAt?: string;                   // ISO 8601 string
  segmentsCount: number;
  scriptSnippet: string;
  fullScript?: string;                  // Full text of script
  isFavorited?: boolean;
  isBookmarked?: boolean;
  audioBlob?: Blob;
  segments?: AudioSegment[];
  generationType?: 'segment' | 'regeneration' | 'master-export';
  version?: number;
  projectSettings?: ProjectSettings;
}

export interface AdvancedVoiceSettings {
  temperature: number;
  cfgScale: number;
  seed: number;
  model: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'info' | 'error';
}

export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'info' | 'error';
  timestamp: string;
}
