-- Add new columns for volume-based strategy
ALTER TABLE public.bot_config
ADD COLUMN IF NOT EXISTS base_trade_usd DECIMAL(10, 2) DEFAULT 6.00,
ADD COLUMN IF NOT EXISTS max_daily_usd DECIMAL(10, 2) DEFAULT 12.00,
ADD COLUMN IF NOT EXISTS hold_zone_percent DECIMAL(5, 2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS last_trade_date DATE;

-- Add volume_usd column to bot_trades to track USD amount per trade
ALTER TABLE public.bot_trades
ADD COLUMN IF NOT EXISTS volume_usd DECIMAL(10, 2);