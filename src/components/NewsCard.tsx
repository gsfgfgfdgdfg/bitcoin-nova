import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';

interface NewsCardProps {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  date: string;
  category: string;
  imageUrl?: string;
  index: number;
}

const NewsCard = ({ id, title, excerpt, source, date, category, imageUrl, index }: NewsCardProps) => {
  const { t } = useLanguage();

  const categoryColors: Record<string, string> = {
    latest: 'bg-bitcoin-orange/10 text-bitcoin-orange border-bitcoin-orange/20',
    price: 'bg-success/10 text-success border-success/20',
    adoption: 'bg-warning/10 text-warning border-warning/20',
    tech: 'bg-primary/10 text-primary border-primary/20',
  };

  const formattedDate = (() => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return date;
    }
  })();

  return (
    <Link to={`/news/${id}`}>
      <article
        className="cyber-card rounded-xl overflow-hidden group animate-fade-in-up cursor-pointer"
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
          <div className="absolute top-3 left-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${categoryColors[category] || categoryColors.latest}`}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-display font-semibold text-lg text-foreground mb-2 line-clamp-2 group-hover:text-bitcoin-orange transition-colors">
            {title}
          </h3>
          
          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
            {excerpt}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-bitcoin-orange">{source}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formattedDate}
              </span>
            </div>
            
            <span className="text-bitcoin-orange font-medium group-hover:underline">
              {t.news.readMore} →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
};

export default NewsCard;
