import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBotConfig, useBotTrades, useBotStats, useCreateBotConfig, useUpdateBotConfig, useBotActions } from '@/hooks/useBotData';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bitcoin, TrendingUp, Bot, Play, Square, Clock, Loader2, Sparkles, RefreshCw, Settings, Zap } from 'lucide-react';
import BollingerChart from '@/components/BollingerChart';
import TradeHistory from '@/components/TradeHistory';
import { formatUSD } from '@/lib/bollinger';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

const INTERVALS = ['1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w','1M'];

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

  // State for inputs
  const [baseAmountInput, setBaseAmountInput] = useState<string>('6');
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [coinInput, setCoinInput] = useState('BTC');
  const [quoteInput, setQuoteInput] = useState('USDT');
  const [tradeMode, setTradeMode] = useState<string>('fixed');
  const [tradePercentInput, setTradePercentInput] = useState<string>('5');
  const [tradeMinUsdInput, setTradeMinUsdInput] = useState<string>('2');
  const [intervalValue, setIntervalValue] = useState<string>('1h');

  // Sync inputs with config
  useEffect(() => {
    if (botConfig) {
      setBaseAmountInput(String(botConfig.base_trade_usd || 6));
      setTradeMode(botConfig.trade_mode || 'fixed');
      setTradePercentInput(String(botConfig.trade_percent || 5));
      setTradeMinUsdInput(String(botConfig.trade_min_usd || 2));
      setIntervalValue(botConfig.interval || '1h');
    }
  }, [botConfig?.base_trade_usd, botConfig?.trade_mode, botConfig?.trade_percent, botConfig?.trade_min_usd, botConfig?.interval]);

  useEffect(() => {
    if (botConfig?.symbol) {
      const [coin, quote] = botConfig.symbol.split('-');
      setCoinInput(coin || 'BTC');
      setQuoteInput(quote || 'USDT');
    }
  }, [botConfig?.symbol]);

  const currentSymbol = botConfig?.symbol || 'BTC-USDT';
  const coinName = currentSymbol.split('-')[0] || 'BTC';
  const isRunning = botConfig?.is_running || false;

  // Price history using configured interval
  const { data: priceHistory = [], isLoading: pricesLoading, refetch: refetchPrices } = usePriceHistory(currentSymbol, intervalValue, 168);

  const currentPrice = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1]?.price || 0 : 0;

  const calculatedStats = useMemo(() => {
    const sellTrades = (trades || []).filter(t => t.type === 'SELL');
    const winningSells = sellTrades.filter(t => Number(t.profit_usd) > 0).length;
    const winRate = sellTrades.length > 0 
      ? (winningSells / sellTrades.length) * 100 
      : 0;
    
    const initialBalance = 10000;
    const currentValue = stats.balance + (stats.totalBtcHeld * currentPrice);
    const profitPercent = ((currentValue - initialBalance) / initialBalance) * 100;
    
    return { winRate, winningSells, totalSells: sellTrades.length, profitPercent, currentValue };
  }, [trades, stats.balance, stats.totalBtcHeld, currentPrice]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

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
      toast({ title: 'Błąd testu bota', description: error.message, variant: 'destructive' });
    } finally {
      setIsTestingBot(false);
    }
  };

  useEffect(() => {
    if (user && !configLoading && !botConfig) createConfig.mutate({});
  }, [user, configLoading, botConfig]);

  const handleToggleBot = () => {
    if (botConfig) updateConfig.mutate({ is_running: !botConfig.is_running });
  };

  const handleSaveSymbol = () => {
    if (!isRunning && coinInput && quoteInput) {
      const newSymbol = `${coinInput.toUpperCase()}-${quoteInput.toUpperCase()}`;
      if (newSymbol !== currentSymbol) {
        updateConfig.mutate({
          symbol: newSymbol, total_btc_held: 0, avg_buy_price: 0,
          total_profit_usd: 0, total_trades: 0, winning_trades: 0,
        });
      }
    }
  };

  const handleTradeModeChange = (mode: string) => {
    setTradeMode(mode);
    updateConfig.mutate({ trade_mode: mode } as any);
  };

  const handleIntervalChange = async (newInterval: string) => {
    setIntervalValue(newInterval);
    updateConfig.mutate({ interval: newInterval } as any);
    // Trigger sync to fetch candles for new interval
    try {
      await supabase.functions.invoke('sync-bingx-prices');
      queryClient.invalidateQueries({ queryKey: ['price-history'] });
      refetchPrices();
    } catch (e) {
      console.error('Error syncing after interval change:', e);
    }
  };

  if (authLoading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-bitcoin-orange" />
      </div>
    );
  }

  if (!user) return null;

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
                + {stats.totalBtcHeld.toFixed(6)} {coinName}
              </p>
              {stats.avgBuyPrice > 0 && (
                <p className="text-muted-foreground font-mono text-xs">
                  Avg: ${stats.avgBuyPrice.toFixed(2)}
                </p>
              )}
            </div>

            {/* P&L Card */}
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
                ) : ('Brak transakcji')}
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
                  variant="outline" size="sm"
                  onClick={handleTestBot} disabled={isTestingBot}
                  title="Ręczny test bota"
                >
                  {isTestingBot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
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
                {/* Currency pair */}
                <div className="flex items-center gap-1">
                  <Input value={coinInput} onChange={(e) => setCoinInput(e.target.value.toUpperCase())} onBlur={handleSaveSymbol} disabled={isRunning} className="w-20 text-center font-mono" placeholder="BTC" />
                  <span className="text-muted-foreground">/</span>
                  <Input value={quoteInput} onChange={(e) => setQuoteInput(e.target.value.toUpperCase())} onBlur={handleSaveSymbol} disabled={isRunning} className="w-20 text-center font-mono" placeholder="USDT" />
                </div>
                {isRunning && (
                  <p className="text-xs text-destructive">
                    {language === 'pl' ? 'Zatrzymaj bota aby zmienić parę' : 'Stop bot to change pair'}
                  </p>
                )}

                {/* Interval selector */}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">Interwał:</span>
                  <Select value={intervalValue} onValueChange={handleIntervalChange}>
                    <SelectTrigger className="w-20 h-8 font-mono text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVALS.map(i => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Trade mode switch */}
                <Tabs value={tradeMode} onValueChange={handleTradeModeChange}>
                  <TabsList className="h-8">
                    <TabsTrigger value="fixed" className="text-xs px-3 py-1">USD</TabsTrigger>
                    <TabsTrigger value="percent" className="text-xs px-3 py-1">%</TabsTrigger>
                  </TabsList>
                </Tabs>

                {tradeMode === 'fixed' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min="1" max="100" step="0.5"
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
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min="0.1" max="100" step="0.5"
                        value={tradePercentInput}
                        onChange={(e) => setTradePercentInput(e.target.value)}
                        onBlur={() => {
                          const value = parseFloat(tradePercentInput);
                          if (!isNaN(value) && value >= 0.1 && value <= 100) {
                            updateConfig.mutate({ trade_percent: value } as any);
                          }
                        }}
                        className="w-16 text-center font-mono"
                      />
                      <span className="text-muted-foreground text-xs">% kapitału</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min="0.5" max="100" step="0.5"
                        value={tradeMinUsdInput}
                        onChange={(e) => setTradeMinUsdInput(e.target.value)}
                        onBlur={() => {
                          const value = parseFloat(tradeMinUsdInput);
                          if (!isNaN(value) && value >= 0.5) {
                            updateConfig.mutate({ trade_min_usd: value } as any);
                          }
                        }}
                        className="w-16 text-center font-mono"
                      />
                      <span className="text-muted-foreground text-xs">min. USD</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Teraz: ~{formatUSD(stats.balance * (Number(tradePercentInput) || 5) / 100)} ({tradePercentInput}% z {formatUSD(stats.balance)})
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bollinger Chart */}
          <div className="lg:col-span-2 cyber-card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <Bot className="w-5 h-5 text-bitcoin-orange" />
                {language === 'pl' ? `Wykres ${currentSymbol} (${intervalValue})` : `${currentSymbol} Chart (${intervalValue})`}
              </h2>
              <Button
                variant="ghost" size="sm"
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
              symbol={currentSymbol}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
