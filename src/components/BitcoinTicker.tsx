import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useCurrentPrice } from '@/hooks/usePriceHistory';

const BitcoinTicker = () => {
  const { data: priceData, isLoading, isError } = useCurrentPrice();

  const price = priceData?.price ?? 0;
  const change24h = priceData?.change24h ?? 0;
  const isPositive = change24h >= 0;

  if (isLoading && !priceData) {
    return (
      <div className="bg-cyber-dark backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 bg-primary-foreground">
          <div className="flex items-center justify-center gap-6 py-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-bitcoin-orange" />
            <span className="text-muted-foreground">Ładowanie ceny...</span>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !priceData) {
    return (
      <div className="bg-cyber-dark backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 bg-primary-foreground">
          <div className="flex items-center justify-center gap-6 py-2 text-sm">
            <span className="text-bitcoin-orange font-display font-bold">₿</span>
            <span className="text-muted-foreground">Brak danych cenowych</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cyber-dark backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 bg-primary-foreground">
        <div className="flex items-center justify-center gap-6 py-2 text-sm bg-primary-foreground">
          <div className="flex items-center gap-2">
            <span className="text-bitcoin-orange font-display font-bold">₿</span>
            <span className="text-foreground font-mono font-semibold">
              ${price.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>
          
          <div className={`flex items-center gap-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-mono font-medium">
              {isPositive ? '+' : ''}{change24h.toFixed(2)}%
            </span>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
            <span>24h H:</span>
            <span className="text-success font-mono">${priceData.high24h?.toLocaleString('en-US', { maximumFractionDigits: 0 }) ?? '-'}</span>
            <span>L:</span>
            <span className="text-destructive font-mono">${priceData.low24h?.toLocaleString('en-US', { maximumFractionDigits: 0 }) ?? '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BitcoinTicker;
