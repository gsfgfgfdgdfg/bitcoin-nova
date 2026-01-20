import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

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

const initialPlaylist: Track[] = [
  { id: '1', title: 'Bitcoin Anthem', artist: 'Bitcoin Nasza Siła', duration: '3:45', url: '#', thumbnail: '' },
  { id: '2', title: 'Stack Sats Daily', artist: 'Satoshi Beats', duration: '4:12', url: '#', thumbnail: '' },
  { id: '3', title: 'HODL Forever', artist: 'Crypto Rhymes', duration: '3:28', url: '#', thumbnail: '' },
  { id: '4', title: '21 Million Dreams', artist: 'Bitcoin Nasza Siła', duration: '5:01', url: '#', thumbnail: '' },
  { id: '5', title: 'Orange Pill Me', artist: 'The Maximalists', duration: '3:55', url: '#', thumbnail: '' },
  { id: '6', title: 'Lightning Fast', artist: 'Node Runners', duration: '4:33', url: '#', thumbnail: '' },
  { id: '7', title: 'Satoshi Vision', artist: 'Bitcoin Nasza Siła', duration: '4:18', url: '#', thumbnail: '' },
  { id: '8', title: 'Not Your Keys', artist: 'Cold Storage Crew', duration: '3:42', url: '#', thumbnail: '' },
];

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(initialPlaylist[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLoop, setIsLoop] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying(prev => !prev), []);

  const next = useCallback(() => {
    if (!currentTrack) return;
    const currentIndex = initialPlaylist.findIndex(t => t.id === currentTrack.id);
    let nextIndex: number;
    
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * initialPlaylist.length);
    } else {
      nextIndex = (currentIndex + 1) % initialPlaylist.length;
    }
    
    setCurrentTrack(initialPlaylist[nextIndex]);
  }, [currentTrack, isShuffle]);

  const previous = useCallback(() => {
    if (!currentTrack) return;
    const currentIndex = initialPlaylist.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? initialPlaylist.length - 1 : currentIndex - 1;
    setCurrentTrack(initialPlaylist[prevIndex]);
  }, [currentTrack]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
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
      playlist: initialPlaylist,
      currentTime,
      duration,
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
