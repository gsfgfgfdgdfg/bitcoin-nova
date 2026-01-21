import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  url: string;
  thumbnail?: string;
}

interface MusicState {
  trackId: string | null;
  volume: number;
  currentTime: number;
  isShuffle: boolean;
  isLoop: boolean;
}

interface MusicContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  isShuffle: boolean;
  isLoop: boolean;
  playlist: Track[];
  currentTime: number;
  duration: number;
  isLoading: boolean;
  isBuffering: boolean;
  error: string | null;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleLoop: () => void;
  selectTrack: (track: Track) => void;
  seek: (time: number) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

const STORAGE_KEY = 'bitcoinMusicState';
const DEFAULT_VOLUME = 0.15; // 15% głośności na start

const parseFileName = (fileName: string): { title: string; artist: string } => {
  const cleanName = fileName
    .replace(/\.mp3$/i, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim();
  
  return {
    title: cleanName,
    artist: 'Bitcoin Nasza Siła'
  };
};

const loadSavedState = (): MusicState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const saveState = (state: MusicState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save music state:', e);
  }
};

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const savedState = loadSavedState();
  
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(savedState?.volume ?? DEFAULT_VOLUME);
  const [isShuffle, setIsShuffle] = useState(savedState?.isShuffle ?? false);
  const [isLoop, setIsLoop] = useState(savedState?.isLoop ?? false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoPlayAttempted, setAutoPlayAttempted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save state to localStorage when relevant values change
  useEffect(() => {
    if (currentTrack) {
      saveState({
        trackId: currentTrack.id,
        volume,
        currentTime,
        isShuffle,
        isLoop
      });
    }
  }, [currentTrack?.id, volume, isShuffle, isLoop]);

  // Fetch tracks from Supabase Storage
  useEffect(() => {
    const fetchTracks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data: files, error: listError } = await supabase
          .storage
          .from('Muzyczki')
          .list('', {
            limit: 100,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (listError) throw listError;

        if (!files || files.length === 0) {
          setPlaylist([]);
          return;
        }

        const mp3Files = files.filter(file => file.name.toLowerCase().endsWith('.mp3'));
        
        const trackList: Track[] = mp3Files.map((file, index) => {
          const { title, artist } = parseFileName(file.name);
          const { data: urlData } = supabase
            .storage
            .from('Muzyczki')
            .getPublicUrl(file.name);

          return {
            id: `track-${index + 1}`,
            title,
            artist,
            duration: '0:00', // Will be updated when metadata loads
            url: urlData.publicUrl,
            thumbnail: ''
          };
        });

        // Remove duplicates based on title
        const uniqueTracks = trackList.reduce((acc, track) => {
          const exists = acc.find(t => t.title === track.title);
          if (!exists) acc.push(track);
          return acc;
        }, [] as Track[]);

        setPlaylist(uniqueTracks);
        
        // Restore saved track or use first track
        if (uniqueTracks.length > 0 && !currentTrack) {
          const savedTrackId = savedState?.trackId;
          const savedTrack = savedTrackId ? uniqueTracks.find(t => t.id === savedTrackId) : null;
          setCurrentTrack(savedTrack || uniqueTracks[0]);
        }
      } catch (err) {
        console.error('Error fetching tracks:', err);
        setError(err instanceof Error ? err.message : 'Nie udało się załadować muzyki');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTracks();
  }, []);

  // Auto-play with low volume after tracks load
  useEffect(() => {
    if (playlist.length > 0 && currentTrack && !autoPlayAttempted && !isLoading) {
      setAutoPlayAttempted(true);
      
      const audio = audioRef.current;
      if (audio) {
        audio.volume = volume;
        audio.src = currentTrack.url;
        audio.load();
        
        // Attempt auto-play (may be blocked by browser)
        audio.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((e) => {
            console.log('Auto-play blocked by browser:', e.message);
            // User needs to interact first - that's OK
          });
      }
    }
  }, [playlist, currentTrack, autoPlayAttempted, isLoading, volume]);

  // Handle audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => {
      const dur = audio.duration;
      if (dur && isFinite(dur)) {
        setDuration(dur);
        // Update track duration in playlist
        if (currentTrack) {
          const minutes = Math.floor(dur / 60);
          const seconds = Math.floor(dur % 60);
          const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          setPlaylist(prev => prev.map(t => 
            t.id === currentTrack.id ? { ...t, duration: formattedDuration } : t
          ));
        }
      }
    };
    
    const handleEnded = () => {
      if (isLoop) {
        audio.currentTime = 0;
        audio.play();
      } else {
        next();
      }
    };

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleCanPlay = () => setIsBuffering(false);
    const handleError = (e: Event) => {
      const audioError = (e.target as HTMLAudioElement).error;
      console.error('Audio error:', audioError);
      setError('Błąd odtwarzania. Próbuję następny utwór...');
      setIsBuffering(false);
      // Try next track after error
      setTimeout(() => {
        setError(null);
        next();
      }, 2000);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [isLoop, currentTrack?.id]);

  // Handle play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Fade transition helper
  const fadeToTrack = useCallback(async (newTrack: Track) => {
    const audio = audioRef.current;
    if (!audio) {
      setCurrentTrack(newTrack);
      return;
    }

    // Clear any existing fade
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const originalVolume = volume;
    const wasPlaying = isPlaying;
    
    // Fade out (300ms)
    let currentVol = originalVolume;
    await new Promise<void>((resolve) => {
      fadeIntervalRef.current = setInterval(() => {
        currentVol = Math.max(0, currentVol - 0.05);
        audio.volume = currentVol;
        if (currentVol <= 0) {
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
          resolve();
        }
      }, 30);
    });

    // Change track
    setCurrentTrack(newTrack);
    audio.src = newTrack.url;
    audio.load();
    
    if (wasPlaying) {
      try {
        await audio.play();
      } catch (e) {
        console.error('Play failed:', e);
      }
    }

    // Fade in (300ms)
    currentVol = 0;
    await new Promise<void>((resolve) => {
      fadeIntervalRef.current = setInterval(() => {
        currentVol = Math.min(originalVolume, currentVol + 0.05);
        audio.volume = currentVol;
        if (currentVol >= originalVolume) {
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
          resolve();
        }
      }, 30);
    });
  }, [volume, isPlaying]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying(prev => !prev), []);

  const next = useCallback(() => {
    if (!currentTrack || playlist.length === 0) return;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    let nextIndex: number;
    
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = (currentIndex + 1) % playlist.length;
    }
    
    fadeToTrack(playlist[nextIndex]);
  }, [currentTrack, isShuffle, playlist, fadeToTrack]);

  const previous = useCallback(() => {
    if (!currentTrack || playlist.length === 0) return;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    fadeToTrack(playlist[prevIndex]);
  }, [currentTrack, playlist, fadeToTrack]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
  }, []);

  const toggleShuffle = useCallback(() => setIsShuffle(prev => !prev), []);
  const toggleLoop = useCallback(() => setIsLoop(prev => !prev), []);
  
  const selectTrack = useCallback((track: Track) => {
    if (track.id !== currentTrack?.id) {
      fadeToTrack(track);
    }
    setIsPlaying(true);
  }, [currentTrack?.id, fadeToTrack]);

  const seek = useCallback((time: number) => {
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  return (
    <MusicContext.Provider value={{
      currentTrack,
      isPlaying,
      volume,
      isShuffle,
      isLoop,
      playlist,
      currentTime,
      duration,
      isLoading,
      isBuffering,
      error,
      play,
      pause,
      toggle,
      next,
      previous,
      setVolume,
      toggleShuffle,
      toggleLoop,
      selectTrack,
      seek,
      audioRef,
    }}>
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" />
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
