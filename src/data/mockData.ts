import { Voice, AudioSegment, GenerationHistoryItem } from '../types';

// Import WAV files directly from assets/system audio using Vite's asset handling
import c3poPrompt from '../../assets/system audio/3cpo_prompt.wav';
import aaveFemalePrompt from '../../assets/system audio/aave_female_01_prompt.wav';
import dwightPrompt from '../../assets/system audio/dwight_prompt.wav';
import frasierPrompt from '../../assets/system audio/frasier_prompt.wav';
import genZFemalePrompt from '../../assets/system audio/gen_z_female_prompt.wav';
import herPrompt from '../../assets/system audio/her_prompt.wav';
import ivrFemale1Prompt from '../../assets/system audio/ivr_female_01_prompt.wav';
import ivrFemale2Prompt from '../../assets/system audio/ivr_female_02_prompt.wav';
import ivrMale1Prompt from '../../assets/system audio/ivr_male_01_prompt.wav';
import ivrMale2Prompt from '../../assets/system audio/ivr_male_02_prompt.wav';
import jamaicanPrompt from '../../assets/system audio/jamaican_prompt.wav';
import jerrySeinfeldPrompt from '../../assets/system audio/jerry_seinfeld_prompt.wav';
import snoopDoggPrompt from '../../assets/system audio/snoop_dogg_prompt.wav';

export const INITIAL_VOICES: Voice[] = [
  {
    id: 'voice-3cpo',
    name: 'C-3PO',
    category: 'System',
    language: 'English (US)',
    gender: 'Male',
    sampleRate: '24kHz',
    avatarColor: 'from-amber-500 to-yellow-600',
    initials: '3P',
    description: 'Protocol droid style voice. Metallic, rhythmic, and high-pitched.',
    referenceFile: {
      name: '3cpo_prompt.wav',
      duration: '00:05',
      size: '513 KB',
    },
    tags: ['Sci-Fi', 'Metallic', 'Droid'],
    systemAudioUrl: c3poPrompt,
  },
  {
    id: 'voice-aria',
    name: 'Aria (AAVE)',
    category: 'System',
    language: 'English (US)',
    gender: 'Female',
    sampleRate: '24kHz',
    avatarColor: 'from-pink-500 to-rose-600',
    initials: 'AR',
    description: 'Expressive and natural African American Vernacular English delivery.',
    referenceFile: {
      name: 'aave_female_01_prompt.wav',
      duration: '00:12',
      size: '1.2 MB',
    },
    tags: ['Expressive', 'Natural', 'Casual'],
    systemAudioUrl: aaveFemalePrompt,
  },
  {
    id: 'voice-dwight',
    name: 'Dwight',
    category: 'System',
    language: 'English (US)',
    gender: 'Male',
    sampleRate: '24kHz',
    avatarColor: 'from-blue-600 to-indigo-700',
    initials: 'DW',
    description: 'Authoritative, intense, and direct tone with high clarity.',
    referenceFile: {
      name: 'dwight_prompt.wav',
      duration: '00:14',
      size: '1.4 MB',
    },
    tags: ['Direct', 'Authoritative', 'Clarity'],
    systemAudioUrl: dwightPrompt,
  },
  {
    id: 'voice-frasier',
    name: 'Frasier',
    category: 'System',
    language: 'English (US)',
    gender: 'Male',
    sampleRate: '24kHz',
    avatarColor: 'from-orange-500 to-amber-700',
    initials: 'FR',
    description: 'Sophisticated, theatrical, and articulate mid-Atlantic accent.',
    referenceFile: {
      name: 'frasier_prompt.wav',
      duration: '00:14',
      size: '1.4 MB',
    },
    tags: ['Sophisticated', 'Theatrical', 'Articulate'],
    systemAudioUrl: frasierPrompt,
  },
  {
    id: 'voice-chloe',
    name: 'Chloe (Gen Z)',
    category: 'System',
    language: 'English (US)',
    gender: 'Female',
    sampleRate: '24kHz',
    avatarColor: 'from-teal-400 to-emerald-600',
    initials: 'CH',
    description: 'Casual, fast-paced colloquial style typical of modern dialogue.',
    referenceFile: {
      name: 'gen_z_female_prompt.wav',
      duration: '01:43',
      size: '10.3 MB',
    },
    tags: ['Casual', 'Modern', 'Gen-Z'],
    systemAudioUrl: genZFemalePrompt,
  },
  {
    id: 'voice-samantha',
    name: 'Samantha (OS)',
    category: 'System',
    language: 'English (US)',
    gender: 'Female',
    sampleRate: '24kHz',
    avatarColor: 'from-red-400 to-pink-600',
    initials: 'SA',
    description: 'Warm, intimate, breathy, and highly responsive digital assistant style.',
    referenceFile: {
      name: 'her_prompt.wav',
      duration: '00:07',
      size: '725 KB',
    },
    tags: ['Warm', 'Intimate', 'Assistant'],
    systemAudioUrl: herPrompt,
  },
  {
    id: 'voice-sarah',
    name: 'Sarah (IVR 1)',
    category: 'System',
    language: 'English (US)',
    gender: 'Female',
    sampleRate: '24kHz',
    avatarColor: 'from-purple-500 to-violet-700',
    initials: 'S1',
    description: 'Professional, clear, and steady customer service menu voice.',
    referenceFile: {
      name: 'ivr_female_01_prompt.wav',
      duration: '00:26',
      size: '2.6 MB',
    },
    tags: ['Professional', 'IVR', 'Clear'],
    systemAudioUrl: ivrFemale1Prompt,
  },
  {
    id: 'voice-emily',
    name: 'Emily (IVR 2)',
    category: 'System',
    language: 'English (US)',
    gender: 'Female',
    sampleRate: '24kHz',
    avatarColor: 'from-fuchsia-500 to-purple-600',
    initials: 'E2',
    description: 'Warm, welcoming IVR and corporate receptionist narration.',
    referenceFile: {
      name: 'ivr_female_02_prompt.wav',
      duration: '00:27',
      size: '2.7 MB',
    },
    tags: ['Warm', 'Receptionist', 'IVR'],
    systemAudioUrl: ivrFemale2Prompt,
  },
  {
    id: 'voice-marcus',
    name: 'Marcus (IVR 1)',
    category: 'System',
    language: 'English (US)',
    gender: 'Male',
    sampleRate: '24kHz',
    avatarColor: 'from-sky-500 to-blue-700',
    initials: 'M1',
    description: 'Clear, corporate narrator for phone directories and system status.',
    referenceFile: {
      name: 'ivr_male_01_prompt.wav',
      duration: '00:10',
      size: '1.0 MB',
    },
    tags: ['Narrator', 'IVR', 'Corporate'],
    systemAudioUrl: ivrMale1Prompt,
  },
  {
    id: 'voice-david',
    name: 'David (IVR 2)',
    category: 'System',
    language: 'English (US)',
    gender: 'Male',
    sampleRate: '24kHz',
    avatarColor: 'from-cyan-500 to-blue-600',
    initials: 'D2',
    description: 'Deep baritone, welcoming corporate system directory assistant.',
    referenceFile: {
      name: 'ivr_male_02_prompt.wav',
      duration: '00:27',
      size: '2.7 MB',
    },
    tags: ['Deep', 'Baritone', 'IVR'],
    systemAudioUrl: ivrMale2Prompt,
  },
  {
    id: 'voice-kofi',
    name: 'Kofi',
    category: 'System',
    language: 'English (JM)',
    gender: 'Male',
    sampleRate: '24kHz',
    avatarColor: 'from-yellow-400 to-green-600',
    initials: 'KO',
    description: 'Warm, melodic Jamaican patois inflections and speech pattern.',
    referenceFile: {
      name: 'jamaican_prompt.wav',
      duration: '00:11',
      size: '1.1 MB',
    },
    tags: ['Melodic', 'Warm', 'Dialect'],
    systemAudioUrl: jamaicanPrompt,
  },
  {
    id: 'voice-jerry',
    name: 'Jerry',
    category: 'System',
    language: 'English (US)',
    gender: 'Male',
    sampleRate: '24kHz',
    avatarColor: 'from-red-500 to-orange-600',
    initials: 'JE',
    description: 'High energy, observational comedy style voice delivery.',
    referenceFile: {
      name: 'jerry_seinfeld_prompt.wav',
      duration: '00:28',
      size: '2.8 MB',
    },
    tags: ['Energetic', 'Comedy', 'Expressive'],
    systemAudioUrl: jerrySeinfeldPrompt,
  },
  {
    id: 'voice-snoop',
    name: 'Snoop',
    category: 'System',
    language: 'English (US)',
    gender: 'Male',
    sampleRate: '24kHz',
    avatarColor: 'from-slate-700 to-zinc-900',
    initials: 'SN',
    description: 'Laid-back, rhythmic, highly recognizable West Coast style delivery.',
    referenceFile: {
      name: 'snoop_dogg_prompt.wav',
      duration: '02:36',
      size: '15.6 MB',
    },
    tags: ['Laid-back', 'Rhythmic', 'Iconic'],
    systemAudioUrl: snoopDoggPrompt,
  },
];

export const INITIAL_SEGMENTS: AudioSegment[] = [];

export const INITIAL_HISTORY: GenerationHistoryItem[] = [];

export const SAMPLE_SCRIPTS = [
  "Welcome to Voxera. This is a test of the AI voice studio. Enter your custom text to generate natural speech with full pitch and pace control.",
  "In this episode, we sit down with leading researchers to discuss zero-shot voice cloning, real-time streaming inference, and low-latency neural speech.",
  "Attention passengers, the express train to central terminal is now arriving at platform four. Please stand behind the yellow safety line.",
  "Hello everyone! Today I want to show you how easy it is to create a realistic voice clone in under ten seconds."
];
