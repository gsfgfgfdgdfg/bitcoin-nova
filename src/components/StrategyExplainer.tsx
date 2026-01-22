import { TrendingDown, TrendingUp, Target, ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const StrategyExplainer = () => {
  const { language } = useLanguage();

  const content = language === 'pl' ? {
    title: 'Strategia Wstęg Bollingera',
    subtitle: 'Automatyczna strategia handlowa oparta na wskaźnikach technicznych',
    steps: [
      {
        icon: TrendingDown,
        title: 'Sygnał Kupna',
        description: 'Bot kupuje 1% portfela gdy cena zbliża się do dolnej wstęgi Bollingera',
        color: 'success',
      },
      {
        icon: ShieldAlert,
        title: 'Stop-Loss',
        description: 'Automatyczny stop-loss ustawiony tuż pod dolną wstęgą dla ochrony kapitału',
        color: 'destructive',
      },
      {
        icon: TrendingUp,
        title: 'Sygnał Sprzedaży',
        description: 'Bot sprzedaje gdy cena wzrośnie powyżej średniej kroczącej (środkowa linia)',
        color: 'bitcoin-orange',
      },
      {
        icon: Target,
        title: 'Take Profit',
        description: 'Cel zysku to średnia krocząca 20-okresowa, gdzie realizowany jest profit',
        color: 'warning',
      },
    ],
    note: 'SYMULACJA • Tryb demonstracyjny bez rzeczywistych transakcji',
  } : {
    title: 'Bollinger Bands Strategy',
    subtitle: 'Automated trading strategy based on technical indicators',
    steps: [
      {
        icon: TrendingDown,
        title: 'Buy Signal',
        description: 'Bot buys 1% of portfolio when price approaches the lower Bollinger Band',
        color: 'success',
      },
      {
        icon: ShieldAlert,
        title: 'Stop-Loss',
        description: 'Automatic stop-loss set just below the lower band for capital protection',
        color: 'destructive',
      },
      {
        icon: TrendingUp,
        title: 'Sell Signal',
        description: 'Bot sells when price rises above the moving average (middle line)',
        color: 'bitcoin-orange',
      },
      {
        icon: Target,
        title: 'Take Profit',
        description: 'Profit target is the 20-period moving average where gains are realized',
        color: 'warning',
      },
    ],
    note: 'SIMULATION • Demo mode without real transactions',
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case 'success': return 'bg-success/20 text-success';
      case 'destructive': return 'bg-destructive/20 text-destructive';
      case 'bitcoin-orange': return 'bg-bitcoin-orange/20 text-bitcoin-orange';
      case 'warning': return 'bg-warning/20 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="cyber-card rounded-xl p-6">
      <h3 className="font-display text-xl font-bold text-foreground mb-2">
        {content.title}
      </h3>
      <p className="text-muted-foreground text-sm mb-6">{content.subtitle}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {content.steps.map((step, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getColorClass(step.color)}`}>
              <step.icon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">{step.title}</h4>
              <p className="text-muted-foreground text-sm">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-3 rounded-lg bg-warning/10 border border-warning/20">
        <p className="text-warning text-sm font-mono text-center">
          ⚠️ {content.note}
        </p>
      </div>
    </div>
  );
};

export default StrategyExplainer;
