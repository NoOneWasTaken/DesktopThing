import styles from './app.module.css';
import {
  AudioLines,
  Repeat,
  Repeat1,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Pin,
  PinOff,
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import PlayBar from './Playbar';
import VolumeControl from './VolumeControl';
import { IpcChannelGetCurrentPlayerData } from '../../types';

const App = () => {
  const [playerData, setPlayerData] =
    useState<IpcChannelGetCurrentPlayerData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [shuffleState, setShuffleState] = useState<boolean>(false);
  const [playbackState, setPlaybackState] = useState<boolean>(false);
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [repeatState, setRepeatState] = useState<'off' | 'track' | 'context'>(
    'off'
  );

  const [time, setTime] = useState<string>('00:00:00');
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let animationId: number;

    const updateTimer = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsedTime = timestamp - startTimeRef.current;

      let totalSeconds = Math.floor(elapsedTime / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      totalSeconds %= 3600;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.floor(totalSeconds % 60);

      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      if (hours >= 99 && minutes >= 59 && seconds >= 59) {
        setTime('99:59:59');
        cancelAnimationFrame(animationId);
        return;
      }

      setTime(formattedTime);
      animationId = requestAnimationFrame(updateTimer);
    };

    animationId = requestAnimationFrame(updateTimer);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      startTimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function pollPlayerData() {
      try {
        const result = await window.electron.invoke('get-current-player-data');
        if (!isMounted) return;

        if (result.status !== 200) {
          setError(result.error);
        } else {
          setPlayerData(result);
          setError(null);

          if (result.trackType === 'track') {
            setShuffleState(result.data.shuffle_state);
            setPlaybackState(result.data.is_playing);
            setCurrentPosition(result.data.progress_ms);
            setRepeatState(result.data.repeat_state);
          }
        }
      } catch (error) {
        console.error(error);
      }
    }

    const removeOnAuthListener = window.electron.onAuthSuccess(pollPlayerData);

    const interval = setInterval(() => {
      pollPlayerData();
      console.log('Data polled');
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      removeOnAuthListener();
    };
  }, []);

  const handleVolumeChange = async (percent: number) => {
    const { error, status } = await window.electron.invoke(
      'set-volume',
      percent
    );

    if (status !== 204) {
      setError(error);
    }
  };

  const handleSeek = async (ms: number) => {
    const { error, status } = await window.electron.invoke('seek-to', ms);

    if (status !== 204) {
      setError(error);
    }
  };

  const handleSkip = async (direction: 'forward' | 'backward') => {
    const { error, status } = await window.electron.invoke('skip', direction);

    if (status !== 204) {
      setError(error);
    }
  };

  const handleShuffle = async () => {
    const { error, status } = await window.electron.invoke(
      'shuffle',
      !shuffleState
    );

    if (status !== 204) {
      setError(error);
    }

    setShuffleState(!shuffleState);
  };

  const handlePlayPause = async () => {
    const { error, status } = await window.electron.invoke(
      'play-pause',
      !playbackState,
      currentPosition
    );

    if (status !== 204) {
      setError(error);
    }

    setPlaybackState(!playbackState);
  };

  const handleRepeat = async () => {
    let nextRepeatState: 'off' | 'track' | 'context' = 'off';

    switch (repeatState) {
      case 'off':
        nextRepeatState = 'context';
        break;
      case 'context':
        nextRepeatState = 'track';
        break;
      case 'track':
        nextRepeatState = 'off';
        break;

      default:
        setError('Invalid repeat state');
    }

    const { error, status } = await window.electron.invoke(
      'repeat',
      nextRepeatState
    );

    if (status !== 204) {
      setError(error);
    }

    setRepeatState(nextRepeatState);
  };

  if (error) return <div>{error}</div>;

  if (!playerData) return <div>Loading...</div>;

  return (
    <div className={styles.container}>
      {playerData.trackType === 'track' && (
        <>
          <div className={styles.trackCover}>
            <div className={styles.imageContainer}>
              <img
                src={playerData.data.item.album.images[2].url}
                className={styles.trackImage}
                draggable={false}
              />
            </div>
            <div className={styles.stopwatch}>
              <span className={styles.iconContainer}>
                <AudioLines size={18} color="#d4d4d4" strokeWidth={1.5} />
              </span>
              <span className={styles.count} id={'timer'}>
                {time}
              </span>
            </div>
          </div>
          <div className={styles.trackData}>
            <div className={styles.trackInfo}>
              <span className={styles.trackName}>
                {playerData.data.item.name}
              </span>
              <span className={styles.trackArtist}>
                By{' '}
                {playerData.data.item.artists
                  .map((artist) => artist.name)
                  .join(', ')}
              </span>
            </div>
            <div className={styles.playheadContainer}>
              <PlayBar
                progressMs={currentPosition}
                durationMs={playerData.data.item.duration_ms}
                isPlaying={playbackState}
                onSeek={handleSeek}
              />
            </div>
            <div className={styles.playback}>
              <span className={styles.controlButton} tabIndex={-1}>
                <PinOff
                  size={16}
                  color="#d4d4d4"
                  strokeWidth={2}
                  style={{ display: 'none' }}
                />
                <Pin size={16} color="#1ed760" strokeWidth={2} />
              </span>
              <button className={styles.controlButton} tabIndex={-1}>
                <Shuffle
                  size={16}
                  color={shuffleState ? '#1ed760' : '#d4d4d4'}
                  strokeWidth={2}
                  onClick={handleShuffle}
                />
              </button>
              <button
                className={styles.controlButton}
                tabIndex={-1}
                onClick={() => handleSkip('backward')}
              >
                <SkipBack size={16} color="#d4d4d4" strokeWidth={2} />
              </button>
              <button
                className={styles.controlButton + ' ' + styles.playButton}
                tabIndex={-1}
                onClick={handlePlayPause}
              >
                {playbackState ? (
                  <Pause size={24} color="#d4d4d4" strokeWidth={2} />
                ) : (
                  <Play size={24} color="#d4d4d4" strokeWidth={2} />
                )}
              </button>
              <button
                className={styles.controlButton}
                tabIndex={-1}
                onClick={() => handleSkip('forward')}
              >
                <SkipForward size={16} color="#d4d4d4" strokeWidth={2} />
              </button>
              <button
                className={styles.controlButton}
                tabIndex={-1}
                onClick={handleRepeat}
              >
                {repeatState === 'off' ? (
                  <Repeat size={16} color="#d4d4d4" strokeWidth={2} />
                ) : playerData.data.repeat_state === 'context' ? (
                  <Repeat size={16} color="#1ed760" strokeWidth={2} />
                ) : (
                  <Repeat1 size={16} color="#1ed760" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
          <div className={styles.volumeControl}>
            <VolumeControl
              currentPercent={playerData.data.device.volume_percent}
              onChange={handleVolumeChange}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default App;
