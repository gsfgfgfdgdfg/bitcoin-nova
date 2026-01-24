

## Plan: Nowa Strategia Wolumenowa z Bollingerem

---

### Przegląd Nowej Strategii

Całkowita zmiana logiki bota tradingowego:

| Element | Stara strategia | Nowa strategia |
|---------|-----------------|----------------|
| Częstotliwość | Tylko przy granicy wstęgi | **Codziennie** |
| Kwota bazowa | 1% portfela | **6 USD** |
| Max dzienny | Brak limitu | **12 USD** |
| Sygnał BUY | Cena przy dolnej wstędze | **Cena poniżej MA** |
| Sygnał SELL | Cena przy górnej wstędze | **Cena powyżej MA** |
| Strefa HOLD | Brak | **±10% od MA** |
| Skalowanie | Stałe | **Wg odległości od wstęgi** |

---

### Wzór na Wolumen Transakcji

```text
┌─────────────────────────────────────────────────────────────────┐
│                     UPPER BAND (89772.15)                        │
│                           ↑                                      │
│                     SPRZEDAŻ (SELL)                              │
│                           │                                      │
│        Wolumen = (1 + odległość_ratio) × 6 USD                   │
│        gdzie: ratio = (cena - MA) / (upper - MA)                 │
│                           │                                      │
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ STREFA HOLD (+10%) ┄┄┄┄┄┄┄┄┄┄┄┄┄┄                │
│                     MA (89434.49)                                 │
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ STREFA HOLD (-10%) ┄┄┄┄┄┄┄┄┄┄┄┄┄┄                │
│                           │                                      │
│        Wolumen = (1 + odległość_ratio) × 6 USD                   │
│        gdzie: ratio = (MA - cena) / (MA - lower)                 │
│                           │                                      │
│                     KUPNO (BUY)                                   │
│                           ↓                                      │
│                     LOWER BAND (89096.84)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

### Algorytm Kalkulacji Wolumenu

```typescript
interface VolumeCalculation {
  action: 'BUY' | 'SELL' | 'HOLD';
  volumeUsd: number;
  distanceRatio: number;
  reason: string;
}

function calculateDailyVolume(
  price: number,
  upper: number,
  middle: number,
  lower: number,
  baseAmount: number = 6,
  maxAmount: number = 12
): VolumeCalculation {
  
  const upperBandWidth = upper - middle;  // 337.66
  const lowerBandWidth = middle - lower;  // 337.65
  
  // Strefa HOLD: ±10% od średniej
  const holdZoneUpper = middle + upperBandWidth * 0.10;
  const holdZoneLower = middle - lowerBandWidth * 0.10;
  
  // Jeśli cena w strefie HOLD - nie rób nic
  if (price >= holdZoneLower && price <= holdZoneUpper) {
    return {
      action: 'HOLD',
      volumeUsd: 0,
      distanceRatio: 0,
      reason: 'Cena w strefie neutralnej (±10% od MA)'
    };
  }
  
  // Cena PONIŻEJ MA → KUPNO
  if (price < middle) {
    const distanceFromMA = middle - price;
    const ratio = Math.min(1, distanceFromMA / lowerBandWidth);
    const volume = Math.min(maxAmount, (1 + ratio) * baseAmount);
    
    return {
      action: 'BUY',
      volumeUsd: volume,
      distanceRatio: ratio,
      reason: `Kupno: cena ${ratio.toFixed(1)}% drogi do dolnej wstęgi`
    };
  }
  
  // Cena POWYŻEJ MA → SPRZEDAŻ
  const distanceFromMA = price - middle;
  const ratio = Math.min(1, distanceFromMA / upperBandWidth);
  const volume = Math.min(maxAmount, (1 + ratio) * baseAmount);
  
  return {
    action: 'SELL',
    volumeUsd: volume,
    distanceRatio: ratio,
    reason: `Sprzedaż: cena ${ratio.toFixed(1)}% drogi do górnej wstęgi`
  };
}
```

---

### Weryfikacja na Twoich Przykładach

**Przykład 1: Cena 89291.01 (poniżej MA)**
```
upper = 89772.15, MA = 89434.49, lower = 89096.84
lowerBandWidth = 89434.49 - 89096.84 = 337.65
distanceFromMA = 89434.49 - 89291.01 = 143.48
ratio = 143.48 / 337.65 = 0.4249
volume = (1 + 0.4249) × 6 = 8.55 USD ✓ BUY
```

**Przykład 2: Cena 89591.01 (powyżej MA)**
```
upper = 89772.15, MA = 89434.49, lower = 89096.84
upperBandWidth = 89772.15 - 89434.49 = 337.66
distanceFromMA = 89591.01 - 89434.49 = 156.52
ratio = 156.52 / 337.66 = 0.4635
volume = (1 + 0.4635) × 6 = 8.78 USD ✓ SELL
```

---

### Część 1: Aktualizacja Tabeli `bot_config`

Dodanie nowych kolumn dla parametrów strategii:

```sql
ALTER TABLE public.bot_config
ADD COLUMN IF NOT EXISTS base_trade_usd DECIMAL(10, 2) DEFAULT 6.00,
ADD COLUMN IF NOT EXISTS max_daily_usd DECIMAL(10, 2) DEFAULT 12.00,
ADD COLUMN IF NOT EXISTS hold_zone_percent DECIMAL(5, 2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS last_trade_date DATE;
```

---

### Część 2: Aktualizacja `src/lib/bollinger.ts`

Dodanie nowych funkcji:

```typescript
export interface DailyVolumeSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  volumeUsd: number;
  distanceRatio: number;
  reason: string;
  multiplier: number;
}

export const calculateDailyVolume = (
  bands: BollingerBands,
  baseAmount: number = 6,
  maxAmount: number = 12,
  holdZonePercent: number = 10
): DailyVolumeSignal => {
  const { price, upper, middle, lower } = bands;
  
  const upperBandWidth = upper - middle;
  const lowerBandWidth = middle - lower;
  
  // Strefa HOLD: ±holdZonePercent% od średniej
  const holdZoneThreshold = holdZonePercent / 100;
  const holdZoneUpper = middle + upperBandWidth * holdZoneThreshold;
  const holdZoneLower = middle - lowerBandWidth * holdZoneThreshold;
  
  // Strefa neutralna
  if (price >= holdZoneLower && price <= holdZoneUpper) {
    return {
      action: 'HOLD',
      volumeUsd: 0,
      distanceRatio: 0,
      multiplier: 1,
      reason: `Cena w strefie neutralnej (±${holdZonePercent}% od MA)`
    };
  }
  
  // KUPNO - cena poniżej MA
  if (price < middle) {
    const distanceFromMA = middle - price;
    const ratio = Math.min(1, distanceFromMA / lowerBandWidth);
    const multiplier = 1 + ratio;
    const volume = Math.min(maxAmount, multiplier * baseAmount);
    
    return {
      action: 'BUY',
      volumeUsd: Math.round(volume * 100) / 100,
      distanceRatio: ratio,
      multiplier,
      reason: `Kupno: ${(ratio * 100).toFixed(1)}% drogi do dolnej wstęgi`
    };
  }
  
  // SPRZEDAŻ - cena powyżej MA
  const distanceFromMA = price - middle;
  const ratio = Math.min(1, distanceFromMA / upperBandWidth);
  const multiplier = 1 + ratio;
  const volume = Math.min(maxAmount, multiplier * baseAmount);
  
  return {
    action: 'SELL',
    volumeUsd: Math.round(volume * 100) / 100,
    distanceRatio: ratio,
    multiplier,
    reason: `Sprzedaż: ${(ratio * 100).toFixed(1)}% drogi do górnej wstęgi`
  };
};
```

---

### Część 3: Aktualizacja Edge Function `run-bot-simulation`

Główne zmiany:
1. Codzienne transakcje (sprawdzenie `last_trade_date`)
2. Nowy wzór na wolumen
3. Logika BUY/SELL oparta o pozycję względem MA

```typescript
// Sprawdź czy dzisiaj już była transakcja
const today = new Date().toISOString().split('T')[0];
if (config.last_trade_date === today) {
  results.push({ userId, action: 'DAILY_LIMIT_REACHED' });
  continue;
}

// Oblicz wolumen wg nowej strategii
const signal = calculateDailyVolume(bands, 
  config.base_trade_usd || 6,
  config.max_daily_usd || 12,
  config.hold_zone_percent || 10
);

if (signal.action === 'HOLD') {
  results.push({ userId, action: 'HOLD', details: { reason: signal.reason } });
  continue;
}

if (signal.action === 'BUY') {
  // Kup BTC za obliczony wolumen USD
  const amountBtc = signal.volumeUsd / currentPrice;
  await createBuyTrade(userId, amountBtc, currentPrice, signal.volumeUsd);
}

if (signal.action === 'SELL') {
  // Sprzedaj BTC o wartości obliczonego wolumenu USD
  const amountBtc = signal.volumeUsd / currentPrice;
  await createSellTrade(userId, amountBtc, currentPrice, signal.volumeUsd);
}

// Zaktualizuj datę ostatniej transakcji
await supabase
  .from('bot_config')
  .update({ last_trade_date: today })
  .eq('id', config.id);
```

---

### Część 4: Aktualizacja Frontend

#### 4.1 StrategyExplainer.tsx - Nowy opis strategii

```typescript
const steps = [
  {
    icon: TrendingDown,
    title: 'Kupno (poniżej MA)',
    description: 'Codzienne kupno gdy cena jest poniżej średniej. Wolumen: 6-12 USD zależnie od odległości',
  },
  {
    icon: TrendingUp,
    title: 'Sprzedaż (powyżej MA)',
    description: 'Codzienna sprzedaż gdy cena jest powyżej średniej. Wolumen skalowany wg pozycji',
  },
  {
    icon: Pause,
    title: 'Strefa Neutralna',
    description: 'Brak transakcji gdy cena jest w okolicy ±10% od MA',
  },
  {
    icon: Calculator,
    title: 'Wzór na Wolumen',
    description: 'Wolumen = (1 + odległość_ratio) × 6 USD, max 12 USD/dzień',
  },
];
```

#### 4.2 Dashboard.tsx - Wyświetlanie aktualnego sygnału

Dodanie karty pokazującej:
- Aktualny sygnał (BUY/SELL/HOLD)
- Obliczony wolumen
- Mnożnik (1.0x - 2.0x)
- Odległość od wstęgi w %

---

### Część 5: Struktura Plików

| Plik | Akcja | Opis |
|------|-------|------|
| `supabase/migrations/xxx_add_volume_columns.sql` | NOWY | Nowe kolumny w bot_config |
| `src/lib/bollinger.ts` | EDYCJA | Nowa funkcja `calculateDailyVolume` |
| `supabase/functions/run-bot-simulation/index.ts` | EDYCJA | Nowa logika wolumenowa |
| `src/components/StrategyExplainer.tsx` | EDYCJA | Nowy opis strategii |
| `src/pages/Dashboard.tsx` | EDYCJA | Karta aktualnego sygnału |
| `src/hooks/useBotData.ts` | EDYCJA | Nowe pola w interfejsach |

---

### Podsumowanie Logiki

```text
CODZIENNIE O USTALONEJ GODZINIE:

1. Sprawdź czy dziś już była transakcja → jeśli tak, SKIP

2. Pobierz Bollinger Bands (20, 2) z 1h świec

3. Oblicz strefę HOLD: MA ± 10% szerokości wstęgi

4. JEŚLI cena w strefie HOLD:
   → Nic nie rób

5. JEŚLI cena < MA (kupno):
   → ratio = (MA - cena) / (MA - lower)
   → wolumen = min(12, (1 + ratio) × 6) USD
   → KUP BTC za wolumen USD

6. JEŚLI cena > MA (sprzedaż):
   → ratio = (cena - MA) / (upper - MA)
   → wolumen = min(12, (1 + ratio) × 6) USD
   → SPRZEDAJ BTC o wartości wolumen USD

7. Zapisz transakcję i zaktualizuj last_trade_date
```

