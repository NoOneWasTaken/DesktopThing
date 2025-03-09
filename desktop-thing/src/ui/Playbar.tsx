import styles from './PlayBar.module.css';
import { useState, useEffect, useRef, CSSProperties, ChangeEvent } from 'react';

interface PlayBarProps {
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
  onSeek: (ms: number) => void;
}

const PlayBar = ({
  progressMs,
  durationMs,
  isPlaying,
  onSeek,
}: PlayBarProps) => {
  const [currentProgress, setCurrentProgress] = useState(progressMs);
  const [progress, setProgress] = useState(0);
  const rangeRef = useRef<HTMLInputElement>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);

  useEffect(() => {
    setCurrentProgress(progressMs);
  }, [progressMs]);

  useEffect(() => {
    if (durationMs === 0) return;

    setProgress((currentProgress / durationMs) * 100);
  }, [currentProgress, durationMs]);

  useEffect(() => {
    setCurrentProgress(progressMs);
    if (durationMs === 0) return;

    const newProgress = (progressMs / durationMs) * 100;
    setProgress(newProgress);
    setSeekProgress(newProgress);
  }, [progressMs, durationMs]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentProgress((prev) => Math.min(prev + 1000, durationMs));
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, durationMs]);

  const handleRangeChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!rangeRef.current) return;

    const newProgressPercentage = parseInt(event.target.value, 10);
    setSeekProgress(newProgressPercentage);

    if (!isSeeking) {
      setIsSeeking(true);
    }

    setCurrentProgress(Math.round((newProgressPercentage / 100) * durationMs));
  };

  const handleSeekEnd = () => {
    if (isSeeking) {
      const newProgressMs = Math.round((seekProgress / 100) * durationMs);
      onSeek(newProgressMs);

      setIsSeeking(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.playbarContainer}>
      <span className={styles.timeLeft}>{formatTime(currentProgress)}</span>

      <div className={styles.playbar}>
        <input
          type="range"
          min="0"
          max="100"
          value={isSeeking ? seekProgress : progress}
          ref={rangeRef}
          onMouseUp={handleSeekEnd}
          onChange={handleRangeChange}
          className={styles.playbarRange}
          tabIndex={-1}
          style={
            {
              '--progress-width': `${isSeeking ? seekProgress : progress}%`,
            } as CSSProperties
          }
        />
      </div>

      <span className={styles.timeRight}>{formatTime(durationMs)}</span>
    </div>
  );
};

export default PlayBar;
