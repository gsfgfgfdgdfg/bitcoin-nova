-- Add column to store the actual avg buy price used when calculating SELL profit
ALTER TABLE public.bot_trades ADD COLUMN IF NOT EXISTS avg_buy_price_at_sell numeric;

-- Fix current avg_buy_price in bot_config by recalculating from open BUY trades
-- First, let's reset the incorrect avg_buy_price
DO $$
DECLARE
  config_record RECORD;
  calc_avg numeric;
  calc_held numeric;
BEGIN
  FOR config_record IN SELECT id, symbol FROM bot_config LOOP
    SELECT 
      COALESCE(SUM(amount_btc * price_usd) / NULLIF(SUM(amount_btc), 0), 0),
      COALESCE(SUM(amount_btc), 0)
    INTO calc_avg, calc_held
    FROM bot_trades 
    WHERE user_id = config_record.id 
      AND type = 'BUY' 
      AND status = 'open'
      AND symbol = config_record.symbol;
    
    UPDATE bot_config 
    SET avg_buy_price = calc_avg,
        total_btc_held = calc_held
    WHERE id = config_record.id;
  END LOOP;
END $$;