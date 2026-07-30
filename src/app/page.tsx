import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MarketplaceSection from "@/components/MarketplaceSection";
import FeaturesSection from "@/components/FeaturesSection";
import DashboardSection from "@/components/DashboardSection";
import IntegrationsSection from "@/components/IntegrationsSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default async function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main
        id="main-content"
        className="relative z-10"
        style={{ clipPath: "inset(0 round 0 0 2rem 2rem)" }}
      >
        <div className="bg-neutral-950">
          <Navbar />
          <HeroSection />
          <MarketplaceSection />
          <FeaturesSection />
          <DashboardSection />
          <IntegrationsSection />
          <FAQSection />
          <CTASection />
        </div>
      </main>
      <Footer />
    </div>
  );
}
