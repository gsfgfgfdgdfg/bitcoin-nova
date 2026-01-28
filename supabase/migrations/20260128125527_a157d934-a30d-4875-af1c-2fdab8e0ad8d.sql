-- Add last_trade_hour column for hourly trade limit
ALTER TABLE public.bot_config 
ADD COLUMN IF NOT EXISTS last_trade_hour TIMESTAMPTZ;

-- Copy existing daily data to hourly (optional migration)
UPDATE public.bot_config 
SET last_trade_hour = last_trade_date::date::timestamptz 
WHERE last_trade_date IS NOT NULL AND last_trade_hour IS NULL;