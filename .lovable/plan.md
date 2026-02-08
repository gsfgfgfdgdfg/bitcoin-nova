

## Plan: Kompleksowa Naprawa Bota + Szczegoly Transakcji + Pushover + Wielowalutowosc

---

### Podsumowanie Problemow

| Problem | Obecny Stan | Rozwiazanie |
|---------|-------------|-------------|
| **Win Rate zle obliczany** | "53.3% (8/15)" - liczy wszystkie trades | Win Rate = zyskowne SELL / wszystkie SELL |
| **Wzor wolumenu bledny** | `multiplier = 1.1 + 0.9 * ratio` (110%-200%) | `multiplier = 1 + ratio` (100%-200%) |
| **Wykres nie aktualizuje sie** | Brak auto-refresh | Dodac interval co 60s |
| **Brak znacznikow BUY/SELL** | Wykres nie pokazuje transakcji | Dodac markery na wykresie |
| **P/L tylko w kwotach** | Brak procentow | Dodac % wzrostu kapitalu |
| **Brak szczegolow transakcji** | Klikniecie nie pokazuje danych | Dialog ze szczegolami BB |
| **Brak Pushover** | Sekrety sa, brak implementacji | Dodac wywolanie API |
| **Tylko BTC-USDT** | Brak wyboru par | Dodac select + sync wielu par |
| **HOLD nie pokazywany** | Akcje HOLD nie sa zapisywane | Nowa tabela bot_actions |

---

### Czesc 1: Poprawka Wzoru Wolumenu

**Pliki:** `supabase/functions/run-bot-simulation/index.ts` (linie 60-64, 98, 113) + `src/lib/bollinger.ts` (linie 143-147, 184, 199)

**Obecny (bledny) wzor:**
```typescript
const minMultiplier = 1.1;
const maxMultiplier = 2.0;
const multiplier = minMultiplier + (maxMultiplier - minMultiplier) * ratio;
// = 1.1 + 0.9 * ratio
```

**Nowy (poprawny) wzor:**
```typescript
// multiplier = 1 + ratio
// ratio 0:   1 + 0 = 1.0 (100%)
// ratio 0.5: 1 + 0.5 = 1.5 (150%)  
// ratio 1.0: 1 + 1 = 2.0 (200%)
const multiplier = 1 + ratio;
const volume = baseAmount * multiplier;
```

---

### Czesc 2: Poprawka Win Rate

**Plik:** `src/pages/Dashboard.tsx`

**Obecna logika:**
```typescript
// W useBotStats:
const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
// Wyswietla: "Win rate: 53.3% (8/15)"
```

**Nowa logika - obliczanie z trades:**
```typescript
// W Dashboard.tsx:
const sellTrades = (trades || []).filter(t => t.type === 'SELL');
const winningSells = sellTrades.filter(t => Number(t.profit_usd) > 0).length;
const winRate = sellTrades.length > 0 
  ? (winningSells / sellTrades.length) * 100 
  : 0;

// Wyswietlanie:
<p>Zyskowne: {winningSells}/{sellTrades.length} ({winRate.toFixed(0)}%)</p>
```

---

### Czesc 3: P/L w Procentach

**Plik:** `src/pages/Dashboard.tsx`

```typescript
const initialBalance = 10000;
const currentValue = stats.balance + (stats.totalBtcHeld * currentPrice);
const profitPercent = ((currentValue - initialBalance) / initialBalance) * 100;

// Wyswietlanie:
<p className={profitPercent >= 0 ? 'text-success' : 'text-destructive'}>
  {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
</p>
<p className="text-sm">{formatUSD(stats.totalProfit)}</p>
```

---

### Czesc 4: Auto-odswiezanie Wykresu

**Plik:** `src/pages/Dashboard.tsx`

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    queryClient.invalidateQueries({ queryKey: ['price-history'] });
    queryClient.invalidateQueries({ queryKey: ['current-price'] });
  }, 60000); // Co 60 sekund

  return () => clearInterval(interval);
}, [queryClient]);
```

---

### Czesc 5: Znaczniki BUY/SELL na Wykresie

**Plik:** `src/components/BollingerChart.tsx`

```typescript
interface BollingerChartProps {
  priceHistory: { price: number; timestamp: number }[];
  trades?: BotTrade[];  // Nowy prop
}

// Mapowanie transakcji na punkty:
const tradeMarkers = useMemo(() => {
  return (trades || []).map(trade => ({
    time: new Date(trade.created_at).getTime(),
    type: trade.type,
    price: Number(trade.price_usd),
  }));
}, [trades]);

// W chartData dodaj markery:
buyMarker: marker?.type === 'BUY' ? marker.price : null,
sellMarker: marker?.type === 'SELL' ? marker.price : null,

// Scatter dla znacznikow:
<Line dataKey="buyMarker" stroke="none" 
  dot={{ stroke: '#22c55e', fill: '#22c55e', r: 6 }} />
<Line dataKey="sellMarker" stroke="none" 
  dot={{ stroke: '#f97316', fill: '#f97316', r: 6 }} />
```

---

### Czesc 6: Rozszerzenie Bazy Danych - Szczegoly Transakcji

**Nowa migracja SQL:**

```sql
-- Dodaj kolumny do bot_trades dla szczegolow BB
ALTER TABLE public.bot_trades 
  ADD COLUMN IF NOT EXISTS bollinger_upper NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS bollinger_middle NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS bollinger_lower NUMERIC(18, 2),
  ADD COLUMN IF NOT EXISTS distance_ratio NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS multiplier NUMERIC(3, 2);

-- Nowa tabela dla wszystkich akcji (wlacznie z HOLD)
CREATE TABLE IF NOT EXISTS public.bot_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,  -- 'BUY', 'SELL', 'HOLD', 'NO_BTC_TO_SELL'
  reason TEXT,
  price_usd NUMERIC(18, 2),
  bollinger_upper NUMERIC(18, 2),
  bollinger_middle NUMERIC(18, 2),
  bollinger_lower NUMERIC(18, 2),
  distance_ratio NUMERIC(5, 4),
  multiplier NUMERIC(3, 2),
  volume_usd NUMERIC(18, 2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.bot_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own actions" ON public.bot_actions
  FOR ALL USING (auth.uid() = user_id);

-- Symbol dla wielu par
ALTER TABLE public.bot_config 
  ADD COLUMN IF NOT EXISTS symbol TEXT DEFAULT 'BTC-USDT';
```

---

### Czesc 7: Zapisywanie Szczegolow w Edge Function

**Plik:** `supabase/functions/run-bot-simulation/index.ts`

```typescript
// Przy kazdej akcji zapisuj do bot_actions:
await supabase.from("bot_actions").insert({
  user_id: userId,
  action: signal.action,
  reason: signal.reason,
  price_usd: currentPrice,
  bollinger_upper: bands.upper,
  bollinger_middle: bands.middle,
  bollinger_lower: bands.lower,
  distance_ratio: signal.distanceRatio,
  multiplier: signal.multiplier,
  volume_usd: signal.volumeUsd,
});

// Przy BUY/SELL dodaj szczegoly do bot_trades:
await supabase.from("bot_trades").insert({
  user_id: userId,
  type: signal.action,
  amount_btc: btcAmount,
  price_usd: currentPrice,
  volume_usd: signal.volumeUsd,
  bollinger_upper: bands.upper,
  bollinger_middle: bands.middle,
  bollinger_lower: bands.lower,
  distance_ratio: signal.distanceRatio,
  multiplier: signal.multiplier,
  // ... reszta pol
});
```

---

### Czesc 8: Dialog Szczegolow Transakcji

**Plik:** `src/components/TradeHistory.tsx`

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const [selectedTrade, setSelectedTrade] = useState<BotTrade | null>(null);

// Klikniecie otwiera dialog:
<div onClick={() => setSelectedTrade(trade)} className="cursor-pointer">
  {/* istniejacy wiersz */}
</div>

// Dialog z wyliczeniami:
<Dialog open={!!selectedTrade} onOpenChange={() => setSelectedTrade(null)}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>{selectedTrade?.type} - Szczegoly Wyliczen</DialogTitle>
    </DialogHeader>
    <div className="space-y-3 font-mono text-sm">
      <div className="grid grid-cols-2 gap-2">
        <span className="text-muted-foreground">Cena:</span>
        <span>${selectedTrade?.price_usd?.toLocaleString()}</span>
        
        <span className="text-muted-foreground">MA (SMA20):</span>
        <span>${selectedTrade?.bollinger_middle?.toLocaleString()}</span>
        
        <span className="text-muted-foreground">Gorna wstega:</span>
        <span>${selectedTrade?.bollinger_upper?.toLocaleString()}</span>
        
        <span className="text-muted-foreground">Dolna wstega:</span>
        <span>${selectedTrade?.bollinger_lower?.toLocaleString()}</span>
      </div>
      
      <hr className="border-border" />
      
      <div className="space-y-1">
        <p>Odleglosc od MA: <b>{((selectedTrade?.distance_ratio || 0) * 100).toFixed(1)}%</b></p>
        <p>Mnoznik: <b>{selectedTrade?.multiplier}x</b> (= 1 + {selectedTrade?.distance_ratio?.toFixed(2)})</p>
        <p>Wolumen: <b>${selectedTrade?.volume_usd}</b></p>
        <p className="text-xs text-muted-foreground">
          = Baza ${(selectedTrade?.volume_usd / selectedTrade?.multiplier).toFixed(2)} x {selectedTrade?.multiplier}
        </p>
      </div>
      
      {selectedTrade?.type === 'SELL' && selectedTrade?.profit_usd !== null && (
        <>
          <hr className="border-border" />
          <p className={Number(selectedTrade.profit_usd) >= 0 ? 'text-success' : 'text-destructive'}>
            Zysk: {Number(selectedTrade.profit_usd) >= 0 ? '+' : ''}${selectedTrade.profit_usd}
          </p>
        </>
      )}
    </div>
  </DialogContent>
</Dialog>
```

---

### Czesc 9: Pushover Notifications

**Plik:** `supabase/functions/run-bot-simulation/index.ts`

```typescript
// Na poczatku funkcji:
const pushoverToken = Deno.env.get("PUSHOVER_APP_TOKEN");
const pushoverUser = Deno.env.get("PUSHOVER_USER_KEY");

const sendPushover = async (title: string, message: string) => {
  if (!pushoverToken || !pushoverUser) {
    console.log("[Pushover] Secrets not configured");
    return;
  }
  
  try {
    const response = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: pushoverToken,
        user: pushoverUser,
        title: title,
        message: message,
        sound: "cashregister",
      }),
    });
    console.log("[Pushover] Response:", response.status);
  } catch (e) {
    console.error("[Pushover] Error:", e);
  }
};

// Po BUY:
await sendPushover(
  "BTC BUY",
  `Kupiono ${btcBought.toFixed(6)} BTC @ $${currentPrice.toLocaleString()}
Vol: $${signal.volumeUsd} (${signal.multiplier}x)
MA: $${bands.middle.toFixed(0)} | Ratio: ${(signal.distanceRatio * 100).toFixed(1)}%`
);

// Po SELL:
await sendPushover(
  profit > 0 ? `BTC SELL +$${profit.toFixed(2)}` : `BTC SELL -$${Math.abs(profit).toFixed(2)}`,
  `Sprzedano ${btcToSell.toFixed(6)} BTC @ $${currentPrice.toLocaleString()}
Zysk: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}
MA: $${bands.middle.toFixed(0)}`
);
```

---

### Czesc 10: Wiele Par Walutowych

**Plik:** `supabase/functions/sync-bingx-prices/index.ts`

```typescript
// Sync wszystkich symboli:
const symbols = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];

for (const symbol of symbols) {
  const klineUrl = `${BINGX_BASE_URL}/openApi/swap/v2/quote/klines?symbol=${symbol}&interval=1h&limit=50`;
  const response = await fetch(klineUrl);
  const data = await response.json();
  
  const klines = data.data.map((k: KlineData) => ({
    symbol: symbol,
    interval: "1h",
    candle_time: new Date(parseInt(k.time)).toISOString(),
    // ... reszta pol
  }));
  
  await supabase.from("price_history").upsert(klines, {
    onConflict: "symbol,interval,candle_time",
  });
}
```

**Plik:** `src/pages/Dashboard.tsx` - Select pary

```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<Select 
  value={botConfig?.symbol || 'BTC-USDT'}
  onValueChange={(value) => updateConfig.mutate({ symbol: value })}
>
  <SelectTrigger className="w-32">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="BTC-USDT">BTC/USDT</SelectItem>
    <SelectItem value="ETH-USDT">ETH/USDT</SelectItem>
    <SelectItem value="SOL-USDT">SOL/USDT</SelectItem>
  </SelectContent>
</Select>
```

---

### Czesc 11: Wyswietlanie HOLD w Historii

**Nowy hook:** `useBotActions` w `src/hooks/useBotData.ts`

```typescript
export const useBotActions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['bot-actions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('bot_actions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
};
```

**TradeHistory - pokazywanie HOLD:**

```typescript
// Laczone trades + actions, posortowane po dacie
const allActions = [...trades, ...holdActions].sort(
  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
);

// Dla HOLD:
<div className="bg-muted/30 p-3 rounded-lg">
  <span className="text-muted-foreground">HOLD</span>
  <p className="text-xs">{action.reason}</p>
</div>
```

---

### Struktura Zmian

| Plik | Zmiana |
|------|--------|
| `supabase/migrations/xxx.sql` | Nowe kolumny + tabela bot_actions |
| `supabase/functions/run-bot-simulation/index.ts` | Wzor 1+ratio, szczegoly, Pushover |
| `supabase/functions/sync-bingx-prices/index.ts` | Wiele symboli |
| `src/lib/bollinger.ts` | Wzor 1+ratio |
| `src/pages/Dashboard.tsx` | Win Rate, %, auto-refresh, select pary |
| `src/components/BollingerChart.tsx` | Znaczniki BUY/SELL |
| `src/components/TradeHistory.tsx` | Dialog szczegolow, HOLD |
| `src/hooks/useBotData.ts` | Nowe pola, useBotActions |
| `src/integrations/supabase/types.ts` | Nowe kolumny |

---

### Weryfikacja Nowego Wzoru

Dla base = $2, cena $69,471, MA $69,280, gorna wstega $71,178:

```text
Odleglosc: 69,471 - 69,280 = $191
Szerokosc: 71,178 - 69,280 = $1,898
Ratio: 191 / 1,898 = 0.1006 (10.06%)

NOWY WZOR:
multiplier = 1 + 0.1006 = 1.1006
volume = 2 * 1.1006 = $2.20 USD

STARY WZOR (bledny):
multiplier = 1.1 + 0.9 * 0.1006 = 1.19
volume = 2 * 1.19 = $2.38 USD
```

