
## Plan: Integracja BingX API + Automatyczna Symulacja Bota Bollingera

---

### Przegląd

Zintegruję API giełdy BingX do pobierania rzeczywistych danych cenowych Bitcoina (BTC-USDT), automatycznej aktualizacji co minutę oraz symulacji strategii tradingowej opartej na wstęgach Bollingera z interwałem godzinnym.

---

### Architektura Rozwiązania

```text
+------------------+         +------------------------+         +------------------+
|   BingX API      |  <--->  |  Edge Function         |  <--->  |  Supabase DB     |
|  (dane cenowe)   |         |  sync-bingx-prices     |         |  price_history   |
+------------------+         +------------------------+         +------------------+
                                      |
                                      v
                             +------------------------+
                             |  Edge Function         |
                             |  run-bot-simulation    |
                             +------------------------+
                                      |
                                      v
                             +------------------+
                             |  bot_trades      |
                             |  bot_config      |
                             +------------------+
```

---

### Część 1: Tabela na historię cen

Utworzę nową tabelę `price_history` do przechowywania danych cenowych z BingX:

```sql
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

CREATE INDEX idx_price_history_time ON public.price_history(symbol, interval, candle_time DESC);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read prices" ON public.price_history FOR SELECT USING (true);
```

---

### Część 2: Edge Function - Pobieranie danych z BingX

Utworzę Edge Function `sync-bingx-prices` która:

1. **Pobiera dane Kline (świece) z BingX API:**
   - Endpoint: `GET https://open-api.bingx.com/openApi/swap/v2/quote/klines`
   - Parametry: `symbol=BTC-USDT`, `interval=1h`, `limit=30`

2. **Zapisuje do tabeli `price_history`**

3. **Zwraca aktualną cenę dla BitcoinTicker**

```typescript
// supabase/functions/sync-bingx-prices/index.ts

const BINGX_BASE_URL = "https://open-api.bingx.com";

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Pobierz klines z BingX (publiczne API - bez autoryzacji)
  const klineUrl = `${BINGX_BASE_URL}/openApi/swap/v2/quote/klines?symbol=BTC-USDT&interval=1h&limit=30`;
  const response = await fetch(klineUrl);
  const data = await response.json();

  // 2. Parsuj i zapisz do bazy
  const klines = data.data.map(k => ({
    symbol: "BTC-USDT",
    interval: "1h",
    candle_time: new Date(parseInt(k.time)),
    open_price: parseFloat(k.open),
    high_price: parseFloat(k.high),
    low_price: parseFloat(k.low),
    close_price: parseFloat(k.close),
    volume: parseFloat(k.volume),
  }));

  // Upsert do bazy (ignoruj duplikaty)
  await supabase.from("price_history").upsert(klines, {
    onConflict: "symbol,interval,candle_time"
  });

  // 3. Zwróć aktualną cenę
  return new Response(JSON.stringify({
    price: klines[klines.length - 1].close_price,
    change24h: calculateChange24h(klines),
  }));
});
```

---

### Część 3: Edge Function - Symulacja Bota

Utworzę Edge Function `run-bot-simulation` która:

1. **Pobiera ostatnie 20 świec z `price_history`**
2. **Oblicza wstęgi Bollingera**
3. **Generuje sygnały BUY/SELL zgodnie ze strategią:**
   - **KUPNO**: Cena przy dolnej wstędze Bollingera
   - **SPRZEDAŻ**: Cena przy górnej wstędze (zmiana z obecnej logiki gdzie sprzedaż była na średniej)
   - **Stop-loss**: Tuż pod dolną wstęgą
4. **Zapisuje symulowane transakcje do `bot_trades`**
5. **Aktualizuje saldo w `bot_config`**

```typescript
// supabase/functions/run-bot-simulation/index.ts

// Pobierz historię cen
const { data: prices } = await supabase
  .from("price_history")
  .select("close_price, candle_time")
  .eq("symbol", "BTC-USDT")
  .eq("interval", "1h")
  .order("candle_time", { ascending: false })
  .limit(20);

// Oblicz Bollinger Bands
const closePrices = prices.reverse().map(p => p.close_price);
const bands = calculateBollingerBands(closePrices, 20, 2);

// Sprawdź otwarte pozycje użytkownika
const { data: openTrades } = await supabase
  .from("bot_trades")
  .select("*")
  .eq("user_id", userId)
  .eq("status", "open");

// Generuj sygnał (kupno na dolnej, sprzedaż na GÓRNEJ wstędze)
if (currentPrice <= bands.lower * 1.01 && !hasOpenPosition) {
  // BUY signal
  await createBuyTrade(userId, currentPrice, bands.lower * 0.98);
} else if (currentPrice >= bands.upper * 0.99 && hasOpenPosition) {
  // SELL signal (zmiana: górna wstęga zamiast średniej)
  await closeTrade(openTrade.id, currentPrice);
}
```

---

### Część 4: Automatyczne uruchamianie co minutę

Wykorzystam `pg_cron` do automatycznego wywoływania Edge Functions:

```sql
-- Włącz rozszerzenia
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Cron job: sync cen co minutę
SELECT cron.schedule(
  'sync-bingx-prices-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://xnblpyfbdjepmbcyocif.supabase.co/functions/v1/sync-bingx-prices',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

-- Cron job: symulacja bota co godzinę (zgodnie z interwałem 1h)
SELECT cron.schedule(
  'run-bot-simulation-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://xnblpyfbdjepmbcyocif.supabase.co/functions/v1/run-bot-simulation',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ..."}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

---

### Część 5: Aktualizacja Frontend

#### 5.1 BitcoinTicker - rzeczywiste dane

Zmienię `BitcoinTicker.tsx` aby pobierał dane z Edge Function zamiast symulacji:

```typescript
useEffect(() => {
  const fetchPrice = async () => {
    const { data } = await supabase.functions.invoke('sync-bingx-prices');
    setPriceData(data);
  };
  
  fetchPrice();
  const interval = setInterval(fetchPrice, 60000); // Co minutę
  return () => clearInterval(interval);
}, []);
```

#### 5.2 Dashboard - rzeczywisty wykres Bollingera

Zmienię Dashboard aby pobierał historię cen z bazy:

```typescript
const { data: priceHistory } = useQuery({
  queryKey: ['price-history'],
  queryFn: async () => {
    const { data } = await supabase
      .from('price_history')
      .select('close_price, candle_time')
      .eq('symbol', 'BTC-USDT')
      .eq('interval', '1h')
      .order('candle_time', { ascending: true })
      .limit(30);
    return data.map(p => ({ price: p.close_price, timestamp: new Date(p.candle_time).getTime() }));
  },
  refetchInterval: 60000,
});
```

#### 5.3 Zmiana strategii sprzedaży

Zaktualizuję `src/lib/bollinger.ts` aby sprzedaż następowała przy **górnej wstędze** (nie średniej):

```typescript
// Zmiana w generateSignal()
if (hasOpenPosition) {
  // SELL when price reaches UPPER band (nie middle)
  if (price >= upper * 0.99) {
    return {
      type: 'SELL',
      reason: 'Price reached upper Bollinger Band',
      price,
      takeProfit: upper,
    };
  }
}
```

---

### Część 6: Struktura plików

| Plik | Akcja | Opis |
|------|-------|------|
| `supabase/functions/sync-bingx-prices/index.ts` | NOWY | Pobieranie danych z BingX |
| `supabase/functions/run-bot-simulation/index.ts` | NOWY | Logika symulacji bota |
| `supabase/config.toml` | EDYCJA | Dodanie konfiguracji funkcji |
| `src/components/BitcoinTicker.tsx` | EDYCJA | Rzeczywiste dane z API |
| `src/pages/Dashboard.tsx` | EDYCJA | Rzeczywista historia cen |
| `src/lib/bollinger.ts` | EDYCJA | Sprzedaż na górnej wstędze |
| `src/hooks/usePriceHistory.ts` | NOWY | Hook do pobierania historii cen |
| Migracja SQL | NOWY | Tabela `price_history` + cron jobs |

---

### Podsumowanie zmian strategii

| Element | Było | Będzie |
|---------|------|--------|
| Źródło danych | Symulacja losowa | BingX API (rzeczywiste) |
| Aktualizacja cen | Co 5 sekund (fake) | Co 1 minutę (rzeczywiste) |
| Interwał strategii | - | 1 godzina |
| Sygnał KUPNA | Dolna wstęga | Dolna wstęga (bez zmian) |
| Sygnał SPRZEDAŻY | Średnia (middle) | **Górna wstęga (upper)** |
| Stop-loss | Pod dolną wstęgą | Pod dolną wstęgą (bez zmian) |

---

### Sekcja Techniczna

**BingX API Endpoints:**
- Klines: `GET /openApi/swap/v2/quote/klines?symbol=BTC-USDT&interval=1h&limit=30`
- Ticker: `GET /openApi/swap/v2/quote/ticker?symbol=BTC-USDT`
- Server Time: `GET /openApi/swap/v2/server/time`

**Uwagi:**
- BingX zwraca timestampy w milisekundach
- Liczby są zwracane jako stringi (trzeba parsować)
- Publiczne endpointy nie wymagają autoryzacji
- Rate limit: automatyczne ograniczenie po przekroczeniu

