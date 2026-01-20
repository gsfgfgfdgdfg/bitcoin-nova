import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import NewsCard from '@/components/NewsCard';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

const mockNews = [
  {
    id: '1',
    title: 'Bitcoin Surges Past $105,000 as Institutional Demand Reaches All-Time High',
    excerpt: 'Major financial institutions continue to accumulate Bitcoin, with BlackRock\'s ETF seeing record inflows. Market analysts predict further upside as supply shock intensifies.',
    source: 'Bitcoin Magazine',
    date: '2 hours ago',
    category: 'price',
    imageUrl: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800',
    url: '#',
  },
  {
    id: '2',
    title: 'El Salvador Expands Bitcoin Reserves with $150 Million Purchase',
    excerpt: 'President Bukele announces another major Bitcoin acquisition, bringing the country\'s total holdings to over 6,000 BTC. The move strengthens El Salvador\'s position as a Bitcoin nation.',
    source: 'CoinDesk',
    date: '4 hours ago',
    category: 'adoption',
    imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800',
    url: '#',
  },
  {
    id: '3',
    title: 'Lightning Network Capacity Exceeds 10,000 BTC Milestone',
    excerpt: 'The Bitcoin Lightning Network reaches a historic milestone, demonstrating growing adoption of layer-2 scaling solutions for faster and cheaper transactions.',
    source: 'The Block',
    date: '5 hours ago',
    category: 'tech',
    imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800',
    url: '#',
  },
  {
    id: '4',
    title: 'MicroStrategy Adds Another 5,000 BTC to Treasury',
    excerpt: 'Michael Saylor\'s company continues its aggressive Bitcoin acquisition strategy, now holding over 500,000 BTC in total. The company\'s stock surges on the news.',
    source: 'Bitcoin Magazine Pro',
    date: '6 hours ago',
    category: 'latest',
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
    url: '#',
  },
  {
    id: '5',
    title: 'SEC Approves Five New Bitcoin ETF Applications',
    excerpt: 'Regulatory clarity continues to improve as the SEC greenlights additional spot Bitcoin ETF products. Combined AUM expected to exceed $100 billion by year-end.',
    source: 'CoinDesk',
    date: '8 hours ago',
    category: 'adoption',
    url: '#',
  },
  {
    id: '6',
    title: 'Bitcoin Mining Difficulty Reaches New All-Time High',
    excerpt: 'The network hashrate continues to climb, making Bitcoin more secure than ever. New-generation ASIC miners drive efficiency improvements across the industry.',
    source: 'The Block',
    date: '10 hours ago',
    category: 'tech',
    imageUrl: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?w=800',
    url: '#',
  },
  {
    id: '7',
    title: 'Japan Officially Classifies Bitcoin as Legal Property',
    excerpt: 'The Japanese government strengthens Bitcoin\'s legal status, paving the way for increased institutional adoption in Asia\'s largest economy.',
    source: 'Bitcoin Magazine',
    date: '12 hours ago',
    category: 'adoption',
    url: '#',
  },
  {
    id: '8',
    title: 'Taproot Adoption Reaches 50% of Network Transactions',
    excerpt: 'The Bitcoin upgrade continues to gain traction, enabling more efficient smart contracts and enhanced privacy features across the network.',
    source: 'The Block',
    date: '14 hours ago',
    category: 'tech',
    url: '#',
  },
  {
    id: '9',
    title: 'Bitcoin Dominance Climbs to 62% Amid Market Rotation',
    excerpt: 'Investors continue to favor Bitcoin over alternative cryptocurrencies, with dominance reaching levels not seen since early 2021.',
    source: 'CoinDesk',
    date: '16 hours ago',
    category: 'price',
    imageUrl: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800',
    url: '#',
  },
  {
    id: '10',
    title: 'Swan Bitcoin Launches New Automated Savings Plan',
    excerpt: 'The popular Bitcoin-only platform introduces enhanced DCA features with lower fees and automatic withdrawals to cold storage.',
    source: 'Swan Bitcoin',
    date: '18 hours ago',
    category: 'latest',
    url: '#',
  },
  {
    id: '11',
    title: 'Central Banks Acknowledge Bitcoin as Reserve Asset',
    excerpt: 'Multiple central banks reportedly considering Bitcoin for diversification of foreign reserves, marking a significant shift in monetary policy thinking.',
    source: 'Bitcoin Magazine Pro',
    date: '20 hours ago',
    category: 'adoption',
    url: '#',
  },
  {
    id: '12',
    title: 'Nostr Protocol Integration Expands Bitcoin Use Cases',
    excerpt: 'The decentralized social protocol built on Bitcoin continues to grow, with major wallet providers adding native Nostr support.',
    source: 'The Block',
    date: '22 hours ago',
    category: 'tech',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
    url: '#',
  },
];

const News = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState('latest');
  const [visibleCount, setVisibleCount] = useState(9);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filters = [
    { id: 'latest', label: t.news.latest },
    { id: 'price', label: t.news.priceMarket },
    { id: 'adoption', label: t.news.adoption },
    { id: 'tech', label: t.news.tech },
  ];

  const filteredNews = filter === 'latest' 
    ? mockNews 
    : mockNews.filter(n => n.category === filter);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Header */}
      <section className="relative py-16 overflow-hidden scanlines">
        <div className="absolute inset-0 bg-gradient-radial from-bitcoin-orange/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-20" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <h1 className="font-display text-4xl md:text-6xl font-black mb-4 glitch neon-text" data-text={t.news.title}>
              {t.news.title}
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
              {t.news.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {filters.map(({ id, label }) => (
              <Button
                key={id}
                onClick={() => setFilter(id)}
                variant={filter === id ? 'default' : 'outline'}
                className={filter === id 
                  ? 'bg-bitcoin-orange hover:bg-bitcoin-orange/90 text-background font-semibold' 
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-bitcoin-orange/50'
                }
              >
                {label}
              </Button>
            ))}
          </div>
          
          <Button
            onClick={handleRefresh}
            variant="ghost"
            className="text-muted-foreground hover:text-bitcoin-orange"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </section>

      {/* News Grid */}
      <section className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.slice(0, visibleCount).map((news, index) => (
            <NewsCard key={news.id} {...news} index={index} />
          ))}
        </div>

        {/* Load More */}
        {visibleCount < filteredNews.length && (
          <div className="text-center mt-12">
            <Button
              onClick={() => setVisibleCount(prev => prev + 6)}
              className="bg-gradient-to-r from-bitcoin-orange to-bitcoin-gold text-background font-semibold px-8 py-6 text-lg hover:shadow-[0_0_30px_hsl(var(--bitcoin-orange)/0.4)] transition-shadow"
            >
              {t.news.loadMore}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};

export default News;
