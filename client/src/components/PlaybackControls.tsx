import { Play, Pause, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useProject } from '@/store/useProject';
import { useEffect, useRef } from 'react';

export function PlaybackControls() {
  const {
    isPlaying,
    currentTime,
    playbackStartTime,
    playVideo,
    pauseVideo,
    stopVideo,
    seekTo,
    updateCurrentTime,
    getTotalDuration,
    getPlaybackProgress,
  } = useProject();

  const animationFrameRef = useRef<number>();
  const totalDuration = getTotalDuration();

  // Update current time while playing
  useEffect(() => {
    if (isPlaying && playbackStartTime) {
      const updateTime = () => {
        const now = Date.now();
        const elapsed = (now - playbackStartTime) / 1000; // Convert to seconds
        updateCurrentTime(elapsed);
        animationFrameRef.current = requestAnimationFrame(updateTime);
      };
      animationFrameRef.current = requestAnimationFrame(updateTime);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackStartTime, updateCurrentTime]);

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  };

  const handleStop = () => {
    stopVideo();
  };

  const handleSeek = (value: number[]) => {
    const seekTime = (value[0] / 100) * totalDuration;
    seekTo(seekTime);
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = getPlaybackProgress() * 100;

  return (
    <div className="flex items-center gap-4 p-4 bg-background border-t border-border" data-testid="playback-controls">
      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlayPause}
          disabled={totalDuration === 0}
          className="h-8 w-8 p-0"
          data-testid={isPlaying ? "button-pause" : "button-play"}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleStop}
          disabled={totalDuration === 0}
          className="h-8 w-8 p-0"
          data-testid="button-stop"
          title="Stop"
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>

      {/* Time Display */}
      <div className="text-sm text-muted-foreground font-mono min-w-[80px]" data-testid="text-current-time">
        {formatTime(currentTime)} / {formatTime(totalDuration)}
      </div>

      {/* Timeline Scrubber */}
      <div className="flex-1 px-2">
        <Slider
          value={[progress]}
          onValueChange={handleSeek}
          disabled={totalDuration === 0}
          max={100}
          step={0.1}
          className="w-full"
          data-testid="slider-timeline"
          title={`Seek to ${Math.round(progress)}%`}
        />
      </div>

      {/* Duration Display */}
      <div className="text-sm text-muted-foreground font-mono min-w-[60px]" data-testid="text-total-duration">
        {formatTime(totalDuration)}
      </div>
    </div>
  );
}