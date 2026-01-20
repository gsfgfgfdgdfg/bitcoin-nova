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

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLoop, setIsLoop] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

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
            duration: '3:30',
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
        if (uniqueTracks.length > 0 && !currentTrack) {
          setCurrentTrack(uniqueTracks[0]);
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

  // Handle audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      if (isLoop) {
        audio.currentTime = 0;
        audio.play();
      } else {
        next();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isLoop]);

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

  // Handle track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    audio.src = currentTrack.url;
    audio.load();
    if (isPlaying) {
      audio.play().catch(console.error);
    }
  }, [currentTrack?.id]);

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
    
    setCurrentTrack(playlist[nextIndex]);
  }, [currentTrack, isShuffle, playlist]);

  const previous = useCallback(() => {
    if (!currentTrack || playlist.length === 0) return;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    setCurrentTrack(playlist[prevIndex]);
  }, [currentTrack, playlist]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
  }, []);

  const toggleShuffle = useCallback(() => setIsShuffle(prev => !prev), []);
  const toggleLoop = useCallback(() => setIsLoop(prev => !prev), []);
  
  const selectTrack = useCallback((track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  }, []);

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
