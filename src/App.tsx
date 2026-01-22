import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MusicProvider } from "@/contexts/MusicContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import BitcoinTicker from "@/components/BitcoinTicker";
import FloatingMusicPlayer from "@/components/FloatingMusicPlayer";
import Footer from "@/components/Footer";
import Index from "./pages/Index";
import News from "./pages/News";
import ArticleDetail from "./pages/ArticleDetail";
import Music from "./pages/Music";
import Shop from "./pages/Shop";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <MusicProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="min-h-screen bg-background">
                <BitcoinTicker />
                <Navigation />
                <main>
                  <Routes>
                    <Route path="/" element={<News />} />
                    <Route path="/news/:id" element={<ArticleDetail />} />
                    <Route path="/music" element={<Music />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
                <FloatingMusicPlayer />
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </MusicProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
