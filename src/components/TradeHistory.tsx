import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Clock, Pause, Info } from 'lucide-react';
import { BotTrade, BotAction } from '@/hooks/useBotData';
import { formatUSD, formatBTC } from '@/lib/bollinger';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TradeHistoryProps {
  trades: BotTrade[];
  actions?: BotAction[];
  isLoading?: boolean;
}

type CombinedAction = (BotTrade & { actionType: 'trade' }) | (BotAction & { actionType: 'action' });

const TradeHistory = ({ trades, actions = [], isLoading }: TradeHistoryProps) => {
  const [selectedItem, setSelectedItem] = useState<CombinedAction | null>(null);

  // Combine trades and actions, sorted by date
  const allItems = useMemo(() => {
    const tradeItems: CombinedAction[] = trades.map(t => ({ ...t, actionType: 'trade' as const }));
    const actionItems: CombinedAction[] = actions
      .filter(a => a.action === 'HOLD' || a.action === 'NO_BTC_TO_SELL' || a.action === 'INSUFFICIENT_BALANCE')
      .map(a => ({ ...a, actionType: 'action' as const }));
    
    return [...tradeItems, ...actionItems]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);
  }, [trades, actions]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-24 mb-2" />
                <div className="h-3 bg-muted rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No trades yet</p>
        <p className="text-sm">Start the bot to begin simulated trading</p>
      </div>
    );
  }

  const renderTradeItem = (item: CombinedAction) => {
    if (item.actionType === 'action') {
      // HOLD or special action
      const action = item as BotAction & { actionType: 'action' };
      return (
        <div
          key={action.id}
          onClick={() => setSelectedItem(item)}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted">
              <Pause className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm text-muted-foreground">
                {action.action === 'HOLD' ? 'HOLD' : 
                 action.action === 'NO_BTC_TO_SELL' ? 'BRAK BTC' :
                 action.action === 'INSUFFICIENT_BALANCE' ? 'BRAK ŚRODKÓW' : action.action}
              </p>
              <p className="text-muted-foreground text-xs truncate max-w-[150px]">
                {action.reason}
              </p>
            </div>
          </div>
          <div className="text-right flex items-center gap-2">
            <p className="text-muted-foreground text-xs">
              {formatDistanceToNow(new Date(action.created_at), { addSuffix: true, locale: pl })}
            </p>
            <Info className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
      );
    }

    // Trade (BUY/SELL)
    const trade = item as BotTrade & { actionType: 'trade' };
    return (
      <div
        key={trade.id}
        onClick={() => setSelectedItem(item)}
        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 cursor-pointer hover:bg-secondary/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              trade.type === 'BUY' ? 'bg-success/20' : 'bg-bitcoin-orange/20'
            }`}
          >
            {trade.type === 'BUY' ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : (
              <TrendingDown className="w-4 h-4 text-bitcoin-orange" />
            )}
          </div>
          <div>
            <p
              className={`font-semibold text-sm ${
                trade.type === 'BUY' ? 'text-success' : 'text-bitcoin-orange'
              }`}
            >
              {trade.type} {formatBTC(Number(trade.amount_btc))}
            </p>
            <p className="text-muted-foreground text-xs">
              @ {formatUSD(Number(trade.price_usd))}
            </p>
          </div>
        </div>
        <div className="text-right flex items-center gap-2">
          <div>
            {trade.profit_usd !== null && trade.type === 'SELL' && (
              <p
                className={`text-sm font-semibold ${
                  Number(trade.profit_usd) >= 0 ? 'text-success' : 'text-destructive'
                }`}
              >
                {Number(trade.profit_usd) >= 0 ? '+' : ''}
                {formatUSD(Number(trade.profit_usd))}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              {formatDistanceToNow(new Date(trade.created_at), { addSuffix: true, locale: pl })}
            </p>
            {trade.status !== 'closed' && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                trade.status === 'open' 
                  ? 'bg-warning/20 text-warning' 
                  : 'bg-destructive/20 text-destructive'
              }`}>
                {trade.status}
              </span>
            )}
          </div>
          <Info className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {allItems.map(renderTradeItem)}
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          {/* NEW: Safer title with fallback */}
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.actionType === 'trade'
                ? `${(selectedItem as BotTrade)?.type ?? ''} - Szczegóły Wyliczenia`
                : selectedItem?.actionType === 'action'
                  ? `${(selectedItem as BotAction)?.action ?? ''} - Szczegóły`
                  : 'Szczegóły'}
            </DialogTitle>
          </DialogHeader>
          
          {/* NEW: Guard entire content against null */}
          {selectedItem && (
            <div className="space-y-4">
              {/* Price data */}
              <div className="grid grid-cols-2 gap-3 font-mono text-sm">
                <div className="space-y-2">
                  <div>
                    <span className="text-muted-foreground text-xs block">Cena</span>
                    <span className="font-semibold">
                      ${selectedItem.actionType === 'trade' 
                        ? Number((selectedItem as BotTrade).price_usd).toLocaleString()
                        : Number((selectedItem as BotAction).price_usd).toLocaleString()
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs block">MA (SMA20)</span>
                    <span className="text-bitcoin-orange">
                      ${selectedItem.actionType === 'trade'
                        ? Number((selectedItem as BotTrade).bollinger_middle || 0).toLocaleString()
                        : Number((selectedItem as BotAction).bollinger_middle || 0).toLocaleString()
                      }
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-muted-foreground text-xs block">Górna wstęga</span>
                    <span>
                      ${selectedItem.actionType === 'trade'
                        ? Number((selectedItem as BotTrade).bollinger_upper || 0).toLocaleString()
                        : Number((selectedItem as BotAction).bollinger_upper || 0).toLocaleString()
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs block">Dolna wstęga</span>
                    <span>
                      ${selectedItem.actionType === 'trade'
                        ? Number((selectedItem as BotTrade).bollinger_lower || 0).toLocaleString()
                        : Number((selectedItem as BotAction).bollinger_lower || 0).toLocaleString()
                      }
                    </span>
                  </div>
                </div>
              </div>

              <hr className="border-border" />

              {/* Calculations */}
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Odległość od MA:</span>
                  <span className="font-semibold">
                    {((selectedItem.actionType === 'trade'
                      ? Number((selectedItem as BotTrade).distance_ratio || 0)
                      : Number((selectedItem as BotAction).distance_ratio || 0)
                    ) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mnożnik:</span>
                  <span className="font-semibold">
                    {selectedItem.actionType === 'trade'
                      ? (selectedItem as BotTrade).multiplier
                      : (selectedItem as BotAction).multiplier
                    }x
                  </span>
                </div>
                {selectedItem.actionType === 'trade' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Wolumen:</span>
                      <span className="font-semibold">
                        ${Number((selectedItem as BotTrade).volume_usd || 0).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      = Baza ${(Number((selectedItem as BotTrade).volume_usd || 0) / Number((selectedItem as BotTrade).multiplier || 1)).toFixed(2)} × {(selectedItem as BotTrade).multiplier}
                    </p>
                  </>
                )}
              </div>

              {/* Profit for SELL trades */}
              {selectedItem.actionType === 'trade' && (selectedItem as BotTrade).type === 'SELL' && (selectedItem as BotTrade).profit_usd !== null && (
                <>
                  <hr className="border-border" />
                  <div className={`text-center font-display text-xl font-bold ${
                    Number((selectedItem as BotTrade).profit_usd) >= 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {Number((selectedItem as BotTrade).profit_usd) >= 0 ? '+' : ''}
                    ${Number((selectedItem as BotTrade).profit_usd).toFixed(2)}
                  </div>
                </>
              )}

              {/* Reason for actions */}
              {selectedItem.actionType === 'action' && (
                <>
                  <hr className="border-border" />
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <span className="text-muted-foreground text-xs block mb-1">Powód:</span>
                    <span className="text-sm">{(selectedItem as BotAction).reason}</span>
                  </div>
                </>
              )}

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground text-center">
                {new Date(selectedItem.created_at).toLocaleString('pl-PL')}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TradeHistory;