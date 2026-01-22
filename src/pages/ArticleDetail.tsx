import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useArticle } from '@/hooks/useArticles';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const ArticleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { data: article, isLoading, error } = useArticle(id || '');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-bitcoin-orange" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Article not found</h1>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to News
          </Button>
        </Link>
      </div>
    );
  }

  const categoryColors: Record<string, string> = {
    latest: 'bg-bitcoin-orange/10 text-bitcoin-orange border-bitcoin-orange/20',
    price: 'bg-success/10 text-success border-success/20',
    adoption: 'bg-warning/10 text-warning border-warning/20',
    tech: 'bg-primary/10 text-primary border-primary/20',
  };

  // Simple markdown renderer for basic formatting
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith('## ')) {
        return (
          <h2 key={index} className="text-2xl font-display font-bold text-foreground mt-8 mb-4">
            {line.replace('## ', '')}
          </h2>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h1 key={index} className="text-3xl font-display font-bold text-foreground mt-6 mb-4">
            {line.replace('# ', '')}
          </h1>
        );
      }
      // List items
      if (line.startsWith('- ')) {
        return (
          <li key={index} className="text-muted-foreground ml-4 mb-2">
            {line.replace('- ', '')}
          </li>
        );
      }
      // Numbered lists
      if (/^\d+\.\s/.test(line)) {
        return (
          <li key={index} className="text-muted-foreground ml-4 mb-2 list-decimal">
            {line.replace(/^\d+\.\s/, '')}
          </li>
        );
      }
      // Bold text
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={index} className="text-muted-foreground mb-4">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="text-foreground">{part}</strong> : part
            )}
          </p>
        );
      }
      // Empty lines
      if (line.trim() === '') {
        return <br key={index} />;
      }
      // Regular paragraphs
      return (
        <p key={index} className="text-muted-foreground mb-4 leading-relaxed">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Image */}
      <div className="relative h-64 md:h-96 overflow-hidden">
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-bitcoin-orange/20 to-bitcoin-gold/20 flex items-center justify-center">
            <span className="text-9xl opacity-20 text-bitcoin-orange">₿</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Link to="/">
            <Button variant="secondary" size="sm" className="bg-background/80 backdrop-blur-sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.news.title}
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <article className="container mx-auto px-4 -mt-32 relative z-10">
        <div className="max-w-3xl mx-auto">
          {/* Category Badge */}
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border mb-4 ${categoryColors[article.category] || categoryColors.latest}`}>
            {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
          </span>

          {/* Title */}
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
            {article.title}
          </h1>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b border-border">
            <span className="font-semibold text-bitcoin-orange">{article.source}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(new Date(article.published_at), 'MMM d, yyyy • h:mm a')}
            </span>
            {article.external_url && (
              <a
                href={article.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-bitcoin-orange hover:underline"
              >
                Original Source
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Excerpt */}
          <p className="text-lg text-foreground/80 mb-8 font-medium leading-relaxed">
            {article.excerpt}
          </p>

          {/* Article Content */}
          <div className="prose prose-lg max-w-none">
            {renderContent(article.content)}
          </div>

          {/* Bottom Navigation */}
          <div className="mt-12 pt-8 border-t border-border">
            <Link to="/">
              <Button variant="outline" className="border-bitcoin-orange/50 text-bitcoin-orange hover:bg-bitcoin-orange/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to All News
              </Button>
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
};

export default ArticleDetail;
