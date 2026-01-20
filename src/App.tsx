import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MusicProvider } from "@/contexts/MusicContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Navigation from "@/components/Navigation";
import BitcoinTicker from "@/components/BitcoinTicker";
import FloatingMusicPlayer from "@/components/FloatingMusicPlayer";
import Footer from "@/components/Footer";
import Index from "./pages/Index";
import Music from "./pages/Music";
import Shop from "./pages/Shop";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
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
                  <Route path="/" element={<Index />} />
                  <Route path="/music" element={<Music />} />
                  <Route path="/shop" element={<Shop />} />
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
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
