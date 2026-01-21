import { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, ChevronUp, ChevronDown } from 'lucide-react';
import { useMusic } from '@/contexts/MusicContext';
import { Slider } from '@/components/ui/slider';

const FloatingMusicPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    volume,
    isShuffle,
    isLoop,
    toggle,
    next,
    previous,
    setVolume,
    toggleShuffle,
    toggleLoop,
  } = useMusic();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  if (!currentTrack) return null;

  const handleVolumeToggle = () => {
    if (isMuted) {
      setVolume(0.7);
      setIsMuted(false);
    } else {
      setVolume(0);
      setIsMuted(true);
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border shadow-lg transition-all duration-300 ${isExpanded ? 'h-32' : 'h-20'}`}>
      {/* Subtle gradient line at top */}
      {isPlaying && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-bitcoin-orange to-transparent opacity-60" />
      )}

      <div className="container mx-auto px-4 h-full">
        <div className="flex items-center justify-between h-20">
          {/* Track Info */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-bitcoin-orange/20 to-bitcoin-gold/10 flex items-center justify-center shrink-0 overflow-hidden border border-bitcoin-orange/20">
              {isPlaying && (
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
              )}
              <span className="text-bitcoin-orange font-display text-xl font-bold z-10">₿</span>
            </div>
            
            <div className="min-w-0">
              <p className="text-foreground font-semibold truncate">{currentTrack.title}</p>
              <p className="text-muted-foreground text-sm truncate">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleShuffle}
              className={`hidden sm:flex p-2 rounded-lg transition-colors ${isShuffle ? 'text-bitcoin-orange bg-bitcoin-orange/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={previous}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={toggle}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-bitcoin-orange to-bitcoin-gold flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <button
              onClick={next}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={toggleLoop}
              className={`hidden sm:flex p-2 rounded-lg transition-colors ${isLoop ? 'text-bitcoin-orange bg-bitcoin-orange/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Volume & Expand */}
          <div className="hidden sm:flex items-center gap-4 flex-1 justify-end">
            <div className="flex items-center gap-2 w-32">
              <button onClick={handleVolumeToggle} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                max={100}
                step={1}
                onValueChange={([v]) => {
                  setVolume(v / 100);
                  if (v > 0) setIsMuted(false);
                }}
                className="w-20"
              />
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="h-12 flex items-center">
            <div className="w-full bg-secondary rounded-full h-1.5 relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-bitcoin-orange to-bitcoin-gold rounded-full" />
            </div>
            <span className="ml-4 text-sm text-muted-foreground font-mono whitespace-nowrap">1:23 / {currentTrack.duration}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingMusicPlayer;