import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BotConfig {
  id: string;
  user_id: string;
  is_running: boolean;
  strategy: string;
  trade_amount_percent: number;
  stop_loss_percent: number;
  exchange: string;
  simulated_balance_usd: number;
  base_trade_usd: number;
  max_daily_usd: number;
  hold_zone_percent: number;
  last_trade_date: string | null;
  last_trade_hour: string | null;
  total_btc_held: number;
  avg_buy_price: number;
  total_profit_usd: number;
  total_trades: number;
  winning_trades: number;
  created_at: string;
  updated_at: string;
}

export interface BotTrade {
  id: string;
  user_id: string;
  type: 'BUY' | 'SELL';
  amount_btc: number;
  price_usd: number;
  volume_usd: number | null;
  stop_loss_price: number | null;
  take_profit_price: number | null;
  status: 'open' | 'closed' | 'stopped';
  profit_usd: number | null;
  created_at: string;
  closed_at: string | null;
}

export const useBotConfig = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bot-config', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('bot_config')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as BotConfig | null;
    },
    enabled: !!user,
    refetchInterval: 60000,
    staleTime: 30000,
  });
};

export const useCreateBotConfig = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<BotConfig>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('bot_config')
        .insert({
          user_id: user.id,
          ...config,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as BotConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-config'] });
    },
  });
};

export const useUpdateBotConfig = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<BotConfig>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('bot_config')
        .update(config)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as BotConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-config'] });
    },
  });
};

export const useBotTrades = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bot-trades', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('bot_trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return data as BotTrade[];
    },
    enabled: !!user,
    refetchInterval: 60000,
    staleTime: 30000,
  });
};

export const useBotStats = () => {
  const { data: config } = useBotConfig();

  // Stats are now calculated from bot_config (server-side tracking)
  const totalBtcHeld = config?.total_btc_held || 0;
  const avgBuyPrice = config?.avg_buy_price || 0;
  const totalProfit = config?.total_profit_usd || 0;
  const totalTrades = config?.total_trades || 0;
  const winningTrades = config?.winning_trades || 0;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const balance = config?.simulated_balance_usd || 10000;

  return {
    totalProfit,
    winRate,
    totalTrades,
    winningTrades,
    totalBtcHeld,
    avgBuyPrice,
    balance,
  };
};
