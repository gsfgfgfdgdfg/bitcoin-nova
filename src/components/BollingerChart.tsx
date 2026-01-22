import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, ReferenceLine } from 'recharts';
import { BollingerBands, calculateBollingerBands, calculateSMA } from '@/lib/bollinger';

interface BollingerChartProps {
  priceHistory: { price: number; timestamp: number }[];
  currentBands?: BollingerBands;
}

const BollingerChart = ({ priceHistory, currentBands }: BollingerChartProps) => {
  const chartData = useMemo(() => {
    if (priceHistory.length < 20) {
      return priceHistory.map((p, i) => ({
        time: new Date(p.timestamp).toLocaleTimeString(),
        price: p.price,
        upper: p.price * 1.02,
        middle: p.price,
        lower: p.price * 0.98,
      }));
    }

    return priceHistory.map((point, index) => {
      const prices = priceHistory.slice(0, index + 1).map(p => p.price);
      const bands = calculateBollingerBands(prices, 20, 2);
      
      return {
        time: new Date(point.timestamp).toLocaleTimeString(),
        price: point.price,
        upper: bands.upper,
        middle: bands.middle,
        lower: bands.lower,
      };
    });
  }, [priceHistory]);

  if (priceHistory.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Loading price data...
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
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
            fontSize={10}
            tickLine={false}
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
              name === 'price' ? 'Price' : name === 'upper' ? 'Upper Band' : name === 'middle' ? 'MA (20)' : 'Lower Band'
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
          <Line
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--success))"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BollingerChart;
