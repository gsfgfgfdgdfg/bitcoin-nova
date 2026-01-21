import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Newspaper, Music, ShoppingBag, User, Menu, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import BitcoinLogo from '@/components/BitcoinLogo';

const Navigation = () => {
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: t.nav.news, icon: Newspaper },
    { path: '/music', label: t.nav.music, icon: Music },
    { path: '/shop', label: t.nav.shop, icon: ShoppingBag },
    { path: '/dashboard', label: t.nav.login, icon: User },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <BitcoinLogo size="sm" />
            <div className="hidden sm:block">
              <h1 className="font-display font-bold text-lg tracking-wide">
                <span className="text-foreground">PORTAL </span>
                <span className="text-gradient">BITCOINA</span>
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-bitcoin-orange/10 text-bitcoin-orange border border-bitcoin-orange/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          {/* Language Toggle + Mobile Menu */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'en' ? 'pl' : 'en')}
              className="font-mono text-sm hover:text-bitcoin-orange hover:bg-bitcoin-orange/10"
            >
              {language === 'en' ? '🇵🇱 PL' : '🇬🇧 EN'}
            </Button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in-up">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'text-bitcoin-orange bg-bitcoin-orange/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;