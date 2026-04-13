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
      <PricingSection />
      <Footer />
      <CookieBanner />
    </div>
  );
};

export default Index;
