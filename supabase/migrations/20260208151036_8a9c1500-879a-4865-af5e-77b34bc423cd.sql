-- Add Bollinger details columns to bot_trades
ALTER TABLE public.bot_trades 
  ADD COLUMN IF NOT EXISTS bollinger_upper NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS bollinger_middle NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS bollinger_lower NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS distance_ratio NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS multiplier NUMERIC(3, 2);

-- Create bot_actions table for all actions including HOLD
CREATE TABLE IF NOT EXISTS public.bot_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  price_usd NUMERIC(18, 2),
  bollinger_upper NUMERIC(18, 2),
  bollinger_middle NUMERIC(18, 2),
  bollinger_lower NUMERIC(18, 2),
  distance_ratio NUMERIC(5, 4),
  multiplier NUMERIC(3, 2),
  volume_usd NUMERIC(18, 2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on bot_actions
ALTER TABLE public.bot_actions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for bot_actions
CREATE POLICY "Users see own actions" ON public.bot_actions
  FOR ALL USING (auth.uid() = user_id);

-- Add symbol column to bot_config for multi-currency support
ALTER TABLE public.bot_config 
  ADD COLUMN IF NOT EXISTS symbol TEXT DEFAULT 'BTC-USDT';