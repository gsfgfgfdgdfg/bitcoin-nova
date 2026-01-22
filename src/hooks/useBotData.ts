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
  created_at: string;
  updated_at: string;
}

export interface BotTrade {
  id: string;
  user_id: string;
  type: 'BUY' | 'SELL';
  amount_btc: number;
  price_usd: number;
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
  });
};

export const useBotStats = () => {
  const { data: trades } = useBotTrades();
  const { data: config } = useBotConfig();

  const totalProfit = trades?.reduce((sum, trade) => {
    return sum + (trade.profit_usd || 0);
  }, 0) || 0;

  const winningTrades = trades?.filter(t => (t.profit_usd || 0) > 0).length || 0;
  const closedTrades = trades?.filter(t => t.status === 'closed').length || 0;
  const winRate = closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0;

  const openPositions = trades?.filter(t => t.status === 'open') || [];
  const totalBtcHeld = openPositions.reduce((sum, t) => sum + Number(t.amount_btc), 0);

  return {
    totalProfit,
    winRate,
    closedTrades,
    openPositions: openPositions.length,
    totalBtcHeld,
    balance: config?.simulated_balance_usd || 10000,
  };
};
