import { useState } from 'react';
import { TrendingUp, Music, Shirt, Crown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';

const products = {
  trading: [
    { id: '1', title: 'Premium Weekly Bitcoin Analysis', description: 'Comprehensive technical analysis with entry/exit points, support/resistance levels, and market outlook.', priceUsd: 49, priceBtc: '0.00047', imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800' },
    { id: '2', title: 'Monthly Trading Signals Pack', description: '30 days of professional trading signals with 85%+ accuracy. Includes stop-loss and take-profit levels.', priceUsd: 149, priceBtc: '0.00143', imageUrl: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800' },
    { id: '3', title: 'Bitcoin Cycle Analysis Report', description: 'Deep dive into market cycles, on-chain metrics, and long-term price projections.', priceUsd: 79, priceBtc: '0.00076' },
    { id: '4', title: 'TradingView Strategy Bundle', description: 'Custom indicators and automated strategies for TradingView. Pine Script included.', priceUsd: 199, priceBtc: '0.00191' },
  ],
  music: [
    { id: '5', title: 'Bitcoin Anthem - HD Download', description: 'High-quality MP3 download of the viral Bitcoin anthem. Support the artist!', priceUsd: 4.99, priceBtc: '0.000048', imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800' },
    { id: '6', title: 'Stack Sats Album - Full Collection', description: 'Complete album with 12 Bitcoin-themed tracks. FLAC and MP3 formats.', priceUsd: 19.99, priceBtc: '0.00019' },
    { id: '7', title: 'Bitcoin Beats - NFT Edition', description: 'Limited edition NFT with exclusive remix and artwork. Only 21 available.', priceUsd: 99, priceBtc: '0.00095' },
    { id: '8', title: 'HODL Forever - Music Video NFT', description: 'Own a piece of Bitcoin music history. Exclusive music video NFT.', priceUsd: 149, priceBtc: '0.00143' },
  ],
  merch: [
    { id: '9', title: 'Bitcoin Logo T-Shirt (Orange)', description: 'Premium cotton t-shirt with embroidered Bitcoin logo. Multiple sizes available.', priceUsd: 29, priceBtc: '0.00028', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800' },
    { id: '10', title: 'HODL Hoodie - Black Edition', description: 'Comfortable hoodie with "HODL" embroidered in orange. Perfect for cold storage enthusiasts.', priceUsd: 69, priceBtc: '0.00066' },
    { id: '11', title: 'Laser-Engraved Metal BTC Card', description: 'Premium metal card with your Bitcoin address QR code. Perfect for receiving payments.', priceUsd: 49, priceBtc: '0.00047' },
    { id: '12', title: '"Stack Sats" Ceramic Mug', description: 'Start your day with motivation. 12oz ceramic mug with Bitcoin orange accent.', priceUsd: 19, priceBtc: '0.00018' },
    { id: '13', title: 'Hardware Wallet Leather Case', description: 'Premium leather case for Ledger/Trezor. Protect your keys in style.', priceUsd: 39, priceBtc: '0.00037' },
    { id: '14', title: '21 Million Cap', description: 'Snapback cap with "21 Million" embroidered. Limited edition.', priceUsd: 35, priceBtc: '0.00034' },
  ],
  premium: [
    { id: '15', title: 'Premium Monthly Membership', description: 'Access to exclusive TA, private community, ad-free experience, and early news alerts.', priceUsd: 29, priceBtc: '0.00028', imageUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800' },
    { id: '16', title: 'Premium Annual Membership', description: 'Full year of premium access at 40% discount. Best value for serious Bitcoiners.', priceUsd: 199, priceBtc: '0.00191' },
    { id: '17', title: 'Lifetime VIP Access', description: 'One-time payment for lifetime access. All future features included. Only 100 spots.', priceUsd: 999, priceBtc: '0.0096' },
  ],
};

const Shop = () => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<'trading' | 'music' | 'merch' | 'premium'>('trading');

  const categories = [
    { id: 'trading', label: t.shop.trading, icon: TrendingUp },
    { id: 'music', label: t.shop.music, icon: Music },
    { id: 'merch', label: t.shop.merch, icon: Shirt },
    { id: 'premium', label: t.shop.premium, icon: Crown },
  ] as const;

  return (
    <div className="min-h-screen pb-24">
      {/* Hero */}
      <section className="relative py-16 overflow-hidden scanlines">
        <div className="absolute inset-0 bg-gradient-radial from-bitcoin-orange/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-20" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <h1 className="font-display text-4xl md:text-6xl font-black mb-4 glitch neon-text" data-text={t.shop.title}>
              {t.shop.title}
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
              {t.shop.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              onClick={() => setActiveCategory(id)}
              variant={activeCategory === id ? 'default' : 'outline'}
              className={`h-auto py-4 flex flex-col items-center gap-2 ${
                activeCategory === id
                  ? 'bg-gradient-to-r from-bitcoin-orange to-bitcoin-gold text-background'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-bitcoin-orange/50'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="font-semibold">{label}</span>
            </Button>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products[activeCategory].map((product, index) => (
            <ProductCard
              key={product.id}
              title={product.title}
              description={product.description}
              priceUsd={product.priceUsd}
              priceBtc={product.priceBtc}
              imageUrl={product.imageUrl}
              category={activeCategory}
              index={index}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Shop;
