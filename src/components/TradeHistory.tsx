import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { BotTrade } from '@/hooks/useBotData';
import { formatUSD, formatBTC } from '@/lib/bollinger';
import { formatDistanceToNow } from 'date-fns';

interface TradeHistoryProps {
  trades: BotTrade[];
  isLoading?: boolean;
}

const TradeHistory = ({ trades, isLoading }: TradeHistoryProps) => {
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

  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No trades yet</p>
        <p className="text-sm">Start the bot to begin simulated trading</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
      {trades.map((trade) => (
        <div
          key={trade.id}
          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
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
          <div className="text-right">
            {trade.profit_usd !== null && (
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
              {formatDistanceToNow(new Date(trade.created_at), { addSuffix: true })}
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
        </div>
      ))}
    </div>
  );
};

export default TradeHistory;
