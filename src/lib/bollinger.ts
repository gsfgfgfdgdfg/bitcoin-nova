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
  return `${amount.toFixed(6)} BTC`;
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

// New volume-based strategy types and functions
export interface DailyVolumeSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  volumeUsd: number;
  distanceRatio: number;
  reason: string;
  multiplier: number;
}

// NEW: Hourly volume calculation with dynamic min/max based on base amount
// CORRECTED FORMULA: multiplier = 1 + ratio (100% to 200%)
export const calculateHourlyVolume = (
  bands: BollingerBands,
  baseAmount: number = 6,
  holdZonePercent: number = 10
): DailyVolumeSignal => {
  const { price, upper, middle, lower } = bands;
  
  // Volume range: 100% to 200% of base amount
  const minVolume = baseAmount * 1.0;
  const maxVolume = baseAmount * 2.0;
  
  const upperBandWidth = upper - middle;
  const lowerBandWidth = middle - lower;
  
  // Guard against zero division
  if (upperBandWidth <= 0 || lowerBandWidth <= 0) {
    return {
      action: 'HOLD',
      volumeUsd: 0,
      distanceRatio: 0,
      multiplier: 1,
      reason: 'Invalid band width'
    };
  }
  
  // HOLD zone: ±holdZonePercent% from MA
  const holdZoneThreshold = holdZonePercent / 100;
  const holdZoneUpper = middle + upperBandWidth * holdZoneThreshold;
  const holdZoneLower = middle - lowerBandWidth * holdZoneThreshold;
  
  // Neutral zone - no action
  if (price >= holdZoneLower && price <= holdZoneUpper) {
    return {
      action: 'HOLD',
      volumeUsd: 0,
      distanceRatio: 0,
      multiplier: 1,
      reason: `Cena w strefie neutralnej (±${holdZonePercent}% od MA)`
    };
  }
  
  // BUY - price below MA
  if (price < middle) {
    const distanceFromMA = middle - price;
    const ratio = Math.min(1, distanceFromMA / lowerBandWidth);
    // CORRECTED: multiplier = 1 + ratio (100% to 200%)
    const multiplier = 1 + ratio;
    const volume = Math.min(maxVolume, Math.max(minVolume, baseAmount * multiplier));
    
    return {
      action: 'BUY',
      volumeUsd: Math.round(volume * 100) / 100,
      distanceRatio: ratio,
      multiplier: Math.round(multiplier * 100) / 100,
      reason: `Kupno: ${(ratio * 100).toFixed(1)}% drogi do dolnej wstęgi`
    };
  }
  
  // SELL - price above MA
  const distanceFromMA = price - middle;
  const ratio = Math.min(1, distanceFromMA / upperBandWidth);
  // CORRECTED: multiplier = 1 + ratio (100% to 200%)
  const multiplier = 1 + ratio;
  const volume = Math.min(maxVolume, Math.max(minVolume, baseAmount * multiplier));
  
  return {
    action: 'SELL',
    volumeUsd: Math.round(volume * 100) / 100,
    distanceRatio: ratio,
    multiplier: Math.round(multiplier * 100) / 100,
    reason: `Sprzedaż: ${(ratio * 100).toFixed(1)}% drogi do górnej wstęgi`
  };
};

// Keep old function for backward compatibility but mark as deprecated
/** @deprecated Use calculateHourlyVolume instead */
export const calculateDailyVolume = calculateHourlyVolume;
