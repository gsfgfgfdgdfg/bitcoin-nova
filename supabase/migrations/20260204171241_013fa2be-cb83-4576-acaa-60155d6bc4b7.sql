-- Add columns for position tracking and P&L statistics
ALTER TABLE public.bot_config 
ADD COLUMN IF NOT EXISTS total_btc_held NUMERIC(18, 8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_buy_price NUMERIC(18, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_profit_usd NUMERIC(18, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_trades INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS winning_trades INTEGER DEFAULT 0;