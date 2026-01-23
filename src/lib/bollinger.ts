export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
  price: number;
  timestamp: number;
}

export interface TradingSignal {
  type: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
}

// Calculate Simple Moving Average
export const calculateSMA = (prices: number[], period: number): number => {
  if (prices.length < period) return prices[prices.length - 1];
  const slice = prices.slice(-period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
};

// Calculate Standard Deviation
export const calculateStdDev = (prices: number[], period: number): number => {
  if (prices.length < period) return 0;
  const slice = prices.slice(-period);
  const mean = calculateSMA(prices, period);
  const squaredDiffs = slice.map(price => Math.pow(price - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
  return Math.sqrt(variance);
};

// Calculate Bollinger Bands
export const calculateBollingerBands = (
  prices: number[],
  period: number = 20,
  multiplier: number = 2
): BollingerBands => {
  const middle = calculateSMA(prices, period);
  const stdDev = calculateStdDev(prices, period);
  const currentPrice = prices[prices.length - 1];

  return {
    upper: middle + multiplier * stdDev,
    middle,
    lower: middle - multiplier * stdDev,
    price: currentPrice,
    timestamp: Date.now(),
  };
};

// Generate trading signal based on Bollinger Bands strategy
// STRATEGIA: Kupno przy dolnej wstędze, sprzedaż przy GÓRNEJ wstędze
export const generateSignal = (
  bands: BollingerBands,
  hasOpenPosition: boolean,
  stopLossPercent: number = 2
): TradingSignal => {
  const { price, upper, lower } = bands;
  
  // If we have an open position, check for sell signal
  if (hasOpenPosition) {
    // ZMIANA: Sprzedaż gdy cena osiągnie GÓRNĄ wstęgę Bollingera (nie średnią)
    const sellThreshold = upper * 0.99; // Within 1% of upper band
    if (price >= sellThreshold) {
      return {
        type: 'SELL',
        reason: 'Price reached upper Bollinger Band',
        price,
        takeProfit: upper,
      };
    }
    return {
      type: 'HOLD',
      reason: 'Waiting for price to reach upper Bollinger Band',
      price,
    };
  }

  // No open position - check for buy signal
  // Buy when price is near or below lower Bollinger Band (within 1%)
  const buyThreshold = lower * 1.01;
  if (price <= buyThreshold) {
    const stopLoss = lower * (1 - stopLossPercent / 100);
    return {
      type: 'BUY',
      reason: 'Price near lower Bollinger Band',
      price,
      stopLoss,
      takeProfit: upper, // ZMIANA: Take profit na górnej wstędze
    };
  }

  return {
    type: 'HOLD',
    reason: 'Waiting for price to reach lower Bollinger Band',
    price,
  };
};

// Format price for display
export const formatUSD = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatBTC = (amount: number): string => {
  return `${amount.toFixed(8)} BTC`;
};

// Calculate position size based on available balance and trade percentage
export const calculatePositionSize = (
  balanceUSD: number,
  tradePercent: number,
  priceUSD: number
): number => {
  const usdAmount = balanceUSD * (tradePercent / 100);
  return usdAmount / priceUSD;
};
