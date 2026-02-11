import { useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Line, Scatter, Cell } from 'recharts';
import { BollingerBands, calculateBollingerBands } from '@/lib/bollinger';
import { BotTrade } from '@/hooks/useBotData';

interface BollingerChartProps {
  priceHistory: { price: number; timestamp: number }[];
  currentBands?: BollingerBands;
  trades?: BotTrade[];
  symbol?: string;
}

const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const BollingerChart = ({ priceHistory, currentBands, trades = [], symbol }: BollingerChartProps) => {
  // Filter trades by symbol, then map to markers
  const tradeMarkers = useMemo(() => {
    const filtered = trades.filter(trade => {
      if (symbol && trade.symbol) return trade.symbol === symbol;
      if (symbol && !trade.symbol) {
        // Legacy trades without symbol: filter by price range
        const priceRange = priceHistory.length > 0
          ? { min: Math.min(...priceHistory.map(p => p.price)) * 0.5, max: Math.max(...priceHistory.map(p => p.price)) * 1.5 }
          : null;
        return priceRange ? Number(trade.price_usd) >= priceRange.min && Number(trade.price_usd) <= priceRange.max : true;
      }
      return true;
    });
    return filtered.map(trade => ({
      timestamp: new Date(trade.created_at).getTime(),
      type: trade.type,
      price: Number(trade.price_usd),
    }));
  }, [trades, symbol, priceHistory]);

  const chartData = useMemo(() => {
    if (priceHistory.length < 20) {
      return priceHistory.map((p) => ({
        time: formatDateTime(p.timestamp),
        timestamp: p.timestamp,
        price: p.price,
        upper: p.price * 1.02,
        middle: p.price,
        lower: p.price * 0.98,
        buyMarker: null as number | null,
        sellMarker: null as number | null,
      }));
    }

    return priceHistory.map((point, index) => {
      const prices = priceHistory.slice(0, index + 1).map(p => p.price);
      const bands = calculateBollingerBands(prices, 20, 2);
      
      // Find if there's a trade marker near this timestamp (within 1 hour = 3600000ms)
      const nearbyTrade = tradeMarkers.find(t => 
        Math.abs(t.timestamp - point.timestamp) < 3600000
      );
      
      return {
        time: formatDateTime(point.timestamp),
        timestamp: point.timestamp,
        price: point.price,
        upper: bands.upper,
        middle: bands.middle,
        lower: bands.lower,
        buyMarker: nearbyTrade?.type === 'BUY' ? nearbyTrade.price : null,
        sellMarker: nearbyTrade?.type === 'SELL' ? nearbyTrade.price : null,
      };
    });
  }, [priceHistory, tradeMarkers]);

  if (priceHistory.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Loading price data...
      </div>
    );
  }

  return (
    <div className="h-[500px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="bollingerGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--bitcoin-orange))" stopOpacity={0.1} />
              <stop offset="95%" stopColor="hsl(var(--bitcoin-orange))" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={9}
            tickLine={false}
            interval={23}
          />
          
          <YAxis 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={10}
            tickLine={false}
            domain={['auto', 'auto']}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: number, name: string) => [
              `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              name === 'price' ? 'Price' : 
              name === 'upper' ? 'Upper Band' : 
              name === 'middle' ? 'MA (20)' : 
              name === 'lower' ? 'Lower Band' :
              name === 'buyMarker' ? '🟢 BUY' :
              name === 'sellMarker' ? '🔴 SELL' : name
            ]}
          />

          {/* Bollinger Bands Area */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill="url(#bollingerGradient)"
          />
          
          {/* Upper Band */}
          <Line
            type="monotone"
            dataKey="upper"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
          />
          
          {/* Middle Band (SMA) */}
          <Line
            type="monotone"
            dataKey="middle"
            stroke="hsl(var(--bitcoin-orange))"
            strokeWidth={2}
            dot={false}
          />
          
          {/* Lower Band */}
          <Line
            type="monotone"
            dataKey="lower"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
          />
          
          {/* Price Line */}
          {/* Price Line - blue to distinguish from BUY markers */}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />

          {/* BUY Markers */}
          <Scatter
            dataKey="buyMarker"
            fill="#22c55e"
            shape="circle"
          >
            {chartData.map((entry, index) => (
              entry.buyMarker !== null ? (
                <Cell key={`buy-${index}`} fill="#22c55e" />
              ) : null
            ))}
          </Scatter>

          {/* SELL Markers */}
          <Scatter
            dataKey="sellMarker"
            fill="#f97316"
            shape="circle"
          >
            {chartData.map((entry, index) => (
              entry.sellMarker !== null ? (
                <Cell key={`sell-${index}`} fill="#f97316" />
              ) : null
            ))}
          </Scatter>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BollingerChart;
