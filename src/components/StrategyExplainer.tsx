import { TrendingDown, TrendingUp, Pause, Calculator } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const StrategyExplainer = () => {
  const { language } = useLanguage();

  const content = language === 'pl' ? {
    title: 'Strategia Wolumenowa Bollingera',
    subtitle: 'Codzienna strategia ze skalowanym wolumenem (6-12 USD)',
    steps: [
      {
        icon: TrendingDown,
        title: 'Kupno (poniżej MA)',
        description: 'Codzienne kupno gdy cena jest poniżej średniej. Wolumen: 6-12 USD zależnie od odległości do dolnej wstęgi',
        color: 'success',
      },
      {
        icon: TrendingUp,
        title: 'Sprzedaż (powyżej MA)',
        description: 'Codzienna sprzedaż gdy cena jest powyżej średniej. Wolumen skalowany wg pozycji do górnej wstęgi',
        color: 'bitcoin-orange',
      },
      {
        icon: Pause,
        title: 'Strefa Neutralna',
        description: 'Brak transakcji gdy cena jest w okolicy ±10% od średniej kroczącej (MA)',
        color: 'warning',
      },
      {
        icon: Calculator,
        title: 'Wzór na Wolumen',
        description: 'Wolumen = (1 + odległość_ratio) × 6 USD, maksymalnie 12 USD dziennie',
        color: 'muted',
      },
    ],
    note: 'SYMULACJA • Tryb demonstracyjny bez rzeczywistych transakcji',
  } : {
    title: 'Bollinger Volume Strategy',
    subtitle: 'Daily strategy with scaled volume (6-12 USD)',
    steps: [
      {
        icon: TrendingDown,
        title: 'Buy (below MA)',
        description: 'Daily buy when price is below moving average. Volume: 6-12 USD based on distance to lower band',
        color: 'success',
      },
      {
        icon: TrendingUp,
        title: 'Sell (above MA)',
        description: 'Daily sell when price is above moving average. Volume scaled by position to upper band',
        color: 'bitcoin-orange',
      },
      {
        icon: Pause,
        title: 'Neutral Zone',
        description: 'No transaction when price is within ±10% of the moving average (MA)',
        color: 'warning',
      },
      {
        icon: Calculator,
        title: 'Volume Formula',
        description: 'Volume = (1 + distance_ratio) × 6 USD, maximum 12 USD daily',
        color: 'muted',
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
