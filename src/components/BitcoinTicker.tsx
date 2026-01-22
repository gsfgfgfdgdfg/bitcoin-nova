import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PriceData {
  price: number;
  change24h: number;
  marketCap: string;
}

const BitcoinTicker = () => {
  const [priceData, setPriceData] = useState<PriceData>({
    price: 104235.42,
    change24h: 2.34,
    marketCap: '$2.05T',
  });

  // Simulate price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPriceData(prev => ({
        ...prev,
        price: prev.price + (Math.random() - 0.5) * 100,
        change24h: prev.change24h + (Math.random() - 0.5) * 0.1,
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const isPositive = priceData.change24h >= 0;

  return (
    <div className="bg-cyber-dark backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-6 py-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-bitcoin-orange font-display font-bold">₿</span>
            <span className="text-foreground font-mono font-semibold">
              ${priceData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className={`flex items-center gap-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-mono font-medium">
              {isPositive ? '+' : ''}{priceData.change24h.toFixed(2)}%
            </span>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
            <span>MCap:</span>
            <span className="text-foreground font-mono">{priceData.marketCap}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BitcoinTicker;
