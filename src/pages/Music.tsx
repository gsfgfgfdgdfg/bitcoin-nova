import { Play, Pause, Download, Heart, Clock, Music2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const formatTime = (seconds: number): string => {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const Music = () => {
  const { t } = useLanguage();
  const { 
    currentTrack, 
    isPlaying, 
    playlist, 
    toggle, 
    selectTrack, 
    isLoading, 
    isBuffering,
    error,
    currentTime,
    duration,
    seek
  } = useMusic();

  const handleDownload = async (track: typeof playlist[0]) => {
    try {
      const response = await fetch(track.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen pb-32">
      {/* Hero */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-bitcoin-orange/5 via-transparent to-transparent" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">
              <span className="text-gradient">{t.music.title}</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
              {t.music.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Loading State */}
      {isLoading && (
        <section className="container mx-auto px-4 py-12">
          <div className="glass-card rounded-2xl p-12 premium-border">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 text-bitcoin-orange animate-spin" />
              <p className="text-muted-foreground">Ładowanie muzyki...</p>
            </div>
          </div>
        </section>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <section className="container mx-auto px-4 py-12">
          <div className="glass-card rounded-2xl p-12 premium-border">
            <div className="flex flex-col items-center justify-center gap-4">
              <AlertCircle className="w-12 h-12 text-destructive" />
              <p className="text-foreground font-semibold">Wystąpił błąd</p>
              <p className="text-muted-foreground text-center max-w-md">{error}</p>
              <Button onClick={handleRefresh} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Spróbuj ponownie
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Empty Playlist State */}
      {!isLoading && !error && playlist.length === 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="glass-card rounded-2xl p-12 premium-border">
            <div className="flex flex-col items-center justify-center gap-4">
              <Music2 className="w-16 h-16 text-muted-foreground" />
              <p className="text-foreground font-semibold text-xl">Brak dostępnych utworów</p>
              <p className="text-muted-foreground text-center max-w-md">
                Wgraj pliki MP3 do bucketu "Muzyczki" w Supabase Storage, aby rozpocząć słuchanie.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Now Playing Hero */}
      {!isLoading && playlist.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="glass-card rounded-2xl p-8 premium-border">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Album Art */}
              <div className="relative w-64 h-64 rounded-2xl bg-gradient-to-br from-bitcoin-orange/10 to-bitcoin-gold/5 flex items-center justify-center shrink-0 overflow-hidden group border border-bitcoin-orange/20">
                {isBuffering ? (
                  <Loader2 className="w-16 h-16 text-bitcoin-orange animate-spin" />
                ) : isPlaying ? (
                  <div className="absolute inset-0 flex items-end justify-center gap-1 p-8">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="w-2 bg-gradient-to-t from-bitcoin-orange to-bitcoin-gold rounded-full sound-bar"
                        style={{
                          animationDelay: `${i * 0.08}s`,
                          height: '20%',
                        }}
                      />
                    ))}
                  </div>
                ) : null}
                <span className="text-8xl font-display font-bold text-bitcoin-orange/20 z-10 group-hover:text-bitcoin-orange/30 transition-colors">₿</span>
              </div>

              {/* Track Info */}
              <div className="flex-1 text-center md:text-left w-full">
                <p className="text-bitcoin-orange font-semibold mb-2">{t.music.nowPlaying}</p>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {currentTrack?.title || 'Wybierz utwór'}
                </h2>
                <p className="text-muted-foreground text-xl mb-4">{currentTrack?.artist || 'Unknown Artist'}</p>
                
                {/* Progress bar */}
                {currentTrack && (
                  <div className="mb-6 space-y-2">
                    <Slider
                      value={[currentTime]}
                      max={duration || 100}
                      step={0.1}
                      onValueChange={([time]) => seek(time)}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground font-mono">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <Button
                    onClick={toggle}
                    size="lg"
                    disabled={isBuffering}
                    className="bg-gradient-to-r from-bitcoin-orange to-bitcoin-gold text-white font-bold px-8 shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {isBuffering ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-5 h-5 mr-2" />
                    ) : (
                      <Play className="w-5 h-5 mr-2" />
                    )}
                    {isBuffering ? 'Ładowanie...' : isPlaying ? 'Pauza' : 'Odtwórz'}
                  </Button>
                  <Button variant="outline" size="lg" className="border-bitcoin-orange/30 text-bitcoin-orange hover:bg-bitcoin-orange/10">
                    <Heart className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Playlist */}
      {!isLoading && playlist.length > 0 && (
        <section className="container mx-auto px-4 pb-12">
          <h3 className="font-display text-2xl font-bold text-foreground mb-6">{t.music.playlist}</h3>
          
          <div className="space-y-2">
            {playlist.map((track, index) => {
              const isActive = currentTrack?.id === track.id;
              
              return (
                <div
                  key={track.id}
                  onClick={() => selectTrack(track)}
                  className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all group ${
                    isActive 
                      ? 'bg-bitcoin-orange/10 border border-bitcoin-orange/20 shadow-sm' 
                      : 'bg-card hover:bg-secondary border border-transparent hover:border-border'
                  }`}
                >
                  {/* Track Number / Play Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? 'bg-bitcoin-orange/20' : 'bg-secondary group-hover:bg-bitcoin-orange/10'
                  }`}>
                    {isActive && isPlaying ? (
                      <div className="flex items-end gap-0.5 h-4">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-bitcoin-orange rounded-full sound-bar"
                            style={{ animationDelay: `${i * 0.1}s`, height: '50%' }}
                          />
                        ))}
                      </div>
                    ) : isActive && isBuffering ? (
                      <Loader2 className="w-4 h-4 text-bitcoin-orange animate-spin" />
                    ) : (
                      <span className={`font-mono transition-opacity ${
                        isActive ? 'text-bitcoin-orange' : 'text-muted-foreground group-hover:opacity-0'
                      }`}>
                        {index + 1}
                      </span>
                    )}
                    {!isActive && (
                      <Play className="w-4 h-4 text-bitcoin-orange absolute opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate transition-colors ${isActive ? 'text-bitcoin-orange' : 'text-foreground'}`}>
                      {track.title}
                    </p>
                    <p className="text-muted-foreground text-sm truncate">{track.artist}</p>
                  </div>

                  {/* Duration & Actions */}
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1 text-sm font-mono">
                      <Clock className="w-4 h-4" />
                      {track.duration}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="hover:text-bitcoin-orange hover:bg-bitcoin-orange/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(track);
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Source Attribution */}
      <section className="container mx-auto px-4 pb-12">
        <div className="text-center p-6 rounded-xl bg-card border border-border">
          <p className="text-muted-foreground">
            Muzyka od <span className="text-bitcoin-orange font-semibold">@BitcoinNaszaSila</span>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Music;
