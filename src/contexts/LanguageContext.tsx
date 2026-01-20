import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'pl';

interface Translations {
  nav: {
    news: string;
    music: string;
    shop: string;
    login: string;
  };
  news: {
    title: string;
    subtitle: string;
    latest: string;
    priceMarket: string;
    adoption: string;
    tech: string;
    loadMore: string;
    readMore: string;
  };
  music: {
    title: string;
    subtitle: string;
    nowPlaying: string;
    playlist: string;
  };
  shop: {
    title: string;
    subtitle: string;
    trading: string;
    music: string;
    merch: string;
    premium: string;
    buyBtc: string;
    buyCard: string;
  };
  dashboard: {
    title: string;
    balance: string;
    pnl: string;
    tradingBot: string;
    exchange: string;
    strategy: string;
    risk: string;
    amount: string;
    startBot: string;
    stopBot: string;
    recentActions: string;
  };
  footer: {
    tagline: string;
  };
}

const translations: Record<Language, Translations> = {
  en: {
    nav: { news: 'News', music: 'Music', shop: 'Shop', login: 'Login' },
    news: {
      title: 'Bitcoin News',
      subtitle: 'Latest updates from the Bitcoin ecosystem',
      latest: 'Latest',
      priceMarket: 'Price & Market',
      adoption: 'Adoption',
      tech: 'Tech & Dev',
      loadMore: 'Load More',
      readMore: 'Read More',
    },
    music: {
      title: 'Bitcoin Music',
      subtitle: 'The soundtrack of the revolution',
      nowPlaying: 'Now Playing',
      playlist: 'Playlist',
    },
    shop: {
      title: 'Bitcoin Shop',
      subtitle: 'Stack sats & get gear',
      trading: 'Trading Signals',
      music: 'Music',
      merch: 'Merch',
      premium: 'Premium',
      buyBtc: 'Buy with BTC',
      buyCard: 'Buy with Card',
    },
    dashboard: {
      title: 'Dashboard',
      balance: 'BTC Balance',
      pnl: 'Profit/Loss',
      tradingBot: 'Trading Bot',
      exchange: 'Exchange',
      strategy: 'Strategy',
      risk: 'Risk Level',
      amount: 'Amount',
      startBot: 'Start Bot',
      stopBot: 'Stop Bot',
      recentActions: 'Recent Bot Actions',
    },
    footer: { tagline: 'Bitcoin-only portal • No altcoin garbage • Stack sats & vibe' },
  },
  pl: {
    nav: { news: 'Wiadomości', music: 'Muzyka', shop: 'Sklep', login: 'Logowanie' },
    news: {
      title: 'Wiadomości Bitcoin',
      subtitle: 'Najnowsze informacje ze świata Bitcoin',
      latest: 'Najnowsze',
      priceMarket: 'Cena i Rynek',
      adoption: 'Adopcja',
      tech: 'Technologia',
      loadMore: 'Załaduj więcej',
      readMore: 'Czytaj więcej',
    },
    music: {
      title: 'Muzyka Bitcoin',
      subtitle: 'Ścieżka dźwiękowa rewolucji',
      nowPlaying: 'Teraz gra',
      playlist: 'Playlista',
    },
    shop: {
      title: 'Sklep Bitcoin',
      subtitle: 'Zbieraj satoshi i kupuj gadżety',
      trading: 'Sygnały Tradingowe',
      music: 'Muzyka',
      merch: 'Merch',
      premium: 'Premium',
      buyBtc: 'Kup za BTC',
      buyCard: 'Kup kartą',
    },
    dashboard: {
      title: 'Panel',
      balance: 'Saldo BTC',
      pnl: 'Zysk/Strata',
      tradingBot: 'Bot Tradingowy',
      exchange: 'Giełda',
      strategy: 'Strategia',
      risk: 'Poziom ryzyka',
      amount: 'Kwota',
      startBot: 'Uruchom Bota',
      stopBot: 'Zatrzymaj Bota',
      recentActions: 'Ostatnie akcje bota',
    },
    footer: { tagline: 'Portal tylko Bitcoin • Żadnych altcoinów • Stack sats & vibe' },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
