import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBotConfig, useBotTrades, useBotStats, useCreateBotConfig, useUpdateBotConfig, useBotActions } from '@/hooks/useBotData';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bitcoin, TrendingUp, Bot, Play, Square, Clock, Loader2, Sparkles, RefreshCw, Settings, Zap } from 'lucide-react';
import BollingerChart from '@/components/BollingerChart';
import TradeHistory from '@/components/TradeHistory';
import { formatUSD } from '@/lib/bollinger';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

const Dashboard = () => {
  const { t, language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: botConfig, isLoading: configLoading } = useBotConfig();
  const { data: trades, isLoading: tradesLoading } = useBotTrades();
  const { data: actions, isLoading: actionsLoading } = useBotActions();
  const stats = useBotStats();
  const createConfig = useCreateBotConfig();
  const updateConfig = useUpdateBotConfig();

  // State for base amount input and bot testing
  const [baseAmountInput, setBaseAmountInput] = useState<string>('6');
  const [isTestingBot, setIsTestingBot] = useState(false);

  // Currency pair inputs
  const [coinInput, setCoinInput] = useState('BTC');
  const [quoteInput, setQuoteInput] = useState('USDT');

  // Sync base amount input with config
  useEffect(() => {
    if (botConfig?.base_trade_usd) {
      setBaseAmountInput(String(botConfig.base_trade_usd));
    }
  }, [botConfig?.base_trade_usd]);

  // Sync currency pair inputs with config
  useEffect(() => {
    if (botConfig?.symbol) {
      const [coin, quote] = botConfig.symbol.split('-');
      setCoinInput(coin || 'BTC');
      setQuoteInput(quote || 'USDT');
    }
  }, [botConfig?.symbol]);

  // Get current symbol from config
  const currentSymbol = botConfig?.symbol || 'BTC-USDT';
  const isRunning = botConfig?.is_running || false;

  // Real price history from BingX - 168 candles = 7 days
  const { data: priceHistory = [], isLoading: pricesLoading, refetch: refetchPrices } = usePriceHistory(currentSymbol, '1h', 168);

  // Get current price for % calculations
  const currentPrice = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1]?.price || 0 : 0;

  // Calculate Win Rate correctly: profitable SELLs / total SELLs
  const calculatedStats = useMemo(() => {
    const sellTrades = (trades || []).filter(t => t.type === 'SELL');
    const winningSells = sellTrades.filter(t => Number(t.profit_usd) > 0).length;
    const winRate = sellTrades.length > 0 
      ? (winningSells / sellTrades.length) * 100 
      : 0;
    
    // Calculate P/L percentage based on initial $10,000
    const initialBalance = 10000;
    const currentValue = stats.balance + (stats.totalBtcHeld * currentPrice);
    const profitPercent = ((currentValue - initialBalance) / initialBalance) * 100;
    
    return {
      winRate,
      winningSells,
      totalSells: sellTrades.length,
      profitPercent,
      currentValue,
    };
  }, [trades, stats.balance, stats.totalBtcHeld, currentPrice]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Force refresh prices on mount and auto-refresh every 60 seconds
  useEffect(() => {
    const forceRefresh = async () => {
      try {
        await supabase.functions.invoke('sync-bingx-prices');
        queryClient.invalidateQueries({ queryKey: ['price-history'] });
        queryClient.invalidateQueries({ queryKey: ['current-price'] });
        refetchPrices();
      } catch (error) {
        console.error('Error syncing prices:', error);
      }
    };
    forceRefresh();

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['price-history'] });
      queryClient.invalidateQueries({ queryKey: ['current-price'] });
      queryClient.invalidateQueries({ queryKey: ['bot-trades'] });
      queryClient.invalidateQueries({ queryKey: ['bot-actions'] });
      refetchPrices();
    }, 60000);

    return () => clearInterval(interval);
  }, [queryClient, refetchPrices]);

  // Test bot handler
  const handleTestBot = async () => {
    setIsTestingBot(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-bot-simulation');
      if (error) throw error;
      
      const result = data?.results?.[0];
      const action = result?.action || 'NO_ACTION';
      const details = result?.details;
      
      queryClient.invalidateQueries({ queryKey: ['bot-trades'] });
      queryClient.invalidateQueries({ queryKey: ['bot-config'] });
      queryClient.invalidateQueries({ queryKey: ['bot-actions'] });
      queryClient.invalidateQueries({ queryKey: ['price-history'] });
      
      toast({
        title: `Bot: ${action}`,
        description: details 
          ? `${formatUSD(details.volumeUsd || details.volume || 0)} @ $${details.price?.toLocaleString() || 'N/A'}`
          : 'Test zakończony',
      });
    } catch (error: any) {
      toast({
        title: 'Błąd testu bota',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsTestingBot(false);
    }
  };

  useEffect(() => {
    if (user && !configLoading && !botConfig) {
      createConfig.mutate({});
    }
  }, [user, configLoading, botConfig]);

  const handleToggleBot = () => {
    if (botConfig) {
      updateConfig.mutate({ is_running: !botConfig.is_running });
    }
  };

  const handleSaveSymbol = () => {
    if (!isRunning && coinInput && quoteInput) {
      const newSymbol = `${coinInput.toUpperCase()}-${quoteInput.toUpperCase()}`;
      if (newSymbol !== currentSymbol) {
        // Reset position data when changing symbol
        updateConfig.mutate({
          symbol: newSymbol,
          total_btc_held: 0,
          avg_buy_price: 0,
          total_profit_usd: 0,
          total_trades: 0,
          winning_trades: 0,
        });
      }
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
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <p className="text-muted-foreground font-mono text-sm">
                + {stats.totalBtcHeld.toFixed(6)} {coinInput}
              </p>
              {stats.avgBuyPrice > 0 && (
                <p className="text-muted-foreground font-mono text-xs">
                  Avg: ${stats.avgBuyPrice.toFixed(2)}
                </p>
              )}
            </div>

            {/* P&L Card - percentage first */}
            <div className="cyber-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <span className="text-muted-foreground font-medium">{t.dashboard.pnl}</span>
              </div>
              <p className={`font-display text-3xl font-bold ${calculatedStats.profitPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                {calculatedStats.profitPercent >= 0 ? '+' : ''}{calculatedStats.profitPercent.toFixed(2)}%
              </p>
              <p className={`font-mono text-sm ${stats.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.totalProfit >= 0 ? '+' : ''}{formatUSD(stats.totalProfit)}
              </p>
              <p className="text-muted-foreground font-mono text-xs mt-1">
                {language === 'pl' ? 'Zyskowne' : 'Profitable'}: {calculatedStats.winningSells}/{calculatedStats.totalSells} ({calculatedStats.winRate.toFixed(0)}%)
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
              <p className="text-xs text-muted-foreground mt-1">
                {botConfig?.last_trade_hour ? (
                  <>Ostatnia akcja: {formatDistanceToNow(new Date(botConfig.last_trade_hour), { addSuffix: true, locale: pl })}</>
                ) : (
                  'Brak transakcji'
                )}
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={handleToggleBot}
                  disabled={updateConfig.isPending}
                  size="sm"
                  className={`flex-1 ${isRunning 
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestBot}
                  disabled={isTestingBot}
                  title="Ręczny test bota"
                >
                  {isTestingBot ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Bot Configuration Card */}
            <div className="cyber-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-muted-foreground font-medium">
                  {language === 'pl' ? 'Konfiguracja' : 'Configuration'}
                </span>
              </div>
              <div className="space-y-3">
                {/* Currency pair inputs */}
                <div className="flex items-center gap-1">
                  <Input
                    value={coinInput}
                    onChange={(e) => setCoinInput(e.target.value.toUpperCase())}
                    onBlur={handleSaveSymbol}
                    disabled={isRunning}
                    className="w-20 text-center font-mono"
                    placeholder="BTC"
                  />
                  <span className="text-muted-foreground">/</span>
                  <Input
                    value={quoteInput}
                    onChange={(e) => setQuoteInput(e.target.value.toUpperCase())}
                    onBlur={handleSaveSymbol}
                    disabled={isRunning}
                    className="w-20 text-center font-mono"
                    placeholder="USDT"
                  />
                </div>
                {isRunning && (
                  <p className="text-xs text-destructive">
                    {language === 'pl' ? 'Zatrzymaj bota aby zmienić parę' : 'Stop bot to change pair'}
                  </p>
                )}
                {/* Base amount */}
                <div className="flex items-center gap-2">
                  <Input
                    id="baseAmount"
                    type="number"
                    min="1"
                    max="100"
                    step="0.5"
                    value={baseAmountInput}
                    onChange={(e) => setBaseAmountInput(e.target.value)}
                    onBlur={() => {
                      const value = parseFloat(baseAmountInput);
                      if (!isNaN(value) && value >= 1 && value <= 100) {
                        updateConfig.mutate({ base_trade_usd: value });
                      }
                    }}
                    className="w-20 text-center font-mono"
                  />
                  <span className="text-muted-foreground text-sm">USD base</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'pl' ? 'Zakres' : 'Range'}: {((botConfig?.base_trade_usd || 6) * 1).toFixed(2)} - {((botConfig?.base_trade_usd || 6) * 2).toFixed(2)} USD
                </p>
              </div>
            </div>
          </div>

          {/* Bollinger Chart */}
          <div className="lg:col-span-2 cyber-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <Bot className="w-5 h-5 text-bitcoin-orange" />
                {language === 'pl' ? `Wykres ${currentSymbol} (1h, 7 dni)` : `${currentSymbol} Chart (1h, 7 days)`}
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
              <BollingerChart priceHistory={priceHistory} trades={trades || []} symbol={currentSymbol} />
            )}
          </div>

          {/* Trade History */}
          <div className="cyber-card rounded-xl p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-bitcoin-orange" />
              {t.dashboard.recentActions}
            </h2>
            <TradeHistory 
              trades={trades || []} 
              actions={actions || []}
              isLoading={tradesLoading || actionsLoading} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
