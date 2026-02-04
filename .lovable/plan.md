

## Plan: Pełna Automatyzacja Bota Tradingowego

---

### Diagnoza Problemów

| Problem | Przyczyna | Rozwiązanie |
|---------|-----------|-------------|
| Bot nie wykonuje transakcji automatycznie | `pg_cron` i `pg_net` nie zainstalowane | Migracja SQL do instalacji + konfiguracji |
| Profit zawsze = 0 | Brak logiki liczenia zysku/straty | Nowa logika śledzenia pozycji i P&L |
| Statystyki niepoprawne | Brak agregacji kapitału i % skuteczności | Nowe pole `total_btc_held` + obliczenia |
| Win rate = 0 | Każda transakcja jest osobna, brak par BUY→SELL | Logika parowania transakcji |

---

### Część 1: Automatyzacja przez pg_cron

Utworzę migrację SQL która:
1. Zainstaluje rozszerzenia `pg_cron` i `pg_net`
2. Skonfiguruje harmonogram godzinny dla bota
3. Skonfiguruje sync cen co 5 minut

```sql
-- Włącz rozszerzenia
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Cron job: sync cen co 5 minut
SELECT cron.schedule(
  'sync-bingx-prices-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://xnblpyfbdjepmbcyocif.supabase.co/functions/v1/sync-bingx-prices',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

-- Cron job: bot simulation co godzinę o :02
SELECT cron.schedule(
  'run-bot-simulation-hourly',
  '2 * * * *',
  $$
  SELECT net.http_post(
    url:='https://xnblpyfbdjepmbcyocif.supabase.co/functions/v1/run-bot-simulation',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

---

### Część 2: Nowa Logika Śledzenia BTC i Zysków

Zmiana w Edge Function - śledzenie rzeczywistej pozycji BTC:

```typescript
// Przy KUPNIE:
// - Dodaj BTC do held_btc
// - Odejmij USD z balance
// - Zapisz cenę zakupu

// Przy SPRZEDAŻY:
// - Sprawdź ile BTC mamy (held_btc)
// - Jeśli mamy BTC, sprzedaj z zyskiem/stratą
// - profit = (cena_obecna - avg_buy_price) × ilość_btc_sprzedanej
```

---

### Część 3: Nowe Kolumny w Bazie Danych

Dodanie kolumn do śledzenia pozycji:

```sql
ALTER TABLE public.bot_config ADD COLUMN IF NOT EXISTS 
  total_btc_held NUMERIC(18, 8) DEFAULT 0;

ALTER TABLE public.bot_config ADD COLUMN IF NOT EXISTS 
  avg_buy_price NUMERIC(18, 2) DEFAULT 0;

ALTER TABLE public.bot_config ADD COLUMN IF NOT EXISTS 
  total_profit_usd NUMERIC(18, 2) DEFAULT 0;

ALTER TABLE public.bot_config ADD COLUMN IF NOT EXISTS 
  total_trades INTEGER DEFAULT 0;

ALTER TABLE public.bot_config ADD COLUMN IF NOT EXISTS 
  winning_trades INTEGER DEFAULT 0;
```

---

### Część 4: Nowa Logika Edge Function

```text
CO GODZINĘ (automatycznie przez pg_cron):

1. Pobierz aktualne ceny i oblicz Bollinger Bands

2. DLA KAŻDEGO AKTYWNEGO BOTA:
   
   a) Sprawdź czy już była transakcja w tej godzinie
      → Jeśli tak, pomiń

   b) Oblicz sygnał na podstawie pozycji ceny względem MA:
      - Poniżej MA → BUY (volume 110%-200% × base)
      - Powyżej MA → SELL (volume 110%-200% × base)
      - W strefie ±10% od MA → HOLD

   c) JEŚLI KUPNO:
      - Oblicz ilość BTC = volume_usd / cena
      - Aktualizuj avg_buy_price (średnia ważona)
      - Dodaj do total_btc_held
      - Odejmij USD z balance

   d) JEŚLI SPRZEDAŻ i mamy BTC:
      - Oblicz ilość BTC do sprzedaży = min(held_btc, volume_usd / cena)
      - profit = (cena - avg_buy_price) × ilość_btc
      - Dodaj profit do trade record
      - Odejmij z total_btc_held
      - Dodaj USD do balance
      - Aktualizuj statystyki (winning_trades jeśli profit > 0)

3. Zapisz transakcję i zaktualizuj statystyki
```

---

### Część 5: Formuła Wolumenu (weryfikacja)

Obecna logika w kodzie jest POPRAWNA:

```typescript
// multiplier = 1.1 + (0.9 × ratio)
// gdzie ratio = odległość_od_MA / szerokość_wstęgi

// Przykłady dla base = 6 USD:
// - Przy MA (ratio=0):    1.1 × 6 = 6.60 USD (110%)
// - W połowie (ratio=0.5): 1.55 × 6 = 9.30 USD (155%)
// - Przy wstędze (ratio=1): 2.0 × 6 = 12.00 USD (200%)
```

---

### Część 6: Statystyki Skuteczności

Dashboard będzie pokazywał:

```typescript
// Obliczanie z bot_config
const winRate = config.total_trades > 0 
  ? (config.winning_trades / config.total_trades) * 100 
  : 0;

const capitalGrowth = ((config.simulated_balance_usd + 
  config.total_btc_held * currentPrice - 10000) / 10000) * 100;

// Wyświetlanie:
// - Win Rate: 65.2%
// - Kapitał: +12.5% ($11,250)
// - BTC w portfelu: 0.00234 BTC
// - Średnia cena zakupu: $85,432
```

---

### Część 7: Struktura Zmian

| Plik | Akcja | Opis |
|------|-------|------|
| `supabase/migrations/xxx_cron_automation.sql` | NOWY | pg_cron + pg_net + harmonogram |
| `supabase/migrations/xxx_position_tracking.sql` | NOWY | Kolumny do śledzenia pozycji |
| `supabase/functions/run-bot-simulation/index.ts` | EDYCJA | Logika BTC held + profit |
| `src/hooks/useBotData.ts` | EDYCJA | Nowe pola w interfejsach |
| `src/pages/Dashboard.tsx` | EDYCJA | Wyświetlanie nowych statystyk |

---

### Sekcja Techniczna

**Średnia ważona cena zakupu:**
```typescript
// Przy każdym kupnie:
const totalValue = (held_btc * avg_price) + (new_btc * current_price);
const new_avg_price = totalValue / (held_btc + new_btc);
```

**Obliczanie profitu przy sprzedaży:**
```typescript
const profit = (sell_price - avg_buy_price) * btc_amount;
// profit > 0 → winning trade
// profit < 0 → losing trade
```

**Harmonogram cron:**
- `*/5 * * * *` - sync cen co 5 minut
- `2 * * * *` - bot simulation o :02 każdej godziny

---

### WAŻNE: pg_cron wymaga ręcznej aktywacji

Po zastosowaniu migracji, pg_cron powinien być automatycznie włączony.
Jeśli nie, trzeba go włączyć ręcznie w Supabase Dashboard:
- Database → Extensions → pg_cron → Enable
- Database → Extensions → pg_net → Enable

