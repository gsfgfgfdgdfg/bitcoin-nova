import { useLanguage } from '@/contexts/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-cyber-dark border-t border-border py-8 mb-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bitcoin-orange to-bitcoin-gold flex items-center justify-center font-display font-black text-background">
              ₿
            </div>
            <span className="font-display font-bold text-lg tracking-wider">
              <span className="text-foreground">PORTAL </span>
              <span className="text-bitcoin-orange">BITCOINA</span>
            </span>
          </div>
          
          <p className="text-muted-foreground text-center font-medium">
            {t.footer.tagline}
          </p>
          
          <p className="text-muted-foreground/50 text-sm">
            © {new Date().getFullYear()} Portal Bitcoina. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
