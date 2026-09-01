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
    // One background for the whole landing: the gradient (previously only the
    // hero) now stretches across every section. Sections stay transparent;
    // the floating constellations are a decorative overlay above this layer.
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[linear-gradient(180deg,#0a0a0f_0%,#12121a_58%,#0a0a0f_100%)]">
      {/* Ambient glow baked into the shared background */}
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