

## Plan: Naprawa Wielowalutowosci, Wykresu i Zysku

---

### Glowna Przyczyna Bledow

Tabele `bot_trades` i `bot_actions` **nie maja kolumny `symbol`**. Gdy uzytkownik zmienil pare z BTC-USDT na XAUT-USDT:

1. **avg_buy_price** w bot_config pozostal ~$69,000 (z BTC), wiec SELL XAUT @ $5,031 oblicza zysk jako: `(5031 - 69000) * ilosc = -$29.65` i `-92%` -- stad bledne raporty
2. **Wykres** pokazuje stare BTC trades ($69k) na tle XAUT ($5k), splaszczajac Y-os od $0k do $80k
3. **HOLD ratio** zwraca 0.0% zamiast rzeczywistej wartosci (hardcoded w kodzie)

---

### Zmiana 1: Dodanie kolumny `symbol` do tabel

**Nowa migracja SQL:**

```sql
ALTER TABLE public.bot_trades ADD COLUMN IF NOT EXISTS symbol TEXT DEFAULT 'BTC-USDT';
ALTER TABLE public.bot_actions ADD COLUMN IF NOT EXISTS symbol TEXT DEFAULT 'BTC-USDT';

-- Oznacz istniejace XAUT trades (po cenie < $10k)
UPDATE public.bot_trades SET symbol = 'XAUT-USDT' WHERE price_usd < 10000;
UPDATE public.bot_actions SET symbol = 'XAUT-USDT' WHERE price_usd < 10000;

-- Napraw zysk dla XAUT SELL trades (przeliczyc na podstawie rzeczywistych cen zakupu XAUT)
-- Usuwamy bledne profit_usd z XAUT trades - zostana przeliczone
```

---

### Zmiana 2: Reset pozycji przy zmianie symbolu

**Plik:** `src/pages/Dashboard.tsx` - handleSaveSymbol

Gdy uzytkownik zmienia pare walutowa (bot musi byc zatrzymany), zresetowac:
- `total_btc_held` -> 0
- `avg_buy_price` -> 0
- `total_profit_usd` -> 0 (opcjonalnie, lub zachowac)
- `total_trades` -> 0
- `winning_trades` -> 0

Dzieki temu nowa para zaczyna od czystego stanu.

---

### Zmiana 3: Edge function - zapisywanie symbol z kazdym trade/action

**Plik:** `supabase/functions/run-bot-simulation/index.ts`

W kazdym `insert` do `bot_trades` i `bot_actions` dodac pole `symbol: symbol`.

---

### Zmiana 4: Fix obliczania zysku SELL

**Plik:** `supabase/functions/run-bot-simulation/index.ts` (linia 398)

Obecna logika:
```typescript
const profit = (currentPrice - avgBuyPrice) * btcToSell;
```

To jest poprawna logika -- problem jest w `avgBuyPrice` ktory nie jest resetowany przy zmianie symbolu. Po wdrozeniu resetu z Zmiany 2, zysk bedzie liczony poprawnie wzgledem sredniej ceny zakupu tego samego coina.

**Zysk procentowy transakcji** = `((currentPrice - avgBuyPrice) / avgBuyPrice) * 100` -- to juz jest w kodzie (linia 399).

---

### Zmiana 5: Fix HOLD ratio

**Plik:** `supabase/functions/run-bot-simulation/index.ts` (linia 122-123)

Obecny kod:
```typescript
if (price >= holdZoneLower && price <= holdZoneUpper) {
  return { action: 'HOLD', volumeUsd: 0, distanceRatio: 0, ...
```

Zmiana - obliczyc rzeczywiste ratio nawet w strefie HOLD:
```typescript
if (price >= holdZoneLower && price <= holdZoneUpper) {
  const distanceFromMA = Math.abs(price - middle);
  const bandWidth = price >= middle ? upperBandWidth : lowerBandWidth;
  const actualRatio = bandWidth > 0 ? Math.min(1, distanceFromMA / bandWidth) : 0;
  return { action: 'HOLD', volumeUsd: 0, distanceRatio: actualRatio, ...
```

Ten sam fix w `src/lib/bollinger.ts`.

---

### Zmiana 6: Wykres - wieksza wysokosc + filtrowanie trades po symbol

**Plik:** `src/components/BollingerChart.tsx`

1. Zwiekszyc `h-64` (256px) do `h-[500px]`
2. Dodac prop `symbol` i filtrowac trades po nim:

```typescript
interface BollingerChartProps {
  priceHistory: { price: number; timestamp: number }[];
  trades?: BotTrade[];
  symbol?: string;  // nowy prop
}

// Filtrowanie:
const filteredTrades = trades.filter(t => 
  !symbol || t.symbol === symbol
);
```

Poniewaz stare trades nie maja `symbol`, bedziemy tez filtrowac po cenie -- trades z cena daleko od zakresu wykresu beda pomijane.

---

### Zmiana 7: TradeHistory - zysk w % zamiast kwoty

**Plik:** `src/components/TradeHistory.tsx`

Na liscie (linia 141-142) i w dialogu (linia 275-276):

Zamiast:
```
+$0.04
```

Pokazac:
```
+0.06%  ($0.04)
```

Obliczanie: Jesli trade ma `price_usd` i wiemy `avgBuyPrice` (z bollinger_middle lub z kontekstu), to:
```typescript
const profitPercent = avgBuyPrice > 0 ? ((sellPrice - avgBuyPrice) / avgBuyPrice * 100) : 0;
```

Ale w `bot_trades` nie mamy `avg_buy_price` per trade. Mozemy ja obliczyc z `profit_usd` i `amount_btc`:
```typescript
// profit = (sellPrice - avgBuyPrice) * amount
// avgBuyPrice = sellPrice - (profit / amount)
const avgBuy = sellPrice - (profit / amount);
const profitPct = ((sellPrice - avgBuy) / avgBuy * 100);
```

Alternatywnie, dodac kolumne `profit_percent` do `bot_trades` i zapisywac w edge function.

---

### Zmiana 8: Filtrowanie trades/actions po aktualnym symbolu

**Plik:** `src/hooks/useBotData.ts` - `useBotTrades` i `useBotActions`

Dodac parametr `symbol` i filtrowac zapytania:
```typescript
export const useBotTrades = (symbol?: string) => {
  // ...
  .eq('user_id', user.id)
  ...(symbol ? .eq('symbol', symbol) : '')
```

Lub filtrowac po stronie frontendu w Dashboard.

---

### Zmiana 9: Aktualizacja typow

**Plik:** `src/hooks/useBotData.ts`

Dodac `symbol` do interfejsow `BotTrade` i `BotAction`.

---

### Podsumowanie Zmian

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Dodac `symbol` do bot_trades i bot_actions, naprawic XAUT trades |
| `supabase/functions/run-bot-simulation/index.ts` | 1) Zapisywac `symbol` z kazdym trade/action. 2) Fix HOLD ratio. 3) Dodac `profit_percent` do SELL trades |
| `src/lib/bollinger.ts` | Fix HOLD ratio (ten sam wzor co w edge function) |
| `src/components/BollingerChart.tsx` | 1) Wysokosc h-64 -> h-[500px]. 2) Filtrowac trades po cenie/symbol |
| `src/components/TradeHistory.tsx` | Zysk jako % (glowny) z kwota (drugorzedna) |
| `src/hooks/useBotData.ts` | Dodac `symbol` do interfejsow |
| `src/pages/Dashboard.tsx` | Reset pozycji przy zmianie symbolu |
| `src/integrations/supabase/types.ts` | Aktualizacja typow |

---

### Weryfikacja Zysku XAUT

Przyklad z Pushover: BUY XAUT 0.000560 @ $5,004, potem SELL @ $5,031.70

```text
Poprawne obliczenie:
avgBuyPrice = ~$5,004 (z XAUT zakupow)
profit = (5031.70 - 5004) * 0.000461 = $0.013
profitPercent = (5031.70 - 5004) / 5004 * 100 = +0.55%

Bledne (obecne):
avgBuyPrice = ~$69,000 (z BTC!)
profit = (5031.70 - 69000) * 0.000461 = -$29.65
profitPercent = -92.7%
```

Po resecie pozycji przy zmianie symbolu i dodaniu kolumny `symbol`, ten problem zostanie rozwiazany.

