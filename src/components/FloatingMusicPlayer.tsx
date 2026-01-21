import { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1, Shuffle, Repeat, ChevronUp, ChevronDown, Loader2, Music2 } from 'lucide-react';
import { useMusic } from '@/contexts/MusicContext';
import { Slider } from '@/components/ui/slider';

const formatTime = (seconds: number): string => {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const FloatingMusicPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    volume,
    isShuffle,
    isLoop,
    currentTime,
    duration,
    isLoading,
    isBuffering,
    error,
    playlist,
    toggle,
    next,
    previous,
    setVolume,
    toggleShuffle,
    toggleLoop,
    seek,
  } = useMusic();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.7);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Update mute state when volume changes externally
  useEffect(() => {
    if (volume === 0 && !isMuted) {
      setIsMuted(true);
    } else if (volume > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [volume, isMuted]);

  // Don't show player if no tracks available
  if (isLoading || playlist.length === 0) return null;

  const handleVolumeToggle = () => {
    if (isMuted || volume === 0) {
      setVolume(previousVolume || 0.7);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleVolumeChange = ([v]: number[]) => {
    const newVolume = v / 100;
    setVolume(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
      setPreviousVolume(newVolume);
    }
  };

  const handleSeek = ([time]: number[]) => {
    seek(time);
  };

  const VolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX className="w-4 h-4" />;
    if (volume < 0.5) return <Volume1 className="w-4 h-4" />;
    return <Volume2 className="w-4 h-4" />;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border shadow-lg transition-all duration-300 ${isExpanded ? 'h-auto' : 'h-20'}`}>
      {/* Playing indicator line */}
      {isPlaying && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-bitcoin-orange to-transparent opacity-60" />
      )}

      {/* Progress bar (thin, always visible at top) */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-secondary/50">
        <div 
          className="h-full bg-gradient-to-r from-bitcoin-orange to-bitcoin-gold transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="container mx-auto px-4 h-full">
        <div className="flex items-center justify-between h-20">
          {/* Track Info */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-bitcoin-orange/20 to-bitcoin-gold/10 flex items-center justify-center shrink-0 overflow-hidden border border-bitcoin-orange/20">
              {isBuffering ? (
                <Loader2 className="w-5 h-5 text-bitcoin-orange animate-spin" />
              ) : isPlaying ? (
                <div className="absolute inset-0 flex items-end justify-center gap-0.5 p-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-bitcoin-orange rounded-full sound-bar"
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        height: '30%',
                      }}
                    />
                  ))}
                </div>
              ) : (
                <Music2 className="w-5 h-5 text-bitcoin-orange/50" />
              )}
              <span className="text-bitcoin-orange font-display text-xl font-bold z-10 opacity-30">₿</span>
            </div>
            
            <div className="min-w-0">
              <p className="text-foreground font-semibold truncate">
                {currentTrack?.title || 'Wybierz utwór'}
              </p>
              <p className="text-muted-foreground text-sm truncate">
                {currentTrack?.artist || 'Bitcoin Nasza Siła'}
              </p>
              {error && (
                <p className="text-destructive text-xs truncate">{error}</p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleShuffle}
              className={`hidden sm:flex p-2 rounded-lg transition-colors ${isShuffle ? 'text-bitcoin-orange bg-bitcoin-orange/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
              title="Losuj"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={previous}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              title="Poprzedni"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={toggle}
              disabled={isBuffering}
              className={`w-12 h-12 rounded-full bg-gradient-to-br from-bitcoin-orange to-bitcoin-gold flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 ${!isPlaying ? 'animate-pulse-subtle' : ''}`}
              title={isPlaying ? 'Pauza' : 'Odtwórz'}
            >
              {isBuffering ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            <button
              onClick={next}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              title="Następny"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={toggleLoop}
              className={`hidden sm:flex p-2 rounded-lg transition-colors ${isLoop ? 'text-bitcoin-orange bg-bitcoin-orange/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
              title="Powtarzaj"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Volume & Expand */}
          <div className="hidden sm:flex items-center gap-4 flex-1 justify-end">
            {/* Time display */}
            <span className="text-xs text-muted-foreground font-mono min-w-[70px] text-right">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Volume control */}
            <div 
              className="flex items-center gap-2 relative"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button 
                onClick={handleVolumeToggle} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors"
                title={isMuted ? 'Włącz dźwięk' : 'Wycisz'}
              >
                <VolumeIcon />
              </button>
              
              <div className={`flex items-center transition-all duration-200 ${showVolumeSlider ? 'w-20 opacity-100' : 'w-20 opacity-70'}`}>
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  max={100}
                  step={1}
                  onValueChange={handleVolumeChange}
                  className="w-full"
                />
              </div>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              title={isExpanded ? 'Zwiń' : 'Rozwiń'}
            >
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile volume button */}
          <button
            onClick={handleVolumeToggle}
            className="sm:hidden p-2 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <VolumeIcon />
          </button>
        </div>

        {/* Expanded View - Interactive Seekbar */}
        {isExpanded && (
          <div className="pb-4 pt-2 space-y-4">
            {/* Seekbar */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground font-mono w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground font-mono w-10">
                {formatTime(duration)}
              </span>
            </div>

            {/* Mobile controls */}
            <div className="flex sm:hidden items-center justify-center gap-6">
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded-lg transition-colors ${isShuffle ? 'text-bitcoin-orange bg-bitcoin-orange/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
              >
                <Shuffle className="w-5 h-5" />
              </button>
              
              <button
                onClick={toggleLoop}
                className={`p-2 rounded-lg transition-colors ${isLoop ? 'text-bitcoin-orange bg-bitcoin-orange/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
              >
                <Repeat className="w-5 h-5" />
              </button>

              {/* Mobile volume slider */}
              <div className="flex items-center gap-2 flex-1 max-w-32">
                <VolumeIcon />
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  max={100}
                  step={1}
                  onValueChange={handleVolumeChange}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingMusicPlayer;
