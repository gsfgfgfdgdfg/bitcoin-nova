

## Plan: Naprawa Wykresu + Pushover + Statystyki + XAUT/Zloto

---

### Problem 1: Wykres pokazuje stare dane (Jan 21-28 zamiast Feb 3-9)

**Przyczyna:** W `usePriceHistory.ts` linia 32: `.order('candle_time', { ascending: true }).limit(168)`. W bazie jest 384 swiec. Supabase stosuje ORDER przed LIMIT, wiec `ascending: true` + `limit(168)` zwraca 168 NAJSTARSZYCH swiec (od 21 stycznia). Wykres nigdy nie dotrze do aktualnych danych.

**Rozwiazanie:** Zmienic na `ascending: false` + `limit(168)`, a potem odwrocic tablice w JS:

```typescript
// usePriceHistory.ts linia 32
.order('candle_time', { ascending: false })
.limit(limit);

// linia 40 - odwrocic wynik
return (data || []).reverse().map(...)
```

---

### Problem 2: Pushover - dodac granice BB, wartosci bezwzgledne, stan konta, zysk %

**Plik:** `supabase/functions/run-bot-simulation/index.ts`

**BUY (linie 345-350) - nowy format:**
```
BUY 0.000058 BTC @ $70,510
Vol: $4.00 (2.00x) | Ratio: 100%
MA: $69,280
Upper: $71,178 (+$1,898)
Lower: $67,382 (-$1,898)
Saldo: $9,981.69 | BTC: 0.000515
P/L: +0.05%
```

**SELL (linie 452-457) - nowy format:**
```
SELL 0.000043 BTC @ $70,882 | +0.28%
MA: $69,800 | Ratio: 100%
Upper: $71,500 (+$1,700)
Lower: $68,100 (-$1,700)
Saldo: $9,988.73 | BTC: 0.000414
P/L: +0.08%
```

**HOLD - dodac Pushover (po linii 264):**
```
HOLD @ $70,620
MA: $69,800 | Ratio: 5%
Upper: $71,500 (+$1,700)
Lower: $68,100 (-$1,700)
Saldo: $9,985.69 | BTC: 0.000457
P/L: +0.05%
```

Kluczowe zmiany w edge function:
1. Linie 345-350 (BUY pushover): dodac Upper/Lower z wartosciami bezwzglednymi, saldo i P/L%
2. Linie 452-457 (SELL pushover): dodac Upper/Lower, saldo, P/L%  
3. Po linii 264 (HOLD): dodac wywolanie `sendPushover` z pelnym formatem
4. Linia 197: zmienic hardcoded `"BTC-USDT"` na `config.symbol || 'BTC-USDT'` (kazdy bot uzywa swojego symbolu)
5. Osobna petla po configach - kazdy config pobiera swoje ceny wg `config.symbol`

---

### Problem 3: Statystyki transakcji

**Stan bazy:** 22 BUY, 15 SELL (13 profitable). `bot_config.total_trades=34` (powinno byc 37), `winning_trades=13`.

Dashboard juz liczy z tablicy trades (linie 56-75), wiec wyswietla poprawnie 13/15 (87%). Ale `bot_config.total_trades` jest rozsynchornizowane (34 vs 37 rzeczywistych). 

**Rozwiazanie:** Naprawic dane w bazie jednorazowa migracja:
```sql
UPDATE bot_config SET total_trades = 37 WHERE total_trades = 34;
```

Frontend juz liczy poprawnie z tablicy trades - to jest ok.

---

### Problem 4: Zysk procentowy - juz zaimplementowany

Dashboard juz pokazuje P/L procentowo jako glowna wartosc (linie 229-230). Kwota USD jest drugorzedna (linie 233-235). To jest ok, ale dodam % tez w Pushover.

---

### Problem 5: XAUT (Zloto) + wlasne pary walutowe

**BingX symbol zlota:** `XAUT-USDT`

**Zmiany:**
1. `sync-bingx-prices/index.ts` linia 11: dodac `'XAUT-USDT'` do `SUPPORTED_SYMBOLS` + dynamicznie pobierac symbole z aktywnych botow w `bot_config`
2. Dashboard: zamienic Select na dwa inputy (Coin / Waluta), zablokowane gdy `is_running === true`
3. Edge function `run-bot-simulation`: przeniesc pobieranie cen WEWNATRZ petli po configach, uzyc `config.symbol`

---

### Problem 6: HOLD do Pushover

Dodac wywolanie `sendPushover` po zapisie HOLD do `bot_actions` (po linii 264 w edge function).

---

### Szczegolowy Plan Zmian

| Plik | Zmiana |
|------|--------|
| `src/hooks/usePriceHistory.ts` | Linia 32: `ascending: false`, linia 40: `.reverse()` |
| `supabase/functions/run-bot-simulation/index.ts` | 1) Ceny per config.symbol (nie hardcoded). 2) Pushover BUY/SELL/HOLD z BB granicami, wartosciami bezwzglednymi, saldem i P/L%. 3) HOLD pushover |
| `supabase/functions/sync-bingx-prices/index.ts` | Dodac XAUT-USDT + dynamiczne symbole z bot_config |
| `src/pages/Dashboard.tsx` | Zamienic Select na dwa inputy Coin/Waluta, zablokowane przy is_running |
| Migracja SQL | Naprawic total_trades w bot_config |

---

### Sekcja Techniczna

**Naprawa usePriceHistory:**
```typescript
// Linia 32 - zmiana kolejnosci
.order('candle_time', { ascending: false })
.limit(limit);

// Linia 40 - odwrocenie
return (data || []).reverse().map((p: PriceHistoryRow) => ({
  ...
}));
```

**Pushover format (BUY):**
```typescript
const upperDist = (bands.upper - bands.middle).toFixed(0);
const lowerDist = (bands.middle - bands.lower).toFixed(0);
const plPercent = ((newBalance + newTotalBtc * currentPrice - 10000) / 10000 * 100).toFixed(2);

await sendPushover(
  `🟢 BUY ${symbol}`,
  `${btcBought.toFixed(6)} @ $${currentPrice.toLocaleString()}
Vol: $${signal.volumeUsd.toFixed(2)} (${signal.multiplier}x) | Ratio: ${(signal.distanceRatio * 100).toFixed(1)}%
MA: $${bands.middle.toFixed(0)}
Upper: $${bands.upper.toFixed(0)} (+$${upperDist})
Lower: $${bands.lower.toFixed(0)} (-$${lowerDist})
Saldo: $${newBalance.toFixed(2)} | ${coinName}: ${newTotalBtc.toFixed(6)}
P/L: ${plPercent}%`
);
```

**Edge function - ceny per symbol (przeniesienie do petli):**
```typescript
for (const config of activeConfigs) {
  const symbol = config.symbol || 'BTC-USDT';
  
  // Pobierz ceny dla tego symbolu
  const { data: priceHistory } = await supabase
    .from("price_history")
    .select("close_price, candle_time")
    .eq("symbol", symbol)
    .eq("interval", "1h")
    .order("candle_time", { ascending: false })
    .limit(25);
  
  // Oblicz BB dla tego symbolu
  const prices = priceHistory.reverse().map(p => Number(p.close_price));
  const bands = calculateBollingerBands(prices, 20, 2);
  // ... reszta logiki
}
```

**sync-bingx-prices - dynamiczne symbole:**
```typescript
// Pobierz unikalne symbole z aktywnych botow
const { data: configs } = await supabase
  .from("bot_config")
  .select("symbol");

const dynamicSymbols = [...new Set((configs || []).map(c => c.symbol).filter(Boolean))];
const allSymbols = [...new Set([...SUPPORTED_SYMBOLS, ...dynamicSymbols])];
```

**Dashboard - dwa inputy:**
```typescript
const [coinInput, setCoinInput] = useState('BTC');
const [quoteInput, setQuoteInput] = useState('USDT');

// Sync z config
useEffect(() => {
  if (botConfig?.symbol) {
    const [coin, quote] = botConfig.symbol.split('-');
    setCoinInput(coin || 'BTC');
    setQuoteInput(quote || 'USDT');
  }
}, [botConfig?.symbol]);

const handleSaveSymbol = () => {
  if (!isRunning && coinInput && quoteInput) {
    updateConfig.mutate({ symbol: `${coinInput.toUpperCase()}-${quoteInput.toUpperCase()}` });
  }
};
```

