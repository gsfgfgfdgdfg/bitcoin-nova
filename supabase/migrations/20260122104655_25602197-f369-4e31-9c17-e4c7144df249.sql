-- Naprawa search_path w funkcji
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabela profili użytkowników
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela konfiguracji bota
CREATE TABLE public.bot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_running BOOLEAN DEFAULT false,
  strategy TEXT DEFAULT 'bollinger',
  trade_amount_percent DECIMAL(5, 2) DEFAULT 1.00,
  stop_loss_percent DECIMAL(5, 2) DEFAULT 2.00,
  exchange TEXT DEFAULT 'simulation',
  simulated_balance_usd DECIMAL(18, 2) DEFAULT 10000.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own config"
ON public.bot_config FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_bot_config_updated_at
BEFORE UPDATE ON public.bot_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela transakcji bota
CREATE TABLE public.bot_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL')),
  amount_btc DECIMAL(18, 8) NOT NULL,
  price_usd DECIMAL(18, 2) NOT NULL,
  stop_loss_price DECIMAL(18, 2),
  take_profit_price DECIMAL(18, 2),
  status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'stopped')),
  profit_usd DECIMAL(18, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE public.bot_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own trades"
ON public.bot_trades FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_bot_trades_user_id ON public.bot_trades(user_id);
CREATE INDEX idx_bot_trades_status ON public.bot_trades(status);