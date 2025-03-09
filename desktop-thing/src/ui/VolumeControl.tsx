import styles from './VolumeControl.module.css';
import { ChangeEvent, CSSProperties, useRef, useState, useEffect } from 'react';
import { Volume2, Volume1, Volume, VolumeX } from 'lucide-react';

interface VolumeControlProps {
  currentPercent: number;
  onChange: (percent: number) => void;
}

const VolumeControl = ({ currentPercent, onChange }: VolumeControlProps) => {
  const [progress, setProgress] = useState(currentPercent);
  const rangeRef = useRef<HTMLInputElement>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);

  useEffect(() => {
    setProgress(currentPercent);
  }, [currentPercent]);

  const handleRangeChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!rangeRef.current) return;

    const newProgress = parseInt(event.target.value, 10);
    setSeekProgress(newProgress);

    if (!isSeeking) {
      setIsSeeking(true);
    }

    setProgress(newProgress);
  };

  const handleSeekEnd = () => {
    if (isSeeking) {
      onChange(seekProgress);
      setIsSeeking(false);
    }
  };

  return (
    <>
      <span>
        {progress === 0 ? (
          <VolumeX size={16} color="#d4d4d4" strokeWidth={2} />
        ) : progress < 33 ? (
          <Volume size={16} color="#d4d4d4" strokeWidth={2} />
        ) : progress < 66 ? (
          <Volume1 size={16} color="#d4d4d4" strokeWidth={2} />
        ) : (
          <Volume2 size={16} color="#d4d4d4" strokeWidth={2} />
        )}
      </span>
      <span>
        <input
          type="range"
          min="0"
          max="100"
          className={styles.verticalRange}
          autoFocus={false}
          tabIndex={-1}
          value={isSeeking ? seekProgress : progress}
          ref={rangeRef}
          onChange={handleRangeChange}
          onMouseUp={handleSeekEnd}
          onTouchEnd={handleSeekEnd}
          style={
            {
              '--progress-width': `${isSeeking ? seekProgress : progress}%`,
            } as CSSProperties
          }
        />
      </span>
    </>
  );
};

export default VolumeControl;
