import React, { useState, useEffect } from 'react';
import { Voice, AudioSegment, AdvancedVoiceSettings, GenerationHistoryItem } from '../../types';
import { ScriptEditor } from './ScriptEditor';
import { VoicePanel } from './VoicePanel';
import { VoicePickerModal } from './VoicePickerModal';
import { AudioComposition } from './AudioComposition';
import { AudioEngine } from '../../utils/audioEngine';
import { generateTTSWithCache } from '../../utils/api';
import { mergeAudioBlobs } from '../../utils/wavEncoder';
import { Sparkles, Trash2, Plus, Pencil } from 'lucide-react';
import { SplitConfirmModal } from './SplitConfirmModal';
import { ConfirmDialog } from '../ConfirmDialog';
import { RenameProjectModal } from './RenameProjectModal';
import { VoxeraDB } from '../../utils/db';

const splitTextIntoChunks = (input: string, maxChars: number = 400): string[] => {
  if (!input.trim()) return [];
  const sentences = input.match(/[^.!?;\n]+[.!?;\n]*/g) || [input];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    if (trimmedSentence.length > maxChars) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      const words = trimmedSentence.split(/(\s+)/);
      let subChunk = '';
      for (const word of words) {
        if ((subChunk + word).length > maxChars) {
          if (subChunk.trim()) {
            chunks.push(subChunk.trim());
          }
          subChunk = word;
        } else {
          subChunk += word;
        }
      }
      if (subChunk.trim()) {
        currentChunk = subChunk;
      }
    } else {
      if ((currentChunk + ' ' + trimmedSentence).trim().length > maxChars) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmedSentence;
      } else {
        currentChunk = (currentChunk + ' ' + trimmedSentence).trim();
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

interface StudioPageProps {
  voices: Voice[];
  selectedVoice: Voice;
  onSelectVoice: (voice: Voice) => void;
  onCreateVoiceClick: () => void;
  segments: AudioSegment[];
  setSegments: React.Dispatch<React.SetStateAction<AudioSegment[]>>;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
  backendUrl: string;
  onAddHistoryItem: (item: GenerationHistoryItem) => void;
  isBackendConnected: boolean;
  onOpenConnectionModal: () => void;
  projectName: string;
  onRenameProject: (name: string) => void;
  currentProjectId: string;
  onNewProject: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  speed: string;
  setSpeed: (sp: string) => void;
  exaggeration: string;
  setExaggeration: (ex: string) => void;
  advancedSettings: AdvancedVoiceSettings;
  setAdvancedSettings: React.Dispatch<React.SetStateAction<AdvancedVoiceSettings>>;
  setVoices?: React.Dispatch<React.SetStateAction<Voice[]>>;
}

export const StudioPage: React.FC<StudioPageProps> = ({
  voices,
  selectedVoice,
  onSelectVoice,
  onCreateVoiceClick,
  segments,
  setSegments,
  onShowToast,
  backendUrl,
  onAddHistoryItem,
  isBackendConnected,
  onOpenConnectionModal,
  projectName,
  onRenameProject,
  currentProjectId,
  onNewProject,
  language,
  setLanguage,
  speed,
  setSpeed,
  exaggeration,
  setExaggeration,
  advancedSettings,
  setAdvancedSettings,
  setVoices,
}) => {
  const [scriptText, setScriptText] = useState(
    'Welcome to Voxera. This is a test of the AI voice studio.'
  );
  const [isVoicePickerOpen, setIsVoicePickerOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState<{ current: number; total: number } | null>(null);
  const [showGenSuccessPopup, setShowGenSuccessPopup] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [splitModalState, setSplitModalState] = useState<{
    isOpen: boolean;
    textLength: number;
    chunks: string[];
  } | null>(null);
  const [isScriptExpanded, setIsScriptExpanded] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'voice'>('editor');

  // Timeline Selection & Playback State
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    segments.length > 0 ? segments[0].id : null
  );
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
  const [batchVoiceSegmentIds, setBatchVoiceSegmentIds] = useState<string[] | null>(null);

  // Sync batch selection list if segments change
  useEffect(() => {
    setBatchSelectedIds(prev => prev.filter(id => segments.some(s => s.id === id)));
  }, [segments]);

  const selectedSegment = segments.find((s) => s.id === selectedSegmentId);
  const selectedSegmentNumber = selectedSegment ? selectedSegment.segmentNumber : null;

  // Helper to resolve reference file (custom File or fetched system audio sample)
  const resolveVoiceReferenceFile = async (voice: Voice): Promise<File | undefined> => {
    if (voice.referenceFileObject) {
      return voice.referenceFileObject;
    }
    if (voice.category === 'System' && voice.systemAudioUrl) {
      try {
        const response = await fetch(voice.systemAudioUrl);
        const blob = await response.blob();
        const filename = voice.referenceFile?.name || `${voice.name.toLowerCase()}_prompt.wav`;
        return new File([blob], filename, { type: 'audio/wav' });
      } catch (err) {
        console.error('Failed to fetch system voice sample:', err);
      }
    }
    return undefined;
  };

  // Handle global project rename shortcut (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleRenameTrigger = () => {
      setIsRenameOpen(true);
    };
    window.addEventListener('voxera-rename-trigger', handleRenameTrigger);
    return () => window.removeEventListener('voxera-rename-trigger', handleRenameTrigger);
  }, []);

  // Sync Script Editor and Voice Panel when selectedSegmentId changes
  useEffect(() => {
    if (!selectedSegmentId) return;
    const seg = segments.find((s) => s.id === selectedSegmentId);
    if (seg) {
      // Only update script text if it actually differs to avoid re-render cascades
      setScriptText((prev) => prev === seg.text ? prev : seg.text);
      if (seg.language) {
        setLanguage(seg.language);
      }
      const matchingVoice = voices.find(
        (v) => v.id === seg.voiceId || v.name.toLowerCase() === seg.voiceName.toLowerCase()
      );
      if (matchingVoice && matchingVoice.id !== selectedVoice.id) {
        onSelectVoice(matchingVoice);
      }
    }
  }, [selectedSegmentId]);

  // Auto-sync scriptText changes back to the active segment in segments array (for draft auto-saving)
  useEffect(() => {
    if (!selectedSegmentId) return;
    const activeSeg = segments.find((s) => s.id === selectedSegmentId);
    if (activeSeg && activeSeg.text !== scriptText) {
      setSegments((prev) =>
        prev.map((s) => (s.id === selectedSegmentId ? { ...s, text: scriptText } : s))
      );
    }
  }, [scriptText, selectedSegmentId]);

  // Handler for editing script text
  const handleScriptTextChange = (text: string) => {
    setScriptText(text);
  };

  // Handler for selecting voice
  const handleVoiceSelect = (voice: Voice) => {
    if (batchVoiceSegmentIds) {
      handleUpdateSegmentsVoice(batchVoiceSegmentIds, voice.id, voice.name);
      setBatchVoiceSegmentIds(null);
      setIsVoicePickerOpen(false);
    } else {
      onSelectVoice(voice);
    }
  };

  // Handler for changing language
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
  };



  // Keyboard shortcut Ctrl+Enter to trigger generation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (scriptText.trim().length > 0 && !isGenerating) {
          handleGenerateStudio();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scriptText, isGenerating]);

  // Generate single output from studio editor text
  const handleGenerateStudio = async () => {
    if (!isBackendConnected) {
      onOpenConnectionModal();
      return;
    }

    if (scriptText.length > 400) {
      const chunks = splitTextIntoChunks(scriptText);
      setSplitModalState({
        isOpen: true,
        textLength: scriptText.length,
        chunks,
      });
      return;
    }

    setIsGenerating(true);
    onShowToast('Generating speech...', `Synthesizing with ${selectedVoice.name}`, 'info');

    try {
      const referenceFile = await resolveVoiceReferenceFile(selectedVoice);
      const blob = await generateTTSWithCache(
        backendUrl,
        {
          text: scriptText,
          exaggeration: parseFloat(exaggeration) || 0.5,
          cfg_weight: advancedSettings.cfgScale,
          temperature: advancedSettings.temperature,
          seed: advancedSettings.seed,
          model: advancedSettings.model,
          language: language,
        },
        selectedVoice.id,
        referenceFile
      );

      const audioUrl = URL.createObjectURL(blob);
      let durationSec = Math.max(3.5, Number((scriptText.length * 0.08).toFixed(1)));
      let waveformPeaks = Array.from({ length: 20 }, () => Math.random() * 0.7 + 0.3);

      try {
        const arrayBuffer = await blob.arrayBuffer();
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const tempCtx = new AudioContextClass();
        const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        durationSec = Number(audioBuffer.duration.toFixed(1));

        const channelData = audioBuffer.getChannelData(0);
        const sampleStep = Math.floor(channelData.length / 20) || 1;
        const peaks: number[] = [];
        for (let i = 0; i < 20; i++) {
          let max = 0;
          const start = i * sampleStep;
          const end = Math.min(start + sampleStep, channelData.length);
          for (let j = start; j < end; j++) {
            const val = Math.abs(channelData[j]);
            if (val > max) max = val;
          }
          peaks.push(max);
        }
        const maxPeak = Math.max(...peaks);
        waveformPeaks = peaks.map(p => {
          if (maxPeak === 0) return 0.2;
          return Number(Math.max(0.2, (p / maxPeak) * 0.9).toFixed(2));
        });
      } catch (err) {
        console.warn('Failed to extract audio peaks, using estimated waveform:', err);
      }

      let updatedSegments: AudioSegment[] = [];
      if (selectedSegmentId && segments.some((s) => s.id === selectedSegmentId)) {
        updatedSegments = segments.map((s) =>
          s.id === selectedSegmentId
            ? {
                ...s,
                text: scriptText,
                voiceId: selectedVoice.id,
                voiceName: selectedVoice.name,
                language: language,
                durationSec: durationSec,
                waveformPeaks: waveformPeaks,
                audioUrl: audioUrl,
                audioBlob: blob,
                isGenerating: false,
              }
            : s
        );
        setSegments(updatedSegments);
        const targetSeg = segments.find((s) => s.id === selectedSegmentId);
        const segNum = targetSeg ? targetSeg.segmentNumber : 1;
        const isFirstGen = targetSeg ? targetSeg.durationSec === 0 : true;
        onShowToast(
          isFirstGen ? 'Speech segment generated!' : 'Segment re-generated!',
          isFirstGen
            ? `Segment 0${segNum} generated with backend WAV (${durationSec}s)`
            : `Segment 0${segNum} updated with backend WAV (${durationSec}s)`,
          'success'
        );
      } else {
        const nextSegNum = segments.length + 1;
        const newSeg: AudioSegment = {
          id: `seg-${Date.now()}`,
          segmentNumber: nextSegNum,
          text: scriptText,
          voiceId: selectedVoice.id,
          voiceName: selectedVoice.name,
          language: language,
          durationSec: durationSec,
          createdAt: 'Just now',
          waveformPeaks: waveformPeaks,
          audioUrl: audioUrl,
          audioBlob: blob,
        };

        updatedSegments = [...segments, newSeg];
        setSegments(updatedSegments);
        setSelectedSegmentId(newSeg.id);
        onShowToast(
          'Speech segment generated!',
          `Segment 0${nextSegNum} added to timeline (${durationSec}s)`,
          'success'
        );
      }

      // Add this new generation to History store
      const segmentTitle = selectedSegmentId
        ? `Generated Segment #${selectedSegmentNumber || 1}`
        : `Generated Segment #${segments.length + 1}`;

      const cleanSegments = updatedSegments.map((s) => {
        const copy = { ...s };
        delete copy.audioUrl;
        delete copy.isGenerating;
        return copy;
      });

      const newHistoryItem: GenerationHistoryItem = {
        id: `hist-${Date.now()}`,
        projectId: currentProjectId,
        title: projectName === 'Untitled Composition' ? segmentTitle : projectName,
        status: 'draft',
        voiceId: selectedVoice.id,
        voiceName: selectedVoice.name,
        voicesSummary: Array.from(new Set(updatedSegments.map(s => s.voiceName))).join(', '),
        language: language,
        duration: `${durationSec}s`,
        durationSec: durationSec,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        segmentsCount: updatedSegments.length,
        scriptSnippet: scriptText.length > 60 ? `${scriptText.slice(0, 60)}...` : scriptText,
        fullScript: scriptText,
        audioBlob: blob,
        segments: cleanSegments,
        generationType: 'segment',
      };
      onAddHistoryItem(newHistoryItem);
    } catch (error: any) {
      console.error('Error during TTS generation:', error);
      onShowToast(
        'Speech generation failed',
        error.message || 'Make sure the backend server is running.',
        'error'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportLongScript = async (chunks: string[], autoGenerate: boolean = true) => {
    if (chunks.length === 0) return;

    if (autoGenerate && !isBackendConnected) {
      onShowToast('Backend Offline', 'Please connect your inference backend server to generate speech.', 'error');
      onOpenConnectionModal();
      return;
    }

    // prefix is everything before the insert/replace point
    let prefix: AudioSegment[] = [];
    let suffix: AudioSegment[] = [];
    let insertIdx = segments.length;

    if (selectedSegmentId) {
      const idx = segments.findIndex((s) => s.id === selectedSegmentId);
      if (idx !== -1) {
        insertIdx = idx;
        prefix = segments.slice(0, insertIdx);
        suffix = segments.slice(insertIdx + 1);
      } else {
        prefix = [...segments];
      }
    } else {
      prefix = [...segments];
    }

    const newSegments: AudioSegment[] = chunks.map((chunk, idx) => ({
      id: `seg-import-${Date.now()}-${idx}`,
      segmentNumber: prefix.length + idx + 1,
      text: chunk,
      voiceId: selectedVoice.id,
      voiceName: selectedVoice.name,
      language: language,
      durationSec: 0.0,
      createdAt: 'Just now',
      waveformPeaks: Array.from({ length: 20 }, () => 0.2),
      isGenerating: autoGenerate,
    }));

    // Re-number suffix segments sequentially
    const updatedSuffix = suffix.map((s, idx) => ({
      ...s,
      segmentNumber: prefix.length + newSegments.length + idx + 1,
    }));

    const finalSegments = [...prefix, ...newSegments, ...updatedSuffix];

    setSegments(finalSegments);
    setSelectedSegmentId(newSegments[0].id);
    setScriptText(newSegments[0].text);

    if (autoGenerate) {
      // Run generations sequentially in the background
      const generateSequentially = async (segsToGenerate: AudioSegment[]) => {
        setIsGenerating(true);
        setGeneratingProgress({ current: 0, total: segsToGenerate.length });
        onShowToast('Import successful', `Processing ${segsToGenerate.length} segments in background...`, 'info');

        const generatedBlobs: Blob[] = [];
        let totalDurationSec = 0;
        let combinedText = '';

        // Keep an in-memory copy of the entire updated segments array to capture the final state cleanly
        let currentSegmentsState = [...finalSegments];

        for (let i = 0; i < segsToGenerate.length; i++) {
          const seg = segsToGenerate[i];

          try {
            const referenceFile = await resolveVoiceReferenceFile(selectedVoice);
            const blob = await generateTTSWithCache(
              backendUrl,
              {
                text: seg.text,
                exaggeration: parseFloat(exaggeration) || 0.5,
                cfg_weight: advancedSettings.cfgScale,
                temperature: advancedSettings.temperature,
                seed: advancedSettings.seed,
                model: advancedSettings.model,
                language: seg.language || language,
              },
              selectedVoice.id,
              referenceFile
            );

            const audioUrl = URL.createObjectURL(blob);
            let durationSec = Math.max(3.5, Number((seg.text.length * 0.08).toFixed(1)));
            let waveformPeaks = Array.from({ length: 20 }, () => Math.random() * 0.7 + 0.3);

            try {
              const arrayBuffer = await blob.arrayBuffer();
              const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
              const tempCtx = new AudioContextClass();
              const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
              durationSec = Number(audioBuffer.duration.toFixed(1));

              const channelData = audioBuffer.getChannelData(0);
              const sampleStep = Math.floor(channelData.length / 20) || 1;
              const peaks: number[] = [];
              for (let pIdx = 0; pIdx < 20; pIdx++) {
                const start = pIdx * sampleStep;
                const end = Math.min(start + sampleStep, channelData.length);
                let max = 0;
                for (let j = start; j < end; j++) {
                  const val = Math.abs(channelData[j]);
                  if (val > max) max = val;
                }
                peaks.push(max);
              }
              const maxPeak = Math.max(...peaks);
              waveformPeaks = peaks.map(p => {
                if (maxPeak === 0) return 0.2;
                return Number(Math.max(0.2, (p / maxPeak) * 0.9).toFixed(2));
              });
            } catch (err) {
              console.warn('Failed to extract audio peaks, using estimated waveform:', err);
            }

            // Update in-memory copy of segments
            currentSegmentsState = currentSegmentsState.map((s) =>
              s.id === seg.id
                ? {
                    ...s,
                    durationSec: durationSec,
                    waveformPeaks: waveformPeaks,
                    audioUrl: audioUrl,
                    audioBlob: blob,
                    isGenerating: false,
                  }
                : s
            );

            // Update React state
            setSegments(currentSegmentsState);

            // Accumulate details for the single combined project history item
            generatedBlobs.push(blob);
            totalDurationSec += durationSec;
            combinedText += (combinedText ? ' ' : '') + seg.text;

            setGeneratingProgress({ current: i + 1, total: segsToGenerate.length });

          } catch (err: any) {
            console.error(`Failed to generate segment ${seg.segmentNumber}:`, err);
            onShowToast(
              `Segment 0${seg.segmentNumber} Failed`,
              err.message || 'Error occurred during synthesis.',
              'error'
            );
            
            currentSegmentsState = currentSegmentsState.map((s) =>
              s.id === seg.id
                ? {
                    ...s,
                    isGenerating: false,
                  }
                : s
            );
            setSegments(currentSegmentsState);
            setGeneratingProgress({ current: i + 1, total: segsToGenerate.length });
          }
        }

        // Add a single consolidated Project history item after all segments are processed
        if (generatedBlobs.length > 0) {
          try {
            const cleanSegments = currentSegmentsState.map((s) => {
              const copy = { ...s };
              delete copy.audioUrl;
              delete copy.isGenerating;
              return copy;
            });
            const mergedBlob = await mergeAudioBlobs(generatedBlobs);
             const newHistoryItem: GenerationHistoryItem = {
              id: `project-${Date.now()}`,
              projectId: currentProjectId,
              title: projectName === 'Untitled Composition' ? `Imported Script Project (${generatedBlobs.length} segments)` : projectName,
              status: 'draft',
              voiceId: selectedVoice.id,
              voiceName: selectedVoice.name,
              voicesSummary: Array.from(new Set(currentSegmentsState.map(s => s.voiceName))).join(', '),
              language: language,
              duration: `${totalDurationSec.toFixed(1)}s`,
              durationSec: totalDurationSec,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              segmentsCount: generatedBlobs.length,
              scriptSnippet: combinedText.length > 100 ? `${combinedText.slice(0, 100)}...` : combinedText,
              fullScript: combinedText,
              audioBlob: mergedBlob,
              segments: cleanSegments,
              generationType: 'segment',
            };
            onAddHistoryItem(newHistoryItem);
          } catch (mergeErr) {
            console.error('Failed to merge batch project audio for history:', mergeErr);
          }
        }

        setIsGenerating(false);
        setGeneratingProgress(null);
        setShowGenSuccessPopup(true);
        onShowToast('Script fully generated!', `Successfully processed all segments.`, 'success');
      };

      generateSequentially(newSegments);
    } else {
      onShowToast(
        'Segments created',
        `Split script into ${newSegments.length} segments. Click 'Generate' on each segment to synthesize speech manually.`,
        'success'
      );
    }
  };

  const handleGenerateRemaining = async () => {
    if (!isBackendConnected) {
      onShowToast('Backend Offline', 'Please connect your inference backend server to generate speech.', 'error');
      onOpenConnectionModal();
      return;
    }

    const remainingSegs = segments.filter((s) => !s.audioBlob && !s.audioUrl);
    if (remainingSegs.length === 0) {
      onShowToast('All segments generated', 'There are no remaining segments left to generate.', 'info');
      return;
    }

    // Mark remaining segments as generating in UI
    setSegments((prev) =>
      prev.map((s) =>
        !s.audioBlob && !s.audioUrl ? { ...s, isGenerating: true } : s
      )
    );

    setIsGenerating(true);
    setGeneratingProgress({ current: 0, total: remainingSegs.length });
    onShowToast('Generating remaining...', `Processing ${remainingSegs.length} segments in background...`, 'info');

    const generatedBlobs: Blob[] = [];
    let totalDurationSec = 0;
    let combinedText = '';

    // Keep an in-memory copy of the entire updated segments array to capture the final state cleanly
    let currentSegmentsState = [...segments].map((s) =>
      !s.audioBlob && !s.audioUrl ? { ...s, isGenerating: true } : s
    );

    for (let i = 0; i < remainingSegs.length; i++) {
      const seg = remainingSegs[i];

      try {
        const matchingVoice = voices.find(v => v.id === seg.voiceId) || selectedVoice;
        const referenceFile = await resolveVoiceReferenceFile(matchingVoice);
        const blob = await generateTTSWithCache(
          backendUrl,
          {
            text: seg.text,
            exaggeration: parseFloat(exaggeration) || 0.5,
            cfg_weight: advancedSettings.cfgScale,
            temperature: advancedSettings.temperature,
            seed: advancedSettings.seed,
            model: advancedSettings.model,
            language: seg.language || language,
          },
          matchingVoice.id,
          referenceFile
        );

        const audioUrl = URL.createObjectURL(blob);
        let durationSec = Math.max(3.5, Number((seg.text.length * 0.08).toFixed(1)));
        let waveformPeaks = Array.from({ length: 20 }, () => Math.random() * 0.7 + 0.3);

        try {
          const arrayBuffer = await blob.arrayBuffer();
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const tempCtx = new AudioContextClass();
          const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
          durationSec = Number(audioBuffer.duration.toFixed(1));

          const channelData = audioBuffer.getChannelData(0);
          const sampleStep = Math.floor(channelData.length / 20) || 1;
          const peaks: number[] = [];
          for (let pIdx = 0; pIdx < 20; pIdx++) {
            const start = pIdx * sampleStep;
            const end = Math.min(start + sampleStep, channelData.length);
            let max = 0;
            for (let j = start; j < end; j++) {
              const val = Math.abs(channelData[j]);
              if (val > max) max = val;
            }
            peaks.push(max);
          }
          const maxPeak = Math.max(...peaks);
          waveformPeaks = peaks.map(p => {
            if (maxPeak === 0) return 0.2;
            return Number(Math.max(0.2, (p / maxPeak) * 0.9).toFixed(2));
          });
        } catch (err) {
          console.warn('Failed to extract audio peaks, using estimated waveform:', err);
        }

        // Update in-memory copy of segments
        currentSegmentsState = currentSegmentsState.map((s) =>
          s.id === seg.id
            ? {
                ...s,
                durationSec: durationSec,
                waveformPeaks: waveformPeaks,
                audioUrl: audioUrl,
                audioBlob: blob,
                isGenerating: false,
              }
            : s
        );

        // Update React state
        setSegments(currentSegmentsState);

        // Accumulate details for history item
        generatedBlobs.push(blob);
        totalDurationSec += durationSec;
        combinedText += (combinedText ? ' ' : '') + seg.text;

        setGeneratingProgress({ current: i + 1, total: remainingSegs.length });

      } catch (err: any) {
        console.error(`Failed to generate segment ${seg.segmentNumber}:`, err);
        onShowToast(
          `Segment 0${seg.segmentNumber} Failed`,
          err.message || 'Error occurred during synthesis.',
          'error'
        );
        
        currentSegmentsState = currentSegmentsState.map((s) =>
          s.id === seg.id
            ? {
                ...s,
                isGenerating: false,
              }
            : s
        );
        setSegments(currentSegmentsState);
        setGeneratingProgress({ current: i + 1, total: remainingSegs.length });
      }
    }

    // Add a single consolidated Project history item after all remaining segments are processed
    if (generatedBlobs.length > 0) {
      try {
        const cleanSegments = currentSegmentsState.map((s) => {
          const copy = { ...s };
          delete copy.audioUrl;
          delete copy.isGenerating;
          return copy;
        });
        const mergedBlob = await mergeAudioBlobs(generatedBlobs);
        const newHistoryItem: GenerationHistoryItem = {
          id: `project-${Date.now()}`,
          projectId: currentProjectId,
          title: projectName === 'Untitled Composition' ? `Generated Remaining (${generatedBlobs.length} segments)` : `${projectName} (Remaining)`,
          status: 'draft',
          voiceId: selectedVoice.id,
          voiceName: selectedVoice.name,
          voicesSummary: Array.from(new Set(currentSegmentsState.map(s => s.voiceName))).join(', '),
          language: language,
          duration: `${totalDurationSec.toFixed(1)}s`,
          durationSec: totalDurationSec,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          segmentsCount: generatedBlobs.length,
          scriptSnippet: combinedText.length > 100 ? `${combinedText.slice(0, 100)}...` : combinedText,
          fullScript: combinedText,
          audioBlob: mergedBlob,
          segments: cleanSegments,
          generationType: 'segment',
        };
        onAddHistoryItem(newHistoryItem);
      } catch (mergeErr) {
        console.error('Failed to merge remaining project audio for history:', mergeErr);
      }
    }

    setIsGenerating(false);
    setGeneratingProgress(null);
    setShowGenSuccessPopup(true);
    onShowToast('Remaining segments generated!', `Successfully processed all remaining segments.`, 'success');
  };

  // Add Generation (Plus button on timeline)
  const handleAddGenerationClick = () => {
    const nextSegNum = segments.length + 1;
    const newSeg: AudioSegment = {
      id: `seg-inserted-${Date.now()}`,
      segmentNumber: nextSegNum,
      text: '', // Start empty
      voiceId: selectedVoice.id,
      voiceName: selectedVoice.name,
      language: language,
      durationSec: 0.0,
      createdAt: new Date().toISOString(),
      waveformPeaks: Array.from({ length: 20 }, () => 0.2),
    };

    setSegments((prev) => [...prev, newSeg]);
    setSelectedSegmentId(newSeg.id);
    setScriptText('');
    onShowToast('New segment added', `Added blank segment draft S0${nextSegNum}`, 'success');
  };

  // Segment Actions
  const handleDeleteSegment = (id: string) => {
    setSegments((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      const reindexed = remaining.map((s, idx) => ({
        ...s,
        segmentNumber: idx + 1,
      }));
      if (selectedSegmentId === id) {
        setSelectedSegmentId(reindexed.length > 0 ? reindexed[0].id : null);
      }
      return reindexed;
    });
    onShowToast('Segment removed', 'Updated timeline composition', 'info');
  };

  const handleInsertSegment = (index: number) => {
    const newSeg: AudioSegment = {
      id: `seg-inserted-${Date.now()}`,
      segmentNumber: index + 1,
      text: '', // Start empty
      voiceId: selectedVoice.id,
      voiceName: selectedVoice.name,
      language: language,
      durationSec: 0.0,
      createdAt: 'Just now',
      waveformPeaks: Array.from({ length: 20 }, () => 0.2),
    };

    setSegments((prev) => {
      const updated = [...prev];
      updated.splice(index, 0, newSeg);
      return updated.map((s, idx) => ({
        ...s,
        segmentNumber: idx + 1,
      }));
    });

    setSelectedSegmentId(newSeg.id);
    setScriptText('');
    onShowToast('New segment inserted', `Added blank segment at position 0${index + 1}`, 'success');
  };

  const handleRegenerateSegment = async (id: string) => {
    const targetSeg = segments.find(s => s.id === id);
    if (!targetSeg) return;

    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isGenerating: true } : s))
    );

    try {
      const matchingVoice = voices.find(v => v.id === targetSeg.voiceId) || selectedVoice;
      
      const referenceFile = await resolveVoiceReferenceFile(matchingVoice);
      const blob = await generateTTSWithCache(
        backendUrl,
        {
          text: targetSeg.text,
          exaggeration: parseFloat(exaggeration) || 0.5,
          cfg_weight: advancedSettings.cfgScale,
          temperature: advancedSettings.temperature,
          seed: advancedSettings.seed,
          model: advancedSettings.model,
          language: targetSeg.language || language,
        },
        matchingVoice.id,
        referenceFile
      );

      const audioUrl = URL.createObjectURL(blob);
      let durationSec = targetSeg.durationSec;
      let waveformPeaks = targetSeg.waveformPeaks;

      try {
        const arrayBuffer = await blob.arrayBuffer();
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const tempCtx = new AudioContextClass();
        const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        durationSec = Number(audioBuffer.duration.toFixed(1));

        const channelData = audioBuffer.getChannelData(0);
        const sampleStep = Math.floor(channelData.length / 20) || 1;
        const peaks: number[] = [];
        for (let i = 0; i < 20; i++) {
          let max = 0;
          const start = i * sampleStep;
          const end = Math.min(start + sampleStep, channelData.length);
          for (let j = start; j < end; j++) {
            const val = Math.abs(channelData[j]);
            if (val > max) max = val;
          }
          peaks.push(max);
        }
        const maxPeak = Math.max(...peaks);
        waveformPeaks = peaks.map(p => {
          if (maxPeak === 0) return 0.2;
          return Number(Math.max(0.2, (p / maxPeak) * 0.9).toFixed(2));
        });
      } catch (err) {
        console.warn('Failed to parse audio peaks for regeneration:', err);
      }
      // Update the segments list and set it
      const updatedSegments = segments.map((s) =>
        s.id === id
          ? {
              ...s,
              durationSec: durationSec,
              waveformPeaks: waveformPeaks,
              audioUrl: audioUrl,
              audioBlob: blob,
              isGenerating: false,
            }
          : s
      );
      setSegments(updatedSegments);
      onShowToast('Segment regenerated', `Successfully updated Segment 0${targetSeg.segmentNumber}`, 'success');

      // Add regenerated segment to history as well
      const cleanSegments = updatedSegments.map((s) => {
        const copy = { ...s };
        delete copy.audioUrl;
        delete copy.isGenerating;
        return copy;
      });

      const newHistoryItem: GenerationHistoryItem = {
        id: `hist-${Date.now()}`,
        projectId: currentProjectId,
        title: projectName === 'Untitled Composition' ? `Regenerated Segment #${targetSeg.segmentNumber}` : projectName,
        status: 'draft',
        voiceId: targetSeg.voiceId,
        voiceName: targetSeg.voiceName,
        voicesSummary: Array.from(new Set(updatedSegments.map(s => s.voiceName))).join(', '),
        language: targetSeg.language || 'English',
        duration: `${durationSec}s`,
        durationSec: durationSec,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        segmentsCount: updatedSegments.length,
        scriptSnippet: targetSeg.text.length > 60 ? `${targetSeg.text.slice(0, 60)}...` : targetSeg.text,
        fullScript: targetSeg.text,
        audioBlob: blob,
        segments: cleanSegments,
        generationType: 'regeneration',
      };
      onAddHistoryItem(newHistoryItem);
    } catch (error: any) {
      console.error('Error during segment regeneration:', error);
      setSegments((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isGenerating: false } : s))
      );
      onShowToast('Regeneration failed', error.message || 'Error communicating with backend', 'error');
    }
  };

  const handleRegenerateSegments = async (ids: string[]) => {
    onShowToast('Batch synthesis started', `Synthesizing ${ids.length} segments...`, 'info');
    for (const id of ids) {
      await handleRegenerateSegment(id);
    }
    setBatchSelectedIds([]);
    onShowToast('Batch synthesis complete', `Successfully synthesized all ${ids.length} segments`, 'success');
  };

  const handleDeleteSegments = (ids: string[]) => {
    setSegments((prev) => {
      const remaining = prev.filter((s) => !ids.includes(s.id));
      const reindexed = remaining.map((s, idx) => ({
        ...s,
        segmentNumber: idx + 1,
      }));
      if (selectedSegmentId && ids.includes(selectedSegmentId)) {
        setSelectedSegmentId(reindexed.length > 0 ? reindexed[0].id : null);
      }
      return reindexed;
    });
    setBatchSelectedIds([]);
    onShowToast('Segments removed', `Deleted ${ids.length} segments from timeline`, 'info');
  };

  const handleUpdateSegmentsVoice = (ids: string[], voiceId: string, voiceName: string) => {
    setSegments((prev) =>
      prev.map((s) => (ids.includes(s.id) ? { ...s, voiceId, voiceName } : s))
    );
    setBatchSelectedIds([]);
    onShowToast('Voices updated', `Changed voice of ${ids.length} segments to ${voiceName}`, 'success');
  };

  const handleUpdateSegmentText = (id: string, newText: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text: newText } : s))
    );
    if (selectedSegmentId === id) {
      setScriptText(newText);
    }
    onShowToast('Segment text updated', 'Saved script changes', 'success');
  };



  const handleDownloadComposition = async (format: string) => {
    onShowToast('Exporting Composition', `Preparing your voxera_composition.${format} export…`, 'info');

    const blobsToMerge: Blob[] = [];
    
    try {
      for (const seg of segments) {
        if (seg.audioUrl) {
          const res = await fetch(seg.audioUrl);
          if (res.ok) {
            const blob = await res.blob();
            blobsToMerge.push(blob);
          }
        }
      }

      if (blobsToMerge.length === 0) {
        throw new Error('No generated segment audio found. Generate speech first.');
      }

      // Merge blobs using client-side wavEncoder
      const mergedBlob = await mergeAudioBlobs(blobsToMerge);

      // Map formats to their appropriate MIME types
      let mimeType = 'audio/wav';
      if (format === 'mp3') mimeType = 'audio/mpeg';
      else if (format === 'flac') mimeType = 'audio/flac';
      else if (format === 'm4a') mimeType = 'audio/mp4';

      // Create a new Blob wrapper with the target MIME type
      const arrayBuffer = await mergedBlob.arrayBuffer();
      const formattedBlob = new Blob([arrayBuffer], { type: mimeType });
      const url = URL.createObjectURL(formattedBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `voxera_composition.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Add merged master project to history
      let totalDurationSec = 0;
      let combinedText = '';
      for (const seg of segments) {
        totalDurationSec += seg.durationSec;
        combinedText += (combinedText ? ' ' : '') + seg.text;
      }

      const cleanSegments = segments.map((s) => {
        const copy = { ...s };
        delete copy.audioUrl;
        delete copy.isGenerating;
        return copy;
      });

      const projectHistoryItem: GenerationHistoryItem = {
        id: `project-export-${Date.now()}`,
        projectId: currentProjectId,
        title: projectName === 'Untitled Composition' ? 'Composition Master Export' : `${projectName} (Master Export)`,
        status: 'exported',
        voiceId: selectedVoice.id,
        voiceName: selectedVoice.name,
        voicesSummary: Array.from(new Set(segments.map(s => s.voiceName))).join(', '),
        language: language,
        duration: `${totalDurationSec.toFixed(1)}s`,
        durationSec: totalDurationSec,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        segmentsCount: segments.length,
        scriptSnippet: combinedText.length > 100 ? `${combinedText.slice(0, 100)}...` : combinedText,
        fullScript: combinedText,
        audioBlob: mergedBlob,
        segments: cleanSegments,
        generationType: 'master-export',
      };
      onAddHistoryItem(projectHistoryItem);
      
      onShowToast('Composition exported!', 'Combined tracks downloaded as single WAV master.', 'success');
    } catch (err: any) {
      console.error('Failed to merge audio composition:', err);
      // Fallback: download text composition manifest
      onShowToast('Export fallback', 'Real audio absent. Downloading script manifest text.', 'info');
      const infoText = `Voxera Script Composition Export\n` +
                       `================================\n` +
                       `Segments: ${segments.length}\n` +
                       `Script Text:\n` +
                       segments.map(s => `[S0${s.segmentNumber}] (${s.voiceName}): ${s.text}`).join('\n');

      const blob = new Blob([new TextEncoder().encode(infoText)], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voxera_composition_script.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleClearComposition = () => {
    AudioEngine.stop();
    setSegments([]);
    setSelectedSegmentId(null);
    onRenameProject('Untitled Composition');
    onNewProject();
    setIsRenameOpen(true);
    onShowToast('Timeline cleared', 'Timeline cleared. Enter a name for your new project.', 'info');
  };

  const handleExportProject = async () => {
    onShowToast('Exporting Project', 'Preparing project export package...', 'info');
    try {
      const fileToBase64 = (blobOrFile: Blob | File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blobOrFile);
        });
      };

      // 1. Process custom voices (reference files)
      const serializedVoices = await Promise.all(
        voices.map(async (v) => {
          let referenceFileBase64 = null;
          if (v.category === 'Custom' && v.referenceFileObject) {
            try {
              referenceFileBase64 = await fileToBase64(v.referenceFileObject);
            } catch (err) {
              console.warn(`Failed to serialize reference file for voice ${v.name}:`, err);
            }
          }
          return {
            ...v,
            referenceFileBase64,
          };
        })
      );

      // 2. Process segment audio blobs
      const serializedSegments = await Promise.all(
        segments.map(async (seg) => {
          let audioBlobBase64 = null;
          if (seg.audioBlob) {
            try {
              audioBlobBase64 = await fileToBase64(seg.audioBlob);
            } catch (err) {
              console.warn(`Failed to serialize audio blob for segment S0${seg.segmentNumber}:`, err);
            }
          } else if (seg.audioUrl) {
            try {
              const res = await fetch(seg.audioUrl);
              if (res.ok) {
                const blob = await res.blob();
                audioBlobBase64 = await fileToBase64(blob);
              }
            } catch (err) {
              console.warn(`Failed to fetch and serialize audio URL for segment S0${seg.segmentNumber}:`, err);
            }
          }
          return {
            ...seg,
            audioBlobBase64,
          };
        })
      );

      // 3. Compile project export bundle
      const exportBundle = {
        voxeraVersion: '1.0',
        projectName,
        projectId: currentProjectId,
        language,
        speed,
        exaggeration,
        advancedSettings,
        segments: serializedSegments,
        voices: serializedVoices,
      };

      const jsonStr = JSON.stringify(exportBundle, null, 2);
      const jsonBlob = new Blob([jsonStr], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);

      const cleanProjectName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const downloadName = `voxera_project_${cleanProjectName}.json`;

      const a = document.createElement('a');
      a.href = jsonUrl;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(jsonUrl);

      onShowToast('Project Exported!', `Saved project configuration & voice references to ${downloadName}`, 'success');
    } catch (err: any) {
      console.error('Failed to export project:', err);
      onShowToast('Export Failed', 'An error occurred while compiling the project package.', 'error');
    }
  };

  const handleImportProject = async (file: File) => {
    onShowToast('Importing Project', `Reading project file: ${file.name}...`, 'info');
    try {
      const text = await file.text();
      const bundle = JSON.parse(text);

      if (bundle.voxeraVersion !== '1.0' && !bundle.projectName) {
        throw new Error('Invalid project file format.');
      }

      const base64ToBlob = (dataUrl: string): Blob => {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'audio/wav';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
      };

      const base64ToFile = (dataUrl: string, filename: string): File => {
        const blob = base64ToBlob(dataUrl);
        return new File([blob], filename, { type: blob.type });
      };

      // 1. Restore settings
      if (bundle.projectName) onRenameProject(bundle.projectName);
      if (bundle.language) setLanguage(bundle.language);
      if (bundle.speed) setSpeed(bundle.speed);
      if (bundle.exaggeration) setExaggeration(bundle.exaggeration);
      if (bundle.advancedSettings) setAdvancedSettings(bundle.advancedSettings);

      // 2. Restore custom voices and inject into global voices list
      if (bundle.voices && Array.isArray(bundle.voices) && setVoices) {
        const newVoicesToAdd: Voice[] = [];
        for (const v of bundle.voices) {
          if (v.category === 'Custom') {
            const existingVoice = voices.find(existing => existing.id === v.id);
            let restoredVoice = { ...v };
            delete restoredVoice.referenceFileBase64;

            if (v.referenceFileBase64 && v.referenceFile?.name) {
              restoredVoice.referenceFileObject = base64ToFile(v.referenceFileBase64, v.referenceFile.name);
            }

            // Save to IndexedDB database
            await VoxeraDB.saveVoice(restoredVoice);

            if (!existingVoice) {
              newVoicesToAdd.push(restoredVoice);
            } else {
              // Update reference file object on existing custom voice in state
              existingVoice.referenceFileObject = restoredVoice.referenceFileObject;
            }
          }
        }

        if (newVoicesToAdd.length > 0) {
          setVoices(prev => [...prev, ...newVoicesToAdd]);
        }
      }

      // 3. Restore segments (with audio)
      if (bundle.segments && Array.isArray(bundle.segments)) {
        const restoredSegments = bundle.segments.map((seg: any) => {
          const restored = { ...seg };
          delete restored.audioBlobBase64;

          if (seg.audioBlobBase64) {
            const blob = base64ToBlob(seg.audioBlobBase64);
            restored.audioBlob = blob;
            restored.audioUrl = URL.createObjectURL(blob);
          }
          return restored;
        });

        setSegments(restoredSegments);
        if (restoredSegments.length > 0) {
          setSelectedSegmentId(restoredSegments[0].id);
        } else {
          setSelectedSegmentId(null);
        }
      }

      onShowToast('Project Imported!', `Successfully loaded project "${bundle.projectName || 'Imported'}"`, 'success');
    } catch (err: any) {
      console.error('Failed to import project:', err);
      onShowToast('Import Failed', 'Failed to read or restore project file. Make sure it is a valid Voxera project export.', 'error');
    }
  };

  const [showNewProjectConfirm, setShowNewProjectConfirm] = useState(false);

  const handleNewProjectClick = () => {
    if (segments.length > 0) {
      setShowNewProjectConfirm(true);
    } else {
      handleClearComposition();
    }
  };

  return (
    <div className="p-0 flex-1 flex flex-col w-full min-h-0 overflow-hidden">
      {!isBackendConnected && (
        <button
          type="button"
          onClick={onOpenConnectionModal}
          className="bg-red-500/5 hover:bg-red-500/10 border-b border-red-500/10 px-6 py-1.5 flex items-center justify-center gap-2 shrink-0 transition-all cursor-pointer w-full animate-in fade-in duration-200 border-t-0 border-x-0 outline-none"
          title="Click to connect backend API"
        >
          <span className="flex h-1.5 w-1.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
          </span>
          <span className="text-[10px] font-bold text-red-400/90 tracking-wider uppercase">
            Inference Backend Offline (Generation Disabled) • Click to Connect
          </span>
        </button>
      )}

      {/* Top Header/Toolbar */}
      <div className="px-6 py-3 bg-[var(--bg-topbar)] border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 group/title">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setIsRenameOpen(true)} title="Rename composition project">
            <h2 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">{projectName}</h2>
            <Pencil className="w-3 h-3 text-[var(--text-dim)] group-hover/title:text-purple-400 transition-colors opacity-0 group-hover/title:opacity-100" />
          </div>
          {generatingProgress && (
            <span className="ml-3 text-[10px] bg-purple-500/10 border border-purple-500/25 px-2 py-0.5 rounded text-purple-400 font-mono font-medium animate-pulse">
              Generating: {generatingProgress.current}/{generatingProgress.total}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleNewProjectClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-semibold cursor-pointer transition-all hover:shadow-xs"
          title="Start a new project (clears timeline)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Mobile view panel toggles */}
      <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-topbar)] lg:hidden shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            mobileTab === 'editor'
              ? 'border-purple-500 text-purple-500'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          Script Editor
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('voice')}
          className={`flex-1 py-3 text-center text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            mobileTab === 'voice'
              ? 'border-purple-500 text-purple-500'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          Voice Config
        </button>
      </div>

      {/* Two-Column / Full Width Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 transition-all duration-300 flex-1 min-h-0 overflow-hidden">
        {/* Left: Script Panel */}
        <div className={`transition-all duration-300 ${isScriptExpanded ? 'lg:col-span-12' : 'lg:col-span-7 lg:border-r lg:border-[var(--border-main)]'} h-full flex-col min-h-0 overflow-hidden ${mobileTab === 'editor' ? 'flex' : 'hidden lg:flex'}`}>
          <ScriptEditor
            scriptText={scriptText}
            setScriptText={handleScriptTextChange}
            onGenerate={handleGenerateStudio}
            isGenerating={isGenerating}
            selectedSegmentNumber={selectedSegmentNumber}
            isExpanded={isScriptExpanded}
            onToggleExpand={() => setIsScriptExpanded((prev) => !prev)}
            generatingProgress={generatingProgress}
          />
        </div>

        {/* Right: Voice Panel */}
        <div className={`transition-all duration-300 ${isScriptExpanded ? 'hidden' : 'lg:col-span-5'} h-full flex-col min-h-0 overflow-hidden ${mobileTab === 'voice' ? 'flex' : 'hidden lg:flex'}`}>
          <VoicePanel
            selectedVoice={selectedVoice}
            onOpenVoicePicker={() => setIsVoicePickerOpen(true)}
            language={language}
            setLanguage={handleLanguageChange}
            speed={speed}
            setSpeed={setSpeed}
            exaggeration={exaggeration}
            setExaggeration={setExaggeration}
            advancedSettings={advancedSettings}
            setAdvancedSettings={setAdvancedSettings}
            selectedSegmentNumber={selectedSegmentNumber}
          />
        </div>
      </div>

      <AudioComposition
        segments={segments}
        voices={voices}
        selectedSegmentId={selectedSegmentId}
        onSelectSegment={setSelectedSegmentId}
        onAddGeneration={handleAddGenerationClick}
        onInsertSegment={handleInsertSegment}
        onDeleteSegment={handleDeleteSegment}
        onRegenerateSegment={handleRegenerateSegment}
        onDeleteSegments={handleDeleteSegments}
        onRegenerateSegments={handleRegenerateSegments}
        batchSelectedIds={batchSelectedIds}
        setBatchSelectedIds={setBatchSelectedIds}
        onOpenBatchVoicePicker={(ids) => {
          setBatchVoiceSegmentIds(ids);
          setIsVoicePickerOpen(true);
        }}
        onUpdateSegmentText={handleUpdateSegmentText}
        onDownloadComposition={handleDownloadComposition}
        onClearComposition={handleClearComposition}
        onGenerateRemaining={handleGenerateRemaining}
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
      />

      {/* Custom Split Script Confirmation Modal */}
      {splitModalState && splitModalState.isOpen && (
        <SplitConfirmModal
          textLength={splitModalState.textLength}
          chunksCount={splitModalState.chunks.length}
          onConfirm={(autoGenerate) => {
            handleImportLongScript(splitModalState.chunks, autoGenerate);
            setSplitModalState(null);
          }}
          onClose={() => setSplitModalState(null)}
        />
      )}

      {/* Voice Picker Modal */}
      {isVoicePickerOpen && (
        <VoicePickerModal
          voices={voices}
          selectedVoice={selectedVoice}
          onSelectVoice={handleVoiceSelect}
          onClose={() => setIsVoicePickerOpen(false)}
          onCreateVoiceClick={onCreateVoiceClick}
        />
      )}

      {/* New Project Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showNewProjectConfirm}
        title="New Project"
        description="Are you sure you want to start a new project? This will clear all segments from the timeline permanently."
        confirmLabel="Clear Timeline"
        cancelLabel="Keep Segments"
        isDanger={true}
        onConfirm={() => {
          handleClearComposition();
          setShowNewProjectConfirm(false);
        }}
        onCancel={() => setShowNewProjectConfirm(false)}
      />

      {/* Generation Success Notification Dialog */}
      <ConfirmDialog
        isOpen={showGenSuccessPopup}
        title="Generation Complete"
        description="All script segments have been successfully generated and compiled into the audio timeline. You can now preview the playhead, auto-scroll, or download the full composition."
        confirmLabel="Open Timeline"
        cancelLabel=""
        isDanger={false}
        onConfirm={() => setShowGenSuccessPopup(false)}
        onCancel={() => setShowGenSuccessPopup(false)}
      />

      {/* Rename Project Modal */}
      <RenameProjectModal
        isOpen={isRenameOpen}
        currentName={projectName}
        onSave={(newName) => {
          onRenameProject(newName);
          onShowToast('Project renamed', `New name: ${newName}`, 'success');
        }}
        onClose={() => setIsRenameOpen(false)}
      />
    </div>
  );
};
