import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AudioSegment, Voice } from '../../types';
import WaveSurfer from 'wavesurfer.js';
import { mergeAudioBlobs } from '../../utils/wavEncoder';
import { AudioEngine } from '../../utils/audioEngine';
import {
  Download,
  MoreVertical,
  Plus,
  RotateCw,
  Trash2,
  Edit3,
  Check,
  X,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface AudioCompositionProps {
  segments: AudioSegment[];
  voices: Voice[];
  selectedSegmentId: string | null;
  onSelectSegment: (id: string) => void;
  onAddGeneration: () => void;
  onInsertSegment?: (index: number) => void;
  onDeleteSegment: (id: string) => void;
  onRegenerateSegment: (id: string) => void;
  onUpdateSegmentText: (id: string, newText: string) => void;
  onDownloadComposition: (format: string) => void;
  onClearComposition: () => void;
  onGenerateRemaining: () => void;
  onTimeUpdate?: (time: number) => void;
  onPlayStateChange?: (playing: boolean) => void;
}

export const AudioComposition: React.FC<AudioCompositionProps> = ({
  segments,
  voices,
  selectedSegmentId,
  onSelectSegment,
  onAddGeneration,
  onInsertSegment,
  onDeleteSegment,
  onRegenerateSegment,
  onUpdateSegmentText,
  onDownloadComposition,
  onClearComposition,
  onGenerateRemaining,
  onTimeUpdate,
  onPlayStateChange,
}) => {
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isSegmentsCollapsed, setIsSegmentsCollapsed] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'wav' | 'mp3' | 'flac' | 'm4a'>('wav');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [timelineZoom, setTimelineZoom] = useState(40); // Visual pixels per second for clips

  // WaveSurfer state
  const waveformRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  // Synchronous ref to track currentTime without triggering layout effect dependencies
  const currentTimeRef = useRef(0);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const [totalDuration, setTotalDuration] = useState(0);
  const [isWaveformReady, setIsWaveformReady] = useState(false);

  // Track merged blob URL for cleanup
  const mergedUrlRef = useRef<string | null>(null);
  // Track segment fingerprint to avoid redundant merges
  const segmentFingerprintRef = useRef<string>('');

  const formats = [
    { id: 'wav', name: 'WAV', desc: 'Lossless Master Audio' },
    { id: 'mp3', name: 'MP3', desc: 'Standard Compressed' },
    { id: 'flac', name: 'FLAC', desc: 'Hi-Res Lossless' },
    { id: 'm4a', name: 'M4A', desc: 'Apple AAC Audio' },
  ] as const;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // Calculate segment visual durations & offsets
  const visualOffsets = React.useMemo(() => {
    let acc = 0;
    return segments.map((seg) => {
      // Default to 5 seconds if not synthesized yet (so it has a visual box)
      const duration = seg.durationSec > 0 ? seg.durationSec : 5;
      const start = acc;
      acc += duration;
      return { ...seg, start, end: acc, visualDuration: duration };
    });
  }, [segments]);

  // DOM Refs for high-frequency playhead positioning without React re-renders
  const playheadRef = useRef<HTMLDivElement>(null);
  const playheadTimeRef = useRef<HTMLDivElement>(null);
  
  // Dragging state
  const isDraggingRef = useRef(false);

  // Cache of timeline clip boundaries in pixels & seconds
  const clipLayoutCacheRef = useRef<{
    id: string;
    offsetLeft: number;
    offsetWidth: number;
    durationSec: number;
    visualDuration: number;
    startRealTime: number;
    startVisualTime: number;
  }[]>([]);

  // Ref tracking current playback state to avoid callback dependencies
  const isPlayingRef = useRef(false);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Track the last segment selection to throttle callback fires
  const lastSelectedIdRef = useRef<string | null>(selectedSegmentId);
  useEffect(() => {
    lastSelectedIdRef.current = selectedSegmentId;
  }, [selectedSegmentId]);

  // Throttle auto-selection during playback to avoid flickery re-renders
  const lastAutoSelectTimeRef = useRef(0);

  const checkAndSelectSegment = useCallback((id: string) => {
    if (lastSelectedIdRef.current !== id) {
      // During active playback, throttle selection changes to max 1 per 200ms
      if (isPlayingRef.current) {
        const now = performance.now();
        if (now - lastAutoSelectTimeRef.current < 200) return;
        lastAutoSelectTimeRef.current = now;
      }
      onSelectSegment(id);
      lastSelectedIdRef.current = id;
    }
  }, [onSelectSegment]);

  // Rebuild the cached boundaries for O(1) playhead position lookups
  const rebuildClipLayoutCache = useCallback(() => {
    if (!timelineRef.current) return;
    const clipsRow = timelineRef.current.querySelector('[data-clips-row]') as HTMLElement | null;
    if (!clipsRow) return;

    const clipEls = clipsRow.querySelectorAll('[data-clip-id]');
    const newCache = [];
    let realAcc = 0;
    let visualAcc = 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const el = clipEls[i] as HTMLElement | undefined;
      if (!el) continue;

      const realDur = seg.durationSec;
      const visualDur = seg.durationSec > 0 ? seg.durationSec : 5;

      newCache.push({
        id: seg.id,
        offsetLeft: el.offsetLeft,
        offsetWidth: el.offsetWidth,
        durationSec: realDur,
        visualDuration: visualDur,
        startRealTime: realAcc,
        startVisualTime: visualAcc,
      });

      realAcc += realDur;
      visualAcc += visualDur;
    }
    clipLayoutCacheRef.current = newCache;
  }, [segments]);

  // Translate timeline time into pixel left offset on the clip track
  const getPlayheadPxFromTime = useCallback((time: number) => {
    const cache = clipLayoutCacheRef.current;
    if (cache.length === 0) return 8; // padding offset default

    let lastValidPx = 8;
    for (let i = 0; i < cache.length; i++) {
      const item = cache[i];
      const itemStart = item.startVisualTime;
      const itemEnd = itemStart + item.visualDuration;

      if (time >= itemStart && time <= itemEnd) {
        const progress = item.visualDuration > 0 ? (time - itemStart) / item.visualDuration : 0;
        return item.offsetLeft + progress * item.offsetWidth;
      }
      lastValidPx = item.offsetLeft + item.offsetWidth;
    }
    return lastValidPx;
  }, []);

  // Translate pixel offset back into timeline seconds (for dragging/scrubbing clicks)
  const getTimeFromPx = useCallback((pixelX: number) => {
    const cache = clipLayoutCacheRef.current;
    if (cache.length === 0) return 0;

    // If click is before the first clip's left edge (padding area at start)
    if (pixelX < cache[0].offsetLeft) {
      return 0;
    }

    for (let i = 0; i < cache.length; i++) {
      const item = cache[i];
      const elLeft = item.offsetLeft;
      const elRight = elLeft + item.offsetWidth;
      
      // Calculate boundary including half the gap to the next element
      const nextItem = cache[i + 1];
      const boundaryRight = nextItem ? (elRight + nextItem.offsetLeft) / 2 : elRight;

      if (pixelX <= boundaryRight) {
        const clampedX = Math.max(elLeft, Math.min(elRight, pixelX));
        const progressRatio = item.offsetWidth > 0 ? (clampedX - elLeft) / item.offsetWidth : 0;
        return item.startVisualTime + progressRatio * item.visualDuration;
      }
    }

    const lastItem = cache[cache.length - 1];
    return lastItem.startVisualTime + lastItem.visualDuration;
  }, []);

  // Directly update playhead and time badge in the DOM (60 FPS) and auto-scroll timeline
  const updatePlayheadDOM = useCallback((time: number) => {
    const px = getPlayheadPxFromTime(time);
    
    if (playheadRef.current) {
      playheadRef.current.style.left = `${px}px`;
    }
    
    if (playheadTimeRef.current) {
      playheadTimeRef.current.innerText = formatTime(time);
    }

    // Auto-select the segment that the playhead is currently on
    const cache = clipLayoutCacheRef.current;
    if (cache.length > 0) {
      let matched = false;
      for (let i = 0; i < cache.length; i++) {
        const item = cache[i];
        const itemStart = item.startVisualTime;
        const itemEnd = itemStart + item.visualDuration;

        if (time >= itemStart && time < itemEnd) {
          checkAndSelectSegment(item.id);
          matched = true;
          break;
        }
      }
      // Fallback: if past the end, select the last segment
      if (!matched) {
        const lastItem = cache[cache.length - 1];
        checkAndSelectSegment(lastItem.id);
      }
    }

    // Auto-scroll timeline to follow playhead smoothly during playback
    if (isPlayingRef.current && timelineRef.current && !isDraggingRef.current) {
      const timeline = timelineRef.current;
      const viewportWidth = timeline.clientWidth;
      const currentScroll = timeline.scrollLeft;
      const pad = 60; // scroll boundary padding

      if (px > currentScroll + viewportWidth - pad) {
        timeline.scrollTo({
          left: px - viewportWidth / 2,
          behavior: 'smooth'
        });
      } else if (px < currentScroll + pad) {
        timeline.scrollTo({
          left: Math.max(0, px - viewportWidth / 2),
          behavior: 'smooth'
        });
      }
    }
  }, [getPlayheadPxFromTime, formatTime, checkAndSelectSegment]);

  // Throttled React state updates to prevent component rendering bottleneck while dragging/playing
  const lastStateUpdateTimeRef = useRef(0);
  const throttledSetCurrentTime = useCallback((time: number, force = false) => {
    const now = performance.now();
    if (force || now - lastStateUpdateTimeRef.current > 150) {
      setCurrentTime(time);
      lastStateUpdateTimeRef.current = now;
    }
  }, []);

  // Keep callback refs so they are always fresh in wavesurfer listeners
  const updatePlayheadDOMRef = useRef(updatePlayheadDOM);
  const throttledSetCurrentTimeRef = useRef(throttledSetCurrentTime);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  useEffect(() => { updatePlayheadDOMRef.current = updatePlayheadDOM; }, [updatePlayheadDOM]);
  useEffect(() => { throttledSetCurrentTimeRef.current = throttledSetCurrentTime; }, [throttledSetCurrentTime]);
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; }, [onTimeUpdate]);

  // Helper to play draft voice reference instead of browser synthesis
  const playDraftPreview = useCallback((seg: AudioSegment, onDone: () => void) => {
    const voice = voices.find(v => v.id === seg.voiceId || v.name.toLowerCase() === seg.voiceName.toLowerCase());
    if (voice) {
      if (voice.referenceFileObject) {
        AudioEngine.playAudioFile(voice.referenceFileObject, onDone);
        return;
      } else if (voice.category === 'System' && voice.systemAudioUrl) {
        fetch(voice.systemAudioUrl)
          .then(r => r.blob())
          .then(blob => AudioEngine.playAudioFile(blob, onDone))
          .catch(() => {
            AudioEngine.playSpeechPreview(seg.text, 1.0, onDone);
          });
        return;
      }
    }
    AudioEngine.playSpeechPreview(seg.text, 1.0, onDone);
  }, [voices]);

  // Start playback from a specific timeline second (supporting fallback playback chain)
  const startPlaybackFrom = useCallback((startTime: number) => {
    const ws = wavesurferRef.current;
    
    // Stop any existing fallbacks or audio engine playbacks
    AudioEngine.stop();
    setPlayingSegmentId(null);
    setIsPlaying(true);

    const playSegmentChain = (startIndex: number, offsetWithinSegment: number = 0) => {
      if (startIndex >= segments.length) {
        setIsPlaying(false);
        setPlayingSegmentId(null);
        return;
      }

      const currentSeg = segments[startIndex];
      setPlayingSegmentId(currentSeg.id);
      setIsPlaying(true);

      const onDone = () => {
        playSegmentChain(startIndex + 1, 0);
      };

      if (currentSeg.audioBlob) {
        AudioEngine.playAudioFile(currentSeg.audioBlob, onDone, offsetWithinSegment);
      } else if (currentSeg.audioUrl) {
        fetch(currentSeg.audioUrl)
          .then(r => r.blob())
          .then(b => AudioEngine.playAudioFile(b, onDone, offsetWithinSegment))
          .catch(() => {
            playDraftPreview(currentSeg, onDone);
          });
      } else {
        playDraftPreview(currentSeg, onDone);
      }
    };

    if (ws && totalDuration > 0) {
      ws.setTime(startTime);
      ws.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('WaveSurfer play failed, falling back to AudioEngine:', err);
        const targetIdx = visualOffsets.findIndex((s) => startTime >= s.start && startTime <= s.end);
        const activeIdx = targetIdx !== -1 ? targetIdx : 0;
        const targetSeg = segments[activeIdx];
        if (targetSeg) {
          const segOffset = Math.max(0, startTime - (visualOffsets[activeIdx]?.start || 0));
          playSegmentChain(activeIdx, segOffset);
        }
      });
    } else {
      // Fallback if WaveSurfer composition isn't loaded (play segment chain continuously)
      const targetIdx = visualOffsets.findIndex((s) => startTime >= s.start && startTime <= s.end);
      const activeIdx = targetIdx !== -1 ? targetIdx : 0;
      const targetSeg = segments[activeIdx];
      if (targetSeg) {
        const segOffset = Math.max(0, startTime - (visualOffsets[activeIdx]?.start || 0));
        playSegmentChain(activeIdx, segOffset);
      }
    }
  }, [segments, visualOffsets, totalDuration, playDraftPreview]);

  const totalSegmentDuration = visualOffsets.length > 0
    ? visualOffsets[visualOffsets.length - 1].end
    : 0;

  // Determine active segment based on currentTime
  const activeSegment = React.useMemo(() => {
    if (segments.length === 0) return null;
    const found = visualOffsets.find((seg) => currentTime >= seg.start && currentTime < seg.end);
    return found || segments.find((s) => s.id === selectedSegmentId) || segments[0];
  }, [currentTime, visualOffsets, segments, selectedSegmentId]);

  // Build a fingerprint of segment audio URLs to detect when we need to re-merge
  const currentFingerprint = segments
    .map((s) => s.audioUrl || s.id)
    .join('|');

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current) return;

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: 'rgba(168, 85, 247, 0.35)',
      progressColor: 'rgba(168, 85, 247, 0.85)',
      cursorColor: '#a855f7',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 48,
      normalize: true,
      fillParent: true,
      interact: true,
      dragToSeek: true,
      hideScrollbar: true,
      backend: 'WebAudio',
    });

    ws.on('play', () => {
      setIsPlaying(true);
      onPlayStateChange?.(true);
    });
    ws.on('pause', () => {
      setIsPlaying(false);
      setPlayingSegmentId(null);
      onPlayStateChange?.(false);
    });
    ws.on('finish', () => {
      setIsPlaying(false);
      setPlayingSegmentId(null);
      onPlayStateChange?.(false);
    });
    ws.on('timeupdate', (time: number) => {
      updatePlayheadDOMRef.current?.(time);
      throttledSetCurrentTimeRef.current?.(time);
      onTimeUpdateRef.current?.(time);
    });
    ws.on('ready', () => {
      const dur = ws.getDuration();
      setTotalDuration(dur);
      setIsWaveformReady(true);
    });
    ws.on('decode', () => {
      const dur = ws.getDuration();
      setTotalDuration(dur);
      setIsWaveformReady(true);
    });
    ws.on('error', (err) => {
      console.error('WaveSurfer error:', err);
      setIsWaveformReady(true); // Hide spinner on error to prevent UI blocking
    });

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
      setIsWaveformReady(false);
      if (mergedUrlRef.current) {
        URL.revokeObjectURL(mergedUrlRef.current);
        mergedUrlRef.current = null;
      }
    };
  }, []); // Only create once

  // Load merged audio when segments change
  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    // Only segments with real audio
    const audioSegments = segments.filter((s) => s.audioUrl || s.audioBlob);
    if (audioSegments.length === 0) {
      setIsWaveformReady(false);
      setTotalDuration(0);
      setCurrentTime(0);
      // Load empty — clear the waveform
      ws.empty();
      segmentFingerprintRef.current = '';
      return;
    }

    // Skip if fingerprint hasn't changed
    if (currentFingerprint === segmentFingerprintRef.current) return;

    // Snapshot playhead position BEFORE re-merge:
    // Find which segment the playhead is in, and how far through it
    let snapshotSegId: string | null = null;
    let snapshotProgress = 0; // 0-1 progress within the segment
    {
      let acc = 0;
      for (const seg of segments) {
        const dur = seg.durationSec > 0 ? seg.durationSec : 0;
        if (dur > 0 && currentTime >= acc && currentTime < acc + dur) {
          snapshotSegId = seg.id;
          snapshotProgress = (currentTime - acc) / dur;
          break;
        }
        acc += dur;
      }
    }

    segmentFingerprintRef.current = currentFingerprint;

    const loadMergedAudio = async () => {
      try {
        // Collect blobs
        const blobs: Blob[] = [];
        for (const seg of audioSegments) {
          if (seg.audioBlob) {
            blobs.push(seg.audioBlob);
          } else if (seg.audioUrl) {
            const res = await fetch(seg.audioUrl);
            if (res.ok) {
              blobs.push(await res.blob());
            }
          }
        }

        if (blobs.length === 0) return;

        let finalBlob: Blob;
        if (blobs.length === 1) {
          finalBlob = blobs[0];
        } else {
          finalBlob = await mergeAudioBlobs(blobs);
        }

        // Cleanup previous URL
        if (mergedUrlRef.current) {
          URL.revokeObjectURL(mergedUrlRef.current);
        }

        const url = URL.createObjectURL(finalBlob);
        mergedUrlRef.current = url;

        // After WaveSurfer loads, restore the playhead to the correct position
        const onReady = () => {
          ws.un('ready', onReady);
          const newDur = ws.getDuration();

          if (snapshotSegId) {
            // Recalculate the offset of the snapshotted segment in the NEW layout
            let newAcc = 0;
            for (const seg of segments) {
              const dur = seg.durationSec;
              if (seg.id === snapshotSegId && dur > 0) {
                const restoredTime = newAcc + snapshotProgress * dur;
                if (newDur > 0) ws.setTime(Math.min(restoredTime, newDur));
                
                // Refresh cached measurements before updating DOM
                rebuildClipLayoutCache();
                updatePlayheadDOM(restoredTime);
                setCurrentTime(restoredTime);
                return;
              }
              newAcc += dur;
            }
          }

          // Fallback: playhead was on a draft or no valid snapshot
          // Position at the start of the first audio segment
          let firstAudioAcc = 0;
          for (const seg of segments) {
            if (seg.durationSec > 0) {
              if (newDur > 0) ws.setTime(Math.min(firstAudioAcc, newDur));
              
              rebuildClipLayoutCache();
              updatePlayheadDOM(firstAudioAcc);
              setCurrentTime(firstAudioAcc);
              return;
            }
            firstAudioAcc += seg.durationSec;
          }
        };
        ws.on('ready', onReady);

        ws.load(url);
      } catch (err) {
        console.error('Failed to merge and load audio into WaveSurfer:', err);
      }
    };

    loadMergedAudio();
  }, [currentFingerprint, segments]);

  // Sync playback speed
  useEffect(() => {
    wavesurferRef.current?.setPlaybackRate(playbackSpeed);
  }, [playbackSpeed]);

  useEffect(() => {
    wavesurferRef.current?.setMuted(isMuted);
  }, [isMuted]);

  // Animate playhead via requestAnimationFrame while playing
  useEffect(() => {
    if (!isPlaying) return;
    if (isDraggingRef.current) return;

    let raf: number;
    const tick = () => {
      const ws = wavesurferRef.current;
      if (ws && ws.getDuration() > 0) {
        const time = ws.getCurrentTime();
        updatePlayheadDOM(time);
        throttledSetCurrentTime(time);
      } else {
        // Fallback: track AudioEngine's HTMLAudioElement
        const segStartTime = (() => {
          if (!playingSegmentId) return 0;
          const offset = visualOffsets.find(s => s.id === playingSegmentId);
          return offset ? offset.start : 0;
        })();
        const aeTime = AudioEngine.getCurrentTime();
        const time = segStartTime + aeTime;
        updatePlayheadDOM(time);
        throttledSetCurrentTime(time);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [isPlaying, playingSegmentId, visualOffsets, updatePlayheadDOM, throttledSetCurrentTime]);

  // Playback toggle
  const handleTogglePlay = useCallback(() => {
    const ws = wavesurferRef.current;

    // If currently playing, PAUSE EVERYTHING & LOCK CURRENT TIME
    if (isPlaying) {
      if (ws && totalDuration > 0) {
        setCurrentTime(ws.getCurrentTime());
      } else {
        const aeTime = AudioEngine.getCurrentTime();
        if (aeTime > 0 && playingSegmentId) {
          const offset = visualOffsets.find((s) => s.id === playingSegmentId);
          if (offset) setCurrentTime(offset.start + aeTime);
        }
      }
      ws?.pause();
      AudioEngine.stop();
      setIsPlaying(false);
      setPlayingSegmentId(null);
      return;
    }

    // Calculate effective start time
    let resumeTime = currentTime;
    const effectiveTotal = totalDuration > 0 ? totalDuration : totalSegmentDuration;
    if (effectiveTotal > 0 && resumeTime >= effectiveTotal - 0.1) {
      resumeTime = 0; // Restart if at end
      setCurrentTime(0);
    }

    startPlaybackFrom(resumeTime);
  }, [isPlaying, totalDuration, currentTime, playingSegmentId, visualOffsets, totalSegmentDuration, startPlaybackFrom]);

  // Handle global play/pause toggle keyboard shortcut (Space)
  useEffect(() => {
    const handleToggle = () => {
      handleTogglePlay();
    };
    window.addEventListener('voxera-play-toggle', handleToggle);
    return () => window.removeEventListener('voxera-play-toggle', handleToggle);
  }, [handleTogglePlay]);

  // Seek to segment start
  const handleSeekToSegment = useCallback((segId: string) => {
    const ws = wavesurferRef.current;
    if (!ws || totalDuration <= 0) return;
    const offset = visualOffsets.find((s) => s.id === segId);
    if (offset) {
      ws.setTime(offset.start);
      
      // Update DOM immediately
      updatePlayheadDOM(offset.start);
      setCurrentTime(offset.start);
      
      if (isPlayingRef.current) {
        startPlaybackFrom(offset.start);
      }
    }
    onSelectSegment(segId);
  }, [totalDuration, visualOffsets, onSelectSegment, updatePlayheadDOM, startPlaybackFrom]);

  // Play the timeline continuously from the specified segment start
  const playSegmentOnly = useCallback((segId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const offset = visualOffsets.find((s) => s.id === segId);
    if (!offset) return;

    // If we are currently playing inside the clicked segment, pause it!
    const isCurrentlyActive = isPlaying && (playingSegmentId === segId || (playingSegmentId === null && activeSegment?.id === segId));
    if (isCurrentlyActive) {
      const ws = wavesurferRef.current;
      if (ws && totalDuration > 0) {
        setCurrentTime(ws.getCurrentTime());
      } else {
        const aeTime = AudioEngine.getCurrentTime();
        setCurrentTime(offset.start + aeTime);
      }
      ws?.pause();
      AudioEngine.stop();
      setIsPlaying(false);
      setPlayingSegmentId(null);
      return;
    }

    const seg = segments.find((s) => s.id === segId);
    if (!seg) return;

    onSelectSegment(segId);
    
    // Update playhead position immediately to start of segment
    updatePlayheadDOM(offset.start);
    setCurrentTime(offset.start);

    // Start playback from start of segment
    startPlaybackFrom(offset.start);
  }, [isPlaying, playingSegmentId, activeSegment, segments, visualOffsets, totalDuration, onSelectSegment, updatePlayheadDOM, startPlaybackFrom]);

  const totalVisualDuration = visualOffsets.length > 0
    ? visualOffsets[visualOffsets.length - 1].end
    : 0;

  // Rebuild cache when layout-affecting properties change
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      rebuildClipLayoutCache();
      updatePlayheadDOM(currentTimeRef.current);
    });
    return () => cancelAnimationFrame(handle);
  }, [segments, timelineZoom, rebuildClipLayoutCache, updatePlayheadDOM]);

  // Window resize handler to maintain accurate dimensions
  useEffect(() => {
    const handleResize = () => {
      rebuildClipLayoutCache();
      updatePlayheadDOM(currentTimeRef.current);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [rebuildClipLayoutCache, updatePlayheadDOM]);

  // Shared: seek to a pixel X offset within the clips row using pre-cached boundaries
  const seekToPx = useCallback((clickX: number) => {
    rebuildClipLayoutCache();
    const targetTime = getTimeFromPx(clickX);
    
    // Immediately update DOM & State (updatePlayheadDOM handles active segment selection)
    updatePlayheadDOM(targetTime);
    setCurrentTime(targetTime);

    // If currently playing, restart playback from the new position to ensure sound and visual align
    if (isPlayingRef.current) {
      startPlaybackFrom(targetTime);
    } else {
      // Seek WaveSurfer audio position without playing
      const ws = wavesurferRef.current;
      if (ws && totalDuration > 0) {
        ws.setTime(targetTime);
      }
    }
  }, [rebuildClipLayoutCache, getTimeFromPx, updatePlayheadDOM, totalDuration, startPlaybackFrom]);

  // Handle timeline click (single click to seek)
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || totalVisualDuration <= 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    const timelineRect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - timelineRect.left + timelineRef.current.scrollLeft;
    seekToPx(clickX);
  }, [totalVisualDuration, seekToPx]);

  // Handle drag on timeline for scrubbing the playhead with smooth edge-scrolling
  const handleTimelineMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || totalVisualDuration <= 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    e.preventDefault();
    isDraggingRef.current = true;

    // Recalculate layout metrics on drag start
    rebuildClipLayoutCache();

    // Pause playback while scrubbing
    const wasPlaying = isPlaying;
    if (wasPlaying) {
      wavesurferRef.current?.pause();
      AudioEngine.stop();
    }

    const processDrag = (clientX: number) => {
      if (!timelineRef.current) return;
      const timelineRect = timelineRef.current.getBoundingClientRect();
      const scrollL = timelineRef.current.scrollLeft;
      const clickX = clientX - timelineRect.left + scrollL;
      const targetTime = getTimeFromPx(clickX);
      
      // Zero-lag visual updates (updatePlayheadDOM handles active segment selection)
      updatePlayheadDOM(targetTime);

      // Seek WaveSurfer audio engine
      const ws = wavesurferRef.current;
      if (ws && totalDuration > 0) {
        ws.seekTo(Math.max(0, Math.min(1, targetTime / totalDuration)));
      }

      // Throttle React state refresh
      throttledSetCurrentTime(targetTime);
    };

    processDrag(e.clientX);

    let currentMouseX = e.clientX;
    let dragRafId: number | null = null;

    const dragScrollTick = () => {
      if (!isDraggingRef.current || !timelineRef.current) return;

      const timeline = timelineRef.current;
      const rect = timeline.getBoundingClientRect();
      const edgeMargin = 45;
      const maxScrollSpeed = 12;

      if (currentMouseX > rect.right - edgeMargin) {
        const intensity = Math.min(1, (currentMouseX - (rect.right - edgeMargin)) / edgeMargin);
        timeline.scrollLeft += Math.max(2, Math.round(intensity * maxScrollSpeed));
        processDrag(currentMouseX);
      } else if (currentMouseX < rect.left + edgeMargin) {
        const intensity = Math.min(1, ((rect.left + edgeMargin) - currentMouseX) / edgeMargin);
        timeline.scrollLeft -= Math.max(2, Math.round(intensity * maxScrollSpeed));
        processDrag(currentMouseX);
      }

      dragRafId = requestAnimationFrame(dragScrollTick);
    };

    dragRafId = requestAnimationFrame(dragScrollTick);

    const onMouseMove = (moveE: MouseEvent) => {
      if (!isDraggingRef.current) return;
      currentMouseX = moveE.clientX;
      processDrag(moveE.clientX);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      if (dragRafId !== null) {
        cancelAnimationFrame(dragRafId);
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Commit final time on release
      if (timelineRef.current) {
        const timelineRect = timelineRef.current.getBoundingClientRect();
        const scrollL = timelineRef.current.scrollLeft;
        const finalTime = getTimeFromPx(currentMouseX - timelineRect.left + scrollL);
        setCurrentTime(finalTime);

        if (wasPlaying) {
          startPlaybackFrom(finalTime);
        } else {
          const ws = wavesurferRef.current;
          if (ws && totalDuration > 0) {
            ws.setTime(finalTime);
          }
        }
      }
    };

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [totalVisualDuration, isPlaying, totalDuration, getTimeFromPx, updatePlayheadDOM, throttledSetCurrentTime, rebuildClipLayoutCache, startPlaybackFrom]);

  const startEdit = (seg: AudioSegment, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSegmentsCollapsed(false);
    setEditingSegmentId(seg.id);
    setEditingText(seg.text);
  };

  const saveEdit = (id: string) => {
    if (editingText.trim()) {
      onUpdateSegmentText(id, editingText);
    }
    setEditingSegmentId(null);
  };

  // Empty state
  if (segments.length === 0) {
    return (
      <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl p-5 text-center space-y-2">
        <div className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 mx-auto flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-[var(--text-main)]">No generated audio yet</h4>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 max-w-sm mx-auto">
            Write your script above and click "Generate" or Ctrl+Enter to render your first speech
            segment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[var(--bg-panel)] border-t border-[var(--border-main)] shrink-0 z-30 transition-all">
      {/* Drawer Tray for Segments Metadata */}
      {!isSegmentsCollapsed && (
        <div className="border-b border-[var(--border-subtle)] px-4 py-3 md:px-6 max-h-[240px] overflow-y-auto animate-in slide-in-from-bottom duration-200">
          <div className="max-w-full space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-subtle)]">
              <div>
                <h4 className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">
                  Timeline Segments List ({segments.length})
                </h4>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Edit text or select segments to preview details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSegmentsCollapsed(true)}
                className="p-1 rounded hover:bg-[var(--bg-inner)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {segments.map((seg) => {
                  const isSelected = selectedSegmentId === seg.id;
                  const isEditing = editingSegmentId === seg.id;

                  return (
                    <div
                      key={seg.id}
                      onClick={() => handleSeekToSegment(seg.id)}
                      className={`relative flex flex-col gap-1 p-2.5 rounded-lg border transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-purple-600/10 border-purple-500/30 shadow-xs'
                          : 'bg-[var(--bg-card)] border-[var(--border-main)] hover:border-purple-500/25'
                      }`}
                    >
                      {/* Processing overlay */}
                      {seg.isGenerating && (
                        <div className="absolute inset-0 z-10 rounded-lg bg-[var(--bg-card)]/80 backdrop-blur-[2px] flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                          <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider font-mono">Generating…</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider font-mono">
                            S0{seg.segmentNumber}
                          </span>
                          {(seg.audioUrl || seg.audioBlob) ? (
                            <button
                              type="button"
                              onClick={(e) => playSegmentOnly(seg.id, e)}
                              className="p-0.5 rounded bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                              title={isPlaying && playingSegmentId === seg.id ? "Pause segment" : "Play only this segment"}
                            >
                              {isPlaying && playingSegmentId === seg.id ? (
                                <Pause className="w-2.5 h-2.5 fill-current text-purple-400" />
                              ) : (
                                <Play className="w-2.5 h-2.5 fill-current" />
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRegenerateSegment(seg.id);
                              }}
                              className="px-1.5 py-0.5 rounded bg-purple-500/15 hover:bg-purple-600 text-purple-400 hover:text-white text-[8px] font-bold transition-all cursor-pointer flex items-center gap-0.5 shrink-0"
                              title="Synthesize audio manually"
                            >
                              <Sparkles className="w-2 h-2" />
                              <span>Synthesize</span>
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {seg.isGenerating && (
                            <span className="text-[9px] text-amber-400 font-mono animate-pulse">
                              Processing
                            </span>
                          )}
                          <span className="text-[10px] text-[var(--text-dim)] font-mono">
                            {seg.durationSec.toFixed(1)}s
                          </span>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="flex-1 text-[11px] bg-[var(--bg-inner)] border border-[var(--border-main)] rounded px-1.5 py-0.5 text-[var(--text-main)] focus:outline-hidden focus:border-purple-500/40"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(seg.id);
                              if (e.key === 'Escape') setEditingSegmentId(null);
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveEdit(seg.id);
                            }}
                            className="p-0.5 rounded text-green-500 hover:bg-green-500/10 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSegmentId(null);
                            }}
                            className="p-0.5 rounded text-[var(--text-muted)] hover:bg-[var(--bg-inner)] cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-[var(--text-main)] truncate leading-snug">
                          {seg.text}
                        </p>
                      )}

                      {/* Hover actions */}
                      <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const idx = segments.findIndex(s => s.id === seg.id);
                            if (idx !== -1 && onInsertSegment) {
                              onInsertSegment(idx);
                            }
                          }}
                          className="p-1 rounded hover:bg-[var(--bg-inner)] text-[var(--text-muted)] hover:text-purple-500 transition-colors cursor-pointer"
                          title="Insert blank segment before this"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRegenerateSegment(seg.id);
                          }}
                          className="p-1 rounded hover:bg-purple-600/10 text-[var(--text-muted)] hover:text-purple-500 transition-colors cursor-pointer"
                          title="Regenerate"
                        >
                          <RotateCw
                            className={`w-3 h-3 ${seg.isGenerating ? 'animate-spin' : ''}`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => startEdit(seg, e)}
                          className="p-1 rounded hover:bg-[var(--bg-inner)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                          title="Edit text"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {segments.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSegment(seg.id);
                            }}
                            className="p-1 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      <div className="w-full px-4 py-3 md:px-6 md:py-3.5 flex flex-col gap-3">
        
        {/* Custom Multi-Clip DAW-style Timeline Track */}
        <div className="relative w-full">
          {/* Hidden WaveSurfer mount point for playback engine */}
          <div ref={waveformRef} className="absolute w-0 h-0 overflow-hidden pointer-events-none" />

          {/* Timeline Track Scrollable Wrapper */}
          <div
            ref={timelineRef}
            onClick={handleTimelineClick}
            onMouseDown={handleTimelineMouseDown}
            className="w-full relative bg-[var(--bg-inner)] rounded-xl border border-[var(--border-main)] overflow-x-auto overflow-y-visible select-none group/timeline custom-scrollbar cursor-crosshair"
            style={{ minHeight: '80px' }}
          >
            {/* Timeline Ruler Header */}
            <div className="sticky top-0 left-0 right-0 h-5 bg-[var(--bg-card)]/80 border-b border-[var(--border-main)] flex items-center px-2 z-20">
              <div className="flex justify-between w-full text-[8px] font-mono text-[var(--text-dim)]">
                {Array.from({ length: Math.max(2, Math.ceil(totalVisualDuration) + 1) }, (_, i) => (
                  <span key={i} className="opacity-60">{i.toFixed(0)}s</span>
                )).slice(0, 10)}
              </div>
            </div>

            {/* Clips Row */}
            <div className="flex items-stretch p-2 gap-1.5" data-clips-row>
              {/* DAW Playhead — pixel positioned over clip row (Direct DOM access via ref) */}
              <div
                ref={playheadRef}
                className="absolute top-0 bottom-0 w-[2px] bg-purple-500 z-30 pointer-events-none"
                style={{
                  left: '8px',
                  boxShadow: '0 0 6px rgba(168, 85, 247, 0.7), 0 0 12px rgba(168, 85, 247, 0.3)',
                  display: segments.length > 0 ? 'block' : 'none',
                }}
              >
                {/* Time badge inside the ruler */}
                <div className="absolute top-0.5 left-1/2 -translate-x-1/2">
                  <div
                    ref={playheadTimeRef}
                    className="px-1 py-px rounded-sm bg-purple-600 text-white text-[8px] font-mono font-bold shadow-sm whitespace-nowrap leading-tight"
                  >
                    {formatTime(currentTime)}
                  </div>
                </div>
                {/* Bottom glow dot */}
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_4px_rgba(168,85,247,0.8)]" />
              </div>

            {/* Render Clip Blocks */}
            {visualOffsets.map((seg, idx) => {
              const isSelected = selectedSegmentId === seg.id;

              return (
                <React.Fragment key={seg.id}>
                  {/* Insert indicator before this clip (index idx) */}
                  <div className="relative group/insert flex items-center justify-center w-2 hover:w-8 transition-all duration-200 shrink-0 self-stretch z-20">
                    {/* Visual vertical indicator line */}
                    <div className="absolute w-[2px] h-[calc(100%-8px)] rounded-full bg-transparent group-hover/insert:bg-purple-500/35 transition-colors" />
                    
                    {/* Round circular insert segment button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInsertSegment?.(idx);
                      }}
                      className="absolute opacity-0 group-hover/insert:opacity-100 transition-opacity w-5 h-5 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-md cursor-pointer hover:scale-110 active:scale-95 transition-transform z-30"
                      title={`Insert segment before S0${seg.segmentNumber}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div
                    data-clip-id={seg.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSeekToSegment(seg.id);
                    }}
                    style={{ width: `${Math.max(160, seg.visualDuration * timelineZoom)}px`, flexShrink: 0 }}
                    className={`relative flex flex-col justify-between p-2 rounded-lg border transition-all cursor-pointer group/clip ${
                      isSelected
                        ? 'bg-purple-600/10 border-purple-500 shadow-xs ring-1 ring-purple-500/25'
                        : 'bg-[var(--bg-card)]/40 border-[var(--border-main)] hover:border-purple-500/25'
                    }`}
                  >
                  {/* Processing overlay */}
                  {seg.isGenerating && (
                    <div className="absolute inset-0 z-10 rounded-lg bg-[var(--bg-card)]/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1.5">
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                      <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider font-mono">Generating…</span>
                    </div>
                  )}
                  {/* Clip Header: S01 label, Play/Synthesize actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-purple-400 font-mono uppercase tracking-wider">
                        S0{seg.segmentNumber}
                      </span>
                      {(seg.audioUrl || seg.audioBlob) ? (
                        <button
                          type="button"
                          onClick={(e) => playSegmentOnly(seg.id, e)}
                          className="p-0.5 rounded bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
                          title={isPlaying && (playingSegmentId === seg.id || (playingSegmentId === null && activeSegment?.id === seg.id)) ? "Pause segment" : "Play only this segment"}
                        >
                          {isPlaying && (playingSegmentId === seg.id || (playingSegmentId === null && activeSegment?.id === seg.id)) ? (
                            <Pause className="w-2.5 h-2.5 fill-current text-purple-400 font-bold" />
                          ) : (
                            <Play className="w-2.5 h-2.5 fill-current" />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRegenerateSegment(seg.id);
                          }}
                          className="px-1.5 py-0.5 rounded bg-purple-500/15 hover:bg-purple-600 text-purple-400 hover:text-white text-[8px] font-bold transition-all cursor-pointer flex items-center gap-0.5 shrink-0"
                          title="Synthesize audio now"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Synthesize</span>
                        </button>
                      )}
                    </div>

                    <span className="text-[9px] text-[var(--text-dim)] font-mono">
                      {seg.durationSec > 0 ? `${seg.durationSec.toFixed(1)}s` : 'Draft'}
                    </span>
                  </div>

                  {/* Clip Waveform Peaks representation */}
                  <div className="my-1.5 h-6">
                    {seg.durationSec > 0 ? (
                      <div className="flex items-end justify-between h-full gap-0.5 px-1 opacity-70">
                        {seg.waveformPeaks.slice(0, 15).map((peak, pIdx) => (
                          <span
                            key={pIdx}
                            className={`w-0.5 rounded-full transition-all ${
                              isSelected ? 'bg-purple-500' : 'bg-[var(--text-dim)]'
                            }`}
                            style={{ height: `${Math.max(20, peak * 100)}%` }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full border border-dashed border-[var(--border-subtle)] rounded text-[9px] text-[var(--text-muted)] bg-[var(--bg-inner)]/50">
                        No audio synthesized
                      </div>
                    )}
                  </div>

                  {/* Clip Footer text preview */}
                  <p className="text-[10px] text-[var(--text-main)] truncate leading-none">
                    {seg.text}
                  </p>

                  {/* Hover Actions inside clip card */}
                  <div className="absolute top-1 right-1 hidden group-hover/clip:flex items-center gap-0.5 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded px-1 py-0.5 z-20 shadow-md">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRegenerateSegment(seg.id);
                      }}
                      className="p-0.5 rounded hover:bg-[var(--bg-inner)] text-[var(--text-muted)] hover:text-purple-400 cursor-pointer"
                      title="Regenerate"
                    >
                      <RotateCw className={`w-2.5 h-2.5 ${seg.isGenerating ? 'animate-spin' : ''}`} />
                    </button>
                    {segments.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSegment(seg.id);
                        }}
                        className="p-0.5 rounded hover:bg-[var(--bg-inner)] text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
            })}

              {/* Dotted '+' Button Card at end of clips row */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddGeneration();
                }}
                style={{ minWidth: '64px', flexShrink: 0 }}
                className="rounded-lg border-2 border-dashed border-[var(--border-main)] hover:border-purple-500/50 hover:bg-purple-600/5 text-[var(--text-muted)] hover:text-purple-400 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none"
                title="Add generation to timeline"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Add Clip</span>
              </button>
            </div> {/* end clips row */}
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Play + Info + Drawer Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Play Button */}
            <button
              type="button"
              onClick={handleTogglePlay}
              disabled={segments.length === 0}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer shrink-0 ${
                segments.length > 0
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-purple-600/30 text-purple-400/50 cursor-not-allowed'
              }`}
              title={isPlaying ? 'Pause playback' : 'Play composed timeline'}
            >
              {isPlaying ? (
                <Pause className="w-4.5 h-4.5 fill-current" />
              ) : (
                <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
              )}
            </button>

            {/* Info Panel */}
            <div className="hidden sm:block">
              <h4 className="text-[10px] font-bold text-purple-500 uppercase tracking-wider leading-none">
                {activeSegment ? `Segment 0${activeSegment.segmentNumber}` : 'Continuous Play'}
              </h4>
              <p className="text-xs text-[var(--text-main)] font-mono font-bold mt-1">
                {formatTime(currentTime)} <span className="text-[var(--text-muted)] font-normal">/ {formatTime(totalDuration || totalSegmentDuration)}</span>
              </p>
            </div>

            {/* Compact mobile time */}
            <div className="sm:hidden flex flex-col">
              <span className="text-[9px] font-bold text-purple-500 font-mono">
                {activeSegment ? `S0${activeSegment.segmentNumber}` : 'PLAY'}
              </span>
              <span className="text-xs font-mono font-bold">
                {formatTime(currentTime)}
              </span>
            </div>

            {/* Segments drawer toggle */}
            <button
              type="button"
              onClick={() => setIsSegmentsCollapsed((prev) => !prev)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ml-1 group ${
                !isSegmentsCollapsed
                  ? 'bg-purple-600/10 border-purple-500/35 text-purple-500'
                  : 'bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
              title={isSegmentsCollapsed ? 'Show segments metadata' : 'Hide segments metadata'}
            >
              {isSegmentsCollapsed ? (
                <ChevronUp className="w-4.5 h-4.5 text-purple-500 group-hover:-translate-y-0.5 transition-transform animate-bounce" />
              ) : (
                <ChevronDown className="w-4.5 h-4.5 text-purple-500" />
              )}
            </button>
          </div>

          {/* Actions: speed, volume, download, more */}
          <div className="flex items-center gap-1.5 shrink-0 justify-end">
            {/* Playback Speed */}
            <button
              type="button"
              onClick={() => {
                const speeds = [1.0, 1.25, 1.5, 2.0];
                const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                setPlaybackSpeed(speeds[nextIdx]);
              }}
              className="h-8 px-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-xs font-mono font-semibold text-[var(--text-main)] transition-colors cursor-pointer"
              title="Toggle playback speed"
            >
              {playbackSpeed}x
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border-main)] px-1 h-8 shrink-0">
              <button
                type="button"
                onClick={() => setTimelineZoom(z => Math.max(16, z - 8))}
                disabled={timelineZoom <= 16}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-inner)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[9px] font-mono font-bold text-[var(--text-muted)] min-w-[28px] text-center select-none">
                {Math.round((timelineZoom / 40) * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setTimelineZoom(z => Math.min(160, z + 8))}
                disabled={timelineZoom >= 160}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-inner)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Volume Mute Toggle */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer shrink-0"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Generate Remaining (if any segments lack audio) */}
            {segments.some((s) => !s.audioUrl && !s.audioBlob) && (
              <button
                type="button"
                onClick={onGenerateRemaining}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/20 hover:border-purple-600 text-[11px] font-semibold transition-colors shadow-xs cursor-pointer shrink-0"
                title="Generate speech for all remaining timeline segments"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Remaining</span>
              </button>
            )}

            {/* Download Button with Format Dropdown */}
            <div className="relative">
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => onDownloadComposition(selectedFormat)}
                  className="flex items-center gap-1.5 h-8 px-2.5 rounded-l-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-medium border-y border-l border-purple-500/30 transition-colors shadow-xs cursor-pointer"
                  title={`Download entire composition as ${selectedFormat.toUpperCase()}`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Download {selectedFormat.toUpperCase()}</span>
                  <span className="xs:hidden">{selectedFormat.toUpperCase()}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="flex items-center justify-center h-8 px-1.5 rounded-r-lg bg-purple-600 hover:bg-purple-500 text-white border border-purple-500/30 transition-colors shadow-xs cursor-pointer"
                  title="Choose download format"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showDownloadMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setShowDownloadMenu(false)}
                  />
                  <div className="absolute right-0 bottom-10 w-48 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg p-1.5 shadow-xl z-50 text-[11px]">
                    <div className="px-2 py-1 text-[10px] font-bold text-purple-500 uppercase tracking-wider border-b border-[var(--border-subtle)] mb-1">
                      Export Format
                    </div>
                    {formats.map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => {
                          setSelectedFormat(fmt.id);
                          onDownloadComposition(fmt.id);
                          setShowDownloadMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors cursor-pointer ${
                          selectedFormat === fmt.id
                            ? 'bg-purple-600/10 text-purple-400 font-semibold'
                            : 'text-[var(--text-main)] hover:bg-[var(--bg-inner)]'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span>{fmt.name}</span>
                          <span className="text-[9px] text-[var(--text-muted)] font-normal">{fmt.desc}</span>
                        </div>
                        {selectedFormat === fmt.id && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                title="More options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {showMoreMenu && (
                <div className="absolute right-0 bottom-10 w-44 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg p-1 shadow-xl z-50 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      onClearComposition();
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-red-500 hover:bg-red-500/10 rounded text-left cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear composition</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
