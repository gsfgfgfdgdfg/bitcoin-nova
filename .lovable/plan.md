

## Plan: Transakcje Co Godzinę + Wykres Tygodniowy + Edycja Kwoty Bazowej

---

### Przegląd Zmian

| Element | Było | Będzie |
|---------|------|--------|
| Częstotliwość transakcji | Raz dziennie | **Co godzinę** |
| Zakres wykresu | 30 świec (30 godzin) | **168 świec (7 dni)** |
| Min wolumen | 6 USD (stałe) | **base × 1.1** (np. 6.6 USD) |
| Max wolumen | 12 USD (stałe) | **base × 2** (np. 12 USD) |
| Edycja kwoty bazowej | Brak | **Pole input w Dashboard** |
| Limit transakcji | `last_trade_date` (dzienny) | **`last_trade_hour`** (godzinny) |

---

### Nowy Wzór na Wolumen

```
minVolume = baseAmount × 1.1        (np. 6 × 1.1 = 6.6 USD)
maxVolume = baseAmount × 2.0        (np. 6 × 2.0 = 12 USD)

multiplier = 1.1 + (0.9 × distanceRatio)   // od 1.1x do 2.0x
volume = baseAmount × multiplier
volume = clamp(volume, minVolume, maxVolume)
```

| Odległość od MA | Ratio | Multiplier | Wolumen (base=6) |
|-----------------|-------|------------|------------------|
| 0% (przy MA) | 0.0 | 1.1x | 6.60 USD |
| 50% drogi | 0.5 | 1.55x | 9.30 USD |
| 100% (przy wstędze) | 1.0 | 2.0x | 12.00 USD |

---

### Część 1: Migracja Bazy Danych

Zmiana kolumny `last_trade_date` na `last_trade_hour`:

```sql
ALTER TABLE public.bot_config 
ADD COLUMN IF NOT EXISTS last_trade_hour TIMESTAMPTZ;

-- Kopiuj istniejące dane (opcjonalnie)
UPDATE public.bot_config 
SET last_trade_hour = last_trade_date::timestamptz 
WHERE last_trade_date IS NOT NULL;
```

---

### Część 2: Aktualizacja `src/lib/bollinger.ts`

Nowy wzór z parametrami:

```typescript
export const calculateHourlyVolume = (
  bands: BollingerBands,
  baseAmount: number = 6,
  holdZonePercent: number = 10
): DailyVolumeSignal => {
  const { price, upper, middle, lower } = bands;
  
  // Min i max na podstawie kwoty bazowej
  const minMultiplier = 1.1;
  const maxMultiplier = 2.0;
  const minVolume = baseAmount * minMultiplier;
  const maxVolume = baseAmount * maxMultiplier;
  
  const upperBandWidth = upper - middle;
  const lowerBandWidth = middle - lower;
  
  if (upperBandWidth <= 0 || lowerBandWidth <= 0) {
    return { action: 'HOLD', volumeUsd: 0, distanceRatio: 0, multiplier: 1, reason: 'Invalid band width' };
  }
  
  // Strefa HOLD: ±holdZonePercent% od MA
  const holdZoneThreshold = holdZonePercent / 100;
  const holdZoneUpper = middle + upperBandWidth * holdZoneThreshold;
  const holdZoneLower = middle - lowerBandWidth * holdZoneThreshold;
  
  if (price >= holdZoneLower && price <= holdZoneUpper) {
    return { action: 'HOLD', volumeUsd: 0, distanceRatio: 0, multiplier: 1, reason: 'Cena w strefie neutralnej' };
  }
  
  // KUPNO - cena poniżej MA
  if (price < middle) {
    const distanceFromMA = middle - price;
    const ratio = Math.min(1, distanceFromMA / lowerBandWidth);
    // Multiplier od 1.1 do 2.0
    const multiplier = minMultiplier + (maxMultiplier - minMultiplier) * ratio;
    const volume = Math.min(maxVolume, Math.max(minVolume, baseAmount * multiplier));
    
    return {
      action: 'BUY',
      volumeUsd: Math.round(volume * 100) / 100,
      distanceRatio: ratio,
      multiplier: Math.round(multiplier * 100) / 100,
      reason: `Kupno: ${(ratio * 100).toFixed(1)}% drogi do dolnej wstęgi`
    };
  }
  
  // SPRZEDAŻ - cena powyżej MA
  const distanceFromMA = price - middle;
  const ratio = Math.min(1, distanceFromMA / upperBandWidth);
  const multiplier = minMultiplier + (maxMultiplier - minMultiplier) * ratio;
  const volume = Math.min(maxVolume, Math.max(minVolume, baseAmount * multiplier));
  
  return {
    action: 'SELL',
    volumeUsd: Math.round(volume * 100) / 100,
    distanceRatio: ratio,
    multiplier: Math.round(multiplier * 100) / 100,
    reason: `Sprzedaż: ${(ratio * 100).toFixed(1)}% drogi do górnej wstęgi`
  };
};
```

---

### Część 3: Aktualizacja Edge Function

Zmiana z dziennego na godzinny limit:

```typescript
// Pobierz aktualną godzinę (zaokrągloną do pełnej godziny)
const currentHour = new Date();
currentHour.setMinutes(0, 0, 0);
const currentHourISO = currentHour.toISOString();

// Sprawdź czy już była transakcja w tej godzinie
const lastTradeHour = config.last_trade_hour ? new Date(config.last_trade_hour) : null;
if (lastTradeHour && lastTradeHour.getTime() === currentHour.getTime()) {
  console.log(`[run-bot-simulation] User ${userId} already traded this hour`);
  results.push({ userId, action: 'HOURLY_LIMIT_REACHED' });
  continue;
}

// ... logika transakcji ...

// Zaktualizuj ostatnią godzinę transakcji
await supabase
  .from('bot_config')
  .update({ last_trade_hour: currentHourISO })
  .eq('id', config.id);
```

---

### Część 4: Aktualizacja `usePriceHistory.ts`

Zwiększenie zakresu do 168 świec (tydzień):

```typescript
export const usePriceHistory = (symbol = 'BTC-USDT', interval = '1h', limit = 168) => {
  // ... reszta bez zmian
};
```

W Dashboard.tsx:
```typescript
const { data: priceHistory = [], ... } = usePriceHistory('BTC-USDT', '1h', 168);
```

---

### Część 5: Dashboard - Pole Kwoty Bazowej

Dodanie edytowalnego pola w Dashboard:

```typescript
// Nowa karta konfiguracji
<div className="cyber-card rounded-xl p-6">
  <h2>Konfiguracja Bota</h2>
  
  <div className="space-y-4">
    <div>
      <Label htmlFor="baseAmount">Kwota bazowa (USD)</Label>
      <Input
        id="baseAmount"
        type="number"
        min="1"
        max="100"
        step="0.5"
        value={botConfig?.base_trade_usd || 6}
        onChange={(e) => updateConfig.mutate({ 
          base_trade_usd: parseFloat(e.target.value) 
        })}
      />
      <p className="text-xs text-muted-foreground mt-1">
        Min: {(botConfig?.base_trade_usd || 6) * 1.1} USD | 
        Max: {(botConfig?.base_trade_usd || 6) * 2} USD
      </p>
    </div>
  </div>
</div>
```

---

### Część 6: Aktualizacja StrategyExplainer

Nowy opis strategii:

```typescript
{
  icon: Clock,
  title: 'Interwał godzinny',
  description: 'Bot analizuje cenę zamknięcia każdej świecy godzinowej i podejmuje decyzję o transakcji',
},
{
  icon: Calculator,
  title: 'Wzór na Wolumen',
  description: 'Wolumen = kwota_bazowa × (1.1 + 0.9 × odległość), od base×1.1 do base×2.0',
},
```

---

### Część 7: Aktualizacja Hooka `useBotData.ts`

Dodanie nowego pola i refetchInterval:

```typescript
export interface BotConfig {
  // ... istniejące pola ...
  last_trade_hour: string | null;  // Nowe pole
}

export const useBotConfig = () => {
  return useQuery({
    // ... 
    refetchInterval: 60000,  // Auto-refresh co minutę
    staleTime: 30000,
  });
};

export const useBotTrades = () => {
  return useQuery({
    // ...
    refetchInterval: 60000,  // Auto-refresh co minutę
    staleTime: 30000,
  });
};
```

---

### Część 8: Struktura Plików

| Plik | Akcja | Opis |
|------|-------|------|
| `supabase/migrations/xxx_hourly_trades.sql` | NOWY | Dodaj kolumnę `last_trade_hour` |
| `src/lib/bollinger.ts` | EDYCJA | Nowy wzór `calculateHourlyVolume()` |
| `supabase/functions/run-bot-simulation/index.ts` | EDYCJA | Limit godzinny + nowy wzór |
| `src/hooks/usePriceHistory.ts` | EDYCJA | Domyślny limit 168 świec |
| `src/hooks/useBotData.ts` | EDYCJA | Nowe pole + refetchInterval |
| `src/pages/Dashboard.tsx` | EDYCJA | Pole input dla kwoty bazowej |
| `src/components/StrategyExplainer.tsx` | EDYCJA | Nowy opis strategii |

---

### Weryfikacja Logiki Strategii

**Obecna logika (poprawna):**
- Cena < MA → KUPNO (proporcjonalnie do odległości od dolnej wstęgi)
- Cena > MA → SPRZEDAŻ (proporcjonalnie do odległości od górnej wstęgi)
- Cena w strefie ±10% od MA → HOLD

**Nowy wzór wolumenu:**
```
Przykład dla base = 6 USD:

Cena przy MA (ratio = 0.0):
  multiplier = 1.1 + 0.9 × 0.0 = 1.1
  volume = 6 × 1.1 = 6.6 USD ✓

Cena w połowie drogi (ratio = 0.5):
  multiplier = 1.1 + 0.9 × 0.5 = 1.55
  volume = 6 × 1.55 = 9.3 USD ✓

Cena przy wstędze (ratio = 1.0):
  multiplier = 1.1 + 0.9 × 1.0 = 2.0
  volume = 6 × 2.0 = 12.0 USD ✓
```

---

### Sekcja Techniczna

**Dlaczego godzinny interwał:**
- Bollinger Bands są obliczane z 20 świec 1h → 20 godzin historii
- Bot będzie mógł reagować na zmiany rynku znacznie szybciej
- Więcej możliwości do akumulacji/sprzedaży w ciągu dnia

**Dane na wykresie:**
- 168 świec = 7 dni × 24 godziny
- Pełny tydzień danych do analizy wizualnej
- BB z 20 okresów widoczne na całym zakresie

**Harmonogram cron (do ręcznej konfiguracji):**
```sql
-- Bot simulation co godzinę o :05
SELECT cron.schedule(
  'run-bot-simulation-hourly',
  '5 * * * *',
  $$ ... $$
);
```

