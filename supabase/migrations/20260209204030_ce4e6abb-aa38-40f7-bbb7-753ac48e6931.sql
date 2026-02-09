-- Fix total_trades count to match actual trades in database
UPDATE public.bot_config 
SET total_trades = (
  SELECT count(*) FROM public.bot_trades WHERE bot_trades.user_id = bot_config.user_id
),
winning_trades = (
  SELECT count(*) FROM public.bot_trades WHERE bot_trades.user_id = bot_config.user_id AND type = 'SELL' AND profit_usd > 0
);