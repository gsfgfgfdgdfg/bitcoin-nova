import { useLanguage } from '@/contexts/LanguageContext';
import BitcoinLogo from '@/components/BitcoinLogo';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-secondary/50 border-t border-border py-8 mb-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <BitcoinLogo size="sm" />
            <span className="font-display font-bold text-lg tracking-wide">
              <span className="text-foreground">PORTAL </span>
              <span className="text-gradient">BITCOINA</span>
            </span>
          </div>
          
          <p className="text-muted-foreground text-center font-medium">
            {t.footer.tagline}
          </p>
          
          <p className="text-muted-foreground/60 text-sm">
            © {new Date().getFullYear()} Portal Bitcoina. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;