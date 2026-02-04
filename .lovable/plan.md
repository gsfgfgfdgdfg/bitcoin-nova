# Plan: Pełna Automatyzacja Bota Tradingowego

## ✅ ZAIMPLEMENTOWANO

### 1. Kolumny do śledzenia pozycji (migracja wykonana)
- `total_btc_held` - ile BTC bot aktualnie posiada
- `avg_buy_price` - średnia ważona cena zakupu
- `total_profit_usd` - skumulowany zysk/strata
- `total_trades` - liczba wszystkich transakcji
- `winning_trades` - liczba zyskownych transakcji

### 2. Edge Function z logiką P&L
- **KUPNO**: Dodaje BTC do pozycji, oblicza nową średnią ważoną cenę zakupu
- **SPRZEDAŻ**: Sprzedaje posiadane BTC, oblicza profit = (cena_sprzedaży - avg_buy_price) × ilość_btc
- **Win rate**: Zlicza transakcje z profit > 0

### 3. Frontend zaktualizowany
- Wyświetla total_btc_held, avg_buy_price
- Wyświetla win rate jako X/Y (winning_trades/total_trades)

---

## ⚠️ WYMAGANA RĘCZNA KONFIGURACJA: pg_cron

Aby bot działał automatycznie co godzinę, musisz włączyć `pg_cron` w Supabase:

### Krok 1: Włącz rozszerzenia
1. Otwórz Supabase Dashboard → Database → Extensions
2. Znajdź i włącz: `pg_cron`
3. Znajdź i włącz: `pg_net`

### Krok 2: Uruchom SQL w SQL Editor

```sql
-- Cron job: bot simulation co godzinę o :02
SELECT cron.schedule(
  'run-bot-simulation-hourly',
  '2 * * * *',
  $$
  SELECT net.http_post(
    url:='https://xnblpyfbdjepmbcyocif.supabase.co/functions/v1/run-bot-simulation',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuYmxweWZiZGplcG1iY3lvY2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY5NTUsImV4cCI6MjA4NDUwMjk1NX0.2kE4qkInWYQfPrwjuBvH8x-COhO75uxD38WYybhfyrs"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

-- Cron job: sync cen co 5 minut
SELECT cron.schedule(
  'sync-bingx-prices-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://xnblpyfbdjepmbcyocif.supabase.co/functions/v1/sync-bingx-prices',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuYmxweWZiZGplcG1iY3lvY2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjY5NTUsImV4cCI6MjA4NDUwMjk1NX0.2kE4qkInWYQfPrwjuBvH8x-COhO75uxD38WYybhfyrs"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

### Krok 3: Weryfikacja
```sql
SELECT * FROM cron.job;
```

---

## Logika Strategii (zaimplementowana)

```
KUPNO (gdy cena < MA):
  ratio = (MA - cena) / (MA - lower_band)
  multiplier = 1.1 + (0.9 × ratio)  // od 110% do 200%
  volume = base_amount × multiplier
  
  btc_bought = volume / current_price
  new_avg_price = (held_btc × old_avg + btc_bought × current_price) / (held_btc + btc_bought)
  total_btc_held += btc_bought
  balance -= volume

SPRZEDAŻ (gdy cena > MA i mamy BTC):
  ratio = (cena - MA) / (upper_band - MA)
  multiplier = 1.1 + (0.9 × ratio)
  volume = base_amount × multiplier
  
  btc_to_sell = min(total_btc_held, volume / current_price)
  profit = (current_price - avg_buy_price) × btc_to_sell
  
  total_btc_held -= btc_to_sell
  balance += btc_to_sell × current_price
  total_profit_usd += profit
  if (profit > 0) winning_trades++
  total_trades++

HOLD (gdy cena w strefie ±10% od MA):
  Brak akcji
```
