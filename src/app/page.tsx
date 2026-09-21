import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import MarketplaceSection from "@/components/MarketplaceSection";
import ProblemSolutionSection from "@/components/ProblemSolutionSection";
import DashboardSection from "@/components/DashboardSection";
import IntegrationsSection from "@/components/IntegrationsSection";
import UseCasesSection from "@/components/UseCasesSection";
import SecuritySection from "@/components/SecuritySection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import FloatingBrandBubbles from "@/components/FloatingBrandBubbles";
import type { FloatingBubble } from "@/components/FloatingBrandBubbles";

const LANDING_BUBBLES: FloatingBubble[] = [
  { top: "4%", left: "18%", size: "w-11 h-11", brand: "google", delay: "0.6s", anim: "animate-float-gentle" },
  { top: "7%", left: "72%", size: "w-10 h-10", brand: "shopify", delay: "0s", anim: "animate-float-gentle" },
  { top: "12%", left: "4%", size: "w-10 h-10", brand: "discord", delay: "1.4s", anim: "animate-float-gentle" },
  { top: "15%", left: "88%", size: "w-10 h-10", brand: "stripe", delay: "1.2s", anim: "animate-float-reverse" },
  { top: "28%", left: "2%", size: "w-9 h-9", brand: "calendly", delay: "1.1s", anim: "animate-float-reverse" },
  { top: "32%", left: "92%", size: "w-10 h-10", brand: "mailchimp", delay: "0.3s", anim: "animate-float-gentle" },
  { top: "55%", left: "3%", size: "w-9 h-9", brand: "whatsapp", delay: "0.4s", anim: "animate-float-reverse" },
  { top: "60%", left: "90%", size: "w-10 h-10", brand: "notion", delay: "2.2s", anim: "animate-float-gentle" },
  { top: "78%", left: "6%", size: "w-10 h-10", brand: "github", delay: "1.0s", anim: "animate-float-reverse" },
  { top: "82%", left: "85%", size: "w-10 h-10", brand: "facebook", delay: "0.9s", anim: "animate-float-reverse" },
];

// Homepage: landing — layer fixed con gradienti + radiali + hairline, coerente con palette Ink/Paper.
export default async function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#1e1e24]">
      {/* Sfondo landing — fixed */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#25252d] via-[#1e1e24] to-[#121214]" />
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, rgba(3,139,254,.22), transparent 34%), radial-gradient(circle at 85% 12%, rgba(234,67,53,.16), transparent 30%), radial-gradient(circle at 50% 85%, rgba(168,85,247,.14), transparent 38%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/[0.03]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/25 to-transparent" />
      </div>
      <FloatingBrandBubbles bubbles={LANDING_BUBBLES} />

      <main
        id="main-content"
        className="relative z-10"
      >
        <Navbar />
        <HeroSection />
        <HowItWorksSection />
        <MarketplaceSection />
        <ProblemSolutionSection />
        <DashboardSection />
        <IntegrationsSection />
        <UseCasesSection />
        <SecuritySection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}