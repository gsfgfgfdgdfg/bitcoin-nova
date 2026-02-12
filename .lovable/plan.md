

## Plan: Tryb procentowy, interwaly, rozstrzal i poprawki

---

### Zmiana 1: Przelacznik trybu transakcji (kwota vs % kapitalu)

Dodanie do `bot_config` nowych kolumn:
- `trade_mode` (TEXT, default `'fixed'`) -- `'fixed'` lub `'percent'`
- `trade_percent` (NUMERIC, default `5`) -- procent kapitalu
- `trade_min_usd` (NUMERIC, default `2`) -- minimalna kwota transakcji

**Logika w edge function:** Gdy `trade_mode = 'percent'`, obliczany wolumen bazowy to `currentBalance * (trade_percent / 100)`, ale nie mniej niz `trade_min_usd`. Potem stosowany jest ten sam mnoznik Bollinger (1x-2x).

**UI w Dashboard (karta Configuration):**
- Przelacznik (Switch/Tabs): "Kwota USD" / "% kapitalu"
- W trybie kwotowym: pole "USD base" (jak teraz)
- W trybie procentowym: pole "% kapitalu" + pole "nie mniej niz (USD)"
- Zakres dynamicznie przeliczany na podstawie aktualnego salda

---

### Zmiana 2: Wybor interwalu

Dodanie do `bot_config` kolumny:
- `interval` (TEXT, default `'1h'`)

**Dostepne interwaly:** `1s, 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M`

**Mapowanie interwalow BingX:** BingX API uzywa formatow: `1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M`. Wiec format jest kompatybilny.

**Zmiany:**
- `sync-bingx-prices`: pobieranie swieczek w interwale z `bot_config` (dynamicznie per bot)
- `run-bot-simulation`: uzycie interwalu z configu zamiast hardcoded `'1h'`
- `usePriceHistory`: przekazywanie interwalu z configu
- Dashboard: Select z lista interwalow, zmiana wykres i tytul
- Zmiana limitu (hourly -> interval-based) w edge function

**Uwaga:** Limit "jedna transakcja na godzine" musi byc zmieniony na "jedna transakcja na interwal". Pole `last_trade_hour` bedzie porownywane z aktualnym interwałem.

---

### Zmiana 3: Info o pozostalych transakcjach

**Obliczenie:** `maxTransakcji = totalBtcHeld / (baseVolume100pct / currentPrice)`

Gdzie `baseVolume100pct` to wolumen przy ratio 100% (baza * 1.0).

**Wyswietlanie:**
- W szczegolach akcji (dialog TradeHistory): nowa sekcja "Pozostale transakcje: ~4.66"
- W Pushover: dodac linie `Remaining: ~4.66 sells @ 100%`

Edge function bedzie obliczal te wartosc i dodawal do powiadomien. Na froncie obliczane z danych w kontekscie.

---

### Zmiana 4: Parametr "rozstrzal" (spread)

**Wzor:** `rozstrzal = ((upper - lower) / middle) * 100` -- wynik w %

**Wyswietlanie:**
- Na stronie: w szczegolach akcji (dialog) jako dodatkowa metryka
- W Pushover: nowa linia np. `Spread: 1.83%`
- W formatBBDetails helper: dodac `Spread` do kazdego powiadomienia

---

### Zmiana 5: Fix "BTC" -> nazwa aktualnego coina

**Zrodla bledu:**
1. `src/lib/bollinger.ts` linia 113: `formatBTC` hardcoduje "BTC" -- dodac parametr `coinName`
2. `src/components/TradeHistory.tsx` linia 82: hardcoded "BRAK BTC" -- uzyc `symbol` z action
3. `src/components/TradeHistory.tsx` linia 126: `formatBTC()` -- przekazac nazwe coina

**Rozwiazanie:** Zmienic `formatBTC` na `formatCoin(amount, coinName)` i przekazac `symbol` jako prop do TradeHistory.

---

### Zmiana 6: Pushover dla NO_BTC_TO_SELL

Obecnie przy braku coina do sprzedazy, bot loguje do `bot_actions` ale NIE wysyla Pushover. Dodac wywolanie `sendPushover` z pelnym formatem BB + stan konta.

---

### Szczegolowy plan plikow

| Plik | Zmiany |
|------|--------|
| **Migracja SQL** | Dodac kolumny: `trade_mode`, `trade_percent`, `trade_min_usd`, `interval` |
| **`src/integrations/supabase/types.ts`** | Dodac nowe kolumny do typow |
| **`src/hooks/useBotData.ts`** | Dodac nowe pola do BotConfig interface |
| **`src/pages/Dashboard.tsx`** | 1) Przelacznik trybu kwota/%. 2) Select interwalu. 3) Przekazac symbol do TradeHistory. 4) Dynamiczny tytul wykresu z interwalem |
| **`src/components/TradeHistory.tsx`** | 1) Prop `symbol`, uzyc w etykietach. 2) Rozstrzal w dialogu. 3) Remaining sells w dialogu. 4) Fix "BRAK BTC" -> "BRAK {coin}" |
| **`src/lib/bollinger.ts`** | `formatBTC` -> `formatCoin(amount, coinName)` |
| **`supabase/functions/run-bot-simulation/index.ts`** | 1) trade_mode/percent logika. 2) interval zamiast hardcoded 1h. 3) Rozstrzal w pushover. 4) Remaining sells w pushover. 5) NO_BTC_TO_SELL pushover |
| **`supabase/functions/sync-bingx-prices/index.ts`** | Pobierac swieczki w interwalach z bot_config |
| **`src/hooks/usePriceHistory.ts`** | Bez zmian (juz przyjmuje interval jako parametr) |
| **`src/components/BollingerChart.tsx`** | Bez zmian |

---

### Sekcja Techniczna

**Migracja SQL:**
```sql
ALTER TABLE public.bot_config 
  ADD COLUMN IF NOT EXISTS trade_mode TEXT DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS trade_percent NUMERIC DEFAULT 5,
  ADD COLUMN IF NOT EXISTS trade_min_usd NUMERIC DEFAULT 2,
  ADD COLUMN IF NOT EXISTS interval TEXT DEFAULT '1h';
```

**Edge function - tryb procentowy:**
```typescript
let baseAmount: number;
if (config.trade_mode === 'percent') {
  const percentAmount = currentBalance * (Number(config.trade_percent) || 5) / 100;
  const minUsd = Number(config.trade_min_usd) || 2;
  baseAmount = Math.max(minUsd, percentAmount);
} else {
  baseAmount = Number(config.base_trade_usd) || 6;
}
```

**Edge function - interwal:**
```typescript
const interval = config.interval || '1h';

// Pobierz ceny w odpowiednim interwale
const { data: priceHistory } = await supabase
  .from("price_history")
  .select("close_price, candle_time")
  .eq("symbol", symbol)
  .eq("interval", interval)
  .order("candle_time", { ascending: false })
  .limit(25);

// Limit transakcji per interwal zamiast per godzine
// Oblicz poczatek biezacego interwalu
```

**Mapowanie interwalow na sekundy (do limitu transakcji):**
```typescript
const intervalMs: Record<string, number> = {
  '1s': 1000, '1m': 60000, '3m': 180000, '5m': 300000,
  '15m': 900000, '30m': 1800000, '1h': 3600000, '2h': 7200000,
  '4h': 14400000, '6h': 21600000, '8h': 28800000, '12h': 43200000,
  '1d': 86400000, '3d': 259200000, '1w': 604800000, '1M': 2592000000,
};
```

**Rozstrzal w formatBBDetails:**
```typescript
const spread = ((bands.upper - bands.lower) / bands.middle * 100).toFixed(2);
// Dodac do return:
// Spread: ${spread}%
```

**Remaining sells:**
```typescript
const baseVol100 = baseAmount; // volume at 100% ratio
const maxSellPerTx = baseVol100 / currentPrice;
const remainingSells = maxSellPerTx > 0 ? (coinHeld / maxSellPerTx).toFixed(2) : '0';
// Dodac: Remaining: ~${remainingSells} sells
```

**Fix formatCoin:**
```typescript
export const formatCoin = (amount: number, coinName: string = 'BTC'): string => {
  return `${amount.toFixed(6)} ${coinName}`;
};
// Zachowac formatBTC dla kompatybilnosci:
export const formatBTC = (amount: number): string => formatCoin(amount, 'BTC');
```

**Dashboard - UI przelacznika trybu:**
```typescript
// Tabs: "Kwota" | "% kapitalu"
<Tabs value={tradeMode} onValueChange={handleTradeMode}>
  <TabsList><TabsTrigger value="fixed">USD</TabsTrigger>
  <TabsTrigger value="percent">%</TabsTrigger></TabsList>
</Tabs>
// W trybie "percent":
<Input value={tradePercent} /> <span>% kapitalu</span>
<Input value={tradeMinUsd} /> <span>min. USD</span>
```

**Dashboard - Select interwalu:**
```typescript
const INTERVALS = ['1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w','1M'];
<Select value={interval} onValueChange={handleIntervalChange}>
  {INTERVALS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
</Select>
```

**sync-bingx-prices - dynamiczne interwaly:**
```typescript
// Pobierz unikalne interwaly z bot_config
const { data: configs } = await supabase
  .from("bot_config")
  .select("symbol, interval");

// Dla kazdego unikalnego (symbol, interval) pobierz swieczki
const pairs = [...new Set(configs.map(c => `${c.symbol}|${c.interval}`))];
for (const pair of pairs) {
  const [sym, intv] = pair.split('|');
  const klineUrl = `...&symbol=${sym}&interval=${intv}&limit=50`;
  // ...
}
```

