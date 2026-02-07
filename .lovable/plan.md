

## Plan: Naprawa Wykresu + Przycisk Test + Powiadomienia

---

### Diagnoza (Wszystko Poprawne!)

| Element | Status | Dowód |
|---------|--------|-------|
| **pg_cron** | ✅ AKTYWNY | 2 harmonogramy w `cron.job` |
| **Sync cen** | ✅ CO 5 MIN | `*/5 * * * *` |
| **Bot simulation** | ✅ CO GODZINĘ | `2 * * * *` (o :02) |
| **Ostatnia transakcja** | ✅ DZIŚ 12:02 | BUY $3.37 @ $68,188.60 |
| **Dane w bazie** | ✅ AKTUALNE | Cena ~68k USD z 7 lutego |
| **Logika wolumenu** | ✅ POPRAWNA | 1.1x - 2.0x bazowej kwoty |

**Bot DZIAŁA automatycznie!** Dziś o 12:02 wykonał transakcję BUY.

---

### Problem 1: Wykres Pokazuje Tylko Godziny (Bez Dat)

**Lokalizacja:** `src/components/BollingerChart.tsx` linia 14 i 27

**Obecny kod:**
```typescript
time: new Date(point.timestamp).toLocaleTimeString()  // "12:00:00"
```

**Nowy kod:**
```typescript
time: new Date(point.timestamp).toLocaleDateString('pl-PL', { 
  day: '2-digit', 
  month: '2-digit', 
  hour: '2-digit', 
  minute: '2-digit' 
})  // "07.02 12:00"
```

---

### Problem 2: Wykres Może Pokazywać Stare Dane (Cache)

**Przyczyna:** React Query może trzymać stare dane w cache

**Rozwiązanie:** Dodać force refresh przy każdym wejściu na Dashboard

```typescript
// W Dashboard.tsx
useEffect(() => {
  queryClient.invalidateQueries({ queryKey: ['price-history'] });
  refetchPrices();
}, []);
```

---

### Część 1: Nowy Format Daty na Wykresie

**Plik:** `src/components/BollingerChart.tsx`

Zmiana formatu z `toLocaleTimeString()` na pełną datę z godziną:

```typescript
const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Użycie:
time: formatDateTime(point.timestamp)
// Wynik: "07.02 12:00"
```

Dodatkowo zmniejszyć interwał ticków na osi X, bo 168 świec to dużo:
```typescript
<XAxis 
  dataKey="time" 
  tick={{ fontSize: 9 }}
  interval={23}  // Pokazuj co 24 godziny (raz dziennie)
/>
```

---

### Część 2: Przycisk "Test Bot" w Dashboard

**Plik:** `src/pages/Dashboard.tsx`

Dodanie przycisku do ręcznego uruchomienia bota (dla testów):

```typescript
const [isTestingBot, setIsTestingBot] = useState(false);
const [lastTestResult, setLastTestResult] = useState<string | null>(null);

const handleTestBot = async () => {
  setIsTestingBot(true);
  try {
    const { data, error } = await supabase.functions.invoke('run-bot-simulation');
    if (error) throw error;
    
    const result = data.results?.[0];
    const action = result?.action || 'NO_ACTION';
    setLastTestResult(`${action} @ ${new Date().toLocaleTimeString()}`);
    
    // Odśwież dane
    queryClient.invalidateQueries({ queryKey: ['bot-trades'] });
    queryClient.invalidateQueries({ queryKey: ['bot-config'] });
    queryClient.invalidateQueries({ queryKey: ['price-history'] });
    
    // Toast notification
    toast({
      title: `Bot: ${action}`,
      description: result?.details ? JSON.stringify(result.details) : 'Test completed',
    });
  } catch (error) {
    toast({
      title: 'Błąd testu bota',
      description: error.message,
      variant: 'destructive',
    });
  } finally {
    setIsTestingBot(false);
  }
};
```

**UI:**
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={handleTestBot}
  disabled={isTestingBot}
>
  {isTestingBot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
  Test Bot
</Button>
```

---

### Część 3: Status Ostatniego Uruchomienia

Wyświetlanie kiedy bot ostatnio handlował:

```typescript
// W karcie Bot Status
<p className="text-xs text-muted-foreground mt-2">
  {botConfig?.last_trade_hour ? (
    <>Ostatnia akcja: {formatDistanceToNow(new Date(botConfig.last_trade_hour), { addSuffix: true, locale: pl })}</>
  ) : (
    'Brak transakcji'
  )}
</p>
```

---

### Część 4: Powiadomienia Toast

Dodanie `useToast` do Dashboard i wyświetlanie powiadomień:

```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

// Przy teście bota
toast({
  title: 'Bot wykonał akcję',
  description: `${action}: ${volume} USD @ $${price}`,
});

// Przy błędzie
toast({
  title: 'Błąd',
  description: error.message,
  variant: 'destructive',
});
```

---

### Część 5: Force Refresh Wykresu

Wymuszenie odświeżenia danych przy każdym wejściu na Dashboard:

```typescript
// W Dashboard.tsx
useEffect(() => {
  const forceRefresh = async () => {
    // Najpierw sync ceny z BingX
    await supabase.functions.invoke('sync-bingx-prices');
    // Potem odśwież cache React Query
    queryClient.invalidateQueries({ queryKey: ['price-history'] });
  };
  forceRefresh();
}, []);
```

---

### Struktura Zmian

| Plik | Akcja | Opis |
|------|-------|------|
| `src/components/BollingerChart.tsx` | EDYCJA | Format daty DD.MM HH:MM |
| `src/pages/Dashboard.tsx` | EDYCJA | Przycisk Test Bot + status + toast + force refresh |

---

### Weryfikacja Edge Function (OK!)

Edge function `run-bot-simulation` wykonuje tylko:
- **GET** z tabeli `price_history` (pobiera ceny)
- **GET** z tabeli `bot_config` (konfiguracja bota)
- **INSERT** do `bot_trades` (zapisuje transakcję wirtualną)
- **UPDATE** `bot_config` (aktualizuje saldo)

**NIE wykonuje żadnych żądań do giełdy** - wszystko jest symulacją w bazie danych.

---

### Sekcja Techniczna

**Dlaczego wykres może pokazywać 82k zamiast 68k:**
1. Cache przeglądarki trzyma stare dane
2. React Query ma `staleTime: 30000` - dane uważane za świeże przez 30s
3. Rozwiązanie: force `invalidateQueries` przy wejściu na Dashboard

**Format daty na wykresie:**
```text
Przed: "12:00:00" (tylko godzina)
Po:    "07.02 12:00" (data i godzina)
```

**Interwał ticków na osi X:**
- 168 świec / 24 = 7 ticków (jeden na dzień)
- `interval={23}` w komponencie XAxis

