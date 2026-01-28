import { TrendingDown, TrendingUp, Pause, Calculator, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const StrategyExplainer = () => {
  const { language } = useLanguage();

  const content = language === 'pl' ? {
    title: 'Strategia Godzinowa Bollingera',
    subtitle: 'Transakcje co godzinę ze skalowanym wolumenem (base×1.1 do base×2.0)',
    steps: [
      {
        icon: Clock,
        title: 'Interwał godzinny',
        description: 'Bot analizuje cenę zamknięcia każdej świecy 1h i podejmuje decyzję o transakcji',
        color: 'muted',
      },
      {
        icon: TrendingDown,
        title: 'Kupno (poniżej MA)',
        description: 'Kupno gdy cena jest poniżej średniej kroczącej. Wolumen rośnie im bliżej dolnej wstęgi',
        color: 'success',
      },
      {
        icon: TrendingUp,
        title: 'Sprzedaż (powyżej MA)',
        description: 'Sprzedaż gdy cena jest powyżej średniej kroczącej. Wolumen rośnie im bliżej górnej wstęgi',
        color: 'bitcoin-orange',
      },
      {
        icon: Pause,
        title: 'Strefa Neutralna (±10%)',
        description: 'Brak transakcji gdy cena jest w okolicy ±10% od średniej kroczącej (MA)',
        color: 'warning',
      },
      {
        icon: Calculator,
        title: 'Wzór na Wolumen',
        description: 'Wolumen = kwota_bazowa × (1.1 + 0.9 × odległość). Min: base×1.1, Max: base×2.0',
        color: 'muted',
      },
    ],
    note: 'SYMULACJA • Tryb demonstracyjny bez rzeczywistych transakcji',
  } : {
    title: 'Bollinger Hourly Strategy',
    subtitle: 'Hourly trades with scaled volume (base×1.1 to base×2.0)',
    steps: [
      {
        icon: Clock,
        title: 'Hourly Interval',
        description: 'Bot analyzes the closing price of each 1h candle and makes a trading decision',
        color: 'muted',
      },
      {
        icon: TrendingDown,
        title: 'Buy (below MA)',
        description: 'Buy when price is below moving average. Volume increases closer to lower band',
        color: 'success',
      },
      {
        icon: TrendingUp,
        title: 'Sell (above MA)',
        description: 'Sell when price is above moving average. Volume increases closer to upper band',
        color: 'bitcoin-orange',
      },
      {
        icon: Pause,
        title: 'Neutral Zone (±10%)',
        description: 'No transaction when price is within ±10% of the moving average (MA)',
        color: 'warning',
      },
      {
        icon: Calculator,
        title: 'Volume Formula',
        description: 'Volume = base_amount × (1.1 + 0.9 × distance). Min: base×1.1, Max: base×2.0',
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
