import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MarketplaceSection from "@/components/MarketplaceSection";
import FeaturesSection from "@/components/FeaturesSection";
import DashboardSection from "@/components/DashboardSection";
import IntegrationsSection from "@/components/IntegrationsSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

// Homepage: pagina di destinazione componibile — navbar, hero, marketplace,
// sezioni marketing e footer. È una Server Component pura: i contenuti sono
// statici/strutturati e non richiedono stato client.
export default async function Home() {
  return (
    // Un unico sfondo per tutta la landing: il gradiente (prima solo dell'hero)
    // ora attraversa ogni sezione. Le sezioni restano trasparenti; le
    // costellazioni fluttuanti sono un overlay decorativo sopra questo livello.
    <div className="relative flex min-h-screen flex-col overflow-x-clip dark-gradient-main">
{/* Bagliore ambientale incluso nello sfondo condiviso */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, rgba(3,139,254,.15), transparent 30%), radial-gradient(circle at 90% 16%, rgba(234,67,53,.15), transparent 26%), radial-gradient(circle at 50% 95%, rgba(168,85,247,.10), transparent 36%)",
        }}
      />

      <main
        id="main-content"
        className="relative z-10"
        style={{ clipPath: "inset(0 round 0 0 2rem 2rem)" }}
      >
        <Navbar />
        <HeroSection />
        <MarketplaceSection />
        <FeaturesSection />
        <DashboardSection />
        <IntegrationsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}