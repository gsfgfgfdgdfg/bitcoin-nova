import { Bitcoin, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProductCardProps {
  title: string;
  description: string;
  priceUsd: number;
  priceBtc: string;
  imageUrl?: string;
  category: string;
  index: number;
}

const ProductCard = ({ title, description, priceUsd, priceBtc, imageUrl, category, index }: ProductCardProps) => {
  const { t } = useLanguage();

  return (
    <div
      className="cyber-card rounded-xl overflow-hidden group animate-fade-in-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-secondary to-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl opacity-10 text-bitcoin-orange">₿</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        
        {/* Category Badge */}
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-bitcoin-orange/10 text-bitcoin-orange border border-bitcoin-orange/20">
            {category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-display font-semibold text-lg text-foreground mb-2 group-hover:text-bitcoin-orange transition-colors">
          {title}
        </h3>
        
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {description}
        </p>

        {/* Prices */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1 text-foreground font-semibold">
            <span>${priceUsd}</span>
          </div>
          <div className="flex items-center gap-1 text-bitcoin-orange font-mono text-sm">
            <Bitcoin className="w-4 h-4" />
            <span>{priceBtc}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button className="flex-1 bg-gradient-to-r from-bitcoin-orange to-bitcoin-gold text-white font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all">
            <Bitcoin className="w-4 h-4 mr-2" />
            {t.shop.buyBtc}
          </Button>
          <Button variant="outline" className="border-border text-muted-foreground hover:text-foreground hover:border-bitcoin-orange/30 hover:bg-bitcoin-orange/5">
            <CreditCard className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;