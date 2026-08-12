import React from 'react';
import { Voice } from '../../types';
import {
  Play,
  Pause,
  RotateCw,
  Bookmark,
  Heart,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface AudioPlayerBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  totalDuration: number;
  onSeek: (time: number) => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  selectedVoice: Voice;
  onRegenerateAll: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  isPlaying,
  onTogglePlay,
  currentTime,
  totalDuration,
  onSeek,
  playbackSpeed,
  onChangeSpeed,
  selectedVoice,
  onRegenerateAll,
  isBookmarked,
  onToggleBookmark,
  isFavorited,
  onToggleFavorite,
}) => {
  const [isMuted, setIsMuted] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [hoverTime, setHoverTime] = React.useState<number | null>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const progressPct = totalDuration > 0 ? Math.min(100, Math.max(0, (currentTime / totalDuration) * 100)) : 0;

  const calculateTimeFromEvent = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!trackRef.current || totalDuration <= 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const offsetX = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, offsetX / rect.width));
    return pct * totalDuration;
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const time = calculateTimeFromEvent(e);
    onSeek(time);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!trackRef.current || totalDuration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, offsetX / rect.width));
    setHoverTime(pct * totalDuration);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleWindowMove = (e: MouseEvent | TouchEvent) => {
      const time = calculateTimeFromEvent(e);
      onSeek(time);
    };

    const handleWindowUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleWindowMove);
    window.addEventListener('touchmove', handleWindowMove);
    window.addEventListener('mouseup', handleWindowUp);
    window.addEventListener('touchend', handleWindowUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('touchmove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
      window.removeEventListener('touchend', handleWindowUp);
    };
  }, [isDragging, totalDuration, onSeek]);

  return (
    <div className="bg-[var(--bg-topbar)] border-t border-[var(--border-main)] py-2.5 px-4 shadow-2xl space-y-2 sticky bottom-0 z-30 select-none">
      {/* Top Controls Row */}
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Play/Pause Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-950/20 transition-all active:scale-95 cursor-pointer"
            title={isPlaying ? 'Pause playback' : 'Play composed audio'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <div className="text-xs font-mono font-medium text-[var(--text-main)] min-w-[80px]">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
        </div>

        {/* Center Progress Waveform Seeker Bar */}
        <div className="flex-1 mx-2 relative flex items-center py-2">
          {/* Track Container */}
          <div
            ref={trackRef}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-full h-2.5 bg-[var(--bg-inner)] border border-[var(--border-subtle)] rounded-full cursor-pointer relative group flex items-center"
          >
            {/* Filled Progress Bar */}
            <div
              className={`h-full bg-purple-600 rounded-full ${isDragging ? '' : 'transition-all duration-75'}`}
              style={{ width: `${progressPct}%` }}
            />

            {/* Draggable Pointer Handle */}
            {totalDuration > 0 && (
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-purple-600 shadow-md ring-2 ring-purple-500/20 transition-transform ${
                  isDragging ? 'scale-125 bg-purple-100 ring-purple-500/50' : 'group-hover:scale-110'
                }`}
                style={{ left: `${progressPct}%` }}
              />
            )}

            {/* Hover / Dragging Tooltip */}
            {(hoverTime !== null || isDragging) && totalDuration > 0 && (
              <div
                className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[var(--text-main)] text-[var(--bg-app)] text-[10px] font-mono font-semibold shadow-md pointer-events-none z-20"
                style={{
                  left: `${isDragging ? progressPct : Math.min(100, Math.max(0, ((hoverTime ?? 0) / totalDuration) * 100))}%`,
                }}
              >
                {formatTime(isDragging ? currentTime : hoverTime ?? 0)}
              </div>
            )}
          </div>
        </div>

        {/* Right Utility Controls */}
        <div className="flex items-center gap-2">
          {/* Playback speed picker */}
          <button
            type="button"
            onClick={() => {
              const speeds = [1.0, 1.25, 1.5, 2.0];
              const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
              onChangeSpeed(speeds[nextIdx]);
            }}
            className="px-2 py-1 rounded bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-[11px] font-mono text-[var(--text-main)] font-semibold transition-colors cursor-pointer"
            title="Toggle playback speed"
          >
            {playbackSpeed}x
          </button>

          {/* Volume toggle */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded bg-[var(--bg-card)] hover:bg-[var(--bg-inner)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom Metadata & Actions Row */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border-subtle)] max-w-7xl mx-auto">
        <div className="text-[var(--text-muted)] text-[11px] font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
          <span>
            {selectedVoice.name} · {selectedVoice.language} · {Math.round(totalDuration)} sec · Generated just now
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRegenerateAll}
            className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Regenerate</span>
          </button>

          <button
            type="button"
            onClick={onToggleBookmark}
            className={`flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
              isBookmarked ? 'text-purple-500 font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-purple-500' : ''}`} />
            <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleFavorite}
            className={`flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
              isFavorited ? 'text-pink-500 font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-pink-500 text-pink-500' : ''}`} />
            <span>{isFavorited ? 'Favorited' : 'Favorite'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
