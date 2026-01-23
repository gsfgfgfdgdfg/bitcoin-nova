import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBotConfig, useBotTrades, useBotStats, useCreateBotConfig, useUpdateBotConfig } from '@/hooks/useBotData';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { Button } from '@/components/ui/button';
import { Bitcoin, TrendingUp, Bot, Play, Square, Clock, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import BollingerChart from '@/components/BollingerChart';
import TradeHistory from '@/components/TradeHistory';
import StrategyExplainer from '@/components/StrategyExplainer';
import { formatUSD } from '@/lib/bollinger';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const Dashboard = () => {
  const { t, language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: botConfig, isLoading: configLoading } = useBotConfig();
  const { data: trades, isLoading: tradesLoading } = useBotTrades();
  const stats = useBotStats();
  const createConfig = useCreateBotConfig();
  const updateConfig = useUpdateBotConfig();

  // Rzeczywista historia cen z BingX
  const { data: priceHistory = [], isLoading: pricesLoading, refetch: refetchPrices } = usePriceHistory('BTC-USDT', '1h', 30);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Sync prices on mount
  useEffect(() => {
    const syncPrices = async () => {
      try {
        await supabase.functions.invoke('sync-bingx-prices');
        queryClient.invalidateQueries({ queryKey: ['price-history'] });
        queryClient.invalidateQueries({ queryKey: ['current-price'] });
      } catch (error) {
        console.error('Error syncing prices:', error);
      }
    };
    syncPrices();
  }, [queryClient]);

  useEffect(() => {
    // Create default config for new users
    if (user && !configLoading && !botConfig) {
      createConfig.mutate({});
    }
  }, [user, configLoading, botConfig]);

  const handleToggleBot = () => {
    if (botConfig) {
      updateConfig.mutate({ is_running: !botConfig.is_running });
    }
  };

  if (authLoading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-bitcoin-orange" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isRunning = botConfig?.is_running || false;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <section className="relative py-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-bitcoin-orange/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-bitcoin-orange" />
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              {language === 'pl' ? 'Strefa Pasjonata' : 'Enthusiast Zone'}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {language === 'pl' ? `Witaj, ${user.email}` : `Welcome, ${user.email}`}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Balance Card */}
            <div className="cyber-card rounded-xl p-6 neon-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-bitcoin-orange/20 flex items-center justify-center">
                  <Bitcoin className="w-5 h-5 text-bitcoin-orange" />
                </div>
                <span className="text-muted-foreground font-medium">
                  {language === 'pl' ? 'Saldo Symulacji' : 'Simulation Balance'}
                </span>
              </div>
              <p className="font-display text-3xl font-bold text-foreground">
                {formatUSD(stats.balance)}
              </p>
              <p className="text-muted-foreground font-mono">
                + {stats.totalBtcHeld.toFixed(6)} BTC
              </p>
            </div>

            {/* P&L Card */}
            <div className="cyber-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <span className="text-muted-foreground font-medium">{t.dashboard.pnl}</span>
              </div>
              <p className={`font-display text-3xl font-bold ${stats.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.totalProfit >= 0 ? '+' : ''}{formatUSD(stats.totalProfit)}
              </p>
              <p className="text-muted-foreground font-mono">
                Win rate: {stats.winRate.toFixed(1)}%
              </p>
            </div>

            {/* Bot Status Card */}
            <div className="cyber-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isRunning ? 'bg-success/20' : 'bg-muted'}`}>
                  <Bot className={`w-5 h-5 ${isRunning ? 'text-success' : 'text-muted-foreground'}`} />
                </div>
                <span className="text-muted-foreground font-medium">{t.dashboard.tradingBot}</span>
              </div>
              <p className={`font-display text-2xl font-bold ${isRunning ? 'text-success' : 'text-muted-foreground'}`}>
                {isRunning ? 'RUNNING' : 'STOPPED'}
              </p>
              <Button
                onClick={handleToggleBot}
                disabled={updateConfig.isPending}
                className={`mt-2 w-full ${isRunning 
                  ? 'bg-destructive hover:bg-destructive/90' 
                  : 'bg-gradient-to-r from-bitcoin-orange to-bitcoin-gold'}`}
              >
                {updateConfig.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isRunning ? (
                  <><Square className="w-4 h-4 mr-2" />{t.dashboard.stopBot}</>
                ) : (
                  <><Play className="w-4 h-4 mr-2" />{t.dashboard.startBot}</>
                )}
              </Button>
            </div>
          </div>

          {/* Bollinger Chart */}
          <div className="lg:col-span-2 cyber-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <Bot className="w-5 h-5 text-bitcoin-orange" />
                {language === 'pl' ? 'Wykres Strategii Bollingera (1h)' : 'Bollinger Strategy Chart (1h)'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchPrices()}
                disabled={pricesLoading}
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`w-4 h-4 ${pricesLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {pricesLoading && priceHistory.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-bitcoin-orange" />
              </div>
            ) : (
              <BollingerChart priceHistory={priceHistory} />
            )}
          </div>

          {/* Trade History */}
          <div className="cyber-card rounded-xl p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-bitcoin-orange" />
              {t.dashboard.recentActions}
            </h2>
            <TradeHistory trades={trades || []} isLoading={tradesLoading} />
          </div>

          {/* Strategy Explainer */}
          <div className="lg:col-span-3">
            <StrategyExplainer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
