import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PriceCandle {
  price: number;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceHistoryRow {
  close_price: number;
  open_price: number;
  high_price: number;
  low_price: number;
  volume: number;
  candle_time: string;
}

export const usePriceHistory = (symbol = 'BTC-USDT', interval = '1h', limit = 168) => {
  return useQuery({
    queryKey: ['price-history', symbol, interval, limit],
    queryFn: async (): Promise<PriceCandle[]> => {
      const { data, error } = await supabase
        .from('price_history')
        .select('close_price, open_price, high_price, low_price, volume, candle_time')
        .eq('symbol', symbol)
        .eq('interval', interval)
        .order('candle_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching price history:', error);
        throw error;
      }

      return (data || []).reverse().map((p: PriceHistoryRow) => ({
        price: Number(p.close_price),
        timestamp: new Date(p.candle_time).getTime(),
        open: Number(p.open_price),
        high: Number(p.high_price),
        low: Number(p.low_price),
        close: Number(p.close_price),
        volume: Number(p.volume),
      }));
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
};

export const useCurrentPrice = () => {
  return useQuery({
    queryKey: ['current-price'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-bingx-prices');
      
      if (error) {
        console.error('Error fetching current price:', error);
        throw error;
      }

      return data as {
        price: number;
        change24h: number;
        high24h: number;
        low24h: number;
        volume24h: number;
        lastUpdate: string;
      };
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });
};

// Sync prices on demand
export const useSyncPrices = () => {
  return useQuery({
    queryKey: ['sync-prices'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-bingx-prices');
      if (error) throw error;
      return data;
    },
    enabled: false, // Only run when manually triggered
  });
};
