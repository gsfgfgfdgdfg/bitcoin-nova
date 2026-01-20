import { Play, Pause, Download, Heart, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { Button } from '@/components/ui/button';

const Music = () => {
  const { t } = useLanguage();
  const { currentTrack, isPlaying, playlist, toggle, selectTrack } = useMusic();

  return (
    <div className="min-h-screen pb-24">
      {/* Hero */}
      <section className="relative py-16 overflow-hidden scanlines">
        <div className="absolute inset-0 bg-gradient-radial from-bitcoin-orange/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-20" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <h1 className="font-display text-4xl md:text-6xl font-black mb-4 glitch neon-text" data-text={t.music.title}>
              {t.music.title}
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
              {t.music.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Now Playing Hero */}
      <section className="container mx-auto px-4 py-12">
        <div className="cyber-card rounded-2xl p-8 neon-border">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Album Art */}
            <div className="relative w-64 h-64 rounded-xl bg-gradient-to-br from-bitcoin-orange/20 to-bitcoin-gold/10 flex items-center justify-center shrink-0 overflow-hidden group">
              {isPlaying && (
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
              )}
              <span className="text-8xl font-display font-black text-bitcoin-orange/30 z-10 group-hover:text-bitcoin-orange/50 transition-colors">₿</span>
              <div className="absolute inset-0 bg-gradient-to-t from-cyber-dark via-transparent to-transparent" />
            </div>

            {/* Track Info */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-bitcoin-orange font-semibold mb-2">{t.music.nowPlaying}</p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                {currentTrack?.title || 'Select a track'}
              </h2>
              <p className="text-muted-foreground text-xl mb-6">{currentTrack?.artist || 'Unknown Artist'}</p>
              
              <div className="flex items-center justify-center md:justify-start gap-4">
                <Button
                  onClick={toggle}
                  size="lg"
                  className="bg-gradient-to-r from-bitcoin-orange to-bitcoin-gold text-background font-bold px-8 hover:shadow-[0_0_30px_hsl(var(--bitcoin-orange)/0.4)] transition-shadow"
                >
                  {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button variant="outline" size="lg" className="border-bitcoin-orange/50 text-bitcoin-orange hover:bg-bitcoin-orange/10">
                  <Heart className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Playlist */}
      <section className="container mx-auto px-4 pb-12">
        <h3 className="font-display text-2xl font-bold text-foreground mb-6">{t.music.playlist}</h3>
        
        <div className="space-y-2">
          {playlist.map((track, index) => {
            const isActive = currentTrack?.id === track.id;
            
            return (
              <div
                key={track.id}
                onClick={() => selectTrack(track)}
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-bitcoin-orange/10 border border-bitcoin-orange/30' 
                    : 'bg-card hover:bg-secondary border border-transparent'
                }`}
              >
                {/* Track Number / Play Icon */}
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
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
                  ) : (
                    <span className="text-muted-foreground font-mono">{index + 1}</span>
                  )}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${isActive ? 'text-bitcoin-orange' : 'text-foreground'}`}>
                    {track.title}
                  </p>
                  <p className="text-muted-foreground text-sm truncate">{track.artist}</p>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1 text-sm font-mono">
                    <Clock className="w-4 h-4" />
                    {track.duration}
                  </span>
                  <Button variant="ghost" size="sm" className="hover:text-bitcoin-orange">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Source Attribution */}
      <section className="container mx-auto px-4 pb-12">
        <div className="text-center p-6 rounded-xl bg-card border border-border">
          <p className="text-muted-foreground">
            Music curated from <span className="text-bitcoin-orange font-semibold">@BitcoinNaszaSila</span> YouTube Channel
          </p>
        </div>
      </section>
    </div>
  );
};

export default Music;
