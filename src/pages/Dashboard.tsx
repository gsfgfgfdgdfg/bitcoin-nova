import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bitcoin, Wallet, TrendingUp, TrendingDown, Bot, Play, Square, Clock } from 'lucide-react';

const mockBotActions = [
  { id: '1', action: 'BUY', amount: '0.015 BTC', price: '$98,200', time: '2 min ago', profit: null },
  { id: '2', action: 'SELL', amount: '0.008 BTC', price: '$102,500', time: '15 min ago', profit: '+$344' },
  { id: '3', action: 'BUY', amount: '0.012 BTC', price: '$97,800', time: '1 hour ago', profit: null },
  { id: '4', action: 'SELL', amount: '0.020 BTC', price: '$101,200', time: '2 hours ago', profit: '+$680' },
  { id: '5', action: 'BUY', amount: '0.018 BTC', price: '$99,500', time: '3 hours ago', profit: null },
  { id: '6', action: 'SELL', amount: '0.025 BTC', price: '$103,800', time: '5 hours ago', profit: '+$1,075' },
  { id: '7', action: 'BUY', amount: '0.030 BTC', price: '$96,200', time: '8 hours ago', profit: null },
  { id: '8', action: 'SELL', amount: '0.015 BTC', price: '$100,500', time: '12 hours ago', profit: '+$645' },
];

const Dashboard = () => {
  const { t } = useLanguage();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [botRunning, setBotRunning] = useState(false);
  const [exchange, setExchange] = useState('binance');
  const [strategy, setStrategy] = useState('dca');
  const [risk, setRisk] = useState('medium');
  const [amount, setAmount] = useState('100');

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen pb-24 flex items-center justify-center">
        <div className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-bitcoin-orange to-bitcoin-gold flex items-center justify-center">
              <Bitcoin className="w-10 h-10 text-background" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">{t.nav.login}</h1>
            <p className="text-muted-foreground">Access your trading dashboard</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="w-full bg-secondary">
              <TabsTrigger value="login" className="flex-1">Login</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="satoshi@bitcoin.org" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" className="bg-secondary border-border" />
              </div>
              <Button 
                onClick={() => setIsLoggedIn(true)}
                className="w-full bg-gradient-to-r from-bitcoin-orange to-bitcoin-gold text-background font-bold hover:shadow-[0_0_20px_hsl(var(--bitcoin-orange)/0.4)] transition-shadow"
              >
                Login
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" placeholder="satoshi@bitcoin.org" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" placeholder="••••••••" className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" placeholder="••••••••" className="bg-secondary border-border" />
              </div>
              <Button 
                onClick={() => setIsLoggedIn(true)}
                className="w-full bg-gradient-to-r from-bitcoin-orange to-bitcoin-gold text-background font-bold hover:shadow-[0_0_20px_hsl(var(--bitcoin-orange)/0.4)] transition-shadow"
              >
                Create Account
              </Button>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <Button 
              variant="outline" 
              className="w-full border-bitcoin-orange/50 text-bitcoin-orange hover:bg-bitcoin-orange/10"
              onClick={() => setIsLoggedIn(true)}
            >
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <section className="relative py-12 overflow-hidden scanlines">
        <div className="absolute inset-0 bg-gradient-radial from-bitcoin-orange/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">{t.dashboard.title}</h1>
          <p className="text-muted-foreground">Welcome back, Satoshi</p>
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
                <span className="text-muted-foreground font-medium">{t.dashboard.balance}</span>
              </div>
              <p className="font-display text-3xl font-bold text-foreground">1.2847 BTC</p>
              <p className="text-muted-foreground font-mono">≈ $133,842</p>
            </div>

            {/* P&L Card */}
            <div className="cyber-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <span className="text-muted-foreground font-medium">{t.dashboard.pnl}</span>
              </div>
              <p className="font-display text-3xl font-bold text-success">+$12,456</p>
              <p className="text-success font-mono">+10.24%</p>
            </div>

            {/* Bot Status Card */}
            <div className="cyber-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${botRunning ? 'bg-success/20' : 'bg-muted'}`}>
                  <Bot className={`w-5 h-5 ${botRunning ? 'text-success' : 'text-muted-foreground'}`} />
                </div>
                <span className="text-muted-foreground font-medium">{t.dashboard.tradingBot}</span>
              </div>
              <p className={`font-display text-2xl font-bold ${botRunning ? 'text-success' : 'text-muted-foreground'}`}>
                {botRunning ? 'RUNNING' : 'STOPPED'}
              </p>
              <p className="text-muted-foreground font-mono">{botRunning ? 'Active for 4h 23m' : 'Click start to begin'}</p>
            </div>
          </div>

          {/* Trading Bot Configuration */}
          <div className="lg:col-span-2 cyber-card rounded-xl p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Bot className="w-5 h-5 text-bitcoin-orange" />
              {t.dashboard.tradingBot} Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>{t.dashboard.exchange}</Label>
                <Select value={exchange} onValueChange={setExchange}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="bybit">Bybit</SelectItem>
                    <SelectItem value="kraken">Kraken</SelectItem>
                    <SelectItem value="coinbase">Coinbase Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.dashboard.strategy}</Label>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dca">DCA (Dollar Cost Average)</SelectItem>
                    <SelectItem value="grid">Grid Trading</SelectItem>
                    <SelectItem value="momentum">Momentum</SelectItem>
                    <SelectItem value="hodl">HODL with Sell Targets</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.dashboard.risk}</Label>
                <Select value={risk} onValueChange={setRisk}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.dashboard.amount} (USDT)</Label>
                <Input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-secondary border-border" 
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              {botRunning ? (
                <Button 
                  onClick={() => setBotRunning(false)}
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="w-4 h-4 mr-2" />
                  {t.dashboard.stopBot}
                </Button>
              ) : (
                <Button 
                  onClick={() => setBotRunning(true)}
                  className="flex-1 bg-gradient-to-r from-bitcoin-orange to-bitcoin-gold text-background font-bold hover:shadow-[0_0_20px_hsl(var(--bitcoin-orange)/0.4)] transition-shadow"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {t.dashboard.startBot}
                </Button>
              )}
            </div>
          </div>

          {/* Recent Bot Actions */}
          <div className="cyber-card rounded-xl p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-bitcoin-orange" />
              {t.dashboard.recentActions}
            </h2>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {mockBotActions.map((action) => (
                <div key={action.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${action.action === 'BUY' ? 'bg-success/20' : 'bg-bitcoin-orange/20'}`}>
                      {action.action === 'BUY' ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-bitcoin-orange" />
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${action.action === 'BUY' ? 'text-success' : 'text-bitcoin-orange'}`}>
                        {action.action} {action.amount}
                      </p>
                      <p className="text-muted-foreground text-xs">@ {action.price}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {action.profit && (
                      <p className="text-success text-sm font-semibold">{action.profit}</p>
                    )}
                    <p className="text-muted-foreground text-xs">{action.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
