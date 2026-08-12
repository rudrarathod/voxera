export type AppTab = 'studio' | 'voices' | 'create-voice' | 'history' | 'settings';

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

export interface GenerationHistoryItem {
  id: string;
  title: string;
  voiceId: string;
  voiceName: string;
  language: string;
  duration: string;
  durationSec: number;
  createdAt: string;
  segmentsCount: number;
  scriptSnippet: string;
  isFavorited?: boolean;
  isBookmarked?: boolean;
  audioBlob?: Blob;
  segments?: AudioSegment[];
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
