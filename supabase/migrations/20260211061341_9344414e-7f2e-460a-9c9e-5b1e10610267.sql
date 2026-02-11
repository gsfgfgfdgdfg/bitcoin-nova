
ALTER TABLE public.bot_trades ADD COLUMN IF NOT EXISTS symbol TEXT DEFAULT 'BTC-USDT';
ALTER TABLE public.bot_actions ADD COLUMN IF NOT EXISTS symbol TEXT DEFAULT 'BTC-USDT';

-- Mark existing XAUT trades (price < $10k indicates XAUT not BTC)
UPDATE public.bot_trades SET symbol = 'XAUT-USDT' WHERE price_usd < 10000;
UPDATE public.bot_actions SET symbol = 'XAUT-USDT' WHERE price_usd < 10000;
