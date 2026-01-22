import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useArticles } from '@/hooks/useArticles';
import NewsCard from '@/components/NewsCard';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';

const News = () => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState('latest');
  const [visibleCount, setVisibleCount] = useState(9);
  
  const { data: articles, isLoading, refetch, isRefetching } = useArticles(filter);

  const filters = [
    { id: 'latest', label: t.news.latest },
    { id: 'price', label: t.news.priceMarket },
    { id: 'adoption', label: t.news.adoption },
    { id: 'tech', label: t.news.tech },
  ];

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Header */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-bitcoin-orange/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">
              <span className="text-gradient">{t.news.title}</span>
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
                onClick={() => { setFilter(id); setVisibleCount(9); }}
                variant={filter === id ? 'default' : 'outline'}
                className={filter === id 
                  ? 'bg-gradient-to-r from-bitcoin-orange to-bitcoin-gold text-white font-semibold shadow-md' 
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-bitcoin-orange/30 hover:bg-bitcoin-orange/5'
                }
              >
                {label}
              </Button>
            ))}
          </div>
          
          <Button
            onClick={handleRefresh}
            variant="ghost"
            className="text-muted-foreground hover:text-bitcoin-orange hover:bg-bitcoin-orange/10"
            disabled={isRefetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </section>

      {/* News Grid */}
      <section className="container mx-auto px-4 pb-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-bitcoin-orange" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles?.slice(0, visibleCount).map((article, index) => (
                <NewsCard
                  key={article.id}
                  id={article.id}
                  title={article.title}
                  excerpt={article.excerpt}
                  source={article.source}
                  date={article.published_at}
                  category={article.category}
                  imageUrl={article.image_url || undefined}
                  index={index}
                />
              ))}
            </div>

            {/* Load More */}
            {articles && visibleCount < articles.length && (
              <div className="text-center mt-12">
                <Button
                  onClick={() => setVisibleCount(prev => prev + 6)}
                  className="bg-gradient-to-r from-bitcoin-orange to-bitcoin-gold text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  {t.news.loadMore}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default News;
