import { useRef } from "react";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import SocialProofSection from "@/components/SocialProofSection";
import UploadSection from "@/components/UploadSection";
import HistorySection from "@/components/HistorySection";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import Header from "@/components/Header";
import { Terminal, Figma, BookOpen } from "lucide-react";

// Inline component for the ecosystem banner to avoid a separate file right now
const EcosystemBanner = () => (
  <section className="py-16 bg-black text-center relative overflow-hidden border-t border-b border-border/30">
    <div className="absolute inset-0 bg-primary/5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
    <div className="max-w-4xl mx-auto px-4 relative z-10">
      <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-8">
        GRIDXD Ecosistema 2026
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur hover:bg-white/10 transition-colors cursor-pointer group">
          <BookOpen className="w-8 h-8 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-white mb-2">API REST (Doc)</h4>
          <p className="text-sm text-gray-400 mb-4">FastAPI con Swagger integrado. Conecta tu backend en minutos.</p>
          <a href="https://gridxd-main-production.up.railway.app/docs" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-400 hover:underline">Ver Documentación →</a>
        </div>
        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur hover:bg-white/10 transition-colors cursor-pointer group">
          <Figma className="w-8 h-8 text-pink-400 mb-4 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-white mb-2">Figma Plugin</h4>
          <p className="text-sm text-gray-400 mb-4">Extrae iconos directamente desde tu canvas en Figma. (Prototipo)</p>
          <span className="text-xs font-bold px-2 py-1 bg-pink-500/20 text-pink-400 rounded">Próximamente</span>
        </div>
        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur hover:bg-white/10 transition-colors cursor-pointer group">
          <Terminal className="w-8 h-8 text-green-400 mb-4 group-hover:scale-110 transition-transform" />
          <h4 className="font-bold text-white mb-2">CLI Tool</h4>
          <p className="text-sm text-gray-400 mb-4">Procesa carpetas masivas de sprites desde tu terminal local.</p>
          <span className="text-xs font-bold px-2 py-1 bg-green-500/20 text-green-400 rounded">Próximamente</span>
        </div>
      </div>
    </div>
  </section>
);

const Index = () => {
  const uploadRef = useRef<HTMLDivElement>(null);

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection onGetStarted={scrollToUpload} />
      <FeaturesSection />
      <SocialProofSection />
      <div ref={uploadRef}>
        <UploadSection />
      </div>
      <HistorySection />
      <EcosystemBanner />
      <PricingSection />
      <Footer />
      <CookieBanner />
    </div>
  );
};

export default Index;
