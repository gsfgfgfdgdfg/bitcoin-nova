-- Tabela na historię cen z BingX
CREATE TABLE public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL DEFAULT 'BTC-USDT',
  open_price DECIMAL(18, 2) NOT NULL,
  high_price DECIMAL(18, 2) NOT NULL,
  low_price DECIMAL(18, 2) NOT NULL,
  close_price DECIMAL(18, 2) NOT NULL,
  volume DECIMAL(24, 8),
  interval TEXT NOT NULL DEFAULT '1h',
  candle_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(symbol, interval, candle_time)
);

-- Indeks dla szybkiego pobierania danych
CREATE INDEX idx_price_history_time ON public.price_history(symbol, interval, candle_time DESC);

-- Włącz RLS
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Polityka: każdy może czytać ceny
CREATE POLICY "Anyone can read prices" ON public.price_history FOR SELECT USING (true);

-- Polityka: tylko service role może zapisywać (edge functions)
CREATE POLICY "Service role can insert prices" ON public.price_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update prices" ON public.price_history FOR UPDATE USING (true);